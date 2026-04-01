'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logOut } from '@/lib/auth';
import { getInvoices, updateInvoiceFakturStatus } from '@/lib/orders';
import { useAuth, useRoleCheck } from '@/lib/hooks';
import { LoadingSpinner, PageHeader } from '@/app/components/UIComponents';

export default function FakturisDashboard() {
  const router = useRouter();
  const { user, userProfile, loading } = useAuth();
  const { hasAccess } = useRoleCheck(['fakturis', 'super_admin']);

  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal state for faktur
  const [showFakturModal, setShowFakturModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [fakturOfficerName, setFakturOfficerName] = useState('');
  const [fakturNotes, setFakturNotes] = useState('');
  const [savingFaktur, setSavingFaktur] = useState(false);
  const [fakturError, setFakturError] = useState('');

  useEffect(() => {
    if (loading || !hasAccess) return;
    fetchInvoices();
  }, [loading, hasAccess, statusFilter]);

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

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const filters: any = {};
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }

      console.log('Fakturis fetching with filters:', filters);
      const result = await getInvoices(filters);
      console.log('Fakturis getInvoices result:', result);

      if (result.error) {
        console.error('Error fetching invoices:', result.error);
      } else {
        console.log('Invoices loaded:', result.data?.length || 0);
        setInvoices(result.data || []);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const openFakturModal = (invoice: any) => {
    setSelectedInvoice(invoice);
    setFakturOfficerName(invoice.faktur_officer_name || '');
    setFakturNotes(invoice.faktur_notes || '');
    setFakturError('');
    setShowFakturModal(true);
  };

  const closeFakturModal = () => {
    setShowFakturModal(false);
    setSelectedInvoice(null);
    setFakturOfficerName('');
    setFakturNotes('');
    setFakturError('');
  };

  const handleSaveFaktur = async () => {
    if (!selectedInvoice || !user) return;
    if (!fakturOfficerName.trim()) {
      setFakturError('Nama petugas fakturis wajib diisi');
      return;
    }

    try {
      setSavingFaktur(true);
      const { data, error } = await updateInvoiceFakturStatus(
        selectedInvoice.id,
        fakturOfficerName,
        fakturNotes,
        user.id
      );

      if (error) {
        setFakturError(error);
      } else {
        console.log('Faktur updated:', data);
        // Update local state
        setInvoices(invoices.map(inv =>
          inv.id === selectedInvoice.id
            ? { ...inv, ...data }
            : inv
        ));
        closeFakturModal();
        alert('Invoice berhasil difakturkan!');
      }
    } catch (err) {
      console.error('Error:', err);
      setFakturError(String(err));
    } finally {
      setSavingFaktur(false);
    }
  };

  const handleLogout = async () => {
    await logOut();
    router.push('/');
  };

  if (loading || !hasAccess) return <LoadingSpinner />;

  const totalAmount = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Fakturis Dashboard</h1>
            <p className="text-gray-400 text-sm">Invoice Management</p>
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
        <PageHeader
          title="Daftar Invoice"
          subtitle={`Total: ${invoices.length} invoice | Total Amount: Rp ${totalAmount.toLocaleString('id-ID')}`}
        />

        {/* Filters */}
        <div className="mb-6 flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">Semua Status</option>
            <option value="posted">Posted</option>
            <option value="released">Released</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        {/* Invoices Grid */}
        {isLoading ? (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg">Tidak ada invoice</p>
            <p className="text-sm">Invoice akan muncul setelah marketing membuat dan post sales order</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-gray-700 transition-colors"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">
                      Order ID: {invoice.order_id?.slice(0, 8).toUpperCase() || invoice.id.slice(0, 8)}
                    </h3>
                    <p className="text-gray-400 text-sm">Outlet: {invoice.outlet?.name || invoice.outlet_id}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium  whitespace-nowrap ${
                      invoice.status === 'posted'
                        ? 'bg-yellow-900 text-yellow-200'
                        : invoice.status === 'released'
                        ? 'bg-green-900 text-green-200'
                        : invoice.status === 'paid'
                        ? 'bg-blue-900 text-blue-200'
                        : 'bg-gray-700 text-gray-200'
                    }`}
                  >
                    {invoice.status}
                  </span>
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Amount:</span>
                    <span className="text-white font-semibold">
                      Rp {invoice.amount?.toLocaleString('id-ID') || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Created:</span>
                    <span className="text-white">
                      {new Date(invoice.created_at).toLocaleDateString('id-ID')}
                    </span>
                  </div>
                  {invoice.released_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Released:</span>
                      <span className="text-white">
                        {new Date(invoice.released_at).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                  )}
                </div>

                {invoice.notes && (
                  <div className="bg-gray-800 rounded p-2 text-xs text-gray-300 mb-4">
                    <p className="text-gray-400">Notes:</p>
                    <p>{invoice.notes}</p>
                  </div>
                )}

                {/* Packing Status */}
                {invoice.logistik_in_status && (
                  <div className="mb-4 p-2 bg-blue-900/30 rounded border border-blue-700 text-xs">
                    <p className="text-blue-400 font-semibold mb-1">
                      {invoice.logistik_in_status === 'terpacking' ? '✓ Sudah Terpacking' : 'Menunggu Packing'}
                    </p>
                    {invoice.logistik_in_status === 'terpacking' && invoice.packing_officer_name && (
                      <p className="text-blue-300">Petugas: {invoice.packing_officer_name}</p>
                    )}
                  </div>
                )}

                {/* Faktur Status */}
                {invoice.faktur_status && (
                  <div className="mb-4 p-2 bg-purple-900/30 rounded border border-purple-700 text-xs">
                    <p className="text-purple-400 font-semibold mb-1">
                      {invoice.faktur_status === 'terfaktur' ? '✓ Sudah Terfaktur' : 'Menunggu Faktur'}
                    </p>
                    {invoice.faktur_status === 'terfaktur' && invoice.faktur_officer_name && (
                      <p className="text-purple-300">Petugas: {invoice.faktur_officer_name}</p>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => openFakturModal(invoice)}
                    disabled={invoice.faktur_status === 'terfaktur'}
                    className={`flex-1 font-medium py-2 px-4 rounded-lg transition-colors text-sm ${
                      invoice.faktur_status === 'terfaktur'
                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                    }`}
                  >
                    {invoice.faktur_status === 'terfaktur' ? '✓ Terfaktur (Edit)' : '✓ Mark as Terfaktur'}
                  </button>
                  <button
                    onClick={() => router.push(`/fakturis/invoices/${invoice.id}`)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Faktur Modal */}
      {showFakturModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 w-full max-w-md">
            <h2 className="text-xl font-bold mb-2 text-white">
              {selectedInvoice.faktur_status === 'terfaktur' ? 'Edit Faktur' : 'Mark as Terfaktur'}
            </h2>
            <p className="text-gray-400 mb-6 text-sm">
              Order ID: {selectedInvoice.order_id?.slice(0, 8).toUpperCase()} - {selectedInvoice.outlet?.name || selectedInvoice.outlet_id}
            </p>

            {/* Error message */}
            {fakturError && (
              <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-4 text-sm">
                {fakturError}
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Nama Petugas Fakturis <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={fakturOfficerName}
                  onChange={(e) => setFakturOfficerName(e.target.value)}
                  placeholder="Masukkan nama petugas fakturis"
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Catatan (Optional)
                </label>
                <textarea
                  value={fakturNotes}
                  onChange={(e) => setFakturNotes(e.target.value)}
                  placeholder="Masukkan catatan faktur..."
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeFakturModal}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSaveFaktur}
                disabled={savingFaktur}
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {savingFaktur ? 'Menyimpan...' : 'Simpan Faktur'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
