import type { Metadata } from "next";

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