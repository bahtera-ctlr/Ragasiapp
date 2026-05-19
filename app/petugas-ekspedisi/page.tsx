'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logOut } from '@/lib/auth';
import { getCompletedShipments } from '@/lib/orders';
import { useAuth, useRoleCheck } from '@/lib/hooks';
import { LoadingSpinner, PageHeader } from '@/app/components/UIComponents';
import ShippingBadge from '@/app/components/ShippingBadge';

type LogisticsInvoice = {
  id: string;
  outlet_id?: string;
  order_id?: string;
  outlet?: { name?: string; NIO?: string };
  packing_officer_name?: string;
  expedisi_officer_name?: string;
  amount?: number;
  logistik_in_status?: string;
  shipment_status?: string;
  status?: string;
  shipping_request?: unknown;
  delivery_status?: string;
  delivery_date?: string;
  delivery_notes?: string;
  packing_verified_at?: string;
  faktur_verified_at?: string;
  shipment_date?: string;
  [key: string]: unknown;
};

export default function PetugasExpedisiDashboard() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { hasAccess } = useRoleCheck(['petugas_ekspedisi', 'super_admin']);

  const [completedShipments, setCompletedShipments] = useState<LogisticsInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getCompletedShipments();
      if (result.error) {
        console.error(result.error);
      } else {
        setCompletedShipments(result.data || []);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loading || !hasAccess) return;
    fetchData();
  }, [loading, hasAccess, fetchData]);

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

  // Filter function
  const filteredShipments = completedShipments.filter(invoice => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const outletName = invoice.outlet?.name?.toLowerCase() || '';
    const orderId = invoice.order_id?.slice(0, 8).toUpperCase() || '';
    const officerName = (invoice.expedisi_officer_name || '').toLowerCase();
    const amount = invoice.amount?.toString() || '';
    return outletName.includes(query) || orderId.includes(query) || officerName.includes(query) || amount.includes(query);
  });

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Petugas Ekspedisi</h1>
            <p className="text-gray-400 text-sm">Riwayat Pengiriman Selesai</p>
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
          title="Riwayat Pengiriman Selesai"
          subtitle={`Total pengiriman terselesaikan: ${completedShipments.length}`}
        />

        {/* Search Input */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Cari berdasarkan outlet, order ID, petugas, atau jumlah..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="text-center py-12">
            <LoadingSpinner />
          </div>
        ) : filteredShipments.length === 0 ? (
          <div className="text-center py-12 bg-gray-900 rounded-lg border border-gray-800">
            <p className="text-gray-400 text-lg">
              {searchQuery ? '❌ Tidak ada hasil pencarian' : '📭 Tidak ada pengiriman terselesaikan'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredShipments.map((invoice) => (
              <div
                key={invoice.id}
                className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-blue-600 transition-colors"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">
                      {invoice.outlet?.name || invoice.outlet_id}
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                      Order ID: {invoice.order_id?.slice(0, 8).toUpperCase()} • NIO: {invoice.outlet?.NIO || '-'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${
                        invoice.delivery_status === 'terkirim'
                          ? 'bg-green-900 text-green-200'
                          : 'bg-red-900 text-red-200'
                      }`}
                    >
                      {invoice.delivery_status === 'terkirim' ? '✓ Terkirim' : '✗ Gagal Kirim'}
                    </span>
                    {!!invoice.shipping_request && (
                      <div className="mt-2">
                        <ShippingBadge shippingRequest={String(invoice.shipping_request)} size="sm" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4 pb-4 border-b border-gray-800">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Amount</p>
                    <p className="text-lg font-semibold text-green-400 mt-1">
                      Rp {invoice.amount?.toLocaleString('id-ID') || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Petugas Ekspedisi</p>
                    <p className="text-white font-semibold mt-1">{invoice.expedisi_officer_name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Tanggal Pengiriman</p>
                    <p className="text-white font-semibold mt-1">
                      {invoice.delivery_date 
                        ? new Date(String(invoice.delivery_date)).toLocaleDateString('id-ID', { 
                            day: '2-digit', 
                            month: 'short', 
                            year: 'numeric' 
                          })
                        : '-'}
                    </p>
                  </div>

                  {invoice.packing_verified_at && (
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Waktu Terpacking</p>
                      <p className="text-gray-300 mt-1">
                        {new Date(String(invoice.packing_verified_at)).toLocaleDateString('id-ID')} 
                        {' '}
                        {new Date(String(invoice.packing_verified_at)).toLocaleTimeString('id-ID', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  )}

                  {invoice.faktur_verified_at && (
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Waktu Faktur</p>
                      <p className="text-gray-300 mt-1">
                        {new Date(String(invoice.faktur_verified_at)).toLocaleDateString('id-ID')} 
                        {' '}
                        {new Date(String(invoice.faktur_verified_at)).toLocaleTimeString('id-ID', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  )}

                  {invoice.shipment_date && (
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Tanggal Rencana Kirim</p>
                      <p className="text-gray-300 mt-1">
                        {new Date(String(invoice.shipment_date)).toLocaleDateString('id-ID', { 
                          weekday: 'short', 
                          day: '2-digit', 
                          month: 'short'
                        })}
                      </p>
                    </div>
                  )}
                </div>

                {invoice.delivery_notes && (
                  <div className="bg-gray-800 rounded p-3">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Catatan Pengiriman</p>
                    <p className="text-gray-300 text-sm">
                      {typeof invoice.delivery_notes === 'string' 
                        ? invoice.delivery_notes 
                        : JSON.stringify(invoice.delivery_notes)}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
