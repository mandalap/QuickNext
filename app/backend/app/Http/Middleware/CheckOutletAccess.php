<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\EmployeeOutlet;

class CheckOutletAccess
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $outletId = $request->header('X-Outlet-Id');
        $businessId = $request->header('X-Business-Id');

        // Super admin can access all outlets
        if ($user->role === 'super_admin') {
            return $next($request);
        }

        // Owner can access all outlets in their business
        if ($user->role === 'owner') {
            // Verify business ownership
            if ($user->ownedBusinesses()->where('id', $businessId)->exists()) {
                return $next($request);
            }
        }

        // For other roles, check employee_outlets assignment
        if (!$outletId) {
            return response()->json([
                'success' => false,
                'message' => 'X-Outlet-Id header is required',
            ], 400);
        }

        // Check if user has access to this outlet
        $hasAccess = EmployeeOutlet::where('user_id', $user->id)
            ->where('outlet_id', $outletId)
            ->where('business_id', $businessId)
            ->exists();

        if (!$hasAccess) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have access to this outlet',
            ], 403);
        }

        return $next($request);
    }
}
