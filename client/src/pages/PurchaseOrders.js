import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { purchaseOrdersAPI, wholesalersAPI, inventoryAPI } from '../services/api';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  ShoppingCart,
  Calendar,
  DollarSign,
  Filter,
  TrendingUp,
  AlertCircle,
  Package,
  CheckCircle,
  Clock
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const PurchaseOrders = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedWholesaler, setSelectedWholesaler] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [formData, setFormData] = useState({
    wholesaler_id: '',
    order_date: '',
    expected_delivery: '',
    notes: ''
  });
  const [poItems, setPoItems] = useState([]);
  const [receivedItems, setReceivedItems] = useState([]);

  const queryClient = useQueryClient();

  // Fetch purchase orders data
  const { data: purchaseOrders, isLoading } = useQuery('purchase-orders', () =>
    purchaseOrdersAPI.getAll()
  );

  // Fetch wholesalers
  const { data: wholesalers } = useQuery('wholesalers', () =>
    wholesalersAPI.getAll()
  );

  // Fetch inventory for items
  const { data: inventory } = useQuery('inventory', () =>
    inventoryAPI.getAll()
  );

  // Fetch purchase orders statistics
  const { data: stats } = useQuery('purchase-orders-stats', () =>
    purchaseOrdersAPI.getStats()
  );

  // Mutations
  const addPOMutation = useMutation(purchaseOrdersAPI.create, {
    onSuccess: () => {
      queryClient.invalidateQueries('purchase-orders');
      queryClient.invalidateQueries('purchase-orders-stats');
      setShowAddModal(false);
      resetForm();
      toast.success('Purchase order created successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create purchase order');
    }
  });

  const updatePOMutation = useMutation(purchaseOrdersAPI.updateStatus, {
    onSuccess: () => {
      queryClient.invalidateQueries('purchase-orders');
      queryClient.invalidateQueries('purchase-orders-stats');
      setShowEditModal(false);
      setSelectedPO(null);
      resetForm();
      toast.success('Purchase order updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update purchase order');
    }
  });

  const receiveItemsMutation = useMutation(purchaseOrdersAPI.receiveItems, {
    onSuccess: () => {
      queryClient.invalidateQueries('purchase-orders');
      queryClient.invalidateQueries('purchase-orders-stats');
      queryClient.invalidateQueries('inventory');
      setShowReceiveModal(false);
      setSelectedPO(null);
      setReceivedItems([]);
      toast.success('Items received successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to receive items');
    }
  });

  const deletePOMutation = useMutation(purchaseOrdersAPI.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries('purchase-orders');
      queryClient.invalidateQueries('purchase-orders-stats');
      toast.success('Purchase order deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete purchase order');
    }
  });

  const resetForm = () => {
    setFormData({
      wholesaler_id: '',
      order_date: '',
      expected_delivery: '',
      notes: ''
    });
    setPoItems([]);
  };

  const handleEdit = (po) => {
    setSelectedPO(po);
    setFormData({
      wholesaler_id: po.wholesaler_id || '',
      order_date: po.order_date ? po.order_date.split('T')[0] : '',
      expected_delivery: po.expected_delivery ? po.expected_delivery.split('T')[0] : '',
      notes: po.notes || ''
    });
    setShowEditModal(true);
  };

  const handleReceive = (po) => {
    setSelectedPO(po);
    // Initialize received items with current PO items
    const initialReceivedItems = po.items?.map(item => ({
      item_id: item.inventory_id,
      received_quantity: 0,
      max_quantity: item.quantity
    })) || [];
    setReceivedItems(initialReceivedItems);
    setShowReceiveModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (showEditModal) {
      updatePOMutation.mutate({ id: selectedPO.id, status: selectedPO.status });
    } else {
      const poData = {
        ...formData,
        items: poItems
      };
      addPOMutation.mutate(poData);
    }
  };

  const handleReceiveSubmit = (e) => {
    e.preventDefault();
    const itemsToReceive = receivedItems.filter(item => item.received_quantity > 0);
    if (itemsToReceive.length === 0) {
      toast.error('Please specify quantities to receive');
      return;
    }
    receiveItemsMutation.mutate({ id: selectedPO.id, received_items: itemsToReceive });
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this purchase order?')) {
      deletePOMutation.mutate(id);
    }
  };

  const addItem = () => {
    setPoItems([...poItems, {
      inventory_id: '',
      quantity: 1,
      unit_cost: 0
    }]);
  };

  const removeItem = (index) => {
    setPoItems(poItems.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const updatedItems = [...poItems];
    updatedItems[index][field] = value;
    if (field === 'quantity' || field === 'unit_cost') {
      updatedItems[index].total_cost = updatedItems[index].quantity * updatedItems[index].unit_cost;
    }
    setPoItems(updatedItems);
  };

  const updateReceivedItem = (index, value) => {
    const updatedItems = [...receivedItems];
    updatedItems[index].received_quantity = parseInt(value) || 0;
    setReceivedItems(updatedItems);
  };

  // Filter purchase orders
  const filteredPOs = Array.isArray(purchaseOrders?.data) ? purchaseOrders.data.filter(po => {
    const matchesSearch = (po.po_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (po.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !selectedStatus || po.status === selectedStatus;
    const matchesWholesaler = !selectedWholesaler || po.wholesaler_id === parseInt(selectedWholesaler);
    const matchesDateRange = (!startDate || po.order_date >= startDate) && 
                            (!endDate || po.order_date <= endDate);
    return matchesSearch && matchesStatus && matchesWholesaler && matchesDateRange;
  }) : [];

  // Get wholesalers array
  const wholesalersArray = Array.isArray(wholesalers?.data) ? wholesalers.data : 
                          Array.isArray(wholesalers) ? wholesalers : [];
  const inventoryArray = Array.isArray(inventory?.data) ? inventory.data : 
                        Array.isArray(inventory) ? inventory : [];

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-gray-600">Manage purchase orders with wholesalers and suppliers</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create PO
        </button>
      </div>

      {/* Statistics Cards */}
      {stats?.data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <ShoppingCart className="h-8 w-8 text-blue-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Total POs</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.data.total_pos || 0}</p>
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
                  <p className="text-2xl font-bold text-gray-900">{stats.data.pending_pos || 0}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Received</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.data.received_pos || 0}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-red-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold text-gray-900">₹{parseFloat(stats.data.total_value || 0).toFixed(2)}</p>
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
                placeholder="Search POs..."
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
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={selectedWholesaler}
              onChange={(e) => setSelectedWholesaler(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Wholesalers</option>
              {wholesalersArray.map(wholesaler => (
                <option key={wholesaler.id} value={wholesaler.id}>{wholesaler.name}</option>
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
              {filteredPOs.length} PO(s) found
            </div>
          </div>
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div className="card">
        <div className="card-body">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PO Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Wholesaler
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
                    Expected Delivery
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPOs.map((po) => {
                  const isOverdue = po.expected_delivery && new Date(po.expected_delivery) < new Date() && po.status === 'pending';
                  const wholesaler = wholesalersArray.find(w => w.id === po.wholesaler_id);
                  
                  return (
                    <tr key={po.id} className={isOverdue ? 'bg-red-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <ShoppingCart className="h-8 w-8 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{po.po_number}</div>
                            <div className="text-sm text-gray-500">{new Date(po.order_date).toLocaleDateString()}</div>
                            <div className="text-xs text-gray-400">{po.notes}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{wholesaler?.name || 'Unknown'}</div>
                        <div className="text-xs text-gray-500">{wholesaler?.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {po.items?.length || 0} items
                        </div>
                        <div className="text-xs text-gray-500">
                          {po.items?.reduce((sum, item) => sum + item.quantity, 0) || 0} total qty
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          ₹{parseFloat(po.total_amount || 0).toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          po.status === 'received' 
                            ? 'bg-green-100 text-green-800'
                            : po.status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : isOverdue
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {isOverdue ? 'Overdue' : po.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {po.expected_delivery ? (
                          <div className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                            {new Date(po.expected_delivery).toLocaleDateString()}
                            {isOverdue && <AlertCircle className="h-4 w-4 text-red-500 inline ml-1" />}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">No date set</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {po.status === 'pending' && (
                            <button
                              onClick={() => handleReceive(po)}
                              className="text-green-600 hover:text-green-900"
                              title="Receive Items"
                            >
                              <Package className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(po)}
                            className="text-primary-600 hover:text-primary-900"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(po.id)}
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

      {/* Add Purchase Order Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Create Purchase Order</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Wholesaler *</label>
                  <select
                    required
                    value={formData.wholesaler_id}
                    onChange={(e) => setFormData({...formData, wholesaler_id: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Wholesaler</option>
                    {wholesalersArray.map(wholesaler => (
                      <option key={wholesaler.id} value={wholesaler.id}>{wholesaler.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Order Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.order_date}
                    onChange={(e) => setFormData({...formData, order_date: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expected Delivery</label>
                  <input
                    type="date"
                    value={formData.expected_delivery}
                    onChange={(e) => setFormData({...formData, expected_delivery: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
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

              {/* PO Items */}
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
                {poItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3 p-3 border rounded-lg">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Item</label>
                      <select
                        required
                        value={item.inventory_id}
                        onChange={(e) => updateItem(index, 'inventory_id', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">Select Item</option>
                        {inventoryArray.map(inv => (
                          <option key={inv.id} value={inv.id}>{inv.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Unit Cost</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={item.unit_cost}
                        onChange={(e) => updateItem(index, 'unit_cost', parseFloat(e.target.value))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div className="flex items-end space-x-2">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Total</label>
                        <div className="text-sm font-medium text-gray-900">
                          ₹{(item.quantity * item.unit_cost).toFixed(2)}
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
                ))}
              </div>

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
                  disabled={addPOMutation.isLoading}
                  className="btn btn-primary"
                >
                  {addPOMutation.isLoading ? 'Creating...' : 'Create PO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Purchase Order Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Update Purchase Order Status</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={selectedPO?.status || 'pending'}
                  onChange={(e) => setSelectedPO({...selectedPO, status: e.target.value})}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="pending">Pending</option>
                  <option value="received">Received</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedPO(null);
                    resetForm();
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatePOMutation.isLoading}
                  className="btn btn-primary"
                >
                  {updatePOMutation.isLoading ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive Items Modal */}
      {showReceiveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Receive Items</h2>
            <form onSubmit={handleReceiveSubmit} className="space-y-4">
              <div className="text-sm text-gray-600 mb-4">
                PO: {selectedPO?.po_number} | Wholesaler: {wholesalersArray.find(w => w.id === selectedPO?.wholesaler_id)?.name}
              </div>
              
              {receivedItems.map((item, index) => {
                const poItem = selectedPO?.items?.find(poi => poi.inventory_id === item.item_id);
                const inventoryItem = inventoryArray.find(inv => inv.id === item.item_id);
                
                return (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 border rounded-lg">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Item</label>
                      <div className="text-sm font-medium text-gray-900">{inventoryItem?.name}</div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Ordered Quantity</label>
                      <div className="text-sm text-gray-600">{poItem?.quantity || 0}</div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Received Quantity</label>
                      <input
                        type="number"
                        min="0"
                        max={poItem?.quantity || 0}
                        value={item.received_quantity}
                        onChange={(e) => updateReceivedItem(index, e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                );
              })}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowReceiveModal(false);
                    setSelectedPO(null);
                    setReceivedItems([]);
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={receiveItemsMutation.isLoading}
                  className="btn btn-primary"
                >
                  {receiveItemsMutation.isLoading ? 'Receiving...' : 'Receive Items'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrders; 