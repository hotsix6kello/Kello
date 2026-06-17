import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import {
  CANONICAL_SUPPORTED_LOCALES,
  DEFAULT_CLIENT_LOCALE,
  LOCALE_STORAGE_KEY,
  resolveCanonicalLocale,
} from '@/lib/i18n/locales';

const SUPPORTED_LOCALES = new Set<string>(CANONICAL_SUPPORTED_LOCALES);


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
  const acceptLanguage = request.headers.get('accept-language');

  const cookieResolved =
    cookieLocale && SUPPORTED_LOCALES.has(resolveCanonicalLocale(cookieLocale, DEFAULT_CLIENT_LOCALE))
      ? resolveCanonicalLocale(cookieLocale, DEFAULT_CLIENT_LOCALE)
      : null;

  if (cookieResolved) {
    return { locale: cookieResolved, shouldRefreshCookie: cookieResolved !== cookieLocale };
  }

  const browserResolved = acceptLanguage ? getLocaleFromAcceptLanguage(acceptLanguage) : null;
  if (browserResolved) {
    return { locale: browserResolved, shouldRefreshCookie: true };
  }

  // 매핑되지 않은 국가/언어는 영어로 fallback (DEFAULT_CLIENT_LOCALE = ko는 한국어 사용자 전용)
  return { locale: "en", shouldRefreshCookie: true };
}

export function middleware(request: NextRequest) {
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
