# Implementasi Fitur Bahan Baku & Resep - Dokumentasi Lengkap

**Tanggal:** 2025-10-10
**Status:** ✅ COMPLETED

---

## 📋 Ringkasan

Fitur Bahan Baku & Resep memungkinkan pengelolaan inventori bahan baku dan resep masakan dengan lengkap. Fitur ini mencakup:
- ✅ CRUD Bahan Baku (Ingredients)
- ✅ CRUD Resep (Recipes)
- ✅ Tracking stok bahan baku
- ✅ Perhitungan biaya produksi per resep
- ✅ Perhitungan margin dan keuntungan
- ✅ Alert untuk stok rendah dan kritis

---

## 🗄️ Database Structure

### 1. Tabel `ingredients`

**File:** `backend/database/migrations/2025_09_27_115251_create_ingredients_table.php`

```sql
CREATE TABLE ingredients (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    business_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(255) NULL,
    unit VARCHAR(255) NOT NULL,
    cost_per_unit DECIMAL(15,2) NOT NULL,
    current_stock DECIMAL(15,2) DEFAULT 0,
    min_stock DECIMAL(15,2) DEFAULT 0,
    supplier VARCHAR(255) NULL,
    expiry_date DATE NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP NULL,

    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    INDEX idx_business_id (business_id),
    INDEX idx_business_name (business_id, name),
    INDEX idx_stock (current_stock, min_stock),
    INDEX idx_expiry (expiry_date)
);
```

**Fields:**
- `business_id` - ID bisnis (multi-tenancy support)
- `name` - Nama bahan baku
- `category` - Kategori bahan (Bahan Pokok, Protein, Sayuran, dll)
- `unit` - Satuan (kg, gram, liter, ml, dll)
- `cost_per_unit` - Harga per satuan
- `current_stock` - Stok saat ini
- `min_stock` - Stok minimum (untuk alert)
- `supplier` - Nama supplier
- `expiry_date` - Tanggal kadaluarsa
- Soft deletes enabled

### 2. Tabel `recipes`

**File:** `backend/database/migrations/2025_09_27_115251_create_recipes_table.php`

```sql
CREATE TABLE recipes (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    product_id BIGINT NOT NULL,
    ingredient_id BIGINT NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,

    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE,
    UNIQUE KEY unique_recipe (product_id, ingredient_id),
    INDEX idx_product (product_id),
    INDEX idx_ingredient (ingredient_id)
);
```

**Fields:**
- `product_id` - ID produk yang menggunakan resep ini
- `ingredient_id` - ID bahan baku
- `quantity` - Jumlah bahan yang digunakan

**Catatan:** Ini adalah tabel pivot (many-to-many) antara products dan ingredients.

---

## 🔧 Backend Implementation

### 1. Models

#### Ingredient Model
**File:** `backend/app/Models/Ingredient.php`

```php
class Ingredient extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'business_id', 'name', 'unit', 'cost_per_unit',
        'current_stock', 'min_stock', 'category', 'supplier', 'expiry_date'
    ];

    protected $casts = [
        'cost_per_unit' => 'decimal:2',
        'current_stock' => 'decimal:2',
        'min_stock' => 'decimal:2',
        'expiry_date' => 'date',
    ];

    // Relationships
    public function business() { ... }
    public function inventoryMovements() { ... }
    public function products() { ... } // via recipes pivot
}
```

#### Recipe Model
**File:** `backend/app/Models/Recipe.php`

```php
class Recipe extends Model
{
    protected $fillable = ['product_id', 'ingredient_id', 'quantity'];

    protected $casts = [
        'quantity' => 'decimal:3',
    ];

    // Relationships
    public function product() { ... }
    public function ingredient() { ... }
}
```

### 2. Controllers

#### IngredientController
**File:** `backend/app/Http/Controllers/Api/IngredientController.php`

**Endpoints:**
- `GET /api/v1/ingredients` - List semua bahan baku
- `POST /api/v1/ingredients` - Tambah bahan baku baru
- `GET /api/v1/ingredients/{id}` - Detail bahan baku
- `PUT /api/v1/ingredients/{id}` - Update bahan baku
- `DELETE /api/v1/ingredients/{id}` - Hapus bahan baku
- `POST /api/v1/ingredients/{id}/stock` - Update stok
- `GET /api/v1/ingredients/low-stock` - List bahan dengan stok rendah

**Fitur Utama:**
- ✅ Business scoping (hanya akses data bisnis sendiri)
- ✅ Auto-calculate stock status (critical/low/adequate)
- ✅ Auto-calculate total value
- ✅ Stock adjustment (add/subtract/set)
- ✅ Validation lengkap

**Example Response:**
```json
{
  "id": 1,
  "business_id": 1,
  "name": "Beras Premium",
  "category": "Bahan Pokok",
  "unit": "kg",
  "cost_per_unit": 12000,
  "current_stock": 45,
  "min_stock": 20,
  "supplier": "CV Beras Jaya",
  "expiry_date": "2024-06-30",
  "total_value": 540000,
  "status": "adequate"
}
```

#### RecipeController
**File:** `backend/app/Http/Controllers/Api/RecipeController.php`

**Endpoints:**
- `GET /api/v1/recipes` - List semua resep (products with recipes)
- `POST /api/v1/recipes` - Buat resep baru untuk produk
- `GET /api/v1/recipes/{product_id}` - Detail resep produk
- `PUT /api/v1/recipes/{product_id}` - Update resep produk
- `DELETE /api/v1/recipes/{product_id}` - Hapus resep produk
- `GET /api/v1/recipes/{product_id}/calculate` - Hitung biaya resep

**Fitur Utama:**
- ✅ Business scoping
- ✅ Auto-calculate total cost
- ✅ Auto-calculate margin & profit
- ✅ Ingredient validation (harus dari bisnis yang sama)
- ✅ Transaction support (rollback jika gagal)

**Example Response:**
```json
{
  "id": 1,
  "product_id": 5,
  "name": "Nasi Goreng Spesial",
  "category": "Makanan Utama",
  "serving_size": 1,
  "total_cost": 8500,
  "selling_price": 15000,
  "margin": 43.3,
  "ingredients": [
    {
      "id": 1,
      "ingredient_id": 1,
      "name": "Beras Premium",
      "quantity": 0.15,
      "unit": "kg",
      "cost_per_unit": 12000,
      "total_cost": 1800
    },
    ...
  ]
}
```

### 3. Routes

**File:** `backend/routes/api.php`

```php
// Ingredient API (Lines 133-142)
Route::prefix('ingredients')->group(function () {
    Route::get('/', [IngredientController::class, 'index']);
    Route::post('/', [IngredientController::class, 'store']);
    Route::get('/low-stock', [IngredientController::class, 'getLowStock']);
    Route::get('/{ingredient}', [IngredientController::class, 'show']);
    Route::put('/{ingredient}', [IngredientController::class, 'update']);
    Route::delete('/{ingredient}', [IngredientController::class, 'destroy']);
    Route::post('/{ingredient}/stock', [IngredientController::class, 'updateStock']);
});

// Recipe API (Lines 144-152)
Route::prefix('recipes')->group(function () {
    Route::get('/', [RecipeController::class, 'index']);
    Route::post('/', [RecipeController::class, 'store']);
    Route::get('/{product}', [RecipeController::class, 'show']);
    Route::put('/{product}', [RecipeController::class, 'update']);
    Route::delete('/{product}', [RecipeController::class, 'destroy']);
    Route::get('/{product}/calculate', [RecipeController::class, 'calculateCost']);
});
```

**Catatan:** Semua routes di dalam `auth:sanctum` middleware.

---

## 💻 Frontend Implementation

### 1. Service Layer

#### Ingredient Service
**File:** `frontend/src/services/ingredient.service.js`

```javascript
export const ingredientService = {
  getAll: async (params) => { ... },
  getById: async (id) => { ... },
  create: async (ingredientData) => { ... },
  update: async (id, ingredientData) => { ... },
  delete: async (id) => { ... },
  getLowStock: async () => { ... },
  updateStock: async (id, stockData) => { ... }
};
```

#### Recipe Service
**File:** `frontend/src/services/recipe.service.js`

```javascript
export const recipeService = {
  getAll: async (params) => { ... },
  getByProductId: async (productId) => { ... },
  create: async (recipeData) => { ... },
  update: async (productId, recipeData) => { ... },
  delete: async (productId) => { ... },
  calculateCost: async (productId) => { ... }
};
```

### 2. API Configuration

**File:** `frontend/src/config/api.config.js` (Lines 113-132)

```javascript
INGREDIENTS: {
  LIST: '/v1/ingredients',
  CREATE: '/v1/ingredients',
  DETAIL: id => `/v1/ingredients/${id}`,
  UPDATE: id => `/v1/ingredients/${id}`,
  DELETE: id => `/v1/ingredients/${id}`,
  LOW_STOCK: '/v1/ingredients/low-stock',
  UPDATE_STOCK: id => `/v1/ingredients/${id}/stock`,
},

RECIPES: {
  LIST: '/v1/recipes',
  CREATE: '/v1/recipes',
  DETAIL: productId => `/v1/recipes/${productId}`,
  UPDATE: productId => `/v1/recipes/${productId}`,
  DELETE: productId => `/v1/recipes/${productId}`,
  CALCULATE: productId => `/v1/recipes/${productId}/calculate`,
}
```

### 3. Main Component

**File:** `frontend/src/components/InventoryRecipe.jsx`

**Fitur Utama:**
- ✅ Tabs untuk Bahan Baku dan Resep
- ✅ Real-time data loading dari API
- ✅ Search & filter functionality
- ✅ Loading states & error handling
- ✅ Toast notifications
- ✅ Delete confirmation
- ✅ Stats cards (nilai stok, total bahan, stok rendah/kritis)
- ✅ Stock status badges (critical/low/adequate)
- ✅ Progress bars untuk visualisasi stok
- ✅ Responsive design

**State Management:**
```javascript
const [selectedTab, setSelectedTab] = useState('ingredients');
const [searchTerm, setSearchTerm] = useState('');
const [ingredients, setIngredients] = useState([]);
const [recipes, setRecipes] = useState([]);
const [loading, setLoading] = useState(false);
const [refreshing, setRefreshing] = useState(false);
```

**Key Functions:**
```javascript
loadIngredients()        // Load all ingredients
loadRecipes()            // Load all recipes
handleRefresh()          // Refresh data
handleDeleteIngredient() // Delete ingredient with confirmation
handleDeleteRecipe()     // Delete recipe with confirmation
calculateStockValue()    // Calculate total inventory value
getLowStockCount()       // Count ingredients with low stock
getCriticalStockCount()  // Count ingredients with critical stock
```

**UI Components:**
1. **Header Section**
   - Title & description
   - Buttons: Laporan, Tambah Bahan

2. **Stats Cards** (4 cards)
   - Nilai Stok (total inventory value)
   - Total Bahan (ingredient count)
   - Stok Rendah (low stock count)
   - Stok Kritis (critical stock count)

3. **Tabs**
   - Bahan Baku Tab
   - Resep Tab

4. **Bahan Baku Tab**
   - Search bar
   - Filter & Refresh buttons
   - Ingredient cards with:
     - Name & category
     - Stock status badge
     - Current stock, min stock
     - Cost per unit, total value
     - Expiry date
     - Action buttons (view, edit, delete)
     - Stock level progress bar

5. **Resep Tab**
   - Search bar
   - Add Recipe button
   - Recipe cards with:
     - Name & category
     - Cost breakdown
     - Selling price & margin
     - Profit calculation
     - Ingredient list with costs
     - Action buttons (calculate, view, edit, delete)

---

## 🔄 Data Flow

### Loading Ingredients
```
Component Mount
  └─> loadIngredients()
      └─> ingredientService.getAll()
          └─> GET /api/v1/ingredients
              └─> IngredientController::index()
                  └─> Filter by business_id
                  └─> Calculate status & total_value
                  └─> Return JSON
```

### Loading Recipes
```
Component Mount
  └─> loadRecipes()
      └─> recipeService.getAll()
          └─> GET /api/v1/recipes
              └─> RecipeController::index()
                  └─> Get products with recipes
                  └─> Calculate costs & margins
                  └─> Return JSON with ingredients
```

### Delete Ingredient
```
Delete Button Click
  └─> Confirmation Dialog
      └─> handleDeleteIngredient(id)
          └─> ingredientService.delete(id)
              └─> DELETE /api/v1/ingredients/{id}
                  └─> IngredientController::destroy()
                      └─> Verify business ownership
                      └─> Soft delete
                      └─> Return success
```

---

## 🎨 UI/UX Features

### Stock Status Badges
- 🔴 **Kritis** - Stock ≤ 50% of min_stock (Red)
- 🟡 **Rendah** - Stock ≤ min_stock (Yellow)
- 🟢 **Cukup** - Stock > min_stock (Green)

### Progress Bars
- Visual representation of stock level
- Color-coded based on status
- Percentage calculation

### Toast Notifications
- Success messages (green)
- Error messages (red)
- Auto-dismiss after 3 seconds

### Loading States
- Spinner during initial load
- Refresh button with spinning icon
- Disable buttons during operations

### Empty States
- "Tidak ada bahan baku ditemukan" with icon
- "Tidak ada resep ditemukan" with icon

---

## 📊 Business Logic

### Stock Status Calculation
```javascript
if (current_stock <= min_stock * 0.5) {
    status = 'critical'  // Red alert
} else if (current_stock <= min_stock) {
    status = 'low'       // Yellow warning
} else {
    status = 'adequate'  // Green ok
}
```

### Recipe Cost Calculation
```php
$totalCost = $recipe->ingredients->sum(function($ingredient) {
    return $ingredient->quantity * $ingredient->cost_per_unit;
});

$margin = ($sellingPrice - $totalCost) / $sellingPrice * 100;
$profit = $sellingPrice - $totalCost;
```

### Stock Value Calculation
```javascript
const totalValue = ingredients.reduce((total, ingredient) => {
    return total + (ingredient.current_stock * ingredient.cost_per_unit);
}, 0);
```

---

## 🔒 Security Features

1. **Business Scoping**
   - Semua query di-filter berdasarkan `business_id`
   - User hanya bisa akses data bisnis sendiri

2. **Authorization Check**
   - Verify ownership sebelum update/delete
   - Return 403 Forbidden jika unauthorized

3. **Validation**
   - Input validation di backend
   - Required fields check
   - Data type validation
   - Min/max constraints

4. **Soft Deletes**
   - Data tidak benar-benar dihapus
   - Dapat di-restore jika diperlukan

---

## 🧪 Testing Checklist

### Backend Testing
- [ ] GET /api/v1/ingredients - List all ingredients
- [ ] POST /api/v1/ingredients - Create new ingredient
- [ ] GET /api/v1/ingredients/{id} - Get ingredient detail
- [ ] PUT /api/v1/ingredients/{id} - Update ingredient
- [ ] DELETE /api/v1/ingredients/{id} - Delete ingredient
- [ ] POST /api/v1/ingredients/{id}/stock - Update stock
- [ ] GET /api/v1/ingredients/low-stock - Get low stock ingredients
- [ ] GET /api/v1/recipes - List all recipes
- [ ] POST /api/v1/recipes - Create new recipe
- [ ] GET /api/v1/recipes/{product_id} - Get recipe detail
- [ ] PUT /api/v1/recipes/{product_id} - Update recipe
- [ ] DELETE /api/v1/recipes/{product_id} - Delete recipe
- [ ] GET /api/v1/recipes/{product_id}/calculate - Calculate cost
- [ ] Test business scoping - user tidak bisa akses data business lain
- [ ] Test validation - invalid data returns errors
- [ ] Test calculation - cost, margin, profit calculated correctly

### Frontend Testing
- [ ] Load ingredients on mount
- [ ] Load recipes on mount
- [ ] Search ingredients by name/category
- [ ] Search recipes by name/category
- [ ] Refresh button updates data
- [ ] Delete ingredient with confirmation
- [ ] Delete recipe with confirmation
- [ ] Stats cards show correct values
- [ ] Stock status badges show correct colors
- [ ] Progress bars display correctly
- [ ] Toast notifications appear on actions
- [ ] Loading states work properly
- [ ] Empty states display when no data
- [ ] Responsive design works on mobile/tablet/desktop

---

## 🚀 Usage Examples

### 1. Tambah Bahan Baku (Future Implementation)
```javascript
const newIngredient = {
  name: "Beras Premium",
  category: "Bahan Pokok",
  unit: "kg",
  cost_per_unit: 12000,
  current_stock: 50,
  min_stock: 20,
  supplier: "CV Beras Jaya",
  expiry_date: "2024-06-30"
};

const result = await ingredientService.create(newIngredient);
```

### 2. Update Stok Bahan
```javascript
const stockData = {
  type: 'add',       // 'add', 'subtract', or 'set'
  quantity: 10,
  notes: 'Pembelian dari supplier'
};

const result = await ingredientService.updateStock(ingredientId, stockData);
```

### 3. Buat Resep Baru (Future Implementation)
```javascript
const newRecipe = {
  product_id: 5,
  ingredients: [
    { ingredient_id: 1, quantity: 0.15 },  // 0.15 kg Beras
    { ingredient_id: 2, quantity: 0.1 },   // 0.1 kg Ayam
    { ingredient_id: 3, quantity: 0.02 }   // 0.02 liter Minyak
  ]
};

const result = await recipeService.create(newRecipe);
```

### 4. Hitung Biaya Resep
```javascript
const result = await recipeService.calculateCost(productId);

console.log(result.data);
// {
//   total_cost: 8500,
//   selling_price: 15000,
//   profit: 6500,
//   margin: 43.3,
//   ingredient_breakdown: [...]
// }
```

---

## 📝 Next Steps (Future Enhancements)

### High Priority
1. **Add/Edit Ingredient Modal**
   - Form untuk tambah/edit bahan baku
   - Validation di frontend
   - Image upload untuk bahan

2. **Add/Edit Recipe Modal**
   - Form untuk tambah/edit resep
   - Select ingredients dengan autocomplete
   - Quantity input untuk setiap ingredient
   - Auto-calculate total cost

3. **Stock Adjustment Modal**
   - Form untuk update stok (add/subtract/set)
   - Notes field untuk tracking
   - Integration dengan inventory_movements table

4. **View Detail Modal**
   - Detail lengkap ingredient/recipe
   - History stok movements
   - Usage statistics

### Medium Priority
5. **Batch Operations**
   - Import ingredients via CSV
   - Export data to Excel
   - Bulk stock adjustment

6. **Advanced Filters**
   - Filter by category
   - Filter by stock status
   - Filter by expiry date
   - Sort options (name, stock, cost)

7. **Alerts & Notifications**
   - Email notification untuk stok rendah
   - Alert untuk bahan yang akan kadaluarsa
   - Daily/weekly stock reports

### Low Priority
8. **Stock Forecasting**
   - Predict when stock akan habis
   - Suggest reorder quantity
   - Integration dengan sales data

9. **Supplier Management**
   - Supplier database
   - Purchase order tracking
   - Supplier performance analytics

10. **Recipe Optimization**
    - Suggest cost-saving alternatives
    - Compare recipe variations
    - Optimize ingredient usage

---

## 🐛 Known Issues & Limitations

1. **No Add/Edit Forms Yet**
   - Saat ini hanya read & delete
   - Add/Edit akan diimplementasi di tahap selanjutnya

2. **No Stock Movement History**
   - Belum ada tracking perubahan stok
   - Integration dengan inventory_movements table pending

3. **No Image Support**
   - Belum ada upload/display gambar untuk ingredients
   - Icon placeholder digunakan sementara

4. **Limited Validation**
   - Validation masih basic
   - Perlu validation rules yang lebih kompleks

---

## 📚 References

- [Laravel Documentation](https://laravel.com/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Lucide Icons](https://lucide.dev)
- Project TODO: `app/TODO.md`
- Product Changelog: `app/CHANGELOG_PRODUCT_IMPROVEMENTS.md`

---

## 👥 Contributors

- Claude Code Assistant

---

## 📄 License

Internal Project - Kasir POS System

---

**Last Updated:** 2025-10-10
**Version:** 1.0.0
