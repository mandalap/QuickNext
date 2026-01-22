<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Midtrans Server Key
    |--------------------------------------------------------------------------
    |
    | Your Midtrans server key (for backend API calls)
    | Get from: https://dashboard.midtrans.com/settings/config_info
    |
    */
    'server_key' => env('MIDTRANS_SERVER_KEY'),

    /*
    |--------------------------------------------------------------------------
    | Midtrans Client Key
    |--------------------------------------------------------------------------
    |
    | Your Midtrans client key (for frontend integration)
    | Get from: https://dashboard.midtrans.com/settings/config_info
    |
    */
    'client_key' => env('MIDTRANS_CLIENT_KEY'),

    /*
    |--------------------------------------------------------------------------
    | Midtrans Environment
    |--------------------------------------------------------------------------
    |
    | Set to false for sandbox/development environment
    | Set to true for production environment
    |
    */
    'is_production' => env('MIDTRANS_IS_PRODUCTION', false),

    /*
    |--------------------------------------------------------------------------
    | Midtrans Sanitization
    |--------------------------------------------------------------------------
    |
    | Enable/disable input sanitization
    |
    */
    'is_sanitized' => env('MIDTRANS_IS_SANITIZED', true),

    /*
    |--------------------------------------------------------------------------
    | Midtrans 3DS
    |--------------------------------------------------------------------------
    |
    | Enable/disable 3D Secure authentication
    |
    */
    'is_3ds' => env('MIDTRANS_IS_3DS', true),

    /*
    |--------------------------------------------------------------------------
    | Midtrans Notification URL
    |--------------------------------------------------------------------------
    |
    | URL for receiving payment notifications from Midtrans
    |
    */
    'notification_url' => env('APP_URL') . '/api/v1/payments/midtrans/notification',

    /*
    |--------------------------------------------------------------------------
    | Midtrans Finish URL
    |--------------------------------------------------------------------------
    |
    | URL to redirect after payment is completed
    |
    */
    'finish_url' => env('FRONTEND_URL', 'http://localhost:3000') . '/payment/success',

    /*
    |--------------------------------------------------------------------------
    | Midtrans Unfinish URL
    |--------------------------------------------------------------------------
    |
    | URL to redirect if payment is not completed
    |
    */
    'unfinish_url' => env('FRONTEND_URL', 'http://localhost:3000') . '/payment/pending',

    /*
    |--------------------------------------------------------------------------
    | Midtrans Error URL
    |--------------------------------------------------------------------------
    |
    | URL to redirect if payment fails
    |
    */
    'error_url' => env('FRONTEND_URL', 'http://localhost:3000') . '/payment/failed',
];
