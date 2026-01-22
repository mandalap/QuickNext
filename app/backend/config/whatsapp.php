<?php

return [
    /*
    |--------------------------------------------------------------------------
    | WhatsApp Service Configuration
    |--------------------------------------------------------------------------
    |
    | Konfigurasi untuk layanan WhatsApp API
    | Support: fonnte, wablas, kirimwa
    |
    */

    'enabled' => env('WHATSAPP_ENABLED', false),

    'provider' => env('WHATSAPP_PROVIDER', 'fonnte'), // fonnte, wablas, kirimwa, wablitz

    /*
    |--------------------------------------------------------------------------
    | API Configuration
    |--------------------------------------------------------------------------
    */

    'api_key' => env('WHATSAPP_API_KEY'),
    'api_url' => env('WHATSAPP_API_URL'),

    /*
    |--------------------------------------------------------------------------
    | Provider Specific URLs
    |--------------------------------------------------------------------------
    */

    'providers' => [
        'fonnte' => [
            'url' => env('WHATSAPP_API_URL', 'https://api.fonnte.com/send'),
            'header' => 'Authorization',
        ],
        'wablas' => [
            'url' => env('WHATSAPP_API_URL', 'https://api.wablas.com/api/send-message'),
            'header' => 'Authorization',
        ],
        'kirimwa' => [
            'url' => env('WHATSAPP_API_URL', 'https://api.kirimwa.id/v1/messages'),
            'header' => 'Authorization',
        ],
        'wablitz' => [
            'url' => env('WHATSAPP_API_URL', 'https://wablitz.web.id/send-message'),
            'header' => 'Content-Type',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Auto Send Settings
    |--------------------------------------------------------------------------
    */

    'auto_send_payment_receipt' => env('WHATSAPP_AUTO_SEND_RECEIPT', true),
    'auto_send_order_confirmation' => env('WHATSAPP_AUTO_SEND_ORDER', false),

    /*
    |--------------------------------------------------------------------------
    | Message Templates
    |--------------------------------------------------------------------------
    */

    'templates' => [
        'payment_receipt' => 'payment_receipt',
        'order_confirmation' => 'order_confirmation',
    ],
];

