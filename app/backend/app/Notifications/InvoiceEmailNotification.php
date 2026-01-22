<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class InvoiceEmailNotification extends Notification
{
    use Queueable;

    public $order;

    /**
     * Create a new notification instance.
     */
    public function __construct(Order $order)
    {
        $this->order = $order;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $order = $this->order;
        $order->load(['orderItems.product', 'customer', 'business', 'outlet', 'payments']);
        
        $business = $order->business ?? null;
        $outlet = $order->outlet ?? null;
        $customer = $order->customer ?? null;
        
        $businessName = $business->name ?? 'QuickKasir';
        $outletName = $outlet->name ?? '';
        $outletAddress = $outlet->address ?? '';
        $outletPhone = $outlet->phone ?? '';
        
        $message = (new MailMessage)
            ->subject('Invoice Pembayaran - ' . $order->order_number)
            ->greeting('Halo ' . ($customer ? $customer->name : 'Pelanggan') . '!')
            ->line('Terima kasih atas pembayaran Anda. Berikut adalah detail invoice pembayaran:')
            ->line('')
            ->line('**Informasi Bisnis:**')
            ->line('🏢 ' . $businessName);
        
        if ($outletName) {
            $message->line('📍 ' . $outletName);
        }
        if ($outletAddress) {
            $message->line('   ' . $outletAddress);
        }
        if ($outletPhone) {
            $message->line('📞 ' . $outletPhone);
        }
        
        $message->line('')
            ->line('━━━━━━━━━━━━━━━━━━━━━━━━')
            ->line('')
            ->line('**Detail Pesanan:**')
            ->line('🆔 No. Order: **' . $order->order_number . '**')
            ->line('📅 Tanggal: ' . date('d/m/Y H:i', strtotime($order->created_at)));
        
        if ($customer) {
            $message->line('👤 Pelanggan: ' . $customer->name);
        }
        
        $message->line('')
            ->line('**Item Pesanan:**');
        
        // Order items
        $items = $order->orderItems ?? [];
        foreach ($items as $item) {
            $productName = $item->product->name ?? $item->product_name ?? 'Produk';
            $qty = $item->quantity ?? 1;
            $price = $item->price ?? 0;
            $subtotal = ($item->quantity ?? 1) * ($item->price ?? 0);
            
            $message->line('• ' . $productName)
                ->line('  ' . $qty . ' x Rp ' . number_format($price, 0, ',', '.') . ' = Rp ' . number_format($subtotal, 0, ',', '.'));
        }
        
        $message->line('')
            ->line('━━━━━━━━━━━━━━━━━━━━━━━━')
            ->line('')
            ->line('**Ringkasan Pembayaran:**');
        
        $subtotal = $order->subtotal ?? 0;
        $discount = $order->discount_amount ?? 0;
        $tax = $order->tax_amount ?? 0;
        $total = $order->total ?? 0;
        $paid = $order->paid_amount ?? $total;
        $change = $order->change_amount ?? 0;
        
        $message->line('Subtotal: Rp ' . number_format($subtotal, 0, ',', '.'));
        
        if ($discount > 0) {
            $message->line('Diskon: -Rp ' . number_format($discount, 0, ',', '.'));
        }
        
        if ($tax > 0) {
            $message->line('Pajak: Rp ' . number_format($tax, 0, ',', '.'));
        }
        
        $message->line('━━━━━━━━━━━━━━━━━━━━━━━━')
            ->line('**TOTAL: Rp ' . number_format($total, 0, ',', '.') . '**')
            ->line('Dibayar: Rp ' . number_format($paid, 0, ',', '.'));
        
        if ($change > 0) {
            $message->line('Kembalian: Rp ' . number_format($change, 0, ',', '.'));
        }
        
        // Payment methods
        $payments = $order->payments ?? [];
        if (count($payments) > 0) {
            $message->line('')
                ->line('**Metode Pembayaran:**');
            foreach ($payments as $payment) {
                $method = $payment->payment_method ?? 'cash';
                $amount = $payment->amount ?? 0;
                $methodName = ucfirst($method);
                if ($method === 'qris') {
                    $methodName = 'QRIS';
                } elseif ($method === 'cash') {
                    $methodName = 'Tunai';
                } elseif ($method === 'card') {
                    $methodName = 'Kartu';
                } elseif ($method === 'transfer') {
                    $methodName = 'Transfer Bank';
                }
                $message->line('• ' . $methodName . ': Rp ' . number_format($amount, 0, ',', '.'));
            }
        }
        
        $message->line('')
            ->line('━━━━━━━━━━━━━━━━━━━━━━━━')
            ->line('')
            ->line('✨ **Terima kasih atas kunjungan Anda!**')
            ->line('💬 Ada pertanyaan? Hubungi kami di nomor yang tertera di atas.')
            ->salutation('Salam, Tim ' . $businessName);
        
        return $message;
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'order_id' => $this->order->id,
            'order_number' => $this->order->order_number,
        ];
    }
}

