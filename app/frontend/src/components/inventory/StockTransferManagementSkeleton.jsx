import React from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';

const StockTransferManagementSkeleton = () => {
  return (
    <div className='space-y-6'>
      {/* Header Skeleton */}
      <div className='flex items-center justify-between'>
        <div className='h-8 w-48 bg-gray-200 rounded animate-pulse' />
        <div className='h-10 w-32 bg-gray-200 rounded animate-pulse' />
      </div>

      {/* Stats Cards Skeleton */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardHeader className='pb-2'>
              <div className='h-4 w-24 bg-gray-200 rounded animate-pulse' />
            </CardHeader>
            <CardContent>
              <div className='h-8 w-16 bg-gray-200 rounded animate-pulse' />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters Skeleton */}
      <Card>
        <CardContent className='pt-6'>
          <div className='flex gap-4'>
            <div className='h-10 flex-1 bg-gray-200 rounded animate-pulse' />
            <div className='h-10 w-32 bg-gray-200 rounded animate-pulse' />
            <div className='h-10 w-32 bg-gray-200 rounded animate-pulse' />
          </div>
        </CardContent>
      </Card>

      {/* Table Skeleton */}
      <Card>
        <CardHeader>
          <div className='h-6 w-32 bg-gray-200 rounded animate-pulse' />
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            {[1, 2, 3, 4, 5].map(i => (
              <div
                key={i}
                className='flex items-center justify-between p-4 border rounded-lg'
              >
                <div className='flex-1 space-y-2'>
                  <div className='h-4 w-48 bg-gray-200 rounded animate-pulse' />
                  <div className='h-3 w-32 bg-gray-200 rounded animate-pulse' />
                </div>
                <div className='h-8 w-24 bg-gray-200 rounded animate-pulse' />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StockTransferManagementSkeleton;















