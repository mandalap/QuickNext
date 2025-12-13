<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StockTransferRequest;
use App\Models\ProductOutlet;
use App\Models\AuditLog;
use App\Models\Notification;
use App\Helpers\SubscriptionHelper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class StockTransferRequestController extends Controller
{
    /**
     * Check stock transfer access before processing request
     */
    private function checkStockTransferAccess($user)
    {
        if (!SubscriptionHelper::hasStockTransferAccess($user)) {
            return response()->json([
                'success' => false,
                'message' => 'Akses Transfer Stok memerlukan paket Premium. Silakan upgrade paket Anda.',
                'error' => 'subscription_feature_required',
                'required_feature' => 'has_stock_transfer_access',
                'redirect_to' => '/subscription-settings'
            ], 403);
        }
        return null;
    }

    /**
     * Display a listing of stock transfer requests.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        
        // ✅ FIX: Check stock transfer access
        $accessCheck = $this->checkStockTransferAccess($user);
        if ($accessCheck) {
            return $accessCheck;
        }
        
        $businessId = $request->header('X-Business-Id');
        $outletId = $request->header('X-Outlet-Id');

        $query = StockTransferRequest::with([
            'fromOutlet:id,name',
            'toOutlet:id,name',
            'product:id,name,sku',
            'requestedBy:id,name',
            'approvedBy:id,name'
        ])->where('business_id', $businessId);

        // Filter by outlet if specified
        if ($outletId) {
            $query->where(function ($q) use ($outletId) {
                $q->where('from_outlet_id', $outletId)
                  ->orWhere('to_outlet_id', $outletId);
            });
        }

        // Filter by status if specified
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Order by most recent first
        $query->orderBy('created_at', 'desc');

        $transfers = $query->paginate($request->get('per_page', 15));

        return response()->json($transfers);
    }

    /**
     * Store a new stock transfer request.
     */
    public function store(Request $request)
    {
        $user = $request->user();
        
        // ✅ FIX: Check stock transfer access
        $accessCheck = $this->checkStockTransferAccess($user);
        if ($accessCheck) {
            return $accessCheck;
        }
        
        $businessId = $request->header('X-Business-Id');

        $validator = Validator::make($request->all(), [
            'from_outlet_id' => 'required|exists:outlets,id',
            'to_outlet_id' => 'required|exists:outlets,id|different:from_outlet_id',
            'product_id' => 'required|exists:products,id',
            'quantity' => 'required|integer|min:1',
            'reason' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Check if source outlet has enough stock
        $sourceStock = ProductOutlet::where('outlet_id', $request->from_outlet_id)
            ->where('product_id', $request->product_id)
            ->first();

        if (!$sourceStock || $sourceStock->stock < $request->quantity) {
            return response()->json([
                'message' => 'Insufficient stock at source outlet',
                'available_stock' => $sourceStock->stock ?? 0
            ], 400);
        }

        try {
            $transfer = StockTransferRequest::create([
                'business_id' => $businessId,
                'from_outlet_id' => $request->from_outlet_id,
                'to_outlet_id' => $request->to_outlet_id,
                'product_id' => $request->product_id,
                'quantity' => $request->quantity,
                'reason' => $request->reason,
                'status' => 'pending',
                'requested_by' => $user->id,
                'requested_at' => now(),
            ]);

            // Create notification for outlet manager
            Notification::createNotification([
                'business_id' => $businessId,
                'outlet_id' => $request->from_outlet_id,
                'user_id' => $user->id, // Should be manager, for now use requester
                'type' => 'stock_transfer_request',
                'title' => 'New Stock Transfer Request',
                'message' => "Request to transfer {$request->quantity} items from outlet",
                'data' => [
                    'transfer_id' => $transfer->id,
                    'product_id' => $request->product_id,
                ]
            ]);

            // Audit log
            AuditLog::log([
                'business_id' => $businessId,
                'outlet_id' => $request->from_outlet_id,
                'action' => 'create',
                'entity_type' => 'stock_transfer_request',
                'entity_id' => $transfer->id,
                'new_values' => $transfer->toArray(),
                'description' => 'Stock transfer request created',
            ]);

            return response()->json([
                'message' => 'Stock transfer request created successfully',
                'data' => $transfer->load(['fromOutlet', 'toOutlet', 'product', 'requestedBy'])
            ], 201);

        } catch (\Exception $e) {
            \Log::error('Failed to create stock transfer request: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to create stock transfer request',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified stock transfer request.
     */
    public function show(Request $request, $id)
    {
        $businessId = $request->header('X-Business-Id');

        $transfer = StockTransferRequest::with([
            'fromOutlet',
            'toOutlet',
            'product',
            'requestedBy',
            'approvedBy'
        ])->where('business_id', $businessId)
          ->findOrFail($id);

        return response()->json($transfer);
    }

    /**
     * Approve or reject a stock transfer request.
     */
    public function updateStatus(Request $request, $id)
    {
        $businessId = $request->header('X-Business-Id');
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'status' => 'required|in:approved,rejected',
            'rejection_reason' => 'required_if:status,rejected|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $transfer = StockTransferRequest::where('business_id', $businessId)
            ->where('status', 'pending')
            ->findOrFail($id);

        DB::beginTransaction();
        try {
            $oldValues = $transfer->toArray();

            if ($request->status === 'approved') {
                // Update transfer status
                $transfer->update([
                    'status' => 'approved',
                    'approved_by' => $user->id,
                    'approved_at' => now(),
                ]);

                // Execute the transfer: reduce from source, add to destination
                ProductOutlet::where('outlet_id', $transfer->from_outlet_id)
                    ->where('product_id', $transfer->product_id)
                    ->decrement('stock', $transfer->quantity);

                ProductOutlet::where('outlet_id', $transfer->to_outlet_id)
                    ->where('product_id', $transfer->product_id)
                    ->increment('stock', $transfer->quantity);

                // Mark as completed
                $transfer->update([
                    'status' => 'completed',
                    'completed_at' => now(),
                ]);

                $message = 'Stock transfer request approved and completed';

            } else {
                // Reject
                $transfer->update([
                    'status' => 'rejected',
                    'approved_by' => $user->id,
                    'approved_at' => now(),
                    'rejection_reason' => $request->rejection_reason,
                ]);

                $message = 'Stock transfer request rejected';
            }

            // Notify requester
            Notification::createNotification([
                'business_id' => $businessId,
                'outlet_id' => $transfer->to_outlet_id,
                'user_id' => $transfer->requested_by,
                'type' => 'stock_transfer_' . $request->status,
                'title' => 'Stock Transfer ' . ucfirst($request->status),
                'message' => "Your stock transfer request has been {$request->status}",
                'data' => [
                    'transfer_id' => $transfer->id,
                ]
            ]);

            // Audit log
            AuditLog::log([
                'business_id' => $businessId,
                'outlet_id' => $transfer->from_outlet_id,
                'action' => 'update',
                'entity_type' => 'stock_transfer_request',
                'entity_id' => $transfer->id,
                'old_values' => $oldValues,
                'new_values' => $transfer->fresh()->toArray(),
                'description' => "Stock transfer request {$request->status}",
            ]);

            DB::commit();

            return response()->json([
                'message' => $message,
                'data' => $transfer->fresh()->load(['fromOutlet', 'toOutlet', 'product', 'approvedBy'])
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Failed to update stock transfer request: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to update stock transfer request',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified stock transfer request.
     */
    public function destroy(Request $request, $id)
    {
        $businessId = $request->header('X-Business-Id');

        $transfer = StockTransferRequest::where('business_id', $businessId)
            ->where('status', 'pending')
            ->findOrFail($id);

        $oldValues = $transfer->toArray();
        $transfer->delete();

        // Audit log
        AuditLog::log([
            'business_id' => $businessId,
            'outlet_id' => $transfer->from_outlet_id,
            'action' => 'delete',
            'entity_type' => 'stock_transfer_request',
            'entity_id' => $id,
            'old_values' => $oldValues,
            'description' => 'Stock transfer request deleted',
        ]);

        return response()->json([
            'message' => 'Stock transfer request deleted successfully'
        ]);
    }
}
