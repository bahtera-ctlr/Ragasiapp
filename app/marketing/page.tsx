'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { logOut, getCurrentUser } from '@/lib/auth';
import { getOrders, createInvoice, getInvoicesByMarketing, updateInvoice } from '@/lib/orders';
import { useAuth, useRoleCheck } from '@/lib/hooks';
import { LoadingSpinner, PageHeader } from '@/app/components/UIComponents';

export default function MarketingDashboard() {
  const router = useRouter();
  const { user, userProfile, loading } = useAuth();
  const { hasAccess } = useRoleCheck(['marketing', 'super_admin']);

  const [tab, setTab] = useState<'sales' | 'invoices'>('sales');
  const [orders, setOrders] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Edit invoice modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [editAmount, setEditAmount] = useState(0);
  const [editNotes, setEditNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (loading || !hasAccess || !user) return;
    fetchOrders();
  }, [loading, hasAccess, user, tab]);

  // Redirect jika tidak punya akses
  if (!loading && !hasAccess) {
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

  const fetchOrders = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      if (tab === 'sales') {
        // Fetch sales orders created by this marketing user
        const result = await getOrders({ marketing_id: user.id });

        if (result.error) {
          console.error(result.error);
        } else {
          setOrders(result.data || []);
        }
      } else {
        // Fetch invoices for this marketing user's orders
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
  };

  const handleLogout = async () => {
    await logOut();
    router.push('/');
  };

  const openEditModal = (invoice: any) => {
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

  const handleDownloadPDF = (invoice: any) => {
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

  const handleShareWhatsApp = (invoice: any) => {
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
            Sales Orders
          </button>
          <button
            onClick={() => setTab('invoices')}
            className={`py-2 px-4 rounded-lg font-medium transition-colors ${
              tab === 'invoices'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Invoices
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

        {/* Sales Orders Tab */}
        {tab === 'sales' && (
          <div>
            <PageHeader
              title="Sales Orders"
              subtitle={`Total: ${orders.length} order`}
            />

            {isLoading ? (
              <div className="text-center py-8 text-gray-400">Loading...</div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                Belum ada sales order. Klik tombol "Buat Sales Order Baru" untuk membuat order.
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  const createdDate = new Date(order.created_at);
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
                    key={order.id}
                    className="bg-gray-900 border border-gray-800 rounded-lg p-6"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {order.outlet_name || order.outlet_id} - {formattedDate} {formattedTime}
                        </h3>
                        <p className="text-gray-400 text-sm">Order ID: {order.id.slice(0, 8)}</p>
                      </div>
                      <div className="flex gap-2 items-center">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            order.status === 'pending'
                              ? 'bg-yellow-900 text-yellow-200'
                              : order.status === 'approved'
                              ? 'bg-green-900 text-green-200'
                              : 'bg-gray-700 text-gray-200'
                          }`}
                        >
                          {order.status}
                        </span>
                        <button
                          onClick={() => router.push(`/marketing/orders/${order.id}`)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white"
                        >
                          Edit
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                      <div>
                        <p className="text-gray-400">Items</p>
                        <p className="text-white font-semibold">
                          {Array.isArray(order.items) ? order.items.length : 0} item
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Total</p>
                        <p className="text-white font-semibold">
                          Rp {order.total_amount?.toLocaleString('id-ID') || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Created</p>
                        <p className="text-white">
                          {new Date(order.created_at).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                    </div>

                    <details className="text-sm">
                      <summary className="cursor-pointer text-blue-400 hover:text-blue-300">
                        Lihat Details Items
                      </summary>
                      <div className="mt-3 pl-3 border-l border-gray-700 space-y-2">
                        {Array.isArray(order.items) &&
                          order.items.map((item: any, idx: number) => (
                            <div key={idx} className="text-gray-300">
                              <p className="font-medium">{item.product_name || item.product_id}</p>
                              <p className="text-xs text-gray-500">
                                {item.qty} × Rp {item.price?.toLocaleString('id-ID')} = Rp{' '}
                                {item.subtotal?.toLocaleString('id-ID')}
                                {item.discount > 0 && ` (-${item.discount}%)`}
                              </p>
                            </div>
                          ))}
                      </div>
                    </details>
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

            {isLoading ? (
              <div className="text-center py-8 text-gray-400">Loading...</div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                Tidak ada invoice yang sudah di-release atau di-reject
              </div>
            ) : (
              <div className="space-y-4">
                {invoices.map((invoice) => {
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
                    className="bg-gray-900 border border-gray-800 rounded-lg p-6"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {invoice.outlet?.name || invoice.outlet_id} - {formattedDate} {formattedTime}
                        </h3>
                        <p className="text-gray-400 text-sm">
                          Order ID: {invoice.order_id?.slice(0, 8).toUpperCase()}
                          {invoice.outlet?.NIO && ` (NIO: ${invoice.outlet.NIO})`}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
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
                          ? 'Released ✓'
                          : invoice.status === 'rejected'
                          ? 'Rejected ✗'
                          : invoice.status === 'paid'
                          ? 'Paid'
                          : invoice.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
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

                    {/* Show admin keuangan notes if exists */}
                    {invoice.keuangan_notes && (
                      <div className="mb-4 p-3 bg-gray-800 rounded border border-gray-700">
                        <p className="text-xs text-gray-400 mb-1">Catatan Admin Keuangan:</p>
                        <p className="text-sm text-gray-300">{invoice.keuangan_notes}</p>
                      </div>
                    )}

                    {/* Show review info if exists */}
                    {invoice.keuangan_reviewed_at && (
                      <div className="text-xs text-gray-500 pt-2 mb-4 border-t border-gray-800">
                        <p>Di-review pada: {new Date(invoice.keuangan_reviewed_at).toLocaleDateString('id-ID')}</p>
                      </div>
                    )}

                    {/* Show packing status if exists */}
                    {invoice.logistik_in_status && (
                      <div className="mb-4 p-3 bg-blue-900/30 rounded border border-blue-700">
                        <p className="text-xs text-blue-400 mb-1">Status Packing:</p>
                        <p className="text-sm font-semibold text-blue-200 mb-2">
                          {invoice.logistik_in_status === 'terpacking' ? '✓ Sudah Terpacking' : 'Menunggu Packing'}
                        </p>
                        {invoice.logistik_in_status === 'terpacking' && invoice.packing_officer_name && (
                          <div className="text-xs text-blue-300">
                            <p>Petugas: {invoice.packing_officer_name}</p>
                            {invoice.packing_notes && (
                              <p className="mt-1">Catatan: {invoice.packing_notes}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Show faktur status if exists */}
                    {invoice.faktur_status && (
                      <div className="mb-4 p-3 bg-purple-900/30 rounded border border-purple-700">
                        <p className="text-xs text-purple-400 mb-1">Status Faktur:</p>
                        <p className="text-sm font-semibold text-purple-200 mb-2">
                          {invoice.faktur_status === 'terfaktur' ? '✓ Sudah Terfaktur' : 'Menunggu Faktur'}
                        </p>
                        {invoice.faktur_status === 'terfaktur' && invoice.faktur_officer_name && (
                          <div className="text-xs text-purple-300">
                            <p>Petugas: {invoice.faktur_officer_name}</p>
                            {invoice.faktur_notes && (
                              <p className="mt-1">Catatan: {invoice.faktur_notes}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-3 flex-wrap">
                      {/* Download PDF button */}
                      <button
                        onClick={() => handleDownloadPDF(invoice)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
                      >
                        📄 Download PDF
                      </button>

                      {/* Share WhatsApp button */}
                      <button
                        onClick={() => handleShareWhatsApp(invoice)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
                      >
                        💬 Share WhatsApp
                      </button>

                      {/* Edit button - only for non-released invoices */}
                      {invoice.status !== 'released' && (
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
    </div>
  );
}
