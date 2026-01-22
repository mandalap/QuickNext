<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmployeeOutlet;
use App\Models\User;
use App\Models\Outlet;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class EmployeeOutletAssignmentController extends Controller
{
    /**
     * Get all employee-outlet assignments for a business
     */
    public function index(Request $request)
    {
        $businessId = $request->header('X-Business-Id');

        if (!$businessId) {
            return response()->json([
                'success' => false,
                'message' => 'Business context missing (X-Business-Id)'
            ], 400);
        }

        $assignments = EmployeeOutlet::with(['user', 'outlet'])
            ->forBusiness($businessId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $assignments,
        ]);
    }

    /**
     * Get outlets assigned to a specific employee
     */
    public function getEmployeeOutlets(Request $request, $userId)
    {
        $businessId = $request->header('X-Business-Id');

        if (!$businessId) {
            return response()->json([
                'success' => false,
                'message' => 'Business context missing (X-Business-Id)'
            ], 400);
        }

        $outlets = EmployeeOutlet::with('outlet')
            ->forBusiness($businessId)
            ->forUser($userId)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $outlets,
        ]);
    }

    /**
     * Get employees assigned to a specific outlet
     */
    public function getOutletEmployees(Request $request, $outletId)
    {
        $businessId = $request->header('X-Business-Id');

        if (!$businessId) {
            return response()->json([
                'success' => false,
                'message' => 'Business context missing (X-Business-Id)'
            ], 400);
        }

        $employees = EmployeeOutlet::with('user')
            ->forBusiness($businessId)
            ->forOutlet($outletId)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $employees,
        ]);
    }

    /**
     * Assign employee to outlet(s)
     */
    public function assign(Request $request)
    {
        $businessId = $request->header('X-Business-Id');

        $request->validate([
            'user_id' => 'required|exists:users,id',
            'outlet_ids' => 'required|array|min:1',
            'outlet_ids.*' => 'exists:outlets,id',
            'primary_outlet_id' => 'nullable|exists:outlets,id',
        ]);

        // Debug log
        Log::info('Assign Employee - Request Data:', [
            'user_id' => $request->user_id,
            'outlet_ids' => $request->outlet_ids,
            'business_id' => $businessId,
        ]);

        // Verify user belongs to business through Employee
        $employee = \App\Models\Employee::where('user_id', $request->user_id)
            ->where('business_id', $businessId)
            ->first();

        Log::info('Assign Employee - Employee Found:', ['employee' => $employee ? 'Yes' : 'No']);

        if (!$employee) {
            // Check if user_id is actually an employee_id
            $employeeById = \App\Models\Employee::where('id', $request->user_id)
                ->where('business_id', $businessId)
                ->first();

            if ($employeeById) {
                $employee = $employeeById;
                // Use the actual user_id from employee
                $request->merge(['user_id' => $employee->user_id]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Employee does not belong to this business',
                    'debug' => [
                        'user_id' => $request->user_id,
                        'business_id' => $businessId,
                    ]
                ], 403);
            }
        }

        // Verify outlets belong to business
        $outlets = Outlet::whereIn('id', $request->outlet_ids)
            ->where('business_id', $businessId)
            ->pluck('id')
            ->toArray();

        if (count($outlets) !== count($request->outlet_ids)) {
            return response()->json([
                'success' => false,
                'message' => 'Some outlets do not belong to this business',
                'debug' => [
                    'requested_outlets' => $request->outlet_ids,
                    'valid_outlets' => $outlets,
                ]
            ], 403);
        }

        // Check for existing assignments to prevent duplicates
        $existingAssignments = EmployeeOutlet::forBusiness($businessId)
            ->forUser($request->user_id)
            ->whereIn('outlet_id', $request->outlet_ids)
            ->with('outlet')
            ->get();

        if ($existingAssignments->isNotEmpty()) {
            $outletNames = $existingAssignments->pluck('outlet.name')->implode(', ');
            $existingOutletIds = $existingAssignments->pluck('outlet_id')->toArray();

            return response()->json([
                'success' => false,
                'message' => "Employee is already assigned to: {$outletNames}",
                'existing_assignments' => $existingOutletIds,
                'outlet_names' => $outletNames
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Remove existing assignments for this user in this business
            EmployeeOutlet::forBusiness($businessId)
                ->forUser($request->user_id)
                ->delete();

            // Create new assignments
            $primaryOutletId = $request->primary_outlet_id ?? $request->outlet_ids[0];
            foreach ($request->outlet_ids as $outletId) {
                EmployeeOutlet::create([
                    'user_id' => $request->user_id,
                    'outlet_id' => $outletId,
                    'business_id' => $businessId,
                    'is_primary' => $outletId == $primaryOutletId,
                ]);
            }

            // Audit log
            AuditLog::log([
                'business_id' => $businessId,
                'user_id' => Auth::id(),
                'action' => 'assign',
                'entity_type' => 'employee_outlet_assignment',
                'entity_id' => $request->user_id,
                'new_values' => [
                    'user_id' => $request->user_id,
                    'outlet_ids' => $request->outlet_ids,
                    'primary_outlet_id' => $primaryOutletId,
                ],
                'description' => 'Assigned employee to outlets',
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Employee assigned to outlets successfully',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to assign employee to outlets',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Remove employee from outlet
     */
    public function unassign(Request $request)
    {
        $businessId = $request->header('X-Business-Id');

        $request->validate([
            'user_id' => 'required|exists:users,id',
            'outlet_id' => 'required|exists:outlets,id',
        ]);

        $assignment = EmployeeOutlet::forBusiness($businessId)
            ->forUser($request->user_id)
            ->forOutlet($request->outlet_id)
            ->first();

        if (!$assignment) {
            return response()->json([
                'success' => false,
                'message' => 'Assignment not found',
            ], 404);
        }

        // Check if this is the last outlet for the user
        $userOutletsCount = EmployeeOutlet::forBusiness($businessId)
            ->forUser($request->user_id)
            ->count();

        if ($userOutletsCount <= 1) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot remove last outlet assignment. Employee must have at least one outlet.',
            ], 400);
        }

        DB::beginTransaction();
        try {
            $wasPrimary = $assignment->is_primary;
            $assignment->delete();

            // If the removed outlet was primary, assign another outlet as primary
            if ($wasPrimary) {
                $newPrimary = EmployeeOutlet::forBusiness($businessId)
                    ->forUser($request->user_id)
                    ->first();

                if ($newPrimary) {
                    $newPrimary->update(['is_primary' => true]);
                }
            }

            // Audit log
            AuditLog::log([
                'business_id' => $businessId,
                'user_id' => Auth::id(),
                'action' => 'unassign',
                'entity_type' => 'employee_outlet_assignment',
                'entity_id' => $request->user_id,
                'old_values' => [
                    'user_id' => $request->user_id,
                    'outlet_id' => $request->outlet_id,
                ],
                'description' => 'Removed employee from outlet',
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Employee removed from outlet successfully',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to remove employee from outlet',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Set primary outlet for employee
     */
    public function setPrimary(Request $request)
    {
        $businessId = $request->header('X-Business-Id');

        $request->validate([
            'user_id' => 'required|exists:users,id',
            'outlet_id' => 'required|exists:outlets,id',
        ]);

        $assignment = EmployeeOutlet::forBusiness($businessId)
            ->forUser($request->user_id)
            ->forOutlet($request->outlet_id)
            ->first();

        if (!$assignment) {
            return response()->json([
                'success' => false,
                'message' => 'Assignment not found',
            ], 404);
        }

        DB::beginTransaction();
        try {
            // Unset all primary flags for this user in this business
            EmployeeOutlet::forBusiness($businessId)
                ->forUser($request->user_id)
                ->update(['is_primary' => false]);

            // Set new primary
            $assignment->update(['is_primary' => true]);

            // Audit log
            AuditLog::log([
                'business_id' => $businessId,
                'user_id' => Auth::id(),
                'action' => 'set_primary',
                'entity_type' => 'employee_outlet_assignment',
                'entity_id' => $request->user_id,
                'new_values' => [
                    'user_id' => $request->user_id,
                    'outlet_id' => $request->outlet_id,
                ],
                'description' => 'Set primary outlet for employee',
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Primary outlet set successfully',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to set primary outlet',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
