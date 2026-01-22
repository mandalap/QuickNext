import {
  Edit,
  Loader2,
  MoreHorizontal,
  Package,
  Search,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Input } from '../ui/input';
import ProductPagination from '../ui/ProductPagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';

const ServerSideProductTable = ({
  data = [],
  pagination = {},
  loading = false,
  onPageChange,
  onItemsPerPageChange,
  onSearch,
  onEdit,
  onDelete,
  onSort,
  categories = [],
  className = '',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onSearch) {
        onSearch(searchTerm);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, onSearch]);

  const handleSort = field => {
    const newDirection =
      sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';

    setSortField(field);
    setSortDirection(newDirection);

    if (onSort) {
      onSort(field, newDirection);
    }
  };

  const getSortIcon = field => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const formatCurrency = amount => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (stock, minStock = 10) => {
    if (stock === 0) {
      return (
        <Badge variant='destructive' className='text-xs'>
          Habis
        </Badge>
      );
    }
    if (stock < minStock) {
      return (
        <Badge
          variant='secondary'
          className='text-xs bg-yellow-100 text-yellow-800'
        >
          Stok Rendah
        </Badge>
      );
    }
    return (
      <Badge variant='default' className='text-xs bg-green-100 text-green-800'>
        Aktif
      </Badge>
    );
  };

  const getCategoryName = categoryId => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : '-';
  };

  if (loading && data.length === 0) {
    return (
      <div className='flex items-center justify-center py-12'>
        <div className='text-center'>
          <Loader2 className='w-8 h-8 text-blue-600 animate-spin mx-auto mb-2' />
          <p className='text-gray-500'>Memuat data produk...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search and Filter Controls */}
      <div className='flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between'>
        <div className='relative flex-1 max-w-sm'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
          <Input
            placeholder='Cari produk...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className='pl-10'
            disabled={loading}
          />
        </div>

        <div className='flex gap-2'>
          <Select
            value={pagination.itemsPerPage?.toString() || '10'}
            onValueChange={value => onItemsPerPageChange?.(parseInt(value))}
            disabled={loading}
          >
            <SelectTrigger className='w-20'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='5'>5</SelectItem>
              <SelectItem value='10'>10</SelectItem>
              <SelectItem value='20'>20</SelectItem>
              <SelectItem value='50'>50</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className='border rounded-lg'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-12'>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => handleSort('image')}
                  className='h-8 px-2'
                >
                  <Package className='w-4 h-4' />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => handleSort('name')}
                  className='h-8 px-2 justify-start'
                >
                  Nama Produk
                  {getSortIcon('name')}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => handleSort('category_id')}
                  className='h-8 px-2 justify-start'
                >
                  Kategori
                  {getSortIcon('category_id')}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => handleSort('sku')}
                  className='h-8 px-2 justify-start'
                >
                  SKU
                  {getSortIcon('sku')}
                </Button>
              </TableHead>
              <TableHead className='text-right'>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => handleSort('price')}
                  className='h-8 px-2 justify-end'
                >
                  Harga
                  {getSortIcon('price')}
                </Button>
              </TableHead>
              <TableHead className='text-right'>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => handleSort('stock')}
                  className='h-8 px-2 justify-end'
                >
                  Stok
                  {getSortIcon('stock')}
                </Button>
              </TableHead>
              <TableHead className='text-center'>Status</TableHead>
              <TableHead className='text-center w-12'>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className='text-center py-8'>
                  <div className='flex items-center justify-center'>
                    <Loader2 className='w-6 h-6 text-blue-600 animate-spin mr-2' />
                    <span className='text-gray-500'>Memuat data...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className='text-center py-8 text-gray-500'
                >
                  Tidak ada produk ditemukan
                </TableCell>
              </TableRow>
            ) : (
              data.map(product => (
                <TableRow key={product.id} className='hover:bg-gray-50'>
                  <TableCell>
                    <div className='w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center'>
                      {product.image ? (
                        <img
                          src={`http://localhost:8000/${product.image}`}
                          alt={product.name}
                          className='w-full h-full object-cover'
                        />
                      ) : (
                        <Package className='w-6 h-6 text-gray-400' />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className='font-medium text-gray-900 truncate max-w-[200px]'>
                        {product.name}
                      </div>
                      {product.description && (
                        <div className='text-sm text-gray-500 truncate max-w-[200px]'>
                          {product.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className='text-sm text-gray-600'>
                      {getCategoryName(product.category_id)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className='text-sm text-gray-600 font-mono'>
                      {product.sku || '-'}
                    </span>
                  </TableCell>
                  <TableCell className='text-right'>
                    <span className='font-medium text-gray-900'>
                      {formatCurrency(product.price)}
                    </span>
                  </TableCell>
                  <TableCell className='text-right'>
                    <span className='font-medium text-gray-900'>
                      {product.stock}
                    </span>
                  </TableCell>
                  <TableCell className='text-center'>
                    {getStatusBadge(product.stock, product.min_stock)}
                  </TableCell>
                  <TableCell className='text-center'>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant='ghost'
                          size='sm'
                          className='h-8 w-8 p-0'
                        >
                          <MoreHorizontal className='w-4 h-4' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end'>
                        <DropdownMenuItem onClick={() => onEdit?.(product)}>
                          <Edit className='w-4 h-4 mr-2' />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDelete?.(product.id)}
                          className='text-red-600'
                        >
                          <Trash2 className='w-4 h-4 mr-2' />
                          Hapus
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className='mt-6'>
          <ProductPagination
            currentPage={pagination.currentPage || 1}
            totalPages={pagination.totalPages || 1}
            totalItems={pagination.totalItems || 0}
            itemsPerPage={pagination.itemsPerPage || 10}
            onPageChange={onPageChange}
            isLoading={loading}
          />
        </div>
      )}
    </div>
  );
};

export default ServerSideProductTable;
