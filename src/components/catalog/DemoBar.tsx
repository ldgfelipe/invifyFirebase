// ============================================================================
// DEMO BAR (cliente) - Barra flotante del demo de plantilla, ES/EN.
// ============================================================================
"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n/provider";

export function DemoBar({ templateId, templateName }: { templateId: string; templateName: string }) {
  const { t } = useLanguage();
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[min(92vw,480px)]">
      <div className="card p-4 flex items-center justify-between gap-3 shadow-xl">
        <div className="min-w-0">
          <p className="font-serif text-lg text-ink leading-tight truncate">
            {templateName}
          </p>
          <p className="text-xs text-ink/60">{t.catalog.preview}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href={`/pricing?template=${templateId}`} className="btn-primary text-sm">
            {t.catalog.choose}
          </Link>
        </div>
      </div>
    </div>
  );
}
