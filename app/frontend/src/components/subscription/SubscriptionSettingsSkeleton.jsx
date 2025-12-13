import React from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';

const SubscriptionSettingsSkeleton = () => {
  return (
    <div className='space-y-6'>
      {/* Header Skeleton */}
      <div className='flex items-center justify-between'>
        <div className='h-8 w-64 bg-gray-200 rounded animate-pulse' />
        <div className='h-10 w-32 bg-gray-200 rounded animate-pulse' />
      </div>

      {/* Current Subscription Card Skeleton */}
      <Card>
        <CardHeader>
          <div className='h-6 w-48 bg-gray-200 rounded animate-pulse' />
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='h-12 w-full bg-gray-200 rounded animate-pulse' />
          <div className='h-4 w-32 bg-gray-200 rounded animate-pulse' />
          <div className='h-4 w-40 bg-gray-200 rounded animate-pulse' />
        </CardContent>
      </Card>

      {/* Plans Grid Skeleton */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardHeader>
              <div className='h-6 w-32 bg-gray-200 rounded animate-pulse' />
            </CardHeader>
            <CardContent className='space-y-3'>
              <div className='h-8 w-24 bg-gray-200 rounded animate-pulse' />
              <div className='h-4 w-full bg-gray-200 rounded animate-pulse' />
              <div className='h-4 w-3/4 bg-gray-200 rounded animate-pulse' />
              <div className='h-10 w-full bg-gray-200 rounded animate-pulse mt-4' />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SubscriptionSettingsSkeleton;















