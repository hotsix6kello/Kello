import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
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
import AutoLanguageDetector from "./components/AutoLanguageDetector";
import { TripProvider } from "@/lib/contexts/TripContext";
import ClientChrome from "./components/ClientChrome";
import { DEFAULT_CLIENT_LOCALE, resolveCanonicalLocale } from "@/lib/i18n/locales";

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
  referrer: "origin",
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
  const headerStore = await headers();

  // middleware가 확정한 x-resolved-locale을 Source of Truth로 사용
  const headerLocale = headerStore.get("x-resolved-locale");
  const locale = resolveCanonicalLocale(headerLocale, DEFAULT_CLIENT_LOCALE);

  return (
    <html
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      className={`${inter.variable} ${notoArabic.variable} ${notoJP.variable} ${notoSC.variable} ${notoTC.variable} ${notoThai.variable}`}
      suppressHydrationWarning
    >
      <head>
        <meta name="referrer" content="origin" />
        <link rel="stylesheet" as="style" crossOrigin="anonymous" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
      </head>
      <body className="antialiased" suppressHydrationWarning data-i18n-ready="false">
        <style>{`body[data-i18n-ready="false"] .mobile-wrapper{visibility:hidden}`}</style>
        <TripProvider>
          <LanguageInitializer locale={locale} />
          <AutoLanguageDetector />
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
