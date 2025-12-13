# 🍽️ WAITER POS INTEGRATION

## **📋 OVERVIEW**

Waiter POS adalah halaman khusus untuk waiter yang terintegrasi dengan meja. Berbeda dengan Kasir POS yang umum, Waiter POS memungkinkan waiter untuk:

1. **Pilih meja** sebelum membuat pesanan
2. **Otomatis assign pesanan** ke meja yang dipilih
3. **Update status meja** otomatis saat pesanan dibuat
4. **Interface yang disesuaikan** untuk workflow waiter

## **🔗 INTEGRATION WITH TABLES**

### **URL Structure**

```
/tables/pos?table={table_id}&number={table_number}
```

### **Table Selection Flow**

1. **Waiter Dashboard** (`/tables`) - Lihat semua meja
2. **Klik tombol "Pesan"** pada meja yang tersedia
3. **Redirect ke Waiter POS** dengan parameter meja
4. **Otomatis load meja** yang dipilih
5. **Buat pesanan** untuk meja tersebut

## **🏠 WAITER POS FEATURES**

### **1. Table Selection Screen**

- **Tampilan**: Grid semua meja yang tersedia
- **Status Badge**:
  - 🟢 **Tersedia** (Available) - Bisa dipilih
  - 🔴 **Terisi** (Occupied) - Tidak bisa dipilih
  - 🟡 **Reservasi** (Reserved) - Tidak bisa dipilih
- **Info Meja**: Nomor meja, kapasitas, status
- **Action**: Klik meja untuk memilih

### **2. Order Creation Screen**

- **Header**:
  - Tombol "Kembali" ke dashboard
  - Info meja yang dipilih
  - Tombol "Ganti Meja"
- **Table Info Card**:
  - Nomor meja
  - Status meja
  - Kapasitas kursi
  - Tombol ganti meja

### **3. Product Selection**

- **Search Bar**: Cari produk berdasarkan nama
- **Category Filter**: Filter berdasarkan kategori
- **Product Grid**: Tampilan grid produk
- **Add to Cart**: Klik produk untuk tambah ke keranjang

### **4. Cart Management**

- **Cart Items**: Daftar item di keranjang
- **Quantity Control**: +/- untuk mengubah jumlah
- **Remove Item**: Hapus item dari keranjang
- **Clear Cart**: Kosongkan seluruh keranjang

### **5. Customer Selection**

- **Select Customer**: Pilih pelanggan dari database
- **Walk-in Customer**: Default untuk pelanggan umum
- **Customer Info**: Tampilkan info pelanggan yang dipilih

### **6. Discount Management**

- **Coupon Code**: Input kode kupon
- **Apply Discount**: Terapkan diskon
- **Remove Discount**: Hapus diskon

### **7. Order Summary**

- **Subtotal**: Total sebelum diskon dan pajak
- **Discount**: Jumlah diskon
- **Tax**: Pajak 10%
- **Total**: Total akhir
- **Process Payment**: Tombol proses pembayaran

## **🔄 WORKFLOW INTEGRATION**

### **1. Table Status Management**

```javascript
// Saat pesanan dibuat, meja otomatis diubah ke 'occupied'
if (selectedTable && selectedTable.status === "available") {
  await tableService.updateStatus(selectedTable.id, "occupied");
  toast.success("Status meja diubah menjadi terisi");
}
```

### **2. Order Assignment**

```javascript
// Pesanan otomatis di-assign ke meja
const orderData = {
  table_id: selectedTable?.id || null,
  notes: `Meja ${selectedTable.number} - ${customerInfo}`,
  // ... other order data
};
```

### **3. URL State Management**

```javascript
// Update URL saat ganti meja
const newUrl = new URL(window.location);
newUrl.searchParams.set("table", table.id);
newUrl.searchParams.set("number", table.number);
window.history.replaceState({}, "", newUrl);
```

## **🎯 USER EXPERIENCE**

### **For Waiters**

1. **Login** sebagai waiter
2. **Dashboard** - Lihat status semua meja
3. **Klik "Pesan"** pada meja yang tersedia
4. **Waiter POS** - Interface khusus untuk meja tersebut
5. **Buat pesanan** dengan produk, pelanggan, diskon
6. **Proses pembayaran** - Selesai
7. **Kembali ke dashboard** - Monitor pesanan

### **For Customers**

1. **Duduk di meja** yang tersedia
2. **Waiter datang** dan klik "Pesan" di meja mereka
3. **Waiter input pesanan** di Waiter POS
4. **Pesanan ter-assign** ke meja mereka
5. **Pembayaran** dilakukan di meja
6. **Receipt** dicetak untuk pelanggan

## **🔧 TECHNICAL IMPLEMENTATION**

### **Components Created**

- `WaiterPOS.jsx` - Main component untuk waiter POS
- Route `/tables/pos` - Route khusus untuk waiter POS
- Integration dengan `WaiterDashboard.jsx`

### **Services Used**

- `tableService` - Table management
- `productService` - Product data
- `categoryService` - Category data
- `orderService` - Order creation
- `discountService` - Discount management

### **State Management**

- **Selected Table**: Meja yang sedang diproses
- **Cart**: Item yang dipilih
- **Customer**: Pelanggan yang dipilih
- **Discount**: Diskon yang diterapkan

## **📱 RESPONSIVE DESIGN**

### **Desktop (1024px+)**

- **3-column layout**: Products (2 cols) + Cart (1 col)
- **Large product grid**: 3 columns
- **Full table info**: Complete table details

### **Tablet (768px-1023px)**

- **2-column layout**: Products + Cart
- **Medium product grid**: 2 columns
- **Compact table info**: Essential details only

### **Mobile (< 768px)**

- **1-column layout**: Stacked layout
- **Small product grid**: 2 columns
- **Minimal table info**: Key details only

## **🎨 UI/UX FEATURES**

### **Visual Indicators**

- **Table Status**: Color-coded badges
- **Cart Items**: Clear quantity controls
- **Product Selection**: Hover effects
- **Loading States**: Spinner animations

### **User Feedback**

- **Toast Messages**: Success/error notifications
- **Button States**: Disabled/enabled states
- **Progress Indicators**: Loading spinners
- **Confirmation Dialogs**: Payment confirmation

### **Navigation**

- **Breadcrumb**: Dashboard > Waiter POS > Meja X
- **Back Button**: Return to dashboard
- **Table Switcher**: Change table without losing cart
- **Quick Actions**: Common operations

## **🔍 INTEGRATION POINTS**

### **1. Waiter Dashboard Integration**

```javascript
// Tombol "Pesan" di setiap meja
<Button
  onClick={() =>
    navigate(`/tables/pos?table=${table.id}&number=${table.number}`)
  }
>
  Pesan
</Button>
```

### **2. Table Service Integration**

```javascript
// Update table status saat pesanan dibuat
await tableService.updateStatus(selectedTable.id, "occupied");
```

### **3. Order Service Integration**

```javascript
// Assign pesanan ke meja
const orderData = {
  table_id: selectedTable?.id,
  notes: `Meja ${selectedTable.number}`,
  // ... other data
};
```

## **🚀 BENEFITS**

### **For Waiters**

- **Streamlined Workflow**: Langsung pilih meja dan buat pesanan
- **No Confusion**: Pesanan otomatis ter-assign ke meja
- **Efficient Service**: Interface yang disesuaikan untuk waiter
- **Real-time Updates**: Status meja update otomatis

### **For Restaurant**

- **Better Organization**: Pesanan ter-organisir per meja
- **Reduced Errors**: Tidak ada kesalahan assign meja
- **Improved Service**: Waiter lebih fokus pada pelayanan
- **Data Accuracy**: Data pesanan lebih akurat

### **For Customers**

- **Faster Service**: Waiter lebih efisien
- **Accurate Orders**: Pesanan tidak salah meja
- **Better Experience**: Pelayanan yang lebih baik

## **📊 MONITORING & ANALYTICS**

### **Order Tracking**

- **Table-based Orders**: Pesanan per meja
- **Waiter Performance**: Produktivitas waiter
- **Table Utilization**: Penggunaan meja
- **Order Accuracy**: Akurasi pesanan

### **Real-time Updates**

- **Table Status**: Update real-time
- **Order Status**: Tracking pesanan
- **Payment Status**: Status pembayaran
- **Kitchen Status**: Status dapur

## **🎉 CONCLUSION**

Waiter POS Integration memberikan:

✅ **Table Integration** - Pesanan ter-integrasi dengan meja
✅ **Streamlined Workflow** - Workflow waiter yang efisien
✅ **Better UX** - Interface yang user-friendly
✅ **Real-time Updates** - Update status otomatis
✅ **Error Prevention** - Mengurangi kesalahan assign meja

**Waiter sekarang dapat melayani pelanggan dengan lebih efisien dan akurat!** 🚀

## **📞 USAGE INSTRUCTIONS**

### **For Testing:**

1. **Login** sebagai waiter (`waiter@test.com` / `password123`)
2. **Dashboard** - Lihat semua meja
3. **Klik "Pesan"** pada meja yang tersedia
4. **Waiter POS** - Buat pesanan untuk meja tersebut
5. **Test workflow** - Pilih produk, customer, diskon, pembayaran
6. **Verify integration** - Cek status meja dan pesanan

### **For Development:**

1. **Check routes** - `/tables/pos` dengan parameter meja
2. **Verify services** - tableService, orderService integration
3. **Test state management** - Table selection, cart, customer
4. **Check responsive** - Test di berbagai ukuran layar












































































