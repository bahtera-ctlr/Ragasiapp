import { supabase } from './supabase';

export type PriceListProduct = {
  id: string;
  nomor_barang: string | null;
  nama_barang: string;
  principle: string | null;
  komposisi: string | null;
  golongan_barang: string | null;
  program: string | null;
  satuan: string | null;
  harga_jual_ragasi: number;
};

const PRICE_LIST_COLS =
  'id, nomor_barang, nama_barang, principle, komposisi, golongan_barang, program, satuan, harga_jual_ragasi';

export async function getAllPriceListProducts(): Promise<{ data?: PriceListProduct[]; error?: string }> {
  try {
    let all: PriceListProduct[] = [];
    let from = 0;
    const batchSize = 1000;

    for (;;) {
      const { data, error } = await supabase
        .from('products')
        .select(PRICE_LIST_COLS)
        .order('nama_barang', { ascending: true })
        .range(from, from + batchSize - 1);

      if (error) return { error: error.message };
      if (!data || data.length === 0) break;

      all = all.concat(data as PriceListProduct[]);
      if (data.length < batchSize) break;
      from += batchSize;
    }

    return { data: all };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
