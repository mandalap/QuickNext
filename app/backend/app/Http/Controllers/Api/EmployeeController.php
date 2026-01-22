<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\User;
use App\Notifications\WelcomeEmailNotification;
use App\Notifications\VerifyEmailNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Hash;

class EmployeeController extends Controller
{
    public function index(Request $request)
    {
        $user = \Illuminate\Support\Facades\Auth::user();
        $businessId = $request->header('X-Business-Id');

        // ✅ FIX: Get business_id from user if not in header (for owner/super_admin)
        if (!$businessId) {
            if (in_array($user->role, ['owner', 'super_admin'])) {
                $businessId = $user->business_id;
            }
        }

        // ✅ FIX: For employees, get business_id from employee record
        if (!$businessId && in_array($user->role, ['admin', 'kasir', 'kitchen', 'waiter'])) {
            $employee = Employee::where('user_id', $user->id)->first();
            $businessId = $employee?->business_id;
        }

        if (!$businessId) {
            return response()->json(['message' => 'Business ID required'], 400);
        }

        $employees = Employee::with('user')
            ->where('business_id', $businessId)
            ->orderBy('created_at', 'desc')
            ->get();

        // ✅ FIX: Return consistent format
        return response()->json([
            'success' => true,
            'data' => $employees
        ]);
    }

    public function store(Request $request)
    {
        $businessId = $request->header('X-Business-Id');

        if (!$businessId) {
            return response()->json(['message' => 'Business ID required'], 400);
        }

        // Check subscription limit
        $business = \App\Models\Business::with('currentSubscription.subscriptionPlan')->find($businessId);
        if (!$business) {
            return response()->json(['message' => 'Business not found'], 404);
        }

        if (!$business->canCreateEmployee()) {
            $limits = $business->getSubscriptionLimits();
            $currentPlan = $business->currentSubscription->subscriptionPlan->name ?? 'Current';

            return response()->json([
                'success' => false,
                'error' => 'subscription_limit_reached',
                'message' => sprintf(
                    'Batas paket %s tercapai! Anda hanya bisa menambahkan %s karyawan. Saat ini Anda sudah memiliki %d karyawan.',
                    $currentPlan,
                    $limits['max_employees'] === -1 ? 'unlimited' : $limits['max_employees'],
                    $limits['current_employees']
                ),
                'upgrade_message' => 'Upgrade paket subscription Anda untuk menambah lebih banyak karyawan dan fitur premium lainnya!',
                'limits' => $limits,
                'action' => 'upgrade_subscription',
                'upgrade_url' => '/subscription-settings'
            ], 403);
        }

        // ✅ FIX: Check subscription plan max_employees limit
        $subscriptionPlan = $business->currentSubscription->subscriptionPlan ?? null;
        $maxEmployees = $subscriptionPlan->max_employees ?? 1;
        
        // ✅ FIX: If max_employees <= 1, force role to 'kasir' only
        $allowedRoles = ($maxEmployees <= 1) ? ['kasir'] : ['admin', 'kasir', 'kitchen', 'waiter'];
        
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email', // ✅ FIX: Check unique in users table, not employees
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'salary' => 'nullable|numeric|min:0',
            'commission_rate' => 'nullable|numeric|min:0|max:100',
            'is_active' => 'boolean',
            'hired_at' => 'nullable|date',
            'password' => 'required|string|min:6',
            'role' => ['required', 'in:' . implode(',', $allowedRoles)],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }
        
        // ✅ FIX: Double check role if max_employees <= 1
        if ($maxEmployees <= 1 && $request->role !== 'kasir') {
            return response()->json([
                'success' => false,
                'errors' => [
                    'role' => ['Paket Anda hanya mendukung role Kasir. Upgrade paket untuk menggunakan role lain.']
                ],
                'message' => 'Role tidak diizinkan untuk paket ini'
            ], 422);
        }

        // ✅ FIX: Check if user with this email already exists (mengabaikan soft deleted)
        $existingUser = User::withoutTrashed()->where('email', $request->email)->first();

        if ($existingUser) {
            // ✅ FIX: Check if email is already used by another employee in this business
            $existingEmployee = Employee::where('user_id', $existingUser->id)
                ->where('business_id', $businessId)
                ->first();
            
            if ($existingEmployee) {
                return response()->json([
                    'success' => false,
                    'errors' => [
                        'email' => ['Email sudah digunakan oleh karyawan lain di bisnis ini. Silakan gunakan email lain.']
                    ],
                    'message' => 'Email sudah digunakan'
                ], 422);
            }
            
            // User exists but not as employee in this business - update and create employee
            $existingUser->name = $request->name;
            $existingUser->role = $request->role;
            if ($request->password) {
                $existingUser->password = Hash::make($request->password);
            }
            $existingUser->save();
            $user = $existingUser;
        } else {
            // Create new user account with role
            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'role' => $request->role, // Set role
            ]);

            // ✅ Kirim email welcome dan verifikasi untuk user baru yang dibuat manual oleh admin
            try {
                // Kirim welcome email dengan password
                $user->notify(new WelcomeEmailNotification($request->password, $request->role));

                // Kirim email verifikasi
                $user->notify(new VerifyEmailNotification());

                Log::info('Welcome and verification emails sent for manually created user', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'created_by' => auth()->id()
                ]);
            } catch (\Exception $e) {
                Log::error('Failed to send welcome/verification email for manually created user', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'error' => $e->getMessage()
                ]);
                // Tidak gagalkan pembuatan user jika email gagal dikirim
            }
        }

        // ✅ FIX: Generate unique employee code and create employee in single transaction
        $employee = null;
        
        try {
            // Use database transaction with lock to prevent race condition
            // Also create employee within same transaction to ensure atomicity
            DB::transaction(function () use ($businessId, $user, $request, &$employee) {
                // Get all existing employee codes for this business with lock
                // This will lock the rows and prevent other transactions from reading
                $employees = DB::table('employees')
                    ->where('business_id', $businessId)
                    ->where('employee_code', 'LIKE', 'EMP%')
                    ->lockForUpdate() // Lock rows to prevent concurrent reads/writes
                    ->get(['employee_code']);
                
                // Find the highest number from existing codes
                $maxNumber = 0;
                foreach ($employees as $emp) {
                    if (preg_match('/EMP(\d+)/', $emp->employee_code, $matches)) {
                        $number = (int)$matches[1];
                        if ($number > $maxNumber) {
                            $maxNumber = $number;
                        }
                    }
                }
                
                // Generate next available code
                $nextNumber = $maxNumber + 1;
                $employeeCode = 'EMP' . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);
                
                // Check if this code already exists (double-check within transaction)
                $exists = DB::table('employees')
                    ->where('business_id', $businessId)
                    ->where('employee_code', $employeeCode)
                    ->exists();
                
                if ($exists) {
                    // Code exists, find next available
                    for ($i = $nextNumber + 1; $i <= $nextNumber + 100; $i++) {
                        $testCode = 'EMP' . str_pad($i, 4, '0', STR_PAD_LEFT);
                        $testExists = DB::table('employees')
                            ->where('business_id', $businessId)
                            ->where('employee_code', $testCode)
                            ->exists();
                        
                        if (!$testExists) {
                            $employeeCode = $testCode;
                            break;
                        }
                    }
                }
                
                // Create employee record within the same transaction
                $employee = Employee::create([
                    'business_id' => $businessId,
                    'user_id' => $user->id,
                    'employee_code' => $employeeCode,
                    'name' => $request->name,
                    'email' => $request->email,
                    'phone' => $request->phone,
                    'address' => $request->address,
                    'salary' => $request->salary,
                    'commission_rate' => $request->commission_rate ?? 0,
                    'is_active' => $request->is_active ?? true,
                    'hired_at' => $request->hired_at,
                ]);
            }, 5); // Retry up to 5 times if deadlock occurs
        } catch (\Illuminate\Database\QueryException $e) {
            // Handle duplicate entry error specifically
            if ($e->getCode() == 23000 || str_contains($e->getMessage(), 'Duplicate entry')) {
                Log::error('Duplicate employee code error', [
                    'business_id' => $businessId,
                    'error' => $e->getMessage()
                ]);
                return response()->json([
                    'success' => false,
                    'error' => 'Kode karyawan sudah digunakan. Silakan coba lagi.',
                    'message' => 'Terjadi konflik saat membuat karyawan. Silakan refresh halaman dan coba lagi.'
                ], 409); // 409 Conflict
            }
            
            Log::error('Failed to create employee', [
                'business_id' => $businessId,
                'error' => $e->getMessage()
            ]);
            return response()->json([
                'success' => false,
                'error' => 'Gagal membuat karyawan. Silakan coba lagi.'
            ], 500);
        } catch (\Exception $e) {
            Log::error('Failed to generate unique employee code', [
                'business_id' => $businessId,
                'error' => $e->getMessage()
            ]);
            return response()->json([
                'success' => false,
                'error' => 'Gagal menghasilkan kode karyawan. Silakan coba lagi.'
            ], 500);
        }
        
        // Final check - if still no employee, error
        if (!$employee) {
            Log::error('Failed to create employee - no employee created', [
                'business_id' => $businessId
            ]);
            return response()->json([
                'success' => false,
                'error' => 'Gagal membuat karyawan. Silakan coba lagi.'
            ], 500);
        }

        return response()->json([
            'success' => true,
            'data' => $employee->load('user')
        ], 201);
    }

    public function show(Request $request, Employee $employee)
    {
        $businessId = $request->header('X-Business-Id');

        if ($employee->business_id != $businessId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($employee->load('user'));
    }

    public function update(Request $request, Employee $employee)
    {
        $businessId = $request->header('X-Business-Id');

        if ($employee->business_id != $businessId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // ✅ FIX: Check subscription plan max_employees limit
        $business = \App\Models\Business::with('currentSubscription.subscriptionPlan')->find($businessId);
        if (!$business) {
            return response()->json(['message' => 'Business not found'], 404);
        }
        
        // ✅ FIX: Check email unique in users table (not employees)
        $emailRule = 'sometimes|required|email';
        if ($request->has('email') && $request->email !== $employee->email) {
            $emailRule .= '|unique:users,email,' . $employee->user_id;
        }
        
        // ✅ FIX: Allow all roles to be changed (no subscription restriction)
        $allowedRoles = ['admin', 'kasir', 'kitchen', 'waiter'];
        
        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'email' => $emailRule,
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'salary' => 'nullable|numeric|min:0',
            'commission_rate' => 'nullable|numeric|min:0|max:100',
            'is_active' => 'boolean',
            'hired_at' => 'nullable|date',
            'password' => 'nullable|string|min:6',
            'role' => ['sometimes', 'required', 'in:' . implode(',', $allowedRoles)],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }
        
        // ✅ FIX: Check if email is already used by another user
        if ($request->has('email') && $request->email !== $employee->email) {
            $existingUser = User::withoutTrashed()
                ->where('email', $request->email)
                ->where('id', '!=', $employee->user_id)
                ->first();
            
            if ($existingUser) {
                // Check if email is used by another employee in this business
                $existingEmployee = Employee::where('user_id', $existingUser->id)
                    ->where('business_id', $businessId)
                    ->where('id', '!=', $employee->id)
                    ->first();
                
                if ($existingEmployee) {
                    return response()->json([
                        'success' => false,
                        'errors' => [
                            'email' => ['Email sudah digunakan oleh karyawan lain di bisnis ini. Silakan gunakan email lain.']
                        ],
                        'message' => 'Email sudah digunakan'
                    ], 422);
                }
            }
        }

        // Update employee
        $employee->update($request->only([
            'name', 'email', 'phone', 'address', 'salary',
            'commission_rate', 'is_active', 'hired_at'
        ]));

        // Update user if email, password, role, or name changed
        if ($request->has('email') || $request->has('password') || $request->has('name') || $request->has('role')) {
            $userData = [];
            if ($request->has('name')) $userData['name'] = $request->name;
            if ($request->has('email')) $userData['email'] = $request->email;
            if ($request->has('password')) $userData['password'] = Hash::make($request->password);
            if ($request->has('role')) $userData['role'] = $request->role;

            $employee->user->update($userData);
        }

        return response()->json($employee->load('user'));
    }

    public function destroy(Request $request, Employee $employee)
    {
        $businessId = $request->header('X-Business-Id');

        if ($employee->business_id != $businessId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $employee->delete();

        return response()->json(['message' => 'Employee deleted successfully']);
    }

    public function getPerformance(Request $request, Employee $employee)
    {
        $businessId = $request->header('X-Business-Id');

        if ($employee->business_id != $businessId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $ordersCount = $employee->orders()->count();
        $totalSales = $employee->orders()->sum('total_amount');

        return response()->json([
            'employee' => $employee,
            'orders_count' => $ordersCount,
            'total_sales' => $totalSales,
        ]);
    }
}
