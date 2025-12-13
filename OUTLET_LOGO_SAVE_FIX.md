# Outlet Logo Save Fix - Model Fillable Issue

## Problem

User reported that outlet logo upload was successful in the frontend, but the logo was not being saved to the database. The outlet list was not showing updated logos.

## Root Cause

The issue was in the `Outlet` model - the `logo` field was not included in the `$fillable` array, which prevented Laravel from mass-assigning the logo data during updates.

**Model Issue:**

```php
// BEFORE - logo field missing from fillable
protected $fillable = [
    'business_id', 'name', 'code', 'address', 'phone', 'is_active'
];
```

## Solution Applied

### 1. Updated Outlet Model

Added `logo` field to the `$fillable` array in `app/backend/app/Models/Outlet.php`:

```php
// AFTER - logo field added to fillable
protected $fillable = [
    'business_id', 'name', 'code', 'address', 'phone', 'logo', 'is_active'
];
```

### 2. Verification

- Tested direct model update with logo data
- Confirmed logo is now properly saved to database
- Verified logo field accepts Base64 data correctly

## Technical Details

### Why This Happened

- Laravel's mass assignment protection prevents saving fields not in `$fillable`
- Frontend was sending logo data correctly
- Backend API was receiving logo data correctly
- But model was silently ignoring the logo field during `$outlet->update()`

### Database Impact

- Logo data is now properly stored in `outlets.logo` column (LONGTEXT)
- Existing outlets without logos remain unaffected
- New logo uploads work correctly

## Files Modified

- `app/backend/app/Models/Outlet.php` - Added 'logo' to $fillable array

## Testing Results

- ✅ Logo upload now saves to database
- ✅ Logo displays correctly in outlet list
- ✅ Cache buster works for immediate updates
- ✅ No data loss for existing outlets

## Status

✅ **FIXED** - Outlet logo upload and display now works completely
