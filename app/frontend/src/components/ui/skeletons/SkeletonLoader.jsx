/**
 * Skeleton Loader Components
 * Provides visual feedback during data loading for better UX
 */

import React from 'react';

/**
 * Base Skeleton component
 */
export const Skeleton = ({ className = '', width, height, circle = false }) => {
  const style = {
    width: width || '100%',
    height: height || '1rem',
  };

  return (
    <div
      className={`animate-pulse bg-gray-200 ${
        circle ? 'rounded-full' : 'rounded'
      } ${className}`}
      style={style}
    />
  );
};

/**
 * Skeleton for text lines
 */
export const SkeletonText = ({ lines = 1, className = '' }) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? '80%' : '100%'}
          height='1rem'
        />
      ))}
    </div>
  );
};

/**
 * Skeleton for product card (POS)
 */
export const SkeletonProductCard = () => {
  return (
    <div className='border border-gray-200 rounded-lg p-3 space-y-3 bg-white'>
      {/* Image */}
      <Skeleton height='120px' className='rounded-md' />

      {/* Product name */}
      <Skeleton height='1rem' width='80%' />

      {/* Price */}
      <div className='flex justify-between items-center'>
        <Skeleton height='1.25rem' width='60px' />
        <Skeleton height='2rem' width='40px' circle />
      </div>
    </div>
  );
};

/**
 * Skeleton for order card (Unpaid Orders)
 */
export const SkeletonOrderCard = () => {
  return (
    <div className='border border-gray-200 rounded-lg p-4 space-y-3 bg-white'>
      <div className='flex justify-between items-start'>
        <div className='space-y-2 flex-1'>
          {/* Order number */}
          <Skeleton height='1.5rem' width='120px' />

          {/* Customer name */}
          <Skeleton height='1rem' width='150px' />

          {/* Date */}
          <Skeleton height='0.875rem' width='200px' />

          {/* Total */}
          <div className='flex items-center gap-4 pt-2'>
            <div className='space-y-1'>
              <Skeleton height='0.75rem' width='40px' />
              <Skeleton height='1.25rem' width='100px' />
            </div>
            <div className='space-y-1'>
              <Skeleton height='0.75rem' width='40px' />
              <Skeleton height='1rem' width='60px' />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className='flex flex-col gap-2'>
          <Skeleton height='2.5rem' width='120px' />
          <Skeleton height='2.5rem' width='120px' />
        </div>
      </div>
    </div>
  );
};

/**
 * Skeleton for table row
 */
export const SkeletonTableRow = ({ columns = 5 }) => {
  return (
    <tr className='border-b border-gray-200'>
      {Array.from({ length: columns }).map((_, index) => (
        <td key={index} className='px-4 py-3'>
          <Skeleton height='1rem' />
        </td>
      ))}
    </tr>
  );
};

/**
 * Skeleton for dashboard card
 */
export const SkeletonDashboardCard = () => {
  return (
    <div className='bg-white rounded-lg shadow p-6 space-y-3'>
      {/* Icon and title */}
      <div className='flex items-center gap-3'>
        <Skeleton circle height='3rem' width='3rem' />
        <Skeleton height='1rem' width='120px' />
      </div>

      {/* Value */}
      <Skeleton height='2rem' width='150px' />

      {/* Change indicator */}
      <Skeleton height='0.875rem' width='100px' />
    </div>
  );
};

/**
 * Skeleton for chart
 */
export const SkeletonChart = ({ height = '300px' }) => {
  return (
    <div className='bg-white rounded-lg shadow p-6'>
      {/* Chart title */}
      <Skeleton height='1.5rem' width='200px' className='mb-4' />

      {/* Chart area */}
      <Skeleton height={height} className='rounded' />
    </div>
  );
};

/**
 * Skeleton for POS Grid
 */
export const SkeletonPOSGrid = ({ count = 12 }) => {
  return (
    <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3'>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonProductCard key={index} />
      ))}
    </div>
  );
};

/**
 * Skeleton for Order List
 */
export const SkeletonOrderList = ({ count = 5 }) => {
  return (
    <div className='space-y-3'>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonOrderCard key={index} />
      ))}
    </div>
  );
};

/**
 * Skeleton for Table
 */
export const SkeletonTable = ({ rows = 10, columns = 5 }) => {
  return (
    <div className='bg-white rounded-lg shadow overflow-hidden'>
      <table className='min-w-full'>
        <thead className='bg-gray-50'>
          <tr>
            {Array.from({ length: columns }).map((_, index) => (
              <th key={index} className='px-4 py-3'>
                <Skeleton height='1rem' />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, index) => (
            <SkeletonTableRow key={index} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Skeleton for Dashboard Grid
 */
export const SkeletonDashboardGrid = ({ cards = 4 }) => {
  return (
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
      {Array.from({ length: cards }).map((_, index) => (
        <SkeletonDashboardCard key={index} />
      ))}
    </div>
  );
};

export default Skeleton;
