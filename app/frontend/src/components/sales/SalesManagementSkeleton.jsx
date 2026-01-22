import { Card, CardContent, CardHeader } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';

/**
 * ✅ OPTIMIZATION: Skeleton Loader untuk halaman Sales Management
 * Menampilkan struktur halaman saat loading untuk UX yang lebih baik
 */
const SalesManagementSkeleton = () => {
  return (
    <div className='space-y-6 animate-pulse'>
      {/* Header Skeleton */}
      <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
        <div className='space-y-2'>
          <Skeleton className='h-8 w-64' />
          <Skeleton className='h-4 w-96' />
        </div>
        <div className='flex gap-2'>
          <Skeleton className='h-10 w-24' />
          <Skeleton className='h-10 w-24' />
          <Skeleton className='h-10 w-32' />
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className={index === 0 ? 'border-yellow-200 bg-yellow-50' : index === 1 ? 'border-red-200 bg-red-50' : index === 2 ? 'border-blue-200 bg-blue-50' : 'border-green-200 bg-green-50'}>
            <CardContent className='p-4'>
              <div className='flex items-center justify-between'>
                <div className='space-y-2'>
                  <Skeleton className='h-4 w-24' />
                  <Skeleton className='h-7 w-16' />
                </div>
                <Skeleton className='h-6 w-6 rounded' />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Card Skeleton */}
      <Card>
        <CardHeader>
          <Tabs value='orders'>
            <TabsList className='grid w-full grid-cols-2'>
              <TabsTrigger value='orders' disabled>
                <Skeleton className='h-4 w-20' />
              </TabsTrigger>
              <TabsTrigger value='customers' disabled>
                <Skeleton className='h-4 w-24' />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent>
          <div className='space-y-4'>
            {/* Search and Filter Skeleton */}
            <div className='flex flex-col sm:flex-row gap-4'>
              <Skeleton className='h-10 flex-1' />
              <Skeleton className='h-10 w-32' />
              <Skeleton className='h-10 w-24' />
            </div>

            {/* Orders/Customers List Skeleton */}
            <div className='space-y-4'>
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className='border rounded-lg p-6 space-y-4'
                >
                  {/* Order/Customer Header Skeleton */}
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-4 flex-1'>
                      <Skeleton className='h-12 w-12 rounded-full' />
                      <div className='flex-1 space-y-2'>
                        <Skeleton className='h-5 w-40' />
                        <div className='flex items-center gap-2'>
                          <Skeleton className='h-4 w-32' />
                          <Skeleton className='h-5 w-16 rounded-full' />
                        </div>
                        <Skeleton className='h-3 w-24' />
                      </div>
                    </div>
                    <div className='flex gap-2'>
                      <Skeleton className='h-8 w-20' />
                      <Skeleton className='h-8 w-20' />
                    </div>
                  </div>

                  {/* Order Items Skeleton */}
                  <div className='space-y-2 border-t pt-4'>
                    {Array.from({ length: 2 }).map((_, itemIndex) => (
                      <div
                        key={itemIndex}
                        className='flex items-center justify-between'
                      >
                        <div className='flex items-center gap-3 flex-1'>
                          <Skeleton className='h-10 w-10 rounded' />
                          <div className='flex-1 space-y-1'>
                            <Skeleton className='h-4 w-48' />
                            <Skeleton className='h-3 w-24' />
                          </div>
                        </div>
                        <Skeleton className='h-4 w-20' />
                      </div>
                    ))}
                  </div>

                  {/* Order Footer Skeleton */}
                  <div className='flex items-center justify-between pt-4 border-t'>
                    <div className='space-y-1'>
                      <Skeleton className='h-4 w-32' />
                      <Skeleton className='h-5 w-40' />
                    </div>
                    <div className='flex gap-2'>
                      <Skeleton className='h-8 w-24 rounded-full' />
                      <Skeleton className='h-8 w-8 rounded-full' />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Skeleton */}
            <div className='flex items-center justify-between pt-4 border-t'>
              <Skeleton className='h-4 w-32' />
              <div className='flex gap-2'>
                <Skeleton className='h-8 w-8 rounded' />
                <Skeleton className='h-8 w-8 rounded' />
                <Skeleton className='h-8 w-8 rounded' />
                <Skeleton className='h-8 w-8 rounded' />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesManagementSkeleton;

