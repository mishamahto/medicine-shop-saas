import axios from 'axios';

// API configuration
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://medicine-shop-backend-538104438280.us-central1.run.app/api'  // Added /api prefix
  : 'http://localhost:8080/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getCurrentUser: () => api.get('/auth/me'),
  changePassword: (passwordData) => api.put('/auth/change-password', passwordData),
};

// Inventory API
export const inventoryAPI = {
  getAll: (params) => api.get('/inventory', { params }),
  getById: (id) => api.get(`/inventory/${id}`),
  create: (data) => api.post('/inventory', data),
  update: (id, data) => api.put(`/inventory/${id}`, data),
  delete: (id) => api.delete(`/inventory/${id}`),
  updateStock: (id, data) => api.patch(`/inventory/${id}/stock`, data),
  getLowStock: () => api.get('/inventory/low-stock/items'),
  getExpiring: (days) => api.get('/inventory/expiring/items', { params: { days } }),
};

// Purchase Orders API
export const purchaseOrdersAPI = {
  getAll: (params) => api.get('/purchase-orders', { params }),
  getById: (id) => api.get(`/purchase-orders/${id}`),
  create: (data) => api.post('/purchase-orders', data),
  updateStatus: (id, status) => api.patch(`/purchase-orders/${id}/status`, { status }),
  receiveItems: (id, data) => api.post(`/purchase-orders/${id}/receive`, data),
  delete: (id) => api.delete(`/purchase-orders/${id}`),
  getStats: (params) => api.get('/purchase-orders/stats/summary', { params }),
};

// Invoices API
export const invoicesAPI = {
  getAll: (params) => api.get('/invoices', { params }),
  getById: (id) => api.get(`/invoices/${id}`),
  create: (data) => api.post('/invoices', data),
  updateStatus: (id, status) => api.patch(`/invoices/${id}/status`, { status }),
  markAsPaid: (id, data) => api.post(`/invoices/${id}/pay`, data),
  delete: (id) => api.delete(`/invoices/${id}`),
  getStats: (params) => api.get('/invoices/stats/summary', { params }),
};

// Bills API
export const billsAPI = {
  getAll: (params) => api.get('/bills', { params }),
  getById: (id) => api.get(`/bills/${id}`),
  create: (data) => api.post('/bills', data),
  update: (id, data) => api.put(`/bills/${id}`, data),
  delete: (id) => api.delete(`/bills/${id}`),
  getStats: (params) => api.get('/bills/stats/summary', { params }),
};

// Customers API
export const customersAPI = {
  getAll: (params) => api.get('/customers', { params }),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
};

// Staff API
export const staffAPI = {
  getAll: (params) => api.get('/staff', { params }),
  getById: (id) => api.get(`/staff/${id}`),
  create: (data) => api.post('/staff', data),
  update: (id, data) => api.put(`/staff/${id}`, data),
  delete: (id) => api.delete(`/staff/${id}`),
};

// Wholesalers API
export const wholesalersAPI = {
  getAll: (params) => api.get('/wholesalers', { params }),
  getById: (id) => api.get(`/wholesalers/${id}`),
  create: (data) => api.post('/wholesalers', data),
  update: (id, data) => api.put(`/wholesalers/${id}`, data),
  delete: (id) => api.delete(`/wholesalers/${id}`),
};

// Categories API
export const categoriesAPI = {
  getAll: () => api.get('/categories'),
};

// Dashboard API
export const dashboardAPI = {
  getStats: (params) => api.get('/dashboard/stats', { params }),
  getRecentActivity: () => api.get('/dashboard/recent-activity'),
  getSalesChart: (params) => api.get('/dashboard/sales-chart', { params }),
  getInventoryChart: () => api.get('/dashboard/inventory-chart'),
};

export default api;