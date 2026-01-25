<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BusinessController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\POSController;
use App\Http\Controllers\Api\KitchenController;
use App\Http\Controllers\Api\DiscountController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\TableController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\OnlinePlatformController;
use App\Http\Controllers\Api\SelfServiceController;
use App\Http\Controllers\Api\SelfServiceManagementController;
use App\Http\Controllers\Api\IngredientController;
use App\Http\Controllers\Api\RecipeController;
use App\Http\Controllers\Api\OutletController;
use App\Http\Controllers\Api\StockTransferRequestController;
use App\Http\Controllers\Api\EmployeeOutletAssignmentController;
use App\Http\Controllers\Api\SubscriptionController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\OrderPaymentController;
use App\Http\Controllers\Api\PublicOutletController;
use App\Http\Controllers\Api\CashierShiftController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\CustomerReportController;
use App\Http\Controllers\Api\CashierPerformanceController;
use App\Http\Controllers\Api\CashierClosingController;
use App\Http\Controllers\Api\PromoUsageController;
use App\Http\Controllers\Api\ProductReportController;
use App\Http\Controllers\Api\InventoryReportController;
use App\Http\Controllers\Api\FinanceController;
use App\Http\Controllers\Api\BudgetController;
use App\Http\Controllers\Api\TaxController;
use App\Http\Controllers\Api\EmployeeShiftController;
use App\Http\Controllers\Api\BusinessTypeController;
use App\Http\Controllers\Api\PayrollController;

// Rate limiting: More lenient for development/testing, stricter for production
$loginThrottle = app()->environment(['local', 'testing']) ? 'throttle:1000,1' : 'throttle:10,1';
$registerThrottle = app()->environment(['local', 'testing']) ? 'throttle:100,1' : 'throttle:5,1';

Route::post('/register', [AuthController::class, 'register'])->middleware($registerThrottle);
Route::post('/login', [AuthController::class, 'login'])->middleware($loginThrottle);
Route::get('/email/verify/{id}/{hash}', [AuthController::class, 'verifyEmail'])->name('verification.verify')->middleware('signed');
Route::post('/email/resend-verification', [AuthController::class, 'resendVerificationEmail'])->middleware('auth:sanctum');

// Password Reset Routes (Public - no auth required)
Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:5,1');
Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:5,1');

// WhatsApp Verification (Public - before registration)
Route::post('/whatsapp/send-otp', [AuthController::class, 'sendWhatsAppOTP'])->middleware('throttle:5,1');
Route::post('/whatsapp/verify-otp', [AuthController::class, 'verifyWhatsAppOTP'])->middleware('throttle:10,1');

// Business types (public access for new users to view available business types)
// ✅ SECURITY: Rate limiting untuk public endpoints (100 requests per minute)
Route::prefix('business-types')->middleware('throttle:100,1')->group(function () {
    Route::get('/', [BusinessTypeController::class, 'index']);
    Route::get('/{code}', [BusinessTypeController::class, 'show']);
});

// ============================================
// PUBLIC OUTLET ORDERING (No Auth Required)
// ============================================
// ✅ SECURITY: Rate limiting untuk public ordering (200 requests per minute - higher for customer ordering)
Route::prefix('public/outlets')->middleware('throttle:200,1')->group(function () {
    Route::get('/{slug}', [PublicOutletController::class, 'getOutletBySlug']);
    Route::get('/{slug}/products', [PublicOutletController::class, 'getOutletProducts']);
    Route::get('/{slug}/categories', [PublicOutletController::class, 'getOutletCategories']);
    Route::post('/{slug}/orders', [PublicOutletController::class, 'placeOrder']);
});

// Public order status check (no auth required)
// ✅ SECURITY: Rate limiting untuk order status check (100 requests per minute)
Route::middleware('throttle:100,1')->get('public/orders/{orderNumber}/status', [PublicOutletController::class, 'checkOrderStatus']);

// Public receipt (no auth required)
// ✅ SECURITY: Rate limiting untuk receipt (100 requests per minute)
Route::middleware('throttle:100,1')->get('public/receipt/{token}', [\App\Http\Controllers\Api\PublicReceiptController::class, 'getReceipt']);

// Subscription plans (public access for new users to view plans)
// ✅ SECURITY: Rate limiting untuk subscription plans (100 requests per minute)
Route::prefix('subscriptions')->middleware('throttle:100,1')->group(function () {
    Route::get('/plans', [SubscriptionController::class, 'getPlans']);
    Route::get('/plans/{slug}', [SubscriptionController::class, 'getPlanBySlug']);
});

// Payment webhook (no auth required for Midtrans callback)
// ✅ SECURITY: Rate limiting untuk webhook (higher limit for Midtrans callbacks)
// Note: Webhook dari Midtrans perlu IP whitelist di production
Route::prefix('v1/payments')->middleware('throttle:300,1')->group(function () {
    Route::post('/midtrans/notification', [PaymentController::class, 'handleMidtransNotification']);
    Route::post('/midtrans/order-notification', [OrderPaymentController::class, 'handleNotification']);
    Route::get('/client-key', [PaymentController::class, 'getClientKey']);
});

// ✅ Token Management (authenticated users)
// ✅ SECURITY: Rate limiting untuk token management (30 requests per minute)
Route::middleware(['auth:sanctum', 'throttle:30,1'])->group(function () {
    Route::get('/user/tokens', [AuthController::class, 'tokens']);
    Route::delete('/user/tokens/{tokenId}', [AuthController::class, 'revokeToken']);
    Route::post('/user/tokens/revoke-all', [AuthController::class, 'revokeAllTokens']);
    Route::post('/refresh-token', [AuthController::class, 'refreshToken']);
    Route::post('/logout', [AuthController::class, 'logout']);
});

// ✅ SECURITY: Rate limiting untuk user endpoint (60 requests per minute)
Route::middleware(['auth:sanctum', 'throttle:60,1'])->get('/user', function (Request $request) {
    return $request->user();
});

// User Profile - READ operations (higher limit untuk session check, polling, multi-tab)
// ✅ SECURITY: Rate limiting 200 req/min untuk read-only profile check
Route::prefix('v1/user')->middleware(['auth:sanctum', 'throttle:200,1'])->group(function () {
    Route::get('/profile/check', [AuthController::class, 'checkProfileComplete']);
});

// User Profile - WRITE operations (stricter limit untuk mutation)
// ✅ SECURITY: Rate limiting 30 req/min untuk profile updates & password change
Route::prefix('v1/user')->middleware(['auth:sanctum', 'throttle:30,1'])->group(function () {
    Route::put('/profile', [AuthController::class, 'updateProfile']);
    Route::post('/profile/complete', [AuthController::class, 'completeProfile']);
    Route::post('/change-password', [AuthController::class, 'changePassword']);
});

// POS API Routes
// ✅ SECURITY: Global rate limiting untuk semua API routes (60 requests per minute per IP)
Route::prefix('v1')->middleware(['auth:sanctum', 'subscription.check', 'throttle:60,1'])->group(function () {

    // Business API
    Route::prefix('businesses')->group(function () {
        Route::get('/', [BusinessController::class, 'index']);
        Route::post('/', [BusinessController::class, 'store']);
        Route::get('/current', [BusinessController::class, 'current']);
        Route::get('/subscription-limits', [BusinessController::class, 'getSubscriptionLimits']);
        Route::get('/{business}', [BusinessController::class, 'show']);
        Route::put('/{business}', [BusinessController::class, 'update']);
        Route::delete('/{business}', [BusinessController::class, 'destroy']);
        Route::post('/{business}/switch', [BusinessController::class, 'switch']);
    });

    // Dashboard API
    Route::prefix('dashboard')->group(function () {
        Route::get('/stats', [DashboardController::class, 'getStats']);
        Route::get('/recent-orders', [DashboardController::class, 'getRecentOrders']);
        Route::get('/top-products', [DashboardController::class, 'getTopProducts']);
        Route::get('/product-management', [DashboardController::class, 'getProductManagementData']);
    });

    // Product API
    Route::prefix('products')->group(function () {
        Route::get('/initial-data', [ProductController::class, 'getInitialData']); // Combined endpoint
        Route::get('/', [ProductController::class, 'apiIndex']);
        Route::post('/', [ProductController::class, 'store']);
        Route::get('/{product}', [ProductController::class, 'apiShow']);
        Route::put('/{product}', [ProductController::class, 'update']);
        Route::delete('/{product}', [ProductController::class, 'destroy']);
        Route::post('/{product}/stock-adjustment', [ProductController::class, 'stockAdjustment']);
    });

    // Category API
    Route::apiResource('categories', CategoryController::class);

    // Customer API
    Route::prefix('customers')->group(function () {
        Route::get('/', [CustomerController::class, 'apiIndex']);
        Route::post('/', [CustomerController::class, 'store']);
        Route::get('/{customer}', [CustomerController::class, 'apiShow']);
        Route::put('/{customer}', [CustomerController::class, 'update']);
        Route::delete('/{customer}', [CustomerController::class, 'destroy']);
        Route::get('/search/{query}', [CustomerController::class, 'search']);
    });

    // Outlet API
    Route::prefix('outlets')->group(function () {
        Route::get('/', [OutletController::class, 'index']);
        Route::post('/', [OutletController::class, 'store']);
        Route::get('/{outlet}', [OutletController::class, 'show']);
        Route::put('/{outlet}', [OutletController::class, 'update']);
        Route::delete('/{outlet}', [OutletController::class, 'destroy']);

        // Payment Gateway Configuration
        Route::get('/{outlet}/payment-gateway-config', [OutletController::class, 'getPaymentGatewayConfig']);
        Route::post('/{outlet}/payment-gateway-config', [OutletController::class, 'updatePaymentGatewayConfig']);
        Route::delete('/{outlet}/payment-gateway-config', [OutletController::class, 'deletePaymentGatewayConfig']);
        Route::get('/{outlet}/debug-midtrans-config', [OutletController::class, 'debugMidtransConfig']);

        // WhatsApp Configuration
        Route::get('/{outlet}/whatsapp-config', [OutletController::class, 'getWhatsAppConfig']);
        Route::post('/{outlet}/whatsapp-config', [OutletController::class, 'updateWhatsAppConfig']);
    });

    // WhatsApp API
    Route::prefix('whatsapp')->group(function () {
        Route::post('/send', [\App\Http\Controllers\Api\WhatsAppController::class, 'sendCustomMessage']);
        Route::post('/test', [\App\Http\Controllers\Api\WhatsAppController::class, 'testConnection']);
        Route::post('/orders/{order}/receipt', [\App\Http\Controllers\Api\WhatsAppController::class, 'sendPaymentReceipt']);
    });

    // Stock Transfer Request API
    Route::prefix('stock-transfers')->group(function () {
        Route::get('/', [StockTransferRequestController::class, 'index']);
        Route::post('/', [StockTransferRequestController::class, 'store']);
        Route::get('/{id}', [StockTransferRequestController::class, 'show']);
        Route::post('/{id}/status', [StockTransferRequestController::class, 'updateStatus']);
        Route::delete('/{id}', [StockTransferRequestController::class, 'destroy']);
    });

    // Notifications API
    Route::prefix('notifications')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\NotificationController::class, 'index']);
        Route::get('/count', [\App\Http\Controllers\Api\NotificationController::class, 'count']);
        Route::post('/mark-all-read', [\App\Http\Controllers\Api\NotificationController::class, 'markAllRead']);
        Route::post('/{notification}/read', [\App\Http\Controllers\Api\NotificationController::class, 'markRead']);
    });

    // Employee Outlet Assignment API
    Route::prefix('employee-outlets')->group(function () {
        Route::get('/', [EmployeeOutletAssignmentController::class, 'index']);
        Route::get('/employee/{userId}', [EmployeeOutletAssignmentController::class, 'getEmployeeOutlets']);
        Route::get('/outlet/{outletId}', [EmployeeOutletAssignmentController::class, 'getOutletEmployees']);
        Route::post('/assign', [EmployeeOutletAssignmentController::class, 'assign']);
        Route::post('/unassign', [EmployeeOutletAssignmentController::class, 'unassign']);
        Route::post('/set-primary', [EmployeeOutletAssignmentController::class, 'setPrimary']);
    });

    // Cashier Shift Management API
    Route::prefix('shifts')->group(function () {
        Route::get('/active', [CashierShiftController::class, 'getActiveShift']);
        Route::get('/active-all', [CashierShiftController::class, 'getAllActiveShifts']);
        Route::get('/summary', [CashierShiftController::class, 'getShiftSummary']);
        Route::post('/open', [CashierShiftController::class, 'openShift']);
        Route::post('/{shift}/close', [CashierShiftController::class, 'closeShift']);
        Route::post('/{shift}/recalculate', [CashierShiftController::class, 'recalculateShift']);
        Route::get('/history', [CashierShiftController::class, 'getHistory']);
        Route::get('/{shift}', [CashierShiftController::class, 'getShiftDetail']);
        Route::get('/{shift}/closing-report', [CashierShiftController::class, 'getShiftClosingReport']);
    });

    // Order API - Requires outlet access for kasir/kitchen/waiter roles
    Route::prefix('orders')->middleware('outlet.access')->group(function () {
        Route::get('/', [OrderController::class, 'index']);
        Route::get('/unpaid', [OrderController::class, 'unpaidOrders']); // ✅ New endpoint for unpaid orders
        Route::post('/', [POSController::class, 'createOrder']);
        Route::get('/{order}', [OrderController::class, 'show']);
        Route::get('/{order}/receipt', [POSController::class, 'printReceipt']);
        Route::post('/{order}/payment', [POSController::class, 'processPayment']);
        Route::patch('/{order}/status', [OrderController::class, 'updateStatus']); // ✅ New endpoint for status update
        Route::post('/{order}/cancel', [OrderController::class, 'cancel']);
        Route::post('/{order}/refund', [OrderController::class, 'refund']);
        Route::post('/{order}/add-items', [OrderController::class, 'addItems']); // ✅ Add items to order (for kasir)
        Route::post('/{order}/apply-discount', [OrderController::class, 'applyDiscount']); // ✅ Apply discount to order (for kasir)
        Route::post('/{order}/sync-payment', [OrderController::class, 'syncPaymentStatus']); // ✅ NEW: Sync payment status from Midtrans

        // QRIS Payment routes
        Route::post('/payment/qris', [OrderPaymentController::class, 'createQrisPayment']);
        Route::get('/payment/{payment}/status', [OrderPaymentController::class, 'checkPaymentStatus']);
        Route::post('/payment/{payment}/cancel', [OrderPaymentController::class, 'cancelPayment']);

        // Admin/Owner only routes
        Route::middleware(['auth:sanctum', 'check.admin.role'])->group(function () {
            Route::put('/{order}', [OrderController::class, 'update']);
            Route::delete('/{order}', [OrderController::class, 'destroy']);
        });
    });

    // Kitchen API - Requires outlet access for kitchen role
    Route::prefix('kitchen')->middleware('outlet.access')->group(function () {
        Route::get('/orders', [KitchenController::class, 'getOrders']);
        Route::post('/orders/{order}/status', [KitchenController::class, 'updateStatus']);
        Route::post('/orders/{order}/confirm', [KitchenController::class, 'confirmOrder']); // ✅ NEW: Manual confirm order
        Route::get('/orders/pending', [KitchenController::class, 'getPendingOrders']);
        Route::get('/orders/notifications', [KitchenController::class, 'getNewOrderNotifications']); // ✅ NEW: Get new order notifications
    });

    // Notifications API
    Route::prefix('notifications')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\NotificationController::class, 'index']);
        Route::get('/count', [\App\Http\Controllers\Api\NotificationController::class, 'count']);
        Route::post('/mark-all-read', [\App\Http\Controllers\Api\NotificationController::class, 'markAllRead']);
        Route::post('/{notification}/read', [\App\Http\Controllers\Api\NotificationController::class, 'markRead']);
    });

    // Discount API
    Route::prefix('discounts')->group(function () {
        Route::get('/', [DiscountController::class, 'apiIndex']);
        Route::post('/', [DiscountController::class, 'store']);
        Route::post('/validate', [DiscountController::class, 'validateCode']);
        Route::get('/{discount}', [DiscountController::class, 'apiShow']);
        Route::put('/{discount}', [DiscountController::class, 'update']);
        Route::delete('/{discount}', [DiscountController::class, 'destroy']);
    });

    // Employee API
    Route::prefix('employees')->group(function () {
        Route::get('/', [EmployeeController::class, 'index']);
        Route::post('/', [EmployeeController::class, 'store']);
        Route::get('/{employee}', [EmployeeController::class, 'show']);
        Route::put('/{employee}', [EmployeeController::class, 'update']);
        Route::delete('/{employee}', [EmployeeController::class, 'destroy']);
        Route::get('/{employee}/performance', [EmployeeController::class, 'getPerformance']);
    });

    // Employee Attendance/Shift API
    Route::prefix('attendance')->group(function () {
        Route::get('/shifts', [EmployeeShiftController::class, 'index']);
        Route::get('/today', [EmployeeShiftController::class, 'getTodayShift']);
        Route::get('/stats', [EmployeeShiftController::class, 'getAttendanceStats']);
        Route::get('/report', [EmployeeShiftController::class, 'getAttendanceReport']);
        Route::post('/clock-in', [EmployeeShiftController::class, 'clockIn']);
        Route::post('/shifts/{shift}/clock-out', [EmployeeShiftController::class, 'clockOut']);
        // ✅ NEW: Face recognition endpoints
        Route::post('/register-face', [EmployeeShiftController::class, 'registerFace']);
        Route::post('/verify-face', [EmployeeShiftController::class, 'verifyFace']);
    });

    // Payroll API
    Route::prefix('payrolls')->group(function () {
        Route::get('/', [PayrollController::class, 'index']);
        Route::get('/stats', [PayrollController::class, 'stats']);
        Route::post('/calculate', [PayrollController::class, 'calculate']); // Preview calculation
        Route::post('/', [PayrollController::class, 'store']); // Generate payroll
        Route::post('/generate-all', [PayrollController::class, 'generateAll']); // Generate for all employees
        Route::get('/{id}', [PayrollController::class, 'show']);
        Route::put('/{id}', [PayrollController::class, 'update']);
        Route::delete('/{id}', [PayrollController::class, 'destroy']);
    });

    // Report API
    Route::prefix('reports')->group(function () {
        // Sales Reports
        Route::get('/sales/summary', [ReportController::class, 'getSalesSummary']);
        Route::get('/sales/detail', [ReportController::class, 'getSalesDetail']);
        Route::get('/sales/chart-data', [ReportController::class, 'getSalesChartData']);

        // Payment Type Reports
        Route::get('/payment-types', [ReportController::class, 'getPaymentTypeReport']);

        // Commission Reports
        Route::get('/commission', [ReportController::class, 'getCommissionReport']);

        // Legacy routes (keep for backward compatibility)
        Route::get('/sales', [ReportController::class, 'getSalesData']);
        Route::get('/inventory', [ReportController::class, 'getInventoryData']);
        Route::get('/financial', [ReportController::class, 'getFinancialData']);
        Route::get('/customer-analytics', [ReportController::class, 'getCustomerAnalytics']);
        Route::get('/export/sales', [ReportController::class, 'exportSales']);
        Route::get('/export/inventory', [ReportController::class, 'exportInventory']);
        // Dynamic export route - must be last to avoid conflicts
        Route::get('/export/{type}', [ReportController::class, 'exportReport'])->where('type', '[a-z-]+');

        // Product Reports
        Route::get('/products/sales', [ProductReportController::class, 'getProductSales']);
        Route::get('/categories/sales', [ProductReportController::class, 'getCategorySales']);

        // Inventory Reports
        Route::get('/inventory/status', [InventoryReportController::class, 'getInventoryStatus']);
        Route::get('/inventory/movements', [InventoryReportController::class, 'getStockMovements']);
        Route::get('/inventory/categories', [InventoryReportController::class, 'getCategories']);
        Route::get('/inventory/products', [InventoryReportController::class, 'getProducts']);
    });

    // Inventory API
    Route::prefix('inventory')->group(function () {
        Route::get('/products', [InventoryController::class, 'getProducts']);
        Route::get('/ingredients', [InventoryController::class, 'getIngredients']);
        Route::post('/stock-adjustment', [InventoryController::class, 'stockAdjustment']);
        Route::get('/movements', [InventoryController::class, 'getMovements']);
        Route::get('/low-stock-alerts', [InventoryController::class, 'getLowStockAlerts']);
    });

    // Ingredient API
    Route::prefix('ingredients')->group(function () {
        Route::get('/', [IngredientController::class, 'index']);
        Route::post('/', [IngredientController::class, 'store']);
        Route::get('/low-stock', [IngredientController::class, 'getLowStock']);
        Route::get('/{ingredient}', [IngredientController::class, 'show']);
        Route::put('/{ingredient}', [IngredientController::class, 'update']);
        Route::delete('/{ingredient}', [IngredientController::class, 'destroy']);
        Route::post('/{ingredient}/stock', [IngredientController::class, 'updateStock']);
    });

    // Recipe API
    Route::prefix('recipes')->group(function () {
        Route::get('/', [RecipeController::class, 'index']);
        Route::post('/', [RecipeController::class, 'store']);
        Route::get('/{product}', [RecipeController::class, 'show']);
        Route::put('/{product}', [RecipeController::class, 'update']);
        Route::delete('/{product}', [RecipeController::class, 'destroy']);
        Route::get('/{product}/calculate', [RecipeController::class, 'calculateCost']);
    });

    // Table API
    Route::prefix('tables')->group(function () {
        Route::get('/', [TableController::class, 'apiIndex']);
        Route::post('/', [TableController::class, 'store']);
        Route::put('/{table}', [TableController::class, 'update']);
        Route::delete('/{table}', [TableController::class, 'destroy']);
        Route::post('/{table}/status', [TableController::class, 'updateStatus']);
    });

    // Self Service Management API
    Route::prefix('self-service-management')->group(function () {
        Route::get('/orders', [SelfServiceManagementController::class, 'getOrders']);
        Route::get('/stats', [SelfServiceManagementController::class, 'getStats']);
        Route::put('/orders/{order}/status', [SelfServiceManagementController::class, 'updateOrderStatus']);
        Route::get('/tables', [SelfServiceManagementController::class, 'getTables']);
        Route::post('/tables', [SelfServiceManagementController::class, 'createTable']);
        Route::put('/tables/{table}', [SelfServiceManagementController::class, 'updateTable']);
        Route::put('/tables/{table}/status', [SelfServiceManagementController::class, 'updateTableStatus']);
        Route::delete('/tables/{table}', [SelfServiceManagementController::class, 'deleteTable']);
        Route::get('/tables/{table}/qr-code', [SelfServiceManagementController::class, 'generateQRCode']);
        Route::get('/tables/{table}/qr-preview', [SelfServiceManagementController::class, 'previewQRCode']);
        Route::get('/qr-menus', [SelfServiceManagementController::class, 'getQRMenuStats']);
    });

    // Settings API
    Route::prefix('settings')->middleware('role:admin')->group(function () {
        Route::get('/business', [SettingsController::class, 'getBusiness']);
        Route::put('/business', [SettingsController::class, 'updateBusiness']);
        Route::get('/outlets', [SettingsController::class, 'getOutlets']);
        Route::post('/outlets', [SettingsController::class, 'storeOutlet']);
        Route::get('/payment-methods', [SettingsController::class, 'getPaymentMethods']);
        Route::put('/payment-methods', [SettingsController::class, 'updatePaymentMethods']);
    });

    // Receipt Footer Message API (accessible by all authenticated users, but update requires admin/owner)
    Route::prefix('settings')->group(function () {
        Route::get('/receipt-footer-message', [SettingsController::class, 'getReceiptFooterMessage']);
        Route::put('/receipt-footer-message', [SettingsController::class, 'updateReceiptFooterMessage'])->middleware('check.admin.role');
    });

    // Expense API
    Route::prefix('expenses')->group(function () {
        Route::get('/', [ExpenseController::class, 'index']);
        Route::post('/', [ExpenseController::class, 'store']);
        Route::get('/stats', [ExpenseController::class, 'getStats']);
        Route::get('/{expense}', [ExpenseController::class, 'show']);
        Route::put('/{expense}', [ExpenseController::class, 'update']);
        Route::delete('/{expense}', [ExpenseController::class, 'destroy']);
    });

    // Budget API
    Route::prefix('budgets')->group(function () {
        Route::get('/', [BudgetController::class, 'index']);
        Route::post('/', [BudgetController::class, 'store']);
        Route::get('/{budget}', [BudgetController::class, 'show']);
        Route::put('/{budget}', [BudgetController::class, 'update']);
        Route::delete('/{budget}', [BudgetController::class, 'destroy']);
    });

    // Tax API
    Route::prefix('taxes')->group(function () {
        Route::get('/', [TaxController::class, 'index']);
        Route::post('/', [TaxController::class, 'store']);
        Route::get('/{tax}', [TaxController::class, 'show']);
        Route::put('/{tax}', [TaxController::class, 'update']);
        Route::delete('/{tax}', [TaxController::class, 'destroy']);
    });

    // Finance API
    Route::prefix('finance')->group(function () {
        Route::get('/summary', [FinanceController::class, 'getFinancialSummary']);
        Route::get('/cash-flow', [FinanceController::class, 'getCashFlow']);
        Route::get('/profit-loss', [FinanceController::class, 'getProfitLoss']);
    });

    // Customer Report API
Route::prefix('customer-reports')->group(function () {
    Route::get('/analytics', [CustomerReportController::class, 'getCustomerAnalytics']);
    Route::get('/top-customers', [CustomerReportController::class, 'getTopCustomers']);
    Route::get('/demographics', [CustomerReportController::class, 'getCustomerDemographics']);
    Route::get('/customers', [CustomerReportController::class, 'getCustomerList']);
    Route::get('/product-preferences', [CustomerReportController::class, 'getCustomerProductPreferences']);
    Route::get('/customers/{customerId}/products', [CustomerReportController::class, 'getCustomerProductHistory']);
});

    // Cashier Performance API
Route::prefix('cashier-performance')->group(function () {
    Route::get('/analytics', [CashierPerformanceController::class, 'getPerformanceAnalytics']);
    Route::get('/sessions', [CashierPerformanceController::class, 'getSessionHistory']);
    Route::get('/cashiers/{cashierId}', [CashierPerformanceController::class, 'getCashierDetail']);
});

    // Cashier Closing API
Route::prefix('cashier-closing')->group(function () {
    Route::get('/summary', [CashierClosingController::class, 'getClosingSummary']);
    Route::post('/close-session', [CashierClosingController::class, 'closeSession']);
    Route::get('/history', [CashierClosingController::class, 'getClosingHistory']);
    Route::get('/report', [CashierClosingController::class, 'getClosingReport']);
});

    // Promo Usage API
Route::prefix('promo-usage')->group(function () {
    Route::get('/analytics', [PromoUsageController::class, 'getPromoUsageAnalytics']);
    Route::get('/effectiveness', [PromoUsageController::class, 'getDiscountEffectiveness']);
    Route::get('/trends', [PromoUsageController::class, 'getDiscountTrends']);
});

    // Platform Integration API
    Route::prefix('platforms')->middleware('role:admin')->group(function () {
        Route::get('/', [OnlinePlatformController::class, 'apiIndex']);
        Route::post('/{platform}/sync', [OnlinePlatformController::class, 'syncOrders']);
        Route::get('/{platform}/orders', [OnlinePlatformController::class, 'getPlatformOrders']);
        Route::put('/{platform}/settings', [OnlinePlatformController::class, 'updateSettings']);
        Route::post('/{platform}/webhook', [OnlinePlatformController::class, 'handleWebhook']);
    });

    // Subscription API (authenticated users)
        Route::prefix('subscriptions')->group(function () {
            Route::post('/subscribe', [SubscriptionController::class, 'subscribe']);
            Route::get('/current', [SubscriptionController::class, 'getCurrentSubscription']);
            Route::get('/history', [SubscriptionController::class, 'getHistory']);
            Route::get('/trial-status', [SubscriptionController::class, 'getTrialStatus']);
            Route::get('/payment-token/{subscriptionCode}', [SubscriptionController::class, 'getPaymentToken']);
            Route::post('/verify-activate', [SubscriptionController::class, 'verifyAndActivatePending']);
            Route::post('/check-downgrade', [SubscriptionController::class, 'checkDowngrade']);
            Route::get('/upgrade-options/{planId}/{priceId}', [SubscriptionController::class, 'getUpgradeOptions']);
            Route::post('/upgrade', [SubscriptionController::class, 'upgradeSubscription']);
            Route::post('/downgrade-to-trial', [SubscriptionController::class, 'downgradeToTrial']);
            Route::post('/manual-activate', [SubscriptionController::class, 'manualActivateSubscription']);
            Route::post('/{subscriptionId}/confirm-payment', [SubscriptionController::class, 'confirmPayment']);
            Route::post('/{subscriptionId}/cancel', [SubscriptionController::class, 'cancelSubscription']);
        });

        // Payment status check (requires auth)
        Route::prefix('payments')->group(function () {
            Route::get('/status/{subscriptionCode}', [PaymentController::class, 'checkPaymentStatus']);
        });

        // Sales & Orders API
        Route::prefix('sales')->group(function () {
            Route::get('/debug', [\App\Http\Controllers\Api\SalesController::class, 'debug']);
            Route::get('/stats', [\App\Http\Controllers\Api\SalesController::class, 'getStats']);

            // Orders under sales
            Route::prefix('orders')->group(function () {
                Route::get('/', [\App\Http\Controllers\Api\SalesController::class, 'getOrders']);
                Route::get('/{id}', [\App\Http\Controllers\Api\SalesController::class, 'getOrderById']);
                Route::put('/{id}/status', [\App\Http\Controllers\Api\SalesController::class, 'updateOrderStatus']);
                Route::put('/{id}/cancel', [\App\Http\Controllers\Api\SalesController::class, 'cancelOrder']);
            });

            // Customers under sales
            Route::prefix('customers')->group(function () {
                Route::get('/', [\App\Http\Controllers\Api\SalesController::class, 'getCustomers']);
                Route::get('/{id}', [\App\Http\Controllers\Api\SalesController::class, 'getCustomerById']);
                Route::post('/', [\App\Http\Controllers\Api\SalesController::class, 'createCustomer']);
                Route::put('/{id}', [\App\Http\Controllers\Api\SalesController::class, 'updateCustomer']);
                Route::delete('/{id}', [\App\Http\Controllers\Api\SalesController::class, 'deleteCustomer']);
                Route::get('/{id}/orders', [\App\Http\Controllers\Api\SalesController::class, 'getCustomerOrders']);
            });

            // Export under sales
            Route::prefix('export')->group(function () {
                Route::get('/{type}', [\App\Http\Controllers\Api\SalesController::class, 'exportData']);
            });
        });
});

// Public API Routes (for mobile apps, webhooks, etc.)
Route::prefix('public/v1')->group(function () {

    // Self Service API (Old QR Code routes - kept for backward compatibility)
    Route::prefix('self-service')->group(function () {
        Route::get('/menu/{tableQr}', [SelfServiceController::class, 'getMenu']);
        Route::post('/order/{tableQr}', [SelfServiceController::class, 'placeOrder']);
        Route::post('/validate-discount/{tableQr}', [SelfServiceController::class, 'validateDiscount']);
        Route::post('/customer/search/{tableQr}', [SelfServiceController::class, 'searchCustomerByPhone']);
        Route::get('/order/{orderNumber}/status', [SelfServiceController::class, 'getOrderStatus']);
        Route::post('/order/{orderNumber}/payment/midtrans', [SelfServiceController::class, 'createMidtransPayment']);
    });

    // Public Order by Outlet (New user-friendly routes)
    Route::prefix('order')->group(function () {
        Route::get('/{outletSlug}/menu', [SelfServiceController::class, 'getMenuByOutlet']);
        Route::post('/{outletSlug}/place', [SelfServiceController::class, 'placeOrderByOutlet']);
        Route::post('/{outletSlug}/validate-discount', [SelfServiceController::class, 'validateDiscount']);
        Route::post('/{outletSlug}/customer/search', [SelfServiceController::class, 'searchCustomerByPhone']);
        Route::get('/status/{orderNumber}', [SelfServiceController::class, 'getOrderStatus']);
    });

    // Platform Webhooks (No auth required)
    Route::post('/webhooks/grabfood', [OnlinePlatformController::class, 'grabfoodWebhook']);
    Route::post('/webhooks/gofood', [OnlinePlatformController::class, 'gofoodWebhook']);
    Route::post('/webhooks/shopeefood', [OnlinePlatformController::class, 'shopeefoodWebhook']);

    // Midtrans Webhook (No auth required)
    Route::post('/webhooks/midtrans', [OrderPaymentController::class, 'handleNotification']);
});

// Test API Routes (No auth required for testing)
Route::prefix('test/v1')->group(function () {
    Route::get('/reports/financial', [ReportController::class, 'getFinancialData']);
    Route::get('/reports/sales', [ReportController::class, 'getSalesSummary']);
    Route::get('/reports/inventory', [ReportController::class, 'getInventoryData']);
});

/*
|--------------------------------------------------------------------------
| Additional Route Configurations
|--------------------------------------------------------------------------
*/

// Route Model Bindings
Route::bind('business', function ($value) {
    // Try to find by ID first (if numeric), otherwise by slug
    if (is_numeric($value)) {
        return \App\Models\Business::findOrFail($value);
    }
    return \App\Models\Business::where('slug', $value)->firstOrFail();
});

// Route Middleware Groups for Role-based Access
Route::middleware(['auth', 'role:admin'])->group(function () {
    // Admin-only routes are already defined above with middleware
});

Route::middleware(['auth', 'role:admin,cashier'])->group(function () {
    // POS operations can be accessed by admin and cashier
    // Already handled in POS routes above
});

Route::middleware(['auth', 'role:admin,kitchen'])->group(function () {
    // Kitchen operations - already defined above
});

/*
|--------------------------------------------------------------------------
| Custom Route Patterns
|--------------------------------------------------------------------------
*/

// Set pattern for commonly used parameters
Route::pattern('id', '[0-9]+');
Route::pattern('slug', '[a-zA-Z0-9-_]+');
Route::pattern('orderNumber', '[A-Z0-9]+');
Route::pattern('tableQr', '[A-Z0-9-_]+');
