import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import "./globals.css";
import LanguageInitializer from "./components/LanguageInitializer";
import { TripProvider } from "@/lib/contexts/TripContext";
import ClientChrome from "./components/ClientChrome";
import { LOCALE_STORAGE_KEY, DEFAULT_CLIENT_LOCALE, resolveCanonicalLocale } from "@/lib/i18n/locales";

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
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Arabic:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700&family=Noto+Sans+SC:wght@400;500;700&family=Noto+Sans+TC:wght@400;500;700&family=Noto+Sans+Thai:wght@400;500;700&display=swap" rel="stylesheet" />
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
