<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ingredient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class IngredientController extends Controller
{
    public function index(Request $request)
    {
        $businessId = $request->header('X-Business-Id');

        if (!$businessId) {
            return response()->json(['message' => 'Business ID required'], 400);
        }

        $ingredients = Ingredient::where('business_id', $businessId)
            ->orderBy('created_at', 'desc')
            ->get();

        // Add calculated fields
        $ingredients->transform(function($ingredient) {
            $ingredient->total_value = $ingredient->current_stock * $ingredient->cost_per_unit;

            // Determine stock status
            if ($ingredient->current_stock <= $ingredient->min_stock * 0.5) {
                $ingredient->status = 'critical';
            } elseif ($ingredient->current_stock <= $ingredient->min_stock) {
                $ingredient->status = 'low';
            } else {
                $ingredient->status = 'adequate';
            }

            return $ingredient;
        });

        return response()->json($ingredients);
    }

    public function store(Request $request)
    {
        $businessId = $request->header('X-Business-Id');

        if (!$businessId) {
            return response()->json(['message' => 'Business ID required'], 400);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'unit' => 'required|string|max:50',
            'cost_per_unit' => 'required|numeric|min:0',
            'current_stock' => 'required|numeric|min:0',
            'min_stock' => 'required|numeric|min:0',
            'category' => 'nullable|string|max:100',
            'supplier' => 'nullable|string|max:255',
            'expiry_date' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $ingredient = Ingredient::create(array_merge($request->all(), [
            'business_id' => $businessId,
        ]));

        // Add calculated fields
        $ingredient->total_value = $ingredient->current_stock * $ingredient->cost_per_unit;

        if ($ingredient->current_stock <= $ingredient->min_stock * 0.5) {
            $ingredient->status = 'critical';
        } elseif ($ingredient->current_stock <= $ingredient->min_stock) {
            $ingredient->status = 'low';
        } else {
            $ingredient->status = 'adequate';
        }

        return response()->json($ingredient, 201);
    }

    public function show(Request $request, Ingredient $ingredient)
    {
        $businessId = $request->header('X-Business-Id');

        if ($ingredient->business_id != $businessId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Add calculated fields
        $ingredient->total_value = $ingredient->current_stock * $ingredient->cost_per_unit;

        if ($ingredient->current_stock <= $ingredient->min_stock * 0.5) {
            $ingredient->status = 'critical';
        } elseif ($ingredient->current_stock <= $ingredient->min_stock) {
            $ingredient->status = 'low';
        } else {
            $ingredient->status = 'adequate';
        }

        return response()->json($ingredient);
    }

    public function update(Request $request, Ingredient $ingredient)
    {
        $businessId = $request->header('X-Business-Id');

        if ($ingredient->business_id != $businessId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'unit' => 'sometimes|required|string|max:50',
            'cost_per_unit' => 'sometimes|required|numeric|min:0',
            'current_stock' => 'sometimes|required|numeric|min:0',
            'min_stock' => 'sometimes|required|numeric|min:0',
            'category' => 'nullable|string|max:100',
            'supplier' => 'nullable|string|max:255',
            'expiry_date' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $ingredient->update($request->all());

        // Add calculated fields
        $ingredient->total_value = $ingredient->current_stock * $ingredient->cost_per_unit;

        if ($ingredient->current_stock <= $ingredient->min_stock * 0.5) {
            $ingredient->status = 'critical';
        } elseif ($ingredient->current_stock <= $ingredient->min_stock) {
            $ingredient->status = 'low';
        } else {
            $ingredient->status = 'adequate';
        }

        return response()->json($ingredient);
    }

    public function destroy(Request $request, Ingredient $ingredient)
    {
        $businessId = $request->header('X-Business-Id');

        if ($ingredient->business_id != $businessId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $ingredient->delete();

        return response()->json(['message' => 'Ingredient deleted successfully']);
    }

    public function updateStock(Request $request, Ingredient $ingredient)
    {
        $businessId = $request->header('X-Business-Id');

        if ($ingredient->business_id != $businessId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'quantity' => 'required|numeric',
            'type' => 'required|string|in:add,subtract,set',
            'notes' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $currentStock = $ingredient->current_stock;

        switch ($request->type) {
            case 'add':
                $ingredient->current_stock += $request->quantity;
                break;
            case 'subtract':
                $ingredient->current_stock -= $request->quantity;
                if ($ingredient->current_stock < 0) {
                    return response()->json(['message' => 'Insufficient stock'], 400);
                }
                break;
            case 'set':
                $ingredient->current_stock = $request->quantity;
                break;
        }

        $ingredient->save();

        // Add calculated fields
        $ingredient->total_value = $ingredient->current_stock * $ingredient->cost_per_unit;

        if ($ingredient->current_stock <= $ingredient->min_stock * 0.5) {
            $ingredient->status = 'critical';
        } elseif ($ingredient->current_stock <= $ingredient->min_stock) {
            $ingredient->status = 'low';
        } else {
            $ingredient->status = 'adequate';
        }

        return response()->json([
            'message' => 'Stock updated successfully',
            'ingredient' => $ingredient,
            'previous_stock' => $currentStock,
            'new_stock' => $ingredient->current_stock,
        ]);
    }

    public function getLowStock(Request $request)
    {
        $businessId = $request->header('X-Business-Id');

        if (!$businessId) {
            return response()->json(['message' => 'Business ID required'], 400);
        }

        $ingredients = Ingredient::where('business_id', $businessId)
            ->whereColumn('current_stock', '<=', 'min_stock')
            ->orderBy('current_stock', 'asc')
            ->get();

        $ingredients->transform(function($ingredient) {
            $ingredient->total_value = $ingredient->current_stock * $ingredient->cost_per_unit;

            if ($ingredient->current_stock <= $ingredient->min_stock * 0.5) {
                $ingredient->status = 'critical';
            } else {
                $ingredient->status = 'low';
            }

            return $ingredient;
        });

        return response()->json($ingredients);
    }
}
