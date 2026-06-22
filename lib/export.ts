import { supabase } from './supabase';
import { InvoiceAgingRow, computeUmurFaktur, computeHariOverdue } from './invoice-aging';

export type ExportRow = {
  [key: string]: string | number | null | undefined;
};

// GET ALL ACTIVE OUTLETS - WITH PAGINATION TO BYPASS 1000 LIMIT
export async function getOutlets() {
  try {
    let allData: ExportRow[] = [];
    const pageSize = 1000;
    let page = 0;
    let hasMore = true;

    // Fetch semua data dengan pagination - HANYA ACTIVE OUTLETS
    while (hasMore) {
      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from('outlets')
        .select('*', { count: 'exact' })
        .eq('is_active', true)  // Only active outlets
        .range(from, to)
        .order('name', { ascending: true });

      if (error) {
        return { error: error.message, data: null };
      }

      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allData = [...allData, ...data];
        console.log(`📊 Fetched page ${page + 1}: ${data.length} active outlets (total so far: ${allData.length})`);
        
        // Check if we got all
        if (count && allData.length >= count) {
          hasMore = false;
        }
        page++;
      }
    }

    console.log(`📊 getOutlets: Total fetched ${allData.length} active outlets`);
    return { data: allData, error: null };
  } catch (error) {
    return { error: String(error), data: null };
  }
}

// EXPORT OUTLETS TO CSV
export function exportOutletsToCSV(outlets: ExportRow[]) {
  if (!outlets || outlets.length === 0) {
    console.error('No data to export');
    return;
  }

  // Get all keys from all objects
  const allKeys = new Set<string>();
  outlets.forEach(outlet => {
    Object.keys(outlet).forEach(key => allKeys.add(key));
  });

  const keys = Array.from(allKeys);

  // Create CSV Header
  const csvHeader = keys.join(',');

  // Create CSV Rows
  const csvRows = outlets.map(outlet => {
    return keys.map(key => {
      const value = outlet[key];
      // Handle special characters and quotes
      if (value === null || value === undefined) {
        return '';
      }
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  });

  // Combine header and rows
  const csvContent = [csvHeader, ...csvRows].join('\n');

  // Create Blob
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

  // Create Download Link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  const fileName = `outlets_${new Date().toISOString().split('T')[0]}.csv`;

  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// EXPORT INVOICE AGING (CEK FAKTUR) TO CSV
export function exportInvoiceAgingToCSV(rows: InvoiceAgingRow[]) {
  if (!rows || rows.length === 0) {
    console.error('No data to export');
    return;
  }

  const data = rows.map(row => {
    const hariOverdue = computeHariOverdue(row.tgl_japo);
    return {
      'Sales': row.sales || '-',
      'PIC': row.pic || '-',
      'Kecamatan': row.kecamatan || '-',
      'No Outlet': row.no_outlet || '-',
      'ME': row.me || '-',
      'Jad Tag': row.jad_tag || '-',
      'Nama Outlet': row.nama_outlet,
      'No Faktur': row.no_faktur,
      'Tgl Faktur': row.tgl_faktur || '-',
      'Tgl Japo': row.tgl_japo || '-',
      'Saldo': row.saldo ?? 0,
      'TOP': row.top_hari ?? '-',
      'Nilai': row.nilai || '-',
      'Umur Faktur': computeUmurFaktur(row.tgl_faktur) ?? '-',
      'Hari Overdue': hariOverdue !== null ? hariOverdue : '-',
      'Status Konfirmasi': row.is_confirmed ? `Sudah Dikonfirmasi (${row.confirmed_by_name || '-'})` : 'Belum Dikonfirmasi',
    };
  });

  const keys = Object.keys(data[0]);
  const csvHeader = keys.join(',');

  const csvRows = data.map(row => {
    return keys.map(key => {
      const value = row[key as keyof typeof row];
      if (value === null || value === undefined) {
        return '';
      }
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${String(value).replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  });

  const csvContent = [csvHeader, ...csvRows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  const fileName = `cek_faktur_${new Date().toISOString().split('T')[0]}.csv`;

  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// EXPORT INVOICES TO CSV
export function exportInvoicesToCSV(invoices: ExportRow[]) {
  if (!invoices || invoices.length === 0) {
    console.error('No data to export');
    return;
  }

  const data = invoices.map(invoice => ({
    'No. Invoice': invoice.invoice_number || '-',
    'Outlet ID': invoice.outlet_id || '-',
    'Status': invoice.status || '-',
    'Amount': invoice.amount || 0,
    'Released By': invoice.released_by || '-',
    'Released At': invoice.released_at || '-',
    'Created At': invoice.created_at != null ? new Date(invoice.created_at).toLocaleString('id-ID') : '-',
  }));

  const keys = Object.keys(data[0]);
  const csvHeader = keys.join(',');

  const csvRows = data.map(row => {
    return keys.map(key => {
      const value = row[key as keyof typeof row];
      if (value === null || value === undefined) {
        return '';
      }
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${String(value).replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  });

  const csvContent = [csvHeader, ...csvRows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  const fileName = `invoices_${new Date().toISOString().split('T')[0]}.csv`;

  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// EXPORT INVOICE ITEMS TO CSV (Special format for Fakturis)
// Format: NIO, Nama Outlet, No Barang, Nama Barang, HJR, Dikson, Nett
// Items should be passed in already with nomor_barang enriched
export function exportInvoiceItemsToCSV(invoice: ExportRow, orderItems?: ExportRow[], outletData?: ExportRow) {
  if (!invoice) {
    console.error('No invoice to export');
    return;
  }

  console.log('Invoice object for export:', invoice);
  console.log('Outlet data:', outletData);

  // Use outletData if provided, otherwise use an empty object
  const outlet = outletData || {};
  const outletName = outlet.name || invoice.outlet_name || '-';
  const nio = outlet.NIO || '-';
  const invoiceNumber = invoice.invoice_number || 'Unknown';

  console.log('NIO:', nio);
  console.log('Outlet name:', outletName);

  // Parse items from parameter or invoice object
  let items: ExportRow[] = [];
  
  // If items provided via parameter, use them
  if (orderItems && Array.isArray(orderItems) && orderItems.length > 0) {
    items = orderItems;
    console.log('Using items from parameter:', items);
  }
  // Otherwise try to get items from invoice object
  else if (Array.isArray(invoice.items) && invoice.items.length > 0) {
    items = invoice.items;
    console.log('Got items from invoice object:', items);
  } else if (typeof invoice.items === 'string' && invoice.items) {
    try {
      items = JSON.parse(invoice.items);
      console.log('Parsed items from JSON string:', items);
    } catch (e) {
      console.error('Error parsing items:', e);
    }
  }

  console.log('Final items array:', items);

  if (!items || items.length === 0) {
    console.error('No items found in invoice');
    alert('Invoice ini tidak memiliki items. Pastikan order sudah dibuat dengan item yang benar.');
    return;
  }

  // Transform items to CSV format
  const csvData = items.map((item) => {
    // Use nomor_barang if available (enriched), otherwise fall back to product_id
    const nomorBarang = item.nomor_barang || item.product_id || '-';
    const productName = item.product_name || item.nama_barang || item.name || '-';
    const price = Number(item.price) || Number(item.harga) || 0;
    const discount = Number(item.discount) || 0;
    const qty = Number(item.qty) || Number(item.quantity) || 1;

    // Nett = (price * qty) - (discount if it's amount) OR price * qty * (1 - discount/100) if it's percentage
    let nett = price * qty;
    if (discount > 0) {
      // Assume discount is in percentage
      nett = nett * (1 - discount / 100);
    }

    return {
      'NIO': nio,
      'Nama Outlet': outletName,
      'No Barang': nomorBarang,
      'Nama Barang': productName,
      'HJR': price.toLocaleString('id-ID'),
      'Dikson': discount + '%',
      'Nett': nett.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
    };
  });

  // Create CSV Header
  const keys = ['NIO', 'Nama Outlet', 'No Barang', 'Nama Barang', 'HJR', 'Dikson', 'Nett'];
  const csvHeader = keys.join(',');

  // Create CSV Rows
  const csvRows = csvData.map(row => {
    return keys.map(key => {
      const value = row[key as keyof typeof row];
      if (value === null || value === undefined) {
        return '';
      }
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  });

  // Combine header and rows
  const csvContent = [csvHeader, ...csvRows].join('\n');

  // Create Blob and Download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  const fileName = `Invoice_${invoiceNumber}_${new Date().toISOString().split('T')[0]}.csv`;

  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// EXPORT PRODUCTS TO CSV
// Format: NB, GOL, PRO, POIN, Nama Barang, Komposisi, Principle, Sat, HJR, Stok
export function exportProductsToCSV(products: ExportRow[]) {
  if (!products || products.length === 0) {
    console.error('No products to export');
    alert('Tidak ada data barang untuk di-export');
    return;
  }

  // Transform products to CSV format matching the import format
  const csvData = products.map((product) => ({
    'NB': product.nomor_barang || '-',
    'GOL': product.golongan_barang || '-',
    'PRO': product.program || '-',
    'POIN': product.bobot_poin || '-',
    'Nama Barang': product.nama_barang || '-',
    'Komposisi': product.komposisi || '-',
    'Principle': product.principle || '-',
    'Sat': product.satuan || '-',
    'HJR': product.harga_jual_ragasi ? `${product.harga_jual_ragasi}` : '-',
    'Stok': product.stok || '-',
  }));

  // Create CSV Header
  const keys = ['NB', 'GOL', 'PRO', 'POIN', 'Nama Barang', 'Komposisi', 'Principle', 'Sat', 'HJR', 'Stok'];
  const csvHeader = keys.join(',');

  // Create CSV Rows
  const csvRows = csvData.map(row => {
    return keys.map(key => {
      const value = row[key as keyof typeof row];
      if (value === null || value === undefined) {
        return '';
      }
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  });

  // Combine header and rows
  const csvContent = [csvHeader, ...csvRows].join('\n');

  // Create Blob and Download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  const fileName = `Master_Data_Barang_${new Date().toISOString().split('T')[0]}.csv`;

  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
