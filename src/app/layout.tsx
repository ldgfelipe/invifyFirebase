import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/lib/i18n/provider";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { MarketingHead, MarketingBody } from "@/components/MarketingScripts";
import { getPublishedPagesCached } from "@/lib/pages";
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Páginas del CMS para los enlaces del pie. Sin esto, /admin/pages puede crear
  // y publicar páginas que no enlaza nadie: se sirven en su URL y aparecen en el
  // sitemap, pero no hay forma de llegar a ellas desde el sitio.
  //
  // Va cacheada (getPublishedPagesCached) porque el pie vive en el layout raíz:
  // sin caché, cada ruta —incluidas las invitaciones públicas y el panel— haría
  // una lectura completa de /pages. Con un fallo de Firestore el pie se queda sin
  // páginas, pero el resto del sitio sigue sirviendo.
  const pages = await getPublishedPagesCached()
    .then((list) => list.map((p) => ({ slug: p.slug, title: p.title })))
    .catch(() => []);

  return (
    <html lang="es" className={`${playfair.variable} ${inter.variable}`}>
      <head>
        {/* Scripts de marketing configurables desde /admin/settings */}
        <MarketingHead />
      </head>
      <body className="min-h-screen flex flex-col">
        <AuthProvider>
          <LanguageProvider>
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter pages={pages} />
          </LanguageProvider>
        </AuthProvider>
        <MarketingBody />
      </body>
    </html>
  );
}