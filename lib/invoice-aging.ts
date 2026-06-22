import { supabase } from './supabase';
import { parseNumber } from './outlets';

export interface InvoiceAgingRow {
  id?: string;
  sales?: string;
  pic?: string;
  kecamatan?: string;
  no_outlet?: string;
  me?: string;
  jad_tag?: string;
  nama_outlet: string;
  no_faktur: string;
  tgl_faktur?: string; // ISO date YYYY-MM-DD
  tgl_japo?: string; // ISO date YYYY-MM-DD
  saldo?: number;
  top_hari?: number;
  nilai?: string;
  is_confirmed?: boolean;
  confirmed_by?: string;
  confirmed_by_name?: string;
  confirmed_at?: string;
  updated_at?: string;
}

/**
 * Split satu baris CSV menghormati field bertanda kutip ganda,
 * karena NAMA OUTLET sering mengandung koma (contoh: "ANNA, DR").
 */
function splitCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map(cell => cell.trim());
}

/**
 * Parse tanggal format Indonesia DD/MM/YY atau DD/MM/YYYY (juga menerima DD-MM-YY dan ISO YYYY-MM-DD)
 */
function parseIndoDate(value: string | number | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  const str = String(value).trim();
  if (!str || str === '-') return undefined;

  const ddmmyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (ddmmyy) {
    const day = parseInt(ddmmyy[1], 10);
    const month = parseInt(ddmmyy[2], 10);
    let year = parseInt(ddmmyy[3], 10);
    if (year < 100) year += 2000;
    if (day < 1 || day > 31 || month < 1 || month > 12) return undefined;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  const iso = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
  }

  return undefined;
}

/**
 * Parse CSV data faktur piutang dengan auto-detect delimiter.
 * Kolom umur faktur / DUE pada file (jika ada) diabaikan karena dihitung ulang oleh sistem.
 */
export function parseInvoiceAgingCSV(csvContent: string): { rows: InvoiceAgingRow[]; skipped: number } {
  const lines = csvContent
    .replace(new RegExp('^' + String.fromCharCode(0xfeff)), '')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (lines.length < 2) {
    throw new Error('File CSV minimal harus punya header dan 1 baris data');
  }

  // Beberapa file export Excel punya baris sampah (BOM/merged-cell artifact) sebelum baris header asli.
  // Cari baris yang benar-benar berisi nama kolom (mengandung "faktur" & "outlet"/"sales") di antara beberapa baris pertama.
  let headerIdx = 0;
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const lower = lines[i].toLowerCase();
    if (lower.includes('faktur') && (lower.includes('outlet') || lower.includes('sales'))) {
      headerIdx = i;
      break;
    }
  }

  let delimiter = ',';
  const headerLine = lines[headerIdx];
  if (headerLine.includes(';') && !headerLine.includes(',')) {
    delimiter = ';';
  } else if (headerLine.includes('\t')) {
    delimiter = '\t';
  }

  const header = splitCsvLine(headerLine, delimiter).map(h => h.trim().toLowerCase());

  const salesIdx = header.findIndex(h => h.includes('sales'));
  const picIdx = header.findIndex(h => h === 'pic' || h.includes('pic'));
  const kecamatanIdx = header.findIndex(h => h.includes('kecamatan'));
  const noOutletIdx = header.findIndex(h => h.includes('no outlet') || h.includes('nio'));
  const meIdx = header.findIndex(h => h === 'me' || h.includes('marketing executive'));
  const jadTagIdx = header.findIndex(h => h.includes('jad tag') || h.includes('jadtag'));
  const namaOutletIdx = header.findIndex(h => h.includes('nama outlet') || h === 'outlet');
  const noFakturIdx = header.findIndex(h => h.includes('no faktur') || h.includes('nomor faktur'));
  const tglFakturIdx = header.findIndex(h => h.includes('tgl faktur') || h.includes('tanggal faktur'));
  const tglJapoIdx = header.findIndex(h => h.includes('tgl japo') || h.includes('jatuh tempo') || h.includes('japo'));
  const saldoIdx = header.findIndex(h => h.includes('saldo'));
  const topIdx = header.findIndex(h => h === 'top' || h.includes('tempo pembayaran'));
  const nilaiIdx = header.findIndex(h => h === 'nilai');

  if (namaOutletIdx === -1) {
    throw new Error(`Kolom "Nama Outlet" tidak ditemukan dalam CSV. Header terdeteksi: ${header.join(', ')}`);
  }
  if (noFakturIdx === -1) {
    throw new Error(`Kolom "No Faktur" tidak ditemukan dalam CSV. Header terdeteksi: ${header.join(', ')}`);
  }

  const rows: InvoiceAgingRow[] = [];
  let skipped = 0;

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i], delimiter);
    if (cells.every(cell => !cell)) continue;

    const noFaktur = cells[noFakturIdx]?.trim();
    const namaOutlet = cells[namaOutletIdx]?.trim();

    if (!noFaktur || !namaOutlet) {
      skipped++;
      continue;
    }

    rows.push({
      sales: salesIdx !== -1 ? cells[salesIdx]?.trim() || undefined : undefined,
      pic: picIdx !== -1 ? cells[picIdx]?.trim() || undefined : undefined,
      kecamatan: kecamatanIdx !== -1 ? cells[kecamatanIdx]?.trim() || undefined : undefined,
      no_outlet: noOutletIdx !== -1 ? cells[noOutletIdx]?.trim() || undefined : undefined,
      me: meIdx !== -1 ? cells[meIdx]?.trim() || undefined : undefined,
      jad_tag: jadTagIdx !== -1 ? cells[jadTagIdx]?.trim() || undefined : undefined,
      nama_outlet: namaOutlet,
      no_faktur: noFaktur,
      tgl_faktur: tglFakturIdx !== -1 ? parseIndoDate(cells[tglFakturIdx]) : undefined,
      tgl_japo: tglJapoIdx !== -1 ? parseIndoDate(cells[tglJapoIdx]) : undefined,
      saldo: saldoIdx !== -1 ? parseNumber(cells[saldoIdx]) : undefined,
      top_hari: topIdx !== -1 && cells[topIdx] ? (parseInt(cells[topIdx], 10) || undefined) : undefined,
      nilai: nilaiIdx !== -1 ? cells[nilaiIdx]?.trim() || undefined : undefined,
    });
  }

  if (rows.length === 0) {
    throw new Error('Tidak ada data faktur valid dari CSV (pastikan kolom "No Faktur" dan "Nama Outlet" terisi)');
  }

  return { rows, skipped };
}

/**
 * Upload data faktur piutang dari CSV. Faktur yang sudah lunas (tidak ada di file baru)
 * otomatis dihapus; status konfirmasi pada faktur yang masih outstanding dipertahankan
 * oleh RPC `refresh_invoice_aging_data` (matched by no_faktur).
 */
export async function uploadInvoiceAgingData(csvContent: string) {
  const { rows, skipped } = parseInvoiceAgingCSV(csvContent);

  const seen = new Set<string>();
  const duplicates: string[] = [];
  const deduped = rows.filter(r => {
    const key = r.no_faktur.trim().toUpperCase();
    if (seen.has(key)) {
      duplicates.push(key);
      return false;
    }
    seen.add(key);
    return true;
  });

  const jsonData = deduped.map(r => ({
    sales: r.sales,
    pic: r.pic,
    kecamatan: r.kecamatan,
    no_outlet: r.no_outlet,
    me: r.me,
    jad_tag: r.jad_tag,
    nama_outlet: r.nama_outlet,
    no_faktur: r.no_faktur,
    tgl_faktur: r.tgl_faktur,
    tgl_japo: r.tgl_japo,
    saldo: r.saldo,
    top_hari: r.top_hari,
    nilai: r.nilai,
  }));

  const { data, error } = await supabase.rpc('refresh_invoice_aging_data', {
    p_rows: jsonData,
  });

  if (error) {
    throw new Error(`RPC error: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error('Tidak ada respons dari RPC function');
  }

  const result = data[0];
  if (!result.success) {
    throw new Error(result.message);
  }

  return {
    success: true,
    upserted: result.count_upserted as number,
    removed: result.count_removed as number,
    skippedRows: skipped,
    duplicates: duplicates.length,
  };
}

/**
 * Ambil semua data faktur piutang, dengan pagination untuk bypass limit 1000 baris Supabase.
 */
export async function getAllInvoiceAging() {
  try {
    let allData: InvoiceAgingRow[] = [];
    const pageSize = 1000;
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from('invoice_aging')
        .select('*', { count: 'exact' })
        .range(from, to)
        .order('tgl_japo', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allData = [...allData, ...(data as InvoiceAgingRow[])];
        if (count && allData.length >= count) {
          hasMore = false;
        }
        page++;
      }
    }

    return { data: allData, error: null };
  } catch (error) {
    return { data: null, error: String(error) };
  }
}

/**
 * Tandai satu faktur sebagai sudah dikonfirmasi.
 */
export async function confirmInvoiceAging(id: string, confirmedById: string | undefined, confirmedByName: string | undefined) {
  const { data, error } = await supabase
    .from('invoice_aging')
    .update({
      is_confirmed: true,
      confirmed_by: confirmedById || null,
      confirmed_by_name: confirmedByName || null,
      confirmed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

function daysBetween(isoDateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${isoDateStr}T00:00:00`);
  return Math.floor((today.getTime() - target.getTime()) / 86400000);
}

/** Umur faktur dalam hari (TGL FAKTUR -> hari ini), null kalau tanggal tidak ada */
export function computeUmurFaktur(tglFaktur?: string | null): number | null {
  if (!tglFaktur) return null;
  return daysBetween(tglFaktur);
}

/** Hari lewat jatuh tempo (TGL JAPO -> hari ini). Negatif/0 berarti belum jatuh tempo. */
export function computeHariOverdue(tglJapo?: string | null): number | null {
  if (!tglJapo) return null;
  return daysBetween(tglJapo);
}
