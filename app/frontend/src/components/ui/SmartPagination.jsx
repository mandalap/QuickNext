import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';

const SmartPagination = ({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  itemsPerPage = 10,
  totalItems = 0,
  isLoading = false,
  className = '',
}) => {
  // Calculate visible page numbers - only show 3 pages max
  const getVisiblePages = () => {
    if (totalPages <= 1) return [];

    const pages = [];

    // Always show first page
    pages.push(1);

    // If total pages <= 3, show all
    if (totalPages <= 3) {
      for (let i = 2; i <= totalPages; i++) {
        pages.push(i);
      }
      return pages;
    }

    // If current page is near the beginning
    if (currentPage <= 2) {
      pages.push(2, 3);
      if (totalPages > 3) {
        pages.push('...');
        pages.push(totalPages);
      }
    }
    // If current page is near the end
    else if (currentPage >= totalPages - 1) {
      pages.push('...');
      pages.push(totalPages - 2, totalPages - 1, totalPages);
    }
    // If current page is in the middle
    else {
      pages.push('...');
      pages.push(currentPage - 1, currentPage, currentPage + 1);
      pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  const visiblePages = getVisiblePages();
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}
    >
      {/* Items info */}
      <div className='text-sm text-gray-600'>
        Menampilkan {startItem}-{endItem} dari {totalItems} pesanan
      </div>

      {/* Pagination */}
      <div className='flex items-center space-x-1'>
        {/* Previous Button */}
        <Button
          variant='outline'
          size='sm'
          onClick={() => !isLoading && onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || isLoading}
          className='flex items-center gap-1'
        >
          <ChevronLeft className='w-4 h-4' />
          <span className='hidden sm:inline'>Previous</span>
        </Button>

        {/* Page Numbers */}
        <div className='flex items-center space-x-1'>
          {visiblePages.map((page, index) => (
            <div key={index}>
              {page === '...' ? (
                <span className='px-3 py-2 text-sm text-gray-500'>...</span>
              ) : (
                <Button
                  variant={currentPage === page ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => !isLoading && onPageChange(page)}
                  disabled={isLoading}
                  className='min-w-[40px]'
                >
                  {page}
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Next Button */}
        <Button
          variant='outline'
          size='sm'
          onClick={() => !isLoading && onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || isLoading}
          className='flex items-center gap-1'
        >
          <span className='hidden sm:inline'>Next</span>
          <ChevronRight className='w-4 h-4' />
        </Button>
      </div>
    </div>
  );
};

export default SmartPagination;







































































