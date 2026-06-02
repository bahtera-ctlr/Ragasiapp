-- Tambah kolom nomor faktur dari Zahir ke tabel invoices
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS faktur_number TEXT;

CREATE INDEX IF NOT EXISTS idx_invoices_faktur_number ON public.invoices(faktur_number);
