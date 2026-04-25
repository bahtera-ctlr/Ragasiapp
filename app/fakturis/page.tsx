'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logOut } from '@/lib/auth';
import { getInvoices, updateInvoiceFakturStatus } from '@/lib/orders';
import { getEmployees, Employee } from '@/lib/employees';
import { useAuth, useRoleCheck } from '@/lib/hooks';
import { LoadingSpinner, PageHeader } from '@/app/components/UIComponents';
import ShippingBadge from '@/app/components/ShippingBadge';

type FakturInvoice = {
  id: string;
  amount?: number;
  notes?: string;
  faktur_officer_name?: string;
  faktur_notes?: string;
  outlet?: { name?: string; NIO?: string };
  outlet_id?: string;
  outlet_name?: string;
  invoice_number?: string;
  created_at?: string;
  status?: string;
  keuangan_notes?: string;
  order_id?: string;
  released_at?: string;
  logistik_in_status?: string;
  faktur_status?: string;
  shipping_request?: string | null;
  shipment_status?: string;
  packing_verified_at?: string;
  faktur_verified_at?: string;
  delivery_date?: string;
  packing_officer_name?: string;
  expedisi_officer_name?: string;
  [key: string]: unknown;
};

export default function FakturisDashboard() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { hasAccess } = useRoleCheck(['fakturis', 'super_admin']);

  const [invoices, setInvoices] = useState<FakturInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fakturTab, setFakturTab] = useState<'belum' | 'sudah'>('belum');

  // Modal state for faktur
  const [showFakturModal, setShowFakturModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<FakturInvoice | null>(null);
  const [fakturOfficerName, setFakturOfficerName] = useState('');
  const [fakturOfficerSearch, setFakturOfficerSearch] = useState('');
  const [showFakturDropdown, setShowFakturDropdown] = useState(false);
  const [fakturNotes, setFakturNotes] = useState('');
  const [savingFaktur, setSavingFaktur] = useState(false);
  const [fakturError, setFakturError] = useState('');

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  useEffect(() => {
    if (loading || !hasAccess) return;
    fetchInvoices();
    fetchEmployees();
  }, [loading, hasAccess]);

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

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const result = await getInvoices({ status: 'released' });
      console.log('Fakturis fetching released invoices:', result);
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

  const fetchEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const result = await getEmployees();
      if (result.error) {
        console.error('Error fetching employees:', result.error);
        setEmployees([]);
      } else {
        setEmployees(result.data || []);
      }
    } finally {
      setLoadingEmployees(false);
    }
  };

  const getEmployeeLabel = (employee: Employee) => {
    return employee.nama_karyawan || employee.nip || 'Nama tidak tersedia';
  };

  const filteredEmployees = fakturOfficerSearch.trim() === ''
    ? employees
    : employees.filter((emp) =>
        getEmployeeLabel(emp).toLowerCase().includes(fakturOfficerSearch.toLowerCase())
      );

  const openFakturModal = (invoice: FakturInvoice) => {
    if (!loadingEmployees && employees.length === 0) {
      fetchEmployees();
    }
    setSelectedInvoice(invoice);
    setFakturOfficerName(invoice.faktur_officer_name || '');
    setFakturOfficerSearch(invoice.faktur_officer_name || '');
    setShowFakturDropdown(false);
    setFakturNotes(invoice.faktur_notes || '');
    setFakturError('');
    setShowFakturModal(true);
  };

  const closeFakturModal = () => {
    setShowFakturModal(false);
    setSelectedInvoice(null);
    setFakturOfficerName('');
    setFakturOfficerSearch('');
    setShowFakturDropdown(false);
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

  // Filter invoices berdasarkan faktur status
  const belumDifakturkan = invoices.filter(inv => inv.faktur_status !== 'terfaktur');
  const sudahDifakturkan = invoices.filter(inv => inv.faktur_status === 'terfaktur');
  
  const displayedInvoices = fakturTab === 'belum' ? belumDifakturkan : sudahDifakturkan;
  const totalAmount = displayedInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);

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
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-gray-800">
          <button
            onClick={() => setFakturTab('belum')}
            className={`px-4 py-3 font-semibold text-sm transition-colors ${
              fakturTab === 'belum'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Belum Difakturkan ({belumDifakturkan.length})
          </button>
          <button
            onClick={() => setFakturTab('sudah')}
            className={`px-4 py-3 font-semibold text-sm transition-colors ${
              fakturTab === 'sudah'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Sudah Difakturkan ({sudahDifakturkan.length})
          </button>
        </div>

        <PageHeader
          title={fakturTab === 'belum' ? 'Belum Difakturkan' : 'Sudah Difakturkan'}
          subtitle={`Total: ${displayedInvoices.length} invoice | Total Amount: Rp ${totalAmount.toLocaleString('id-ID')}`}
        />

        {/* Invoice List */}
        {isLoading ? (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        ) : displayedInvoices.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg">Tidak ada invoice</p>
            <p className="text-sm">{fakturTab === 'belum' ? 'Semua invoice sudah difakturkan' : 'Belum ada invoice yang difakturkan'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedInvoices.map((invoice) => (
              <button
                key={invoice.id}
                type="button"
                onClick={() => openFakturModal(invoice)}
                className="w-full text-left bg-gray-900 border border-gray-800 rounded-lg p-4 cursor-pointer hover:border-blue-600 transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-white">
                      {String(invoice.outlet?.name || invoice.outlet_id)}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      {invoice.order_id?.slice(0, 8).toUpperCase() || invoice.id.slice(0, 8)} • {invoice.outlet?.NIO ? `NIO: ${invoice.outlet.NIO}` : `Outlet: ${String(invoice.outlet_id)}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-1 rounded-full text-xs font-semibold uppercase tracking-wide bg-green-900 text-green-200">
                      Released
                    </span>
                    {invoice.logistik_in_status === 'terpacking' && (
                      <span className="px-2 py-1 rounded-full text-xs font-semibold uppercase tracking-wide bg-blue-900 text-blue-200">
                        Packed
                      </span>
                    )}
                  </div>
                </div>

                <div className="mb-3 pb-3 border-b border-gray-800">
                  <p className="text-white font-bold text-lg">Rp {invoice.amount?.toLocaleString('id-ID') || 0}</p>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="px-2 py-1 rounded text-xs font-semibold whitespace-nowrap bg-gray-800 text-gray-300">
                    Released: {invoice.released_at ? new Date(invoice.released_at).toLocaleDateString('id-ID') : '-'}
                  </span>
                  {invoice.logistik_in_status && (
                    <span className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${
                      invoice.logistik_in_status === 'terpacking'
                        ? 'bg-blue-900 text-blue-200'
                        : 'bg-gray-800 text-gray-300'
                    }`}>
                      {invoice.logistik_in_status === 'terpacking' ? '📦 Packed' : '⏳ Packing'}
                    </span>
                  )}
                  {invoice.faktur_status && (
                    <span className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${
                      invoice.faktur_status === 'terfaktur'
                        ? 'bg-purple-900 text-purple-200'
                        : 'bg-gray-800 text-gray-300'
                    }`}>
                      {invoice.faktur_status === 'terfaktur' ? '📄 Invoiced' : '⏳ Invoicing'}
                    </span>
                  )}
                  {invoice.shipping_request && (
                    <ShippingBadge shippingRequest={invoice.shipping_request} size="sm" />
                  )}
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
                      {invoice.shipment_status === 'ready' ? '🚚 Ready' : invoice.shipment_status === 'planned' ? '📋 Planned' : invoice.shipment_status === 'completed' ? '✓ Shipped' : 'Pending'}
                    </span>
                  )}
                </div>

                <div className="space-y-1 text-xs text-gray-400 mb-3">
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

                {invoice.faktur_verified_at && (
                  <div className="mt-2 text-xs text-gray-400">
                    Faktur selesai: <span className="text-white">{new Date(invoice.faktur_verified_at).toLocaleDateString('id-ID')} {new Date(invoice.faktur_verified_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                )}

                {invoice.notes && (
                  <div className="mt-3 bg-gray-800 rounded p-3 text-sm text-gray-300">
                    <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Catatan Finance</div>
                    <div>{invoice.notes}</div>
                  </div>
                )}
              </button>
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
            <p className="text-gray-400 mb-4 text-sm">
              Order ID: {selectedInvoice.order_id?.slice(0, 8).toUpperCase()} - {selectedInvoice.outlet?.name || selectedInvoice.outlet_id}
            </p>

            <div className="mb-6 rounded-lg border border-gray-800 bg-gray-950 p-4 text-sm space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs uppercase tracking-wider text-gray-500">Amount</div>
                  <div className="text-white font-semibold">Rp {selectedInvoice.amount?.toLocaleString('id-ID') || 0}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-gray-500">Released</div>
                  <div className="text-white">{selectedInvoice.released_at ? new Date(selectedInvoice.released_at).toLocaleDateString('id-ID') : '-'}</div>
                </div>
              </div>

              {selectedInvoice.outlet?.NIO && (
                <div className="text-xs uppercase tracking-wider text-gray-500">NIO</div>
              )}
              {selectedInvoice.outlet?.NIO && (
                <div className="text-white">{selectedInvoice.outlet.NIO}</div>
              )}

              {selectedInvoice.notes && (
                <div className="rounded border border-gray-800 bg-gray-900 p-3">
                  <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Catatan Finance</div>
                  <div className="text-gray-200 text-sm">{selectedInvoice.notes}</div>
                </div>
              )}

              {selectedInvoice.logistik_in_status && (
                <div className="rounded border border-gray-800 bg-blue-950 p-3">
                  <div className="text-xs uppercase tracking-wider text-blue-300 mb-1">Packing Status</div>
                  <div className="text-gray-200 text-sm">
                    {selectedInvoice.logistik_in_status === 'terpacking' ? '✓ Sudah Terpacking' : 'Menunggu Packing'}
                    {selectedInvoice.packing_officer_name ? ` — Petugas: ${selectedInvoice.packing_officer_name}` : ''}
                  </div>
                  {selectedInvoice.packing_verified_at && (
                    <div className="mt-2 text-sm text-blue-200">
                      Waktu Terpacking: {new Date(selectedInvoice.packing_verified_at).toLocaleDateString('id-ID')} {new Date(selectedInvoice.packing_verified_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              )}

              {selectedInvoice.shipment_status && (
                <div className="rounded border border-gray-800 bg-amber-950 p-3">
                  <div className="text-xs uppercase tracking-wider text-amber-300 mb-1">Shipment Status</div>
                  <div className="text-gray-200 text-sm">
                    {selectedInvoice.shipment_status === 'ready' ? '📦 Siap Kirim' : 
                     selectedInvoice.shipment_status === 'planned' ? '📋 Rencana Kirim' : 
                     selectedInvoice.shipment_status === 'completed' ? '✓ Selesai Kirim' : 
                     selectedInvoice.shipment_status}
                    {selectedInvoice.expedisi_officer_name ? ` — Petugas: ${selectedInvoice.expedisi_officer_name}` : ''}
                  </div>
                  {selectedInvoice.delivery_date && (
                    <div className="mt-2 text-sm text-amber-200">
                      Waktu Terkirim: {new Date(selectedInvoice.delivery_date).toLocaleDateString('id-ID')} {new Date(selectedInvoice.delivery_date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {selectedInvoice.faktur_verified_at && (
              <div className="mt-3 rounded border border-purple-800 bg-purple-950 p-3 text-sm text-purple-200">
                Waktu Faktur: {new Date(selectedInvoice.faktur_verified_at).toLocaleDateString('id-ID')} {new Date(selectedInvoice.faktur_verified_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}

            {/* Error message */}
            {fakturError && (
              <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-4 text-sm">
                {fakturError}
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div className="relative">
                <label className="block text-sm font-semibold mb-2">
                  Nama Petugas Fakturis <span className="text-red-500">*</span>
                </label>
                {loadingEmployees ? (
                  <div className="text-sm text-gray-400">Memuat daftar karyawan...</div>
                ) : employees.length === 0 ? (
                  <div className="text-sm text-red-400">Tidak ada data karyawan. Silakan periksa halaman Keuangan.</div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={fakturOfficerSearch || fakturOfficerName}
                      onChange={(e) => {
                        setFakturOfficerSearch(e.target.value);
                        setShowFakturDropdown(true);
                      }}
                      onFocus={() => setShowFakturDropdown(true)}
                      placeholder="Ketik nama karyawan..."
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                    {showFakturDropdown && (
                      <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded border border-gray-700 bg-gray-900 text-white shadow-lg">
                        {(filteredEmployees.length > 0 ? filteredEmployees : employees).map((emp) => (
                          <button
                            key={emp.id}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              const selectedName = getEmployeeLabel(emp);
                              setFakturOfficerName(selectedName);
                              setFakturOfficerSearch('');
                              setShowFakturDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-blue-600"
                          >
                            {getEmployeeLabel(emp)}
                          </button>
                        ))}
                        {filteredEmployees.length === 0 && employees.length === 0 && (
                          <div className="px-3 py-2 text-sm text-gray-400">Tidak ada karyawan ditemukan</div>
                        )}
                      </div>
                    )}
                  </>
                )}
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
