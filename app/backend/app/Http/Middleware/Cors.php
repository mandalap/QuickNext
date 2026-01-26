<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class Cors
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Get allowed origins from config
        $allowedOrigins = config('cors.allowed_origins', []);
        $origin = $request->headers->get('Origin');
        
        // Check if origin is allowed
        $isAllowed = false;
        if ($origin) {
            // Check exact match
            if (in_array($origin, $allowedOrigins)) {
                $isAllowed = true;
            } else {
                // Check patterns
                $patterns = config('cors.allowed_origins_patterns', []);
                foreach ($patterns as $pattern) {
                    if (preg_match($pattern, $origin)) {
                        $isAllowed = true;
                        break;
                    }
                }
            }
        }
        
        // Handle preflight OPTIONS request
        if ($request->getMethod() === "OPTIONS") {
            $headers = [
                'Access-Control-Allow-Methods' => 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
                'Access-Control-Allow-Headers' => 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
                'Access-Control-Allow-Credentials' => 'true',
            ];
            
            if ($isAllowed && $origin) {
                $headers['Access-Control-Allow-Origin'] = $origin;
            }
            
            return response()->json([], 200, $headers);
        }

        $response = $next($request);

        // Add CORS headers to response (for static assets and API)
        if ($isAllowed && $origin) {
            $response->headers->set('Access-Control-Allow-Origin', $origin);
            $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
            $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
            $response->headers->set('Access-Control-Allow-Credentials', 'true');
        }

        return $response;
    }
}
