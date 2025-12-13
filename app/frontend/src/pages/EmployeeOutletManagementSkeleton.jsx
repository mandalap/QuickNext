import { Card, CardContent, CardHeader } from '../components/ui/card';

const EmployeeOutletManagementSkeleton = () => {
  return (
    <div className='space-y-6 p-6'>
      {/* Header Skeleton */}
      <div className='flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between'>
        <div className='space-y-2'>
          <div className='h-8 w-64 bg-gray-200 rounded animate-pulse' />
          <div className='h-4 w-96 bg-gray-200 rounded animate-pulse' />
        </div>
        <div className='flex gap-2'>
          <div className='h-10 w-24 bg-gray-200 rounded animate-pulse' />
          <div className='h-10 w-32 bg-gray-200 rounded animate-pulse' />
        </div>
      </div>

      {/* Filters Skeleton */}
      <Card>
        <CardContent className='p-4'>
          <div className='flex flex-wrap gap-4'>
            {[1, 2, 3].map(i => (
              <div key={i} className='h-10 w-32 bg-gray-200 rounded animate-pulse' />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Table Skeleton */}
      <Card>
        <CardHeader>
          <div className='h-6 w-48 bg-gray-200 rounded animate-pulse' />
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className='flex items-center justify-between p-4 border rounded'>
                <div className='flex-1 space-y-2'>
                  <div className='h-4 w-48 bg-gray-200 rounded animate-pulse' />
                  <div className='h-3 w-32 bg-gray-200 rounded animate-pulse' />
                </div>
                <div className='flex gap-2'>
                  <div className='h-8 w-16 bg-gray-200 rounded animate-pulse' />
                  <div className='h-8 w-16 bg-gray-200 rounded animate-pulse' />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeOutletManagementSkeleton;















