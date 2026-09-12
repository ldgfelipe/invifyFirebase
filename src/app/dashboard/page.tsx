"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/client";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import type { Invitation, Order } from "@/lib/types";
import { invitationUrl } from "@/lib/seo";
import { cn } from "@/lib/cn";

export default function MyInvitationsPage() {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [processingOrder, setProcessingOrder] = useState<string | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        // Invitaciones
        const invQ = query(
          collection(db, "invitations"),
          where("ownerUid", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const invSnap = await getDocs(invQ);
        setInvitations(invSnap.docs.map((d) => d.data() as Invitation));

        // Orders pendientes
        const ordQ = query(
          collection(db, "orders"),
          where("uid", "==", user.uid),
          where("status", "==", "pending"),
          orderBy("createdAt", "desc")
        );
        const ordSnap = await getDocs(ordQ);
        setPendingOrders(ordSnap.docs.map((d) => d.data() as Order));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  async function togglePublish(inv: Invitation) {
    const next = inv.status === "published" ? "draft" : "published";
    await updateDoc(doc(db, "invitations", inv.id), { status: next });
    setInvitations((prev) =>
      prev.map((i) => (i.id === inv.id ? { ...i, status: next } : i))
    );
  }

  function share(inv: Invitation) {
    navigator.clipboard.writeText(invitationUrl(inv.slug));
    setCopied(inv.id);
    setTimeout(() => setCopied(null), 2000);
  }

  async function procesarOrderPendiente(orderId: string) {
    setProcessingOrder(orderId);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/stripe/webhook/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error procesando");
      // Recarga
      const ordQ = query(
        collection(db, "orders"),
        where("uid", "==", user!.uid),
        where("status", "==", "pending"),
        orderBy("createdAt", "desc")
      );
      const ordSnap = await getDocs(ordQ);
      setPendingOrders(ordSnap.docs.map((d) => d.data() as Order));
      // Recarga invitaciones
      const invQ = query(
        collection(db, "invitations"),
        where("ownerUid", "==", user!.uid),
        orderBy("createdAt", "desc")
      );
      const invSnap = await getDocs(invQ);
      setInvitations(invSnap.docs.map((d) => d.data() as Invitation));
      
      // Log cliente
      await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "order.processed_manually",
          userId: user?.uid,
          userEmail: user?.email,
          targetId: orderId,
          targetType: "order",
          description: "Usuario forzó procesamiento de pago pendiente",
          severity: "info",
        }),
      });
      
      alert("¡Pago procesado! La invitación ya aparece en la lista.");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setProcessingOrder(null);
    }
  }

  async function cancelarOrderPendiente(orderId: string) {
    if (!confirm("¿Cancelar este pedido pendiente? Se eliminará permanentemente.")) return;
    setDeletingOrder(orderId);
    try {
      await deleteDoc(doc(db, "orders", orderId));
      setPendingOrders((prev) => prev.filter((o) => o.id !== orderId));
      
      // Log cliente
      await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "order.cancelled",
          userId: user?.uid,
          userEmail: user?.email,
          targetId: orderId,
          targetType: "order",
          description: "Usuario canceló su pedido pendiente",
          severity: "warning",
        }),
      });
      
      alert("Pedido cancelado y eliminado.");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setDeletingOrder(null);
    }
  }

  if (loading) return <p className="text-ink/60">Cargando…</p>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="section-title">Mis invitaciones</h1>
        <Link href="/templates" className="btn-primary w-full sm:w-auto">
          Comprar otra invitación
        </Link>
      </div>

      {/* Orders pendientes */}
      {pendingOrders.length > 0 && (
        <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <h3 className="font-semibold text-amber-800 mb-3">
            ⏳ Pagos pendientes de confirmación ({pendingOrders.length})
          </h3>
          <div className="space-y-3">
            {pendingOrders.map((ord) => (
              <div key={ord.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-white rounded-lg border border-amber-100">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-ink truncate">Order: {ord.id.slice(0, 12)}…</p>
                  <p className="text-xs text-ink/60">Plan: {ord.planId} · {new Date(ord.createdAt).toLocaleString()}</p>
                  <p className="text-xs text-ink/50">Monto: ${(ord.amount || 0) / 100} · Plantilla: {ord.templateId || "—"}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => procesarOrderPendiente(ord.id)}
                    disabled={processingOrder === ord.id}
                    className="btn-primary text-sm px-4 py-2 whitespace-nowrap"
                  >
                    {processingOrder === ord.id ? "Procesando…" : "Procesar pago"}
                  </button>
                  <button
                    onClick={() => cancelarOrderPendiente(ord.id)}
                    disabled={deletingOrder === ord.id}
                    className="btn-outline text-sm px-4 py-2 whitespace-nowrap text-red-600 hover:bg-red-50 border-red-200"
                  >
                    {deletingOrder === ord.id ? "Eliminando…" : "Cancelar pedido"}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-amber-700 mt-3">
            <strong>Procesar pago:</strong> fuerza la creación de la invitación si ya pagaste en Stripe.<br />
            <strong>Cancelar pedido:</strong> elimina el pedido pendiente (no se cobra nada).
          </p>
        </div>
      )}

      {invitations.length === 0 && pendingOrders.length === 0 && (
        <div className="card p-10 text-center">
          <p className="text-ink/60 mb-4">
            Aún no tienes invitaciones. Elige una plantilla para empezar.
          </p>
          <Link href="/templates" className="btn-primary">
            Comprar mi primera invitación
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {invitations.map((inv) => (
          <div key={inv.id} className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-serif text-xl text-ink">{inv.title}</h3>
                <p className="text-sm text-ink/60">/i/{inv.slug}</p>
              </div>
              <span
                className={cn(
                  "text-xs px-2 py-1 rounded-full",
                  inv.status === "published"
                    ? "bg-green-100 text-green-700"
                    : "bg-ink/10 text-ink/60"
                )}
              >
                {inv.status === "published" ? "Publicada" : "Borrador"}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              <button onClick={() => togglePublish(inv)} className="btn-outline text-sm px-3 py-2">
                {inv.status === "published" ? "Despublicar" : "Publicar"}
              </button>
              <Link href={`/dashboard/invitations/${inv.id}/editor`} className="btn-primary text-sm px-3 py-2">
                Editar visual
              </Link>
              <Link href={`/dashboard/invitations/${inv.id}`} className="btn-outline text-sm px-3 py-2">
                Ajustes
              </Link>
              <Link href={`/i/${inv.slug}`} className="btn-outline text-sm px-3 py-2">
                Ver
              </Link>
              <button onClick={() => share(inv)} className="btn-outline text-sm px-3 py-2">
                {copied === inv.id ? "¡Copiado!" : "Compartir"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}