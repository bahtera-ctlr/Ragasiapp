import { supabase } from './supabase';

export interface DeliveryImage {
  id: string;
  invoice_id: string;
  image_path: string;
  uploaded_by: string;
  uploaded_at: string;
  created_at: string;
  public_url?: string;
}

export async function uploadDeliveryImage(
  file: File,
  invoiceId: string,
  userId: string
) {
  try {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return { error: 'Tipe file tidak didukung. Gunakan JPEG, PNG, atau WebP', data: null };
    }

    const maxSize = 1 * 1024 * 1024;
    if (file.size > maxSize) {
      return { error: 'Ukuran file terlalu besar. Maksimal 1MB', data: null };
    }

    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const fileExt = file.name.split('.').pop();
    const fileName = `${invoiceId}/${timestamp}-${random}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('delivery-images')
      .upload(fileName, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      return { error: uploadError.message, data: null };
    }

    const { data: urlData } = supabase.storage
      .from('delivery-images')
      .getPublicUrl(fileName);

    const { data: dbData, error: dbError } = await supabase
      .from('delivery_images')
      .insert([{ invoice_id: invoiceId, image_path: fileName, uploaded_by: userId }])
      .select();

    if (dbError) {
      await supabase.storage.from('delivery-images').remove([fileName]);
      return { error: dbError.message, data: null };
    }

    return {
      data: { id: dbData?.[0]?.id, image_path: fileName, public_url: urlData?.publicUrl },
      error: null,
    };
  } catch (error) {
    return { error: String(error), data: null };
  }
}

export async function getDeliveryImages(invoiceId: string) {
  try {
    const { data, error } = await supabase
      .from('delivery_images')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: false });

    if (error) return { error: error.message, data: null };

    const imagesWithUrls = data?.map((img) => ({
      ...img,
      public_url: supabase.storage
        .from('delivery-images')
        .getPublicUrl(img.image_path).data?.publicUrl,
    })) || [];

    return { data: imagesWithUrls, error: null };
  } catch (error) {
    return { error: String(error), data: null };
  }
}
