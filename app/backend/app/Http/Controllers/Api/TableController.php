<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Table;
use App\Helpers\SubscriptionHelper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class TableController extends Controller
{
    /**
     * Check tables access before processing request
     */
    private function checkTablesAccess($user)
    {
        if (!SubscriptionHelper::hasTablesAccess($user)) {
            return response()->json([
                'success' => false,
                'message' => 'Akses Meja memerlukan paket Premium. Silakan upgrade paket Anda.',
                'error' => 'subscription_feature_required',
                'required_feature' => 'has_tables_access',
                'redirect_to' => '/subscription-settings'
            ], 403);
        }
        return null;
    }

    public function apiIndex(Request $request)
    {
        $user = Auth::user();
        
        // ✅ FIX: Check tables access
        $accessCheck = $this->checkTablesAccess($user);
        if ($accessCheck) {
            return $accessCheck;
        }
        
        $businessId = $request->header('X-Business-Id');
        $outletId = $request->header('X-Outlet-Id');

        $query = Table::query();

        // Filter by business if provided (through outlet relationship)
        if ($businessId) {
            $query->whereHas('outlet', function ($q) use ($businessId) {
                $q->where('business_id', $businessId);
            });
        }

        // Filter by outlet if provided
        // Owner can see all outlets in their business, but if they select specific outlet, filter by it
        if ($outletId) {
            $query->where('outlet_id', $outletId);
        }

        // Include outlet and active orders count
        $tables = $query->with(['outlet', 'activeOrders'])
            ->withCount('activeOrders')
            ->get();

        // Update table status based on active orders
        $tables->each(function ($table) {
            // Auto-update status: if table has active orders, mark as occupied
            if ($table->active_orders_count > 0 && $table->status === 'available') {
                $table->status = 'occupied';
                $table->save();
            }
            // If no active orders but marked as occupied, mark as available
            elseif ($table->active_orders_count === 0 && $table->status === 'occupied') {
                $table->status = 'available';
                $table->save();
            }
        });

        return response()->json($tables);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        
        // ✅ FIX: Check tables access
        $accessCheck = $this->checkTablesAccess($user);
        if ($accessCheck) {
            return $accessCheck;
        }
        
        $businessId = $request->header('X-Business-Id');
        $outletId = $request->header('X-Outlet-Id');

        // Validate that user has access to the outlet
        if ($outletId && !in_array($user->role, ['super_admin', 'owner'])) {
            // For waiter/other roles, ensure they can only create tables in their assigned outlet
            if ($user->outlet_id && $user->outlet_id != $outletId) {
                return response()->json(['error' => 'Unauthorized to create table in this outlet'], 403);
            }
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'capacity' => 'required|integer|min:1|max:20',
            'outlet_id' => 'required|exists:outlets,id',
            'status' => 'nullable|string|in:available,occupied,reserved,cleaning',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Generate unique QR code
        $qrCode = 'QR-' . strtoupper(Str::random(8));
        while (Table::where('qr_code', $qrCode)->exists()) {
            $qrCode = 'QR-' . strtoupper(Str::random(8));
        }

        $table = Table::create([
            'name' => $request->name,
            'capacity' => $request->capacity,
            'outlet_id' => $request->outlet_id,
            'qr_code' => $qrCode,
            'status' => $request->status ?? 'available',
        ]);

        return response()->json($table->load('outlet'), 201);
    }

    public function update(Request $request, Table $table)
    {
        $user = Auth::user();
        $businessId = $request->header('X-Business-Id');
        $outletId = $request->header('X-Outlet-Id');

        // Check if user has access to this table's outlet
        if ($businessId && $table->outlet->business_id != $businessId) {
            return response()->json(['error' => 'Unauthorized access to table'], 403);
        }

        if ($outletId && $table->outlet_id != $outletId && !in_array($user->role, ['super_admin', 'owner'])) {
            return response()->json(['error' => 'Unauthorized access to table'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255|unique:tables,name,' . $table->id,
            'capacity' => 'sometimes|required|integer|min:1|max:20',
            'status' => 'sometimes|required|string|in:available,occupied,reserved,cleaning',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $table->update($request->all());

        return response()->json($table->load('outlet'));
    }

    public function destroy(Table $table)
    {
        $user = Auth::user();
        $businessId = request()->header('X-Business-Id');
        $outletId = request()->header('X-Outlet-Id');

        // Check if user has access to this table's outlet
        if ($businessId && $table->outlet->business_id != $businessId) {
            return response()->json(['error' => 'Unauthorized access to table'], 403);
        }

        if ($outletId && $table->outlet_id != $outletId && !in_array($user->role, ['super_admin', 'owner'])) {
            return response()->json(['error' => 'Unauthorized access to table'], 403);
        }

        $table->delete();

        return response()->json(['message' => 'Table deleted']);
    }

    public function updateStatus(Request $request, Table $table)
    {
        $user = Auth::user();
        $businessId = $request->header('X-Business-Id');
        $outletId = $request->header('X-Outlet-Id');

        // Check if user has access to this table's outlet
        if ($businessId && $table->outlet->business_id != $businessId) {
            return response()->json(['error' => 'Unauthorized access to table'], 403);
        }

        if ($outletId && $table->outlet_id != $outletId && !in_array($user->role, ['super_admin', 'owner'])) {
            return response()->json(['error' => 'Unauthorized access to table'], 403);
        }

        $request->validate([
            'status' => 'required|string|in:available,occupied,reserved',
        ]);

        $table->status = $request->status;
        $table->save();

        return response()->json($table);
    }
}
