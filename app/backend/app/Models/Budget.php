<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Budget extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'business_id',
        'outlet_id',
        'category',
        'name',
        'description',
        'budgeted_amount',
        'actual_amount',
        'start_date',
        'end_date',
        'period',
        'status',
    ];

    protected $casts = [
        'budgeted_amount' => 'decimal:2',
        'actual_amount' => 'decimal:2',
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    public function business()
    {
        return $this->belongsTo(Business::class);
    }

    public function outlet()
    {
        return $this->belongsTo(Outlet::class);
    }

    /**
     * Calculate remaining budget
     */
    public function getRemainingAmountAttribute()
    {
        return $this->budgeted_amount - $this->actual_amount;
    }

    /**
     * Calculate percentage used
     */
    public function getPercentageUsedAttribute()
    {
        if ($this->budgeted_amount == 0) {
            return 0;
        }
        return ($this->actual_amount / $this->budgeted_amount) * 100;
    }

    /**
     * Get status based on usage
     */
    public function getUsageStatusAttribute()
    {
        $percentage = $this->percentage_used;
        
        if ($percentage > 100) {
            return 'over_budget';
        } elseif ($percentage >= 90) {
            return 'warning';
        } elseif ($percentage >= 75) {
            return 'on_track';
        } else {
            return 'under_budget';
        }
    }
}
