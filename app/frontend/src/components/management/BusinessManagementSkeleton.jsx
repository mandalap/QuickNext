/**
 * BusinessManagementSkeleton Component
 *
 * Loading skeleton for Business Management page
 * Displays placeholder UI while business and outlet data is being fetched
 */

import { Card, CardContent, CardHeader } from '../ui/card';

const BusinessManagementSkeleton = () => {
  return (
    <div className='space-y-6'>
      {/* Search Skeleton */}
      <div className='mb-6'>
        <div className='h-10 w-full bg-gray-200 rounded animate-pulse' />
      </div>

      {/* Outlets Grid Skeleton */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        {[...Array(6)].map((_, i) => (
          <Card key={i} className='overflow-hidden'>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <div className='space-y-2 flex-1'>
                  <div className='h-6 w-32 bg-gray-200 rounded animate-pulse' />
                  <div className='h-4 w-24 bg-gray-200 rounded animate-pulse' />
                </div>
                <div className='h-6 w-16 bg-gray-200 rounded animate-pulse' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='space-y-3'>
                <div className='h-4 w-full bg-gray-200 rounded animate-pulse' />
                <div className='h-4 w-3/4 bg-gray-200 rounded animate-pulse' />
                <div className='h-4 w-1/2 bg-gray-200 rounded animate-pulse' />
                <div className='flex gap-2 mt-4'>
                  <div className='h-8 w-20 bg-gray-200 rounded animate-pulse' />
                  <div className='h-8 w-20 bg-gray-200 rounded animate-pulse' />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default BusinessManagementSkeleton;

