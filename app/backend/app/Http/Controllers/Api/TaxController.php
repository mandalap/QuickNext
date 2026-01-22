<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tax;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class TaxController extends Controller
{
    /**
     * Display a listing of taxes
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

            $query = Tax::where('business_id', $businessId);

            if ($outletId) {
                $query->where(function($q) use ($outletId) {
                    $q->where('outlet_id', $outletId)
                      ->orWhereNull('outlet_id'); // Include global taxes
                });
            }

            // Filter by status
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            // Filter by type
            if ($request->has('type')) {
                $query->where('type', $request->type);
            }

            // Filter by date range
            if ($request->has('start_date') && $request->has('end_date')) {
                $query->where(function($q) use ($request) {
                    $q->whereBetween('period_start', [$request->start_date, $request->end_date])
                      ->orWhereBetween('period_end', [$request->start_date, $request->end_date])
                      ->orWhere(function($q2) use ($request) {
                          $q2->where('period_start', '<=', $request->start_date)
                             ->where('period_end', '>=', $request->end_date);
                      });
                });
            }

            // Search
            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('type', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%")
                      ->orWhere('period', 'like', "%{$search}%");
                });
            }

            $taxes = $query->orderBy('due_date', 'desc')
                          ->orderBy('created_at', 'desc')
                          ->get();

            // Check for overdue taxes
            $taxes = $taxes->map(function($tax) {
                if ($tax->status === 'pending' && $tax->due_date < now()->toDateString()) {
                    $tax->status = 'overdue';
                }
                return $tax;
            });

            return response()->json([
                'success' => true,
                'data' => $taxes
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching taxes: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching taxes: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created tax
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
                'type' => 'required|string|max:100',
                'description' => 'nullable|string|max:255',
                'rate' => 'required|numeric|min:0|max:100',
                'base' => 'required|numeric|min:0',
                'due_date' => 'required|date',
                'period_start' => 'required|date',
                'period_end' => 'required|date',
                'period' => 'required|string|max:100',
                'status' => 'nullable|in:pending,paid,overdue,cancelled',
                'notes' => 'nullable|string',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Calculate amount from base and rate
            $amount = ($request->base * $request->rate) / 100;

            DB::beginTransaction();

            $tax = Tax::create([
                'business_id' => $businessId,
                'outlet_id' => $outletId,
                'type' => $request->type,
                'description' => $request->description,
                'rate' => $request->rate,
                'base' => $request->base,
                'amount' => $amount,
                'due_date' => $request->due_date,
                'period_start' => $request->period_start,
                'period_end' => $request->period_end,
                'period' => $request->period,
                'status' => $request->status ?? 'pending',
                'notes' => $request->notes,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Tax created successfully',
                'data' => $tax
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating tax: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error creating tax: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified tax
     */
    public function show($id)
    {
        try {
            $tax = Tax::findOrFail($id);
            
            return response()->json([
                'success' => true,
                'data' => $tax
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching tax: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Tax not found'
            ], 404);
        }
    }

    /**
     * Update the specified tax
     */
    public function update(Request $request, $id)
    {
        try {
            $tax = Tax::findOrFail($id);

            $validator = Validator::make($request->all(), [
                'type' => 'sometimes|required|string|max:100',
                'description' => 'nullable|string|max:255',
                'rate' => 'sometimes|required|numeric|min:0|max:100',
                'base' => 'sometimes|required|numeric|min:0',
                'due_date' => 'sometimes|required|date',
                'period_start' => 'sometimes|required|date',
                'period_end' => 'sometimes|required|date',
                'period' => 'sometimes|required|string|max:100',
                'status' => 'sometimes|in:pending,paid,overdue,cancelled',
                'notes' => 'nullable|string',
                'paid_at' => 'nullable|date',
                'payment_reference' => 'nullable|string|max:255',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            // Recalculate amount if base or rate changed
            if ($request->has('base') || $request->has('rate')) {
                $base = $request->has('base') ? $request->base : $tax->base;
                $rate = $request->has('rate') ? $request->rate : $tax->rate;
                $request->merge(['amount' => ($base * $rate) / 100]);
            }

            // ✅ NEW: Jika status diubah menjadi 'paid', set paid_at jika belum diisi
            $updateData = $request->only([
                'type',
                'description',
                'rate',
                'base',
                'amount',
                'due_date',
                'period_start',
                'period_end',
                'period',
                'status',
                'notes',
                'paid_at',
                'payment_reference',
            ]);

            // Jika status diubah menjadi 'paid' dan paid_at belum diisi, set paid_at ke sekarang
            if (isset($updateData['status']) && $updateData['status'] === 'paid' && !$updateData['paid_at']) {
                $updateData['paid_at'] = now();
            }

            // Jika status diubah dari 'paid' ke status lain, reset paid_at
            if (isset($updateData['status']) && $updateData['status'] !== 'paid' && $tax->status === 'paid') {
                $updateData['paid_at'] = null;
            }

            $tax->update($updateData);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Tax updated successfully',
                'data' => $tax->fresh()
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating tax: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error updating tax: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified tax
     */
    public function destroy($id)
    {
        try {
            $tax = Tax::findOrFail($id);

            DB::beginTransaction();
            $tax->delete();
            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Tax deleted successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting tax: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error deleting tax: ' . $e->getMessage()
            ], 500);
        }
    }
}
