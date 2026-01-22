<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Schedule subscription reminder to run daily at 10:00 AM (Asia/Jakarta timezone)
// ⚠️ PENTING: Setelah upload ke hosting, WAJIB setup cron job!
// Lihat file: CRONJOB_SETUP_REMINDER.md untuk detail lengkap
// Command cron job yang harus ditambahkan:
// * * * * * cd /path/to/project/app/backend && /usr/bin/php artisan schedule:run >> /dev/null 2>&1
Schedule::command('subscription:send-reminders')
    ->dailyAt('10:00')
    ->timezone('Asia/Jakarta')
    ->description('Send WhatsApp reminders for expiring and expired subscriptions')
    ->withoutOverlapping();

// Cleanup expired WhatsApp verification codes (run every hour)
Schedule::call(function () {
    \App\Models\WhatsappVerification::cleanupExpired();
})
    ->hourly()
    ->description('Cleanup expired WhatsApp verification codes');
