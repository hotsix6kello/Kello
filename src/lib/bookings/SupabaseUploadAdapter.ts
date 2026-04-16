import { supabase } from "@/lib/supabaseClient";

export type BookingImagePurpose = 'current' | 'style';

export interface SupabaseUploadResult {
  /**
   * booking bucket이 private으로 전환됨.
   * 업로드 직후 public URL은 제공하지 않는다.
   * 이미지 조회는 서버에서 signed URL로만 가능.
   */
  url: null;
  path: string | null;
  error: string | null;
}

/**
 * Supabase Storage 'booking' 버킷에 파일을 업로드하는 어댑터.
 * booking bucket은 private이므로 getPublicUrl()을 사용하지 않는다.
 * 업로드 후 path만 반환하며, signed URL 발급은 서버 API를 통해 한다.
 *
 * @param file - 업로드할 File 객체
 * @param purpose - 이미지의 용도 ('current' | 'style')
 * @param requestId - 예약 요청 식별자 (경로 생성용)
 * @returns path 또는 에러 상세 (url은 항상 null)
 */
export async function uploadBookingImage(
  file: File,
  purpose: BookingImagePurpose,
  requestId: string
): Promise<SupabaseUploadResult> {
  try {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 9);
    const fileName = `${timestamp}-${randomStr}.${fileExt}`;
    // Path: beauty/{requestId}/{current|style}/{timestamp-random}.{ext}
    const filePath = `beauty/${requestId}/${purpose}/${fileName}`;

    const { error: uploadError, data } = await supabase.storage
      .from('booking')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      return { url: null, path: null, error: uploadError.message };
    }

    // booking bucket은 private → getPublicUrl() 사용 안 함
    // path만 반환; signed URL 발급은 서버 API(/api/bookings/beauty/images/signed-url)를 통해 수행
    return { url: null, path: data.path, error: null };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown upload error';
    return { url: null, path: null, error: errorMessage };
  }
}
