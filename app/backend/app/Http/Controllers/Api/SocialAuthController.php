<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
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
        try {
            // Validate Google OAuth configuration
            $clientId = config('services.google.client_id');
            $clientSecret = config('services.google.client_secret');
            $redirectUri = config('services.google.redirect');

            if (empty($clientId) || empty($clientSecret)) {
                Log::error('Google OAuth configuration missing', [
                    'client_id_set' => !empty($clientId),
                    'client_secret_set' => !empty($clientSecret),
                    'redirect_uri' => $redirectUri
                ]);
                throw new \Exception('Google OAuth tidak dikonfigurasi dengan benar. Silakan hubungi administrator.');
            }

            Log::info('Google OAuth redirect initiated', [
                'redirect_uri' => $redirectUri,
                'client_id_prefix' => substr($clientId, 0, 20) . '...'
            ]);

            return Socialite::driver('google')->redirect();
        } catch (\Throwable $e) {
            Log::error('Google OAuth redirect failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            $frontendUrl = env('FRONTEND_URL', 'https://app.quickkasir.com');
            if (app()->environment('production') && !str_starts_with($frontendUrl, 'https://')) {
                $frontendUrl = str_replace('http://', 'https://', $frontendUrl);
            }
            return redirect()->away($frontendUrl . '/login?oauth_error=1');
        }
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
            $googleId = $googleUser->getId();
            $googleEmail = strtolower(trim($googleUser->getEmail()));

            // Use database transaction to prevent race condition
            $user = \DB::transaction(function () use ($googleId, $googleEmail, $googleUser) {
                // First, try to find user by google_id (most specific)
                $user = User::where('google_id', $googleId)->first();

                // If not found by google_id, try by email (case-insensitive)
                if (!$user) {
                    $user = User::whereRaw('LOWER(email) = ?', [$googleEmail])->first();
                }

                if (!$user) {
                    // User doesn't exist, create new one
                    // Use firstOrCreate to handle potential race condition
                    try {
                        $user = User::firstOrCreate(
                            ['email' => $googleEmail],
                            [
                                'name' => $googleUser->getName() ?? ($googleUser->user['given_name'] ?? 'User'),
                                'google_id' => $googleId,
                                'password' => bcrypt(str()->random(32)),
                                'role' => 'owner',
                                'email_verified_at' => now(),
                            ]
                        );
                    } catch (\Illuminate\Database\QueryException $e) {
                        // Handle duplicate entry error (race condition)
                        if ($e->getCode() == 23000 || str_contains($e->getMessage(), 'Duplicate entry')) {
                            Log::warning('Duplicate entry during OAuth user creation, retrying...', [
                                'email' => $googleEmail,
                                'google_id' => $googleId
                            ]);
                            // Retry finding the user
                            $user = User::whereRaw('LOWER(email) = ?', [$googleEmail])->first();
                            if (!$user) {
                                throw new \Exception('Gagal membuat akun. Silakan coba lagi.');
                            }
                        } else {
                            throw $e;
                        }
                    }
                } else {
                    // User exists, update google_id if not set
                    $needsUpdate = false;
                    if (!$user->google_id) {
                        $user->google_id = $googleId;
                        $needsUpdate = true;
                    }
                    // Mark email as verified if not already
                    if (!$user->email_verified_at) {
                        $user->email_verified_at = now();
                        $needsUpdate = true;
                    }
                    // Update name if empty or different
                    $googleName = $googleUser->getName() ?? ($googleUser->user['given_name'] ?? null);
                    if ($googleName && ($user->name === 'User' || empty($user->name))) {
                        $user->name = $googleName;
                        $needsUpdate = true;
                    }
                    if ($needsUpdate) {
                        $user->save();
                    }
                }

                return $user;
            });

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
            // Log detailed error information
            $errorDetails = [
                'error' => $e->getMessage(),
                'error_class' => get_class($e),
                'query_params' => request()->all(),
                'has_code' => request()->has('code'),
                'has_error_param' => request()->has('error'),
                'error_param' => request()->get('error'),
                'error_description' => request()->get('error_description'),
            ];

            // Add trace only in debug mode
            if (config('app.debug')) {
                $errorDetails['trace'] = $e->getTraceAsString();
            }

            Log::error('Google OAuth failed', $errorDetails);

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



