'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logOut } from '@/lib/auth';
import { useAuth, useRoleCheck } from '@/lib/hooks';
import { LoadingSpinner } from '@/app/components/UIComponents';
import {
  createUserAction,
  getAllUsersAction,
  updateUserAction,
  deactivateUserAction,
  activateUserAction,
  deleteUserAction,
  type CreateUserInput,
} from './actions';
import { UserRole } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { getAllDiscountRequests, approveDiscountRequest, rejectDiscountRequest, type DiscountRequest } from '@/lib/discount-requests';

type SalesStats = {
  totalOrders: number;
  totalInvoices: number;
  totalAmount: number;
  pendingOrders: number;
  draftInvoices: number;
  releasedInvoices: number;
};

type Order = {
  id: string;
  outlet_id: string;
  outlet_name?: string;
  total_amount: number;
  status: string;
  created_at: string;
};

type Invoice = {
  id: string;
  outlet_id: string;
  outlet_name?: string;
  amount: number;
  status: string;
  created_at: string;
};

type User = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'admin_keuangan', label: 'Admin Keuangan' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'fakturis', label: 'Fakturis' },
  { value: 'admin_logistik', label: 'Admin Logistik' },
  { value: 'admin_ekspedisi', label: 'Admin Ekspedisi' },
  { value: 'petugas_ekspedisi', label: 'Petugas Ekspedisi' },
  { value: 'super_admin', label: 'Super Admin' },
];

const ROLE_COLORS_DARK: Record<UserRole, string> = {
  admin_keuangan: 'bg-green-900 text-green-200',
  marketing: 'bg-purple-900 text-purple-200',
  fakturis: 'bg-blue-900 text-blue-200',
  admin_logistik: 'bg-orange-900 text-orange-200',
  admin_ekspedisi: 'bg-red-900 text-red-200',
  petugas_ekspedisi: 'bg-pink-900 text-pink-200',
  super_admin: 'bg-yellow-900 text-yellow-200',
};

export default function AdminSuperDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { hasAccess, loading: roleCheckLoading } = useRoleCheck(['super_admin']);

  // Tab state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'pengajuan-diskon'>('dashboard');

  // Sales Dashboard states
  const [salesStats, setSalesStats] = useState<SalesStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingSales, setLoadingSales] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Form states for creating user
  const [formData, setFormData] = useState<CreateUserInput>({
    email: '',
    password: '',
    name: '',
    role: 'marketing',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Users list states
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Edit modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    role: 'marketing' as UserRole,
  });
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  // Delete confirmation modal
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Pengajuan Diskon states
  const [discountRequests, setDiscountRequests] = useState<DiscountRequest[]>([]);
  const [loadingDiscountRequests, setLoadingDiscountRequests] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedDiscountRequest, setSelectedDiscountRequest] = useState<DiscountRequest | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | null>(null);

  // Redirect if not super admin
  useEffect(() => {
    if (!roleCheckLoading && !hasAccess) {
      router.push('/dashboard');
    }
  }, [hasAccess, roleCheckLoading, router]);

  // Fetch sales data on mount and when filters change
  useEffect(() => {
    if (user && activeTab === 'dashboard') {
      fetchSalesData();
    }
  }, [user, activeTab, dateFrom, dateTo, statusFilter]);

  // Fetch users on mount
  useEffect(() => {
    if (user && activeTab === 'users') {
      fetchUsers();
    }
  }, [user, activeTab]);

  // Fetch discount requests on mount
  useEffect(() => {
    if (user && activeTab === 'pengajuan-diskon') {
      fetchDiscountRequests();
    }
  }, [user, activeTab]);

  const fetchSalesData = useCallback(async () => {
    try {
      setLoadingSales(true);

      // Fetch orders
      let ordersQuery = supabase.from('orders').select('*');
      if (dateFrom) ordersQuery = ordersQuery.gte('created_at', `${dateFrom}T00:00:00`);
      if (dateTo) ordersQuery = ordersQuery.lte('created_at', `${dateTo}T23:59:59`);
      if (statusFilter !== 'all') ordersQuery = ordersQuery.eq('status', statusFilter);

      const { data: ordersData } = await ordersQuery;

      // Fetch invoices
      let invoicesQuery = supabase.from('invoices').select('*');
      if (dateFrom) invoicesQuery = invoicesQuery.gte('created_at', `${dateFrom}T00:00:00`);
      if (dateTo) invoicesQuery = invoicesQuery.lte('created_at', `${dateTo}T23:59:59`);
      if (statusFilter !== 'all') invoicesQuery = invoicesQuery.eq('status', statusFilter);

      const { data: invoicesData } = await invoicesQuery;

      // Fetch outlets to get outlet names
      const outletIds = [...new Set([
        ...(ordersData || []).map(o => o.outlet_id),
        ...(invoicesData || []).map(i => i.outlet_id)
      ])];
      
      const { data: outletsData } = await supabase
        .from('outlets')
        .select('id, name')
        .in('id', outletIds);

      // Create outlet map for quick lookup
      const outletMap = new Map(outletsData?.map(o => [o.id, o.name]) || []);

      // Merge outlet names with orders and invoices
      const ordersWithNames = (ordersData || []).map(order => ({
        ...order,
        outlet_name: outletMap.get(order.outlet_id) || order.outlet_id
      }));

      const invoicesWithNames = (invoicesData || []).map(invoice => ({
        ...invoice,
        outlet_name: outletMap.get(invoice.outlet_id) || invoice.outlet_id
      }));

      setOrders((ordersWithNames as Order[]) || []);
      setInvoices((invoicesWithNames as Invoice[]) || []);

      // Calculate stats
      const stats: SalesStats = {
        totalOrders: ordersData?.length || 0,
        totalInvoices: invoicesData?.length || 0,
        totalAmount: (ordersData || []).reduce((sum, o) => sum + Number(o.total_amount || 0), 0),
        pendingOrders: (ordersData || []).filter((o) => o.status === 'pending').length,
        draftInvoices: (invoicesData || []).filter((i) => i.status === 'draft').length,
        releasedInvoices: (invoicesData || []).filter((i) => i.status === 'released').length,
      };

      setSalesStats(stats);
    } catch (error) {
      console.error('Error fetching sales data:', error);
    } finally {
      setLoadingSales(false);
    }
  }, [dateFrom, dateTo, statusFilter]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const result = await getAllUsersAction();
      if (result.success && result.data) {
        setUsers(result.data);
      } else {
        console.error('Error fetching users:', result.error);
      }
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const fetchDiscountRequests = useCallback(async () => {
    try {
      setLoadingDiscountRequests(true);
      const result = await getAllDiscountRequests();
      if (result.error) {
        console.error('Error fetching discount requests:', result.error);
        setDiscountRequests([]);
      } else {
        setDiscountRequests(result.data || []);
      }
    } catch (error) {
      console.error('Error in fetchDiscountRequests:', error);
      setDiscountRequests([]);
    } finally {
      setLoadingDiscountRequests(false);
    }
  }, []);

  const handleApproveDiscountRequest = async () => {
    if (!selectedDiscountRequest) return;

    setProcessingRequestId(selectedDiscountRequest.id);
    try {
      const result = await approveDiscountRequest(selectedDiscountRequest.id, approvalNotes);
      if (result.error) {
        alert(`Gagal menyetujui pengajuan: ${result.error}`);
      } else {
        alert('Pengajuan diskon berhasil disetujui!');
        setShowApprovalModal(false);
        setSelectedDiscountRequest(null);
        setApprovalNotes('');
        setApprovalAction(null);
        fetchDiscountRequests(); // Refresh the list
      }
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleRejectDiscountRequest = async () => {
    if (!selectedDiscountRequest) return;

    if (!approvalNotes.trim()) {
      alert('Alasan penolakan harus diisi');
      return;
    }

    setProcessingRequestId(selectedDiscountRequest.id);
    try {
      const result = await rejectDiscountRequest(selectedDiscountRequest.id, approvalNotes);
      if (result.error) {
        alert(`Gagal menolak pengajuan: ${result.error}`);
      } else {
        alert('Pengajuan diskon berhasil ditolak!');
        setShowApprovalModal(false);
        setSelectedDiscountRequest(null);
        setApprovalNotes('');
        setApprovalAction(null);
        fetchDiscountRequests(); // Refresh the list
      }
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!formData.email || !formData.password || !formData.name) {
      setFormError('Semua field harus diisi');
      return;
    }

    if (formData.password.length < 6) {
      setFormError('Password minimal 6 karakter');
      return;
    }

    setIsCreatingUser(true);

    try {
      const result = await createUserAction(formData);
      if (result.success) {
        setFormSuccess('User berhasil dibuat!');
        setFormData({
          email: '',
          password: '',
          name: '',
          role: 'marketing',
        });
        await fetchUsers();
      } else {
        setFormError(result.error || 'Gagal membuat user');
      }
    } catch (error) {
      setFormError(`Error: ${String(error)}`);
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      name: user.name,
      role: user.role,
    });
    setEditFormError(null);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    setEditFormError(null);
    if (!editFormData.name) {
      setEditFormError('Nama tidak boleh kosong');
      return;
    }

    setIsUpdatingUser(true);

    try {
      const result = await updateUserAction({
        userId: editingUser.id,
        name: editFormData.name,
        role: editFormData.role,
      });

      if (result.success) {
        setShowEditModal(false);
        await fetchUsers();
      } else {
        setEditFormError(result.error || 'Gagal update user');
      }
    } catch (error) {
      setEditFormError(`Error: ${String(error)}`);
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;

    setIsDeletingUser(true);

    try {
      const result = await deleteUserAction(userToDelete.id);
      if (result.success) {
        setShowDeleteConfirm(false);
        setUserToDelete(null);
        await fetchUsers();
      } else {
        alert(`Gagal menghapus user: ${result.error}`);
      }
    } catch (error) {
      alert(`Error: ${String(error)}`);
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      const result = user.is_active
        ? await deactivateUserAction(user.id)
        : await activateUserAction(user.id);

      if (result.success) {
        await fetchUsers();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      alert(`Error: ${String(error)}`);
    }
  };

  const handleLogout = async () => {
    const result = await logOut();
    if (!result.error) {
      router.push('/');
    }
  };

  if (authLoading || roleCheckLoading) {
    return <LoadingSpinner />;
  }

  if (!hasAccess) {
    return null;
  }

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Super Admin Dashboard</h1>
              <p className="text-gray-400 text-sm mt-1">Manajemen Sistem & Penjualan</p>
            </div>
            <div className="flex items-center gap-6">
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-4">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-4 px-6 font-medium border-b-2 transition ${
              activeTab === 'dashboard'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            📊 Dashboard Penjualan
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`py-4 px-6 font-medium border-b-2 transition ${
              activeTab === 'users'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            👥 Manajemen User
          </button>
          <button
            onClick={() => setActiveTab('pengajuan-diskon')}
            className={`py-4 px-6 font-medium border-b-2 transition ${
              activeTab === 'pengajuan-diskon'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            💰 Pengajuan Diskon
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Stats Cards */}
            {loadingSales ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : salesStats ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-lg p-6 border border-blue-700">
                  <div className="text-blue-200 text-sm font-medium">Total Orders</div>
                  <div className="text-3xl font-bold text-white mt-2">{salesStats.totalOrders}</div>
                  <div className="text-blue-300 text-xs mt-2">⏳ {salesStats.pendingOrders} pending</div>
                </div>

                <div className="bg-gradient-to-br from-green-900 to-green-800 rounded-lg p-6 border border-green-700">
                  <div className="text-green-200 text-sm font-medium">Total Invoices</div>
                  <div className="text-3xl font-bold text-white mt-2">{salesStats.totalInvoices}</div>
                  <div className="text-green-300 text-xs mt-2">✅ {salesStats.releasedInvoices} released</div>
                </div>

                <div className="bg-gradient-to-br from-purple-900 to-purple-800 rounded-lg p-6 border border-purple-700">
                  <div className="text-purple-200 text-sm font-medium">Total Amount</div>
                  <div className="text-3xl font-bold text-white mt-2">
                    Rp {(salesStats.totalAmount / 1000000).toFixed(2)}M
                  </div>
                  <div className="text-purple-300 text-xs mt-2">📋 {salesStats.draftInvoices} draft</div>
                </div>
              </div>
            ) : null}

            {/* Filters */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h3 className="text-lg font-bold text-white mb-4">🔍 Filter Penjualan</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Dari Tanggal</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Sampai Tanggal</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">Semua Status</option>
                    <option value="pending">Pending</option>
                    <option value="draft">Draft</option>
                    <option value="posted">Posted</option>
                    <option value="released">Released</option>
                    <option value="approved">Approved</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setDateFrom('');
                      setDateTo('');
                      setStatusFilter('all');
                    }}
                    className="w-full bg-gray-700 hover:bg-gray-600 text-gray-200 px-4 py-2 rounded-lg font-medium transition"
                  >
                    Reset Filter
                  </button>
                </div>
              </div>
            </div>

            {/* Orders Table */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h3 className="text-lg font-bold text-white mb-4">📦 Daftar Orders ({orders.length})</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="px-4 py-3 text-left text-gray-300 font-medium">Order ID</th>
                      <th className="px-4 py-3 text-left text-gray-300 font-medium">Outlet Name</th>
                      <th className="px-4 py-3 text-right text-gray-300 font-medium">Amount</th>
                      <th className="px-4 py-3 text-left text-gray-300 font-medium">Status</th>
                      <th className="px-4 py-3 text-left text-gray-300 font-medium">Tanggal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-4 text-center text-gray-400">
                          Tidak ada orders
                        </td>
                      </tr>
                    ) : (
                      orders.map((order) => (
                        <tr key={order.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                          <td className="px-4 py-3 text-gray-300 font-mono text-xs">
                            {order.id.slice(0, 8)}...
                          </td>
                          <td className="px-4 py-3 text-gray-300">{order.outlet_name || order.outlet_id}</td>
                          <td className="px-4 py-3 text-right text-green-400 font-medium">
                            Rp {Number(order.total_amount).toLocaleString('id-ID')}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-700 text-gray-200">
                              {order.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-sm">
                            {new Date(order.created_at).toLocaleDateString('id-ID')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Invoices Table */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h3 className="text-lg font-bold text-white mb-4">📋 Daftar Invoices ({invoices.length})</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="px-4 py-3 text-left text-gray-300 font-medium">Invoice ID</th>
                      <th className="px-4 py-3 text-left text-gray-300 font-medium">Outlet</th>
                      <th className="px-4 py-3 text-right text-gray-300 font-medium">Amount</th>
                      <th className="px-4 py-3 text-left text-gray-300 font-medium">Status</th>
                      <th className="px-4 py-3 text-left text-gray-300 font-medium">Tanggal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-4 text-center text-gray-400">
                          Tidak ada invoices
                        </td>
                      </tr>
                    ) : (
                      invoices.map((invoice) => (
                        <tr key={invoice.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                          <td className="px-4 py-3 text-gray-300 font-mono text-xs">
                            {invoice.id.slice(0, 8)}...
                          </td>
                          <td className="px-4 py-3 text-gray-300">{invoice.outlet_name || invoice.outlet_id}</td>
                          <td className="px-4 py-3 text-right text-green-400 font-medium">
                            Rp {Number(invoice.amount).toLocaleString('id-ID')}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                invoice.status === 'released'
                                  ? 'bg-green-900 text-green-200'
                                  : invoice.status === 'draft'
                                  ? 'bg-yellow-900 text-yellow-200'
                                  : 'bg-gray-700 text-gray-200'
                              }`}
                            >
                              {invoice.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-sm">
                            {new Date(invoice.created_at).toLocaleDateString('id-ID')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div className="space-y-8">
            {/* Form Tambah User */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h2 className="text-2xl font-bold text-white mb-6">➕ Tambah User Baru</h2>

              <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nama <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nama lengkap user"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isCreatingUser}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="user@example.com"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isCreatingUser}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Password <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Min. 6 karakter"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isCreatingUser}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Role <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isCreatingUser}
                  >
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {formError && (
                  <div className="md:col-span-2 p-3 bg-red-900/30 border border-red-700 text-red-200 rounded-lg text-sm">
                    {formError}
                  </div>
                )}

                {formSuccess && (
                  <div className="md:col-span-2 p-3 bg-green-900/30 border border-green-700 text-green-200 rounded-lg text-sm">
                    {formSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="md:col-span-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition"
                >
                  {isCreatingUser ? 'Membuat user...' : 'Buat User'}
                </button>
              </form>
            </div>

            {/* Users List */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">👥 Daftar User</h2>
                <span className="text-sm text-gray-400">{filteredUsers.length} user</span>
              </div>

              {/* Search */}
              <div className="mb-6">
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Cari user (nama atau email)..."
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Loading */}
              {loadingUsers ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  {users.length === 0 ? 'Belum ada user' : 'User tidak ditemukan'}
                </div>
              ) : (
                /* Table */
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="px-4 py-3 text-left text-gray-300 font-medium">Nama</th>
                        <th className="px-4 py-3 text-left text-gray-300 font-medium">Email</th>
                        <th className="px-4 py-3 text-left text-gray-300 font-medium">Role</th>
                        <th className="px-4 py-3 text-left text-gray-300 font-medium">Status</th>
                        <th className="px-4 py-3 text-left text-gray-300 font-medium">Dibuat</th>
                        <th className="px-4 py-3 text-left text-gray-300 font-medium">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                          <td className="px-4 py-3 text-gray-100 font-medium">{user.name}</td>
                          <td className="px-4 py-3 text-gray-300">{user.email}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${ROLE_COLORS_DARK[user.role]}`}
                            >
                              {ROLE_OPTIONS.find((o) => o.value === user.role)?.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleToggleActive(user)}
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition ${
                                user.is_active ?? true
                                  ? 'bg-green-900 text-green-200 hover:bg-green-800'
                                  : 'bg-red-900 text-red-200 hover:bg-red-800'
                              }`}
                            >
                              {user.is_active ?? true ? 'Aktif' : 'Nonaktif'}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-sm">
                            {user.created_at
                              ? new Date(user.created_at).toLocaleDateString('id-ID', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm space-x-2">
                            <button
                              onClick={() => handleEditClick(user)}
                              className="text-blue-400 hover:text-blue-300 font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteClick(user)}
                              className="text-red-400 hover:text-red-300 font-medium"
                            >
                              Hapus
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PENGAJUAN DISKON TAB */}
        {activeTab === 'pengajuan-diskon' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">💰 Pengajuan Diskon</h2>
              <p className="text-gray-400">Kelola pengajuan diskon dari marketing</p>
            </div>

            {loadingDiscountRequests ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : discountRequests.length === 0 ? (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
                <div className="text-5xl mb-4">📋</div>
                <h3 className="text-xl font-semibold text-white mb-2">Belum ada pengajuan diskon</h3>
                <p className="text-gray-400">Pengajuan diskon dari marketing akan ditampilkan di sini</p>
              </div>
            ) : (
              <div className="space-y-4">
                {discountRequests.map((request) => (
                  <div key={request.id} className="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:border-gray-600 transition">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-lg font-semibold text-white">
                            {request.product?.nama_barang || 'Produk'}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                            request.status === 'approved'
                              ? 'bg-green-900 text-green-200'
                              : request.status === 'rejected'
                              ? 'bg-red-900 text-red-200'
                              : 'bg-yellow-900 text-yellow-200'
                          }`}>
                            {request.status === 'approved' ? '✓ Disetujui' : request.status === 'rejected' ? '✗ Ditolak' : '⏳ Pending'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-3">
                          <div>
                            <p className="text-gray-400">Outlet</p>
                            <p className="text-white font-medium">{request.outlet?.name}</p>
                            <p className="text-gray-500 text-xs">NIO: {request.outlet?.nio}</p>
                          </div>

                          <div>
                            <p className="text-gray-400">Diskon & Periode</p>
                            <p className="text-white font-medium">{request.discount_percentage}% diskon</p>
                            <p className="text-gray-500 text-xs">
                              {new Date(request.start_date).toLocaleDateString('id-ID')} - {new Date(request.end_date).toLocaleDateString('id-ID')}
                            </p>
                          </div>

                          <div>
                            <p className="text-gray-400">Diajukan oleh</p>
                            <p className="text-white font-medium">{request.marketing_user?.name}</p>
                            <p className="text-gray-500 text-xs">{request.marketing_user?.email}</p>
                          </div>

                          <div>
                            <p className="text-gray-400">Alasan</p>
                            <p className="text-white font-medium">{request.reason}</p>
                          </div>
                        </div>

                        {request.status !== 'pending' && request.approval_notes && (
                          <div className="mt-3 pt-3 border-t border-gray-700">
                            <p className="text-gray-400 text-sm mb-1">
                              {request.status === 'approved' ? 'Catatan Persetujuan:' : 'Alasan Penolakan:'}
                            </p>
                            <p className="text-gray-300 text-sm bg-gray-700/50 rounded px-3 py-2">
                              {request.approval_notes}
                            </p>
                          </div>
                        )}
                      </div>

                      {request.status === 'pending' && (
                        <div className="ml-4 flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedDiscountRequest(request);
                              setApprovalAction('approve');
                              setApprovalNotes('');
                              setShowApprovalModal(true);
                            }}
                            disabled={processingRequestId === request.id}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition text-sm whitespace-nowrap"
                          >
                            {processingRequestId === request.id ? 'Proses...' : 'Setujui'}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedDiscountRequest(request);
                              setApprovalAction('reject');
                              setApprovalNotes('');
                              setShowApprovalModal(true);
                            }}
                            disabled={processingRequestId === request.id}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition text-sm whitespace-nowrap"
                          >
                            {processingRequestId === request.id ? 'Proses...' : 'Tolak'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Approval Modal for Discount Requests */}
      {showApprovalModal && selectedDiscountRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-white mb-2">
              {approvalAction === 'approve' ? '✓ Setujui Pengajuan Diskon' : '✗ Tolak Pengajuan Diskon'}
            </h3>

            <div className="bg-gray-700/50 rounded px-3 py-2 mb-4 text-sm">
              <p className="text-gray-300">
                <span className="font-medium">{selectedDiscountRequest.product?.nama_barang}</span> - <span className="font-medium">{selectedDiscountRequest.discount_percentage}%</span> untuk{' '}
                <span className="font-medium">{selectedDiscountRequest.outlet?.name}</span>
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {approvalAction === 'approve' ? 'Catatan Persetujuan' : 'Alasan Penolakan'} {approvalAction === 'reject' && <span className="text-red-400">*</span>}
              </label>
              <textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder={approvalAction === 'approve' ? 'Masukkan catatan persetujuan (opsional)' : 'Jelaskan alasan penolakan...'}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                disabled={processingRequestId === selectedDiscountRequest.id}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  setSelectedDiscountRequest(null);
                  setApprovalNotes('');
                  setApprovalAction(null);
                }}
                disabled={processingRequestId === selectedDiscountRequest.id}
                className="flex-1 px-4 py-2 border border-gray-600 bg-gray-700 rounded-lg text-gray-200 font-medium hover:bg-gray-600 disabled:bg-gray-700"
              >
                Batal
              </button>
              <button
                onClick={approvalAction === 'approve' ? handleApproveDiscountRequest : handleRejectDiscountRequest}
                disabled={processingRequestId === selectedDiscountRequest.id || (approvalAction === 'reject' && !approvalNotes.trim())}
                className={`flex-1 px-4 py-2 text-white font-medium rounded-lg transition ${
                  approvalAction === 'approve'
                    ? 'bg-green-600 hover:bg-green-700 disabled:bg-gray-600'
                    : 'bg-red-600 hover:bg-red-700 disabled:bg-gray-600'
                }`}
              >
                {processingRequestId === selectedDiscountRequest.id
                  ? 'Proses...'
                  : approvalAction === 'approve'
                  ? 'Setujui'
                  : 'Tolak'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-white mb-4">Edit User</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Nama</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isUpdatingUser}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                <select
                  value={editFormData.role}
                  onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value as UserRole })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isUpdatingUser}
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {editFormError && (
                <div className="p-3 bg-red-900/30 border border-red-700 text-red-200 rounded-lg text-sm">
                  {editFormError}
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  disabled={isUpdatingUser}
                  className="flex-1 px-4 py-2 border border-gray-600 bg-gray-700 rounded-lg text-gray-200 font-medium hover:bg-gray-600 disabled:bg-gray-700"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isUpdatingUser}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium rounded-lg"
                >
                  {isUpdatingUser ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-lg max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-white mb-2">Hapus User?</h3>
            <p className="text-gray-300 mb-4">
              Anda yakin ingin menghapus user <strong>{userToDelete.name}</strong> ({userToDelete.email})?
            </p>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeletingUser}
                className="flex-1 px-4 py-2 border border-gray-600 bg-gray-700 rounded-lg text-gray-200 font-medium hover:bg-gray-600 disabled:bg-gray-700"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeletingUser}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-medium rounded-lg"
              >
                {isDeletingUser ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
