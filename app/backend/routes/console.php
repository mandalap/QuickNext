<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| QuickKasir Scheduled Tasks
|--------------------------------------------------------------------------
| ⚠️ PENTING: Setup cron job di server dengan command berikut:
| 
| crontab -e
| 
| Tambahkan baris ini:
| * * * * * cd /var/www/kasir-pos/app/backend && /usr/bin/php artisan schedule:run >> /dev/null 2>&1
|
| Cron job ini akan berjalan setiap menit dan Laravel akan handle scheduling.
*/

// ============================================================
// SUBSCRIPTION & PAYMENT TASKS
// ============================================================

// 1. Send subscription reminders daily at 10:00 AM
Schedule::command('subscription:send-reminders')
    ->dailyAt('10:00')
    ->timezone('Asia/Jakarta')
    ->description('Send WhatsApp reminders for expiring and expired subscriptions')
    ->withoutOverlapping()
    ->emailOutputOnFailure('admin@quickkasir.com')
    ->appendOutputTo(storage_path('logs/subscription-reminders.log'));

// 2. Check user subscriptions status every hour
Schedule::command('check:user-subscriptions')
    ->hourly()
    ->description('Check and update user subscription status')
    ->withoutOverlapping()
    ->runInBackground()
    ->appendOutputTo(storage_path('logs/subscription-check.log'));

// 3. Fix invalid subscriptions daily at 2:00 AM
Schedule::command('subscription:fix-invalid')
    ->dailyAt('02:00')
    ->timezone('Asia/Jakarta')
    ->description('Fix invalid subscriptions')
    ->withoutOverlapping()
    ->appendOutputTo(storage_path('logs/fix-subscriptions.log'));

// ============================================================
// CLEANUP & MAINTENANCE TASKS
// ============================================================

// 4. Cleanup expired WhatsApp verification codes every hour
Schedule::call(function () {
    \App\Models\WhatsappVerification::cleanupExpired();
})
    ->hourly()
    ->description('Cleanup expired WhatsApp verification codes');

// 5. Prune expired Sanctum tokens daily at 3:00 AM (keep 7 days)
Schedule::command('sanctum:prune-expired --hours=168')
    ->dailyAt('03:00')
    ->timezone('Asia/Jakarta')
    ->description('Prune Sanctum tokens older than 7 days')
    ->appendOutputTo(storage_path('logs/prune-tokens.log'));

// 6. Clear stale Redis cache tags daily at 4:00 AM
Schedule::command('cache:prune-stale-tags')
    ->dailyAt('04:00')
    ->description('Prune stale Redis cache tags');

// 7. Cleanup old log files weekly (keep last 30 days)
Schedule::call(function () {
    $logPath = storage_path('logs');
    $files = glob($logPath . '/*.log');
    
    foreach ($files as $file) {
        if (is_file($file) && filemtime($file) < strtotime('-30 days')) {
            @unlink($file);
            \Log::info('Deleted old log file: ' . basename($file));
        }
    }
})
    ->weekly()
    ->mondays()
    ->at('05:00')
    ->description('Cleanup log files older than 30 days');

// ============================================================
// SYSTEM MONITORING TASKS
// ============================================================

// 8. System health check every 30 minutes
Schedule::command('system:health-check')
    ->everyThirtyMinutes()
    ->description('Check system health (DB, Redis, Storage, Disk)')
    ->withoutOverlapping()
    ->appendOutputTo(storage_path('logs/health-check.log'));

// 9. Detailed health check with verbose output daily at 8:00 AM
Schedule::command('system:health-check --detailed')
    ->dailyAt('08:00')
    ->timezone('Asia/Jakarta')
    ->description('Daily detailed system health check')
    ->appendOutputTo(storage_path('logs/daily-health.log'));

// ============================================================
// DATABASE OPTIMIZATION TASKS
// ============================================================

// 10. Optimize database tables weekly on Sunday at 2:00 AM
Schedule::call(function () {
    try {
        $tables = [
            'users', 'businesses', 'outlets', 'products', 
            'transactions', 'subscriptions', 'payments'
        ];
        
        foreach ($tables as $table) {
            \DB::statement("OPTIMIZE TABLE {$table}");
        }
        
        \Log::info('Database optimization completed', ['tables' => $tables]);
    } catch (\Exception $e) {
        \Log::error('Database optimization failed', ['error' => $e->getMessage()]);
    }
})
    ->weekly()
    ->sundays()
    ->at('02:00')
    ->description('Optimize database tables');

// ============================================================
// OPTIONAL TASKS (Uncomment jika diperlukan)
// ============================================================

// Daily business report generation
// Schedule::command('report:daily-business')
//     ->dailyAt('23:00')
//     ->timezone('Asia/Jakarta')
//     ->description('Generate daily business reports')
//     ->appendOutputTo(storage_path('logs/daily-reports.log'));

// Database backup (requires backup package)
// Schedule::command('backup:run --only-db')
//     ->dailyAt('03:30')
//     ->timezone('Asia/Jakarta')
//     ->description('Backup database')
//     ->appendOutputTo(storage_path('logs/backup.log'));

// Clear application cache weekly
// Schedule::command('cache:clear')
//     ->weekly()
//     ->sundays()
//     ->at('01:00')
//     ->description('Clear application cache');
