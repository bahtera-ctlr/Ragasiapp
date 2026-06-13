'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logOut } from '@/lib/auth';
import { getReadyToShipInvoices, getPlannedShipments, getCompletedShipments, planShipment, updateShipmentDelivery } from '@/lib/orders';
import { uploadDeliveryImage, getDeliveryImages, type DeliveryImage } from '@/lib/delivery-images';
import { useAuth, useRoleCheck, useAutoRefresh } from '@/lib/hooks';
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
  faktur_number?: string;
  [key: string]: unknown;
};

const getInvoiceTitle = (invoice: LogisticsInvoice): string => {
  const outlet = invoice.outlet?.name || invoice.outlet_id || '-';
  if (invoice.faktur_number) return `${outlet} — ${invoice.faktur_number}`;
  return outlet;
};

export default function PetugasExpedisiDashboard() {
  const router = useRouter();
  const { user, userProfile, loading } = useAuth();
  const { hasAccess } = useRoleCheck(['admin_ekspedisi', 'super_admin']);

  const [tab, setTab] = useState<'ready' | 'planned' | 'completed'>('completed');
  const [readyToShip, setReadyToShip] = useState<LogisticsInvoice[]>([]);
  const [plannedShipments, setPlannedShipments] = useState<LogisticsInvoice[]>([]);
  const [completedShipments, setCompletedShipments] = useState<LogisticsInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search states
  const [searchReady, setSearchReady] = useState('');
  const [searchPlanned, setSearchPlanned] = useState('');
  const [searchCompleted, setSearchCompleted] = useState('');

  // Plan modal states
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<LogisticsInvoice | null>(null);
  const [expedisiOfficerName, setExpedisiOfficerName] = useState('');
  const [shipmentPlan, setShipmentPlan] = useState('');
  const [planError, setPlanError] = useState('');
  const [savingPlan, setSavingPlan] = useState(false);

  // Delivery modal states
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState<'terkirim' | 'gagal_kirim'>('terkirim');
  const [deliveryError, setDeliveryError] = useState('');
  const [savingDelivery, setSavingDelivery] = useState(false);
  const [deliveryPhoto, setDeliveryPhoto] = useState<File | null>(null);
  const [deliveryPhotoPreview, setDeliveryPhotoPreview] = useState<string | null>(null);
  // Catatan terstruktur
  const [penerima, setPenerima] = useState('');
  const [diCek, setDiCek] = useState(false);
  const [nomorFaktur, setNomorFaktur] = useState('');
  const [kemasanQ, setKemasanQ] = useState('');
  const [kemasanK, setKemasanK] = useState('');

  // Completed tab photo viewer
  const [completedPhotos, setCompletedPhotos] = useState<Record<string, DeliveryImage[]>>({});
  const [loadingPhotos, setLoadingPhotos] = useState<Record<string, boolean>>({});
  const [expandedPhotos, setExpandedPhotos] = useState<Record<string, boolean>>({});

  // Camera modal
  const [showCameraModal, setShowCameraModal] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const fetchData = useCallback(async () => {
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
  }, [tab]);

  useEffect(() => {
    if (loading || !hasAccess) return;
    fetchData();
  }, [loading, hasAccess, fetchData]);

  useAutoRefresh(fetchData, { enabled: !loading && hasAccess });

  // Filter functions
  const filterInvoices = (invoices: LogisticsInvoice[], search: string) => {
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

  const filteredReadyToShip = useMemo(() => filterInvoices(readyToShip, searchReady), [readyToShip, searchReady]);
  const filteredPlannedShipments = useMemo(() => filterInvoices(plannedShipments, searchPlanned), [plannedShipments, searchPlanned]);
  const filteredCompletedShipments = useMemo(() => filterInvoices(completedShipments, searchCompleted), [completedShipments, searchCompleted]);

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

  const openPlanModal = (invoice: LogisticsInvoice) => {
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

  const resetDeliveryForm = () => {
    setDeliveryStatus('terkirim');
    setDeliveryError('');
    setDeliveryPhoto(null);
    setDeliveryPhotoPreview(null);
    setPenerima('');
    setDiCek(false);
    setNomorFaktur('');
    setKemasanQ('');
    setKemasanK('');
  };

  const openDeliveryModal = (invoice: LogisticsInvoice) => {
    setSelectedInvoice(invoice);
    resetDeliveryForm();
    setShowDeliveryModal(true);
  };

  const closeDeliveryModal = () => {
    setShowDeliveryModal(false);
    setSelectedInvoice(null);
    resetDeliveryForm();
  };

  const compressImage = (file: File, maxMB: number = 1): Promise<File> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        let { width, height } = img;
        const maxDim = 1920;
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = Math.round((height * maxDim) / width); width = maxDim; }
          else { width = Math.round((width * maxDim) / height); height = maxDim; }
        }
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        const maxBytes = maxMB * 1024 * 1024;
        const tryQ = (q: number) => {
          canvas.toBlob((blob) => {
            if (!blob) return reject(new Error('Gagal kompres gambar'));
            if (blob.size <= maxBytes || q <= 0.1) {
              resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
            } else {
              tryQ(Math.round((q - 0.1) * 10) / 10);
            }
          }, 'image/jpeg', q);
        };
        tryQ(0.85);
      };
      img.onerror = reject;
      img.src = url;
    });

  const handleDeliveryPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDeliveryError('');
    try {
      const compressed = await compressImage(file, 1);
      setDeliveryPhoto(compressed);
      const reader = new FileReader();
      reader.onloadend = () => setDeliveryPhotoPreview(reader.result as string);
      reader.readAsDataURL(compressed);
    } catch {
      setDeliveryError('Gagal memproses gambar, coba pilih foto lain');
    }
  };

  const handleUpdateDelivery = async () => {
    if (!selectedInvoice || !user) return;

    if (!deliveryPhoto) {
      setDeliveryError('Foto bukti pengiriman wajib dilampirkan');
      return;
    }

    try {
      setSavingDelivery(true);

      const notesPayload = JSON.stringify({
        penerima: penerima.trim(),
        di_cek: diCek,
        nomor_faktur: nomorFaktur.trim(),
        kemasan_q: kemasanQ ? Number(kemasanQ) : 0,
        kemasan_k: kemasanK ? Number(kemasanK) : 0,
      });

      const { data, error } = await updateShipmentDelivery(
        selectedInvoice.id,
        deliveryStatus,
        notesPayload
      );

      if (error) {
        setDeliveryError(error);
        return;
      }

      const { error: photoError } = await uploadDeliveryImage(
        deliveryPhoto,
        selectedInvoice.id,
        user.id
      );

      if (photoError) {
        setDeliveryError(`Status berhasil disimpan, tapi foto gagal diupload: ${photoError}`);
        return;
      }

      console.log('Delivery updated:', data);
      setPlannedShipments(plannedShipments.filter(inv => inv.id !== selectedInvoice.id));
      closeDeliveryModal();
      alert('Status pengiriman & foto bukti berhasil disimpan!');
      fetchData();
    } catch (err) {
      console.error('Error:', err);
      setDeliveryError(String(err));
    } finally {
      setSavingDelivery(false);
    }
  };

  const openCamera = async () => {
    setDeliveryError('');
    setShowCameraModal(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setDeliveryError('Tidak bisa akses kamera. Pastikan izin kamera sudah diberikan.');
      setShowCameraModal(false);
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setShowCameraModal(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')!.drawImage(videoRef.current, 0, 0);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      stopCamera();
      const file = new File([blob], `foto-${Date.now()}.jpg`, { type: 'image/jpeg' });
      try {
        const compressed = await compressImage(file, 1);
        setDeliveryPhoto(compressed);
        const reader = new FileReader();
        reader.onloadend = () => setDeliveryPhotoPreview(reader.result as string);
        reader.readAsDataURL(compressed);
      } catch {
        setDeliveryError('Gagal memproses foto kamera');
      }
    }, 'image/jpeg', 0.92);
  };

  const toggleDeliveryPhotos = async (invoiceId: string) => {
    if (expandedPhotos[invoiceId]) {
      setExpandedPhotos(prev => ({ ...prev, [invoiceId]: false }));
      return;
    }
    setExpandedPhotos(prev => ({ ...prev, [invoiceId]: true }));
    if (completedPhotos[invoiceId]) return;
    setLoadingPhotos(prev => ({ ...prev, [invoiceId]: true }));
    const { data } = await getDeliveryImages(invoiceId);
    setCompletedPhotos(prev => ({ ...prev, [invoiceId]: data || [] }));
    setLoadingPhotos(prev => ({ ...prev, [invoiceId]: false }));
  };

  const handleLogout = async () => {
    await logOut();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Admin Ekspedisi Dashboard</h1>
            <p className="text-gray-400 text-sm">Kelola pengiriman & tracking shipment</p>
          </div>
          <div className="flex items-center gap-3">
            {userProfile?.role === 'super_admin' && (
              <button
                onClick={() => router.push('/admin-super')}
                className="bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-lg"
              >
                ← Super Admin
              </button>
            )}
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
                    className="bg-gray-900 border border-gray-800 rounded-lg p-4 cursor-pointer hover:border-blue-600 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-white">
                          {getInvoiceTitle(invoice)}
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">
                          Order ID: {invoice.order_id?.slice(0, 8).toUpperCase()} • NIO: {invoice.outlet?.NIO || '-'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {!!invoice.pb && (
                          <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-purple-700 text-white tracking-widest">PB</span>
                        )}
                        <span className="px-2 py-1 rounded-full text-xs font-semibold uppercase tracking-wide bg-green-900 text-green-200">
                          ✓ Siap Kirim
                        </span>
                        {!!invoice.shipping_request && (
                          <ShippingBadge shippingRequest={String(invoice.shipping_request)} size="sm" />
                        )}
                      </div>
                    </div>

                    <div className="mb-3 pb-3 border-b border-gray-800 text-sm">
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
                    className="bg-gray-900 border border-gray-800 rounded-lg p-4 cursor-pointer hover:border-blue-600 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-white">
                          {getInvoiceTitle(invoice)}
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">
                          Order ID: {invoice.order_id?.slice(0, 8).toUpperCase()} • Rencana: {new Date(String(invoice.shipment_date)).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                      <span className="px-2 py-1 rounded-full text-xs font-semibold uppercase tracking-wide bg-yellow-900 text-yellow-200">
                        🚚 Direncanakan
                      </span>
                      {!!invoice.shipping_request && (
                        <div className="ml-2">
                          <ShippingBadge shippingRequest={String(invoice.shipping_request)} size="sm" />
                        </div>
                      )}
                    </div>

                    <div className="mb-3 pb-3 border-b border-gray-800 text-sm">
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
                          {new Date(String(invoice.shipment_date)).toLocaleDateString('id-ID', { 
                            weekday: 'short', 
                            day: '2-digit', 
                            month: 'short', 
                            year: 'numeric' 
                          })}
                        </p>
                      </div>
                    </div>

                    {!!invoice.shipment_plan && (
                      <div className="bg-gray-800 rounded p-3 mb-4 text-sm">
                        <p className="text-gray-400 mb-1">Rencana Pengiriman:</p>
                        <p className="text-gray-300">{String(invoice.shipment_plan)}</p>
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
                    className="bg-gray-900 border border-gray-800 rounded-lg p-4 cursor-pointer hover:border-blue-600 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-white">
                          {getInvoiceTitle(invoice)}
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">
                          Order ID: {invoice.order_id?.slice(0, 8).toUpperCase()} • Status: {String(invoice.delivery_status)}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${
                          invoice.delivery_status === 'terkirim'
                            ? 'bg-green-900 text-green-200'
                            : 'bg-red-900 text-red-200'
                        }`}
                      >
                        {invoice.delivery_status === 'terkirim' ? '✓ Terkirim' : '✗ Gagal Kirim'}
                      </span>
                    </div>

                    <div className="mb-3 pb-3 border-b border-gray-800 text-sm">
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
                          {invoice.delivery_date ? `${new Date(String(invoice.delivery_date)).toLocaleDateString('id-ID')} ${new Date(String(invoice.delivery_date)).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}` : '-'}
                        </p>
                      </div>
                      {typeof invoice.packing_verified_at === 'string' && (
                        <div>
                          <p className="text-gray-400">Waktu Terpacking</p>
                          <p className="text-white font-semibold">
                            {new Date(invoice.packing_verified_at).toLocaleDateString('id-ID')} {new Date(invoice.packing_verified_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      )}
                      {typeof invoice.faktur_verified_at === 'string' && (
                        <div>
                          <p className="text-gray-400">Waktu Faktur</p>
                          <p className="text-white font-semibold">
                            {new Date(invoice.faktur_verified_at).toLocaleDateString('id-ID')} {new Date(invoice.faktur_verified_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-gray-400">Status</p>
                        <p className={`font-semibold ${
                          invoice.delivery_status === 'terkirim' ? 'text-green-300' : 'text-red-300'
                        }`}>
                          {invoice.delivery_status === 'terkirim' ? 'Sukses' : 'Gagal'}
                        </p>
                      </div>
                    </div>

                    {invoice.delivery_notes != null && (() => {
                      type ParsedNotes = { penerima?: string; di_cek?: boolean; nomor_faktur?: string; kemasan_q?: number; kemasan_k?: number };
                      let parsed: ParsedNotes | null = null;
                      try { parsed = JSON.parse(String(invoice.delivery_notes)) as ParsedNotes; } catch { /* plain text */ }
                      return parsed ? (
                        <div className="bg-gray-800 rounded-lg p-3 mb-2 text-sm space-y-1.5">
                          {parsed.penerima && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Penerima</span>
                              <span className="text-white font-medium">{String(parsed.penerima)}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-400">Di Cek</span>
                            <span className={`font-medium ${parsed.di_cek ? 'text-green-400' : 'text-red-400'}`}>
                              {parsed.di_cek ? 'Iya' : 'Tidak'}
                            </span>
                          </div>
                          {parsed.nomor_faktur && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">No. Faktur</span>
                              <span className="text-white font-medium">{String(parsed.nomor_faktur)}</span>
                            </div>
                          )}
                          {(Number(parsed.kemasan_q) > 0 || Number(parsed.kemasan_k) > 0) && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Kemasan</span>
                              <span className="text-white font-medium">
                                {Number(parsed.kemasan_q) > 0 && <span className="text-yellow-400">{String(parsed.kemasan_q)}Q </span>}
                                {Number(parsed.kemasan_k) > 0 && <span className="text-blue-400">{String(parsed.kemasan_k)}K</span>}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-gray-800 rounded p-3 mb-2 text-sm">
                          <p className="text-gray-400 mb-1">Catatan:</p>
                          <p className="text-gray-300">{String(invoice.delivery_notes)}</p>
                        </div>
                      );
                    })()}

                    <button
                      onClick={() => toggleDeliveryPhotos(invoice.id)}
                      className="w-full mt-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      {expandedPhotos[invoice.id] ? '▲ Sembunyikan Foto' : '📷 Lihat Foto Bukti'}
                    </button>

                    {expandedPhotos[invoice.id] && (
                      <div className="mt-3">
                        {loadingPhotos[invoice.id] ? (
                          <p className="text-gray-400 text-sm text-center py-2">Memuat foto...</p>
                        ) : completedPhotos[invoice.id]?.length > 0 ? (
                          <div className="grid grid-cols-2 gap-2">
                            {completedPhotos[invoice.id].map((img) => (
                              <a
                                key={img.id}
                                href={img.public_url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <img
                                  src={img.public_url}
                                  alt="Foto bukti pengiriman"
                                  className="w-full h-32 object-cover rounded border border-gray-700 hover:opacity-80 transition-opacity"
                                />
                              </a>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm text-center py-2">Tidak ada foto tersimpan</p>
                        )}
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
      {showPlanModal && selectedInvoice && !(!showPlanModal) && (
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
                  Foto Bukti Pengiriman <span className="text-red-500">*</span>
                </label>
                {/* Hidden input galeri */}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleDeliveryPhotoChange}
                  className="hidden"
                  id="delivery-gallery-input"
                />

                {deliveryPhotoPreview ? (
                  <div className="space-y-3">
                    <img
                      src={deliveryPhotoPreview}
                      alt="Preview foto pengiriman"
                      className="w-full max-h-52 object-contain rounded-lg border border-gray-700"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={openCamera}
                        className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors"
                      >
                        📷 Ambil Ulang
                      </button>
                      <label
                        htmlFor="delivery-gallery-input"
                        className="cursor-pointer flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors"
                      >
                        🖼️ Ganti Galeri
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={openCamera}
                      className="flex items-center justify-center gap-2 border border-gray-600 hover:border-blue-500 hover:bg-gray-800 rounded-lg py-2.5 text-sm font-medium text-gray-300 transition-colors"
                    >
                      📷 Kamera
                    </button>
                    <label
                      htmlFor="delivery-gallery-input"
                      className="cursor-pointer flex items-center justify-center gap-2 border border-gray-600 hover:border-blue-500 hover:bg-gray-800 rounded-lg py-2.5 text-sm font-medium text-gray-300 transition-colors"
                    >
                      🖼️ Galeri
                    </label>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">Auto-kompres maks 1MB</p>
              </div>

              {/* Catatan Terstruktur */}
              <div className="border border-gray-700 rounded-lg p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-300 mb-1">Catatan Pengiriman</p>

                {/* Penerima */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Penerima</label>
                  <input
                    type="text"
                    value={penerima}
                    onChange={(e) => setPenerima(e.target.value)}
                    placeholder="Nama penerima..."
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Di Cek */}
                <div>
                  <label className="block text-xs text-gray-400 mb-2">Di Cek</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setDiCek(false)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${!diCek ? 'bg-red-700 border-red-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500'}`}
                    >
                      Tidak
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiCek(true)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${diCek ? 'bg-green-700 border-green-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500'}`}
                    >
                      Iya
                    </button>
                  </div>
                </div>

                {/* Nomor Faktur */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Nomor Faktur</label>
                  <input
                    type="text"
                    value={nomorFaktur}
                    onChange={(e) => setNomorFaktur(e.target.value)}
                    placeholder="Nomor faktur..."
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Kemasan */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Kemasan</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      min="0"
                      value={kemasanQ}
                      onChange={(e) => setKemasanQ(e.target.value)}
                      placeholder="0"
                      className="w-20 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 text-center"
                    />
                    <span className="text-sm font-bold text-yellow-400">Q</span>
                    <span className="text-gray-500 text-xs">(Karton)</span>
                    <div className="w-px h-6 bg-gray-600 mx-1" />
                    <input
                      type="number"
                      min="0"
                      value={kemasanK}
                      onChange={(e) => setKemasanK(e.target.value)}
                      placeholder="0"
                      className="w-20 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 text-center"
                    />
                    <span className="text-sm font-bold text-blue-400">K</span>
                    <span className="text-gray-500 text-xs">(Kantong)</span>
                  </div>
                </div>
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
      {/* Camera Modal */}
      {showCameraModal && (
        <div className="fixed inset-0 bg-black z-[60] flex flex-col">
          <div className="flex justify-between items-center px-4 py-3 bg-gray-900">
            <h3 className="text-white font-semibold">Ambil Foto Bukti</h3>
            <button
              onClick={stopCamera}
              className="text-gray-400 hover:text-white text-sm px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 transition-colors"
            >
              ✕ Batal
            </button>
          </div>
          <div className="flex-1 relative overflow-hidden bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>
          <div className="bg-gray-900 px-6 py-6 flex justify-center">
            <button
              onClick={capturePhoto}
              className="w-20 h-20 rounded-full bg-white border-4 border-gray-400 hover:bg-gray-100 active:scale-95 transition-all shadow-lg flex items-center justify-center"
              aria-label="Ambil foto"
            >
              <div className="w-14 h-14 rounded-full bg-white border-2 border-gray-300" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

