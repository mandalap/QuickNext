<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeeShift extends Model
{
    use HasFactory;

    protected $fillable = [
        'business_id',
        'outlet_id',
        'user_id',
        'shift_date',
        'start_time',
        'end_time',
        'clock_in',
        'clock_in_latitude',
        'clock_in_longitude',
        'clock_out',
        'clock_out_latitude',
        'clock_out_longitude',
        'status',
        'notes',
    ];

    protected $casts = [
        'shift_date' => 'date',
        'start_time' => 'string',
        'end_time' => 'string',
        'clock_in' => 'string',
        'clock_out' => 'string',
        'clock_in_latitude' => 'decimal:8',
        'clock_in_longitude' => 'decimal:8',
        'clock_out_latitude' => 'decimal:8',
        'clock_out_longitude' => 'decimal:8',
    ];

    /**
     * Get the business that owns the shift.
     */
    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    /**
     * Get the outlet that owns the shift.
     */
    public function outlet(): BelongsTo
    {
        return $this->belongsTo(Outlet::class);
    }

    /**
     * Get the user (employee) for this shift.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope a query to only include today's shifts.
     */
    public function scopeToday($query)
    {
        return $query->whereDate('shift_date', today());
    }

    /**
     * Scope a query to only include ongoing shifts.
     */
    public function scopeOngoing($query)
    {
        return $query->where('status', 'ongoing');
    }

    /**
     * Scope a query to filter by outlet.
     */
    public function scopeForOutlet($query, $outletId)
    {
        return $query->where('outlet_id', $outletId);
    }

    /**
     * Scope a query to filter by date range.
     */
    public function scopeDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('shift_date', [$startDate, $endDate]);
    }
}
