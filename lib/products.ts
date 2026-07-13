import { supabase } from './supabase';

export interface StagingProduct {
  nomor_barang: string;
  golongan_barang?: string;
  program?: string;
  bobot_poin?: number;
  nama_barang: string;
  komposisi?: string;
  principle?: string;
  satuan?: string;
  harga_jual_ragasi?: number;
  stok?: number;
  isi_box?: number;
}

/**
 * Helper function to parse number with Indonesian format support
 * Handles both "1.000,50" (Indonesian) and "1000.50" (English) and "-" or empty
 */
function parseNumber(value: string | number | null | undefined): number | undefined {
  try {
    if (value === null || value === undefined || value === '' || value === '-') {
      return undefined;
    }
    
    const str = String(value).trim();
    if (!str || str === '-' || str === '') {
      return undefined;
    }
    
    // Simple approach: try to parse as is first
    let numStr = str.replace(/\s/g, '');
    
    // If has both comma and dot, figure out which is decimal separator
    if (numStr.includes(',') && numStr.includes('.')) {
      const lastComma = numStr.lastIndexOf(',');
      const lastDot = numStr.lastIndexOf('.');
      if (lastComma > lastDot) {
        // Comma is decimal separator (Indonesian: 1.234,56)
        numStr = numStr.substring(0, lastDot).replace(/\./g, '') + numStr.substring(lastDot).replace('.', '').replace(',', '.');
      }
    } else if (numStr.includes(',')) {
      // Only has comma - check if looks like decimal or thousands
      const afterComma = numStr.split(',')[1];
      if (afterComma && afterComma.length <= 2) {
        // Probably decimal separator
        numStr = numStr.replace(',', '.');
      }
      // else keep as is, will get stripped below
    }
    
    // Remove any remaining non-numeric characters except decimal point
    numStr = numStr.replace(/[^\d.-]/g, '');
    
    const result = parseFloat(numStr);
    return isNaN(result) ? undefined : result;
  } catch (e) {
    console.warn('parseNumber error:', e, 'for value:', value);
    return undefined;
  }
}

/**
 * Delete all existing products and insert new ones
 */
export async function uploadStagingProducts(products: StagingProduct[]) {
  try {
    const { data: existingData, error: fetchError } = await supabase
      .from('products')
      .select('id');
    
    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return { error: `Gagal mengambil data lama: ${fetchError.message}` };
    }

    // Delete all existing products if any exist
    if (existingData && existingData.length > 0) {
      const ids = existingData.map(item => item.id);
      
      // Delete in batches (Supabase has limits)
      for (let i = 0; i < ids.length; i += 100) {
        const batch = ids.slice(i, i + 100);
        const { error: deleteError } = await supabase
          .from('products')
          .delete()
          .in('id', batch);
        
        if (deleteError) {
          console.error('Delete error:', deleteError);
          return { error: `Gagal menghapus data lama: ${deleteError.message}` };
        }
      }
    }

    if (products.length === 0) {
      return { data: [], error: null };
    }

    const BATCH_SIZE = 500;
    let rowsToInsert: StagingProduct[] | Omit<StagingProduct, 'isi_box'>[] = products;
    const allData: Record<string, unknown>[] = [];

    for (let i = 0; i < rowsToInsert.length; i += BATCH_SIZE) {
      const batch = rowsToInsert.slice(i, i + BATCH_SIZE);
      const { data, error: insertError } = await supabase
        .from('products')
        .insert(batch)
        .select();

      if (insertError) {
        const errMsg = insertError.message || insertError.details || insertError.hint || JSON.stringify(insertError);
        console.error('Insert error detail:', { message: insertError.message, code: insertError.code, details: insertError.details, hint: insertError.hint });

        // Jika kolom isi_box belum ada di database, mulai ulang dari batch pertama tanpa isi_box
        const isColumnMissing = errMsg.includes('isi_box') || insertError.code === '42703';
        if (isColumnMissing && i === 0) {
          console.warn('Kolom isi_box belum ada di database. Upload tanpa isi_box...');
          rowsToInsert = products.map(({ isi_box: _omit, ...rest }) => rest);
          i = -BATCH_SIZE; // restart loop from 0 with the stripped rows
          continue;
        }

        return { error: `Gagal mengupload data barang: ${errMsg}` };
      }

      if (data) allData.push(...data);
    }

    return { data: allData, error: null };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { error: String(err) };
  }
}

/**
 * Parse CSV file content
 * Expected format: NB, GOL, PRO, POIN, Nama Barang, Komposisi, Principle, Sat, HJE, Stok
 * Automatically detects delimiter (comma, tab, semicolon)
 */
export function parseCsvData(csvContent: string): { data: StagingProduct[]; error?: string; duplicatesRemoved?: number } {
  try {
    const lines = csvContent.trim().split('\n');
    
    if (lines.length < 2) {
      return { data: [], error: 'File minimal harus memiliki header dan 1 baris data' };
    }

    // Auto-detect delimiter
    const headerLine = lines[0];
    let delimiter = ',';
    
    // Try to detect delimiter (tab, comma, semicolon)
    if (headerLine.includes('\t')) {
      delimiter = '\t';
    } else if (headerLine.includes(';')) {
      delimiter = ';';
    }

    const headers = headerLine.split(delimiter).map(h => h.trim().toLowerCase());

    // Find column indices (flexible matching)
    const nbIdx = headers.findIndex(h => 
      h === 'nb' || 
      h.includes('nomor') || 
      h.includes('no barang') ||
      h.startsWith('nb')
    );
    
    const namaIdx = headers.findIndex(h => 
      h.includes('nama') && h.includes('barang') ||
      h === 'nama_barang' ||
      h === 'nama barang' ||
      h === 'nama'
    );
    
    const golIdx = headers.findIndex(h => 
      h === 'gol' || 
      h.includes('golongan') ||
      h === 'golongan barang'
    );
    
    const proIdx = headers.findIndex(h => 
      h === 'pro' || 
      h === 'program'
    );
    
    const poinIdx = headers.findIndex(h => 
      h === 'poin' || 
      h === 'bobot poin' ||
      h === 'bobot_poin' ||
      h.includes('bobot') ||
      h.startsWith('poin')
    );
    
    const komposisiIdx = headers.findIndex(h => h === 'komposisi');
    
    const principleIdx = headers.findIndex(h => 
      h === 'principle' || 
      h === 'principal' || 
      h === 'pabrikan'
    );
    
    const satIdx = headers.findIndex(h => 
      h === 'sat' || 
      h === 'satuan harga' ||
      h === 'satuan_harga' ||
      h.includes('satuan') ||
      h.startsWith('sat')
    );
    
    const hjeIdx = headers.findIndex(h => 
      h === 'hjr' || 
      h === 'hje' || 
      h === 'harga jual ragasi' ||
      h === 'harga_jual_ragasi' ||
      h.includes('hjr') ||
      h.includes('hje')
    );
    
    const stokIdx = headers.findIndex(h =>
      h === 'stok' ||
      h === 'stock' ||
      h === 'qty' ||
      h.startsWith('stock r') // handles "stock r1", "stock r2" etc.
    );

    const isiBoxIdx = headers.findIndex(h =>
      h === 'isi' ||
      h === 'isi_box' ||
      h === 'isi box'
    );

    if (nbIdx === -1 || namaIdx === -1) {
      console.error('Missing columns! Headers found:', headers);
      return {
        data: [],
        error: `File harus memiliki kolom: NB (Nomor Barang) dan Nama Barang. Headers ditemukan: ${headers.join(', ')}`
      };
    }

    // Parse data rows
    const products: StagingProduct[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines

      const cells = line.split(delimiter).map(c => c.trim());

      const nomorBarang = cells[nbIdx];
      const namaBarang = cells[namaIdx];

      if (!nomorBarang || !namaBarang) {
        continue;
      }

      const isiRaw = isiBoxIdx !== -1 ? parseNumber(cells[isiBoxIdx]) : undefined;

      const product: StagingProduct = {
        nomor_barang: nomorBarang,
        golongan_barang: golIdx !== -1 && cells[golIdx] ? cells[golIdx] : undefined,
        program: proIdx !== -1 && cells[proIdx] ? cells[proIdx] : undefined,
        bobot_poin: poinIdx !== -1 ? parseNumber(cells[poinIdx]) : undefined,
        nama_barang: namaBarang,
        komposisi: komposisiIdx !== -1 && cells[komposisiIdx] ? cells[komposisiIdx] : undefined,
        principle: principleIdx !== -1 && cells[principleIdx] ? cells[principleIdx] : undefined,
        satuan: satIdx !== -1 && cells[satIdx] ? cells[satIdx].trim() : undefined,
        harga_jual_ragasi: hjeIdx !== -1 ? parseNumber(cells[hjeIdx]) : undefined,
        stok: stokIdx !== -1 ? Math.floor(parseNumber(cells[stokIdx]) || 0) : undefined,
        isi_box: isiRaw !== undefined && isiRaw > 0 ? Math.round(isiRaw) : undefined,
      };

      products.push(product);
    }

    // Baris dengan NB yang sama bikin insert gagal (unique constraint), meski
    // tabel lama sudah dikosongkan — karena constraint juga berlaku di dalam
    // satu batch insert. Ambil kemunculan terakhir tiap NB (biasanya baris
    // paling bawah = data terbaru pada file master).
    const byNomorBarang = new Map<string, StagingProduct>();
    for (const product of products) {
      byNomorBarang.set(product.nomor_barang, product);
    }
    const dedupedProducts = Array.from(byNomorBarang.values());
    const duplicatesRemoved = products.length - dedupedProducts.length;

    return { data: dedupedProducts, duplicatesRemoved };
  } catch (err) {
    console.error('CSV parse error:', err);
    return { data: [], error: `Error parsing CSV: ${String(err)}` };
  }
}

/**
 * Parse Excel-like CSV data (from copy-paste dari Excel)
 */
export function parseExcelCsv(content: string): { data: StagingProduct[]; error?: string } {
  return parseCsvData(content);
}

/**
 * Get all products
 */
export async function getStagingProducts() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
      .range(0, 9999); // Fetch up to 10,000 rows (Supabase default is 1000)

    if (error) {
      console.error('Error fetching products:', error);
      return { error: error.message };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { error: String(err) };
  }
}
