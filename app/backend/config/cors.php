<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_filter([
        env('APP_URL', 'http://localhost:8000'),
        env('FRONTEND_URL', 'http://localhost:3000'),
        env('LANDING_URL', 'http://localhost:3001'),
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://app.quickkasir.com',
        'https://quickkasir.com',
    ]),

    // ✅ FIX: Allow localhost with any port for development (PWA testing)
    'allowed_origins_patterns' => [
        '#^http://localhost:\d+$#',  // localhost dengan port apapun
        '#^http://127\.0\.0\.1:\d+$#', // 127.0.0.1 dengan port apapun
        '#^http://192\.168\.\d+\.\d+:\d+$#', // Local network IP dengan port apapun
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];
