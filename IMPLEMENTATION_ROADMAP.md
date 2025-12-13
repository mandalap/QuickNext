# Multi-Outlet POS System - Implementation Roadmap

## 📋 Overview

Dokumen ini menjelaskan step-by-step implementasi Multi-Outlet System berdasarkan architecture yang telah dirancang.

---

## 🎯 Project Goals

### Primary Goals
1. ✅ Employee assignment per outlet
2. ✅ Outlet-specific inventory management
3. ✅ Role-based outlet access control
4. ✅ Stock transfer between outlets
5. ✅ Multi-level dashboard (Owner → Manager → Staff)

### Secondary Goals
1. ✅ Outlet-specific promotions
2. ✅ Performance comparison across outlets
3. ✅ Automated stock alerts
4. ✅ Transfer approval workflow

---

## 📅 Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Phase 1: Database & Backend | 2 weeks | API endpoints ready |
| Phase 2: Core Frontend | 2 weeks | Auth & routing complete |
| Phase 3: Features | 2 weeks | All features functional |
| Phase 4: Testing & Polish | 2 weeks | Production ready |
| **Total** | **8 weeks** | **Full deployment** |

---

## 🔨 Phase 1: Database & Backend (Weeks 1-2)

### Week 1: Database Foundation

#### Day 1-2: Create Migrations

**Task 1.1: Create user_outlets table**
```bash
cd backend
php artisan make:migration create_user_outlets_table
```

```php
// database/migrations/xxxx_create_user_outlets_table.php
Schema::create('user_outlets', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->onDelete('cascade');
    $table->foreignId('outlet_id')->constrained()->onDelete('cascade');
    $table->enum('role', ['manager', 'kasir', 'kitchen', 'waiter']);
    $table->boolean('is_active')->default(true);
    $table->timestamp('assigned_at')->useCurrent();
    $table->foreignId('assigned_by')->nullable()->constrained('users');
    $table->text('notes')->nullable();
    $table->timestamps();

    $table->unique(['user_id', 'outlet_id']);
    $table->index(['outlet_id', 'role']);
    $table->index(['user_id', 'is_active']);
});
```

**Task 1.2: Create product_outlets table**
```bash
php artisan make:migration create_product_outlets_table
```

```php
Schema::create('product_outlets', function (Blueprint $table) {
    $table->id();
    $table->foreignId('product_id')->constrained()->onDelete('cascade');
    $table->foreignId('outlet_id')->constrained()->onDelete('cascade');
    $table->integer('stock')->default(0);
    $table->integer('min_stock')->default(0);
    $table->integer('max_stock')->nullable();
    $table->boolean('is_available')->default(true);
    $table->decimal('price_override', 15, 2)->nullable();
    $table->timestamp('last_restock_at')->nullable();
    $table->foreignId('last_restock_by')->nullable()->constrained('users');
    $table->timestamps();

    $table->unique(['product_id', 'outlet_id']);
    $table->index(['outlet_id', 'is_available']);
});
```

**Task 1.3: Create inventory_movements table**
```bash
php artisan make:migration create_inventory_movements_table
```

```php
Schema::create('inventory_movements', function (Blueprint $table) {
    $table->id();
    $table->foreignId('product_id')->constrained()->onDelete('cascade');
    $table->foreignId('from_outlet_id')->nullable()->constrained('outlets');
    $table->foreignId('to_outlet_id')->nullable()->constrained('outlets');
    $table->integer('quantity');
    $table->enum('type', ['transfer', 'restock', 'adjustment', 'sale', 'waste']);
    $table->text('reason')->nullable();
    $table->decimal('cost_per_unit', 15, 2)->nullable();
    $table->decimal('total_cost', 15, 2)->nullable();
    $table->foreignId('performed_by')->constrained('users');
    $table->foreignId('approved_by')->nullable()->constrained('users');
    $table->enum('status', ['pending', 'approved', 'rejected', 'completed'])->default('completed');
    $table->text('notes')->nullable();
    $table->timestamp('created_at')->useCurrent();

    $table->index(['from_outlet_id', 'to_outlet_id', 'created_at']);
    $table->index(['product_id', 'created_at']);
    $table->index(['status', 'type']);
});
```

**Task 1.4: Modify existing tables**
```bash
php artisan make:migration add_outlet_columns_to_existing_tables
```

```php
// Add to employees
Schema::table('employees', function (Blueprint $table) {
    $table->foreignId('default_outlet_id')->nullable()->after('business_id')->constrained('outlets');
});

// Add to discounts
Schema::table('discounts', function (Blueprint $table) {
    $table->foreignId('outlet_id')->nullable()->after('business_id')->constrained('outlets');
    $table->enum('scope', ['global', 'outlet'])->default('global');
});

// Add to products
Schema::table('products', function (Blueprint $table) {
    $table->boolean('is_global')->default(false)->after('business_id');
    $table->boolean('requires_outlet_stock')->default(true);
});
```

**Verification:**
```bash
php artisan migrate
php artisan migrate:status
```

#### Day 3-4: Create Models & Relationships

**Task 2.1: Create UserOutlet model**
```bash
php artisan make:model UserOutlet
```

```php
// app/Models/UserOutlet.php
class UserOutlet extends Model
{
    protected $fillable = [
        'user_id', 'outlet_id', 'role', 'is_active',
        'assigned_at', 'assigned_by', 'notes'
    ];

    protected $casts = [
        'assigned_at' => 'datetime',
        'is_active' => 'boolean'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function outlet()
    {
        return $this->belongsTo(Outlet::class);
    }

    public function assignedBy()
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }
}
```

**Task 2.2: Update User model**
```php
// app/Models/User.php
class User extends Authenticatable
{
    // ... existing code

    public function outlets()
    {
        return $this->belongsToMany(Outlet::class, 'user_outlets')
            ->withPivot('role', 'is_active', 'assigned_at', 'notes')
            ->wherePivot('is_active', true);
    }

    public function canAccessOutlet($outletId)
    {
        // Super admin and owner can access all
        if (in_array($this->role, ['super_admin', 'owner'])) {
            return true;
        }

        // Check outlet assignment
        return $this->outlets()->where('outlet_id', $outletId)->exists();
    }

    public function getOutletRole($outletId)
    {
        if (in_array($this->role, ['super_admin', 'owner'])) {
            return 'owner';
        }

        $assignment = UserOutlet::where('user_id', $this->id)
            ->where('outlet_id', $outletId)
            ->where('is_active', true)
            ->first();

        return $assignment?->role;
    }
}
```

**Task 2.3: Update Product model**
```php
// app/Models/Product.php
class Product extends Model
{
    // ... existing code

    public function outlets()
    {
        return $this->belongsToMany(Outlet::class, 'product_outlets')
            ->withPivot('stock', 'min_stock', 'is_available', 'price_override')
            ->withTimestamps();
    }

    public function getStockAtOutlet($outletId)
    {
        $pivot = $this->outlets()->where('outlet_id', $outletId)->first();
        return $pivot?->pivot->stock ?? 0;
    }

    public function isAvailableAtOutlet($outletId)
    {
        if ($this->is_global) {
            return true;
        }

        $pivot = $this->outlets()->where('outlet_id', $outletId)->first();
        return $pivot && $pivot->pivot->is_available && $pivot->pivot->stock > 0;
    }
}
```

#### Day 5-7: Create Controllers & API Endpoints

**Task 3.1: Create OutletAssignmentController**
```bash
php artisan make:controller Api/OutletAssignmentController
```

```php
// app/Http/Controllers/Api/OutletAssignmentController.php
class OutletAssignmentController extends Controller
{
    // Get users assigned to an outlet
    public function getOutletUsers(Request $request, Outlet $outlet)
    {
        $users = $outlet->users()
            ->wherePivot('is_active', true)
            ->with(['user'])
            ->get();

        return response()->json($users);
    }

    // Assign user to outlet
    public function assignUser(Request $request, Outlet $outlet)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'role' => 'required|in:manager,kasir,kitchen,waiter',
            'notes' => 'nullable|string'
        ]);

        // Check if already assigned
        $existing = UserOutlet::where('user_id', $validated['user_id'])
            ->where('outlet_id', $outlet->id)
            ->first();

        if ($existing) {
            $existing->update([
                'is_active' => true,
                'role' => $validated['role'],
                'notes' => $validated['notes'] ?? $existing->notes
            ]);
        } else {
            UserOutlet::create([
                'user_id' => $validated['user_id'],
                'outlet_id' => $outlet->id,
                'role' => $validated['role'],
                'notes' => $validated['notes'],
                'assigned_by' => auth()->id()
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'User assigned successfully'
        ]);
    }

    // Remove user from outlet
    public function removeUser(Request $request, Outlet $outlet, User $user)
    {
        UserOutlet::where('user_id', $user->id)
            ->where('outlet_id', $outlet->id)
            ->update(['is_active' => false]);

        return response()->json([
            'success' => true,
            'message' => 'User removed from outlet'
        ]);
    }

    // Get user's assigned outlets
    public function getUserOutlets(Request $request, User $user)
    {
        $outlets = $user->outlets()
            ->with(['business'])
            ->get();

        return response()->json($outlets);
    }
}
```

**Task 3.2: Create OutletInventoryController**
```bash
php artisan make:controller Api/OutletInventoryController
```

```php
// app/Http/Controllers/Api/OutletInventoryController.php
class OutletInventoryController extends Controller
{
    // Get inventory for outlet
    public function index(Request $request, Outlet $outlet)
    {
        $inventory = DB::table('product_outlets')
            ->join('products', 'products.id', '=', 'product_outlets.product_id')
            ->where('product_outlets.outlet_id', $outlet->id)
            ->select(
                'product_outlets.*',
                'products.name as product_name',
                'products.sku',
                'products.price as default_price'
            )
            ->get();

        return response()->json($inventory);
    }

    // Get low stock items
    public function lowStock(Request $request, Outlet $outlet)
    {
        $lowStock = DB::table('product_outlets')
            ->join('products', 'products.id', '=', 'product_outlets.product_id')
            ->where('product_outlets.outlet_id', $outlet->id)
            ->whereRaw('product_outlets.stock < product_outlets.min_stock')
            ->select(
                'product_outlets.*',
                'products.name as product_name',
                DB::raw('(product_outlets.min_stock - product_outlets.stock) as shortage')
            )
            ->get();

        return response()->json($lowStock);
    }

    // Adjust stock
    public function adjustStock(Request $request, Outlet $outlet)
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'adjustment' => 'required|integer',
            'reason' => 'required|string',
            'cost_per_unit' => 'nullable|numeric'
        ]);

        DB::transaction(function () use ($validated, $outlet) {
            // Update stock
            $productOutlet = ProductOutlet::where('product_id', $validated['product_id'])
                ->where('outlet_id', $outlet->id)
                ->firstOrFail();

            $newStock = $productOutlet->stock + $validated['adjustment'];

            if ($newStock < 0) {
                throw new \Exception('Stock cannot be negative');
            }

            $productOutlet->update([
                'stock' => $newStock,
                'last_restock_at' => now(),
                'last_restock_by' => auth()->id()
            ]);

            // Log movement
            InventoryMovement::create([
                'product_id' => $validated['product_id'],
                'to_outlet_id' => $validated['adjustment'] > 0 ? $outlet->id : null,
                'from_outlet_id' => $validated['adjustment'] < 0 ? $outlet->id : null,
                'quantity' => abs($validated['adjustment']),
                'type' => 'adjustment',
                'reason' => $validated['reason'],
                'cost_per_unit' => $validated['cost_per_unit'] ?? null,
                'total_cost' => ($validated['cost_per_unit'] ?? 0) * abs($validated['adjustment']),
                'performed_by' => auth()->id(),
                'status' => 'completed'
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Stock adjusted successfully'
        ]);
    }
}
```

**Task 3.3: Create StockTransferController**
```bash
php artisan make:controller Api/StockTransferController
```

```php
// app/Http/Controllers/Api/StockTransferController.php
class StockTransferController extends Controller
{
    // Create transfer request
    public function createTransfer(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'from_outlet_id' => 'required|exists:outlets,id',
            'to_outlet_id' => 'required|exists:outlets,id|different:from_outlet_id',
            'quantity' => 'required|integer|min:1',
            'reason' => 'required|string'
        ]);

        // Check if source has enough stock
        $sourceStock = ProductOutlet::where('product_id', $validated['product_id'])
            ->where('outlet_id', $validated['from_outlet_id'])
            ->first();

        if (!$sourceStock || $sourceStock->stock < $validated['quantity']) {
            return response()->json([
                'error' => 'Insufficient stock at source outlet'
            ], 422);
        }

        // Create movement (pending approval)
        $movement = InventoryMovement::create([
            'product_id' => $validated['product_id'],
            'from_outlet_id' => $validated['from_outlet_id'],
            'to_outlet_id' => $validated['to_outlet_id'],
            'quantity' => $validated['quantity'],
            'type' => 'transfer',
            'reason' => $validated['reason'],
            'performed_by' => auth()->id(),
            'status' => 'pending'
        ]);

        return response()->json([
            'success' => true,
            'data' => $movement,
            'message' => 'Transfer request created, awaiting approval'
        ], 201);
    }

    // Get pending transfers
    public function getPendingTransfers(Request $request)
    {
        $query = InventoryMovement::where('type', 'transfer')
            ->where('status', 'pending')
            ->with(['product', 'fromOutlet', 'toOutlet', 'performedBy']);

        // Filter by outlet if specified
        if ($outletId = $request->query('outlet_id')) {
            $query->where(function($q) use ($outletId) {
                $q->where('from_outlet_id', $outletId)
                  ->orWhere('to_outlet_id', $outletId);
            });
        }

        return response()->json($query->get());
    }

    // Approve transfer
    public function approveTransfer(Request $request, InventoryMovement $movement)
    {
        if ($movement->status !== 'pending') {
            return response()->json(['error' => 'Transfer already processed'], 422);
        }

        DB::transaction(function () use ($movement) {
            // Deduct from source
            $source = ProductOutlet::where('product_id', $movement->product_id)
                ->where('outlet_id', $movement->from_outlet_id)
                ->lockForUpdate()
                ->first();

            if ($source->stock < $movement->quantity) {
                throw new \Exception('Insufficient stock');
            }

            $source->decrement('stock', $movement->quantity);

            // Add to destination
            $destination = ProductOutlet::firstOrCreate(
                [
                    'product_id' => $movement->product_id,
                    'outlet_id' => $movement->to_outlet_id
                ],
                [
                    'stock' => 0,
                    'min_stock' => 0,
                    'is_available' => true
                ]
            );

            $destination->increment('stock', $movement->quantity);

            // Update movement
            $movement->update([
                'status' => 'completed',
                'approved_by' => auth()->id()
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Transfer approved and completed'
        ]);
    }

    // Reject transfer
    public function rejectTransfer(Request $request, InventoryMovement $movement)
    {
        $movement->update([
            'status' => 'rejected',
            'approved_by' => auth()->id(),
            'notes' => $request->input('reason')
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Transfer rejected'
        ]);
    }
}
```

**Task 3.4: Create Middleware**
```bash
php artisan make:middleware CheckOutletAccess
```

```php
// app/Http/Middleware/CheckOutletAccess.php
class CheckOutletAccess
{
    public function handle(Request $request, Closure $next)
    {
        $user = auth()->user();
        $outletId = $request->header('X-Outlet-Id');

        if (!$outletId) {
            return response()->json(['error' => 'Outlet ID required'], 400);
        }

        // Super admin and owner bypass check
        if (in_array($user->role, ['super_admin', 'owner'])) {
            return $next($request);
        }

        // Check outlet access
        if (!$user->canAccessOutlet($outletId)) {
            return response()->json(['error' => 'No access to this outlet'], 403);
        }

        return $next($request);
    }
}
```

**Task 3.5: Register routes**
```php
// routes/api.php
Route::prefix('v1')->middleware('auth:sanctum')->group(function () {

    // Outlet Assignments
    Route::prefix('outlets/{outlet}')->middleware('outlet.access')->group(function () {
        Route::get('/users', [OutletAssignmentController::class, 'getOutletUsers']);
        Route::post('/assign-user', [OutletAssignmentController::class, 'assignUser']);
        Route::delete('/remove-user/{user}', [OutletAssignmentController::class, 'removeUser']);
    });

    // User Outlets
    Route::get('/users/{user}/outlets', [OutletAssignmentController::class, 'getUserOutlets']);

    // Outlet Inventory
    Route::prefix('outlets/{outlet}/inventory')->middleware('outlet.access')->group(function () {
        Route::get('/', [OutletInventoryController::class, 'index']);
        Route::get('/low-stock', [OutletInventoryController::class, 'lowStock']);
        Route::post('/adjust', [OutletInventoryController::class, 'adjustStock']);
    });

    // Stock Transfers
    Route::prefix('inventory/transfers')->group(function () {
        Route::post('/', [StockTransferController::class, 'createTransfer']);
        Route::get('/pending', [StockTransferController::class, 'getPendingTransfers']);
        Route::put('/{movement}/approve', [StockTransferController::class, 'approveTransfer']);
        Route::put('/{movement}/reject', [StockTransferController::class, 'rejectTransfer']);
    });
});
```

**Verification:**
```bash
php artisan route:list --path=api/v1/outlets
php artisan route:list --path=api/v1/inventory
```

### Week 2: Testing & Documentation

#### Day 8-10: Create Seeders & Test Data

**Task 4.1: Create OutletSeeder with assignments**
```php
// database/seeders/OutletWithAssignmentsSeeder.php
class OutletWithAssignmentsSeeder extends Seeder
{
    public function run()
    {
        $business = Business::first();
        $owner = User::where('role', 'owner')->first();

        // Create outlets
        $outlets = [
            ['name' => 'Cabang Senayan', 'code' => 'SNY-001'],
            ['name' => 'Cabang BSD', 'code' => 'BSD-001'],
            ['name' => 'Cabang PIK', 'code' => 'PIK-001']
        ];

        foreach ($outlets as $outletData) {
            $outlet = Outlet::create([
                'business_id' => $business->id,
                'name' => $outletData['name'],
                'code' => $outletData['code'],
                'is_active' => true
            ]);

            // Create staff for each outlet
            $this->createStaffForOutlet($outlet);

            // Assign products to outlet with stock
            $this->assignProductsToOutlet($outlet);
        }
    }

    private function createStaffForOutlet($outlet)
    {
        // Create manager
        $manager = User::create([
            'name' => "Manager {$outlet->name}",
            'email' => "manager.{$outlet->code}@example.com",
            'password' => bcrypt('password'),
            'role' => 'manager'
        ]);
        UserOutlet::create([
            'user_id' => $manager->id,
            'outlet_id' => $outlet->id,
            'role' => 'manager',
            'is_active' => true
        ]);

        // Create 2 kasir
        for ($i = 1; $i <= 2; $i++) {
            $kasir = User::create([
                'name' => "Kasir {$i} - {$outlet->name}",
                'email' => "kasir{$i}.{$outlet->code}@example.com",
                'password' => bcrypt('password'),
                'role' => 'kasir'
            ]);
            UserOutlet::create([
                'user_id' => $kasir->id,
                'outlet_id' => $outlet->id,
                'role' => 'kasir',
                'is_active' => true
            ]);
        }

        // Similar for kitchen and waiter...
    }

    private function assignProductsToOutlet($outlet)
    {
        $products = Product::take(20)->get();

        foreach ($products as $product) {
            ProductOutlet::create([
                'product_id' => $product->id,
                'outlet_id' => $outlet->id,
                'stock' => rand(10, 100),
                'min_stock' => 20,
                'is_available' => true
            ]);
        }
    }
}
```

#### Day 11-12: Backend Testing

**Create test cases**
```bash
php artisan make:test OutletAssignmentTest
php artisan make:test OutletInventoryTest
php artisan make:test StockTransferTest
```

**Run tests**
```bash
php artisan test --filter=Outlet
```

#### Day 13-14: API Documentation

Create API documentation using Postman or similar tool.

---

## 🎨 Phase 2: Core Frontend (Weeks 3-4)

### Week 3: Authentication & Context

#### Day 15-17: Update AuthContext

**Task 5.1: Enhance AuthContext**
```javascript
// src/contexts/AuthContext.js
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [currentBusiness, setCurrentBusiness] = useState(null);
  const [outlets, setOutlets] = useState([]);              // NEW
  const [currentOutlet, setCurrentOutlet] = useState(null); // NEW
  const [userAssignments, setUserAssignments] = useState(null); // NEW

  // Load user assignments
  const loadUserAssignments = async () => {
    const response = await fetch(`/api/v1/users/${user.id}/outlets`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    setUserAssignments(data);

    // Set outlets based on role
    if (['super_admin', 'owner'].includes(user.role)) {
      // Can access all outlets in business
      const allOutlets = await fetchBusinessOutlets(currentBusiness.id);
      setOutlets(allOutlets);
    } else {
      // Only assigned outlets
      setOutlets(data);
    }
  };

  // Switch outlet
  const switchOutlet = (outletId) => {
    const outlet = outlets.find(o => o.id === outletId);
    if (outlet) {
      setCurrentOutlet(outlet);
      localStorage.setItem('currentOutletId', outletId);
    }
  };

  // Auto-select outlet on login
  useEffect(() => {
    if (user && outlets.length > 0 && !currentOutlet) {
      // Auto-select if only 1 outlet
      if (outlets.length === 1) {
        switchOutlet(outlets[0].id);
      }
    }
  }, [user, outlets]);

  return (
    <AuthContext.Provider value={{
      user,
      businesses,
      currentBusiness,
      outlets,
      currentOutlet,
      userAssignments,
      switchBusiness,
      switchOutlet,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};
```

#### Day 18-19: Create Outlet Components

**Task 6.1: OutletSwitcher**
```javascript
// src/components/outlet/OutletSwitcher.jsx
const OutletSwitcher = () => {
  const { user, outlets, currentOutlet, switchOutlet } = useAuth();

  // Hide for staff
  if (!['super_admin', 'owner', 'manager'].includes(user?.role)) {
    return null;
  }

  if (outlets.length <= 1) {
    return (
      <div className="text-sm text-gray-600">
        📍 {currentOutlet?.name}
      </div>
    );
  }

  return (
    <Select
      value={currentOutlet?.id}
      onChange={(e) => switchOutlet(parseInt(e.target.value))}
      className="min-w-[200px]"
    >
      {outlets.map(outlet => (
        <option key={outlet.id} value={outlet.id}>
          📍 {outlet.name}
        </option>
      ))}
    </Select>
  );
};
```

**Task 6.2: OutletSelector (After Login)**
```javascript
// src/components/outlet/OutletSelector.jsx
const OutletSelector = () => {
  const { outlets, switchOutlet } = useAuth();
  const navigate = useNavigate();

  // Auto-redirect if only 1 outlet
  useEffect(() => {
    if (outlets.length === 1) {
      switchOutlet(outlets[0].id);
      navigate('/dashboard');
    }
  }, [outlets]);

  if (outlets.length === 0) {
    return (
      <div className="text-center py-12">
        <p>Anda belum di-assign ke outlet manapun.</p>
        <p>Hubungi owner atau manager untuk assignment.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12">
      <h2 className="text-2xl font-bold mb-6">Pilih Outlet</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {outlets.map(outlet => (
          <Card
            key={outlet.id}
            className="cursor-pointer hover:shadow-lg transition"
            onClick={() => {
              switchOutlet(outlet.id);
              navigate('/dashboard');
            }}
          >
            <CardHeader>
              <CardTitle>{outlet.name}</CardTitle>
              <CardDescription>{outlet.address}</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge>{outlet.code}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
```

#### Day 20-21: Update Layout & Routing

**Task 7.1: Update Layout.jsx**
```javascript
// src/components/Layout.jsx
import OutletSwitcher from './outlet/OutletSwitcher';

const Layout = () => {
  // ... existing code

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="...">
        {/* ... existing sidebar content */}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="...">
          <div className="flex items-center space-x-4">
            {/* Business Switcher */}
            <BusinessSwitcher />

            {/* Outlet Switcher (NEW) */}
            <OutletSwitcher />

            {/* ... other header items */}
          </div>
        </header>

        {/* Page Content */}
        <main className="...">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
```

**Task 7.2: Update App.js routing**
```javascript
// src/App.js
<Routes>
  {/* Login */}
  <Route path="/login" element={<Login />} />

  {/* After login - Outlet selection */}
  <Route
    path="/select-outlet"
    element={
      <PrivateRoute>
        <OutletSelector />
      </PrivateRoute>
    }
  />

  {/* Main app */}
  <Route
    path="/"
    element={
      <PrivateRoute requireOutlet={true}>
        <Layout />
      </PrivateRoute>
    }
  >
    {/* Role-based redirects */}
    <Route index element={<RoleBasedDashboard />} />

    {/* ... other routes */}
  </Route>
</Routes>
```

### Week 4: Services & Hooks

#### Day 22-24: Create Services

**Task 8.1: assignment.service.js**
```javascript
// src/services/assignment.service.js
const assignmentService = {
  async getOutletUsers(outletId) {
    const response = await fetch(`/api/v1/outlets/${outletId}/users`, {
      headers: getAuthHeaders()
    });
    return response.json();
  },

  async assignUser(outletId, userId, role, notes) {
    const response = await fetch(`/api/v1/outlets/${outletId}/assign-user`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ user_id: userId, role, notes })
    });
    return response.json();
  },

  async removeUser(outletId, userId) {
    const response = await fetch(`/api/v1/outlets/${outletId}/remove-user/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return response.json();
  }
};
```

**Task 8.2: inventory.service.js**
```javascript
// src/services/inventory.service.js
const inventoryService = {
  async getOutletInventory(outletId) {
    const response = await fetch(`/api/v1/outlets/${outletId}/inventory`, {
      headers: getAuthHeaders()
    });
    return response.json();
  },

  async getLowStock(outletId) {
    const response = await fetch(`/api/v1/outlets/${outletId}/inventory/low-stock`, {
      headers: getAuthHeaders()
    });
    return response.json();
  },

  async adjustStock(outletId, productId, adjustment, reason) {
    const response = await fetch(`/api/v1/outlets/${outletId}/inventory/adjust`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ product_id: productId, adjustment, reason })
    });
    return response.json();
  }
};
```

**Task 8.3: transfer.service.js**
```javascript
// src/services/transfer.service.js
const transferService = {
  async createTransfer(fromOutletId, toOutletId, productId, quantity, reason) {
    const response = await fetch('/api/v1/inventory/transfers', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        from_outlet_id: fromOutletId,
        to_outlet_id: toOutletId,
        product_id: productId,
        quantity,
        reason
      })
    });
    return response.json();
  },

  async getPendingTransfers(outletId = null) {
    const url = outletId
      ? `/api/v1/inventory/transfers/pending?outlet_id=${outletId}`
      : '/api/v1/inventory/transfers/pending';

    const response = await fetch(url, {
      headers: getAuthHeaders()
    });
    return response.json();
  },

  async approveTransfer(transferId) {
    const response = await fetch(`/api/v1/inventory/transfers/${transferId}/approve`, {
      method: 'PUT',
      headers: getAuthHeaders()
    });
    return response.json();
  },

  async rejectTransfer(transferId, reason) {
    const response = await fetch(`/api/v1/inventory/transfers/${transferId}/reject`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason })
    });
    return response.json();
  }
};
```

#### Day 25-28: Create Custom Hooks

**Task 9.1: useOutlet hook**
```javascript
// src/hooks/useOutlet.js
export const useOutlet = () => {
  const { currentOutlet, outlets, switchOutlet } = useAuth();

  return {
    outlet: currentOutlet,
    outlets,
    switchOutlet,
    outletId: currentOutlet?.id,
    outletName: currentOutlet?.name
  };
};
```

**Task 9.2: useOutletAccess hook**
```javascript
// src/hooks/useOutletAccess.js
export const useOutletAccess = () => {
  const { user, currentOutlet } = useAuth();

  const canManageStaff = () => {
    return ['super_admin', 'owner', 'manager'].includes(user?.role);
  };

  const canManageInventory = () => {
    return ['super_admin', 'owner', 'manager'].includes(user?.role);
  };

  const canApproveTransfer = () => {
    return ['super_admin', 'owner'].includes(user?.role);
  };

  return {
    canManageStaff,
    canManageInventory,
    canApproveTransfer
  };
};
```

---

## 🎯 Next Steps

Setelah Phase 1-2 selesai, lanjut ke:

**Phase 3: Feature Implementation (Weeks 5-6)**
- Outlet Staff Management page
- Outlet Inventory page
- Stock Transfer UI
- Role-based dashboards

**Phase 4: Testing & Polish (Weeks 7-8)**
- End-to-end testing
- Bug fixes
- Performance optimization
- User training documentation

---

## ✅ Daily Checklist

Use this for tracking progress:

- [ ] Day 1: Create user_outlets migration
- [ ] Day 2: Create product_outlets & inventory_movements migrations
- [ ] Day 3: Create models & relationships
- [ ] Day 4: Add model methods
- [ ] Day 5: Create OutletAssignmentController
- [ ] Day 6: Create OutletInventoryController
- [ ] Day 7: Create StockTransferController & middleware
- [ ] Day 8: Create seeders
- [ ] Day 9: Generate test data
- [ ] Day 10: Run migrations & seeds
- [ ] Day 11: Write unit tests
- [ ] Day 12: Write feature tests
- [ ] Day 13: API documentation
- [ ] Day 14: Backend code review
- [ ] Day 15: Update AuthContext
- [ ] Day 16: Test AuthContext
- [ ] Day 17: Create OutletSwitcher
- [ ] Day 18: Create OutletSelector
- [ ] Day 19: Test outlet components
- [ ] Day 20: Update Layout
- [ ] Day 21: Update routing
- [ ] Day 22: Create assignment.service
- [ ] Day 23: Create inventory.service
- [ ] Day 24: Create transfer.service
- [ ] Day 25: Create useOutlet hook
- [ ] Day 26: Create useOutletAccess hook
- [ ] Day 27: Integration testing
- [ ] Day 28: Phase 2 review & demo

---

**Ready to start implementation?** 🚀

Pilih mana yang mau dikerjakan duluan:
1. Database & Backend (Phase 1)
2. Frontend Core (Phase 2)
3. Atau langsung full implementation
