import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import {
  CANONICAL_SUPPORTED_LOCALES,
  DEFAULT_CLIENT_LOCALE,
  LOCALE_STORAGE_KEY,
  resolveCanonicalLocale,
} from '@/lib/i18n/locales';

const SUPPORTED_LOCALES = new Set<string>(CANONICAL_SUPPORTED_LOCALES);

function getLocaleFromCountry(country: string): string {
  const normalizedCountry = country.trim().toUpperCase();

  const localeByCountry: Record<string, string> = {
    KR: 'ko',
    US: 'en',
    JP: 'ja',
    CN: 'zh-CN',
    HK: 'zh-HK',
    VN: 'vi',
    TH: 'th',
    ID: 'id',
    MY: 'ms',
    ES: 'es',
    FR: 'fr',
    DE: 'de',
    SA: 'ar',
    PT: 'pt',
    RU: 'ru',
  };

  return localeByCountry[normalizedCountry] ?? DEFAULT_CLIENT_LOCALE;
}

function getLocaleFromAcceptLanguage(acceptLanguage: string): string | null {
  const candidates = acceptLanguage
    .split(',')
    .map((entry) => entry.split(';')[0]?.trim())
    .filter(Boolean);

  for (const candidate of candidates) {
    const resolved = resolveCanonicalLocale(candidate, DEFAULT_CLIENT_LOCALE);
    if (SUPPORTED_LOCALES.has(resolved)) {
      return resolved;
    }
  }

  return null;
}

function getResolvedRequestLocale(request: NextRequest) {
  const cookieLocale = request.cookies.get(LOCALE_STORAGE_KEY)?.value ?? null;
  const headerLocale = request.headers.get('x-resolved-locale');
  const acceptLanguage = request.headers.get('accept-language');
  const countryHeader = request.headers.get('x-vercel-ip-country') || request.headers.get('cf-ipcountry');

  const cookieResolved =
    cookieLocale && SUPPORTED_LOCALES.has(resolveCanonicalLocale(cookieLocale, DEFAULT_CLIENT_LOCALE))
      ? resolveCanonicalLocale(cookieLocale, DEFAULT_CLIENT_LOCALE)
      : null;

  if (cookieResolved) {
    return { locale: cookieResolved, source: 'cookie' as const, shouldRefreshCookie: cookieResolved !== cookieLocale };
  }

  const headerResolved =
    headerLocale && SUPPORTED_LOCALES.has(resolveCanonicalLocale(headerLocale, DEFAULT_CLIENT_LOCALE))
      ? resolveCanonicalLocale(headerLocale, DEFAULT_CLIENT_LOCALE)
      : null;

  if (headerResolved) {
    return { locale: headerResolved, source: 'header' as const, shouldRefreshCookie: true };
  }

  const browserResolved = acceptLanguage ? getLocaleFromAcceptLanguage(acceptLanguage) : null;
  if (browserResolved) {
    return { locale: browserResolved, source: 'accept-language' as const, shouldRefreshCookie: true };
  }

  const countryResolved = countryHeader ? getLocaleFromCountry(countryHeader) : DEFAULT_CLIENT_LOCALE;
  return { locale: countryResolved, source: 'country' as const, shouldRefreshCookie: true };
}

export function proxy(request: NextRequest) {
  const { locale, shouldRefreshCookie } = getResolvedRequestLocale(request);

  // Only forward a normalized locale header. We do not redirect here, which avoids
  // loops on client navigations and keeps API/static exclusions simple via matcher.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-resolved-locale', locale);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Mirror the resolved locale to the response header for easier debugging and to keep
  // downstream consumers aligned without mutating routing behavior.
  response.headers.set('x-resolved-locale', locale);
  response.headers.set('Vary', 'Accept-Language, Cookie');

  if (shouldRefreshCookie) {
    response.cookies.set(LOCALE_STORAGE_KEY, locale, {
      path: '/',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
