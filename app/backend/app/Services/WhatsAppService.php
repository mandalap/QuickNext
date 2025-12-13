<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Customer;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class WhatsAppService
{
    protected $apiUrl;
    protected $apiKey;
    protected $provider; // 'fonnte', 'wablas', 'kirimwa', 'wablitz'
    protected $senderPhone; // Phone number for sender (required for some providers)

    protected $outlet;

    public function __construct($outlet = null)
    {
        $this->outlet = $outlet;

        // Get config from outlet if provided, otherwise use global config
        if ($outlet && $outlet->whatsapp_api_key) {
            $this->provider = $outlet->whatsapp_provider ?? config('whatsapp.provider', 'fonnte');
            $this->apiKey = $this->decryptApiKey($outlet->whatsapp_api_key);
            $this->senderPhone = $outlet->whatsapp_phone_number ?? null;
        } else {
            $this->provider = config('whatsapp.provider', 'fonnte');
            $this->apiKey = config('whatsapp.api_key');
            $this->senderPhone = config('whatsapp.sender_phone');
        }

        // Get provider-specific URL or fallback to general API URL
        $providerConfig = config("whatsapp.providers.{$this->provider}", []);
        $this->apiUrl = $providerConfig['url'] ?? config('whatsapp.api_url');
    }

    /**
     * Decrypt API key from database
     */
    protected function decryptApiKey($encryptedKey)
    {
        try {
            // Check if it's encrypted (starts with eyJpdiI6)
            if (strpos($encryptedKey, 'eyJpdiI6') === 0) {
                return decrypt($encryptedKey);
            }
            // If not encrypted, return as is
            return $encryptedKey;
        } catch (\Exception $e) {
            Log::warning('WhatsApp: Failed to decrypt API key', [
                'error' => $e->getMessage()
            ]);
            return $encryptedKey; // Return as is if decryption fails
        }
    }

    /**
     * Send WhatsApp message
     *
     * @param string $phoneNumber Phone number (format: 6281234567890)
     * @param string $message Message content
     * @param array $options Additional options (template, media, etc)
     * @return array
     */
    public function sendMessage($phoneNumber, $message, $options = [])
    {
        try {
            // Check if API key exists
            if (empty($this->apiKey)) {
                Log::error('WhatsApp API key is empty', [
                    'outlet_id' => $this->outlet->id ?? null,
                    'provider' => $this->provider
                ]);
                return [
                    'success' => false,
                    'message' => 'API key tidak ditemukan. Silakan konfigurasi API key terlebih dahulu.'
                ];
            }

            // Format phone number (remove +, spaces, dashes)
            $phoneNumber = $this->formatPhoneNumber($phoneNumber);

            if (!$phoneNumber) {
                throw new Exception('Invalid phone number');
            }

            // Check if WhatsApp is enabled
            $isEnabled = $this->outlet
                ? ($this->outlet->whatsapp_enabled ?? false)
                : config('whatsapp.enabled', false);

            if (!$isEnabled) {
                Log::info('WhatsApp service is disabled', [
                    'outlet_id' => $this->outlet->id ?? null
                ]);
                return [
                    'success' => false,
                    'message' => 'WhatsApp service is disabled for this outlet'
                ];
            }

            Log::info('WhatsApp: Sending message', [
                'provider' => $this->provider,
                'phone' => $phoneNumber,
                'has_sender' => !empty($this->senderPhone),
                'outlet_id' => $this->outlet->id ?? null
            ]);

            // Send based on provider
            $result = null;
            switch ($this->provider) {
                case 'fonnte':
                    $result = $this->sendViaFonnte($phoneNumber, $message, $options);
                    break;
                case 'wablas':
                    $result = $this->sendViaWablas($phoneNumber, $message, $options);
                    break;
                case 'kirimwa':
                    $result = $this->sendViaKirimWA($phoneNumber, $message, $options);
                    break;
                case 'wablitz':
                    $result = $this->sendViaWablitz($phoneNumber, $message, $options);
                    break;
                default:
                    throw new Exception("Unsupported WhatsApp provider: {$this->provider}");
            }

            Log::info('WhatsApp: Message send result', [
                'provider' => $this->provider,
                'phone' => $phoneNumber,
                'success' => $result['success'] ?? false,
                'message' => $result['message'] ?? 'No message'
            ]);

            return $result;
        } catch (Exception $e) {
            Log::error('WhatsApp send message failed', [
                'provider' => $this->provider,
                'phone' => $phoneNumber ?? 'unknown',
                'outlet_id' => $this->outlet->id ?? null,
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);

            // ✅ FIX: Include provider in error message for better debugging
            return [
                'success' => false,
                'message' => $e->getMessage(),
                'provider' => $this->provider,
                'error_type' => get_class($e)
            ];
        }
    }

    /**
     * Send via Fonnte API
     */
    protected function sendViaFonnte($phoneNumber, $message, $options = [])
    {
        $response = Http::withHeaders([
            'Authorization' => $this->apiKey,
            'Content-Type' => 'application/json',
        ])->post($this->apiUrl, [
            'target' => $phoneNumber,
            'message' => $message,
            'delay' => $options['delay'] ?? 0,
        ]);

        $data = $response->json();
        $statusCode = $response->status();

        // ✅ FIX: More strict validation - check both HTTP status and response data
        if ($response->successful() && isset($data['status']) && $data['status'] === 'success') {
            Log::info('Fonnte API: Message sent successfully', [
                'phone' => $phoneNumber,
                'message_id' => $data['id'] ?? null,
                'status' => $data['status']
            ]);
            return [
                'success' => true,
                'message_id' => $data['id'] ?? null,
                'status' => $data['status'] ?? 'sent',
                'message' => 'Pesan berhasil dikirim'
            ];
        }

        $errorBody = $response->body();
        $errorData = $data;
        $errorMessage = $errorData['message'] ?? $errorData['error'] ?? $errorData['status'] ?? $errorBody ?? 'Unknown error';

        Log::error('Fonnte API error', [
            'status_code' => $statusCode,
            'response_status' => $data['status'] ?? 'unknown',
            'body' => $errorBody,
            'phone' => $phoneNumber,
            'data' => $data
        ]);

        throw new Exception('Fonnte API error: ' . $errorMessage);
    }

    /**
     * Send via Wablas API
     */
    protected function sendViaWablas($phoneNumber, $message, $options = [])
    {
        $response = Http::withHeaders([
            'Authorization' => $this->apiKey,
            'Content-Type' => 'application/json',
        ])->post($this->apiUrl, [
            'phone' => $phoneNumber,
            'message' => $message,
        ]);

        $data = $response->json();
        $statusCode = $response->status();
        $isSuccess = ($data['status'] ?? '') === 'success' || ($data['success'] ?? false);

        // ✅ FIX: More strict validation
        if ($response->successful() && $isSuccess) {
            Log::info('Wablas API: Message sent successfully', [
                'phone' => $phoneNumber,
                'message_id' => $data['data']['id'] ?? $data['id'] ?? null,
                'status' => $data['status']
            ]);
            return [
                'success' => true,
                'message_id' => $data['data']['id'] ?? $data['id'] ?? null,
                'status' => $data['status'] ?? 'sent',
                'message' => $data['message'] ?? 'Pesan berhasil dikirim'
            ];
        }

        $errorBody = $response->body();
        $errorData = $data;
        $errorMessage = $errorData['message'] ?? $errorData['error'] ?? $errorData['status'] ?? $errorBody ?? 'Unknown error';

        Log::error('Wablas API error', [
            'status_code' => $statusCode,
            'response_status' => $data['status'] ?? 'unknown',
            'body' => $errorBody,
            'phone' => $phoneNumber,
            'data' => $data
        ]);

        throw new Exception('Wablas API error: ' . $errorMessage);
    }

    /**
     * Send via KirimWA API
     */
    protected function sendViaKirimWA($phoneNumber, $message, $options = [])
    {
        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $this->apiKey,
            'Content-Type' => 'application/json',
        ])->post($this->apiUrl, [
            'phone' => $phoneNumber,
            'message' => $message,
        ]);

        $data = $response->json();
        $statusCode = $response->status();
        $isSuccess = ($data['success'] ?? false) === true;

        // ✅ FIX: More strict validation
        if ($response->successful() && $isSuccess) {
            Log::info('KirimWA API: Message sent successfully', [
                'phone' => $phoneNumber,
                'message_id' => $data['id'] ?? null,
                'success' => $data['success']
            ]);
            return [
                'success' => true,
                'message_id' => $data['id'] ?? null,
                'status' => 'sent',
                'message' => $data['message'] ?? 'Pesan berhasil dikirim'
            ];
        }

        $errorBody = $response->body();
        $errorData = $data;
        $errorMessage = $errorData['message'] ?? $errorData['error'] ?? $errorBody ?? 'Unknown error';

        Log::error('KirimWA API error', [
            'status_code' => $statusCode,
            'response_success' => $data['success'] ?? 'unknown',
            'body' => $errorBody,
            'phone' => $phoneNumber,
            'data' => $data
        ]);

        throw new Exception('KirimWA API error: ' . $errorMessage);
    }

    /**
     * Send via Wablitz API
     * Format: api_key, sender (nomor pengirim), number (nomor tujuan), message
     */
    protected function sendViaWablitz($phoneNumber, $message, $options = [])
    {
        // Format sender phone number
        $sender = $this->senderPhone ? $this->formatPhoneNumber($this->senderPhone) : null;

        if (!$sender) {
            throw new Exception('Wablitz requires sender phone number (whatsapp_phone_number)');
        }

        $data = [
            'api_key' => $this->apiKey,
            'sender' => $sender,
            'number' => $phoneNumber,
            'message' => $message,
        ];

        $response = Http::withHeaders([
            'Content-Type' => 'application/json',
        ])->post($this->apiUrl, $data);

        $statusCode = $response->status();
        $responseBody = $response->body();
        $responseData = $response->json();

        // ✅ FIX: Log raw response for debugging
        Log::info('Wablitz API: Raw response', [
            'status_code' => $statusCode,
            'body' => $responseBody,
            'parsed_data' => $responseData
        ]);

        // ✅ FIX: Handle case when response is not valid JSON
        if (!is_array($responseData) && !is_object($responseData)) {
            Log::error('Wablitz API: Invalid JSON response', [
                'status_code' => $statusCode,
                'body' => $responseBody
            ]);
            throw new Exception('Wablitz API returned invalid response format');
        }

        // ✅ FIX: Convert to array for consistent access
        if (is_object($responseData)) {
            $responseData = json_decode(json_encode($responseData), true);
        }

        // ✅ FIX: Wablitz uses status: true (boolean) or status: 'success' (string)
        // Response format: {"status":true,"msg":"Message sent successfully!"}
        $statusValue = $responseData['status'] ?? null;
        $msgValue = $responseData['msg'] ?? $responseData['message'] ?? null;
        $isSuccess = false;

        // Check multiple success conditions for Wablitz
        // Priority 1: Check status field (boolean true or string 'success')
        if (is_bool($statusValue) && $statusValue === true) {
            // Wablitz returns status: true (boolean) for success
            // Response: {"status":true,"msg":"Message sent successfully!"}
            $isSuccess = true;
        } elseif (is_string($statusValue) && strtolower(trim($statusValue)) === 'success') {
            // Some Wablitz endpoints return status: 'success' (string)
            $isSuccess = true;
        } elseif (is_numeric($statusValue) && $statusValue == 1) {
            // Some APIs return status: 1 for success
            $isSuccess = true;
        }

        // Priority 2: Check alternative success field
        $successField = $responseData['success'] ?? null;
        if (!$isSuccess && is_bool($successField) && $successField === true) {
            $isSuccess = true;
        }

        // Priority 3: Check message field for success keyword (fallback)
        if (!$isSuccess && $msgValue && stripos($msgValue, 'success') !== false) {
            // Check if message contains "success" keyword
            // Wablitz returns: {"status":true,"msg":"Message sent successfully!"}
            $isSuccess = true;
        }

        // ✅ FIX: More strict validation - check both HTTP status and response data
        // Wablitz returns 200 OK even when status is true, so check both
        Log::info('Wablitz API: Validating response', [
            'http_successful' => $response->successful(),
            'status_code' => $statusCode,
            'status_value' => $statusValue,
            'status_type' => gettype($statusValue),
            'is_success' => $isSuccess,
            'msg_value' => $msgValue,
            'response_data' => $responseData
        ]);

        if ($response->successful() && $isSuccess) {
            Log::info('Wablitz API: Message sent successfully', [
                'phone' => $phoneNumber,
                'sender' => $sender,
                'message_id' => is_array($responseData) ? ($responseData['id'] ?? null) : ($responseData->id ?? null),
                'status' => $statusValue,
                'msg' => $msgValue,
                'response_data' => $responseData
            ]);
            return [
                'success' => true,
                'message_id' => $responseData['id'] ?? null,
                'status' => is_bool($statusValue) ? ($statusValue ? 'sent' : 'failed') : ($statusValue ?? 'sent'),
                'message' => $msgValue ?? 'Pesan berhasil dikirim'
            ];
        }

        $errorBody = $response->body();
        $errorData = $responseData; // Already converted to array above

        // ✅ FIX: Extract error message properly
        $errorMessage = $errorData['msg'] ?? $errorData['message'] ?? $errorData['error'] ?? null;

        // If no error message but status is false/null, use generic message
        if (!$errorMessage) {
            if (is_bool($statusValue) && $statusValue === false) {
                $errorMessage = 'Gagal mengirim pesan (status: false)';
            } elseif ($statusValue === null) {
                $errorMessage = 'Response tidak valid atau status tidak ditemukan';
            } else {
                $errorMessage = 'Gagal mengirim pesan ke WhatsApp';
            }
        }

        Log::error('Wablitz API error', [
            'status_code' => $statusCode,
            'response_status' => $statusValue,
            'is_success' => $isSuccess,
            'body' => $errorBody,
            'phone' => $phoneNumber,
            'sender' => $sender,
            'response_data' => $responseData,
            'error_message' => $errorMessage
        ]);

        throw new Exception('Wablitz API error: ' . $errorMessage);
    }

    /**
     * Format phone number to standard format (6281234567890)
     */
    protected function formatPhoneNumber($phoneNumber)
    {
        // Remove all non-numeric characters except +
        $phone = preg_replace('/[^0-9+]/', '', $phoneNumber);

        // Remove leading + if exists
        $phone = ltrim($phone, '+');

        // If starts with 0, replace with 62
        if (substr($phone, 0, 1) === '0') {
            $phone = '62' . substr($phone, 1);
        }

        // If doesn't start with 62, add it
        if (substr($phone, 0, 2) !== '62') {
            $phone = '62' . $phone;
        }

        return $phone;
    }

    /**
     * Send payment receipt via WhatsApp
     *
     * @param Order $order Order object
     * @param Customer|null $customer Customer object (optional)
     * @param string|null $customMessage Custom message template (optional, will use default if not provided)
     * @return array
     */
    public function sendPaymentReceipt($order, $customer = null, $customMessage = null)
    {
        try {
            // Get customer phone
            $phoneNumber = null;
            if ($customer && $customer->phone) {
                $phoneNumber = $customer->phone;
            } elseif ($order->customer && $order->customer->phone) {
                $phoneNumber = $order->customer->phone;
            }

            if (!$phoneNumber) {
                Log::warning('WhatsApp: No phone number found for order', [
                    'order_id' => $order->id,
                    'order_number' => $order->order_number ?? null,
                    'has_customer' => !is_null($order->customer),
                    'customer_id' => $order->customer->id ?? null,
                    'customer_phone' => $order->customer->phone ?? null
                ]);
                return [
                    'success' => false,
                    'message' => 'No phone number found for customer'
                ];
            }

            // Format phone number
            $formattedPhone = $this->formatPhoneNumber($phoneNumber);

            Log::info('WhatsApp: Generating receipt message', [
                'order_id' => $order->id,
                'order_number' => $order->order_number ?? null,
                'customer_phone_original' => $phoneNumber,
                'customer_phone_formatted' => $formattedPhone,
                'has_custom_message' => !is_null($customMessage)
            ]);

            // Generate receipt message (use custom if provided, otherwise use default)
            try {
                $message = $customMessage ?? $this->generateReceiptMessage($order);
            } catch (\Exception $e) {
                Log::error('WhatsApp: Failed to generate receipt message', [
                    'order_id' => $order->id,
                    'error' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine()
                ]);
                // Use fallback simple message if generation fails
                $message = "Terima kasih telah berbelanja di " . ($order->business->name ?? 'QuickKasir') . "!\n\n";
                $message .= "Order: {$order->order_number}\n";
                $message .= "Total: Rp " . number_format($order->total ?? 0, 0, ',', '.') . "\n\n";
                $message .= "Terima kasih!";
            }

            Log::info('WhatsApp: Sending receipt message', [
                'order_id' => $order->id,
                'phone' => $formattedPhone,
                'message_length' => strlen($message),
                'provider' => $this->provider
            ]);

            // Send message
            $result = $this->sendMessage($formattedPhone, $message);

            // ✅ FIX: Log detailed result
            Log::info('WhatsApp: Receipt message send completed', [
                'order_id' => $order->id,
                'phone' => $formattedPhone,
                'success' => $result['success'] ?? false,
                'message' => $result['message'] ?? 'No message',
                'message_id' => $result['message_id'] ?? null,
                'status' => $result['status'] ?? null,
                'result_data' => $result
            ]);

            // ✅ FIX: Ensure result always has success key
            if (!isset($result['success'])) {
                // If result doesn't have success key, check if it has message_id or status
                $hasMessageId = isset($result['message_id']) && !empty($result['message_id']);
                $hasStatus = isset($result['status']) && in_array($result['status'], ['sent', 'success', 'delivered']);

                if ($hasMessageId || $hasStatus) {
                    $result['success'] = true;
                    $result['message'] = $result['message'] ?? 'Pesan berhasil dikirim';
                } else {
                    $result['success'] = false;
                    $result['message'] = $result['message'] ?? 'Gagal mengirim pesan';
                }
            }

            return $result;
        } catch (Exception $e) {
            Log::error('WhatsApp: Failed to send payment receipt', [
                'order_id' => $order->id ?? null,
                'order_number' => $order->order_number ?? null,
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Send custom message via WhatsApp
     *
     * @param string $phoneNumber Recipient phone number
     * @param string $message Custom message content
     * @return array
     */
    public function sendCustomMessage($phoneNumber, $message)
    {
        return $this->sendMessage($phoneNumber, $message);
    }

    /**
     * Generate receipt message template
     */
    protected function generateReceiptMessage($order)
    {
        $business = $order->business ?? null;
        $outlet = $order->outlet ?? null;
        $customer = $order->customer ?? null;

        $businessName = $business->name ?? 'QuickKasir';
        $outletName = $outlet->name ?? '';
        $outletPhone = $outlet->phone ?? '';

        // Count total items (handle both Collection and array)
        $items = $order->orderItems ?? collect([]);
        if ($items instanceof \Illuminate\Support\Collection) {
            $totalItems = $items->count();
            $totalQty = $items->sum(function($item) {
                return $item->quantity ?? 1;
            });
        } else {
            $totalItems = count($items);
            $totalQty = array_sum(array_map(function($item) {
                return $item->quantity ?? 1;
            }, $items));
        }

        // Payment summary
        $subtotal = $order->subtotal ?? 0;
        $discount = $order->discount_amount ?? 0;
        $tax = $order->tax_amount ?? 0;
        $total = $order->total ?? 0;
        $paid = $order->paid_amount ?? $total;
        $change = $order->change_amount ?? 0;

        // Payment method
        $payments = $order->payments ?? [];
        $paymentMethodText = '';
        if (count($payments) > 0) {
            $paymentMethods = [];
            foreach ($payments as $payment) {
                $method = $payment->payment_method ?? 'cash';
                $amount = $payment->amount ?? 0;
                $methodName = ucfirst($method);
                if ($method === 'qris') {
                    $methodName = 'QRIS';
                } elseif ($method === 'cash') {
                    $methodName = 'Tunai';
                }
                $paymentMethods[] = "{$methodName}: Rp " . number_format($amount, 0, ',', '.');
            }
            $paymentMethodText = implode(', ', $paymentMethods);
        }

        // Customer name
        $customerName = $customer ? $customer->name : 'Pelanggan';

        // Date and time
        $orderDate = date('d/m/Y', strtotime($order->created_at));
        $orderTime = date('H:i', strtotime($order->created_at));

        // Get outlet details
        $outletAddress = $outlet->address ?? '';
        $outletEmail = $outlet->email ?? '';
        $businessAddress = $business->address ?? '';
        $businessPhone = $business->phone ?? '';
        $businessEmail = $business->email ?? '';

        // ✅ NEW: Format Super Simpel - Lebih ringkas, menarik, dan mudah dibaca
        $message = "🎉 *Terima kasih telah berbelanja!*\n\n";

        // Store information
        $message .= "🏢 *{$businessName}";
        if ($outletName) {
            $message .= " – {$outletName}";
        }
        $message .= "*\n";

        // Address (prioritize outlet address, fallback to business address)
        $displayAddress = $outletAddress ?: $businessAddress;
        if ($displayAddress) {
            $message .= "📍 {$displayAddress}\n";
        }

        // Phone (prioritize outlet phone, fallback to business phone)
        $displayPhone = $outletPhone ?: $businessPhone;
        if ($displayPhone) {
            $message .= "📞 {$displayPhone}\n";
        }

        // Email (prioritize outlet email, fallback to business email)
        $displayEmail = $outletEmail ?: $businessEmail;
        if ($displayEmail) {
            $message .= "✉️ {$displayEmail}\n";
        }

        $message .= "\n";

        // Order info
        $message .= "🆔 Order: *{$order->order_number}*\n";
        $message .= "📅 {$orderDate} {$orderTime}\n";

        if ($customerName && $customerName !== 'Pelanggan') {
            $message .= "👤 {$customerName}\n";
        }

        $message .= "\n";

        // Total payment
        $message .= "💵 *Total Pembayaran: Rp " . number_format($total, 0, ',', '.') . "*\n";

        if ($paymentMethodText) {
            $message .= "💳 {$paymentMethodText}\n";
        }

        $message .= "\n";

        // Receipt link (wrap in try-catch to prevent errors)
        try {
            $receiptUrl = $order->getReceiptUrl();
            if ($receiptUrl) {
                $message .= "📄 *Lihat struk lengkap di sini:*\n\n";
                $message .= "🔗 {$receiptUrl}\n\n";
            }
        } catch (\Exception $e) {
            // Don't fail the whole message if receipt URL generation fails
            Log::warning('WhatsApp: Failed to generate receipt URL', [
                'order_id' => $order->id,
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);
            // Continue without receipt URL - message is still valid
        }

        // Closing message
        $message .= "🙏 *Sampai jumpa lagi!*";

        return $message;
    }
}

