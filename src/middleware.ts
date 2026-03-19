import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SUPPORTED = ["ko", "en", "ja", "zh-CN", "zh-HK", "vi", "th", "id", "ms"];

function getLocaleFromCountry(country: string): string {
    const c = country.toUpperCase();
    const map: Record<string, string> = {
        'KR': 'ko', 'US': 'en', 'JP': 'ja', 'CN': 'zh-CN', 'HK': 'zh-HK',
        'VN': 'vi', 'TH': 'th', 'ID': 'id', 'MY': 'ms'
    };
    return map[c] || 'ko';
}

function getLocaleFromBrowser(acceptLang: string): string | null {
    const langs = acceptLang.split(',').map(s => s.split(';')[0].trim().toLowerCase());
    for (const l of langs) {
        if (l === 'ko' || l.startsWith('ko-')) return 'ko';
        if (l === 'ja' || l.startsWith('ja-')) return 'ja';
        if (l === 'zh-cn' || l === 'zh-sg' || l === 'zh-hans') return 'zh-CN';
        if (l === 'zh-tw' || l === 'zh-hk' || l === 'zh-mo' || l === 'zh-hant') return 'zh-HK';
        if (l === 'zh') return 'zh-CN';
        if (l === 'vi' || l.startsWith('vi-')) return 'vi';
        if (l === 'th' || l.startsWith('th-')) return 'th';
        if (l === 'id' || l.startsWith('id-')) return 'id';
        if (l === 'ms' || l.startsWith('ms-')) return 'ms';
        if (l === 'en' || l.startsWith('en-')) return 'en';
    }
    return null;
}

export function middleware(request: NextRequest) {
    let locale = request.cookies.get('ktrip_lang')?.value;
    let needsSetting = false;

    if (!locale || !SUPPORTED.includes(locale)) {
        needsSetting = true;
        
        // 1. Browser Accept-Language
        const acceptLang = request.headers.get('accept-language');
        if (acceptLang) {
            const browserLocale = getLocaleFromBrowser(acceptLang);
            if (browserLocale && SUPPORTED.includes(browserLocale)) {
                locale = browserLocale;
            }
        }

        // 2. Country header fallback
        if (!locale) {
            const country = request.headers.get('x-vercel-ip-country') || request.headers.get('cf-ipcountry');
            if (country) locale = getLocaleFromCountry(country);
        }

        // 3. Default fallback
        if (!locale) locale = 'ko';
    }

    // Pass the locale in headers so Server Components can read the resolved value directly 
    // without needing to duplicate parsing logic if the cookie was just set
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-resolved-locale', locale);

    const response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });

    if (needsSetting) {
        response.cookies.set('ktrip_lang', locale, {
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
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
