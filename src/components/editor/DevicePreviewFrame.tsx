// ============================================================================
// DEVICE PREVIEW FRAME - Marco de dispositivo para la vista previa del editor.
//
// El canvas del editor antes era una tarjeta angosta con padding: no daba idea
// de cómo se vería la invitación en el móvil, que es donde se abre el 95% de las
// veces. Ahora el modo Móvil se muestra dentro de un iPhone y el modo
// Escritorio dentro de una ventana de navegador.
//
// POR QUÉ ESCALA CON transform Y NO CON width
// La invitación está maquetada para un ancho de móvil (~390px). Si el marco se
// encogiera con width, el contenido se re-maquetaría a un ancho distinto y la
// vista previa mentiría justo en lo que se quiere comprobar. Con
// `transform: scale` el contenido se.layouta siempre a 390x844 y luego se reduce
// o amplía como una foto: lo que ves es exactamente lo que verá el invitado.
//
// El alto del contenedor se reserva como ALTO * escala. Sin eso queda un hueco
// debajo del teléfono, porque el elemento escalado sigue ocupando su alto
// original en el flujo de layout.
// ============================================================================
"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Medidas lógicas del dispositivo simulado (iPhone 14/15). */
const MOVIL = { w: 390, h: 844 };
/** Medidas lógicas de la ventana de escritorio. */
const ESCRITORIO = { w: 1280, h: 800 };
/** Escala máxima: por encima de 1 el marco se vería borroso y sin sentido. */
const ESCALA_MAXIMA = 1;

export type DeviceMode = "mobile" | "desktop";

interface DevicePreviewFrameProps {
  mode: DeviceMode;
  children: ReactNode;
  /** Etiqueta opcional bajo el marco (p. ej. el nombre del módulo). */
  caption?: string;
  className?: string;
}

export function DevicePreviewFrame({
  mode,
  children,
  caption,
  className,
}: DevicePreviewFrameProps) {
  const zoneRef = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(1);

  const medidas = mode === "mobile" ? MOVIL : ESCRITORIO;

  useEffect(() => {
    const zona = zoneRef.current;
    if (!zona) return;

    const medir = () => {
      // Se deja un margen para que el marco no quede pegado al borde de la zona.
      const disponibleH = zona.clientHeight - 32;
      const disponibleW = zona.clientWidth - 32;
      if (disponibleH <= 0 || disponibleW <= 0) return;
      const s = Math.min(disponibleH / medidas.h, disponibleW / medidas.w, ESCALA_MAXIMA);
      setEscala(Math.max(s, 0.2));
    };

    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(zona);
    return () => ro.disconnect();
  }, [medidas.h, medidas.w]);

  const esMovil = mode === "mobile";

  return (
    <div ref={zoneRef} className={cn("flex flex-col items-center justify-center", className)}>
      <div style={{ height: medidas.h * escala }} className="flex items-start justify-center w-full">
        <div
          style={{
            width: medidas.w,
            height: medidas.h,
            transform: `scale(${escala})`,
            transformOrigin: "top center",
          }}
          className="shrink-0"
        >
          {esMovil ? <PhoneShell>{children}</PhoneShell> : <BrowserShell>{children}</BrowserShell>}
        </div>
      </div>
      {caption && <p className="mt-3 text-xs text-ink/50">{caption}</p>}
    </div>
  );
}

/** Marco del móvil: bisel oscuro, isla dinámica e indicador de inicio. */
function PhoneShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-full w-full rounded-[3rem] bg-gradient-to-b from-ink to-black p-[3px] shadow-2xl shadow-ink/30">
      {/* reflejo del borde */}
      <div className="pointer-events-none absolute inset-0 rounded-[3rem] ring-1 ring-white/10" />
      <div className="relative h-full w-full overflow-hidden rounded-[2.85rem] bg-white">
        {/* Isla dinámica */}
        <div className="absolute left-1/2 top-[10px] z-20 h-[26px] w-[92px] -translate-x-1/2 rounded-full bg-black" />
        {children}
        {/* Indicador de inicio */}
        <div className="pointer-events-none absolute bottom-[7px] left-1/2 z-20 h-[4px] w-[120px] -translate-x-1/2 rounded-full bg-ink/25" />
      </div>
    </div>
  );
}

/** Marco de escritorio: barra de título con los tres puntos. */
function BrowserShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl bg-ink/80 shadow-2xl shadow-ink/25">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-white/10 bg-ink/70 px-4">
        <span className="h-3 w-3 rounded-full bg-red-400/80" />
        <span className="h-3 w-3 rounded-full bg-amber-400/80" />
        <span className="h-3 w-3 rounded-full bg-green-400/80" />
        <div className="ml-3 flex h-6 flex-1 items-center rounded-md bg-black/30 px-3 text-[11px] text-white/50">
          tu-invitacion/invify
        </div>
      </div>
      <div className="relative min-h-0 flex-1 bg-white">{children}</div>
    </div>
  );
}

/**
 * Contenedor de scroll para el contenido del marco.
 *
 * Es un iframe lo único que daría un viewport independiente real, pero la
 * invitación se está maquetando en el mismo documento (React state compartido con
 * el editor), así que un iframe obligaría a duplicar el estado y a postMessage
 * para cada edición. Un overflow-y-auto con la barra oculta replica el gesto sin
 * esa complejidad.
 */
export function DeviceScrollArea({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        // Oculta la barra en WebKit/Blink y en Firefox.
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        "h-full overflow-y-auto overscroll-contain",
        className
      )}
    >
      {children}
    </div>
  );
}