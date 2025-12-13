import { Package } from 'lucide-react';

const ProductSkeleton = () => {
  return (
    <div className='p-4 transition-colors border rounded-lg animate-pulse'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center space-x-4 flex-1'>
          {/* Image skeleton */}
          <div className='w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center'>
            <Package className='w-8 h-8 text-gray-400' />
          </div>

          {/* Content skeleton */}
          <div className='flex-1 min-w-0'>
            <div className='h-4 bg-gray-200 rounded w-3/4 mb-2'></div>
            <div className='h-3 bg-gray-200 rounded w-1/2'></div>
          </div>
        </div>

        {/* Price skeleton */}
        <div className='h-4 bg-gray-200 rounded w-20'></div>
      </div>
    </div>
  );
};

export default ProductSkeleton;

