<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Notifications\VerifyEmailNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        // ✅ FIX: Normalize email (lowercase, trim) for consistent checking
        $normalizedEmail = strtolower(trim($request->email));
        
        // ✅ FIX: Double check email manually before validation to handle edge cases
        // Check if email exists (case-insensitive, excluding soft deleted) for better error handling
        $emailExists = User::withoutTrashed()
            ->whereRaw('LOWER(email) = ?', [$normalizedEmail])
            ->first();
        
        if ($emailExists) {
            // Email exists and not soft deleted, return error
            Log::warning('Registration attempt with existing email', [
                'input_email' => $request->email,
                'normalized_email' => $normalizedEmail,
                'existing_user_id' => $emailExists->id,
                'existing_user_email' => $emailExists->email,
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Email ini sudah terdaftar.',
                'errors' => ['email' => ['Email ini sudah terdaftar.']],
            ], 422);
        }
        
        // ✅ FIX: Update request email to normalized version for consistency
        $request->merge(['email' => $normalizedEmail]);

        $request->validate([
            'name' => 'required|string|max:255',
            // ✅ FIX: Mengabaikan soft deleted records saat validasi email unique
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users')->whereNull('deleted_at')
            ],
            'phone' => ['required', 'string', 'max:20', 'regex:/^(\+62|62|0)[0-9]{9,12}$/'],
            'password' => 'required|string|min:8|confirmed',
            'whatsapp_verified' => 'required|boolean',
        ]);

        // ✅ FIX: Check if phone is already registered (mengabaikan soft deleted records)
        $phone = $this->formatPhoneNumber($request->phone);
        $existingUser = User::withoutTrashed()->where('phone', $phone)->first();
        if ($existingUser) {
            Log::warning('Registration attempt with existing phone', [
                'phone' => $phone,
                'existing_user_id' => $existingUser->id,
                'existing_user_email' => $existingUser->email,
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Nomor WhatsApp ini sudah terdaftar.',
                'errors' => ['phone' => ['Nomor WhatsApp ini sudah terdaftar.']],
            ], 422);
        }

        // Verify WhatsApp before registration
        if (!$request->whatsapp_verified) {
            $isVerified = \App\Models\WhatsappVerification::isPhoneVerified($phone);
            if (!$isVerified) {
                return response()->json([
                    'success' => false,
                    'message' => 'Nomor WhatsApp belum diverifikasi. Silakan verifikasi terlebih dahulu.',
                    'errors' => ['whatsapp_verified' => ['Nomor WhatsApp harus diverifikasi terlebih dahulu.']],
                ], 422);
            }
        }

        // ✅ FIX: Set whatsapp_verified_at jika sudah verified saat registrasi
        // ✅ FIX: Pastikan phone disimpan dalam format yang konsisten (formatted)
        $userData = [
            'name' => $request->name,
            'email' => $request->email,
            'phone' => $phone, // ✅ Phone sudah di-format ke 62xxxxxxxxxx
            'password' => Hash::make($request->password),
            'role' => 'owner', // Set default role as owner
            // Note: address dan avatar akan diisi saat completeProfile
        ];
        
        // ✅ FIX: Set whatsapp_verified_at jika sudah verified
        if ($request->whatsapp_verified) {
            $userData['whatsapp_verified_at'] = now();
            Log::info('Setting whatsapp_verified_at during registration', [
                'phone' => $phone,
                'email' => $request->email,
            ]);
        }

        // ✅ FIX: Create user with error handling for duplicate entry
        try {
            // ✅ FIX: Use normalized email in userData
            $userData['email'] = $normalizedEmail;
            $user = User::create($userData);
        } catch (\Illuminate\Database\QueryException $e) {
            // Check if duplicate entry error (SQL error code 23000)
            if ($e->getCode() == 23000 || str_contains($e->getMessage(), 'Duplicate entry')) {
                Log::error('Duplicate entry error during registration (database constraint)', [
                    'input_email' => $request->email,
                    'normalized_email' => $normalizedEmail,
                    'phone' => $phone,
                    'error_code' => $e->getCode(),
                    'error_message' => $e->getMessage(),
                ]);
                
                // ✅ FIX: Double check again with case-insensitive search
                $existingUser = User::withoutTrashed()
                    ->whereRaw('LOWER(email) = ?', [$normalizedEmail])
                    ->first();
                
                if ($existingUser) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Email ini sudah terdaftar.',
                        'errors' => ['email' => ['Email ini sudah terdaftar.']],
                    ], 422);
                }
                
                // If not found in database check, it might be a race condition or database constraint issue
                return response()->json([
                    'success' => false,
                    'message' => 'Email atau nomor telepon sudah terdaftar.',
                    'errors' => [
                        'email' => ['Email ini sudah terdaftar.']
                    ]
                ], 422);
            }
            throw $e;
        }

        // ✅ FIX: Log phone format untuk debugging
        Log::info('User created with formatted phone', [
            'user_id' => $user->id,
            'phone' => $user->phone,
            'phone_formatted' => $this->formatPhoneNumber($user->phone),
        ]);

        // ✅ Kirim email verifikasi
        try {
            $user->notify(new VerifyEmailNotification());
            Log::info('Email verification sent', ['user_id' => $user->id, 'email' => $user->email]);
        } catch (\Exception $e) {
            Log::error('Failed to send verification email', [
                'user_id' => $user->id,
                'email' => $user->email,
                'error' => $e->getMessage()
            ]);
            // Tidak gagalkan registrasi jika email gagal dikirim
        }

        // ✅ FIX: Create token with device name (more flexible for multi-device)
        $deviceName = $request->device_name ?? 'Web Browser';
        $token = $user->createToken($deviceName)->plainTextToken;

        // Check if profile is complete
        $profileComplete = $this->isProfileComplete($user);

        // ✅ NEW: Kirim pesan selamat datang via WhatsApp
        try {
            $this->sendWelcomeMessage($user);
        } catch (\Exception $e) {
            // Jangan gagalkan registrasi jika WhatsApp gagal
            Log::warning('Failed to send welcome WhatsApp message', [
                'user_id' => $user->id,
                'phone' => $user->phone,
                'error' => $e->getMessage()
            ]);
        }
        
        // ✅ SECURITY: Set HTTP-only Secure cookie untuk token
        $cookie = cookie(
            'auth_token',
            $token,
            60 * 24 * 7, // 7 days
            '/',
            null,
            true, // Secure (HTTPS only in production)
            true, // HttpOnly (not accessible via JavaScript)
            false,
            'Strict' // SameSite
        );
        
        return response()->json([
	    'user' => $user,
	    'token' => $token,
	    'requires_subscription' => true,
	    'has_business' => false, // ← TAMBAH INI
	    'requires_profile_completion' => !$profileComplete,
	    'email_verification_sent' => true,
	    'whatsapp_verified' => true,
	    'profile_complete' => $profileComplete,
	    'message' => $profileComplete
	        ? 'Registrasi berhasil. Email dan WhatsApp Anda sudah terverifikasi. Silakan buat business terlebih dahulu.'
	        : 'Registrasi berhasil. Silakan lengkapi profil Anda terlebih dahulu sebelum membuat business.',
	], 201)->cookie($cookie);
    }

    /**
     * Verify email address
     */
    public function verifyEmail(Request $request, $id, $hash)
    {
        $user = User::findOrFail($id);

        // Check if hash matches
        if (!hash_equals((string) $hash, sha1($user->email))) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid verification link.',
            ], 400);
        }

        // Check if already verified
        if ($user->hasVerifiedEmail()) {
            return response()->json([
                'success' => true,
                'message' => 'Email already verified.',
                'already_verified' => true,
            ]);
        }

        // Mark email as verified
        $user->markEmailAsVerified();

        return response()->json([
            'success' => true,
            'message' => 'Email verified successfully.',
        ]);
    }

    /**
     * Resend verification email
     */
    public function resendVerificationEmail(Request $request)
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return response()->json([
                'success' => false,
                'message' => 'Email already verified.',
            ], 400);
        }

        try {
            $user->notify(new VerifyEmailNotification());
            return response()->json([
                'success' => true,
                'message' => 'Verification email sent successfully.',
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to resend verification email', [
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to send verification email.',
            ], 500);
        }
    }

    public function login(Request $request)
    {
        // ✅ FIX: Log request data for debugging
        Log::info('Login request received', [
            'email' => $request->email,
            'has_password' => !empty($request->password),
            'password_length' => strlen($request->password ?? ''),
            'device_name' => $request->device_name,
        ]);

        try {
            $request->validate([
                'email' => 'required|string|email',
                'password' => 'required|string',
                'device_name' => 'nullable|string|max:255', // ✅ FIX: Optional device name for token flexibility
            ]);
        } catch (ValidationException $e) {
            Log::warning('Login validation failed', [
                'email' => $request->email,
                'errors' => $e->errors(),
            ]);
            throw $e;
        }

        // ✅ FIX: Normalize email (lowercase) for consistent lookup
        $normalizedEmail = strtolower(trim($request->email));
        $request->merge(['email' => $normalizedEmail]);
        
        // ✅ FIX: Check if user exists and is not soft deleted before attempting login
        // Auth::attempt() secara default akan mengabaikan soft deleted users
        // Jadi kita perlu check secara eksplisit
        // ✅ FIX: Use case-insensitive lookup for email
        $user = User::withoutTrashed()
            ->whereRaw('LOWER(email) = ?', [$normalizedEmail])
            ->first();
        
        Log::info('User lookup result', [
            'email' => $request->email,
            'user_found' => $user ? 'yes' : 'no',
            'user_id' => $user?->id,
            'user_role' => $user?->role,
            'is_active' => $user?->is_active,
            'deleted_at' => $user?->deleted_at,
        ]);
        
        if (!$user) {
            Log::warning('Login attempt failed: User not found or soft deleted', [
                'email' => $request->email,
            ]);
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // ✅ FIX: Check if user is active
        if (isset($user->is_active) && $user->is_active === false) {
            Log::warning('Login attempt failed: User is inactive', [
                'email' => $request->email,
                'user_id' => $user->id,
                'role' => $user->role,
            ]);
            throw ValidationException::withMessages([
                'email' => ['Your account is inactive. Please contact administrator.'],
            ]);
        }

        // ✅ FIX: Verify password manually (since Auth::attempt() might not work with soft deletes)
        if (!Hash::check($request->password, $user->password)) {
            Log::warning('Login attempt failed: Invalid password', [
                'email' => $request->email,
                'user_id' => $user->id,
                'role' => $user->role,
            ]);
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // ✅ FIX: For API authentication, we don't need Auth::login()
        // We'll use the user directly to create token
        
        // ✅ FIX: Create token with device name (more flexible for multi-device)
        $deviceName = $request->device_name ?? 'Web Browser';
        $token = $user->createToken($deviceName)->plainTextToken;

        // Debug logging
        Log::info('Login attempt', [
            'email' => $request->email,
            'user_id' => $user->id,
            'user_name' => $user->name,
            'user_email' => $user->email,
            'user_role' => $user->role
        ]);

        // Check if user is an employee and get their business
        $employeeBusiness = null;
        $ownerSubscriptionStatus = null;
        $subscriptionStatus = null; // ✅ FIX: Subscription status for owner/super_admin

        // ✅ FIX: Check subscription status for owner/super_admin
        if (in_array($user->role, ['owner', 'super_admin'])) {
            $subscription = \App\Models\UserSubscription::where('user_id', $user->id)
                ->whereIn('status', ['active', 'pending_payment'])
                ->latest()
                ->first();
            
            if ($subscription) {
                $isActive = $subscription->isActive();
                $subscriptionStatus = [
                    'has_active_subscription' => $isActive,
                    'is_pending_payment' => $subscription->status === 'pending_payment',
                    'subscription_status' => $subscription->status,
                    'subscription_id' => $subscription->id,
                    'days_remaining' => $subscription->daysRemaining(),
                ];
            } else {
                $subscriptionStatus = [
                    'has_active_subscription' => false,
                    'is_pending_payment' => false,
                    'subscription_status' => null,
                    'subscription_id' => null,
                    'days_remaining' => 0,
                ];
            }
        }

        if (in_array($user->role, ['admin', 'kasir', 'kitchen', 'waiter'])) {
            $employee = \App\Models\Employee::where('user_id', $user->id)
                ->where('is_active', true)
                ->with(['business.owner.subscriptions' => function($query) {
                    $query->where('status', 'active')
                          ->where('ends_at', '>', now())
                          ->latest();
                }])
                ->first();

            if ($employee && $employee->business) {
                $employeeBusiness = $employee->business;

                // Check owner's subscription status
                $owner = $employee->business->owner;
                if ($owner) {
                    $activeSubscription = $owner->subscriptions()
                        ->where('status', 'active')
                        ->where('ends_at', '>', now())
                        ->latest()
                        ->first();

                    $ownerSubscriptionStatus = [
                        'has_active_subscription' => $activeSubscription ? true : false,
                        'subscription_expired' => !$activeSubscription,
                        'owner_id' => $owner->id,
                        'business_id' => $employee->business->id,
                    ];
                }

                // SECURITY: Check if kasir has outlet assignment
                if ($user->role === 'kasir') {
                    $hasOutletAssignment = \App\Models\EmployeeOutlet::where('user_id', $user->id)
                        ->where('business_id', $employee->business_id)
                        ->exists();

                    if (!$hasOutletAssignment) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Akun Anda belum di-assign ke outlet. Silakan hubungi admin untuk assign outlet terlebih dahulu.',
                            'error_code' => 'NO_OUTLET_ASSIGNMENT',
                            'requires_outlet_assignment' => true,
                        ], 403);
                    }
                }
            }
        }

        // ✅ SECURITY: Set HTTP-only Secure cookie untuk token
        $cookie = cookie(
            'auth_token',
            $token,
            60 * 24 * 7, // 7 days
            '/',
            null,
            config('app.env') === 'production', // Secure (HTTPS only in production)
            true, // HttpOnly (not accessible via JavaScript)
            false,
            'Strict' // SameSite
        );

        return response()->json([
            'user' => $user,
            'token' => $token, // Keep for backward compatibility (will be removed later)
            'employee_business' => $employeeBusiness,
            'owner_subscription_status' => $ownerSubscriptionStatus, // For employee roles
            'subscription_status' => $subscriptionStatus, // ✅ FIX: For owner/super_admin roles
        ])->cookie($cookie);
    }

    /**
     * Update user profile
     */
    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'name' => 'sometimes|required|string|max:255',
            // ✅ FIX: Mengabaikan soft deleted records saat validasi email unique
            'email' => [
                'sometimes',
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users')->whereNull('deleted_at')->ignore($user->id)
            ],
            'phone' => ['sometimes', 'required', 'string', 'max:20', 'regex:/^(\+62|62|0)[0-9]{9,12}$/'],
            'address' => 'sometimes|required|string|max:500',
            'avatar' => 'nullable|string',
        ]);

        $updateData = $request->only(['name', 'email', 'address', 'avatar']);
        
        // Format phone number if provided
        if ($request->has('phone') && !empty($request->phone)) {
            $updateData['phone'] = $this->formatPhoneNumber($request->phone);
            
            // Check if phone is verified (if changed)
            if ($user->phone !== $updateData['phone']) {
                $isVerified = \App\Models\WhatsappVerification::isPhoneVerified($updateData['phone']);
                if (!$isVerified) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Nomor WhatsApp baru harus diverifikasi terlebih dahulu. Silakan verifikasi nomor WhatsApp Anda.',
                        'requires_whatsapp_verification' => true,
                    ], 422);
                }
            }
        }

        $user->update($updateData);

        return response()->json([
            'success' => true,
            'message' => 'Profil berhasil diperbarui.',
            'user' => $user->fresh(),
            'profile_complete' => $this->isProfileComplete($user->fresh()),
        ]);
    }

    /**
     * Complete user profile (required before creating business)
     */
    public function completeProfile(Request $request)
    {
        $user = $request->user();

        // ✅ FIX: Handle whatsapp_verified from FormData (can be string '1'/'0' or boolean)
        // Convert to boolean before validation
        $whatsappVerifiedInput = $request->whatsapp_verified;
        if (is_string($whatsappVerifiedInput)) {
            $whatsappVerifiedInput = in_array(strtolower($whatsappVerifiedInput), ['1', 'true', 'yes'], true);
        }
        // Ensure it's boolean
        $whatsappVerifiedInput = (bool) $whatsappVerifiedInput;
        // Replace in request for validation
        $request->merge(['whatsapp_verified' => $whatsappVerifiedInput]);

        // ✅ FIX: Validate avatar as file OR URL string
        $rules = [
            'name' => 'required|string|max:255',
            // ✅ FIX: Mengabaikan soft deleted records saat validasi email unique
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users')->whereNull('deleted_at')->ignore($user->id)
            ],
            'phone' => ['required', 'string', 'max:20', 'regex:/^(\+62|62|0)[0-9]{9,12}$/'],
            'address' => 'required|string|max:500',
            'whatsapp_verified' => 'required|boolean',
        ];

        // Avatar can be either file or URL string (both optional)
        if ($request->hasFile('avatar')) {
            $rules['avatar'] = 'nullable|image|mimes:jpeg,jpg,png,gif,webp|max:5120'; // 5MB max
        } else {
            // Allow avatar_url if no file is uploaded
            $rules['avatar_url'] = 'nullable|string|url|max:500';
        }

        $request->validate($rules);

        // Format phone number
        $phone = $this->formatPhoneNumber($request->phone);
        
        // ✅ FIX: Format user's current phone for comparison
        $userPhoneFormatted = $this->formatPhoneNumber($user->phone ?? '');
        
        // ✅ FIX: If phone is the same (formatted), it's the same user's phone - always allow
        if ($userPhoneFormatted === $phone) {
            Log::info('User completing profile with same phone number', [
                'user_id' => $user->id,
                'phone' => $phone,
                'user_phone' => $user->phone,
                'user_phone_formatted' => $userPhoneFormatted,
            ]);
            // Skip phone uniqueness check - it's the same user's phone
        } else {
            // ✅ FIX: Phone number changed, check if it's registered by another user
            // Check both formatted and unformatted versions to catch all cases
            $existingUser = User::withoutTrashed()
                ->where(function($query) use ($phone, $request) {
                    $query->where('phone', $phone)
                          ->orWhere('phone', $this->formatPhoneNumber($request->phone));
                })
                ->where('id', '!=', $user->id)
                ->first();
            
            if ($existingUser) {
                Log::warning('Phone number already registered by another user', [
                    'user_id' => $user->id,
                    'phone' => $phone,
                    'existing_user_id' => $existingUser->id,
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Nomor WhatsApp ini sudah terdaftar oleh user lain.',
                    'errors' => ['phone' => ['Nomor WhatsApp ini sudah terdaftar.']],
                ], 422);
            }
        }

        // ✅ FIX: Verify WhatsApp if phone changed or not verified
        // If phone is the same (formatted) and already verified, skip verification
        // Note: $userPhoneFormatted sudah di-set di atas (line 358)
        if ($userPhoneFormatted === $phone && $user->whatsapp_verified_at) {
            // User is using the same phone number that's already verified
            Log::info('User using already verified phone number', [
                'user_id' => $user->id,
                'phone' => $phone,
            ]);
        } elseif ($userPhoneFormatted !== $phone || !$whatsappVerifiedInput) {
            // Phone changed or not verified, need to verify
            $isVerified = \App\Models\WhatsappVerification::isPhoneVerified($phone);
            if (!$isVerified) {
                return response()->json([
                    'success' => false,
                    'message' => 'Nomor WhatsApp belum diverifikasi. Silakan verifikasi nomor WhatsApp Anda terlebih dahulu.',
                    'errors' => ['whatsapp_verified' => ['Nomor WhatsApp harus diverifikasi terlebih dahulu.']],
                ], 422);
            }
        }

        // ✅ FIX: Handle avatar upload or URL
        $avatarPath = null;
        if ($request->hasFile('avatar')) {
            // Delete old avatar if exists
            if ($user->avatar && !str_starts_with($user->avatar, 'http')) {
                $imageService = new \App\Services\ImageOptimizationService();
                $imageService->deleteImage($user->avatar);
            }

            // Optimize and save new avatar
            $imageService = new \App\Services\ImageOptimizationService();
            $avatarPath = $imageService->optimizeAndSave(
                $request->file('avatar'),
                'avatars',
                400,  // max width for avatar
                85    // quality
            );
        } elseif ($request->has('avatar_url') && $request->avatar_url) {
            // Use URL if provided
            $avatarPath = $request->avatar_url;
        } elseif ($request->has('avatar') && $request->avatar) {
            // Fallback: use avatar string (for backward compatibility)
            $avatarPath = $request->avatar;
        } else {
            // Keep existing avatar if not changed
            $avatarPath = $user->avatar;
        }

        // ✅ FIX: Update user profile
        // If phone is verified, also update whatsapp_verified_at
        $updateData = [
            'name' => $request->name,
            'email' => $request->email,
            'phone' => $phone,
            'address' => $request->address,
            'avatar' => $avatarPath,
        ];
        
        // If WhatsApp is verified, update verified_at timestamp
        if ($whatsappVerifiedInput || ($user->phone === $phone && $user->whatsapp_verified_at)) {
            $updateData['whatsapp_verified_at'] = now();
        }
        
        $user->update($updateData);

        return response()->json([
            'success' => true,
            'message' => 'Profil berhasil dilengkapi. Anda sekarang bisa membuat bisnis.',
            'user' => $user->fresh(),
            'profile_complete' => true,
            'can_create_business' => true,
        ]);
    }

    /**
     * Check if user profile is complete
     */
    public function checkProfileComplete(Request $request)
    {
        $user = $request->user();
        $isComplete = $this->isProfileComplete($user);
        
        $missingFields = [];
        if (empty($user->name)) $missingFields[] = 'name';
        if (empty($user->phone)) $missingFields[] = 'phone';
        if (empty($user->address)) $missingFields[] = 'address';
        if (empty($user->email)) $missingFields[] = 'email';
        
        // ✅ FIX: Check WhatsApp verification from multiple sources
        // 1. Check whatsapp_verified_at in User model (set during registration)
        // 2. Check WhatsappVerification table (OTP verification)
        $whatsappVerified = false;
        if (!empty($user->phone)) {
            // ✅ Priority 1: Check whatsapp_verified_at (set during registration)
            if ($user->whatsapp_verified_at) {
                $whatsappVerified = true;
                Log::info('WhatsApp verified via whatsapp_verified_at', [
                    'user_id' => $user->id,
                    'phone' => $user->phone,
                    'verified_at' => $user->whatsapp_verified_at,
                ]);
            } else {
                // ✅ Priority 2: Check WhatsappVerification table (OTP verification)
                $whatsappVerified = \App\Models\WhatsappVerification::isPhoneVerified($user->phone);
                if ($whatsappVerified) {
                    Log::info('WhatsApp verified via WhatsappVerification table', [
                        'user_id' => $user->id,
                        'phone' => $user->phone,
                    ]);
                }
            }
        }
        
        return response()->json([
            'profile_complete' => $isComplete,
            'can_create_business' => $isComplete,
            'missing_fields' => $missingFields,
            'whatsapp_verified' => $whatsappVerified,
            'whatsapp_verified_at' => $user->whatsapp_verified_at?->toDateTimeString(), // ✅ Return verified_at timestamp
            'user' => $user,
        ]);
    }

    /**
     * Check if profile is complete
     */
    private function isProfileComplete($user): bool
    {
        if (empty($user->name)) return false;
        if (empty($user->email)) return false;
        if (empty($user->phone)) return false;
        if (empty($user->address)) return false;
        
        // ✅ FIX: Check WhatsApp verification from multiple sources
        // Priority 1: Check whatsapp_verified_at (set during registration)
        if ($user->whatsapp_verified_at) {
            return true;
        }
        
        // Priority 2: Check WhatsappVerification table (OTP verification)
        if (!\App\Models\WhatsappVerification::isPhoneVerified($user->phone)) {
            return false;
        }
        
        return true;
    }

    /**
     * Change user password
     */
    public function changePassword(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:8|confirmed',
        ]);

        // Verify current password
        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Password saat ini tidak benar.',
            ], 422);
        }

        // Update password
        $user->update([
            'password' => Hash::make($request->new_password),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Password berhasil diubah.',
        ]);
    }

    /**
     * Send password reset link via email and WhatsApp
     * Accepts either email or phone number
     */
    public function forgotPassword(Request $request)
    {
        $request->validate([
            'email' => 'nullable|string|email',
            'phone' => 'nullable|string',
        ], [
            'email.required_without' => 'Email atau nomor WhatsApp harus diisi.',
            'phone.required_without' => 'Email atau nomor WhatsApp harus diisi.',
        ]);

        // Ensure at least one is provided
        if (!$request->email && !$request->phone) {
            return response()->json([
                'success' => false,
                'message' => 'Email atau nomor WhatsApp harus diisi.',
            ], 422);
        }

        // Find user by email or phone
        $user = null;
        if ($request->email) {
        $user = User::where('email', $request->email)->first();
        } elseif ($request->phone) {
            // Format phone number for search (remove +, spaces, dashes)
            $phone = preg_replace('/[^0-9]/', '', $request->phone);
            
            // Normalize phone number formats to try
            $phoneVariants = [];
            
            // Original format
            $phoneVariants[] = $phone;
            
            // With 62 prefix (if starts with 0)
            if (substr($phone, 0, 1) === '0') {
                $phoneVariants[] = '62' . substr($phone, 1);
            }
            
            // Without 62 prefix (if starts with 62)
            if (substr($phone, 0, 2) === '62') {
                $phoneVariants[] = '0' . substr($phone, 2);
            }
            
            // If doesn't start with 0 or 62, try adding both
            if (substr($phone, 0, 1) !== '0' && substr($phone, 0, 2) !== '62') {
                $phoneVariants[] = '0' . $phone;
                $phoneVariants[] = '62' . $phone;
            }
            
            // Remove duplicates
            $phoneVariants = array_unique($phoneVariants);
            
            // Search with all variants
            $user = User::whereIn('phone', $phoneVariants)->first();
        }

        if (!$user) {
            // Return success even if user not found (security best practice)
            return response()->json([
                'success' => true,
                'message' => 'Jika email/nomor WhatsApp terdaftar, link reset password telah dikirim ke email dan WhatsApp Anda.',
            ]);
        }

        // Generate password reset token
        $token = \Illuminate\Support\Str::random(64);
        
        // Store token in password_reset_tokens table
        \DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $user->email],
            [
                'token' => Hash::make($token),
                'created_at' => now(),
            ]
        );

        // Send email notification
        try {
            $user->notify(new \App\Notifications\ForgotPasswordNotification($token));
            Log::info('Password reset email sent', [
                'user_id' => $user->id,
                'email' => $user->email
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send password reset email', [
                'user_id' => $user->id,
                'email' => $user->email,
                'error' => $e->getMessage()
            ]);
        }

        // Send WhatsApp notification
        if ($user->phone) {
            try {
                Log::info('Attempting to send password reset WhatsApp', [
                    'user_id' => $user->id,
                    'phone' => $user->phone,
                    'email' => $user->email
                ]);
                $this->sendPasswordResetWhatsApp($user, $token);
                Log::info('Password reset WhatsApp sent successfully', [
                    'user_id' => $user->id,
                    'phone' => $user->phone
                ]);
            } catch (\Exception $e) {
                Log::error('Failed to send password reset WhatsApp', [
                    'user_id' => $user->id,
                    'phone' => $user->phone,
                    'email' => $user->email,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                // Don't fail if WhatsApp fails
            }
        } else {
            Log::warning('User has no phone number for WhatsApp password reset', [
                'user_id' => $user->id,
                'email' => $user->email
            ]);
        }

        // Determine message based on input type
        $message = 'Jika email/nomor WhatsApp terdaftar, link reset password telah dikirim.';
        if ($request->phone && !$request->email) {
            $message = 'Jika nomor WhatsApp terdaftar, link reset password telah dikirim ke WhatsApp Anda.';
        } elseif ($request->email) {
            $message = 'Jika email terdaftar, link reset password telah dikirim ke email dan WhatsApp Anda.';
        }

        return response()->json([
            'success' => true,
            'message' => $message,
        ]);
    }

    /**
     * Reset password using token
     */
    public function resetPassword(Request $request)
    {
        $request->validate([
            'token' => 'required|string',
            'email' => 'required|string|email',
            'password' => 'required|string|min:8|confirmed',
        ]);

        // Check if token exists and is valid
        $passwordReset = \DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->first();

        if (!$passwordReset) {
            return response()->json([
                'success' => false,
                'message' => 'Token reset password tidak valid atau sudah kadaluarsa.',
            ], 422);
        }

        // Check if token is expired (60 minutes)
        if (now()->diffInMinutes($passwordReset->created_at) > 60) {
            \DB::table('password_reset_tokens')->where('email', $request->email)->delete();
            return response()->json([
                'success' => false,
                'message' => 'Token reset password sudah kadaluarsa. Silakan request reset password baru.',
            ], 422);
        }

        // Verify token
        if (!Hash::check($request->token, $passwordReset->token)) {
            return response()->json([
                'success' => false,
                'message' => 'Token reset password tidak valid.',
            ], 422);
        }

        // Find user
        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User tidak ditemukan.',
            ], 404);
        }

        // Update password
        $user->update([
            'password' => Hash::make($request->password),
        ]);

        // Delete used token
        \DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        Log::info('Password reset successful', [
            'user_id' => $user->id,
            'email' => $user->email
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Password berhasil direset. Silakan login dengan password baru Anda.',
        ]);
    }

    /**
     * Send password reset link via WhatsApp
     */
    private function sendPasswordResetWhatsApp(User $user, string $token): void
    {
        $frontendUrl = env('FRONTEND_URL', 'https://app.quickkasir.com');
        $resetUrl = $frontendUrl . '/reset-password?token=' . $token . '&email=' . urlencode($user->email);

        $message = "🔐 *RESET PASSWORD QUICKKASIR*\n\n";
        $message .= "Halo *{$user->name}*,\n\n";
        $message .= "Kami menerima permintaan untuk mereset password akun Anda.\n\n";
        $message .= "Silakan klik link di bawah ini untuk mereset password:\n\n";
        $message .= "🔗 {$resetUrl}\n\n";
        $message .= "━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
        $message .= "⏰ Link ini berlaku selama *60 menit*.\n\n";
        $message .= "⚠️ *Jangan bagikan link ini kepada siapapun!*\n\n";
        $message .= "Jika Anda tidak meminta reset password, abaikan pesan ini dan password Anda tidak akan berubah.\n\n";
        $message .= "_Pesan otomatis dari QuickKasir - Sistem POS Terpercaya_";

        Log::info('Preparing password reset WhatsApp message', [
            'user_id' => $user->id,
            'phone' => $user->phone,
            'reset_url' => $resetUrl
        ]);

        // Try to use WhatsAppService if available
        if (class_exists(\App\Services\WhatsAppService::class)) {
            try {
                Log::info('Trying WhatsAppService for password reset', [
                    'user_id' => $user->id,
                    'phone' => $user->phone
                ]);
                
                $whatsappService = new \App\Services\WhatsAppService(null); // null = use global config
                $result = $whatsappService->sendMessage($user->phone, $message);
                
                Log::info('WhatsAppService result', [
                    'user_id' => $user->id,
                    'phone' => $user->phone,
                    'result' => $result
                ]);
                
                if (isset($result['success']) && $result['success']) {
                    Log::info('Password reset WhatsApp sent successfully via WhatsAppService', [
                        'user_id' => $user->id,
                        'phone' => $user->phone
                    ]);
                    return;
                } else {
                    Log::warning('WhatsAppService returned unsuccessful result', [
                        'user_id' => $user->id,
                        'phone' => $user->phone,
                        'result' => $result
                    ]);
                }
            } catch (\Exception $e) {
                Log::warning('WhatsAppService failed, trying direct API', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
            }
        } else {
            Log::info('WhatsAppService class not found, using direct API', [
                'user_id' => $user->id,
                'phone' => $user->phone
            ]);
        }

        // Fallback: Use direct API call
        $this->sendWhatsAppDirect($user->phone, $message);
    }

    /**
     * Send WhatsApp via direct API (helper method)
     */
    private function sendWhatsAppDirect(string $phone, string $message): void
    {
        // Get active WhatsApp token
        $token = \App\Models\WhatsappApiToken::where('status', 'active')->first();

        if (!$token) {
            Log::warning('No active WhatsApp token found in database, trying config fallback', [
                'phone' => $phone
            ]);
            
            // Fallback: Try using config WhatsApp settings
            $this->sendWhatsAppViaConfig($phone, $message);
            return;
        }

        Log::info('Using WhatsApp token from database', [
            'phone' => $phone,
            'token_id' => $token->id,
            'provider' => $token->provider ?? 'unknown'
        ]);

        // Decrypt API token if needed
        $apiToken = $token->api_token;
        try {
            if (strpos($apiToken, 'eyJpdiI6') === 0) {
                $apiToken = decrypt($apiToken);
            }
        } catch (\Exception $e) {
            Log::warning('Failed to decrypt WhatsApp API token', [
                'error' => $e->getMessage()
            ]);
        }

        // Prepare data
        $data = [
            'api_key' => $apiToken,
            'sender' => $token->sender,
            'number' => $phone,
            'message' => $message,
        ];

        // Send via cURL
        $curl = curl_init();
        curl_setopt_array($curl, [
            CURLOPT_URL => $token->url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_ENCODING => '',
            CURLOPT_MAXREDIRS => 10,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_CUSTOMREQUEST => 'POST',
            CURLOPT_POSTFIELDS => json_encode($data),
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
            ],
        ]);

        $response = curl_exec($curl);
        $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        $error = curl_error($curl);
        curl_close($curl);

        if ($error) {
            Log::error('WhatsApp CURL Error', [
                'error' => $error,
                'phone' => $phone,
            ]);
            return;
        }

        if ($httpCode >= 200 && $httpCode < 300) {
            Log::info('WhatsApp message sent successfully (direct API)', [
                'phone' => $phone,
                'http_code' => $httpCode,
            ]);
        } else {
            Log::warning('WhatsApp API Error', [
                'http_code' => $httpCode,
                'response' => $response,
                'phone' => $phone,
            ]);
        }
    }

    /**
     * Send WhatsApp via config (fallback if no token in database)
     */
    private function sendWhatsAppViaConfig(string $phone, string $message): void
    {
        $apiKey = config('whatsapp.api_key');
        $apiUrl = config('whatsapp.api_url');
        $provider = config('whatsapp.provider', 'fonnte');
        $enabled = config('whatsapp.enabled', false);

        if (!$enabled || !$apiKey || !$apiUrl) {
            Log::warning('WhatsApp not configured or disabled', [
                'phone' => $phone,
                'enabled' => $enabled,
                'has_api_key' => !empty($apiKey),
                'has_api_url' => !empty($apiUrl)
            ]);
            return;
        }

        Log::info('Sending WhatsApp via config', [
            'phone' => $phone,
            'provider' => $provider,
            'api_url' => $apiUrl
        ]);

        // Prepare data based on provider
        $data = [];
        $headers = [];

        switch ($provider) {
            case 'fonnte':
                $data = [
                    'target' => $phone,
                    'message' => $message,
                ];
                $headers = [
                    'Authorization: ' . $apiKey,
                ];
                break;

            case 'wablas':
                $data = [
                    'phone' => $phone,
                    'message' => $message,
                ];
                $headers = [
                    'Authorization: ' . $apiKey,
                ];
                break;

            case 'kirimwa':
                $data = [
                    'phone_number' => $phone,
                    'message' => $message,
                ];
                $headers = [
                    'Authorization: Bearer ' . $apiKey,
                ];
                break;

            default:
                $data = [
                    'number' => $phone,
                    'message' => $message,
                ];
                $headers = [
                    'Authorization: ' . $apiKey,
                ];
        }

        // Send via cURL
        $curl = curl_init();
        curl_setopt_array($curl, [
            CURLOPT_URL => $apiUrl,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_ENCODING => '',
            CURLOPT_MAXREDIRS => 10,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_CUSTOMREQUEST => 'POST',
            CURLOPT_POSTFIELDS => json_encode($data),
            CURLOPT_HTTPHEADER => array_merge([
                'Content-Type: application/json',
            ], $headers),
        ]);

        $response = curl_exec($curl);
        $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        $error = curl_error($curl);
        curl_close($curl);

        if ($error) {
            Log::error('WhatsApp CURL Error (config fallback)', [
                'error' => $error,
                'phone' => $phone,
                'provider' => $provider
            ]);
            return;
        }

        if ($httpCode >= 200 && $httpCode < 300) {
            Log::info('WhatsApp message sent successfully (config fallback)', [
                'phone' => $phone,
                'http_code' => $httpCode,
                'provider' => $provider
            ]);
        } else {
            Log::warning('WhatsApp API Error (config fallback)', [
                'http_code' => $httpCode,
                'response' => $response,
                'phone' => $phone,
                'provider' => $provider
            ]);
        }
    }

    /**
     * Send WhatsApp OTP for verification
     */
    public function sendWhatsAppOTP(Request $request)
    {
        $request->validate([
            'phone' => ['required', 'string', 'max:20', 'regex:/^(\+62|62|0)[0-9]{9,12}$/'],
        ]);

        $phone = $this->formatPhoneNumber($request->phone);

        // ✅ FIX: Check if phone is already registered by another user
        // Allow if it's the same user (for profile completion or re-verification)
        $currentUser = auth()->user();
        
        // If user is logged in and this is their phone number, allow it
        if ($currentUser && $currentUser->phone === $phone) {
            // User is trying to verify their own number - this is allowed
            Log::info('User verifying their own phone number', [
                'user_id' => $currentUser->id,
                'phone' => $phone,
            ]);
        } else {
            // ✅ FIX: Check if phone is registered by another user (mengabaikan soft deleted)
            $existingUser = User::withoutTrashed()
                ->where('phone', $phone)
                ->when($currentUser, function ($query) use ($currentUser) {
                    return $query->where('id', '!=', $currentUser->id);
                })
                ->first();
            
            if ($existingUser) {
                return response()->json([
                    'success' => false,
                    'message' => 'Nomor WhatsApp ini sudah terdaftar oleh user lain.',
                ], 422);
            }
        }

        // Create or update verification code
        $verification = \App\Models\WhatsappVerification::createOrUpdateCode($phone);
        $code = $verification->code;

        // Send OTP via WhatsApp
        try {
            $this->sendOTPWhatsApp($phone, $code);
            
            Log::info('WhatsApp OTP sent', [
                'phone' => $phone,
                'code' => $code,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Kode verifikasi telah dikirim ke WhatsApp Anda.',
                'expires_in' => 10, // minutes
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send WhatsApp OTP', [
                'phone' => $phone,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal mengirim kode verifikasi. Pastikan nomor WhatsApp Anda benar dan aktif.',
            ], 500);
        }
    }

    /**
     * Verify WhatsApp OTP
     */
    public function verifyWhatsAppOTP(Request $request)
    {
        $request->validate([
            'phone' => ['required', 'string', 'max:20', 'regex:/^(\+62|62|0)[0-9]{9,12}$/'],
            'code' => 'required|string|size:6',
        ]);

        $phone = $this->formatPhoneNumber($request->phone);
        $code = $request->code;

        $isVerified = \App\Models\WhatsappVerification::verifyCode($phone, $code);

        if (!$isVerified) {
            return response()->json([
                'success' => false,
                'message' => 'Kode verifikasi tidak valid atau sudah kadaluarsa. Silakan minta kode baru.',
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Nomor WhatsApp berhasil diverifikasi.',
            'verified' => true,
        ]);
    }

    /**
     * Format phone number to standard format (62xxxxxxxxxx)
     */
    private function formatPhoneNumber(string $phone): string
    {
        // Remove all non-numeric characters
        $phone = preg_replace('/[^0-9]/', '', $phone);
        
        // Convert to 62 format
        if (substr($phone, 0, 1) === '0') {
            $phone = '62' . substr($phone, 1);
        } elseif (substr($phone, 0, 2) !== '62') {
            $phone = '62' . $phone;
        }
        
        return $phone;
    }

    /**
     * Send welcome message to new owner via WhatsApp
     */
    private function sendWelcomeMessage(User $user): void
    {
        // Check if user has phone number
        if (!$user->phone) {
            Log::info('Skipping welcome message: No phone number', [
                'user_id' => $user->id
            ]);
            return;
        }

        // Build welcome message
        $message = $this->buildWelcomeMessage($user);

        // Try to use WhatsAppService if available
        if (class_exists(\App\Services\WhatsAppService::class)) {
            try {
                $whatsappService = new \App\Services\WhatsAppService(null); // null = use global config
                $result = $whatsappService->sendMessage($user->phone, $message);
                
                if (isset($result['success']) && $result['success']) {
                    Log::info('Welcome WhatsApp message sent successfully', [
                        'user_id' => $user->id,
                        'phone' => $user->phone
                    ]);
                    return;
                } else {
                    Log::warning('WhatsAppService returned failure', [
                        'user_id' => $user->id,
                        'result' => $result
                    ]);
                }
            } catch (\Exception $e) {
                Log::warning('WhatsAppService failed, trying direct API', [
                    'error' => $e->getMessage()
                ]);
            }
        }

        // Fallback: Use direct API call (similar to OTP sending)
        $this->sendWelcomeMessageDirect($user->phone, $message);
    }

    /**
     * Build welcome message for new owner
     */
    private function buildWelcomeMessage(User $user): string
    {
        $userName = $user->name;
        
        $message = "🎉 *SELAMAT DATANG DI QUICKKASIR!*\n\n";
        $message .= "Halo *{$userName}*,\n\n";
        $message .= "Terima kasih telah bergabung dengan *QuickKasir* - Sistem POS Terpercaya untuk mengelola bisnis Anda dengan lebih mudah dan efisien.\n\n";
        $message .= "━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
        $message .= "✨ *Apa yang bisa Anda lakukan?*\n\n";
        $message .= "✅ Kelola produk & inventori\n";
        $message .= "✅ Transaksi penjualan cepat\n";
        $message .= "✅ Laporan keuangan real-time\n";
        $message .= "✅ Manajemen karyawan & outlet\n";
        $message .= "✅ Integrasi pembayaran digital\n";
        $message .= "✅ Dan banyak lagi fitur menarik!\n\n";
        $message .= "━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
        $message .= "🚀 *Langkah Selanjutnya:*\n\n";
        $message .= "1️⃣ Lengkapi profil Anda\n";
        $message .= "2️⃣ Pilih paket subscription\n";
        $message .= "3️⃣ Buat bisnis pertama Anda\n";
        $message .= "4️⃣ Mulai kelola bisnis dengan mudah!\n\n";
        $message .= "━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
        $message .= "💡 *Butuh bantuan?*\n";
        $message .= "Tim support kami siap membantu Anda 24/7.\n\n";
        $message .= "Selamat menikmati pengalaman terbaik dengan QuickKasir! 🎊\n\n";
        $message .= "_Pesan otomatis dari QuickKasir - Sistem POS Terpercaya_";

        return $message;
    }

    /**
     * Send welcome message via direct WhatsApp API (fallback)
     */
    private function sendWelcomeMessageDirect(string $phone, string $message): void
    {
        // Get active WhatsApp token
        $token = \App\Models\WhatsappApiToken::where('status', 'active')->first();

        if (!$token) {
            Log::info('No active WhatsApp token found for welcome message', [
                'phone' => $phone
            ]);
            return; // Don't throw exception, just log
        }

        // Decrypt API token if needed
        $apiToken = $token->api_token;
        try {
            // Check if encrypted (starts with eyJpdiI6)
            if (strpos($apiToken, 'eyJpdiI6') === 0) {
                $apiToken = decrypt($apiToken);
            }
        } catch (\Exception $e) {
            Log::warning('Failed to decrypt WhatsApp API token for welcome message', [
                'error' => $e->getMessage()
            ]);
            // Continue with original token
        }

        // Prepare data
        $data = [
            'api_key' => $apiToken,
            'sender' => $token->sender,
            'number' => $phone,
            'message' => $message,
        ];

        // Send via cURL
        $curl = curl_init();
        curl_setopt_array($curl, [
            CURLOPT_URL => $token->url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_ENCODING => '',
            CURLOPT_MAXREDIRS => 10,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_CUSTOMREQUEST => 'POST',
            CURLOPT_POSTFIELDS => json_encode($data),
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
            ],
        ]);

        $response = curl_exec($curl);
        $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        $error = curl_error($curl);
        curl_close($curl);

        if ($error) {
            Log::error('Welcome message CURL Error', [
                'error' => $error,
                'phone' => $phone,
                'url' => $token->url,
            ]);
            return; // Don't throw exception
        }

        // Parse response
        $responseData = json_decode($response, true);
        
        if ($httpCode >= 200 && $httpCode < 300) {
            Log::info('Welcome WhatsApp message sent successfully (direct API)', [
                'phone' => $phone,
                'http_code' => $httpCode,
                'provider' => $token->provider ?? 'unknown',
            ]);
        } else {
            Log::warning('Welcome message API Error', [
                'http_code' => $httpCode,
                'response' => $response,
                'phone' => $phone,
                'url' => $token->url,
                'provider' => $token->provider ?? 'unknown',
            ]);
        }
    }

    /**
     * Send OTP via WhatsApp
     */
    private function sendOTPWhatsApp(string $phone, string $code): void
    {
        // Get active WhatsApp token
        $token = \App\Models\WhatsappApiToken::where('status', 'active')->first();

        if (!$token) {
            Log::error('No active WhatsApp token found for OTP', [
                'phone' => $phone
            ]);
            throw new \Exception('Tidak ada konfigurasi WhatsApp yang aktif. Silakan hubungi administrator untuk mengkonfigurasi WhatsApp API di Filament Admin Panel.');
        }

        // Decrypt API token if needed
        $apiToken = $token->api_token;
        try {
            // Check if encrypted (starts with eyJpdiI6)
            if (strpos($apiToken, 'eyJpdiI6') === 0) {
                $apiToken = decrypt($apiToken);
            }
        } catch (\Exception $e) {
            Log::warning('Failed to decrypt WhatsApp API token', [
                'error' => $e->getMessage()
            ]);
            // Continue with original token
        }

        // Build message
        $message = "🔐 *KODE VERIFIKASI QUICKKASIR*\n\n" .
            "Halo! Anda menerima pesan ini dari *QuickKasir*.\n\n" .
            "Kode verifikasi Anda adalah:\n\n" .
            "*{$code}*\n\n" .
            "Kode ini berlaku selama 10 menit.\n\n" .
            "⚠️ Jangan bagikan kode ini kepada siapapun.\n\n" .
            "Jika Anda tidak meminta kode ini, abaikan pesan ini.\n\n" .
            "_Pesan otomatis dari QuickKasir - Sistem POS Terpercaya_";

        // Prepare data
        $data = [
            'api_key' => $apiToken,
            'sender' => $token->sender,
            'number' => $phone,
            'message' => $message,
        ];

        // Send via cURL
        $curl = curl_init();
        curl_setopt_array($curl, [
            CURLOPT_URL => $token->url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_ENCODING => '',
            CURLOPT_MAXREDIRS => 10,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_CUSTOMREQUEST => 'POST',
            CURLOPT_POSTFIELDS => json_encode($data),
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
            ],
        ]);

        $response = curl_exec($curl);
        $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        $error = curl_error($curl);
        curl_close($curl);

        if ($error) {
            Log::error('WhatsApp OTP CURL Error', [
                'error' => $error,
                'phone' => $phone,
                'url' => $token->url,
            ]);
            throw new \Exception("Gagal mengirim pesan WhatsApp: {$error}. Pastikan URL API WhatsApp benar dan server dapat mengakses internet.");
        }

        // Parse response
        $responseData = json_decode($response, true);
        
        if ($httpCode < 200 || $httpCode >= 300) {
            Log::error('WhatsApp OTP API Error', [
                'http_code' => $httpCode,
                'response' => $response,
                'phone' => $phone,
                'url' => $token->url,
                'provider' => $token->provider ?? 'unknown',
            ]);
            
            $errorMessage = 'Gagal mengirim OTP';
            if (isset($responseData['message'])) {
                $errorMessage = $responseData['message'];
            } elseif (isset($responseData['error'])) {
                $errorMessage = $responseData['error'];
            } else {
                $errorMessage = "HTTP {$httpCode}";
            }
            
            throw new \Exception($errorMessage);
        }

        // Check response for success indicators
        $isSuccess = false;
        if (isset($responseData['success']) && $responseData['success']) {
            $isSuccess = true;
        } elseif (isset($responseData['status']) && in_array(strtolower($responseData['status']), ['success', 'sent', 'ok'])) {
            $isSuccess = true;
        } elseif ($httpCode >= 200 && $httpCode < 300) {
            $isSuccess = true;
        }

        if (!$isSuccess) {
            $errorMessage = $responseData['message'] ?? $responseData['error'] ?? 'Unknown error';
            Log::error('WhatsApp OTP failed', [
                'response' => $response,
                'phone' => $phone,
                'http_code' => $httpCode,
            ]);
            throw new \Exception("Gagal mengirim OTP: {$errorMessage}");
        }

        // Log success
        Log::info('WhatsApp OTP sent successfully', [
            'phone' => $phone,
            'http_code' => $httpCode,
            'provider' => $token->provider ?? 'unknown',
        ]);
    }

    /**
     * Get all tokens for current user (device management)
     * ✅ FIX: Token-based authentication with device management
     */
    public function tokens(Request $request)
    {
        $user = $request->user();
        
        $tokens = $user->tokens()->get()->map(function ($token) {
            return [
                'id' => $token->id,
                'name' => $token->name,
                'last_used_at' => $token->last_used_at?->toDateTimeString(),
                'created_at' => $token->created_at->toDateTimeString(),
            ];
        });

        return response()->json([
            'success' => true,
            'tokens' => $tokens,
        ]);
    }

    /**
     * Revoke specific token (logout from specific device)
     * ✅ FIX: Token-based authentication with device management
     */
    public function revokeToken(Request $request, $tokenId)
    {
        $user = $request->user();
        
        // Revoke specific token
        $token = $user->tokens()->where('id', $tokenId)->first();
        
        if (!$token) {
            return response()->json([
                'success' => false,
                'message' => 'Token not found',
            ], 404);
        }

        $token->delete();

        return response()->json([
            'success' => true,
            'message' => 'Token revoked successfully',
        ]);
    }

    /**
     * Revoke all tokens except current (logout from all other devices)
     * ✅ FIX: Token-based authentication with device management
     */
    public function revokeAllTokens(Request $request)
    {
        $user = $request->user();
        $currentToken = $request->user()->currentAccessToken();
        
        // Revoke all tokens except current
        $user->tokens()->where('id', '!=', $currentToken->id)->delete();

        return response()->json([
            'success' => true,
            'message' => 'All other tokens revoked successfully',
        ]);
    }

    /**
     * Refresh token (get new token)
     * ✅ SECURITY: Refresh token strategy for better UX
     */
    public function refreshToken(Request $request)
    {
        $user = $request->user();
        
        // Revoke old token
        $request->user()->currentAccessToken()->delete();
        
        // Create new token
        $newToken = $user->createToken('Web Browser')->plainTextToken;
        
        // ✅ SECURITY: Set HTTP-only Secure cookie untuk new token
        $cookie = cookie(
            'auth_token',
            $newToken,
            60 * 24 * 7, // 7 days
            '/',
            null,
            config('app.env') === 'production', // Secure (HTTPS only in production)
            true, // HttpOnly
            false,
            'Strict' // SameSite
        );
        
        return response()->json([
            'success' => true,
            'token' => $newToken, // Keep for backward compatibility
            'message' => 'Token refreshed successfully',
        ])->cookie($cookie);
    }

    /**
     * Logout (revoke current token)
     * ✅ FIX: Token-based authentication
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        // ✅ SECURITY: Clear auth cookie
        $cookie = cookie()->forget('auth_token');

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully',
        ])->cookie($cookie);
    }
}
