import { supabase } from './supabase';

export interface OutletData {
  nio?: string;  // Changed from number to string to support format like "16010001-1"
  name: string;
  me?: string;
  cluster?: string;
  kelompok?: string;
  limit_rupiah?: number;
  top_hari?: number;
  due?: number;
  current_saldo?: number;
}

/**
 * Helper function to parse number with Indonesian format support
 * Handles both "1.000,50" (Indonesian) and "1000.50" (English) and "-" or empty
 */
function parseNumber(value: string | number | null | undefined): number | undefined {
  try {
    if (value === null || value === undefined || value === '' || value === '-' || value === 'Rp -') {
      return undefined;
    }
    
    let str = String(value).trim();
    if (!str || str === '-' || str === '' || str === 'Rp -') {
      return undefined;
    }

    // Remove "Rp" prefix and extra spaces
    str = str.replace(/^Rp\s*/, '').replace(/\s+/g, '').trim();
    
    if (!str || str === '-') {
      return undefined;
    }
    
    let numStr = str;
    
    // If has both comma and dot, figure out which is decimal separator
    if (numStr.includes(',') && numStr.includes('.')) {
      const lastComma = numStr.lastIndexOf(',');
      const lastDot = numStr.lastIndexOf('.');
      if (lastComma > lastDot) {
        // Comma is decimal separator (Indonesian: 1.234,56)
        numStr = numStr.substring(0, lastDot).replace(/\./g, '') + numStr.substring(lastDot).replace('.', '').replace(',', '.');
      } else {
        // Dot is decimal separator (English: 1,234.56)
        numStr = numStr.replace(/,/g, '');
      }
    } else if (numStr.includes(',')) {
      // Only has comma
      const afterComma = numStr.split(',')[1];
      if (afterComma && afterComma.length <= 2) {
        // Likely decimal separator
        numStr = numStr.replace(',', '.');
      } else {
        // Likely thousands separator
        numStr = numStr.replace(/,/g, '');
      }
    }
    
    const parsed = parseFloat(numStr);
    return isNaN(parsed) ? undefined : parsed;
  } catch {
    return undefined;
  }
}

/**
 * Parse CSV data untuk outlet dengan auto-detect delimiter
 */
export function parseOutletCSV(csvContent: string): OutletData[] {
  const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  if (lines.length < 2) {
    throw new Error('File CSV minimal harus punya header dan 1 baris data');
  }

  // Auto-detect delimiter: comma, semicolon, or tab
  let delimiter = ',';
  const firstLine = lines[0];
  
  if (firstLine.includes(';') && !firstLine.includes(',')) {
    delimiter = ';';
  } else if (firstLine.includes('\t')) {
    delimiter = '\t';
  }

  console.log(`🔍 Detected delimiter: "${delimiter}"`);
  console.log(`📄 First line: ${firstLine}`);

  const header = lines[0].split(delimiter).map(h => h.trim().toLowerCase());
  
  console.log(`📋 Header columns: ${header.join(' | ')}`);
  console.log(`📋 Header FULL array:`, header.map((h, i) => `[${i}]: "${h}"`).join(', '));
  
  // Find column indices dengan fleksibilitas naming
  const nioIdx = header.findIndex(h => {
    const cleanH = h.replace(/\s+/g, ' ').trim(); // Normalize spaces
    return h.includes('nio') 
      || h.includes('nomor identifikasi') 
      || h === 'no identifikasi'
      || cleanH === 'no outlet'  // Exact match after normalization
      || h.includes('no outlet')  // Substring match
      || (h.startsWith('no') && h.includes('outlet'))
      || h === 'no'  // Just "no" could be outlet number
  });
  
  console.log(`🎯 NIO column index: ${nioIdx}, value: "${nioIdx >= 0 ? header[nioIdx] : 'NOT FOUND'}"`);
  
  const nameIdx = header.findIndex(h => 
    h.includes('nama outlet') || h === 'nama' || h === 'outlet'
  );
  const meIdx = header.findIndex(h => 
    h.includes('me') || h.includes('marketing executive')
  );
  const clusterIdx = header.findIndex(h => 
    h.includes('cluster') || h.includes('divisi')
  );
  const kelompokIdx = header.findIndex(h => 
    h.includes('kelompok') || h.includes('unit usaha') || h === 'divisi'
  );
  const limitIdx = header.findIndex(h => {
    const clean = h.replace(/\s+/g, ' ').toLowerCase();
    return h.includes('limit') || h.includes('plafon') || h.includes('credit limit') 
      || h.includes('credit') || h === 'limit rupiah' || h.includes('limit_rupiah')
      || h.includes('limit rp') || clean.includes('limit') || /limit|plafon|credit/.test(clean);
  });
  const topIdx = header.findIndex(h => {
    const clean = h.replace(/\s+/g, ' ').toLowerCase();
    return h.includes('top') || h.includes('tempo') || h.includes('hari pembayaran') 
      || h.includes('tempo pembayaran') || h.includes('payment term')
      || h === 'top' || h === 'tempo' || clean.includes('hari') || /top|tempo|hari/.test(clean);
  });
  const dueIdx = header.findIndex(h => {
    const clean = h.replace(/\s+/g, ' ').toLowerCase();
    return h.includes('due') || h.includes('jatuh tempo') || h.includes('due date') || h.includes('due hari')
      || h === 'due' || /due|jatuh tempo|tempo jatuh/.test(clean);
  });
  const saldoIdx = header.findIndex(h => {
    const clean = h.replace(/\s+/g, ' ').toLowerCase();
    return h.includes('saldo') || h.includes('current saldo') || h.includes('sisa saldo')
      || h.includes('balance') || h === 'current_saldo' || h.includes('saldo saat ini')
      || h === 'saldo' || h === 'balance' || clean.includes('saldo') || /saldo|balance/.test(clean);
  });

  console.log(`📍 Column indices: NIO=${nioIdx}, Name=${nameIdx}, ME=${meIdx}, Cluster=${clusterIdx}, Kelompok=${kelompokIdx}, Limit=${limitIdx}, TOP=${topIdx}, DUE=${dueIdx}, Saldo=${saldoIdx}`);
  
  // Warn if critical columns not found
  if (limitIdx === -1) {
    console.warn(`⚠️ LIMIT/CREDIT column tidak ditemukan! Coba cek nama kolom di CSV.`);
    console.warn(`📋 Available columns: ${header.join(' | ')}`);
    console.warn(`💡 Column names should contain: 'limit', 'plafon', 'credit limit', 'credit', atau 'limit rupiah'`);
  }
  if (dueIdx === -1) {
    console.warn(`⚠️ DUE column tidak ditemukan. Jika tidak ada, field DUE akan kosong.`);
  }
  if (saldoIdx === -1) {
    console.warn(`⚠️ Saldo/Balance column tidak ditemukan. Available: ${header.join(', ')}`);
  }

  if (nameIdx === -1) {
    throw new Error(`Kolom "Nama Outlet" tidak ditemukan dalam CSV. Header yang terdeteksi: ${header.join(', ')}`);
  }

  // Warning if NIO not found
  if (nioIdx === -1) {
    console.warn(`⚠️ NIO column tidak ditemukan! Available columns: ${header.join(', ')}`);
  }

  const outlets: OutletData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(delimiter).map(cell => cell.trim());
    
    // Skip empty rows
    if (cells.every(cell => !cell)) continue;

    if (i <= 3) {
      console.log(`Row ${i}: ${cells.slice(0, 8).join(' | ')}`);
      if (nioIdx !== -1) {
        console.log(`  → NIO value: "${cells[nioIdx]}" → parsed: ${parseNumber(cells[nioIdx])}`);
      }
      if (limitIdx !== -1) {
        console.log(`  → LIMIT value: "${cells[limitIdx]}" → parsed: ${parseNumber(cells[limitIdx])}`);
      }
      if (saldoIdx !== -1) {
        console.log(`  → SALDO value: "${cells[saldoIdx]}" → parsed: ${parseNumber(cells[saldoIdx])}`);
      }
    }

    const nioValue = nioIdx !== -1 && cells[nioIdx] ? cells[nioIdx].trim() : undefined;
    
    const dueValue = dueIdx !== -1 && cells[dueIdx] ? parseInt(cells[dueIdx].replace(/\D/g, ''), 10) : undefined;
    const outlet: OutletData = {
      nio: nioValue,  // Store as string to support "16010001-1" format
      name: nameIdx !== -1 && cells[nameIdx] ? cells[nameIdx] : `Outlet ${i}`,
      me: meIdx !== -1 && cells[meIdx] ? cells[meIdx] : undefined,
      cluster: clusterIdx !== -1 && cells[clusterIdx] ? cells[clusterIdx].toUpperCase() : undefined,
      kelompok: kelompokIdx !== -1 && cells[kelompokIdx] ? cells[kelompokIdx] : undefined,
      // For limit_rupiah: parse if available, allow 0
      limit_rupiah: limitIdx !== -1 && cells[limitIdx] ? parseNumber(cells[limitIdx]) : undefined,
      top_hari: topIdx !== -1 && cells[topIdx] ? (parseInt(cells[topIdx]) || undefined) : undefined,
      due: !Number.isNaN(dueValue) ? dueValue : undefined,
      // For current_saldo: parse if available, allow 0
      current_saldo: saldoIdx !== -1 && cells[saldoIdx] ? parseNumber(cells[saldoIdx]) : undefined,
    };

    outlets.push(outlet);
  }

  if (outlets.length === 0) {
    throw new Error('Tidak ada data outlet dari CSV');
  }

  console.log(`✅ Parsed ${outlets.length} outlets successfully`);
  console.log(`📊 Sample data (first 3):`, outlets.slice(0, 3).map(o => ({ 
    nio: o.nio, 
    name: o.name, 
    me: o.me, 
    limit: o.limit_rupiah, 
    top: o.top_hari,
    due: o.due,
    saldo: o.current_saldo 
  })));

  return outlets;
}

/**
 * Upload outlet data dari CSV
 */
export async function uploadOutletData(csvContent: string) {
  try {
    // Parse CSV
    let outletsData = parseOutletCSV(csvContent);

    // Validate that NIO exists for all outlets
    const outletsMissingNIO = outletsData.filter(o => !o.nio || o.nio.trim() === '');
    if (outletsMissingNIO.length > 0) {
      throw new Error(`❌ ${outletsMissingNIO.length} outlet(s) tidak memiliki NIO (No Outlet). Pastikan kolom "No Outlet" ada di CSV.`);
    }

    // DEDUPLICATE by NIO - keep only first occurrence
    const seenNIOs = new Set<string>();
    const duplicates: string[] = [];
    
    outletsData = outletsData.filter(o => {
      const nioKey = (o.nio || '').trim().toUpperCase();
      if (seenNIOs.has(nioKey)) {
        duplicates.push(nioKey);
        return false; // Skip duplicate
      }
      seenNIOs.add(nioKey);
      return true;
    });

    if (duplicates.length > 0) {
      console.warn(`⚠️ Found ${duplicates.length} duplicate NIOs - removed them:`, duplicates.slice(0, 10));
    }

    console.log(`🔄 Calling RPC function to refresh outlets...`);
    console.log(`📊 Original count: ${csvContent.split('\n').length - 1}, After dedup: ${outletsData.length}`);
    
    // Convert to format expected by RPC
    const jsonData = outletsData.map(outlet => ({
      nio: outlet.nio?.trim(),
      name: outlet.name,
      me: outlet.me,
      cluster: outlet.cluster,
      kelompok: outlet.kelompok,
      limit_rupiah: outlet.limit_rupiah,
      current_saldo: outlet.current_saldo,
      top_hari: outlet.top_hari,
      due: outlet.due,
    }));

    console.log(`📤 Sample data to send to RPC (first 3):`, jsonData.slice(0, 3));
    console.log(`📤 NIO values sample:`, jsonData.slice(0, 10).map(d => ({ nio: d.nio, name: d.name })));

    // Call RPC function untuk atomic delete + insert
    const { data, error } = await supabase.rpc('refresh_outlets_data', {
      p_outlets_data: jsonData
    });

    if (error) {
      console.error('RPC error:', error);
      throw new Error(`RPC error: ${error.message}`);
    }

    console.log(`✅ RPC Result:`, data);
    
    if (!data || data.length === 0) {
      throw new Error('No response from RPC function');
    }

    const result = data[0];
    if (!result.success) {
      throw new Error(result.message);
    }

    console.log(`✅ Successfully refreshed outlets: ${result.count_inserted} inserted`);
    
    return { 
      success: true, 
      count: result.count_inserted,
      data: null 
    };
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

/**
 * Get all ACTIVE outlets - WITH PAGINATION TO BYPASS 1000 LIMIT
 */
export async function getAllOutlets() {
  try {
    let allData: Record<string, unknown>[] = [];
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
        throw new Error(error.message);
      }

      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allData = [...allData, ...data];
        console.log(`📊 Page ${page + 1}: ${data.length} active outlets (total so far: ${allData.length})`);
        
        // Check if we got all
        if (count && allData.length >= count) {
          hasMore = false;
        }
        page++;
      }
    }

    console.log(`📊 getAllOutlets: Total fetched ${allData.length} active outlets`);
    return { data: allData, count: allData.length, error: null };
  } catch (error) {
    return { data: null, count: 0, error: String(error) };
  }
}

/**
 * Get outlet by ID
 */
export async function getOutletById(outletId: string) {
  try {
    const { data, error } = await supabase
      .from('outlets')
      .select('*')
      .eq('id', outletId)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: String(error) };
  }
}

/**
 * Update outlet saldo (after payment or order)
 */
export async function updateOutletSaldo(outletId: string, newSaldo: number) {
  try {
    const { data, error } = await supabase
      .from('outlets')
      .update({ 
        current_saldo: newSaldo,
        updated_at: new Date()
      })
      .eq('id', outletId)
      .select();

    if (error) {
      throw new Error(error.message);
    }

    return { data: data?.[0], error: null };
  } catch (error) {
    return { data: null, error: String(error) };
  }
}
