import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';

const POSPagination = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  className = '',
}) => {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  return (
    <div
      className={`flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg ${className}`}
    >
      <div className='flex items-center space-x-2'>
        <span className='text-sm text-gray-600'>
          Menampilkan {startItem} - {endItem} dari {totalItems} produk
        </span>
      </div>

      <div className='flex items-center space-x-1'>
        <Button
          variant='outline'
          size='sm'
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className='h-8 w-8 p-0'
        >
          <ChevronLeft className='h-4 w-4' />
        </Button>

        {getVisiblePages().map((page, index) => (
          <div key={index} className='flex items-center'>
            {page === '...' ? (
              <span className='px-2 py-1 text-sm text-gray-500'>...</span>
            ) : (
              <Button
                variant={currentPage === page ? 'default' : 'outline'}
                size='sm'
                onClick={() => onPageChange(page)}
                className={`h-8 w-8 p-0 ${
                  currentPage === page
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'hover:bg-gray-100'
                }`}
              >
                {page}
              </Button>
            )}
          </div>
        ))}

        <Button
          variant='outline'
          size='sm'
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className='h-8 w-8 p-0'
        >
          <ChevronRight className='h-4 w-4' />
        </Button>
      </div>
    </div>
  );
};

export default POSPagination;

