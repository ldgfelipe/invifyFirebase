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
    default:
      return null;
  }
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
  // Aplica color temático global vía CSS variable.
  const themeStyle = {
    "--invify-primary": config.theme.primaryColor,
    background: config.theme.background,
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
          <div key={m.id}>{renderModule(m, invitationId, demo, features)}</div>
        ))}
      </ConditionalPreloader>
    </main>
  );
}
