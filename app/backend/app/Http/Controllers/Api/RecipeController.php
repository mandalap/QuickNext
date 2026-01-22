<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Recipe;
use App\Models\Product;
use App\Models\Ingredient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class RecipeController extends Controller
{
    public function index(Request $request)
    {
        $businessId = $request->header('X-Business-Id');

        if (!$businessId) {
            return response()->json(['message' => 'Business ID required'], 400);
        }

        // Get all products with their recipes for this business
        $products = Product::where('business_id', $businessId)
            ->with(['recipes.ingredient'])
            ->get();

        $recipesData = $products->map(function($product) {
            if ($product->recipes->isEmpty()) {
                return null;
            }

            $totalCost = $product->recipes->sum(function($recipe) {
                return $recipe->quantity * $recipe->ingredient->cost_per_unit;
            });

            $margin = $product->price > 0
                ? (($product->price - $totalCost) / $product->price) * 100
                : 0;

            return [
                'id' => $product->id,
                'product_id' => $product->id,
                'name' => $product->name,
                'category' => $product->category->name ?? 'Uncategorized',
                'serving_size' => 1,
                'total_cost' => round($totalCost, 2),
                'selling_price' => $product->price,
                'margin' => round($margin, 2),
                'ingredients' => $product->recipes->map(function($recipe) {
                    return [
                        'id' => $recipe->id,
                        'ingredient_id' => $recipe->ingredient_id,
                        'name' => $recipe->ingredient->name,
                        'quantity' => $recipe->quantity,
                        'unit' => $recipe->ingredient->unit,
                        'cost_per_unit' => $recipe->ingredient->cost_per_unit,
                        'total_cost' => round($recipe->quantity * $recipe->ingredient->cost_per_unit, 2),
                    ];
                })->values(),
            ];
        })->filter()->values();

        return response()->json($recipesData);
    }

    public function show(Request $request, $productId)
    {
        $businessId = $request->header('X-Business-Id');

        if (!$businessId) {
            return response()->json(['message' => 'Business ID required'], 400);
        }

        $product = Product::where('business_id', $businessId)
            ->where('id', $productId)
            ->with(['recipes.ingredient', 'category'])
            ->first();

        if (!$product) {
            return response()->json(['message' => 'Product not found'], 404);
        }

        $totalCost = $product->recipes->sum(function($recipe) {
            return $recipe->quantity * $recipe->ingredient->cost_per_unit;
        });

        $margin = $product->price > 0
            ? (($product->price - $totalCost) / $product->price) * 100
            : 0;

        $recipeData = [
            'id' => $product->id,
            'product_id' => $product->id,
            'name' => $product->name,
            'category' => $product->category->name ?? 'Uncategorized',
            'serving_size' => 1,
            'total_cost' => round($totalCost, 2),
            'selling_price' => $product->price,
            'margin' => round($margin, 2),
            'ingredients' => $product->recipes->map(function($recipe) {
                return [
                    'id' => $recipe->id,
                    'ingredient_id' => $recipe->ingredient_id,
                    'name' => $recipe->ingredient->name,
                    'quantity' => $recipe->quantity,
                    'unit' => $recipe->ingredient->unit,
                    'cost_per_unit' => $recipe->ingredient->cost_per_unit,
                    'total_cost' => round($recipe->quantity * $recipe->ingredient->cost_per_unit, 2),
                ];
            })->values(),
        ];

        return response()->json($recipeData);
    }

    public function store(Request $request)
    {
        $businessId = $request->header('X-Business-Id');

        if (!$businessId) {
            return response()->json(['message' => 'Business ID required'], 400);
        }

        $validator = Validator::make($request->all(), [
            'product_id' => 'required|exists:products,id',
            'ingredients' => 'required|array|min:1',
            'ingredients.*.ingredient_id' => 'required|exists:ingredients,id',
            'ingredients.*.quantity' => 'required|numeric|min:0.001',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Verify product belongs to this business
        $product = Product::where('id', $request->product_id)
            ->where('business_id', $businessId)
            ->first();

        if (!$product) {
            return response()->json(['message' => 'Product not found or unauthorized'], 403);
        }

        // Verify all ingredients belong to this business
        $ingredientIds = collect($request->ingredients)->pluck('ingredient_id')->unique();
        $validIngredients = Ingredient::where('business_id', $businessId)
            ->whereIn('id', $ingredientIds)
            ->pluck('id');

        if ($validIngredients->count() !== $ingredientIds->count()) {
            return response()->json(['message' => 'One or more ingredients not found or unauthorized'], 403);
        }

        DB::beginTransaction();
        try {
            // Delete existing recipes for this product
            Recipe::where('product_id', $request->product_id)->delete();

            // Create new recipes
            $recipes = [];
            foreach ($request->ingredients as $ingredientData) {
                $recipes[] = Recipe::create([
                    'product_id' => $request->product_id,
                    'ingredient_id' => $ingredientData['ingredient_id'],
                    'quantity' => $ingredientData['quantity'],
                ]);
            }

            DB::commit();

            // Return the updated recipe data
            $product->load(['recipes.ingredient', 'category']);

            $totalCost = $product->recipes->sum(function($recipe) {
                return $recipe->quantity * $recipe->ingredient->cost_per_unit;
            });

            $margin = $product->price > 0
                ? (($product->price - $totalCost) / $product->price) * 100
                : 0;

            $recipeData = [
                'id' => $product->id,
                'product_id' => $product->id,
                'name' => $product->name,
                'category' => $product->category->name ?? 'Uncategorized',
                'serving_size' => 1,
                'total_cost' => round($totalCost, 2),
                'selling_price' => $product->price,
                'margin' => round($margin, 2),
                'ingredients' => $product->recipes->map(function($recipe) {
                    return [
                        'id' => $recipe->id,
                        'ingredient_id' => $recipe->ingredient_id,
                        'name' => $recipe->ingredient->name,
                        'quantity' => $recipe->quantity,
                        'unit' => $recipe->ingredient->unit,
                        'cost_per_unit' => $recipe->ingredient->cost_per_unit,
                        'total_cost' => round($recipe->quantity * $recipe->ingredient->cost_per_unit, 2),
                    ];
                })->values(),
            ];

            return response()->json($recipeData, 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to create recipe', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $productId)
    {
        $businessId = $request->header('X-Business-Id');

        if (!$businessId) {
            return response()->json(['message' => 'Business ID required'], 400);
        }

        $validator = Validator::make($request->all(), [
            'ingredients' => 'required|array|min:1',
            'ingredients.*.ingredient_id' => 'required|exists:ingredients,id',
            'ingredients.*.quantity' => 'required|numeric|min:0.001',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Verify product belongs to this business
        $product = Product::where('id', $productId)
            ->where('business_id', $businessId)
            ->first();

        if (!$product) {
            return response()->json(['message' => 'Product not found or unauthorized'], 403);
        }

        // Verify all ingredients belong to this business
        $ingredientIds = collect($request->ingredients)->pluck('ingredient_id')->unique();
        $validIngredients = Ingredient::where('business_id', $businessId)
            ->whereIn('id', $ingredientIds)
            ->pluck('id');

        if ($validIngredients->count() !== $ingredientIds->count()) {
            return response()->json(['message' => 'One or more ingredients not found or unauthorized'], 403);
        }

        DB::beginTransaction();
        try {
            // Delete existing recipes for this product
            Recipe::where('product_id', $productId)->delete();

            // Create new recipes
            foreach ($request->ingredients as $ingredientData) {
                Recipe::create([
                    'product_id' => $productId,
                    'ingredient_id' => $ingredientData['ingredient_id'],
                    'quantity' => $ingredientData['quantity'],
                ]);
            }

            DB::commit();

            // Return the updated recipe data
            $product->load(['recipes.ingredient', 'category']);

            $totalCost = $product->recipes->sum(function($recipe) {
                return $recipe->quantity * $recipe->ingredient->cost_per_unit;
            });

            $margin = $product->price > 0
                ? (($product->price - $totalCost) / $product->price) * 100
                : 0;

            $recipeData = [
                'id' => $product->id,
                'product_id' => $product->id,
                'name' => $product->name,
                'category' => $product->category->name ?? 'Uncategorized',
                'serving_size' => 1,
                'total_cost' => round($totalCost, 2),
                'selling_price' => $product->price,
                'margin' => round($margin, 2),
                'ingredients' => $product->recipes->map(function($recipe) {
                    return [
                        'id' => $recipe->id,
                        'ingredient_id' => $recipe->ingredient_id,
                        'name' => $recipe->ingredient->name,
                        'quantity' => $recipe->quantity,
                        'unit' => $recipe->ingredient->unit,
                        'cost_per_unit' => $recipe->ingredient->cost_per_unit,
                        'total_cost' => round($recipe->quantity * $recipe->ingredient->cost_per_unit, 2),
                    ];
                })->values(),
            ];

            return response()->json($recipeData);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to update recipe', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, $productId)
    {
        $businessId = $request->header('X-Business-Id');

        if (!$businessId) {
            return response()->json(['message' => 'Business ID required'], 400);
        }

        // Verify product belongs to this business
        $product = Product::where('id', $productId)
            ->where('business_id', $businessId)
            ->first();

        if (!$product) {
            return response()->json(['message' => 'Product not found or unauthorized'], 403);
        }

        // Delete all recipes for this product
        Recipe::where('product_id', $productId)->delete();

        return response()->json(['message' => 'Recipe deleted successfully']);
    }

    public function calculateCost(Request $request, $productId)
    {
        $businessId = $request->header('X-Business-Id');

        if (!$businessId) {
            return response()->json(['message' => 'Business ID required'], 400);
        }

        $product = Product::where('business_id', $businessId)
            ->where('id', $productId)
            ->with(['recipes.ingredient'])
            ->first();

        if (!$product) {
            return response()->json(['message' => 'Product not found'], 404);
        }

        $totalCost = $product->recipes->sum(function($recipe) {
            return $recipe->quantity * $recipe->ingredient->cost_per_unit;
        });

        $margin = $product->price > 0
            ? (($product->price - $totalCost) / $product->price) * 100
            : 0;

        $profit = $product->price - $totalCost;

        return response()->json([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'total_cost' => round($totalCost, 2),
            'selling_price' => $product->price,
            'profit' => round($profit, 2),
            'margin' => round($margin, 2),
            'ingredient_breakdown' => $product->recipes->map(function($recipe) {
                return [
                    'ingredient' => $recipe->ingredient->name,
                    'quantity' => $recipe->quantity,
                    'unit' => $recipe->ingredient->unit,
                    'cost_per_unit' => $recipe->ingredient->cost_per_unit,
                    'total_cost' => round($recipe->quantity * $recipe->ingredient->cost_per_unit, 2),
                ];
            }),
        ]);
    }
}
