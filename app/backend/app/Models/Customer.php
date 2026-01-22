<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Customer extends Model
{
    //
    use SoftDeletes;

    protected $fillable = [
        'business_id', 'name', 'email', 'phone', 'address',
        'birthday', 'gender', 'total_spent', 'total_visits'
    ];

    protected $casts = [
        'birthday' => 'date',
        'total_spent' => 'decimal:2',
        'birthday' => 'date',
    ];

    public function business()
    {
        return $this->belongsTo(Business::class);
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }
}
