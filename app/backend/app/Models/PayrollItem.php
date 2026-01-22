<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PayrollItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'payroll_id',
        'type',
        'category',
        'description',
        'amount',
        'quantity',
        'rate',
        'date',
        'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'quantity' => 'integer',
        'rate' => 'decimal:2',
        'date' => 'date',
    ];

    /**
     * Get the payroll that owns this item.
     */
    public function payroll()
    {
        return $this->belongsTo(Payroll::class);
    }
}
