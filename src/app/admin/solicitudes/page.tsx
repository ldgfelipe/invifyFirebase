"use client";

// ============================================================================
// ADMIN /solicitudes — Solicitudes de cambios extra post-publicación.
// El cliente agota sus 2 cambios y pide permiso con motivo; al aprobar se
// regalan 2 más (changesAfterPublish = 0).
// ============================================================================
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/client";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import type { ChangeRequest } from "@/lib/types";

export default function AdminChangeRequestsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [acting, setActing] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const snap = await getDocs(
        query(collection(db, "changeRequests"), orderBy("createdAt", "desc"))
      );
      setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ChangeRequest, "id">) })));
    } catch (e: any) {
      setErr(e.message);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function decide(id: string, decision: "approved" | "rejected") {
    if (!user || acting) return;
    if (!confirm(decision === "approved" ? "¿Aprobar y regalar 2 cambios más?" : "¿Rechazar la solicitud?")) return;
    setActing(id);
    setErr(null);
    try {
      const res = await fetch("/api/admin/change-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({ id, decision }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setItems((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: decision, decidedAt: Date.now() } : r))
      );
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setActing(null);
    }
  }

  const filtered = items.filter((r) => (filter === "all" ? true : r.status === "pending"));
  const pendingCount = items.filter((r) => r.status === "pending").length;

  if (loading) return <p className="text-ink/60">Cargando solicitudes…</p>;

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-2">
        <h1 className="section-title">
          Solicitudes de cambios{" "}
          {pendingCount > 0 && (
            <span className="ml-2 text-sm font-sans bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">
              {pendingCount} pendientes
            </span>
          )}
        </h1>
        <div className="flex gap-2 text-sm">
          <button
            onClick={() => setFilter("pending")}
            className={`px-3 py-1.5 rounded-lg border ${filter === "pending" ? "bg-ink text-white border-ink" : "border-ink/15 text-ink/60"}`}
          >
            Pendientes
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg border ${filter === "all" ? "bg-ink text-white border-ink" : "border-ink/15 text-ink/60"}`}
          >
            Todas
          </button>
        </div>
      </div>
      <p className="text-sm text-ink/60 mb-6">
        Al aprobar se regalan 2 cambios más a esa publicación.
      </p>

      {err && <p className="text-red-600 text-sm mb-4">{err}</p>}

      <div className="space-y-4">
        {filtered.map((r) => (
          <div key={r.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-ink">
                  {r.invitationTitle}{" "}
                  <span
                    className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                      r.status === "pending"
                        ? "bg-amber-100 text-amber-800"
                        : r.status === "approved"
                          ? "bg-green-100 text-green-700"
                          : "bg-ink/10 text-ink/60"
                    }`}
                  >
                    {r.status === "pending" ? "pendiente" : r.status === "approved" ? "aprobada" : "rechazada"}
                  </span>
                </p>
                <p className="text-xs text-ink/50 mt-1">
                  {new Date(r.createdAt).toLocaleString("es-MX")} ·{" "}
                  <Link href={`/i/${r.slug}`} className="underline hover:text-gold-500">
                    ver invitación
                  </Link>
                </p>
              </div>
              {r.status === "pending" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => decide(r.id, "approved")}
                    disabled={acting === r.id}
                    className="btn-primary text-sm px-4 py-2 disabled:opacity-50"
                  >
                    {acting === r.id ? "…" : "Aprobar (+2)"}
                  </button>
                  <button
                    onClick={() => decide(r.id, "rejected")}
                    disabled={acting === r.id}
                    className="btn-outline text-sm px-4 py-2 disabled:opacity-50"
                  >
                    Rechazar
                  </button>
                </div>
              )}
            </div>
            <p className="text-sm text-ink/70 mt-3 bg-ink/5 rounded-lg px-3 py-2 whitespace-pre-wrap">
              “{r.motivo}”
            </p>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-ink/50 text-center py-10">
            {filter === "pending" ? "Sin solicitudes pendientes. 🎉" : "Aún no hay solicitudes."}
          </p>
        )}
      </div>
    </div>
  );
}
