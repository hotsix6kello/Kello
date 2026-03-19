import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BottomNav from "./components/BottomNav";
import KRideGlobalFAB from "./components/KRideGlobalFAB";
import LanguageInitializer from "./components/LanguageInitializer";
import GlobalLangButton from "./components/GlobalLangButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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

import { TripProvider } from "@/lib/contexts/TripContext";
import { headers, cookies } from "next/headers";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const reqHeaders = await headers();
  const reqCookies = await cookies();
  const locale = reqHeaders.get('x-resolved-locale') || reqCookies.get('ktrip_lang')?.value || "ko";

  return (
    <html lang={locale}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning>
        <TripProvider>
          <LanguageInitializer />
          <div className="mobile-wrapper">
            <GlobalLangButton />
            <main className="scroll-container">
              {children}
            </main>
            <BottomNav />
            <KRideGlobalFAB />
          </div>
        </TripProvider>
      </body>
    </html>
  );
}
