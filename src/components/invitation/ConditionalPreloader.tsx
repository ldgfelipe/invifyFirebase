"use client";

import { useEffect, useState } from "react";

interface ConditionalPreloaderProps {
  tier: "free" | "premium";
  invitationId: string;
  children: React.ReactNode;
  preloaderConfig?: {
    imageUrl?: string;
    text?: string;
    adImageUrl?: string;
    adText?: string;
    adCtaText?: string;
    adCtaLink?: string;
  };
}

export function ConditionalPreloader({
  tier,
  invitationId,
  children,
  preloaderConfig,
}: ConditionalPreloaderProps) {
  const [showContent, setShowContent] = useState(tier === "premium");
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (tier === "premium") {
      setShowContent(true);
      return;
    }

    // Free tier: mostrar preloader 5 segundos
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          setShowContent(true);
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
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
        {/* Preloader visual existente */}
        {preloaderConfig?.imageUrl && (
          <img
            src={preloaderConfig.imageUrl}
            alt={preloaderConfig.text ?? "Cargando..."}
            className="mx-auto mb-6 w-32 h-32 object-cover rounded-xl"
          />
        )}

        <p className="text-lg text-ink/70 mb-6">
          {preloaderConfig?.text ?? "Cargando tu invitación..."}
        </p>

        {/* Cuenta regresiva */}
        <div className="mb-8">
          <div className="text-4xl font-serif text-gold-500 mb-2">
            {countdown}s
          </div>
          <div className="h-1 bg-ink/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gold-500 transition-all duration-1000 ease-linear"
              style={{ width: `${(countdown / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* Publicidad FREE tier */}
        {adConfig && (
          <div className="border-t border-ink/10 pt-6">
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