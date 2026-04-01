'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { logOut } from '@/lib/auth';
import { getOutlets, exportOutletsToCSV } from '@/lib/export';
import { uploadOutletData } from '@/lib/outlets';
import { getInvoices, releaseInvoice, rejectInvoice } from '@/lib/orders';
import { useAuth, useRoleCheck } from '@/lib/hooks';
import { LoadingSpinner, PageHeader } from '@/app/components/UIComponents';

export default function AdminKeuanganDashboard() {
  const router = useRouter();
  const { user, userProfile, loading } = useAuth();
  const { hasAccess } = useRoleCheck(['admin_keuangan', 'super_admin']);

  const [outlets, setOutlets] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [tab, setTab] = useState<'outlets' | 'outlet-import' | 'invoices'>('outlets');
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [releaseLoading, setReleaseLoading] = useState(false);
  const [releaseSuccess, setReleaseSuccess] = useState<string | null>(null);
  
  // Search states
  const [outletSearchQuery, setOutletSearchQuery] = useState('');
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');
  
  // Outlet import states
  const [outletUploading, setOutletUploading] = useState(false);
  const [outletUploadError, setOutletUploadError] = useState<string | null>(null);
  const [outletUploadSuccess, setOutletUploadSuccess] = useState<string | null>(null);
  
  // Modal state
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [modalInvoice, setModalInvoice] = useState<any>(null);
  const [modalAction, setModalAction] = useState<'release' | 'reject' | null>(null);
  const [modalNotes, setModalNotes] = useState('');

  useEffect(() => {
    if (loading || !hasAccess) return;
    fetchData();
  }, [loading, hasAccess, tab]);

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

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (tab === 'outlets') {
        const result = await getOutlets();
        if (result.error) {
          console.error(result.error);
        } else {
          setOutlets(result.data || []);
        }
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
  };

  const handleExportOutlets = async () => {
    setIsExporting(true);
    try {
      exportOutletsToCSV(outlets);
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

  const openDecisionModal = (invoice: any, action: 'release' | 'reject') => {
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

  const handleDownloadPDF = (invoice: any) => {
    // Generate invoice content
    const orderDate = new Date(invoice.orders?.created_at || invoice.created_at);
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
                  invoice.status.toUpperCase()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

JUMLAH        : Rp ${invoice.amount?.toLocaleString('id-ID') || 0}

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
      (outlet.nio?.toString().toLowerCase().includes(query)) ||
      (outlet.name?.toLowerCase().includes(query)) ||
      (outlet.cluster?.toLowerCase().includes(query)) ||
      (outlet.me?.toLowerCase().includes(query))
    );
  });

  // Filter invoices based on search query
  const filteredInvoices = invoices.filter(invoice => {
    const query = invoiceSearchQuery.toLowerCase().trim();
    if (!query) return true;
    
    return (
      (invoice.order_id?.toLowerCase().includes(query)) ||
      (invoice.invoice_number?.toLowerCase().includes(query)) ||
      (invoice.outlet?.name?.toLowerCase().includes(query)) ||
      (invoice.outlet?.NIO?.toString().includes(query))
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
                        <th className="px-6 py-3 text-left text-sm font-medium">Credit Limit</th>
                        <th className="px-6 py-3 text-left text-sm font-medium">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOutlets.map((outlet) => (
                        <tr key={outlet.id} className="border-b border-gray-700 hover:bg-gray-800">
                          <td className="px-6 py-4 text-sm font-mono">{outlet.nio || '-'}</td>
                          <td className="px-6 py-4 text-sm">{outlet.name}</td>
                          <td className="px-6 py-4 text-sm">{outlet.cluster || '-'}</td>
                          <td className="px-6 py-4 text-sm">{outlet.top_hari || '-'} hari</td>
                          <td className="px-6 py-4 text-sm">Rp {outlet.limit_rupiah?.toLocaleString('id-ID') || '-'}</td>
                          <td className="px-6 py-4 text-sm">Rp {outlet.current_saldo?.toLocaleString('id-ID') || '-'}</td>
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
                  Format CSV: NIO, NAMA OUTLET, ME, CLUSTER, KELOMPOK, LIMIT, TOP, SALDO<br/>
                  <span className="text-xs text-gray-500 mt-2 block">
                    NIO = Nomor Identifikasi Outlet (wajib unik)<br/>
                    LIMIT = Limit dalam rupiah (contoh: 1000000 atau 1.000.000)<br/>
                    TOP = Tempo pembayaran dalam hari (contoh: 30)<br/>
                    SALDO = Sisa saldo dalam rupiah (contoh: 500000)
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
                  const orderDate = invoice.orders?.created_at || invoice.created_at;
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
                        <p className="text-gray-400 text-sm">Order ID: {invoice.order_id?.slice(0, 8).toUpperCase()}</p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
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
                          ? 'Draft (Marketing Review)'
                          : invoice.status === 'posted'
                          ? 'Posted (Pending Release)'
                          : invoice.status === 'released'
                          ? 'Released'
                          : invoice.status === 'rejected'
                          ? 'Rejected'
                          : invoice.status === 'paid'
                          ? 'Paid'
                          : 'Cancelled'}
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

                    {/* Show notes if exists */}
                    {invoice.keuangan_notes && (
                      <div className="mb-4 p-3 bg-gray-800 rounded border border-gray-700">
                        <p className="text-xs text-gray-400 mb-1">Catatan Admin Keuangan:</p>
                        <p className="text-sm text-gray-300">{invoice.keuangan_notes}</p>
                      </div>
                    )}

                    {/* Packing Status */}
                    {invoice.logistik_in_status && (
                      <div className="mb-4 p-3 bg-blue-900/30 rounded border border-blue-700">
                        <p className="text-blue-400 text-xs mb-1">Status Packing:</p>
                        <p className="text-blue-200 font-semibold mb-2 text-sm">
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

                    {/* Faktur Status */}
                    {invoice.faktur_status && (
                      <div className="mb-4 p-3 bg-purple-900/30 rounded border border-purple-700">
                        <p className="text-purple-400 text-xs mb-1">Status Faktur:</p>
                        <p className="text-purple-200 font-semibold mb-2 text-sm">
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

                    {/* Action buttons - show for all invoices except paid and cancelled */}
                    {(invoice.status !== 'paid' && invoice.status !== 'cancelled') && (
                      <div className="space-y-3">
                        {/* Download button */}
                        <button
                          onClick={() => handleDownloadPDF(invoice)}
                          className="w-full font-medium py-2 px-4 rounded-lg transition-colors text-white bg-red-600 hover:bg-red-700"
                        >
                          📥 Download Invoice
                        </button>
                        
                        {/* Release/Reject buttons */}
                        <div className="flex gap-3">
                          <button
                            onClick={() => openDecisionModal(invoice, 'release')}
                            disabled={releaseLoading}
                            className={`flex-1 font-medium py-2 px-4 rounded-lg transition-colors text-white ${
                              invoice.status === 'released'
                                ? 'bg-blue-600 hover:bg-blue-700'
                                : 'bg-green-600 hover:bg-green-700 disabled:bg-gray-600'
                            }`}
                          >
                            {releaseLoading && modalInvoice?.id === invoice.id && modalAction === 'release'
                              ? 'Processing...'
                              : invoice.status === 'released'
                              ? '✓ Released (Edit Catatan)'
                              : '✓ Release'}
                          </button>
                          <button
                            onClick={() => openDecisionModal(invoice, 'reject')}
                            disabled={releaseLoading}
                            className={`flex-1 font-medium py-2 px-4 rounded-lg transition-colors text-white ${
                              invoice.status === 'rejected'
                                ? 'bg-orange-600 hover:bg-orange-700'
                                : 'bg-red-600 hover:bg-red-700 disabled:bg-gray-600'
                            }`}
                          >
                            {releaseLoading && modalInvoice?.id === invoice.id && modalAction === 'reject'
                              ? 'Processing...'
                              : invoice.status === 'rejected'
                              ? '✗ Rejected (Edit Catatan)'
                              : '✗ Reject'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
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
                  if (modalAction === 'release') {
                    handleReleaseInvoice(modalInvoice.id);
                  } else {
                    handleRejectInvoice(modalInvoice.id);
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
    </div>
  );
}
