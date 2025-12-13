<?php

namespace App\Mail;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class InvoiceMail extends Mailable
{
    use Queueable, SerializesModels;

    public $order;
    public $customerName;

    /**
     * Create a new message instance.
     */
    public function __construct(Order $order, $customerName = 'Pelanggan')
    {
        $this->order = $order;
        $this->customerName = $customerName;
    }

    /**
     * Build the message.
     */
    public function build()
    {
        $order = $this->order;
        $order->load(['orderItems.product', 'customer', 'business', 'outlet', 'payments']);
        
        $business = $order->business ?? null;
        $outlet = $order->outlet ?? null;
        
        $businessName = $business->name ?? 'QuickKasir';
        $outletName = $outlet->name ?? '';
        $outletAddress = $outlet->address ?? '';
        $outletPhone = $outlet->phone ?? '';
        
        return $this->subject('Invoice Pembayaran - ' . $order->order_number)
            ->view('emails.invoice', [
                'order' => $order,
                'customerName' => $this->customerName,
                'businessName' => $businessName,
                'outletName' => $outletName,
                'outletAddress' => $outletAddress,
                'outletPhone' => $outletPhone,
            ]);
    }
}

