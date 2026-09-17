"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import type { PaymentProvider } from "@/lib/payments/types";

type CheckoutResult =
  | { type: "embedded"; provider: "stripe"; clientSecret: string; publishableKey?: string }
  | { type: "redirect"; provider: PaymentProvider; url: string };

const PROVIDERS: Array<{ id: PaymentProvider; label: string; desc: string }> = [
  { id: "stripe", label: "💳 Tarjeta (Stripe)", desc: "Visa, Mastercard, Amex" },
  { id: "paypal", label: "🅿️ PayPal", desc: "Cuenta PayPal" },
  { id: "mercadopago", label: "💚 Mercado Pago", desc: "Tarjetas, OXXO, SPEI" },
];

function getStripePromise(publishableKey?: string) {
  const key = publishableKey || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  return key ? loadStripe(key) : null;
}

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
      onSuccess();
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
  const searchParams = useSearchParams();
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>("stripe");
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showEmbedded, setShowEmbedded] = useState(false);

  const handleRedirectReturn = useCallback(() => {
    const paypal = searchParams.get("paypal_order");
    const mp = searchParams.get("mp_order");
    const provider = paypal ? "paypal" : mp ? "mercadopago" : null;
    if (provider && user) {
      setBusyPlan("__verify__");
      (async () => {
        try {
          const token = await user.getIdToken();
          const orderId = paypal ?? mp;
          const isTestMode =
            typeof window !== "undefined"
              ? localStorage.getItem("stripeTestMode") !== "false"
              : true;
          const res = await fetch("/api/payments/verify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ provider, orderId, mode: isTestMode ? "test" : "live" }),
          });
          const data = await res.json();
          if (data.success) {
            router.replace("/dashboard");
          } else if (data.error && !data.pending) {
            setError(data.error);
          } else {
            // pending: el webhook confirmará
            setTimeout(() => router.replace("/dashboard"), 1500);
          }
        } catch (err: any) {
          setError(err.message);
        } finally {
          setBusyPlan(null);
        }
      })();
    }
  }, [searchParams, user, router]);

  useEffect(() => {
    handleRedirectReturn();
  }, [handleRedirectReturn]);

  if (loading || busyPlan === "__verify__") {
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

      const isTestMode = typeof window !== "undefined"
        ? localStorage.getItem("stripeTestMode") !== "false"
        : true;

      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          planId: plan.id,
          provider: selectedProvider,
          templateId,
          mode: isTestMode ? "test" : "live",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo iniciar el pago");

      const result: CheckoutResult = data.result;
      setSelectedPlan(plan);

      if (result.type === "redirect") {
        // Además, registrar la orden para verificación al regresar.
        window.location.href = result.url;
        return;
      }

      setStripePromise(getStripePromise(result.publishableKey));
      setClientSecret(result.clientSecret);
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

  if (showEmbedded && clientSecret && selectedPlan) {
    return (
      <div className="max-w-md mx-auto card p-8">
        <h2 className="font-serif text-xl text-center mb-6">Completar pago</h2>
        <p className="text-center text-sm text-ink/60 mb-4">
          {selectedPlan.name} · {formatPrice(selectedPlan.price, selectedPlan.currency as "mxn" | "usd" | "eur")}
        </p>
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
              {plan.interval && plan.interval !== "one_time" && (
                <span className="text-sm text-ink/60 ml-1">
                  /{plan.interval === "month" ? "mes" : plan.interval}
                </span>
              )}
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

      <div className="max-w-md mx-auto mt-10 card p-6">
        <p className="text-sm text-ink/60 mb-3">Método de pago</p>
        <div className="space-y-2">
          {PROVIDERS.map((p) => (
            <label
              key={p.id}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition",
                selectedProvider === p.id
                  ? "border-gold-300 bg-gold-50"
                  : "border-ink/10 hover:border-ink/20"
              )}
            >
              <input
                type="radio"
                name="provider"
                value={p.id}
                checked={selectedProvider === p.id}
                onChange={() => setSelectedProvider(p.id)}
                className="mt-1 accent-gold-500"
              />
              <span>
                <span className="block font-medium text-ink">{p.label}</span>
                <span className="block text-xs text-ink/50">{p.desc}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {error && <p className="text-center text-red-600 mt-6">{error}</p>}
    </div>
  );
}