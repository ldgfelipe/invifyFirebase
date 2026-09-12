"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import type { Plan } from "@/lib/types";
import { cn } from "@/lib/cn";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { formatPrice } from "@/lib/currency";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function EmbeddedCheckout({
  clientSecret,
  onSuccess,
  onError,
}: {
  clientSecret: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements || processing) return;

    setProcessing(true);
    console.log("[Stripe] Confirmando pago...");

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard`,
      },
    });

    const error = result.error;
    const paymentIntent = (result as any).paymentIntent;

    if (error) {
      console.error("[Stripe] Error:", error);
      setProcessing(false);
      onError(error.message ?? "Error en el pago");
    } else if (paymentIntent?.status === "succeeded" || paymentIntent?.status === "requires_capture") {
      console.log("[Stripe] Pago exitoso:", paymentIntent.id);
      onSuccess();
    } else {
      console.log("[Stripe] Estado:", paymentIntent?.status);
      setProcessing(false);
      onSuccess(); // El webhook manejará la confirmación final
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <button type="submit" disabled={!stripe || processing} className="btn-primary w-full py-3">
        {processing ? "Procesando…" : "Pagar"}
      </button>
    </form>
  );
}

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
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showEmbedded, setShowEmbedded] = useState(false);

  if (loading) {
    return <div className="text-center py-20 text-ink/60">Cargando…</div>;
  }

  if (!user) {
    const q = templateId ? `?redirect=/pricing&template=${templateId}` : "?redirect=/pricing";
    router.replace(`/login${q}`);
    return <div className="text-center py-20 text-ink/60">Redirigiendo…</div>;
  }

  async function choosePlan(plan: Plan) {
    setBusyPlan(plan.id);
    setError(null);
    try {
      const token = await user!.getIdToken();
      
      // Determinar modo test/live desde SiteSettings o usar localStorage
      const isTestMode = typeof window !== "undefined" 
        ? localStorage.getItem("stripeTestMode") !== "false" 
        : true; // default test
      
      const res = await fetch("/api/stripe/checkout/embedded", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planId: plan.id, templateId, mode: isTestMode ? "test" : "live" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo iniciar el pago");

      setSelectedPlan(plan);
      setClientSecret(data.clientSecret);
      setShowEmbedded(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusyPlan(null);
    }
  }

  function handlePaymentSuccess() {
    setShowEmbedded(false);
    setClientSecret(null);
    setSelectedPlan(null);
    router.push("/dashboard");
  }

  if (showEmbedded && clientSecret) {
    return (
      <div className="max-w-md mx-auto card p-8">
        <h2 className="font-serif text-xl text-center mb-6">Completar pago</h2>
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <EmbeddedCheckout
            clientSecret={clientSecret}
            onSuccess={handlePaymentSuccess}
            onError={(msg) => { setError(msg); setShowEmbedded(false); setClientSecret(null); }}
          />
        </Elements>
        {error && <p className="text-center text-red-600 mt-4">{error}</p>}
        <button
          onClick={() => { setShowEmbedded(false); setClientSecret(null); }}
          className="btn-outline w-full mt-4"
        >
          Cancelar
        </button>
      </div>
    );
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
              {formatPrice(plan.price, plan.currency as "mxn" | "usd" | "eur")}
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
              {busyPlan === plan.id ? "Preparando…" : "Seleccionar"}
            </button>
          </div>
        ))}
      </div>
      {error && <p className="text-center text-red-600 mt-6">{error}</p>}
    </div>
  );
}