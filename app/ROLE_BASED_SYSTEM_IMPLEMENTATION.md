# Role-Based Access Control System Implementation

**Tanggal:** 2025-10-10
**Status:** ✅ IMPLEMENTED

---

## 📋 Overview

Sistem role-based access control (RBAC) telah diimplementasikan untuk memberikan pengalaman yang berbeda kepada setiap pengguna berdasarkan peran mereka dalam bisnis.

### Roles Hierarchy

```
1. super_admin  → Full system access (all features)
2. owner        → Full business access (all business features)
3. admin        → Business management access
4. kasir        → Cashier/POS access
5. kitchen      → Kitchen order management
6. waiter       → Table and order management
7. member       → Customer portal access
```

---

## 🎯 Features Implemented

### 1. ProtectedRoute Component ✅

**File:** `frontend/src/components/routes/ProtectedRoute.jsx`

Component untuk role-based access control dengan fitur:
- Check authentication status
- Verify business requirement
- Check role permissions
- Auto-redirect based on role

**Usage:**
```jsx
<ProtectedRoute allowedRoles={['owner', 'admin', 'kasir']}>
  <CashierPOS />
</ProtectedRoute>
```

### 2. Role-Specific Dashboards ✅

#### a. Owner/Admin Dashboard
**File:** `frontend/src/components/Dashboard.jsx`

**Features:**
- Full analytics and statistics
- Sales overview
- Top products
- Recent orders
- Quick actions for all features

**Allowed Roles:** `super_admin`, `owner`, `admin`

#### b. Kasir Dashboard
**File:** `frontend/src/components/dashboards/KasirDashboard.jsx`

**Features:**
- Quick access to POS/Cashier
- Today's transaction stats
- Recent transactions by cashier
- Sales summary
- Tips for cashier

**Allowed Roles:** `super_admin`, `owner`, `admin`, `kasir`

#### c. Kitchen Dashboard
**File:** `frontend/src/components/dashboards/KitchenDashboard.jsx`

**Features:**
- Active orders queue
- Order status management (pending → cooking → ready)
- Priority indicators
- Special notes from customers
- Kitchen tips

**Allowed Roles:** `super_admin`, `owner`, `admin`, `kitchen`

#### d. Waiter Dashboard
**File:** `frontend/src/components/dashboards/WaiterDashboard.jsx`

**Features:**
- Table status overview
- Active orders per table
- Order ready notifications
- Guest count
- Table management

**Allowed Roles:** `super_admin`, `owner`, `admin`, `waiter`

### 3. Role-Based Sidebar Navigation ✅

**File:** `frontend/src/components/Layout.jsx`

Sidebar menu items are filtered based on user role:

| Menu Item | Roles Allowed |
|-----------|---------------|
| Dashboard | super_admin, owner, admin |
| Kasir | super_admin, owner, admin, kasir |
| Dapur | super_admin, owner, admin, kitchen |
| Meja | super_admin, owner, admin, waiter |
| Penjualan | super_admin, owner, admin, kasir |
| Produk | super_admin, owner, admin |
| Bahan & Resep | super_admin, owner, admin, kitchen |
| Diskon & Promo | super_admin, owner, admin |
| Self Service | super_admin, owner, admin, kasir, waiter |
| Komisi Online | super_admin, owner, admin |
| Karyawan | super_admin, owner, admin |
| Keuangan | super_admin, owner, admin |
| Laporan | super_admin, owner, admin |

**Features:**
- Dynamic filtering based on user.role
- Role badge shown in user profile
- Only shows menu items user has access to

### 4. Role-Based Routing ✅

**File:** `frontend/src/App.js`

All routes wrapped with `ProtectedRoute` component with specific allowed roles.

**Example:**
```jsx
{/* Kasir Routes */}
<Route path='cashier' element={
  <PrivateRoute allowedRoles={['super_admin', 'owner', 'admin', 'kasir']}>
    <CashierPOS />
  </PrivateRoute>
} />

{/* Kitchen Routes */}
<Route path='kitchen' element={
  <PrivateRoute allowedRoles={['super_admin', 'owner', 'admin', 'kitchen']}>
    <KitchenDashboard />
  </PrivateRoute>
} />
```

### 5. Login Redirect Based on Role ✅

**Files Modified:**
- `frontend/src/contexts/AuthContext.jsx` - Return user data in login result
- `frontend/src/components/Auth/Login.jsx` - Redirect to role-specific home page

**Redirect Logic:**
```javascript
getRoleHomePath(role):
  - super_admin/owner/admin → '/' (Full Dashboard)
  - kasir → '/cashier' (Kasir Dashboard)
  - kitchen → '/kitchen' (Kitchen Dashboard)
  - waiter → '/tables' (Waiter Dashboard)
  - member → '/customer-portal' (Customer Portal)
```

**Flow:**
```
User Login
  ↓
Verify Credentials
  ↓
Get User Role from Response
  ↓
Redirect to Role-Specific Home
  ↓
Load Role-Specific Dashboard
```

---

## 🔐 Security Features

### 1. Route Protection
- All protected routes require authentication
- Routes check user role before rendering
- Unauthorized access redirects to role-appropriate page

### 2. Navigation Filtering
- Menu items dynamically filtered by role
- Prevents users from seeing inaccessible features
- Clean UI based on permissions

### 3. Business Scoping
- All operations scoped to current business
- Business ID sent in X-Business-Id header
- Users can't access other businesses' data

---

## 📊 Role Permissions Matrix

| Feature | Owner | Admin | Kasir | Kitchen | Waiter | Member |
|---------|-------|-------|-------|---------|--------|--------|
| Full Dashboard | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Kasir/POS | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Kitchen Orders | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Table Management | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Sales View | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Product Management | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Inventory/Recipe | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Promo Management | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Self Service | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Commission | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Employee Management | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Finance | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Reports | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

**Legend:**
- ✅ = Full Access
- ❌ = No Access
- 🔸 = Read-only Access

---

## 🎨 UI/UX Improvements

### 1. Role Badge
User's role is displayed in sidebar:
```jsx
<Badge className='bg-blue-100 text-blue-800'>
  {user.role === 'kasir' ? 'Kasir' : ...}
</Badge>
```

### 2. Dashboard Colors
Each role has distinct color scheme:
- **Owner/Admin:** Blue gradient (professional)
- **Kasir:** Blue (trust, transactions)
- **Kitchen:** Orange/Red gradient (heat, urgency)
- **Waiter:** Purple/Pink gradient (service, hospitality)

### 3. Contextual Content
- Kasir sees transaction-focused content
- Kitchen sees order queue
- Waiter sees table status
- Admin sees full analytics

---

## 🧪 Testing Scenarios

### Test 1: Owner Login
```
Login as: owner@business.com
Expected:
  ✓ Redirect to full dashboard (/)
  ✓ All menu items visible
  ✓ Badge shows "Owner"
```

### Test 2: Kasir Login
```
Login as: kasir@business.com
Expected:
  ✓ Redirect to kasir dashboard (/cashier)
  ✓ Only see: Kasir, Penjualan, Self Service menus
  ✓ Badge shows "Kasir"
  ✓ Can't access: Products, Employees, Finance, Reports
```

### Test 3: Kitchen Login
```
Login as: kitchen@business.com
Expected:
  ✓ Redirect to kitchen dashboard (/kitchen)
  ✓ Only see: Dapur, Bahan & Resep menus
  ✓ Badge shows "Kitchen"
  ✓ Can access order queue
```

### Test 4: Waiter Login
```
Login as: waiter@business.com
Expected:
  ✓ Redirect to waiter dashboard (/tables)
  ✓ Only see: Meja, Self Service menus
  ✓ Badge shows "Waiter"
  ✓ Can see table status and orders
```

### Test 5: Unauthorized Access
```
Action: Kasir tries to access /employees
Expected:
  ✓ Redirect to /cashier (kasir home)
  ✓ Show error or just redirect silently
```

---

## 📝 Code Structure

```
frontend/src/
├── components/
│   ├── routes/
│   │   └── ProtectedRoute.jsx          # Role-based access control
│   ├── dashboards/
│   │   ├── KasirDashboard.jsx         # Kasir-specific dashboard
│   │   ├── KitchenDashboard.jsx       # Kitchen-specific dashboard
│   │   └── WaiterDashboard.jsx        # Waiter-specific dashboard
│   ├── Dashboard.jsx                   # Owner/Admin full dashboard
│   ├── Layout.jsx                      # Role-filtered sidebar
│   └── Auth/
│       └── Login.jsx                   # Role-based redirect
├── contexts/
│   └── AuthContext.jsx                 # Auth with user role
└── App.js                              # Protected routes setup
```

---

## 🔄 Flow Diagrams

### Login Flow:
```
User enters credentials
  ↓
POST /api/login
  ↓
Receive { user, token }
  ↓
Save token & user to context
  ↓
Check user.role
  ↓
Redirect to role home page
  ↓
Load role-specific dashboard
```

### Navigation Flow:
```
User clicks menu item
  ↓
ProtectedRoute checks allowedRoles
  ↓
Is user.role in allowedRoles?
  ├─ YES → Render component
  └─ NO → Redirect to role home page
```

### Sidebar Render Flow:
```
Layout component loads
  ↓
Get user.role from context
  ↓
Filter allMenuItems by role
  ↓
Render only allowed menu items
  ↓
Show role badge in user profile
```

---

## 🚀 How to Use

### For Developers

**1. Protect a new route:**
```jsx
<Route path='/new-feature' element={
  <PrivateRoute allowedRoles={['owner', 'admin']}>
    <NewFeature />
  </PrivateRoute>
} />
```

**2. Add menu item:**
```javascript
{
  path: '/new-feature',
  label: 'New Feature',
  icon: IconComponent,
  color: 'text-blue-600',
  roles: ['owner', 'admin']  // Who can see this menu
}
```

**3. Create role-specific dashboard:**
```jsx
// Create: frontend/src/components/dashboards/RoleDashboard.jsx
const RoleDashboard = () => {
  return (
    <div>
      {/* Role-specific content */}
    </div>
  );
};
```

### For Business Owners

**1. Create Employee with Role:**
```
Navigate to: Karyawan → Tambah Karyawan
Fill form:
  - Name: John Doe
  - Email: john@business.com
  - Password: ******
  - Role: (will be set in backend)
```

**Note:** Currently role is set in database manually. Future enhancement: Add role selector in Employee form.

**2. Employee Login:**
```
Employee uses their email/password
System redirects based on role
Employee sees only features they need
```

---

## 🛠 Backend Integration

### Database Schema

**Table: users**
```sql
CREATE TABLE users (
  id BIGINT PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  password VARCHAR(255),
  role ENUM('super_admin', 'owner', 'admin', 'kasir', 'kitchen', 'waiter', 'member'),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### API Response Format

**POST /api/login**
```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@business.com",
    "role": "kasir"
  },
  "token": "Bearer eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**GET /api/user**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@business.com",
  "role": "kasir",
  "created_at": "2025-10-10T10:00:00.000000Z",
  "updated_at": "2025-10-10T10:00:00.000000Z"
}
```

---

## 📈 Future Enhancements

### 1. Role Selector in Employee Form ⏳
Add dropdown to select role when creating employee:
```jsx
<select name="role">
  <option value="admin">Admin</option>
  <option value="kasir">Kasir</option>
  <option value="kitchen">Kitchen</option>
  <option value="waiter">Waiter</option>
</select>
```

### 2. Permission Management UI ⏳
Allow owner to customize role permissions per business:
- Create custom roles
- Assign specific permissions
- Save to database

### 3. Activity Logging ⏳
Track user actions by role:
- Who accessed what
- When and from where
- Audit trail

### 4. Role-Based Notifications ⏳
Send different notifications based on role:
- Kitchen: New order notifications
- Waiter: Order ready notifications
- Kasir: Payment pending notifications
- Owner: Daily sales summary

### 5. Multi-Role Support ⏳
Allow user to have multiple roles:
- Owner can also be Kasir
- Admin can also be Waiter
- Switch between roles

---

## ✅ Implementation Checklist

- [x] Create ProtectedRoute component
- [x] Create role-specific dashboards (Kasir, Kitchen, Waiter)
- [x] Update App.js with role-based routing
- [x] Add role-based sidebar filtering
- [x] Implement login redirect by role
- [x] Add role badge in user profile
- [x] Test unauthorized access handling
- [x] Create documentation
- [ ] Add role selector in Employee form (Future)
- [ ] Create Permission Management UI (Future)
- [ ] Add activity logging (Future)

---

## 🐛 Known Issues

### Issue 1: Role Not Set for Existing Users
**Problem:** Existing users in database don't have role set.

**Workaround:** Manually update users table:
```sql
UPDATE users SET role = 'owner' WHERE id = 1;
UPDATE users SET role = 'kasir' WHERE id = 2;
```

**Permanent Fix:** Add role selector in Employee form (future enhancement).

### Issue 2: Member Role Not Implemented
**Problem:** Member role (customer portal) not yet built.

**Status:** Placeholder exists, needs implementation.

**Path:** `/customer-portal` redirects there but page doesn't exist yet.

---

## 📞 Support

If you encounter issues:

1. **Check role in database:**
   ```sql
   SELECT id, name, email, role FROM users;
   ```

2. **Verify token contains role:**
   - Open browser DevTools → Application → Local Storage
   - Check `token` value
   - Decode JWT at jwt.io

3. **Check console for errors:**
   - Open browser DevTools → Console
   - Look for "Unauthorized" or redirect loops

---

**Last Updated:** 2025-10-10
**Version:** 1.0.0
**Status:** ✅ Production Ready
