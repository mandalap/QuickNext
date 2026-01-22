/**
 * SelfServiceOrderSkeleton Component
 *
 * Loading skeleton for Self Service Order page
 * Displays placeholder UI while self service data is being fetched
 */

import { Card, CardContent, CardHeader } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Skeleton } from '../ui/skeleton';

const SelfServiceOrderSkeleton = () => {
  return (
    <div className='space-y-6'>
      {/* Header Skeleton */}
      <div className='flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between'>
        <div className='space-y-2'>
          <div className='h-8 w-64 bg-gray-200 rounded animate-pulse' />
          <div className='h-4 w-96 bg-gray-200 rounded animate-pulse' />
        </div>
        <div className='h-10 w-32 bg-gray-200 rounded animate-pulse' />
      </div>

      {/* Stats Cards Skeleton */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
        {[...Array(4)].map((_, index) => (
          <Card key={index} className='card-hover'>
            <CardContent className='p-6'>
              <div className='flex items-center justify-between'>
                <div className='flex-1 min-w-0 space-y-2'>
                  <div className='h-4 w-24 bg-gray-200 rounded animate-pulse' />
                  <div className='h-8 w-20 bg-gray-200 rounded animate-pulse' />
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
          <Tabs defaultValue='orders'>
            <TabsList className='grid w-full grid-cols-3'>
              <TabsTrigger value='orders'>
                <div className='h-5 w-20 bg-gray-200 rounded animate-pulse' />
              </TabsTrigger>
              <TabsTrigger value='tables'>
                <div className='h-5 w-20 bg-gray-200 rounded animate-pulse' />
              </TabsTrigger>
              <TabsTrigger value='qr-menus'>
                <div className='h-5 w-24 bg-gray-200 rounded animate-pulse' />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent>
          {/* Search and Filter Skeleton */}
          <div className='flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6'>
            <div className='relative flex-1'>
              <div className='h-10 w-full bg-gray-200 rounded animate-pulse' />
            </div>
            <div className='h-10 w-24 bg-gray-200 rounded animate-pulse' />
            <div className='h-10 w-32 bg-gray-200 rounded animate-pulse' />
          </div>

          {/* Content Skeleton - Orders Tab */}
          <div className='space-y-4'>
            {/* Orders Grid Skeleton */}
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
              {[...Array(6)].map((_, index) => (
                <Card key={index} className='border-gray-200'>
                  <CardHeader className='pb-3'>
                    <div className='flex items-center justify-between'>
                      <div className='flex-1 space-y-2'>
                        <div className='h-6 w-32 bg-gray-200 rounded animate-pulse' />
                        <div className='h-4 w-48 bg-gray-200 rounded animate-pulse' />
                      </div>
                      <div className='h-6 w-20 bg-gray-200 rounded-full animate-pulse' />
                    </div>
                  </CardHeader>
                  <CardContent className='space-y-3'>
                    <div className='space-y-2'>
                      <div className='h-4 w-full bg-gray-200 rounded animate-pulse' />
                      <div className='h-4 w-3/4 bg-gray-200 rounded animate-pulse' />
                      <div className='h-4 w-1/2 bg-gray-200 rounded animate-pulse' />
                    </div>
                    <div className='border-t pt-3'>
                      <div className='flex justify-between'>
                        <div className='h-5 w-16 bg-gray-200 rounded animate-pulse' />
                        <div className='h-5 w-24 bg-gray-200 rounded animate-pulse' />
                      </div>
                    </div>
                    <div className='flex items-center justify-between'>
                      <div className='h-4 w-32 bg-gray-200 rounded animate-pulse' />
                      <div className='h-9 w-24 bg-gray-200 rounded animate-pulse' />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination Skeleton */}
            <div className='flex items-center justify-between mt-6'>
              <div className='h-4 w-48 bg-gray-200 rounded animate-pulse' />
              <div className='flex gap-2'>
                <div className='h-10 w-10 bg-gray-200 rounded animate-pulse' />
                <div className='h-10 w-10 bg-gray-200 rounded animate-pulse' />
                <div className='h-10 w-10 bg-gray-200 rounded animate-pulse' />
              </div>
            </div>
          </div>

          {/* Content Skeleton - Tables Tab */}
          <div className='space-y-4'>
            {/* Table Search Skeleton */}
            <div className='flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between'>
              <div className='space-y-2'>
                <div className='h-6 w-32 bg-gray-200 rounded animate-pulse' />
                <div className='h-4 w-48 bg-gray-200 rounded animate-pulse' />
              </div>
              <div className='flex gap-2'>
                <div className='h-10 w-64 bg-gray-200 rounded animate-pulse' />
                <div className='h-10 w-24 bg-gray-200 rounded animate-pulse' />
              </div>
            </div>

            {/* Tables Grid Skeleton */}
            <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3'>
              {[...Array(8)].map((_, index) => (
                <Card key={index} className='border-gray-200 animate-pulse bg-gray-50'>
                  <CardContent className='p-2 sm:p-3'>
                    <div className='flex items-start justify-between mb-2 gap-1'>
                      <Skeleton className='h-5 sm:h-6 w-16 flex-1 mx-auto' />
                      <Skeleton className='h-5 w-5 sm:h-6 sm:w-6 rounded flex-shrink-0' />
                    </div>
                    <div className='space-y-1 sm:space-y-2'>
                      <div className='flex justify-center'>
                        <Skeleton className='h-5 w-20 rounded-full' />
                      </div>
                      <div className='flex items-center justify-center space-x-1'>
                        <Skeleton className='h-3 w-3 rounded-full' />
                        <Skeleton className='h-3 w-6' />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SelfServiceOrderSkeleton;

