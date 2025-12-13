import { Card, CardContent } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';

/**
 * ✅ OPTIMIZATION: Skeleton Loader untuk halaman Financial Management
 * Menampilkan struktur halaman saat loading untuk UX yang lebih baik
 */
const FinancialSkeleton = () => {
  return (
    <div className='space-y-6 animate-pulse'>
      {/* Header Skeleton */}
      <div className='flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between'>
        <div className='space-y-2'>
          <Skeleton className='h-8 w-48' />
          <Skeleton className='h-4 w-64' />
        </div>
        <div className='flex gap-2'>
          <Skeleton className='h-10 w-24' />
          <Skeleton className='h-10 w-24' />
          <Skeleton className='h-10 w-40' />
        </div>
      </div>

      {/* Date Range Filter Card Skeleton */}
      <Card className='border-blue-100 shadow-sm'>
        <CardContent className='p-5'>
          <div className='flex flex-col gap-4'>
            {/* Header Filter */}
            <div className='flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between'>
              <div className='flex items-center gap-3'>
                <Skeleton className='h-10 w-10 rounded-lg' />
                <div className='space-y-2'>
                  <Skeleton className='h-4 w-32' />
                  <Skeleton className='h-3 w-48' />
                </div>
              </div>
            </div>

            {/* Filter Controls */}
            <div className='flex flex-col lg:flex-row gap-4 items-start lg:items-center'>
              <div className='flex flex-wrap gap-2'>
                <Skeleton className='h-9 w-24' />
                <Skeleton className='h-9 w-24' />
                <Skeleton className='h-9 w-24' />
                <Skeleton className='h-9 w-28' />
                <Skeleton className='h-9 w-24' />
              </div>
              <Skeleton className='h-10 w-48 rounded-lg' />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Cards Skeleton */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-6'>
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className='card-hover'>
            <CardContent className='p-6'>
              <div className='flex items-center justify-between'>
                <div className='flex-1 space-y-3'>
                  <Skeleton className='h-4 w-24' />
                  <Skeleton className='h-8 w-32' />
                  <Skeleton className='h-3 w-20' />
                </div>
                <Skeleton className='h-8 w-8 rounded' />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Card Skeleton */}
      <Card>
        {/* Tabs Skeleton */}
        <div className='p-4 border-b'>
          <Tabs value='overview'>
            <TabsList className='grid w-full grid-cols-5'>
              {Array.from({ length: 5 }).map((_, index) => (
                <TabsTrigger key={index} value={`tab-${index}`} disabled>
                  <Skeleton className='h-4 w-20' />
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <CardContent className='p-6'>
          <div className='space-y-6'>
            {/* Quick Stats Skeleton */}
            <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
              {Array.from({ length: 3 }).map((_, index) => (
                <Card key={index}>
                  <CardContent className='p-4'>
                    <div className='flex items-center justify-between'>
                      <div className='space-y-2'>
                        <Skeleton className='h-4 w-20' />
                        <Skeleton className='h-6 w-32' />
                        <Skeleton className='h-3 w-24' />
                      </div>
                      <Skeleton className='h-8 w-8 rounded' />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Chart/Graph Skeleton */}
            <Card>
              <CardContent className='p-6'>
                <div className='space-y-4'>
                  <Skeleton className='h-6 w-48' />
                  <Skeleton className='h-64 w-full rounded-lg' />
                </div>
              </CardContent>
            </Card>

            {/* Table/List Skeleton */}
            <Card>
              <CardContent className='p-6'>
                <div className='space-y-3'>
                  <Skeleton className='h-5 w-32' />
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div
                      key={index}
                      className='flex items-center justify-between p-3 border rounded-lg'
                    >
                      <div className='flex items-center gap-3 flex-1'>
                        <Skeleton className='h-10 w-10 rounded-full' />
                        <div className='flex-1 space-y-2'>
                          <Skeleton className='h-4 w-32' />
                          <Skeleton className='h-3 w-24' />
                        </div>
                      </div>
                      <Skeleton className='h-6 w-24' />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialSkeleton;

