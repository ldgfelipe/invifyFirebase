// ============================================================================
// CONDITIONAL PRELOADER - Pantalla de carga de la invitación.
//
// Antes era una cuenta atrás de 5 s. Ahora muestra una animación de la
// biblioteca de loaders (src/lib/loaderAnimations.ts): cada invitación pinta una
// distinta con los colores de su tema. Si la plantilla no fija animación, se
// elige una al azar en cada carga.
//
// El delay total no cambia (5 s en free), así que ni el consumo de datos ni el
// flujo de navegación se ven afectados.
// ============================================================================
"use client";

import { useEffect, useState } from "react";
import { LoaderAnimation } from "./LoaderAnimation";
import {
  normalizeLoaderAnimation,
  resolveLoaderAnimation,
  type LoaderAnimationId,
} from "@/lib/loaderAnimations";

interface ConditionalPreloaderProps {
  tier: "free" | "premium";
  invitationId: string;
  children: React.ReactNode;
  /** Nombres del evento ("Ana & Luis"), para el monograma del preloader. */
  eventNames?: string;
  preloaderConfig?: {
    imageUrl?: string;
    animation?: string;
    text?: string;
    adImageUrl?: string;
    adText?: string;
    adCtaText?: string;
    adCtaLink?: string;
  };
}

/** Segundos que dura el bloqueo en plan free (los mismos que antes). */
const FREE_DELAY_MS = 5000;

export function ConditionalPreloader({
  tier,
  invitationId,
  children,
  eventNames,
  preloaderConfig,
}: ConditionalPreloaderProps) {
  const [showContent, setShowContent] = useState(tier === "premium");

  // "random" se resuelve en un efecto y no durante el render: si se sorteara al
  // pintar, el HTML del servidor y el del cliente no coincidirían y React
  // marcaría error de hidratación.
  const [animation, setAnimation] = useState<LoaderAnimationId>("envelope");

  useEffect(() => {
    if (preloaderConfig?.animation) {
      setAnimation(resolveLoaderAnimation(preloaderConfig.animation));
    } else {
      setAnimation(resolveLoaderAnimation(normalizeLoaderAnimation(undefined)));
    }
  }, [preloaderConfig?.animation]);

  useEffect(() => {
    if (tier === "premium") {
      setShowContent(true);
      return;
    }
    // Free: mantiene la espera que ya tenían los usuarios, sin contador visible.
    const timer = setTimeout(() => setShowContent(true), FREE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [tier]);

  if (showContent) {
    return <>{children}</>;
  }

  // Preloader FREE con publicidad
  const adConfig = preloaderConfig?.adImageUrl
    ? {
        imageUrl: preloaderConfig.adImageUrl,
        text: preloaderConfig.adText ?? "Crea tu invitación gratis con Invify",
        ctaText: preloaderConfig.adCtaText ?? "Empezar gratis",
        ctaLink: preloaderConfig.adCtaLink ?? "/templates",
      }
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      <div className="max-w-md w-full mx-4 text-center p-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-invify.png" alt="Invify" className="mx-auto mb-2 h-10 w-auto object-contain" />

        <div className="flex justify-center">
          {/* El texto del preloader manda (ahí el autor pone lo que quiere ver al
              abrir), y los nombres del header son el respaldo cuando ese texto es
              una frase y no un monograma. */}
          <LoaderAnimation
            animation={animation}
            text={preloaderConfig?.text}
            fallbackText={eventNames}
          />
        </div>

        <p className="text-lg text-ink/70 mt-2">
          {preloaderConfig?.text ?? "Cargando tu invitación..."}
        </p>

        {/* Barra de progreso sin cifras: mantiene la sensación de avance que
            daba el contador, sin mostrar segundos que el usuario espera. */}
        <div
          className="mx-auto mt-6 h-1 w-40 overflow-hidden rounded-full bg-ink/10"
          role="progressbar"
          aria-label="Cargando"
          data-invitation={invitationId}
        >
          <div className="h-full rounded-full bg-gold-500 motion-safe:animate-shimmer" />
        </div>

        {/* Publicidad FREE tier */}
        {adConfig && (
          <div className="border-t border-ink/10 pt-6 mt-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={adConfig.imageUrl}
              alt="Invify"
              className="mx-auto mb-4 w-48 h-48 object-cover rounded-xl"
            />
            <p className="text-sm text-ink/60 mb-4">{adConfig.text}</p>
            <a
              href={adConfig.ctaLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-gold-500 text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-gold-600 transition"
            >
              {adConfig.ctaText}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}