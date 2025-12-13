# 🎁 Fitur Diskon Per Produk - Implementation Guide

## ✅ Yang Sudah Diimplementasi (Backend)

### 1. **Database Schema** ✅
Tabel `products` sudah punya field:

```sql
discount_price       DECIMAL(15,2)  -- Harga setelah diskon (misal: Rp 80.000)
discount_percentage  DECIMAL(5,2)   -- Persentase diskon (misal: 20 = 20%)
discount_start_date  TIMESTAMP      -- Kapan diskon mulai
discount_end_date    TIMESTAMP      -- Kapan diskon berakhir
```

### 2. **Model Product** ✅
Sudah include:
- ✅ Fillable fields untuk semua discount columns
- ✅ Casting untuk decimal & datetime
- ✅ Helper methods:
  - `hasActiveDiscount()` - Cek apakah diskon aktif
  - `getFinalPriceAttribute()` - Harga final dengan diskon
  - `getDiscountAmountAttribute()` - Jumlah penghematan

### 3. **API Response** ✅
ProductController sudah include discount fields di response:
```json
{
  "id": 1,
  "name": "Kopi Arabica",
  "price": "100000.00",
  "discount_price": "80000.00",
  "discount_percentage": "20.00",
  "discount_start_date": "2025-10-30 00:00:00",
  "discount_end_date": "2025-11-30 23:59:59"
}
```

---

## 🎨 Frontend UI Implementation (Perlu Ditambahkan)

### Option 1: Diskon dengan Harga Tetap

**Form Input:**
```javascript
// Di ProductManagement.jsx - Product Modal Form

<div>
  <label>Harga Normal</label>
  <Input
    type="number"
    value={productFormData.price}
    onChange={e => setProductFormData({
      ...productFormData,
      price: e.target.value
    })}
  />
</div>

<div>
  <label>Harga Diskon (opsional)</label>
  <Input
    type="number"
    placeholder="Kosongkan jika tidak ada diskon"
    value={productFormData.discount_price || ''}
    onChange={e => setProductFormData({
      ...productFormData,
      discount_price: e.target.value || null
    })}
  />
</div>

<div className="grid grid-cols-2 gap-4">
  <div>
    <label>Tanggal Mulai Diskon</label>
    <Input
      type="datetime-local"
      value={productFormData.discount_start_date || ''}
      onChange={e => setProductFormData({
        ...productFormData,
        discount_start_date: e.target.value
      })}
    />
  </div>
  <div>
    <label>Tanggal Akhir Diskon</label>
    <Input
      type="datetime-local"
      value={productFormData.discount_end_date || ''}
      onChange={e => setProductFormData({
        ...productFormData,
        discount_end_date: e.target.value
      })}
    />
  </div>
</div>
```

### Option 2: Diskon dengan Persentase

```javascript
<div>
  <label>Persentase Diskon (%)</label>
  <Input
    type="number"
    min="0"
    max="100"
    placeholder="Contoh: 20 untuk diskon 20%"
    value={productFormData.discount_percentage || ''}
    onChange={e => {
      const percentage = e.target.value;
      const discountPrice = percentage
        ? productFormData.price * (1 - percentage / 100)
        : null;

      setProductFormData({
        ...productFormData,
        discount_percentage: percentage || null,
        discount_price: discountPrice
      });
    }}
  />
  {productFormData.discount_percentage && (
    <p className="text-sm text-gray-500 mt-1">
      Harga setelah diskon: {formatCurrency(
        productFormData.price * (1 - productFormData.discount_percentage / 100)
      )}
    </p>
  )}
</div>
```

---

## 🎯 Display Discount Badge di Product List

```javascript
// Di ProductManagement.jsx - Product Card

const ProductCard = ({ product }) => {
  const hasDiscount = product.discount_price || product.discount_percentage;
  const now = new Date();
  const isDiscountActive = hasDiscount &&
    (!product.discount_start_date || new Date(product.discount_start_date) <= now) &&
    (!product.discount_end_date || new Date(product.discount_end_date) >= now);

  const finalPrice = isDiscountActive
    ? (product.discount_price || product.price * (1 - product.discount_percentage / 100))
    : product.price;

  const discountPercentage = isDiscountActive && product.discount_percentage
    ? product.discount_percentage
    : ((product.price - finalPrice) / product.price * 100);

  return (
    <div className="product-card">
      {/* Discount Badge */}
      {isDiscountActive && (
        <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-md text-xs font-bold">
          -{Math.round(discountPercentage)}%
        </div>
      )}

      {/* Product Image */}
      <img src={product.image} alt={product.name} />

      {/* Product Name */}
      <h3>{product.name}</h3>

      {/* Price Display */}
      <div className="flex items-center gap-2">
        {isDiscountActive ? (
          <>
            <span className="text-lg font-bold text-red-600">
              {formatCurrency(finalPrice)}
            </span>
            <span className="text-sm text-gray-500 line-through">
              {formatCurrency(product.price)}
            </span>
          </>
        ) : (
          <span className="text-lg font-bold text-gray-900">
            {formatCurrency(product.price)}
          </span>
        )}
      </div>

      {/* Discount Period */}
      {isDiscountActive && product.discount_end_date && (
        <p className="text-xs text-gray-500 mt-1">
          Diskon berakhir: {new Date(product.discount_end_date).toLocaleDateString('id-ID')}
        </p>
      )}
    </div>
  );
};
```

---

## 🔧 Update productFormData State

Di `ProductManagement.jsx`, update initial state:

```javascript
const [productFormData, setProductFormData] = useState({
  name: '',
  category_id: '',
  sku: '',
  price: '',
  cost: '',
  stock: '',
  min_stock: '10',
  description: '',
  discount_price: null,           // ✅ Tambah
  discount_percentage: null,      // ✅ Tambah
  discount_start_date: null,      // ✅ Tambah
  discount_end_date: null,        // ✅ Tambah
});
```

Dan update `handleEditProduct`:

```javascript
const handleEditProduct = product => {
  setProductFormData({
    id: product.id,
    name: product.name,
    category_id: product.category_id,
    sku: product.sku,
    price: product.price,
    cost: product.cost,
    stock: product.stock,
    min_stock: product.min_stock,
    description: product.description,
    discount_price: product.discount_price,             // ✅ Tambah
    discount_percentage: product.discount_percentage,   // ✅ Tambah
    discount_start_date: product.discount_start_date
      ? new Date(product.discount_start_date).toISOString().slice(0, 16)
      : null,  // ✅ Tambah
    discount_end_date: product.discount_end_date
      ? new Date(product.discount_end_date).toISOString().slice(0, 16)
      : null,  // ✅ Tambah
  });
  setIsEditingProduct(true);
  setShowProductModal(true);
};
```

---

## 📊 Contoh Use Cases

### Use Case 1: Flash Sale (Diskon dengan Waktu Terbatas)
```
Product: Kopi Arabica
Harga Normal: Rp 100.000
Diskon: 20%
Harga Diskon: Rp 80.000
Periode: 30 Okt 2025 00:00 - 31 Okt 2025 23:59
```

**Display:**
```
🔥 -20%
Rp 80.000  [Rp 100.000]
Diskon berakhir: 31 Okt 2025
```

### Use Case 2: Diskon Permanen (Tanpa Batas Waktu)
```
Product: Kopi Robusta
Harga Normal: Rp 50.000
Harga Diskon: Rp 45.000
Start Date: null
End Date: null
```

**Display:**
```
-10%
Rp 45.000  [Rp 50.000]
```

### Use Case 3: Scheduled Discount (Akan Datang)
```
Product: Kopi Susu
Harga Normal: Rp 25.000
Diskon: 15%
Start Date: 1 Nov 2025 00:00
End Date: 7 Nov 2025 23:59
```

**Display (sebelum 1 Nov):**
```
Rp 25.000
[Coming soon: Diskon 15% mulai 1 Nov]
```

**Display (setelah 1 Nov):**
```
-15%
Rp 21.250  [Rp 25.000]
Diskon berakhir: 7 Nov 2025
```

---

## 🎨 UI Component Example (React)

```javascript
// components/DiscountBadge.jsx
export const DiscountBadge = ({ product }) => {
  const hasDiscount = product.discount_price || product.discount_percentage;
  if (!hasDiscount) return null;

  const now = new Date();
  const isActive =
    (!product.discount_start_date || new Date(product.discount_start_date) <= now) &&
    (!product.discount_end_date || new Date(product.discount_end_date) >= now);

  if (!isActive) return null;

  const percentage = product.discount_percentage ||
    ((product.price - product.discount_price) / product.price * 100);

  return (
    <div className="absolute top-2 right-2 bg-gradient-to-r from-red-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
      🔥 -{Math.round(percentage)}%
    </div>
  );
};

// components/PriceDisplay.jsx
export const PriceDisplay = ({ product }) => {
  const hasDiscount = product.discount_price || product.discount_percentage;
  const now = new Date();
  const isActive = hasDiscount &&
    (!product.discount_start_date || new Date(product.discount_start_date) <= now) &&
    (!product.discount_end_date || new Date(product.discount_end_date) >= now);

  const finalPrice = isActive
    ? (product.discount_price || product.price * (1 - product.discount_percentage / 100))
    : product.price;

  if (!isActive) {
    return (
      <div className="text-xl font-bold text-gray-900">
        {formatCurrency(product.price)}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="text-xl font-bold text-red-600">
          {formatCurrency(finalPrice)}
        </span>
        <span className="text-sm text-gray-500 line-through">
          {formatCurrency(product.price)}
        </span>
      </div>
      {product.discount_end_date && (
        <p className="text-xs text-gray-500">
          Berakhir {formatDate(product.discount_end_date)}
        </p>
      )}
    </div>
  );
};
```

---

## 🚀 Next Steps

### 1. **Update ProductManagement.jsx** ✅ Lakukan
   - Tambah discount fields ke form modal
   - Update productFormData state
   - Update handleEditProduct

### 2. **Add Discount Badge** ✅ Lakukan
   - Show discount percentage badge
   - Display crossed-out original price
   - Show discount period if applicable

### 3. **Validation** ⚠️ Recommended
   ```javascript
   // Di handleSaveProduct
   if (productFormData.discount_price &&
       parseFloat(productFormData.discount_price) >= parseFloat(productFormData.price)) {
     toast.error('Harga diskon harus lebih kecil dari harga normal!');
     return;
   }

   if (productFormData.discount_percentage &&
       (parseFloat(productFormData.discount_percentage) < 0 ||
        parseFloat(productFormData.discount_percentage) > 100)) {
     toast.error('Persentase diskon harus antara 0-100%!');
     return;
   }
   ```

### 4. **Testing**
   - ✅ Create product dengan diskon
   - ✅ Edit product untuk tambah/hapus diskon
   - ✅ Test scheduled discount (start/end date)
   - ✅ Verify harga final di checkout

---

## 📋 Summary

**Status:** ✅ Backend Ready, ⏳ Frontend UI Pending

**Backend:**
- ✅ Database migration run
- ✅ Model updated dengan discount fields
- ✅ Helper methods untuk calculate discount
- ✅ API response include discount data

**Frontend (Perlu Ditambahkan):**
- ⏳ Form input untuk set discount
- ⏳ Display discount badge di product list
- ⏳ Show final price dengan strikethrough
- ⏳ Validation untuk discount input

**Estimasi Waktu Frontend:** ~2-3 jam

---

Silakan mulai implement frontend UI sesuai example di atas! 🎉
