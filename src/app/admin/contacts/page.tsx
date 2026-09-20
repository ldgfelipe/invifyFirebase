"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/client";
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";

type Contact = {
  id: string;
  nombre: string;
  email: string;
  telefono?: string | null;
  mensaje: string;
  createdAt: number;
  status: "new" | "read" | "replied";
};

export default function AdminContactsPage() {
  const { user, profile } = useAuth();
  const [items, setItems] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "new" | "read">("all");

  async function load() {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const colRef = collection(db, "contacts");
      const q = query(colRef, orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setItems(snap.docs.map((d) => d.data() as Contact));
    } catch (e) {
      console.error("[contacts] error loading", e);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (user) load();
  }, [user]);

  async function mark(id: string, status: Contact["status"]) {
    try {
      await updateDoc(doc(db, "contacts", id), { status });
      setItems((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    } catch (e) {
      console.error("[contacts] error marking", e);
    }
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar mensaje?")) return;
    try {
      await deleteDoc(doc(db, "contacts", id));
      setItems((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      console.error("[contacts] error removing", e);
    }
  }

  const filtered = items.filter((c) => (filter === "all" ? true : c.status === filter));

  if (loading) return <p className="text-ink/60">Cargando contactos…</p>;

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="section-title">Contactos</h1>
        <span className="text-sm text-ink/60">
          {filtered.length} mensajes ·
          {items.filter((c) => c.status === "new").length} nuevos
        </span>
      </div>

      <div className="flex gap-2 mb-4">
        {(["all", "new", "read"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`text-xs px-3 py-1 rounded-full border capitalize ${filter === f ? "bg-gold-500 text-white border-gold-500" : "bg-white border-ink/10"}`}>
            {f === "all" ? "Todos" : f === "new" ? "Nuevos" : "Leídos"} ({f === "all" ? items.length : items.filter((c) => c.status === f).length})
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((c) => (
          <div key={c.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-ink">
                  {c.nombre} <span className="text-ink/50 font-normal">· {c.email}</span>
                  {c.telefono && <span className="text-ink/50"> · {c.telefono}</span>}
                </p>
                <p className="text-xs text-ink/40">{new Date(c.createdAt).toLocaleString()} · {c.status}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${c.status === "new" ? "bg-amber-100 text-amber-700" : "bg-ink/10 text-ink/60"}`}>{c.status}</span>
            </div>
            <p className="text-sm text-ink/80 mt-3 whitespace-pre-wrap bg-ink/5 rounded-lg p-3">{c.mensaje}</p>
            <div className="flex gap-2 mt-3">
              <a href={`mailto:${c.email}?subject=Re: Contacto Invify`} className="btn-outline text-xs px-3 py-1">
                Responder
              </a>
              {c.status === "new" && (
                <button onClick={() => mark(c.id, "read")} className="btn-outline text-xs px-3 py-1">
                  Marcar leído
                </button>
              )}
              {c.status === "read" && (
                <button onClick={() => mark(c.id, "new")} className="btn-outline text-xs px-3 py-1">
                  Marcar nuevo
                </button>
              )}
              <button onClick={() => remove(c.id)} className="btn-outline text-xs px-3 py-1 text-red-600">
                Eliminar
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-ink/50 py-12">Sin mensajes en este filtro.</p>}
      </div>
    </div>
  );
}
