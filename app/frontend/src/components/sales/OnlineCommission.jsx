import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Smartphone, 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  Percent,
  Calculator,
  Download,
  RefreshCw,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  BarChart3,
  Link,
  Globe,
  CreditCard
} from 'lucide-react';

const OnlineCommission = () => {
  const [selectedTab, setSelectedTab] = useState('platforms');
  const [dateRange, setDateRange] = useState('today');

  const platforms = [
    {
      id: 1,
      name: 'GoFood',
      logo: '🟢',
      status: 'active',
      commissionRate: 25,
      orders: 45,
      revenue: 1250000,
      commission: 312500,
      netRevenue: 937500,
      lastSync: '2024-01-15 10:30',
      connection: 'connected'
    },
    {
      id: 2,
      name: 'GrabFood',
      logo: '🟩',
      status: 'active',
      commissionRate: 22,
      orders: 38,
      revenue: 980000,
      commission: 215600,
      netRevenue: 764400,
      lastSync: '2024-01-15 10:25',
      connection: 'connected'
    },
    {
      id: 3,
      name: 'ShopeeFood',
      logo: '🟠',
      status: 'active',
      commissionRate: 20,
      orders: 23,
      revenue: 650000,
      commission: 130000,
      netRevenue: 520000,
      lastSync: '2024-01-15 10:20',
      connection: 'connected'
    },
    {
      id: 4,
      name: 'Traveloka Eats',
      logo: '🔵',
      status: 'inactive',
      commissionRate: 18,
      orders: 0,
      revenue: 0,
      commission: 0,
      netRevenue: 0,
      lastSync: '2024-01-10 15:45',
      connection: 'disconnected'
    }
  ];

  const transactions = [
    {
      id: 'TXN-001',
      platform: 'GoFood',
      orderId: 'GF-2024-001234',
      customer: 'Ahmad W.',
      amount: 85000,
      commission: 21250,
      netAmount: 63750,
      status: 'completed',
      timestamp: '2024-01-15 10:30',
      paymentMethod: 'GoPay'
    },
    {
      id: 'TXN-002',
      platform: 'GrabFood',
      orderId: 'GRB-2024-005678',
      customer: 'Siti N.',
      amount: 125000,
      commission: 27500,
      netAmount: 97500,
      status: 'completed',
      timestamp: '2024-01-15 10:25',
      paymentMethod: 'GrabPay'
    },
    {
      id: 'TXN-003',
      platform: 'ShopeeFood',
      orderId: 'SPF-2024-009876',
      customer: 'Budi S.',
      amount: 67000,
      commission: 13400,
      netAmount: 53600,
      status: 'pending',
      timestamp: '2024-01-15 10:20',
      paymentMethod: 'ShopeePay'
    },
    {
      id: 'TXN-004',
      platform: 'GoFood',
      orderId: 'GF-2024-001235',
      customer: 'Maya S.',
      amount: 156000,
      commission: 39000,
      netAmount: 117000,
      status: 'processing',
      timestamp: '2024-01-15 10:15',
      paymentMethod: 'Cash'
    }
  ];

  const settlements = [
    {
      id: 1,
      platform: 'GoFood',
      period: '2024-01-08 - 2024-01-14',
      totalOrders: 312,
      grossRevenue: 8750000,
      totalCommission: 2187500,
      netRevenue: 6562500,
      status: 'paid',
      paidDate: '2024-01-16',
      settlementId: 'GF-SET-240116-001'
    },
    {
      id: 2,
      platform: 'GrabFood',
      period: '2024-01-08 - 2024-01-14',
      totalOrders: 245,
      grossRevenue: 6890000,
      totalCommission: 1515800,
      netRevenue: 5374200,
      status: 'paid',
      paidDate: '2024-01-16',
      settlementId: 'GRB-SET-240116-002'
    },
    {
      id: 3,
      platform: 'ShopeeFood',
      period: '2024-01-08 - 2024-01-14',
      totalOrders: 156,
      grossRevenue: 4230000,
      totalCommission: 846000,
      netRevenue: 3384000,
      status: 'pending',
      paidDate: null,
      settlementId: 'SPF-SET-240115-003'
    }
  ];

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Aktif', icon: CheckCircle },
      inactive: { color: 'bg-red-100 text-red-800 border-red-200', label: 'Nonaktif', icon: AlertCircle },
      maintenance: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Maintenance', icon: Clock }
    };
    
    const config = statusConfig[status] || statusConfig.active;
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} border font-medium flex items-center space-x-1`}>
        <Icon className="w-3 h-3" />
        <span>{config.label}</span>
      </Badge>
    );
  };

  const getConnectionBadge = (connection) => {
    const connectionConfig = {
      connected: { color: 'bg-green-100 text-green-800', label: 'Terhubung' },
      disconnected: { color: 'bg-red-100 text-red-800', label: 'Terputus' },
      syncing: { color: 'bg-blue-100 text-blue-800', label: 'Sinkronisasi' }
    };
    
    const config = connectionConfig[connection] || connectionConfig.disconnected;
    
    return (
      <Badge className={`${config.color} font-medium text-xs`}>
        {config.label}
      </Badge>
    );
  };

  const getTransactionStatusBadge = (status) => {
    const statusConfig = {
      completed: { color: 'bg-green-100 text-green-800', label: 'Selesai' },
      processing: { color: 'bg-blue-100 text-blue-800', label: 'Diproses' },
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Menunggu' },
      failed: { color: 'bg-red-100 text-red-800', label: 'Gagal' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    
    return (
      <Badge className={`${config.color} font-medium`}>
        {config.label}
      </Badge>
    );
  };

  const getSettlementStatusBadge = (status) => {
    const statusConfig = {
      paid: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Dibayar', icon: CheckCircle },
      pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Menunggu', icon: Clock },
      processing: { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Diproses', icon: RefreshCw }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} border font-medium flex items-center space-x-1`}>
        <Icon className="w-3 h-3" />
        <span>{config.label}</span>
      </Badge>
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getTotalRevenue = () => {
    return platforms.reduce((total, platform) => total + platform.revenue, 0);
  };

  const getTotalCommission = () => {
    return platforms.reduce((total, platform) => total + platform.commission, 0);
  };

  const getTotalNetRevenue = () => {
    return platforms.reduce((total, platform) => total + platform.netRevenue, 0);
  };

  const getAverageCommissionRate = () => {
    const activePlatforms = platforms.filter(p => p.status === 'active');
    if (activePlatforms.length === 0) return 0;
    return activePlatforms.reduce((total, platform) => total + platform.commissionRate, 0) / activePlatforms.length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manajemen Komisi Online</h2>
          <p className="text-gray-600">Kelola integrasi dan komisi platform delivery</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" data-testid="sync-platforms">
            <RefreshCw className="w-4 h-4 mr-2" />
            Sinkronisasi
          </Button>
          <Button variant="outline" data-testid="platform-settings">
            <Settings className="w-4 h-4 mr-2" />
            Pengaturan
          </Button>
          <Button variant="outline" data-testid="export-commission">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(getTotalRevenue())}</p>
                <p className="text-xs text-green-600 mt-1 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +18% dari kemarin
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Komisi</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(getTotalCommission())}</p>
                <p className="text-xs text-gray-600 mt-1">
                  {getAverageCommissionRate().toFixed(1)}% rata-rata
                </p>
              </div>
              <Percent className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Net Revenue</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(getTotalNetRevenue())}</p>
                <p className="text-xs text-green-600 mt-1 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +12% dari kemarin
                </p>
              </div>
              <Calculator className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Pesanan</p>
                <p className="text-2xl font-bold text-gray-900">
                  {platforms.reduce((total, platform) => total + platform.orders, 0)}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {platforms.filter(p => p.status === 'active').length} platform aktif
                </p>
              </div>
              <Smartphone className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="platforms" data-testid="platforms-tab">Platform</TabsTrigger>
              <TabsTrigger value="transactions" data-testid="transactions-tab">Transaksi</TabsTrigger>
              <TabsTrigger value="settlements" data-testid="settlements-tab">Settlement</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        
        <CardContent>
          <Tabs value={selectedTab}>
            {/* Platforms Tab */}
            <TabsContent value="platforms" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {platforms.map(platform => (
                  <Card key={platform.id} className="card-hover" data-testid={`platform-${platform.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="text-2xl">{platform.logo}</div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{platform.name}</h3>
                            <p className="text-sm text-gray-600">Komisi {platform.commissionRate}%</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          {getStatusBadge(platform.status)}
                          {getConnectionBadge(platform.connection)}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-600">Pesanan Hari Ini</p>
                          <p className="text-xl font-bold text-blue-600">{platform.orders}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Revenue</p>
                          <p className="text-xl font-bold text-green-600">{formatCurrency(platform.revenue)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Komisi</p>
                          <p className="text-lg font-bold text-red-600">{formatCurrency(platform.commission)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Net Revenue</p>
                          <p className="text-lg font-bold text-gray-900">{formatCurrency(platform.netRevenue)}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                        <span>Sinkronisasi terakhir: {platform.lastSync}</span>
                      </div>
                      
                      {/* Commission Rate Bar */}
                      <div className="mb-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>Tingkat Komisi</span>
                          <span>{platform.commissionRate}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-red-500 h-2 rounded-full" 
                            style={{ width: `${platform.commissionRate}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" className="flex-1" data-testid={`view-platform-${platform.id}`}>
                          <Eye className="w-4 h-4 mr-1" />
                          Detail
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1" data-testid={`analytics-platform-${platform.id}`}>
                          <BarChart3 className="w-4 h-4 mr-1" />
                          Analisis
                        </Button>
                        <Button size="sm" variant="outline" data-testid={`settings-platform-${platform.id}`}>
                          <Settings className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Transactions Tab */}
            <TabsContent value="transactions" className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex gap-2">
                  <select 
                    value={dateRange} 
                    onChange={(e) => setDateRange(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
                    data-testid="date-range-filter"
                  >
                    <option value="today">Hari Ini</option>
                    <option value="week">Minggu Ini</option>
                    <option value="month">Bulan Ini</option>
                    <option value="custom">Kustom</option>
                  </select>
                </div>
                <Button variant="outline" data-testid="refresh-transactions">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
              
              <div className="space-y-3">
                {transactions.map(transaction => (
                  <Card key={transaction.id} className="card-hover" data-testid={`transaction-${transaction.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                            {transaction.platform.charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{transaction.orderId}</h3>
                            <p className="text-sm text-gray-600">{transaction.platform} • {transaction.customer}</p>
                          </div>
                        </div>
                        {getTransactionStatusBadge(transaction.status)}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Total Amount</p>
                          <p className="font-bold text-gray-900">{formatCurrency(transaction.amount)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Komisi</p>
                          <p className="font-bold text-red-600">-{formatCurrency(transaction.commission)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Net Amount</p>
                          <p className="font-bold text-green-600">{formatCurrency(transaction.netAmount)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Pembayaran</p>
                          <p className="font-medium">{transaction.paymentMethod}</p>
                          <p className="text-xs text-gray-500">{transaction.timestamp}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Settlements Tab */}
            <TabsContent value="settlements" className="space-y-4">
              <div className="space-y-4">
                {settlements.map(settlement => (
                  <Card key={settlement.id} className="card-hover" data-testid={`settlement-${settlement.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900 text-lg">{settlement.platform}</h3>
                          <p className="text-sm text-gray-600">Periode: {settlement.period}</p>
                          {settlement.settlementId && (
                            <p className="text-xs font-mono text-gray-500">{settlement.settlementId}</p>
                          )}
                        </div>
                        {getSettlementStatusBadge(settlement.status)}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-600">Total Pesanan</p>
                          <p className="text-xl font-bold text-blue-600">{settlement.totalOrders}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Gross Revenue</p>
                          <p className="text-xl font-bold text-gray-900">{formatCurrency(settlement.grossRevenue)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Total Komisi</p>
                          <p className="text-xl font-bold text-red-600">{formatCurrency(settlement.totalCommission)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Net Revenue</p>
                          <p className="text-xl font-bold text-green-600">{formatCurrency(settlement.netRevenue)}</p>
                        </div>
                      </div>
                      
                      {settlement.paidDate && (
                        <div className="text-sm text-gray-600 mb-3">
                          <span>Dibayar pada: {settlement.paidDate}</span>
                        </div>
                      )}
                      
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" data-testid={`view-settlement-${settlement.id}`}>
                          <Eye className="w-4 h-4 mr-1" />
                          Detail
                        </Button>
                        <Button size="sm" variant="outline" data-testid={`download-settlement-${settlement.id}`}>
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                        {settlement.status === 'pending' && (
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700" data-testid={`request-settlement-${settlement.id}`}>
                            <CreditCard className="w-4 h-4 mr-1" />
                            Request Payment
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnlineCommission;