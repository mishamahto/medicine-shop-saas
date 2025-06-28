import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { customersAPI, wholesalersAPI, staffAPI } from '../services/api';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Users,
  User,
  Building,
  UserCheck,
  Filter
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const Contacts = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [formData, setFormData] = useState({
    type: 'customer',
    name: '',
    email: '',
    phone: '',
    address: '',
    contact_person: '',
    customer_type: 'retail',
    insurance_provider: '',
    wholesaler_type: 'pharmaceutical',
    payment_terms: '',
    staff_role: 'sales',
    license_number: '',
    joining_date: '',
    notes: ''
  });

  const queryClient = useQueryClient();

  // Fetch all contacts data
  const { data: customers, isLoading: customersLoading } = useQuery('customers', () =>
    customersAPI.getAll()
  );

  const { data: wholesalers, isLoading: wholesalersLoading } = useQuery('wholesalers', () =>
    wholesalersAPI.getAll()
  );

  const { data: staff, isLoading: staffLoading } = useQuery('staff', () =>
    staffAPI.getAll()
  );

  // Mutations
  const addCustomerMutation = useMutation(customersAPI.create, {
    onSuccess: () => {
      queryClient.invalidateQueries('customers');
      setShowAddModal(false);
      resetForm();
      toast.success('Customer added successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to add customer');
    }
  });

  const addWholesalerMutation = useMutation(wholesalersAPI.create, {
    onSuccess: () => {
      queryClient.invalidateQueries('wholesalers');
      setShowAddModal(false);
      resetForm();
      toast.success('Wholesaler added successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to add wholesaler');
    }
  });

  const addStaffMutation = useMutation(staffAPI.create, {
    onSuccess: () => {
      queryClient.invalidateQueries('staff');
      setShowAddModal(false);
      resetForm();
      toast.success('Staff member added successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to add staff member');
    }
  });

  const updateCustomerMutation = useMutation(customersAPI.update, {
    onSuccess: () => {
      queryClient.invalidateQueries('customers');
      setShowEditModal(false);
      setSelectedContact(null);
      resetForm();
      toast.success('Customer updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update customer');
    }
  });

  const updateWholesalerMutation = useMutation(wholesalersAPI.update, {
    onSuccess: () => {
      queryClient.invalidateQueries('wholesalers');
      setShowEditModal(false);
      setSelectedContact(null);
      resetForm();
      toast.success('Wholesaler updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update wholesaler');
    }
  });

  const updateStaffMutation = useMutation(staffAPI.update, {
    onSuccess: () => {
      queryClient.invalidateQueries('staff');
      setShowEditModal(false);
      setSelectedContact(null);
      resetForm();
      toast.success('Staff member updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update staff member');
    }
  });

  const deleteCustomerMutation = useMutation(customersAPI.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries('customers');
      toast.success('Customer deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete customer');
    }
  });

  const deleteWholesalerMutation = useMutation(wholesalersAPI.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries('wholesalers');
      toast.success('Wholesaler deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete wholesaler');
    }
  });

  const deleteStaffMutation = useMutation(staffAPI.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries('staff');
      toast.success('Staff member deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete staff member');
    }
  });

  const resetForm = () => {
    setFormData({
      type: 'customer',
      name: '',
      email: '',
      phone: '',
      address: '',
      contact_person: '',
      customer_type: 'retail',
      insurance_provider: '',
      wholesaler_type: 'pharmaceutical',
      payment_terms: '',
      staff_role: 'sales',
      license_number: '',
      joining_date: '',
      notes: ''
    });
  };

  const handleEdit = (contact, type) => {
    setSelectedContact({ ...contact, contactType: type });
    setFormData({
      type: type,
      name: contact.name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      address: contact.address || '',
      contact_person: contact.contact_person || '',
      customer_type: contact.customer_type || 'retail',
      insurance_provider: contact.insurance_provider || '',
      wholesaler_type: contact.wholesaler_type || 'pharmaceutical',
      payment_terms: contact.payment_terms || '',
      staff_role: contact.role || 'sales',
      license_number: contact.license_number || '',
      joining_date: contact.joining_date ? contact.joining_date.split('T')[0] : '',
      notes: contact.notes || ''
    });
    setShowEditModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { type, ...data } = formData;
    
    if (showEditModal) {
      if (selectedContact.contactType === 'customer') {
        updateCustomerMutation.mutate({ id: selectedContact.id, ...data });
      } else if (selectedContact.contactType === 'wholesaler') {
        updateWholesalerMutation.mutate({ id: selectedContact.id, ...data });
      } else if (selectedContact.contactType === 'staff') {
        updateStaffMutation.mutate({ id: selectedContact.id, ...data });
      }
    } else {
      if (type === 'customer') {
        addCustomerMutation.mutate(data);
      } else if (type === 'wholesaler') {
        addWholesalerMutation.mutate(data);
      } else if (type === 'staff') {
        addStaffMutation.mutate(data);
      }
    }
  };

  const handleDelete = (id, type) => {
    if (window.confirm('Are you sure you want to delete this contact?')) {
      if (type === 'customer') {
        deleteCustomerMutation.mutate(id);
      } else if (type === 'wholesaler') {
        deleteWholesalerMutation.mutate(id);
      } else if (type === 'staff') {
        deleteStaffMutation.mutate(id);
      }
    }
  };

  // Combine all contacts with type information (robust array checks)
  const customersArray = Array.isArray(customers?.data) ? customers.data : [];
  const wholesalersArray = Array.isArray(wholesalers?.data) ? wholesalers.data : [];
  const staffArray = Array.isArray(staff?.data) ? staff.data : [];

  const allContacts = [
    ...customersArray.map(c => ({ ...c, contactType: 'customer' })),
    ...wholesalersArray.map(w => ({ ...w, contactType: 'wholesaler' })),
    ...staffArray.map(s => ({ ...s, contactType: 'staff' }))
  ];

  // Filter contacts
  const filteredContacts = allContacts.filter(contact => {
    const matchesSearch = (contact.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (contact.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (contact.phone || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !selectedType || contact.contactType === selectedType;
    return matchesSearch && matchesType;
  });

  const isLoading = customersLoading || wholesalersLoading || staffLoading;

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-600">Manage customers, wholesalers, and staff</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Contact
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <User className="h-8 w-8 text-blue-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Total Customers</p>
                <p className="text-2xl font-bold text-gray-900">{customersArray.length}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <Building className="h-8 w-8 text-green-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Total Wholesalers</p>
                <p className="text-2xl font-bold text-gray-900">{wholesalersArray.length}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <UserCheck className="h-8 w-8 text-purple-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Total Staff</p>
                <p className="text-2xl font-bold text-gray-900">{staffArray.length}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-orange-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Total Contacts</p>
                <p className="text-2xl font-bold text-gray-900">{allContacts.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Types</option>
              <option value="customer">Customers</option>
              <option value="wholesaler">Wholesalers</option>
              <option value="staff">Staff</option>
            </select>
            <div className="text-sm text-gray-600 flex items-center">
              <Filter className="h-4 w-4 mr-1" />
              {filteredContacts.length} contact(s) found
            </div>
          </div>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="card">
        <div className="card-body">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Special Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredContacts.map((contact) => {
                  const getTypeIcon = () => {
                    switch (contact.contactType) {
                      case 'customer': return <User className="h-8 w-8 text-blue-400" />;
                      case 'wholesaler': return <Building className="h-8 w-8 text-green-400" />;
                      case 'staff': return <UserCheck className="h-8 w-8 text-purple-400" />;
                      default: return <Users className="h-8 w-8 text-gray-400" />;
                    }
                  };

                  const getTypeBadge = () => {
                    const colors = {
                      customer: 'bg-blue-100 text-blue-800',
                      wholesaler: 'bg-green-100 text-green-800',
                      staff: 'bg-purple-100 text-purple-800'
                    };
                    return colors[contact.contactType] || 'bg-gray-100 text-gray-800';
                  };

                  const getSpecialInfo = () => {
                    switch (contact.contactType) {
                      case 'customer':
                        return (
                          <div>
                            <div className="text-sm text-gray-900">{contact.customer_type || 'Retail'}</div>
                            {contact.insurance_provider && (
                              <div className="text-xs text-gray-500">Insurance: {contact.insurance_provider}</div>
                            )}
                          </div>
                        );
                      case 'wholesaler':
                        return (
                          <div>
                            <div className="text-sm text-gray-900">{contact.wholesaler_type || 'Pharmaceutical'}</div>
                            {contact.payment_terms && (
                              <div className="text-xs text-gray-500">Terms: {contact.payment_terms}</div>
                            )}
                          </div>
                        );
                      case 'staff':
                        return (
                          <div>
                            <div className="text-sm text-gray-900">{contact.role || 'Sales'}</div>
                            {contact.license_number && (
                              <div className="text-xs text-gray-500">License: {contact.license_number}</div>
                            )}
                          </div>
                        );
                      default:
                        return null;
                    }
                  };

                  return (
                    <tr key={`${contact.contactType}-${contact.id}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getTypeIcon()}
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">{contact.name}</div>
                            <div className="text-sm text-gray-500">{contact.contact_person || 'No contact person'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeBadge()}`}>
                          {contact.contactType.charAt(0).toUpperCase() + contact.contactType.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{contact.email || 'No email'}</div>
                        <div className="text-sm text-gray-500">{contact.phone || 'No phone'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getSpecialInfo()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(contact, contact.contactType)}
                            className="text-primary-600 hover:text-primary-900"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(contact.id, contact.contactType)}
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

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Add New Contact</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Type *</label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="customer">Customer</option>
                  <option value="wholesaler">Wholesaler</option>
                  <option value="staff">Staff</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  rows="2"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Customer-specific fields */}
              {formData.type === 'customer' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer Type</label>
                    <select
                      value={formData.customer_type}
                      onChange={(e) => setFormData({...formData, customer_type: e.target.value})}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="retail">Retail</option>
                      <option value="wholesale">Wholesale</option>
                      <option value="institutional">Institutional</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Provider</label>
                    <input
                      type="text"
                      value={formData.insurance_provider}
                      onChange={(e) => setFormData({...formData, insurance_provider: e.target.value})}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              )}

              {/* Wholesaler-specific fields */}
              {formData.type === 'wholesaler' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Wholesaler Type</label>
                    <select
                      value={formData.wholesaler_type}
                      onChange={(e) => setFormData({...formData, wholesaler_type: e.target.value})}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="pharmaceutical">Pharmaceutical</option>
                      <option value="equipment">Medical Equipment</option>
                      <option value="supplies">Medical Supplies</option>
                      <option value="general">General</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                    <input
                      type="text"
                      value={formData.payment_terms}
                      onChange={(e) => setFormData({...formData, payment_terms: e.target.value})}
                      placeholder="e.g., Net 30"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              )}

              {/* Staff-specific fields */}
              {formData.type === 'staff' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select
                      value={formData.staff_role}
                      onChange={(e) => setFormData({...formData, staff_role: e.target.value})}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="pharmacist">Pharmacist</option>
                      <option value="sales">Sales Staff</option>
                      <option value="delivery">Delivery Staff</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                    <input
                      type="text"
                      value={formData.license_number}
                      onChange={(e) => setFormData({...formData, license_number: e.target.value})}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows="2"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
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
                  disabled={addCustomerMutation.isLoading || addWholesalerMutation.isLoading || addStaffMutation.isLoading}
                  className="btn btn-primary"
                >
                  {(addCustomerMutation.isLoading || addWholesalerMutation.isLoading || addStaffMutation.isLoading) ? 'Adding...' : 'Add Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Contact Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Edit Contact</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  rows="2"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Customer-specific fields */}
              {formData.type === 'customer' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer Type</label>
                    <select
                      value={formData.customer_type}
                      onChange={(e) => setFormData({...formData, customer_type: e.target.value})}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="retail">Retail</option>
                      <option value="wholesale">Wholesale</option>
                      <option value="institutional">Institutional</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Provider</label>
                    <input
                      type="text"
                      value={formData.insurance_provider}
                      onChange={(e) => setFormData({...formData, insurance_provider: e.target.value})}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              )}

              {/* Wholesaler-specific fields */}
              {formData.type === 'wholesaler' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Wholesaler Type</label>
                    <select
                      value={formData.wholesaler_type}
                      onChange={(e) => setFormData({...formData, wholesaler_type: e.target.value})}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="pharmaceutical">Pharmaceutical</option>
                      <option value="equipment">Medical Equipment</option>
                      <option value="supplies">Medical Supplies</option>
                      <option value="general">General</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                    <input
                      type="text"
                      value={formData.payment_terms}
                      onChange={(e) => setFormData({...formData, payment_terms: e.target.value})}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              )}

              {/* Staff-specific fields */}
              {formData.type === 'staff' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select
                      value={formData.staff_role}
                      onChange={(e) => setFormData({...formData, staff_role: e.target.value})}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="pharmacist">Pharmacist</option>
                      <option value="sales">Sales Staff</option>
                      <option value="delivery">Delivery Staff</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                    <input
                      type="text"
                      value={formData.license_number}
                      onChange={(e) => setFormData({...formData, license_number: e.target.value})}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows="2"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedContact(null);
                    resetForm();
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateCustomerMutation.isLoading || updateWholesalerMutation.isLoading || updateStaffMutation.isLoading}
                  className="btn btn-primary"
                >
                  {(updateCustomerMutation.isLoading || updateWholesalerMutation.isLoading || updateStaffMutation.isLoading) ? 'Updating...' : 'Update Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contacts; 