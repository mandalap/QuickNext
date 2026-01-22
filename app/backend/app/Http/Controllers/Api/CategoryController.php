<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Services\ImageOptimizationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Validator;

class CategoryController extends Controller
{
    public function index(Request $request)
    {
        $businessId = $request->header('X-Business-Id');

        if (!$businessId) {
            return response()->json(['message' => 'Business ID required'], 400);
        }

        // Cache categories untuk 1 jam (3600 detik)
        $cacheKey = "categories:business:{$businessId}";
        $categories = Cache::remember($cacheKey, 3600, function() use ($businessId) {
            return Category::where('business_id', $businessId)
                ->withCount(['products' => function ($query) {
                    $query->where('is_active', true);
                }])
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get()
                ->map(function($category) {
                    // Ensure products_count is always present and is an integer
                    // withCount automatically adds products_count attribute
                    $category->products_count = (int)($category->products_count ?? 0);

                    return $category;
                });
        });

        return response()->json($categories);
    }

    public function store(Request $request)
    {
        $businessId = $request->header('X-Business-Id');

        if (!$businessId) {
            return response()->json(['message' => 'Business ID required'], 400);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:categories,name,NULL,id,business_id,' . $businessId,
            'description' => 'nullable|string',
            'sort_order' => 'nullable|integer|min:0',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $categoryData = array_merge($request->except('image'), [
            'business_id' => $businessId,
            'slug' => \Illuminate\Support\Str::slug($request->name),
        ]);

        // Handle image upload dengan optimization dan WebP conversion
        if ($request->hasFile('image')) {
            $imageService = new ImageOptimizationService();
            $categoryData['image'] = $imageService->optimizeAndSave(
                $request->file('image'),
                'categories',
                600,  // max width untuk category
                85    // quality
            );
        }

        $category = Category::create($categoryData);

        // Load category with products_count
        $category->loadCount(['products' => function ($query) {
            $query->where('is_active', true);
        }]);

        // Clear cache setelah create
        Cache::forget("categories:business:{$businessId}");

        return response()->json($category, 201);
    }

    public function show(Request $request, Category $category)
    {
        $businessId = $request->header('X-Business-Id');

        // Ensure user can only view categories from their business
        if ($category->business_id != $businessId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($category);
    }

    public function update(Request $request, Category $category)
    {
        $businessId = $request->header('X-Business-Id');

        // Ensure user can only update categories from their business
        if ($category->business_id != $businessId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255|unique:categories,name,' . $category->id . ',id,business_id,' . $businessId,
            'description' => 'nullable|string',
            'sort_order' => 'nullable|integer|min:0',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $updateData = $request->except(['image', 'remove_image', '_method']);
        if ($request->has('name')) {
            $updateData['slug'] = \Illuminate\Support\Str::slug($request->name);
        }

        // Handle image removal
        if ($request->has('remove_image') && $request->remove_image == '1') {
            // Delete old image if exists
            $imageService = new ImageOptimizationService();
            $imageService->deleteImage($category->image);
            $updateData['image'] = null;
        }
        // Handle image upload (new image) dengan optimization dan WebP conversion
        elseif ($request->hasFile('image')) {
            // Delete old image if exists
            $imageService = new ImageOptimizationService();
            $imageService->deleteImage($category->image);

            // Optimize and save new image
            $updateData['image'] = $imageService->optimizeAndSave(
                $request->file('image'),
                'categories',
                600,  // max width untuk category
                85    // quality
            );
        }
        // If neither remove_image nor new image file, keep existing image (don't touch it)

        $category->update($updateData);

        // Load category with products_count
        $category->loadCount(['products' => function ($query) {
            $query->where('is_active', true);
        }]);

        // Clear cache setelah update
        Cache::forget("categories:business:{$businessId}");

        return response()->json($category);
    }

    public function destroy(Request $request, Category $category)
    {
        $businessId = $request->header('X-Business-Id');

        // Ensure user can only delete categories from their business
        if ($category->business_id != $businessId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Check if category has products
        if ($category->products()->count() > 0) {
            return response()->json([
                'message' => 'Cannot delete category with existing products. Please reassign or delete products first.'
            ], 422);
        }

        $category->delete();

        // Clear cache setelah delete
        Cache::forget("categories:business:{$businessId}");

        return response()->json(['message' => 'Category deleted successfully']);
    }
}
