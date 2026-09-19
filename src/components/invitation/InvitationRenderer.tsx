// ============================================================================
// INVITATION RENDERER - Renderiza el builderConfig (array de módulos) en orden.
// Componente de servidor: orquesta módulos (algunos client, otros estáticos).
// ============================================================================
import type { BuilderConfig, InvitationModule, PlanFeatures } from "@/lib/types";
import { isModuleAllowed, FREE_FEATURES } from "@/lib/plans";
import { ConditionalPreloader } from "./ConditionalPreloader";
import { Header } from "./Header";
import { Countdown } from "./Countdown";
import { AudioPlayer } from "./AudioPlayer";
import { Carousel } from "./Carousel";
import { LocationMap } from "./LocationMap";
import { Dresscode } from "./Dresscode";
import { Itinerary } from "./Itinerary";
import { GiftTable } from "./GiftTable";
import { Quiz } from "./Quiz";
import { RsvpForm } from "./Rsvp";
import { TextBlock } from "./TextBlock";

function renderModule(
  module: InvitationModule,
  invitationId: string,
  demo: boolean,
  features: PlanFeatures
) {
  // Módulos no visibles se omiten (config del editor).
  if (!module.visible) return null;

  // Módulos fuera del plan no se renderizan (RSVP/Quiz/Música).
  if (!demo && !isModuleAllowed(module.type, features)) return null;

  // El preloader se maneja en ConditionalPreloader, lo omitimos aquí
  if (module.type === "preloader") return null;

  switch (module.type) {
    case "header":
      return <Header module={module} />;
    case "countdown":
      return <Countdown targetDate={module.targetDate} label={module.label} />;
    case "audio":
      return <AudioPlayer src={module.src} autoplay={module.autoplay} />;
    case "carousel":
      return <Carousel images={module.images} />;
    case "location":
      return <LocationMap module={module} />;
    case "dresscode":
      return <Dresscode module={module} />;
    case "itinerary":
      return <Itinerary module={module} />;
    case "giftTable":
      return <GiftTable module={module} />;
    case "quiz":
      return <Quiz module={module} invitationId={invitationId} demo={demo} />;
    case "rsvp":
      return <RsvpForm module={module} invitationId={invitationId} demo={demo} />;
    case "text":
      return <TextBlock module={module as any} />;
    default:
      return null;
  }
}

function moduleWrapperStyle(m: InvitationModule): React.CSSProperties {
  const s = (m as any).style as import("@/lib/types").ModuleStyle | undefined;
  if (!s) return {};
  const style: React.CSSProperties = {};
  if (s.background) (style as any).background = s.background;
  if (s.backgroundImage) {
    const overlay = s.backgroundOverlay ? `linear-gradient(${s.backgroundOverlay}, ${s.backgroundOverlay}), ` : "";
    (style as any).backgroundImage = `${overlay}url(${s.backgroundImage})`;
    style.backgroundSize = "cover";
    style.backgroundPosition = "center";
  }
  if (s.textColor) style.color = s.textColor;
  if (s.padding) style.padding = s.padding;
  if (s.borderRadius) style.borderRadius = s.borderRadius;
  if (s.border) style.border = s.border;
  return style;
}

export function InvitationRenderer({
  config,
  invitationId,
  demo = false,
  tier = "free",
  features = FREE_FEATURES,
}: {
  config: BuilderConfig;
  invitationId: string;
  demo?: boolean;
  tier?: "free" | "premium";
  features?: PlanFeatures;
}) {
  // Aplica color temático global vía CSS variable + imagen de fondo global
  const themeStyle: React.CSSProperties = {
    "--invify-primary": config.theme.primaryColor,
    background: config.theme.background,
    ...(config.theme.backgroundImage
      ? {
          backgroundImage: config.theme.backgroundOverlay
            ? `linear-gradient(${config.theme.backgroundOverlay}, ${config.theme.backgroundOverlay}), url(${config.theme.backgroundImage})`
            : `url(${config.theme.backgroundImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }
      : {}),
    ...(config.theme.textColor ? { color: config.theme.textColor } : {}),
  } as React.CSSProperties;

  // Encuentra configuración del preloader para pasársela al ConditionalPreloader
  const preloaderModule = config.modules.find((m) => m.type === "preloader");

  return (
    <main style={themeStyle} className="min-h-screen">
      <ConditionalPreloader
        tier={tier}
        invitationId={invitationId}
        preloaderConfig={preloaderModule}
      >
        {config.modules.map((m) => (
          <div key={m.id} style={moduleWrapperStyle(m)}>
            {renderModule(m, invitationId, demo, features)}
          </div>
        ))}
      </ConditionalPreloader>
    </main>
  );
}
