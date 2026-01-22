<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Table;
use App\Models\Business;
use App\Models\Outlet;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SelfServiceManagementController extends Controller
{
    /**
     * Get all self-service orders with filters
     */
    public function getOrders(Request $request)
    {
        $user = Auth::user();
        $businessId = $request->header('X-Business-Id');
        $outletId = $request->header('X-Outlet-Id');

        $query = Order::with(['orderItems.product', 'table', 'customer', 'payments'])
            ->where('type', 'self_service');

        // Filter by business
        if ($businessId) {
            $query->where('business_id', $businessId);
        }

        // Filter by outlet
        if ($outletId && !in_array($user->role, ['super_admin', 'owner'])) {
            $query->where('outlet_id', $outletId);
        }

        // Filter by status
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // ✅ NEW: Date range filter - untuk owner/admin bisa filter custom, untuk kasir hanya hari ini
        $user = Auth::user();
        $isOwnerOrAdmin = in_array($user->role, ['owner', 'admin', 'super_admin']);
        
        if ($isOwnerOrAdmin) {
            // Owner/Admin: Support custom date range
            if ($request->has('date_from') && $request->has('date_to')) {
                $startDate = \Carbon\Carbon::parse($request->get('date_from'))->startOfDay();
                $endDate = \Carbon\Carbon::parse($request->get('date_to'))->endOfDay();
                $query->whereBetween('created_at', [$startDate, $endDate]);
            } elseif ($request->has('date_range')) {
                $dateRange = $request->get('date_range');
                $dateRangeFilter = $this->getDateRange($dateRange);
                $query->whereBetween('created_at', [$dateRangeFilter['start'], $dateRangeFilter['end']]);
            } else {
                // Default: hari ini
                $query->whereDate('created_at', now()->toDateString());
            }
        } else {
            // Kasir/Employee: Hanya hari ini
            $query->whereDate('created_at', now()->toDateString());
        }

        // Search
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                  ->orWhere('customer_name', 'like', "%{$search}%")
                  ->orWhereHas('table', function ($tableQuery) use ($search) {
                      $tableQuery->where('name', 'like', "%{$search}%");
                  });
            });
        }

        // ✅ NEW: Pagination per 9 order
        $perPage = $request->get('per_page', 9);
        $orders = $query->orderBy('created_at', 'desc')->paginate($perPage);

        // ✅ FIX: Format orders dengan items yang benar
        $formattedOrders = $orders->getCollection()->map(function ($order) {
            // ✅ FIX: Get customer data dari customer_data JSON atau customer relation
            $customerName = null;
            $customerPhone = null;
            $customerEmail = null;
            
            // Method 1: Dari customer relation (jika ada)
            if ($order->customer) {
                $customerName = $order->customer->name;
                $customerPhone = $order->customer->phone;
                $customerEmail = $order->customer->email;
            }
            
            // Method 2: Dari customer_data JSON (override jika customer relation tidak ada)
            if ($order->customer_data) {
                try {
                    $customerData = is_array($order->customer_data) 
                        ? $order->customer_data 
                        : json_decode($order->customer_data, true);
                    
                    if (is_array($customerData)) {
                        // ✅ FIX: Ambil customer_name jika belum ada dari customer relation
                        if (!$customerName && isset($customerData['name'])) {
                            $customerName = $customerData['name'];
                        }
                        if (!$customerPhone && isset($customerData['phone'])) {
                            $customerPhone = $customerData['phone'];
                        }
                        if (!$customerEmail && isset($customerData['email'])) {
                            $customerEmail = $customerData['email'];
                        }
                    }
                } catch (\Exception $e) {
                    // Jika parsing gagal, skip customer_data
                    \Log::warning('Failed to parse customer_data', [
                        'order_id' => $order->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            // ✅ NEW: Get payment method dari payments table
            $paymentMethod = null;
            $paymentMethodLabel = null;
            
            // Ambil payment method dari payments yang berhasil
            $successPayment = $order->payments->where('status', 'success')->first();
            if ($successPayment) {
                $paymentMethod = $successPayment->payment_method;
            } else {
                // Jika belum ada payment yang berhasil, cek payment yang pending (untuk midtrans)
                $pendingPayment = $order->payments->where('status', 'pending')->first();
                if ($pendingPayment) {
                    $paymentMethod = $pendingPayment->payment_method;
                } else {
                    // Jika payment_status paid tapi tidak ada payment record, kemungkinan pay_later yang dibayar di kasir
                    if ($order->payment_status === 'paid') {
                        $paymentMethod = 'cash'; // Default untuk yang dibayar di kasir
                    } else {
                        $paymentMethod = 'pay_later'; // Default untuk yang belum dibayar
                    }
                }
            }
            
            // ✅ NEW: Format payment method label
            $paymentMethodLabels = [
                'qris' => 'QRIS',
                'transfer' => 'Transfer',
                'bank_transfer' => 'Transfer',
                'pay_later' => 'Bayar di Kasir',
                'midtrans' => 'QRIS/E-Wallet (Midtrans)',
                'cash' => 'Cash',
                'card' => 'Card',
                'gopay' => 'GoPay',
                'shopeepay' => 'ShopeePay',
                'credit_card' => 'Credit Card',
            ];
            $paymentMethodLabel = $paymentMethodLabels[$paymentMethod] ?? ucfirst($paymentMethod ?? 'Belum ditentukan');

            return [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'type' => $order->type,
                'status' => $order->status,
                'payment_status' => $order->payment_status,
                'payment_method' => $paymentMethod, // ✅ NEW: Payment method
                'payment_method_label' => $paymentMethodLabel, // ✅ NEW: Payment method label
                'customer_name' => $customerName,
                'customer_phone' => $customerPhone,
                'customer_email' => $customerEmail,
                'items' => $order->orderItems->map(function ($item) {
                    return [
                        'id' => $item->id,
                        'product_id' => $item->product_id,
                        'product_name' => $item->product_name ?? ($item->product ? $item->product->name : 'Product'),
                        'product' => $item->product ? [
                            'id' => $item->product->id,
                            'name' => $item->product->name,
                        ] : null,
                        'quantity' => $item->quantity,
                        'price' => $item->price,
                        'subtotal' => $item->subtotal,
                    ];
                }),
                'orderItems' => $order->orderItems, // Keep for backward compatibility
                'subtotal' => $order->subtotal,
                'tax_amount' => $order->tax_amount ?? 0,
                'discount_amount' => $order->discount_amount ?? 0,
                'total' => $order->total,
                'paid_amount' => $order->paid_amount ?? 0,
                'notes' => $order->notes,
                'table' => $order->table ? [
                    'id' => $order->table->id,
                    'name' => $order->table->name,
                    'qr_code' => $order->table->qr_code,
                ] : null,
                'created_at' => $order->created_at,
                'updated_at' => $order->updated_at,
            ];
        });

        // Return paginated response dengan data yang sudah di-format
        return response()->json([
            'data' => $formattedOrders,
            'current_page' => $orders->currentPage(),
            'last_page' => $orders->lastPage(),
            'per_page' => $orders->perPage(),
            'total' => $orders->total(),
            'from' => $orders->firstItem(),
            'to' => $orders->lastItem(),
        ]);
    }

    /**
     * Get order statistics
     */
    public function getStats(Request $request)
    {
        $user = Auth::user();
        $businessId = $request->header('X-Business-Id');
        $outletId = $request->header('X-Outlet-Id');

        $query = Order::where('type', 'self_service');

        if ($businessId) {
            $query->where('business_id', $businessId);
        }

        if ($outletId && !in_array($user->role, ['super_admin', 'owner'])) {
            $query->where('outlet_id', $outletId);
        }

        // ✅ NEW: Date range filter - untuk owner/admin bisa filter custom, untuk kasir hanya hari ini
        $isOwnerOrAdmin = in_array($user->role, ['owner', 'admin', 'super_admin']);
        
        if ($isOwnerOrAdmin) {
            // Owner/Admin: Support custom date range
            if ($request->has('date_from') && $request->has('date_to')) {
                $startDate = \Carbon\Carbon::parse($request->get('date_from'))->startOfDay();
                $endDate = \Carbon\Carbon::parse($request->get('date_to'))->endOfDay();
                $query->whereBetween('created_at', [$startDate, $endDate]);
            } elseif ($request->has('date_range')) {
                $dateRange = $request->get('date_range');
                $dateRangeFilter = $this->getDateRange($dateRange);
                $query->whereBetween('created_at', [$dateRangeFilter['start'], $dateRangeFilter['end']]);
            } else {
                // Default: hari ini
                $query->whereDate('created_at', now()->toDateString());
            }
        } else {
            // Kasir/Employee: Hanya hari ini
            $query->whereDate('created_at', now()->toDateString());
        }

        // ✅ FIX: Calculate stats berdasarkan filter yang dipilih
        $today = now()->startOfDay();
        $yesterday = now()->subDay()->startOfDay();
        
        // Untuk perbandingan growth, tetap gunakan hari ini vs kemarin
        $todayOrdersQuery = Order::where('type', 'self_service');
        if ($businessId) {
            $todayOrdersQuery->where('business_id', $businessId);
        }
        if ($outletId && !in_array($user->role, ['super_admin', 'owner'])) {
            $todayOrdersQuery->where('outlet_id', $outletId);
        }
        $todayOrdersQuery->whereDate('created_at', $today);
        
        $yesterdayOrdersQuery = Order::where('type', 'self_service');
        if ($businessId) {
            $yesterdayOrdersQuery->where('business_id', $businessId);
        }
        if ($outletId && !in_array($user->role, ['super_admin', 'owner'])) {
            $yesterdayOrdersQuery->where('outlet_id', $outletId);
        }
        $yesterdayOrdersQuery->whereDate('created_at', $yesterday);
        
        $todayOrders = $todayOrdersQuery->count();
        $yesterdayOrders = $yesterdayOrdersQuery->count();

        // Stats berdasarkan filter yang dipilih
        $totalOrders = $query->count();
        $preparingOrders = (clone $query)->where('status', 'preparing')->count();
        $readyOrders = (clone $query)->where('status', 'ready')->count();

        // Table statistics
        $tableQuery = Table::query();
        
        // ✅ FIX: Filter outlet dengan logic yang sama seperti getTables
        if ($businessId) {
            $tableQuery->whereHas('outlet', function ($q) use ($businessId) {
                $q->where('business_id', $businessId);
            });
        }
        
        if ($outletId && !in_array($user->role, ['super_admin', 'owner'])) {
            $tableQuery->where('outlet_id', $outletId);
        }

        $totalTables = $tableQuery->count();
        
        // ✅ FIX: Meja tersedia = total meja dikurangi yang occupied
        // Atau bisa juga dihitung sebagai: available + reserved + cleaning + null
        // Kita gunakan cara yang lebih sederhana: total - occupied
        $occupiedCount = (clone $tableQuery)->where('status', 'occupied')->count();
        $availableTables = $totalTables - $occupiedCount;
        
        $occupiedTables = (clone $tableQuery)->where('status', 'occupied')->count();

        // ✅ FIX: Calculate average preparation time dari orders yang sudah completed
        // Waktu dihitung dari order dibuat (created_at) sampai order selesai (updated_at saat status completed)
        // Untuk self-service, waktu rata-rata = waktu dari order dibuat sampai completed
        $completedOrders = (clone $query)
            ->where('status', 'completed')
            ->whereNotNull('created_at')
            ->whereNotNull('updated_at')
            ->get();
        
        $avgPrepTime = 12; // Default
        if ($completedOrders->count() > 0) {
            $totalPrepTime = 0;
            $countWithTime = 0;
            
            foreach ($completedOrders as $order) {
                // ✅ FIX: Hitung waktu dari created_at sampai updated_at
                // updated_at untuk order completed seharusnya adalah waktu saat status berubah menjadi completed
                $prepTime = $order->created_at->diffInMinutes($order->updated_at);
                
                // ✅ FIX: Validasi waktu yang masuk akal
                // - Minimal 1 menit (order tidak mungkin selesai dalam 0 menit)
                // - Maksimal 480 menit (8 jam) untuk self-service order
                // - Pastikan updated_at > created_at
                if ($prepTime >= 1 && $prepTime <= 480 && $order->updated_at > $order->created_at) {
                    $totalPrepTime += $prepTime;
                    $countWithTime++;
                }
            }
            
            if ($countWithTime > 0) {
                $avgPrepTime = round($totalPrepTime / $countWithTime);
            } else {
                // Jika tidak ada order dengan waktu valid, gunakan default
                $avgPrepTime = 12;
            }
        }

        return response()->json([
            'total_scans_today' => $totalOrders, // ✅ FIX: Gunakan totalOrders berdasarkan filter
            'scans_growth' => $yesterdayOrders > 0 ? round((($todayOrders - $yesterdayOrders) / $yesterdayOrders) * 100, 1) : ($todayOrders > 0 ? 100 : 0),
            'self_service_orders' => $totalOrders,
            'conversion_rate' => $totalOrders > 0 ? round(($readyOrders / $totalOrders) * 100, 1) : 0,
            'available_tables' => $availableTables,
            'total_tables' => $totalTables,
            'occupancy_rate' => $totalTables > 0 ? round(($occupiedTables / $totalTables) * 100, 1) : 0,
            'avg_prep_time' => $avgPrepTime,
        ]);
    }

    /**
     * Update order status
     */
    public function updateOrderStatus(Request $request, Order $order)
    {
        $validator = Validator::make($request->all(), [
            'status' => 'required|string|in:pending,confirmed,preparing,ready,completed,cancelled',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $order->update([
            'status' => $request->status,
            'notes' => $request->notes,
        ]);

        return response()->json([
            'message' => 'Order status updated successfully',
            'order' => $order->load('orderItems.product', 'table')
        ]);
    }

    /**
     * Get all tables
     */
    public function getTables(Request $request)
    {
        $user = Auth::user();
        $businessId = $request->header('X-Business-Id');
        $outletId = $request->header('X-Outlet-Id');

        $query = Table::with('outlet');

        if ($businessId) {
            $query->whereHas('outlet', function ($q) use ($businessId) {
                $q->where('business_id', $businessId);
            });
        }

        if ($outletId && !in_array($user->role, ['super_admin', 'owner'])) {
            $query->where('outlet_id', $outletId);
        }

        // Search
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where('name', 'like', "%{$search}%");
        }

        $tables = $query->orderBy('name')->get();

        return response()->json($tables);
    }

    /**
     * Create a new table
     */
    public function createTable(Request $request)
    {
        $user = Auth::user();
        $outletId = $request->header('X-Outlet-Id');

        // Check if user has access to the outlet
        if ($outletId && !in_array($user->role, ['super_admin', 'owner'])) {
            // For waiter/other roles, ensure they can only create tables in their assigned outlet
            if ($user->outlet_id && $user->outlet_id != $outletId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to create table in this outlet.',
                    'error' => 'INSUFFICIENT_PERMISSIONS'
                ], 403);
            }
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'capacity' => 'required|integer|min:1|max:20',
            'outlet_id' => 'required|exists:outlets,id',
            'status' => 'nullable|string|in:available,occupied,reserved,cleaning',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            DB::beginTransaction();

            // Generate unique QR code
            $qrCode = 'QR-' . strtoupper(Str::random(8));
            while (Table::where('qr_code', $qrCode)->exists()) {
                $qrCode = 'QR-' . strtoupper(Str::random(8));
            }

            $table = Table::create([
                'name' => $request->name,
                'capacity' => $request->capacity,
                'outlet_id' => $request->outlet_id,
                'qr_code' => $qrCode,
                'status' => $request->status ?? 'available',
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Table created successfully',
                'table' => $table->load('outlet')
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Failed to create table'], 500);
        }
    }

    /**
     * Update table information
     */
    public function updateTable(Request $request, Table $table)
    {
        $user = Auth::user();
        $outletId = $request->header('X-Outlet-Id');

        // Check if user has access to this table's outlet
        if ($outletId && $table->outlet_id != $outletId && !in_array($user->role, ['super_admin', 'owner'])) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized to update this table.',
                'error' => 'INSUFFICIENT_PERMISSIONS'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255|unique:tables,name,' . $table->id,
            'capacity' => 'sometimes|required|integer|min:1|max:20',
            'status' => 'sometimes|required|string|in:available,occupied,reserved,cleaning',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $table->update($request->all());

        return response()->json([
            'message' => 'Table updated successfully',
            'table' => $table->load('outlet')
        ]);
    }

    /**
     * Update table status
     */
    public function updateTableStatus(Request $request, Table $table)
    {
        $user = Auth::user();
        $outletId = $request->header('X-Outlet-Id');

        // Check if user has access to this table's outlet
        if ($outletId && $table->outlet_id != $outletId && !in_array($user->role, ['super_admin', 'owner'])) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized to update this table.',
                'error' => 'INSUFFICIENT_PERMISSIONS'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'status' => 'required|string|in:available,occupied,reserved,cleaning',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $table->update(['status' => $request->status]);

        return response()->json([
            'message' => 'Table status updated successfully',
            'table' => $table
        ]);
    }

    /**
     * Delete table
     */
    public function deleteTable(Table $table)
    {
        // Check if table has active orders
        $activeOrders = Order::where('table_id', $table->id)
            ->whereIn('status', ['pending', 'confirmed', 'preparing', 'ready'])
            ->count();

        if ($activeOrders > 0) {
            return response()->json([
                'error' => 'Cannot delete table with active orders'
            ], 400);
        }

        $table->delete();

        return response()->json([
            'message' => 'Table deleted successfully'
        ]);
    }

    /**
     * Generate QR code for table (SVG format - works without GD/Imagick extension)
     */
    public function generateQRCode(Table $table)
    {
        try {
            $url = config('app.frontend_url', 'http://localhost:3000') . '/self-service/' . $table->qr_code;

            // Generate QR Code as SVG (no extension required)
            $qrCode = \SimpleSoftwareIO\QrCode\Facades\QrCode::format('svg')
                ->size(512)  // 512x512 pixels for high quality
                ->margin(2)  // Margin around QR code
                ->errorCorrection('H')  // High error correction (30%)
                ->generate($url);

            // Get outlet info for filename
            $outlet = $table->outlet;
            $filename = 'qr-' . ($outlet ? $outlet->name . '-' : '') . $table->name . '-' . $table->qr_code . '.svg';
            $filename = preg_replace('/[^A-Za-z0-9\-_.]/', '-', $filename); // Sanitize filename

            return response($qrCode)
                ->header('Content-Type', 'image/svg+xml')
                ->header('Content-Disposition', 'attachment; filename="' . $filename . '"')
                ->header('Cache-Control', 'no-cache, no-store, must-revalidate')
                ->header('Pragma', 'no-cache')
                ->header('Expires', '0');

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to generate QR code',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Preview QR code for table (SVG format for browser display)
     */
    public function previewQRCode(Table $table)
    {
        try {
            $url = config('app.frontend_url', 'http://localhost:3000') . '/self-service/' . $table->qr_code;

            // Generate QR Code as SVG for preview
            $qrCode = \SimpleSoftwareIO\QrCode\Facades\QrCode::format('svg')
                ->size(300)
                ->margin(1)
                ->errorCorrection('H')
                ->generate($url);

            return response($qrCode)
                ->header('Content-Type', 'image/svg+xml')
                ->header('Cache-Control', 'no-cache, no-store, must-revalidate');

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to preview QR code',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get QR menu statistics
     */
    public function getQRMenuStats(Request $request)
    {
        $user = Auth::user();
        $businessId = $request->header('X-Business-Id');
        $outletId = $request->header('X-Outlet-Id');

        $query = Table::with('outlet');

        if ($businessId) {
            $query->whereHas('outlet', function ($q) use ($businessId) {
                $q->where('business_id', $businessId);
            });
        }

        if ($outletId && !in_array($user->role, ['super_admin', 'owner'])) {
            $query->where('outlet_id', $outletId);
        }

        $tables = $query->get();

        $qrMenus = $tables->map(function ($table) {
            // ✅ FIX: Get scan statistics from database
            $scans = $table->scan_count ?? 0;
            
            // ✅ FIX: Get orders count from database (self-service orders for this table)
            $orders = Order::where('table_id', $table->id)
                ->where('type', 'self_service')
                ->count();
            
            // ✅ FIX: Calculate conversion rate
            $conversion = $scans > 0 ? round(($orders / $scans) * 100, 1) : 0;
            
            // ✅ FIX: Get last scan time from database
            $lastScan = $table->last_scan_at 
                ? $table->last_scan_at->format('Y-m-d H:i') 
                : null;
            
            // ✅ NEW: Get total customers/people from orders
            // Jumlah orang = jumlah unique customer atau jumlah order (jika tidak ada customer data)
            $totalPeople = Order::where('table_id', $table->id)
                ->where('type', 'self_service')
                ->whereNotNull('customer_data')
                ->get()
                ->sum(function ($order) {
                    // Cek apakah ada field jumlah_orang di customer_data
                    $customerData = $order->customer_data ?? [];
                    return $customerData['jumlah_orang'] ?? 1; // Default 1 jika tidak ada
                });
            
            // Jika tidak ada customer_data dengan jumlah_orang, gunakan jumlah order sebagai proxy
            if ($totalPeople == 0 && $orders > 0) {
                $totalPeople = $orders; // Asumsi 1 orang per order
            }

            return [
                'id' => $table->id,
                'name' => $table->name,
                'table_number' => $table->name,
                'qr_code' => $table->qr_code,
                'scans' => $scans,
                'orders' => $orders,
                'conversion' => $conversion,
                'total_people' => $totalPeople, // ✅ NEW: Jumlah orang
                'status' => 'active',
                'last_scan' => $lastScan,
                'url' => config('app.frontend_url') . '/self-service/' . $table->qr_code,
                'outlet' => $table->outlet->name ?? 'Unknown Outlet',
            ];
        });

        return response()->json($qrMenus);
    }

    /**
     * Get date range based on period
     */
    private function getDateRange(string $period): array
    {
        $now = \Carbon\Carbon::now('Asia/Jakarta');

        switch ($period) {
            case 'today':
                return [
                    'start' => $now->copy()->startOfDay(),
                    'end' => $now->copy()->endOfDay()
                ];
            case 'yesterday':
                $yesterday = $now->copy()->subDay();
                return [
                    'start' => $yesterday->copy()->startOfDay(),
                    'end' => $yesterday->copy()->endOfDay()
                ];
            case 'week':
                return [
                    'start' => $now->copy()->subDays(7)->startOfDay(),
                    'end' => $now->copy()->endOfDay()
                ];
            case 'month':
                return [
                    'start' => $now->copy()->subDays(30)->startOfDay(),
                    'end' => $now->copy()->endOfDay()
                ];
            default:
                return [
                    'start' => $now->copy()->startOfDay(),
                    'end' => $now->copy()->endOfDay()
                ];
        }
    }
}
