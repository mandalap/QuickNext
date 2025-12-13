# Issues to Fix from TestSprite Results

## ✅ **ALREADY FIXED**

### 1. Rate Limiting (429 Too Many Requests)
- **Status:** ✅ FIXED
- **Fix:** Rate limit cleared using `RateLimiter::clear('login')` and `php artisan cache:clear`

### 2. Business Creation Failure - Missing Slug
- **Status:** ✅ FIXED
- **Fix:** Automatic slug generation added to `OutletController::store()` and `update()`
- **File:** `app/backend/app/Http/Controllers/Api/OutletController.php`

### 3. Missing Test User Accounts
- **Status:** ✅ FIXED
- **Fix:** Created test users for all roles:
  - `super_admin@test.com` / `password123`
  - `admin@test.com` / `password123`
  - `kasir@test.com` / `password123`
  - `kitchen@test.com` / `password123`
  - `waiter@test.com` / `password123`

### 4. Password Reset
- **Status:** ✅ FIXED
- **Fix:** Password for `juli23man@gmail.com` reset to `password123`

---

## ⚠️ **ISSUES TO FIX**

### 1. Dashboard API Endpoint - Date Range Parameter

**Issue:**
- Error `404 (Not Found)` for `/v1/dashboard/top-products?date_range=today:0`
- Frontend may be sending invalid format with trailing `:0`

**Current Status:**
- ✅ Backend has `cleanDateRange()` method in `DashboardController` (line 362-383)
- ✅ Route is registered: `Route::get('/top-products', [DashboardController::class, 'getTopProducts']);`
- ⚠️ Need to verify frontend is sending correct format

**Action Needed:**
1. **Verify Frontend Code:**
   - Check `app/frontend/src/components/dashboards/Dashboard.jsx`
   - Ensure `date_range` parameter is sent as string, not with trailing `:number`
   - Current code looks correct: `return { date_range: dateRange };`

2. **Test Endpoint Manually:**
   ```bash
   # Test with correct format
   curl -H "Authorization: Bearer TOKEN" \
        "http://localhost:8000/api/v1/dashboard/top-products?date_range=today&limit=5"
   
   # Test with invalid format (should be cleaned by backend)
   curl -H "Authorization: Bearer TOKEN" \
        "http://localhost:8000/api/v1/dashboard/top-products?date_range=today:0&limit=5"
   ```

3. **Add Logging:**
   - Add logging in `DashboardController::getTopProducts()` to see what parameter is received
   - Verify `cleanDateRange()` is being called correctly

**Priority:** Medium  
**Estimated Time:** 30 minutes

---

### 2. Subscription Check Timeout

**Issue:**
- `/api/v1/subscriptions/current` endpoint may timeout
- Error: `Subscription check failed/timeout, proceeding without it`
- Causes loading delays

**Current Status:**
- ✅ Route exists: `Route::get('/current', [SubscriptionController::class, 'getCurrentSubscription']);`
- ✅ Method exists: `SubscriptionController::getCurrentSubscription()`
- ⚠️ May be slow due to database queries

**Action Needed:**
1. **Check Method Implementation:**
   - Review `SubscriptionController::getCurrentSubscription()`
   - Optimize database queries if needed
   - Add caching if appropriate

2. **Add Timeout Handling:**
   - Frontend: Add timeout handling in `AuthContext.jsx`
   - Backend: Ensure queries are optimized

3. **Add Error Handling:**
   - Frontend: Handle timeout gracefully
   - Don't block UI if subscription check fails

**Priority:** Low-Medium  
**Estimated Time:** 1-2 hours

---

### 3. Frontend Path Inconsistency

**Issue:**
- Some files use hardcoded URLs instead of `apiClient`
- May cause issues if base URL changes

**Files to Check:**
- `app/frontend/src/contexts/AuthContext.jsx` (lines 181, 208)
- `app/frontend/src/pages/SubscriptionPage.jsx` (line 53)
- `app/frontend/src/pages/SSOLogin.jsx` (line 43)

**Action Needed:**
1. **Use apiClient Instead of Hardcoded URLs:**
   - Replace `axios.get('http://localhost:8000/api/v1/...')` with `apiClient.get('/v1/...')`
   - This ensures consistent base URL and authentication headers

2. **Example Fix:**
   ```javascript
   // Before
   const response = await axios.get(
     'http://localhost:8000/api/v1/subscriptions/current',
     { headers: { Authorization: `Bearer ${token}` } }
   );
   
   // After
   import apiClient from '../utils/apiClient';
   const response = await apiClient.get('/v1/subscriptions/current');
   ```

**Priority:** Low  
**Estimated Time:** 30 minutes

---

### 4. Business Creation - Outlet Creation Flow

**Issue:**
- TestSprite reports business creation fails
- Error: `Field 'slug' doesn't have a default value`
- **Status:** ✅ FIXED - Slug generation added
- ⚠️ Need to verify outlet is created when business is created

**Action Needed:**
1. **Verify Business Creation Flow:**
   - Check if outlet is automatically created when business is created
   - If not, add logic to create default outlet

2. **Test Business Creation:**
   - Create new business via frontend
   - Verify outlet is created with slug
   - Verify no errors occur

**Priority:** High (if outlet not created automatically)  
**Estimated Time:** 1 hour

---

## 🔧 **Recommended Fixes Priority**

### Priority 1 (Critical)
1. ✅ **Business Creation - Slug Generation** - FIXED
2. ⚠️ **Business Creation - Outlet Creation** - Verify if outlet is created automatically

### Priority 2 (High)
3. ⚠️ **Dashboard API Endpoint** - Verify date_range parameter handling
4. ⚠️ **Subscription Check** - Optimize and add timeout handling

### Priority 3 (Medium)
5. ⚠️ **Frontend Path Consistency** - Use apiClient instead of hardcoded URLs

---

## 📝 **Testing Checklist**

After fixes, test the following:

- [ ] Business creation works without slug error
- [ ] Outlet is automatically created when business is created
- [ ] Dashboard loads without 404 errors
- [ ] Top products endpoint works with all date_range values
- [ ] Subscription check doesn't timeout
- [ ] All test users can login
- [ ] Role-based access control works for all roles

---

## 🚀 **Next Steps**

1. **Verify Business Creation:**
   - Test creating a new business
   - Verify outlet is created
   - Verify slug is generated

2. **Test Dashboard:**
   - Test with different date_range values
   - Verify no 404 errors
   - Check browser console for errors

3. **Optimize Subscription Check:**
   - Review `getCurrentSubscription()` method
   - Add caching if needed
   - Add timeout handling in frontend

4. **Refactor Frontend:**
   - Replace hardcoded URLs with apiClient
   - Ensure consistent error handling

---

**Last Updated:** 2025-11-16  
**Status:** 2 Critical Issues Fixed, 4 Issues Need Attention

