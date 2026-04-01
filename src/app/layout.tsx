import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import {
  Inter,
  Noto_Sans_Arabic,
  Noto_Sans_JP,
  Noto_Sans_SC,
  Noto_Sans_TC,
  Noto_Sans_Thai
} from "next/font/google";
import "./globals.css";
import LanguageInitializer from "./components/LanguageInitializer";
import { TripProvider } from "@/lib/contexts/TripContext";
import ClientChrome from "./components/ClientChrome";
import { LOCALE_STORAGE_KEY, DEFAULT_CLIENT_LOCALE, resolveCanonicalLocale } from "@/lib/i18n/locales";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-noto-arabic",
  display: "swap",
});

const notoJP = Noto_Sans_JP({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-noto-jp",
  display: "swap",
});

const notoSC = Noto_Sans_SC({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-noto-sc",
  display: "swap",
});

const notoTC = Noto_Sans_TC({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-noto-tc",
  display: "swap",
});

const notoThai = Noto_Sans_Thai({
  weight: ["400", "500", "700"],
  subsets: ["thai"],
  variable: "--font-noto-thai",
  display: "swap",
});

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Kello | Book Beauty Services in Korea",
  description: "Booking and language support for beauty services in Korea for global travelers.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const cookieLocale = cookieStore.get(LOCALE_STORAGE_KEY)?.value;
  const headerLocale = headerStore.get("x-resolved-locale");
  const acceptLanguage = headerStore.get("accept-language");

  const locale = resolveCanonicalLocale(
    cookieLocale ?? headerLocale ?? acceptLanguage,
    DEFAULT_CLIENT_LOCALE
  );

  return (
    <html
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      className={`${inter.variable} ${notoArabic.variable} ${notoJP.variable} ${notoSC.variable} ${notoTC.variable} ${notoThai.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="stylesheet" as="style" crossOrigin="anonymous" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
      </head>
      <body className="antialiased" suppressHydrationWarning data-i18n-ready="false">
        <style>{`body[data-i18n-ready="false"] .mobile-wrapper{visibility:hidden}`}</style>
        <TripProvider>
          <LanguageInitializer locale={locale} />
          <div className="mobile-wrapper">
            <main className="scroll-container">
              {children}
            </main>
            {/* Contains global client-only chrome such as language and bottom navigation */}
            <ClientChrome />
          </div>
        </TripProvider>
      </body>
    </html>
  );
}
