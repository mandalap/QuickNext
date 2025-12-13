<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class ExpenseController extends Controller
{
    public function index(Request $request)
    {
        $businessId = $request->header('X-Business-Id');
        $outletId = $request->header('X-Outlet-Id');

        if (!$businessId) {
            return response()->json(['error' => 'Business ID required'], 400);
        }

        $query = Expense::where('business_id', $businessId);

        if ($outletId) {
            $query->where('outlet_id', $outletId);
        }

        // Filter by date range
        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('expense_date', [
                $request->start_date,
                $request->end_date
            ]);
        }

        // Filter by category
        if ($request->has('category')) {
            $query->where('category', $request->category);
        }

        // Search by description
        if ($request->has('search')) {
            $query->where('description', 'like', '%' . $request->search . '%');
        }

        $expenses = $query->orderBy('expense_date', 'desc')
                         ->orderBy('created_at', 'desc')
                         ->paginate($request->get('per_page', 15));

        return response()->json($expenses);
    }

    public function store(Request $request)
    {
        $businessId = $request->header('X-Business-Id');
        $outletId = $request->header('X-Outlet-Id');

        if (!$businessId) {
            return response()->json(['error' => 'Business ID required'], 400);
        }

        if (!$outletId) {
            return response()->json(['error' => 'Outlet ID required'], 400);
        }

        $validator = Validator::make($request->all(), [
            'description' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0',
            'category' => 'required|string|max:100',
            'expense_date' => 'required|date',
            'payment_method' => 'nullable|string|max:50',
            'supplier' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            DB::beginTransaction();

            $expense = Expense::create([
                'business_id' => $businessId,
                'outlet_id' => $outletId,
                'description' => $request->description,
                'amount' => $request->amount,
                'category' => $request->category,
                'expense_date' => $request->expense_date,
                'receipt_image' => $request->receipt_image,
                'payment_method' => $request->payment_method ?? 'cash',
                'supplier' => $request->supplier,
                'notes' => $request->notes,
            ]);

            // Add transaction number to response
            $expenseData = $expense->toArray();
            $expenseData['transaction_number'] = 'EXP-' . str_pad($expense->id, 6, '0', STR_PAD_LEFT);

            DB::commit();

            Log::info('Expense created successfully', [
                'expense_id' => $expense->id,
                'business_id' => $businessId,
                'amount' => $expense->amount
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Pengeluaran berhasil ditambahkan',
                'data' => $expenseData
            ], 201);

        } catch (\Exception $e) {
            DB::rollback();

            Log::error('Failed to create expense', [
                'error' => $e->getMessage(),
                'business_id' => $businessId,
                'request_data' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal menambahkan pengeluaran',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        $businessId = request()->header('X-Business-Id');

        $expense = Expense::where('id', $id)
                         ->where('business_id', $businessId)
                         ->first();

        if (!$expense) {
            return response()->json(['error' => 'Pengeluaran tidak ditemukan'], 404);
        }

        return response()->json($expense);
    }

    public function update(Request $request, $id)
    {
        $businessId = $request->header('X-Business-Id');

        $expense = Expense::where('id', $id)
                         ->where('business_id', $businessId)
                         ->first();

        if (!$expense) {
            return response()->json(['error' => 'Pengeluaran tidak ditemukan'], 404);
        }

        $validator = Validator::make($request->all(), [
            'description' => 'sometimes|required|string|max:255',
            'amount' => 'sometimes|required|numeric|min:0',
            'category' => 'sometimes|required|string|max:100',
            'expense_date' => 'sometimes|required|date',
            'payment_method' => 'nullable|string|max:50',
            'supplier' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            DB::beginTransaction();

            $expense->update($request->only([
                'description', 'amount', 'category', 'expense_date', 'receipt_image'
            ]));

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Pengeluaran berhasil diperbarui',
                'data' => $expense
            ]);

        } catch (\Exception $e) {
            DB::rollback();

            Log::error('Failed to update expense', [
                'error' => $e->getMessage(),
                'expense_id' => $id,
                'business_id' => $businessId
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal memperbarui pengeluaran',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        $businessId = request()->header('X-Business-Id');

        $expense = Expense::where('id', $id)
                         ->where('business_id', $businessId)
                         ->first();

        if (!$expense) {
            return response()->json(['error' => 'Pengeluaran tidak ditemukan'], 404);
        }

        try {
            $expense->delete();

            return response()->json([
                'success' => true,
                'message' => 'Pengeluaran berhasil dihapus'
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to delete expense', [
                'error' => $e->getMessage(),
                'expense_id' => $id,
                'business_id' => $businessId
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal menghapus pengeluaran',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getStats(Request $request)
    {
        $businessId = $request->header('X-Business-Id');
        $outletId = $request->header('X-Outlet-Id');

        if (!$businessId) {
            return response()->json(['error' => 'Business ID required'], 400);
        }

        $query = Expense::where('business_id', $businessId);

        if ($outletId) {
            $query->where('outlet_id', $outletId);
        }

        // Filter by date range
        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('expense_date', [
                $request->start_date,
                $request->end_date
            ]);
        }

        $totalExpenses = $query->sum('amount');
        $expenseCount = $query->count();
        $avgExpense = $expenseCount > 0 ? $totalExpenses / $expenseCount : 0;

        // Get expenses by category
        $expensesByCategory = $query->select('category', DB::raw('SUM(amount) as total'))
                                  ->groupBy('category')
                                  ->orderBy('total', 'desc')
                                  ->get();

        return response()->json([
            'total_expenses' => $totalExpenses,
            'expense_count' => $expenseCount,
            'average_expense' => $avgExpense,
            'expenses_by_category' => $expensesByCategory
        ]);
    }
}

























