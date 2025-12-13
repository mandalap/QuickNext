import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Download,
  FileText,
  RefreshCw,
  ShoppingCart,
  User,
  Users,
  FileSpreadsheet,
  File,
  ChevronDown,
} from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

// Import jspdf-autotable - it extends jsPDF prototype
// This side-effect import extends jsPDF with autoTable method
import 'jspdf-autotable';
import { queryKeys } from '../../config/reactQuery';
import { useAuth } from '../../contexts/AuthContext';
import { shiftService } from '../../services/shift.service';
// ✅ REMOVED: useKeyboardRefresh - using direct event listener like dashboard
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { useToast } from '../ui/toast';
import CashierMonitoringSkeleton from './CashierMonitoringSkeleton';

// Memoized Cashier Card Component
const CashierCard = memo(
  ({ cashier, formatCurrency, formatTime, getShiftDuration }) => (
    <div
      key={cashier.id}
      className='border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow'
    >
      <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-4'>
        {/* Cashier Info */}
        <div className='flex items-center gap-4'>
          <div className='w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center'>
            <User className='w-6 h-6 text-white' />
          </div>
          <div>
            <h3 className='font-semibold text-gray-900'>
              {cashier.employee?.user?.name || 'Unknown Cashier'}
            </h3>
            <p className='text-sm text-gray-600'>
              {cashier.employee?.user?.email || 'No email'}
            </p>
            <div className='flex items-center gap-2 mt-1'>
              <Badge className='bg-green-100 text-green-800 border-green-200'>
                <CheckCircle className='w-3 h-3 mr-1' />
                Aktif
              </Badge>
              <span className='text-xs text-gray-500'>
                Shift: {cashier.shift_name}
              </span>
            </div>
          </div>
        </div>

        {/* Shift Info */}
        <div className='flex flex-col sm:flex-row gap-4'>
          <div className='text-center sm:text-left'>
            <p className='text-sm font-medium text-gray-900'>Dibuka</p>
            <p className='text-sm text-gray-600'>
              {formatTime(cashier.opened_at)}
            </p>
            <p className='text-xs text-gray-500'>
              {getShiftDuration(cashier.opened_at)} yang lalu
            </p>
          </div>

          <div className='text-center sm:text-left'>
            <p className='text-sm font-medium text-gray-900'>Modal Awal</p>
            <p className='text-sm font-semibold text-blue-600'>
              {formatCurrency(cashier.opening_balance)}
            </p>
          </div>
        </div>

        {/* Today's Stats */}
        <div className='grid grid-cols-3 gap-4'>
          <div className='text-center'>
            <div className='text-lg font-bold text-green-600'>
              {cashier.today_transactions || 0}
            </div>
            <p className='text-xs text-gray-600'>Transaksi</p>
          </div>
          <div className='text-center'>
            <div className='text-lg font-bold text-blue-600'>
              {formatCurrency(cashier.today_sales || 0)}
            </div>
            <p className='text-xs text-gray-600'>Penjualan</p>
          </div>
          <div className='text-center'>
            <div className='text-lg font-bold text-purple-600'>
              {cashier.today_items || 0}
            </div>
            <p className='text-xs text-gray-600'>Item</p>
          </div>
        </div>
      </div>
    </div>
  )
);
CashierCard.displayName = 'CashierCard';

// Memoized Summary Card Component
const SummaryCard = memo(({ title, value, icon: Icon, color, subtitle }) => (
  <Card>
    <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
      <CardTitle className='text-sm font-medium'>{title}</CardTitle>
      <Icon className={`h-4 w-4 ${color}`} />
    </CardHeader>
    <CardContent>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <p className='text-xs text-gray-600'>{subtitle}</p>
    </CardContent>
  </Card>
));
SummaryCard.displayName = 'SummaryCard';

const CashierMonitoring = () => {
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();
  const { user, currentOutlet } = useAuth();
  const { toast } = useToast();

  // Fetch active cashiers with React Query
  const {
    data: activeCashiers = [],
    isLoading: loadingCashiers,
    error: cashiersError,
    refetch: refetchCashiers,
  } = useQuery({
    queryKey: queryKeys.shifts.allActive(currentOutlet?.id),
    queryFn: async () => {
      const result = await shiftService.getActiveShifts();
      if (result.success && result.data) {
        let cashiersData = result.data;
        if (result.data.data && Array.isArray(result.data.data)) {
          cashiersData = result.data.data;
        } else if (Array.isArray(result.data)) {
          cashiersData = result.data;
        } else {
          cashiersData = [];
        }
        return cashiersData;
      }
      return [];
    },
    enabled: Boolean(currentOutlet), // ✅ Only fetch if outlet is selected
    staleTime: 30 * 1000, // ✅ 30 seconds - real-time data
    gcTime: 5 * 60 * 1000, // ✅ 5 minutes
    retry: 1,
    refetchInterval: 30 * 1000, // ✅ Auto-refresh every 30 seconds
    refetchOnMount: false, // ✅ Don't refetch if data is fresh
    placeholderData: (previousData) => previousData, // ✅ Keep previous data during refetch
  });

  // Memoized helper functions
  const formatCurrency = useCallback(amount => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  }, []);

  const formatTime = useCallback(dateString => {
    return new Date(dateString).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  const getShiftDuration = useCallback(openedAt => {
    const now = new Date();
    const opened = new Date(openedAt);
    const diffInMinutes = Math.floor((now - opened) / (1000 * 60));

    if (diffInMinutes < 60) {
      return `${diffInMinutes} menit`;
    }

    const hours = Math.floor(diffInMinutes / 60);
    const minutes = diffInMinutes % 60;
    return `${hours} jam ${minutes} menit`;
  }, []);

  // Memoized calculations
  const summaryData = useMemo(() => {
    const totalTransactions = Array.isArray(activeCashiers)
      ? activeCashiers.reduce(
          (total, cashier) => total + (cashier.today_transactions || 0),
          0
        )
      : 0;

    const totalSales = Array.isArray(activeCashiers)
      ? activeCashiers.reduce(
          (total, cashier) => total + (cashier.today_sales || 0),
          0
        )
      : 0;

    return {
      activeCount: Array.isArray(activeCashiers) ? activeCashiers.length : 0,
      totalTransactions,
      totalSales,
    };
  }, [activeCashiers]);

  // Handle refresh - hanya refresh data monitoring tanpa reload halaman
  const handleRefresh = useCallback(async () => {
    if (refreshing || loadingCashiers) {
      return; // Prevent multiple simultaneous refreshes
    }

    setRefreshing(true);
    try {
      await refetchCashiers();
      setLastUpdated(new Date());
      toast({
        title: 'Berhasil!',
        description: 'Data monitoring berhasil diperbarui',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        title: 'Error!',
        description: 'Gagal memuat ulang data monitoring',
        variant: 'destructive',
      });
    } finally {
      setRefreshing(false);
    }
  }, [refetchCashiers, refreshing, loadingCashiers, toast]);

  // ✅ FIX: Keyboard shortcut F5 untuk refresh tanpa reload halaman
  // Menggunakan useEffect langsung seperti dashboard untuk memastikan preventDefault bekerja
  useEffect(() => {
    const handleKeyPress = (event) => {
      // Skip jika sedang di input/textarea/contentEditable
      if (
        event.target.tagName === 'INPUT' ||
        event.target.tagName === 'TEXTAREA' ||
        event.target.isContentEditable
      ) {
        return;
      }

      // F5 untuk refresh - prevent default browser reload
      if (event.key === 'F5') {
        event.preventDefault();
        event.stopPropagation();
        if (!refreshing && !loadingCashiers) {
          handleRefresh();
        }
      }

      // R untuk refresh (optional)
      if ((event.key === 'r' || event.key === 'R') && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        if (!refreshing && !loadingCashiers) {
          handleRefresh();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleRefresh, refreshing, loadingCashiers]);

  // Check user permissions
  const userRole = user?.role;
  const canManageEmployees = ['super_admin', 'owner', 'admin'].includes(
    userRole
  );
  const canViewReports = ['super_admin', 'owner', 'admin'].includes(userRole);

  // Handle navigation
  const handleNavigateToEmployees = useCallback(() => {
    if (!canManageEmployees) {
      toast({
        title: 'Error!',
        description:
          'Anda tidak memiliki izin untuk mengakses halaman manajemen karyawan',
        variant: 'destructive',
      });
      return;
    }
    navigate('/employees');
  }, [canManageEmployees, navigate, toast]);

  const handleNavigateToReports = useCallback(() => {
    if (!canViewReports) {
      toast({
        title: 'Error!',
        description: 'Anda tidak memiliki izin untuk mengakses halaman laporan',
        variant: 'destructive',
      });
      return;
    }
    navigate('/reports');
  }, [canViewReports, navigate, toast]);

  // Helper function to load logo image
  const loadLogoImage = useCallback(async (logoUrl) => {
    if (!logoUrl) return null;
    try {
      // If logo is base64, use directly
      if (logoUrl.startsWith('data:image')) {
        const img = new Image();
        return new Promise((resolve, reject) => {
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = logoUrl;
        });
      }
      
      // For URL, try to fetch and convert to base64
      try {
        const response = await fetch(logoUrl);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = reader.result;
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (fetchError) {
        // Fallback: try direct image load
        const img = new Image();
        img.crossOrigin = 'anonymous';
        return new Promise((resolve, reject) => {
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null); // Return null instead of rejecting
          img.src = logoUrl;
        });
      }
    } catch (error) {
      console.error('Error loading logo:', error);
      return null;
    }
  }, []);

  // Export to Excel
  const handleExportExcel = useCallback(async () => {
    try {
      const workbook = XLSX.utils.book_new();
      
      // Prepare data with proper formatting
      const exportData = activeCashiers.map(cashier => ({
        'No': '',
        'Nama Kasir': cashier.employee?.user?.name || 'Unknown',
        'Email': cashier.employee?.user?.email || 'No email',
        'Shift': cashier.shift_name,
        'Dibuka Pada': new Date(cashier.opened_at).toLocaleString('id-ID', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
        'Durasi': getShiftDuration(cashier.opened_at),
        'Modal Awal': cashier.opening_balance || 0,
        'Transaksi': cashier.today_transactions || 0,
        'Penjualan': cashier.today_sales || 0,
        'Item': cashier.today_items || 0,
      }));

      // Add row numbers
      exportData.forEach((row, index) => {
        row['No'] = index + 1;
      });

      // Create worksheet with header
      const headers = ['No', 'Nama Kasir', 'Email', 'Shift', 'Dibuka Pada', 'Durasi', 'Modal Awal', 'Transaksi', 'Penjualan', 'Item'];
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...exportData.map(row => headers.map(h => row[h]))]);

      // Set column widths for better readability
      worksheet['!cols'] = [
        { wch: 5 },  // No
        { wch: 25 }, // Nama Kasir
        { wch: 30 }, // Email
        { wch: 20 }, // Shift
        { wch: 20 }, // Dibuka Pada
        { wch: 15 }, // Durasi
        { wch: 18 }, // Modal Awal
        { wch: 12 }, // Transaksi
        { wch: 18 }, // Penjualan
        { wch: 10 }, // Item
      ];

      // Add header info at the top
      const headerInfo = [
        ['LAPORAN MONITORING KASIR'],
        [],
        ['Informasi Outlet'],
        [`Nama Outlet: ${currentOutlet?.name || '-'}`],
        [`Alamat: ${currentOutlet?.address || '-'}`],
        [`Telepon: ${currentOutlet?.phone || '-'}`],
        [],
        ['Informasi Export'],
        [`Tanggal Export: ${new Date().toLocaleString('id-ID')}`],
        [`Total Kasir Aktif: ${activeCashiers.length}`],
        [`Total Transaksi: ${summaryData.totalTransactions}`],
        [`Total Penjualan: ${formatCurrency(summaryData.totalSales)}`],
        [],
      ];

      // Insert header info at the beginning
      XLSX.utils.sheet_add_aoa(worksheet, headerInfo, { origin: 'A1' });
      
      // Insert table headers and data after header info
      const dataStartRow = headerInfo.length + 1;
      XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: `A${dataStartRow}` });
      XLSX.utils.sheet_add_aoa(worksheet, exportData.map(row => headers.map(h => row[h])), { 
        origin: `A${dataStartRow + 1}` 
      });

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Monitoring Kasir');

      // Generate filename
      const filename = `monitoring-kasir-${currentOutlet?.name || 'outlet'}-${
        new Date().toISOString().split('T')[0]
      }.xlsx`;

      // Write file
      XLSX.writeFile(workbook, filename);

      toast({
        title: 'Berhasil!',
        description: 'Data berhasil diekspor ke Excel',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: 'Error!',
        description: 'Gagal mengekspor data ke Excel',
        variant: 'destructive',
      });
    }
  }, [activeCashiers, currentOutlet, summaryData, formatCurrency, getShiftDuration, toast]);

  // Export to PDF
  const handleExportPDF = useCallback(async () => {
    try {
      const doc = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 15;

      // Load logo if available
      let logoImg = null;
      if (currentOutlet?.logo) {
        try {
          logoImg = await loadLogoImage(currentOutlet.logo);
        } catch (error) {
          console.error('Error loading logo:', error);
        }
      }

      // Header section with better styling
      const headerY = 15;
      
      // Logo (if available)
      if (logoImg) {
        const logoSize = 25;
        const logoX = pageWidth - logoSize - 15;
        doc.addImage(logoImg, 'PNG', logoX, headerY, logoSize, logoSize);
      }

      // Title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138); // Blue color
      doc.text(
        'LAPORAN MONITORING KASIR',
        logoImg ? 15 : pageWidth / 2,
        headerY + 8,
        { align: logoImg ? 'left' : 'center' }
      );

      yPosition = headerY + 18;

      // Outlet information box
      doc.setFillColor(241, 245, 249); // Light gray background
      doc.rect(10, yPosition, pageWidth - 20, 25, 'F');
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Informasi Outlet', 15, yPosition + 7);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Nama: ${currentOutlet?.name || '-'}`, 15, yPosition + 13);
      
      if (currentOutlet?.address) {
        const addressLines = doc.splitTextToSize(
          `Alamat: ${currentOutlet.address}`,
          (pageWidth - 30) / 2
        );
        doc.text(addressLines, 15, yPosition + 19);
      }
      
      if (currentOutlet?.phone) {
        doc.text(`Telepon: ${currentOutlet.phone}`, pageWidth / 2 + 5, yPosition + 13);
      }

      yPosition += 30;

      // Summary box
      doc.setFillColor(239, 246, 255); // Light blue background
      doc.rect(10, yPosition, pageWidth - 20, 20, 'F');
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Ringkasan', 15, yPosition + 7);
      
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Tanggal Export: ${new Date().toLocaleString('id-ID')}`,
        pageWidth - 15,
        yPosition + 7,
        { align: 'right' }
      );
      doc.text(
        `Total Kasir Aktif: ${activeCashiers.length}`,
        15,
        yPosition + 13
      );
      doc.text(
        `Total Transaksi: ${summaryData.totalTransactions}`,
        pageWidth / 2,
        yPosition + 13
      );
      doc.text(
        `Total Penjualan: ${formatCurrency(summaryData.totalSales)}`,
        pageWidth - 15,
        yPosition + 13,
        { align: 'right' }
      );

      yPosition += 25;

      // Table data with row numbers
      const tableData = activeCashiers.map((cashier, index) => [
        (index + 1).toString(),
        cashier.employee?.user?.name || 'Unknown',
        cashier.employee?.user?.email || 'No email',
        cashier.shift_name,
        new Date(cashier.opened_at).toLocaleString('id-ID', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
        getShiftDuration(cashier.opened_at),
        formatCurrency(cashier.opening_balance || 0),
        (cashier.today_transactions || 0).toString(),
        formatCurrency(cashier.today_sales || 0),
        (cashier.today_items || 0).toString(),
      ]);

      // Check if autoTable is available
      // jspdf-autotable extends the jsPDF prototype, so it should be available
      if (doc.autoTable && typeof doc.autoTable === 'function') {
        doc.autoTable({
          startY: yPosition,
          head: [
            [
              'No',
              'Nama Kasir',
              'Email',
              'Shift',
              'Dibuka Pada',
              'Durasi',
              'Modal Awal',
              'Transaksi',
              'Penjualan',
              'Item',
            ],
          ],
          body: tableData,
          theme: 'striped',
          headStyles: {
            fillColor: [30, 58, 138],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 9,
            halign: 'center',
          },
          styles: {
            fontSize: 8,
            cellPadding: 3,
            halign: 'left',
            valign: 'middle',
          },
          columnStyles: {
            0: { cellWidth: 8, halign: 'center' },  // No
            1: { cellWidth: 28, halign: 'left' },   // Nama Kasir
            2: { cellWidth: 32, halign: 'left' },   // Email
            3: { cellWidth: 22, halign: 'center' }, // Shift
            4: { cellWidth: 28, halign: 'left' },   // Dibuka Pada
            5: { cellWidth: 18, halign: 'center' }, // Durasi
            6: { cellWidth: 22, halign: 'right' },   // Modal Awal
            7: { cellWidth: 18, halign: 'center' },  // Transaksi
            8: { cellWidth: 22, halign: 'right' },   // Penjualan
            9: { cellWidth: 12, halign: 'center' },  // Item
          },
          alternateRowStyles: {
            fillColor: [249, 250, 251],
          },
          margin: { left: 10, right: 10, top: 5 },
          showHead: 'everyPage',
        });
      } else {
        // Fallback: Try dynamic import first
        try {
          const autoTableModule = await import('jspdf-autotable');
          // Try to use the module
          if (autoTableModule.default && typeof autoTableModule.default === 'function') {
            autoTableModule.default(doc, {
              startY: yPosition,
              head: [
                [
                  'No',
                  'Nama Kasir',
                  'Email',
                  'Shift',
                  'Dibuka Pada',
                  'Durasi',
                  'Modal Awal',
                  'Transaksi',
                  'Penjualan',
                  'Item',
                ],
              ],
              body: tableData,
              theme: 'striped',
              headStyles: {
                fillColor: [30, 58, 138],
                textColor: 255,
                fontStyle: 'bold',
                fontSize: 9,
                halign: 'center',
              },
              styles: {
                fontSize: 8,
                cellPadding: 3,
                halign: 'left',
                valign: 'middle',
              },
              columnStyles: {
                0: { cellWidth: 8, halign: 'center' },
                1: { cellWidth: 28, halign: 'left' },
                2: { cellWidth: 32, halign: 'left' },
                3: { cellWidth: 22, halign: 'center' },
                4: { cellWidth: 28, halign: 'left' },
                5: { cellWidth: 18, halign: 'center' },
                6: { cellWidth: 22, halign: 'right' },
                7: { cellWidth: 18, halign: 'center' },
                8: { cellWidth: 22, halign: 'right' },
                9: { cellWidth: 12, halign: 'center' },
              },
              alternateRowStyles: {
                fillColor: [249, 250, 251],
              },
              margin: { left: 10, right: 10, top: 5 },
              showHead: 'everyPage',
            });
          } else {
            throw new Error('autoTable default export not available');
          }
        } catch (importError) {
          console.error('Error with autoTable:', importError);
          // Final fallback: Create simple table manually
          const headers = ['No', 'Nama Kasir', 'Email', 'Shift', 'Dibuka Pada', 'Durasi', 'Modal Awal', 'Transaksi', 'Penjualan', 'Item'];
          const colWidths = [8, 28, 32, 22, 28, 18, 22, 18, 22, 12];
          const startX = 10;
          let currentY = yPosition;
          
          // Draw header
          doc.setFillColor(30, 58, 138);
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          let currentX = startX;
          headers.forEach((header, index) => {
            doc.rect(currentX, currentY, colWidths[index], 8, 'F');
            const headerText = header.length > 12 ? header.substring(0, 10) + '..' : header;
            const textX = index === 0 || index === 3 || index === 5 || index === 7 || index === 9 
              ? currentX + colWidths[index] / 2 
              : currentX + 2;
            doc.text(headerText, textX, currentY + 5, { 
              align: index === 0 || index === 3 || index === 5 || index === 7 || index === 9 ? 'center' : 'left' 
            });
            currentX += colWidths[index];
          });
          currentY += 8;
          
          // Draw rows with alternating colors
          doc.setTextColor(0, 0, 0);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          tableData.forEach((row, rowIndex) => {
            if (currentY > pageHeight - 20) {
              doc.addPage();
              currentY = 15;
            }
            
            // Alternate row background
            if (rowIndex % 2 === 0) {
              doc.setFillColor(249, 250, 251);
              let fillX = startX;
              colWidths.forEach(width => {
                doc.rect(fillX, currentY, width, 6, 'F');
                fillX += width;
              });
            }
            
            currentX = startX;
            row.forEach((cell, colIndex) => {
              doc.setDrawColor(200, 200, 200);
              doc.rect(currentX, currentY, colWidths[colIndex], 6, 'S');
              const cellText = String(cell);
              const maxWidth = colWidths[colIndex] - 4;
              const truncatedText = cellText.length > maxWidth / 2 ? cellText.substring(0, Math.floor(maxWidth / 2) - 3) + '...' : cellText;
              const textX = colIndex === 0 || colIndex === 3 || colIndex === 5 || colIndex === 7 || colIndex === 9
                ? currentX + colWidths[colIndex] / 2
                : currentX + 2;
              doc.text(truncatedText, textX, currentY + 4, {
                align: colIndex === 0 || colIndex === 3 || colIndex === 5 || colIndex === 7 || colIndex === 9 ? 'center' : 'left'
              });
              currentX += colWidths[colIndex];
            });
            currentY += 6;
          });
        }
      }

      // Generate filename
      const filename = `monitoring-kasir-${currentOutlet?.name || 'outlet'}-${
        new Date().toISOString().split('T')[0]
      }.pdf`;

      // Save PDF
      doc.save(filename);

      toast({
        title: 'Berhasil!',
        description: 'Data berhasil diekspor ke PDF',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast({
        title: 'Error!',
        description: 'Gagal mengekspor data ke PDF',
        variant: 'destructive',
      });
    }
  }, [
    activeCashiers,
    currentOutlet,
    summaryData,
    formatCurrency,
    getShiftDuration,
    loadLogoImage,
    toast,
  ]);

  // ✅ OPTIMIZATION: Show skeleton loader instead of simple spinner
  if (loadingCashiers) {
    return <CashierMonitoringSkeleton />;
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>
            Monitoring Kasir Aktif
          </h1>
          <p className='text-gray-600 mt-1'>
            Pantau aktivitas kasir yang sedang bekerja
          </p>
        </div>
        <div className='flex items-center gap-3'>
          <div className='text-sm text-gray-500'>
            Terakhir update: {lastUpdated.toLocaleTimeString('id-ID')}
          </div>
          <Button
            onClick={handleRefresh}
            disabled={loadingCashiers || refreshing}
            variant='outline'
            size='sm'
            title='Refresh data monitoring'
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${
                loadingCashiers || refreshing ? 'animate-spin' : ''
              }`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        <SummaryCard
          title='Kasir Aktif'
          value={summaryData.activeCount}
          icon={Users}
          color='text-blue-600'
          subtitle='dari total kasir yang tersedia'
        />

        <SummaryCard
          title='Total Transaksi Hari Ini'
          value={summaryData.totalTransactions}
          icon={ShoppingCart}
          color='text-green-600'
          subtitle='dari semua kasir aktif'
        />

        <SummaryCard
          title='Total Penjualan Hari Ini'
          value={formatCurrency(summaryData.totalSales)}
          icon={DollarSign}
          color='text-purple-600'
          subtitle='dari semua kasir aktif'
        />
      </div>

      {/* Active Cashiers List */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Activity className='w-5 h-5 text-green-600' />
            Kasir yang Sedang Aktif
          </CardTitle>
          <CardDescription>
            Daftar kasir yang sedang menjalankan shift
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeCashiers.length === 0 ? (
            <div className='text-center py-12'>
              <AlertCircle className='w-12 h-12 text-gray-300 mx-auto mb-4' />
              <h3 className='text-lg font-semibold text-gray-900 mb-2'>
                Tidak Ada Kasir Aktif
              </h3>
              <p className='text-gray-600'>
                Belum ada kasir yang membuka shift saat ini
              </p>
            </div>
          ) : (
            <div className='space-y-4'>
              {activeCashiers.map(cashier => (
                <CashierCard
                  key={cashier.id}
                  cashier={cashier}
                  formatCurrency={formatCurrency}
                  formatTime={formatTime}
                  getShiftDuration={getShiftDuration}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className='bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200'>
        <CardHeader>
          <CardTitle className='text-blue-900'>Aksi Cepat</CardTitle>
          <CardDescription className='text-blue-700'>
            Kelola dan pantau aktivitas kasir
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3'>
            <Button
              variant='outline'
              className={`border-blue-300 text-blue-700 transition-colors ${
                canManageEmployees
                  ? 'hover:bg-blue-100'
                  : 'opacity-50 cursor-not-allowed'
              }`}
              onClick={handleNavigateToEmployees}
              disabled={!canManageEmployees}
              title={
                canManageEmployees
                  ? 'Kelola karyawan'
                  : 'Anda tidak memiliki izin untuk mengakses halaman ini'
              }
            >
              <Users className='w-4 h-4 mr-2' />
              Kelola Kasir
            </Button>
            <Button
              variant='outline'
              className={`border-green-300 text-green-700 transition-colors ${
                canViewReports
                  ? 'hover:bg-green-100'
                  : 'opacity-50 cursor-not-allowed'
              }`}
              onClick={handleNavigateToReports}
              disabled={!canViewReports}
              title={
                canViewReports
                  ? 'Lihat laporan'
                  : 'Anda tidak memiliki izin untuk mengakses halaman ini'
              }
            >
              <FileText className='w-4 h-4 mr-2' />
              Lihat Laporan
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='outline'
                  className={`border-purple-300 text-purple-700 transition-colors ${
                    activeCashiers.length > 0
                      ? 'hover:bg-purple-100'
                      : 'opacity-50 cursor-not-allowed'
                  }`}
                  disabled={activeCashiers.length === 0}
                  title={
                    activeCashiers.length > 0
                      ? 'Export data monitoring'
                      : 'Tidak ada data untuk diekspor'
                  }
                >
                  <Download className='w-4 h-4 mr-2' />
                  Export Data
                  <ChevronDown className='w-4 h-4 ml-2' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                <DropdownMenuItem onClick={handleExportExcel}>
                  <FileSpreadsheet className='w-4 h-4 mr-2' />
                  Export ke Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF}>
                  <File className='w-4 h-4 mr-2' />
                  Export ke PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant='outline'
              className={`border-orange-300 text-orange-700 transition-colors ${
                !loadingCashiers && !refreshing
                  ? 'hover:bg-orange-100'
                  : 'opacity-50 cursor-not-allowed'
              }`}
              onClick={handleRefresh}
              disabled={loadingCashiers || refreshing}
              title={
                loadingCashiers || refreshing
                  ? 'Sedang memuat...'
                  : 'Refresh data monitoring'
              }
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${
                  loadingCashiers || refreshing ? 'animate-spin' : ''
                }`}
              />
              Refresh Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default memo(CashierMonitoring);
