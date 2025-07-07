import React from 'react';
import { useQuery } from 'react-query';
import { dashboardAPI, inventoryAPI, invoicesAPI, billsAPI } from '../services/api';
import { 
  Package, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Activity,
  FileText,
  Receipt,
  AlertCircle
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

const Dashboard = () => {
  // Fetch dashboard stats
  const { data: dashboardData, isLoading: statsLoading } = useQuery('dashboard-stats', () =>
    dashboardAPI.getStats()
  );

  // Fetch low stock items
  const { data: lowStockData, isLoading: lowStockLoading } = useQuery('low-stock', () =>
    inventoryAPI.getLowStock()
  );

  // Fetch expiring items
  const { data: expiringData, isLoading: expiringLoading } = useQuery('expiring', () =>
    inventoryAPI.getExpiring(30) // Get items expiring in next 30 days
  );

  // Fetch recent invoices
  const { data: recentInvoices, isLoading: invoicesLoading } = useQuery('recent-invoices', () =>
    invoicesAPI.getAll()
  );

  // Fetch recent bills
  const { data: recentBills, isLoading: billsLoading } = useQuery('recent-bills', () =>
    billsAPI.getAll()
  );

  if (statsLoading || lowStockLoading || expiringLoading || invoicesLoading || billsLoading) {
    return <LoadingSpinner />;
  }

  const stats = dashboardData?.data?.data || {};
  const lowStockItems = lowStockData?.data?.data || [];
  const expiringItems = expiringData?.data?.data || [];
  const invoices = recentInvoices?.data?.data || [];
  const bills = recentBills?.data?.data || [];

  // Calculate total revenue from invoices
  const totalRevenue = invoices.reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0);

  // Calculate pending amounts
  const pendingInvoices = invoices.filter(inv => inv.status === 'pending').length;
  const pendingBills = bills.filter(bill => bill.status === 'pending').length;

  const statCards = [
    {
      title: 'Total Inventory',
      value: stats.total_inventory || 0,
      icon: Package,
      color: 'bg-blue-500',
      alert: lowStockItems.length > 0 ? `${lowStockItems.length} items low on stock` : null
    },
    {
      title: 'Total Revenue',
      value: `₹${totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: 'bg-green-500',
      alert: pendingInvoices > 0 ? `${pendingInvoices} pending invoices` : null
    },
    {
      title: 'Total Bills',
      value: stats.total_bills || 0,
      icon: Receipt,
      color: 'bg-yellow-500',
      alert: pendingBills > 0 ? `${pendingBills} pending bills` : null
    },
    {
      title: 'Total Customers',
      value: stats.total_customers || 0,
      icon: Users,
      color: 'bg-purple-500'
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome to your medicine shop management system</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="card">
              <div className="card-body">
                <div className="flex items-center">
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    {stat.alert && (
                      <p className="text-sm text-yellow-600 flex items-center mt-1">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {stat.alert}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Items */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 text-yellow-500" />
              Low Stock Items
            </h3>
          </div>
          <div className="card-body">
            {lowStockItems.length > 0 ? (
              <div className="space-y-4">
                {lowStockItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-600">Current Stock: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-yellow-600">Min: {item.min_quantity}</p>
                      <p className="text-sm text-gray-600">SKU: {item.sku}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No items low on stock</p>
            )}
          </div>
        </div>

        {/* Expiring Items */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
              Expiring Soon
            </h3>
          </div>
          <div className="card-body">
            {expiringItems.length > 0 ? (
              <div className="space-y-4">
                {expiringItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-600">Stock: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-red-600">
                        Expires: {new Date(item.expiry_date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-600">Batch: {item.batch_number}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No items expiring soon</p>
            )}
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Recent Invoices
            </h3>
          </div>
          <div className="card-body">
            {invoices.length > 0 ? (
              <div className="space-y-4">
                {invoices.slice(0, 5).map((invoice, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">
                        {invoice.customer_name || 'Customer #' + invoice.customer_id}
                      </p>
                      <p className="text-sm text-gray-600">Invoice #{invoice.id}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">₹{invoice.total_amount?.toFixed(2) || '0.00'}</p>
                      <p className={`text-sm ${
                        invoice.status === 'paid' ? 'text-green-600' : 
                        invoice.status === 'overdue' ? 'text-red-600' : 
                        'text-yellow-600'
                      }`}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No recent invoices</p>
            )}
          </div>
        </div>

        {/* Recent Bills */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Receipt className="h-5 w-5 mr-2" />
              Recent Bills
            </h3>
          </div>
          <div className="card-body">
            {bills.length > 0 ? (
              <div className="space-y-4">
                {bills.slice(0, 5).map((bill, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{bill.wholesaler_name || 'Wholesaler #' + bill.wholesaler_id}</p>
                      <p className="text-sm text-gray-600">Bill #{bill.id}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">₹{bill.total_amount?.toFixed(2) || '0.00'}</p>
                      <p className={`text-sm ${
                        bill.status === 'paid' ? 'text-green-600' : 
                        bill.status === 'overdue' ? 'text-red-600' : 
                        'text-yellow-600'
                      }`}>
                        {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No recent bills</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 