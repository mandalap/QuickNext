<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AppNotification extends Model
{
    protected $table = 'notifications';

    protected $fillable = [
        'business_id',
        'outlet_id',
        'user_id',
        'role_targets',
        'type',
        'title',
        'message',
        'severity',
        'resource_type',
        'resource_id',
        'meta',
        'read_at',
    ];

    protected $casts = [
        'role_targets' => 'array',
        'meta' => 'array',
        'read_at' => 'datetime',
    ];
}
















































