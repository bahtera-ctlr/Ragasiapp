'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logOut } from '@/lib/auth';
import { useAuth, useRoleCheck } from '@/lib/hooks';
import { LoadingSpinner } from '@/app/components/UIComponents';
import {
  createUserAction,
  getAllUsersAction,
  updateUserAction,
  deactivateUserAction,
  activateUserAction,
  deleteUserAction,
  type CreateUserInput,
} from './actions';
import { UserRole } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { getAllDiscountRequests, approveDiscountRequest, rejectDiscountRequest, type DiscountRequest, getInvoiceFilterOptions, getFilteredInvoiceHistory, deleteAllInvoiceHistory, batchInsertInvoiceHistoryWithOutlets, type InvoiceHistory } from '@/lib/discount-requests';
import { getAllInvoicesForAdmin, deleteInvoice, deleteAllInvoices, deleteDeliveryData, deleteOrder, deleteAllOrders } from '@/lib/orders';
import { getSalesReport, replaceSalesReport, deleteAllSalesReport } from '@/lib/sales-report';
import { getOutlets } from '@/lib/export';

type SalesReportRow = {
  no_outlet: string;
  nama_outlet: string;
  status: string;
  me: string;
  cluster: string;
  kelompok: string;
  target: number;
  pencapaian: number;
  pt_persen: number;
  pt_selisih: number;
  t_poin: number;
  p_poin: number;
  poin_persen: number;
};

type SalesStats = {
  totalOrders: number;
  totalInvoices: number;
  totalAmount: number;
  pendingOrders: number;
  draftInvoices: number;
  releasedInvoices: number;
};

type Order = {
  id: string;
  outlet_id: string;
  outlet_name?: string;
  total_amount: number;
  status: string;
  created_at: string;
};

type Invoice = {
  id: string;
  outlet_id: string;
  outlet_name?: string;
  amount: number;
  status: string;
  created_at: string;
};

type User = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'admin_keuangan', label: 'Admin Keuangan' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'fakturis', label: 'Fakturis' },
  { value: 'admin_logistik', label: 'Admin Logistik' },
  { value: 'admin_ekspedisi', label: 'Admin Ekspedisi' },
  { value: 'petugas_ekspedisi', label: 'Petugas Ekspedisi' },
  { value: 'super_admin', label: 'Super Admin' },
];

const ROLE_COLORS_DARK: Record<UserRole, string> = {
  admin_keuangan: 'bg-green-900 text-green-200',
  marketing: 'bg-purple-900 text-purple-200',
  fakturis: 'bg-blue-900 text-blue-200',
  admin_logistik: 'bg-orange-900 text-orange-200',
  admin_ekspedisi: 'bg-red-900 text-red-200',
  petugas_ekspedisi: 'bg-pink-900 text-pink-200',
  super_admin: 'bg-yellow-900 text-yellow-200',
};

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

// bln in CSV uses YYMM format: 2602 = year 2026 month 2 (Feb)
const blnLabel = (bln: number): string => {
  if (bln >= 100) {
    const month = bln % 100;
    const yr = Math.floor(bln / 100);
    return `${MONTH_NAMES[month] || `${month}`} '${yr}`;
  }
  return MONTH_NAMES[bln] || `Bln ${bln}`;
};

function SearchableSelect({
  value, onChange, options, placeholder, icon,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  icon?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = query.trim()
    ? options.filter(o => o.toLowerCase().includes(query.toLowerCase()))
    : options;

  return (
    <div ref={ref} className="relative min-w-[200px]">
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg">
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <input
          className="bg-transparent text-white text-sm outline-none flex-1 min-w-0 placeholder-gray-400"
          placeholder={value === 'all' ? placeholder : ''}
          value={open ? query : (value === 'all' ? '' : value)}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { setOpen(true); setQuery(''); }}
        />
        {value !== 'all' && !open && (
          <button
            className="text-gray-500 hover:text-gray-300 flex-shrink-0 text-xs"
            onMouseDown={e => { e.preventDefault(); onChange('all'); }}
          >✕</button>
        )}
        <span className="text-gray-500 text-xs flex-shrink-0">{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg z-30 max-h-64 overflow-y-auto shadow-xl">
          <div
            className="px-3 py-2 text-sm text-gray-400 hover:bg-gray-700 cursor-pointer border-b border-gray-700"
            onMouseDown={() => { onChange('all'); setQuery(''); setOpen(false); }}
          >
            {icon} {placeholder}
          </div>
          {filtered.slice(0, 300).map(o => (
            <div
              key={o}
              className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-700 ${value === o ? 'bg-blue-900 text-blue-200' : 'text-gray-300'}`}
              onMouseDown={() => { onChange(o); setQuery(''); setOpen(false); }}
            >
              {o}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-500 italic">Tidak ditemukan</div>
          )}
          {filtered.length > 300 && (
            <div className="px-3 py-2 text-xs text-gray-500">Ketik untuk mempersempit ({filtered.length} hasil)</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminSuperDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { hasAccess, loading: roleCheckLoading } = useRoleCheck(['super_admin']);
  const [networkError, setNetworkError] = useState(false);

  // Catch background auth-refresh failures (net::ERR_INTERNET_DISCONNECTED etc.)
  useEffect(() => {
    const handler = (e: PromiseRejectionEvent) => {
      const msg = e.reason?.message ?? '';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('ERR_INTERNET')) {
        e.preventDefault(); // suppress Next.js error overlay
        setNetworkError(true);
      }
    };
    window.addEventListener('unhandledrejection', handler);
    return () => window.removeEventListener('unhandledrejection', handler);
  }, []);

  // Tab state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'pengajuan-diskon' | 'historis-pengambilan' | 'report-sales' | 'akses-halaman' | 'kelola-data'>('dashboard');

  // Kelola Data states
  type AdminInvoice = { id: string; outlet_id: string; outlet?: { name?: string; NIO?: string } | null; amount: number; status: string; faktur_status?: string; faktur_number?: string; shipment_status?: string; delivery_status?: string; created_at: string };
  const [adminInvoices, setAdminInvoices] = useState<AdminInvoice[]>([]);
  const [loadingAdminInvoices, setLoadingAdminInvoices] = useState(false);
  const [adminInvoiceSearch, setAdminInvoiceSearch] = useState('');
  const [deletingInvoiceId, setDeletingInvoiceId] = useState<string | null>(null);
  const [deletingDeliveryId, setDeletingDeliveryId] = useState<string | null>(null);
  const [kelolaSub, setKelolaSub] = useState<'invoice' | 'ekspedisi' | 'orders'>('invoice');
  const [kelolaDateFrom, setKelolaDateFrom] = useState('');
  const [kelolaDateTo, setKelolaDateTo] = useState('');
  const [backingUp, setBackingUp] = useState(false);

  // Kelola Data - Orders states
  type AdminOrder = { id: string; outlet_id: string; outlet_name?: string; total_amount: number; status: string; created_at: string };
  const [adminOrders, setAdminOrders] = useState<AdminOrder[]>([]);
  const [loadingAdminOrders, setLoadingAdminOrders] = useState(false);
  const [ordersSearch, setOrdersSearch] = useState('');
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);

  // Sales Dashboard states
  const [salesStats, setSalesStats] = useState<SalesStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingSales, setLoadingSales] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Form states for creating user
  const [formData, setFormData] = useState<CreateUserInput>({
    email: '',
    password: '',
    name: '',
    role: 'marketing',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Users list states
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Edit modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    role: 'marketing' as UserRole,
  });
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  // Delete confirmation modal
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Pengajuan Diskon states
  const [discountRequests, setDiscountRequests] = useState<DiscountRequest[]>([]);
  const [loadingDiscountRequests, setLoadingDiscountRequests] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedDiscountRequest, setSelectedDiscountRequest] = useState<DiscountRequest | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | null>(null);

  // Historis Penjualan states
  const [filterOutlet, setFilterOutlet] = useState('all');
  const [filterNamaBarang, setFilterNamaBarang] = useState('all');
  const [filterPrinciple, setFilterPrinciple] = useState('all');
  const [filterME, setFilterME] = useState('all');
  
  // Dropdown options for filters
  const [outletOptions, setOutletOptions] = useState<string[]>([]);
  const [namaBarangOptions, setNamaBarangOptions] = useState<string[]>([]);
  const [principleOptions, setPrincipleOptions] = useState<string[]>([]);
  const [meOptions, setMEOptions] = useState<string[]>([]);
  
  const [invoiceCount, setInvoiceCount] = useState<number>(-1); // -1 = not yet loaded
  const [filteredInvoiceHistory, setFilteredInvoiceHistory] = useState<InvoiceHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadingCSV, setUploadingCSV] = useState(false);
  const [pivotViewMode, setPivotViewMode] = useState<'pivot' | 'raw'>('pivot');
  const [loadingFilter, setLoadingFilter] = useState(false);
  const fetchingHistoryRef = useRef(false);

  // Report Sales (in-memory CSV, no DB)
  const [salesReport, setSalesReport] = useState<SalesReportRow[]>([]);
  const [salesFileName, setSalesFileName] = useState('');
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesFilterME, setSalesFilterME] = useState('all');
  const [salesFilterCluster, setSalesFilterCluster] = useState('all');
  const [salesFilterStatus, setSalesFilterStatus] = useState('all');
  const [salesFilterKelompok, setSalesFilterKelompok] = useState('all');
  const [salesSortKey, setSalesSortKey] = useState<keyof SalesReportRow | ''>('');
  const [salesSortDir, setSalesSortDir] = useState<'asc' | 'desc'>('asc');

  // Redirect if not super admin
  useEffect(() => {
    if (!roleCheckLoading && !hasAccess) {
      router.push('/dashboard');
    }
  }, [hasAccess, roleCheckLoading, router]);

  // Fetch sales data on mount and when filters change
  useEffect(() => {
    if (user && activeTab === 'dashboard') {
      fetchSalesData();
    }
  }, [user, activeTab, dateFrom, dateTo, statusFilter]);

  // Fetch users on mount
  useEffect(() => {
    if (user && activeTab === 'users') {
      fetchUsers();
    }
  }, [user, activeTab]);

  // Fetch discount requests on mount
  useEffect(() => {
    if (user && activeTab === 'pengajuan-diskon') {
      fetchDiscountRequests();
    }
  }, [user, activeTab]);

  // Fetch historis pengambilan on mount
  useEffect(() => {
    if (user && activeTab === 'historis-pengambilan') {
      fetchInvoiceHistory();
    }
  }, [user, activeTab]);

  // Fetch sales report from DB when tab opens
  const fetchSalesReport = useCallback(async () => {
    setSalesLoading(true);
    try {
      const result = await getSalesReport();
      if (result.error) { console.error('fetchSalesReport:', result.error); return; }
      const rows = (result.data || []).map(r => ({
        no_outlet: r.no_outlet ?? '',
        nama_outlet: r.nama_outlet ?? '',
        status: r.status ?? '',
        me: r.me ?? '',
        cluster: r.cluster ?? '',
        kelompok: r.kelompok ?? '',
        target: r.target ?? 0,
        pencapaian: r.pencapaian ?? 0,
        pt_persen: r.pt_persen ?? 0,
        pt_selisih: r.pt_selisih ?? 0,
        t_poin: r.t_poin ?? 0,
        p_poin: r.p_poin ?? 0,
        poin_persen: r.poin_persen ?? 0,
      }));
      setSalesReport(rows);
      setSalesFileName(result.reportName || '');
    } finally {
      setSalesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && activeTab === 'report-sales') {
      fetchSalesReport();
    }
  }, [user, activeTab, fetchSalesReport]);

  const fetchAdminInvoices = useCallback(async () => {
    setLoadingAdminInvoices(true);
    const { data, error } = await getAllInvoicesForAdmin();
    if (!error && data) setAdminInvoices(data as AdminInvoice[]);
    setLoadingAdminInvoices(false);
  }, []);

  const fetchAdminOrders = useCallback(async () => {
    setLoadingAdminOrders(true);
    try {
      const { data: ordersData, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      const outletIds = [...new Set((ordersData || []).map((o: { outlet_id: string }) => o.outlet_id).filter(Boolean))];
      let outletMap = new Map<string, string>();
      if (outletIds.length > 0) {
        const { data: outlets } = await supabase.from('outlets').select('id, name').in('id', outletIds);
        outletMap = new Map((outlets || []).map((o: { id: string; name: string }) => [o.id, o.name]));
      }
      setAdminOrders((ordersData || []).map((o: { outlet_id: string; [key: string]: unknown }) => ({
        ...o,
        outlet_name: outletMap.get(o.outlet_id) || o.outlet_id,
      })) as AdminOrder[]);
    } catch (err) {
      console.error('Error fetching admin orders:', err);
    } finally {
      setLoadingAdminOrders(false);
    }
  }, []);

  useEffect(() => {
    if (user && activeTab === 'kelola-data') {
      fetchAdminInvoices();
      fetchAdminOrders();
    }
  }, [user, activeTab, fetchAdminInvoices, fetchAdminOrders]);

  const handleDeleteInvoice = async (id: string, label: string) => {
    if (!confirm(`Hapus invoice:\n"${label}"?\n\nData terkait (foto, ekspedisi) juga akan terhapus.`)) return;
    if (!confirm('Konfirmasi sekali lagi — aksi ini TIDAK BISA dibatalkan.')) return;
    setDeletingInvoiceId(id);
    const { error } = await deleteInvoice(id);
    if (error) alert(`Gagal hapus: ${error}`);
    else setAdminInvoices(prev => prev.filter(inv => inv.id !== id));
    setDeletingInvoiceId(null);
  };

  const handleDeleteAllInvoices = async () => {
    if (!confirm('Hapus SEMUA invoice dari database?\n\nSeluruh data invoice, foto, dan ekspedisi akan hilang permanen.')) return;
    if (!confirm('KONFIRMASI TERAKHIR — Ketik OK untuk melanjutkan penghapusan semua invoice.')) return;
    setLoadingAdminInvoices(true);
    const { error } = await deleteAllInvoices();
    if (error) alert(`Gagal: ${error}`);
    else { setAdminInvoices([]); alert('Semua invoice berhasil dihapus.'); }
    setLoadingAdminInvoices(false);
  };

  const handleDeleteDelivery = async (id: string, label: string) => {
    if (!confirm(`Reset data ekspedisi untuk:\n"${label}"?\n\nStatus pengiriman dan foto bukti akan dihapus.`)) return;
    setDeletingDeliveryId(id);
    const { error } = await deleteDeliveryData(id);
    if (error) alert(`Gagal: ${error}`);
    else await fetchAdminInvoices();
    setDeletingDeliveryId(null);
  };

  const handleBackupAndDelete = async (targetInvoices: AdminInvoice[]) => {
    if (targetInvoices.length === 0) { alert('Tidak ada data untuk di-backup.'); return; }
    if (!confirm(`Backup & hapus ${targetInvoices.length} invoice?\n\nProses:\n1. Download file Excel + foto ke ZIP\n2. Setelah ZIP ter-download, data akan dihapus.`)) return;

    setBackingUp(true);
    try {
      const [JSZip, XLSX] = await Promise.all([
        import('jszip').then(m => m.default),
        import('xlsx'),
      ]);

      const zip = new JSZip();

      // Excel sheet
      const rows = targetInvoices.map(inv => ({
        'ID Invoice': inv.id,
        'Outlet': inv.outlet?.name || inv.outlet_id,
        'NIO': inv.outlet?.NIO || '',
        'No. Faktur': inv.faktur_number || '',
        'Amount': inv.amount,
        'Status': inv.status,
        'Status Faktur': inv.faktur_status || '',
        'Status Kirim': inv.delivery_status || '',
        'Tanggal': new Date(inv.created_at).toLocaleDateString('id-ID'),
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Invoice');
      const xlsxBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      zip.file('data-invoice.xlsx', xlsxBuffer);

      // Download & store photos per invoice
      const { supabase: sb } = await import('@/lib/supabase');
      for (const inv of targetInvoices) {
        const folderName = inv.faktur_number || inv.id.slice(0, 8).toUpperCase();
        const folder = zip.folder(folderName)!;

        // Faktur images
        const { data: fakturImgs } = await sb.from('faktur_images').select('image_path').eq('invoice_id', inv.id);
        for (const img of fakturImgs || []) {
          try {
            const { data: blob } = await sb.storage.from('faktur-images').download(img.image_path);
            if (blob) {
              const fname = img.image_path.split('/').pop() || 'faktur.jpg';
              folder.file(`faktur_${fname}`, blob);
            }
          } catch { /* skip failed download */ }
        }

        // Delivery images
        const { data: delivImgs } = await sb.from('delivery_images').select('image_path').eq('invoice_id', inv.id);
        for (const img of delivImgs || []) {
          try {
            const { data: blob } = await sb.storage.from('delivery-images').download(img.image_path);
            if (blob) {
              const fname = img.image_path.split('/').pop() || 'delivery.jpg';
              folder.file(`kirim_${fname}`, blob);
            }
          } catch { /* skip failed download */ }
        }
      }

      // Generate and download ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `backup-invoice-${dateStr}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      // Delete after download
      if (!confirm('ZIP berhasil di-download. Lanjutkan hapus data dari database?')) return;
      let errors = 0;
      for (const inv of targetInvoices) {
        const { error } = await deleteInvoice(inv.id);
        if (error) errors++;
      }
      if (errors > 0) alert(`${errors} invoice gagal dihapus.`);
      else alert(`${targetInvoices.length} invoice berhasil dihapus.`);
      await fetchAdminInvoices();
    } catch (err) {
      alert(`Backup gagal: ${String(err)}`);
    } finally {
      setBackingUp(false);
    }
  };

  const handleDeleteOrder = async (id: string, label: string) => {
    if (!confirm(`Hapus order:\n"${label}"?\n\nData order ini akan dihapus permanen.`)) return;
    if (!confirm('Konfirmasi sekali lagi — aksi ini TIDAK BISA dibatalkan.')) return;
    setDeletingOrderId(id);
    const { error } = await deleteOrder(id);
    if (error) alert(`Gagal hapus: ${error}`);
    else setAdminOrders(prev => prev.filter(o => o.id !== id));
    setDeletingOrderId(null);
  };

  const handleDeleteAllOrders = async () => {
    if (!confirm('Hapus SEMUA orders dari database?\n\nSeluruh data order akan hilang permanen.')) return;
    if (!confirm('KONFIRMASI TERAKHIR — Aksi ini TIDAK BISA dibatalkan!')) return;
    setLoadingAdminOrders(true);
    const { error } = await deleteAllOrders();
    if (error) alert(`Gagal: ${error}`);
    else { setAdminOrders([]); alert('Semua orders berhasil dihapus.'); }
    setLoadingAdminOrders(false);
  };

  const fetchSalesData = useCallback(async () => {
    try {
      setLoadingSales(true);

      // Fetch orders
      let ordersQuery = supabase.from('orders').select('*');
      if (dateFrom) ordersQuery = ordersQuery.gte('created_at', `${dateFrom}T00:00:00`);
      if (dateTo) ordersQuery = ordersQuery.lte('created_at', `${dateTo}T23:59:59`);
      if (statusFilter !== 'all') ordersQuery = ordersQuery.eq('status', statusFilter);

      const { data: ordersData } = await ordersQuery;

      // Fetch invoices
      let invoicesQuery = supabase.from('invoices').select('*');
      if (dateFrom) invoicesQuery = invoicesQuery.gte('created_at', `${dateFrom}T00:00:00`);
      if (dateTo) invoicesQuery = invoicesQuery.lte('created_at', `${dateTo}T23:59:59`);
      if (statusFilter !== 'all') invoicesQuery = invoicesQuery.eq('status', statusFilter);

      const { data: invoicesData } = await invoicesQuery;

      // Fetch outlets to get outlet names
      const outletIds = [...new Set([
        ...(ordersData || []).map(o => o.outlet_id),
        ...(invoicesData || []).map(i => i.outlet_id)
      ])];
      
      const { data: outletsData } = await supabase
        .from('outlets')
        .select('id, name')
        .in('id', outletIds);

      // Create outlet map for quick lookup
      const outletMap = new Map(outletsData?.map(o => [o.id, o.name]) || []);

      // Merge outlet names with orders and invoices
      const ordersWithNames = (ordersData || []).map(order => ({
        ...order,
        outlet_name: outletMap.get(order.outlet_id) || order.outlet_id
      }));

      const invoicesWithNames = (invoicesData || []).map(invoice => ({
        ...invoice,
        outlet_name: outletMap.get(invoice.outlet_id) || invoice.outlet_id
      }));

      setOrders((ordersWithNames as Order[]) || []);
      setInvoices((invoicesWithNames as Invoice[]) || []);

      // Calculate stats
      const stats: SalesStats = {
        totalOrders: ordersData?.length || 0,
        totalInvoices: invoicesData?.length || 0,
        totalAmount: (ordersData || []).reduce((sum, o) => sum + Number(o.total_amount || 0), 0),
        pendingOrders: (ordersData || []).filter((o) => o.status === 'pending').length,
        draftInvoices: (invoicesData || []).filter((i) => i.status === 'draft').length,
        releasedInvoices: (invoicesData || []).filter((i) => i.status === 'released').length,
      };

      setSalesStats(stats);
    } catch (error) {
      console.error('Error fetching sales data:', error);
    } finally {
      setLoadingSales(false);
    }
  }, [dateFrom, dateTo, statusFilter]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const result = await getAllUsersAction();
      if (result.success && result.data) {
        setUsers(result.data);
      } else {
        console.error('Error fetching users:', result.error);
      }
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const fetchDiscountRequests = useCallback(async () => {
    try {
      setLoadingDiscountRequests(true);
      const result = await getAllDiscountRequests();
      if (result.error) {
        console.error('Error fetching discount requests:', result.error);
        setDiscountRequests([]);
      } else {
        setDiscountRequests(result.data || []);
      }
    } catch (error) {
      console.error('Error in fetchDiscountRequests:', error);
      setDiscountRequests([]);
    } finally {
      setLoadingDiscountRequests(false);
    }
  }, []);

  const handleApproveDiscountRequest = async () => {
    if (!selectedDiscountRequest) return;

    setProcessingRequestId(selectedDiscountRequest.id);
    try {
      const result = await approveDiscountRequest(selectedDiscountRequest.id, approvalNotes);
      if (result.error) {
        alert(`Gagal menyetujui pengajuan: ${result.error}`);
      } else {
        alert('Pengajuan diskon berhasil disetujui!');
        setShowApprovalModal(false);
        setSelectedDiscountRequest(null);
        setApprovalNotes('');
        setApprovalAction(null);
        fetchDiscountRequests(); // Refresh the list
      }
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleRejectDiscountRequest = async () => {
    if (!selectedDiscountRequest) return;

    if (!approvalNotes.trim()) {
      alert('Alasan penolakan harus diisi');
      return;
    }

    setProcessingRequestId(selectedDiscountRequest.id);
    try {
      const result = await rejectDiscountRequest(selectedDiscountRequest.id, approvalNotes);
      if (result.error) {
        alert(`Gagal menolak pengajuan: ${result.error}`);
      } else {
        alert('Pengajuan diskon berhasil ditolak!');
        setShowApprovalModal(false);
        setSelectedDiscountRequest(null);
        setApprovalNotes('');
        setApprovalAction(null);
        fetchDiscountRequests(); // Refresh the list
      }
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const fetchInvoiceHistory = useCallback(async () => {
    if (fetchingHistoryRef.current) return;
    fetchingHistoryRef.current = true;
    try {
      setLoadingHistory(true);

      const result = await getInvoiceFilterOptions();

      if (result.error) {
        console.error('Error fetching invoice filter options:', result.error);
        setInvoiceCount(0);
        setFilteredInvoiceHistory([]);
        alert(`Error fetching invoice history: ${result.error}`);
        return;
      }

      setInvoiceCount(result.count ?? 0);
      setOutletOptions(result.outlets ?? []);
      setNamaBarangOptions(result.namaBarang ?? []);
      setPrincipleOptions(result.principles ?? []);
      setMEOptions(result.mes ?? []);
      setFilteredInvoiceHistory([]);
    } catch (error) {
      console.error('Error in fetchInvoiceHistory:', error);
      alert(`Exception in fetchInvoiceHistory: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setInvoiceCount(0);
      setFilteredInvoiceHistory([]);
    } finally {
      setLoadingHistory(false);
      fetchingHistoryRef.current = false;
    }
  }, []);


  const pivotData = useMemo(() => {
    const data = filteredInvoiceHistory;
    if (data.length === 0) return null;

    const isByOutlet = filterNamaBarang !== 'all';

    // Derive period key (YYMM) from record:
    // - bln >= 100 → already YYMM (e.g., 2602)
    // - bln < 100 (year only, e.g., 26) + tgl → combine: year*100 + month
    // - only tgl → use tgl
    const getPeriod = (r: InvoiceHistory): number | null => {
      if (typeof r.bln === 'number' && r.bln >= 100) return r.bln;
      if (r.tgl) {
        const d = new Date(r.tgl);
        const yr = d.getFullYear() % 100;
        const mo = d.getMonth() + 1;
        return yr * 100 + mo;
      }
      return null;
    };

    const months = [...new Set(
      data.map(r => getPeriod(r)).filter((b): b is number => b !== null)
    )].sort((a, b) => a - b);

    const rowTotals = new Map<string, number>();
    const rowMonths = new Map<string, Map<number, number>>();

    for (const record of data) {
      const rowKey = isByOutlet
        ? (record.outlet_name || (record.no_outlet ? `Outlet ${record.no_outlet}` : 'Unknown'))
        : (record.nama_barang || 'Unknown');
      const value = record.penjualan || 0;

      rowTotals.set(rowKey, (rowTotals.get(rowKey) || 0) + value);

      const period = getPeriod(record);
      if (period !== null) {
        if (!rowMonths.has(rowKey)) rowMonths.set(rowKey, new Map());
        const monthMap = rowMonths.get(rowKey)!;
        monthMap.set(period, (monthMap.get(period) || 0) + value);
      }
    }

    const rows = [...rowTotals.entries()]
      .map(([name, total]) => ({
        name,
        monthData: rowMonths.get(name) || new Map<number, number>(),
        total,
      }))
      .sort((a, b) => b.total - a.total);

    const colTotals = new Map<number, number>();
    for (const m of months) {
      colTotals.set(m, rows.reduce((s, r) => s + (r.monthData.get(m) || 0), 0));
    }
    const grandTotal = rows.reduce((s, r) => s + r.total, 0);

    return { rows, months, colTotals, grandTotal, isByOutlet };
  }, [filteredInvoiceHistory, filterNamaBarang]);

  // Report Sales derived data
  const salesFiltered = useMemo(() => {
    let rows = salesReport;
    if (salesFilterME !== 'all') rows = rows.filter(r => r.me === salesFilterME);
    if (salesFilterCluster !== 'all') rows = rows.filter(r => r.cluster === salesFilterCluster);
    if (salesFilterStatus !== 'all') rows = rows.filter(r => r.status.toLowerCase() === salesFilterStatus);
    if (salesFilterKelompok !== 'all') rows = rows.filter(r => r.kelompok === salesFilterKelompok);
    if (salesSortKey) {
      rows = [...rows].sort((a, b) => {
        const av = a[salesSortKey], bv = b[salesSortKey];
        const cmp = typeof av === 'number' ? (av as number) - (bv as number) : String(av).localeCompare(String(bv));
        return salesSortDir === 'asc' ? cmp : -cmp;
      });
    }
    return rows;
  }, [salesReport, salesFilterME, salesFilterCluster, salesFilterStatus, salesFilterKelompok, salesSortKey, salesSortDir]);

  const salesOptions = useMemo(() => ({
    mes: [...new Set(salesReport.map(r => r.me).filter(Boolean))].sort(),
    clusters: [...new Set(salesReport.map(r => r.cluster).filter(Boolean))].sort(),
    kelompoks: [...new Set(salesReport.map(r => r.kelompok).filter(Boolean))].sort(),
  }), [salesReport]);

  const salesSummary = useMemo(() => {
    const rows = salesFiltered;
    const aktif = rows.filter(r => r.status.toLowerCase() === 'on').length;
    const totalTarget = rows.reduce((s, r) => s + r.target, 0);
    const totalPencapaian = rows.reduce((s, r) => s + r.pencapaian, 0);
    const totalTPoin = rows.reduce((s, r) => s + r.t_poin, 0);
    const totalPPoin = rows.reduce((s, r) => s + r.p_poin, 0);
    return {
      total: rows.length,
      aktif,
      totalTarget,
      totalPencapaian,
      ptPersen: totalTarget > 0 ? (totalPencapaian / totalTarget) * 100 : 0,
      totalTPoin,
      totalPPoin,
      pointPersen: totalTPoin > 0 ? (totalPPoin / totalTPoin) * 100 : 0,
    };
  }, [salesFiltered]);

  // Handle filter changes — fetches filtered data from DB on every change
  const handleFilterChange = async (type: 'outlet' | 'namaBarang' | 'principle' | 'me', value: string) => {
    let newOutlet = filterOutlet;
    let newNamaBarang = filterNamaBarang;
    let newPrinciple = filterPrinciple;
    let newME = filterME;

    switch (type) {
      case 'outlet':      newOutlet = value;      setFilterOutlet(value);      break;
      case 'namaBarang':  newNamaBarang = value;  setFilterNamaBarang(value);  break;
      case 'principle':   newPrinciple = value;   setFilterPrinciple(value);   break;
      case 'me':          newME = value;           setFilterME(value);          break;
    }

    // When all filters cleared, show prompt instead of loading everything
    if (newOutlet === 'all' && newNamaBarang === 'all' && newPrinciple === 'all' && newME === 'all') {
      setFilteredInvoiceHistory([]);
      return;
    }

    setLoadingFilter(true);
    try {
      const result = await getFilteredInvoiceHistory({
        outlet_name: newOutlet !== 'all' ? newOutlet : undefined,
        nama_barang: newNamaBarang !== 'all' ? newNamaBarang : undefined,
        principle: newPrinciple !== 'all' ? newPrinciple : undefined,
        me: newME !== 'all' ? newME : undefined,
      });
      if (result.error) {
        console.error('Error fetching filtered data:', result.error);
        setFilteredInvoiceHistory([]);
      } else {
        setFilteredInvoiceHistory(result.data || []);
      }
    } catch (err) {
      console.error('Exception in handleFilterChange:', err);
      setFilteredInvoiceHistory([]);
    } finally {
      setLoadingFilter(false);
    }
  };

  const handleDeleteAllInvoice = async () => {
    if (!confirm('Hapus SEMUA data historis penjualan dari database? Aksi ini tidak bisa dibatalkan.')) return;
    setLoadingHistory(true);
    try {
      const result = await deleteAllInvoiceHistory();
      if (result.error) {
        alert(`Gagal hapus data: ${result.error}`);
      } else {
        alert(`✅ ${result.count?.toLocaleString('id-ID') ?? 0} record berhasil dihapus.`);
        setInvoiceCount(0);
        setFilteredInvoiceHistory([]);
        setOutletOptions([]);
        setNamaBarangOptions([]);
        setPrincipleOptions([]);
        setMEOptions([]);
        setFilterOutlet('all');
        setFilterNamaBarang('all');
        setFilterPrinciple('all');
        setFilterME('all');
      }
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSalesCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) { alert('File harus berformat .csv'); return; }
    setSalesLoading(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { alert('File CSV kosong atau tidak valid'); return; }

      const parseCSVLine = (line: string, delim: string): string[] => {
        const result: string[] = [];
        let cur = '', inQ = false;
        for (let i = 0; i < line.length; i++) {
          const c = line[i], nc = line[i + 1];
          if (c === '"') { if (inQ && nc === '"') { cur += '"'; i++; } else { inQ = !inQ; } }
          else if (c === delim && !inQ) { result.push(cur.trim().replace(/^"|"$/g, '')); cur = ''; }
          else cur += c;
        }
        result.push(cur.trim().replace(/^"|"$/g, ''));
        return result;
      };

      const firstLine = lines[0];
      const sc = (firstLine.match(/;/g) || []).length;
      const cc = (firstLine.match(/,/g) || []).length;
      const delim = sc > cc ? ';' : ',';

      const headers = parseCSVLine(firstLine, delim).map(h => h.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_/]/g, ''));

      const col = (name: string): number => {
        const aliases: Record<string, string[]> = {
          no_outlet: ['no_outlet', 'no._outlet', 'nomor_outlet', 'no'],
          nama_outlet: ['nama_outlet', 'nama_outlet/relasi', 'outlet', 'nama'],
          status: ['status'],
          me: ['me', 'marketing_executive'],
          cluster: ['cluster', 'kluster'],
          kelompok: ['kelompok', 'jenis'],
          target: ['target'],
          pencapaian: ['pencapaian', 'achieve', 'realisasi'],
          pt_persen: ['p/t', 'pt', 'p/t_%', 'persentase'],
          pt_selisih: ['p-t', 'selisih'],
          t_poin: ['t_poin', 't_point', 'target_poin', 'tpoin'],
          p_poin: ['p_poin', 'p_point', 'pencapaian_poin', 'ppoin'],
          poin_persen: ['p_poin_/_t_poin', 'poin_%', 'p_poin/t_poin', 'ppoin/tpoin'],
        };
        const candidates = aliases[name] || [name];
        for (const c of candidates) {
          const idx = headers.findIndex(h => h === c || h.includes(c));
          if (idx !== -1) return idx;
        }
        return -1;
      };

      const toNum = (v: string): number => {
        // Strip whitespace, %, Rp, and other non-numeric noise
        let s = v.trim().replace(/[%\sRp]/gi, '');
        if (!s) return 0;
        // Indonesian thousands + decimal: "60.000.000" or "1.000.000,50"
        if (/^\-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s))
          return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
        // Standard thousands + decimal: "1,000,000" or "1,000.50"
        if (/^\-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s))
          return parseFloat(s.replace(/,/g, '')) || 0;
        // Indonesian decimal only: "19,6" → 19.6
        if (/^\-?\d+,\d+$/.test(s))
          return parseFloat(s.replace(',', '.')) || 0;
        // Standard / plain: "19.6", "19", "-48000"
        return parseFloat(s.replace(/[^0-9.\-]/g, '')) || 0;
      };

      const rows: SalesReportRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const vals = parseCSVLine(lines[i], delim);
        if (vals.every(v => !v.trim())) continue;
        const get = (name: string) => { const idx = col(name); return idx >= 0 ? (vals[idx] || '').trim() : ''; };
        const target = toNum(get('target'));
        const pencapaian = toNum(get('pencapaian'));
        const tPoin = toNum(get('t_poin'));
        const pPoin = toNum(get('p_poin'));
        rows.push({
          no_outlet: get('no_outlet'),
          nama_outlet: get('nama_outlet'),
          status: get('status'),
          me: get('me'),
          cluster: get('cluster'),
          kelompok: get('kelompok'),
          target,
          pencapaian,
          pt_persen: col('pt_persen') >= 0 ? toNum(get('pt_persen')) : (target > 0 ? (pencapaian / target) * 100 : 0),
          pt_selisih: col('pt_selisih') >= 0 ? toNum(get('pt_selisih')) : pencapaian - target,
          t_poin: tPoin,
          p_poin: pPoin,
          poin_persen: col('poin_persen') >= 0 ? toNum(get('poin_persen')) : (tPoin > 0 ? (pPoin / tPoin) * 100 : 0),
        });
      }
      const saveResult = await replaceSalesReport(rows, file.name);
      if (saveResult.error) {
        alert(`Gagal simpan ke database: ${saveResult.error}`);
        return;
      }
      setSalesReport(rows);
      setSalesFileName(file.name);
      setSalesFilterME('all');
      setSalesFilterCluster('all');
      setSalesFilterStatus('all');
      setSalesFilterKelompok('all');
      setSalesSortKey('');
    } catch (err) {
      alert(`Error membaca CSV: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSalesLoading(false);
      e.target.value = '';
    }
  };

  const handleUploadCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      alert('Harap upload file CSV');
      return;
    }

    setUploadingCSV(true);
    try {
      // Read file in chunks to handle large files (100K+ rows)
      const chunkSize = 1024 * 1024; // 1MB chunks
      const fileSize = file.size;
      let offset = 0;
      let buffer = '';
      let delimiter = ',';
      let headerMap: Record<string, number> = {};
      let isFirstChunk = true;
      let linesParsed = 0;
      
      console.log(`Starting CSV parse for file size: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);

      // Parse CSV with proper handling of quoted values
      const parseCSVLine = (line: string, delim: string): string[] => {
        const result: string[] = [];
        let current = '';
        let insideQuotes = false;

        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          const nextChar = line[i + 1];

          if (char === '"') {
            if (insideQuotes && nextChar === '"') {
              current += '"';
              i++;
            } else {
              insideQuotes = !insideQuotes;
            }
          } else if (char === delim && !insideQuotes) {
            result.push(current.trim().replace(/^"|"$/g, ''));
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim().replace(/^"|"$/g, ''));
        return result;
      };

      const parseDate = (dateStr: string | undefined): string => {
        if (!dateStr) return new Date().toISOString().split('T')[0];
        // YYYY-MM-DD
        const iso = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (iso) return iso[0];
        // DD/MM/YYYY or DD-MM-YYYY
        const dmy = dateStr.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
        if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
        return new Date().toISOString().split('T')[0];
      };

      const records: Partial<InvoiceHistory>[] = [];
      let skippedRows = 0;

      // Read and process file chunk by chunk
      while (offset < fileSize) {
        const blob = file.slice(offset, offset + chunkSize);
        const text = await blob.text();
        buffer += text;
        offset += chunkSize;

        // Process complete lines in buffer
        const lines = buffer.split('\n');
        
        // Keep last incomplete line in buffer for next iteration
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) {
            skippedRows++;
            continue;
          }

          // Parse header on first line
          if (isFirstChunk && linesParsed === 0) {
            // Detect delimiter from raw line BEFORE parsing (count occurrences)
            const rawLine = line.replace(/\r/g, '');
            const commaCount = (rawLine.match(/,/g) || []).length;
            const semiCount = (rawLine.match(/;/g) || []).length;
            const tabCount = (rawLine.match(/\t/g) || []).length;
            if (semiCount > commaCount && semiCount >= tabCount) delimiter = ';';
            else if (tabCount > commaCount && tabCount >= semiCount) delimiter = '\t';
            else delimiter = ',';

            console.log(`Delimiter detected: '${delimiter}' (commas:${commaCount} semis:${semiCount} tabs:${tabCount})`);

            const headerLine = parseCSVLine(rawLine, delimiter);
            const headers = headerLine.map(h => h.toLowerCase().trim().replace(/^﻿/, '')); // strip BOM

            console.log('Headers found:', headers);

            // Exact mapping: normalize header then match to internal field name
            // fieldAliases: all possible header names → internal field name
            const fieldAliases: Record<string, string> = {
              'gudang': 'gudang',
              'no faktur': 'no_faktur', 'no_faktur': 'no_faktur', 'nofaktur': 'no_faktur', 'faktur': 'no_faktur',
              'salesman': 'salesman',
              'no outlet': 'no_outlet', 'no_outlet': 'no_outlet', 'nooutlet': 'no_outlet', 'nio': 'no_outlet',
              'outlet_name': 'outlet_name', 'nama outlet': 'outlet_name', 'nama_outlet': 'outlet_name',
              'nama barang': 'nama_barang', 'nama_barang': 'nama_barang', 'namabarang': 'nama_barang', 'nama produk': 'nama_barang', 'produk': 'nama_barang', 'item': 'nama_barang',
              'tgl': 'tgl', 'tanggal': 'tgl', 'date': 'tgl', 'tgl faktur': 'tgl',
              'qty': 'qty', 'quantity': 'qty', 'jumlah': 'qty',
              'sat': 'sat', 'satuan': 'sat', 'unit': 'sat',
              'disc': 'disc', 'diskon': 'disc', 'discount': 'disc',
              'dpp': 'dpp', 'harga dpp': 'dpp',
              'penjualan': 'penjualan', 'harga': 'penjualan', 'total': 'penjualan', 'amount': 'penjualan',
              'bln': 'bln', 'bulan': 'bln', 'month': 'bln',
              'principle': 'principle', 'principal': 'principle', 'prinsip': 'principle',
              'komposisi': 'komposisi', 'composition': 'komposisi',
              'me': 'me', 'marketing executive': 'me',
              'lh/lb': 'lh_lb', 'lh_lb': 'lh_lb', 'program': 'lh_lb',
            };

            headers.forEach((h, idx) => {
              const normalized = h.replace(/\s+/g, ' ').trim();
              const field = fieldAliases[normalized];
              if (field) {
                headerMap[field] = idx;
              }
            });

            console.log('Header mapping:', headerMap);
            const detectedCols = Object.keys(headerMap);
            console.log(`Mapped ${detectedCols.length} columns:`, detectedCols);
            if (detectedCols.length < 3) {
              console.warn('⚠️ Less than 3 columns mapped! Headers:', headers);
            }
            isFirstChunk = false;
            linesParsed++;
            continue;
          }

          // Parse data rows
          const values = parseCSVLine(line, delimiter);
          
          if (values.length === 0 || !values.some(v => v)) {
            skippedRows++;
            continue;
          }

          const getValueByColumn = (colName: string): any => {
            const idx = headerMap[colName];
            return idx !== undefined && values[idx] ? values[idx].trim() : undefined;
          };

          // Parse Indonesian-format number: "1.275.000" → 1275000, "5,5" → 5.5
          const parseNum = (raw: string | undefined): number | undefined => {
            if (!raw) return undefined;
            // Remove non-numeric except dot, comma, minus
            const s = raw.trim().replace(/[^\d.,-]/g, '');
            if (!s) return undefined;
            // Indonesian: dots = thousand sep, comma = decimal
            const cleaned = s.replace(/\./g, '').replace(',', '.');
            const n = parseFloat(cleaned);
            return isNaN(n) ? undefined : n;
          };

          const tglValue = getValueByColumn('tgl');
          const noOutletRaw = getValueByColumn('no_outlet');
          let noOutletParsed: number | undefined = undefined;
          if (noOutletRaw) {
            const parsed = parseInt(noOutletRaw);
            if (!isNaN(parsed)) noOutletParsed = parsed;
          }

          const record: Partial<InvoiceHistory> = {
            gudang: getValueByColumn('gudang'),
            no_faktur: parseNum(getValueByColumn('no_faktur')) ? Math.round(parseNum(getValueByColumn('no_faktur'))!) : undefined,
            salesman: getValueByColumn('salesman'),
            no_outlet: noOutletParsed,
            outlet_name: getValueByColumn('outlet_name'),
            nama_barang: getValueByColumn('nama_barang') || '',
            tgl: parseDate(tglValue),
            qty: getValueByColumn('qty'),
            sat: getValueByColumn('sat'),
            disc: parseNum(getValueByColumn('disc')),
            dpp: parseNum(getValueByColumn('dpp')),
            penjualan: parseNum(getValueByColumn('penjualan')),
            bln: (() => { const raw = getValueByColumn('bln'); if (!raw) return undefined; const n = parseInt(raw.trim().replace(/[.,\s]/g, '')); return isNaN(n) || n <= 0 ? undefined : n; })(),
            principle: getValueByColumn('principle'),
            komposisi: getValueByColumn('komposisi'),
            me: getValueByColumn('me'),
            lh_lb: getValueByColumn('lh_lb'),
            created_at: new Date().toISOString()
          };

          records.push(record);
          linesParsed++;

          // Log first 2 records to verify parsing
          if (linesParsed <= 2) {
            console.log(`Row ${linesParsed} - no_outlet raw: "${noOutletRaw}", parsed: ${noOutletParsed}, nama_barang: "${record.nama_barang}"`);
          }

          // Log progress every 10,000 rows
          if (linesParsed % 10000 === 0) {
            console.log(`Parsed ${linesParsed} rows so far...`);
          }

          // Batch insert every 50K rows to free memory
          if (records.length >= 50000) {
            console.log(`Inserting batch of ${records.length} records...`);
            const batchResult = await batchInsertInvoiceHistoryWithOutlets(records as InvoiceHistory[], 5000);
            if (batchResult.error) {
              console.warn(`Batch insert warning: ${batchResult.error}`);
            } else {
              console.log(`Batch inserted: ${batchResult.count} records`);
            }
            records.length = 0; // Clear array to free memory
          }
        }
      }

      // Process remaining data in buffer
      if (buffer.trim()) {
        const values = parseCSVLine(buffer, delimiter);
        if (values.length > 0 && values.some(v => v)) {
          const getVal = (col: string): string | undefined => {
            const idx = headerMap[col];
            return idx !== undefined && values[idx] ? values[idx].trim() : undefined;
          };
          const parseNumBuf = (raw: string | undefined): number | undefined => {
            if (!raw) return undefined;
            const s = raw.trim().replace(/[^\d.,-]/g, '');
            if (!s) return undefined;
            const n = parseFloat(s.replace(/\./g, '').replace(',', '.'));
            return isNaN(n) ? undefined : n;
          };
          const tglRaw = getVal('tgl');
          const noOutletRaw = getVal('no_outlet');
          const noOutletParsed = noOutletRaw ? (parseInt(noOutletRaw) || undefined) : undefined;
          records.push({
            gudang: getVal('gudang'),
            no_faktur: parseNumBuf(getVal('no_faktur')) ? Math.round(parseNumBuf(getVal('no_faktur'))!) : undefined,
            salesman: getVal('salesman'),
            no_outlet: noOutletParsed,
            outlet_name: getVal('outlet_name'),
            nama_barang: getVal('nama_barang') || '',
            tgl: parseDate(tglRaw),
            qty: getVal('qty'),
            sat: getVal('sat'),
            disc: parseNumBuf(getVal('disc')),
            dpp: parseNumBuf(getVal('dpp')),
            penjualan: parseNumBuf(getVal('penjualan')),
            bln: (() => { const raw = getVal('bln'); if (!raw) return undefined; const n = parseInt(raw.trim().replace(/[.,\s]/g, '')); return isNaN(n) || n <= 0 ? undefined : n; })(),
            principle: getVal('principle'),
            komposisi: getVal('komposisi'),
            me: getVal('me'),
            lh_lb: getVal('lh_lb'),
            created_at: new Date().toISOString()
          });
        }
      }

      // Final batch insert
      if (records.length > 0) {
        console.log(`Inserting final batch of ${records.length} records...`);
        const batchResult = await batchInsertInvoiceHistoryWithOutlets(records as InvoiceHistory[], 5000);
        if (batchResult.error) {
          console.error('Final batch error:', batchResult.error);
          alert(`Error pada batch akhir: ${batchResult.error}`);
          return;
        }
      }

      alert(`✅ Semua ${linesParsed - 1} data berhasil di-upload ke database! (${skippedRows} baris kosong dilewati)`);
      setShowUploadModal(false);
      fetchInvoiceHistory(); // Refresh the list
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (input) input.value = '';
    } catch (err) {
      console.error('CSV parsing error:', err);
      alert(`Error parsing CSV: ${err instanceof Error ? err.message : 'Unknown error'}\n\nCheck browser console (F12) for details.`);
    } finally {
      setUploadingCSV(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!formData.email || !formData.password || !formData.name) {
      setFormError('Semua field harus diisi');
      return;
    }

    if (formData.password.length < 6) {
      setFormError('Password minimal 6 karakter');
      return;
    }

    setIsCreatingUser(true);

    try {
      const result = await createUserAction(formData);
      if (result.success) {
        setFormSuccess('User berhasil dibuat!');
        setFormData({
          email: '',
          password: '',
          name: '',
          role: 'marketing',
        });
        await fetchUsers();
      } else {
        setFormError(result.error || 'Gagal membuat user');
      }
    } catch (error) {
      setFormError(`Error: ${String(error)}`);
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      name: user.name,
      role: user.role,
    });
    setEditFormError(null);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    setEditFormError(null);
    if (!editFormData.name) {
      setEditFormError('Nama tidak boleh kosong');
      return;
    }

    setIsUpdatingUser(true);

    try {
      const result = await updateUserAction({
        userId: editingUser.id,
        name: editFormData.name,
        role: editFormData.role,
      });

      if (result.success) {
        setShowEditModal(false);
        await fetchUsers();
      } else {
        setEditFormError(result.error || 'Gagal update user');
      }
    } catch (error) {
      setEditFormError(`Error: ${String(error)}`);
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;

    setIsDeletingUser(true);

    try {
      const result = await deleteUserAction(userToDelete.id);
      if (result.success) {
        setShowDeleteConfirm(false);
        setUserToDelete(null);
        await fetchUsers();
      } else {
        alert(`Gagal menghapus user: ${result.error}`);
      }
    } catch (error) {
      alert(`Error: ${String(error)}`);
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      const result = user.is_active
        ? await deactivateUserAction(user.id)
        : await activateUserAction(user.id);

      if (result.success) {
        await fetchUsers();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      alert(`Error: ${String(error)}`);
    }
  };

  const handleLogout = async () => {
    const result = await logOut();
    if (!result.error) {
      router.push('/');
    }
  };

  const filteredUsers = useMemo(() => {
    if (!userSearchQuery) return users;
    const kw = userSearchQuery.toLowerCase();
    return users.filter(u => u.name.toLowerCase().includes(kw) || u.email.toLowerCase().includes(kw));
  }, [users, userSearchQuery]);

  if (authLoading || roleCheckLoading) {
    return <LoadingSpinner />;
  }

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Network error banner */}
      {networkError && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-700 text-yellow-100 text-sm px-4 py-2 flex items-center justify-between">
          <span>⚠️ Koneksi internet terputus. Data mungkin tidak ter-update. Refresh halaman setelah koneksi pulih.</span>
          <button onClick={() => window.location.reload()} className="ml-4 bg-yellow-600 hover:bg-yellow-500 px-3 py-1 rounded text-xs font-medium">
            Refresh
          </button>
        </div>
      )}
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Super Admin Dashboard</h1>
              <p className="text-gray-400 text-sm mt-1">Manajemen Sistem & Penjualan</p>
            </div>
            <div className="flex items-center gap-6">
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex min-w-max">
          {([
            { key: 'dashboard',              label: 'Dashboard',       icon: '📊', color: 'blue'   },
            { key: 'users',                  label: 'Users',           icon: '👥', color: 'blue'   },
            { key: 'pengajuan-diskon',       label: 'Diskon',          icon: '💰', color: 'blue'   },
            { key: 'historis-pengambilan',   label: 'Historis',        icon: '🗂️', color: 'blue'   },
            { key: 'report-sales',           label: 'Report Sales',    icon: '📈', color: 'green'  },
            { key: 'akses-halaman',          label: 'Akses Halaman',   icon: '🔗', color: 'purple' },
            { key: 'kelola-data',            label: 'Kelola Data',     icon: '🗑️', color: 'red'    },
          ] as const).map(({ key, label, icon, color }) => {
            const isActive = activeTab === key;
            const borderColor = isActive
              ? color === 'green' ? 'border-green-500 text-green-400'
              : color === 'purple' ? 'border-purple-500 text-purple-400'
              : color === 'red' ? 'border-red-500 text-red-400'
              : 'border-blue-500 text-blue-400'
              : 'border-transparent text-gray-400 hover:text-gray-300';
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`py-3 px-4 text-sm font-medium border-b-2 transition whitespace-nowrap ${borderColor}`}
              >
                {icon} {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Stats Cards */}
            {loadingSales ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : salesStats ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-lg p-6 border border-blue-700">
                  <div className="text-blue-200 text-sm font-medium">Total Orders</div>
                  <div className="text-3xl font-bold text-white mt-2">{salesStats.totalOrders}</div>
                  <div className="text-blue-300 text-xs mt-2">⏳ {salesStats.pendingOrders} pending</div>
                </div>

                <div className="bg-gradient-to-br from-green-900 to-green-800 rounded-lg p-6 border border-green-700">
                  <div className="text-green-200 text-sm font-medium">Total Invoices</div>
                  <div className="text-3xl font-bold text-white mt-2">{salesStats.totalInvoices}</div>
                  <div className="text-green-300 text-xs mt-2">✅ {salesStats.releasedInvoices} released</div>
                </div>

                <div className="bg-gradient-to-br from-purple-900 to-purple-800 rounded-lg p-6 border border-purple-700">
                  <div className="text-purple-200 text-sm font-medium">Total Amount</div>
                  <div className="text-3xl font-bold text-white mt-2">
                    Rp {(salesStats.totalAmount / 1000000).toFixed(2)}M
                  </div>
                  <div className="text-purple-300 text-xs mt-2">📋 {salesStats.draftInvoices} draft</div>
                </div>
              </div>
            ) : null}

            {/* Filters */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h3 className="text-lg font-bold text-white mb-4">🔍 Filter Penjualan</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Dari Tanggal</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Sampai Tanggal</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">Semua Status</option>
                    <option value="pending">Pending</option>
                    <option value="draft">Draft</option>
                    <option value="posted">Posted</option>
                    <option value="released">Released</option>
                    <option value="approved">Approved</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setDateFrom('');
                      setDateTo('');
                      setStatusFilter('all');
                    }}
                    className="w-full bg-gray-700 hover:bg-gray-600 text-gray-200 px-4 py-2 rounded-lg font-medium transition"
                  >
                    Reset Filter
                  </button>
                </div>
              </div>
            </div>

            {/* Orders Table */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h3 className="text-lg font-bold text-white mb-4">📦 Daftar Orders ({orders.length})</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="px-4 py-3 text-left text-gray-300 font-medium">Order ID</th>
                      <th className="px-4 py-3 text-left text-gray-300 font-medium">Outlet Name</th>
                      <th className="px-4 py-3 text-right text-gray-300 font-medium">Amount</th>
                      <th className="px-4 py-3 text-left text-gray-300 font-medium">Status</th>
                      <th className="px-4 py-3 text-left text-gray-300 font-medium">Tanggal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-4 text-center text-gray-400">
                          Tidak ada orders
                        </td>
                      </tr>
                    ) : (
                      orders.map((order) => (
                        <tr key={order.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                          <td className="px-4 py-3 text-gray-300 font-mono text-xs">
                            {order.id.slice(0, 8)}...
                          </td>
                          <td className="px-4 py-3 text-gray-300">{order.outlet_name || order.outlet_id}</td>
                          <td className="px-4 py-3 text-right text-green-400 font-medium">
                            Rp {Number(order.total_amount).toLocaleString('id-ID')}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-700 text-gray-200">
                              {order.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-sm">
                            {new Date(order.created_at).toLocaleDateString('id-ID')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Invoices Table */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h3 className="text-lg font-bold text-white mb-4">📋 Daftar Invoices ({invoices.length})</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="px-4 py-3 text-left text-gray-300 font-medium">Invoice ID</th>
                      <th className="px-4 py-3 text-left text-gray-300 font-medium">Outlet</th>
                      <th className="px-4 py-3 text-right text-gray-300 font-medium">Amount</th>
                      <th className="px-4 py-3 text-left text-gray-300 font-medium">Status</th>
                      <th className="px-4 py-3 text-left text-gray-300 font-medium">Tanggal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-4 text-center text-gray-400">
                          Tidak ada invoices
                        </td>
                      </tr>
                    ) : (
                      invoices.map((invoice) => (
                        <tr key={invoice.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                          <td className="px-4 py-3 text-gray-300 font-mono text-xs">
                            {invoice.id.slice(0, 8)}...
                          </td>
                          <td className="px-4 py-3 text-gray-300">{invoice.outlet_name || invoice.outlet_id}</td>
                          <td className="px-4 py-3 text-right text-green-400 font-medium">
                            Rp {Number(invoice.amount).toLocaleString('id-ID')}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                invoice.status === 'released'
                                  ? 'bg-green-900 text-green-200'
                                  : invoice.status === 'draft'
                                  ? 'bg-yellow-900 text-yellow-200'
                                  : 'bg-gray-700 text-gray-200'
                              }`}
                            >
                              {invoice.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-sm">
                            {new Date(invoice.created_at).toLocaleDateString('id-ID')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div className="space-y-8">
            {/* Form Tambah User */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h2 className="text-2xl font-bold text-white mb-6">➕ Tambah User Baru</h2>

              <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nama <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nama lengkap user"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isCreatingUser}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="user@example.com"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isCreatingUser}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Password <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Min. 6 karakter"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isCreatingUser}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Role <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isCreatingUser}
                  >
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {formError && (
                  <div className="md:col-span-2 p-3 bg-red-900/30 border border-red-700 text-red-200 rounded-lg text-sm">
                    {formError}
                  </div>
                )}

                {formSuccess && (
                  <div className="md:col-span-2 p-3 bg-green-900/30 border border-green-700 text-green-200 rounded-lg text-sm">
                    {formSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="md:col-span-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition"
                >
                  {isCreatingUser ? 'Membuat user...' : 'Buat User'}
                </button>
              </form>
            </div>

            {/* Users List */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">👥 Daftar User</h2>
                <span className="text-sm text-gray-400">{filteredUsers.length} user</span>
              </div>

              {/* Search */}
              <div className="mb-6">
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Cari user (nama atau email)..."
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Loading */}
              {loadingUsers ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  {users.length === 0 ? 'Belum ada user' : 'User tidak ditemukan'}
                </div>
              ) : (
                /* Table */
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="px-4 py-3 text-left text-gray-300 font-medium">Nama</th>
                        <th className="px-4 py-3 text-left text-gray-300 font-medium">Email</th>
                        <th className="px-4 py-3 text-left text-gray-300 font-medium">Role</th>
                        <th className="px-4 py-3 text-left text-gray-300 font-medium">Status</th>
                        <th className="px-4 py-3 text-left text-gray-300 font-medium">Dibuat</th>
                        <th className="px-4 py-3 text-left text-gray-300 font-medium">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                          <td className="px-4 py-3 text-gray-100 font-medium">{user.name}</td>
                          <td className="px-4 py-3 text-gray-300">{user.email}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${ROLE_COLORS_DARK[user.role]}`}
                            >
                              {ROLE_OPTIONS.find((o) => o.value === user.role)?.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleToggleActive(user)}
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition ${
                                user.is_active ?? true
                                  ? 'bg-green-900 text-green-200 hover:bg-green-800'
                                  : 'bg-red-900 text-red-200 hover:bg-red-800'
                              }`}
                            >
                              {user.is_active ?? true ? 'Aktif' : 'Nonaktif'}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-sm">
                            {user.created_at
                              ? new Date(user.created_at).toLocaleDateString('id-ID', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm space-x-2">
                            <button
                              onClick={() => handleEditClick(user)}
                              className="text-blue-400 hover:text-blue-300 font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteClick(user)}
                              className="text-red-400 hover:text-red-300 font-medium"
                            >
                              Hapus
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PENGAJUAN DISKON TAB */}
        {activeTab === 'pengajuan-diskon' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">💰 Pengajuan Diskon</h2>
              <p className="text-gray-400">Kelola pengajuan diskon dari marketing</p>
            </div>

            {loadingDiscountRequests ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : discountRequests.length === 0 ? (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
                <div className="text-5xl mb-4">📋</div>
                <h3 className="text-xl font-semibold text-white mb-2">Belum ada pengajuan diskon</h3>
                <p className="text-gray-400">Pengajuan diskon dari marketing akan ditampilkan di sini</p>
              </div>
            ) : (
              <div className="space-y-4">
                {discountRequests.map((request) => (
                  <div key={request.id} className="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:border-gray-600 transition">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-lg font-semibold text-white">
                            {request.product?.nama_barang || 'Produk'}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                            request.status === 'approved'
                              ? 'bg-green-900 text-green-200'
                              : request.status === 'rejected'
                              ? 'bg-red-900 text-red-200'
                              : 'bg-yellow-900 text-yellow-200'
                          }`}>
                            {request.status === 'approved' ? '✓ Disetujui' : request.status === 'rejected' ? '✗ Ditolak' : '⏳ Pending'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-3">
                          <div>
                            <p className="text-gray-400">Outlet</p>
                            <p className="text-white font-medium">{request.outlet?.name}</p>
                            <p className="text-gray-500 text-xs">NIO: {request.outlet?.nio}</p>
                          </div>

                          <div>
                            <p className="text-gray-400">Diskon & Periode</p>
                            <p className="text-white font-medium">{request.discount_percentage}% diskon</p>
                            <p className="text-gray-500 text-xs">
                              {new Date(request.start_date).toLocaleDateString('id-ID')} - {new Date(request.end_date).toLocaleDateString('id-ID')}
                            </p>
                          </div>

                          <div>
                            <p className="text-gray-400">Diajukan oleh</p>
                            <p className="text-white font-medium">{request.marketing_user?.name}</p>
                            <p className="text-gray-500 text-xs">{request.marketing_user?.email}</p>
                          </div>

                          <div>
                            <p className="text-gray-400">Alasan</p>
                            <p className="text-white font-medium">{request.reason}</p>
                          </div>
                        </div>

                        {request.status !== 'pending' && request.approval_notes && (
                          <div className="mt-3 pt-3 border-t border-gray-700">
                            <p className="text-gray-400 text-sm mb-1">
                              {request.status === 'approved' ? 'Catatan Persetujuan:' : 'Alasan Penolakan:'}
                            </p>
                            <p className="text-gray-300 text-sm bg-gray-700/50 rounded px-3 py-2">
                              {request.approval_notes}
                            </p>
                          </div>
                        )}
                      </div>

                      {request.status === 'pending' && (
                        <div className="ml-4 flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedDiscountRequest(request);
                              setApprovalAction('approve');
                              setApprovalNotes('');
                              setShowApprovalModal(true);
                            }}
                            disabled={processingRequestId === request.id}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition text-sm whitespace-nowrap"
                          >
                            {processingRequestId === request.id ? 'Proses...' : 'Setujui'}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedDiscountRequest(request);
                              setApprovalAction('reject');
                              setApprovalNotes('');
                              setShowApprovalModal(true);
                            }}
                            disabled={processingRequestId === request.id}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition text-sm whitespace-nowrap"
                          >
                            {processingRequestId === request.id ? 'Proses...' : 'Tolak'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Approval Modal for Discount Requests */}
      {showApprovalModal && selectedDiscountRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-white mb-2">
              {approvalAction === 'approve' ? '✓ Setujui Pengajuan Diskon' : '✗ Tolak Pengajuan Diskon'}
            </h3>

            <div className="bg-gray-700/50 rounded px-3 py-2 mb-4 text-sm">
              <p className="text-gray-300">
                <span className="font-medium">{selectedDiscountRequest.product?.nama_barang}</span> - <span className="font-medium">{selectedDiscountRequest.discount_percentage}%</span> untuk{' '}
                <span className="font-medium">{selectedDiscountRequest.outlet?.name}</span>
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {approvalAction === 'approve' ? 'Catatan Persetujuan' : 'Alasan Penolakan'} {approvalAction === 'reject' && <span className="text-red-400">*</span>}
              </label>
              <textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder={approvalAction === 'approve' ? 'Masukkan catatan persetujuan (opsional)' : 'Jelaskan alasan penolakan...'}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                disabled={processingRequestId === selectedDiscountRequest.id}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  setSelectedDiscountRequest(null);
                  setApprovalNotes('');
                  setApprovalAction(null);
                }}
                disabled={processingRequestId === selectedDiscountRequest.id}
                className="flex-1 px-4 py-2 border border-gray-600 bg-gray-700 rounded-lg text-gray-200 font-medium hover:bg-gray-600 disabled:bg-gray-700"
              >
                Batal
              </button>
              <button
                onClick={approvalAction === 'approve' ? handleApproveDiscountRequest : handleRejectDiscountRequest}
                disabled={processingRequestId === selectedDiscountRequest.id || (approvalAction === 'reject' && !approvalNotes.trim())}
                className={`flex-1 px-4 py-2 text-white font-medium rounded-lg transition ${
                  approvalAction === 'approve'
                    ? 'bg-green-600 hover:bg-green-700 disabled:bg-gray-600'
                    : 'bg-red-600 hover:bg-red-700 disabled:bg-gray-600'
                }`}
              >
                {processingRequestId === selectedDiscountRequest.id
                  ? 'Proses...'
                  : approvalAction === 'approve'
                  ? 'Setujui'
                  : 'Tolak'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HISTORIS PENJUALAN TAB */}
      {activeTab === 'historis-pengambilan' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">📋 Historis Penjualan (Faktur)</h2>
              <p className="text-gray-400">Riwayat penjualan dan faktur dari semua outlet</p>
            </div>
            <div className="flex gap-2">
              {invoiceCount > 0 && (
                <button
                  onClick={handleDeleteAllInvoice}
                  disabled={loadingHistory}
                  className="bg-red-700 hover:bg-red-600 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                >
                  🗑️ Hapus Semua Data
                </button>
              )}
              <button
                onClick={() => setShowUploadModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                📤 Upload CSV
              </button>
            </div>
          </div>

          {/* Filter */}
          <div className="flex gap-3 flex-wrap">
            <SearchableSelect
              value={filterOutlet}
              onChange={(v) => handleFilterChange('outlet', v)}
              options={outletOptions}
              placeholder="Semua Outlet"
              icon="📦"
            />
            <SearchableSelect
              value={filterNamaBarang}
              onChange={(v) => handleFilterChange('namaBarang', v)}
              options={namaBarangOptions}
              placeholder="Semua Barang"
              icon="📋"
            />
            <SearchableSelect
              value={filterPrinciple}
              onChange={(v) => handleFilterChange('principle', v)}
              options={principleOptions}
              placeholder="Semua Principle"
              icon="🏢"
            />
            <SearchableSelect
              value={filterME}
              onChange={(v) => handleFilterChange('me', v)}
              options={meOptions}
              placeholder="Semua ME"
              icon="👤"
            />
          </div>

          {/* View Toggle */}
          {!loadingHistory && !loadingFilter && filteredInvoiceHistory.length > 0 && (
            <div className="flex gap-2 items-center">
              <span className="text-gray-400 text-sm">Tampilan:</span>
              <button
                onClick={() => setPivotViewMode('pivot')}
                className={`px-3 py-1 rounded text-sm font-medium transition ${pivotViewMode === 'pivot' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
              >
                Pivot Table
              </button>
              <button
                onClick={() => setPivotViewMode('raw')}
                className={`px-3 py-1 rounded text-sm font-medium transition ${pivotViewMode === 'raw' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
              >
                Data Mentah
              </button>
            </div>
          )}

          {/* Data Table */}
          {loadingHistory || loadingFilter ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : invoiceCount === 0 ? (
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
              <div className="text-5xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-white mb-2">Belum ada data historis penjualan</h3>
              <p className="text-gray-400">Upload CSV untuk mulai menampilkan data penjualan</p>
            </div>
          ) : filterOutlet === 'all' && filterNamaBarang === 'all' && filterPrinciple === 'all' && filterME === 'all' ? (
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
              <div className="text-5xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-white mb-2">Pilih filter untuk melihat data pivot</h3>
              <p className="text-gray-400">Pilih Outlet, Nama Barang, Principle, atau ME untuk memuat data dari database ({invoiceCount.toLocaleString('id-ID')}+ record tersedia)</p>
            </div>
          ) : filteredInvoiceHistory.length === 0 ? (
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
              <div className="text-5xl mb-4">📭</div>
              <h3 className="text-xl font-semibold text-white mb-2">Tidak ada data untuk filter ini</h3>
              <p className="text-gray-400">Coba ubah atau hapus filter yang dipilih</p>
            </div>
          ) : pivotViewMode === 'pivot' && pivotData ? (
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              <div className="text-sm text-gray-400 mb-3">
                {pivotData.isByOutlet
                  ? `Nama Barang: "${filterNamaBarang}" → Dikelompokkan per Outlet`
                  : filterOutlet !== 'all'
                  ? `Outlet: "${filterOutlet}" → Dikelompokkan per Barang`
                  : 'Semua Barang → Dikelompokkan per Bulan'}
                <span className="ml-3 text-gray-500">({pivotData.rows.length} baris | {filteredInvoiceHistory.length} record)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-700">
                      <th className="px-4 py-3 text-left text-gray-200 font-semibold border border-gray-600 sticky left-0 bg-gray-700 min-w-[220px] z-10">
                        {pivotData.isByOutlet ? 'Nama Outlet' : 'Nama Barang'}
                      </th>
                      {pivotData.months.map(m => (
                        <th key={m} className="px-4 py-3 text-right text-gray-200 font-semibold border border-gray-600 whitespace-nowrap min-w-[120px]">
                          {blnLabel(m)}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-right text-blue-300 font-semibold border border-gray-600 whitespace-nowrap min-w-[130px]">
                        Grand Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pivotData.rows.map((row, idx) => (
                      <tr key={idx} className={`hover:bg-gray-700/50 ${idx % 2 === 0 ? '' : 'bg-gray-800/50'}`}>
                        <td className="px-4 py-2 text-gray-200 border border-gray-700 sticky left-0 bg-gray-800 font-medium z-10 text-sm">
                          {row.name}
                        </td>
                        {pivotData.months.map(m => (
                          <td key={m} className="px-4 py-2 text-right text-gray-300 border border-gray-700 tabular-nums text-sm">
                            {row.monthData.has(m) ? row.monthData.get(m)!.toLocaleString('id-ID') : ''}
                          </td>
                        ))}
                        <td className="px-4 py-2 text-right text-blue-300 font-semibold border border-gray-700 tabular-nums text-sm">
                          {row.total.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-700 font-semibold border-t-2 border-gray-500">
                      <td className="px-4 py-3 text-gray-100 border border-gray-600 sticky left-0 bg-gray-700 z-10">
                        Grand Total
                      </td>
                      {pivotData.months.map(m => (
                        <td key={m} className="px-4 py-3 text-right text-gray-100 border border-gray-600 tabular-nums">
                          {(pivotData.colTotals.get(m) || 0).toLocaleString('id-ID')}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right text-blue-300 border border-gray-600 tabular-nums">
                        {pivotData.grandTotal.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 sticky top-0 bg-gray-900">
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">No Faktur</th>
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">Tanggal</th>
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">Bulan</th>
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">Outlet</th>
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">Nama Barang</th>
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">Qty</th>
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">Sat</th>
                    <th className="px-4 py-3 text-right text-gray-300 font-medium">Penjualan</th>
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">Salesman</th>
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">ME</th>
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">Principle</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoiceHistory.map((record, idx) => (
                    <tr key={idx} className="border-b border-gray-700 hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-gray-100 font-medium text-sm">{record.no_faktur || '-'}</td>
                      <td className="px-4 py-3 text-gray-300 text-sm">
                        {record.tgl ? new Date(record.tgl).toLocaleDateString('id-ID') : '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-300 text-sm">{record.bln ?? '-'}</td>
                      <td className="px-4 py-3 text-gray-300 text-sm">{record.outlet_name || '-'}</td>
                      <td className="px-4 py-3 text-gray-300 text-sm">{record.nama_barang || '-'}</td>
                      <td className="px-4 py-3 text-gray-300 text-sm text-right">{record.qty || '-'}</td>
                      <td className="px-4 py-3 text-gray-300 text-sm">{record.sat || '-'}</td>
                      <td className="px-4 py-3 text-gray-300 text-sm text-right">
                        {record.penjualan ? `Rp ${record.penjualan.toLocaleString('id-ID')}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-sm">{record.salesman || '-'}</td>
                      <td className="px-4 py-3 text-gray-400 text-sm">{record.me || '-'}</td>
                      <td className="px-4 py-3 text-gray-400 text-sm">{record.principle || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 text-gray-400 text-sm">
                Ditampilkan: {filteredInvoiceHistory.length.toLocaleString('id-ID')} record
              </div>
            </div>
          )}
        </div>
      )}

      {/* REPORT SALES TAB */}
      {activeTab === 'report-sales' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">📈 Report Sales</h2>
              <p className="text-gray-400 text-sm mt-1">Upload CSV laporan pencapaian sales — data disimpan ke database</p>
            </div>
            <label className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium cursor-pointer transition text-sm ${salesLoading ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}>
              {salesLoading ? '⏳ Memproses...' : '📤 Upload CSV'}
              <input type="file" accept=".csv" className="hidden" onChange={handleSalesCSVUpload} disabled={salesLoading} />
            </label>
          </div>

          {salesReport.length === 0 ? (
            /* Empty state */
            <div className="bg-gray-800 border-2 border-dashed border-gray-600 rounded-xl p-16 text-center">
              <div className="text-5xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-white mb-2">Belum ada data report</h3>
              <p className="text-gray-400 mb-6">Upload file CSV untuk melihat laporan pencapaian sales</p>
              <p className="text-gray-500 text-xs">Kolom yang dibutuhkan: no outlet, nama outlet, status, me, cluster, kelompok, target, pencapaian, P/T, P-T, T Poin, P Poin, P Poin/T Poin</p>
            </div>
          ) : (
            <>
              {/* File info */}
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span>📄</span>
                <span className="text-green-400 font-medium">{salesFileName}</span>
                <span>—</span>
                <span>{salesReport.length.toLocaleString('id-ID')} outlet</span>
                <button onClick={async () => {
                  if (!confirm('Hapus semua data report sales dari database?')) return;
                  setSalesLoading(true);
                  try {
                    const result = await deleteAllSalesReport();
                    if (result.error) { alert(`Gagal hapus: ${result.error}`); return; }
                    setSalesReport([]); setSalesFileName('');
                  } finally { setSalesLoading(false); }
                }} className="ml-2 text-red-400 hover:text-red-300 text-xs border border-red-800 px-2 py-0.5 rounded">Hapus</button>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total Outlet', value: salesSummary.total.toLocaleString('id-ID'), sub: `${salesSummary.aktif} aktif`, color: 'blue' },
                  { label: 'Total Target', value: `Rp ${salesSummary.totalTarget.toLocaleString('id-ID')}`, sub: 'dari filter aktif', color: 'gray' },
                  { label: 'Total Pencapaian', value: `Rp ${salesSummary.totalPencapaian.toLocaleString('id-ID')}`, sub: `selisih: Rp ${(salesSummary.totalPencapaian - salesSummary.totalTarget).toLocaleString('id-ID')}`, color: salesSummary.totalPencapaian >= salesSummary.totalTarget ? 'green' : 'red' },
                  { label: 'P/T %', value: `${salesSummary.ptPersen.toFixed(1)}%`, sub: `Poin: ${salesSummary.pointPersen.toFixed(1)}%`, color: salesSummary.ptPersen >= 100 ? 'green' : salesSummary.ptPersen >= 80 ? 'yellow' : 'red' },
                ].map(card => (
                  <div key={card.label} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <p className="text-gray-400 text-xs mb-1">{card.label}</p>
                    <p className={`text-lg font-bold ${card.color === 'green' ? 'text-green-400' : card.color === 'red' ? 'text-red-400' : card.color === 'yellow' ? 'text-yellow-400' : card.color === 'blue' ? 'text-blue-400' : 'text-white'}`}>{card.value}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{card.sub}</p>
                  </div>
                ))}
              </div>

              {/* Filters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* Status */}
                <select value={salesFilterStatus} onChange={e => setSalesFilterStatus(e.target.value)} className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-green-500">
                  <option value="all">Semua Status</option>
                  <option value="on">Aktif (ON)</option>
                  <option value="off">Non-Aktif (OFF)</option>
                </select>
                {/* ME */}
                <select value={salesFilterME} onChange={e => setSalesFilterME(e.target.value)} className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-green-500">
                  <option value="all">Semua ME</option>
                  {salesOptions.mes.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                {/* Cluster */}
                <select value={salesFilterCluster} onChange={e => setSalesFilterCluster(e.target.value)} className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-green-500">
                  <option value="all">Semua Cluster</option>
                  {salesOptions.clusters.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                {/* Kelompok */}
                <select value={salesFilterKelompok} onChange={e => setSalesFilterKelompok(e.target.value)} className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-green-500">
                  <option value="all">Semua Kelompok</option>
                  {salesOptions.kelompoks.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>

              {/* Table */}
              <div className="overflow-auto max-h-[60vh] rounded-xl border border-gray-700">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-800 text-gray-400 text-xs uppercase sticky top-0 z-10">
                    <tr>
                      {(
                        [
                          ['no_outlet', 'No Outlet'],
                          ['nama_outlet', 'Nama Outlet'],
                          ['status', 'Status'],
                          ['me', 'ME'],
                          ['cluster', 'Cluster'],
                          ['kelompok', 'Kelompok'],
                          ['target', 'Target'],
                          ['pencapaian', 'Pencapaian'],
                          ['pt_persen', 'P/T %'],
                          ['pt_selisih', 'P-T'],
                          ['t_poin', 'T Poin'],
                          ['p_poin', 'P Poin'],
                          ['poin_persen', 'P Poin/T Poin %'],
                        ] as [keyof SalesReportRow, string][]
                      ).map(([key, label]) => (
                        <th
                          key={key}
                          className="px-3 py-3 text-left cursor-pointer hover:text-white select-none whitespace-nowrap"
                          onClick={() => {
                            if (salesSortKey === key) setSalesSortDir(d => d === 'asc' ? 'desc' : 'asc');
                            else { setSalesSortKey(key); setSalesSortDir('asc'); }
                          }}
                        >
                          {label} {salesSortKey === key ? (salesSortDir === 'asc' ? '▲' : '▼') : ''}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {salesFiltered.map((row, idx) => {
                      const ptColor = row.pt_persen >= 100 ? 'text-green-400' : row.pt_persen >= 80 ? 'text-yellow-400' : 'text-red-400';
                      const poinColor = row.poin_persen >= 100 ? 'text-green-400' : row.poin_persen >= 80 ? 'text-yellow-400' : 'text-red-400';
                      const isAktif = row.status.toLowerCase() === 'on';
                      return (
                        <tr key={idx} className="border-t border-gray-700 hover:bg-gray-700/40">
                          <td className="px-3 py-2.5 text-gray-300">{row.no_outlet}</td>
                          <td className="px-3 py-2.5 text-white font-medium whitespace-nowrap">{row.nama_outlet}</td>
                          <td className="px-3 py-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${isAktif ? 'bg-green-900/50 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                              {isAktif ? 'ON' : 'OFF'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-gray-300 whitespace-nowrap">{row.me}</td>
                          <td className="px-3 py-2.5 text-gray-300">{row.cluster}</td>
                          <td className="px-3 py-2.5 text-gray-300 whitespace-nowrap">{row.kelompok}</td>
                          <td className="px-3 py-2.5 text-gray-300 text-right">{row.target.toLocaleString('id-ID')}</td>
                          <td className="px-3 py-2.5 text-gray-300 text-right">{row.pencapaian.toLocaleString('id-ID')}</td>
                          <td className={`px-3 py-2.5 text-right font-semibold ${ptColor}`}>{row.pt_persen.toFixed(1)}%</td>
                          <td className={`px-3 py-2.5 text-right ${row.pt_selisih >= 0 ? 'text-green-400' : 'text-red-400'}`}>{row.pt_selisih.toLocaleString('id-ID')}</td>
                          <td className="px-3 py-2.5 text-gray-300 text-right">{row.t_poin.toLocaleString('id-ID')}</td>
                          <td className="px-3 py-2.5 text-gray-300 text-right">{row.p_poin.toLocaleString('id-ID')}</td>
                          <td className={`px-3 py-2.5 text-right font-semibold ${poinColor}`}>{row.poin_persen.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                    {/* Summary row */}
                    <tr className="border-t-2 border-gray-500 bg-gray-800 font-semibold text-xs">
                      <td className="px-3 py-2.5 text-gray-400" colSpan={6}>TOTAL ({salesFiltered.length} outlet)</td>
                      <td className="px-3 py-2.5 text-white text-right">{salesSummary.totalTarget.toLocaleString('id-ID')}</td>
                      <td className="px-3 py-2.5 text-white text-right">{salesSummary.totalPencapaian.toLocaleString('id-ID')}</td>
                      <td className={`px-3 py-2.5 text-right ${salesSummary.ptPersen >= 100 ? 'text-green-400' : salesSummary.ptPersen >= 80 ? 'text-yellow-400' : 'text-red-400'}`}>{salesSummary.ptPersen.toFixed(1)}%</td>
                      <td className={`px-3 py-2.5 text-right ${salesSummary.totalPencapaian - salesSummary.totalTarget >= 0 ? 'text-green-400' : 'text-red-400'}`}>{(salesSummary.totalPencapaian - salesSummary.totalTarget).toLocaleString('id-ID')}</td>
                      <td className="px-3 py-2.5 text-white text-right">{salesSummary.totalTPoin.toLocaleString('id-ID')}</td>
                      <td className="px-3 py-2.5 text-white text-right">{salesSummary.totalPPoin.toLocaleString('id-ID')}</td>
                      <td className={`px-3 py-2.5 text-right ${salesSummary.pointPersen >= 100 ? 'text-green-400' : salesSummary.pointPersen >= 80 ? 'text-yellow-400' : 'text-red-400'}`}>{salesSummary.pointPersen.toFixed(1)}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* AKSES HALAMAN TAB */}
      {activeTab === 'akses-halaman' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-2xl font-bold text-white mb-2">🔗 Akses Halaman</h2>
          <p className="text-gray-400 mb-8">Masuk ke halaman manapun sebagai Super Admin.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: 'Marketing', desc: 'Buat & kelola sales order', icon: '🛒', path: '/marketing' },
              { label: 'Admin Keuangan', desc: 'Setujui order & kelola keuangan', icon: '💰', path: '/admin-keuangan' },
              { label: 'Fakturis', desc: 'Input faktur Zahir & upload foto', icon: '📝', path: '/fakturis' },
              { label: 'Admin Logistik (Masuk)', desc: 'Packing & verifikasi barang', icon: '📦', path: '/admin-logistik-in' },
              { label: 'Admin Ekspedisi', desc: 'Rencanakan & update pengiriman', icon: '🚚', path: '/admin-logistik-out' },
              { label: 'Petugas Ekspedisi', desc: 'Lihat riwayat pengiriman', icon: '📋', path: '/petugas-ekspedisi' },
            ].map((page) => (
              <div key={page.path} className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col gap-3 hover:border-purple-600 transition-colors">
                <div className="text-3xl">{page.icon}</div>
                <div>
                  <p className="text-white font-semibold">{page.label}</p>
                  <p className="text-gray-400 text-sm">{page.desc}</p>
                </div>
                <button
                  onClick={() => router.push(page.path)}
                  className="mt-auto w-full bg-purple-700 hover:bg-purple-600 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                >
                  Buka Halaman →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KELOLA DATA TAB */}
      {activeTab === 'kelola-data' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-2xl font-bold text-white mb-2">🗑️ Kelola Data</h2>
          <p className="text-gray-400 mb-6">Hapus data lama atau data uji dari sistem. Semua aksi memerlukan konfirmasi berlapis.</p>

          {/* Sub tab */}
          <div className="flex gap-2 mb-6">
            {([
              { key: 'invoice', label: '📄 Invoice' },
              { key: 'ekspedisi', label: '🚚 Ekspedisi' },
              { key: 'orders', label: '📦 Orders' },
            ] as const).map((sub) => (
              <button
                key={sub.key}
                onClick={() => setKelolaSub(sub.key)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  kelolaSub === sub.key ? 'bg-red-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>

          {/* Filter bar */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4 space-y-3">
            {/* Search + date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={kelolaSub === 'orders' ? ordersSearch : adminInvoiceSearch}
                onChange={(e) => kelolaSub === 'orders' ? setOrdersSearch(e.target.value) : setAdminInvoiceSearch(e.target.value)}
                placeholder={kelolaSub === 'orders' ? 'Cari outlet atau order ID...' : 'Cari outlet atau nomor faktur...'}
                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-red-500"
              />
              <div className="flex items-center gap-2">
                <label className="text-gray-400 text-xs whitespace-nowrap">Dari</label>
                <input
                  type="date"
                  value={kelolaDateFrom}
                  onChange={(e) => setKelolaDateFrom(e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-gray-400 text-xs whitespace-nowrap">Sampai</label>
                <input
                  type="date"
                  value={kelolaDateTo}
                  onChange={(e) => setKelolaDateTo(e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={kelolaSub === 'orders' ? fetchAdminOrders : fetchAdminInvoices}
                className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded-lg transition-colors"
              >
                🔄 Refresh
              </button>
              {kelolaSub === 'invoice' && (() => {
                const filtered = adminInvoices.filter(inv => {
                  if (kelolaDateFrom && inv.created_at < kelolaDateFrom) return false;
                  if (kelolaDateTo && inv.created_at > kelolaDateTo + 'T23:59:59') return false;
                  if (adminInvoiceSearch.trim()) {
                    const q = adminInvoiceSearch.toLowerCase();
                    return inv.outlet?.name?.toLowerCase().includes(q) || inv.faktur_number?.toLowerCase().includes(q);
                  }
                  return true;
                });
                return (
                  <>
                    <button
                      onClick={() => handleBackupAndDelete(filtered)}
                      disabled={backingUp || filtered.length === 0}
                      className="bg-green-800 hover:bg-green-700 disabled:bg-gray-700 text-green-200 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                    >
                      {backingUp ? '⏳ Memproses backup...' : `💾 Backup & Hapus (${filtered.length})`}
                    </button>
                    <button
                      onClick={handleDeleteAllInvoices}
                      disabled={backingUp}
                      className="bg-red-800 hover:bg-red-700 disabled:bg-gray-700 text-red-200 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                    >
                      🗑️ Hapus Semua (tanpa backup)
                    </button>
                  </>
                );
              })()}
              {kelolaSub === 'orders' && (
                <button
                  onClick={handleDeleteAllOrders}
                  disabled={loadingAdminOrders || adminOrders.length === 0}
                  className="bg-red-800 hover:bg-red-700 disabled:bg-gray-700 text-red-200 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  🗑️ Hapus Semua Orders ({adminOrders.length})
                </button>
              )}
            </div>
          </div>

          {/* Invoice & Ekspedisi list */}
          {kelolaSub !== 'orders' && (
            loadingAdminInvoices ? (
              <div className="text-center py-12 text-gray-400">Memuat data...</div>
            ) : (
              <div className="space-y-2">
                {adminInvoices
                  .filter(inv => {
                    if (kelolaSub === 'ekspedisi') return inv.delivery_status != null || inv.shipment_status === 'completed';
                    return true;
                  })
                  .filter(inv => {
                    if (kelolaDateFrom && inv.created_at < kelolaDateFrom) return false;
                    if (kelolaDateTo && inv.created_at > kelolaDateTo + 'T23:59:59') return false;
                    if (!adminInvoiceSearch.trim()) return true;
                    const q = adminInvoiceSearch.toLowerCase();
                    return (
                      inv.outlet?.name?.toLowerCase().includes(q) ||
                      inv.faktur_number?.toLowerCase().includes(q) ||
                      inv.id.toLowerCase().includes(q)
                    );
                  })
                  .map((inv) => {
                    const label = inv.outlet?.name
                      ? `${inv.outlet.name}${inv.faktur_number ? ` — ${inv.faktur_number}` : ''}`
                      : inv.id.slice(0, 8).toUpperCase();
                    const statusColor =
                      inv.delivery_status === 'terkirim' ? 'text-green-400' :
                      inv.delivery_status === 'gagal_kirim' ? 'text-red-400' :
                      inv.faktur_status === 'terfaktur' ? 'text-purple-400' :
                      inv.status === 'released' ? 'text-blue-400' : 'text-gray-400';

                    return (
                      <div key={inv.id} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{label}</p>
                          <p className="text-gray-500 text-xs mt-0.5">
                            {new Date(inv.created_at).toLocaleDateString('id-ID')} •{' '}
                            Rp {inv.amount?.toLocaleString('id-ID') || 0} •{' '}
                            <span className={statusColor}>
                              {inv.delivery_status ?? inv.faktur_status ?? inv.status}
                            </span>
                          </p>
                        </div>
                        {kelolaSub === 'invoice' ? (
                          <button
                            onClick={() => handleDeleteInvoice(inv.id, label)}
                            disabled={deletingInvoiceId === inv.id}
                            className="shrink-0 bg-red-900 hover:bg-red-700 disabled:bg-gray-700 text-red-200 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                          >
                            {deletingInvoiceId === inv.id ? 'Menghapus...' : 'Hapus'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDeleteDelivery(inv.id, label)}
                            disabled={deletingDeliveryId === inv.id}
                            className="shrink-0 bg-orange-900 hover:bg-orange-700 disabled:bg-gray-700 text-orange-200 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                          >
                            {deletingDeliveryId === inv.id ? 'Mereset...' : 'Reset Ekspedisi'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                {adminInvoices.filter(inv => kelolaSub === 'ekspedisi' ? inv.delivery_status != null || inv.shipment_status === 'completed' : true).length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    {kelolaSub === 'ekspedisi' ? 'Tidak ada data ekspedisi yang selesai' : 'Tidak ada invoice'}
                  </div>
                )}
              </div>
            )
          )}

          {/* Orders list */}
          {kelolaSub === 'orders' && (
            loadingAdminOrders ? (
              <div className="text-center py-12 text-gray-400">Memuat data orders...</div>
            ) : (
              <div className="space-y-2">
                {adminOrders
                  .filter(order => {
                    if (kelolaDateFrom && order.created_at < kelolaDateFrom) return false;
                    if (kelolaDateTo && order.created_at > kelolaDateTo + 'T23:59:59') return false;
                    if (!ordersSearch.trim()) return true;
                    const q = ordersSearch.toLowerCase();
                    return (
                      order.outlet_name?.toLowerCase().includes(q) ||
                      order.id.toLowerCase().includes(q)
                    );
                  })
                  .map((order) => {
                    const label = order.outlet_name || order.id.slice(0, 8).toUpperCase();
                    const statusColor =
                      order.status === 'pending' ? 'text-yellow-400' :
                      order.status === 'completed' ? 'text-green-400' : 'text-gray-400';
                    return (
                      <div key={order.id} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{label}</p>
                          <p className="text-gray-500 text-xs mt-0.5">
                            {new Date(order.created_at).toLocaleDateString('id-ID')} •{' '}
                            Rp {order.total_amount?.toLocaleString('id-ID') || 0} •{' '}
                            <span className={statusColor}>{order.status}</span>
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteOrder(order.id, label)}
                          disabled={deletingOrderId === order.id}
                          className="shrink-0 bg-red-900 hover:bg-red-700 disabled:bg-gray-700 text-red-200 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                        >
                          {deletingOrderId === order.id ? 'Menghapus...' : 'Hapus'}
                        </button>
                      </div>
                    );
                  })}
                {adminOrders.length === 0 && (
                  <div className="text-center py-12 text-gray-500">Tidak ada orders</div>
                )}
              </div>
            )
          )}
        </div>
      )}

      {/* Upload CSV Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-lg max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-4">📤 Upload Historis Penjualan (Faktur) CSV</h3>

            <div className="mb-4">
              <p className="text-gray-300 text-sm mb-2 font-semibold">✅ Format CSV Support:</p>
              <div className="bg-gray-700/50 rounded p-2 text-gray-400 text-xs mb-2">
                <div className="font-semibold text-blue-300 mb-1">Parser Support:</div>
                <div>• Delimiter: Comma (,), Semicolon (;), atau Tab</div>
                <div>• Quoted values: "value with, comma"</div>
                <div>• Date format: YYYY-MM-DD atau DD/MM/YYYY</div>
                <div>• Kolom bisa dalam urutan berbeda (auto-detect header)</div>
              </div>

              <p className="text-gray-300 text-sm mb-2 font-semibold">📋 Kolom yang didukung:</p>
              <div className="bg-gray-700/50 rounded p-3 text-gray-400 text-xs space-y-1 max-h-48 overflow-y-auto">
                <div className="text-yellow-300 font-semibold">WAJIB:</div>
                <div>• <strong>nama_barang</strong> - Nama barang / SKU</div>
                <div>• <strong>tgl</strong> - Tanggal faktur (YYYY-MM-DD atau DD/MM/YYYY)</div>
                
                <div className="text-blue-300 font-semibold mt-2">OPSIONAL (untuk filter):</div>
                <div>• <strong>no_outlet</strong> - Nomor outlet (digunakan di filter)</div>
                <div>• <strong>principle</strong> - Perusahaan farmasi (digunakan di filter)</div>
                <div>• <strong>me</strong> - Marketing Executive (digunakan di filter)</div>
                
                <div className="text-green-300 font-semibold mt-2">OPSIONAL (lainnya):</div>
                <div>• gudang, no_faktur, salesman, qty, sat, disc, dpp, penjualan, bln, komposisi, lh_lb</div>
              </div>
              
              <p className="text-yellow-400 text-xs mt-2">
                💡 Parser otomatis detect delimiter dan normalize date format!<br/>
                🔍 Buka browser console (F12) untuk debug info jika ada masalah
              </p>
            </div>

            <div className="mb-6 p-4 bg-gray-700 border-2 border-dashed border-gray-600 rounded-lg">
              <input
                type="file"
                accept=".csv"
                onChange={handleUploadCSV}
                disabled={uploadingCSV}
                className="block w-full text-sm text-gray-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-600 file:text-white
                  hover:file:bg-blue-700
                  disabled:opacity-50"
              />
              <p className="text-gray-500 text-xs mt-2">Max 5MB</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowUploadModal(false)}
                disabled={uploadingCSV}
                className="w-full px-4 py-2 border border-gray-600 bg-gray-700 rounded-lg text-gray-200 font-medium hover:bg-gray-600 disabled:bg-gray-700"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-white mb-4">Edit User</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Nama</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isUpdatingUser}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                <select
                  value={editFormData.role}
                  onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value as UserRole })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isUpdatingUser}
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {editFormError && (
                <div className="p-3 bg-red-900/30 border border-red-700 text-red-200 rounded-lg text-sm">
                  {editFormError}
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  disabled={isUpdatingUser}
                  className="flex-1 px-4 py-2 border border-gray-600 bg-gray-700 rounded-lg text-gray-200 font-medium hover:bg-gray-600 disabled:bg-gray-700"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isUpdatingUser}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium rounded-lg"
                >
                  {isUpdatingUser ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-lg max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-white mb-2">Hapus User?</h3>
            <p className="text-gray-300 mb-4">
              Anda yakin ingin menghapus user <strong>{userToDelete.name}</strong> ({userToDelete.email})?
            </p>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeletingUser}
                className="flex-1 px-4 py-2 border border-gray-600 bg-gray-700 rounded-lg text-gray-200 font-medium hover:bg-gray-600 disabled:bg-gray-700"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeletingUser}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-medium rounded-lg"
              >
                {isDeletingUser ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
