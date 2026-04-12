import { supabase } from "@/lib/supabaseClient";

export type BookingImagePurpose = 'current' | 'style';

export interface SupabaseUploadResult {
  url: string | null;
  error: string | null;
}

/**
 * Supabase Storage 'booking' 버킷에 파일을 업로드하는 어댑터.
 * @param file - 업로드할 File 객체
 * @param purpose - 이미지의 용도 ('current' | 'style')
 * @returns 업로드된 public URL 또는 에러 상세
 */
export async function uploadBookingImage(
  file: File,
  purpose: BookingImagePurpose
): Promise<SupabaseUploadResult> {
  try {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}_${purpose}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `beauty/${fileName}`;

    const { error: uploadError, data } = await supabase.storage
      .from('beauty-bookings')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      return { url: null, error: uploadError.message };
    }

    const { data: { publicUrl } } = supabase.storage
      .from('beauty-bookings')
      .getPublicUrl(data.path);

    return { url: publicUrl, error: null };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown upload error';
    return { url: null, error: errorMessage };
  }
}
