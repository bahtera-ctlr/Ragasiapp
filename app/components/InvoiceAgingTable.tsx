'use client';

import { useEffect, useMemo, useState } from 'react';
import Select, { StylesConfig } from 'react-select';
import {
  InvoiceAgingRow,
  getAllInvoiceAging,
  uploadInvoiceAgingData,
  computeUmurFaktur,
  computeHariOverdue,
} from '@/lib/invoice-aging';
import { exportInvoiceAgingToCSV } from '@/lib/export';

type Option = { value: string; label: string };

const ITEMS_PER_PAGE = 50;

const selectStyles: StylesConfig<Option, false> = {
  control: (base) => ({
    ...base,
    backgroundColor: '#1f2937',
    borderColor: '#374151',
    minHeight: '38px',
  }),
  menu: (base) => ({ ...base, backgroundColor: '#1f2937', zIndex: 50 }),
  singleValue: (base) => ({ ...base, color: '#fff' }),
  input: (base) => ({ ...base, color: '#fff' }),
  placeholder: (base) => ({ ...base, color: '#9ca3af' }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? '#2563eb' : state.isFocused ? '#374151' : '#1f2937',
    color: '#fff',
    cursor: 'pointer',
  }),
};

function formatTanggal(iso?: string) {
  if (!iso) return '-';
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function formatRupiah(value?: number) {
  if (value === undefined || value === null) return '-';
  return `Rp ${value.toLocaleString('id-ID')}`;
}

export default function InvoiceAgingTable({
  canUpload,
}: {
  canUpload: boolean;
}) {
  const [rows, setRows] = useState<InvoiceAgingRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const [filterOutlet, setFilterOutlet] = useState<Option | null>(null);
  const [filterSales, setFilterSales] = useState<Option | null>(null);
  const [page, setPage] = useState(1);

  const fetchData = async () => {
    setIsLoading(true);
    const { data, error } = await getAllInvoiceAging();
    if (!error && data) {
      setRows(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const text = await file.text();
      const result = await uploadInvoiceAgingData(text);
      setUploadSuccess(
        `✓ Berhasil upload: ${result.upserted} faktur tersimpan, ${result.removed} faktur lunas dihapus.` +
          (result.skippedRows > 0 ? ` ${result.skippedRows} baris dilewati karena data tidak lengkap.` : '')
      );
      setTimeout(() => fetchData(), 300);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : String(error));
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const outletOptions = useMemo<Option[]>(() => {
    const set = new Set<string>();
    rows.forEach(r => r.nama_outlet && set.add(r.nama_outlet));
    return Array.from(set).sort().map(v => ({ value: v, label: v }));
  }, [rows]);

  const salesOptions = useMemo<Option[]>(() => {
    const set = new Set<string>();
    rows.forEach(r => r.sales && set.add(r.sales));
    return Array.from(set).sort().map(v => ({ value: v, label: v }));
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      if (filterOutlet && r.nama_outlet !== filterOutlet.value) return false;
      if (filterSales && r.sales !== filterSales.value) return false;
      return true;
    });
  }, [rows, filterOutlet, filterSales]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / ITEMS_PER_PAGE));
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredRows.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRows, page]);

  useEffect(() => {
    setPage(1);
  }, [filterOutlet, filterSales]);

  const lastUpdated = useMemo(() => {
    let max: number | null = null;
    rows.forEach(r => {
      if (!r.updated_at) return;
      const t = new Date(r.updated_at).getTime();
      if (max === null || t > max) max = t;
    });
    return max;
  }, [rows]);

  const totalSaldo = useMemo(() => {
    return filteredRows.reduce((sum, r) => sum + (r.saldo ?? 0), 0);
  }, [filteredRows]);

  const dueRows = useMemo(() => {
    return filteredRows.filter(r => {
      const umur = computeUmurFaktur(r.tgl_faktur);
      if (umur === null) return false;
      return umur - (r.top_hari ?? 0) >= 0;
    });
  }, [filteredRows]);

  const dueCount = dueRows.length;
  const dueSaldo = useMemo(() => {
    return dueRows.reduce((sum, r) => sum + (r.saldo ?? 0), 0);
  }, [dueRows]);

  return (
    <div>
      {canUpload && (
        <div className="bg-gray-900 border-2 border-dashed border-gray-700 rounded-lg p-8 mb-6">
          <div className="text-center">
            <p className="text-lg font-semibold mb-4">Upload Faktur Piutang</p>
            <p className="text-sm text-gray-400 mb-6">
              Format CSV: SALES, PIC, KECAMATAN, NO OUTLET, ME, JAD TAG, NAMA OUTLET, NO FAKTUR, TGL FAKTUR, TGL JAPO, SALDO, TOP, NILAI
              <br />
              <span className="text-xs text-gray-500 mt-2 block">
                TGL FAKTUR &amp; TGL JAPO format: DD/MM/YY (contoh: 19/05/26). Umur faktur dan hari overdue dihitung otomatis oleh sistem.
              </span>
              <span className="text-xs text-yellow-500 mt-3 block">
                ⚠️ Faktur yang sudah lunas (tidak ada di file baru) otomatis hilang dari daftar. Status konfirmasi pada faktur yang masih outstanding akan tetap dipertahankan.
              </span>
            </p>

            <label className="inline-block">
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
              <span
                className={`inline-block px-6 py-3 rounded font-semibold cursor-pointer transition-colors ${
                  uploading ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {uploading ? '⏳ Uploading...' : '📤 Pilih File CSV'}
              </span>
            </label>
          </div>

          {uploadError && (
            <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mt-4 text-sm">{uploadError}</div>
          )}
          {uploadSuccess && (
            <div className="bg-green-900 border border-green-700 text-green-200 px-4 py-3 rounded mt-4 text-sm">{uploadSuccess}</div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-bold">Daftar Faktur Piutang</h2>
          <p className="text-sm text-gray-400">
            Update terakhir: {lastUpdated ? new Date(lastUpdated).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
          </p>
        </div>
        {canUpload && (
          <button
            onClick={() => exportInvoiceAgingToCSV(filteredRows)}
            disabled={filteredRows.length === 0}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2"
          >
            📧 Export CSV
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <Select<Option, false>
          instanceId="filter-outlet"
          options={outletOptions}
          value={filterOutlet}
          onChange={(v) => setFilterOutlet(v)}
          isClearable
          placeholder="Semua Nama Outlet"
          styles={selectStyles}
        />
        <Select<Option, false>
          instanceId="filter-sales"
          options={salesOptions}
          value={filterSales}
          onChange={(v) => setFilterSales(v)}
          isClearable
          placeholder="Semua Sales"
          styles={selectStyles}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-xs text-gray-400">Total Faktur</p>
          <p className="text-2xl font-bold">
            {filteredRows.length} <span className="text-base font-normal text-gray-400">/ {formatRupiah(totalSaldo)}</span>
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-xs text-gray-400">Sudah Jatuh Tempo</p>
          <p className="text-2xl font-bold text-red-400">
            {dueCount} <span className="text-base font-normal text-red-300/80">/ {formatRupiah(dueSaldo)}</span>
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center text-gray-400 py-12">Memuat data...</div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-auto max-h-[70vh]">
            <table className="w-full whitespace-nowrap">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="sticky top-0 z-10 bg-gray-800 px-4 py-3 text-left text-sm font-medium">Nama Outlet</th>
                  <th className="sticky top-0 z-10 bg-gray-800 px-4 py-3 text-left text-sm font-medium">ME</th>
                  <th className="sticky top-0 z-10 bg-gray-800 px-4 py-3 text-left text-sm font-medium">No Faktur</th>
                  <th className="sticky top-0 z-10 bg-gray-800 px-4 py-3 text-left text-sm font-medium">Tgl Faktur</th>
                  <th className="sticky top-0 z-10 bg-gray-800 px-4 py-3 text-left text-sm font-medium">Tgl Japo</th>
                  <th className="sticky top-0 z-10 bg-gray-800 px-4 py-3 text-left text-sm font-medium">Saldo</th>
                  <th className="sticky top-0 z-10 bg-gray-800 px-4 py-3 text-left text-sm font-medium">TOP</th>
                  <th className="sticky top-0 z-10 bg-gray-800 px-4 py-3 text-left text-sm font-medium">Usia Faktur</th>
                  <th className="sticky top-0 z-10 bg-gray-800 px-4 py-3 text-left text-sm font-medium">DUE</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map(row => {
                  const umur = computeUmurFaktur(row.tgl_faktur);
                  const overdue = computeHariOverdue(row.tgl_japo);
                  const isOverdue = overdue !== null && overdue > 0;
                  return (
                    <tr key={row.id} className="border-b border-gray-700 hover:bg-gray-800">
                      <td className="px-4 py-3 text-sm">{row.nama_outlet}</td>
                      <td className="px-4 py-3 text-sm">{row.me || '-'}</td>
                      <td className="px-4 py-3 text-sm">{row.no_faktur}</td>
                      <td className="px-4 py-3 text-sm">{formatTanggal(row.tgl_faktur)}</td>
                      <td className="px-4 py-3 text-sm">{formatTanggal(row.tgl_japo)}</td>
                      <td className="px-4 py-3 text-sm">{formatRupiah(row.saldo)}</td>
                      <td className="px-4 py-3 text-sm">{row.top_hari ?? '-'}</td>
                      <td className="px-4 py-3 text-sm">{umur ?? '-'}</td>
                      <td className={`px-4 py-3 text-sm font-semibold ${isOverdue ? 'text-red-400' : 'text-gray-400'}`}>
                        {overdue ?? '-'}
                      </td>
                    </tr>
                  );
                })}
                {paginatedRows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      Tidak ada data faktur yang cocok dengan filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6 pb-4">
          <button
            onClick={() => setPage(p => Math.max(p - 1, 1))}
            disabled={page === 1}
            className="px-3 py-2 bg-gray-800 text-gray-200 rounded hover:bg-gray-700 disabled:opacity-50"
          >
            ← Sebelumnya
          </button>
          <span className="text-sm text-gray-400">Halaman {page} dari {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(p + 1, totalPages))}
            disabled={page === totalPages}
            className="px-3 py-2 bg-gray-800 text-gray-200 rounded hover:bg-gray-700 disabled:opacity-50"
          >
            Selanjutnya →
          </button>
        </div>
      )}
    </div>
  );
}
