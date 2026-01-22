<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Services\NotificationService;

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

    /**
     * ✅ SECURITY: Auto-send push notification when notification is created
     * Only if role_targets is specified (not for user-specific notifications)
     */
    protected static function booted()
    {
        static::created(function ($notification) {
            // Only send push if role_targets is specified (not user-specific)
            if ($notification->role_targets && is_array($notification->role_targets) && count($notification->role_targets) > 0) {
                try {
                    $service = new NotificationService();
                    $service->sendPushNotification($notification);
                } catch (\Exception $e) {
                    // Log error but don't fail notification creation
                    \Log::error('Failed to send push notification on create', [
                        'notification_id' => $notification->id,
                        'error' => $e->getMessage()
                    ]);
                }
            }
        });
    }
}
















































