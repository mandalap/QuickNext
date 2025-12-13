#!/bin/bash
# Bash script to setup VAPID key in .env.local
# Usage: ./setup-vapid-key.sh

VAPID_KEY="BKCUpjqgx0AuclTfYlmTwgliKekCHL4KgH24yddKUEjJvcv_WX7d7uM0ZKE-rqZq4uPNAwKRPFEMDdrit3hOEO8"
ENV_FILE=".env.local"
CONTENT="REACT_APP_VAPID_PUBLIC_KEY=$VAPID_KEY"

echo "🔑 Setting up VAPID key in .env.local..."

# Check if file exists
if [ -f "$ENV_FILE" ]; then
    echo "⚠️  File .env.local already exists"
    
    # Check if key already exists
    if grep -q "REACT_APP_VAPID_PUBLIC_KEY" "$ENV_FILE"; then
        echo "✅ VAPID key already exists in file"
        echo "📝 Current content:"
        cat "$ENV_FILE"
    else
        echo "➕ Adding VAPID key to existing file..."
        echo "" >> "$ENV_FILE"
        echo "$CONTENT" >> "$ENV_FILE"
        echo "✅ VAPID key added successfully!"
    fi
else
    echo "📝 Creating new .env.local file..."
    echo "$CONTENT" > "$ENV_FILE"
    echo "✅ File created successfully!"
fi

echo ""
echo "📋 File content:"
cat "$ENV_FILE"

echo ""
echo "⚠️  IMPORTANT: Restart your development server!"
echo "   1. Stop server (Ctrl+C)"
echo "   2. Run: npm start"
echo "   3. Refresh browser (Ctrl+Shift+R)"

