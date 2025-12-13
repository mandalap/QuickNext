import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, RefreshCw, Search, ArrowRightLeft, CheckCircle, XCircle, Clock, Package } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import stockTransferService from '../../services/stockTransfer.service';
import { queryKeys } from '../../config/reactQuery';
import toast from 'react-hot-toast';
import { retryWithBackoff } from '../../utils/performance/retry';
import { useDebounce } from '../../hooks/useDebounce';
import useOptimisticUpdate from '../../hooks/useOptimisticUpdate';
import StockTransferManagementSkeleton from './StockTransferManagementSkeleton';
import StockTransferRequestModal from '../modals/StockTransferRequestModal';

const StockTransferManagement = () => {
  const { currentBusiness, currentOutlet } = useAuth();
  const queryClient = useQueryClient();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // ✅ OPTIMIZATION: Debounced search query
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // ✅ OPTIMIZATION: Optimistic updates untuk approve/reject/delete
  const {
    update: optimisticUpdateTransfer,
    isPending: isOptimisticPending,
  } = useOptimisticUpdate(
    data => {
      // Optimistic update: update UI immediately
      // Note: With React Query, we'll use queryClient.setQueryData instead
      if (data.transfers) {
        queryClient.setQueryData(
          queryKeys.inventory.transfers(currentOutlet?.id, {
            status: filterStatus !== 'all' ? filterStatus : undefined,
            search: debouncedSearchQuery || undefined,
          }),
          data.transfers
        );
      } else if (data.transfer) {
        queryClient.setQueryData(
          queryKeys.inventory.transfers(currentOutlet?.id, {
            status: filterStatus !== 'all' ? filterStatus : undefined,
            search: debouncedSearchQuery || undefined,
          }),
          (oldData) => oldData?.map(t => (t.id === data.transfer.id ? data.transfer : t)) || []
        );
      } else if (data.removedId) {
        queryClient.setQueryData(
          queryKeys.inventory.transfers(currentOutlet?.id, {
            status: filterStatus !== 'all' ? filterStatus : undefined,
            search: debouncedSearchQuery || undefined,
          }),
          (oldData) => oldData?.filter(t => t.id !== data.removedId) || []
        );
      }
    },
    previousData => {
      // Rollback: restore previous state on error
      if (previousData) {
        queryClient.setQueryData(
          queryKeys.inventory.transfers(currentOutlet?.id, {
            status: filterStatus !== 'all' ? filterStatus : undefined,
            search: debouncedSearchQuery || undefined,
          }),
          previousData.transfers
        );
      }
    }
  );

  // ✅ REACT QUERY: Fetch Stock Transfers
  const {
    data: transfersData,
    isLoading: loading,
    isFetching: refreshing,
    error: transfersError,
    refetch: refetchTransfers,
  } = useQuery({
    queryKey: queryKeys.inventory.transfers(currentOutlet?.id, {
      status: filterStatus !== 'all' ? filterStatus : undefined,
      search: debouncedSearchQuery || undefined,
    }),
    queryFn: async () => {
      const params = filterStatus !== 'all' ? { status: filterStatus } : {};
      if (debouncedSearchQuery) {
        params.search = debouncedSearchQuery;
      }

      const result = await stockTransferService.getAll(params);
      
      // ✅ FIX: Handle error response dengan lebih baik
      if (result.success === false) {
        // Throw error agar React Query bisa menangkapnya dan menampilkan di UI
        const errorMessage = result.error || result.message || 'Failed to load stock transfers';
        throw new Error(errorMessage);
      }
      
      // Return data jika success
      return result.data || [];
    },
    enabled: !!currentBusiness?.id && !!currentOutlet?.id,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    refetchOnMount: true,
    placeholderData: (previousData) => previousData || [],
  });

  const transfers = transfersData || [];

  // ✅ F5 Handler: Refresh data without full page reload
  const handleRefresh = useCallback(async () => {
    if (loading || refreshing) return; // Prevent multiple simultaneous refreshes

    try {
      await refetchTransfers();
      toast.success('Data stock transfer berhasil diperbarui');
    } catch (error) {
      console.error('Error refreshing stock transfer data:', error);
      toast.error('Gagal memuat ulang data stock transfer');
    }
  }, [loading, refreshing, refetchTransfers]);

  // ✅ Keyboard shortcuts: F5 and R to refresh without full page reload
  useEffect(() => {
    const handleKeyDown = (e) => {
      // F5 or R key (with Ctrl/Cmd or without)
      if (e.key === 'F5' || (e.key === 'r' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault(); // Prevent default browser reload
        handleRefresh();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleRefresh]);

  // ✅ OPTIMIZATION: Handle approve dengan optimistic update dan retry
  const handleApprove = useCallback(
    async transfer => {
      if (
        !window.confirm(
          'Are you sure you want to approve this transfer request?'
        )
      ) {
        return;
      }

      // ✅ OPTIMIZATION: Optimistic update - update UI immediately
      const previousTransfers = transfers;
      const updatedTransfer = { ...transfer, status: 'approved' };

      optimisticUpdateTransfer(
        {
          transfers: previousTransfers.map(t =>
            t.id === transfer.id ? updatedTransfer : t
          ),
          transfer: updatedTransfer,
        },
        async () => {
          // ✅ OPTIMIZATION: API call dengan retry
          const result = await retryWithBackoff(
            () =>
              stockTransferService.updateStatus(transfer.id, 'approved'),
            {
              maxRetries: 3,
              baseDelay: 1000,
              shouldRetry: error => {
                if (!error.response) return true;
                const status = error.response?.status;
                return status >= 500 || status === 429;
              },
            }
          );

          if (result.success !== false) {
            toast.success('Transfer request approved successfully');
            // ✅ REACT QUERY: Invalidate and refetch
            queryClient.invalidateQueries({ queryKey: queryKeys.inventory.transfers(currentOutlet?.id) });
            await refetchTransfers();
            return result;
          } else {
            throw new Error(result.message || 'Failed to approve transfer');
          }
        }
      );
    },
    [transfers, optimisticUpdateTransfer, refetchTransfers, queryClient, currentOutlet?.id]
  );

  // ✅ OPTIMIZATION: Handle reject dengan optimistic update dan retry
  const handleReject = useCallback(
    async transfer => {
      const reason = window.prompt('Please enter rejection reason:');
      if (!reason) return;

      // ✅ OPTIMIZATION: Optimistic update - update UI immediately
      const previousTransfers = transfers;
      const updatedTransfer = {
        ...transfer,
        status: 'rejected',
        rejection_reason: reason,
      };

      optimisticUpdateTransfer(
        {
          transfers: previousTransfers.map(t =>
            t.id === transfer.id ? updatedTransfer : t
          ),
          transfer: updatedTransfer,
        },
        async () => {
          // ✅ OPTIMIZATION: API call dengan retry
          const result = await retryWithBackoff(
            () =>
              stockTransferService.updateStatus(
                transfer.id,
                'rejected',
                reason
              ),
            {
              maxRetries: 3,
              baseDelay: 1000,
              shouldRetry: error => {
                if (!error.response) return true;
                const status = error.response?.status;
                return status >= 500 || status === 429;
              },
            }
          );

          if (result.success !== false) {
            toast.success('Transfer request rejected');
            // ✅ REACT QUERY: Invalidate and refetch
            queryClient.invalidateQueries({ queryKey: queryKeys.inventory.transfers(currentOutlet?.id) });
            await refetchTransfers();
            return result;
          } else {
            throw new Error(result.message || 'Failed to reject transfer');
          }
        }
      );
    },
    [transfers, optimisticUpdateTransfer, refetchTransfers, queryClient, currentOutlet?.id]
  );

  // ✅ OPTIMIZATION: Handle delete dengan optimistic update dan retry
  const handleDelete = useCallback(
    async id => {
      if (
        !window.confirm(
          'Are you sure you want to delete this transfer request?'
        )
      ) {
        return;
      }

      // ✅ OPTIMIZATION: Optimistic update - remove from UI immediately
      const previousTransfers = transfers;

      optimisticUpdateTransfer(
        {
          transfers: previousTransfers.filter(t => t.id !== id),
          removedId: id,
        },
        async () => {
          // ✅ OPTIMIZATION: API call dengan retry
          const result = await retryWithBackoff(
            () => stockTransferService.delete(id),
            {
              maxRetries: 3,
              baseDelay: 1000,
              shouldRetry: error => {
                if (!error.response) return true;
                const status = error.response?.status;
                return status >= 500 || status === 429;
              },
            }
          );

          if (result.success !== false) {
            toast.success('Transfer request deleted');
            // ✅ REACT QUERY: Invalidate and refetch
            queryClient.invalidateQueries({ queryKey: queryKeys.inventory.transfers(currentOutlet?.id) });
            await refetchTransfers();
            return result;
          } else {
            throw new Error(result.message || 'Failed to delete transfer');
          }
        }
      );
    },
    [transfers, optimisticUpdateTransfer, refetchTransfers, queryClient, currentOutlet?.id]
  );

  const getStatusBadge = (status) => {
    const badges = {
      pending: {
        color: 'bg-yellow-100 text-yellow-800',
        icon: <Clock className="w-4 h-4" />
      },
      approved: {
        color: 'bg-green-100 text-green-800',
        icon: <CheckCircle className="w-4 h-4" />
      },
      rejected: {
        color: 'bg-red-100 text-red-800',
        icon: <XCircle className="w-4 h-4" />
      },
      completed: {
        color: 'bg-blue-100 text-blue-800',
        icon: <CheckCircle className="w-4 h-4" />
      }
    };

    const badge = badges[status] || badges.pending;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // ✅ OPTIMIZATION: Filter transfers (search is already handled by API via debouncedSearchQuery)
  // But we keep client-side filtering as fallback if API doesn't support search
  const filteredTransfers = React.useMemo(() => {
    if (!debouncedSearchQuery) {
      return transfers;
    }
    
    return transfers.filter(transfer => {
      const searchLower = debouncedSearchQuery.toLowerCase();
      return (
        transfer.product?.name?.toLowerCase().includes(searchLower) ||
        transfer.from_outlet?.name?.toLowerCase().includes(searchLower) ||
        transfer.to_outlet?.name?.toLowerCase().includes(searchLower)
      );
    });
  }, [transfers, debouncedSearchQuery]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Stock Transfer Management</h1>
        <p className="text-gray-600">Manage stock transfers between outlets</p>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by product or outlet..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="completed">Completed</option>
          </select>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              disabled={loading || refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh data stock transfer"
            >
              <RefreshCw className={`w-5 h-5 ${loading || refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowRequestModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Transfer Request
            </button>
          </div>
        </div>
      </div>

      {/* Transfer List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <StockTransferManagementSkeleton />
        ) : transfersError ? (
          <div className="p-8 text-center">
            <Package className="w-16 h-16 mx-auto mb-4 text-red-300" />
            <p className="text-red-600 font-semibold mb-2">
              {transfersError.message || 'Gagal memuat data stock transfer'}
            </p>
            {transfersError.message?.includes('Tidak dapat terhubung ke server') && (
              <p className="text-sm text-gray-500 mb-4">
                Pastikan server backend berjalan di port 8000
              </p>
            )}
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        ) : filteredTransfers.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-2">No stock transfers found</p>
            <button
              onClick={() => setShowRequestModal(true)}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Create your first transfer request
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    From → To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Requested By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransfers.map((transfer) => (
                  <tr key={transfer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {transfer.product?.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            SKU: {transfer.product?.sku}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-900">
                          {transfer.from_outlet?.name}
                        </span>
                        <ArrowRightLeft className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {transfer.to_outlet?.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transfer.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(transfer.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transfer.requested_by?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(transfer.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {transfer.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(transfer)}
                              className="text-green-600 hover:text-green-900"
                              title="Approve"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleReject(transfer)}
                              className="text-red-600 hover:text-red-900"
                              title="Reject"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(transfer.id)}
                              className="text-gray-600 hover:text-gray-900"
                              title="Delete"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </>
                        )}
                        {transfer.status === 'rejected' && transfer.rejection_reason && (
                          <button
                            onClick={() => alert(`Rejection Reason: ${transfer.rejection_reason}`)}
                            className="text-blue-600 hover:text-blue-900 text-sm"
                          >
                            View Reason
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Request Modal */}
      {showRequestModal && (
        <StockTransferRequestModal
          onClose={() => setShowRequestModal(false)}
          onSuccess={async () => {
            setShowRequestModal(false);
            await refetchTransfers();
          }}
        />
      )}
    </div>
  );
};

export default StockTransferManagement;
