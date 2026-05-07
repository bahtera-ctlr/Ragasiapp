import { supabase } from './supabase';

export interface FakturImage {
  id: string;
  invoice_id: string;
  image_path: string;
  uploaded_by: string;
  uploaded_at: string;
  created_at: string;
  public_url?: string;
}

/**
 * Upload image to faktur-images storage bucket
 * @param file - Image file to upload
 * @param invoiceId - Invoice ID to associate with the image
 * @param userId - User ID of the uploader
 * @returns Public URL of the uploaded image or error
 */
export async function uploadFakturImage(
  file: File,
  invoiceId: string,
  userId: string
) {
  try {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return {
        error: 'Tipe file tidak didukung. Gunakan JPEG, PNG, WebP, atau GIF',
        data: null,
      };
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return {
        error: 'Ukuran file terlalu besar. Maksimal 5MB',
        data: null,
      };
    }

    // Generate unique file path
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const fileExt = file.name.split('.').pop();
    const fileName = `${invoiceId}/${timestamp}-${random}.${fileExt}`;

    console.log('Uploading file:', fileName);
    console.log('File size:', file.size, 'bytes');
    console.log('File type:', file.type);

    // Upload file to storage
    const { data, error: uploadError } = await supabase.storage
      .from('faktur-images')
      .upload(fileName, file, {
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      console.error('Upload error details:', uploadError);
      return { error: uploadError.message, data: null };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('faktur-images')
      .getPublicUrl(fileName);

    // Save image reference to database
    // Try to manually set uploaded_by to debug
    console.log('Attempting to insert with user ID:', userId);
    
    const { data: dbData, error: dbError } = await supabase
      .from('faktur_images')
      .insert([
        {
          invoice_id: invoiceId,
          image_path: fileName,
          uploaded_by: userId,  // Explicitly pass userId to debug
        },
      ])
      .select();

    if (dbError) {
      console.error('Database insert error:', dbError);
      console.error('Error details:', JSON.stringify(dbError, null, 2));
      // Delete uploaded file if database insert fails
      await supabase.storage.from('faktur-images').remove([fileName]);
      return { error: dbError.message, data: null };
    }

    return {
      data: {
        id: dbData?.[0]?.id,
        image_path: fileName,
        public_url: urlData?.publicUrl,
      },
      error: null,
    };
  } catch (error) {
    return { error: String(error), data: null };
  }
}

/**
 * Get all images for an invoice
 * @param invoiceId - Invoice ID to fetch images for
 * @returns Array of faktur images or error
 */
export async function getFakturImages(invoiceId: string) {
  try {
    const { data, error } = await supabase
      .from('faktur_images')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: false });

    if (error) {
      return { error: error.message, data: null };
    }

    // Map image paths to public URLs
    const imagesWithUrls = data?.map((img) => ({
      ...img,
      public_url: supabase.storage
        .from('faktur-images')
        .getPublicUrl(img.image_path).data?.publicUrl,
    })) || [];

    return { data: imagesWithUrls, error: null };
  } catch (error) {
    return { error: String(error), data: null };
  }
}

/**
 * Delete a faktur image
 * @param imageId - Image ID to delete
 * @param imagePath - Image path in storage
 * @returns Success or error
 */
export async function deleteFakturImage(imageId: string, imagePath: string) {
  try {
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('faktur-images')
      .remove([imagePath]);

    if (storageError) {
      return { error: storageError.message };
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('faktur_images')
      .delete()
      .eq('id', imageId);

    if (dbError) {
      return { error: dbError.message };
    }

    return { error: null };
  } catch (error) {
    return { error: String(error) };
  }
}

/**
 * Upload multiple images at once
 * @param files - Array of image files
 * @param invoiceId - Invoice ID to associate with images
 * @param userId - User ID of the uploader
 * @returns Array of uploaded images with URLs or error
 */
export async function uploadMultipleFakturImages(
  files: File[],
  invoiceId: string,
  userId: string
) {
  try {
    const uploadPromises = files.map((file) =>
      uploadFakturImage(file, invoiceId, userId)
    );

    const results = await Promise.all(uploadPromises);

    // Check if any uploads failed
    const errors = results.filter((r) => r.error);
    if (errors.length > 0) {
      return {
        error: `${errors.length} file gagal diupload: ${errors[0].error}`,
        data: null,
      };
    }

    const successfulUploads = results
      .filter((r) => r.data)
      .map((r) => r.data);

    return { data: successfulUploads, error: null };
  } catch (error) {
    return { error: String(error), data: null };
  }
}
