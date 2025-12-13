<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Payroll extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'business_id',
        'employee_id',
        'payroll_number',
        'period_start',
        'period_end',
        'year',
        'month',
        'base_salary',
        'overtime_hours',
        'overtime_pay',
        'commission',
        'bonus',
        'allowance',
        'late_count',
        'late_penalty',
        'late_penalty_per_occurrence',
        'absent_count',
        'absent_penalty',
        'absent_penalty_per_day',
        'other_deductions',
        'gross_salary',
        'total_deductions',
        'net_salary',
        'total_working_days',
        'present_days',
        'absent_days',
        'total_working_hours',
        'status',
        'paid_at',
        'notes',
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end' => 'date',
        'paid_at' => 'date',
        'base_salary' => 'decimal:2',
        'overtime_hours' => 'decimal:2',
        'overtime_pay' => 'decimal:2',
        'commission' => 'decimal:2',
        'bonus' => 'decimal:2',
        'allowance' => 'decimal:2',
        'late_penalty' => 'decimal:2',
        'late_penalty_per_occurrence' => 'decimal:2',
        'absent_penalty' => 'decimal:2',
        'absent_penalty_per_day' => 'decimal:2',
        'other_deductions' => 'decimal:2',
        'gross_salary' => 'decimal:2',
        'total_deductions' => 'decimal:2',
        'net_salary' => 'decimal:2',
        'total_working_hours' => 'decimal:2',
    ];

    /**
     * Get the business that owns the payroll.
     */
    public function business()
    {
        return $this->belongsTo(Business::class);
    }

    /**
     * Get the employee for this payroll.
     */
    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    /**
     * Get the payroll items.
     */
    public function items()
    {
        return $this->hasMany(PayrollItem::class);
    }

    /**
     * Generate payroll number
     */
    public static function generatePayrollNumber($businessId, $year, $month)
    {
        $count = self::where('business_id', $businessId)
            ->where('year', $year)
            ->where('month', $month)
            ->count();
        
        $number = str_pad($count + 1, 4, '0', STR_PAD_LEFT);
        return "PR-{$businessId}-{$year}-{$month}-{$number}";
    }
}
