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
  getDoc,
  doc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import type { Invitation, Order, Template, UserEntitlements } from "@/lib/types";
import { isInvitationActive } from "@/lib/invitationValidity";
import { formatQuota, getInvitationFeatures } from "@/lib/plans";
import { ShareMenu } from "@/components/invitation/ShareMenu";
import { cn } from "@/lib/cn";

export default function MyInvitationsPage() {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingOrder, setProcessingOrder] = useState<string | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<string | null>(null);
  const [entitlements, setEntitlements] = useState<UserEntitlements | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [creating, setCreating] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    // Entitlements y plantillas (one-shot, no necesitan realtime)
    (async () => {
      try {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        setEntitlements((userSnap.data()?.entitlements as UserEntitlements | undefined) ?? null);
        const tplSnap = await getDocs(query(collection(db, "templates"), where("active", "==", true)));
        setTemplates(tplSnap.docs.map((d) => d.data() as Template));
      } catch (err) {
        console.error(err);
      }
    })();
  }, [user]);

  // Realtime: invitaciones y órdenes pendientes (websocket Firestore)
  useEffect(() => {
    if (!user) return;
    const unsubs: Array<() => void> = [];
    // Invitaciones en vivo
    const invQ = query(collection(db, "invitations"), where("ownerUid", "==", user.uid), orderBy("createdAt", "desc"));
    unsubs.push(
      onSnapshot(
        invQ,
        (snap) => {
          setInvitations(snap.docs.map((d) => d.data() as Invitation));
          setLoading(false);
        },
        (err) => {
          console.warn("[dashboard] onSnapshot invitations error", err);
          setLoading(false);
        }
      )
    );
    // Órdenes pendientes en vivo
    const ordQ = query(collection(db, "orders"), where("uid", "==", user.uid), where("status", "==", "pending"), orderBy("createdAt", "desc"));
    unsubs.push(
      onSnapshot(
        ordQ,
        (snap) => setPendingOrders(snap.docs.map((d) => d.data() as Order)),
        (err) => console.warn("[dashboard] onSnapshot orders error", err)
      )
    );
    return () => unsubs.forEach((u) => u());
  }, [user]);

  async function patchInvitation(inv: Invitation, payload: Record<string, unknown>) {
    const token = await user?.getIdToken();
    const res = await fetch(`/api/invitations/${inv.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "No se pudo actualizar");
    setInvitations((prev) =>
      prev.map((i) => (i.id === inv.id ? { ...i, ...payload } as Invitation : i))
    );
  }

  async function togglePublish(inv: Invitation) {
    const next = inv.status === "published" ? "draft" : "published";
    try {
      await patchInvitation(inv, { status: next });
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function retain(inv: Invitation) {
    try {
      await patchInvitation(inv, { retain: true });
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function createInvitation(templateId: string) {
    if (!user) return;
    setCreating(templateId);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/invitations/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ templateId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo crear");
      // onSnapshot actualizará la lista automáticamente (realtime)
      alert("¡Invitación creada! Aparecerá en tu lista en segundos.");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setCreating(null);
    }
  }

  // Share ahora via ShareMenu (copiar + WhatsApp + correo con URL runtime)

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
      // onSnapshot actualizará invitaciones/órdenes automáticamente
      
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

  const activeCount = invitations.filter((i) => isInvitationActive(i)).length;
  const quota = entitlements?.quota ?? 0;
  const canCreateMore =
    !!entitlements && (quota === "unlimited" || activeCount < quota);
  const allowedTemplates = entitlements
    ? templates.filter(
        (t) =>
          entitlements.features.allTemplates ||
          entitlements.allowedTemplateIds === "all" ||
          entitlements.allowedTemplateIds.includes(t.id)
      )
    : [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <h1 className="section-title">Mis invitaciones</h1>
          <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-green-50 border border-green-200 text-green-700">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> En vivo
          </span>
        </div>
        <Link href="/templates" className="btn-primary w-full sm:w-auto">
          Comprar otra invitación
        </Link>
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink/60">
        <span>
          Plan:{" "}
          <strong className="text-ink">
            {entitlements?.planName ?? "Sin plan"}
          </strong>
        </span>
        <span>
          Activas: <strong className="text-ink">{activeCount}</strong> de{" "}
          <strong className="text-ink">
            {entitlements ? formatQuota(quota) : "0"}
          </strong>
        </span>
        {entitlements && (
          <span className="text-xs">
            {entitlements.features.rsvp ? "RSVP" : "RSVP bloqueado"} ·{" "}
            {entitlements.features.quiz ? "Quiz" : "Quiz bloqueado"} ·{" "}
            {entitlements.features.audio ? "Música" : "Música bloqueada"}
          </span>
        )}
      </div>

      {/* Crear invitación consumiendo cupo del plan */}
      {entitlements && canCreateMore && allowedTemplates.length > 0 && (
        <div className="card p-5 mb-8">
          <h3 className="font-serif text-lg text-ink mb-1">Crear invitación</h3>
          <p className="text-xs text-ink/50 mb-4">
            Usa una de tus invitaciones incluidas en el plan.
          </p>
          <div className="flex flex-wrap gap-2">
            {allowedTemplates.map((t) => (
              <button
                key={t.id}
                onClick={() => createInvitation(t.id)}
                disabled={creating === t.id}
                className="btn-outline text-sm px-3 py-2"
              >
                {creating === t.id ? "Creando…" : `+ ${t.name}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {entitlements && canCreateMore && allowedTemplates.length === 0 && (
        <div className="card p-5 mb-8 text-sm text-ink/60">
          No hay plantillas disponibles para tu plan.{" "}
          <Link href="/templates" className="text-gold-500 hover:underline">
            Ver catálogo
          </Link>
        </div>
      )}

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
              <span className="flex flex-col items-end gap-1">
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
                {inv.unpublishedReason === "event_expired" && (
                  <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                    Finalizada
                  </span>
                )}
                {inv.retain && (
                  <span className="text-xs px-2 py-1 rounded-full bg-gold-100 text-gold-600">
                    Conservada
                  </span>
                )}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              <button onClick={() => togglePublish(inv)} className="btn-outline text-sm px-3 py-2">
                {inv.status === "published" ? "Despublicar" : "Publicar"}
              </button>
              {!inv.retain && inv.unpublishedReason === "event_expired" && (
                <button
                  onClick={() => retain(inv)}
                  className="btn-outline text-sm px-3 py-2"
                  title="Evita que se elimine automáticamente"
                >
                  Conservar
                </button>
              )}
              <Link href={`/dashboard/invitations/${inv.id}/editor`} className="btn-primary text-sm px-3 py-2">
                Editar visual
              </Link>
              <Link href={`/dashboard/invitations/${inv.id}`} className="btn-outline text-sm px-3 py-2">
                Ajustes
              </Link>
              <Link href={`/i/${inv.slug}`} className="btn-outline text-sm px-3 py-2">
                Ver
              </Link>
              <ShareMenu slug={inv.slug} title={inv.title} />
              {getInvitationFeatures(inv).stats ? (
                <Link href={`/dashboard/invitations/${inv.id}/stats`} className="btn-outline text-sm px-3 py-2">
                  📋 Invitados / Quiz
                </Link>
              ) : (
                <Link href="/pricing" className="btn-outline text-sm px-3 py-2 opacity-60" title="Disponible en Pro/Premium">
                  🔒 Invitados (Pro)
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}