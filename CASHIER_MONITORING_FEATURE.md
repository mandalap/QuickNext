# 📊 Fitur Monitoring Kasir Aktif - Owner/Admin

## ✅ Status: BERHASIL DIIMPLEMENTASI

**Fitur yang ditambahkan:**

1. ✅ Halaman monitoring kasir aktif untuk owner/admin
2. ✅ Daftar kasir yang sedang shift aktif
3. ✅ Statistik transaksi real-time per kasir
4. ✅ Menu monitoring di sidebar untuk owner/admin
5. ✅ Auto-refresh untuk data real-time

---

## 🔍 **Masalah yang Diatasi:**

### **Monitoring & Control Issues:**

- ❌ Owner/admin tidak bisa melihat kasir mana yang sedang aktif
- ❌ Tidak ada monitoring real-time aktivitas kasir
- ❌ Sulit untuk mengetahui performa kasir per shift
- ❌ Tidak ada dashboard khusus untuk monitoring operasional

### **Data Visibility Issues:**

- ❌ Data transaksi kasir hanya tersedia di laporan
- ❌ Tidak ada real-time tracking untuk aktivitas kasir
- ❌ Sulit untuk mengawasi multiple kasir secara bersamaan
- ❌ Tidak ada indikator visual untuk status shift

---

## 🔧 **Implementasi yang Dilakukan:**

### 1. **Backend API - CashierShiftController**

#### **A. Method getAllActiveShifts**

```php
/**
 * Get all active shifts (for monitoring by owner/admin)
 */
public function getAllActiveShifts(Request $request)
{
    $businessId = $request->header('X-Business-Id');

    if (!$businessId) {
        return response()->json([
            'success' => false,
            'message' => 'Business ID required'
        ], 400);
    }

    // Check if user has permission (owner/admin only)
    $user = auth()->user();
    if (!in_array($user->role, ['owner', 'admin', 'super_admin'])) {
        return response()->json([
            'success' => false,
            'message' => 'Unauthorized access'
        ], 403);
    }

    try {
        // Get all active shifts with employee and user data
        $activeShifts = CashierShift::with(['employee.user', 'outlet'])
            ->where('business_id', $businessId)
            ->where('status', 'open')
            ->get();

        // Transform data and add today's statistics
        $transformedShifts = $activeShifts->map(function ($shift) {
            // Get today's statistics for this cashier
            $todayStats = $this->getTodayStatsForCashier($shift->employee_id, $shift->business_id);

            return [
                'id' => $shift->id,
                'shift_name' => $shift->shift_name,
                'opened_at' => $shift->opened_at,
                'opening_balance' => $shift->opening_balance,
                'expected_cash' => $shift->expected_cash,
                'actual_cash' => $shift->actual_cash,
                'employee' => [
                    'id' => $shift->employee->id,
                    'user' => [
                        'id' => $shift->employee->user->id,
                        'name' => $shift->employee->user->name,
                        'email' => $shift->employee->user->email,
                    ]
                ],
                'outlet' => [
                    'id' => $shift->outlet->id,
                    'name' => $shift->outlet->name,
                ],
                // Today's statistics
                'today_transactions' => $todayStats['transactions'],
                'today_sales' => $todayStats['sales'],
                'today_items' => $todayStats['items'],
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $transformedShifts
        ]);
    } catch (\Exception $e) {
        Log::error('Failed to fetch active shifts', [
            'error' => $e->getMessage(),
            'business_id' => $businessId
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Failed to fetch active shifts',
            'error' => $e->getMessage()
        ], 500);
    }
}
```

#### **B. Method getTodayStatsForCashier**

```php
/**
 * Get today's statistics for a specific cashier
 */
private function getTodayStatsForCashier($employeeId, $businessId)
{
    $today = \Carbon\Carbon::today();

    // Get today's orders for this cashier
    $todayOrders = \App\Models\Order::where('business_id', $businessId)
        ->where('employee_id', $employeeId)
        ->whereDate('created_at', $today)
        ->where('status', 'completed')
        ->get();

    $transactions = $todayOrders->count();
    $sales = $todayOrders->sum('total');
    $items = $todayOrders->sum(function ($order) {
        return $order->items->sum('quantity');
    });

    return [
        'transactions' => $transactions,
        'sales' => $sales,
        'items' => $items,
    ];
}
```

### 2. **Frontend Service - shift.service.js**

#### **A. Method getActiveShifts**

```javascript
// Get all active shifts (for monitoring)
getActiveShifts: async () => {
  try {
    const response = await apiClient.get('/v1/shifts/active-all');
    return { success: true, data: response.data };
  } catch (error) {
    return handleApiError(error);
  }
},
```

### 3. **Frontend Component - CashierMonitoring.jsx**

#### **A. State Management**

```jsx
// State management
const [activeCashiers, setActiveCashiers] = useState([]);
const [loading, setLoading] = useState(true);
const [refreshing, setRefreshing] = useState(false);
const [lastUpdated, setLastUpdated] = useState(new Date());
```

#### **B. Data Loading**

```jsx
// Load active cashiers data
const loadActiveCashiers = async () => {
  try {
    const result = await shiftService.getActiveShifts();
    if (result.success && result.data) {
      setActiveCashiers(result.data);
    } else {
      setActiveCashiers([]);
    }
  } catch (error) {
    console.error("Error loading active cashiers:", error);
    toast.error("Gagal memuat data kasir aktif");
  }
};

// Load all data
const loadData = async () => {
  setRefreshing(true);
  try {
    await loadActiveCashiers();
    setLastUpdated(new Date());
  } catch (error) {
    console.error("Error loading data:", error);
  } finally {
    setRefreshing(false);
  }
};
```

#### **C. Auto-Refresh**

```jsx
// Load data on mount
useEffect(() => {
  const loadInitialData = async () => {
    setLoading(true);
    await loadData();
    setLoading(false);
  };

  loadInitialData();

  // Auto-refresh every 30 seconds
  const interval = setInterval(loadData, 30000);
  return () => clearInterval(interval);
}, []);
```

#### **D. Summary Cards**

```jsx
{
  /* Summary Cards */
}
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">Kasir Aktif</CardTitle>
      <Users className="h-4 w-4 text-blue-600" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-blue-600">
        {activeCashiers.length}
      </div>
      <p className="text-xs text-gray-600">dari total kasir yang tersedia</p>
    </CardContent>
  </Card>

  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">
        Total Transaksi Hari Ini
      </CardTitle>
      <ShoppingCart className="h-4 w-4 text-green-600" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-green-600">
        {activeCashiers.reduce(
          (total, cashier) => total + (cashier.today_transactions || 0),
          0
        )}
      </div>
      <p className="text-xs text-gray-600">dari semua kasir aktif</p>
    </CardContent>
  </Card>

  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">
        Total Penjualan Hari Ini
      </CardTitle>
      <DollarSign className="h-4 w-4 text-purple-600" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-purple-600">
        {formatCurrency(
          activeCashiers.reduce(
            (total, cashier) => total + (cashier.today_sales || 0),
            0
          )
        )}
      </div>
      <p className="text-xs text-gray-600">dari semua kasir aktif</p>
    </CardContent>
  </Card>
</div>;
```

#### **E. Active Cashiers List**

```jsx
{
  /* Active Cashiers List */
}
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Activity className="w-5 h-5 text-green-600" />
      Kasir yang Sedang Aktif
    </CardTitle>
    <CardDescription>
      Daftar kasir yang sedang menjalankan shift
    </CardDescription>
  </CardHeader>
  <CardContent>
    {activeCashiers.length === 0 ? (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Tidak Ada Kasir Aktif
        </h3>
        <p className="text-gray-600">
          Belum ada kasir yang membuka shift saat ini
        </p>
      </div>
    ) : (
      <div className="space-y-4">
        {activeCashiers.map((cashier) => (
          <div
            key={cashier.id}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Cashier Info */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {cashier.employee?.user?.name || "Unknown Cashier"}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {cashier.employee?.user?.email || "No email"}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Aktif
                    </Badge>
                    <span className="text-xs text-gray-500">
                      Shift: {cashier.shift_name}
                    </span>
                  </div>
                </div>
              </div>

              {/* Shift Info */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="text-center sm:text-left">
                  <p className="text-sm font-medium text-gray-900">Dibuka</p>
                  <p className="text-sm text-gray-600">
                    {formatTime(cashier.opened_at)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {getShiftDuration(cashier.opened_at)} yang lalu
                  </p>
                </div>

                <div className="text-center sm:text-left">
                  <p className="text-sm font-medium text-gray-900">
                    Modal Awal
                  </p>
                  <p className="text-sm font-semibold text-blue-600">
                    {formatCurrency(cashier.opening_balance)}
                  </p>
                </div>
              </div>

              {/* Today's Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">
                    {cashier.today_transactions || 0}
                  </div>
                  <p className="text-xs text-gray-600">Transaksi</p>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">
                    {formatCurrency(cashier.today_sales || 0)}
                  </div>
                  <p className="text-xs text-gray-600">Penjualan</p>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-purple-600">
                    {cashier.today_items || 0}
                  </div>
                  <p className="text-xs text-gray-600">Item</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </CardContent>
</Card>;
```

### 4. **Routing & Navigation**

#### **A. App.js Route**

```jsx
{
  /* Cashier Monitoring - Owner, Admin only */
}
<Route
  path="monitoring"
  element={
    <PrivateRoute allowedRoles={["super_admin", "owner", "admin"]}>
      <CashierMonitoring />
    </PrivateRoute>
  }
/>;
```

#### **B. Layout.jsx Menu**

```jsx
{
  path: '/monitoring',
  label: 'Monitoring Kasir',
  icon: Activity,
  color: 'text-green-600',
  roles: ['super_admin', 'owner', 'admin'],
},
```

---

## 🎯 **Hasil Implementasi:**

### **✅ Halaman Monitoring Kasir:**

#### **1. Summary Cards**

- ✅ **Kasir Aktif**: Jumlah kasir yang sedang shift
- ✅ **Total Transaksi**: Jumlah transaksi hari ini dari semua kasir
- ✅ **Total Penjualan**: Total penjualan hari ini dari semua kasir

#### **2. Daftar Kasir Aktif**

- ✅ **Info Kasir**: Nama, email, dan status
- ✅ **Info Shift**: Nama shift, waktu dibuka, durasi
- ✅ **Modal Awal**: Jumlah modal yang dibuka
- ✅ **Statistik Hari Ini**: Transaksi, penjualan, item

#### **3. Real-time Features**

- ✅ **Auto-refresh**: Update otomatis setiap 30 detik
- ✅ **Manual Refresh**: Tombol refresh manual
- ✅ **Last Updated**: Timestamp terakhir update
- ✅ **Loading States**: Loading indicator saat refresh

### **✅ Security & Access Control:**

#### **1. Role-based Access**

- ✅ **Owner**: Full access
- ✅ **Admin**: Full access
- ✅ **Super Admin**: Full access
- ✅ **Kasir**: No access (tidak bisa monitor diri sendiri)

#### **2. Business Isolation**

- ✅ **Business ID**: Data terisolasi per bisnis
- ✅ **Outlet Support**: Support multiple outlet
- ✅ **Employee Filtering**: Hanya kasir dari bisnis yang sama

---

## 🔒 **Security Features:**

### **1. API Security**

- ✅ **Authentication**: Required untuk semua endpoint
- ✅ **Authorization**: Role-based access control
- ✅ **Business Isolation**: Data terisolasi per bisnis
- ✅ **Input Validation**: Validasi semua input

### **2. Frontend Security**

- ✅ **Route Protection**: ProtectedRoute dengan role check
- ✅ **Menu Filtering**: Menu hanya muncul untuk role yang sesuai
- ✅ **Error Handling**: Graceful error handling

---

## 🧪 **Testing Scenarios:**

### **1. Owner/Admin Access**

1. Login sebagai owner/admin
2. Akses menu "Monitoring Kasir"
3. **Expected**: Halaman monitoring terbuka
4. **Expected**: Data kasir aktif ditampilkan

### **2. Kasir Access**

1. Login sebagai kasir
2. Coba akses `/monitoring`
3. **Expected**: Redirect atau access denied
4. **Expected**: Menu monitoring tidak muncul di sidebar

### **3. Real-time Updates**

1. Buka halaman monitoring
2. Buka shift sebagai kasir lain
3. **Expected**: Data update otomatis dalam 30 detik
4. Klik tombol refresh
5. **Expected**: Data update segera

### **4. No Active Cashiers**

1. Tutup semua shift kasir
2. Akses halaman monitoring
3. **Expected**: Pesan "Tidak Ada Kasir Aktif"
4. **Expected**: Summary cards menunjukkan 0

---

## 📱 **UI/UX Features:**

### **1. Responsive Design**

- ✅ **Mobile**: Layout responsive untuk mobile
- ✅ **Tablet**: Layout optimal untuk tablet
- ✅ **Desktop**: Layout optimal untuk desktop

### **2. Visual Indicators**

- ✅ **Status Badges**: Badge hijau untuk kasir aktif
- ✅ **Icons**: Icon yang konsisten untuk setiap elemen
- ✅ **Colors**: Color coding untuk different metrics
- ✅ **Loading States**: Spinner dan skeleton loading

### **3. User Experience**

- ✅ **Auto-refresh**: Update otomatis tanpa user action
- ✅ **Manual Refresh**: Tombol refresh untuk update manual
- ✅ **Error Handling**: Pesan error yang jelas
- ✅ **Empty States**: UI yang baik untuk state kosong

---

## 🎊 **Kesimpulan:**

**✅ Owner/Admin sekarang bisa memantau kasir aktif secara real-time!**

### Yang Sudah Berhasil:

- ✅ Halaman monitoring kasir dengan data real-time
- ✅ Summary cards untuk overview cepat
- ✅ Daftar kasir aktif dengan detail lengkap
- ✅ Auto-refresh setiap 30 detik
- ✅ Menu monitoring di sidebar untuk owner/admin
- ✅ Security dan access control yang proper

### Cara Menggunakan:

1. Login sebagai owner/admin
2. Akses menu "Monitoring Kasir" di sidebar
3. Lihat summary cards untuk overview
4. Scroll ke bawah untuk daftar kasir aktif
5. Data akan update otomatis setiap 30 detik

### Benefits untuk Owner/Admin:

- ✅ **Real-time Monitoring**: Pantau aktivitas kasir secara real-time
- ✅ **Performance Tracking**: Lihat performa kasir per shift
- ✅ **Operational Control**: Kontrol operasional yang lebih baik
- ✅ **Data-driven Decisions**: Keputusan berdasarkan data real-time

**Sekarang owner/admin tidak perlu menunggu laporan untuk melihat aktivitas kasir!** 📊🚀

---

**Dibuat oleh**: AI Assistant  
**Tanggal**: 18 Oktober 2025  
**Versi**: 1.0.0  
**Status**: ✅ COMPLETED
