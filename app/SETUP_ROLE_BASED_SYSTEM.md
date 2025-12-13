# Quick Setup Guide - Role-Based System

**Tanggal:** 2025-10-10

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Update Existing Users with Roles

Login ke MySQL dan jalankan:

```sql
-- Update owner/admin (user yang sudah ada)
UPDATE users SET role = 'owner' WHERE email = 'your-email@example.com';

-- Atau jika ingin semua user jadi owner
UPDATE users SET role = 'owner' WHERE role IS NULL;
```

### Step 2: Create Test Users for Each Role

**Option A: Via Database**
```sql
-- Kasir
INSERT INTO users (name, email, password, role, created_at, updated_at)
VALUES (
  'Test Kasir',
  'kasir@test.com',
  '$2y$12$Ot5P.wOdH3oa8C0Yb8UJWe9dZk3qKxWLFZIhXfGhXt5vG7nPH1Z7u', -- password: 123456
  'kasir',
  NOW(),
  NOW()
);

-- Kitchen
INSERT INTO users (name, email, password, role, created_at, updated_at)
VALUES (
  'Test Kitchen',
  'kitchen@test.com',
  '$2y$12$Ot5P.wOdH3oa8C0Yb8UJWe9dZk3qKxWLFZIhXfGhXt5vG7nPH1Z7u', -- password: 123456
  'kitchen',
  NOW(),
  NOW()
);

-- Waiter
INSERT INTO users (name, email, password, role, created_at, updated_at)
VALUES (
  'Test Waiter',
  'waiter@test.com',
  '$2y$12$Ot5P.wOdH3oa8C0Yb8UJWe9dZk3qKxWLFZIhXfGhXt5vG7nPH1Z7u', -- password: 123456
  'waiter',
  NOW(),
  NOW()
);
```

**Option B: Via Laravel Tinker**
```bash
cd backend
php artisan tinker
```

```php
// Create Kasir
User::create([
    'name' => 'Test Kasir',
    'email' => 'kasir@test.com',
    'password' => Hash::make('123456'),
    'role' => 'kasir'
]);

// Create Kitchen
User::create([
    'name' => 'Test Kitchen',
    'email' => 'kitchen@test.com',
    'password' => Hash::make('123456'),
    'role' => 'kitchen'
]);

// Create Waiter
User::create([
    'name' => 'Test Waiter',
    'email' => 'waiter@test.com',
    'password' => Hash::make('123456'),
    'role' => 'waiter'
]);
```

### Step 3: Test Login

**Test each role:**

1. **Owner/Admin:**
   - Email: `your-email@example.com`
   - Should redirect to `/` (Full Dashboard)
   - Should see all menu items

2. **Kasir:**
   - Email: `kasir@test.com`
   - Password: `123456`
   - Should redirect to `/cashier` (Kasir Dashboard)
   - Should only see: Kasir, Penjualan, Self Service

3. **Kitchen:**
   - Email: `kitchen@test.com`
   - Password: `123456`
   - Should redirect to `/kitchen` (Kitchen Dashboard)
   - Should only see: Dapur, Bahan & Resep

4. **Waiter:**
   - Email: `waiter@test.com`
   - Password: `123456`
   - Should redirect to `/tables` (Waiter Dashboard)
   - Should only see: Meja, Self Service

---

## ✅ Verification Checklist

After setup, verify these work:

- [ ] Owner login → Full Dashboard with all stats
- [ ] Kasir login → Kasir Dashboard with transaction focus
- [ ] Kitchen login → Kitchen Dashboard with order queue
- [ ] Waiter login → Waiter Dashboard with table status
- [ ] Sidebar shows different menus for each role
- [ ] Role badge appears in user profile
- [ ] Kasir can't access `/employees` (redirected to `/cashier`)
- [ ] Kitchen can't access `/finance` (redirected to `/kitchen`)
- [ ] Waiter can't access `/reports` (redirected to `/tables`)

---

## 🔧 Troubleshooting

### Problem 1: Login succeeds but redirects to blank page

**Check:**
```sql
SELECT id, name, email, role FROM users WHERE email = 'your@email.com';
```

If `role` is `NULL`:
```sql
UPDATE users SET role = 'owner' WHERE email = 'your@email.com';
```

### Problem 2: Menu items not showing

**Frontend Console Check:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Type: `localStorage.getItem('token')`
4. Copy the token
5. Decode at https://jwt.io
6. Check if role is present in token

**Fix:** Re-login to get new token with role.

### Problem 3: Can access unauthorized routes

**Check ProtectedRoute wrapper:**
Open `frontend/src/App.js` and verify routes are wrapped:
```jsx
<Route path='employees' element={
  <PrivateRoute allowedRoles={['super_admin', 'owner', 'admin']}>
    <EmployeeManagement />
  </PrivateRoute>
} />
```

---

## 🎯 Using the System

### For Business Owner (You)

**1. Create employees via Employee Management:**
- Go to "Karyawan" menu
- Click "Tambah Karyawan"
- Fill in employee details
- Employee account is auto-created

**2. Set employee role in database:**
```sql
-- Find the employee's user_id from employees table
SELECT id, user_id, name, email FROM employees WHERE email = 'employee@email.com';

-- Update user's role
UPDATE users SET role = 'kasir' WHERE id = {user_id};
```

**3. Give login credentials to employee:**
- Email: employee@email.com
- Password: (whatever you set when creating employee)

### For Employees

**Kasir:**
1. Login with provided credentials
2. Automatically redirected to Kasir Dashboard
3. Click "Buka Kasir" to start transactions
4. View personal sales stats

**Kitchen:**
1. Login with provided credentials
2. Automatically redirected to Kitchen Dashboard
3. See order queue
4. Update order status: Mulai Masak → Tandai Selesai

**Waiter:**
1. Login with provided credentials
2. Automatically redirected to Waiter Dashboard
3. See table status
4. Create orders for tables
5. Get notifications when food is ready

---

## 🔑 Default Credentials for Testing

After running setup SQL above:

| Role | Email | Password | Home Page |
|------|-------|----------|-----------|
| Owner/Admin | your-email@example.com | (your password) | `/` |
| Kasir | kasir@test.com | 123456 | `/cashier` |
| Kitchen | kitchen@test.com | 123456 | `/kitchen` |
| Waiter | waiter@test.com | 123456 | `/tables` |

⚠️ **IMPORTANT:** Change these passwords in production!

---

## 📱 Mobile Testing

Test on different devices:
1. **Desktop:** Full layout, all features visible
2. **Tablet:** Responsive layout, sidebar collapsible
3. **Mobile:** Compact layout, mobile-optimized buttons

---

## 🔄 Making Changes

### Add a new menu item:

**1. In `frontend/src/components/Layout.jsx`:**
```javascript
{
  path: '/new-feature',
  label: 'New Feature',
  icon: IconName,
  color: 'text-blue-600',
  roles: ['owner', 'admin', 'kasir']  // Who can access
}
```

**2. In `frontend/src/App.js`:**
```jsx
<Route path='new-feature' element={
  <PrivateRoute allowedRoles={['owner', 'admin', 'kasir']}>
    <NewFeature />
  </PrivateRoute>
} />
```

### Change role permissions:

**1. To give Kitchen access to Products:**

Update in `Layout.jsx`:
```javascript
{
  path: '/products',
  label: 'Produk',
  icon: Package,
  color: 'text-indigo-600',
  roles: ['super_admin', 'owner', 'admin', 'kitchen']  // Added kitchen
}
```

Update in `App.js`:
```jsx
<Route path='products' element={
  <PrivateRoute allowedRoles={['super_admin', 'owner', 'admin', 'kitchen']}>
    <ProductManagement />
  </PrivateRoute>
} />
```

---

## 📊 Monitoring Usage

### Check who's logged in:
```sql
SELECT
  u.id,
  u.name,
  u.email,
  u.role,
  u.last_login_at
FROM users u
ORDER BY u.last_login_at DESC;
```

### See employee activity:
```sql
SELECT
  e.name as employee_name,
  u.role,
  COUNT(o.id) as order_count,
  SUM(o.total_amount) as total_sales
FROM employees e
JOIN users u ON e.user_id = u.id
LEFT JOIN orders o ON e.id = o.employee_id
WHERE o.created_at >= CURDATE()
GROUP BY e.id
ORDER BY total_sales DESC;
```

---

## 🎓 Training Staff

### For Kasir:
1. Show how to login
2. Explain Kasir Dashboard
3. Demonstrate POS/Cashier functionality
4. Show where to see their stats

### For Kitchen:
1. Show how to login
2. Explain order queue
3. Show how to update status
4. Emphasize checking customer notes

### For Waiter:
1. Show how to login
2. Explain table layout
3. Show how to create orders
4. Demonstrate order tracking

---

## 🆘 Support

If something doesn't work:

1. **Check logs:**
   ```bash
   # Backend logs
   tail -f backend/storage/logs/laravel.log

   # Frontend console
   # Open browser DevTools → Console
   ```

2. **Verify database:**
   ```sql
   SELECT * FROM users WHERE email = 'problem@email.com';
   ```

3. **Check documentation:**
   - `ROLE_BASED_SYSTEM_IMPLEMENTATION.md` - Full details
   - `ROLE_BASED_SYSTEM_SUMMARY.md` - Quick reference
   - `ROLE_BASED_VISUAL_GUIDE.md` - Visual preview

---

## ✨ You're Done!

Your role-based system is now ready to use! 🎉

**Next steps:**
1. Create real employee accounts
2. Set their roles
3. Give them login credentials
4. Train them on their dashboard
5. Monitor usage and performance

---

**Created:** 2025-10-10
**Version:** 1.0.0
