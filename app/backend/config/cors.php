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
	    env('APP_URL', 'http://admin.quickkasir.com'),
	    env('FRONTEND_URL', 'http://app.quickkasir.com'),
	    env('LANDING_URL', 'http://www.quickkasir.com'),
	    'http://www.quickkasir.com',
	    'https://www.quickkasir.com',
	    'http://app.quickkasir.com',
	    'https://app.quickkasir.com',
	    'http://admin.quickkasir.com',
	    'https://admin.quickkasir.com',
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
