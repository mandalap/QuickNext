<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\EmployeeShift;
use App\Models\Payroll;
use App\Models\PayrollItem;
use App\Models\Order;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PayrollService
{
    /**
     * Calculate payroll for an employee for a specific period
     */
    public function calculatePayroll($employeeId, $year, $month, $options = [])
    {
        $employee = Employee::with('user')->findOrFail($employeeId);
        
        // Get period dates
        $periodStart = Carbon::create($year, $month, 1)->startOfMonth();
        $periodEnd = $periodStart->copy()->endOfMonth();
        
        // Get base salary
        $baseSalary = $employee->salary ?? 0;
        
        // Get attendance data
        $shifts = EmployeeShift::where('user_id', $employee->user_id)
            ->where('business_id', $employee->business_id)
            ->whereBetween('shift_date', [$periodStart, $periodEnd])
            ->get();
        
        // Calculate attendance stats
        $totalWorkingDays = $shifts->count();
        // Present days: completed shifts OR late shifts (both are considered present)
        $presentDays = $shifts->whereIn('status', ['completed', 'late'])->count();
        $lateCount = $shifts->where('status', 'late')->count();
        $absentDays = $shifts->where('status', 'absent')->count();
        
        // Calculate working hours
        $totalWorkingHours = 0;
        $overtimeHours = 0;
        $incompleteShifts = []; // Track shifts without clock_out
        
        foreach ($shifts as $shift) {
            if ($shift->clock_in) {
                $clockIn = Carbon::parse($shift->shift_date . ' ' . $shift->clock_in);
                
                if ($shift->clock_out) {
                    // Normal case: both clock_in and clock_out exist
                    $clockOut = Carbon::parse($shift->shift_date . ' ' . $shift->clock_out);
                    if ($clockOut->lt($clockIn)) {
                        $clockOut->addDay();
                    }
                    $hours = $clockIn->diffInMinutes($clockOut) / 60;
                    $totalWorkingHours += $hours;
                    
                    // Calculate overtime (assuming 8 hours standard)
                    if ($hours > 8) {
                        $overtimeHours += ($hours - 8);
                    }
                } else {
                    // ✅ FIX: Handle shifts without clock_out (forgot to checkout)
                    // Use end_time as estimated clock_out, or current time if shift is still active
                    $estimatedClockOut = null;
                    
                    if ($shift->end_time) {
                        // Use end_time as estimated checkout time
                        $estimatedClockOut = Carbon::parse($shift->shift_date . ' ' . $shift->end_time);
                        if ($estimatedClockOut->lt($clockIn)) {
                            $estimatedClockOut->addDay();
                        }
                    } else {
                        // If no end_time, use start_time + 8 hours as default
                        $estimatedClockOut = $clockIn->copy()->addHours(8);
                    }
                    
                    // Check if shift is still active (within current period)
                    $now = Carbon::now();
                    $shiftEndDate = Carbon::parse($shift->shift_date)->endOfDay();
                    
                    // If shift date is in the past and we're calculating for that period, use end_time
                    // If shift is still active (today or future), use end_time as well (safer for payroll)
                    $hours = $clockIn->diffInMinutes($estimatedClockOut) / 60;
                    $totalWorkingHours += $hours;
                    
                    // Calculate overtime (assuming 8 hours standard)
                    if ($hours > 8) {
                        $overtimeHours += ($hours - 8);
                    }
                    
                    // Track incomplete shifts for reporting
                    $incompleteShifts[] = [
                        'shift_id' => $shift->id,
                        'shift_date' => $shift->shift_date,
                        'clock_in' => $shift->clock_in,
                        'estimated_clock_out' => $estimatedClockOut->format('H:i:s'),
                        'estimated_hours' => round($hours, 2),
                    ];
                }
            }
        }
        
        // Get penalty rates from options or use defaults
        $latePenaltyPerOccurrence = $options['late_penalty_per_occurrence'] ?? 50000; // Default Rp 50.000 per late
        // Default absent penalty: 1 day salary, but minimum Rp 50.000 if salary is 0 or very low
        $defaultAbsentPenalty = $baseSalary > 0 ? ($baseSalary / 30) : 50000;
        $absentPenaltyPerDay = $options['absent_penalty_per_day'] ?? $defaultAbsentPenalty;
        // Default overtime rate: 1.5x hourly rate, but minimum Rp 10.000/hour if salary is 0 or very low
        $defaultOvertimeRate = $baseSalary > 0 ? ($baseSalary / 30 / 8 * 1.5) : 10000;
        $overtimeRate = $options['overtime_rate'] ?? $defaultOvertimeRate;
        
        // Calculate penalties
        $latePenalty = $lateCount * $latePenaltyPerOccurrence;
        $absentPenalty = $absentDays * $absentPenaltyPerDay;
        
        // Calculate overtime pay
        $overtimePay = $overtimeHours * $overtimeRate;
        
        // Calculate commission (from orders in the period)
        $commission = 0;
        if ($employee->commission_rate > 0) {
            $orders = Order::where('employee_id', $employee->id)
                ->where('business_id', $employee->business_id)
                ->where('payment_status', 'paid')
                ->whereIn('status', ['completed', 'confirmed', 'preparing', 'ready'])
                ->whereBetween('created_at', [$periodStart, $periodEnd])
                ->whereNull('deleted_at')
                ->get();
            
            $totalSales = $orders->sum('total');
            $commission = $totalSales * ($employee->commission_rate / 100);
        }
        
        // Get bonus and allowance from options
        $bonus = $options['bonus'] ?? 0;
        $allowance = $options['allowance'] ?? 0;
        $otherDeductions = $options['other_deductions'] ?? 0;
        
        // Calculate totals
        $grossSalary = $baseSalary + $overtimePay + $commission + $bonus + $allowance;
        $totalDeductions = $latePenalty + $absentPenalty + $otherDeductions;
        $netSalary = max(0, $grossSalary - $totalDeductions); // Ensure net salary is not negative
        
        return [
            'employee' => $employee,
            'period_start' => $periodStart,
            'period_end' => $periodEnd,
            'year' => $year,
            'month' => $month,
            'base_salary' => $baseSalary,
            'overtime_hours' => round($overtimeHours, 2),
            'overtime_pay' => round($overtimePay, 2),
            'commission' => round($commission, 2),
            'bonus' => $bonus,
            'allowance' => $allowance,
            'late_count' => $lateCount,
            'late_penalty' => round($latePenalty, 2),
            'late_penalty_per_occurrence' => $latePenaltyPerOccurrence,
            'absent_count' => $absentDays,
            'absent_penalty' => round($absentPenalty, 2),
            'absent_penalty_per_day' => $absentPenaltyPerDay,
            'other_deductions' => $otherDeductions,
            'gross_salary' => round($grossSalary, 2),
            'total_deductions' => round($totalDeductions, 2),
            'net_salary' => round($netSalary, 2),
            'total_working_days' => $totalWorkingDays,
            'present_days' => $presentDays,
            'absent_days' => $absentDays,
            'total_working_hours' => round($totalWorkingHours, 2),
            'incomplete_shifts' => $incompleteShifts, // ✅ NEW: Shifts without clock_out
            'incomplete_shifts_count' => count($incompleteShifts), // ✅ NEW: Count of incomplete shifts
            'shifts' => $shifts,
            'orders' => $orders ?? collect(),
        ];
    }
    
    /**
     * Generate payroll record
     */
    public function generatePayroll($employeeId, $year, $month, $options = [])
    {
        DB::beginTransaction();
        
        try {
            $calculation = $this->calculatePayroll($employeeId, $year, $month, $options);
            $employee = $calculation['employee'];
            
            // Check if payroll already exists
            $existingPayroll = Payroll::where('employee_id', $employeeId)
                ->where('year', $year)
                ->where('month', $month)
                ->first();
            
            if ($existingPayroll) {
                // Update existing payroll
                $payroll = $existingPayroll;
                $payroll->update([
                    'period_start' => $calculation['period_start'],
                    'period_end' => $calculation['period_end'],
                    'base_salary' => $calculation['base_salary'],
                    'overtime_hours' => $calculation['overtime_hours'],
                    'overtime_pay' => $calculation['overtime_pay'],
                    'commission' => $calculation['commission'],
                    'bonus' => $calculation['bonus'],
                    'allowance' => $calculation['allowance'],
                    'late_count' => $calculation['late_count'],
                    'late_penalty' => $calculation['late_penalty'],
                    'late_penalty_per_occurrence' => $calculation['late_penalty_per_occurrence'],
                    'absent_count' => $calculation['absent_count'],
                    'absent_penalty' => $calculation['absent_penalty'],
                    'absent_penalty_per_day' => $calculation['absent_penalty_per_day'],
                    'other_deductions' => $calculation['other_deductions'],
                    'gross_salary' => $calculation['gross_salary'],
                    'total_deductions' => $calculation['total_deductions'],
                    'net_salary' => $calculation['net_salary'],
                    'total_working_days' => $calculation['total_working_days'],
                    'present_days' => $calculation['present_days'],
                    'absent_days' => $calculation['absent_days'],
                    'total_working_hours' => $calculation['total_working_hours'],
                    'status' => 'calculated',
                    'notes' => $options['notes'] ?? null,
                ]);
                
                // Delete old items
                $payroll->items()->delete();
            } else {
                // Create new payroll
                $payrollNumber = Payroll::generatePayrollNumber(
                    $employee->business_id,
                    $year,
                    $month
                );
                
                $payroll = Payroll::create([
                    'business_id' => $employee->business_id,
                    'employee_id' => $employeeId,
                    'payroll_number' => $payrollNumber,
                    'period_start' => $calculation['period_start'],
                    'period_end' => $calculation['period_end'],
                    'year' => $year,
                    'month' => $month,
                    'base_salary' => $calculation['base_salary'],
                    'overtime_hours' => $calculation['overtime_hours'],
                    'overtime_pay' => $calculation['overtime_pay'],
                    'commission' => $calculation['commission'],
                    'bonus' => $calculation['bonus'],
                    'allowance' => $calculation['allowance'],
                    'late_count' => $calculation['late_count'],
                    'late_penalty' => $calculation['late_penalty'],
                    'late_penalty_per_occurrence' => $calculation['late_penalty_per_occurrence'],
                    'absent_count' => $calculation['absent_count'],
                    'absent_penalty' => $calculation['absent_penalty'],
                    'absent_penalty_per_day' => $calculation['absent_penalty_per_day'],
                    'other_deductions' => $calculation['other_deductions'],
                    'gross_salary' => $calculation['gross_salary'],
                    'total_deductions' => $calculation['total_deductions'],
                    'net_salary' => $calculation['net_salary'],
                    'total_working_days' => $calculation['total_working_days'],
                    'present_days' => $calculation['present_days'],
                    'absent_days' => $calculation['absent_days'],
                    'total_working_hours' => $calculation['total_working_hours'],
                    'status' => 'calculated',
                    'notes' => $options['notes'] ?? null,
                ]);
            }
            
            // Create payroll items for detailed breakdown
            $items = [];
            
            // Earnings
            if ($calculation['base_salary'] > 0) {
                $items[] = [
                    'payroll_id' => $payroll->id,
                    'type' => 'earning',
                    'category' => 'base_salary',
                    'description' => 'Gaji Pokok',
                    'amount' => $calculation['base_salary'],
                    'quantity' => 1,
                    'rate' => $calculation['base_salary'],
                ];
            }
            
            if ($calculation['overtime_pay'] > 0) {
                $items[] = [
                    'payroll_id' => $payroll->id,
                    'type' => 'earning',
                    'category' => 'overtime',
                    'description' => "Lembur ({$calculation['overtime_hours']} jam)",
                    'amount' => $calculation['overtime_pay'],
                    'quantity' => $calculation['overtime_hours'],
                    'rate' => $options['overtime_rate'] ?? ($calculation['base_salary'] > 0 ? ($calculation['base_salary'] / 30 / 8 * 1.5) : 10000),
                ];
            }
            
            if ($calculation['commission'] > 0) {
                $items[] = [
                    'payroll_id' => $payroll->id,
                    'type' => 'earning',
                    'category' => 'commission',
                    'description' => "Komisi ({$employee->commission_rate}%)",
                    'amount' => $calculation['commission'],
                    'quantity' => 1,
                    'rate' => $calculation['commission'],
                ];
            }
            
            if ($calculation['bonus'] > 0) {
                $items[] = [
                    'payroll_id' => $payroll->id,
                    'type' => 'earning',
                    'category' => 'bonus',
                    'description' => 'Bonus',
                    'amount' => $calculation['bonus'],
                    'quantity' => 1,
                    'rate' => $calculation['bonus'],
                ];
            }
            
            if ($calculation['allowance'] > 0) {
                $items[] = [
                    'payroll_id' => $payroll->id,
                    'type' => 'earning',
                    'category' => 'allowance',
                    'description' => 'Tunjangan',
                    'amount' => $calculation['allowance'],
                    'quantity' => 1,
                    'rate' => $calculation['allowance'],
                ];
            }
            
            // Deductions
            if ($calculation['late_penalty'] > 0) {
                foreach ($calculation['shifts']->where('status', 'late') as $shift) {
                    $items[] = [
                        'payroll_id' => $payroll->id,
                        'type' => 'deduction',
                        'category' => 'late_penalty',
                        'description' => "Denda Terlambat - " . Carbon::parse($shift->shift_date)->format('d/m/Y'),
                        'amount' => $calculation['late_penalty_per_occurrence'],
                        'quantity' => 1,
                        'rate' => $calculation['late_penalty_per_occurrence'],
                        'date' => $shift->shift_date,
                    ];
                }
            }
            
            if ($calculation['absent_penalty'] > 0) {
                foreach ($calculation['shifts']->where('status', 'absent') as $shift) {
                    $items[] = [
                        'payroll_id' => $payroll->id,
                        'type' => 'deduction',
                        'category' => 'absent_penalty',
                        'description' => "Denda Tidak Hadir - " . Carbon::parse($shift->shift_date)->format('d/m/Y'),
                        'amount' => $calculation['absent_penalty_per_day'],
                        'quantity' => 1,
                        'rate' => $calculation['absent_penalty_per_day'],
                        'date' => $shift->shift_date,
                    ];
                }
            }
            
            if ($calculation['other_deductions'] > 0) {
                $items[] = [
                    'payroll_id' => $payroll->id,
                    'type' => 'deduction',
                    'category' => 'other',
                    'description' => 'Potongan Lainnya',
                    'amount' => $calculation['other_deductions'],
                    'quantity' => 1,
                    'rate' => $calculation['other_deductions'],
                    'notes' => $options['other_deductions_notes'] ?? null,
                ];
            }
            
            // Bulk insert items
            if (!empty($items)) {
                PayrollItem::insert($items);
            }
            
            DB::commit();
            
            return $payroll->load(['employee.user', 'items']);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error generating payroll: ' . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Generate payrolls for all employees in a business for a specific period
     */
    public function generatePayrollsForAll($businessId, $year, $month, $options = [])
    {
        $employees = Employee::where('business_id', $businessId)
            ->where('is_active', true)
            ->get();
        
        $payrolls = [];
        foreach ($employees as $employee) {
            try {
                $payroll = $this->generatePayroll($employee->id, $year, $month, $options);
                $payrolls[] = $payroll;
            } catch (\Exception $e) {
                Log::error("Error generating payroll for employee {$employee->id}: " . $e->getMessage());
                continue;
            }
        }
        
        return $payrolls;
    }
}

