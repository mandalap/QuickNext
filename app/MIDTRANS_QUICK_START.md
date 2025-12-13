# Midtrans Integration - Quick Start Guide

## 🚀 Quick Setup (5 Minutes)

### Step 1: Get Midtrans Sandbox Credentials

1. Visit [Midtrans Dashboard](https://dashboard.midtrans.com/)
2. Login or create account
3. Go to **Settings > Access Keys**
4. Copy:
   - **Server Key** (example: `SB-Mid-server-abc123...`)
   - **Client Key** (example: `SB-Mid-client-xyz789...`)

### Step 2: Update Backend .env

Open `backend/.env` and update:

```env
MIDTRANS_SERVER_KEY=SB-Mid-server-YOUR_SERVER_KEY_HERE
MIDTRANS_CLIENT_KEY=SB-Mid-client-YOUR_CLIENT_KEY_HERE
MIDTRANS_IS_PRODUCTION=false
```

### Step 3: Clear Cache

```bash
cd backend
php artisan config:clear
php artisan cache:clear
```

### Step 4: Configure Webhook (Optional for now)

For local testing, you can skip this. The payment will still work, but status updates will require page refresh.

**For production or full testing:**
1. Go to Midtrans Dashboard > Settings > Configuration
2. Set **Payment Notification URL**:
   ```
   https://your-domain.com/api/v1/payments/midtrans/notification
   ```

## ✅ Test Payment

### 1. Start Your Servers

```bash
# Terminal 1 - Backend
cd backend
php artisan serve

# Terminal 2 - Frontend
cd frontend
npm start
```

### 2. Test the Flow

1. Navigate to: `http://localhost:3000/subscription-plans`
2. Select a **paid plan** (not trial)
3. Click **"Pilih Paket Ini"**
4. Midtrans payment popup should appear

### 3. Use Test Credentials

#### Credit Card (Recommended for quick test):
```
Card Number: 4811 1111 1111 1114
Expiry: 01/25 (any future date)
CVV: 123
OTP: 112233
```

#### Virtual Account:
- Select any bank (BCA, BNI, BRI, etc.)
- You'll get a VA number
- Use [Midtrans Simulator](https://simulator.sandbox.midtrans.com/) to complete payment

#### E-Wallet:
- GoPay: Shows QR code
- ShopeePay: Redirects to payment

## 🎯 Expected Behavior

### Success Flow:
1. ✅ User clicks "Pilih Paket Ini"
2. ✅ Midtrans popup opens
3. ✅ User completes payment with test card
4. ✅ Success message appears
5. ✅ Redirected to `/business-setup`

### Pending Flow:
1. ⏳ User selects VA payment
2. ⏳ Payment is pending (waiting for bank transfer)
3. ⏳ Redirected to `/payment/pending`
4. ⏳ Can check status manually or wait for webhook

### Failed Flow:
1. ❌ Payment fails or user cancels
2. ❌ Redirected to `/payment/failed`
3. ❌ Can retry or go back to plans

## 🐛 Troubleshooting

### Popup Not Opening?

1. **Check Browser Console**
   - Press F12 and check for errors
   - Look for "snap is not defined" or similar

2. **Verify Credentials**
   ```bash
   # In backend directory
   php artisan tinker
   >>> config('midtrans.client_key')
   # Should show your client key
   ```

3. **Check Network Tab**
   - F12 > Network tab
   - Look for `/v1/subscriptions/subscribe` request
   - Should return `snap_token` and `client_key`

### Payment Not Updating?

This is normal without webhook! To fix:

**Option 1: Manual Check**
- Go to `/payment/pending`
- Click "Cek Status Pembayaran"

**Option 2: Setup Webhook (Recommended)**
- Use [ngrok](https://ngrok.com/) for local testing
- See full documentation in `MIDTRANS_SETUP.md`

## 📝 Test Cards Reference

### Success Cards:
- `4811 1111 1111 1114` - Success
- `5264 2210 3887 4659` - Success (3DS)

### Challenge/Pending Cards:
- `4011 1111 1111 1112` - Challenge by FDS

### Failed Cards:
- `4011 1111 1111 1111` - Denied by bank

### For all test cards:
- **CVV**: Any 3 digits (e.g., 123)
- **Expiry**: Any future date (e.g., 01/25)
- **OTP/3DS**: 112233

## 📚 Next Steps

Once basic testing works:

1. **Setup Webhook** for automatic status updates
   - See `MIDTRANS_SETUP.md` section on webhooks
   - Use ngrok for local development

2. **Test All Payment Methods**
   - Credit Card ✓
   - Bank Transfer (VA) ⏳
   - E-Wallets (GoPay, ShopeePay) 💳
   - QRIS 📱

3. **Production Setup**
   - Get production credentials
   - Update `.env` with production keys
   - Set `MIDTRANS_IS_PRODUCTION=true`

## 🔗 Important Links

- **Midtrans Dashboard**: https://dashboard.midtrans.com/
- **Simulator**: https://simulator.sandbox.midtrans.com/
- **Test Cards**: https://docs.midtrans.com/en/technical-reference/sandbox-test
- **Full Documentation**: See `MIDTRANS_SETUP.md`

## 💡 Tips

- Always use **Sandbox** for testing (credentials start with `SB-`)
- Test **all payment flows** before production
- Keep credentials **secret** (never commit to git)
- Monitor Laravel logs: `backend/storage/logs/laravel.log`

## ✨ Features Implemented

✅ Midtrans Snap integration
✅ Multiple payment methods
✅ Automatic status updates via webhook
✅ Payment status checking
✅ Success/Pending/Failed handling
✅ Subscription activation on payment
✅ Payment history in database

---

**Need help?** Check the full documentation in `MIDTRANS_SETUP.md` or Midtrans support at https://support.midtrans.com/
