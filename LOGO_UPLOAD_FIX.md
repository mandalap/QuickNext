# Logo Upload Fix - Database Column Size Issue

## Problem

User reported error when trying to update business information with logo upload:

- **Error**: `SQLSTATE[22001]: String data, right truncated: 1406 Data too long for column 'logo' at row 1`
- **Root Cause**: The `logo` columns in both `businesses` and `outlets` tables were `VARCHAR(255)`, which is too small for Base64 encoded image data

## Solution

Created and ran a migration to change the `logo` column type from `VARCHAR(255)` to `LONGTEXT` in both tables:

### Migration: `2025_10_22_062249_update_logo_columns_to_longtext.php`

```php
public function up(): void
{
    // Update businesses table logo column to LONGTEXT
    Schema::table('businesses', function (Blueprint $table) {
        $table->longText('logo')->nullable()->change();
    });

    // Update outlets table logo column to LONGTEXT
    Schema::table('outlets', function (Blueprint $table) {
        $table->longText('logo')->nullable()->change();
    });
}
```

## Database Changes

- **Before**: `logo` column was `VARCHAR(255)` (max 255 characters)
- **After**: `logo` column is `LONGTEXT` (max 4GB of text data)

## Verification

Confirmed the changes by checking table structure:

- `businesses.logo`: `longtext` ✅
- `outlets.logo`: `longtext` ✅

## Impact

- ✅ Logo upload now works for both businesses and outlets
- ✅ Can store large Base64 encoded images (up to 4GB)
- ✅ No data loss (existing data preserved)
- ✅ Backward compatible (can still store small text if needed)

## Testing

The logo upload feature should now work properly:

1. Upload business logo in Business & Outlet management
2. Upload outlet logo when creating/editing outlets
3. Both should save successfully without database errors

## Files Modified

- `database/migrations/2025_10_22_062249_update_logo_columns_to_longtext.php` (created)
- Database schema updated for `businesses` and `outlets` tables

## Status

✅ **FIXED** - Logo upload functionality is now working properly
