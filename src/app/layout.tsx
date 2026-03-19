import type { Metadata, Viewport } from "next";
import "./globals.css";
import LanguageInitializer from "./components/LanguageInitializer";
import { TripProvider } from "@/lib/contexts/TripContext";
import ClientChrome from "./components/ClientChrome";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Kello | Korea Travel OS",
  description: "Operating your Korea trip with AI. Not just searching.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = "ko"; // Static default for initial HTML shell

  return (
    <html lang={locale}>
      <body className="antialiased" suppressHydrationWarning>
        <TripProvider>
          <LanguageInitializer locale={locale} />
          <div className="mobile-wrapper">
            <main className="scroll-container">
              {children}
            </main>
            {/* Contains GlobalLangButton, BottomNav, KRideGlobalFAB - gated to client mount */}
            <ClientChrome />
          </div>
        </TripProvider>
      </body>
    </html>
  );
}
