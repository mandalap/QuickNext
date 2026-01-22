<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Order extends Model
{
    //

     use SoftDeletes;

    protected $fillable = [
        'order_number', 'receipt_token', 'business_id', 'outlet_id', 'customer_id',
        'table_id', 'queue_number', 'employee_id', 'shift_id', 'type', 'status', 'subtotal',
        'tax_amount', 'discount_amount', 'discount_id', 'coupon_code', 'service_charge',
        'delivery_fee', 'total', 'paid_amount', 'change_amount',
        'payment_status', 'customer_data', 'notes', 'ordered_at'
    ];

    protected $casts = [
        'customer_data' => 'array',
        'subtotal' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'service_charge' => 'decimal:2',
        'delivery_fee' => 'decimal:2',
        'total' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'change_amount' => 'decimal:2',
        'ordered_at' => 'datetime',
    ];

    public function business()
    {
        return $this->belongsTo(Business::class);
    }

    public function outlet()
    {
        return $this->belongsTo(Outlet::class);
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function table()
    {
        return $this->belongsTo(Table::class);
    }

    // ❌ MASALAH: employee_id merujuk ke Employee table, bukan User
    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    // ✅ TAMBAHAN: Akses user melalui employee
    public function user()
    {
        return $this->hasOneThrough(User::class, Employee::class, 'id', 'id', 'employee_id', 'user_id');
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    // Alias untuk kompatibilitas: beberapa controller menggunakan nama 'orderItems'
    public function orderItems()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function platformOrder()
    {
        return $this->hasOne(PlatformOrder::class);
    }

    public function shift()
    {
        return $this->belongsTo(CashierShift::class, 'shift_id');
    }

    public function discount()
    {
        return $this->belongsTo(Discount::class, 'discount_id');
    }

    /**
     * Generate receipt token for public access
     */
    public function generateReceiptToken()
    {
        if (!$this->receipt_token) {
            $this->receipt_token = \Illuminate\Support\Str::random(32);
            $this->save();
        }
        return $this->receipt_token;
    }

    /**
     * Get receipt URL
     */
    public function getReceiptUrl()
    {
        $token = $this->generateReceiptToken();
        $frontendUrl = config('app.frontend_url', 'http://localhost:3000');
        return $frontendUrl . '/receipt/' . $token;
    }
}
