import { supabase } from './supabase';

// GET ALL ACTIVE OUTLETS - WITH PAGINATION TO BYPASS 1000 LIMIT
export async function getOutlets() {
  try {
    let allData: any[] = [];
    let pageSize = 1000;
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
export function exportOutletsToCSV(outlets: any[]) {
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

// EXPORT INVOICES TO CSV
export function exportInvoicesToCSV(invoices: any[]) {
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
    'Created At': new Date(invoice.created_at).toLocaleString('id-ID') || '-',
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
export function exportInvoiceItemsToCSV(invoice: any) {
  if (!invoice) {
    console.error('No invoice to export');
    return;
  }

  const outletName = invoice.outlet?.name || invoice.outlet_name || '-';
  const nio = invoice.outlet?.NIO || '-';
  const invoiceNumber = invoice.invoice_number || 'Unknown';

  // Parse items from invoice
  let items: any[] = [];
  
  if (Array.isArray(invoice.items)) {
    items = invoice.items;
  } else if (typeof invoice.items === 'string') {
    try {
      items = JSON.parse(invoice.items);
    } catch (e) {
      console.error('Error parsing items:', e);
      items = [];
    }
  }

  if (items.length === 0) {
    console.error('No items in invoice');
    return;
  }

  // Transform items to CSV format
  const csvData = items.map((item: any) => {
    const productId = item.product_id || item.id || '-';
    const productName = item.product_name || item.nama_barang || item.name || '-';
    const price = item.price || item.harga || 0;
    const discount = item.discount || 0;
    const qty = item.qty || item.quantity || 1;
    
    // Nett = (price * qty) - (discount if it's amount) OR price * qty * (1 - discount/100) if it's percentage
    let nett = price * qty;
    if (discount > 0) {
      // Assume discount is in percentage
      nett = nett * (1 - discount / 100);
    }

    return {
      'NIO': nio,
      'Nama Outlet': outletName,
      'No Barang': productId,
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
