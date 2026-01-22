import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from './pagination';

const ProductPagination = ({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  itemsPerPage = 5,
  totalItems = 0,
  isLoading = false,
  className = '',
}) => {
  // Calculate visible page numbers
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
      <div className='text-sm text-gray-500'>
        Menampilkan {startItem}-{endItem} dari {totalItems} produk
      </div>

      {/* Pagination */}
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => !isLoading && onPageChange(currentPage - 1)}
              disabled={currentPage <= 1 || isLoading}
              className={
                currentPage <= 1 || isLoading
                  ? 'opacity-50 cursor-not-allowed'
                  : 'cursor-pointer'
              }
            />
          </PaginationItem>

          {visiblePages.map((page, index) => (
            <PaginationItem key={index}>
              {page === '...' ? (
                <PaginationEllipsis />
              ) : (
                <PaginationLink
                  onClick={() => !isLoading && onPageChange(page)}
                  isActive={currentPage === page}
                  disabled={isLoading}
                  className={
                    isLoading
                      ? 'opacity-50 cursor-not-allowed'
                      : 'cursor-pointer'
                  }
                >
                  {page}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}

          <PaginationItem>
            <PaginationNext
              onClick={() => !isLoading && onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || isLoading}
              className={
                currentPage >= totalPages || isLoading
                  ? 'opacity-50 cursor-not-allowed'
                  : 'cursor-pointer'
              }
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
};

export default ProductPagination;
