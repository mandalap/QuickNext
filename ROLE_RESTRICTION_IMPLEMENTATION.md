# Role Restriction Implementation: Create Table

## Overview

Implementasi pembatasan role untuk fitur "Buat Meja" agar hanya owner dan admin yang dapat mengaksesnya.

## Changes Made

### 1. Backend - SelfServiceManagementController.php

```php
public function createTable(Request $request)
{
    $user = Auth::user();

    // Role checking - only owner and admin can create tables
    if (!in_array($user->role, ['owner', 'admin', 'super_admin'])) {
        return response()->json([
            'success' => false,
            'message' => 'Unauthorized. Only owners and admins can create tables.',
            'error' => 'INSUFFICIENT_PERMISSIONS'
        ], 403);
    }

    // ... rest of the method
}
```

### 2. Frontend - SelfServiceOrder.jsx

```javascript
const { user } = useAuth();

// Check if user can create tables (only owner and admin)
const canCreateTable = ["owner", "admin", "super_admin"].includes(user?.role);

// Conditional rendering
{
  canCreateTable && (
    <Button onClick={() => setIsCreateTableModalOpen(true)}>
      Buat Meja & QR
    </Button>
  );
}
```

### 3. Frontend - CreateTableModal.jsx

```javascript
const { outlets, user } = useAuth();

// Check if user can create tables (only owner and admin)
const canCreateTable = ["owner", "admin", "super_admin"].includes(user?.role);

// Permission check in useEffect
if (!canCreateTable) {
  setErrors({
    general:
      "Anda tidak memiliki izin untuk membuat meja. Hanya owner dan admin yang dapat membuat meja.",
  });
  return;
}
```

## Test Results

### ✅ Kasir User (Should Fail)

- **HTTP Code**: 403 Forbidden
- **Response**: `{"success":false,"message":"Unauthorized. Only owners and admins can create tables.","error":"INSUFFICIENT_PERMISSIONS"}`
- **Status**: ✅ SUCCESS - Kasir correctly blocked

### ✅ Owner User (Should Succeed)

- **HTTP Code**: 201 Created
- **Response**: `{"message":"Table created successfully","table":{...}}`
- **Status**: ✅ SUCCESS - Owner can create table

## Role Permissions

| Role            | Can Create Table | UI Access         | API Access       |
| --------------- | ---------------- | ----------------- | ---------------- |
| **owner**       | ✅ Yes           | ✅ Button visible | ✅ 201 Created   |
| **admin**       | ✅ Yes           | ✅ Button visible | ✅ 201 Created   |
| **super_admin** | ✅ Yes           | ✅ Button visible | ✅ 201 Created   |
| **kasir**       | ❌ No            | ❌ Button hidden  | ❌ 403 Forbidden |
| **kitchen**     | ❌ No            | ❌ Button hidden  | ❌ 403 Forbidden |
| **waiter**      | ❌ No            | ❌ Button hidden  | ❌ 403 Forbidden |
| **member**      | ❌ No            | ❌ Button hidden  | ❌ 403 Forbidden |

## Security Features

1. **Backend Validation**: Server-side role checking prevents unauthorized access
2. **Frontend UI**: Button hidden for unauthorized users
3. **Modal Protection**: Additional permission check in modal
4. **Error Handling**: Clear error messages for unauthorized access
5. **Consistent UX**: Same permission logic across all components

## Benefits

- ✅ **Security**: Prevents unauthorized table creation
- ✅ **Control**: Only management can manage outlet assets
- ✅ **Audit**: Clear permission boundaries
- ✅ **UX**: Intuitive UI that adapts to user role
- ✅ **Consistency**: Same logic across frontend and backend

## Status

✅ **COMPLETED** - Role restriction successfully implemented and tested












































































