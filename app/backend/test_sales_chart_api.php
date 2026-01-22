<?php
/**
 * Test script untuk API Sales Chart Data
 *
 * Script ini digunakan untuk menguji endpoint /v1/reports/sales/chart-data
 * dan memastikan data yang dikembalikan sesuai dengan format yang diharapkan.
 */

require_once __DIR__ . '/../vendor/autoload.php';

use Illuminate\Http\Request;
use App\Http\Controllers\Api\ReportController;

// Simulasi request untuk testing
function testSalesChartData() {
    echo "=== TESTING SALES CHART DATA API ===\n\n";

    // Test cases
    $testCases = [
        [
            'name' => 'Daily Chart - Today',
            'params' => [
                'date_range' => 'today',
                'chart_type' => 'daily'
            ]
        ],
        [
            'name' => 'Weekly Chart - Last Week',
            'params' => [
                'date_range' => 'week',
                'chart_type' => 'weekly'
            ]
        ],
        [
            'name' => 'Monthly Chart - Last Month',
            'params' => [
                'date_range' => 'month',
                'chart_type' => 'monthly'
            ]
        ],
        [
            'name' => 'Hourly Chart - Today',
            'params' => [
                'date_range' => 'today',
                'chart_type' => 'hourly'
            ]
        ],
        [
            'name' => 'Custom Date Range',
            'params' => [
                'date_range' => 'custom',
                'custom_start' => '2024-01-01',
                'custom_end' => '2024-01-31',
                'chart_type' => 'daily'
            ]
        ]
    ];

    foreach ($testCases as $testCase) {
        echo "Testing: {$testCase['name']}\n";
        echo "Parameters: " . json_encode($testCase['params']) . "\n";

        try {
            // Simulasi request object
            $request = new Request();
            $request->merge($testCase['params']);

            // Simulasi user authentication
            $user = (object) [
                'id' => 1,
                'role' => 'owner',
                'business_id' => 1
            ];

            // Simulasi outlet header
            $request->headers->set('X-Outlet-Id', '1');

            // Buat instance controller
            $controller = new ReportController();

            // Panggil method dengan reflection untuk testing
            $reflection = new ReflectionClass($controller);
            $method = $reflection->getMethod('getSalesChartData');
            $method->setAccessible(true);

            // Simulasi user di request
            $request->setUserResolver(function () use ($user) {
                return $user;
            });

            // Execute method
            $response = $method->invoke($controller, $request);
            $data = $response->getData(true);

            // Validasi response
            if ($data['success']) {
                echo "✅ SUCCESS\n";
                echo "Chart Type: {$data['data']['chart_type']}\n";
                echo "Date Range: {$data['data']['date_range']['start']} to {$data['data']['date_range']['end']}\n";
                echo "Total Sales: " . number_format($data['data']['summary']['total_sales']) . "\n";
                echo "Total Transactions: {$data['data']['summary']['total_transactions']}\n";
                echo "Growth: {$data['data']['summary']['growth_percentage']}%\n";
                echo "Chart Data Points: " . count($data['data']['chart_data']) . "\n";
                echo "Category Data: " . count($data['data']['category_data']) . "\n";
                echo "Payment Data: " . count($data['data']['payment_data']) . "\n";
                echo "Top Products: " . count($data['data']['top_products']) . "\n";
            } else {
                echo "❌ FAILED: {$data['message']}\n";
            }

        } catch (Exception $e) {
            echo "❌ ERROR: " . $e->getMessage() . "\n";
        }

        echo "\n" . str_repeat('-', 50) . "\n\n";
    }
}

// Test data validation
function testDataValidation() {
    echo "=== TESTING DATA VALIDATION ===\n\n";

    $testCases = [
        [
            'name' => 'Invalid Chart Type',
            'params' => [
                'date_range' => 'today',
                'chart_type' => 'invalid_type'
            ],
            'should_fail' => false // Should default to daily
        ],
        [
            'name' => 'Invalid Date Range',
            'params' => [
                'date_range' => 'invalid_range',
                'chart_type' => 'daily'
            ],
            'should_fail' => false // Should default to today
        ],
        [
            'name' => 'Custom Date Without End',
            'params' => [
                'date_range' => 'custom',
                'custom_start' => '2024-01-01',
                'chart_type' => 'daily'
            ],
            'should_fail' => false // Should use start as end
        ]
    ];

    foreach ($testCases as $testCase) {
        echo "Testing: {$testCase['name']}\n";

        try {
            $request = new Request();
            $request->merge($testCase['params']);

            $user = (object) [
                'id' => 1,
                'role' => 'owner',
                'business_id' => 1
            ];

            $request->setUserResolver(function () use ($user) {
                return $user;
            });

            $controller = new ReportController();
            $reflection = new ReflectionClass($controller);
            $method = $reflection->getMethod('getSalesChartData');
            $method->setAccessible(true);

            $response = $method->invoke($controller, $request);
            $data = $response->getData(true);

            if ($data['success']) {
                echo "✅ SUCCESS (Handled gracefully)\n";
            } else {
                echo "❌ FAILED: {$data['message']}\n";
            }

        } catch (Exception $e) {
            echo "❌ ERROR: " . $e->getMessage() . "\n";
        }

        echo "\n";
    }
}

// Test performance
function testPerformance() {
    echo "=== TESTING PERFORMANCE ===\n\n";

    $iterations = 10;
    $times = [];

    for ($i = 0; $i < $iterations; $i++) {
        $start = microtime(true);

        try {
            $request = new Request();
            $request->merge([
                'date_range' => 'month',
                'chart_type' => 'daily'
            ]);

            $user = (object) [
                'id' => 1,
                'role' => 'owner',
                'business_id' => 1
            ];

            $request->setUserResolver(function () use ($user) {
                return $user;
            });

            $controller = new ReportController();
            $reflection = new ReflectionClass($controller);
            $method = $reflection->getMethod('getSalesChartData');
            $method->setAccessible(true);

            $response = $method->invoke($controller, $request);

            $end = microtime(true);
            $times[] = ($end - $start) * 1000; // Convert to milliseconds

        } catch (Exception $e) {
            echo "Error in iteration {$i}: " . $e->getMessage() . "\n";
        }
    }

    if (!empty($times)) {
        $avgTime = array_sum($times) / count($times);
        $minTime = min($times);
        $maxTime = max($times);

        echo "Performance Results (Month of Daily Data):\n";
        echo "Average Time: " . number_format($avgTime, 2) . " ms\n";
        echo "Min Time: " . number_format($minTime, 2) . " ms\n";
        echo "Max Time: " . number_format($maxTime, 2) . " ms\n";
        echo "Total Iterations: {$iterations}\n";

        if ($avgTime < 1000) {
            echo "✅ Performance: EXCELLENT (< 1s)\n";
        } elseif ($avgTime < 2000) {
            echo "✅ Performance: GOOD (< 2s)\n";
        } else {
            echo "⚠️ Performance: NEEDS OPTIMIZATION (> 2s)\n";
        }
    }
}

// Run all tests
if (php_sapi_name() === 'cli') {
    echo "Starting Sales Chart API Tests...\n\n";

    testSalesChartData();
    testDataValidation();
    testPerformance();

    echo "=== TESTING COMPLETED ===\n";
} else {
    echo "This script should be run from command line.\n";
}
