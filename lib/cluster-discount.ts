export type ClusterCode = 'C1' | 'C2' | 'C3';

export const CLUSTER_OPTIONS: { code: ClusterCode; label: string; description: string }[] = [
  { code: 'C1', label: 'Cluster 1', description: 'Skema diskon untuk outlet Cluster 1' },
  { code: 'C2', label: 'Cluster 2', description: 'Skema diskon untuk outlet Cluster 2' },
  { code: 'C3', label: 'Cluster 3', description: 'Skema diskon untuk outlet Cluster 3' },
];

/**
 * Skema diskon per cluster. Sama persis dengan logika di app/sales/page.tsx (getDiscount)
 * — jaga agar keduanya tidak berbeda, karena ini menentukan diskon aktual saat sales order.
 */
export function computeDiscountRate(
  cluster: string | null,
  gol: string | null | undefined,
  pro: string | null | undefined,
  subtotal: number
): number {
  // Jika nilai per item ≤ Rp 35.000 → diskon flat 9%
  if (subtotal <= 35000) return 9;

  const golU = gol?.toUpperCase() || '';
  const proU = pro?.toUpperCase() || '';

  // ===== RULE GOL OVERRIDE: berlaku apapun cluster =====
  if (golU === 'CG') return 30;
  if (golU === 'ED') return 50;

  // ===== RULE TP: override semua cluster =====
  if (proU === 'TP') {
    if (golU === 'F1') return 25;
    if (golU === 'F2') return 22.5;
    if (golU === 'F3') return 20;
    if (golU === 'F4') return 15;
    return 0;
  }

  // ===== CLUSTER 1 =====
  if (cluster === 'C1') {
    if (subtotal > 350000) return 15;
    return 12.5;
  }

  // ===== CLUSTER 2 =====
  if (cluster === 'C2') {
    if (['F1', 'F2', 'F3'].includes(golU)) {
      if (subtotal > 350000) return 20;
      return 17.5;
    }
    if (golU === 'F4') {
      if (subtotal > 350000) return 15;
      return 12.5;
    }
  }

  // ===== CLUSTER 3 =====
  if (cluster === 'C3') {
    if (golU === 'F1') return 25;
    if (golU === 'F2') return 22.5;
    if (golU === 'F3') return 20;
    if (golU === 'F4') return 15;
  }

  return 0;
}

// Nilai representatif untuk menghitung diskon "reguler" per golongan (di atas ambang
// flat-9%, di bawah ambang bonus >350rb) tanpa perlu tahu harga/qty barang sesungguhnya.
const REGULAR_SUBTOTAL = 100000;
const HIGH_SUBTOTAL = 400000;
const GOL_LIST = ['F1', 'F2', 'F3', 'F4'];

export type ClusterTerms = {
  extra: string[];
  general: string[];
};

/**
 * Syarat & ketentuan diskon di luar tabel "diskon reguler": bonus diskon berdasarkan
 * nilai pembelian, dan golongan/program dengan diskon flat. Dihitung dari computeDiscountRate
 * yang sama supaya tidak pernah berbeda dengan diskon aktual di sales order.
 */
export function getClusterTerms(cluster: ClusterCode): ClusterTerms {
  const groups = new Map<string, string[]>();
  GOL_LIST.forEach((gol) => {
    const regular = computeDiscountRate(cluster, gol, null, REGULAR_SUBTOTAL);
    const extra = computeDiscountRate(cluster, gol, null, HIGH_SUBTOTAL);
    if (extra !== regular) {
      const key = `${regular}|${extra}`;
      const arr = groups.get(key) || [];
      arr.push(gol);
      groups.set(key, arr);
    }
  });

  const extra: string[] = [];
  groups.forEach((golList, key) => {
    const [regular, bonus] = key.split('|');
    const golText = golList.length === GOL_LIST.length ? 'Semua golongan' : `Golongan ${golList.join('/')}`;
    extra.push(`${golText}: diskon naik menjadi ${bonus}% (dari ${regular}%) jika nilai pembelian barang ini di atas Rp 350.000.`);
  });

  const general = [
    'Jika nilai pembelian barang ≤ Rp 35.000, berlaku diskon flat 9% (menggantikan skema di atas).',
    'Golongan CG: diskon flat 30% (berlaku di semua cluster).',
    'Golongan ED: diskon flat 50% (berlaku di semua cluster).',
    'Program TP: F1 25%, F2 22,5%, F3 20%, F4 15% (menggantikan skema cluster).',
  ];

  return { extra, general };
}
