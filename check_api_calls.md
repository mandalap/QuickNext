# 🔍 Check API Calls di Browser

## **Langkah untuk Check API Calls:**

### **1. Buka Browser Developer Tools:**

1. Buka halaman kasir (`localhost:3000/cashier`)
2. Tekan **F12** untuk buka Developer Tools
3. Go to **Network** tab

### **2. Filter Network Requests:**

1. Klik **Fetch/XHR** untuk filter hanya API calls
2. Refresh halaman (Ctrl + F5)
3. Cari request ke:
   - `/api/v1/sales/stats`
   - `/api/v1/sales/orders`

### **3. Check Request Details:**

1. Klik request `/api/v1/sales/stats`
2. Go to **Headers** tab
3. Check apakah ada:
   - `Authorization: Bearer ...`
   - `X-Business-Id: 1`
   - `X-Outlet-Id: ...`

### **4. Check Response:**

1. Go to **Response** tab
2. Lihat data yang dikembalikan:
   ```json
   {
     "success": true,
     "data": {
       "total_transactions": 0,
       "total_sales": 0,
       "total_items": 0,
       "total_revenue": 0
     }
   }
   ```

### **5. Check Console Tab:**

1. Go to **Console** tab
2. Lihat log yang muncul:
   - 🔄 Loading transaction data...
   - 📊 Stats result: ...
   - ✅/❌ Stats data: ...

## **Expected Results:**

### **Jika API Call Berhasil:**

- Request status: 200 OK
- Response: `{"success": true, "data": {...}}`
- Console: ✅ Stats data: {...}

### **Jika API Call Gagal:**

- Request status: 400/500 Error
- Response: `{"success": false, "message": "..."}`
- Console: ❌ No stats data or error: {...}

## **Common Issues:**

### **1. No API Calls:**

- Frontend tidak memanggil API
- Check apakah `loadTransactionData()` dipanggil

### **2. API Error:**

- Check Laravel logs: `tail -f storage/logs/laravel.log`
- Check request headers
- Check business_id

### **3. Empty Response:**

- Check database data
- Check timezone
- Check employee_id filtering

## **Next Steps:**

1. **Jika tidak ada API calls**: Check frontend code
2. **Jika API error**: Check Laravel logs
3. **Jika response empty**: Check database dengan script debug
