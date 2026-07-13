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
