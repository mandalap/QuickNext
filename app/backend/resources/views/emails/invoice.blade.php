<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice Pembayaran</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content {
            background: #f9fafb;
            padding: 30px;
            border: 1px solid #e5e7eb;
        }
        .business-info {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .order-details {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        .items-table th,
        .items-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
        }
        .items-table th {
            background: #f3f4f6;
            font-weight: bold;
        }
        .summary {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
        }
        .total-row {
            font-weight: bold;
            font-size: 18px;
            color: #667eea;
            border-top: 2px solid #667eea;
            padding-top: 10px;
            margin-top: 10px;
        }
        .footer {
            text-align: center;
            padding: 20px;
            color: #6b7280;
            font-size: 14px;
        }
        .divider {
            border-top: 1px solid #e5e7eb;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>✨ Terima Kasih!</h1>
        <p>Invoice Pembayaran Anda</p>
    </div>

    <div class="content">
        <p>Halo <strong>{{ $customerName }}</strong>,</p>
        <p>Terima kasih atas pembayaran Anda. Berikut adalah detail invoice pembayaran:</p>

        <div class="business-info">
            <h2 style="margin-top: 0; color: #667eea;">📋 Informasi Bisnis</h2>
            <p><strong>🏢 {{ $businessName }}</strong></p>
            @if($outletName)
            <p>📍 {{ $outletName }}</p>
            @endif
            @if($outletAddress)
            <p>{{ $outletAddress }}</p>
            @endif
            @if($outletPhone)
            <p>📞 {{ $outletPhone }}</p>
            @endif
        </div>

        <div class="order-details">
            <h2 style="margin-top: 0; color: #667eea;">📦 Detail Pesanan</h2>
            <p><strong>🆔 No. Order:</strong> {{ $order->order_number }}</p>
            <p><strong>📅 Tanggal:</strong> {{ \Carbon\Carbon::parse($order->created_at)->format('d/m/Y H:i') }}</p>
            @if($order->customer)
            <p><strong>👤 Pelanggan:</strong> {{ $order->customer->name }}</p>
            @endif
        </div>

        <div class="order-details">
            <h2 style="margin-top: 0; color: #667eea;">🛒 Item Pesanan</h2>
            <table class="items-table">
                <thead>
                    <tr>
                        <th>Produk</th>
                        <th>Qty</th>
                        <th>Harga</th>
                        <th>Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($order->orderItems as $item)
                    <tr>
                        <td>{{ $item->product->name ?? $item->product_name ?? 'Produk' }}</td>
                        <td>{{ $item->quantity ?? 1 }}</td>
                        <td>Rp {{ number_format($item->price ?? 0, 0, ',', '.') }}</td>
                        <td>Rp {{ number_format(($item->quantity ?? 1) * ($item->price ?? 0), 0, ',', '.') }}</td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
        </div>

        <div class="summary">
            <h2 style="margin-top: 0; color: #667eea;">💰 Ringkasan Pembayaran</h2>
            <p>Subtotal: <strong>Rp {{ number_format($order->subtotal ?? 0, 0, ',', '.') }}</strong></p>
            
            @if(($order->discount_amount ?? 0) > 0)
            <p>Diskon: <strong>-Rp {{ number_format($order->discount_amount ?? 0, 0, ',', '.') }}</strong></p>
            @endif
            
            @if(($order->tax_amount ?? 0) > 0)
            <p>Pajak: <strong>Rp {{ number_format($order->tax_amount ?? 0, 0, ',', '.') }}</strong></p>
            @endif

            <div class="divider"></div>

            <p class="total-row">TOTAL: Rp {{ number_format($order->total ?? 0, 0, ',', '.') }}</p>
            <p>Dibayar: <strong>Rp {{ number_format($order->paid_amount ?? $order->total ?? 0, 0, ',', '.') }}</strong></p>
            
            @if(($order->change_amount ?? 0) > 0)
            <p>Kembalian: <strong>Rp {{ number_format($order->change_amount ?? 0, 0, ',', '.') }}</strong></p>
            @endif

            @if($order->payments && count($order->payments) > 0)
            <div class="divider"></div>
            <p><strong>💳 Metode Pembayaran:</strong></p>
            <ul>
                @foreach($order->payments as $payment)
                <li>
                    @php
                        $method = $payment->payment_method ?? 'cash';
                        $methodName = ucfirst($method);
                        if ($method === 'qris') $methodName = 'QRIS';
                        elseif ($method === 'cash') $methodName = 'Tunai';
                        elseif ($method === 'card') $methodName = 'Kartu';
                        elseif ($method === 'transfer') $methodName = 'Transfer Bank';
                    @endphp
                    {{ $methodName }}: Rp {{ number_format($payment->amount ?? 0, 0, ',', '.') }}
                </li>
                @endforeach
            </ul>
            @endif
        </div>

        <div style="text-align: center; margin-top: 30px; padding: 20px; background: #f0f9ff; border-radius: 8px;">
            <p style="margin: 0; font-size: 18px; color: #667eea;">✨ Terima kasih atas kunjungan Anda!</p>
            <p style="margin: 10px 0 0 0; color: #6b7280;">💬 Ada pertanyaan? Hubungi kami di nomor yang tertera di atas.</p>
        </div>
    </div>

    <div class="footer">
        <p>Salam,<br><strong>Tim {{ $businessName }}</strong></p>
        <p style="font-size: 12px; color: #9ca3af;">Pesan ini dikirim otomatis oleh sistem QuickKasir</p>
    </div>
</body>
</html>

