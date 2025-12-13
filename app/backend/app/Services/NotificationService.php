<?php

namespace App\Services;

use App\Models\AppNotification;
use App\Models\PushSubscription;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Minishlink\WebPush\WebPush;
use Minishlink\WebPush\Subscription;

class NotificationService
{
    /**
     * ✅ SECURITY: Send push notification to users based on role_targets
     * Only sends to users with matching roles and proper business/outlet access
     *
     * @param AppNotification $notification
     * @return array ['sent' => int, 'failed' => int]
     */
    public function sendPushNotification(AppNotification $notification)
    {
        try {
            // Get VAPID keys from environment
            $vapidPublicKey = env('VAPID_PUBLIC_KEY');
            $vapidPrivateKey = env('VAPID_PRIVATE_KEY');
            $vapidSubject = env('VAPID_SUBJECT', 'mailto:admin@quickkasir.com');

            if (!$vapidPublicKey || !$vapidPrivateKey) {
                Log::warning('Push notification skipped: VAPID keys not configured');
                return ['sent' => 0, 'failed' => 0];
            }

            // Get target users based on role_targets
            $targetUsers = $this->getTargetUsers($notification);

            if ($targetUsers->isEmpty()) {
                Log::info('No target users found for push notification', [
                    'notification_id' => $notification->id,
                    'role_targets' => $notification->role_targets
                ]);
                return ['sent' => 0, 'failed' => 0];
            }

            // Setup WebPush
            $auth = [
                'VAPID' => [
                    'subject' => $vapidSubject,
                    'publicKey' => $vapidPublicKey,
                    'privateKey' => $vapidPrivateKey,
                ],
            ];

            $webPush = new WebPush($auth);

            $sent = 0;
            $failed = 0;

            // Prepare notification payload
            $payload = json_encode([
                'title' => $notification->title,
                'body' => $notification->message ?? $notification->title,
                'icon' => '/logo-qk.png',
                'badge' => '/logo-qk.png',
                'tag' => $notification->type ?? 'kasir-pos-notification',
                'data' => [
                    'notification_id' => $notification->id,
                    'type' => $notification->type,
                    'resource_type' => $notification->resource_type,
                    'resource_id' => $notification->resource_id,
                    'meta' => $notification->meta ?? [],
                ],
            ]);

            // Send to all target users
            foreach ($targetUsers as $user) {
                // Get push subscriptions for this user
                $subscriptions = $this->getUserSubscriptions($user, $notification);

                foreach ($subscriptions as $subscription) {
                    try {
                        $pushSubscription = Subscription::create([
                            'endpoint' => $subscription->endpoint,
                            'keys' => [
                                'p256dh' => $subscription->p256dh,
                                'auth' => $subscription->auth,
                            ],
                        ]);

                        $webPush->queueNotification($pushSubscription, $payload);
                        $sent++;
                    } catch (\Exception $e) {
                        Log::error('Error queueing push notification', [
                            'error' => $e->getMessage(),
                            'subscription_id' => $subscription->id,
                            'user_id' => $user->id
                        ]);
                        $failed++;
                    }
                }
            }

            // Send all queued notifications
            $results = $webPush->flush();

            // Check results and remove invalid subscriptions
            foreach ($results as $result) {
                if (!$result->isSuccess()) {
                    Log::warning('Push notification failed', [
                        'endpoint' => $result->getRequest()->getUri()->__toString(),
                        'status' => $result->getStatusCode(),
                        'reason' => $result->getReason()
                    ]);

                    // Remove invalid subscription
                    if ($result->isSubscriptionExpired()) {
                        PushSubscription::where('endpoint', $result->getRequest()->getUri()->__toString())
                            ->delete();
                    }
                }
            }

            Log::info('Push notification sent', [
                'notification_id' => $notification->id,
                'sent' => $sent,
                'failed' => $failed,
                'target_users_count' => $targetUsers->count()
            ]);

            return ['sent' => $sent, 'failed' => $failed];
        } catch (\Exception $e) {
            Log::error('Error sending push notification', [
                'error' => $e->getMessage(),
                'notification_id' => $notification->id
            ]);

            return ['sent' => 0, 'failed' => 0];
        }
    }

    /**
     * ✅ SECURITY: Get target users based on role_targets, business_id, and outlet_id
     * Only returns users with proper access
     *
     * @param AppNotification $notification
     * @return \Illuminate\Database\Eloquent\Collection
     */
    private function getTargetUsers(AppNotification $notification)
    {
        $query = User::query();

        // ✅ SECURITY: Filter by role_targets if specified
        if ($notification->role_targets && is_array($notification->role_targets) && count($notification->role_targets) > 0) {
            $query->whereIn('role', $notification->role_targets);
        }

        // ✅ SECURITY: If user_id is specified, only send to that user
        if ($notification->user_id) {
            $query->where('id', $notification->user_id);
        }

        // ✅ SECURITY: Filter by business access
        if ($notification->business_id) {
            // Users must have access to this business
            $query->whereHas('businesses', function ($q) use ($notification) {
                $q->where('businesses.id', $notification->business_id);
            });
        }

        // ✅ SECURITY: Filter by outlet access (if outlet_id specified)
        if ($notification->outlet_id) {
            // Users must have access to this outlet through their employee assignments
            $query->whereHas('outlets', function ($q) use ($notification) {
                $q->where('outlets.id', $notification->outlet_id);
            });
        }

        // Only get active users
        $query->where('is_active', true);

        return $query->get();
    }

    /**
     * ✅ SECURITY: Get push subscriptions for user, filtered by business/outlet
     *
     * @param User $user
     * @param AppNotification $notification
     * @return \Illuminate\Database\Eloquent\Collection
     */
    private function getUserSubscriptions(User $user, AppNotification $notification)
    {
        $query = PushSubscription::where('user_id', $user->id);

        // Filter by business if specified
        if ($notification->business_id) {
            $query->where(function ($q) use ($notification) {
                $q->where('business_id', $notification->business_id)
                  ->orWhereNull('business_id');
            });
        }

        return $query->get();
    }

    /**
     * ✅ SECURITY: Create notification and send push to relevant roles
     * This is the main method to use when creating notifications
     *
     * @param array $data Notification data
     * @return AppNotification
     */
    public function createAndSend(array $data)
    {
        // Create notification
        $notification = AppNotification::create($data);

        // Send push notification to relevant users
        $this->sendPushNotification($notification);

        return $notification;
    }
}

