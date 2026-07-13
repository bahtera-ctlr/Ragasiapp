'use client';

import { useEffect, useMemo, useState } from 'react';
import Select, { StylesConfig } from 'react-select';
import { getAllPriceListProducts, type PriceListProduct } from '@/lib/price-list';
import { CLUSTER_OPTIONS, computeDiscountRate, getClusterTerms, type ClusterCode } from '@/lib/cluster-discount';
import { generatePriceListPDF } from '@/lib/price-list-pdf';

type Option = { value: string; label: string };

const ITEMS_PER_PAGE = 50;
// Nilai representatif untuk diskon "reguler" per golongan — di atas ambang flat-9%,
// di bawah ambang bonus >350rb (bonus & flat-9% dijelaskan sebagai syarat & ketentuan).
const REGULAR_SUBTOTAL = 100000;

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

function formatRupiah(value: number) {
  return `Rp ${Math.round(value).toLocaleString('id-ID')}`;
}

type PriceRow = PriceListProduct & {
  rate: number;
  nett: number;
};

export default function DaftarHargaTable() {
  const [products, setProducts] = useState<PriceListProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [cluster, setCluster] = useState<ClusterCode | null>(null);
  const [showClusterModal, setShowClusterModal] = useState(true);

  const [filterPrinciple, setFilterPrinciple] = useState<Option | null>(null);
  const [filterKomposisi, setFilterKomposisi] = useState<Option | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const { data, error } = await getAllPriceListProducts();
      if (error) setLoadError(error);
      else setProducts(data || []);
      setIsLoading(false);
    })();
  }, []);

  const principleOptions = useMemo<Option[]>(() => {
    const set = new Set<string>();
    products.forEach((p) => p.principle && set.add(p.principle));
    return Array.from(set).sort().map((v) => ({ value: v, label: v }));
  }, [products]);

  const komposisiOptions = useMemo<Option[]>(() => {
    const set = new Set<string>();
    products.forEach((p) => p.komposisi && set.add(p.komposisi));
    return Array.from(set).sort().map((v) => ({ value: v, label: v }));
  }, [products]);

  const rows = useMemo<PriceRow[]>(() => {
    if (!cluster) return [];
    const searchLower = search.trim().toLowerCase();
    return products
      .filter((p) => {
        if (filterPrinciple && p.principle !== filterPrinciple.value) return false;
        if (filterKomposisi && p.komposisi !== filterKomposisi.value) return false;
        if (searchLower && !p.nama_barang.toLowerCase().includes(searchLower)) return false;
        return true;
      })
      .map((p) => {
        const hjr = p.harga_jual_ragasi || 0;
        const rate = computeDiscountRate(cluster, p.golongan_barang, p.program, REGULAR_SUBTOTAL);
        return {
          ...p,
          rate,
          nett: hjr - (hjr * rate) / 100,
        };
      });
  }, [products, cluster, filterPrinciple, filterKomposisi, search]);

  const terms = useMemo(() => (cluster ? getClusterTerms(cluster) : null), [cluster]);

  useEffect(() => {
    setPage(1);
  }, [filterPrinciple, filterKomposisi, search, cluster]);

  const totalPages = Math.max(1, Math.ceil(rows.length / ITEMS_PER_PAGE));
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return rows.slice(start, start + ITEMS_PER_PAGE);
  }, [rows, page]);

  const clusterLabel = CLUSTER_OPTIONS.find((c) => c.code === cluster)?.label || '';

  const handleDownloadPDF = () => {
    if (!terms) return;
    const filterParts: string[] = [];
    if (filterPrinciple) filterParts.push(`Principle: ${filterPrinciple.label}`);
    if (filterKomposisi) filterParts.push(`Komposisi: ${filterKomposisi.label}`);
    generatePriceListPDF(
      clusterLabel,
      filterParts.join(' | '),
      rows.map((r) => ({
        nama_barang: r.nama_barang,
        principle: r.principle,
        komposisi: r.komposisi,
        hjr: r.harga_jual_ragasi || 0,
        rate: r.rate,
        nett: r.nett,
      })),
      terms
    );
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg sm:text-2xl font-bold text-white">💵 Daftar Harga</h2>
          <p className="text-gray-400 text-xs sm:text-sm">
            {cluster ? `Skema diskon: ${clusterLabel}` : 'Pilih cluster untuk menampilkan daftar harga'}
          </p>
        </div>
        <div className="flex gap-2">
          {cluster && (
            <button
              onClick={() => setShowClusterModal(true)}
              className="bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-3 sm:px-4 rounded-lg text-sm transition-colors"
            >
              🔄 Ganti Cluster
            </button>
          )}
          <button
            onClick={handleDownloadPDF}
            disabled={!cluster || rows.length === 0}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 px-3 sm:px-4 rounded-lg text-sm transition-colors"
          >
            📄 Download PDF
          </button>
        </div>
      </div>

      {loadError && (
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-4 text-sm">{loadError}</div>
      )}

      {cluster && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <input
              type="text"
              placeholder="Cari nama barang..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-600 text-sm h-[38px]"
            />
            <Select<Option, false>
              instanceId="filter-principle-harga"
              options={principleOptions}
              value={filterPrinciple}
              onChange={(v) => setFilterPrinciple(v)}
              isClearable
              placeholder="Semua Principle"
              styles={selectStyles}
            />
            <Select<Option, false>
              instanceId="filter-komposisi-harga"
              options={komposisiOptions}
              value={filterKomposisi}
              onChange={(v) => setFilterKomposisi(v)}
              isClearable
              placeholder="Semua Komposisi"
              styles={selectStyles}
            />
          </div>

          {isLoading ? (
            <div className="text-center text-gray-400 py-12">Memuat data...</div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
              <div className="overflow-auto max-h-[70vh]">
                <table className="w-full whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="sticky top-0 z-10 bg-gray-800 px-3 py-3 text-left text-xs font-medium">Nama Barang</th>
                      <th className="sticky top-0 z-10 bg-gray-800 px-3 py-3 text-left text-xs font-medium">Komposisi</th>
                      <th className="sticky top-0 z-10 bg-gray-800 px-3 py-3 text-left text-xs font-medium">Principle</th>
                      <th className="sticky top-0 z-10 bg-gray-800 px-3 py-3 text-right text-xs font-medium">HJR</th>
                      <th className="sticky top-0 z-10 bg-gray-800 px-3 py-3 text-right text-xs font-medium">Stok</th>
                      <th className="sticky top-0 z-10 bg-gray-800 px-3 py-3 text-right text-xs font-medium">Diskon</th>
                      <th className="sticky top-0 z-10 bg-gray-800 px-3 py-3 text-right text-xs font-medium">Nett</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.map((row) => (
                      <tr key={row.id} className="border-b border-gray-700 hover:bg-gray-800">
                        <td className="px-3 py-2.5 text-sm">{row.nama_barang}</td>
                        <td className="px-3 py-2.5 text-sm text-gray-400">{row.komposisi || '-'}</td>
                        <td className="px-3 py-2.5 text-sm text-gray-400">{row.principle || '-'}</td>
                        <td className="px-3 py-2.5 text-sm text-right">{formatRupiah(row.harga_jual_ragasi || 0)}</td>
                        <td className={`px-3 py-2.5 text-sm text-right ${(row.stok ?? 0) <= 0 ? 'text-red-400' : 'text-gray-300'}`}>
                          {(row.stok ?? 0).toLocaleString('id-ID')}
                        </td>
                        <td className="px-3 py-2.5 text-sm text-right text-yellow-400">{row.rate}%</td>
                        <td className="px-3 py-2.5 text-sm text-right font-medium">{formatRupiah(row.nett)}</td>
                      </tr>
                    ))}
                    {paginatedRows.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                          Tidak ada barang yang cocok dengan filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-3 text-gray-400 text-xs">
            Ditampilkan: {rows.length.toLocaleString('id-ID')} barang.
          </div>

          {terms && (terms.extra.length > 0 || terms.general.length > 0) && (
            <div className="mt-4 bg-gray-900 border border-gray-800 rounded-lg p-4">
              <p className="text-sm font-semibold text-white mb-2">Syarat &amp; Ketentuan Diskon</p>
              <ul className="space-y-1 text-xs text-gray-400 list-disc list-inside">
                {terms.extra.map((line, i) => (
                  <li key={`extra-${i}`}>{line}</li>
                ))}
                {terms.general.map((line, i) => (
                  <li key={`general-${i}`}>{line}</li>
                ))}
              </ul>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-4 pb-4">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="px-3 py-2 bg-gray-800 text-gray-200 rounded hover:bg-gray-700 disabled:opacity-50"
              >
                ← Sebelumnya
              </button>
              <span className="text-sm text-gray-400">Halaman {page} dari {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="px-3 py-2 bg-gray-800 text-gray-200 rounded hover:bg-gray-700 disabled:opacity-50"
              >
                Selanjutnya →
              </button>
            </div>
          )}
        </>
      )}

      {showClusterModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50">
          <div className="bg-gray-900 border-t sm:border border-gray-800 rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 w-full sm:max-w-md max-h-[92vh] overflow-y-auto">
            <div className="sm:hidden w-10 h-1 bg-gray-600 rounded-full mx-auto -mt-2 mb-4" />
            <h2 className="text-xl font-bold mb-1 text-white">Pilih Cluster</h2>
            <p className="text-gray-400 text-sm mb-5">Skema diskon daftar harga akan mengikuti cluster yang dipilih.</p>

            <div className="space-y-3">
              {CLUSTER_OPTIONS.map((opt) => (
                <button
                  key={opt.code}
                  onClick={() => {
                    setCluster(opt.code);
                    setShowClusterModal(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                    cluster === opt.code
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-gray-800 border-gray-700 text-white hover:bg-gray-700'
                  }`}
                >
                  <div className="font-semibold">{opt.label}</div>
                  <div className={`text-xs mt-0.5 ${cluster === opt.code ? 'text-blue-100' : 'text-gray-400'}`}>{opt.description}</div>
                </button>
              ))}
            </div>

            {cluster && (
              <button
                onClick={() => setShowClusterModal(false)}
                className="w-full mt-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Batal
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
