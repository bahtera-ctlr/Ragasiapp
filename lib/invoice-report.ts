import { supabase } from './supabase';

export interface ReleasedInvoiceReport {
  id: string;
  invoice_number: string;
  order_id: string;
  outlet_id: string;
  outlet_name: string;
  outlet_nio: string;
  amount: number;
  status: string;
  faktur_status: string;
  logistik_in_status: string;
  shipment_status: string;
  created_at: string;
  released_at?: string;
  faktur_verified_at?: string;
  delivery_date?: string;
  keuangan_notes?: string;
}

/**
 * Get all released invoices for reporting
 * @returns Array of released invoices with outlet info
 */
export async function getReleasedInvoicesReport() {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        order_id,
        outlet_id,
        amount,
        status,
        faktur_status,
        logistik_in_status,
        shipment_status,
        created_at,
        keuangan_notes,
        outlets!inner(id, name, NIO),
        faktur_verified_at,
        delivery_date
      `)
      .eq('status', 'released')
      .order('created_at', { ascending: false });

    if (error) {
      return { error: error.message, data: null };
    }

    // Map the data to our report interface
    const mappedData: ReleasedInvoiceReport[] = (data || []).map((invoice: any) => ({
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      order_id: invoice.order_id,
      outlet_id: invoice.outlet_id,
      outlet_name: invoice.outlets?.name || '-',
      outlet_nio: invoice.outlets?.NIO || '-',
      amount: invoice.amount || 0,
      status: invoice.status,
      faktur_status: invoice.faktur_status,
      logistik_in_status: invoice.logistik_in_status,
      shipment_status: invoice.shipment_status,
      created_at: invoice.created_at,
      faktur_verified_at: invoice.faktur_verified_at,
      delivery_date: invoice.delivery_date,
      keuangan_notes: invoice.keuangan_notes,
    }));

    return { data: mappedData, error: null };
  } catch (error) {
    return { error: String(error), data: null };
  }
}

/**
 * Calculate sum of amounts grouped by a field
 * @param invoices Array of invoices
 * @param groupBy Field to group by
 * @returns Grouped data with sum
 */
export function calculateGroupedSum(
  invoices: ReleasedInvoiceReport[],
  groupBy: 'outlet_name' | 'faktur_status' | 'shipment_status' | 'logistik_in_status' | 'status'
) {
  const grouped: Record<string, { count: number; sum: number }> = {};

  invoices.forEach((invoice) => {
    const key = String(invoice[groupBy]) || 'Unknown';
    if (!grouped[key]) {
      grouped[key] = { count: 0, sum: 0 };
    }
    grouped[key].count += 1;
    grouped[key].sum += invoice.amount || 0;
  });

  return Object.entries(grouped).map(([name, data]) => ({
    name,
    count: data.count,
    sum: data.sum,
  }));
}

/**
 * Export invoices to CSV
 * @param invoices Array of invoices to export
 * @returns CSV string
 */
export function exportInvoicesToCSV(invoices: ReleasedInvoiceReport[]): string {
  const headers = [
    'Invoice #',
    'Order ID',
    'Outlet Name',
    'Outlet NIO',
    'Amount',
    'Status',
    'Faktur Status',
    'Logistik Status',
    'Shipment Status',
    'Created At',
    'Delivery Date',
  ];

  const rows = invoices.map((inv) => [
    inv.invoice_number,
    inv.order_id,
    inv.outlet_name,
    inv.outlet_nio,
    inv.amount,
    inv.status,
    inv.faktur_status,
    inv.logistik_in_status,
    inv.shipment_status,
    new Date(inv.created_at).toLocaleDateString('id-ID'),
    inv.delivery_date ? new Date(inv.delivery_date).toLocaleDateString('id-ID') : '-',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((cell) => {
          // Escape commas and quotes in CSV
          const str = String(cell);
          return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
        })
        .join(',')
    ),
  ].join('\n');

  return csvContent;
}

/**
 * Download CSV file
 * @param csvContent CSV string content
 * @param filename Filename for download
 */
export function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
