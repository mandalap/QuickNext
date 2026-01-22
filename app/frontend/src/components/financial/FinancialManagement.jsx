import {
  AlertCircle,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Calculator,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  Edit,
  Eye,
  FileText,
  Loader2,
  Percent,
  Plus,
  Receipt,
  RefreshCw,
  RotateCw,
  Search,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
  Target,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LoadingLogo from '../ui/LoadingLogo';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useToast } from '../ui/toast';
// import { useBusiness } from '../../contexts/BusinessContext';
import { useTransactionSuccess } from '../../hooks/useTransactionSuccess';
import { expenseService } from '../../services/expense.service';
import { financeService } from '../../services/finance.service';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../config/reactQuery';
import ExpenseFormModal from '../modals/ExpenseFormModal';
import BudgetFormModal from '../modals/BudgetFormModal';
import TaxFormModal from '../modals/TaxFormModal';
import TransactionSuccess from '../ui/TransactionSuccess';
import FinancialSkeleton from './FinancialSkeleton';

function FinancialManagement() {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [dateRange, setDateRange] = useState('today');
  const [customDateRange, setCustomDateRange] = useState({
    start: '',
    end: '',
  });
  const [refreshing, setRefreshing] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [expenseMode, setExpenseMode] = useState('add');
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [budgetMode, setBudgetMode] = useState('add');
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [selectedTax, setSelectedTax] = useState(null);
  const [taxMode, setTaxMode] = useState('add');
  const [taxes, setTaxes] = useState([]);
  const [loadingTaxes, setLoadingTaxes] = useState(false);
  const [financialData, setFinancialData] = useState(null);
  const { currentBusiness, currentOutlet } = useAuth();
  const { toast } = useToast();
  const retryCountRef = useRef(0);
  const maxRetries = 2;

  // Transaction success modal
  const {
    isVisible: showSuccessModal,
    transaction: successTransaction,
    showSuccess,
    hideSuccess,
    handlePrint,
    handleShare,
  } = useTransactionSuccess();

  // Helper function to get date range
  const getDateRange = range => {
    const now = new Date();
    switch (range) {
      case 'today':
        return {
          start: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          end: new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            23,
            59,
            59
          ),
        };
      case 'yesterday': {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        return {
          start: new Date(
            yesterday.getFullYear(),
            yesterday.getMonth(),
            yesterday.getDate()
          ),
          end: new Date(
            yesterday.getFullYear(),
            yesterday.getMonth(),
            yesterday.getDate(),
            23,
            59,
            59
          ),
        };
      }
      case 'week': {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 7);
        return { start: weekStart, end: now };
      }
      case 'month': {
        const monthStart = new Date(now);
        monthStart.setDate(1);
        return { start: monthStart, end: now };
      }
      default:
        return { start: now, end: now };
    }
  };

  // ✅ FIX: Get date range params for React Query
  const getDateRangeParams = useCallback(() => {
    let dateRangeObj;
    if (
      dateRange === 'custom' &&
      customDateRange.start &&
      customDateRange.end
    ) {
      dateRangeObj = {
        start: new Date(customDateRange.start),
        end: new Date(customDateRange.end + 'T23:59:59'),
      };
    } else {
      dateRangeObj = getDateRange(dateRange);
    }

    return {
      start_date: dateRangeObj.start.toISOString().split('T')[0],
      end_date: dateRangeObj.end.toISOString().split('T')[0],
    };
  }, [dateRange, customDateRange]);

  // ✅ FIX: Use React Query for financial summary
  const dateRangeParams = getDateRangeParams();
  const {
    data: financialSummaryData,
    isLoading: loadingFinancialSummary,
    error: financialSummaryError,
    refetch: refetchFinancialSummary,
  } = useQuery({
    queryKey: queryKeys.finance.summary(
      currentBusiness?.id,
      currentOutlet?.id,
      dateRangeParams
    ),
    queryFn: async () => {
      if (!currentBusiness) {
        return null;
      }

      // Skip if custom date range is not complete
      if (
        dateRange === 'custom' &&
        (!customDateRange.start || !customDateRange.end)
      ) {
        return null;
      }

      const params = getDateRangeParams();
      const result = await financeService.getFinancialSummary(params);

      if (result.success && result.data) {
        // Transform API data to match component structure
        return {
          income: result.data.income || {
            today: 0,
            this_week: 0,
            this_month: 0,
            growth: 0,
          },
          expense: result.data.expense || {
            today: 0,
            this_week: 0,
            this_month: 0,
            growth: 0,
          },
          net_income: result.data.net_income || {
            today: 0,
            this_week: 0,
            this_month: 0,
            growth: 0,
          },
          cash_balance: result.data.cash_balance || 0,
          recent_transactions: result.data.recent_transactions || [],
          recent_expenses: result.data.recent_expenses || [],
        };
      }

      throw new Error(result.error || 'Failed to load financial data');
    },
    enabled: Boolean(currentBusiness) && 
      !(dateRange === 'custom' && (!customDateRange.start || !customDateRange.end)),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData,
  });

  // ✅ FIX: Update financialData when React Query data changes
  useEffect(() => {
    if (financialSummaryData) {
      setFinancialData(financialSummaryData);
      retryCountRef.current = 0; // Reset retry count on success
    }
  }, [financialSummaryData]);

  // ✅ FIX: Show error toast if query fails
  useEffect(() => {
    if (financialSummaryError) {
      console.error('Financial summary error:', financialSummaryError);
      retryCountRef.current++;
      if (retryCountRef.current >= maxRetries) {
        toast.error('Gagal memuat data keuangan. Silakan refresh halaman.');
          // Jangan gunakan data dummy, biarkan data terakhir atau kosong
          setFinancialData(prev => prev || null);
      }
    }
  }, [financialSummaryError, toast]);

  // Default data structure
  const defaultCashFlow = {
    income: {
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
      growth: 0,
    },
    expense: {
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
      growth: 0,
    },
    netIncome: {
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
      growth: 0,
    },
    cashBalance: 0,
  };

  const cashFlow =
    financialData && financialData.income
      ? {
          income: {
            today: financialData.income.today || 0,
            thisWeek: financialData.income.this_week || 0,
            thisMonth: financialData.income.this_month || 0,
            growth: financialData.income.growth || 0,
          },
          expense: {
            today: financialData.expense?.today || 0,
            thisWeek: financialData.expense?.this_week || 0,
            thisMonth: financialData.expense?.this_month || 0,
            growth: financialData.expense?.growth || 0,
          },
          netIncome: {
            today: financialData.net_income?.today || 0,
            thisWeek: financialData.net_income?.this_week || 0,
            thisMonth: financialData.net_income?.this_month || 0,
            growth: financialData.net_income?.growth || 0,
          },
          cashBalance: financialData.cash_balance || 0,
        }
      : defaultCashFlow;

  // Get value based on selected date range
  const getValueByDateRange = (type) => {
    if (!financialData) return 0;
    
    switch (dateRange) {
      case 'today':
        return cashFlow[type]?.today || 0;
      case 'yesterday':
        return cashFlow[type]?.today || 0; // Backend might not have yesterday, use today as fallback
      case 'week':
        return cashFlow[type]?.thisWeek || 0;
      case 'month':
        return cashFlow[type]?.thisMonth || 0;
      case 'custom':
        // For custom range, calculate from recent data
        if (type === 'expense' && financialData?.recent_expenses) {
          return (financialData.recent_expenses || []).reduce(
            (total, expense) => {
              const amount = parseFloat(expense.amount) || 0;
              return total + amount;
            },
            0
          );
        }
        if (type === 'income' && financialData?.recent_transactions) {
          return (financialData.recent_transactions || []).reduce(
            (total, transaction) => {
              const amount = parseFloat(transaction.amount || transaction.total_amount) || 0;
              return total + amount;
            },
            0
          );
        }
        if (type === 'netIncome') {
          // Calculate netIncome for custom range
          let income = 0;
          let expense = 0;
          
          if (financialData?.recent_transactions) {
            income = (financialData.recent_transactions || []).reduce(
              (total, transaction) => {
                const amount = parseFloat(transaction.amount || transaction.total_amount) || 0;
                return total + amount;
              },
              0
            );
          }
          
          if (financialData?.recent_expenses) {
            expense = (financialData.recent_expenses || []).reduce(
              (total, exp) => {
                const amount = parseFloat(exp.amount) || 0;
                return total + amount;
              },
              0
            );
          }
          
          return income - expense;
        }
        return cashFlow[type]?.thisMonth || 0;
      default:
        return cashFlow[type]?.today || 0;
    }
  };

  // Use real transaction data from API or default empty array
  const transactions = financialData?.recent_transactions || [];

  // Fetch budgets from API
  const { data: budgetsData, isLoading: loadingBudgets, refetch: refetchBudgets } = useQuery({
    queryKey: ['budgets', currentBusiness?.id, currentOutlet?.id],
    queryFn: async () => {
      if (!currentBusiness) {
        return { success: false, data: [] };
      }
      try {
        const response = await financeService.getBudgets({
          status: 'active',
        });
        return response;
      } catch (error) {
        console.error('Error fetching budgets:', error);
        return { success: false, data: [] };
      }
    },
    enabled: !!currentBusiness,
    staleTime: 5 * 60 * 1000,
  });

  const budgets = budgetsData?.data || [];

  // NOTE: Data budget tracking sekarang menggunakan API nyata dari /v1/budgets
  // Jika backend belum mengembalikan field lengkap, nilai akan dihitung secara defensif.
  const expenses =
    budgets && budgets.length > 0
      ? budgets.map(budget => {
          if (!budget) return null;

          const budgeted = Number(budget.budgeted_amount || budget.budget || 0);
          const actual = Number(budget.actual_amount || budget.spent || 0);
          const remaining =
            budget.remaining_amount != null
              ? Number(budget.remaining_amount)
              : budgeted - actual;

          const percentage =
            budget.percentage_used != null
              ? Number(budget.percentage_used)
              : budgeted > 0
              ? (actual / budgeted) * 100
              : 0;

          const status =
            budget.usage_status ||
            (percentage > 100
              ? 'over_budget'
              : percentage >= 90
              ? 'warning'
              : percentage >= 75
              ? 'on_track'
              : 'under_budget');

          return {
            id: budget.id,
            category: budget.category || budget.name || 'Umum',
            budgeted,
            actual,
            remaining,
            percentage,
            status,
            lastExpense:
              budget.last_expense_at ||
              budget.updated_at ||
              budget.created_at ||
              null,
          };
        }).filter(Boolean)
      : [];

  // Load taxes from API
  const loadTaxes = useCallback(async () => {
    if (!currentBusiness) return;
    
    setLoadingTaxes(true);
    try {
      const result = await financeService.getTaxes();
      if (result?.success && result?.data) {
        setTaxes(result.data);
      } else {
        setTaxes([]);
      }
    } catch (error) {
      console.error('Error loading taxes:', error);
      toast.error('Gagal memuat data pajak');
      setTaxes([]);
    } finally {
      setLoadingTaxes(false);
    }
  }, [currentBusiness, toast]);

  // Load taxes when tab changes to taxes or component mounts
  useEffect(() => {
    if (selectedTab === 'taxes' && currentBusiness) {
      loadTaxes();
    }
  }, [selectedTab, currentBusiness, loadTaxes]);

  // Handle tax save (create or update)
  const handleTaxSave = async (taxData) => {
    try {
      if (taxMode === 'edit' && selectedTax) {
        const result = await financeService.updateTax(selectedTax.id, taxData);
        if (result?.success) {
          toast.success('Pajak berhasil diperbarui');
          loadTaxes();
        }
      } else {
        const result = await financeService.createTax(taxData);
        if (result?.success) {
          toast.success('Pajak berhasil ditambahkan');
          loadTaxes();
        }
      }
    } catch (error) {
      console.error('Error saving tax:', error);
      toast.error('Gagal menyimpan pajak');
      throw error;
    }
  };

  // Handle tax delete
  const handleTaxDelete = async (taxId) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus pajak ini?')) {
      return;
    }

    try {
      const result = await financeService.deleteTax(taxId);
      if (result?.success) {
        toast.success('Pajak berhasil dihapus');
        loadTaxes();
      }
    } catch (error) {
      console.error('Error deleting tax:', error);
      toast.error('Gagal menghapus pajak');
    }
  };

  // Handle add tax
  const handleAddTax = () => {
    setSelectedTax(null);
    setTaxMode('add');
    setShowTaxModal(true);
  };

  // Handle edit tax
  const handleEditTax = (tax) => {
    setSelectedTax(tax);
    setTaxMode('edit');
    setShowTaxModal(true);
  };

  const getTransactionIcon = type => {
    return type === 'income' ? ArrowUpRight : ArrowDownLeft;
  };

  const getTransactionColor = type => {
    return type === 'income' ? 'text-green-600' : 'text-red-600';
  };

  const getStatusBadge = status => {
    const statusConfig = {
      completed: {
        color: 'bg-green-100 text-green-800',
        label: 'Selesai',
        icon: CheckCircle,
      },
      pending: {
        color: 'bg-yellow-100 text-yellow-800',
        label: 'Menunggu',
        icon: Clock,
      },
      failed: {
        color: 'bg-red-100 text-red-800',
        label: 'Gagal',
        icon: AlertTriangle,
      },
      paid: {
        color: 'bg-green-100 text-green-800',
        label: 'Dibayar',
        icon: CheckCircle,
      },
      overdue: {
        color: 'bg-red-100 text-red-800',
        label: 'Terlambat',
        icon: AlertCircle,
      },
      cancelled: {
        color: 'bg-gray-100 text-gray-800',
        label: 'Dibatalkan',
        icon: X,
      },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge
        className={`${config.color} font-medium flex items-center space-x-1`}
      >
        <Icon className='w-3 h-3' />
        <span>{config.label}</span>
      </Badge>
    );
  };

  const getBudgetStatusBadge = status => {
    const statusConfig = {
      on_track: { color: 'bg-green-100 text-green-800', label: 'On Track' },
      warning: { color: 'bg-yellow-100 text-yellow-800', label: 'Warning' },
      over_budget: { color: 'bg-red-100 text-red-800', label: 'Over Budget' },
      under_budget: {
        color: 'bg-blue-100 text-blue-800',
        label: 'Under Budget',
      },
    };

    const config = statusConfig[status] || statusConfig.on_track;

    return (
      <Badge className={`${config.color} font-medium`}>{config.label}</Badge>
    );
  };

  const formatCurrency = amount => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getGrowthIcon = growth => {
    return growth >= 0 ? TrendingUp : TrendingDown;
  };

  const getGrowthColor = growth => {
    return growth >= 0 ? 'text-green-600' : 'text-red-600';
  };

  // Handle transaction click to show success modal
  const handleTransactionClick = transaction => {
    showSuccess(transaction);
  };

  // Handle add expense button
  const handleAddExpense = () => {
    setSelectedExpense(null);
    setExpenseMode('add');
    setShowExpenseModal(true);
  };

  // Handle edit expense
  const handleEditExpense = (expense) => {
    setSelectedExpense(expense);
    setExpenseMode('edit');
    setShowExpenseModal(true);
  };

  // Handle delete expense
  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus pengeluaran ini?')) {
      return;
    }

    try {
      const response = await expenseService.deleteExpense(expenseId);
      if (response.success) {
        toast({
          title: 'Berhasil!',
          description: 'Pengeluaran berhasil dihapus',
          variant: 'default',
        });
        // Refresh financial data and budgets
        await refetchFinancialSummary();
        await refetchBudgets(); // Refresh budgets to update actual amounts
      } else {
        throw new Error(response.message || 'Gagal menghapus pengeluaran');
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast({
        title: 'Error!',
        description: error.response?.data?.message || error.message || 'Gagal menghapus pengeluaran',
        variant: 'destructive',
      });
    }
  };

  // Handle add budget
  const handleAddBudget = () => {
    setSelectedBudget(null);
    setBudgetMode('add');
    setShowBudgetModal(true);
  };

  // Handle edit budget
  const handleEditBudget = (budget) => {
    setSelectedBudget(budget);
    setBudgetMode('edit');
    setShowBudgetModal(true);
  };

  // Handle delete budget
  const handleDeleteBudget = async (budgetId) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus budget ini?')) {
      return;
    }

    try {
      const response = await financeService.deleteBudget(budgetId);
      if (response.success) {
        toast({
          title: 'Berhasil!',
          description: 'Budget berhasil dihapus',
          variant: 'default',
        });
        await refetchBudgets();
      } else {
        throw new Error(response.message || 'Gagal menghapus budget');
      }
    } catch (error) {
      console.error('Error deleting budget:', error);
      toast({
        title: 'Error!',
        description: error.response?.data?.message || error.message || 'Gagal menghapus budget',
        variant: 'destructive',
      });
    }
  };

  // Handle save budget
  const handleSaveBudget = async budgetData => {
    try {
      console.log('Saving budget:', budgetData);

      let response;
      if (budgetMode === 'edit' && selectedBudget) {
        response = await financeService.updateBudget(selectedBudget.id, budgetData);
      } else {
        response = await financeService.createBudget(budgetData);
      }

      if (response.success) {
        toast({
          title: 'Berhasil!',
          description: response.message || (budgetMode === 'edit' ? 'Budget berhasil diperbarui' : 'Budget berhasil ditambahkan'),
          variant: 'default',
        });

        // Refresh budgets
        await refetchBudgets();
      } else {
        throw new Error(response.message || 'Gagal menyimpan budget');
      }
    } catch (error) {
      console.error('Error saving budget:', error);
      toast({
        title: 'Error!',
        description: error.response?.data?.message || error.message || 'Gagal menyimpan budget',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Handle save expense
  const handleSaveExpense = async expenseData => {
    try {
      console.log('Saving expense:', expenseData);

      let response;
      if (expenseMode === 'edit' && selectedExpense) {
        response = await expenseService.updateExpense(selectedExpense.id, expenseData);
      } else {
        response = await expenseService.createExpense(expenseData);
      }

      if (response.success) {
        toast({
          title: 'Berhasil!',
          description: response.message || (expenseMode === 'edit' ? 'Pengeluaran berhasil diperbarui' : 'Pengeluaran berhasil ditambahkan'),
          variant: 'default',
        });

        // Refresh financial data and budgets
        await refetchFinancialSummary();
        await refetchBudgets(); // Refresh budgets to update actual amounts
      } else {
        throw new Error(response.message || 'Gagal menyimpan pengeluaran');
      }
    } catch (error) {
      console.error('Error saving expense:', error);
      toast({
        title: 'Error!',
        description:
          error.response?.data?.message ||
          error.message ||
          'Gagal menyimpan pengeluaran',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // ✅ FIX: Handle manual refresh using React Query refetch
  const handleRefresh = useCallback(async () => {
    if (loadingFinancialSummary || refreshing) {
      return; // Prevent multiple simultaneous refreshes
    }

    setRefreshing(true);
    try {
      // Reset retry count untuk refresh manual
      retryCountRef.current = 0;

      // ✅ FIX: Use React Query refetch instead of manual load
      await refetchFinancialSummary();
      await refetchBudgets(); // Also refresh budgets
      
      toast.success('Data keuangan berhasil diperbarui');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Gagal memuat ulang data keuangan');
    } finally {
      setRefreshing(false);
    }
  }, [refetchFinancialSummary, refetchBudgets, loadingFinancialSummary, refreshing, toast]);

  // ✅ FIX: Keyboard shortcut F5 untuk refresh tanpa reload halaman
  // Menggunakan useEffect langsung seperti dashboard dan monitoring
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
        if (!refreshing && !loadingFinancialSummary) {
          handleRefresh();
        }
      }

      // R untuk refresh (optional)
      if ((event.key === 'r' || event.key === 'R') && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        if (!refreshing && !loadingFinancialSummary) {
          handleRefresh();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleRefresh, refreshing, loadingFinancialSummary]);

  // Handle reset filter - kembalikan ke default
  const handleResetFilter = () => {
    setDateRange('today');
    setCustomDateRange({ start: '', end: '' });
    // Data akan auto-load karena dateRange berubah
  };

  // ✅ FIX: Use React Query loading state
  const isLoading = loadingFinancialSummary || loadingTaxes;
  
  // ✅ OPTIMIZATION: Show skeleton loader instead of simple spinner
  if (isLoading && !financialData) {
    return <FinancialSkeleton />;
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold text-gray-900'>
            Manajemen Keuangan
          </h2>
          <p className='text-gray-600'>
            Kelola cash flow, budget, dan pajak bisnis
          </p>
        </div>
        <div className='flex gap-2'>
          <Button
            variant='outline'
            data-testid='refresh-financial'
            disabled={isLoading || refreshing}
            onClick={handleRefresh}
            title='Refresh data keuangan'
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
          <Button
            variant='outline'
            data-testid='export-financial'
            disabled={isLoading || refreshing}
          >
            <Download className='w-4 h-4 mr-2' />
            Export
          </Button>
          <Button
            className='bg-red-600 hover:bg-red-700'
            data-testid='add-expense'
            disabled={isLoading || refreshing}
            onClick={handleAddExpense}
          >
            <Plus className='w-4 h-4 mr-2' />
            Tambah Pengeluaran
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card className='border-blue-100 shadow-sm'>
        <CardContent className='p-5'>
          <div className='flex flex-col gap-4'>
            {/* Header Filter */}
            <div className='flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between'>
              <div className='flex items-center gap-3'>
                <div className='p-2 bg-blue-50 rounded-lg'>
                  <Calendar className='w-5 h-5 text-blue-600' />
                </div>
                <div>
                  <h3 className='text-sm font-semibold text-gray-900'>
                    Filter Periode
                  </h3>
                  <p className='text-xs text-gray-500'>
                    Pilih periode untuk melihat data keuangan
                  </p>
                </div>
              </div>
              {(dateRange !== 'today' ||
                (dateRange === 'custom' &&
                  (customDateRange.start || customDateRange.end))) && (
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleResetFilter}
                  className='text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-gray-300'
                  disabled={isLoading || refreshing}
                >
                  <RotateCw className='w-4 h-4 mr-2' />
                  Reset
                </Button>
              )}
            </div>

            {/* Filter Controls */}
            <div className='flex flex-col lg:flex-row gap-4 items-start lg:items-center'>
              <div className='flex flex-col sm:flex-row gap-3 flex-1 w-full'>
                {/* Quick Date Buttons */}
                <div className='flex flex-wrap gap-2'>
                  <Button
                    variant={dateRange === 'today' ? 'default' : 'outline'}
                    size='sm'
                    onClick={() => setDateRange('today')}
                    className={
                      dateRange === 'today'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'hover:bg-gray-50'
                    }
                    disabled={isLoading || refreshing}
                  >
                    Hari Ini
                  </Button>
                  <Button
                    variant={dateRange === 'yesterday' ? 'default' : 'outline'}
                    size='sm'
                    onClick={() => setDateRange('yesterday')}
                    className={
                      dateRange === 'yesterday'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'hover:bg-gray-50'
                    }
                    disabled={isLoading || refreshing}
                  >
                    Kemarin
                  </Button>
                  <Button
                    variant={dateRange === 'week' ? 'default' : 'outline'}
                    size='sm'
                    onClick={() => setDateRange('week')}
                    className={
                      dateRange === 'week'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'hover:bg-gray-50'
                    }
                    disabled={isLoading || refreshing}
                  >
                    7 Hari
                  </Button>
                  <Button
                    variant={dateRange === 'month' ? 'default' : 'outline'}
                    size='sm'
                    onClick={() => setDateRange('month')}
                    className={
                      dateRange === 'month'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'hover:bg-gray-50'
                    }
                    disabled={isLoading || refreshing}
                  >
                    Bulan Ini
                  </Button>
                  <Button
                    variant={dateRange === 'custom' ? 'default' : 'outline'}
                    size='sm'
                    onClick={() => setDateRange('custom')}
                    className={
                      dateRange === 'custom'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'hover:bg-gray-50'
                    }
                    disabled={isLoading || refreshing}
                  >
                    Kustom
                  </Button>
                </div>

                {/* Custom Date Range Picker */}
                {dateRange === 'custom' && (
                  <div className='flex flex-col sm:flex-row gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border-2 border-blue-200 shadow-inner w-full'>
                    <div className='flex-1 space-y-2'>
                      <label className='text-xs font-semibold text-gray-700 flex items-center gap-2'>
                        <Calendar className='w-3 h-3 text-blue-600' />
                        Dari Tanggal
                      </label>
                      <Input
                        type='date'
                        value={customDateRange.start}
                        onChange={e => {
                          const newStart = e.target.value;
                          setCustomDateRange({
                            ...customDateRange,
                            start: newStart,
                          });
                          // Auto-load jika kedua tanggal sudah terisi
                          if (newStart && customDateRange.end) {
                            setTimeout(() => refetchFinancialSummary(), 100);
                          }
                        }}
                        max={
                          customDateRange.end ||
                          new Date().toISOString().split('T')[0]
                        }
                        className='text-sm bg-white border-blue-300 focus:border-blue-500 focus:ring-blue-500'
                        data-testid='custom-start-date'
                      />
                    </div>
                    <div className='flex items-end pb-7 sm:pb-0'>
                      <div className='w-6 h-0.5 bg-blue-400 rounded-full' />
                    </div>
                    <div className='flex-1 space-y-2'>
                      <label className='text-xs font-semibold text-gray-700 flex items-center gap-2'>
                        <Calendar className='w-3 h-3 text-blue-600' />
                        Sampai Tanggal
                      </label>
                      <Input
                        type='date'
                        value={customDateRange.end}
                        onChange={e => {
                          const newEnd = e.target.value;
                          setCustomDateRange({
                            ...customDateRange,
                            end: newEnd,
                          });
                          // Auto-load jika kedua tanggal sudah terisi
                          if (customDateRange.start && newEnd) {
                            setTimeout(() => refetchFinancialSummary(), 100);
                          }
                        }}
                        min={customDateRange.start}
                        max={new Date().toISOString().split('T')[0]}
                        className='text-sm bg-white border-blue-300 focus:border-blue-500 focus:ring-blue-500'
                        data-testid='custom-end-date'
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Date Range Info Badge */}
              {(dateRange !== 'custom' ||
                (dateRange === 'custom' &&
                  customDateRange.start &&
                  customDateRange.end)) && (
                <div className='flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200'>
                  <div className='w-2 h-2 bg-green-500 rounded-full animate-pulse' />
                  <div className='text-sm'>
                    <span className='text-gray-600 font-medium'>Periode:</span>{' '}
                    <span className='text-gray-900 font-semibold'>
                      {dateRange === 'custom' &&
                      customDateRange.start &&
                      customDateRange.end
                        ? `${new Date(customDateRange.start).toLocaleDateString(
                            'id-ID'
                          )} - ${new Date(
                            customDateRange.end
                          ).toLocaleDateString('id-ID')}`
                        : dateRange === 'today'
                        ? new Date().toLocaleDateString('id-ID', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })
                        : dateRange === 'yesterday'
                        ? new Date(Date.now() - 86400000).toLocaleDateString(
                            'id-ID',
                            {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            }
                          )
                        : dateRange === 'week'
                        ? `${new Date(
                            Date.now() - 7 * 86400000
                          ).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                          })} - ${new Date().toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}`
                        : dateRange === 'month'
                        ? `${new Date(
                            new Date().getFullYear(),
                            new Date().getMonth(),
                            1
                          ).toLocaleDateString('id-ID', {
                            month: 'long',
                            year: 'numeric',
                          })}`
                        : ''}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Cards */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-6'>
        <Card className='card-hover'>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-600'>
                  Total Pendapatan
                </p>
                <p className='text-2xl font-bold text-green-600'>
                  {formatCurrency(getValueByDateRange('income'))}
                </p>
                <div className='flex items-center mt-1'>
                  {(() => {
                    const GrowthIcon = getGrowthIcon(cashFlow.income.growth);
                    return (
                      <GrowthIcon
                        className={`w-3 h-3 mr-1 ${getGrowthColor(
                          cashFlow.income.growth
                        )}`}
                      />
                    );
                  })()}
                  <span
                    className={`text-xs ${getGrowthColor(
                      cashFlow.income.growth
                    )}`}
                  >
                    {cashFlow.income.growth > 0 ? '+' : ''}
                    {cashFlow.income.growth}%
                  </span>
                </div>
              </div>
              <ArrowUpRight className='w-8 h-8 text-green-600' />
            </div>
          </CardContent>
        </Card>

        <Card className='card-hover'>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-600'>
                  Total Pengeluaran
                </p>
                <p className='text-2xl font-bold text-red-600'>
                  {formatCurrency(getValueByDateRange('expense'))}
                </p>
                <div className='flex items-center mt-1'>
                  {(() => {
                    const GrowthIcon = getGrowthIcon(cashFlow.expense.growth);
                    return (
                      <GrowthIcon
                        className={`w-3 h-3 mr-1 ${getGrowthColor(
                          cashFlow.expense.growth
                        )}`}
                      />
                    );
                  })()}
                  <span
                    className={`text-xs ${getGrowthColor(
                      cashFlow.expense.growth
                    )}`}
                  >
                    {cashFlow.expense.growth > 0 ? '+' : ''}
                    {cashFlow.expense.growth}%
                  </span>
                </div>
              </div>
              <ArrowDownLeft className='w-8 h-8 text-red-600' />
            </div>
          </CardContent>
        </Card>

        <Card className='card-hover'>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-600'>Laba Bersih</p>
                <p className='text-2xl font-bold text-blue-600'>
                  {formatCurrency(getValueByDateRange('netIncome'))}
                </p>
                <div className='flex items-center mt-1'>
                  {(() => {
                    const GrowthIcon = getGrowthIcon(cashFlow.netIncome.growth);
                    return (
                      <GrowthIcon
                        className={`w-3 h-3 mr-1 ${getGrowthColor(
                          cashFlow.netIncome.growth
                        )}`}
                      />
                    );
                  })()}
                  <span
                    className={`text-xs ${getGrowthColor(
                      cashFlow.netIncome.growth
                    )}`}
                  >
                    {cashFlow.netIncome.growth > 0 ? '+' : ''}
                    {cashFlow.netIncome.growth}%
                  </span>
                </div>
              </div>
              <Calculator className='w-8 h-8 text-blue-600' />
            </div>
          </CardContent>
        </Card>

        <Card className='card-hover'>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-600'>Saldo Kas</p>
                <p className='text-2xl font-bold text-purple-600'>
                  {formatCurrency(cashFlow.cashBalance)}
                </p>
                <p className='text-xs text-gray-600 mt-1'>
                  Total cash available
                </p>
              </div>
              <Wallet className='w-8 h-8 text-purple-600' />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className='grid w-full grid-cols-5'>
              <TabsTrigger value='overview' data-testid='overview-tab'>
                Ringkasan
              </TabsTrigger>
              <TabsTrigger value='transactions' data-testid='transactions-tab'>
                Transaksi
              </TabsTrigger>
              <TabsTrigger value='expenses' data-testid='expenses-tab'>
                Pengeluaran
              </TabsTrigger>
              <TabsTrigger value='budget' data-testid='budget-tab'>
                Budget
              </TabsTrigger>
              <TabsTrigger value='taxes' data-testid='taxes-tab'>
                Pajak
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent>
          <Tabs value={selectedTab}>
            {/* Overview Tab */}
            <TabsContent value='overview' className='space-y-6'>
              {/* Quick Stats */}
              <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
                <Card className='bg-gradient-to-br from-green-50 to-green-100 border-green-200'>
                  <CardContent className='p-4'>
                    <div className='flex items-center justify-between'>
                      <div>
                        <p className='text-sm font-medium text-green-700'>
                          Bulan Ini
                        </p>
                        <p className='text-xl font-bold text-green-800'>
                          {formatCurrency(cashFlow.income.thisMonth)}
                        </p>
                        <p className='text-xs text-green-600'>
                          Total Pendapatan
                        </p>
                      </div>
                      <DollarSign className='w-8 h-8 text-green-600' />
                    </div>
                  </CardContent>
                </Card>

                <Card className='bg-gradient-to-br from-red-50 to-red-100 border-red-200'>
                  <CardContent className='p-4'>
                    <div className='flex items-center justify-between'>
                      <div>
                        <p className='text-sm font-medium text-red-700'>
                          Bulan Ini
                        </p>
                        <p className='text-xl font-bold text-red-800'>
                          {formatCurrency(cashFlow.expense.thisMonth)}
                        </p>
                        <p className='text-xs text-red-600'>
                          Total Pengeluaran
                        </p>
                      </div>
                      <CreditCard className='w-8 h-8 text-red-600' />
                    </div>
                  </CardContent>
                </Card>

                <Card className='bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200'>
                  <CardContent className='p-4'>
                    <div className='flex items-center justify-between'>
                      <div>
                        <p className='text-sm font-medium text-blue-700'>
                          Profit Margin
                        </p>
                        <p className='text-xl font-bold text-blue-800'>
                          {cashFlow.income.thisMonth > 0
                            ? (
                                (cashFlow.netIncome.thisMonth /
                                  cashFlow.income.thisMonth) *
                                100
                              ).toFixed(1)
                            : '0.0'}
                          %
                        </p>
                        <p className='text-xs text-blue-600'>Bulan Ini</p>
                      </div>
                      <Percent className='w-8 h-8 text-blue-600' />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Transactions Preview */}
              <Card>
                <CardHeader>
                  <div className='flex items-center justify-between'>
                    <CardTitle>Transaksi Terbaru</CardTitle>
                    <Button
                      variant='outline'
                      size='sm'
                      data-testid='view-all-transactions'
                    >
                      <Eye className='w-4 h-4 mr-2' />
                      Lihat Semua
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className='flex items-center justify-center py-8'>
                      <LoadingLogo size='small' text='Memuat transaksi...' />
                    </div>
                  ) : transactions.length > 0 ? (
                    <div className='space-y-3'>
                      {transactions.slice(0, 5).map(transaction => {
                        const Icon = getTransactionIcon('income'); // All transactions from API are income
                        const amount =
                          transaction.amount || transaction.total_amount || 0;
                        const transactionDate =
                          transaction.date ||
                          transaction.created_at ||
                          new Date();
                        return (
                          <div
                            key={transaction.id}
                            className='flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer'
                            onClick={() => handleTransactionClick(transaction)}
                          >
                            <div className='flex items-center space-x-3'>
                              <div className='w-10 h-10 rounded-full flex items-center justify-center bg-green-100'>
                                <Icon className='w-5 h-5 text-green-600' />
                              </div>
                              <div>
                                <p className='font-medium text-gray-900'>
                                  {transaction.transaction_number ||
                                    `Transaksi #${transaction.id}`}
                                </p>
                                <p className='text-sm text-gray-600'>
                                  {transaction.customer ||
                                    transaction.customer_name ||
                                    'Walk-in'}{' '}
                                  •{' '}
                                  {new Date(transactionDate).toLocaleDateString(
                                    'id-ID'
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className='text-right'>
                              <p className='font-bold text-green-600'>
                                +{formatCurrency(amount)}
                              </p>
                              <p className='text-xs text-gray-500'>
                                {transaction.payment_method || 'Cash'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className='text-center py-8'>
                      <Receipt className='w-12 h-12 text-gray-400 mx-auto mb-4' />
                      <p className='text-gray-500'>Belum ada transaksi</p>
                      <p className='text-sm text-gray-400'>
                        Transaksi akan muncul di sini setelah ada penjualan
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Transactions Tab */}
            <TabsContent value='transactions' className='space-y-4'>
              {/* Search Control */}
              <div className='flex flex-col sm:flex-row gap-4 items-center justify-end'>
                <div className='relative w-full sm:w-64'>
                  <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
                  <Input
                    placeholder='Cari transaksi...'
                    className='pl-10'
                    data-testid='transaction-search'
                  />
                </div>
              </div>

              {/* Transactions List */}
              {isLoading ? (
                <div className='flex items-center justify-center py-12'>
                  <LoadingLogo size='medium' text='Memuat daftar transaksi...' />
                </div>
              ) : transactions.length > 0 ? (
                <div className='space-y-3'>
                  {transactions.map(transaction => {
                    const Icon = getTransactionIcon('income'); // All transactions from API are income
                    const amount =
                      transaction.amount || transaction.total_amount || 0;
                    const transactionDate =
                      transaction.date || transaction.created_at || new Date();
                    return (
                      <Card
                        key={transaction.id}
                        className='card-hover'
                        data-testid={`transaction-${transaction.id}`}
                      >
                        <CardContent className='p-4'>
                          <div className='flex items-center justify-between'>
                            <div className='flex items-center space-x-4'>
                              <div className='w-12 h-12 rounded-full flex items-center justify-center bg-green-100'>
                                <Icon className='w-6 h-6 text-green-600' />
                              </div>
                              <div>
                                <h3 className='font-semibold text-gray-900'>
                                  {transaction.transaction_number ||
                                    transaction.order_number ||
                                    `Transaksi #${transaction.id}`}
                                </h3>
                                <p className='text-sm text-gray-600'>
                                  {transaction.customer ||
                                    transaction.customer_name ||
                                    'Walk-in'}{' '}
                                  • {transaction.payment_method || 'Cash'}
                                </p>
                                <p className='text-xs text-gray-500'>
                                  {new Date(transactionDate).toLocaleString(
                                    'id-ID'
                                  )}
                                  {transaction.cashier &&
                                    ` • ${transaction.cashier}`}
                                </p>
                              </div>
                            </div>

                            <div className='text-right'>
                              <p className='text-xl font-bold text-green-600'>
                                +{formatCurrency(amount)}
                              </p>
                              <Badge className='bg-green-100 text-green-800 font-medium flex items-center space-x-1'>
                                <CheckCircle className='w-3 h-3' />
                                <span>
                                  {transaction.status === 'completed'
                                    ? 'Selesai'
                                    : 'Pending'}
                                </span>
                              </Badge>
                              <div className='flex space-x-2 mt-2'>
                                <Button
                                  size='sm'
                                  variant='outline'
                                  data-testid={`view-transaction-${transaction.id}`}
                                  onClick={() =>
                                    handleTransactionClick(transaction)
                                  }
                                >
                                  <Eye className='w-4 h-4' />
                                </Button>
                                <Button
                                  size='sm'
                                  variant='outline'
                                  data-testid={`edit-transaction-${transaction.id}`}
                                >
                                  <Edit className='w-4 h-4' />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className='text-center py-12'>
                  <Receipt className='w-16 h-16 text-gray-400 mx-auto mb-4' />
                  <h3 className='text-lg font-medium text-gray-900 mb-2'>
                    Belum ada transaksi
                  </h3>
                  <p className='text-gray-500 mb-4'>
                    Transaksi akan muncul di sini setelah ada penjualan
                  </p>
                  <Button
                    className='bg-blue-600 hover:bg-blue-700'
                    data-testid='add-transaction'
                  >
                    <Plus className='w-4 h-4 mr-2' />
                    Buat Transaksi Pertama
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Expenses Tab */}
            <TabsContent value='expenses' className='space-y-4'>
              {/* Search and Action Controls */}
              <div className='flex flex-col sm:flex-row gap-4 items-center justify-between'>
                <div className='relative w-full sm:w-64'>
                  <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
                  <Input
                    placeholder='Cari pengeluaran...'
                    className='pl-10'
                    data-testid='expense-search'
                  />
                </div>
                <Button
                  variant='default'
                  className='bg-red-600 hover:bg-red-700 text-white'
                  data-testid='add-expense-button'
                  onClick={handleAddExpense}
                >
                  <Plus className='w-4 h-4 mr-2' />
                  Tambah Pengeluaran
                </Button>
              </div>

              {/* Expenses Summary */}
              <div className='bg-red-50 border border-red-200 rounded-lg p-4 mb-6'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center space-x-4'>
                    <div className='w-12 h-12 rounded-full bg-red-100 flex items-center justify-center'>
                      <AlertCircle className='w-6 h-6 text-red-600' />
                    </div>
                    <div>
                      <h3 className='text-lg font-semibold text-gray-900'>
                        Total Pengeluaran
                      </h3>
                      <p className='text-sm text-gray-600'>
                        {dateRange === 'today'
                          ? 'Hari ini'
                          : dateRange === 'week'
                          ? 'Minggu ini'
                          : dateRange === 'month'
                          ? 'Bulan ini'
                          : 'Periode terpilih'}
                      </p>
                    </div>
                  </div>
                  <div className='text-right'>
                    <p className='text-3xl font-bold text-red-600'>
                      {formatCurrency(
                        (financialData?.recent_expenses || []).reduce(
                          (total, expense) => {
                            const amount = parseFloat(expense.amount) || 0;
                            return total + amount;
                          },
                          0
                        )
                      )}
                    </p>
                    <p className='text-sm text-gray-600'>
                      {(financialData?.recent_expenses || []).length} transaksi
                    </p>
                  </div>
                </div>
              </div>

              {/* Expenses Table */}
              {isLoading ? (
                <div className='flex items-center justify-center py-12'>
                  <LoadingLogo size='medium' text='Memuat daftar pengeluaran...' />
                </div>
              ) : (financialData?.recent_expenses || []).length > 0 ? (
                <div className='bg-white rounded-lg border border-gray-200 overflow-hidden'>
                  <div className='overflow-x-auto'>
                    <table className='w-full'>
                      <thead className='bg-gray-50 border-b border-gray-200'>
                        <tr>
                          <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                            Deskripsi
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                            Kategori
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                            Supplier
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                            Metode
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                            Tanggal
                          </th>
                          <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                            Jumlah
                          </th>
                          <th className='px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                            Aksi
                          </th>
                        </tr>
                      </thead>
                      <tbody className='bg-white divide-y divide-gray-200'>
                        {(financialData?.recent_expenses || []).map(
                          (expense, index) => {
                            const amount = expense.amount || 0;
                            const expenseDate =
                              expense.created_at || new Date();
                            return (
                              <tr
                                key={expense.id}
                                className='hover:bg-gray-50 transition-colors cursor-pointer'
                                onClick={() => handleTransactionClick(expense)}
                              >
                                <td className='px-6 py-4 whitespace-nowrap'>
                                  <div className='flex items-center'>
                                    <div className='w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mr-3'>
                                      <AlertCircle className='w-5 h-5 text-red-600' />
                                    </div>
                                    <div>
                                      <div className='text-sm font-medium text-gray-900'>
                                        {expense.description || 'Pengeluaran'}
                                      </div>
                                      <div className='text-sm text-gray-500'>
                                        {expense.transaction_number ||
                                          `#${expense.id}`}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className='px-6 py-4 whitespace-nowrap'>
                                  <Badge className='bg-red-100 text-red-800 font-medium'>
                                    {expense.category || 'Umum'}
                                  </Badge>
                                </td>
                                <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
                                  {expense.supplier || '-'}
                                </td>
                                <td className='px-6 py-4 whitespace-nowrap'>
                                  <Badge variant='outline' className='text-xs'>
                                    {expense.payment_method || 'Transfer'}
                                  </Badge>
                                </td>
                                <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                                  {new Date(expenseDate).toLocaleDateString(
                                    'id-ID',
                                    {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    }
                                  )}
                                </td>
                                <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-red-600'>
                                  -{formatCurrency(amount)}
                                </td>
                                <td className='px-6 py-4 whitespace-nowrap text-center text-sm font-medium'>
                                  <div className='flex items-center justify-center space-x-2'>
                                    <Button
                                      size='sm'
                                      variant='outline'
                                      className='h-8 w-8 p-0'
                                      onClick={e => {
                                        e.stopPropagation();
                                        handleEditExpense(expense);
                                      }}
                                    >
                                      <Edit className='w-4 h-4' />
                                    </Button>
                                    <Button
                                      size='sm'
                                      variant='outline'
                                      className='h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50'
                                      onClick={e => {
                                        e.stopPropagation();
                                        handleDeleteExpense(expense.id);
                                      }}
                                    >
                                      <X className='w-4 h-4' />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          }
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className='text-center py-12'>
                  <div className='w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center'>
                    <AlertCircle className='w-8 h-8 text-gray-400' />
                  </div>
                  <h3 className='text-lg font-medium text-gray-900 mb-2'>
                    Belum ada pengeluaran
                  </h3>
                  <p className='text-gray-500 mb-4'>
                    Pengeluaran akan muncul di sini setelah ditambahkan
                  </p>
                  <Button
                    variant='default'
                    className='bg-red-600 hover:bg-red-700 text-white'
                    data-testid='add-first-expense-button'
                    onClick={handleAddExpense}
                  >
                    <Plus className='w-4 h-4 mr-2' />
                    Tambah Pengeluaran Pertama
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Budget Tab */}
            <TabsContent value='budget' className='space-y-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <h3 className='text-lg font-semibold'>
                    Budget Tracking
                  </h3>
                  <p className='text-sm text-gray-600 mt-1'>
                    Kategori: Gaji Karyawan, Bahan Baku, Utilitas, Marketing, Maintenance, Operasional, Sewa, Transportasi
                  </p>
                </div>
                <Button
                  className='bg-purple-600 hover:bg-purple-700'
                  data-testid='create-budget'
                  onClick={handleAddBudget}
                  disabled={loadingBudgets}
                >
                  <Plus className='w-4 h-4 mr-2' />
                  Buat Budget
                </Button>
              </div>

              {loadingBudgets ? (
                <div className='flex items-center justify-center py-12'>
                  <LoadingLogo size='medium' text='Memuat daftar budget...' />
                </div>
              ) : budgets && budgets.length > 0 ? (
                <div className='space-y-4'>
                  {budgets.map(budget => {
                    if (!budget) return null;
                    const remaining = budget.remaining_amount || (budget.budgeted_amount - (budget.actual_amount || 0));
                    const percentage = budget.percentage_used || (budget.budgeted_amount > 0 ? ((budget.actual_amount || 0) / budget.budgeted_amount) * 100 : 0);
                    const status = budget.usage_status || (percentage > 100 ? 'over_budget' : percentage >= 90 ? 'warning' : percentage >= 75 ? 'on_track' : 'under_budget');
                    
                    return (
                      <Card
                        key={budget.id}
                        className='card-hover'
                        data-testid={`budget-${budget.id}`}
                      >
                        <CardContent className='p-4'>
                          <div className='flex items-center justify-between mb-4'>
                            <div className='flex-1'>
                              <div className='flex items-center gap-2 mb-1'>
                                <h3 className='font-semibold text-gray-900'>
                                  {budget.name || budget.category}
                                </h3>
                                <Badge className='bg-purple-100 text-purple-800 font-medium text-xs'>
                                  {budget.category}
                                </Badge>
                              </div>
                              <p className='text-sm text-gray-600'>
                                {budget.start_date && budget.end_date && (
                                  <>
                                    {new Date(budget.start_date).toLocaleDateString('id-ID')} - {new Date(budget.end_date).toLocaleDateString('id-ID')}
                                  </>
                                )}
                              </p>
                            </div>
                            {getBudgetStatusBadge(status)}
                          </div>

                          <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-4'>
                            <div>
                              <p className='text-sm text-gray-600'>Budget</p>
                              <p className='font-bold text-gray-900'>
                                {formatCurrency(budget.budgeted_amount)}
                              </p>
                            </div>
                            <div>
                              <p className='text-sm text-gray-600'>Terpakai</p>
                              <p className='font-bold text-blue-600'>
                                {formatCurrency(budget.actual_amount || 0)}
                              </p>
                            </div>
                            <div>
                              <p className='text-sm text-gray-600'>Sisa</p>
                              <p
                                className={`font-bold ${
                                  remaining >= 0
                                    ? 'text-green-600'
                                    : 'text-red-600'
                                }`}
                              >
                                {formatCurrency(Math.abs(remaining))}
                                {remaining < 0 && ' (Over)'}
                              </p>
                            </div>
                            <div>
                              <p className='text-sm text-gray-600'>Persentase</p>
                              <p
                                className={`font-bold ${
                                  percentage <= 100
                                    ? 'text-blue-600'
                                    : 'text-red-600'
                                }`}
                              >
                                {percentage.toFixed(1)}%
                              </p>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className='mb-3'>
                            <div className='flex justify-between text-xs text-gray-600 mb-1'>
                              <span>Progress</span>
                              <span>{percentage.toFixed(1)}%</span>
                            </div>
                            <div className='w-full bg-gray-200 rounded-full h-3'>
                              <div
                                className={`h-3 rounded-full ${
                                  percentage <= 75
                                    ? 'bg-green-500'
                                    : percentage <= 90
                                    ? 'bg-yellow-500'
                                    : percentage <= 100
                                    ? 'bg-orange-500'
                                    : 'bg-red-500'
                                }`}
                                style={{
                                  width: `${Math.min(percentage, 100)}%`,
                                }}
                              ></div>
                            </div>
                          </div>

                          <div className='flex space-x-2'>
                            <Button
                              size='sm'
                              variant='outline'
                              data-testid={`edit-budget-${budget.id}`}
                              onClick={() => handleEditBudget(budget)}
                            >
                              <Edit className='w-4 h-4 mr-1' />
                              Edit
                            </Button>
                            <Button
                              size='sm'
                              variant='outline'
                              className='text-red-600 hover:text-red-700 hover:bg-red-50'
                              data-testid={`delete-budget-${budget.id}`}
                              onClick={() => handleDeleteBudget(budget.id)}
                            >
                              <X className='w-4 h-4 mr-1' />
                              Hapus
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className='text-center py-12'>
                  <Target className='w-16 h-16 text-gray-400 mx-auto mb-4' />
                  <h3 className='text-lg font-medium text-gray-900 mb-2'>
                    Belum ada budget
                  </h3>
                  <p className='text-gray-500 mb-4'>
                    Buat budget untuk tracking pengeluaran per kategori
                  </p>
                  <Button
                    className='bg-purple-600 hover:bg-purple-700'
                    data-testid='add-first-budget-button'
                    onClick={handleAddBudget}
                  >
                    <Plus className='w-4 h-4 mr-2' />
                    Buat Budget Pertama
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Taxes Tab */}
            <TabsContent value='taxes' className='space-y-4'>
              <div className='flex items-center justify-between'>
                <h3 className='text-lg font-semibold'>Manajemen Pajak</h3>
                <div className='flex gap-2'>
                  <Button
                    variant='outline'
                    onClick={loadTaxes}
                    disabled={loadingTaxes}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loadingTaxes ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button
                    className='bg-green-600 hover:bg-green-700'
                    onClick={handleAddTax}
                  >
                    <Plus className='w-4 h-4 mr-2' />
                    Tambah Pajak
                  </Button>
                </div>
              </div>

              {loadingTaxes ? (
                <div className='flex items-center justify-center py-12'>
                  <Loader2 className='w-8 h-8 animate-spin text-blue-600' />
                </div>
              ) : taxes.length === 0 ? (
                <Card>
                  <CardContent className='text-center py-12'>
                    <FileText className='w-12 h-12 text-gray-400 mx-auto mb-4' />
                    <p className='text-gray-600 mb-2'>Belum ada data pajak</p>
                    <p className='text-sm text-gray-500 mb-4'>
                      Klik &quot;Tambah Pajak&quot; untuk menambahkan data pajak baru
                    </p>
                    <Button onClick={handleAddTax} className='bg-green-600 hover:bg-green-700'>
                      <Plus className='w-4 h-4 mr-2' />
                      Tambah Pajak Pertama
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className='space-y-4'>
                  {taxes.map(tax => (
                    <Card
                      key={tax.id}
                      className='card-hover hover:shadow-md transition-shadow'
                      data-testid={`tax-${tax.id}`}
                    >
                      <CardContent className='p-4'>
                        <div className='flex items-center justify-between mb-4'>
                          <div>
                            <h3 className='font-semibold text-gray-900'>
                              {tax.type} {tax.description ? `- ${tax.description}` : ''}
                            </h3>
                            <p className='text-sm text-gray-600'>
                              Periode: {tax.period}
                            </p>
                          </div>
                          <div className='flex items-center space-x-2'>
                            {getStatusBadge(tax.status)}
                            <Badge className='bg-blue-100 text-blue-800 font-medium'>
                              {tax.rate}%
                            </Badge>
                          </div>
                        </div>

                        <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-4'>
                          <div>
                            <p className='text-sm text-gray-600'>
                              Dasar Pengenaan
                            </p>
                            <p className='font-bold text-gray-900'>
                              {formatCurrency(tax.base)}
                            </p>
                          </div>
                          <div>
                            <p className='text-sm text-gray-600'>Tarif Pajak</p>
                            <p className='font-bold text-blue-600'>{tax.rate}%</p>
                          </div>
                          <div>
                            <p className='text-sm text-gray-600'>Jumlah Pajak</p>
                            <p className='font-bold text-red-600'>
                              {formatCurrency(tax.amount)}
                            </p>
                          </div>
                          <div>
                            <p className='text-sm text-gray-600'>Jatuh Tempo</p>
                            <p className='font-bold text-orange-600'>
                              {tax.due_date ? new Date(tax.due_date).toLocaleDateString('id-ID') : '-'}
                            </p>
                          </div>
                        </div>

                        {tax.notes && (
                          <div className='mb-4 p-3 bg-gray-50 rounded-lg'>
                            <p className='text-xs text-gray-500 mb-1'>Catatan:</p>
                            <p className='text-sm text-gray-700'>{tax.notes}</p>
                          </div>
                        )}

                        <div className='flex flex-wrap gap-2'>
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={() => handleEditTax(tax)}
                            data-testid={`edit-tax-${tax.id}`}
                          >
                            <Edit className='w-4 h-4 mr-1' />
                            Edit
                          </Button>
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={() => handleTaxDelete(tax.id)}
                            className='text-red-600 hover:text-red-700 hover:bg-red-50'
                            data-testid={`delete-tax-${tax.id}`}
                          >
                            <Trash2 className='w-4 h-4 mr-1' />
                            Hapus
                          </Button>
                          {tax.status === 'pending' && (
                            <Button
                              size='sm'
                              className='bg-green-600 hover:bg-green-700'
                              onClick={() => {
                                handleEditTax({ ...tax, status: 'paid', paid_at: new Date().toISOString() });
                              }}
                              data-testid={`pay-tax-${tax.id}`}
                            >
                              <CreditCard className='w-4 h-4 mr-1' />
                              Tandai Dibayar
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Transaction Success Modal */}
      {showSuccessModal && (
        <TransactionSuccess
          transaction={successTransaction}
          onClose={hideSuccess}
          onPrint={handlePrint}
          onShare={handleShare}
        />
      )}

      {/* Expense Form Modal */}
      <ExpenseFormModal
        isOpen={showExpenseModal}
        onClose={() => {
          setShowExpenseModal(false);
          setSelectedExpense(null);
        }}
        onSave={handleSaveExpense}
        expense={selectedExpense}
        mode={expenseMode}
      />

      {/* Budget Form Modal */}
      {showBudgetModal && (
        <BudgetFormModal
          isOpen={showBudgetModal}
          onClose={() => {
            setShowBudgetModal(false);
            setSelectedBudget(null);
          }}
          onSave={handleSaveBudget}
          budget={selectedBudget}
          mode={budgetMode}
        />
      )}

      {/* Tax Form Modal */}
      <TaxFormModal
        isOpen={showTaxModal}
        onClose={() => {
          setShowTaxModal(false);
          setSelectedTax(null);
        }}
        onSave={handleTaxSave}
        tax={selectedTax}
        mode={taxMode}
      />
    </div>
  );
}

export default FinancialManagement;
