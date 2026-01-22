import { cn } from '../../lib/utils';

/**
 * Skeleton Loader Component
 * Untuk menampilkan placeholder saat loading
 */
export const Skeleton = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gray-200 dark:bg-gray-800',
        className
      )}
      {...props}
    />
  );
};

/**
 * Skeleton untuk Card
 */
export const SkeletonCard = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        'p-4 rounded-lg border border-gray-200 dark:border-gray-800',
        className
      )}
      {...props}
    >
      <Skeleton className='h-6 w-3/4 mb-3' />
      <Skeleton className='h-4 w-full mb-2' />
      <Skeleton className='h-4 w-5/6' />
    </div>
  );
};

/**
 * Skeleton untuk Table Row
 */
export const SkeletonTableRow = ({ cols = 4, ...props }) => {
  return (
    <tr {...props}>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className='p-4'>
          <Skeleton className='h-4 w-full' />
        </td>
      ))}
    </tr>
  );
};

/**
 * Skeleton untuk Product Card
 */
export const SkeletonProductCard = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        'p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900',
        className
      )}
      {...props}
    >
      <Skeleton className='h-32 w-full mb-3 rounded-md' />
      <Skeleton className='h-5 w-3/4 mb-2' />
      <Skeleton className='h-4 w-1/2 mb-3' />
      <div className='flex justify-between items-center'>
        <Skeleton className='h-6 w-20' />
        <Skeleton className='h-8 w-24 rounded' />
      </div>
    </div>
  );
};

/**
 * Skeleton untuk List Item
 */
export const SkeletonListItem = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-800',
        className
      )}
      {...props}
    >
      <Skeleton className='h-10 w-10 rounded-full' />
      <div className='flex-1'>
        <Skeleton className='h-4 w-3/4 mb-2' />
        <Skeleton className='h-3 w-1/2' />
      </div>
    </div>
  );
};

/**
 * Skeleton untuk Dashboard Stats
 */
export const SkeletonStats = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        'p-6 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900',
        className
      )}
      {...props}
    >
      <Skeleton className='h-4 w-1/3 mb-4' />
      <Skeleton className='h-8 w-1/2 mb-2' />
      <Skeleton className='h-3 w-2/3' />
    </div>
  );
};
