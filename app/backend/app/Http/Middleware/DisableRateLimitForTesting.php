<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware to disable rate limiting in development/testing environments
 * 
 * Usage: Add this middleware before throttle middleware in routes
 */
class DisableRateLimitForTesting
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Skip rate limiting in local/testing environments
        if (app()->environment(['local', 'testing'])) {
            // Remove throttle middleware from request
            $request->attributes->set('skip_throttle', true);
        }
        
        return $next($request);
    }
}

