"use client";

// ============================================================================
// ESTADÍSTICAS - Dashboard de la invitación para el cliente.
// Aperturas, total de invitados (suma pax), quiz, tabla de asistencia,
// compartir WhatsApp/email, exportar CSV e imprimir, y reinicio de datos.
// ============================================================================
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/client";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  writeBatch,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
import type { Invitation, Rsvp, QuizResponse, QuizModule } from "@/lib/types";
import { getInvitationFeatures } from "@/lib/plans";
import { invitationUrlRuntime } from "@/lib/seo";
import { descargarCSV, nombreArchivoSeguro } from "@/lib/csv";
import { ShareMenu } from "@/components/invitation/ShareMenu";

export default function StatsPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [inv, setInv] = useState<Invitation | null>(null);
  const [denied, setDenied] = useState(false);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [quizzes, setQuizzes] = useState<QuizResponse[]>([]);
  const [resetting, setResetting] = useState(false);
  const [filtro, setFiltro] = useState("");

  // Realtime: suscripción en vivo a invitación + rsvps + quiz (websocket Firestore)
  useEffect(() => {
    if (!user || !id) return;
    const unsubs: Array<() => void> = [];

    // Invitación (views, título, etc) en vivo
    const invRef = doc(db, "invitations", id as string);
    unsubs.push(
      onSnapshot(
        invRef,
        (snap) => {
          if (!snap.exists()) {
            setDenied(true);
            return;
          }
          const data = snap.data() as Invitation;
          // Solo el dueño ve estas estadísticas (las reglas ya lo exigen).
          if (user && data.ownerUid !== user.uid) {
            setDenied(true);
            return;
          }
          setInv(data);
        },
        (err) => {
          console.warn("[stats] onSnapshot inv error", err);
          setDenied(true);
        }
      )
    );

    // RSVPs en vivo
    const rsvpsQ = collection(db, "invitations", id as string, "rsvps");
    unsubs.push(
      onSnapshot(
        rsvpsQ,
        (snap) => setRsvps(snap.docs.map((d) => d.data() as Rsvp)),
        (err) => console.warn("[stats] onSnapshot rsvps error", err)
      )
    );

    // Quiz en vivo
    const quizQ = collection(db, "invitations", id as string, "quizResponses");
    unsubs.push(
      onSnapshot(
        quizQ,
        (snap) => setQuizzes(snap.docs.map((d) => d.data() as QuizResponse)),
        (err) => console.warn("[stats] onSnapshot quiz error", err)
      )
    );

    return () => unsubs.forEach((u) => u());
  }, [user, id]);

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
    // onSnapshot actualizará automáticamente rsvps/quiz a vacío y views a 0
    setResetting(false);
  }

// ---- Derivados -------------------------------------------------------------
// Todo lo que usa hooks va ANTES de los return tempranos de abajo: un useMemo
// despues de un return condicional se ejecuta en un orden distinto en cada
// render y React revienta con "Rendered more hooks than during the previous
// render" en cuanto la invitación tarda un poco en llegar.

const quizModule = ((inv?.builderConfig?.modules ?? []).find((m) => m.type === "quiz") as
  | QuizModule
  | undefined);

/**
 * Las respuestas se guardan indexadas por el id de la pregunta ("q1"), no por
 * su texto: es lo que evita duplicar la pregunta en cada respuesta. Al
 * mostrarlas hay que traducir el id con la pregunta del modulo, o el cliente
 * lee "q1: Universidad" sin entender a que corresponde.
 */
const textoDePregunta = useMemo(() => {
  const mapa = new Map<string, string>();
  for (const q of quizModule?.questions ?? []) mapa.set(q.id, q.question);
  return (id: string) => mapa.get(id) ?? id;
}, [quizModule]);

// Filtro de la lista de invitados: con 200 confirmaciones hay que poder
// encontrar a una persona concreta sin recorrer la tabla a ojo.
const rsvpsFiltrados = useMemo(() => {
  const q = filtro.trim().toLowerCase();
  if (!q) return rsvps;
  return rsvps.filter((r) =>
    [r.nombre, r.email, String(r.personas)].some((v) => v?.toLowerCase().includes(q))
  );
}, [rsvps, filtro]);

if (!inv && !denied) return <p className="text-ink/60">Cargando…</p>;
if (denied || !inv) {
  return (
    <div className="card p-10 text-center max-w-lg mx-auto">
      <h1 className="section-title mt-4">Sin acceso</h1>
      <p className="text-ink/60 mt-2">Esta invitación no existe o no es tuya.</p>
      <Link href="/dashboard" className="btn-primary mt-6 inline-block">
        Volver
      </Link>
    </div>
  );
}

const features = getInvitationFeatures(inv);
const totalViews = inv.stats?.views ?? 0;
const uniqueViews = inv.stats?.uniqueViews ?? 0;
const totalPax = features.rsvp ? rsvps.reduce((s, r) => s + r.personas, 0) : 0;
const quizzesDone = features.quiz ? quizzes.length : 0;

// Conteo por pregunta: opción → votos (las claves de datos son los ids).
const quizTally = (quizModule?.questions ?? []).map((q) => {
  const counts = new Map<string, number>();
  for (const sub of quizzes) {
    const ans = sub.datos?.[q.id];
    if (typeof ans === "string" && ans) counts.set(ans, (counts.get(ans) ?? 0) + 1);
  }
  const total = [...counts.values()].reduce((s, n) => s + n, 0);
  return { question: q, counts, total };
});

const baseArchivo = nombreArchivoSeguro(`${inv.title}-invitados`);

// Se declaran como constantes y no como `function`: una declaracion de funcion
// se izga, asi que TypeScript no le aplica el estrechamiento de `inv` que hacen
// los return tempranos de arriba, y `inv.title` deja de narrowing.
const exportarRsvp = () => {
  descargarCSV(baseArchivo, [
    ["Nombre", "Email", "Personas", "Fecha"],
    ...rsvps.map((r) => [
      r.nombre,
      r.email,
      r.personas,
      new Date(r.fecha).toLocaleString("es"),
    ]),
  ]);
};

const exportarQuiz = () => {
  const preguntas = quizModule?.questions ?? [];
  descargarCSV(nombreArchivoSeguro(`${inv.title}-quiz`), [
    ["Fecha", ...preguntas.map((q) => q.question)],
    ...quizzes.map((r) => [
      new Date(r.fecha).toLocaleString("es"),
      ...preguntas.map((q) => r.datos?.[q.id] ?? ""),
    ]),
  ]);
};

  if (!features.stats) {
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
        <div className="flex items-center gap-3">
          <h1 className="section-title">{inv.title} · Estadísticas</h1>
          <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-green-50 border border-green-200 text-green-700">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> En vivo
          </span>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <ShareMenu slug={inv.slug} title={inv.title} variant="inline" />
          <button onClick={() => window.print()} className="btn-outline text-sm px-3 py-2">
            Imprimir
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <Kpi label="Aperturas totales" value={totalViews} />
        <Kpi label="Visitantes únicos" value={uniqueViews} />
        <Kpi label="Invitados (pax)" value={totalPax} />
        <Kpi label="Confirmaciones" value={rsvps.length} />
        <Kpi label="Quiz completados" value={quizzesDone} />
      </div>

      {/* Tabla de asistencia - solo Pro/Premium (features.rsvp) */}
      {features.rsvp ? (
        <section className="card p-6 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-serif text-xl text-ink">📋 Lista de invitados (RSVP)</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={exportarRsvp}
                disabled={rsvps.length === 0}
                className="btn-outline text-sm px-3 py-1.5 disabled:opacity-50"
                title="Descargar la lista completa en CSV para abrirla en Excel"
              >
                ⬇️ CSV
              </button>
              <button onClick={() => window.print()} className="btn-outline text-sm px-3 py-1.5">
                🖨️ Imprimir lista
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <p className="text-xs text-ink/50">
              Total pax: {totalPax} · Confirmaciones: {rsvps.length}
              {rsvpsFiltrados.length !== rsvps.length && ` · filtrando ${rsvpsFiltrados.length}`}
            </p>
            {rsvps.length > 8 && (
              <input
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                placeholder="Buscar por nombre o email…"
                className="input text-sm py-1.5 max-w-xs"
                aria-label="Buscar en la lista de invitados"
              />
            )}
          </div>

          <div className="overflow-x-auto">
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
                {rsvpsFiltrados.map((r, i) => (
                  <tr key={i} className="border-b border-ink/5">
                    <td className="py-2">{r.nombre}</td>
                    <td>{r.email || "—"}</td>
                    <td>{r.personas}</td>
                    <td>{new Date(r.fecha).toLocaleDateString("es")}</td>
                  </tr>
                ))}
                {rsvpsFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-ink/50 text-center">
                      {rsvps.length === 0 ? "Aún no hay confirmaciones." : "Sin coincidencias."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="card p-6 mb-8 border-dashed border-ink/20 bg-ink/5">
          <h2 className="font-serif text-lg text-ink/60">🔒 Lista de invitados bloqueada</h2>
          <p className="text-sm text-ink/50 mt-2">El plan <strong>Básico</strong> no incluye RSVP. Los módulos RSVP/Quiz/Música solo están en <strong>Pro</strong> y <strong>Premium</strong>.</p>
          <Link href="/pricing" className="btn-primary mt-4 inline-block text-sm">Ver planes Pro/Premium</Link>
        </section>
      )}

      {/* Respuestas de quiz - solo Pro/Premium (features.quiz) */}
      {features.quiz ? (
        <section className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-serif text-xl text-ink">❓ Resultados del Quiz</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={exportarQuiz}
                disabled={quizzes.length === 0}
                className="btn-outline text-sm px-3 py-1.5 disabled:opacity-50"
                title="Descargar las respuestas en CSV, con una columna por pregunta"
              >
                ⬇️ CSV
              </button>
              <button onClick={() => window.print()} className="btn-outline text-sm px-3 py-1.5">
                🖨️ Imprimir resultados
              </button>
            </div>
          </div>

          {/* Resumen por pregunta */}
          {quizTally.length > 0 && (
            <div className="space-y-5 mb-8">
              {quizTally.map(({ question, counts, total }) => (
                <div key={question.id}>
                  <p className="font-medium text-ink text-sm">{question.question}</p>
                  <p className="text-xs text-ink/50 mb-2">{total} respuesta(s)</p>
                  <div className="space-y-1.5">
                    {(question.options ?? []).map((opt) => {
                      const votes = counts.get(opt) ?? 0;
                      const pct = total > 0 ? Math.round((votes / total) * 100) : 0;
                      return (
                        <div key={opt} className="flex items-center gap-2 text-sm">
                          <span className="w-40 shrink-0 truncate text-ink/70">{opt}</span>
                          <div className="flex-1 h-2 rounded-full bg-ink/10 overflow-hidden">
                            <div className="h-full bg-gold-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-16 text-right text-xs text-ink/60">{votes} ({pct}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <h3 className="font-medium text-ink/70 text-sm mb-3">
            Respuestas individuales ({quizzes.length})
          </h3>
          <div className="space-y-4">
            {quizzes.map((q, i) => (
              <div key={i} className="border-b border-ink/5 pb-3">
                <p className="text-xs text-ink/50">{new Date(q.fecha).toLocaleString("es")}</p>
                <ul className="text-sm mt-1 space-y-0.5">
                  {Object.entries(q.datos).map(([k, v]) => (
                    <li key={k}>
                      <span className="text-ink/60">{textoDePregunta(k)}:</span> {v}
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
      ) : (
        <section className="card p-6 border-dashed border-ink/20 bg-ink/5">
          <h2 className="font-serif text-lg text-ink/60">🔒 Quiz bloqueado</h2>
          <p className="text-sm text-ink/50 mt-2">El plan <strong>Básico</strong> no incluye Quiz. Disponible en <strong>Pro</strong> y <strong>Premium</strong>.</p>
          <Link href="/pricing" className="btn-primary mt-4 inline-block text-sm">Ver planes Pro/Premium</Link>
        </section>
      )}
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
