<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Budget;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;

class BudgetController extends Controller
{
    /**
     * Map expense categories to budget categories
     */
    private function mapExpenseCategoryToBudget($expenseCategory)
    {
        $mapping = [
            'gaji' => 'Gaji Karyawan',
            'bahan_baku' => 'Bahan Baku',
            'listrik' => 'Utilitas',
            'internet' => 'Utilitas',
            'pemeliharaan' => 'Maintenance',
            'pemasaran' => 'Marketing',
            'operasional' => 'Operasional',
            'sewa' => 'Sewa',
            'transportasi' => 'Transportasi',
            'lainnya' => 'Lainnya',
        ];

        return $mapping[$expenseCategory] ?? $expenseCategory;
    }

    /**
     * Map budget category to expense categories
     */
    private function mapBudgetCategoryToExpense($budgetCategory)
    {
        $mapping = [
            'Gaji Karyawan' => ['gaji'],
            'Bahan Baku' => ['bahan_baku'],
            'Utilitas' => ['listrik', 'internet'],
            'Maintenance' => ['pemeliharaan'],
            'Marketing' => ['pemasaran'],
            'Operasional' => ['operasional'],
            'Sewa' => ['sewa'],
            'Transportasi' => ['transportasi'],
            'Lainnya' => ['lainnya'],
        ];

        return $mapping[$budgetCategory] ?? [$budgetCategory];
    }

    /**
     * Display a listing of budgets
     */
    public function index(Request $request)
    {
        try {
            $businessId = $request->header('X-Business-Id');
            $outletId = $request->header('X-Outlet-Id');

            if (!$businessId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Business ID required'
                ], 400);
            }

            $query = Budget::where('business_id', $businessId);

            if ($outletId) {
                $query->where(function($q) use ($outletId) {
                    $q->where('outlet_id', $outletId)
                      ->orWhereNull('outlet_id'); // Include global budgets
                });
            }

            // Filter by status
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            // Filter by category
            if ($request->has('category')) {
                $query->where('category', $request->category);
            }

            // Filter by date range
            if ($request->has('start_date') && $request->has('end_date')) {
                $query->where(function($q) use ($request) {
                    $q->whereBetween('start_date', [$request->start_date, $request->end_date])
                      ->orWhereBetween('end_date', [$request->start_date, $request->end_date])
                      ->orWhere(function($q2) use ($request) {
                          $q2->where('start_date', '<=', $request->start_date)
                             ->where('end_date', '>=', $request->end_date);
                      });
                });
            }

            // Search
            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('category', 'like', "%{$search}%")
                      ->orWhere('name', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%");
                });
            }

            $budgets = $query->orderBy('start_date', 'desc')
                           ->orderBy('created_at', 'desc')
                           ->get();

            // Calculate actual amounts from expenses
            $budgets = $budgets->map(function($budget) use ($businessId, $outletId) {
                // Get expense categories that match this budget category
                $expenseCategories = $this->mapBudgetCategoryToExpense($budget->category);
                
                $expenseQuery = DB::table('expenses')
                    ->where('business_id', $businessId)
                    ->whereIn('category', $expenseCategories)
                    ->whereBetween('expense_date', [
                        $budget->start_date->format('Y-m-d'),
                        $budget->end_date->format('Y-m-d')
                    ]);

                if ($outletId) {
                    $expenseQuery->where('outlet_id', $outletId);
                } elseif ($budget->outlet_id) {
                    $expenseQuery->where('outlet_id', $budget->outlet_id);
                }

                $actualAmount = $expenseQuery->sum('amount') ?? 0;
                $budget->actual_amount = $actualAmount;
                
                // Calculate remaining and percentage
                $budget->remaining_amount = $budget->budgeted_amount - $actualAmount;
                $budget->percentage_used = $budget->budgeted_amount > 0 
                    ? ($actualAmount / $budget->budgeted_amount) * 100 
                    : 0;
                $budget->usage_status = $this->getUsageStatus($budget->percentage_used);
                
                return $budget;
            });

            return response()->json([
                'success' => true,
                'data' => $budgets
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching budgets', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Error fetching budgets: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created budget
     */
    public function store(Request $request)
    {
        try {
            $businessId = $request->header('X-Business-Id');
            $outletId = $request->header('X-Outlet-Id');

            if (!$businessId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Business ID required'
                ], 400);
            }

            $validator = Validator::make($request->all(), [
                'category' => 'required|string|max:255',
                'name' => 'nullable|string|max:255',
                'description' => 'nullable|string',
                'budgeted_amount' => 'required|numeric|min:0',
                'start_date' => 'required|date',
                'end_date' => 'required|date|after_or_equal:start_date',
                'period' => 'nullable|in:daily,weekly,monthly,yearly,custom',
                'status' => 'nullable|in:active,completed,cancelled',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            $budget = Budget::create([
                'business_id' => $businessId,
                'outlet_id' => $outletId,
                'category' => $request->category,
                'name' => $request->name,
                'description' => $request->description,
                'budgeted_amount' => $request->budgeted_amount,
                'actual_amount' => 0,
                'start_date' => $request->start_date,
                'end_date' => $request->end_date,
                'period' => $request->period ?? 'monthly',
                'status' => $request->status ?? 'active',
            ]);

            Log::info('Budget created', [
                'budget_id' => $budget->id,
                'business_id' => $businessId,
                'category' => $request->category
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Budget berhasil dibuat',
                'data' => $budget
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error creating budget', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Error creating budget: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified budget
     */
    public function show(Request $request, $id)
    {
        try {
            $businessId = $request->header('X-Business-Id');

            if (!$businessId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Business ID required'
                ], 400);
            }

            $budget = Budget::where('id', $id)
                          ->where('business_id', $businessId)
                          ->first();

            if (!$budget) {
                return response()->json([
                    'success' => false,
                    'message' => 'Budget tidak ditemukan'
                ], 404);
            }

            // Get expense categories that match this budget category
            $expenseCategories = $this->mapBudgetCategoryToExpense($budget->category);

            // Calculate actual amount from expenses
            $actualAmount = DB::table('expenses')
                ->where('business_id', $businessId)
                ->whereIn('category', $expenseCategories)
                ->whereBetween('expense_date', [
                    $budget->start_date->format('Y-m-d'),
                    $budget->end_date->format('Y-m-d')
                ])
                ->when($budget->outlet_id, function($q) use ($budget) {
                    $q->where('outlet_id', $budget->outlet_id);
                })
                ->sum('amount') ?? 0;

            $budget->actual_amount = $actualAmount;
            $budget->remaining_amount = $budget->budgeted_amount - $actualAmount;
            $budget->percentage_used = $budget->budgeted_amount > 0 
                ? ($actualAmount / $budget->budgeted_amount) * 100 
                : 0;
            $budget->usage_status = $this->getUsageStatus($budget->percentage_used);

            return response()->json([
                'success' => true,
                'data' => $budget
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching budget', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Error fetching budget: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update the specified budget
     */
    public function update(Request $request, $id)
    {
        try {
            $businessId = $request->header('X-Business-Id');

            if (!$businessId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Business ID required'
                ], 400);
            }

            $budget = Budget::where('id', $id)
                          ->where('business_id', $businessId)
                          ->first();

            if (!$budget) {
                return response()->json([
                    'success' => false,
                    'message' => 'Budget tidak ditemukan'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'category' => 'sometimes|required|string|max:255',
                'name' => 'nullable|string|max:255',
                'description' => 'nullable|string',
                'budgeted_amount' => 'sometimes|required|numeric|min:0',
                'start_date' => 'sometimes|required|date',
                'end_date' => 'sometimes|required|date|after_or_equal:start_date',
                'period' => 'nullable|in:daily,weekly,monthly,yearly,custom',
                'status' => 'nullable|in:active,completed,cancelled',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            $budget->update($request->only([
                'category',
                'name',
                'description',
                'budgeted_amount',
                'start_date',
                'end_date',
                'period',
                'status',
            ]));

            Log::info('Budget updated', [
                'budget_id' => $budget->id,
                'business_id' => $businessId
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Budget berhasil diperbarui',
                'data' => $budget
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating budget', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Error updating budget: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified budget
     */
    public function destroy(Request $request, $id)
    {
        try {
            $businessId = $request->header('X-Business-Id');

            if (!$businessId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Business ID required'
                ], 400);
            }

            $budget = Budget::where('id', $id)
                          ->where('business_id', $businessId)
                          ->first();

            if (!$budget) {
                return response()->json([
                    'success' => false,
                    'message' => 'Budget tidak ditemukan'
                ], 404);
            }

            $budget->delete();

            Log::info('Budget deleted', [
                'budget_id' => $id,
                'business_id' => $businessId
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Budget berhasil dihapus'
            ]);
        } catch (\Exception $e) {
            Log::error('Error deleting budget', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Error deleting budget: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get usage status based on percentage
     */
    private function getUsageStatus($percentage)
    {
        if ($percentage > 100) {
            return 'over_budget';
        } elseif ($percentage >= 90) {
            return 'warning';
        } elseif ($percentage >= 75) {
            return 'on_track';
        } else {
            return 'under_budget';
        }
    }
}
