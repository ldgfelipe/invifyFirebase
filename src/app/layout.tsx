import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/lib/i18n/provider";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SITE_URL } from "@/lib/seo";

// Fuentes premium (se autohospedan en build para Core Web Vitals).
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-playfair",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Invify · Invitaciones digitales interactivas",
    template: "%s · Invify",
  },
  description:
    "Crea invitaciones digitales interactivas para bodas, cumpleaños y baby showers. Elegantes, personalizables y listas en 3 clics.",
  openGraph: {
    title: "Invify · Invitaciones digitales interactivas",
    description:
      "Invitaciones digitales elegantes para tu evento. Personaliza en minutos.",
    type: "website",
    url: SITE_URL,
    siteName: "Invify",
    locale: "es_MX",
    alternateLocale: ["en_US"],
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  alternates: {
    canonical: SITE_URL,
    languages: {
      es: SITE_URL,
      en: `${SITE_URL}/en`,
      "x-default": SITE_URL,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${playfair.variable} ${inter.variable}`}>
      <body className="min-h-screen flex flex-col">
        {/* Google Tag Manager -->
        <script>
          window.dataLayer = window.dataLayer || [];
          gtag('js', new Date());
          gtag('config', 'GTM-MXNTHF83');
        </script>
        <!-- End Google Tag Manager -->
        <noscript>
          <iframe src="https://www.googletagmanager.com/ns.html?id=GTM-MXNTHF83"
            height="0" width="0" style="display:none;visibility:hidden"></iframe>
        </noscript>
        {/* End Google Tag Manager (noscript) */}
        <AuthProvider>
          <LanguageProvider>
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}