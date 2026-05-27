import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WEATHER_CODES: Record<number, string> = {
  0: '☀️',
  1: '🌤️', 2: '🌤️', 3: '⛅',
  45: '🌫️', 48: '🌫️',
  51: '🌧️', 53: '🌧️', 55: '🌧️',
  61: '🌧️', 63: '🌧️', 65: '🌧️',
  71: '❄️', 73: '❄️', 75: '❄️', 77: '❄️',
  80: '🌦️', 81: '🌦️', 82: '🌦️',
  95: '⛈️', 96: '⛈️', 99: '⛈️',
};

function codeToIcon(code: number): string {
  if (WEATHER_CODES[code]) return WEATHER_CODES[code];
  if (code >= 1 && code <= 3) return '🌤️';
  if (code >= 45 && code <= 48) return '🌫️';
  if (code >= 51 && code <= 67) return '🌧️';
  if (code >= 71 && code <= 77) return '❄️';
  if (code >= 80 && code <= 82) return '🌦️';
  if (code >= 95) return '⛈️';
  return '🌤️';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat') ?? '37.5665';
  const lng = searchParams.get('lng') ?? '126.9780';

  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`,
      { next: { revalidate: 1800 } },
    );

    if (!res.ok) {
      return NextResponse.json({ ok: false }, { status: 502 });
    }

    const data = await res.json() as {
      current_weather?: { temperature?: number; weathercode?: number };
    };

    const temp = Math.round(data.current_weather?.temperature ?? 0);
    const icon = codeToIcon(data.current_weather?.weathercode ?? -1);

    return NextResponse.json({ ok: true, temp, icon });
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
