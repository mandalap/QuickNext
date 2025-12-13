<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Table extends Model
{
    protected $fillable = [
        'outlet_id', 'name', 'qr_code', 'capacity', 'status', 'scan_count', 'last_scan_at'
    ];

    protected $casts = [
        'last_scan_at' => 'datetime',
    ];

    public function outlet()
    {
        return $this->belongsTo(Outlet::class);
    }

    public function orders()
    {
        return $this->hasMany(Order::class, 'table_id');
    }

    // Get active orders (pending, processing, or ready)
    public function activeOrders()
    {
        return $this->hasMany(Order::class, 'table_id')
            ->whereIn('status', ['pending', 'processing', 'ready']);
    }
}
