import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { invoicesAPI, customersAPI, inventoryAPI } from '../services/api';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  FileText,
  DollarSign,
  Filter,
  AlertCircle,
  CreditCard,
  CheckCircle,
  Clock
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

// Add GST rates constant
const GST_RATES = [0, 5, 12, 18, 28];

const Invoices = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [startDate, setStartDate] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [formData, setFormData] = useState({
    customer: {
      customer_id: '',
      customer_name: '',
      customer_phone: '',
      customer_address: ''
    },
    invoice_date: '',
    due_date: '',
    payment_method: '',
    notes: ''
  });
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [paymentData, setPaymentData] = useState({
    payment_method: '',
    amount: '',
    notes: ''
  });

  const queryClient = useQueryClient();

  // Fetch invoices data
  const { data: invoicesResponse, isLoading, error } = useQuery('invoices', () =>
    invoicesAPI.getAll()
  );

  // Debug logging
  console.log('Loading:', isLoading);
  console.log('Error:', error);
  console.log('Invoices data:', invoicesResponse);

  // Get the actual invoices array from the response
  const invoices = invoicesResponse?.data?.data || [];
  console.log('Processed invoices:', invoices);

  // Fetch customers
  const { data: customers } = useQuery('customers', () =>
    customersAPI.getAll()
  );

  // Fetch inventory for items
  const { data: inventory } = useQuery('inventory', () =>
    inventoryAPI.getAll()
  );

  // Fetch invoices statistics
  const { data: stats } = useQuery('invoices-stats', () =>
    invoicesAPI.getStats()
  );

  // Mutations
  const addInvoiceMutation = useMutation(invoicesAPI.create, {
    onSuccess: () => {
      queryClient.invalidateQueries('invoices');
      queryClient.invalidateQueries('invoices-stats');
      setShowAddModal(false);
      resetForm();
      toast.success('Invoice created successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create invoice');
    }
  });

  const updateInvoiceMutation = useMutation(invoicesAPI.updateStatus, {
    onSuccess: () => {
      queryClient.invalidateQueries('invoices');
      queryClient.invalidateQueries('invoices-stats');
      setShowEditModal(false);
      setSelectedInvoice(null);
      resetForm();
      toast.success('Invoice updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update invoice');
    }
  });

  const markAsPaidMutation = useMutation(invoicesAPI.markAsPaid, {
    onSuccess: () => {
      queryClient.invalidateQueries('invoices');
      queryClient.invalidateQueries('invoices-stats');
      setShowPaymentModal(false);
      setSelectedInvoice(null);
      setPaymentData({ payment_method: '', amount: '', notes: '' });
      toast.success('Payment recorded successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to record payment');
    }
  });

  const deleteInvoiceMutation = useMutation(invoicesAPI.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries('invoices');
      queryClient.invalidateQueries('invoices-stats');
      toast.success('Invoice deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete invoice');
    }
  });

  const resetForm = () => {
    setFormData({
      customer: {
        customer_id: '',
        customer_name: '',
        customer_phone: '',
        customer_address: ''
      },
      invoice_date: '',
      due_date: '',
      payment_method: '',
      notes: ''
    });
    setInvoiceItems([]);
  };

  const handleEdit = (invoice) => {
    setSelectedInvoice(invoice);
    setFormData({
      customer: {
        customer_id: invoice.customer_id || '',
        customer_name: invoice.customer_name || '',
        customer_phone: invoice.customer_phone || '',
        customer_address: invoice.customer_address || ''
      },
      invoice_date: invoice.invoice_date ? invoice.invoice_date.split('T')[0] : '',
      due_date: invoice.due_date ? invoice.due_date.split('T')[0] : '',
      payment_method: invoice.payment_method || '',
      notes: invoice.notes || ''
    });
    setShowEditModal(true);
  };

  const handlePayment = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentData({
      payment_method: '',
      amount: invoice.total_amount || 0,
      notes: ''
    });
    setShowPaymentModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (showEditModal) {
      updateInvoiceMutation.mutate({ id: selectedInvoice.id, status: selectedInvoice.status });
    } else {
      const invoiceData = {
        ...formData,
        items: invoiceItems.map(item => ({
          ...item,
          total_amount: calculateItemTotal(item)
        }))
      };
      addInvoiceMutation.mutate(invoiceData);
    }
  };

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    markAsPaidMutation.mutate({ id: selectedInvoice.id, ...paymentData });
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      deleteInvoiceMutation.mutate(id);
    }
  };

  const addItem = () => {
    setInvoiceItems([...invoiceItems, {
      inventory_id: null,
      item_text: '',
      quantity: 1,
      unit_price: 0,
      discount_percentage: 0,
      discount_amount: 0,
      gst_percentage: 0,
      gst_amount: 0
    }]);
  };

  const removeItem = (index) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  const updateItem = (index, updates) => {
    const updatedItems = [...invoiceItems];
    updatedItems[index] = {
      ...updatedItems[index],
      ...updates
    };
    setInvoiceItems(updatedItems);
  };

  // Calculate totals
  const calculateDiscountAmount = (quantity, unitPrice, discountPercentage) => {
    const subtotal = quantity * unitPrice;
    return (subtotal * (discountPercentage / 100)) || 0;
  };

  const calculateGSTAmount = (quantity, unitPrice, gstPercentage) => {
    const subtotal = quantity * unitPrice;
    return (subtotal * (gstPercentage / 100)) || 0;
  };

  const calculateItemTotal = (item) => {
    const subtotal = item.quantity * item.unit_price;
    const discountAmount = item.discount_amount || 0;
    const gstAmount = item.gst_amount || 0;
    return subtotal - discountAmount + gstAmount;
  };

  const calculateTotals = () => {
    return invoiceItems.reduce((totals, item) => {
      const subtotal = item.quantity * item.unit_price;
      const discountAmount = item.discount_amount || 0;
      const gstAmount = item.gst_amount || 0;
      
      return {
        subtotal: totals.subtotal + subtotal,
        totalDiscount: totals.totalDiscount + discountAmount,
        totalGST: totals.totalGST + gstAmount,
        total: totals.total + calculateItemTotal(item)
      };
    }, { subtotal: 0, totalDiscount: 0, totalGST: 0, total: 0 });
  };

  // Filter invoices
  const filteredInvoices = Array.isArray(invoices) ? invoices.filter(invoice => {
    const matchesSearch = (invoice.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !selectedStatus || invoice.status === selectedStatus;
    const matchesCustomer = !selectedCustomer || invoice.customer_id === parseInt(selectedCustomer);
    const matchesDateRange = (!startDate || new Date(invoice.invoice_date) >= new Date(startDate));
    return matchesSearch && matchesStatus && matchesCustomer && matchesDateRange;
  }) : [];

  // Format date helper function
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (e) {
      return 'Invalid date';
    }
  };

  if (isLoading) return <LoadingSpinner />;

  if (error) {
    console.error('Error loading invoices:', error);
    return <div className="text-red-600">Error loading invoices: {error.message}</div>;
  }

  // Get customers and inventory arrays
  const customersArray = Array.isArray(customers?.data?.data) ? customers.data.data : [];
  const inventoryArray = Array.isArray(inventory?.data?.data) ? inventory.data.data : [];

  // Payment methods
  const paymentMethods = [
    'Cash',
    'Check',
    'Bank Transfer',
    'Credit Card',
    'Online Payment',
    'Other'
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-600">Create and manage customer invoices and sales</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Invoice
        </button>
      </div>

      {/* Statistics Cards */}
      {stats?.data?.data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-blue-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Total Invoices</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.data.data.total_invoices || 0}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-yellow-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.data.data.pending_invoices || 0}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Paid</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.data.data.paid_invoices || 0}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-green-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">₹{parseFloat(stats.data.data.total_revenue || 0).toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Customers</option>
              {customersArray.map(customer => (
                <option key={customer.id} value={customer.id}>{customer.name}</option>
              ))}
            </select>
            <input
              type="date"
              placeholder="Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <div className="text-sm text-gray-600 flex items-center">
              <Filter className="h-4 w-4 mr-1" />
              {filteredInvoices.length} invoice(s) found
            </div>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="card">
        <div className="card-body">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvoices.map((invoice) => {
                  const isOverdue = invoice.due_date && new Date(invoice.due_date) < new Date() && invoice.status === 'pending';
                  
                  return (
                    <tr key={invoice.id} className={isOverdue ? 'bg-red-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FileText className="h-8 w-8 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">#{invoice.id}</div>
                            <div className="text-sm text-gray-500">{formatDate(invoice.invoice_date)}</div>
                            <div className="text-xs text-gray-400">{invoice.notes || 'No notes'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {invoice.customer_name || 'No name'}
                        </div>
                        <div className="text-xs text-gray-500">{invoice.customer_phone || 'No phone'}</div>
                        {invoice.customer_address && (
                          <div className="text-xs text-gray-500 truncate max-w-xs">
                            {invoice.customer_address}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {invoice.items?.length || 0} items
                        </div>
                        <div className="text-xs text-gray-500">
                          {invoice.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0} total qty
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          ₹{parseFloat(invoice.total_amount || 0).toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {invoice.payment_method || 'Not specified'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          invoice.status === 'paid' 
                            ? 'bg-green-100 text-green-800'
                            : invoice.status === 'overdue' || isOverdue
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {isOverdue ? 'Overdue' : invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {invoice.due_date ? (
                          <div className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                            {formatDate(invoice.due_date)}
                            {isOverdue && <AlertCircle className="h-4 w-4 text-red-500 inline ml-1" />}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">No due date</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {invoice.status === 'pending' && (
                            <button
                              onClick={() => handlePayment(invoice)}
                              className="text-green-600 hover:text-green-900"
                              title="Mark as Paid"
                            >
                              <CreditCard className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(invoice)}
                            className="text-primary-600 hover:text-primary-900"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(invoice.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Invoice Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Create Invoice</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-4">
                {/* Customer Selection/Input Section */}
                <div className="border p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Customer Information</h3>
                  
                  {/* Customer Selection */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Existing Customer</label>
                    <select
                      value={formData.customer.customer_id}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        if (selectedId) {
                          const customer = customersArray.find(c => c.id === parseInt(selectedId));
                          setFormData({
                            ...formData,
                            customer: {
                              customer_id: parseInt(selectedId),
                              customer_name: customer.name,
                              customer_phone: customer.phone || '',
                              customer_address: customer.address || ''
                            }
                          });
                        } else {
                          setFormData({
                            ...formData,
                            customer: {
                              customer_id: '',
                              customer_name: '',
                              customer_phone: '',
                              customer_address: ''
                            }
                          });
                        }
                      }}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Enter New Customer</option>
                      {customersArray.map(customer => (
                        <option key={customer.id} value={customer.id}>{customer.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Customer Details Form */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.customer.customer_name}
                        onChange={(e) => setFormData({
                          ...formData,
                          customer: {
                            ...formData.customer,
                            customer_name: e.target.value,
                            customer_id: '' // Clear selected customer when editing name
                          }
                        })}
                        placeholder="Enter customer name"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                      <input
                        type="text"
                        value={formData.customer.customer_phone}
                        onChange={(e) => setFormData({
                          ...formData,
                          customer: {
                            ...formData.customer,
                            customer_phone: e.target.value,
                            customer_id: '' // Clear selected customer when editing phone
                          }
                        })}
                        placeholder="Enter phone number"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <textarea
                        value={formData.customer.customer_address}
                        onChange={(e) => setFormData({
                          ...formData,
                          customer: {
                            ...formData.customer,
                            customer_address: e.target.value,
                            customer_id: '' // Clear selected customer when editing address
                          }
                        })}
                        placeholder="Enter customer address"
                        rows="2"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Rest of the form remains the same */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.invoice_date}
                      onChange={(e) => setFormData({...formData, invoice_date: e.target.value})}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                    <select
                      value={formData.payment_method}
                      onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select Payment Method</option>
                      {paymentMethods.map(method => (
                        <option key={method} value={method}>{method}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows="2"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {/* Invoice Items */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-gray-700">Items</label>
                    <button
                      type="button"
                      onClick={addItem}
                      className="btn btn-secondary text-sm"
                    >
                      Add Item
                    </button>
                  </div>
                  {invoiceItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-1 gap-4 mb-3 p-3 border rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Item Selection/Text Input */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Item</label>
                          <div className="flex gap-2">
                            <select
                              value={item.inventory_id || ''}
                              onChange={(e) => {
                                const selectedId = e.target.value;
                                if (selectedId) {
                                  const inventoryItem = inventoryArray.find(inv => inv.id === parseInt(selectedId));
                                  updateItem(index, {
                                    inventory_id: parseInt(selectedId),
                                    item_text: inventoryItem.name,
                                    unit_price: inventoryItem.unit_price
                                  });
                                } else {
                                  updateItem(index, {
                                    inventory_id: null,
                                    item_text: '',
                                    unit_price: 0
                                  });
                                }
                              }}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                              <option value="">Select Item or Enter Custom</option>
                              {inventoryArray.map(inv => (
                                <option key={inv.id} value={inv.id}>{inv.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        
                        {/* Custom Item Text */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Item Description</label>
                          <input
                            type="text"
                            value={item.item_text || ''}
                            onChange={(e) => updateItem(index, {
                              item_text: e.target.value,
                              inventory_id: null // Clear inventory selection if custom text is entered
                            })}
                            placeholder="Enter item description"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Quantity and Unit Price */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                          <input
                            type="number"
                            required
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, {
                              quantity: parseInt(e.target.value),
                              gst_amount: calculateGSTAmount(parseInt(e.target.value), item.unit_price, item.gst_percentage),
                              discount_amount: calculateDiscountAmount(parseInt(e.target.value), item.unit_price, item.discount_percentage)
                            })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Unit Price</label>
                          <input
                            type="number"
                            step="0.01"
                            required
                            value={item.unit_price}
                            onChange={(e) => updateItem(index, {
                              unit_price: parseFloat(e.target.value),
                              gst_amount: calculateGSTAmount(item.quantity, parseFloat(e.target.value), item.gst_percentage),
                              discount_amount: calculateDiscountAmount(item.quantity, parseFloat(e.target.value), item.discount_percentage)
                            })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>

                        {/* Discount Fields */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Discount %</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={item.discount_percentage || 0}
                            onChange={(e) => updateItem(index, {
                              discount_percentage: parseFloat(e.target.value),
                              discount_amount: calculateDiscountAmount(item.quantity, item.unit_price, parseFloat(e.target.value))
                            })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>

                        {/* GST Fields */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">GST %</label>
                          <select
                            value={item.gst_percentage || 0}
                            onChange={(e) => updateItem(index, {
                              gst_percentage: parseFloat(e.target.value),
                              gst_amount: calculateGSTAmount(item.quantity, item.unit_price, parseFloat(e.target.value))
                            })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            {GST_RATES.map(rate => (
                              <option key={rate} value={rate}>{rate}%</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Totals and Remove Button */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Discount Amount</label>
                          <div className="text-sm font-medium text-gray-900">
                            ₹{item.discount_amount?.toFixed(2) || '0.00'}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">GST Amount</label>
                          <div className="text-sm font-medium text-gray-900">
                            ₹{item.gst_amount?.toFixed(2) || '0.00'}
                          </div>
                        </div>
                        <div className="flex items-end justify-between">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Total</label>
                            <div className="text-sm font-medium text-gray-900">
                              ₹{calculateItemTotal(item).toFixed(2)}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                {invoiceItems.length > 0 && (
                  <div className="border-t pt-4">
                    <div className="flex flex-col gap-2 items-end text-sm">
                      <div>Subtotal: ₹{calculateTotals().subtotal.toFixed(2)}</div>
                      <div>Total Discount: ₹{calculateTotals().totalDiscount.toFixed(2)}</div>
                      <div>Total GST: ₹{calculateTotals().totalGST.toFixed(2)}</div>
                      <div className="font-bold text-lg">
                        Total: ₹{calculateTotals().total.toFixed(2)}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addInvoiceMutation.isLoading}
                    className="btn btn-primary"
                  >
                    {addInvoiceMutation.isLoading ? 'Creating...' : 'Create Invoice'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Invoice Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Update Invoice Status</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={selectedInvoice?.status || 'pending'}
                  onChange={(e) => setSelectedInvoice({...selectedInvoice, status: e.target.value})}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedInvoice(null);
                    resetForm();
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateInvoiceMutation.isLoading}
                  className="btn btn-primary"
                >
                  {updateInvoiceMutation.isLoading ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Record Payment</h2>
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div className="text-sm text-gray-600 mb-4">
                Invoice: {selectedInvoice?.invoice_number} | Amount: ₹{parseFloat(selectedInvoice?.total_amount || 0).toFixed(2)}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
                <select
                  required
                  value={paymentData.payment_method}
                  onChange={(e) => setPaymentData({...paymentData, payment_method: e.target.value})}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select Payment Method</option>
                  {paymentMethods.map(method => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({...paymentData, amount: parseFloat(e.target.value)})}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({...paymentData, notes: e.target.value})}
                  rows="2"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedInvoice(null);
                    setPaymentData({ payment_method: '', amount: '', notes: '' });
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={markAsPaidMutation.isLoading}
                  className="btn btn-primary"
                >
                  {markAsPaidMutation.isLoading ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoices; 