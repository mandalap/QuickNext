# Multi-Outlet POS System Architecture

## 📋 Document Information
- **Project**: Kasir POS System
- **Version**: 2.0 (Multi-Outlet)
- **Last Updated**: 2025-10-11
- **Author**: System Architect

---

## 🏗️ System Overview

### Current State (v1.0)
```
User → Login → Select Business → Access All Features
```
**Issues:**
- ❌ No outlet assignment for employees
- ❌ Staff can access all outlets in a business
- ❌ No outlet-specific inventory
- ❌ No outlet-specific promotions
- ❌ No role-based outlet access control

### Target State (v2.0)
```
User → Login → Role Detection → Outlet Assignment → Outlet-Scoped Features
```
**Goals:**
- ✅ Employees assigned to specific outlets
- ✅ Staff can only access their assigned outlet
- ✅ Outlet-specific inventory tracking
- ✅ Outlet-specific promotions
- ✅ Multi-level access control

---

## 👥 Role Hierarchy & Access Control

### 1. Role Levels

```
Level 1: Super Owner (Platform Admin)
  ├─ Access: ALL businesses, ALL outlets
  ├─ Can: Create businesses, assign owners
  └─ Dashboard: Platform-wide statistics

Level 2: Business Owner
  ├─ Access: Assigned business(es), ALL outlets within
  ├─ Can: Manage outlets, assign managers, view all data
  └─ Dashboard: Business-wide with outlet comparison

Level 3: Outlet Manager
  ├─ Access: 1 business, 1 specific outlet
  ├─ Can: Manage staff, inventory, operations for their outlet
  └─ Dashboard: Single outlet performance

Level 4: Staff (Kasir/Kitchen/Waiter)
  ├─ Access: 1 business, 1 specific outlet
  ├─ Can: Perform job duties (POS, cook, serve)
  └─ Dashboard: Role-specific workspace (no management)
```

### 2. Access Matrix

| Feature | Super Owner | Business Owner | Outlet Manager | Kasir | Kitchen | Waiter |
|---------|------------|----------------|----------------|-------|---------|--------|
| **Business Management** |
| Create Business | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Edit Business | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete Business | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| View All Businesses | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Outlet Management** |
| Create Outlet | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Edit Outlet | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete Outlet | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| View All Outlets | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| View Assigned Outlet | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Staff Management** |
| Hire Staff (Global) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Assign to Outlet | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage Outlet Staff | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Operations** |
| POS / Cashier | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Kitchen Orders | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Table Management | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| **Inventory** |
| Manage Products (Global) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage Outlet Stock | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Outlet Stock | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Reports** |
| All Outlets Report | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Single Outlet Report | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Promotions** |
| Create Global Promo | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create Outlet Promo | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 🗄️ Database Schema Changes

### 1. New Tables

#### `user_outlets` (Junction Table)
```sql
CREATE TABLE user_outlets (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    outlet_id BIGINT UNSIGNED NOT NULL,
    role ENUM('manager', 'kasir', 'kitchen', 'waiter') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by BIGINT UNSIGNED NULL, -- User who assigned them
    notes TEXT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,

    UNIQUE KEY unique_user_outlet (user_id, outlet_id),
    INDEX idx_outlet_role (outlet_id, role),
    INDEX idx_user_active (user_id, is_active)
);
```

**Rationale:**
- Many-to-many relationship (staff can work at multiple outlets)
- Tracks who assigned them and when
- Role per outlet (same person can be kasir at outlet A, manager at outlet B)

#### `product_outlets` (Inventory per Outlet)
```sql
CREATE TABLE product_outlets (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    product_id BIGINT UNSIGNED NOT NULL,
    outlet_id BIGINT UNSIGNED NOT NULL,
    stock INT DEFAULT 0,
    min_stock INT DEFAULT 0,
    max_stock INT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    price_override DECIMAL(15,2) NULL, -- NULL = use product default price
    last_restock_at TIMESTAMP NULL,
    last_restock_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,

    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE,
    FOREIGN KEY (last_restock_by) REFERENCES users(id) ON DELETE SET NULL,

    UNIQUE KEY unique_product_outlet (product_id, outlet_id),
    INDEX idx_outlet_available (outlet_id, is_available),
    INDEX idx_low_stock (outlet_id, stock, min_stock)
);
```

**Rationale:**
- Each outlet maintains its own inventory
- Can override product price per outlet (e.g., airport location higher price)
- Track who last restocked

#### `inventory_movements` (Stock Transfer Tracking)
```sql
CREATE TABLE inventory_movements (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    product_id BIGINT UNSIGNED NOT NULL,
    from_outlet_id BIGINT UNSIGNED NULL, -- NULL = supplier/external
    to_outlet_id BIGINT UNSIGNED NULL,   -- NULL = waste/loss
    quantity INT NOT NULL,
    type ENUM('transfer', 'restock', 'adjustment', 'sale', 'waste') NOT NULL,
    reason TEXT NULL,
    cost_per_unit DECIMAL(15,2) NULL,
    total_cost DECIMAL(15,2) NULL,
    performed_by BIGINT UNSIGNED NOT NULL,
    approved_by BIGINT UNSIGNED NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (from_outlet_id) REFERENCES outlets(id) ON DELETE SET NULL,
    FOREIGN KEY (to_outlet_id) REFERENCES outlets(id) ON DELETE SET NULL,
    FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,

    INDEX idx_outlet_movements (from_outlet_id, to_outlet_id, created_at),
    INDEX idx_product_date (product_id, created_at)
);
```

**Rationale:**
- Track all stock movements between outlets
- Audit trail for inventory changes
- Support for inter-outlet transfers

### 2. Modified Tables

#### `employees` table - ADD outlet_id
```sql
ALTER TABLE employees
ADD COLUMN default_outlet_id BIGINT UNSIGNED NULL AFTER business_id,
ADD FOREIGN KEY (default_outlet_id) REFERENCES outlets(id) ON DELETE SET NULL;

-- Note: Use user_outlets table for actual assignments
-- default_outlet_id is just for quick reference
```

#### `discounts` table - ADD outlet_id
```sql
ALTER TABLE discounts
ADD COLUMN outlet_id BIGINT UNSIGNED NULL AFTER business_id,
ADD COLUMN scope ENUM('global', 'outlet') DEFAULT 'global' AFTER outlet_id,
ADD FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE;

-- NULL outlet_id + scope='global' = All outlets
-- Specific outlet_id + scope='outlet' = Single outlet only
```

#### `orders` table - Already has outlet_id ✓
```sql
-- Already exists, but ensure proper indexing
ALTER TABLE orders
ADD INDEX idx_outlet_date (outlet_id, created_at),
ADD INDEX idx_outlet_status (outlet_id, status, payment_status);
```

#### `products` table - ADD global flag
```sql
ALTER TABLE products
ADD COLUMN is_global BOOLEAN DEFAULT FALSE AFTER business_id,
ADD COLUMN requires_outlet_stock BOOLEAN DEFAULT TRUE;

-- is_global = TRUE: Available in all outlets (digital products, services)
-- requires_outlet_stock = FALSE: No inventory tracking (services)
```

### 3. Migration Order

```bash
# Phase 1: Core Structure
1. create_user_outlets_table
2. create_product_outlets_table
3. create_inventory_movements_table

# Phase 2: Modifications
4. add_outlet_to_employees
5. add_outlet_to_discounts
6. add_global_to_products

# Phase 3: Indexes
7. add_outlet_indexes
```

---

## 🔐 Authentication & Session Management

### 1. Auth Context Structure

```javascript
// frontend/src/contexts/AuthContext.js

const AuthContext = {
  // User Info
  user: {
    id: 1,
    name: "John Doe",
    email: "john@example.com",
    role: "owner", // super_admin, owner, manager, kasir, kitchen, waiter
  },

  // Business Context
  businesses: [
    { id: 1, name: "Resto A" },
    { id: 2, name: "Cafe B" }
  ],
  currentBusiness: {
    id: 1,
    name: "Resto A",
    // ... other business data
  },

  // Outlet Context (NEW!)
  outlets: [
    { id: 1, name: "Cabang Senayan", business_id: 1 },
    { id: 2, name: "Cabang BSD", business_id: 1 }
  ],
  currentOutlet: {
    id: 1,
    name: "Cabang Senayan",
    business_id: 1,
    // ... other outlet data
  },

  // User Assignments (NEW!)
  userAssignments: {
    canAccessAllOutlets: true, // true for owner/super_admin
    assignedOutlets: [1, 2],   // outlet IDs user can access
    rolePerOutlet: {
      1: "manager",  // role at outlet 1
      2: "kasir"     // role at outlet 2
    }
  },

  // Methods
  switchBusiness: (businessId) => {},
  switchOutlet: (outletId) => {},   // NEW!
  logout: () => {}
};
```

### 2. LocalStorage Structure

```javascript
// Keys stored in localStorage
{
  "token": "Bearer eyJ...",
  "user": {...},
  "currentBusinessId": 1,
  "currentOutletId": 1,        // NEW!
  "userAssignments": {...}     // NEW!
}
```

### 3. API Request Headers

```javascript
// ALL API requests should include:
{
  'Authorization': 'Bearer {token}',
  'X-Business-Id': businessId,
  'X-Outlet-Id': outletId,      // NEW!
  'Content-Type': 'application/json'
}
```

### 4. Backend Middleware

```php
// app/Http/Middleware/CheckOutletAccess.php

class CheckOutletAccess
{
    public function handle($request, Closure $next, ...$roles)
    {
        $user = auth()->user();
        $outletId = $request->header('X-Outlet-Id');

        // Super admin and business owner can access all outlets
        if (in_array($user->role, ['super_admin', 'owner'])) {
            return $next($request);
        }

        // Check if user has access to this outlet
        $hasAccess = DB::table('user_outlets')
            ->where('user_id', $user->id)
            ->where('outlet_id', $outletId)
            ->where('is_active', true)
            ->exists();

        if (!$hasAccess) {
            return response()->json(['error' => 'No access to this outlet'], 403);
        }

        return $next($request);
    }
}
```

---

## 🎨 Frontend Architecture

### 1. Component Structure

```
src/
├── components/
│   ├── auth/
│   │   ├── Login.jsx
│   │   └── RoleRedirect.jsx          # NEW: Redirect based on role
│   │
│   ├── business/
│   │   ├── BusinessSwitcher.jsx      # Existing
│   │   ├── BusinessSetup.jsx         # Existing
│   │   └── BusinessManagement.jsx    # Existing (Enhanced)
│   │
│   ├── outlet/                        # NEW FOLDER
│   │   ├── OutletSwitcher.jsx        # NEW: Switch between outlets
│   │   ├── OutletSelector.jsx        # NEW: Select outlet on login
│   │   ├── OutletStaffManagement.jsx # NEW: Assign staff to outlet
│   │   ├── OutletInventory.jsx       # NEW: Outlet-specific inventory
│   │   └── OutletTransfer.jsx        # NEW: Transfer stock between outlets
│   │
│   ├── dashboards/
│   │   ├── SuperOwnerDashboard.jsx   # NEW: Platform-wide view
│   │   ├── OwnerDashboard.jsx        # NEW: Multi-outlet view
│   │   ├── ManagerDashboard.jsx      # NEW: Single outlet view
│   │   ├── KasirDashboard.jsx        # Existing
│   │   ├── KitchenDashboard.jsx      # Existing
│   │   └── WaiterDashboard.jsx       # Existing
│   │
│   ├── employee/
│   │   ├── EmployeeManagement.jsx    # Existing (Enhanced)
│   │   ├── EmployeeAssignment.jsx    # NEW: Assign to outlets
│   │   └── EmployeeSchedule.jsx      # NEW: Schedule per outlet
│   │
│   └── Layout.jsx                     # Enhanced with OutletSwitcher
│
├── contexts/
│   ├── AuthContext.js                 # Enhanced with outlet logic
│   └── OutletContext.js               # NEW: Outlet-specific state
│
├── services/
│   ├── outlet.service.js              # Existing
│   ├── assignment.service.js          # NEW: User-outlet assignments
│   ├── inventory.service.js           # NEW: Outlet inventory
│   └── transfer.service.js            # NEW: Inter-outlet transfers
│
└── hooks/
    ├── useOutlet.js                   # NEW: Current outlet hook
    ├── useOutletAccess.js             # NEW: Check outlet access
    └── useRolePermissions.js          # NEW: Role-based permissions
```

### 2. New Components Detail

#### OutletSwitcher.jsx
```jsx
const OutletSwitcher = () => {
  const { user, outlets, currentOutlet, switchOutlet } = useAuth();

  // Hide for staff
  if (!['super_admin', 'owner', 'manager'].includes(user.role)) {
    return null;
  }

  return (
    <Select value={currentOutlet?.id} onChange={switchOutlet}>
      {outlets.map(outlet => (
        <option value={outlet.id}>{outlet.name}</option>
      ))}
    </Select>
  );
};
```

#### OutletSelector.jsx (After Login)
```jsx
const OutletSelector = () => {
  const { user, outlets, setCurrentOutlet } = useAuth();

  // Auto-select if only 1 outlet
  useEffect(() => {
    if (outlets.length === 1) {
      setCurrentOutlet(outlets[0]);
      navigate('/dashboard');
    }
  }, []);

  return (
    <div>
      <h2>Select Your Outlet</h2>
      {outlets.map(outlet => (
        <Card onClick={() => selectOutlet(outlet)}>
          {outlet.name}
        </Card>
      ))}
    </div>
  );
};
```

#### OutletStaffManagement.jsx
```jsx
const OutletStaffManagement = () => {
  const [staff, setStaff] = useState([]);
  const [availableEmployees, setAvailableEmployees] = useState([]);

  return (
    <div>
      {/* Current Staff */}
      <StaffList staff={staff} onRemove={removeStaff} />

      {/* Assign New Staff */}
      <AssignForm
        employees={availableEmployees}
        onAssign={assignToOutlet}
      />
    </div>
  );
};
```

### 3. Routing Changes

```javascript
// App.js
<Routes>
  {/* After Login - Outlet Selection */}
  <Route path="/select-outlet" element={<OutletSelector />} />

  {/* Role-based Dashboard Redirect */}
  <Route path="/" element={<RoleBasedDashboard />}>
    {/* Super Owner */}
    <Route path="super-owner" element={<SuperOwnerDashboard />} />

    {/* Owner */}
    <Route path="owner" element={<OwnerDashboard />} />

    {/* Manager */}
    <Route path="manager" element={<ManagerDashboard />} />

    {/* Staff - Auto redirect to workspace */}
  </Route>

  {/* Outlet Management (Owner/Manager only) */}
  <Route path="/outlets">
    <Route path="staff" element={<OutletStaffManagement />} />
    <Route path="inventory" element={<OutletInventory />} />
    <Route path="transfer" element={<OutletTransfer />} />
  </Route>
</Routes>
```

---

## 🔄 Data Flow Diagrams

### 1. Login Flow

```
┌──────────────┐
│ User Login   │
└──────┬───────┘
       │
       ▼
┌─────────────────────┐
│ Fetch User Data     │
│ - Profile           │
│ - Role              │
│ - Assigned Outlets  │
└──────┬──────────────┘
       │
       ├─► Super Admin ─► Dashboard (All Businesses)
       │
       ├─► Owner ──────► Select Business ─► Dashboard (All Outlets)
       │
       ├─► Manager ────► Auto-select Outlet ─► Manager Dashboard
       │
       └─► Staff ──────► Auto-select Outlet ─► Role Workspace
                         (Kasir → POS)
                         (Kitchen → Kitchen)
                         (Waiter → Tables)
```

### 2. Product Purchase Flow (POS)

```
┌────────────────┐
│ Kasir Login    │
└────────┬───────┘
         │
         ▼
┌──────────────────────────┐
│ Auto-load Context:       │
│ - Business ID: 1         │
│ - Outlet ID: 5           │
│ - Role: kasir            │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Open POS                 │
│ Load Products:           │
│ WHERE business_id = 1    │
│ AND (outlet_id = 5       │
│      OR is_global = true)│
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Check Stock:             │
│ FROM product_outlets     │
│ WHERE outlet_id = 5      │
│ AND is_available = true  │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Create Order:            │
│ - business_id = 1        │
│ - outlet_id = 5          │
│ - employee_id = user.id  │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Reduce Stock:            │
│ UPDATE product_outlets   │
│ SET stock = stock - qty  │
│ WHERE outlet_id = 5      │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Log Movement:            │
│ INSERT inventory_movements│
│ type = 'sale'            │
│ to_outlet_id = NULL      │
└──────────────────────────┘
```

### 3. Stock Transfer Flow

```
┌───────────────────┐
│ Manager Outlet A  │
│ Request Transfer  │
└────────┬──────────┘
         │
         ▼
┌──────────────────────────────┐
│ Select Product & Quantity    │
│ From: Outlet A (stock: 100)  │
│ To: Outlet B                 │
│ Qty: 20                      │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ Create Transfer Request      │
│ status: 'pending'            │
│ awaiting approval            │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ Owner/Super Admin Approval   │
└────────┬─────────────────────┘
         │
         ├─► Approved
         │   │
         │   ▼
         │   ┌────────────────────────┐
         │   │ Deduct from Outlet A   │
         │   │ stock: 100 → 80        │
         │   └────────┬───────────────┘
         │            │
         │            ▼
         │   ┌────────────────────────┐
         │   │ Add to Outlet B        │
         │   │ stock: 50 → 70         │
         │   └────────┬───────────────┘
         │            │
         │            ▼
         │   ┌────────────────────────┐
         │   │ Log Movement           │
         │   │ type: 'transfer'       │
         │   │ from_outlet: A         │
         │   │ to_outlet: B           │
         │   └────────────────────────┘
         │
         └─► Rejected
             │
             ▼
             ┌────────────────────────┐
             │ Notify Manager         │
             │ Transfer cancelled     │
             └────────────────────────┘
```

---

## 📊 Dashboard Specifications

### 1. Super Owner Dashboard

**Metrics:**
- Total Businesses
- Total Outlets
- Total Revenue (All)
- Total Orders (All)
- Active Staff Count

**Charts:**
- Revenue Comparison per Business (Bar Chart)
- Top Performing Outlets (Table)
- Daily Transaction Trend (Line Chart)
- Business Growth Over Time (Area Chart)

**Quick Actions:**
- Create New Business
- View All Businesses
- Platform Reports
- User Management

**Data Source:**
```sql
-- Aggregated from ALL businesses and outlets
SELECT
  b.name as business_name,
  o.name as outlet_name,
  SUM(ord.total) as revenue,
  COUNT(ord.id) as order_count
FROM businesses b
JOIN outlets o ON o.business_id = b.id
JOIN orders ord ON ord.outlet_id = o.id
WHERE ord.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY b.id, o.id
ORDER BY revenue DESC;
```

### 2. Business Owner Dashboard

**Metrics:**
- Total Outlets (in business)
- Total Revenue (all outlets)
- Total Orders (all outlets)
- Best Performing Outlet
- Outlet Comparison

**Charts:**
- Revenue per Outlet (Bar Chart)
- Order Volume per Outlet (Pie Chart)
- Hourly Sales Pattern (Heatmap)
- Product Performance Across Outlets (Table)

**Quick Actions:**
- Add New Outlet
- Manage Staff
- View Reports
- Outlet Comparison

**Filters:**
- Outlet Selector (Dropdown)
- Date Range
- Comparison Mode (Compare 2+ outlets)

**Data Source:**
```sql
-- Current business, all outlets
SELECT
  o.name as outlet_name,
  SUM(ord.total) as revenue,
  COUNT(ord.id) as order_count,
  AVG(ord.total) as avg_order_value
FROM outlets o
LEFT JOIN orders ord ON ord.outlet_id = o.id
WHERE o.business_id = :currentBusinessId
  AND ord.created_at >= :dateFrom
  AND ord.created_at <= :dateTo
GROUP BY o.id
ORDER BY revenue DESC;
```

### 3. Outlet Manager Dashboard

**Metrics:**
- Today's Revenue (single outlet)
- Today's Orders
- Staff On Duty
- Low Stock Alerts
- Pending Kitchen Orders

**Charts:**
- Hourly Sales Today (Line Chart)
- Top Selling Products (Bar Chart)
- Payment Method Distribution (Pie Chart)
- Staff Performance (Table)

**Quick Actions:**
- Manage Staff Schedule
- Restock Inventory
- Request Stock Transfer
- View Outlet Reports

**Alerts:**
- 🔴 Low Stock: 5 products
- 🟡 Pending Approvals: 2
- 🟢 Staff Attendance: 8/10

**Data Source:**
```sql
-- Single outlet only
SELECT
  p.name as product_name,
  SUM(oi.quantity) as sold_qty,
  SUM(oi.subtotal) as revenue
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON p.id = oi.product_id
WHERE o.outlet_id = :currentOutletId
  AND DATE(o.created_at) = CURDATE()
GROUP BY p.id
ORDER BY sold_qty DESC
LIMIT 10;
```

### 4. Staff Dashboard (Kasir/Kitchen/Waiter)

**No Dashboard - Direct to Workspace**

- **Kasir**: Redirect to `/cashier` (POS)
- **Kitchen**: Redirect to `/kitchen` (Order Display)
- **Waiter**: Redirect to `/tables` (Table Management)

**Info Bar (Top):**
```
┌─────────────────────────────────────────────┐
│ 📍 Outlet: Cabang Senayan                  │
│ 👤 John Doe (Kasir)                        │
│ 🕐 Shift: 09:00 - 17:00                    │
└─────────────────────────────────────────────┘
```

---

## 🔧 Backend API Specifications

### 1. New Endpoints

#### User Outlet Assignments

**GET** `/api/v1/users/{userId}/outlets`
```json
Response:
{
  "success": true,
  "data": [
    {
      "outlet_id": 1,
      "outlet_name": "Cabang Senayan",
      "role": "manager",
      "is_active": true,
      "assigned_at": "2025-01-15T10:00:00Z"
    }
  ]
}
```

**POST** `/api/v1/outlets/{outletId}/assign-user`
```json
Request:
{
  "user_id": 5,
  "role": "kasir",
  "notes": "Shift pagi"
}

Response:
{
  "success": true,
  "message": "User assigned to outlet successfully"
}
```

**DELETE** `/api/v1/outlets/{outletId}/remove-user/{userId}`

#### Outlet Inventory

**GET** `/api/v1/outlets/{outletId}/inventory`
```json
Response:
{
  "success": true,
  "data": [
    {
      "product_id": 10,
      "product_name": "Nasi Goreng",
      "stock": 50,
      "min_stock": 20,
      "is_available": true,
      "price_override": null
    }
  ]
}
```

**POST** `/api/v1/outlets/{outletId}/inventory/adjust`
```json
Request:
{
  "product_id": 10,
  "adjustment": 20, // or -5 for reduction
  "reason": "Restock from supplier"
}
```

**GET** `/api/v1/outlets/{outletId}/inventory/low-stock`
```json
Response:
{
  "success": true,
  "data": [
    {
      "product_id": 10,
      "product_name": "Nasi Goreng",
      "stock": 15,
      "min_stock": 20,
      "shortage": 5
    }
  ]
}
```

#### Stock Transfers

**POST** `/api/v1/inventory/transfer`
```json
Request:
{
  "product_id": 10,
  "from_outlet_id": 1,
  "to_outlet_id": 2,
  "quantity": 20,
  "reason": "Transfer untuk cabang baru"
}

Response:
{
  "success": true,
  "data": {
    "transfer_id": 123,
    "status": "pending", // pending, approved, rejected, completed
    "requires_approval": true
  }
}
```

**GET** `/api/v1/inventory/transfers`
```json
Query params: ?status=pending&outlet_id=1

Response:
{
  "success": true,
  "data": [
    {
      "id": 123,
      "product_name": "Nasi Goreng",
      "from_outlet": "Cabang A",
      "to_outlet": "Cabang B",
      "quantity": 20,
      "status": "pending",
      "requested_by": "John Doe",
      "requested_at": "2025-01-15T10:00:00Z"
    }
  ]
}
```

**PUT** `/api/v1/inventory/transfers/{transferId}/approve`
**PUT** `/api/v1/inventory/transfers/{transferId}/reject`

#### Outlet Analytics

**GET** `/api/v1/outlets/{outletId}/analytics`
```json
Query params: ?from=2025-01-01&to=2025-01-31

Response:
{
  "success": true,
  "data": {
    "revenue": {
      "total": 15000000,
      "growth": 12.5, // percent vs previous period
      "by_date": [...]
    },
    "orders": {
      "total": 450,
      "avg_value": 33333,
      "by_hour": [...]
    },
    "products": {
      "top_selling": [...],
      "low_stock": [...]
    },
    "staff": {
      "total_active": 8,
      "performance": [...]
    }
  }
}
```

### 2. Modified Endpoints

All existing endpoints that deal with outlet-specific data should now filter by outlet:

**Before:**
```javascript
GET /api/v1/products
Headers: { 'X-Business-Id': 1 }
```

**After:**
```javascript
GET /api/v1/products
Headers: {
  'X-Business-Id': 1,
  'X-Outlet-Id': 5
}

// Returns products available at outlet 5
// Including global products (is_global = true)
```

**Backend Logic:**
```php
// ProductController.php
public function apiIndex(Request $request)
{
    $businessId = $request->header('X-Business-Id');
    $outletId = $request->header('X-Outlet-Id');

    $query = Product::where('business_id', $businessId);

    if ($outletId) {
        // Filter by outlet availability
        $query->where(function($q) use ($outletId) {
            $q->where('is_global', true)
              ->orWhereHas('outlets', function($q2) use ($outletId) {
                  $q2->where('outlet_id', $outletId)
                     ->where('is_available', true);
              });
        });

        // Join stock info
        $query->with(['outlets' => function($q) use ($outletId) {
            $q->where('outlet_id', $outletId);
        }]);
    }

    return response()->json($query->get());
}
```

---

## 🧪 Testing Strategy

### 1. Unit Tests

```php
// tests/Unit/OutletAccessTest.php
public function test_owner_can_access_all_outlets()
{
    $owner = User::factory()->owner()->create();
    $business = Business::factory()->create(['owner_id' => $owner->id]);
    $outlet = Outlet::factory()->create(['business_id' => $business->id]);

    $this->assertTrue($owner->canAccessOutlet($outlet->id));
}

public function test_staff_cannot_access_unassigned_outlet()
{
    $staff = User::factory()->kasir()->create();
    $outlet1 = Outlet::factory()->create();
    $outlet2 = Outlet::factory()->create();

    // Assign to outlet 1 only
    $staff->outlets()->attach($outlet1->id, ['role' => 'kasir']);

    $this->assertTrue($staff->canAccessOutlet($outlet1->id));
    $this->assertFalse($staff->canAccessOutlet($outlet2->id));
}
```

### 2. Feature Tests

```php
// tests/Feature/POS/OutletInventoryTest.php
public function test_pos_only_shows_outlet_available_products()
{
    $outlet1 = Outlet::factory()->create();
    $outlet2 = Outlet::factory()->create();

    $product = Product::factory()->create();

    // Product available only at outlet 1
    ProductOutlet::create([
        'product_id' => $product->id,
        'outlet_id' => $outlet1->id,
        'stock' => 10,
        'is_available' => true
    ]);

    // Request from outlet 1
    $response = $this->getJson('/api/v1/products', [
        'X-Outlet-Id' => $outlet1->id
    ]);
    $response->assertJsonFragment(['id' => $product->id]);

    // Request from outlet 2
    $response = $this->getJson('/api/v1/products', [
        'X-Outlet-Id' => $outlet2->id
    ]);
    $response->assertJsonMissing(['id' => $product->id]);
}
```

### 3. Integration Tests

```php
// tests/Feature/StockTransferTest.php
public function test_complete_stock_transfer_flow()
{
    $manager = User::factory()->manager()->create();
    $outletA = Outlet::factory()->create();
    $outletB = Outlet::factory()->create();
    $product = Product::factory()->create();

    // Initial stock
    ProductOutlet::create([
        'product_id' => $product->id,
        'outlet_id' => $outletA->id,
        'stock' => 100
    ]);

    // Request transfer
    $response = $this->actingAs($manager)
        ->postJson('/api/v1/inventory/transfer', [
            'product_id' => $product->id,
            'from_outlet_id' => $outletA->id,
            'to_outlet_id' => $outletB->id,
            'quantity' => 20
        ]);

    $response->assertStatus(201);
    $transferId = $response->json('data.transfer_id');

    // Approve transfer (as owner)
    $owner = User::factory()->owner()->create();
    $this->actingAs($owner)
        ->putJson("/api/v1/inventory/transfers/{$transferId}/approve");

    // Verify stock changes
    $this->assertEquals(80, ProductOutlet::where('outlet_id', $outletA->id)->first()->stock);
    $this->assertEquals(20, ProductOutlet::where('outlet_id', $outletB->id)->first()->stock);
}
```

---

## 🚀 Migration Plan

### Phase 1: Database & Backend (Week 1-2)
- ✅ Create migrations
- ✅ Update models & relationships
- ✅ Create middleware
- ✅ Build API endpoints
- ✅ Write backend tests

### Phase 2: Core Frontend (Week 3-4)
- ✅ Update AuthContext
- ✅ Create OutletSwitcher
- ✅ Create OutletSelector
- ✅ Modify Layout component
- ✅ Update routing

### Phase 3: Features (Week 5-6)
- ✅ OutletStaffManagement
- ✅ OutletInventory
- ✅ Stock Transfer UI
- ✅ Role-based dashboards

### Phase 4: Testing & Polish (Week 7-8)
- ✅ End-to-end testing
- ✅ Bug fixes
- ✅ Performance optimization
- ✅ Documentation

---

## 📝 Implementation Checklist

### Database
- [ ] Create `user_outlets` migration
- [ ] Create `product_outlets` migration
- [ ] Create `inventory_movements` migration
- [ ] Modify `employees` table
- [ ] Modify `discounts` table
- [ ] Modify `products` table
- [ ] Add indexes
- [ ] Create seeders for testing

### Backend
- [ ] Create OutletAssignmentController
- [ ] Create OutletInventoryController
- [ ] Create StockTransferController
- [ ] Update ProductController (outlet filtering)
- [ ] Update OrderController (outlet validation)
- [ ] Update DiscountController (outlet filtering)
- [ ] Create CheckOutletAccess middleware
- [ ] Update existing middleware
- [ ] Write unit tests
- [ ] Write feature tests

### Frontend - Core
- [ ] Update AuthContext (add outlet logic)
- [ ] Create OutletContext
- [ ] Create useOutlet hook
- [ ] Create useOutletAccess hook
- [ ] Create OutletSwitcher component
- [ ] Create OutletSelector component
- [ ] Update Layout component
- [ ] Update routing (RoleRedirect)

### Frontend - Features
- [ ] OutletStaffManagement page
- [ ] OutletInventory page
- [ ] StockTransfer page
- [ ] SuperOwnerDashboard
- [ ] OwnerDashboard (enhanced)
- [ ] ManagerDashboard
- [ ] Update CashierPOS (outlet filtering)
- [ ] Update KitchenDashboard (outlet filtering)
- [ ] Update WaiterDashboard (outlet filtering)

### Services
- [ ] Create assignment.service.js
- [ ] Create inventory.service.js
- [ ] Create transfer.service.js
- [ ] Update product.service.js
- [ ] Update order.service.js

### Testing
- [ ] Test role-based access
- [ ] Test outlet switching
- [ ] Test staff assignment
- [ ] Test inventory operations
- [ ] Test stock transfers
- [ ] Test POS with outlet filter
- [ ] End-to-end user flows

### Documentation
- [x] Architecture document (this file)
- [ ] API documentation
- [ ] User manual
- [ ] Admin guide
- [ ] Deployment guide

---

## 🔒 Security Considerations

1. **Outlet Access Validation**
   - Every API request must validate outlet access
   - Use middleware consistently
   - Log unauthorized access attempts

2. **Stock Transfer Approval**
   - Require owner/manager approval for transfers > threshold
   - Log all transfer activities
   - Prevent negative stock

3. **Staff Assignment**
   - Only owner/manager can assign staff
   - Validate outlet exists and belongs to business
   - Prevent duplicate assignments

4. **Data Isolation**
   - Staff can ONLY see their outlet data
   - Prevent outlet ID manipulation in headers
   - Validate outlet belongs to business in every request

5. **Audit Trail**
   - Log all inventory movements
   - Track who made changes
   - Store approval history

---

## 📈 Performance Optimization

1. **Database Indexes**
   ```sql
   -- Critical indexes
   CREATE INDEX idx_user_outlets_lookup ON user_outlets(user_id, outlet_id, is_active);
   CREATE INDEX idx_product_outlets_available ON product_outlets(outlet_id, is_available);
   CREATE INDEX idx_orders_outlet_date ON orders(outlet_id, created_at);
   ```

2. **Caching Strategy**
   ```javascript
   // Cache user outlet assignments
   Redis::remember(`user:${userId}:outlets`, 3600, () => {
     return DB::table('user_outlets')
       ->where('user_id', userId)
       ->where('is_active', true)
       ->get();
   });
   ```

3. **Query Optimization**
   - Use eager loading for relationships
   - Limit data fetched (pagination)
   - Use DB::raw() for aggregations

4. **Frontend Optimization**
   - Lazy load outlet-specific components
   - Use React.memo for expensive components
   - Implement virtual scrolling for large lists

---

## 🎯 Success Metrics

### Technical Metrics
- [ ] All API endpoints respond < 200ms
- [ ] Database queries < 50ms
- [ ] Frontend load time < 2s
- [ ] Zero unauthorized access in logs
- [ ] 100% test coverage for critical paths

### Business Metrics
- [ ] Staff can only access assigned outlet
- [ ] Inventory tracked per outlet
- [ ] Stock transfers auditable
- [ ] Owner can compare outlet performance
- [ ] Zero stock discrepancies

---

## 📞 Support & Maintenance

### Troubleshooting Common Issues

**Problem**: Staff can't access POS
- **Check**: User has outlet assignment
- **Check**: Outlet is active
- **Check**: CurrentOutletId is set in localStorage

**Problem**: Products not showing in POS
- **Check**: Product has stock in outlet
- **Check**: Product is_available = true
- **Check**: Outlet filter is correct

**Problem**: Stock transfer stuck in pending
- **Check**: Owner/Manager approval required
- **Check**: Source outlet has sufficient stock
- **Check**: Transfer hasn't expired

---

## 🔄 Future Enhancements

### Phase 5 (Future)
- [ ] Staff scheduling system
- [ ] Inter-outlet communication (chat)
- [ ] Automated restock suggestions
- [ ] Predictive inventory management
- [ ] Mobile app for staff
- [ ] Biometric attendance
- [ ] Real-time outlet dashboards
- [ ] Advanced analytics (ML-based)

---

## 📚 References

- Laravel Documentation: https://laravel.com/docs
- React Documentation: https://react.dev
- Database Design Patterns
- Multi-tenancy Best Practices
- Role-Based Access Control (RBAC)

---

**Document Version**: 1.0
**Last Updated**: 2025-10-11
**Next Review**: After Phase 1 Implementation
