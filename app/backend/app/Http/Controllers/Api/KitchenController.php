<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Helpers\SubscriptionHelper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class KitchenController extends Controller
{
    /**
     * Check kitchen access before processing request
     */
    private function checkKitchenAccess($user)
    {
        if (!SubscriptionHelper::hasKitchenAccess($user)) {
            return response()->json([
                'success' => false,
                'message' => 'Akses Dapur memerlukan paket Premium. Silakan upgrade paket Anda.',
                'error' => 'subscription_feature_required',
                'required_feature' => 'has_kitchen_access',
                'redirect_to' => '/subscription-settings'
            ], 403);
        }
        return null;
    }

    public function getOrders(Request $request)
    {
        $user = Auth::user();
        
        // ✅ FIX: Check kitchen access
        $accessCheck = $this->checkKitchenAccess($user);
        if ($accessCheck) {
            return $accessCheck;
        }
        
        $outletId = $request->header('X-Outlet-Id');
        $businessId = $request->header('X-Business-Id');

        $query = Order::with(['orderItems.product', 'table', 'customer'])
            ->where(function ($q) {
                // Show orders that are confirmed, preparing, or ready
                $q->whereIn('status', ['confirmed', 'preparing', 'ready'])
                  // OR show pending orders (regardless of payment status)
                  // ✅ FIX: Untuk dine-in, order bisa masuk dapur meskipun belum dibayar
                  // - Dine-in: makan dulu baru bayar (payment_status = 'pending' tetap masuk dapur)
                  // - Online/Takeaway/Self-Service: bisa sudah bayar atau belum (pending yang sudah paid untuk konfirmasi manual)
                  ->orWhere(function ($subQ) {
                      $subQ->where('status', 'pending')
                           ->where(function ($typeQ) {
                               // Dine-in orders masuk dapur meskipun belum dibayar
                               $typeQ->where('type', 'dine_in')
                                    // Self-service dengan pay_later juga masuk dapur meskipun belum dibayar
                                    ->orWhere(function ($selfServiceQ) {
                                        $selfServiceQ->where('type', 'self_service')
                                                     ->where('payment_status', 'pending');
                                    })
                                    // Online/Takeaway yang sudah dibayar masuk untuk konfirmasi manual
                                    ->orWhere(function ($paidQ) {
                                        $paidQ->whereIn('type', ['takeaway', 'delivery', 'online'])
                                             ->where('payment_status', 'paid');
                                    })
                                    // Self-service yang sudah dibayar masuk untuk konfirmasi manual
                                    ->orWhere(function ($selfServicePaidQ) {
                                        $selfServicePaidQ->where('type', 'self_service')
                                                         ->where('payment_status', 'paid');
                                    });
                           });
                  });
            });

        // Filter by outlet if provided and user is not super admin/owner
        if ($outletId && !in_array($user->role, ['super_admin', 'owner'])) {
            $query->where('outlet_id', $outletId);
        }

        // Filter by business if provided
        if ($businessId) {
            $query->where('business_id', $businessId);
        }

        $orders = $query->orderBy('created_at', 'asc')->get();

        // ✅ NEW: Group orders by status for better frontend handling
        $groupedOrders = [
            // Pending orders yang perlu konfirmasi (sudah dibayar tapi belum confirmed)
            'pending_paid' => $orders->where('status', 'pending')
                ->where('payment_status', 'paid')
                ->whereIn('type', ['takeaway', 'delivery', 'online', 'self_service'])
                ->values(),
            // Pending dine-in orders (belum dibayar, langsung masuk dapur)
            'pending_dine_in' => $orders->where('status', 'pending')
                ->where('type', 'dine_in')
                ->values(),
            // Pending self-service orders (belum dibayar, langsung masuk dapur - untuk pay_later)
            'pending_self_service' => $orders->where('status', 'pending')
                ->where('type', 'self_service')
                ->where('payment_status', 'pending')
                ->values(),
            'confirmed' => $orders->where('status', 'confirmed')->values(),
            'preparing' => $orders->where('status', 'preparing')->values(),
            'ready' => $orders->where('status', 'ready')->values(),
        ];

        return response()->json([
            'orders' => $orders,
            'grouped' => $groupedOrders,
            'pending_count' => $groupedOrders['pending_paid']->count() + 
                              $groupedOrders['pending_dine_in']->count() + 
                              $groupedOrders['pending_self_service']->count(),
        ]);
    }

    public function updateStatus(Request $request, Order $order)
    {
        $request->validate([
            'status' => 'required|string|in:confirmed,preparing,ready,completed',
        ]);

        $user = Auth::user();
        
        // ✅ FIX: Check kitchen access
        $accessCheck = $this->checkKitchenAccess($user);
        if ($accessCheck) {
            return $accessCheck;
        }
        
        $outletId = $request->header('X-Outlet-Id');

        // Check if user has access to this order's outlet
        if ($outletId && $order->outlet_id != $outletId && !in_array($user->role, ['super_admin', 'owner'])) {
            return response()->json(['error' => 'No access to this order'], 403);
        }

        $previousStatus = $order->status;
        $order->status = $request->status;
        $order->save();

        // ✅ SECURITY: Send notification when order status changes
        try {
            $roleTargets = ['kasir', 'owner', 'admin']; // Always notify these roles
            
            // Add waiter if dine_in order
            if ($order->type === 'dine_in') {
                $roleTargets[] = 'waiter';
            }

            $statusMessages = [
                'confirmed' => 'telah dikonfirmasi dan sedang dipersiapkan',
                'preparing' => 'sedang dipersiapkan',
                'ready' => 'sudah siap untuk diantar',
                'completed' => 'telah selesai',
            ];

            \App\Models\AppNotification::create([
                'business_id' => $order->business_id,
                'outlet_id' => $order->outlet_id,
                'user_id' => null,
                'role_targets' => array_unique($roleTargets),
                'type' => 'order.status_changed',
                'title' => 'Status Order Diubah: ' . $order->order_number,
                'message' => "Order #{$order->order_number} " . ($statusMessages[$request->status] ?? 'status berubah'),
                'severity' => 'info',
                'resource_type' => 'order',
                'resource_id' => $order->id,
                'meta' => [
                    'order_number' => $order->order_number,
                    'status' => $request->status,
                    'previous_status' => $previousStatus,
                ],
            ]);
        } catch (\Exception $e) {
            \Log::warning('KitchenController: Failed to create status change notification', ['error' => $e->getMessage()]);
        }

        // Reload with relationships
        $order->load(['orderItems.product', 'table', 'customer']);

        return response()->json($order);
    }

    /**
     * ✅ NEW: Manual confirm order by kitchen staff
     * Mengubah status dari 'pending' (yang sudah paid) menjadi 'confirmed'
     */
    public function confirmOrder(Request $request, Order $order)
    {
        $user = Auth::user();
        $outletId = $request->header('X-Outlet-Id');

        // Check if user has access to this order's outlet
        if ($outletId && $order->outlet_id != $outletId && !in_array($user->role, ['super_admin', 'owner'])) {
            return response()->json(['error' => 'No access to this order'], 403);
        }

        // Only allow confirming pending orders
        // - Dine-in: bisa langsung confirm (meskipun belum dibayar)
        // - Online/Takeaway: harus sudah dibayar untuk confirm manual
        if ($order->status !== 'pending') {
            return response()->json([
                'error' => 'Order tidak dapat dikonfirmasi. Hanya order dengan status pending yang dapat dikonfirmasi.',
            ], 400);
        }

        // Untuk online/takeaway, harus sudah dibayar
        if (in_array($order->type, ['takeaway', 'delivery', 'online']) && $order->payment_status !== 'paid') {
            return response()->json([
                'error' => 'Order tidak dapat dikonfirmasi. Order online/takeaway harus sudah dibayar terlebih dahulu.',
            ], 400);
        }

        $order->status = 'confirmed';
        
        // ✅ SECURITY: Send notification when order status changes
        try {
            $roleTargets = ['waiter', 'kasir', 'owner', 'admin']; // Notify relevant roles
            if ($order->type === 'dine_in') {
                $roleTargets[] = 'waiter'; // Waiter needs to know when order is confirmed
            }

            \App\Models\AppNotification::create([
                'business_id' => $order->business_id,
                'outlet_id' => $order->outlet_id,
                'user_id' => null,
                'role_targets' => array_unique($roleTargets),
                'type' => 'order.status_changed',
                'title' => 'Order Dikonfirmasi: ' . $order->order_number,
                'message' => "Order #{$order->order_number} telah dikonfirmasi dan sedang dipersiapkan.",
                'severity' => 'info',
                'resource_type' => 'order',
                'resource_id' => $order->id,
                'meta' => [
                    'order_number' => $order->order_number,
                    'status' => 'confirmed',
                    'previous_status' => $request->input('previous_status', 'pending'),
                ],
            ]);
        } catch (\Exception $e) {
            \Log::warning('KitchenController: Failed to create status change notification', ['error' => $e->getMessage()]);
        }
        $order->save();

        // Reload with relationships
        $order->load(['orderItems.product', 'table', 'customer']);

        \Log::info('Order manually confirmed by kitchen staff', [
            'order_id' => $order->id,
            'user_id' => $user->id,
            'outlet_id' => $outletId,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Order berhasil dikonfirmasi',
            'order' => $order,
        ]);
    }

    public function getPendingOrders(Request $request)
    {
        $user = Auth::user();
        $outletId = $request->header('X-Outlet-Id');
        $businessId = $request->header('X-Business-Id');

        // ✅ UPDATED: Get confirmed orders AND pending orders (dine-in, self-service pay_later, atau yang sudah paid)
        $query = Order::with(['orderItems.product', 'table', 'customer'])
            ->where(function ($q) {
                $q->where('status', 'confirmed')
                  ->orWhere(function ($subQ) {
                      $subQ->where('status', 'pending')
                           ->where(function ($typeQ) {
                               // Dine-in orders masuk meskipun belum dibayar
                               $typeQ->where('type', 'dine_in')
                                    // Self-service dengan pay_later juga masuk meskipun belum dibayar
                                    ->orWhere(function ($selfServiceQ) {
                                        $selfServiceQ->where('type', 'self_service')
                                                     ->where('payment_status', 'pending');
                                    })
                                    // Online/Takeaway yang sudah dibayar
                                    ->orWhere(function ($paidQ) {
                                        $paidQ->whereIn('type', ['takeaway', 'delivery', 'online'])
                                             ->where('payment_status', 'paid');
                                    })
                                    // Self-service yang sudah dibayar
                                    ->orWhere(function ($selfServicePaidQ) {
                                        $selfServicePaidQ->where('type', 'self_service')
                                                         ->where('payment_status', 'paid');
                                    });
                           });
                  });
            });

        // Filter by outlet if provided and user is not super admin/owner
        if ($outletId && !in_array($user->role, ['super_admin', 'owner'])) {
            $query->where('outlet_id', $outletId);
        }

        // Filter by business if provided
        if ($businessId) {
            $query->where('business_id', $businessId);
        }

        $orders = $query->orderBy('created_at', 'asc')->get();

        return response()->json($orders);
    }

    /**
     * ✅ NEW: Get new order notifications
     * Returns count of pending orders that need kitchen attention:
     * - Dine-in orders (belum dibayar, langsung masuk dapur)
     * - Online/Takeaway orders yang sudah dibayar (perlu konfirmasi manual)
     */
    public function getNewOrderNotifications(Request $request)
    {
        $user = Auth::user();
        $outletId = $request->header('X-Outlet-Id');
        $businessId = $request->header('X-Business-Id');

        $query = Order::where('status', 'pending')
            ->where(function ($q) {
                // Dine-in orders (belum dibayar, langsung masuk dapur)
                $q->where(function ($dineInQ) {
                    $dineInQ->where('type', 'dine_in');
                })
                // Self-service dengan pay_later (belum dibayar, langsung masuk dapur)
                ->orWhere(function ($selfServiceQ) {
                    $selfServiceQ->where('type', 'self_service')
                                 ->where('payment_status', 'pending');
                })
                // Online/Takeaway/Self-Service orders yang sudah dibayar (perlu konfirmasi manual)
                ->orWhere(function ($paidQ) {
                    $paidQ->whereIn('type', ['takeaway', 'delivery', 'online', 'self_service'])
                         ->where('payment_status', 'paid');
                });
            });

        // Filter by outlet if provided and user is not super admin/owner
        if ($outletId && !in_array($user->role, ['super_admin', 'owner'])) {
            $query->where('outlet_id', $outletId);
        }

        // Filter by business if provided
        if ($businessId) {
            $query->where('business_id', $businessId);
        }

        $count = $query->count();
        $recentOrders = $query->orderBy('created_at', 'desc')
            ->limit(5)
            ->get(['id', 'order_number', 'total', 'created_at']);

        return response()->json([
            'count' => $count,
            'recent_orders' => $recentOrders,
            'has_new_orders' => $count > 0,
        ]);
    }
}
