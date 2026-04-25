'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logOut } from '@/lib/auth';
import { getOutlets, exportOutletsToCSV, exportProductsToCSV } from '@/lib/export';
import { uploadOutletData } from '@/lib/outlets';
import { uploadStagingProducts, getStagingProducts, parseCsvData } from '@/lib/products';
import { getInvoices, releaseInvoice, rejectInvoice } from '@/lib/orders';
import { getEmployees, createEmployee, updateEmployee, deleteEmployee, Employee } from '@/lib/employees';
import { useAuth, useRoleCheck } from '@/lib/hooks';
import { LoadingSpinner, PageHeader } from '@/app/components/UIComponents';
import ShippingBadge from '@/app/components/ShippingBadge';

type KeuanganInvoice = {
  id?: string;
  invoice_number?: string;
  order_id?: string;
  outlet_id?: string;
  outlet?: { name?: string; NIO?: string };
  keuangan_notes?: string;
  status?: string;
  created_at?: string;
  logistik_in_status?: string;
  faktur_status?: string;
  shipping_request?: unknown;
  shipment_status?: string;
  orders?: Record<string, unknown>;
  amount?: number;
  packing_verified_at?: string;
  faktur_verified_at?: string;
  delivery_date?: string;
  [key: string]: unknown;
};

export default function AdminKeuanganDashboard() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { hasAccess } = useRoleCheck(['admin_keuangan', 'super_admin']);

  const [outlets, setOutlets] = useState<Record<string, unknown>[]>([]);
  const [invoices, setInvoices] = useState<KeuanganInvoice[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tab, setTab] = useState<'outlets' | 'outlet-import' | 'invoices' | 'master-data-barang' | 'daftar-karyawan'>('outlets');
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [releaseLoading, setReleaseLoading] = useState(false);
  const [releaseSuccess, setReleaseSuccess] = useState<string | null>(null);
  
  // Search states
  const [outletSearchQuery, setOutletSearchQuery] = useState('');
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');
  
  // Outlet import states
  const [outletUploading, setOutletUploading] = useState(false);
  const [outletUploadError, setOutletUploadError] = useState<string | null>(null);
  const [outletUploadSuccess, setOutletUploadSuccess] = useState<string | null>(null);
  
  // Master Data Barang states
  const [stagingProducts, setStagingProducts] = useState<Record<string, unknown>[]>([]);
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);
  
  // Modal state
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [modalInvoice, setModalInvoice] = useState<KeuanganInvoice | null>(null);
  const [modalAction, setModalAction] = useState<'release' | 'reject' | null>(null);
  const [modalNotes, setModalNotes] = useState('');
  
  // Invoice detail modal state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailInvoice, setDetailInvoice] = useState<KeuanganInvoice | null>(null);
  
  // Invoice filter state
  const [invoiceFilter, setInvoiceFilter] = useState<'pending' | 'released' | 'rejected'>('pending');
  
  // Product search & pagination
  const [productSearch, setProductSearch] = useState('');
  const [productPage, setProductPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Employee states
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeePage, setEmployeePage] = useState(1);
  const EMPLOYEE_ITEMS_PER_PAGE = 20;
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeFormData, setEmployeeFormData] = useState({
    nip: '',
    nama_karyawan: '',
    grade: '',
    jabatan: '',
  });
  const [employeeFormError, setEmployeeFormError] = useState<string | null>(null);
  const [employeeFormLoading, setEmployeeFormLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchStagingProducts = useCallback(async () => {
    try {
      setLoadingProducts(true);
      const result = await getStagingProducts();
      if (result.error) {
        console.error('Error fetching products:', result.error);
      } else {
        setStagingProducts(result.data || []);
        setProductPage(1); // Reset to page 1 when data is fetched
      }
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoadingEmployees(true);
      const result = await getEmployees();
      if (result.error) {
        console.error('Error fetching employees:', result.error);
      } else {
        setEmployees(result.data || []);
        setEmployeePage(1); // Reset to page 1 when data is fetched
      }
    } finally {
      setLoadingEmployees(false);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (tab === 'outlets') {
        const result = await getOutlets();
        if (result.error) {
          console.error(result.error);
        } else {
          setOutlets(result.data || []);
        }
      } else if (tab === 'master-data-barang') {
        await fetchStagingProducts();
      } else if (tab === 'daftar-karyawan') {
        await fetchEmployees();
      } else {
        const result = await getInvoices();
        if (result.error) {
          console.error(result.error);
        } else {
          setInvoices(result.data || []);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [tab, fetchEmployees, fetchStagingProducts]);

  useEffect(() => {
    if (loading || !hasAccess) return;
    fetchData();
  }, [loading, hasAccess, fetchData]);

  // Show page UI immediately, only show "Access Denied" if user is authenticated and doesn't have access
  if (!user && loading) {
    return <LoadingSpinner />;
  }

  // Redirect jika tidak punya akses
  if (!loading && user && !hasAccess) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4 text-red-500">Access Denied</h1>
          <p className="text-gray-400 mb-8">Anda tidak memiliki akses ke halaman ini</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded text-white transition"
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Filter and paginate products
  const filteredProducts = stagingProducts.filter(product => {
    const searchLower = productSearch.toLowerCase();
    return (
      (String(product.nomor_barang || '').toLowerCase().includes(searchLower)) ||
      (String(product.nama_barang || '').toLowerCase().includes(searchLower)) ||
      (String(product.golongan_barang || '').toLowerCase().includes(searchLower))
    );
  });

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const startIdx = (productPage - 1) * ITEMS_PER_PAGE;
  const paginatedProducts = filteredProducts.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  // Filter and paginate employees
  const filteredEmployees = employees.filter(emp => {
    const searchLower = employeeSearch.toLowerCase();
    return (
      (emp.nip?.toLowerCase().includes(searchLower)) ||
      (emp.nama_karyawan?.toLowerCase().includes(searchLower)) ||
      (emp.grade?.toLowerCase().includes(searchLower)) ||
      (emp.jabatan?.toLowerCase().includes(searchLower))
    );
  });

  const employeeTotalPages = Math.ceil(filteredEmployees.length / EMPLOYEE_ITEMS_PER_PAGE);
  const employeeStartIdx = (employeePage - 1) * EMPLOYEE_ITEMS_PER_PAGE;
  const paginatedEmployees = filteredEmployees.slice(employeeStartIdx, employeeStartIdx + EMPLOYEE_ITEMS_PER_PAGE);

  const handleExportOutlets = async () => {
    setIsExporting(true);
    try {
      exportOutletsToCSV(outlets as Parameters<typeof exportOutletsToCSV>[0]);
      alert('File outlet berhasil diunduh!');
    } catch (error) {
      console.error('Export error:', error);
      alert('Gagal export file');
    } finally {
      setIsExporting(false);
    }
  };

  const handleOutletFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setOutletUploading(true);
    setOutletUploadError(null);
    setOutletUploadSuccess(null);

    try {
      const text = await file.text();
      const result = await uploadOutletData(text);
      
      setOutletUploadSuccess(`✓ Berhasil upload ${result.count} outlet!`);
      
      // Refresh data
      setTimeout(() => {
        fetchData();
      }, 500);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setOutletUploadError(errorMsg);
      console.error('Upload error:', error);
    } finally {
      setOutletUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleReleaseInvoice = async (invoiceId: string) => {
    if (!user) return;

    setReleaseLoading(true);
    try {
      const result = await releaseInvoice(invoiceId, user.id, modalNotes || undefined);

      if (result.error) {
        alert('Gagal release invoice: ' + result.error);
      } else {
        setReleaseSuccess(`Invoice ${result.data?.invoice_number} berhasil di-release!`);
        setShowDecisionModal(false);
        setModalNotes('');
        setModalInvoice(null);
        setModalAction(null);
        fetchData();

        setTimeout(() => {
          setReleaseSuccess(null);
        }, 3000);
      }
    } finally {
      setReleaseLoading(false);
    }
  };

  const handleRejectInvoice = async (invoiceId: string) => {
    if (!user || !modalNotes.trim()) {
      alert('Catatan penolakan wajib diisi');
      return;
    }

    setReleaseLoading(true);
    try {
      const result = await rejectInvoice(invoiceId, user.id, modalNotes);

      if (result.error) {
        alert('Gagal reject invoice: ' + result.error);
      } else {
        setReleaseSuccess(`Invoice ${result.data?.invoice_number} berhasil di-reject!`);
        setShowDecisionModal(false);
        setModalNotes('');
        setModalInvoice(null);
        setModalAction(null);
        fetchData();

        setTimeout(() => {
          setReleaseSuccess(null);
        }, 3000);
      }
    } finally {
      setReleaseLoading(false);
    }
  };

  const openDecisionModal = (invoice: KeuanganInvoice, action: 'release' | 'reject') => {
    setModalInvoice(invoice);
    setModalAction(action);
    // Load existing notes if invoice is already released or rejected
    setModalNotes(invoice.keuangan_notes || '');
    setShowDecisionModal(true);
  };

  const closeDecisionModal = () => {
    setShowDecisionModal(false);
    setModalInvoice(null);
    setModalAction(null);
    setModalNotes('');
  };

  const openDetailModal = (invoice: KeuanganInvoice) => {
    setDetailInvoice(invoice);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setDetailInvoice(null);
  };

  const handleProductFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError('');
    setUploadSuccess('');

    try {
      const text = await file.text();
      const parseResult = parseCsvData(text);
      
      if (parseResult.error) {
        setUploadError(parseResult.error);
        return;
      }

      const uploadResult = await uploadStagingProducts(parseResult.data);
      
      if (uploadResult.error) {
        setUploadError(uploadResult.error);
      } else {
        setUploadSuccess(`✓ Berhasil upload ${parseResult.data.length} produk!`);
        setTimeout(() => {
          fetchStagingProducts();
        }, 500);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setUploadError(errorMsg);
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const openEmployeeModal = async (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      setEmployeeFormData({
        nip: employee.nip,
        nama_karyawan: employee.nama_karyawan,
        grade: employee.grade || '',
        jabatan: employee.jabatan || '',
      });
    } else {
      setEditingEmployee(null);
      setEmployeeFormData({
        nip: '',
        nama_karyawan: '',
        grade: '',
        jabatan: '',
      });
    }
    setEmployeeFormError(null);
    setShowEmployeeModal(true);
  };

  const closeEmployeeModal = () => {
    setShowEmployeeModal(false);
    setEditingEmployee(null);
    setEmployeeFormData({
      nip: '',
      nama_karyawan: '',
      grade: '',
      jabatan: '',
    });
    setEmployeeFormError(null);
  };

  const handleSaveEmployee = async () => {
    if (!employeeFormData.nip.trim() || !employeeFormData.nama_karyawan.trim()) {
      setEmployeeFormError('NIP dan Nama Karyawan wajib diisi');
      return;
    }

    setEmployeeFormLoading(true);
    setEmployeeFormError(null);

    try {
      let result;
      
      if (editingEmployee) {
        // Update existing employee
        result = await updateEmployee(editingEmployee.id, employeeFormData);
      } else {
        // Create new employee
        result = await createEmployee(employeeFormData);
      }

      if (result.error) {
        setEmployeeFormError(result.error);
      } else {
        closeEmployeeModal();
        fetchEmployees();
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setEmployeeFormError(errorMsg);
    } finally {
      setEmployeeFormLoading(false);
    }
  };

  const handleDeleteEmployee = async (id: number) => {
    setDeletingId(id);
    try {
      const result = await deleteEmployee(id);
      if (result.error) {
        alert('Gagal menghapus karyawan: ' + result.error);
      } else {
        fetchEmployees();
      }
    } finally {
      setDeletingId(null);
      setDeleteConfirmId(null);
    }
  };

  const handleDownloadPDF = (invoice: KeuanganInvoice) => {
    // Generate invoice content
    const createdAtStr = String((invoice.orders as Record<string, unknown>)?.created_at || invoice.created_at || '');
    const orderDate = new Date(createdAtStr);
    const formattedDate = orderDate.toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    const formattedTime = orderDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const pdfContent = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    INVOICE MANAGEMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ORDER ID      : ${invoice.order_id}
INVOICE #     : ${invoice.invoice_number}

OUTLET NAME   : ${invoice.outlet?.name || invoice.outlet_id}
NIO           : ${invoice.outlet?.NIO || '-'}

TANGGAL PESAN : ${formattedDate}
JAM PESAN     : ${formattedTime}

STATUS        : ${invoice.status === 'released' ? 'RELEASED' : 
                  invoice.status === 'rejected' ? 'REJECTED' : 
                  invoice.status === 'paid' ? 'PAID' : 
                  (invoice.status || 'UNKNOWN').toUpperCase()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

JUMLAH        : Rp ${Number(invoice.amount || 0).toLocaleString('id-ID')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CATATAN ADMIN KEUANGAN:
${invoice.keuangan_notes || '(Tidak ada catatan)'}

${invoice.logistik_in_status ? `
CATATAN PACKING:
Status: ${invoice.logistik_in_status === 'terpacking' ? 'SUDAH TERPACKING' : 'MENUNGGU PACKING'}
Petugas: ${invoice.packing_officer_name || '-'}
Catatan: ${invoice.packing_notes || '-'}
` : ''}

${invoice.faktur_status ? `
CATATAN FAKTUR:
Status: ${invoice.faktur_status === 'terfaktur' ? 'SUDAH TERFAKTUR' : 'MENUNGGU FAKTUR'}
Petugas: ${invoice.faktur_officer_name || '-'}
Catatan: ${invoice.faktur_notes || '-'}
` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generated: ${new Date().toLocaleString('id-ID')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim();

    // Create blob and download
    const blob = new Blob([pdfContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Invoice-${invoice.invoice_number}-${new Date().getTime()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Filter outlets based on search query
  const filteredOutlets = outlets.filter(outlet => {
    const query = outletSearchQuery.toLowerCase().trim();
    if (!query) return true;
    
    return (
      (String(outlet.nio || '').toLowerCase().includes(query)) ||
      (String(outlet.name || '').toLowerCase().includes(query)) ||
      (String(outlet.cluster || '').toLowerCase().includes(query)) ||
      (String(outlet.me || '').toLowerCase().includes(query))
    );
  });

  // Filter invoices based on search query
  const filteredInvoices = invoices.filter(invoice => {
    const query = invoiceSearchQuery.toLowerCase().trim();
    
    // Filter by status first
    if (invoiceFilter === 'pending') {
      if (invoice.status !== 'posted' && invoice.status !== 'draft') return false;
    } else if (invoiceFilter === 'released') {
      if (invoice.status !== 'released') return false;
    } else if (invoiceFilter === 'rejected') {
      if (invoice.status !== 'rejected') return false;
    }
    
    // Then filter by search query
    if (!query) return true;
    
    return (
      (String(invoice.order_id || '').toLowerCase().includes(query)) ||
      (String(invoice.invoice_number || '').toLowerCase().includes(query)) ||
      (String(invoice.outlet?.name || '').toLowerCase().includes(query)) ||
      (String(invoice.outlet?.NIO || '').toLowerCase().includes(query))
    );
  });

  const handleLogout = async () => {
    await logOut();
    router.push('/');
  };

  if (loading || !hasAccess) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Admin Keuangan</h1>
            <p className="text-gray-400 text-sm">Manajemen Outlet & Invoice</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {releaseSuccess && (
          <div className="mb-4 p-4 bg-green-900/30 border border-green-600 rounded-lg text-green-200">
            ✓ {releaseSuccess}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => {
              setTab('outlets');
              setOutletSearchQuery('');
              setInvoiceSearchQuery('');
              fetchData();
            }}
            className={`py-2 px-4 rounded-lg font-medium transition-colors ${
              tab === 'outlets'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Data Outlet
          </button>
          <button
            onClick={() => {
              setTab('outlet-import');
              setOutletSearchQuery('');
              setInvoiceSearchQuery('');
            }}
            className={`py-2 px-4 rounded-lg font-medium transition-colors ${
              tab === 'outlet-import'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            📥 Import Outlet
          </button>
          <button
            onClick={() => {
              setTab('master-data-barang');
              setOutletSearchQuery('');
              setInvoiceSearchQuery('');
              fetchData();
            }}
            className={`py-2 px-4 rounded-lg font-medium transition-colors ${
              tab === 'master-data-barang'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            📦 Data Barang
          </button>
          <button
            onClick={() => {
              setTab('daftar-karyawan');
              setOutletSearchQuery('');
              setInvoiceSearchQuery('');
              fetchData();
            }}
            className={`py-2 px-4 rounded-lg font-medium transition-colors ${
              tab === 'daftar-karyawan'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            👥 Daftar Karyawan
          </button>
          <button
            onClick={() => {
              setTab('invoices');
              setOutletSearchQuery('');
              setInvoiceSearchQuery('');
              fetchData();
            }}
            className={`py-2 px-4 rounded-lg font-medium transition-colors ${
              tab === 'invoices'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Invoice Management
          </button>
        </div>

        {/* Outlets Tab */}
        {tab === 'outlets' && (
          <div>
            <PageHeader
              title="Data Outlet"
              subtitle={`Total: ${outlets.length} outlet${outletSearchQuery ? ` (${filteredOutlets.length} hasil pencarian)` : ''}`}
            >
              <button
                onClick={handleExportOutlets}
                disabled={isExporting || outlets.length === 0}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
              >
                {isExporting ? 'Exporting...' : '📥 Export CSV'}
              </button>
            </PageHeader>

            {/* Search Bar */}
            <div className="mb-6">
              <input
                type="text"
                placeholder="🔍 Cari berdasarkan NIO, Nama Outlet, Cluster, atau ME..."
                value={outletSearchQuery}
                onChange={(e) => setOutletSearchQuery(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-gray-400">Loading...</div>
            ) : outlets.length === 0 ? (
              <div className="text-center py-8 text-gray-400">Tidak ada data outlet</div>
            ) : filteredOutlets.length === 0 ? (
              <div className="text-center py-8 text-gray-400">Tidak ada outlet yang cocok dengan pencarian</div>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-800 border-b border-gray-700">
                        <th className="px-6 py-3 text-left text-sm font-medium">NIO</th>
                        <th className="px-6 py-3 text-left text-sm font-medium">Nama</th>
                        <th className="px-6 py-3 text-left text-sm font-medium">Cluster</th>
                        <th className="px-6 py-3 text-left text-sm font-medium">Tempo</th>
                        <th className="px-6 py-3 text-left text-sm font-medium">DUE</th>
                        <th className="px-6 py-3 text-left text-sm font-medium">Credit Limit</th>
                        <th className="px-6 py-3 text-left text-sm font-medium">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOutlets.map((outlet) => (
                        <tr key={String(outlet.id)} className="border-b border-gray-700 hover:bg-gray-800">
                          <td className="px-6 py-4 text-sm font-mono">{outlet.nio ? String(outlet.nio) : '-'}</td>
                          <td className="px-6 py-4 text-sm">{outlet.name ? String(outlet.name) : '-'}</td>
                          <td className="px-6 py-4 text-sm">{outlet.cluster ? String(outlet.cluster) : '-'}</td>
                          <td className="px-6 py-4 text-sm">{outlet.top_hari ? String(outlet.top_hari) : '-'} hari</td>
                          <td className="px-6 py-4 text-sm">{outlet.due != null ? `${String(outlet.due)} hari` : '-'}</td>
                          <td className="px-6 py-4 text-sm">Rp {Number(outlet.limit_rupiah || 0).toLocaleString('id-ID') || '-'}</td>
                          <td className="px-6 py-4 text-sm">Rp {Number(outlet.current_saldo || 0).toLocaleString('id-ID') || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Outlet Import Tab */}
        {tab === 'outlet-import' && (
          <div>
            <PageHeader
              title="Import Data Outlet"
              subtitle="Upload file CSV untuk update data outlet"
            />

            {/* Upload Section */}
            <div className="bg-gray-900 border-2 border-dashed border-gray-700 rounded-lg p-8 mb-6">
              <div className="text-center">
                <p className="text-lg font-semibold mb-4">Upload Data Outlet</p>
                <p className="text-sm text-gray-400 mb-6">
                    Format CSV: NIO, NAMA OUTLET, ME, CLUSTER, KELOMPOK, LIMIT, TOP, DUE, SALDO<br/>
                    <span className="text-xs text-gray-500 mt-2 block">
                      NIO = Nomor Identifikasi Outlet (wajib unik)<br/>
                      LIMIT = Limit dalam rupiah (contoh: 1000000 atau 1.000.000)<br/>
                      TOP = Tempo pembayaran dalam hari (contoh: 30)<br/>
                      DUE = DUE dalam hari (contoh: 30)<br/>
                  </span>
                  <span className="text-xs text-yellow-500 mt-3 block">⚠️ Data lama akan otomatis dihapus saat upload data baru</span>
                </p>
                
                <label className="inline-block">
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleOutletFileUpload}
                    disabled={outletUploading}
                    className="hidden"
                  />
                  <span className={`inline-block px-6 py-3 rounded font-semibold cursor-pointer transition-colors ${
                    outletUploading
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}>
                    {outletUploading ? '⏳ Uploading...' : '📤 Pilih File CSV'}
                  </span>
                </label>
              </div>
            </div>

            {outletUploadError && (
              <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-4 text-sm">
                {outletUploadError}
              </div>
            )}

            {outletUploadSuccess && (
              <div className="bg-green-900 border border-green-700 text-green-200 px-4 py-3 rounded mb-4 text-sm">
                {outletUploadSuccess}
              </div>
            )}

            {/* Current Outlets Info */}
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
              <h3 className="text-lg font-semibold mb-4">Status Outlets Saat Ini</h3>
              <p className="text-gray-400">Total outlet: <span className="text-white font-bold">{outlets.length}</span></p>
              <p className="text-xs text-gray-500 mt-4">
                ℹ️ Setelah upload CSV, refresh halaman atau klik tab lain untuk melihat data outlet terbaru.
              </p>
            </div>
          </div>
        )}

        {/* Invoices Tab */}
        {tab === 'invoices' && (
          <div>
            <PageHeader
              title="Invoice Management"
              subtitle={`Total: ${invoices.length} invoice${invoiceSearchQuery ? ` (${filteredInvoices.length} hasil pencarian)` : ''}`}
            />

            {/* Invoice Status Filter Tabs */}
            <div className="flex gap-3 mb-6 border-b border-gray-800">
              <button
                onClick={() => {
                  setInvoiceFilter('pending');
                  setInvoiceSearchQuery('');
                }}
                className={`py-3 px-4 font-medium transition-colors border-b-2 ${
                  invoiceFilter === 'pending'
                    ? 'text-blue-400 border-blue-400'
                    : 'text-gray-400 border-transparent hover:text-gray-300'
                }`}
              >
                📋 Pending
              </button>
              <button
                onClick={() => {
                  setInvoiceFilter('released');
                  setInvoiceSearchQuery('');
                }}
                className={`py-3 px-4 font-medium transition-colors border-b-2 ${
                  invoiceFilter === 'released'
                    ? 'text-green-400 border-green-400'
                    : 'text-gray-400 border-transparent hover:text-gray-300'
                }`}
              >
                ✓ Released
              </button>
              <button
                onClick={() => {
                  setInvoiceFilter('rejected');
                  setInvoiceSearchQuery('');
                }}
                className={`py-3 px-4 font-medium transition-colors border-b-2 ${
                  invoiceFilter === 'rejected'
                    ? 'text-red-400 border-red-400'
                    : 'text-gray-400 border-transparent hover:text-gray-300'
                }`}
              >
                ✗ Rejected
              </button>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
              <input
                type="text"
                placeholder="🔍 Cari berdasarkan Invoice Number, Order ID, Nama Outlet, atau NIO..."
                value={invoiceSearchQuery}
                onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-gray-400">Loading...</div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-8 text-gray-400">Tidak ada data invoice</div>
            ) : filteredInvoices.length === 0 ? (
              <div className="text-center py-8 text-gray-400">Tidak ada invoice yang cocok dengan pencarian</div>
            ) : (
              <div className="space-y-4">
                {filteredInvoices.map((invoice) => {
                  // Use order created_at if available, otherwise use invoice created_at
                  const orderDate = String((invoice.orders as Record<string, unknown>)?.created_at || invoice.created_at || '');
                  const createdDate = new Date(orderDate);
                  const formattedDate = createdDate.toLocaleDateString('id-ID', { 
                    day: '2-digit', 
                    month: 'short', 
                    year: 'numeric' 
                  });
                  const formattedTime = createdDate.toLocaleTimeString('id-ID', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  });

                  return (
                  <div
                    key={String(invoice.id)}
                    onClick={() => openDetailModal(invoice)}
                    className="bg-gray-900 border border-gray-800 rounded-lg p-4 cursor-pointer hover:border-blue-600 transition-colors"
                  >
                    {/* Header Section */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-white">
                          {invoice.outlet?.name || invoice.outlet_id}
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">
                          Order: {invoice.order_id?.slice(0, 8).toUpperCase()} • {formattedDate} {formattedTime}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ml-2 ${
                          invoice.status === 'draft'
                            ? 'bg-gray-700 text-gray-200'
                            : invoice.status === 'posted'
                            ? 'bg-yellow-900 text-yellow-200'
                            : invoice.status === 'released'
                            ? 'bg-green-900 text-green-200'
                            : invoice.status === 'rejected'
                            ? 'bg-red-900 text-red-200'
                            : invoice.status === 'paid'
                            ? 'bg-blue-900 text-blue-200'
                            : 'bg-gray-700 text-gray-200'
                        }`}
                      >
                        {invoice.status === 'draft'
                          ? '📝 Draft'
                          : invoice.status === 'posted'
                          ? '⏳ Posting'
                          : invoice.status === 'released'
                          ? '✓ Released'
                          : invoice.status === 'rejected'
                          ? '✗ Rejected'
                          : invoice.status === 'paid'
                          ? '💰 Paid'
                          : 'Cancelled'}
                      </span>
                    </div>

                    {/* Amount Section */}
                    <div className="mb-3 pb-3 border-b border-gray-800">
                      <p className="text-white font-bold text-lg">
                        Rp {Number(invoice.amount || 0).toLocaleString('id-ID')}
                      </p>
                    </div>

                    {/* Status Badges - Compact */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {invoice.logistik_in_status && (
                        <span className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${
                          String(invoice.logistik_in_status) === 'terpacking'
                            ? 'bg-blue-900 text-blue-200'
                            : 'bg-gray-800 text-gray-300'
                        }`}>
                          {String(invoice.logistik_in_status) === 'terpacking' ? '📦 Packed' : '⏳ Packing'}
                        </span>
                      )}
                      
                      {invoice.faktur_status && (
                        <span className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${
                          String(invoice.faktur_status) === 'terfaktur'
                            ? 'bg-purple-900 text-purple-200'
                            : 'bg-gray-800 text-gray-300'
                        }`}>
                          {String(invoice.faktur_status) === 'terfaktur' ? '📄 Invoiced' : '⏳ Invoicing'}
                        </span>
                      )}
                      
                      {!!invoice.shipping_request && (
                        <ShippingBadge shippingRequest={String(invoice.shipping_request)} size="sm" />
                      )}

                      {invoice.shipment_status && (
                        <span className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${
                          String(invoice.shipment_status) === 'ready'
                            ? 'bg-amber-900 text-amber-200'
                            : String(invoice.shipment_status) === 'planned'
                            ? 'bg-orange-900 text-orange-200'
                            : String(invoice.shipment_status) === 'completed'
                            ? 'bg-green-900 text-green-200'
                            : 'bg-gray-800 text-gray-300'
                        }`}>
                          {String(invoice.shipment_status) === 'ready' 
                            ? '🚚 Ready' 
                            : String(invoice.shipment_status) === 'planned' 
                            ? '📋 Planned' 
                            : String(invoice.shipment_status) === 'completed' 
                            ? '✓ Shipped' 
                            : 'Pending'}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 text-sm text-gray-400 mb-3">
                      {invoice.packing_verified_at && (
                        <div>Waktu Terpacking: <span className="text-white">{new Date(invoice.packing_verified_at).toLocaleDateString('id-ID')} {new Date(invoice.packing_verified_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span></div>
                      )}
                      {invoice.faktur_verified_at && (
                        <div>Waktu Faktur: <span className="text-white">{new Date(invoice.faktur_verified_at).toLocaleDateString('id-ID')} {new Date(invoice.faktur_verified_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span></div>
                      )}
                      {invoice.delivery_date && (
                        <div>Waktu Terkirim: <span className="text-white">{new Date(invoice.delivery_date).toLocaleDateString('id-ID')} {new Date(invoice.delivery_date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span></div>
                      )}
                    </div>

                    {/* Action buttons - show only in pending filter */}
                    {invoiceFilter === 'pending' && (invoice.status !== 'paid' && invoice.status !== 'cancelled') && (
                      <div className="flex gap-2 pt-3 border-t border-gray-800">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadPDF(invoice);
                          }}
                          className="flex-1 font-medium py-1.5 px-3 rounded text-xs transition-colors text-white bg-red-600 hover:bg-red-700"
                        >
                          📥 Download
                        </button>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openDecisionModal(invoice, 'release');
                          }}
                          disabled={releaseLoading}
                          className={`flex-1 font-medium py-1.5 px-3 rounded text-xs transition-colors text-white ${
                            invoice.status === 'released'
                              ? 'bg-blue-600 hover:bg-blue-700'
                              : 'bg-green-600 hover:bg-green-700 disabled:bg-gray-600'
                          }`}
                        >
                          {releaseLoading && modalInvoice?.id === invoice.id && modalAction === 'release'
                            ? '...'
                            : '✓ Release'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openDecisionModal(invoice, 'reject');
                          }}
                          disabled={releaseLoading}
                          className={`flex-1 font-medium py-1.5 px-3 rounded text-xs transition-colors text-white ${
                            invoice.status === 'rejected'
                              ? 'bg-orange-600 hover:bg-orange-700'
                              : 'bg-red-600 hover:bg-red-700 disabled:bg-gray-600'
                          }`}
                        >
                          {releaseLoading && modalInvoice?.id === invoice.id && modalAction === 'reject'
                            ? '...'
                            : '✗ Reject'}
                        </button>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Master Data Barang Tab */}
        {tab === 'master-data-barang' && (
          <div>
            <PageHeader
              title="Master Data Barang"
              subtitle="Kelola data produk/barang"
            />

            {/* Import Data Barang Section */}
            <div className="bg-gray-900 border-2 border-dashed border-gray-700 rounded-lg p-8 mb-6">
              <div className="text-center">
                <p className="text-lg font-semibold mb-4">Upload Data Barang</p>
                <p className="text-sm text-gray-400 mb-6">
                  Format CSV: NB, GOL, PRO, POIN, Nama Barang, Komposisi, Principle, Sat, HJR, Stok<br/>
                  <span className="text-xs text-gray-500 mt-2 block">
                    NB = Nomor Barang (wajib unik)<br/>
                    GOL = Golongan Barang<br/>
                    PRO = Program<br/>
                    POIN = Bobot Poin<br/>
                    HJR = Harga Jual Ragasi (contoh: 50000 atau 50.000)<br/>
                    SAT = Satuan (contoh: PCS, BOX, dll)
                  </span>
                  <span className="text-xs text-yellow-500 mt-3 block">⚠️ Data lama akan otomatis dihapus saat upload data baru</span>
                </p>
                
                <label className="inline-block">
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleProductFileUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                  <span className={`inline-block px-6 py-3 rounded font-semibold cursor-pointer transition-colors ${
                    uploading
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}>
                    {uploading ? '⏳ Uploading...' : '📤 Pilih File CSV'}
                  </span>
                </label>
              </div>
            </div>

            {uploadError && (
              <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-4 text-sm">
                {uploadError}
              </div>
            )}

            {uploadSuccess && (
              <div className="bg-green-900 border border-green-700 text-green-200 px-4 py-3 rounded mb-4 text-sm">
                {uploadSuccess}
              </div>
            )}

            {/* Export Button */}
            <button
              onClick={() => exportProductsToCSV(stagingProducts as Parameters<typeof exportProductsToCSV>[0])}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors mb-6"
            >
              📥 Export ke CSV
            </button>

            {/* Current Data Barang Info */}
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Status Data Barang Saat Ini</h3>
              <p className="text-gray-400">Total produk: <span className="text-white font-bold">{stagingProducts.length}</span></p>
              <p className="text-xs text-gray-500 mt-4">
                ℹ️ Setelah upload CSV, refresh halaman atau klik tab lain untuk melihat data barang terbaru.
              </p>
            </div>

            {/* Search Bar */}
            <div className="flex gap-3 mb-6">
              <input
                type="text"
                placeholder="🔍 Cari berdasarkan NB, Nama Barang, atau Golongan..."
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setProductPage(1);
                }}
                className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              {productSearch && (
                <button
                  onClick={() => {
                    setProductSearch('');
                    setProductPage(1);
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  ✕ Clear
                </button>
              )}
            </div>

            {/* Products Table */}
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Daftar Data Barang</h3>
                <div className="text-sm text-gray-400">
                  {paginatedProducts.length > 0 ? `${startIdx + 1}-${Math.min(startIdx + ITEMS_PER_PAGE, filteredProducts.length)}` : '0'} dari {filteredProducts.length} barang {productSearch ? '(hasil pencarian)' : ''}
                </div>
              </div>
              {loadingProducts ? (
                <div className="text-center text-gray-400 py-8">Loading products...</div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  {stagingProducts.length === 0 ? 'Belum ada data barang. Silakan upload file CSV di atas.' : 'Tidak ada barang yang sesuai dengan pencarian Anda.'}
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto mb-6">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-700 bg-gray-800">
                          <th className="px-4 py-3 text-left text-gray-300">NB</th>
                          <th className="px-4 py-3 text-left text-gray-300">GOL</th>
                          <th className="px-4 py-3 text-left text-gray-300">PRO</th>
                          <th className="px-4 py-3 text-left text-gray-300">POIN</th>
                          <th className="px-4 py-3 text-left text-gray-300">Nama Barang</th>
                          <th className="px-4 py-3 text-left text-gray-300">Komposisi</th>
                          <th className="px-4 py-3 text-left text-gray-300">Principle</th>
                          <th className="px-4 py-3 text-left text-gray-300">Sat</th>
                          <th className="px-4 py-3 text-right text-gray-300">HJR</th>
                          <th className="px-4 py-3 text-center text-gray-300">Stok</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedProducts.map((product, idx) => (
                        <tr key={idx} className="border-b border-gray-700 hover:bg-gray-800 transition">
                          <td className="px-4 py-3 text-white font-semibold">{String(product.nomor_barang || '')}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{String(product.golongan_barang || '-')}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{String(product.program || '-')}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{String(product.bobot_poin || '-')}</td>
                          <td className="px-4 py-3 text-white">{String(product.nama_barang || '')}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{String(product.komposisi || '-')}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{String(product.principle || '-')}</td>
                          <td className="px-4 py-3 text-gray-400">{String(product.satuan || '-')}</td>
                          <td className="px-4 py-3 text-right font-semibold">
                            {product.harga_jual_ragasi ? `Rp ${Number(product.harga_jual_ragasi).toLocaleString('id-ID')}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-center">{Number(product.stok || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-6 pb-4">
                    <button
                      onClick={() => setProductPage(p => Math.max(p - 1, 1))}
                      disabled={productPage === 1}
                      className="px-3 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ← Previous
                    </button>
                    
                    <div className="flex gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                        <button
                          key={pageNum}
                          onClick={() => setProductPage(pageNum)}
                          className={`px-3 py-2 rounded ${
                            productPage === pageNum
                              ? 'bg-blue-500 text-white font-bold'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {pageNum}
                        </button>
                      ))}
                    </div>
                    
                    <button
                      onClick={() => setProductPage(p => Math.min(p + 1, totalPages))}
                      disabled={productPage === totalPages}
                      className="px-3 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next →
                    </button>
                  </div>
                )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Daftar Karyawan Tab */}
        {tab === 'daftar-karyawan' && (
          <div>
            <PageHeader
              title="Daftar Karyawan"
              subtitle={`Total: ${employees.length} karyawan${employeeSearch ? ` (${filteredEmployees.length} hasil pencarian)` : ''}`}
            />

            {/* Add Employee Button */}
            <div className="mb-6">
              <button
                onClick={() => openEmployeeModal()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
              >
                ➕ Tambah Karyawan
              </button>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
              {filteredEmployees.length > 0 && (
                <input
                  type="text"
                  placeholder="🔍 Cari berdasarkan NIP, Nama, Grade, atau Jabatan..."
                  value={employeeSearch}
                  onChange={(e) => {
                    setEmployeeSearch(e.target.value);
                    setEmployeePage(1);
                  }}
                  className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
                />
              )}
              {employeeSearch && (
                <button
                  onClick={() => {
                    setEmployeeSearch('');
                    setEmployeePage(1);
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors mt-2"
                >
                  ✕ Clear
                </button>
              )}
            </div>

            {/* Employees Table */}
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Daftar Karyawan</h3>
                <div className="text-sm text-gray-400">
                  {paginatedEmployees.length > 0 ? `${employeeStartIdx + 1}-${Math.min(employeeStartIdx + EMPLOYEE_ITEMS_PER_PAGE, filteredEmployees.length)}` : '0'} dari {filteredEmployees.length} karyawan {employeeSearch ? '(hasil pencarian)' : ''}
                </div>
              </div>
              {loadingEmployees ? (
                <div className="text-center text-gray-400 py-8">Loading employees...</div>
              ) : filteredEmployees.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  {employees.length === 0 ? 'Belum ada data karyawan. Klik tombol "Tambah Karyawan" di atas untuk menambahkan.' : 'Tidak ada karyawan yang sesuai dengan pencarian Anda.'}
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto mb-6">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-700 bg-gray-800">
                          <th className="px-4 py-3 text-left text-gray-300">NIP</th>
                          <th className="px-4 py-3 text-left text-gray-300">Nama Karyawan</th>
                          <th className="px-4 py-3 text-left text-gray-300">Grade</th>
                          <th className="px-4 py-3 text-left text-gray-300">Jabatan</th>
                          <th className="px-4 py-3 text-center text-gray-300">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedEmployees.map((emp) => (
                        <tr key={emp.id} className="border-b border-gray-700 hover:bg-gray-800 transition">
                          <td className="px-4 py-3 text-white font-semibold">{emp.nip}</td>
                          <td className="px-4 py-3 text-white">{emp.nama_karyawan}</td>
                          <td className="px-4 py-3 text-gray-400">{emp.grade || '-'}</td>
                          <td className="px-4 py-3 text-gray-400">{emp.jabatan || '-'}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={() => openEmployeeModal(emp)}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                              >
                                ✏️ Edit
                              </button>
                              {deleteConfirmId === emp.id ? (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleDeleteEmployee(emp.id)}
                                    disabled={deletingId === emp.id}
                                    className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors disabled:opacity-50"
                                  >
                                    Yakin?
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded transition-colors"
                                  >
                                    Batal
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirmId(emp.id)}
                                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                                >
                                  🗑️ Hapus
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  {employeeTotalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-6 pb-4">
                      <button
                        onClick={() => setEmployeePage(p => Math.max(p - 1, 1))}
                        disabled={employeePage === 1}
                        className="px-3 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ← Previous
                      </button>
                      
                      <div className="flex gap-1">
                        {Array.from({ length: employeeTotalPages }, (_, i) => i + 1).map(pageNum => (
                          <button
                            key={pageNum}
                            onClick={() => setEmployeePage(pageNum)}
                            className={`px-3 py-2 rounded ${
                              employeePage === pageNum
                                ? 'bg-blue-500 text-white font-bold'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {pageNum}
                          </button>
                        ))}
                      </div>
                      
                      <button
                        onClick={() => setEmployeePage(p => Math.min(p + 1, employeeTotalPages))}
                        disabled={employeePage === employeeTotalPages}
                        className="px-3 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Employee Modal */}
        {showEmployeeModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 w-full max-w-md">
              <h2 className="text-xl font-bold mb-6 text-white">
                {editingEmployee ? 'Edit Karyawan' : 'Tambah Karyawan Baru'}
              </h2>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">NIP *</label>
                  <input
                    type="text"
                    value={employeeFormData.nip}
                    onChange={(e) => setEmployeeFormData({...employeeFormData, nip: e.target.value})}
                    disabled={editingEmployee !== null}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-blue-500 focus:outline-none disabled:opacity-50"
                    placeholder="Masukkan NIP"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Nama Karyawan *</label>
                  <input
                    type="text"
                    value={employeeFormData.nama_karyawan}
                    onChange={(e) => setEmployeeFormData({...employeeFormData, nama_karyawan: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-blue-500 focus:outline-none"
                    placeholder="Masukkan nama karyawan"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Grade</label>
                  <input
                    type="text"
                    value={employeeFormData.grade}
                    onChange={(e) => setEmployeeFormData({...employeeFormData, grade: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-blue-500 focus:outline-none"
                    placeholder="Contoh: Grade A, Level 3"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Jabatan</label>
                  <input
                    type="text"
                    value={employeeFormData.jabatan}
                    onChange={(e) => setEmployeeFormData({...employeeFormData, jabatan: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-blue-500 focus:outline-none"
                    placeholder="Contoh: Manager, Staff"
                  />
                </div>
              </div>

              {employeeFormError && (
                <div className="p-3 bg-red-900/20 border border-red-700 rounded text-red-400 mb-4">{employeeFormError}</div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleSaveEmployee}
                  disabled={employeeFormLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  {employeeFormLoading ? 'Menyimpan...' : 'Simpan'}
                </button>
                <button
                  onClick={closeEmployeeModal}
                  disabled={employeeFormLoading}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Decision Modal */}
      {showDecisionModal && modalInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 w-full max-w-md">
            <h2 className="text-xl font-bold mb-2 text-white">
              {modalAction === 'release' 
                ? (modalInvoice.status === 'released' ? 'Edit Catatan Release' : 'Release Invoice')
                : (modalInvoice.status === 'rejected' ? 'Edit Catatan Penolakan' : 'Reject Invoice')
              }
            </h2>
            <p className="text-gray-400 mb-4 text-sm">
              Order ID: {modalInvoice.order_id?.slice(0, 8).toUpperCase()} - {modalInvoice.outlet?.name || modalInvoice.outlet_id}
            </p>

            {/* Status info */}
            <div className="mb-6 p-4 bg-gray-800 rounded border border-gray-700">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-gray-400 text-xs mb-1">Status Sebelumnya:</p>
                  <p className="text-white font-semibold">
                    {modalInvoice.status === 'draft'
                      ? 'Draft'
                      : modalInvoice.status === 'posted'
                      ? 'Posted'
                      : modalInvoice.status === 'released'
                      ? 'Released'
                      : modalInvoice.status === 'rejected'
                      ? 'Rejected'
                      : 'Unknown'}
                  </p>
                </div>
              </div>
              <p className="text-gray-400 text-xs mb-1">Amount:</p>
              <p className="text-white font-semibold text-lg">
                Rp {modalInvoice.amount?.toLocaleString('id-ID') || 0}
              </p>
            </div>

            {/* Notes field - is optional for release, required for reject */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-white mb-2">
                {modalAction === 'reject' 
                  ? 'Alasan Penolakan *' 
                  : 'Catatan - Untuk Fakturis & Admin Gudang'}
              </label>
              <textarea
                value={modalNotes}
                onChange={(e) => setModalNotes(e.target.value)}
                placeholder={
                  modalAction === 'reject'
                    ? 'Jelaskan alasan penolakan invoice ini...'
                    : 'Tambahkan catatan/instruksi untuk fakturis dan admin gudang...'
                }
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-600 resize-none"
                rows={4}
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={closeDecisionModal}
                disabled={releaseLoading}
                className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (modalInvoice?.id) {
                    if (modalAction === 'release') {
                      handleReleaseInvoice(modalInvoice.id);
                    } else {
                      handleRejectInvoice(modalInvoice.id);
                    }
                  }
                }}
                disabled={releaseLoading || (modalAction === 'reject' && !modalNotes.trim())}
                className={`flex-1 font-medium py-2 px-4 rounded-lg transition-colors text-white ${
                  modalAction === 'release'
                    ? 'bg-green-600 hover:bg-green-700 disabled:bg-gray-600'
                    : 'bg-red-600 hover:bg-red-700 disabled:bg-gray-600'
                }`}
              >
                {releaseLoading
                  ? 'Processing...'
                  : modalAction === 'release'
                  ? (modalInvoice.status === 'released' ? 'Simpan Catatan' : 'Release Invoice')
                  : (modalInvoice.status === 'rejected' ? 'Simpan Catatan' : 'Reject Invoice')}
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-4 text-center">
              * Catatan akan dikirim ke Fakturis dan Admin Gudang
              {modalAction === 'reject' && <span className="block mt-1">Alasan penolakan WAJIB diisi</span>}
            </p>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && detailInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {detailInvoice.outlet?.name || detailInvoice.outlet_id}
                </h2>
                <p className="text-gray-400 text-sm mt-2">
                  Invoice: {detailInvoice.invoice_number} • Order: {detailInvoice.order_id?.slice(0, 8).toUpperCase()}
                </p>
              </div>
              <button
                onClick={closeDetailModal}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Amount */}
            <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-700">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Total Amount</p>
                  <p className="text-white font-bold text-2xl">
                    Rp {detailInvoice.amount?.toLocaleString('id-ID') || 0}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-sm mb-1">Status</p>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    detailInvoice.status === 'draft'
                      ? 'bg-gray-700 text-gray-200'
                      : detailInvoice.status === 'posted'
                      ? 'bg-yellow-900 text-yellow-200'
                      : detailInvoice.status === 'released'
                      ? 'bg-green-900 text-green-200'
                      : detailInvoice.status === 'rejected'
                      ? 'bg-red-900 text-red-200'
                      : 'bg-gray-700 text-gray-200'
                  }`}>
                    {detailInvoice.status === 'draft' ? '📝 Draft' : 
                     detailInvoice.status === 'posted' ? '⏳ Posting' : 
                     detailInvoice.status === 'released' ? '✓ Released' : 
                     detailInvoice.status === 'rejected' ? '✗ Rejected' : 'Unknown'}
                  </span>
                </div>
              </div>
            </div>

            {/* Status Badges */}
            <div className="mb-6">
              <h3 className="text-white font-semibold mb-3">Status Proses</h3>
              <div className="flex flex-wrap gap-2">
                {!!detailInvoice.logistik_in_status && (
                  <span className={`px-3 py-2 rounded text-sm font-semibold ${
                    detailInvoice.logistik_in_status === 'terpacking'
                      ? 'bg-blue-900 text-blue-200'
                      : 'bg-gray-800 text-gray-300'
                  }`}>
                    {detailInvoice.logistik_in_status === 'terpacking' ? '✓ Packed' : '⏳ Packing'}
                  </span>
                )}
                {!!detailInvoice.faktur_status && (
                  <span className={`px-3 py-2 rounded text-sm font-semibold ${
                    detailInvoice.faktur_status === 'terfaktur'
                      ? 'bg-purple-900 text-purple-200'
                      : 'bg-gray-800 text-gray-300'
                  }`}>
                    {detailInvoice.faktur_status === 'terfaktur' ? '✓ Invoiced' : '⏳ Invoicing'}
                  </span>
                )}
                {!!detailInvoice.shipment_status && (
                  <span className={`px-3 py-2 rounded text-sm font-semibold ${
                    detailInvoice.shipment_status === 'ready'
                      ? 'bg-amber-900 text-amber-200'
                      : detailInvoice.shipment_status === 'planned'
                      ? 'bg-orange-900 text-orange-200'
                      : detailInvoice.shipment_status === 'completed'
                      ? 'bg-green-900 text-green-200'
                      : 'bg-gray-800 text-gray-300'
                  }`}>
                    {detailInvoice.shipment_status === 'ready' ? '🚚 Ready' :
                     detailInvoice.shipment_status === 'planned' ? '📋 Planned' :
                     detailInvoice.shipment_status === 'completed' ? '✓ Shipped' : 'Pending'}
                  </span>
                )}
              </div>
            </div>

            {/* Notes Section */}
            <div className="space-y-4">
              {!!detailInvoice.keuangan_notes && (
                <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                  <h4 className="text-blue-400 font-semibold mb-2">💰 Catatan Admin Keuangan</h4>
                  <p className="text-blue-200 text-sm">{String(detailInvoice.keuangan_notes)}</p>
                </div>
              )}

              {!!detailInvoice.packing_officer_name && (
                <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                  <h4 className="text-blue-400 font-semibold mb-2">📦 Catatan Packing (Gudang)</h4>
                  <div className="space-y-1 text-blue-200 text-sm">
                    <p><span className="text-blue-300">Petugas:</span> {String(detailInvoice.packing_officer_name)}</p>
                    {!!detailInvoice.packing_verified_at && (
                      <p><span className="text-blue-300">Waktu Terpacking:</span> {new Date(String(detailInvoice.packing_verified_at)).toLocaleDateString('id-ID')} {new Date(String(detailInvoice.packing_verified_at)).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                    )}
                    {!!detailInvoice.packing_notes && (
                      <p><span className="text-blue-300">Catatan:</span> {String(detailInvoice.packing_notes)}</p>
                    )}
                  </div>
                </div>
              )}

              {!!detailInvoice.faktur_officer_name && (
                <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-4">
                  <h4 className="text-purple-400 font-semibold mb-2">📄 Catatan Fakturis</h4>
                  <div className="space-y-1 text-purple-200 text-sm">
                    <p><span className="text-purple-300">Petugas:</span> {String(detailInvoice.faktur_officer_name)}</p>
                    {detailInvoice.faktur_verified_at && (
                      <p><span className="text-purple-300">Waktu Faktur:</span> {new Date(String(detailInvoice.faktur_verified_at)).toLocaleDateString('id-ID')} {new Date(String(detailInvoice.faktur_verified_at)).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                    )}
                    {!!detailInvoice.faktur_notes && (
                      <p><span className="text-purple-300">Catatan:</span> {String(detailInvoice.faktur_notes)}</p>
                    )}
                  </div>
                </div>
              )}

              {!!detailInvoice.faktur_officer_name && (
                <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-4">
                  <h4 className="text-purple-400 font-semibold mb-2">📄 Catatan Fakturis</h4>
                  <div className="space-y-1 text-purple-200 text-sm">
                    <p><span className="text-purple-300">Petugas:</span> {String(detailInvoice.faktur_officer_name)}</p>
                    {!!detailInvoice.faktur_verified_at && (
                      <p><span className="text-purple-300">Waktu Faktur:</span> {new Date(String(detailInvoice.faktur_verified_at)).toLocaleDateString('id-ID')} {new Date(String(detailInvoice.faktur_verified_at)).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                    )}
                    {!!detailInvoice.faktur_notes && (
                      <p><span className="text-purple-300">Catatan:</span> {String(detailInvoice.faktur_notes)}</p>
                    )}
                  </div>
                </div>
              )}

              {!!detailInvoice.expedisi_officer_name && (
                <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-4">
                  <h4 className="text-amber-400 font-semibold mb-2">🚚 Catatan Expedisi</h4>
                  <div className="space-y-1 text-amber-200 text-sm">
                    <p><span className="text-amber-300">Petugas:</span> {String(detailInvoice.expedisi_officer_name)}</p>
                    {!!detailInvoice.shipment_plan && (
                      <p><span className="text-amber-300">Rencana Kirim:</span> {String(detailInvoice.shipment_plan)}</p>
                    )}
                    {!!detailInvoice.shipment_date && (
                      <p><span className="text-amber-300">Tanggal Kirim:</span> {new Date(String(detailInvoice.shipment_date)).toLocaleDateString('id-ID')}</p>
                    )}
                    {!!detailInvoice.delivery_notes && (
                      <p><span className="text-amber-300">Catatan Pengiriman:</span> {String(detailInvoice.delivery_notes)}</p>
                    )}
                    {!!detailInvoice.delivery_date && (
                      <p><span className="text-amber-300">Tanggal Terkirim:</span> {new Date(String(detailInvoice.delivery_date)).toLocaleDateString('id-ID')}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={closeDetailModal}
              className="w-full mt-6 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

