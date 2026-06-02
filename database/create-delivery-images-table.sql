-- Tabel untuk menyimpan foto bukti pengiriman
CREATE TABLE IF NOT EXISTS public.delivery_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  image_path TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.delivery_images ENABLE ROW LEVEL SECURITY;

-- Semua user terautentikasi bisa melihat foto pengiriman
CREATE POLICY delivery_images_view ON public.delivery_images
  FOR SELECT USING (auth.role() = 'authenticated');

-- Semua user terautentikasi bisa upload foto pengiriman
CREATE POLICY delivery_images_insert ON public.delivery_images
  FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

-- Hanya uploader yang bisa hapus
CREATE POLICY delivery_images_delete ON public.delivery_images
  FOR DELETE USING (auth.uid() = uploaded_by);

CREATE INDEX IF NOT EXISTS idx_delivery_images_invoice_id ON public.delivery_images(invoice_id);

-- Storage bucket: jalankan ini di Supabase dashboard SQL editor atau via API
-- INSERT INTO storage.buckets (id, name, public) VALUES ('delivery-images', 'delivery-images', true)
-- ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies untuk bucket delivery-images
CREATE POLICY delivery_images_storage_view ON storage.objects
  FOR SELECT USING (bucket_id = 'delivery-images');

CREATE POLICY delivery_images_storage_insert ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'delivery-images' AND auth.role() = 'authenticated');

CREATE POLICY delivery_images_storage_delete ON storage.objects
  FOR DELETE USING (bucket_id = 'delivery-images' AND auth.uid() = owner);
