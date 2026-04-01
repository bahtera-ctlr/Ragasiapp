'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logOut } from '@/lib/auth';
import { getReadyToShipInvoices, getPlannedShipments, getCompletedShipments, planShipment, updateShipmentDelivery } from '@/lib/orders';
import { useAuth, useRoleCheck } from '@/lib/hooks';
import { LoadingSpinner, PageHeader } from '@/app/components/UIComponents';

export default function AdminExpedisiDashboard() {
  const router = useRouter();
  const { user, userProfile, loading } = useAuth();
  const { hasAccess } = useRoleCheck(['admin_ekspedisi', 'super_admin']);

  const [tab, setTab] = useState<'ready' | 'planned' | 'completed'>('ready');
  const [readyToShip, setReadyToShip] = useState<any[]>([]);
  const [plannedShipments, setPlannedShipments] = useState<any[]>([]);
  const [completedShipments, setCompletedShipments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search states
  const [searchReady, setSearchReady] = useState('');
  const [searchPlanned, setSearchPlanned] = useState('');
  const [searchCompleted, setSearchCompleted] = useState('');

  // Modal states
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [expedisiOfficerName, setExpedisiOfficerName] = useState('');
  const [shipmentPlan, setShipmentPlan] = useState('');
  const [planError, setPlanError] = useState('');
  const [savingPlan, setSavingPlan] = useState(false);

  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState<'terkirim' | 'gagal_kirim'>('terkirim');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [deliveryError, setDeliveryError] = useState('');
  const [savingDelivery, setSavingDelivery] = useState(false);

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
      if (tab === 'ready') {
        const result = await getReadyToShipInvoices();
        if (result.error) {
          console.error(result.error);
        } else {
          setReadyToShip(result.data || []);
        }
      } else if (tab === 'planned') {
        const result = await getPlannedShipments();
        if (result.error) {
          console.error(result.error);
        } else {
          setPlannedShipments(result.data || []);
        }
      } else if (tab === 'completed') {
        const result = await getCompletedShipments();
        if (result.error) {
          console.error(result.error);
        } else {
          setCompletedShipments(result.data || []);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const openPlanModal = (invoice: any) => {
    setSelectedInvoice(invoice);
    setExpedisiOfficerName('');
    setShipmentPlan('');
    setPlanError('');
    setShowPlanModal(true);
  };

  const closePlanModal = () => {
    setShowPlanModal(false);
    setSelectedInvoice(null);
    setExpedisiOfficerName('');
    setShipmentPlan('');
    setPlanError('');
  };

  const handlePlanShipment = async () => {
    if (!selectedInvoice || !user) return;
    if (!expedisiOfficerName.trim()) {
      setPlanError('Nama petugas expedisi wajib diisi');
      return;
    }
    if (!shipmentPlan.trim()) {
      setPlanError('Rencana pengiriman wajib diisi');
      return;
    }

    try {
      setSavingPlan(true);
      const { data, error } = await planShipment(
        selectedInvoice.id,
        expedisiOfficerName,
        shipmentPlan,
        user.id
      );

      if (error) {
        setPlanError(error);
      } else {
        console.log('Shipment planned:', data);
        setReadyToShip(readyToShip.filter(inv => inv.id !== selectedInvoice.id));
        closePlanModal();
        alert('Pengiriman berhasil direncanakan!');
        fetchData();
      }
    } catch (err) {
      console.error('Error:', err);
      setPlanError(String(err));
    } finally {
      setSavingPlan(false);
    }
  };

  const openDeliveryModal = (invoice: any) => {
    setSelectedInvoice(invoice);
    setDeliveryStatus('terkirim');
    setDeliveryNotes('');
    setDeliveryError('');
    setShowDeliveryModal(true);
  };

  const closeDeliveryModal = () => {
    setShowDeliveryModal(false);
    setSelectedInvoice(null);
    setDeliveryStatus('terkirim');
    setDeliveryNotes('');
    setDeliveryError('');
  };

  const handleUpdateDelivery = async () => {
    if (!selectedInvoice || !user) return;

    try {
      setSavingDelivery(true);
      const { data, error } = await updateShipmentDelivery(
        selectedInvoice.id,
        deliveryStatus,
        deliveryNotes
      );

      if (error) {
        setDeliveryError(error);
      } else {
        console.log('Delivery updated:', data);
        setPlannedShipments(plannedShipments.filter(inv => inv.id !== selectedInvoice.id));
        closeDeliveryModal();
        alert('Status pengiriman berhasil diupdate!');
        fetchData();
      }
    } catch (err) {
      console.error('Error:', err);
      setDeliveryError(String(err));
    } finally {
      setSavingDelivery(false);
    }
  };

  const handleLogout = async () => {
    await logOut();
    router.push('/');
  };

  // Filter functions
  const filterInvoices = (invoices: any[], search: string) => {
    if (!search.trim()) return invoices;
    const query = search.toLowerCase();
    return invoices.filter(invoice => {
      const outletName = invoice.outlet?.name?.toLowerCase() || '';
      const orderId = invoice.order_id?.slice(0, 8).toUpperCase() || '';
      const officerName = (invoice.packing_officer_name || invoice.expedisi_officer_name || '').toLowerCase();
      const amount = invoice.amount?.toString() || '';
      return outletName.includes(query) || orderId.includes(query) || officerName.includes(query) || amount.includes(query);
    });
  };

  const filteredReadyToShip = filterInvoices(readyToShip, searchReady);
  const filteredPlannedShipments = filterInvoices(plannedShipments, searchPlanned);
  const filteredCompletedShipments = filterInvoices(completedShipments, searchCompleted);

  if (loading || !hasAccess) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Admin Ekspedisi</h1>
            <p className="text-gray-400 text-sm">Monitor Pengiriman & Delivery</p>
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
            onClick={() => setTab('ready')}
            className={`py-2 px-6 rounded-lg font-medium transition-colors ${
              tab === 'ready'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Barang Siap Kirim ({readyToShip.length})
          </button>
          <button
            onClick={() => setTab('planned')}
            className={`py-2 px-6 rounded-lg font-medium transition-colors ${
              tab === 'planned'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            List Kiriman ({plannedShipments.length})
          </button>
          <button
            onClick={() => setTab('completed')}
            className={`py-2 px-6 rounded-lg font-medium transition-colors ${
              tab === 'completed'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Selesai Kirim ({completedShipments.length})
          </button>
        </div>

        {/* Barang Siap Kirim Tab */}
        {tab === 'ready' && (
          <div>
            <PageHeader
              title="Barang Siap Kirim"
              subtitle={`Sudah terfaktur & terpacking, siap direncanakan pengiriman. Total: ${readyToShip.length}`}
            />

            <div className="mb-6">
              <input
                type="text"
                placeholder="Cari berdasarkan outlet, order ID, officer, atau amount..."
                value={searchReady}
                onChange={(e) => setSearchReady(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-gray-400">Loading...</div>
            ) : filteredReadyToShip.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p>{searchReady ? 'Tidak ada hasil pencarian' : 'Tidak ada barang siap kirim'}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredReadyToShip.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="bg-gray-900 border border-gray-800 rounded-lg p-6"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {invoice.outlet?.name || invoice.outlet_id}
                        </h3>
                        <p className="text-gray-400 text-sm">
                          Order ID: {invoice.order_id?.slice(0, 8).toUpperCase()} | NIO: {invoice.outlet?.NIO || '-'}
                        </p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-900 text-green-200">
                        ✓ Siap Kirim
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mb-4 text-sm">
                      <div>
                        <p className="text-gray-400">Amount</p>
                        <p className="text-white font-semibold">
                          Rp {invoice.amount?.toLocaleString('id-ID') || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Petugas Packing</p>
                        <p className="text-white font-semibold">{invoice.packing_officer_name || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Status Faktur</p>
                        <p className="text-purple-300 font-semibold">✓ Terfaktur</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Status Packing</p>
                        <p className="text-blue-300 font-semibold">✓ Terpacking</p>
                      </div>
                    </div>

                    <button
                      onClick={() => openPlanModal(invoice)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      📋 Rencanakan Pengiriman
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* List Kiriman Tab */}
        {tab === 'planned' && (
          <div>
            <PageHeader
              title="List Kiriman"
              subtitle={`Pengiriman yang sudah direncanakan. Total: ${plannedShipments.length}`}
            />

            <div className="mb-6">
              <input
                type="text"
                placeholder="Cari berdasarkan outlet, order ID, officer, atau amount..."
                value={searchPlanned}
                onChange={(e) => setSearchPlanned(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-gray-400">Loading...</div>
            ) : filteredPlannedShipments.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p>{searchPlanned ? 'Tidak ada hasil pencarian' : 'Tidak ada pengiriman yang direncanakan'}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPlannedShipments.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="bg-gray-900 border border-gray-800 rounded-lg p-6"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {invoice.outlet?.name || invoice.outlet_id}
                        </h3>
                        <p className="text-gray-400 text-sm">
                          Order ID: {invoice.order_id?.slice(0, 8).toUpperCase()} | Rencana: {new Date(invoice.shipment_date).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-900 text-yellow-200">
                        🚚 Direncanakan
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                      <div>
                        <p className="text-gray-400">Amount</p>
                        <p className="text-white font-semibold">
                          Rp {invoice.amount?.toLocaleString('id-ID') || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Petugas Expedisi</p>
                        <p className="text-white font-semibold">{invoice.expedisi_officer_name}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Tanggal Rencana</p>
                        <p className="text-white font-semibold">
                          {new Date(invoice.shipment_date).toLocaleDateString('id-ID', { 
                            weekday: 'short', 
                            day: '2-digit', 
                            month: 'short', 
                            year: 'numeric' 
                          })}
                        </p>
                      </div>
                    </div>

                    {invoice.shipment_plan && (
                      <div className="bg-gray-800 rounded p-3 mb-4 text-sm">
                        <p className="text-gray-400 mb-1">Rencana Pengiriman:</p>
                        <p className="text-gray-300">{invoice.shipment_plan}</p>
                      </div>
                    )}

                    <button
                      onClick={() => openDeliveryModal(invoice)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      ✓ Update Status Pengiriman
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Selesai Kirim Tab */}
        {tab === 'completed' && (
          <div>
            <PageHeader
              title="Selesai Kirim"
              subtitle={`Riwayat pengiriman terselesaikan. Total: ${completedShipments.length}`}
            />

            <div className="mb-6">
              <input
                type="text"
                placeholder="Cari berdasarkan outlet, order ID, officer, atau amount..."
                value={searchCompleted}
                onChange={(e) => setSearchCompleted(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-gray-400">Loading...</div>
            ) : filteredCompletedShipments.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p>{searchCompleted ? 'Tidak ada hasil pencarian' : 'Tidak ada pengiriman terselesaikan'}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredCompletedShipments.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="bg-gray-900 border border-gray-800 rounded-lg p-6"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {invoice.outlet?.name || invoice.outlet_id}
                        </h3>
                        <p className="text-gray-400 text-sm">
                          Order ID: {invoice.order_id?.slice(0, 8).toUpperCase()} | Status: {invoice.delivery_status}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          invoice.delivery_status === 'terkirim'
                            ? 'bg-green-900 text-green-200'
                            : 'bg-red-900 text-red-200'
                        }`}
                      >
                        {invoice.delivery_status === 'terkirim' ? '✓ Terkirim' : '✗ Gagal Kirim'}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mb-4 text-sm">
                      <div>
                        <p className="text-gray-400">Amount</p>
                        <p className="text-white font-semibold">
                          Rp {invoice.amount?.toLocaleString('id-ID') || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Petugas Expedisi</p>
                        <p className="text-white font-semibold">{invoice.expedisi_officer_name || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Tanggal Pengiriman</p>
                        <p className="text-white font-semibold">
                          {invoice.delivery_date ? new Date(invoice.delivery_date).toLocaleDateString('id-ID') : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Status</p>
                        <p className={`font-semibold ${
                          invoice.delivery_status === 'terkirim' ? 'text-green-300' : 'text-red-300'
                        }`}>
                          {invoice.delivery_status === 'terkirim' ? 'Sukses' : 'Gagal'}
                        </p>
                      </div>
                    </div>

                    {invoice.delivery_notes && (
                      <div className="bg-gray-800 rounded p-3 mb-2 text-sm">
                        <p className="text-gray-400 mb-1">Catatan:</p>
                        <p className="text-gray-300">{invoice.delivery_notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Plan Shipment Modal */}
      {showPlanModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 w-full max-w-md">
            <h2 className="text-xl font-bold mb-2 text-white">
              Rencanakan Pengiriman
            </h2>
            <p className="text-gray-400 mb-6 text-sm">
              {selectedInvoice.outlet?.name || selectedInvoice.outlet_id}
            </p>

            {planError && (
              <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-4 text-sm">
                {planError}
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Nama Petugas Expedisi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={expedisiOfficerName}
                  onChange={(e) => setExpedisiOfficerName(e.target.value)}
                  placeholder="Masukkan nama petugas expedisi"
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Rencana Pengiriman <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={shipmentPlan}
                  onChange={(e) => setShipmentPlan(e.target.value)}
                  placeholder="Masukkan rencana pengiriman (rute, jadwal, catatan khusus, dll)"
                  rows={4}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={closePlanModal}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handlePlanShipment}
                disabled={savingPlan}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {savingPlan ? 'Menyimpan...' : 'Simpan Rencana'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Delivery Modal */}
      {showDeliveryModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 w-full max-w-md">
            <h2 className="text-xl font-bold mb-2 text-white">
              Update Status Pengiriman
            </h2>
            <p className="text-gray-400 mb-6 text-sm">
              {selectedInvoice.outlet?.name || selectedInvoice.outlet_id}
            </p>

            {deliveryError && (
              <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-4 text-sm">
                {deliveryError}
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Status Pengiriman <span className="text-red-500">*</span>
                </label>
                <select
                  value={deliveryStatus}
                  onChange={(e) => setDeliveryStatus(e.target.value as 'terkirim' | 'gagal_kirim')}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="terkirim">✓ Terkirim</option>
                  <option value="gagal_kirim">✗ Gagal Kirim</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Catatan (Optional)
                </label>
                <textarea
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="Masukkan catatan pengiriman..."
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeDeliveryModal}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleUpdateDelivery}
                disabled={savingDelivery}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {savingDelivery ? 'Menyimpan...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
