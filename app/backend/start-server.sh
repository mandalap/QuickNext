#!/bin/bash
# Script untuk start Laravel server dengan error handling

echo "Checking Laravel installation..."
cd "e:\development\kasir-pos-system\app\backend" || exit 1

if [ ! -f artisan ]; then
    echo "ERROR: artisan file not found!"
    echo "Please run this script from: e:\development\kasir-pos-system\app\backend"
    exit 1
fi

echo ""
echo "========================================"
echo "Starting Laravel Development Server"
echo "========================================"
echo ""
echo "Clearing cache..."
php artisan optimize:clear

echo ""
echo "Running migrations..."
php artisan migrate --seed

echo ""
echo "Starting server on http://localhost:8000"
echo "Press Ctrl+C to stop"
echo ""

php artisan serve --host=127.0.0.1 --port=8000

