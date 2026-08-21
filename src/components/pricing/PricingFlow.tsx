"use client";

// ============================================================================
// PRICING FLOW - Muestra planes y arranca el checkout de Stripe.
// Si no hay sesión, muestra el Auth Wall conservando la plantilla elegida.
// ============================================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import type { Plan } from "@/lib/types";
import { cn } from "@/lib/cn";

export function PricingFlow({
  plans,
  templateId,
}: {
  plans: Plan[];
  templateId?: string;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return <div className="text-center py-20 text-ink/60">Cargando…</div>;
  }

  // AUTH WALL: si no hay sesión, redirigimos al login conservando la plantilla.
  if (!user) {
    const q = templateId ? `?redirect=/pricing&template=${templateId}` : "?redirect=/pricing";
    router.replace(`/login${q}`);
    return <div className="text-center py-20 text-ink/60">Redirigiendo…</div>;
  }

  async function choosePlan(plan: Plan) {
    setBusyPlan(plan.id);
    setError(null);
    try {
      // Obtenemos el id token freso para autenticar la API de checkout.
      const token = await user!.getIdToken();
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planId: plan.id, templateId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo iniciar el pago");
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message);
      setBusyPlan(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <h1 className="section-title text-center">Elige tu plan</h1>
      <p className="text-center text-ink/60 mb-10">
        {templateId
          ? "Completa tu pago para personalizar tu invitación."
          : "Selecciona un plan para empezar."}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan, i) => (
          <div
            key={plan.id}
            className={cn(
              "card p-8 flex flex-col",
              i === 1 && "ring-2 ring-gold-300 scale-[1.03]"
            )}
          >
            {i === 1 && (
              <span className="self-start text-xs uppercase tracking-widest bg-gold-100 text-gold-500 px-3 py-1 rounded-full mb-3">
                Popular
              </span>
            )}
            <h2 className="font-serif text-2xl text-ink">{plan.name}</h2>
            <p className="text-3xl font-serif text-gold-500 my-4">
              ${(plan.price / 100).toFixed(2)}
            </p>
            <ul className="space-y-2 text-sm text-ink/70 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-gold-500">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => choosePlan(plan)}
              disabled={busyPlan === plan.id}
              className={cn("btn-primary w-full mt-6", busyPlan === plan.id && "opacity-60")}
            >
              {busyPlan === plan.id ? "Redirigiendo…" : "Seleccionar"}
            </button>
          </div>
        ))}
      </div>
      {error && <p className="text-center text-red-600 mt-6">{error}</p>}
    </div>
  );
}
