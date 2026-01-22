import { useCallback, useState } from 'react';
import { shiftService } from '../services/shift.service';

/**
 * Custom hook untuk load orders dari shift aktif
 * Memastikan konsistensi data antara KasirDashboard dan SalesManagement
 */
export const useShiftOrders = () => {
  const [shiftOrders, setShiftOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [usingShiftOrders, setUsingShiftOrders] = useState(false);

  /**
   * Load orders dari shift aktif jika ada
   * @param {Object} options - Options untuk loading
   * @param {Object} options.activeShift - Active shift object
   * @param {string} options.dateRange - Date range filter ('today', 'custom', etc.)
   * @param {string} options.searchTerm - Search term filter
   * @param {string} options.statusFilter - Status filter ('all', 'completed', etc.)
   * @returns {Promise<Array>} Array of orders
   */
  const loadOrdersFromShift = useCallback(
    async ({
      activeShift,
      dateRange = 'today',
      searchTerm = '',
      statusFilter = 'all',
    }) => {
      setLoading(true);
      setError(null);
      setUsingShiftOrders(false);

      try {
        // ✅ FIX: Jika ada shift aktif dan dateRange = 'today', gunakan orders dari shift detail
        if (activeShift && activeShift.id && dateRange === 'today') {
          try {
            const shiftDetailResult = await shiftService.getShiftDetail(
              activeShift.id
            );

            // ✅ FIX: Handle different response structures
            // Backend bisa return { success: true, data: { orders: [...] } } atau { success: true, data: { shift: {...}, orders: [...] } }
            const shiftData =
              shiftDetailResult.data?.shift || shiftDetailResult.data;
            const ordersFromResponse =
              shiftDetailResult.data?.orders || shiftData?.orders || [];

            if (shiftDetailResult.success) {
              let ordersData = Array.isArray(ordersFromResponse)
                ? ordersFromResponse
                : [];

              console.log('✅ Loaded orders from shift detail:', {
                shift_id: activeShift.id,
                orders_count: ordersData.length,
                shift_total_transactions: activeShift.total_transactions,
                response_structure: {
                  has_data: !!shiftDetailResult.data,
                  has_orders: !!shiftDetailResult.data?.orders,
                  has_shift: !!shiftData,
                  has_shift_orders: !!shiftData?.orders,
                },
              });

              // ✅ FIX: Jika orders kosong tapi shift memiliki total_transactions, ini normal (belum ada transaksi)
              // Tidak perlu throw error, cukup return empty array
              if (ordersData.length === 0) {
                console.log(
                  'ℹ️ Shift detail has no orders yet (normal for new shifts)'
                );
                setShiftOrders([]);
                setUsingShiftOrders(true);
                return {
                  success: true,
                  orders: [],
                  fromShift: true,
                };
              }

              // ✅ FIX: Apply filters (search, status) pada shift orders
              if (searchTerm) {
                ordersData = ordersData.filter(order => {
                  const searchLower = searchTerm.toLowerCase();
                  return (
                    (order.order_number || '')
                      .toLowerCase()
                      .includes(searchLower) ||
                    (order.customer_name || order.customer || '')
                      .toLowerCase()
                      .includes(searchLower) ||
                    (order.orderNumber || '')
                      .toLowerCase()
                      .includes(searchLower)
                  );
                });
              }

              if (statusFilter !== 'all') {
                ordersData = ordersData.filter(order => {
                  const st = (order.status || '').toLowerCase();
                  const ps = (order.payment_status || '').toLowerCase();
                  if (statusFilter === 'completed') {
                    return (
                      ps === 'paid' || st === 'completed' || st === 'success'
                    );
                  } else if (statusFilter === 'pending') {
                    return (
                      ps === 'pending' || ps === 'unpaid' || st === 'pending'
                    );
                  } else if (statusFilter === 'processing') {
                    return [
                      'processing',
                      'confirmed',
                      'preparing',
                      'ready',
                    ].includes(st);
                  } else if (statusFilter === 'cancelled') {
                    return st === 'cancelled' || st === 'canceled';
                  }
                  return true;
                });
              }

              setShiftOrders(ordersData);
              setUsingShiftOrders(true);

              console.log(
                '✅ Using shift orders for display:',
                ordersData.length
              );

              return {
                success: true,
                orders: ordersData,
                fromShift: true,
              };
            } else {
              // Shift detail gagal dimuat, fallback
              console.warn(
                '⚠️ Shift detail response tidak berhasil:',
                shiftDetailResult
              );
              throw new Error(
                shiftDetailResult.message ||
                  'Shift detail tidak berhasil dimuat'
              );
            }
          } catch (error) {
            console.warn(
              '⚠️ Error loading shift detail, fallback to getOrders API:',
              error
            );
            // Fallback ke getOrders API
            setUsingShiftOrders(false);
            return {
              success: false,
              error: error.message,
              fallback: true,
            };
          }
        } else {
          // Tidak ada shift aktif atau bukan 'today', tidak menggunakan shift orders
          setUsingShiftOrders(false);
          return {
            success: true,
            orders: [],
            fromShift: false,
          };
        }
      } catch (error) {
        console.error('❌ Error in loadOrdersFromShift:', error);
        setError(error.message);
        setUsingShiftOrders(false);
        return {
          success: false,
          error: error.message,
          fallback: true,
        };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Reset shift orders state
   */
  const resetShiftOrders = useCallback(() => {
    setShiftOrders([]);
    setUsingShiftOrders(false);
    setError(null);
  }, []);

  return {
    shiftOrders,
    usingShiftOrders,
    loading,
    error,
    loadOrdersFromShift,
    resetShiftOrders,
  };
};
