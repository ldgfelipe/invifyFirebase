import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gracias por tu compra",
  robots: { index: false, follow: false },
};

export default function ThanksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}