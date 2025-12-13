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
            $frontendUrl = env('FRONTEND_URL', 'http://localhost:3000');
            $redirectUrl = $frontendUrl . '/login/sso?token=' . urlencode($token->plainTextToken);

            return redirect()->away($redirectUrl);
        } catch (\Throwable $e) {
            Log::error('Google OAuth failed', ['error' => $e->getMessage()]);
            $frontendUrl = env('FRONTEND_URL', 'http://localhost:3000');
            return redirect()->away($frontendUrl . '/login?oauth_error=1');
        }
    }
}



