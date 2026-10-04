// ============================================================================
// LOADER ANIMATION - Animaciones de la pantalla de carga de la invitación.
//
// Cada animación es una pieza SVG/CSS independiente que se repite en bucle con
// framer-motion. Todas leen el color del tema mediante la variable CSS
// --invify-primary, que InvitationRenderer define en el <main> padre, así que se
// adaptan solas al diseño de cada plantilla sin recibir props de color.
//
// No se usa Math.random() durante el render: el componente padre resuelve la
// animación en un useEffect para no romper la hidratación de React.
// ============================================================================
"use client";

import { useId } from "react";
import { motion } from "framer-motion";
import type { LoaderAnimationId } from "@/lib/loaderAnimations";

const PRIMARY = "var(--invify-primary, #C9A227)";
const INK = "var(--invify-ink, #1C1B19)";

/** Letras del monograma cuando no hay nada utilizable. */
const MONOGRAM_POR_DEFECTO = "I";

/** Dos iniciales: es la forma clásica y la que siempre se lee. */
const MAX_INICIALES = 2;

/** Un texto tan largo que no cabe como rotulo de una pantalla de carga. */
const MAX_LONGITUD_ROTULO = 40;

/**
 * ¿El texto es una frase y no un monograma?
 *
 * El módulo preloader guarda dos cosas distintas en `text`: lo que el autor
 * quiere ver al abrir (casi siempre "Ana & Luis") y, si no lo toca, la frase de
 * carga por defecto ("Cargando tu invitación..."). De una frase no sale un
 * monograma: con la de por defecto se pintaban las iniciales "CT", que es basura.
 *
 * El criterio es la puntuación de cierre, no la longitud: "D'Angelo & O'Brien"
 * son 19 caracteres y sí son unos nombres válidos, así que un tope de caracteres
 * los habría descartado y se habría quedado con la letra por defecto.
 */
function pareceFrase(texto: string | undefined | null): boolean {
  const t = String(texto ?? "").trim();
  if (!t) return false;
  if (/[.,;:!?…]$/.test(t)) return true;
  return t.length > MAX_LONGITUD_ROTULO;
}

/** Iniciales de un texto, o null si no hay letras aprovechables. */
function inicialesDeUno(texto: string | undefined | null): string | null {
  const palabras = String(texto ?? "")
    .split(/\s+/)
    .map((p) => p.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);
  if (!palabras.length) return null;
  const out = palabras
    .slice(0, MAX_INICIALES)
    .map((p) => [...p][0].toUpperCase())
    .join("");
  return out || null;
}

/**
 * Iniciales del monograma.
 *
 * 1. El texto del propio preloader manda: es lo que el autor escribió y lo que
 *    quiere ver al abrir.
 * 2. Si ese texto es una frase, se recurre a los nombres del módulo header.
 * 3. Si no hay nada aprovechable, la letra por defecto.
 */
function inicialesDe(
  preferido: string | undefined | null,
  alternativa?: string | undefined | null
): string {
  const pref = inicialesDeUno(preferido);
  if (pref && !pareceFrase(preferido)) return pref;
  return inicialesDeUno(alternativa) ?? MONOGRAM_POR_DEFECTO;
}

/** Caja de 160x160 donde se dibuja cada animación. */
function Stage({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-40 w-40 select-none" aria-hidden="true">
      {children}
    </div>
  );
}

// ---------------------------------------------------------------- envelope --
function Envelope() {
  return (
    <Stage>
      <motion.div
        className="absolute inset-0"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* carta que asoma */}
        <motion.div
          className="absolute left-1/2 top-6 w-24 h-28 -translate-x-1/2 rounded-sm bg-white shadow-lg"
          style={{ borderTop: `4px solid ${PRIMARY}` }}
          animate={{ y: [0, -26, -26, 0], opacity: [1, 1, 1, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, times: [0, 0.35, 0.8, 1], ease: "easeInOut" }}
        >
          <div className="mx-auto mt-4 h-1 w-10 rounded" style={{ background: PRIMARY, opacity: 0.5 }} />
          <div className="mx-auto mt-2 h-1 w-14 rounded" style={{ background: INK, opacity: 0.18 }} />
          <div className="mx-auto mt-2 h-1 w-10 rounded" style={{ background: INK, opacity: 0.18 }} />
        </motion.div>
        {/* sobre */}
        <div
          className="absolute bottom-6 left-1/2 h-24 w-32 -translate-x-1/2 rounded-sm"
          style={{ background: PRIMARY }}
        />
        <motion.div
          className="absolute bottom-6 left-1/2 h-24 w-32 -translate-x-1/2 origin-bottom"
          style={{ clipPath: "polygon(0 100%, 50% 0, 100% 100%)", background: INK, opacity: 0.18 }}
          animate={{ rotateX: [0, -168, -168, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, times: [0, 0.35, 0.8, 1], ease: "easeInOut" }}
        />
      </motion.div>
    </Stage>
  );
}

// ------------------------------------------------------------------- rings --
function Rings() {
  return (
    <Stage>
      {[0, 0.45, 0.9].map((delay, i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full border-2"
          style={{ borderColor: PRIMARY }}
          initial={{ scale: 0.35, opacity: 0.9 }}
          animate={{ scale: 1, opacity: 0 }}
          transition={{ duration: 2.1, repeat: Infinity, delay, ease: "easeOut" }}
        />
      ))}
      <motion.div
        className="absolute left-1/2 top-1/2 h-12 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px]"
        style={{ borderColor: PRIMARY }}
        animate={{ rotate: [0, 6, 0, -6, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute left-[62%] top-1/2 h-12 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px]"
        style={{ borderColor: PRIMARY, opacity: 0.85 }}
        animate={{ rotate: [0, -6, 0, 6, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-x-6 bottom-10 h-1 rounded-full"
        style={{ background: INK, opacity: 0.12 }}
        animate={{ scaleX: [0.2, 1, 0.2], opacity: [0.25, 0.12, 0.25] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />
    </Stage>
  );
}

// ------------------------------------------------------------------ hearts --
function Hearts() {
  return (
    <Stage>
      {[
        { x: -34, delay: 0, size: 16 },
        { x: 2, delay: 0.7, size: 22 },
        { x: 36, delay: 1.4, size: 14 },
      ].map((h, i) => (
        <motion.div
          key={i}
          className="absolute bottom-8"
          style={{ left: `calc(50% + ${h.x}px)`, width: h.size, height: h.size, color: PRIMARY }}
          initial={{ y: 0, opacity: 0, scale: 0.7 }}
          animate={{ y: -110, opacity: [0, 1, 1, 0], scale: [0.7, 1, 1, 0.85], rotate: [-8, 8] }}
          transition={{ duration: 2.6, repeat: Infinity, delay: h.delay, ease: "easeOut" }}
        >
          <svg viewBox="0 0 24 24" className="h-full w-full" fill="currentColor">
            <path d="M12 21s-7.5-4.7-9.6-9A5.4 5.4 0 0 1 12 6.6 5.4 5.4 0 0 1 21.6 12c-2.1 4.3-9.6 9-9.6 9z" />
          </svg>
        </motion.div>
      ))}
      <motion.div
        className="absolute bottom-8 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full"
        style={{ background: PRIMARY }}
        animate={{ scale: [1, 1.35, 1] }}
        transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
      />
    </Stage>
  );
}

// ------------------------------------------------------------------ petals --
function Petals() {
  return (
    <Stage>
      {Array.from({ length: 7 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute -top-4 h-4 w-2.5"
          style={{
            background: PRIMARY,
            opacity: 0.75,
            left: `${8 + i * 12}%`,
            borderRadius: "60% 40% 60% 40%",
          }}
          initial={{ y: -20, rotate: 0 }}
          animate={{ y: 190, x: [0, 18, -14, 0], rotate: [0, 220, 420] }}
          transition={{
            duration: 3.2,
            repeat: Infinity,
            delay: i * 0.42,
            ease: "linear",
          }}
        />
      ))}
    </Stage>
  );
}

// -------------------------------------------------------------------- seal --
/**
 * Sello de lacre: círculo que se traza a sí mismo y luego aparece el corazón.
 *
 * Antes eran tres anillos que se expandían con un disco dorado ya sólido en el
 * centro, que es más un "pulso" que un sello de lacre. Ahora el trazo se dibuja
 * con pathLength (stroke-dashoffset), que es lo que hace que parezca un sello
 * presionado, y el corazón entra solo cuando el círculo está cerrado.
 */
function Seal() {
  return (
    <Stage>
      <motion.svg viewBox="0 0 160 160" className="absolute inset-0 h-full w-full">
        {/* Anillo exterior: se dibuja de una pasada. */}
        <motion.circle
          cx="80"
          cy="80"
          r="58"
          fill="none"
          stroke={PRIMARY}
          strokeWidth="2.5"
          strokeLinecap="round"
          transform="rotate(-90 80 80)"
          initial={{ pathLength: 0, opacity: 0.4 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.6, repeat: Infinity, times: [0, 0.55, 0.85, 1], ease: "easeInOut" }}
        />
        {/* Anillo interior punteado, como el borde del lacre. */}
        <motion.circle
          cx="80"
          cy="80"
          r="48"
          fill="none"
          stroke={PRIMARY}
          strokeWidth="1"
          strokeDasharray="1 5"
          opacity="0.55"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.6, repeat: Infinity, times: [0, 0.6, 0.9, 1], ease: "easeInOut" }}
        />
        {/* Lacre relleno, que se insinúa mientras se dibuja el anillo. */}
        <motion.circle
          cx="80"
          cy="80"
          r="34"
          fill={PRIMARY}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 0.92, 1], opacity: [0, 0.16, 0.12] }}
          transition={{ duration: 1.6, repeat: Infinity, times: [0, 0.5, 1], ease: "easeOut" }}
          style={{ transformOrigin: "80px 80px" }}
        />
      </motion.svg>

      {/* El corazón asoma en el centro cuando el trazo ya está casi cerrado. */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.12, 1], opacity: [0, 1, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, times: [0, 0.5, 0.62, 1], ease: "backOut" }}
      >
        <svg viewBox="0 0 24 24" className="h-8 w-8" fill={PRIMARY}>
          <path d="M12 21s-7.5-4.7-9.6-9A5.4 5.4 0 0 1 12 6.6 5.4 5.4 0 0 1 21.6 12c-2.1 4.3-9.6 9-9.6 9z" />
        </svg>
      </motion.div>
    </Stage>
  );
}

// ---------------------------------------------------------------- monogram --
/**
 * Monograma: las iniciales se dibujan una a una, como con un pincel.
 *
 * El trazo se hace con un <clipPath> SVG cuyo <rect> crece de izquierda a
 * derecha, no con `clip-path: inset()` sobre el texto ni animando
 * `strokeDashoffset`. Motivo: `pathLength` solo existe en elementos de forma
 * (`path`, `circle`, ...), no en `<text>`, y `clip-path: inset()` aplicado a un
 * `<tspan>` se comporta de forma distinta según el navegador. Un <clipPath> con
 * un rectángulo animado es SVG estándar y funciona igual en todos.
 */
function Monogram({ iniciales }: { iniciales: string }) {
  const uid = useId();
  const clipId = `monograma-${uid}`;
  const letras = iniciales.split("");
  // Cada letra ocupa una porción del ancho y entra un poco después de la anterior.
  const anchoLetra = 100 / (letras.length + 0.6);
  const xLetra = (i: number) => 20 + i * (anchoLetra * 1.02);
  const inicioDe = (i: number) => 0.16 + i * 0.13;
  const finDe = (i: number) => inicioDe(i) + 0.16;

  return (
    <Stage>
      <svg viewBox="0 0 160 160" className="absolute inset-0 h-full w-full">
        <defs>
          <clipPath id={clipId}>
            {letras.map((_, i) => (
              <motion.rect
                key={i}
                x={xLetra(i) - 6}
                y="20"
                height="120"
                initial={{ width: 0 }}
                animate={{ width: anchoLetra * 1.35 }}
                transition={{
                  duration: 2.6,
                  repeat: Infinity,
                  times: [inicioDe(i), finDe(i), 0.88, 1],
                  ease: "easeOut",
                }}
              />
            ))}
          </clipPath>
        </defs>

        <motion.circle
          cx="80"
          cy="80"
          r="62"
          fill="none"
          stroke={PRIMARY}
          strokeWidth="2"
          initial={{ pathLength: 0, rotate: -90, opacity: 0 }}
          animate={{ pathLength: 1, rotate: 0, opacity: 1 }}
          transition={{ duration: 2.6, repeat: Infinity, times: [0, 0.35, 0.88, 1], ease: "easeInOut" }}
          style={{ originX: "80px", originY: "80px" }}
        />
        <motion.circle
          cx="80"
          cy="80"
          r="54"
          fill="none"
          stroke={PRIMARY}
          strokeWidth="1"
          strokeDasharray="1 6"
          opacity="0.5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2.6, repeat: Infinity, times: [0, 0.45, 0.88, 1], ease: "easeInOut" }}
        />

        <text
          x="80"
          y="80"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Georgia, serif"
          fontWeight="500"
          fontSize={letras.length > 2 ? 42 : 54}
          fill={PRIMARY}
          clipPath={`url(#${clipId})`}
        >
          {letras.map((letra, i) => (
            <tspan key={`${letra}-${i}`} x={xLetra(i)}>
              {letra}
            </tspan>
          ))}
        </text>
      </svg>
    </Stage>
  );
}

// ------------------------------------------------------------------ ribbon --
function Ribbon() {
  return (
    <Stage>
      <motion.div
        className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2"
        style={{ background: INK, opacity: 0.1 }}
        animate={{ scaleX: [0.3, 1, 0.3] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      />
      {[-1, 1].map((side) => (
        <motion.div
          key={side}
          className="absolute left-1/2 top-1/2 h-14 w-14"
          style={{
            translateX: side > 0 ? "0%" : "-100%",
            transformOrigin: side > 0 ? "left center" : "right center",
          }}
          animate={{ scaleX: [0.75, 1, 0.75], rotate: [0, side * 3, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg viewBox="0 0 60 60" className="h-full w-full">
            <path
              d="M30 30 L60 8 L60 52 Z M30 30 L0 8 L0 52 Z"
              fill={PRIMARY}
              opacity={side > 0 ? 0.95 : 0.75}
            />
          </svg>
        </motion.div>
      ))}
      <motion.div
        className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: PRIMARY, boxShadow: `0 4px 12px -2px ${PRIMARY}` }}
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      />
    </Stage>
  );
}

// ----------------------------------------------------------------- sparkle --
function Sparkle() {
  const dot = (x: string, y: string, size: number, delay: number) => (
    <motion.div
      key={`${x}-${y}`}
      className="absolute"
      style={{ left: x, top: y, width: size, height: size, color: PRIMARY }}
      initial={{ scale: 0, rotate: 0, opacity: 0 }}
      animate={{ scale: [0, 1, 0.4], rotate: [0, 90, 180], opacity: [0, 1, 0] }}
      transition={{ duration: 1.8, repeat: Infinity, delay, ease: "easeOut" }}
    >
      <svg viewBox="0 0 24 24" className="h-full w-full" fill="currentColor">
        <path d="M12 0l2.2 7.2L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-4.8z" />
      </svg>
    </motion.div>
  );
  return (
    <Stage>
      {dot("18%", "16%", 18, 0)}
      {dot("62%", "10%", 12, 0.35)}
      {dot("76%", "46%", 22, 0.6)}
      {dot("34%", "62%", 14, 0.85)}
      {dot("12%", "40%", 10, 1.1)}
      {dot("48%", "30%", 8, 1.3)}
      <motion.div
        className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border"
        style={{ borderColor: PRIMARY, opacity: 0.3 }}
        animate={{ scale: [0.6, 1], opacity: [0.4, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
      />
    </Stage>
  );
}

/**
 * Registro de animación -> componente.
 *
 * Todas reciben las mismas props para que añadir una animación sea una línea:
 * quien solo pinte decorativo puede ignorar `iniciales` y quien dibuje texto
 * (el monograma) las usa.
 */
const REGISTRY: Record<LoaderAnimationId, (p: { iniciales: string }) => JSX.Element> = {
  envelope: () => <Envelope />,
  rings: () => <Rings />,
  hearts: () => <Hearts />,
  petals: () => <Petals />,
  seal: () => <Seal />,
  monogram: ({ iniciales }) => <Monogram iniciales={iniciales} />,
  ribbon: () => <Ribbon />,
  sparkle: () => <Sparkle />,
};

export function LoaderAnimation({
  animation,
  /** Texto del módulo preloader, de donde salen las iniciales. */
  text,
  /** Nombres del evento, usados si el texto no sirve como monograma. */
  fallbackText,
}: {
  animation: LoaderAnimationId;
  text?: string;
  fallbackText?: string;
}) {
  const Animation = REGISTRY[animation] ?? REGISTRY.envelope;
  return <Animation iniciales={inicialesDe(text, fallbackText)} />;
}