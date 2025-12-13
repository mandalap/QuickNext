<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Ingredient;
use App\Models\InventoryMovement;
use App\Helpers\SubscriptionHelper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class InventoryController extends Controller
{
    /**
     * Check inventory access before processing request
     */
    private function checkInventoryAccess($user)
    {
        if (!SubscriptionHelper::hasInventoryAccess($user)) {
            return response()->json([
                'success' => false,
                'message' => 'Akses Bahan & Resep memerlukan paket Premium. Silakan upgrade paket Anda.',
                'error' => 'subscription_feature_required',
                'required_feature' => 'has_inventory_access',
                'redirect_to' => '/subscription-settings'
            ], 403);
        }
        return null;
    }

    public function getProducts(Request $request)
    {
        $user = $request->user();
        
        // ✅ FIX: Check inventory access
        $accessCheck = $this->checkInventoryAccess($user);
        if ($accessCheck) {
            return $accessCheck;
        }
        
        $products = Product::select('id', 'name', 'stock')->get();

        return response()->json($products);
    }

    public function getIngredients(Request $request)
    {
        $user = $request->user();
        
        // ✅ FIX: Check inventory access
        $accessCheck = $this->checkInventoryAccess($user);
        if ($accessCheck) {
            return $accessCheck;
        }
        
        $ingredients = Ingredient::all();

        return response()->json($ingredients);
    }

    public function stockAdjustment(Request $request)
    {
        $user = $request->user();
        
        // ✅ FIX: Check inventory access
        $accessCheck = $this->checkInventoryAccess($user);
        if ($accessCheck) {
            return $accessCheck;
        }
        
        $validator = Validator::make($request->all(), [
            'product_id' => 'required|exists:products,id',
            'adjustment' => 'required|integer',
            'reason' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $product = Product::find($request->product_id);
        $oldStock = $product->stock;
        $product->stock += $request->adjustment;
        $product->save();

        InventoryMovement::create([
            'product_id' => $request->product_id,
            'movement_type' => $request->adjustment > 0 ? 'in' : 'out',
            'quantity' => abs($request->adjustment),
            'old_stock' => $oldStock,
            'new_stock' => $product->stock,
            'reason' => $request->reason,
        ]);

        return response()->json($product);
    }

    public function getMovements(Request $request)
    {
        $user = $request->user();
        
        // ✅ FIX: Check inventory access
        $accessCheck = $this->checkInventoryAccess($user);
        if ($accessCheck) {
            return $accessCheck;
        }
        
        $movements = InventoryMovement::with('product')->latest()->paginate(15);

        return response()->json($movements);
    }

    public function getLowStockAlerts(Request $request)
    {
        $user = $request->user();
        
        // ✅ FIX: Check inventory access
        $accessCheck = $this->checkInventoryAccess($user);
        if ($accessCheck) {
            return $accessCheck;
        }
        
        $lowStockProducts = Product::where('stock', '<=', 10)->get();

        return response()->json($lowStockProducts);
    }
}
