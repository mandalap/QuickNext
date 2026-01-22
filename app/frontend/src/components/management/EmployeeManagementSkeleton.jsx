/**
 * EmployeeManagementSkeleton Component
 *
 * Loading skeleton for Employee Management page
 * Displays placeholder UI while employee data is being fetched
 */

import { Card, CardContent, CardHeader } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

const EmployeeManagementSkeleton = () => {
  return (
    <div className='space-y-6'>
      {/* Header Skeleton */}
      <div className='flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between'>
        <div className='space-y-2'>
          <div className='h-8 w-64 bg-gray-200 rounded animate-pulse' />
          <div className='h-4 w-96 bg-gray-200 rounded animate-pulse' />
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-6'>
        {[...Array(5)].map((_, index) => (
          <Card key={index} className='card-hover'>
            <CardContent className='p-4 sm:p-6'>
              <div className='flex items-center justify-between'>
                <div className='flex-1 min-w-0 space-y-2'>
                  <div className='h-4 w-24 bg-gray-200 rounded animate-pulse' />
                  <div className='h-8 w-16 bg-gray-200 rounded animate-pulse' />
                  <div className='h-3 w-20 bg-gray-200 rounded animate-pulse' />
                </div>
                <div className='w-8 h-8 bg-gray-200 rounded-full animate-pulse' />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Skeleton */}
      <Card>
        <CardHeader>
          <Tabs defaultValue='employees'>
            <TabsList className='grid w-full grid-cols-2'>
              <TabsTrigger value='employees'>
                <div className='h-5 w-20 bg-gray-200 rounded animate-pulse' />
              </TabsTrigger>
              <TabsTrigger value='attendance'>
                <div className='h-5 w-20 bg-gray-200 rounded animate-pulse' />
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

          {/* Table/List Skeleton */}
          <div className='space-y-4'>
            {/* Table Header */}
            <div className='hidden sm:grid grid-cols-6 gap-4 pb-3 border-b'>
              {[...Array(6)].map((_, i) => (
                <div key={i} className='h-4 bg-gray-200 rounded animate-pulse' />
              ))}
            </div>

            {/* Table Rows / Card Items */}
            {[...Array(5)].map((_, rowIndex) => (
              <div
                key={rowIndex}
                className='border rounded-lg p-4 space-y-3'
                style={{
                  animationDelay: `${rowIndex * 100}ms`,
                }}
              >
                {/* Mobile/Desktop Card Layout */}
                <div className='grid grid-cols-1 sm:grid-cols-6 gap-4 items-center'>
                  {/* Avatar & Name */}
                  <div className='flex items-center gap-3 col-span-1 sm:col-span-2'>
                    <div className='w-10 h-10 bg-gray-200 rounded-full animate-pulse' />
                    <div className='flex-1 space-y-2'>
                      <div className='h-4 w-32 bg-gray-200 rounded animate-pulse' />
                      <div className='h-3 w-24 bg-gray-200 rounded animate-pulse' />
                    </div>
                  </div>

                  {/* Role */}
                  <div className='col-span-1'>
                    <div className='h-6 w-20 bg-gray-200 rounded-full animate-pulse' />
                  </div>

                  {/* Status */}
                  <div className='col-span-1'>
                    <div className='h-6 w-16 bg-gray-200 rounded-full animate-pulse' />
                  </div>

                  {/* Phone */}
                  <div className='col-span-1 hidden sm:block'>
                    <div className='h-4 w-24 bg-gray-200 rounded animate-pulse' />
                  </div>

                  {/* Actions */}
                  <div className='col-span-1 flex justify-end gap-2'>
                    <div className='h-8 w-8 bg-gray-200 rounded animate-pulse' />
                    <div className='h-8 w-8 bg-gray-200 rounded animate-pulse' />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State Skeleton (hidden, just for structure) */}
          <div className='hidden'>
            <div className='text-center py-12'>
              <div className='h-16 w-16 bg-gray-200 rounded-full mx-auto mb-4 animate-pulse' />
              <div className='h-6 w-48 bg-gray-200 rounded mx-auto mb-2 animate-pulse' />
              <div className='h-4 w-64 bg-gray-200 rounded mx-auto animate-pulse' />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeManagementSkeleton;
