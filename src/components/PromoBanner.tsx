"use client";

// ============================================================================
// PromoBanner
// Banner bilingüe (ES/EN) editable desde /admin/settings. Se muestra en el
// inicio y/o en /pricing según `banner.pages`. Los textos _en sustituyen a los
// secretos cuando el usuario está en inglés; si faltan, se usa el texto ES.
// ============================================================================
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/provider";
import type { BannerPages, BannerVariant, PromoBanner } from "@/lib/types";

const VARIANT_STYLES: Record<BannerVariant, { wrap: string; badge: string; title: string; text: string; cta: string }> = {
  gold: {
    wrap: "bg-champagne border-y border-gold-500/25",
    badge: "bg-gold-500 text-white",
    title: "text-ink",
    text: "text-ink/70",
    cta: "btn-primary",
  },
  dark: {
    wrap: "bg-ink text-cream",
    badge: "bg-gold-500 text-ink",
    title: "text-cream",
    text: "text-cream/70",
    cta: "btn-primary",
  },
  light: {
    wrap: "bg-white border-y border-ink/10",
    badge: "bg-ink text-cream",
    title: "text-ink",
    text: "text-ink/70",
    cta: "btn-outline",
  },
  gradient: {
    wrap: "bg-gradient-to-r from-ink via-ink/90 to-[#3d3226] text-cream",
    badge: "bg-gold-500 text-ink",
    title: "text-cream",
    text: "text-cream/70",
    cta: "btn-primary",
  },
};

function pick(es: string | undefined, en: string | undefined, locale: "es" | "en"): string {
  if (locale === "en") return (en ?? "").trim() || (es ?? "").trim();
  return (es ?? "").trim() || (en ?? "").trim();
}

export function PromoBanner({ banner, page }: { banner?: PromoBanner; page: BannerPages }) {
  const { locale } = useLanguage();

  if (!banner?.enabled) return null;

  const target: BannerPages = banner.pages ?? "both";
  if (target !== "both" && target !== page) return null;

  const title = pick(banner.title, banner.title_en, locale);
  const text = pick(banner.text, banner.text_en, locale);
  const cta = pick(banner.cta, banner.cta_en, locale);
  const badge = pick(banner.badge, banner.badge_en, locale);
  const image = pick(banner.image, banner.image_en, locale);

  if (!title && !text) return null;

  const s = VARIANT_STYLES[banner.variant] ?? VARIANT_STYLES.gold;
  const href = banner.link || "/templates";

  return (
    <section className={`${s.wrap} px-6 py-10 md:py-12`} aria-label={title || "Promoción"}>
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            className="w-full md:w-56 h-40 md:h-32 object-cover rounded-xl shrink-0 border border-ink/10"
          />
        )}

        <div className="flex-1">
          {badge && (
            <span className={`inline-block text-xs font-medium px-3 py-1 rounded-full mb-3 ${s.badge}`}>
              {badge}
            </span>
          )}
          {title && <h2 className={`font-serif text-2xl md:text-3xl ${s.title}`}>{title}</h2>}
          {text && <p className={`mt-2 text-sm md:text-base ${s.text}`}>{text}</p>}
        </div>

        {cta && (
          <Link href={href} className={`${s.cta} shrink-0`}>
            {cta}
          </Link>
        )}
      </div>
    </section>
  );
}
