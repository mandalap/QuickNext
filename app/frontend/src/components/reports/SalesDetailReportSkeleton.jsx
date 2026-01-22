import React from 'react';

const Shimmer = ({ className = '' }) => (
  <div className={`animate-pulse rounded bg-gray-100 ${className}`} />
);

const SalesDetailReportSkeleton = () => {
  return (
    <div className='space-y-6'>
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5'>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className='border rounded-xl p-4'>
            <Shimmer className='h-4 w-28 mb-3' />
            <Shimmer className='h-7 w-24' />
          </div>
        ))}
      </div>

      <div className='border rounded-xl'>
        <div className='p-4 border-b'>
          <Shimmer className='h-5 w-40' />
        </div>
        <div className='p-4 space-y-3'>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className='space-y-2'>
                <Shimmer className='h-4 w-24' />
                <Shimmer className='h-9 w-full' />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className='border rounded-xl'>
        <div className='p-4 border-b flex items-center justify-between'>
          <Shimmer className='h-5 w-40' />
          <div className='flex gap-2'>
            <Shimmer className='h-9 w-20' />
            <Shimmer className='h-9 w-16' />
          </div>
        </div>
        <div className='p-4'>
          <div className='w-full overflow-x-auto'>
            <div className='min-w-[800px]'>
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className='grid grid-cols-12 gap-3 py-3 border-b'>
                  {Array.from({ length: 12 }).map((__, j) => (
                    <Shimmer key={j} className='h-4 w-full' />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesDetailReportSkeleton;


