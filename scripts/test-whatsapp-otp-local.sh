#!/bin/bash

# Script untuk Test WhatsApp OTP di Local Development
# Usage: bash scripts/test-whatsapp-otp-local.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🧪 Testing WhatsApp OTP Endpoint..."
echo ""

# Check if backend is running
echo -e "${YELLOW}Step 1: Checking if backend is running...${NC}"
BACKEND_URL="${BACKEND_URL:-http://localhost:8000}"
if curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/business-types" | grep -q "200"; then
    echo -e "${GREEN}✅ Backend is running at $BACKEND_URL${NC}"
else
    echo -e "${RED}❌ Backend is not running at $BACKEND_URL${NC}"
    echo "   Please start backend with: cd app/backend && php artisan serve"
    exit 1
fi
echo ""

# Test endpoint
echo -e "${YELLOW}Step 2: Testing /api/whatsapp/send-otp endpoint...${NC}"
echo ""

# Test with a sample phone number
TEST_PHONE="${1:-081234567890}"

echo "Sending OTP request to: $BACKEND_URL/api/whatsapp/send-otp"
echo "Phone: $TEST_PHONE"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND_URL/api/whatsapp/send-otp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{\"phone\":\"$TEST_PHONE\"}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo -e "${BLUE}Response:${NC}"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
echo ""
echo -e "${BLUE}HTTP Status: $HTTP_CODE${NC}"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ OTP sent successfully!${NC}"
elif [ "$HTTP_CODE" = "422" ]; then
    echo -e "${YELLOW}⚠️  Validation error (422)${NC}"
    echo "   This might mean:"
    echo "   - Phone number format is invalid"
    echo "   - Phone number is already registered"
    echo "   - Rate limit exceeded (max 5 requests per minute)"
elif [ "$HTTP_CODE" = "500" ]; then
    echo -e "${RED}❌ Server error (500)${NC}"
    echo "   This might mean:"
    echo "   - No active WhatsApp token configured"
    echo "   - WhatsApp API service is down"
    echo "   - Check backend logs: tail -f app/backend/storage/logs/laravel.log"
else
    echo -e "${RED}❌ Unexpected status code: $HTTP_CODE${NC}"
fi
echo ""

# Check backend logs for errors
echo -e "${YELLOW}Step 3: Checking recent backend logs...${NC}"
if [ -f "app/backend/storage/logs/laravel.log" ]; then
    echo "Recent WhatsApp OTP related logs:"
    tail -20 app/backend/storage/logs/laravel.log | grep -i "whatsapp\|otp" || echo "No WhatsApp/OTP logs found"
else
    echo "Log file not found: app/backend/storage/logs/laravel.log"
fi
echo ""

# Instructions
echo -e "${BLUE}========================================${NC}"
echo -e "${YELLOW}💡 Troubleshooting Tips:${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "1. Check browser console (F12) for errors"
echo "2. Verify API_CONFIG.BASE_URL in frontend matches backend URL"
echo "3. Check if WhatsApp token is configured in Filament admin"
echo "4. Verify phone number format: 081234567890 (Indonesia)"
echo "5. Check rate limiting (max 5 requests per minute)"
echo ""
echo "To test from frontend:"
echo "  - Open http://localhost:3000/register"
echo "  - Enter phone number"
echo "  - Click 'Kirim OTP'"
echo "  - Check browser console (F12) for errors"
echo ""
