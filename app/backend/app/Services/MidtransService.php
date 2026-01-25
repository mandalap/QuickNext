<?php

namespace App\Services;

use App\Models\Business;
use App\Models\Outlet;
use Midtrans\Config;
use Midtrans\Snap;
use Midtrans\Transaction;
use Midtrans\Notification;
use Illuminate\Support\Facades\Log;

class MidtransService
{
    protected $config;

    /**
     * Constructor - accepts optional config array
     * If no config provided, uses global config (backward compatible)
     *
     * @param array|null $config
     */
    public function __construct($config = null)
    {
        if ($config) {
            // Use provided config (from business)
            $this->config = $config;
        } else {
            // Use global config (default - backward compatible)
            $this->config = [
                'server_key' => config('midtrans.server_key'),
                'client_key' => config('midtrans.client_key'),
                'is_production' => config('midtrans.is_production', false),
                'is_sanitized' => config('midtrans.is_sanitized', true),
                'is_3ds' => config('midtrans.is_3ds', true),
            ];
        }

        // ✅ CRITICAL: Validate ServerKey before setting
        if (empty($this->config['server_key']) || $this->config['server_key'] === null) {
            Log::error('Midtrans ServerKey is null or empty', [
                'config_source' => $config ? 'custom' : 'global',
                'has_server_key' => !empty($this->config['server_key']),
            ]);
            
            throw new \Exception('Midtrans ServerKey is not configured. Please set MIDTRANS_SERVER_KEY in .env file or configure it in business/outlet settings.');
        }

        // Set Midtrans configuration
        Config::$serverKey = $this->config['server_key'];
        Config::$isProduction = $this->config['is_production'];
        Config::$isSanitized = $this->config['is_sanitized'];
        Config::$is3ds = $this->config['is_3ds'];
    }

    /**
     * Factory method to create MidtransService with business-specific config
     *
     * @param Business $business
     * @return self
     */
    public static function forBusiness(Business $business)
    {
        $config = $business->getMidtransConfig();
        return new self($config);
    }

    /**
     * Factory method to create MidtransService with outlet-specific config
     * Priority: Outlet config -> Business config -> Global config
     *
     * @param Outlet $outlet
     * @return self
     */
    public static function forOutlet(Outlet $outlet)
    {
        $config = $outlet->getMidtransConfig();
        
        // Log which config source is being used
        \Log::info('MidtransService::forOutlet', [
            'outlet_id' => $outlet->id,
            'outlet_name' => $outlet->name,
            'has_custom_config' => $outlet->hasCustomMidtransConfig(),
            'is_production' => $config['is_production'] ?? false,
            'server_key_prefix' => substr($config['server_key'] ?? '', 0, 15),
            'client_key_prefix' => substr($config['client_key'] ?? '', 0, 15),
        ]);
        
        return new self($config);
    }

    /**
     * Get client key for frontend
     *
     * @return string
     */
    public function getClientKey(): string
    {
        return $this->config['client_key'];
    }

    /**
     * Create Snap payment token for subscription
     *
     * @param array $params
     * @return string Snap token
     */
    public function createSnapToken($params)
    {
        try {
            // ✅ CRITICAL: Validate ServerKey before creating snap token
            if (empty($this->config['server_key']) || $this->config['server_key'] === null) {
                Log::error('Cannot create Snap token: ServerKey is null', [
                    'order_id' => $params['order_id'] ?? null,
                ]);
                
                throw new \Exception('Midtrans ServerKey is not configured. Please set MIDTRANS_SERVER_KEY in .env file or configure it in business/outlet settings.');
            }

            $transaction_details = [
                'order_id' => $params['order_id'],
                'gross_amount' => $params['gross_amount'],
            ];

            $item_details = [
                [
                    'id' => $params['item_id'],
                    'price' => $params['price'],
                    'quantity' => 1,
                    'name' => $params['item_name'],
                ]
            ];

            $customer_details = [
                'first_name' => $params['customer_name'],
                'email' => $params['customer_email'],
                'phone' => $params['customer_phone'] ?? '',
            ];

            $transaction = [
                'transaction_details' => $transaction_details,
                'item_details' => $item_details,
                'customer_details' => $customer_details,
                'enabled_payments' => $params['enabled_payments'] ?? [
                    'credit_card',
                    'bca_va',
                    'bni_va',
                    'bri_va',
                    'mandiri_va',
                    'permata_va',
                    'other_va',
                    'gopay',
                    'shopeepay',
                    'qris',
                ],
                'callbacks' => [
                    'finish' => config('midtrans.finish_url'),
                    'unfinish' => config('midtrans.unfinish_url'),
                    'error' => config('midtrans.error_url'),
                ]
            ];

            Log::info('Creating Midtrans Snap token', [
                'order_id' => $params['order_id'],
                'amount' => $params['gross_amount'],
                'enabled_payments' => $transaction['enabled_payments'],
                'is_production' => $this->config['is_production'] ?? false,
                'server_key_prefix' => substr($this->config['server_key'] ?? '', 0, 15),
                'client_key_prefix' => substr($this->config['client_key'] ?? '', 0, 15),
            ]);

            $snapToken = Snap::getSnapToken($transaction);

            Log::info('Midtrans Snap token created successfully', [
                'order_id' => $params['order_id'],
                'token' => substr($snapToken, 0, 10) . '...',
                'enabled_payments_count' => count($transaction['enabled_payments']),
            ]);

            return $snapToken;

        } catch (\Exception $e) {
            Log::error('Failed to create Midtrans Snap token', [
                'order_id' => $params['order_id'] ?? null,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            throw $e;
        }
    }

    /**
     * Get transaction status from Midtrans
     *
     * @param string $orderId
     * @return object
     */
    public function getTransactionStatus($orderId)
    {
        try {
            return Transaction::status($orderId);
        } catch (\Exception $e) {
            Log::error('Failed to get transaction status', [
                'order_id' => $orderId,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Handle notification from Midtrans
     *
     * @return array
     */
    public function handleNotification()
    {
        try {
            $notification = new Notification();

            $transaction_status = $notification->transaction_status;
            $fraud_status = $notification->fraud_status ?? 'accept';
            $order_id = $notification->order_id;
            $payment_type = $notification->payment_type;
            $transaction_time = $notification->transaction_time;
            $gross_amount = $notification->gross_amount;

            Log::info('Midtrans notification received', [
                'order_id' => $order_id,
                'transaction_status' => $transaction_status,
                'fraud_status' => $fraud_status,
                'payment_type' => $payment_type,
            ]);

            // Determine payment status
            $status = 'pending';

            if ($transaction_status == 'capture') {
                if ($fraud_status == 'accept') {
                    $status = 'success';
                } else if ($fraud_status == 'challenge') {
                    $status = 'challenge';
                }
            } else if ($transaction_status == 'settlement') {
                $status = 'success';
            } else if ($transaction_status == 'cancel' || $transaction_status == 'deny' || $transaction_status == 'expire') {
                $status = 'failed';
            } else if ($transaction_status == 'pending') {
                $status = 'pending';
            }

            return [
                'order_id' => $order_id,
                'transaction_status' => $transaction_status,
                'fraud_status' => $fraud_status,
                'payment_status' => $status,
                'payment_type' => $payment_type,
                'transaction_time' => $transaction_time,
                'gross_amount' => $gross_amount,
                'raw_notification' => $notification,
            ];

        } catch (\Exception $e) {
            Log::error('Failed to handle Midtrans notification', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            throw $e;
        }
    }

    /**
     * Cancel transaction
     *
     * @param string $orderId
     * @return object
     */
    public function cancelTransaction($orderId)
    {
        try {
            return Transaction::cancel($orderId);
        } catch (\Exception $e) {
            Log::error('Failed to cancel transaction', [
                'order_id' => $orderId,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Approve transaction (for fraud challenge)
     *
     * @param string $orderId
     * @return object
     */
    public function approveTransaction($orderId)
    {
        try {
            return Transaction::approve($orderId);
        } catch (\Exception $e) {
            Log::error('Failed to approve transaction', [
                'order_id' => $orderId,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }
}
