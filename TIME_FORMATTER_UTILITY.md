# ⏰ TIME FORMATTER UTILITY

## **📋 OVERVIEW**

Utility functions untuk formatting waktu yang user-friendly, menggantikan angka desimal yang aneh seperti "37.664118418599536 hari" dengan format yang lebih mudah dibaca.

## **🎯 FITUR UTAMA**

### **1. Smart Rounding**

- **< 1 hari**: Tampilkan dalam jam (12 jam tersisa)
- **1-7 hari**: 1 desimal (3.7 hari tersisa)
- **7+ hari**: Bulatkan ke angka bulat (38 hari tersisa)

### **2. Color Coding**

- **Merah**: Expired atau tidak ada waktu
- **Orange**: < 1 hari (urgent)
- **Kuning**: 1-3 hari (warning)
- **Biru**: 3-7 hari (attention)
- **Hijau**: 7+ hari (safe)

### **3. Multiple Formats**

- **Remaining Time**: Sisa waktu subscription
- **Trial Time**: Waktu trial khusus
- **Duration**: Durasi subscription
- **Status Color**: Warna berdasarkan urgency

## **🔧 FUNCTIONS**

### **1. `formatRemainingTime(daysRemaining)`**

Format sisa waktu subscription dengan pembulatan yang smart.

```javascript
formatRemainingTime(0.5)        // "12 jam tersisa"
formatRemainingTime(1.5)        // "1.5 hari tersisa"
formatRemainingTime(7)          // "7 hari tersisa"
formatRemainingTime(37.664...)  // "38 hari tersisa"
formatRemainingTime(0)          // "Tidak ada waktu tersisa"
```

### **2. `formatTrialRemainingTime(trialEndsAt)`**

Format khusus untuk trial subscription.

```javascript
formatTrialRemainingTime(null); // "Trial tidak aktif"
formatTrialRemainingTime(yesterday); // "Trial telah berakhir"
formatTrialRemainingTime(tomorrow); // "1 hari tersisa"
```

### **3. `formatDuration(days)`**

Format durasi subscription dengan unit yang sesuai.

```javascript
formatDuration(0.5); // "12 jam"
formatDuration(1.5); // "1.5 hari"
formatDuration(14); // "2 minggu"
formatDuration(60); // "2 bulan"
formatDuration(365); // "1 tahun"
```

### **4. `getTimeStatusColor(daysRemaining)`**

Return CSS class untuk warna berdasarkan urgency.

```javascript
getTimeStatusColor(0); // "text-red-600"
getTimeStatusColor(0.5); // "text-orange-600"
getTimeStatusColor(2); // "text-yellow-600"
getTimeStatusColor(5); // "text-blue-600"
getTimeStatusColor(15); // "text-green-600"
```

## **📊 BEFORE vs AFTER**

### **Before (Angka Aneh):**

```
37.664118418599536 hari tersisa
2.123456789012345 hari tersisa
0.041666666666666664 hari tersisa
```

### **After (User-Friendly):**

```
38 hari tersisa
2.1 hari tersisa
1 jam tersisa
```

## **🎨 IMPLEMENTASI**

### **1. Import Utility**

```javascript
import {
  formatRemainingTime,
  getTimeStatusColor,
} from "../../utils/timeFormatter";
```

### **2. Replace Complex Logic**

```javascript
// Before
{
  (() => {
    const daysRemaining =
      currentSubscription.daysRemaining ||
      Math.max(
        0,
        (new Date(currentSubscription.ends_at) - new Date()) /
          (1000 * 60 * 60 * 24)
      );

    if (daysRemaining < 1) {
      const hours = Math.round(daysRemaining * 24);
      return `${hours} jam tersisa`;
    }

    if (daysRemaining < 7) {
      return `${Math.round(daysRemaining * 10) / 10} hari tersisa`;
    }

    return `${Math.round(daysRemaining)} hari tersisa`;
  })();
}

// After
{
  formatRemainingTime(
    currentSubscription.daysRemaining ||
      Math.max(
        0,
        (new Date(currentSubscription.ends_at) - new Date()) /
          (1000 * 60 * 60 * 24)
      )
  );
}
```

### **3. Add Color Coding**

```javascript
<p className={`text-sm mt-1 ${getTimeStatusColor(daysRemaining)}`}>
  {formatRemainingTime(daysRemaining)}
</p>
```

## **🧪 TESTING**

### **Test Cases:**

```javascript
// Hours
formatRemainingTime(0.5); // "12 jam tersisa"
formatRemainingTime(0.1); // "2 jam tersisa"

// Days with decimal
formatRemainingTime(1.5); // "1.5 hari tersisa"
formatRemainingTime(3.7); // "3.7 hari tersisa"

// Whole days
formatRemainingTime(7); // "7 hari tersisa"
formatRemainingTime(15); // "15 hari tersisa"

// User's specific case
formatRemainingTime(37.664118418599536); // "38 hari tersisa"
```

### **Color Tests:**

```javascript
getTimeStatusColor(0); // "text-red-600"    (expired)
getTimeStatusColor(0.5); // "text-orange-600" (urgent)
getTimeStatusColor(2); // "text-yellow-600" (warning)
getTimeStatusColor(5); // "text-blue-600"   (attention)
getTimeStatusColor(15); // "text-green-600"  (safe)
```

## **📈 BENEFITS**

### **1. User Experience**

- **Readable**: Angka yang mudah dibaca
- **Intuitive**: Format yang masuk akal
- **Visual**: Color coding untuk urgency
- **Consistent**: Format yang konsisten di seluruh app

### **2. Developer Experience**

- **Reusable**: Utility function yang bisa digunakan di mana saja
- **Maintainable**: Logic terpusat di satu tempat
- **Testable**: Unit tests yang comprehensive
- **Type Safe**: JSDoc untuk type hints

### **3. Performance**

- **Lightweight**: Function yang ringan
- **Cached**: Tidak ada expensive calculations
- **Optimized**: Logic yang efisien

## **🔄 MIGRATION**

### **Files Updated:**

1. `SubscriptionSettings.jsx` - Main subscription display
2. `SubscriptionBadge.jsx` - Navbar badge
3. `timeFormatter.js` - New utility functions
4. `timeFormatter.test.js` - Unit tests

### **Before Migration:**

```javascript
// Complex inline logic
{Math.round(daysRemaining * 10) / 10} hari tersisa
```

### **After Migration:**

```javascript
// Clean utility function
{
  formatRemainingTime(daysRemaining);
}
```

## **🎉 KESIMPULAN**

Utility `timeFormatter` memberikan:

✅ **User-Friendly**: Format waktu yang mudah dibaca
✅ **Consistent**: Format yang konsisten di seluruh app
✅ **Visual**: Color coding untuk urgency
✅ **Maintainable**: Code yang mudah di-maintain
✅ **Testable**: Unit tests yang comprehensive
✅ **Reusable**: Bisa digunakan di komponen lain

**Sekarang tidak ada lagi angka desimal aneh seperti "37.664118418599536 hari"!** 🎉

## **📞 USAGE EXAMPLES**

### **Basic Usage:**

```javascript
import {
  formatRemainingTime,
  getTimeStatusColor,
} from "../../utils/timeFormatter";

// Format time
const timeText = formatRemainingTime(37.664118418599536);
// Result: "38 hari tersisa"

// Get color class
const colorClass = getTimeStatusColor(37.664118418599536);
// Result: "text-green-600"

// Use in JSX
<p className={`text-sm ${colorClass}`}>{timeText}</p>;
```

### **Advanced Usage:**

```javascript
// Trial specific
const trialTime = formatTrialRemainingTime(trialEndsAt);

// Duration formatting
const duration = formatDuration(30); // "1 bulan"

// Conditional rendering
{
  timeRemaining > 0 && (
    <span className={getTimeStatusColor(timeRemaining)}>
      {formatRemainingTime(timeRemaining)}
    </span>
  );
}
```












































































