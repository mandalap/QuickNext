import { Card, CardContent, CardHeader } from '../ui/card';

const PromoManagementSkeleton = () => {
  return (
    <div className='space-y-6'>
      {/* Outlet Context Banner Skeleton */}
      <div className='bg-blue-50 border border-blue-400 rounded-lg p-4'>
        <div className='h-5 w-full bg-gray-200 rounded animate-pulse' />
      </div>

      {/* Header Skeleton */}
      <div className='flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between'>
        <div className='space-y-2'>
          <div className='h-8 w-48 bg-gray-200 rounded animate-pulse' />
          <div className='h-4 w-64 bg-gray-200 rounded animate-pulse' />
        </div>
        <div className='flex gap-2'>
          <div className='h-10 w-24 bg-gray-200 rounded animate-pulse' />
          <div className='h-10 w-32 bg-gray-200 rounded animate-pulse' />
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        {[1, 2, 3].map(i => (
          <Card key={i} className='card-hover'>
            <CardContent className='p-6'>
              <div className='flex items-center justify-between'>
                <div className='flex-1 min-w-0 space-y-2'>
                  <div className='h-4 w-32 bg-gray-200 rounded animate-pulse' />
                  <div className='h-8 w-24 bg-gray-200 rounded animate-pulse' />
                </div>
                <div className='w-10 h-10 bg-gray-200 rounded-full animate-pulse' />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Skeleton */}
      <Card>
        <CardHeader>
          {/* Search Skeleton */}
          <div className='relative'>
            <div className='h-10 w-full bg-gray-200 rounded animate-pulse' />
          </div>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            {[1, 2, 3, 4, 5].map(i => (
              <div
                key={i}
                className='border rounded-lg p-4 hover:bg-gray-50 transition-colors'
                style={{
                  animationDelay: `${i * 100}ms`,
                }}
              >
                <div className='flex items-center justify-between mb-3'>
                  <div className='flex items-center gap-3'>
                    {/* Icon Skeleton */}
                    <div className='w-12 h-12 bg-gray-200 rounded-lg animate-pulse' />
                    {/* Name and Code Skeleton */}
                    <div className='space-y-2'>
                      <div className='h-5 w-32 bg-gray-200 rounded animate-pulse' />
                      <div className='h-4 w-24 bg-gray-200 rounded animate-pulse' />
                    </div>
                  </div>
                  {/* Badges Skeleton */}
                  <div className='flex items-center space-x-2'>
                    <div className='h-6 w-16 bg-gray-200 rounded-full animate-pulse' />
                    <div className='h-6 w-20 bg-gray-200 rounded-full animate-pulse' />
                  </div>
                </div>

                {/* Details Grid Skeleton */}
                <div className='grid grid-cols-2 md:grid-cols-6 gap-4'>
                  {[1, 2, 3, 4, 5, 6].map(j => (
                    <div key={j} className='space-y-1'>
                      <div className='h-3 w-16 bg-gray-200 rounded animate-pulse' />
                      <div className='h-4 w-24 bg-gray-200 rounded animate-pulse' />
                    </div>
                  ))}
                </div>

                {/* Actions Skeleton */}
                <div className='flex items-center justify-end gap-2 mt-4 pt-4 border-t'>
                  <div className='h-9 w-20 bg-gray-200 rounded animate-pulse' />
                  <div className='h-9 w-20 bg-gray-200 rounded animate-pulse' />
                  <div className='h-9 w-20 bg-gray-200 rounded animate-pulse' />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PromoManagementSkeleton;
