'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logOut } from '@/lib/auth';
import { getInvoicesByMarketing, updateInvoice, getPendingInvoicesByMarketing } from '@/lib/orders';
import { useAuth, useRoleCheck } from '@/lib/hooks';
import { LoadingSpinner, PageHeader } from '@/app/components/UIComponents';
import ShippingBadge from '@/app/components/ShippingBadge';

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
  [key: string]: unknown;
};

export default function MarketingDashboard() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { hasAccess } = useRoleCheck(['marketing', 'super_admin']);

  const [tab, setTab] = useState<'sales' | 'invoices'>('sales');
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

  useEffect(() => {
    if (loading || !hasAccess || !user) return;
    fetchOrders();
  }, [loading, hasAccess, user, fetchOrders]);

  // Show page UI immediately, only show "Access Denied" if user is authenticated and doesn't have access
  // Don't show loading spinner while auth is checking
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

  const handleLogout = async () => {
    await logOut();
    router.push('/');
  };

  const openEditModal = (invoice: MarketingInvoice) => {
    setEditingInvoice(invoice);
    setEditAmount(invoice.amount);
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
    const orderDate = new Date(invoice.order_created_at || invoice.created_at);
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
                  invoice.status.toUpperCase()}

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
        {/* Tabs */}
        <div className="flex gap-4 mb-8">
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
                  const createdDate = new Date(invoice.order_created_at || invoice.created_at);
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
                          {new Date(invoice.created_at).toLocaleDateString('id-ID')}
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

            {isLoading ? (
              <div className="text-center py-8 text-gray-400">Loading...</div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                Tidak ada invoice yang sudah di-release atau di-reject
              </div>
            ) : (
              <div className="space-y-4">
                {invoices
                  .filter((invoice) => {
                    const searchLower = searchInvoices.toLowerCase();
                    const outletName = invoice.outlet?.name?.toLowerCase() || '';
                    const orderId = invoice.order_id?.toLowerCase() || '';
                    return outletName.includes(searchLower) || orderId.includes(searchLower);
                  })
                  .map((invoice) => {
                  // Use order created_at if available, otherwise use invoice created_at
                  const orderDate = invoice.order_created_at || invoice.created_at;
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
                          Posted: <span className="text-white">{new Date(invoice.created_at).toLocaleDateString('id-ID')} {new Date(invoice.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
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
      </main>

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
                  Posted: <span className="text-white">{new Date(detailInvoice.created_at).toLocaleDateString('id-ID')} {new Date(detailInvoice.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
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
                    {detailInvoice.packing_verified_at && (
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
                  <h4 className="text-purple-400 font-semibold mb-2">📄 Catatan Fakturis</h4>
                  <div className="space-y-1 text-purple-200 text-sm">
                    <p><span className="text-purple-300">Petugas:</span> {detailInvoice.faktur_officer_name}</p>
                    {detailInvoice.faktur_verified_at && (
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
                    <p><span className="text-amber-300">Petugas:</span> {detailInvoice.expedisi_officer_name}</p>
                    {detailInvoice.shipment_plan && (
                      <p><span className="text-amber-300">Rencana Kirim:</span> {detailInvoice.shipment_plan}</p>
                    )}
                    {detailInvoice.shipment_date && (
                      <p><span className="text-amber-300">Tanggal Kirim:</span> {new Date(detailInvoice.shipment_date).toLocaleDateString('id-ID')}</p>
                    )}
                    {detailInvoice.delivery_notes && (
                      <p><span className="text-amber-300">Catatan Pengiriman:</span> {detailInvoice.delivery_notes}</p>
                    )}
                    {detailInvoice.delivery_date && (
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
    </div>
  );
}
