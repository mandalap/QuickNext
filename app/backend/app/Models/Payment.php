<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    protected $fillable = [
        'order_id', 'payment_method', 'amount', 'reference_number',
        'payment_data', 'status', 'paid_at',
        'processed_by_user_id', 'processed_by_employee_id'
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'payment_data' => 'array',
        'paid_at' => 'datetime',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function processedByUser()
    {
        return $this->belongsTo(User::class, 'processed_by_user_id');
    }

    public function processedByEmployee()
    {
        return $this->belongsTo(Employee::class, 'processed_by_employee_id');
    }
}
