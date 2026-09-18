"use client";

// ============================================================================
// ESTADÍSTICAS - Dashboard de la invitación para el cliente.
// Aperturas, total de invitados (suma pax), quiz, tabla de asistencia,
// compartir WhatsApp/email, exportar PDF (impresión) y reinicio de datos.
// ============================================================================
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/client";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  deleteDoc,
  writeBatch,
  updateDoc,
} from "firebase/firestore";
import type { Invitation, Rsvp, QuizResponse } from "@/lib/types";
import { getInvitationFeatures } from "@/lib/plans";
import { invitationUrlRuntime } from "@/lib/seo";
import { ShareMenu } from "@/components/invitation/ShareMenu";

export default function StatsPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [inv, setInv] = useState<Invitation | null>(null);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [quizzes, setQuizzes] = useState<QuizResponse[]>([]);
  const [resetting, setResetting] = useState(false);

  async function load() {
    if (!user || !id) return;
    const snap = await getDoc(doc(db, "invitations", id));
    if (!snap.exists()) return;
    setInv(snap.data() as Invitation);

    const rSnap = await getDocs(collection(db, "invitations", id, "rsvps"));
    setRsvps(rSnap.docs.map((d) => d.data() as Rsvp));

    const qSnap = await getDocs(collection(db, "invitations", id, "quizResponses"));
    setQuizzes(qSnap.docs.map((d) => d.data() as QuizResponse));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id]);

  const totalViews = inv?.stats.views ?? 0;
  const totalPax = rsvps.reduce((s, r) => s + r.personas, 0);
  const quizzesDone = quizzes.length;

  async function resetData() {
    if (!confirm("¿Reiniciar todos los datos de RSVP y quiz?")) return;
    setResetting(true);
    const batch = writeBatch(db);
    const rSnap = await getDocs(collection(db, "invitations", id, "rsvps"));
    rSnap.docs.forEach((d) => batch.delete(d.ref));
    const qSnap = await getDocs(collection(db, "invitations", id, "quizResponses"));
    qSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    await updateDoc(doc(db, "invitations", id), {
      "stats.views": 0,
      "stats.uniqueViews": 0,
    });
    await load();
    setResetting(false);
  }

  if (!inv) return <p className="text-ink/60">Cargando…</p>;

  if (!getInvitationFeatures(inv).stats) {
    return (
      <div className="card p-10 text-center max-w-lg mx-auto">
        <p className="text-4xl">📊</p>
        <h1 className="section-title mt-4">Estadísticas no disponibles</h1>
        <p className="text-ink/60 mt-2">
          Las estadísticas de vistas están incluidas en el plan Pro y Premium.
        </p>
        <Link href="/pricing" className="btn-primary mt-6 inline-block">
          Mejorar plan
        </Link>
        <div className="mt-4">
          <Link href="/dashboard" className="text-sm text-ink/60 hover:text-gold-500">
            ← Volver
          </Link>
        </div>
      </div>
    );
  }

  // URL runtime (donde se ejecuta) para compartir
  const url = invitationUrlRuntime(inv.slug);

  return (
    <div className="print-area">
      <Link href="/dashboard" className="text-sm text-ink/60 hover:text-gold-500">
        ← Volver
      </Link>
      <div className="flex flex-wrap items-center justify-between mt-4 mb-6 gap-3">
        <h1 className="section-title">{inv.title} · Estadísticas</h1>
        <div className="flex flex-wrap gap-2 items-center">
          <ShareMenu slug={inv.slug} title={inv.title} variant="inline" />
          <button onClick={() => window.print()} className="btn-outline text-sm px-3 py-2">
            Exportar PDF
          </button>
          <button onClick={resetData} disabled={resetting} className="btn-outline text-sm px-3 py-2 text-red-600">
            Reiniciar
          </button>
        </div>
      </div>
      <div className="mb-6 text-xs text-ink/50 break-all bg-ink/5 rounded-lg px-3 py-2">
        🔗 Enlace: <a href={url} target="_blank" rel="noopener noreferrer" className="text-gold-500 hover:underline">{url}</a>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Kpi label="Aperturas totales" value={totalViews} />
        <Kpi label="Invitados (pax)" value={totalPax} />
        <Kpi label="Confirmaciones" value={rsvps.length} />
        <Kpi label="Quiz completados" value={quizzesDone} />
      </div>

      {/* Tabla de asistencia */}
      <section className="card p-6 mb-8">
        <h2 className="font-serif text-xl text-ink mb-4">Tabla de asistencia</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink/60 border-b border-ink/10">
              <th className="py-2">Nombre</th>
              <th>Email</th>
              <th>Personas</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {rsvps.map((r, i) => (
              <tr key={i} className="border-b border-ink/5">
                <td className="py-2">{r.nombre}</td>
                <td>{r.email}</td>
                <td>{r.personas}</td>
                <td>{new Date(r.fecha).toLocaleDateString()}</td>
              </tr>
            ))}
            {rsvps.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-ink/50 text-center">
                  Aún no hay confirmaciones.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Respuestas de quiz */}
      <section className="card p-6">
        <h2 className="font-serif text-xl text-ink mb-4">Respuestas del quiz</h2>
        <div className="space-y-4">
          {quizzes.map((q, i) => (
            <div key={i} className="border-b border-ink/5 pb-3">
              <p className="text-xs text-ink/50">{new Date(q.fecha).toLocaleString()}</p>
              <ul className="text-sm mt-1">
                {Object.entries(q.datos).map(([k, v]) => (
                  <li key={k}>
                    <span className="text-ink/60">{k}:</span> {v}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {quizzes.length === 0 && (
            <p className="text-ink/50 text-center py-4">Sin respuestas aún.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-5">
      <p className="text-3xl font-serif text-gold-500">{value}</p>
      <p className="text-xs text-ink/60 mt-1">{label}</p>
    </div>
  );
}
