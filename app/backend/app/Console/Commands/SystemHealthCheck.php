<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Log;

class SystemHealthCheck extends Command
{
    protected $signature = 'system:health-check {--detailed : Show detailed output} {--alert : Send alert on failure}';

    protected $description = 'Check QuickKasir system health (DB, Redis, Storage, Disk)';

    private $issues = [];

    public function handle()
    {
        $startTime = now();
        
        if ($this->option('detailed')) {
            $this->info('════════════════════════════════════════════════════════');
            $this->info('🏥 QuickKasir System Health Check');
            $this->info('Time: ' . $startTime->format('Y-m-d H:i:s'));
            $this->info('════════════════════════════════════════════════════════');
            $this->newLine();
        }

        // Run all checks
        $this->checkDatabase();
        $this->checkRedis();
        $this->checkStorage();
        $this->checkDiskSpace();
        $this->checkMemory();

        // Display results
        $duration = $startTime->diffInSeconds(now());
        
        if (empty($this->issues)) {
            if ($this->option('detailed')) {
                $this->newLine();
                $this->info('✅ All systems operational!');
                $this->info("Duration: {$duration}s");
            }
            
            Log::info('Health check passed', [
                'duration' => $duration . 's',
                'timestamp' => now()->toDateTimeString()
            ]);
            
            return Command::SUCCESS;
        } else {
            if ($this->option('detailed')) {
                $this->newLine();
                $this->error('⚠️  Issues Detected:');
                foreach ($this->issues as $issue) {
                    $this->error('  • ' . $issue);
                }
                $this->info("Duration: {$duration}s");
            }
            
            Log::error('Health check failed', [
                'issues' => $this->issues,
                'duration' => $duration . 's',
                'timestamp' => now()->toDateTimeString()
            ]);

            return Command::FAILURE;
        }
    }

    private function checkDatabase()
    {
        try {
            DB::connection()->getPdo();
            $dbName = DB::connection()->getDatabaseName();
            
            if ($this->option('detailed')) {
                $this->info("✅ Database: Connected ($dbName)");
            }
        } catch (\Exception $e) {
            $this->issues[] = 'Database: ' . $e->getMessage();
            if ($this->option('detailed')) {
                $this->error('❌ Database: Connection failed');
            }
        }
    }

    private function checkRedis()
    {
        try {
            Redis::connection()->ping();
            
            if ($this->option('detailed')) {
                $this->info("✅ Redis: Connected");
            }
        } catch (\Exception $e) {
            $this->issues[] = 'Redis: ' . $e->getMessage();
            if ($this->option('detailed')) {
                $this->error('❌ Redis: Connection failed');
            }
        }
    }

    private function checkStorage()
    {
        $paths = [
            'logs' => storage_path('logs'),
            'framework' => storage_path('framework'),
            'app' => storage_path('app'),
        ];

        $notWritable = [];
        foreach ($paths as $name => $path) {
            if (!is_writable($path)) {
                $notWritable[] = $name;
            }
        }

        if (!empty($notWritable)) {
            $this->issues[] = 'Storage not writable: ' . implode(', ', $notWritable);
            if ($this->option('detailed')) {
                $this->error('❌ Storage: Some paths not writable');
            }
        } else {
            if ($this->option('detailed')) {
                $this->info('✅ Storage: All paths writable');
            }
        }
    }

    private function checkDiskSpace()
    {
        $diskFree = disk_free_space('/');
        $diskTotal = disk_total_space('/');
        $diskUsedPercent = round((1 - $diskFree / $diskTotal) * 100, 2);
        $freeGB = round($diskFree / 1024 / 1024 / 1024, 2);
        
        if ($diskUsedPercent >= 90) {
            $this->issues[] = "Disk critical: {$diskUsedPercent}% used";
            if ($this->option('detailed')) {
                $this->error("🚨 Disk: {$diskUsedPercent}% used ({$freeGB}GB free)");
            }
        } elseif ($diskUsedPercent >= 80) {
            $this->issues[] = "Disk low: {$diskUsedPercent}% used";
            if ($this->option('detailed')) {
                $this->warn("⚠️  Disk: {$diskUsedPercent}% used ({$freeGB}GB free)");
            }
        } else {
            if ($this->option('detailed')) {
                $this->info("✅ Disk: {$diskUsedPercent}% used ({$freeGB}GB free)");
            }
        }
    }

    private function checkMemory()
    {
        $memUsage = memory_get_usage(true);
        $memMB = round($memUsage / 1024 / 1024, 2);
        
        if ($this->option('detailed')) {
            $this->info("✅ Memory: {$memMB}MB used");
        }
    }
}
