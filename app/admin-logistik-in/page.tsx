'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks';
import { getReleasedInvoices, updateInvoicePackingStatus } from '@/lib/orders';
import { getEmployees, Employee } from '@/lib/employees';
import { PageHeader } from '@/app/components/UIComponents';
import ShippingBadge from '@/app/components/ShippingBadge';
import { jsPDF } from 'jspdf';

interface InvoiceItem {
  product_name?: string;
  nama_barang?: string;
  name?: string;
  qty?: number;
  quantity?: number;
  price?: number;
  harga?: number;
  subtotal?: number;
  customName?: string;
  customPrice?: number;
  product?: {
    name?: string;
    price?: number;
  };
  [key: string]: unknown;
}

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
  packing_verified_at?: string;
  faktur_status?: string;
  faktur_officer_name?: string;
  faktur_notes?: string;
  faktur_verified_at?: string;
  shipment_status?: string;
  expedisi_officer_name?: string;
  shipment_plan?: string;
  shipment_date?: string;
  delivery_status?: string;
  delivery_date?: string;
  delivery_notes?: string;
  released_at: string;
  items?: InvoiceItem[];
  outlet?: {
    id: string;
    name: string;
    nio?: string;
    me?: string;
  };
  shipping_request?: string;
}

export default function AdminLogisticInPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  // Tab state - now supports 'packing-order' and 'dropshipment'
  const [currentTab, setCurrentTab] = useState<'packing-order' | 'dropshipment'>('packing-order');
  
  // Packing states
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [packingOfficerName, setPackingOfficerName] = useState('');
  const [packingOfficerSearch, setPackingOfficerSearch] = useState('');
  const [showPackingDropdown, setShowPackingDropdown] = useState(false);
  const [packingNotes, setPackingNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Dropshipment modal states
  const [showDropshipmentModal, setShowDropshipmentModal] = useState(false);
  const [selectedDropshipmentInvoice, setSelectedDropshipmentInvoice] = useState<Invoice | null>(null);
  const [expedisiOfficerName, setExpedisiOfficerName] = useState('');
  const [expedisiOfficerSearch, setExpedisiOfficerSearch] = useState('');
  const [showExpedisiDropdown, setShowExpedisiDropdown] = useState(false);
  const [dropshipmentError, setDropshipmentError] = useState('');
  const [dropshipmentSaving, setDropshipmentSaving] = useState(false);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  const getEmployeeLabel = (employee: Employee) => {
    return employee.nama_karyawan || employee.nip || 'Nama tidak tersedia';
  };

  // Filter employees based on search
  const filteredEmployeesForPacking = employees.filter(emp =>
    getEmployeeLabel(emp).toLowerCase().includes(packingOfficerSearch.toLowerCase())
  );

  const filteredEmployeesForExpedisi = employees.filter(emp =>
    getEmployeeLabel(emp).toLowerCase().includes(expedisiOfficerSearch.toLowerCase())
  );


  useEffect(() => {
    console.log('useEffect triggered - user:', user);
    if (!user) {
      console.log('No user found - this might happen during initial auth check. User will redirect if still null after auth completes.');
      return;
    }
    console.log('User found, fetching data');
    fetchInvoices();
    fetchEmployees();
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

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const { data, error } = await getEmployees();
      if (error) {
        console.error('Error fetching employees:', error);
        setEmployees([]);
      } else {
        setEmployees(data || []);
      }
    } catch (err) {
      console.error('Unexpected error fetching employees:', err);
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  // Only show released invoices in the Logistic-In page
  const releasedInvoices = invoices.filter(inv => inv.status?.toLowerCase() === 'released');
  const packingOrderInvoices = releasedInvoices.filter(inv => inv.logistik_in_status !== 'terpacking');
  const dropshipmentInvoices = releasedInvoices.filter(inv => inv.logistik_in_status === 'terpacking');

  const openPackingModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setPackingOfficerName(invoice.packing_officer_name || '');
    setPackingOfficerSearch(invoice.packing_officer_name || '');
    setShowPackingDropdown(false);
    setPackingNotes(invoice.packing_notes || '');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedInvoice(null);
    setPackingOfficerName('');
    setPackingOfficerSearch('');
    setShowPackingDropdown(false);
    setPackingNotes('');
    setError('');
  };

  const openDropshipmentModal = (invoice: Invoice) => {
    setSelectedDropshipmentInvoice(invoice);
    setExpedisiOfficerName(invoice.expedisi_officer_name || '');
    setExpedisiOfficerSearch(invoice.expedisi_officer_name || '');
    setShowExpedisiDropdown(false);
    setShowDropshipmentModal(true);
  };

  const closeDropshipmentModal = () => {
    setShowDropshipmentModal(false);
    setSelectedDropshipmentInvoice(null);
    setExpedisiOfficerName('');
    setExpedisiOfficerSearch('');
    setShowExpedisiDropdown(false);
    setDropshipmentError('');
  };

  const handleDropshipmentSubmit = async () => {
    if (!selectedDropshipmentInvoice) return;
    if (!expedisiOfficerName.trim()) {
      setDropshipmentError('Nama petugas ekspedisi wajib diisi');
      return;
    }

    try {
      setDropshipmentSaving(true);
      // Change shipment_status from null/ready to 'planned' when assigning to expedisi officer
      const { data, error } = await updateInvoicePackingStatus(
        selectedDropshipmentInvoice.id,
        selectedDropshipmentInvoice.packing_officer_name || '',
        selectedDropshipmentInvoice.packing_notes || '',
        user?.id || '',
        expedisiOfficerName,
        'planned'  // Set shipment status to planned
      );

      if (error) {
        setDropshipmentError(error);
      } else {
        // Update local state
        setInvoices(invoices.map(inv => 
          inv.id === selectedDropshipmentInvoice.id 
            ? { ...data, outlet: selectedDropshipmentInvoice.outlet }
            : inv
        ));
        closeDropshipmentModal();
      }
    } catch (err) {
      console.error('Error:', err);
      setDropshipmentError(String(err));
    } finally {
      setDropshipmentSaving(false);
    }
  };


  const handleSavePacking = async () => {
    if (!selectedInvoice) return;
    if (!packingOfficerName.trim()) {
      setError('Nama petugas packing wajib diisi');
      return;
    }

    try {
      setSaving(true);
      const preservePackingTime = selectedInvoice.logistik_in_status === 'terpacking' && !!selectedInvoice.packing_verified_at;
      const { data, error } = await updateInvoicePackingStatus(
        selectedInvoice.id,
        packingOfficerName,
        packingNotes,
        user?.id || '',
        undefined,
        undefined,
        preservePackingTime
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

  const parseInvoiceItems = (invoice: Invoice) => {
    if (!invoice?.items) return [];
    if (Array.isArray(invoice.items)) return invoice.items;
    if (typeof invoice.items === 'string') {
      try {
        return JSON.parse(invoice.items);
      } catch (err) {
        console.error('Unable to parse invoice items:', err);
        return [];
      }
    }
    return [];
  };

  const formatOrderId = (orderId?: string) => {
    if (!orderId) return 'N/A';
    return orderId.slice(0, 8).toUpperCase();
  };

  const getInvoiceHeaderTitle = (invoice: Invoice) => {
    const outletName = invoice.outlet?.name || 'Outlet Tidak Diketahui';
    const orderLabel = invoice.invoice_number || formatOrderId(invoice.order_id);
    return `${outletName} - ${orderLabel}`;
  };

  const handleDownloadInvoicePDF = (invoice: Invoice) => {
    const items = parseInvoiceItems(invoice);
    if (!items || items.length === 0) {
      alert('Invoice ini belum memiliki detail barang. Pastikan order sudah berisi item.');
      return;
    }

    try {
      const outlet = invoice.outlet || ({} as { name?: string; me?: string; nio?: string });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      let yPosition = 20;
      const margin = 15;
      const lineHeight = 7;

      pdf.setFontSize(16);
      pdf.setFont('', 'bold');
      pdf.text('INVOICE LOGISTIK', margin, yPosition);
      yPosition += lineHeight + 4;

      pdf.setFontSize(10);
      pdf.setFont('', 'normal');
      pdf.text(`Outlet: ${outlet.name || 'N/A'}`, margin, yPosition);
      yPosition += lineHeight;
      pdf.text(`ME: ${outlet.me || 'N/A'}`, margin, yPosition);
      yPosition += lineHeight;
      pdf.text(`Order ID: ${formatOrderId(invoice.order_id)}`, margin, yPosition);
      yPosition += lineHeight;
      pdf.text(`Tanggal: ${formatDate(invoice.released_at)}`, margin, yPosition);
      yPosition += lineHeight + 2;

      pdf.setDrawColor(0);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 6;

      pdf.setFontSize(11);
      pdf.setFont('', 'bold');
      pdf.text('DETAIL BARANG', margin, yPosition);
      yPosition += lineHeight + 2;

      pdf.setFontSize(9);
      pdf.setFont('', 'bold');
      const col1 = margin;
      const col2 = margin + 70;
      const col3 = pageWidth - margin - 35;
      const col4 = pageWidth - margin;
      pdf.text('No', col1, yPosition);
      pdf.text('Produk', col2, yPosition);
      pdf.text('Qty', col3, yPosition, { align: 'right' });
      pdf.text('Subtotal', col4, yPosition, { align: 'right' });
      yPosition += lineHeight;
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 4;

      pdf.setFont('', 'normal');
      let total = 0;
      items.forEach((item: InvoiceItem, idx: number) => {
        const itemName = item.product_name || item.nama_barang || item.name || item.customName || item.product?.name || 'Unknown';
        const qty = item.qty || item.quantity || 0;
        const price = item.price || item.harga || item.product?.price || item.customPrice || 0;
        const subtotal = item.subtotal || qty * price;
        total += subtotal;

        const nameLines = pdf.splitTextToSize(itemName, 70);
        const rowHeight = Math.max(nameLines.length * 4, lineHeight);

        if (yPosition + rowHeight > 280) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFontSize(9);
        pdf.text(`${idx + 1}`, col1, yPosition);
        nameLines.forEach((line: string, lineIndex: number) => {
          pdf.text(line, col2, yPosition + lineIndex * 4);
        });
        pdf.text(`${qty}`, col3, yPosition, { align: 'right' });
        pdf.text(`Rp ${subtotal.toLocaleString('id-ID')}`, col4, yPosition, { align: 'right' });
        yPosition += rowHeight;
      });

      yPosition += 4;
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 6;
      pdf.setFont('', 'bold');
      pdf.text(`TOTAL: Rp ${total.toLocaleString('id-ID')}`, pageWidth - margin, yPosition, { align: 'right' });

      const fileName = `INVOICE_${outlet.name || 'OUTLET'}_${formatOrderId(invoice.order_id)}.pdf`;
      pdf.save(fileName.replace(/\s+/g, '_'));
    } catch (err) {
      console.error('Error generating invoice PDF:', err);
      alert('Gagal membuat PDF invoice.');
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
        <PageHeader title="Admin Logistic-In" subtitle="Packing & Verification" />

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
            onClick={() => setCurrentTab('packing-order')}
            className={`py-3 px-6 font-medium transition-colors ${
              currentTab === 'packing-order'
                ? 'border-b-2 border-blue-500 text-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            📦 Packing Order ({packingOrderInvoices.length})
          </button>
          <button
            onClick={() => setCurrentTab('dropshipment')}
            className={`py-3 px-6 font-medium transition-colors ${
              currentTab === 'dropshipment'
                ? 'border-b-2 border-blue-500 text-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            🚚 Dropshipment ({dropshipmentInvoices.length})
          </button>
        </div>

        {/* Packing Order Tab */}
        {currentTab === 'packing-order' && (
          <div>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-900 rounded p-4">
                <div className="text-sm text-gray-400">Total Packing Order</div>
                <div className="text-3xl font-bold text-red-500">{packingOrderInvoices.length}</div>
              </div>
              <div className="bg-gray-900 rounded p-4">
                <div className="text-sm text-gray-400">Siap Dropshipment</div>
                <div className="text-3xl font-bold text-green-500">{dropshipmentInvoices.length}</div>
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
            ) : packingOrderInvoices.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                Tidak ada packing order. Semua invoice sudah terpacking!
              </div>
            ) : (
              <div className="space-y-4">
                {packingOrderInvoices.map(invoice => (
              <div
                key={invoice.id}
                className="bg-gray-900 border border-gray-800 rounded-lg p-4 cursor-pointer hover:border-blue-600 transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-white">
                      {getInvoiceHeaderTitle(invoice)}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      Order ID: {formatOrderId(invoice.order_id)} • NIO: {invoice.outlet?.nio || 'N/A'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-1 rounded-full text-xs font-semibold uppercase tracking-wide bg-blue-600 text-white">
                      Released
                    </span>
                    {invoice.logistik_in_status === 'terpacking' ? (
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-800 text-green-200">
                        ✓ Terpacking
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-800 text-yellow-200">
                        Menunggu
                      </span>
                    )}
                  </div>
                </div>

                {/* Invoice Details */}
                <div className="mb-3 pb-3 border-b border-gray-800 text-sm">
                  <div className="grid grid-cols-2 gap-4">
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
                </div>

                <div className="mb-3 text-sm text-gray-400 space-y-1">
                  {invoice.packing_verified_at && (
                    <div>
                      <span className="text-gray-400">Waktu Terpacking: </span>
                      <span className="font-semibold text-white">{formatDate(invoice.packing_verified_at)}</span>
                    </div>
                  )}
                  {invoice.faktur_verified_at && (
                    <div>
                      <span className="text-purple-400">Waktu Faktur: </span>
                      <span className="font-semibold text-white">{formatDate(invoice.faktur_verified_at)}</span>
                    </div>
                  )}
                  {invoice.delivery_date && (
                    <div>
                      <span className="text-amber-400">Waktu Terkirim: </span>
                      <span className="font-semibold text-white">{new Date(invoice.delivery_date).toLocaleDateString('id-ID')} {new Date(invoice.delivery_date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
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

                {/* Shipping Request Badge */}
                {invoice.shipping_request && (
                  <div className="mb-3">
                    <ShippingBadge shippingRequest={invoice.shipping_request} size="sm" />
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
                <div className="flex flex-col md:flex-row gap-2">
                  <button
                    onClick={() => handleDownloadInvoicePDF(invoice)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded font-semibold transition"
                  >
                    📥 Download Invoice
                  </button>
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
        {/* Dropshipment Tab */}
        {currentTab === 'dropshipment' && (
          <div>
            {/* Stats */}
            <div className="grid grid-cols-1 gap-4 mb-6">
              <div className="bg-gray-900 rounded p-4">
                <div className="text-sm text-gray-400">Total Siap Dropshipment</div>
                <div className="text-3xl font-bold text-green-500">{dropshipmentInvoices.length}</div>
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
            ) : dropshipmentInvoices.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                Tidak ada packing yang siap untuk dropshipment
              </div>
            ) : (
              <div className="space-y-4">
                {dropshipmentInvoices.map(invoice => (
                  <div
                    key={invoice.id}
                    className="bg-gray-900 border border-gray-800 rounded-lg p-4 cursor-pointer hover:border-blue-600 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-white">
                          {getInvoiceHeaderTitle(invoice)}
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">
                          Order ID: {formatOrderId(invoice.order_id)} • NIO: {invoice.outlet?.nio || 'N/A'}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-1 rounded-full text-xs font-semibold uppercase tracking-wide bg-blue-600 text-white">
                          Released
                        </span>
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-800 text-green-200">
                          ✓ Terpacking
                        </span>
                      </div>
                    </div>

                    {/* Invoice Details */}
                    <div className="mb-3 pb-3 border-b border-gray-800 text-sm">
                      <div className="grid grid-cols-2 gap-4">
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
                    </div>
                    <div className="mb-3 text-sm text-gray-400 space-y-1">
                      {invoice.packing_verified_at && (
                        <div>
                          <span className="text-gray-400">Waktu Terpacking: </span>
                          <span className="font-semibold text-white">{formatDate(invoice.packing_verified_at)}</span>
                        </div>
                      )}
                      {invoice.faktur_verified_at && (
                        <div>
                          <span className="text-purple-400">Waktu Faktur: </span>
                          <span className="font-semibold text-white">{formatDate(invoice.faktur_verified_at)}</span>
                        </div>
                      )}
                      {invoice.delivery_date && (
                        <div>
                          <span className="text-amber-400">Waktu Terkirim: </span>
                          <span className="font-semibold text-white">{new Date(invoice.delivery_date).toLocaleDateString('id-ID')} {new Date(invoice.delivery_date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      )}
                    </div>

                    {/* Packing Info */}
                    <div className="bg-gray-800 rounded p-3 mb-3 text-sm space-y-1">
                      <div>
                        <span className="text-gray-400">Petugas Packing: </span>
                        <span className="font-semibold">{invoice.packing_officer_name}</span>
                      </div>
                      {invoice.packing_verified_at && (
                        <div>
                          <span className="text-gray-400">Waktu Terpacking: </span>
                          <span className="font-semibold">{formatDate(invoice.packing_verified_at)}</span>
                        </div>
                      )}
                      {invoice.packing_notes && (
                        <div>
                          <span className="text-gray-400">Catatan: </span>
                          <span className="font-semibold">{invoice.packing_notes}</span>
                        </div>
                      )}
                    </div>
                    {/* Action Buttons */}
                    <div className="flex flex-col md:flex-row gap-2">
                      <button
                        onClick={() => handleDownloadInvoicePDF(invoice)}
                        className="flex-1 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded font-semibold transition"
                      >
                        📥 Download Invoice
                      </button>
                      <button
                        onClick={() => openDropshipmentModal(invoice)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-semibold transition"
                      >
                        {invoice.expedisi_officer_name ? '✏️ Edit Expedisi' : '🚚 Serah ke Expedisi'}
                      </button>
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
                  {getInvoiceHeaderTitle(selectedInvoice)}
                </div>
              </div>

              {selectedInvoice.logistik_in_status === 'terpacking' && selectedInvoice.packing_verified_at && (
                <div className="bg-gray-800 rounded p-3 text-sm">
                  <span className="text-gray-400">Waktu Terpacking: </span>
                  <span className="font-semibold">{formatDate(selectedInvoice.packing_verified_at)}</span>
                </div>
              )}

              <div className="relative">
                <label className="block text-sm font-semibold mb-2">
                  Nama Petugas Packing <span className="text-red-500">*</span>
                </label>
                {loadingEmployees ? (
                  <div className="text-sm text-gray-400">Memuat daftar karyawan...</div>
                ) : employees.length === 0 ? (
                  <div className="text-sm text-red-400">Tidak ada data karyawan. Silakan periksa halaman Keuangan.</div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={packingOfficerSearch || packingOfficerName}
                      onChange={(e) => {
                        setPackingOfficerSearch(e.target.value);
                        setShowPackingDropdown(true);
                      }}
                      onFocus={() => setShowPackingDropdown(true)}
                      placeholder="Ketik nama karyawan..."
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                    {showPackingDropdown && (
                      <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded border border-gray-700 bg-gray-900 text-white shadow-lg">
                        {(filteredEmployeesForPacking.length > 0 ? filteredEmployeesForPacking : employees).map(emp => (
                          <button
                            key={emp.id}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setPackingOfficerName(getEmployeeLabel(emp));
                              setPackingOfficerSearch(getEmployeeLabel(emp));
                              setShowPackingDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-gray-800"
                          >
                            {getEmployeeLabel(emp)}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
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

      {/* Dropshipment Modal */}
      {showDropshipmentModal && selectedDropshipmentInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md max-h-96 overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Serah ke Expedisi</h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold mb-2">Invoice</label>
                <div className="bg-gray-800 rounded px-3 py-2 text-sm">
                  {getInvoiceHeaderTitle(selectedDropshipmentInvoice)}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Status Packing</label>
                <div className="bg-green-900/30 border border-green-700 rounded px-3 py-2 text-sm space-y-2">
                  <div className="text-green-400">✓ Terpacking</div>
                  <div className="text-xs text-green-300">
                    Petugas: {selectedDropshipmentInvoice.packing_officer_name}
                  </div>
                  {selectedDropshipmentInvoice.packing_verified_at && (
                    <div className="text-xs text-green-200">
                      Waktu Terpacking: {formatDate(selectedDropshipmentInvoice.packing_verified_at)}
                    </div>
                  )}
                  {selectedDropshipmentInvoice.faktur_verified_at && (
                    <div className="text-xs text-purple-200">
                      Waktu Faktur: {formatDate(selectedDropshipmentInvoice.faktur_verified_at)}
                    </div>
                  )}
                  {selectedDropshipmentInvoice.delivery_date && (
                    <div className="text-xs text-amber-200">
                      Waktu Terkirim: {new Date(selectedDropshipmentInvoice.delivery_date).toLocaleDateString('id-ID')} {new Date(selectedDropshipmentInvoice.delivery_date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              </div>

              <div className="relative">
                <label className="block text-sm font-semibold mb-2">
                  Nama Petugas Expedisi <span className="text-red-500">*</span>
                </label>
                {loadingEmployees ? (
                  <div className="text-sm text-gray-400">Memuat daftar karyawan...</div>
                ) : employees.length === 0 ? (
                  <div className="text-sm text-red-400">Tidak ada data karyawan. Silakan periksa halaman Keuangan.</div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={expedisiOfficerSearch || expedisiOfficerName}
                      onChange={(e) => {
                        setExpedisiOfficerSearch(e.target.value);
                        setShowExpedisiDropdown(true);
                      }}
                      onFocus={() => setShowExpedisiDropdown(true)}
                      placeholder="Ketik nama karyawan..."
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                    {showExpedisiDropdown && (
                      <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded border border-gray-700 bg-gray-900 text-white shadow-lg">
                        {filteredEmployeesForExpedisi.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-gray-400">Tidak ada karyawan ditemukan</div>
                        ) : (
                          filteredEmployeesForExpedisi.map(emp => (
                            <div
                              key={emp.id}
                              onClick={() => {
                                setExpedisiOfficerName(getEmployeeLabel(emp));
                                setExpedisiOfficerSearch('');
                                setShowExpedisiDropdown(false);
                              }}
                              className="px-3 py-2 hover:bg-blue-600 cursor-pointer text-sm transition"
                            >
                              {getEmployeeLabel(emp)}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {dropshipmentError && (
              <div className="bg-red-900 border border-red-700 text-red-200 px-3 py-2 rounded mb-4 text-sm">
                {dropshipmentError}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={closeDropshipmentModal}
                disabled={dropshipmentSaving}
                className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 px-4 py-2 rounded font-semibold transition"
              >
                Batal
              </button>
              <button
                onClick={handleDropshipmentSubmit}
                disabled={dropshipmentSaving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded font-semibold transition"
              >
                {dropshipmentSaving ? 'Menyimpan...' : 'Serah Dropshipment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
