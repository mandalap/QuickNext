<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\URL;
use Laravel\Sanctum\PersonalAccessTokenResult;
use Laravel\Socialite\Facades\Socialite;

class SocialAuthController extends Controller
{
    /**
     * Redirect the user to Google's OAuth consent screen.
     */
    public function redirectToGoogle(): RedirectResponse
    {
        return Socialite::driver('google')->redirect();
    }

    /**
     * Obtain the user information from Google.
     */
    public function handleGoogleCallback()
    {
        try {
            // Check if code parameter exists
            if (!request()->has('code')) {
                Log::warning('Google OAuth callback called without code parameter', [
                    'query_params' => request()->all(),
                    'referer' => request()->header('referer')
                ]);
                throw new \Exception('OAuth authorization code not provided. Please try logging in again.');
            }

            $googleUser = Socialite::driver('google')->stateless()->user();

            $user = User::where('google_id', $googleUser->getId())
                ->orWhere('email', $googleUser->getEmail())
                ->first();

            if (!$user) {
                $user = User::create([
                    'name' => $googleUser->getName() ?? ($googleUser->user['given_name'] ?? 'User'),
                    'email' => $googleUser->getEmail(),
                    'google_id' => $googleUser->getId(),
                    'password' => bcrypt(str()->random(32)),
                    'role' => 'owner',
                    'email_verified_at' => now(),
                ]);
            } else {
                // Link google_id if not set and email matches
                if (!$user->google_id) {
                    $user->google_id = $googleUser->getId();
                    $user->save();
                }
                // Mark verified
                if (!$user->email_verified_at) {
                    $user->email_verified_at = now();
                    $user->save();
                }
            }

            /** @var PersonalAccessTokenResult $token */
            $token = $user->createToken('API Token');
            // Get FRONTEND_URL from env with proper fallback for production
            $frontendUrl = env('FRONTEND_URL', 'https://app.quickkasir.com');
            // Ensure it's HTTPS in production
            if (app()->environment('production') && !str_starts_with($frontendUrl, 'https://')) {
                $frontendUrl = str_replace('http://', 'https://', $frontendUrl);
            }
            $redirectUrl = $frontendUrl . '/login/sso?token=' . urlencode($token->plainTextToken);

            Log::info('Google OAuth success redirect', [
                'frontend_url' => $frontendUrl,
                'redirect_url' => $redirectUrl,
                'user_id' => $user->id,
                'env' => app()->environment()
            ]);

            return redirect()->away($redirectUrl);
        } catch (\Throwable $e) {
            Log::error('Google OAuth failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            // Get FRONTEND_URL from env with proper fallback for production
            $frontendUrl = env('FRONTEND_URL', 'https://app.quickkasir.com');
            // Ensure it's HTTPS in production
            if (app()->environment('production') && !str_starts_with($frontendUrl, 'https://')) {
                $frontendUrl = str_replace('http://', 'https://', $frontendUrl);
            }
            return redirect()->away($frontendUrl . '/login?oauth_error=1');
        }
    }
}



