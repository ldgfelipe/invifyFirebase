"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/lib/i18n/provider";
import { db } from "@/lib/firebase/client";
import { doc, onSnapshot } from "firebase/firestore";
import type { Order } from "@/lib/types";

// Envía el evento de conversión (GTM/dataLayer, y si existen gtag/fbq).
function trackConversion(o: Order) {
  const w = window as any;
  const value = (o.amount ?? 0) / 100;
  const currency = ((o.currency ?? "usd") || "usd").toUpperCase();

  if (w.dataLayer?.push) {
    w.dataLayer.push({
      event: "purchase",
      orderId: o.id,
      planId: o.planId,
      provider: o.provider,
      mode: o.mode,
      value,
      currency,
    });
  }
  if (typeof w.gtag === "function") {
    w.gtag("event", "purchase", {
      transaction_id: o.id,
      value,
      currency,
    });
  }
  if (typeof w.fbq === "function") {
    w.fbq("track", "Purchase", { value, currency });
  }
}

export default function ThanksPage() {
  const { user, loading } = useAuth();
  const { locale } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"checking" | "paid" | "pending" | "error">(
    "checking"
  );
  const [order, setOrder] = useState<Order | null>(null);
  const tracked = useRef(false);
  const verified = useRef<string | null>(null);

  const qProvider = searchParams.get("provider");
  const paypalId = searchParams.get("paypal_order");
  const mpId = searchParams.get("mp_order");
  const provider = qProvider ?? (paypalId ? "paypal" : mpId ? "mercadopago" : "stripe");
  const orderId = searchParams.get("orderId") ?? paypalId ?? mpId ?? "";

  const t = {
    title: locale === "en" ? "Thank you for your purchase!" : "¡Gracias por tu compra!",
    subtitle:
      locale === "en"
        ? "Your payment was confirmed. Your invitation is being prepared."
        : "Tu pago fue confirmado. Tu invitación se está preparando.",
    checking:
      locale === "en"
        ? "Confirming your payment…"
        : "Confirmando tu pago…",
    pending:
      locale === "en"
        ? "We're still confirming your payment. This usually takes a few seconds."
        : "Aún estamos confirmando tu pago. Normalmente tarda unos segundos.",
    error:
      locale === "en"
        ? "We couldn't confirm your payment. Check your orders in the dashboard."
        : "No pudimos confirmar tu pago. Revisa tus pedidos en el panel.",
    goDashboard:
      locale === "en" ? "Go to my dashboard" : "Ir a mi panel",
    goTemplates:
      locale === "en" ? "Buy another invitation" : "Comprar otra invitación",
    support:
      locale === "en"
        ? "Need help? Contact support."
        : "¿Necesitas ayuda? Contacta a soporte.",
  };

  useEffect(() => {
    if (loading || !user) return;
    if (!orderId) {
      setStatus("paid");
      return;
    }

    let unsub: (() => void) | undefined;
    let cancelled = false;

    const subscribe = () => {
      unsub = onSnapshot(
        doc(db, "orders", orderId),
        (snap) => {
          if (cancelled) return;
          const o = snap.data() as Order | undefined;
          if (!o) return;
          setOrder(o);

          if (o.status === "paid") {
            setStatus("paid");
            if (!tracked.current) {
              tracked.current = true;
              trackConversion(o);
            }
            unsub?.();
            return;
          }
          if (o.status === "failed" || o.status === "canceled") {
            setStatus("error");
            return;
          }
          setStatus("pending");

          // Best effort: verifica con el proveedor (paypal/mp) cuando haya mode.
          if (
            provider !== "stripe" &&
            o.mode &&
            verified.current !== o.id
          ) {
            verified.current = o.id;
            (async () => {
              try {
                const token = await user.getIdToken();
                await fetch("/api/payments/verify", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({ provider, orderId, mode: o.mode }),
                });
              } catch {
                // el webhook / onSnapshot es la fuente real
              }
            })();
          }
        },
        (err) => {
          console.warn("[thanks] onSnapshot error", err);
          setStatus("pending");
        }
      );
    };

    subscribe();
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [user, loading, orderId, provider]);

  if (loading) {
    return <div className="text-center py-24 text-ink/60">Cargando…</div>;
  }
  if (!user) {
    router.replace(`/login?redirect=/thanks`);
    return <div className="text-center py-24 text-ink/60">Redirigiendo…</div>;
  }

  const showChecking = status === "checking" || (status === "pending" && !orderId);

  return (
    <div className="max-w-2xl mx-auto px-6 py-20">
      <div className="card p-10 text-center">
        <div className="mx-auto flex items-center justify-center w-20 h-20 rounded-full bg-green-100 text-green-600 mb-6">
          <svg
            className="w-10 h-10"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="section-title">{t.title}</h1>
        <p className="text-ink/60 mb-8">{t.subtitle}</p>

        {showChecking && (
          <div className="mb-8 text-sm text-ink/60">
            <span className="inline-flex items-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-ink/20 border-t-gold-500 animate-spin" />
              {t.checking}
            </span>
          </div>
        )}
        {status === "pending" && orderId && (
          <p className="mb-6 text-sm text-amber-600">{t.pending}</p>
        )}
        {status === "error" && (
          <p className="mb-6 text-sm text-red-600">{t.error}</p>
        )}

        {order?.status === "paid" && (order.amount || order.amount === 0) && (
          <p className="mb-8 text-2xl font-serif text-gold-500">
            {new Intl.NumberFormat(locale === "en" ? "en-US" : "es-MX", {
              style: "currency",
              currency: ((order.currency ?? "usd") || "usd").toUpperCase(),
              minimumFractionDigits: 0,
            }).format((order.amount ?? 0) / 100)}
          </p>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/dashboard" className="btn-primary w-full sm:w-auto px-8">
            {t.goDashboard}
          </Link>
          <Link href="/templates" className="btn-outline w-full sm:w-auto px-8">
            {t.goTemplates}
          </Link>
        </div>

        <p className="mt-6 text-xs text-ink/40">{t.support}</p>
      </div>
    </div>
  );
}