"use client";

// ============================================================================
// MIS INVITACIONES - Lista las invitaciones del usuario (ownerUid).
// ============================================================================
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
} from "firebase/firestore";
import type { Invitation } from "@/lib/types";
import { invitationUrl } from "@/lib/seo";

export default function MyInvitationsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const q = query(
        collection(db, "invitations"),
        where("ownerUid", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      setItems(snap.docs.map((d) => d.data() as Invitation));
      setLoading(false);
    })();
  }, [user]);

  async function togglePublish(inv: Invitation) {
    const next = inv.status === "published" ? "draft" : "published";
    await updateDoc(doc(db, "invitations", inv.id), { status: next });
    setItems((prev) =>
      prev.map((i) => (i.id === inv.id ? { ...i, status: next } : i))
    );
  }

  function share(inv: Invitation) {
    navigator.clipboard.writeText(invitationUrl(inv.slug));
    setCopied(inv.id);
    setTimeout(() => setCopied(null), 2000);
  }

  if (loading) return <p className="text-ink/60">Cargando…</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="section-title">Mis invitaciones</h1>
        <Link href="/templates" className="btn-primary">
          Crear nueva
        </Link>
      </div>

      {items.length === 0 && (
        <div className="card p-10 text-center">
          <p className="text-ink/60 mb-4">
            Aún no tienes invitaciones. Elige una plantilla para empezar.
          </p>
          <Link href="/templates" className="btn-outline">
            Ver catálogo
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {items.map((inv) => (
          <div key={inv.id} className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-serif text-xl text-ink">{inv.title}</h3>
                <p className="text-sm text-ink/60">/i/{inv.slug}</p>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  inv.status === "published"
                    ? "bg-green-100 text-green-700"
                    : "bg-ink/10 text-ink/60"
                }`}
              >
                {inv.status === "published" ? "Publicada" : "Borrador"}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              <button onClick={() => togglePublish(inv)} className="btn-outline text-sm px-3 py-2">
                {inv.status === "published" ? "Despublicar" : "Publicar"}
              </button>
              <Link href={`/dashboard/invitations/${inv.id}`} className="btn-outline text-sm px-3 py-2">
                Personalizar
              </Link>
              <Link href={`/dashboard/invitations/${inv.id}/stats`} className="btn-outline text-sm px-3 py-2">
                Estadísticas
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
