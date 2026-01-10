<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payroll;
use App\Models\Employee;
use App\Services\PayrollService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class PayrollController extends Controller
{
    protected $payrollService;

    public function __construct(PayrollService $payrollService)
    {
        $this->payrollService = $payrollService;
    }

    /**
     * Get list of payrolls
     */
    public function index(Request $request)
    {
        $businessId = $request->header('X-Business-Id');
        $user = Auth::user();

        if (!$businessId) {
            return response()->json([
                'success' => false,
                'message' => 'Business ID required'
            ], 400);
        }

        // Build query
        $query = Payroll::with(['employee.user', 'items'])
            ->where('business_id', $businessId);

        // Filter by employee if not admin/owner
        if (!in_array($user->role, ['super_admin', 'owner', 'admin'])) {
            $employee = Employee::where('user_id', $user->id)->first();
            if ($employee) {
                $query->where('employee_id', $employee->id);
            } else {
                return response()->json([
                    'success' => true,
                    'data' => []
                ]);
            }
        } elseif ($request->has('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }

        // ✅ NEW: Filter by date range (more flexible) or fallback to year/month
        if ($request->has('start_date') && $request->has('end_date')) {
            // Use date range filter
            $startDate = Carbon::parse($request->start_date)->startOfDay();
            $endDate = Carbon::parse($request->end_date)->endOfDay();

            // Filter by period_start and period_end
            $query->where(function($q) use ($startDate, $endDate) {
                $q->whereBetween('period_start', [$startDate, $endDate])
                  ->orWhereBetween('period_end', [$startDate, $endDate])
                  ->orWhere(function($q2) use ($startDate, $endDate) {
                      $q2->where('period_start', '<=', $startDate)
                         ->where('period_end', '>=', $endDate);
                  });
            });
        } else {
            // Fallback to year/month filter for backward compatibility
        if ($request->has('year')) {
            $query->where('year', $request->year);
        }
        if ($request->has('month')) {
            $query->where('month', $request->month);
            }
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Sort by latest first
        $payrolls = $query->orderBy('year', 'desc')
            ->orderBy('month', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $payrolls
        ]);
    }

    /**
     * Calculate payroll (preview without saving)
     */
    public function calculate(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'employee_id' => 'required|exists:employees,id',
            'year' => 'required|integer|min:2020|max:2100',
            'month' => 'required|integer|min:1|max:12',
            'late_penalty_per_occurrence' => 'nullable|numeric|min:0',
            'absent_penalty_per_day' => 'nullable|numeric|min:0',
            'overtime_rate' => 'nullable|numeric|min:0',
            'bonus' => 'nullable|numeric|min:0',
            'allowance' => 'nullable|numeric|min:0',
            'other_deductions' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $businessId = $request->header('X-Business-Id');
        $employee = Employee::findOrFail($request->employee_id);

        if ($employee->business_id != $businessId) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        try {
            $options = [
                'late_penalty_per_occurrence' => $request->late_penalty_per_occurrence,
                'absent_penalty_per_day' => $request->absent_penalty_per_day,
                'overtime_rate' => $request->overtime_rate,
                'bonus' => $request->bonus ?? 0,
                'allowance' => $request->allowance ?? 0,
                'other_deductions' => $request->other_deductions ?? 0,
                'notes' => $request->notes,
            ];

            $calculation = $this->payrollService->calculatePayroll(
                $request->employee_id,
                $request->year,
                $request->month,
                $options
            );

            return response()->json([
                'success' => true,
                'data' => $calculation
            ]);
        } catch (\Exception $e) {
            Log::error('Error calculating payroll: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error calculating payroll: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate payroll (create/update payroll record)
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'employee_id' => 'required|exists:employees,id',
            'year' => 'required|integer|min:2020|max:2100',
            'month' => 'required|integer|min:1|max:12',
            'late_penalty_per_occurrence' => 'nullable|numeric|min:0',
            'absent_penalty_per_day' => 'nullable|numeric|min:0',
            'overtime_rate' => 'nullable|numeric|min:0',
            'bonus' => 'nullable|numeric|min:0',
            'allowance' => 'nullable|numeric|min:0',
            'other_deductions' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $businessId = $request->header('X-Business-Id');
        $employee = Employee::findOrFail($request->employee_id);

        if ($employee->business_id != $businessId) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        try {
            $options = [
                'late_penalty_per_occurrence' => $request->late_penalty_per_occurrence,
                'absent_penalty_per_day' => $request->absent_penalty_per_day,
                'overtime_rate' => $request->overtime_rate,
                'bonus' => $request->bonus ?? 0,
                'allowance' => $request->allowance ?? 0,
                'other_deductions' => $request->other_deductions ?? 0,
                'notes' => $request->notes,
            ];

            $payroll = $this->payrollService->generatePayroll(
                $request->employee_id,
                $request->year,
                $request->month,
                $options
            );

            return response()->json([
                'success' => true,
                'message' => 'Payroll generated successfully',
                'data' => $payroll
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error generating payroll: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error generating payroll: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate payrolls for all employees
     */
    public function generateAll(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'year' => 'required|integer|min:2020|max:2100',
            'month' => 'required|integer|min:1|max:12',
            'late_penalty_per_occurrence' => 'nullable|numeric|min:0',
            'absent_penalty_per_day' => 'nullable|numeric|min:0',
            'overtime_rate' => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $businessId = $request->header('X-Business-Id');
        $user = Auth::user();

        // Only admin/owner can generate for all employees
        if (!in_array($user->role, ['super_admin', 'owner', 'admin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        try {
            $options = [
                'late_penalty_per_occurrence' => $request->late_penalty_per_occurrence,
                'absent_penalty_per_day' => $request->absent_penalty_per_day,
                'overtime_rate' => $request->overtime_rate,
            ];

            $payrolls = $this->payrollService->generatePayrollsForAll(
                $businessId,
                $request->year,
                $request->month,
                $options
            );

            return response()->json([
                'success' => true,
                'message' => 'Payrolls generated successfully',
                'data' => $payrolls,
                'count' => count($payrolls)
            ]);
        } catch (\Exception $e) {
            Log::error('Error generating payrolls: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error generating payrolls: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get payroll detail
     */
    public function show(Request $request, $id)
    {
        $businessId = $request->header('X-Business-Id');
        $user = Auth::user();

        $payroll = Payroll::with(['employee.user', 'items'])
            ->where('id', $id)
            ->where('business_id', $businessId)
            ->first();

        if (!$payroll) {
            return response()->json([
                'success' => false,
                'message' => 'Payroll not found'
            ], 404);
        }

        // Check access for non-admin users
        if (!in_array($user->role, ['super_admin', 'owner', 'admin'])) {
            $employee = Employee::where('user_id', $user->id)->first();
            if (!$employee || $payroll->employee_id != $employee->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 403);
            }
        }

        return response()->json([
            'success' => true,
            'data' => $payroll
        ]);
    }

    /**
     * Update payroll status
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'status' => 'sometimes|in:draft,calculated,approved,paid,cancelled',
            'paid_at' => 'nullable|date',
            'notes' => 'nullable|string',
            'bonus' => 'nullable|numeric|min:0',
            'allowance' => 'nullable|numeric|min:0',
            'other_deductions' => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $businessId = $request->header('X-Business-Id');
        $user = Auth::user();

        // Only admin/owner can update payroll
        if (!in_array($user->role, ['super_admin', 'owner', 'admin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        $payroll = Payroll::where('id', $id)
            ->where('business_id', $businessId)
            ->first();

        if (!$payroll) {
            return response()->json([
                'success' => false,
                'message' => 'Payroll not found'
            ], 404);
        }

        $updateData = [];
        if ($request->has('status')) {
            $updateData['status'] = $request->status;
        }
        if ($request->has('paid_at')) {
            $updateData['paid_at'] = $request->paid_at;
        }
        if ($request->has('notes')) {
            $updateData['notes'] = $request->notes;
        }

        // If updating bonus, allowance, or deductions, recalculate
        if ($request->has('bonus') || $request->has('allowance') || $request->has('other_deductions')) {
            $oldBonus = $payroll->bonus;
            $oldAllowance = $payroll->allowance;
            $oldOtherDeductions = $payroll->other_deductions;

            $newBonus = $request->bonus ?? $oldBonus;
            $newAllowance = $request->allowance ?? $oldAllowance;
            $newOtherDeductions = $request->other_deductions ?? $oldOtherDeductions;

            // Recalculate totals
            $grossSalary = $payroll->base_salary + $payroll->overtime_pay + $payroll->commission + $newBonus + $newAllowance;
            $totalDeductions = $payroll->late_penalty + $payroll->absent_penalty + $newOtherDeductions;
            $netSalary = max(0, $grossSalary - $totalDeductions); // Ensure net salary is not negative

            $updateData['bonus'] = $newBonus;
            $updateData['allowance'] = $newAllowance;
            $updateData['other_deductions'] = $newOtherDeductions;
            $updateData['gross_salary'] = $grossSalary;
            $updateData['total_deductions'] = $totalDeductions;
            $updateData['net_salary'] = $netSalary;
        }

        $payroll->update($updateData);

        return response()->json([
            'success' => true,
            'message' => 'Payroll updated successfully',
            'data' => $payroll->load(['employee.user', 'items'])
        ]);
    }

    /**
     * Delete payroll
     */
    public function destroy(Request $request, $id)
    {
        $businessId = $request->header('X-Business-Id');
        $user = Auth::user();

        // Only admin/owner can delete payroll
        if (!in_array($user->role, ['super_admin', 'owner', 'admin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        $payroll = Payroll::where('id', $id)
            ->where('business_id', $businessId)
            ->first();

        if (!$payroll) {
            return response()->json([
                'success' => false,
                'message' => 'Payroll not found'
            ], 404);
        }

        // Only allow delete if status is draft, calculated, or cancelled
        if (!in_array($payroll->status, ['draft', 'calculated', 'cancelled'])) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete payroll with status: ' . $payroll->status
            ], 400);
        }

        $payroll->delete();

        return response()->json([
            'success' => true,
            'message' => 'Payroll deleted successfully'
        ]);
    }

    /**
     * Get payroll statistics
     */
    public function stats(Request $request)
    {
        $businessId = $request->header('X-Business-Id');

        // ✅ NEW: Support date range or fallback to year/month
        $baseQuery = Payroll::where('business_id', $businessId);

        if ($request->has('start_date') && $request->has('end_date')) {
            // Use date range filter
            $startDate = Carbon::parse($request->start_date)->startOfDay();
            $endDate = Carbon::parse($request->end_date)->endOfDay();

            // Filter by period_start and period_end
            $baseQuery->where(function($q) use ($startDate, $endDate) {
                $q->whereBetween('period_start', [$startDate, $endDate])
                  ->orWhereBetween('period_end', [$startDate, $endDate])
                  ->orWhere(function($q2) use ($startDate, $endDate) {
                      $q2->where('period_start', '<=', $startDate)
                         ->where('period_end', '>=', $endDate);
                  });
            });
        } else {
            // Fallback to year/month filter for backward compatibility
        $year = $request->get('year', date('Y'));
        $month = $request->get('month', date('m'));
            $baseQuery->where('year', $year)->where('month', $month);
        }

        // Clone query for each aggregation to avoid query builder state issues
        $stats = [
            'total_payrolls' => (clone $baseQuery)->count(),
            'total_gross_salary' => (clone $baseQuery)->sum('gross_salary'),
            'total_deductions' => (clone $baseQuery)->sum('total_deductions'),
            'total_net_salary' => (clone $baseQuery)->sum('net_salary'),
            'total_late_penalty' => (clone $baseQuery)->sum('late_penalty'),
            'total_absent_penalty' => (clone $baseQuery)->sum('absent_penalty'),
            'total_overtime_pay' => (clone $baseQuery)->sum('overtime_pay'),
            'total_commission' => (clone $baseQuery)->sum('commission'),
            'by_status' => [
                'draft' => (clone $baseQuery)->where('status', 'draft')->count(),
                'calculated' => (clone $baseQuery)->where('status', 'calculated')->count(),
                'approved' => (clone $baseQuery)->where('status', 'approved')->count(),
                'paid' => (clone $baseQuery)->where('status', 'paid')->count(),
                'cancelled' => (clone $baseQuery)->where('status', 'cancelled')->count(),
            ],
        ];

        return response()->json([
            'success' => true,
            'data' => $stats
        ]);
    }
}
