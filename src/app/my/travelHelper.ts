export type CityKey = 'Seoul' | 'Busan' | 'Jeju' | 'Daegu' | 'Incheon';

export const CITY_COORDS: Record<CityKey, { lat: number; lng: number }> = {
  Seoul:   { lat: 37.5665, lng: 126.9780 },
  Busan:   { lat: 35.1796, lng: 129.0756 },
  Jeju:    { lat: 33.4996, lng: 126.5312 },
  Daegu:   { lat: 35.8722, lng: 128.6025 },
  Incheon: { lat: 37.4563, lng: 126.7052 },
};

const BUSAN_KEYWORDS = ['busan', 'haeundae', 'seomyeon', 'nampo', 'gwangalli'];
const JEJU_KEYWORDS  = ['jeju', 'seogwipo'];
const DAEGU_KEYWORDS = ['daegu', 'dongseongno'];
const INCHEON_KEYWORDS = ['incheon'];

export function normalizeCityFromBooking(storeName: string): CityKey {
  const lower = (storeName ?? '').toLowerCase();
  if (BUSAN_KEYWORDS.some(k => lower.includes(k))) return 'Busan';
  if (JEJU_KEYWORDS.some(k => lower.includes(k)))  return 'Jeju';
  if (DAEGU_KEYWORDS.some(k => lower.includes(k))) return 'Daegu';
  if (INCHEON_KEYWORDS.some(k => lower.includes(k))) return 'Incheon';
  return 'Seoul';
}

export function getNextUpcomingBooking<
  T extends { bookingDate: string; status: string },
>(bookings: T[]): T | null {
  const today = new Date().toISOString().split('T')[0];
  const upcoming = bookings.filter(
    b =>
      (b.status === 'confirmed' || b.status === 'requested') &&
      b.bookingDate >= today,
  );
  upcoming.sort((a, b) => a.bookingDate.localeCompare(b.bookingDate));
  return upcoming[0] ?? null;
}
