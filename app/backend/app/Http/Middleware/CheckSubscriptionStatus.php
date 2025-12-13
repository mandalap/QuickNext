<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\UserSubscription;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class CheckSubscriptionStatus
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $currentPath = $request->path();

        // Log all requests for debugging (especially top-products)
        if (str_contains($currentPath, 'top-products')) {
            Log::info('CheckSubscriptionStatus: top-products request', [
                'path' => $currentPath,
                'method' => $request->method(),
                'full_url' => $request->fullUrl(),
                'has_user' => $user ? true : false,
                'user_id' => $user?->id,
                'user_role' => $user?->role,
            ]);
        }

        // Skip check for public routes or if user is not authenticated
        if (!$user) {
            if (str_contains($currentPath, 'top-products')) {
                Log::warning('CheckSubscriptionStatus: No user for top-products request');
            }
            return $next($request);
        }

        // Skip subscription check for subscription management routes
        $exemptRoutes = [
            'api/v1/subscriptions/subscribe',
            'api/v1/subscriptions/upgrade',
            'api/v1/subscriptions/current',
            'api/v1/subscriptions/trial-status',
            'api/v1/subscriptions/payment-token/*', // Allow getting payment token for pending subscription
            'api/v1/subscriptions/verify-activate', // Allow verify and activate pending
            'api/v1/subscriptions/manual-activate', // Allow manual activation
            'api/v1/payments/status/*', // Allow checking payment status
        ];

        // ✅ IMPORTANT: Allow business creation even with pending_payment
        // BusinessController will handle using existing active subscription or create trial
        if ($request->method() === 'POST' && $request->is('api/v1/businesses')) {
            Log::info('Subscription middleware: Allowing business creation', [
                'user_id' => $user->id,
                'path' => $currentPath,
                'reason' => 'Business creation is exempt from subscription check'
            ]);
            return $next($request); // ✅ Skip subscription check for business creation
        }

        // Allow GET /businesses and /businesses/current (needed for loading business data)
        if ($request->method() === 'GET' && ($request->is('api/v1/businesses') || $request->is('api/v1/businesses/current'))) {
            Log::info('Subscription middleware: Allowing businesses list/current', [
                'user_id' => $user->id,
                'path' => $currentPath,
            ]);
            return $next($request);
        }

        // ✅ Allow getting payment token for pending subscription (need to pay first)
        if ($request->method() === 'GET' && str_contains($currentPath, 'api/v1/subscriptions/payment-token/')) {
            Log::info('Subscription middleware: Allowing payment token request', [
                'user_id' => $user->id,
                'path' => $currentPath,
                'reason' => 'User needs payment token to complete payment',
            ]);
            return $next($request);
        }

        // ✅ Allow verify-activate endpoint (POST)
        if ($request->method() === 'POST' && str_contains($currentPath, 'api/v1/subscriptions/verify-activate')) {
            Log::info('Subscription middleware: Allowing verify-activate request', [
                'user_id' => $user->id,
                'path' => $currentPath,
                'reason' => 'User needs to verify payment',
            ]);
            return $next($request);
        }

        // ✅ Allow payment status check
        if ($request->method() === 'GET' && str_contains($currentPath, 'api/v1/payments/status/')) {
            Log::info('Subscription middleware: Allowing payment status check', [
                'user_id' => $user->id,
                'path' => $currentPath,
                'reason' => 'User needs to check payment status',
            ]);
            return $next($request);
        }

        foreach ($exemptRoutes as $exemptRoute) {
            if ($request->is($exemptRoute) || $currentPath === $exemptRoute || str_contains($currentPath, str_replace('*', '', $exemptRoute))) {
                Log::info('Subscription middleware: Exempting route', [
                    'path' => $currentPath,
                    'exempt_route' => $exemptRoute,
                ]);
                return $next($request);
            }
        }

        // Debug logging
        Log::info('CheckSubscriptionStatus middleware', [
            'user_id' => $user->id,
            'user_role' => $user->role,
            'route' => $request->path(),
            'method' => $request->method(),
        ]);

        // Employee roles need to check their business owner's subscription
        $isEmployeeRole = in_array($user->role, ['kasir', 'kitchen', 'waiter', 'admin']);

        // Log untuk top-products request khusus
        if (str_contains($currentPath, 'top-products')) {
            Log::info('CheckSubscriptionStatus: Processing top-products', [
                'isEmployeeRole' => $isEmployeeRole,
                'user_role' => $user->role,
            ]);
        }

        if ($isEmployeeRole) {
            // Get employee's business and check owner's subscription
            $employee = \App\Models\Employee::where('user_id', $user->id)
                ->where('is_active', true)
                ->with(['business.owner.subscriptions' => function($query) {
                    $query->where('status', 'active')
                          ->where('ends_at', '>', now())
                          ->latest();
                }])
                ->first();

            if (!$employee || !$employee->business) {
                return response()->json([
                    'success' => false,
                    'message' => 'Employee not assigned to any business',
                    'subscription_required' => true,
                    'redirect_to' => '/login'
                ], 403);
            }

            $owner = $employee->business->owner;
            if (!$owner) {
                return response()->json([
                    'success' => false,
                    'message' => 'Business owner not found',
                    'subscription_required' => true,
                    'redirect_to' => '/login'
                ], 403);
            }

            // Check owner's subscription
            $activeSubscription = $owner->subscriptions()
                ->where('status', 'active')
                ->where('ends_at', '>', Carbon::now())
                ->first();

            // If owner has no active subscription, employee cannot access
            if (!$activeSubscription) {
                return response()->json([
                    'success' => false,
                    'message' => 'Business owner subscription has expired. Please contact your business owner to renew subscription.',
                    'subscription_required' => true,
                    'subscription_expired' => true,
                    'redirect_to' => '/login'
                ], 403);
            }

            // Owner has active subscription, employee can proceed
            return $next($request);
        }

        // For owner/super_admin roles, check their own subscription
        $activeSubscription = UserSubscription::where('user_id', $user->id)
            ->where('status', 'active')
            ->where('ends_at', '>', Carbon::now())
            ->first();

        // Debug logging for subscription check
        Log::info('Owner subscription check', [
            'user_id' => $user->id,
            'has_active_subscription' => $activeSubscription ? true : false,
            'subscription_id' => $activeSubscription?->id,
            'subscription_plan' => $activeSubscription?->subscriptionPlan?->name,
            'ends_at' => $activeSubscription?->ends_at,
            'route' => $currentPath,
            'method' => $request->method(),
        ]);

        // Log khusus untuk top-products sebelum return response
        if (str_contains($currentPath, 'top-products')) {
            Log::info('CheckSubscriptionStatus: About to return response for top-products', [
                'has_active_subscription' => $activeSubscription ? true : false,
                'will_return_403' => !$activeSubscription,
            ]);
        }

        // If no active subscription, return subscription required response
        if (!$activeSubscription) {
            // Check if there's a pending_payment subscription (just paid but webhook not processed yet)
            $pendingSubscription = UserSubscription::where('user_id', $user->id)
                ->where('status', 'pending_payment')
                ->latest()
                ->first();

            if ($pendingSubscription) {
                Log::warning('User has pending subscription, payment might be processing', [
                    'user_id' => $user->id,
                    'subscription_id' => $pendingSubscription->id,
                    'subscription_code' => $pendingSubscription->subscription_code,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Pembayaran sedang diproses. Silakan refresh halaman dalam beberapa saat.',
                    'subscription_pending' => true,
                    'redirect_to' => '/payment/pending'
                ], 403);
            }

            Log::warning('No active subscription found for owner', [
                'user_id' => $user->id,
                'user_role' => $user->role,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Subscription required to access this feature',
                'subscription_required' => true,
                'redirect_to' => '/subscription-plans'
            ], 403);
        }

        // Log untuk top-products sebelum pass ke controller
        if (str_contains($currentPath, 'top-products')) {
            Log::info('CheckSubscriptionStatus: Passing request to controller for top-products', [
                'has_active_subscription' => true,
            ]);
        }

        // Check if subscription is about to expire (within 3 days)
        $daysRemaining = Carbon::now()->diffInDays($activeSubscription->ends_at, false);
        if ($daysRemaining <= 3 && $daysRemaining > 0) {
            // Add warning header for frontend to show notification
            $response = $next($request);
            $response->headers->set('X-Subscription-Warning', 'expires_soon');
            $response->headers->set('X-Subscription-Days-Remaining', $daysRemaining);
            return $response;
        }

        return $next($request);
    }
}
