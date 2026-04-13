'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks';
import { getReleasedInvoices, updateInvoicePackingStatus } from '@/lib/orders';
import { uploadStagingProducts, getStagingProducts, parseCsvData, StagingProduct } from '@/lib/products';
import { PageHeader } from '@/app/components/UIComponents';

interface Invoice {
  id: string;
  invoice_number: string;
  order_id: string;
  outlet_id: string;
  amount: number;
  status: string;
  logistik_in_status: string;
  packing_officer_name?: string;
  packing_notes?: string;
  faktur_status?: string;
  faktur_officer_name?: string;
  faktur_notes?: string;
  shipment_status?: string;
  expedisi_officer_name?: string;
  shipment_plan?: string;
  shipment_date?: string;
  delivery_status?: string;
  delivery_date?: string;
  delivery_notes?: string;
  released_at: string;
  outlet?: {
    id: string;
    name: string;
    NIO?: string;
  };
}

export default function AdminLogistikInPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  // Tab state
  const [currentTab, setCurrentTab] = useState<'packing'>('packing');
  
  // Packing states
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [packingOfficerName, setPackingOfficerName] = useState('');
  const [packingNotes, setPackingNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  


  useEffect(() => {
    console.log('useEffect triggered - user:', user);
    if (!user) {
      console.log('No user found - this might happen during initial auth check. User will redirect if still null after auth completes.');
      return;
    }
    console.log('User found, fetching data');
    
    if (currentTab === 'packing') {
      fetchInvoices();
    }
  }, [user, router, currentTab]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('Fetching released invoices...');
      const { data, error } = await getReleasedInvoices();
      console.log('getReleasedInvoices result:', { data, error });
      
      if (error) {
        console.error('Error from getReleasedInvoices:', error);
        setError(error);
      } else {
        console.log('Invoices loaded successfully:', data?.length || 0);
        setInvoices(data || []);
      }
    } catch (err) {
      console.error('Unexpected error in fetchInvoices:', err);
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const openPackingModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setPackingOfficerName(invoice.packing_officer_name || '');
    setPackingNotes(invoice.packing_notes || '');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedInvoice(null);
    setPackingOfficerName('');
    setPackingNotes('');
    setError('');
  };

  const handleSavePacking = async () => {
    if (!selectedInvoice) return;
    if (!packingOfficerName.trim()) {
      setError('Nama petugas packing wajib diisi');
      return;
    }

    try {
      setSaving(true);
      const { data, error } = await updateInvoicePackingStatus(
        selectedInvoice.id,
        packingOfficerName,
        packingNotes,
        user?.id || ''
      );

      if (error) {
        setError(error);
      } else {
        // Update local state
        setInvoices(invoices.map(inv => 
          inv.id === selectedInvoice.id 
            ? { ...data, outlet: selectedInvoice.outlet }
            : inv
        ));
        closeModal();
      }
    } catch (err) {
      console.error('Error:', err);
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const releasedCount = invoices.filter(inv => inv.logistik_in_status !== 'terpacking').length;
  const packedCount = invoices.filter(inv => inv.logistik_in_status === 'terpacking').length;

  // Show loading state while user is being fetched
  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <PageHeader title="Admin Logistik Masuk" subtitle="Packing & Verification" />

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          >
            ← Kembali ke Dashboard
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex gap-4 mb-6 border-b border-gray-800">
          <button
            onClick={() => setCurrentTab('packing')}
            className={`py-3 px-6 font-medium transition-colors ${
              currentTab === 'packing'
                ? 'border-b-2 border-blue-500 text-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            📦 Manajemen Packing
          </button>

        </div>

        {/* Manajemen Packing Tab */}
        {currentTab === 'packing' && (
          <div>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-900 rounded p-4">
                <div className="text-sm text-gray-400">Menunggu Packing</div>
                <div className="text-3xl font-bold text-red-500">{releasedCount}</div>
              </div>
              <div className="bg-gray-900 rounded p-4">
                <div className="text-sm text-gray-400">Sudah Terpacking</div>
                <div className="text-3xl font-bold text-green-500">{packedCount}</div>
              </div>
            </div>

            {error && (
              <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                Tidak ada invoice yang dirilis
              </div>
            ) : (
              <div className="space-y-4">
                {invoices.map(invoice => (
              <div
                key={invoice.id}
                className="bg-gray-900 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">
                      {invoice.outlet?.name || invoice.outlet_id} - {formatDate(invoice.released_at)}
                    </h3>
                    <p className="text-sm text-gray-400">
                      Order ID: {invoice.order_id?.slice(0, 8).toUpperCase()} (NIO: {invoice.outlet?.NIO || 'N/A'})
                    </p>
                  </div>
                  <div className="text-right">
                    {invoice.logistik_in_status === 'terpacking' ? (
                      <span className="inline-block bg-green-800 text-green-200 px-3 py-1 rounded text-sm font-semibold">
                        ✓ Terpacking
                      </span>
                    ) : (
                      <span className="inline-block bg-yellow-800 text-yellow-200 px-3 py-1 rounded text-sm font-semibold">
                        Menunggu
                      </span>
                    )}
                  </div>
                </div>

                {/* Invoice Details */}
                <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                  <div>
                    <span className="text-gray-400">Amount: </span>
                    <span className="font-semibold">
                      Rp {Number(invoice.amount).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Released: </span>
                    <span className="font-semibold">{formatDate(invoice.released_at)}</span>
                  </div>
                </div>

                {/* Packing Info */}
                {invoice.logistik_in_status === 'terpacking' && (
                  <div className="bg-gray-800 rounded p-3 mb-3 text-sm space-y-1">
                    <div>
                      <span className="text-gray-400">Petugas Packing: </span>
                      <span className="font-semibold">{invoice.packing_officer_name}</span>
                    </div>
                    {invoice.packing_notes && (
                      <div>
                        <span className="text-gray-400">Catatan: </span>
                        <span className="font-semibold">{invoice.packing_notes}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Faktur Status */}
                {invoice.faktur_status && (
                  <div className={`rounded p-3 mb-3 text-sm space-y-1 ${
                    invoice.faktur_status === 'terfaktur'
                      ? 'bg-purple-900/30 border border-purple-700'
                      : 'bg-gray-800'
                  }`}>
                    <div>
                      <span className={`${
                        invoice.faktur_status === 'terfaktur'
                          ? 'text-purple-400'
                          : 'text-gray-400'
                      }`}>
                        Status Faktur:
                      </span>
                      <span className={`font-semibold ml-2 ${
                        invoice.faktur_status === 'terfaktur'
                          ? 'text-purple-300'
                          : 'text-gray-300'
                      }`}>
                        {invoice.faktur_status === 'terfaktur' ? '✓ Sudah Terfaktur' : 'Menunggu Faktur'}
                      </span>
                    </div>
                    {invoice.faktur_status === 'terfaktur' && invoice.faktur_officer_name && (
                      <>
                        <div>
                          <span className="text-purple-400">Petugas: </span>
                          <span className="font-semibold text-purple-300">{invoice.faktur_officer_name}</span>
                        </div>
                        {invoice.faktur_notes && (
                          <div>
                            <span className="text-purple-400">Catatan: </span>
                            <span className="font-semibold text-purple-300">{invoice.faktur_notes}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Shipment Status */}
                {invoice.shipment_status && (
                  <div className={`rounded p-3 mb-3 text-sm space-y-1 ${
                    invoice.shipment_status === 'completed'
                      ? 'bg-green-900/30 border border-green-700'
                      : invoice.shipment_status === 'planned'
                      ? 'bg-amber-900/30 border border-amber-700'
                      : 'bg-gray-800'
                  }`}>
                    <div>
                      <span className={`${
                        invoice.shipment_status === 'completed'
                          ? 'text-green-400'
                          : invoice.shipment_status === 'planned'
                          ? 'text-amber-400'
                          : 'text-gray-400'
                      }`}>
                        Status Pengiriman:
                      </span>
                      <span className={`font-semibold ml-2 ${
                        invoice.shipment_status === 'completed'
                          ? 'text-green-300'
                          : invoice.shipment_status === 'planned'
                          ? 'text-amber-300'
                          : 'text-gray-300'
                      }`}>
                        {invoice.shipment_status === 'ready' ? '📦 Siap Kirim' : 
                         invoice.shipment_status === 'planned' ? '📋 Rencana Kirim' : 
                         invoice.shipment_status === 'completed' ? '✓ Selesai Kirim' : 
                         invoice.shipment_status}
                      </span>
                    </div>
                    {invoice.shipment_status === 'planned' && invoice.expedisi_officer_name && (
                      <>
                        <div>
                          <span className="text-amber-400">Petugas: </span>
                          <span className="font-semibold text-amber-300">{invoice.expedisi_officer_name}</span>
                        </div>
                        {invoice.shipment_plan && (
                          <div>
                            <span className="text-amber-400">Rencana: </span>
                            <span className="font-semibold text-amber-300">{invoice.shipment_plan}</span>
                          </div>
                        )}
                      </>
                    )}
                    {invoice.shipment_status === 'completed' && (
                      <div>
                        <span className="text-green-400">Tanggal Terkirim: </span>
                        <span className="font-semibold text-green-300">
                          {invoice.delivery_date ? new Date(invoice.delivery_date).toLocaleDateString('id-ID') : '-'}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {invoice.logistik_in_status === 'terpacking' ? (
                    <button
                      onClick={() => openPackingModal(invoice)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-semibold transition"
                    >
                      Edit Catatan Packing
                    </button>
                  ) : (
                    <button
                      onClick={() => openPackingModal(invoice)}
                      className="flex-1 bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-semibold transition"
                    >
                      Tandai Terpacking
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
          </div>
        )}

      </div>

      {/* Packing Modal */}
      {showModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md max-h-96 overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {selectedInvoice.logistik_in_status === 'terpacking' ? 'Edit' : 'Tandai'} Packing
            </h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold mb-2">Invoice</label>
                <div className="bg-gray-800 rounded px-3 py-2 text-sm">
                  {selectedInvoice.outlet?.name} - Order ID: {selectedInvoice.order_id?.slice(0, 8).toUpperCase()}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Nama Petugas Packing <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={packingOfficerName}
                  onChange={(e) => setPackingOfficerName(e.target.value)}
                  placeholder="Nama lengkap petugas"
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Catatan Packing</label>
                <textarea
                  value={packingNotes}
                  onChange={(e) => setPackingNotes(e.target.value)}
                  placeholder="Catatan packing (optional)"
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-900 border border-red-700 text-red-200 px-3 py-2 rounded mb-4 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={closeModal}
                disabled={saving}
                className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 px-4 py-2 rounded font-semibold transition"
              >
                Batal
              </button>
              <button
                onClick={handleSavePacking}
                disabled={saving}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 px-4 py-2 rounded font-semibold transition"
              >
                {saving ? 'Menyimpan...' : 'Simpan Packing'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
