import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Calendar, Filter, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Calendar as CalendarComponent } from '../ui/calendar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useAuth } from '../../contexts/AuthContext';

const SalesChartFilters = ({
  onFiltersChange,
  dateRange = 'today',
  customDate = {},
  chartType = 'daily',
  outletId = null,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState({
    dateRange: dateRange,
    customStart: customDate.start,
    customEnd: customDate.end,
    chartType: chartType,
    outletId: outletId,
  });

  const [outlets, setOutlets] = useState([]);
  const { outlets: authOutlets } = useAuth();

  // Predefined date ranges
  const dateRangeOptions = [
    { value: 'today', label: 'Hari Ini' },
    { value: 'week', label: '7 Hari Terakhir' },
    { value: 'month', label: '30 Hari Terakhir' },
    { value: 'quarter', label: '3 Bulan Terakhir' },
    { value: 'year', label: '1 Tahun Terakhir' },
    { value: 'custom', label: 'Periode Kustom' },
  ];

  const chartTypeOptions = [
    { value: 'hourly', label: 'Per Jam' },
    { value: 'daily', label: 'Harian' },
    { value: 'weekly', label: 'Mingguan' },
    { value: 'monthly', label: 'Bulanan' },
  ];

  // Sinkronisasi outlets dengan data nyata dari AuthContext
  useEffect(() => {
    if (authOutlets && Array.isArray(authOutlets) && authOutlets.length > 0) {
      setOutlets([{ id: null, name: 'Semua Outlet' }, ...authOutlets]);
    } else {
      setOutlets([{ id: null, name: 'Semua Outlet' }]);
    }
  }, [authOutlets]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  // Handle date range change
  const handleDateRangeChange = value => {
    if (value === 'custom') {
      handleFilterChange('dateRange', value);
    } else {
      handleFilterChange('dateRange', value);
      handleFilterChange('customStart', null);
      handleFilterChange('customEnd', null);
    }
  };

  // Handle custom date selection
  const handleCustomDateChange = (type, date) => {
    if (type === 'start') {
      handleFilterChange('customStart', date);
    } else {
      handleFilterChange('customEnd', date);
    }
  };

  // Clear all filters
  const clearFilters = () => {
    const defaultFilters = {
      dateRange: 'today',
      customStart: null,
      customEnd: null,
      chartType: 'daily',
      outletId: null,
    };
    setFilters(defaultFilters);
    onFiltersChange(defaultFilters);
  };

  // Get active filters count
  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.dateRange !== 'today') count++;
    if (filters.customStart || filters.customEnd) count++;
    if (filters.chartType !== 'daily') count++;
    if (filters.outletId) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div>
            <CardTitle className='flex items-center'>
              <Filter className='w-5 h-5 mr-2' />
              Filter Data
            </CardTitle>
            <CardDescription>
              Sesuaikan periode dan tampilan data grafik
            </CardDescription>
          </div>
          {activeFiltersCount > 0 && (
            <div className='flex items-center space-x-2'>
              <Badge variant='secondary'>
                {activeFiltersCount} filter aktif
              </Badge>
              <Button
                variant='ghost'
                size='sm'
                onClick={clearFilters}
                className='text-gray-500 hover:text-gray-700'
              >
                <X className='w-4 h-4' />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          {/* Date Range Filter */}
          <div className='space-y-2'>
            <label className='text-sm font-medium'>Periode</label>
            <Select
              value={filters.dateRange}
              onValueChange={handleDateRangeChange}
            >
              <SelectTrigger>
                <SelectValue placeholder='Pilih periode' />
              </SelectTrigger>
              <SelectContent>
                {dateRangeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Chart Type Filter */}
          <div className='space-y-2'>
            <label className='text-sm font-medium'>Tampilan</label>
            <Select
              value={filters.chartType}
              onValueChange={value => handleFilterChange('chartType', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder='Pilih tampilan' />
              </SelectTrigger>
              <SelectContent>
                {chartTypeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Outlet Filter */}
          <div className='space-y-2'>
            <label className='text-sm font-medium'>Outlet</label>
            <Select
              value={filters.outletId || 'all'}
              onValueChange={value =>
                handleFilterChange(
                  'outletId',
                  value === 'all' ? null : parseInt(value)
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder='Pilih outlet' />
              </SelectTrigger>
              <SelectContent>
                {outlets.map(outlet => (
                  <SelectItem
                    key={outlet.id || 'all'}
                    value={outlet.id ? outlet.id.toString() : 'all'}
                  >
                    {outlet.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Date Range */}
          {filters.dateRange === 'custom' && (
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Tanggal Kustom</label>
              <div className='flex space-x-2'>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant='outline'
                      className='flex-1 justify-start text-left font-normal'
                    >
                      <Calendar className='mr-2 h-4 w-4' />
                      {filters.customStart
                        ? format(filters.customStart, 'dd/MM/yyyy', {
                            locale: id,
                          })
                        : 'Mulai'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className='w-auto p-0' align='start'>
                    <CalendarComponent
                      mode='single'
                      selected={filters.customStart}
                      onSelect={date => handleCustomDateChange('start', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant='outline'
                      className='flex-1 justify-start text-left font-normal'
                    >
                      <Calendar className='mr-2 h-4 w-4' />
                      {filters.customEnd
                        ? format(filters.customEnd, 'dd/MM/yyyy', {
                            locale: id,
                          })
                        : 'Selesai'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className='w-auto p-0' align='start'>
                    <CalendarComponent
                      mode='single'
                      selected={filters.customEnd}
                      onSelect={date => handleCustomDateChange('end', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className='mt-4 pt-4 border-t border-gray-200'>
          <div className='flex items-center justify-between'>
            <div className='flex space-x-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => handleFilterChange('dateRange', 'today')}
                className={
                  filters.dateRange === 'today'
                    ? 'bg-blue-50 text-blue-700'
                    : ''
                }
              >
                Hari Ini
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={() => handleFilterChange('dateRange', 'week')}
                className={
                  filters.dateRange === 'week' ? 'bg-blue-50 text-blue-700' : ''
                }
              >
                7 Hari
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={() => handleFilterChange('dateRange', 'month')}
                className={
                  filters.dateRange === 'month'
                    ? 'bg-blue-50 text-blue-700'
                    : ''
                }
              >
                30 Hari
              </Button>
            </div>
            <div className='text-sm text-gray-500'>
              {filters.dateRange === 'custom' &&
              filters.customStart &&
              filters.customEnd
                ? `${format(filters.customStart, 'dd/MM/yyyy', {
                    locale: id,
                  })} - ${format(filters.customEnd, 'dd/MM/yyyy', {
                    locale: id,
                  })}`
                : dateRangeOptions.find(opt => opt.value === filters.dateRange)
                    ?.label}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SalesChartFilters;
