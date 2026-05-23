'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { logOut } from '@/lib/auth';
import { getInvoicesByMarketing, updateInvoice, getPendingInvoicesByMarketing } from '@/lib/orders';
import { getOutlets } from '@/lib/export';
import type { ExportRow } from '@/lib/export';
import { useAuth, useRoleCheck } from '@/lib/hooks';
import { LoadingSpinner, PageHeader } from '@/app/components/UIComponents';
import ShippingBadge from '@/app/components/ShippingBadge';
import { getFakturImages, FakturImage } from '@/lib/faktur-images';
import { createDiscountRequest, getDiscountRequests, type DiscountRequest } from '@/lib/discount-requests';

type MarketingInvoice = {
  id: string;
  amount?: number;
  notes?: string;
  outlet?: { name?: string; NIO?: string };
  invoice_number?: string;
  order_created_at?: string;
  created_at?: string;
  status?: string;
  logistik_in_status?: string;
  packing_officer_name?: string;
  packing_notes?: string;
  faktur_status?: string;
  faktur_officer_name?: string;
  faktur_notes?: string;
  keuangan_notes?: string;
  outlet_id?: string;
  order_id?: string;
  shipping_request?: string;
  shipment_status?: string;
  packing_verified_at?: string;
  faktur_verified_at?: string;
  expedisi_officer_name?: string;
  shipment_plan?: string;
  shipment_date?: string;
  delivery_notes?: string;
  delivery_date?: string;
};

type Product = {
  id: string;
  nama_barang: string;
  harga_jual_ragasi?: number;
  stok?: number;
  golongan_barang?: string;
  komposisi?: string;
};

export default function MarketingDashboard() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { hasAccess } = useRoleCheck(['marketing', 'super_admin']);

  const [tab, setTab] = useState<'sales' | 'invoices' | 'pengajuan-diskon' | 'pengajuan-limit' | 'data-outlet' | 'historis-pengambilan'>('sales');
  const [pendingInvoices, setPendingInvoices] = useState<MarketingInvoice[]>([]);
  const [invoices, setInvoices] = useState<MarketingInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Search state
  const [searchSalesOrder, setSearchSalesOrder] = useState('');
  const [searchInvoices, setSearchInvoices] = useState('');
  
  // Edit invoice modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<MarketingInvoice | null>(null);
  const [editAmount, setEditAmount] = useState(0);
  const [editNotes, setEditNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Detail modal state for released invoices
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailInvoice, setDetailInvoice] = useState<MarketingInvoice | null>(null);

  // Faktur images modal state
  const [showFakturPhotosModal, setShowFakturPhotosModal] = useState(false);
  const [fakturPhotos, setFakturPhotos] = useState<FakturImage[]>([]);
  const [loadingFakturPhotos, setLoadingFakturPhotos] = useState(false);

  // Date filter state for invoices
  const [dateFilter, setDateFilter] = useState<'today' | '1week' | '1month' | '1q' | 'all'>('all');

  // New Features - Modal states
  const [showDiscountRequestModal, setShowDiscountRequestModal] = useState(false);
  const [showLimitRequestModal, setShowLimitRequestModal] = useState(false);
  const [showOutletDataModal, setShowOutletDataModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // New Features - Form states
  const [discountReason, setDiscountReason] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState('');
  const [limitAmount, setLimitAmount] = useState('');
  const [limitReason, setLimitReason] = useState('');

  // Data Outlet states
  const [outlets, setOutlets] = useState<ExportRow[]>([]);
  const [outletSearchQuery, setOutletSearchQuery] = useState('');
  const [loadingOutlets, setLoadingOutlets] = useState(false);

  // Pengajuan Diskon - Dropdown states
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedOutletDiscount, setSelectedOutletDiscount] = useState<string>('');
  const [selectedProductDiscount, setSelectedProductDiscount] = useState<string>('');
  const [outletSearchDiscount, setOutletSearchDiscount] = useState('');
  const [productSearchDiscount, setProductSearchDiscount] = useState('');
  const [showOutletDropdown, setShowOutletDropdown] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [startDateDiscount, setStartDateDiscount] = useState('');
  const [endDateDiscount, setEndDateDiscount] = useState('');
  const [submittingDiscount, setSubmittingDiscount] = useState(false);

  // Pengajuan Diskon - List states
  const [discountRequests, setDiscountRequests] = useState<DiscountRequest[]>([]);
  const [loadingDiscountRequests, setLoadingDiscountRequests] = useState(false);

  // Helper function to get date range based on filter
  const getDateRange = (filter: 'today' | '1week' | '1month' | '1q' | 'all'): { start: Date; end: Date } => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (filter) {
      case 'today':
        return { start: today, end: now };
      case '1week':
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return { start: sevenDaysAgo, end: now };
      case '1month':
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return { start: thirtyDaysAgo, end: now };
      case '1q':
        const ninetyDaysAgo = new Date(today);
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        return { start: ninetyDaysAgo, end: now };
      default:
        return { start: new Date(2020, 0, 1), end: now };
    }
  };

  // Filter invoices based on date filter
  const getFilteredInvoices = (invoiceList: MarketingInvoice[], searchTerm: string): MarketingInvoice[] => {
    const { start, end } = getDateRange(dateFilter);
    
    return invoiceList.filter((invoice) => {
      // Date filter
      const invoiceDate = new Date(invoice.created_at || invoice.order_created_at || Date.now());
      const isInDateRange = invoiceDate >= start && invoiceDate <= end;
      
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const outletName = invoice.outlet?.name?.toLowerCase() || '';
      const orderId = invoice.order_id?.toLowerCase() || '';
      const matchesSearch = outletName.includes(searchLower) || orderId.includes(searchLower);
      
      return isInDateRange && matchesSearch;
    });
  };

  // Calculate total amount from filtered invoices
  const calculateTotalAmount = (invoiceList: MarketingInvoice[], searchTerm: string): number => {
    return getFilteredInvoices(invoiceList, searchTerm).reduce((sum, invoice) => sum + (invoice.amount || 0), 0);
  };

  const fetchOrders = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      if (tab === 'sales') {
        // Fetch pending invoices (draft/posted - not yet released by finance)
        const result = await getPendingInvoicesByMarketing(user.id);

        if (result.error) {
          console.error(result.error);
        } else {
          setPendingInvoices(result.data || []);
        }
      } else {
        // Fetch released/rejected/paid invoices
        const result = await getInvoicesByMarketing(user.id);

        if (result.error) {
          console.error(result.error);
        } else {
          setInvoices(result.data || []);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [tab, user]);

  const fetchOutletData = useCallback(async () => {
    setLoadingOutlets(true);
    try {
      const result = await getOutlets();
      if (result.error) {
        console.error('Error fetching outlets:', result.error);
        setOutlets([]);
      } else {
        setOutlets(result.data || []);
      }
    } finally {
      setLoadingOutlets(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      let allProducts: Product[] = [];
      let from = 0;
      const batchSize = 1000;
      let done = false;

      while (!done) {
        const { data, error } = await supabase
          .from('products')
          .select('id, nama_barang, harga_jual_ragasi, stok, golongan_barang, komposisi')
          .order('nama_barang', { ascending: true })
          .range(from, from + batchSize - 1);

        if (error) {
          console.error('Error fetching products:', error);
          done = true;
        } else if (data && data.length > 0) {
          allProducts = [...allProducts, ...(data as Product[])];
          from += batchSize;
        } else {
          done = true;
        }
      }

      setProducts(allProducts);
    } catch (error) {
      console.error('Error in fetchProducts:', error);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const fetchDiscountRequests = useCallback(async () => {
    setLoadingDiscountRequests(true);
    try {
      const result = await getDiscountRequests();
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

  useEffect(() => {
    if (loading || !hasAccess || !user) return;
    
    // Fetch outlets ketika tab adalah data-outlet
    if (tab === 'data-outlet') {
      fetchOutletData();
    } else if (tab === 'pengajuan-diskon') {
      fetchDiscountRequests();
    } else {
      fetchOrders();
    }

    // Fetch products ketika discount modal dibuka
    if (showDiscountRequestModal && products.length === 0) {
      fetchProducts();
    }

    // Fetch outlets ketika discount modal dibuka (jika belum ada)
    if (showDiscountRequestModal && outlets.length === 0) {
      fetchOutletData();
    }
  }, [loading, hasAccess, user, tab, showDiscountRequestModal]);

  // Show loading while auth is checking
  if (loading) {
    return <LoadingSpinner />;
  }

  // Show access denied if user is authenticated but doesn't have access
  if (!hasAccess || !user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4 text-red-500">🔒 Access Denied</h1>
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

  const handleLogout = async () => {
    await logOut();
    router.push('/');
  };

  const openEditModal = (invoice: MarketingInvoice) => {
    setEditingInvoice(invoice);
    setEditAmount(invoice.amount || 0);
    setEditNotes(invoice.notes || '');
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingInvoice(null);
    setEditAmount(0);
    setEditNotes('');
  };

  const openDetailModal = (invoice: MarketingInvoice) => {
    setDetailInvoice(invoice);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setDetailInvoice(null);
  };

  const openFakturPhotosModal = async (invoiceId: string) => {
    setShowFakturPhotosModal(true);
    setLoadingFakturPhotos(true);
    try {
      const result = await getFakturImages(invoiceId);
      if (result.error) {
        console.error('Error fetching faktur images:', result.error);
        setFakturPhotos([]);
      } else {
        setFakturPhotos(result.data || []);
      }
    } finally {
      setLoadingFakturPhotos(false);
    }
  };

  const closeFakturPhotosModal = () => {
    setShowFakturPhotosModal(false);
    setFakturPhotos([]);
  };

  const handleSaveInvoice = async () => {
    if (!editingInvoice || !editAmount) {
      alert('Amount harus diisi');
      return;
    }

    setIsSaving(true);
    try {
      const result = await updateInvoice(editingInvoice.id, {
        amount: editAmount,
        notes: editNotes,
      });

      if (result.error) {
        alert('Gagal update invoice: ' + result.error);
      } else {
        alert('Invoice berhasil diupdate!');
        closeEditModal();
        fetchOrders(); // Refresh data
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPDF = (invoice: MarketingInvoice) => {
    // Generate invoice content with proper formatting
    const orderDate = new Date(invoice.order_created_at || invoice.created_at || Date.now());
    const formattedDate = orderDate.toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    const formattedTime = orderDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const pdfContent = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    INVOICE DETAILS
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

JUMLAH        : Rp ${invoice.amount?.toLocaleString('id-ID') || 0}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CATATAN KEUANGAN:
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

  const handleShareWhatsApp = (invoice: MarketingInvoice) => {
    const message = `
Halo, berikut adalah detail invoice:

Invoice #${invoice.invoice_number}
Outlet: ${invoice.outlet?.name || invoice.outlet_id}
NIO: ${invoice.outlet?.NIO || '-'}
Jumlah: Rp ${invoice.amount?.toLocaleString('id-ID') || 0}
Status: ${invoice.status}

Terima kasih!
    `.trim();

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleSubmitDiscountRequest = async () => {
    // Validation
    if (!selectedOutletDiscount) {
      alert('Pilih outlet terlebih dahulu');
      return;
    }
    if (!selectedProductDiscount) {
      alert('Pilih barang terlebih dahulu');
      return;
    }
    if (!discountPercentage || parseFloat(discountPercentage) <= 0) {
      alert('Persentase diskon harus lebih dari 0');
      return;
    }
    if (!discountReason.trim()) {
      alert('Alasan diskon harus diisi');
      return;
    }
    if (!startDateDiscount || !endDateDiscount) {
      alert('Periode berlaku harus diisi');
      return;
    }
    if (new Date(startDateDiscount) >= new Date(endDateDiscount)) {
      alert('Tanggal mulai harus sebelum tanggal akhir');
      return;
    }

    setSubmittingDiscount(true);
    try {
      const result = await createDiscountRequest(
        selectedOutletDiscount,
        selectedProductDiscount,
        parseFloat(discountPercentage),
        discountReason,
        startDateDiscount,
        endDateDiscount
      );

      if (result.error) {
        alert(`Gagal mengajukan diskon: ${result.error}`);
      } else {
        alert('Pengajuan diskon berhasil dibuat! Menunggu persetujuan admin.');
        // Reset form
        setShowDiscountRequestModal(false);
        setSelectedOutletDiscount('');
        setSelectedProductDiscount('');
        setOutletSearchDiscount('');
        setProductSearchDiscount('');
        setDiscountPercentage('');
        setDiscountReason('');
        setStartDateDiscount('');
        setEndDateDiscount('');
        // Refresh the discount requests list
        fetchDiscountRequests();
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSubmittingDiscount(false);
    }
  };

  if (loading || !hasAccess) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Marketing Dashboard</h1>
            <p className="text-gray-400 text-sm">Sales & Invoice Management</p>
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-8 flex-wrap">
          <button
            onClick={() => setTab('sales')}
            className={`py-2 px-4 rounded-lg font-medium transition-colors ${
              tab === 'sales'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Sales Orders (Pending)
          </button>
          <button
            onClick={() => setTab('invoices')}
            className={`py-2 px-4 rounded-lg font-medium transition-colors ${
              tab === 'invoices'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Invoices (Released)
          </button>
          <button
            onClick={() => setTab('pengajuan-diskon')}
            className={`py-2 px-4 rounded-lg font-medium transition-colors ${
              tab === 'pengajuan-diskon'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            💰 Pengajuan Diskon
          </button>
          <button
            onClick={() => setTab('pengajuan-limit')}
            className={`py-2 px-4 rounded-lg font-medium transition-colors ${
              tab === 'pengajuan-limit'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            📊 Pengajuan Limit
          </button>
          <button
            onClick={() => setTab('data-outlet')}
            className={`py-2 px-4 rounded-lg font-medium transition-colors ${
              tab === 'data-outlet'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            🏪 Data Outlet
          </button>
          <button
            onClick={() => setTab('historis-pengambilan')}
            className={`py-2 px-4 rounded-lg font-medium transition-colors ${
              tab === 'historis-pengambilan'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            📈 Historis Pengambilan
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-8 flex-wrap">
          <button
            onClick={() => router.push('/sales')}
            className="py-2 px-4 rounded-lg font-medium bg-green-600 hover:bg-green-700 text-white transition-colors"
          >
            + Buat Sales Order Baru
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="py-2 px-4 rounded-lg font-medium bg-gray-700 hover:bg-gray-600 text-white transition-colors"
          >
            ← Kembali ke Dashboard
          </button>
        </div>

        {/* Sales Orders Tab (Pending Invoices) */}
        {tab === 'sales' && (
          <div>
            <PageHeader
              title="Sales Orders - Pending Review"
              subtitle={`Total: ${pendingInvoices.length} invoice pending`}
            />

            {/* Search Input */}
            <div className="mb-6">
              <input
                type="text"
                placeholder="Cari berdasarkan nama outlet atau order ID..."
                value={searchSalesOrder}
                onChange={(e) => setSearchSalesOrder(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-gray-400">Loading...</div>
            ) : pendingInvoices.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                Semua invoice sudah di-review oleh finance. Klik tombol Buat Sales Order Baru untuk membuat order baru.
              </div>
            ) : (
              <div className="space-y-4">
                {pendingInvoices
                  .filter((invoice) => {
                    const searchLower = searchSalesOrder.toLowerCase();
                    const outletName = invoice.outlet?.name?.toLowerCase() || '';
                    const orderId = invoice.order_id?.toLowerCase() || '';
                    return outletName.includes(searchLower) || orderId.includes(searchLower);
                  })
                  .map((invoice) => {
                  const orderDate = new Date(invoice.order_created_at || invoice.created_at || Date.now());
                  const formattedDate = new Date().toLocaleDateString('id-ID', { 
                    day: '2-digit', 
                    month: 'short', 
                    year: 'numeric' 
                  });
                  const formattedTime = orderDate.toLocaleTimeString('id-ID', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  });

                  return (
                  <div
                    key={invoice.id}
                    className="bg-gray-900 border border-gray-800 rounded-lg p-4 cursor-pointer hover:border-blue-600 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-white">
                          {invoice.outlet?.name || invoice.outlet_id}
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">
                          {formattedDate} {formattedTime} • Order ID: {invoice.order_id?.slice(0, 8).toUpperCase()}
                          {invoice.outlet?.NIO && ` • NIO: ${invoice.outlet.NIO}`}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${
                          invoice.status === 'draft'
                            ? 'bg-purple-900 text-purple-200'
                            : 'bg-yellow-900 text-yellow-200'
                        }`}
                      >
                        {invoice.status === 'draft' ? 'Draft' : 'Posted'}
                      </span>
                    </div>

                    <div className="mb-3 pb-3 border-b border-gray-800 text-sm grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-400">Amount</p>
                        <p className="text-white font-semibold">
                          Rp {invoice.amount?.toLocaleString('id-ID') || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Created</p>
                        <p className="text-white">
                          {new Date(invoice.created_at || Date.now()).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                    </div>

                    {/* Show notes if exists */}
                    {invoice.notes && (
                      <div className="mb-4 p-3 bg-gray-800 rounded border border-gray-700">
                        <p className="text-xs text-gray-400 mb-1">Catatan:</p>
                        <p className="text-sm text-gray-300">{invoice.notes}</p>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-3 flex-wrap">
                      {/* Edit button - only for draft/posted invoices */}
                      {(invoice.status === 'draft' || invoice.status === 'posted') && (
                        <button
                          onClick={() => openEditModal(invoice)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                        >
                          ✎ Edit
                        </button>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Invoices Tab */}
        {tab === 'invoices' && (
          <div>
            <PageHeader
              title="Invoices - Released/Rejected"
              subtitle={`Total: ${invoices.length} invoice`}
            />

            {/* Search Input */}
            <div className="mb-6">
              <input
                type="text"
                placeholder="Cari berdasarkan nama outlet atau order ID..."
                value={searchInvoices}
                onChange={(e) => setSearchInvoices(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Date Filter Buttons */}
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-3">Filter Tanggal:</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setDateFilter('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    dateFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setDateFilter('today')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    dateFilter === 'today'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  📅 Today
                </button>
                <button
                  onClick={() => setDateFilter('1week')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    dateFilter === '1week'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  📆 1 Week
                </button>
                <button
                  onClick={() => setDateFilter('1month')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    dateFilter === '1month'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  📊 1 Month
                </button>
                <button
                  onClick={() => setDateFilter('1q')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    dateFilter === '1q'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  📈 1 Quarter
                </button>
              </div>
            </div>

            {/* Total Amount Display */}
            <div className="mb-6 bg-gradient-to-r from-gray-900 to-gray-800 border border-gray-700 rounded-lg p-4">
              <p className="text-gray-400 text-sm mb-1">Total Nilai Orderan Tercetak:</p>
              <p className="text-3xl font-bold text-green-400">
                Rp {calculateTotalAmount(invoices, searchInvoices).toLocaleString('id-ID')}
              </p>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-gray-400">Loading...</div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                Tidak ada invoice yang sudah di-release atau di-reject
              </div>
            ) : (
              <div className="space-y-4">
                {getFilteredInvoices(invoices, searchInvoices)
                  .map((invoice) => {
                  // Use order created_at if available, otherwise use invoice created_at
                  const orderDate = invoice.order_created_at || invoice.created_at;
                  const createdDate = new Date(orderDate || Date.now());
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
                    key={invoice.id}
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
                          invoice.status === 'released'
                            ? 'bg-green-900 text-green-200'
                            : invoice.status === 'rejected'
                            ? 'bg-red-900 text-red-200'
                            : invoice.status === 'paid'
                            ? 'bg-blue-900 text-blue-200'
                            : 'bg-gray-700 text-gray-200'
                        }`}
                      >
                        {invoice.status === 'released'
                          ? '✓ Released'
                          : invoice.status === 'rejected'
                          ? '✗ Rejected'
                          : invoice.status === 'paid'
                          ? '💰 Paid'
                          : invoice.status}
                      </span>
                    </div>

                    {/* Amount Section */}
                    <div className="mb-3 pb-3 border-b border-gray-800">
                      <p className="text-white font-bold text-lg">
                        Rp {invoice.amount?.toLocaleString('id-ID') || 0}
                      </p>
                      {invoice.status === 'posted' && (
                        <p className="text-xs text-gray-400 mt-2">
                          Posted: <span className="text-white">{new Date(invoice.created_at || Date.now()).toLocaleDateString('id-ID')} {new Date(invoice.created_at || Date.now()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                        </p>
                      )}
                    </div>

                    {/* Status Badges - Compact */}
                    <div className="flex flex-wrap gap-2">
                      {/* Packing Status Badge */}
                      {invoice.logistik_in_status && (
                        <span className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${
                          invoice.logistik_in_status === 'terpacking'
                            ? 'bg-blue-900 text-blue-200'
                            : 'bg-gray-800 text-gray-300'
                        }`}>
                          {invoice.logistik_in_status === 'terpacking' ? '📦 Packed' : '⏳ Packing'}
                        </span>
                      )}
                      
                      {/* Faktur Status Badge */}
                      {invoice.faktur_status && (
                        <span className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${
                          invoice.faktur_status === 'terfaktur'
                            ? 'bg-purple-900 text-purple-200'
                            : 'bg-gray-800 text-gray-300'
                        }`}>
                          {invoice.faktur_status === 'terfaktur' ? '📄 Invoiced' : '⏳ Invoicing'}
                        </span>
                      )}
                      
                      {/* Shipping Request Badge */}
                      <ShippingBadge shippingRequest={invoice.shipping_request} size="sm" />

                      {/* Shipment Status Badge */}
                      {invoice.shipment_status && (
                        <span className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${
                          invoice.shipment_status === 'ready'
                            ? 'bg-amber-900 text-amber-200'
                            : invoice.shipment_status === 'planned'
                            ? 'bg-orange-900 text-orange-200'
                            : invoice.shipment_status === 'completed'
                            ? 'bg-green-900 text-green-200'
                            : 'bg-gray-800 text-gray-300'
                        }`}>
                          {invoice.shipment_status === 'ready' 
                            ? '🚚 Ready' 
                            : invoice.shipment_status === 'planned' 
                            ? '📋 Planned' 
                            : invoice.shipment_status === 'completed' 
                            ? '✓ Shipped' 
                            : 'Pending'}
                        </span>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Pengajuan Diskon Tab */}
        {tab === 'pengajuan-diskon' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Pengajuan Diskon</h2>
                <p className="text-gray-400">Ajukan diskon untuk outlet tertentu</p>
              </div>
              <button
                onClick={() => setShowDiscountRequestModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                + Ajukan Diskon Baru
              </button>
            </div>

            {loadingDiscountRequests ? (
              <div className="flex justify-center items-center py-12">
                <div className="text-gray-400">Loading...</div>
              </div>
            ) : discountRequests.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-12 text-center">
                <div className="text-5xl mb-4">💰</div>
                <h3 className="text-xl font-semibold text-white mb-2">Belum ada pengajuan diskon</h3>
                <p className="text-gray-400 mb-6">Klik tombol "Ajukan Diskon Baru" untuk membuat pengajuan diskon</p>
              </div>
            ) : (
              <div className="space-y-4">
                {discountRequests.map((request) => (
                  <div key={request.id} className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-2">
                          {request.product?.nama_barang || 'Produk'} - {request.outlet?.name || 'Outlet'}
                        </h3>
                        <p className="text-gray-400 text-sm mb-1">
                          Diskon: <span className="text-yellow-400 font-semibold">{request.discount_percentage}%</span>
                        </p>
                        <p className="text-gray-400 text-sm mb-1">
                          Periode: {new Date(request.start_date).toLocaleDateString('id-ID')} - {new Date(request.end_date).toLocaleDateString('id-ID')}
                        </p>
                        <p className="text-gray-400 text-sm mb-2">
                          Alasan: {request.reason}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap ${
                          request.status === 'approved'
                            ? 'bg-green-900 text-green-200'
                            : request.status === 'rejected'
                            ? 'bg-red-900 text-red-200'
                            : 'bg-yellow-900 text-yellow-200'
                        }`}>
                          {request.status === 'approved' ? '✓ Disetujui' : request.status === 'rejected' ? '✗ Ditolak' : '⏳ Menunggu'}
                        </span>
                        <p className="text-gray-500 text-xs">
                          {new Date(request.created_at).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                    </div>
                    
                    {request.status !== 'pending' && request.approval_notes && (
                      <div className="mt-4 pt-4 border-t border-gray-800">
                        <p className="text-gray-400 text-sm mb-1">
                          {request.status === 'approved' ? 'Catatan Persetujuan:' : 'Alasan Penolakan:'}
                        </p>
                        <p className="text-gray-300 text-sm bg-gray-800 rounded px-3 py-2">
                          {request.approval_notes}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pengajuan Limit Tab */}
        {tab === 'pengajuan-limit' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Pengajuan Limit</h2>
                <p className="text-gray-400">Ajukan peningkatan limit kredit untuk outlet</p>
              </div>
              <button
                onClick={() => setShowLimitRequestModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                + Ajukan Limit Baru
              </button>
            </div>

            {/* Placeholder - Empty State */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-12 text-center">
              <div className="text-5xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-white mb-2">Belum ada pengajuan limit</h3>
              <p className="text-gray-400 mb-6">Klik tombol "Ajukan Limit Baru" untuk membuat pengajuan limit</p>
            </div>
          </div>
        )}

        {/* Data Outlet Tab */}
        {tab === 'data-outlet' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Data Outlet</h2>
              <p className="text-gray-400">Total: {outlets.length} outlet terdaftar</p>
            </div>

            {/* Search */}
            <div className="mb-6">
              <input
                type="text"
                placeholder="🔍 Cari berdasarkan NIO, Nama Outlet, Cluster, atau ME..."
                value={outletSearchQuery}
                onChange={(e) => setOutletSearchQuery(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Loading State */}
            {loadingOutlets ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                <p className="text-gray-400 mt-4">Loading data outlet...</p>
              </div>
            ) : outlets.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-12 text-center">
                <div className="text-5xl mb-4">🏪</div>
                <h3 className="text-xl font-semibold text-white mb-2">Tidak ada outlet</h3>
                <p className="text-gray-400">Silakan tambahkan outlet di halaman Admin Keuangan terlebih dahulu</p>
              </div>
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
                      {outlets
                        .filter((outlet) => {
                          const searchLower = outletSearchQuery.toLowerCase();
                          const name = (outlet.name || '').toString().toLowerCase();
                          const nio = (outlet.nio || '').toString().toLowerCase();
                          const cluster = (outlet.cluster || '').toString().toLowerCase();
                          const me = (outlet.me || '').toString().toLowerCase();
                          return name.includes(searchLower) || nio.includes(searchLower) || cluster.includes(searchLower) || me.includes(searchLower);
                        })
                        .map((outlet, idx) => (
                          <tr key={idx} className="border-b border-gray-700 hover:bg-gray-800">
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

        {/* Historis Pengambilan Tab */}
        {tab === 'historis-pengambilan' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Historis Pengambilan</h2>
              <p className="text-gray-400">Riwayat pengambilan barang oleh outlet</p>
            </div>

            {/* Filter */}
            <div className="mb-6 flex gap-3 flex-wrap">
              <select className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500">
                <option>Semua Outlet</option>
              </select>
              <select className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500">
                <option>Semua Periode</option>
                <option>Bulan ini</option>
                <option>3 bulan terakhir</option>
                <option>6 bulan terakhir</option>
              </select>
              <input
                type="date"
                className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Placeholder - Empty State */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-12 text-center">
              <div className="text-5xl mb-4">📈</div>
              <h3 className="text-xl font-semibold text-white mb-2">Data historis pengambilan kosong</h3>
              <p className="text-gray-400">Riwayat pengambilan barang akan ditampilkan di sini setelah ada transaksi</p>
            </div>
          </div>
        )}
      </main>

      {/* Pengajuan Diskon Modal */}
      {showDiscountRequestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-6 text-white">Ajukan Diskon</h2>
            
            <div className="space-y-4 mb-6">
              {/* Outlet Dropdown */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">Pilih Outlet *</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Cari outlet..."
                    value={outletSearchDiscount}
                    onChange={(e) => setOutletSearchDiscount(e.target.value)}
                    onFocus={() => setShowOutletDropdown(true)}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-600"
                  />
                  {showOutletDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded max-h-40 overflow-y-auto z-10">
                      {outlets
                        .filter((outlet) => {
                          const search = outletSearchDiscount.toLowerCase();
                          return (
                            (outlet.name || '').toString().toLowerCase().includes(search) ||
                            (outlet.nio || '').toString().toLowerCase().includes(search)
                          );
                        })
                        .map((outlet, idx) => (
                          <div
                            key={idx}
                            onClick={() => {
                              setSelectedOutletDiscount(String(outlet.id || outlet.nio || ''));
                              setOutletSearchDiscount(`${outlet.nio} - ${outlet.name}`);
                              setShowOutletDropdown(false);
                            }}
                            className="px-3 py-2 hover:bg-gray-700 cursor-pointer text-white text-sm"
                          >
                            {outlet.nio} - {outlet.name}
                          </div>
                        ))}
                      {outlets.filter((o) => (o.name || '').toString().toLowerCase().includes(outletSearchDiscount.toLowerCase())).length === 0 && (
                        <div className="px-3 py-2 text-gray-400 text-sm">Tidak ada outlet ditemukan</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Product Dropdown */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">Nama Barang *</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Cari barang..."
                    value={productSearchDiscount}
                    onChange={(e) => setProductSearchDiscount(e.target.value)}
                    onFocus={() => setShowProductDropdown(true)}
                    disabled={loadingProducts}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-600 disabled:opacity-50"
                  />
                  {showProductDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded max-h-40 overflow-y-auto z-10">
                      {loadingProducts ? (
                        <div className="px-3 py-2 text-gray-400 text-sm">Loading...</div>
                      ) : products
                        .filter((product) => {
                          const search = productSearchDiscount.toLowerCase();
                          return (product.nama_barang || '').toLowerCase().includes(search);
                        })
                        .map((product, idx) => (
                          <div
                            key={idx}
                            onClick={() => {
                              setSelectedProductDiscount(product.id);
                              setProductSearchDiscount(product.nama_barang);
                              setShowProductDropdown(false);
                            }}
                            className="px-3 py-2 hover:bg-gray-700 cursor-pointer text-white text-sm"
                          >
                            {product.nama_barang}
                          </div>
                        ))}
                      {!loadingProducts && products.filter((p) => p.nama_barang.toLowerCase().includes(productSearchDiscount.toLowerCase())).length === 0 && (
                        <div className="px-3 py-2 text-gray-400 text-sm">Tidak ada barang ditemukan</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Persentase Diskon (%) *</label>
                <input
                  type="number"
                  placeholder="Contoh: 5, 10, 15"
                  value={discountPercentage}
                  onChange={(e) => setDiscountPercentage(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Alasan Diskon *</label>
                <textarea
                  placeholder="Jelaskan alasan pengajuan diskon..."
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-600 resize-none"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Periode Berlaku *</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={startDateDiscount}
                    onChange={(e) => setStartDateDiscount(e.target.value)}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-600"
                  />
                  <input
                    type="date"
                    value={endDateDiscount}
                    onChange={(e) => setEndDateDiscount(e.target.value)}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDiscountRequestModal(false);
                  setSelectedOutletDiscount('');
                  setSelectedProductDiscount('');
                  setOutletSearchDiscount('');
                  setProductSearchDiscount('');
                  setDiscountPercentage('');
                  setDiscountReason('');
                  setStartDateDiscount('');
                  setEndDateDiscount('');
                }}
                disabled={submittingDiscount}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleSubmitDiscountRequest}
                disabled={submittingDiscount}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                {submittingDiscount ? 'Sedang Mengajukan...' : 'Ajukan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pengajuan Limit Modal */}
      {showLimitRequestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 w-full max-w-md">
            <h2 className="text-xl font-bold mb-6 text-white">Ajukan Peningkatan Limit</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Pilih Outlet *</label>
                <select className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-600">
                  <option>-- Pilih Outlet --</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Limit Saat Ini</label>
                <input
                  type="text"
                  disabled
                  placeholder="Rp 0"
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-500 opacity-50 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Limit Baru yang Diajukan *</label>
                <input
                  type="number"
                  placeholder="Masukkan nominal limit baru"
                  value={limitAmount}
                  onChange={(e) => setLimitAmount(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Alasan Pengajuan *</label>
                <textarea
                  placeholder="Jelaskan alasan peningkatan limit..."
                  value={limitReason}
                  onChange={(e) => setLimitReason(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-600 resize-none"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowLimitRequestModal(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => setShowLimitRequestModal(false)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Ajukan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Invoice Modal */}
      {showEditModal && editingInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-white">Edit Invoice</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <p className="text-sm text-gray-400 mb-1">Invoice Number</p>
                <p className="text-white font-semibold">#{editingInvoice.invoice_number}</p>
              </div>

              <div>
                <p className="text-sm text-gray-400 mb-1">Outlet</p>
                <p className="text-white">
                  {editingInvoice.outlet?.name || editingInvoice.outlet_id}
                  {editingInvoice.outlet?.NIO && ` (${editingInvoice.outlet.NIO})`}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-400 mb-1">Status</p>
                <span className={`px-3 py-1 rounded text-sm font-medium inline-block ${
                  editingInvoice.status === 'rejected'
                    ? 'bg-red-900 text-red-200'
                    : 'bg-yellow-900 text-yellow-200'
                }`}>
                  {editingInvoice.status === 'rejected' ? 'Ditolak' : 'Pending'}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Amount *
                </label>
                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(Number(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Catatan
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Tambahkan catatan jika ada perubahan..."
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-600 resize-none"
                  rows={3}
                />
              </div>
            </div>

            <div className="text-xs text-gray-500 mb-6">
              {editingInvoice.status === 'released' 
                ? '🔒 Invoice sudah di-release, tidak dapat di-edit'
                : '📝 Perubahan hanya dapat dilakukan sebelum invoice di-release'}
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeEditModal}
                disabled={isSaving}
                className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSaveInvoice}
                disabled={isSaving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {isSaving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
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
              <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-end">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Total Amount</p>
                  <p className="text-white font-bold text-2xl">
                    Rp {detailInvoice.amount?.toLocaleString('id-ID') || 0}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-sm mb-1">Status</p>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    detailInvoice.status === 'released'
                      ? 'bg-green-900 text-green-200'
                      : detailInvoice.status === 'rejected'
                      ? 'bg-red-900 text-red-200'
                      : detailInvoice.status === 'paid'
                      ? 'bg-blue-900 text-blue-200'
                      : 'bg-gray-700 text-gray-200'
                  }`}>
                    {detailInvoice.status === 'released' ? '✓ Released' : 
                     detailInvoice.status === 'rejected' ? '✗ Rejected' : 
                     detailInvoice.status === 'paid' ? '💰 Paid' : 'Unknown'}
                  </span>
                </div>
              </div>
              {detailInvoice.status === 'posted' && (
                <div className="mt-3 text-sm text-gray-300">
                  Posted: <span className="text-white">{new Date(detailInvoice.created_at || Date.now()).toLocaleDateString('id-ID')} {new Date(detailInvoice.created_at || Date.now()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              )}
            </div>

            {/* Status Badges */}
            <div className="mb-6">
              <h3 className="text-white font-semibold mb-3">Status Proses</h3>
              <div className="flex flex-wrap gap-2">
                {detailInvoice.logistik_in_status && (
                  <span className={`px-3 py-2 rounded text-sm font-semibold ${
                    detailInvoice.logistik_in_status === 'terpacking'
                      ? 'bg-blue-900 text-blue-200'
                      : 'bg-gray-800 text-gray-300'
                  }`}>
                    {detailInvoice.logistik_in_status === 'terpacking' ? '✓ Packed' : '⏳ Packing'}
                  </span>
                )}
                {detailInvoice.faktur_status && (
                  <span className={`px-3 py-2 rounded text-sm font-semibold ${
                    detailInvoice.faktur_status === 'terfaktur'
                      ? 'bg-purple-900 text-purple-200'
                      : 'bg-gray-800 text-gray-300'
                  }`}>
                    {detailInvoice.faktur_status === 'terfaktur' ? '✓ Invoiced' : '⏳ Invoicing'}
                  </span>
                )}
                {detailInvoice.shipment_status && (
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
              {/* Keuangan Notes */}
              {detailInvoice.keuangan_notes && (
                <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                  <h4 className="text-blue-400 font-semibold mb-2">💰 Catatan Admin Keuangan</h4>
                  <p className="text-blue-200 text-sm">{detailInvoice.keuangan_notes}</p>
                </div>
              )}

              {/* Packing Notes */}
              {detailInvoice.packing_officer_name && (
                <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                  <h4 className="text-blue-400 font-semibold mb-2">📦 Catatan Packing (Gudang)</h4>
                  <div className="space-y-1 text-blue-200 text-sm">
                    <p><span className="text-blue-300">Petugas:</span> {detailInvoice.packing_officer_name}</p>
                    {detailInvoice.packing_verified_at && typeof detailInvoice.packing_verified_at === 'string' && (
                      <p><span className="text-blue-300">Waktu Terpacking:</span> {new Date(detailInvoice.packing_verified_at).toLocaleDateString('id-ID')} {new Date(detailInvoice.packing_verified_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                    )}
                    {detailInvoice.packing_notes && (
                      <p><span className="text-blue-300">Catatan:</span> {detailInvoice.packing_notes}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Faktur Notes */}
              {detailInvoice.faktur_officer_name && (
                <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-purple-400 font-semibold">📄 Catatan Fakturis</h4>
                    <button
                      onClick={() => openFakturPhotosModal(detailInvoice.id)}
                      className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1 rounded transition"
                    >
                      📸 Lihat Foto
                    </button>
                  </div>
                  <div className="space-y-1 text-purple-200 text-sm">
                    <p><span className="text-purple-300">Petugas:</span> {detailInvoice.faktur_officer_name}</p>
                    {detailInvoice.faktur_verified_at && typeof detailInvoice.faktur_verified_at === 'string' && (
                      <p><span className="text-purple-300">Waktu Faktur:</span> {new Date(detailInvoice.faktur_verified_at).toLocaleDateString('id-ID')} {new Date(detailInvoice.faktur_verified_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                    )}
                    {detailInvoice.faktur_notes && (
                      <p><span className="text-purple-300">Catatan:</span> {detailInvoice.faktur_notes}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Expedisi Notes */}
              {detailInvoice.expedisi_officer_name && (
                <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-4">
                  <h4 className="text-amber-400 font-semibold mb-2">🚚 Catatan Expedisi</h4>
                  <div className="space-y-1 text-amber-200 text-sm">
                    <p><span className="text-amber-300">Petugas:</span> {detailInvoice.expedisi_officer_name || '-'}</p>
                    {detailInvoice.shipment_plan && (
                      <p><span className="text-amber-300">Rencana Kirim:</span> {detailInvoice.shipment_plan || '-'}</p>
                    )}
                    {detailInvoice.shipment_date && typeof detailInvoice.shipment_date === 'string' && (
                      <p><span className="text-amber-300">Tanggal Kirim:</span> {new Date(detailInvoice.shipment_date).toLocaleDateString('id-ID')}</p>
                    )}
                    {detailInvoice.delivery_notes && (
                      <p><span className="text-amber-300">Catatan Pengiriman:</span> {detailInvoice.delivery_notes}</p>
                    )}
                    {detailInvoice.delivery_date && typeof detailInvoice.delivery_date === 'string' && (
                      <p><span className="text-amber-300">Tanggal Terkirim:</span> {new Date(detailInvoice.delivery_date).toLocaleDateString('id-ID')}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-6 border-t border-gray-800 mb-6">
              <button
                onClick={() => handleDownloadPDF(detailInvoice)}
                className="flex-1 font-medium py-2 px-4 rounded-lg transition-colors text-white bg-red-600 hover:bg-red-700"
              >
                📥 Download PDF
              </button>
              
              <button
                onClick={() => handleShareWhatsApp(detailInvoice)}
                className="flex-1 font-medium py-2 px-4 rounded-lg transition-colors text-white bg-green-600 hover:bg-green-700"
              >
                💬 Share WhatsApp
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={closeDetailModal}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Faktur Photos Modal */}
      {showFakturPhotosModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-800 px-6 py-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">📸 Foto Faktur</h2>
              <button
                onClick={closeFakturPhotosModal}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              {loadingFakturPhotos ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">Loading foto...</p>
                </div>
              ) : fakturPhotos.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">Tidak ada foto faktur yang diupload</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {fakturPhotos.map((photo) => (
                    <div key={photo.id} className="bg-gray-800 rounded-lg overflow-hidden">
                      {photo.public_url ? (
                        <a
                          href={photo.public_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block hover:opacity-80 transition"
                        >
                          <img
                            src={photo.public_url}
                            alt="Faktur"
                            className="w-full h-48 object-cover"
                          />
                        </a>
                      ) : (
                        <div className="w-full h-48 bg-gray-700 flex items-center justify-center">
                          <span className="text-gray-500">Image not available</span>
                        </div>
                      )}
                      <div className="p-3 text-xs text-gray-400">
                        <p className="truncate">{photo.image_path}</p>
                        {photo.uploaded_at && (
                          <p className="text-gray-500">
                            {new Date(photo.uploaded_at).toLocaleDateString('id-ID')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-gray-800 px-6 py-4 border-t border-gray-700">
              <button
                onClick={closeFakturPhotosModal}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
