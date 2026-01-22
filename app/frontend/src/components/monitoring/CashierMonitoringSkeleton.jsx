import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

/**
 * ✅ OPTIMIZATION: Skeleton Loader untuk halaman Cashier Monitoring
 * Menampilkan struktur halaman saat loading untuk UX yang lebih baik
 */
const CashierMonitoringSkeleton = () => {
  return (
    <div className='space-y-6 animate-pulse'>
      {/* Header Skeleton */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
        <div className='space-y-2'>
          <Skeleton className='h-8 w-64' />
          <Skeleton className='h-4 w-80' />
        </div>
        <div className='flex items-center gap-3'>
          <Skeleton className='h-4 w-40' />
          <Skeleton className='h-9 w-24' />
        </div>
      </div>

      {/* Summary Cards Skeleton */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <Skeleton className='h-4 w-32' />
              <Skeleton className='h-4 w-4 rounded' />
            </CardHeader>
            <CardContent>
              <Skeleton className='h-8 w-24 mb-2' />
              <Skeleton className='h-3 w-40' />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active Cashiers List Card Skeleton */}
      <Card>
        <CardHeader>
          <div className='flex items-center gap-2 mb-2'>
            <Skeleton className='h-5 w-5 rounded' />
            <Skeleton className='h-6 w-48' />
          </div>
          <Skeleton className='h-4 w-64' />
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            {/* Skeleton untuk Cashier Cards */}
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className='border border-gray-200 rounded-lg p-4'
              >
                <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-4'>
                  {/* Cashier Info Skeleton */}
                  <div className='flex items-center gap-4'>
                    <Skeleton className='h-12 w-12 rounded-full' />
                    <div className='space-y-2'>
                      <Skeleton className='h-5 w-40' />
                      <Skeleton className='h-4 w-48' />
                      <div className='flex items-center gap-2 mt-1'>
                        <Skeleton className='h-5 w-16 rounded-full' />
                        <Skeleton className='h-3 w-20' />
                      </div>
                    </div>
                  </div>

                  {/* Shift Info Skeleton */}
                  <div className='flex flex-col sm:flex-row gap-4'>
                    <div className='space-y-2'>
                      <Skeleton className='h-4 w-16' />
                      <Skeleton className='h-4 w-24' />
                      <Skeleton className='h-3 w-20' />
                    </div>
                    <div className='space-y-2'>
                      <Skeleton className='h-4 w-20' />
                      <Skeleton className='h-4 w-28' />
                    </div>
                  </div>

                  {/* Today's Stats Skeleton */}
                  <div className='grid grid-cols-3 gap-4'>
                    {Array.from({ length: 3 }).map((_, statIndex) => (
                      <div key={statIndex} className='text-center space-y-1'>
                        <Skeleton className='h-6 w-12 mx-auto' />
                        <Skeleton className='h-3 w-16 mx-auto' />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions Card Skeleton */}
      <Card className='bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200'>
        <CardHeader>
          <Skeleton className='h-6 w-32 mb-2' />
          <Skeleton className='h-4 w-48' />
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3'>
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className='h-10 w-full' />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CashierMonitoringSkeleton;

