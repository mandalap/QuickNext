import React from 'react';

const SalesSummaryReportSkeleton = () => {
  return (
    <div className='space-y-4 p-4'>
      <div className='h-6 w-40 bg-gray-200 rounded animate-pulse' />
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        <div className='h-24 bg-gray-100 border rounded-lg animate-pulse' />
        <div className='h-24 bg-gray-100 border rounded-lg animate-pulse' />
        <div className='h-24 bg-gray-100 border rounded-lg animate-pulse' />
      </div>
      <div className='h-64 bg-gray-100 border rounded-lg animate-pulse' />
    </div>
  );
};

export default SalesSummaryReportSkeleton;

