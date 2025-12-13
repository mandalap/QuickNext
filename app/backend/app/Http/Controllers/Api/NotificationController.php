<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppNotification;
use App\Models\PushSubscription;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Minishlink\WebPush\WebPush;
use Minishlink\WebPush\Subscription;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $businessId = $request->header('X-Business-Id');
        $outletId = $request->header('X-Outlet-Id');

        $query = AppNotification::query()->orderByDesc('created_at');

        // ✅ FIX: Role-based filtering
        // Owner, admin, and super_admin can see all notifications
        // Other roles (kasir, kitchen, waiter) only see their own notifications
        if (in_array($user->role, ['owner', 'admin', 'super_admin'])) {
            // Owner/admin/super_admin: See all notifications (no user_id filter)
            // But still filter by business/outlet if provided
        } else {
            // Other roles: Only see notifications for their user_id or global (null user_id)
            $query->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                  ->orWhereNull('user_id');
            });
        }

        // Filter by business
        if ($businessId) {
            $query->where(function ($q) use ($businessId) {
                $q->whereNull('business_id')->orWhere('business_id', $businessId);
            });
        }

        // Filter by outlet
        if ($outletId) {
            $query->where(function ($q) use ($outletId) {
                $q->whereNull('outlet_id')->orWhere('outlet_id', $outletId);
            });
        }

        // Filter by role targets if present
        if ($user->role) {
            $query->where(function ($q) use ($user) {
                $q->whereNull('role_targets')
                  ->orWhereJsonContains('role_targets', $user->role);
            });
        }

        $perPage = (int) ($request->get('per_page') ?? 20);
        $notifications = $query->paginate($perPage);

        return response()->json($notifications);
    }

    public function count(Request $request)
    {
        $user = $request->user();
        $businessId = $request->header('X-Business-Id');
        $outletId = $request->header('X-Outlet-Id');

        $query = AppNotification::query()->whereNull('read_at');

        // ✅ FIX: Role-based filtering (same logic as index)
        // Owner, admin, and super_admin can see all notifications
        // Other roles (kasir, kitchen, waiter) only see their own notifications
        if (!in_array($user->role, ['owner', 'admin', 'super_admin'])) {
            // Other roles: Only see notifications for their user_id or global (null user_id)
            $query->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)->orWhereNull('user_id');
            });
        }

        // Filter by business
        if ($businessId) {
            $query->where(function ($q) use ($businessId) {
                $q->whereNull('business_id')->orWhere('business_id', $businessId);
            });
        }

        // Filter by outlet
        if ($outletId) {
            $query->where(function ($q) use ($outletId) {
                $q->whereNull('outlet_id')->orWhere('outlet_id', $outletId);
            });
        }

        // Filter by role targets if present
        if ($user->role) {
            $query->where(function ($q) use ($user) {
                $q->whereNull('role_targets')
                  ->orWhereJsonContains('role_targets', $user->role);
            });
        }

        return response()->json(['unread' => $query->count()]);
    }

    public function markRead(Request $request, AppNotification $notification)
    {
        $user = $request->user();
        $userId = $user->id;

        // ✅ FIX: Owner, admin, and super_admin can mark any notification as read
        // Other roles can only mark their own notifications or global ones
        if (!in_array($user->role, ['owner', 'admin', 'super_admin'])) {
            if ($notification->user_id && $notification->user_id !== $userId) {
                return response()->json(['error' => 'Unauthorized'], 403);
            }
        }

        $notification->read_at = now();
        $notification->save();
        return response()->json(['success' => true]);
    }

    public function markAllRead(Request $request)
    {
        $user = $request->user();
        $businessId = $request->header('X-Business-Id');
        $outletId = $request->header('X-Outlet-Id');

        $query = AppNotification::whereNull('read_at');

        // ✅ FIX: Role-based filtering (same logic as index and count)
        // Owner, admin, and super_admin can mark all notifications as read
        // Other roles can only mark their own notifications or global ones
        if (!in_array($user->role, ['owner', 'admin', 'super_admin'])) {
            $query->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)->orWhereNull('user_id');
            });
        }

        // Filter by business
        if ($businessId) {
            $query->where(function ($q) use ($businessId) {
                $q->whereNull('business_id')->orWhere('business_id', $businessId);
            });
        }

        // Filter by outlet
        if ($outletId) {
            $query->where(function ($q) use ($outletId) {
                $q->whereNull('outlet_id')->orWhere('outlet_id', $outletId);
            });
        }

        // Filter by role targets if present
        if ($user->role) {
            $query->where(function ($q) use ($user) {
                $q->whereNull('role_targets')
                  ->orWhereJsonContains('role_targets', $user->role);
            });
        }

        $query->update(['read_at' => now()]);
        return response()->json(['success' => true]);
    }

    /**
     * Subscribe to push notifications
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function subscribe(Request $request)
    {
        $user = $request->user();
        $businessId = $request->header('X-Business-Id');

        $validator = Validator::make($request->all(), [
            'endpoint' => 'required|string',
            'keys' => 'required|array',
            'keys.p256dh' => 'required|string',
            'keys.auth' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'error' => $validator->errors()
            ], 422);
        }

        try {
            // Check if subscription already exists
            $existingSubscription = PushSubscription::where('endpoint', $request->endpoint)
                ->where('user_id', $user->id)
                ->first();

            if ($existingSubscription) {
                // Update existing subscription
                $existingSubscription->update([
                    'p256dh' => $request->keys['p256dh'],
                    'auth' => $request->keys['auth'],
                    'business_id' => $businessId ?: $request->input('business_id'),
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Subscription updated successfully',
                    'subscription' => $existingSubscription
                ]);
            }

            // Create new subscription
            $subscription = PushSubscription::create([
                'user_id' => $user->id,
                'business_id' => $businessId ?: $request->input('business_id'),
                'endpoint' => $request->endpoint,
                'p256dh' => $request->keys['p256dh'],
                'auth' => $request->keys['auth'],
            ]);

            Log::info('Push notification subscription created', [
                'user_id' => $user->id,
                'business_id' => $businessId,
                'endpoint' => $request->endpoint
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Subscription created successfully',
                'subscription' => $subscription
            ]);
        } catch (\Exception $e) {
            Log::error('Error creating push subscription', [
                'error' => $e->getMessage(),
                'user_id' => $user->id
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Failed to create subscription: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Unsubscribe from push notifications
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function unsubscribe(Request $request)
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'endpoint' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'error' => $validator->errors()
            ], 422);
        }

        try {
            $subscription = PushSubscription::where('endpoint', $request->endpoint)
                ->where('user_id', $user->id)
                ->first();

            if ($subscription) {
                $subscription->delete();

                Log::info('Push notification subscription deleted', [
                    'user_id' => $user->id,
                    'endpoint' => $request->endpoint
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Subscription removed successfully'
                ]);
            }

            return response()->json([
                'success' => false,
                'error' => 'Subscription not found'
            ], 404);
        } catch (\Exception $e) {
            Log::error('Error removing push subscription', [
                'error' => $e->getMessage(),
                'user_id' => $user->id
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Failed to remove subscription: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Send push notification (for testing)
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function send(Request $request)
    {
        $user = $request->user();
        $businessId = $request->header('X-Business-Id');

        $validator = Validator::make($request->all(), [
            'user_id' => 'nullable|exists:users,id',
            'title' => 'required|string|max:255',
            'body' => 'required|string',
            'data' => 'nullable|array',
            'icon' => 'nullable|string',
            'badge' => 'nullable|string',
            'tag' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'error' => $validator->errors()
            ], 422);
        }

        try {
            // Get VAPID keys from environment
            $vapidPublicKey = env('VAPID_PUBLIC_KEY');
            $vapidPrivateKey = env('VAPID_PRIVATE_KEY');
            $vapidSubject = env('VAPID_SUBJECT', 'mailto:admin@quickkasir.com');

            if (!$vapidPublicKey || !$vapidPrivateKey) {
                return response()->json([
                    'success' => false,
                    'error' => 'VAPID keys not configured. Please set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in .env'
                ], 500);
            }

            // Get target user ID
            $targetUserId = $request->input('user_id', $user->id);

            // Get subscriptions for target user
            $query = PushSubscription::where('user_id', $targetUserId);

            if ($businessId) {
                $query->where(function ($q) use ($businessId) {
                    $q->where('business_id', $businessId)
                      ->orWhereNull('business_id');
                });
            }

            $subscriptions = $query->get();

            if ($subscriptions->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'error' => 'No active subscriptions found for this user'
                ], 404);
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
                'title' => $request->title,
                'body' => $request->body,
                'icon' => $request->icon ?? '/logo-qk.png',
                'badge' => $request->badge ?? '/logo-qk.png',
                'tag' => $request->tag ?? 'kasir-pos-notification',
                'data' => $request->data ?? [],
            ]);

            // Send to all subscriptions
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
                        'subscription_id' => $subscription->id
                    ]);
                    $failed++;
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
                'user_id' => $targetUserId,
                'business_id' => $businessId,
                'sent' => $sent,
                'failed' => $failed
            ]);

            return response()->json([
                'success' => true,
                'message' => "Notification sent to {$sent} device(s)",
                'sent' => $sent,
                'failed' => $failed
            ]);
        } catch (\Exception $e) {
            Log::error('Error sending push notification', [
                'error' => $e->getMessage(),
                'user_id' => $user->id
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Failed to send notification: ' . $e->getMessage()
            ], 500);
        }
    }
}


