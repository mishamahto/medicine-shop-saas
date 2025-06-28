import React from 'react';
import { useQuery } from 'react-query';
import { dashboardAPI } from '../services/api';
import { Package, DollarSign, ShoppingCart, Users, Activity } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

const Dashboard = () => {
  const { data: stats, isLoading: statsLoading } = useQuery('dashboard-stats', () =>
    dashboardAPI.getStats()
  );

  const { data: activities, isLoading: activitiesLoading } = useQuery('recent-activity', () =>
    dashboardAPI.getRecentActivity()
  );

  if (statsLoading || activitiesLoading) {
    return <LoadingSpinner />;
  }

  const dashboardStats = stats?.data || {};
  const recentActivities = activities?.data || [];

  const statCards = [
    {
      title: 'Total Items',
      value: dashboardStats.inventory?.total_items || 0,
      icon: Package,
      color: 'bg-blue-500',
    },
    {
      title: 'Total Revenue',
      value: `₹${(dashboardStats.sales?.total_revenue || 0).toFixed(2)}`,
      icon: DollarSign,
      color: 'bg-green-500',
    },
    {
      title: 'Pending Orders',
      value: dashboardStats.purchases?.pending_orders || 0,
      icon: ShoppingCart,
      color: 'bg-yellow-500',
    },
    {
      title: 'Total Customers',
      value: dashboardStats.customers?.total_customers || 0,
      icon: Users,
      color: 'bg-purple-500',
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
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Recent Activity
          </h3>
        </div>
        <div className="card-body">
          {recentActivities.length > 0 ? (
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{activity.description}</p>
                    <p className="text-sm text-gray-600">{activity.number}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">₹{activity.amount?.toFixed(2) || '0.00'}</p>
                    <p className="text-sm text-gray-600">{new Date(activity.date).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 