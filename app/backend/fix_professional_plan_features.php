<?php

/**
 * Script untuk memperbaiki features paket Professional
 * Men-set semua features ke true untuk paket Professional
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\SubscriptionPlan;
use Illuminate\Support\Facades\DB;

echo "🔧 Memperbaiki features paket Professional...\n\n";

try {
    // Cari paket Professional
    $professionalPlan = SubscriptionPlan::where('slug', 'professional')->first();

    if (!$professionalPlan) {
        echo "❌ Paket Professional tidak ditemukan!\n";
        exit(1);
    }

    echo "📦 Paket ditemukan: {$professionalPlan->name} (ID: {$professionalPlan->id})\n\n";

    // Tampilkan features saat ini
    echo "📋 Features saat ini:\n";
    echo "   - has_reports_access: " . ($professionalPlan->has_reports_access ? 'YES' : 'NO') . "\n";
    echo "   - has_advanced_reports: " . ($professionalPlan->has_advanced_reports ? 'YES' : 'NO') . "\n";
    echo "   - has_kitchen_access: " . ($professionalPlan->has_kitchen_access ? 'YES' : 'NO') . "\n";
    echo "   - has_tables_access: " . ($professionalPlan->has_tables_access ? 'YES' : 'NO') . "\n";
    echo "   - has_attendance_access: " . ($professionalPlan->has_attendance_access ? 'YES' : 'NO') . "\n";
    echo "   - has_inventory_access: " . ($professionalPlan->has_inventory_access ? 'YES' : 'NO') . "\n";
    echo "   - has_promo_access: " . ($professionalPlan->has_promo_access ? 'YES' : 'NO') . "\n";
    echo "   - has_stock_transfer_access: " . ($professionalPlan->has_stock_transfer_access ? 'YES' : 'NO') . "\n";
    echo "   - has_self_service_access: " . ($professionalPlan->has_self_service_access ? 'YES' : 'NO') . "\n";
    echo "   - has_online_integration: " . ($professionalPlan->has_online_integration ? 'YES' : 'NO') . "\n";
    echo "   - has_multi_location: " . ($professionalPlan->has_multi_location ? 'YES' : 'NO') . "\n";
    echo "   - has_api_access: " . ($professionalPlan->has_api_access ? 'YES' : 'NO') . "\n\n";

    // Update semua features ke true untuk Professional
    $professionalPlan->update([
        'has_reports_access' => true,
        'has_advanced_reports' => true,
        'has_kitchen_access' => true,
        'has_tables_access' => true,
        'has_attendance_access' => true,
        'has_inventory_access' => true,
        'has_promo_access' => true,
        'has_stock_transfer_access' => true,
        'has_self_service_access' => true,
        'has_online_integration' => true,
        'has_multi_location' => true,
        // has_api_access tetap false untuk Professional (hanya Enterprise)
    ]);

    // Refresh model
    $professionalPlan->refresh();

    echo "✅ Features berhasil di-update!\n\n";

    // Tampilkan features setelah update
    echo "📋 Features setelah update:\n";
    echo "   - has_reports_access: " . ($professionalPlan->has_reports_access ? 'YES' : 'NO') . "\n";
    echo "   - has_advanced_reports: " . ($professionalPlan->has_advanced_reports ? 'YES' : 'NO') . "\n";
    echo "   - has_kitchen_access: " . ($professionalPlan->has_kitchen_access ? 'YES' : 'NO') . "\n";
    echo "   - has_tables_access: " . ($professionalPlan->has_tables_access ? 'YES' : 'NO') . "\n";
    echo "   - has_attendance_access: " . ($professionalPlan->has_attendance_access ? 'YES' : 'NO') . "\n";
    echo "   - has_inventory_access: " . ($professionalPlan->has_inventory_access ? 'YES' : 'NO') . "\n";
    echo "   - has_promo_access: " . ($professionalPlan->has_promo_access ? 'YES' : 'NO') . "\n";
    echo "   - has_stock_transfer_access: " . ($professionalPlan->has_stock_transfer_access ? 'YES' : 'NO') . "\n";
    echo "   - has_self_service_access: " . ($professionalPlan->has_self_service_access ? 'YES' : 'NO') . "\n";
    echo "   - has_online_integration: " . ($professionalPlan->has_online_integration ? 'YES' : 'NO') . "\n";
    echo "   - has_multi_location: " . ($professionalPlan->has_multi_location ? 'YES' : 'NO') . "\n";
    echo "   - has_api_access: " . ($professionalPlan->has_api_access ? 'YES' : 'NO') . "\n\n";

    echo "🎉 Selesai! Paket Professional sekarang memiliki akses ke semua fitur.\n";
    echo "💡 Catatan: User perlu refresh halaman atau logout/login untuk melihat perubahan.\n";

} catch (\Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}
