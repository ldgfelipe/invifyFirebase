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

import { motion } from "framer-motion";
import type { LoaderAnimationId } from "@/lib/loaderAnimations";

const PRIMARY = "var(--invify-primary, #C9A227)";
const INK = "var(--invify-ink, #1C1B19)";

/** Inicial que se dibuja en el monograma. */
const MONOGRAM = "I";

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
function Seal() {
  return (
    <Stage>
      {[0, 0.5, 1].map((delay, i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full border"
          style={{ borderColor: PRIMARY }}
          initial={{ scale: 0.5, opacity: 0.55 }}
          animate={{ scale: 1.05, opacity: 0 }}
          transition={{ duration: 2, repeat: Infinity, delay, ease: "easeOut" }}
        />
      ))}
      <motion.div
        className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
        style={{
          background: PRIMARY,
          boxShadow: `0 8px 24px -6px ${PRIMARY}`,
        }}
        animate={{ scale: [1, 0.9, 1], rotate: [0, -4, 4, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg viewBox="0 0 24 24" className="h-9 w-9 text-white" fill="currentColor">
          <path d="M12 21s-7.5-4.7-9.6-9A5.4 5.4 0 0 1 12 6.6 5.4 5.4 0 0 1 21.6 12c-2.1 4.3-9.6 9-9.6 9z" />
        </svg>
      </motion.div>
    </Stage>
  );
}

// ---------------------------------------------------------------- monogram --
function Monogram() {
  return (
    <Stage>
      <motion.svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full">
        <motion.circle
          cx="60"
          cy="60"
          r="46"
          fill="none"
          stroke={PRIMARY}
          strokeWidth="2"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.8, repeat: Infinity, times: [0, 0.7, 1], ease: "easeInOut" }}
        />
        <motion.circle
          cx="60"
          cy="60"
          r="38"
          fill="none"
          stroke={PRIMARY}
          strokeWidth="1"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.6 }}
          transition={{ duration: 1.8, repeat: Infinity, times: [0, 0.7, 1], ease: "easeInOut" }}
        />
        <motion.text
          x="60"
          y="60"
          textAnchor="middle"
          dominantBaseline="central"
          fill={PRIMARY}
          fontSize="40"
          fontFamily="Georgia, serif"
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.8, repeat: Infinity, times: [0, 0.45, 1], ease: "easeOut" }}
          style={{ transformOrigin: "60px 60px" }}
        >
          {MONOGRAM}
        </motion.text>
      </motion.svg>
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

const REGISTRY: Record<LoaderAnimationId, () => JSX.Element> = {
  envelope: Envelope,
  rings: Rings,
  hearts: Hearts,
  petals: Petals,
  seal: Seal,
  monogram: Monogram,
  ribbon: Ribbon,
  sparkle: Sparkle,
};

export function LoaderAnimation({ animation }: { animation: LoaderAnimationId }) {
  const Animation = REGISTRY[animation] ?? Envelope;
  return <Animation />;
}