<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\SocialAuthController;

Route::get('/auth/google/redirect', [SocialAuthController::class, 'redirectToGoogle']);
Route::get('/auth/google/callback', [SocialAuthController::class, 'handleGoogleCallback']);

Route::get('/', function () {
    return view('welcome');
});

// Add login route for middleware redirects
Route::get('/login', function () {
    return response()->json([
        'message' => 'Please login through the frontend application',
        'redirect_to' => '/login'
    ], 401);
})->name('login');
