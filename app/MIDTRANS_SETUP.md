# Midtrans Payment Integration Setup

This guide will help you set up Midtrans payment integration for the POS system subscription feature.

## Prerequisites

- Midtrans account (Sandbox or Production)
- Backend Laravel application running
- Frontend React application running

## Step 1: Get Midtrans Credentials

### For Sandbox (Testing)

1. Go to [Midtrans Dashboard](https://dashboard.midtrans.com/)
2. Login to your account
3. Navigate to **Settings > Access Keys**
4. Copy your:
   - **Server Key** (starts with `SB-Mid-server-...`)
   - **Client Key** (starts with `SB-Mid-client-...`)

### For Production

1. Switch to Production environment in Midtrans Dashboard
2. Get Production Server Key and Client Key
3. Complete Midtrans verification process

## Step 2: Configure Backend (.env)

Open `backend/.env` file and update the Midtrans configuration:

```env
# Midtrans Configuration
MIDTRANS_SERVER_KEY=SB-Mid-server-YOUR_SERVER_KEY_HERE
MIDTRANS_CLIENT_KEY=SB-Mid-client-YOUR_CLIENT_KEY_HERE
MIDTRANS_IS_PRODUCTION=false
MIDTRANS_IS_SANITIZED=true
MIDTRANS_IS_3DS=true
```

### Configuration Options:

- `MIDTRANS_SERVER_KEY`: Your Midtrans server key (used for backend API calls)
- `MIDTRANS_CLIENT_KEY`: Your Midtrans client key (used for frontend Snap.js)
- `MIDTRANS_IS_PRODUCTION`: Set to `false` for sandbox, `true` for production
- `MIDTRANS_IS_SANITIZED`: Enable input sanitization (recommended: `true`)
- `MIDTRANS_IS_3DS`: Enable 3D Secure authentication (recommended: `true`)

## Step 3: Configure Webhook URL in Midtrans Dashboard

1. Go to [Midtrans Dashboard](https://dashboard.midtrans.com/)
2. Navigate to **Settings > Configuration**
3. Set **Payment Notification URL** to:
   ```
   https://your-backend-domain.com/api/v1/payments/midtrans/notification
   ```

   For local development (using ngrok):
   ```
   https://your-ngrok-url.ngrok.io/api/v1/payments/midtrans/notification
   ```

4. Set **Finish Redirect URL** to:
   ```
   https://your-frontend-domain.com/payment/success
   ```

5. Set **Unfinish Redirect URL** to:
   ```
   https://your-frontend-domain.com/payment/pending
   ```

6. Set **Error Redirect URL** to:
   ```
   https://your-frontend-domain.com/payment/failed
   ```

## Step 4: Install Required Packages

The Midtrans PHP library has already been installed. If you need to reinstall:

```bash
cd backend
composer require midtrans/midtrans-php
```

## Step 5: Clear Cache (Important!)

After updating `.env`, clear Laravel cache:

```bash
cd backend
php artisan config:clear
php artisan cache:clear
```

## Step 6: Test the Integration

### Using Midtrans Sandbox

1. Navigate to `/subscription-plans` in your frontend
2. Select a paid subscription plan
3. Click "Pilih Paket Ini"
4. Midtrans Snap popup should appear
5. Use test credentials:

#### Test Credit Cards:
- **Card Number**: `4811 1111 1111 1114`
- **Expiry**: Any future date (e.g., `01/25`)
- **CVV**: `123`
- **OTP**: `112233`

#### Test Virtual Account:
- Select any bank (BCA, BNI, BRI, Mandiri, etc.)
- You'll get a VA number
- Use Midtrans Simulator to complete payment

#### Test E-Wallets:
- GoPay: Will show QR code or deeplink
- ShopeePay: Will redirect to ShopeePay

### Midtrans Simulator

For testing VA and other payment methods:
1. Go to [Midtrans Simulator](https://simulator.sandbox.midtrans.com/)
2. Enter your order ID or VA number
3. Simulate payment success/failure

## Payment Flow

### 1. User Selects Plan
- User navigates to `/subscription-plans`
- Selects a subscription plan
- Clicks "Pilih Paket Ini"

### 2. Backend Creates Transaction
- Creates `UserSubscription` with status `pending_payment`
- Generates Midtrans Snap token
- Returns snap token to frontend

### 3. Frontend Opens Midtrans Snap
- Loads Midtrans Snap.js
- Opens payment popup with snap token
- User completes payment

### 4. Midtrans Sends Notification
- Midtrans sends webhook to: `/api/v1/payments/midtrans/notification`
- Backend updates subscription status to `active` on success
- Creates payment record in `subscription_payments` table

### 5. User Redirected
- **Success**: Redirected to `/payment/success` → `/business-setup`
- **Pending**: Redirected to `/payment/pending` (can check status)
- **Failed**: Redirected to `/payment/failed` (can retry)

## API Endpoints

### Public Endpoints (No Auth Required)

- `POST /api/v1/payments/midtrans/notification` - Webhook from Midtrans
- `GET /api/v1/payments/client-key` - Get Midtrans client key

### Protected Endpoints (Requires Auth)

- `POST /api/v1/subscriptions/subscribe` - Create subscription & get snap token
- `GET /api/v1/payments/status/{subscriptionCode}` - Check payment status

## Frontend Components

### SubscriptionPlans.jsx
- Displays subscription plans
- Handles plan selection
- Opens Midtrans Snap popup
- Handles payment callbacks

### PaymentPending.jsx
- Shows pending payment status
- Auto-checks payment status every 5 seconds
- Allows manual status check

### PaymentSuccess.jsx
- Shows successful payment
- Auto-redirects to business setup

### PaymentFailed.jsx
- Shows failed payment
- Allows retry or return to dashboard

## Database Tables

### user_subscriptions
Stores subscription information:
- `subscription_code`: Unique code used as Midtrans order ID
- `status`: `pending_payment`, `active`, `cancelled`, `upgraded`, `expired`
- `amount_paid`: Total amount paid

### subscription_payments
Stores payment transaction details:
- `user_subscription_id`: Links to subscription
- `transaction_id`: Midtrans order ID
- `payment_method`: Payment type (credit_card, bank_transfer, etc.)
- `payment_status`: `pending`, `success`, `failed`, `challenge`
- `payment_data`: JSON with full Midtrans response

## Troubleshooting

### Snap Popup Not Opening
1. Check browser console for errors
2. Verify `MIDTRANS_CLIENT_KEY` is set correctly
3. Check if Snap.js script is loaded
4. Verify snap token is received from backend

### Webhook Not Working
1. Verify webhook URL is publicly accessible
2. For local development, use ngrok
3. Check Laravel logs: `storage/logs/laravel.log`
4. Test webhook manually using Postman

### Payment Not Updating
1. Check if webhook is configured in Midtrans Dashboard
2. Verify webhook URL is correct
3. Check backend logs for errors
4. Test notification manually

### Using ngrok for Local Development

```bash
# Install ngrok
# Then run:
ngrok http 8000

# Copy the https URL and set it in Midtrans Dashboard
# Example: https://abc123.ngrok.io/api/v1/payments/midtrans/notification
```

## Security Notes

1. **Never commit credentials**: Keep `.env` file private
2. **Use HTTPS**: Always use HTTPS in production
3. **Verify webhook**: MidtransService validates webhook authenticity
4. **Sanitize input**: Already enabled via `MIDTRANS_IS_SANITIZED=true`
5. **Enable 3DS**: Already enabled via `MIDTRANS_IS_3DS=true`

## Going to Production

1. Get Production credentials from Midtrans Dashboard
2. Update `.env`:
   ```env
   MIDTRANS_SERVER_KEY=Mid-server-YOUR_PRODUCTION_KEY
   MIDTRANS_CLIENT_KEY=Mid-client-YOUR_PRODUCTION_KEY
   MIDTRANS_IS_PRODUCTION=true
   ```
3. Update webhook URL in Midtrans Production Dashboard
4. Complete Midtrans verification process
5. Test thoroughly with real small transactions
6. Monitor logs and transactions

## Support

- **Midtrans Documentation**: https://docs.midtrans.com/
- **Midtrans Support**: https://support.midtrans.com/
- **API Reference**: https://api-docs.midtrans.com/

## Additional Resources

- [Midtrans Snap Integration](https://docs.midtrans.com/en/snap/overview)
- [Payment Notification](https://docs.midtrans.com/en/after-payment/http-notification)
- [Testing Payment](https://docs.midtrans.com/en/technical-reference/sandbox-test)
