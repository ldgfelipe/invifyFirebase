// ============================================================================
// /pricing - Página de planes. Lee los planes del servidor (admin) y pasa
// la plantilla preseleccionada desde la URL (?template=ID).
// ============================================================================
import type { Metadata } from "next";
import { Suspense } from "react";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { serverDb } from "@/lib/firebase/serverClient";
import { getSiteSettings } from "@/lib/site";
import type { Plan } from "@/lib/types";
import { PromoBanner } from "@/components/PromoBanner";
import { PricingFlow } from "@/components/pricing/PricingFlow";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Planes y precios",
  description:
    "Planes Básico, Premium y VIP para crear invitaciones digitales ilimitadas. Pago seguro con Stripe.",
  alternates: { canonical: "/pricing" },
};

export default async function PricingPage({
  searchParams,
}: {
  searchParams: { template?: string };
}) {
  const snap = await getDocs(query(collection(serverDb, "plans"), orderBy("price", "asc")));
  const plans = snap.docs.map((d) => d.data() as Plan);
  const settings = await getSiteSettings();

  return (
    <>
      <PromoBanner banner={settings.banner} page="pricing" />
      <Suspense fallback={<div className="text-center py-20 text-ink/60">Cargando…</div>}>
        <PricingFlow plans={plans} templateId={searchParams.template} />
      </Suspense>
    </>
  );
}
