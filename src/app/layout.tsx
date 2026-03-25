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
      dir="ltr"
      suppressHydrationWarning
    >
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
