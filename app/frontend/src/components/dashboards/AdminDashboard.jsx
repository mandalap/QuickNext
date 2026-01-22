import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { queryKeys } from '../../config/reactQuery';
import { useAuth } from '../../contexts/AuthContext';
import { salesService } from '../../services/salesService';
import { shiftService } from '../../services/shift.service';
import { formatCurrency } from '../../utils/formatters';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

const AdminDashboard = () => {
  const { currentOutlet } = useAuth();

  const {
    data: salesData,
    isLoading: loadingSales,
    error: _salesError, // Prefixed with _ to indicate intentionally unused
  } = useQuery({
    queryKey: queryKeys.sales.stats({ date_range: 'today' }, currentOutlet?.id),
    queryFn: async () => {
      const result = await salesService.getStats({ date_range: 'today' });
      if (result?.success && result.data) {
        let data = result.data;
        if (data?.data && typeof data.data === 'object') data = data.data;
        return data;
      }
      return null;
    },
    enabled: !!currentOutlet,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const { data: recentOrders = [], isLoading: loadingOrders } = useQuery({
    queryKey: queryKeys.sales.orders(
      { page: 1, limit: 5, date_range: 'today' },
      currentOutlet?.id
    ),
    queryFn: async () => {
      const result = await salesService.getOrders({
        page: 1,
        limit: 5,
        date_range: 'today',
      });
      if (result?.success && result.data) {
        if (Array.isArray(result.data)) return result.data;
        if (Array.isArray(result.data?.orders)) return result.data.orders;
      }
      return [];
    },
    enabled: !!currentOutlet,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  const { data: activeCashiers = [] } = useQuery({
    queryKey: queryKeys.shifts.allActive(currentOutlet?.id),
    queryFn: async () => {
      const result = await shiftService.getActiveShifts();
      if (result?.success && result.data) {
        if (Array.isArray(result.data)) return result.data;
        if (Array.isArray(result.data?.data)) return result.data.data;
      }
      return [];
    },
    enabled: !!currentOutlet,
    staleTime: 3 * 60 * 1000,
    retry: 1,
  });

  const stats = useMemo(() => {
    if (!salesData) {
      return {
        totalSales: 0,
        totalTransactions: 0,
        activeCustomers: 0,
        totalItems: 0,
        avg: 0,
      };
    }
    return {
      totalSales: salesData.total_sales || salesData.total_revenue || 0,
      totalTransactions:
        salesData.total_transactions || salesData.total_orders || 0,
      activeCustomers:
        salesData.unique_customers || salesData.active_customers || 0,
      totalItems: salesData.total_items || 0,
      avg: salesData.average_transaction || salesData.avg_order_value || 0,
    };
  }, [salesData]);

  return (
    <div className='space-y-6'>
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        <Card>
          <CardHeader>
            <CardTitle>Penjualan Hari Ini</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSales ? (
              <div className='h-8 bg-gray-200 rounded animate-pulse w-1/2' />
            ) : (
              <div className='text-2xl font-bold'>
                {formatCurrency(stats.totalSales)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Transaksi</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSales ? (
              <div className='h-8 bg-gray-200 rounded animate-pulse w-1/3' />
            ) : (
              <div className='text-2xl font-bold'>
                {stats.totalTransactions}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pelanggan Aktif</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSales ? (
              <div className='h-8 bg-gray-200 rounded animate-pulse w-1/3' />
            ) : (
              <div className='text-2xl font-bold'>{stats.activeCustomers}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
        <Card>
          <CardHeader>
            <CardTitle>Order Terbaru</CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            {loadingOrders ? (
              <div className='space-y-2'>
                <div className='h-10 bg-gray-200 rounded animate-pulse' />
                <div className='h-10 bg-gray-200 rounded animate-pulse' />
                <div className='h-10 bg-gray-200 rounded animate-pulse' />
              </div>
            ) : recentOrders.length === 0 ? (
              <div className='text-sm text-gray-500'>Belum ada order.</div>
            ) : (
              recentOrders.map(o => (
                <div
                  key={o.id}
                  className='flex items-center justify-between p-3 rounded border'
                >
                  <div className='text-sm'>
                    #{o.order_number} •{' '}
                    {o.customer || o.customer_name || 'Pelanggan'}
                  </div>
                  <div className='text-sm font-semibold'>
                    {formatCurrency(o.total_amount || o.total || 0)}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kasir Aktif</CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            {activeCashiers.length === 0 ? (
              <div className='text-sm text-gray-500'>
                Tidak ada kasir aktif.
              </div>
            ) : (
              activeCashiers.map((c, idx) => (
                <div
                  key={c.id || idx}
                  className='flex items-center justify-between p-3 rounded border'
                >
                  <div className='text-sm font-medium'>
                    {c.employee?.user?.name || 'Unknown'}
                  </div>
                  <Badge className='text-xs'>
                    Transaksi: {c.today_transactions || 0}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
