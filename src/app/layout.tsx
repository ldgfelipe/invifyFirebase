import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { SiteHeader } from "@/components/layout/SiteHeader";
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
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${playfair.variable} ${inter.variable}`}>
      <body>
        <AuthProvider>
          <SiteHeader />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
