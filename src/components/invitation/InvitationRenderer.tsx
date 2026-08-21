// ============================================================================
// INVITATION RENDERER - Renderiza el builderConfig (array de módulos) en orden.
// Componente de servidor: orquesta módulos (algunos client, otros estáticos).
// ============================================================================
import type { BuilderConfig, InvitationModule } from "@/lib/types";
import { Preloader } from "./Preloader";
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

function renderModule(module: InvitationModule, invitationId: string) {
  // Módulos no visibles se omiten (config del editor).
  if (!module.visible) return null;

  switch (module.type) {
    case "preloader":
      return <Preloader imageUrl={module.imageUrl} text={module.text} />;
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
      return <Quiz module={module} invitationId={invitationId} />;
    case "rsvp":
      return <RsvpForm module={module} invitationId={invitationId} />;
    default:
      return null;
  }
}

export function InvitationRenderer({
  config,
  invitationId,
}: {
  config: BuilderConfig;
  invitationId: string;
}) {
  // Aplica color temático global vía CSS variable.
  const themeStyle = {
    "--invify-primary": config.theme.primaryColor,
    background: config.theme.background,
  } as React.CSSProperties;

  return (
    <main style={themeStyle} className="min-h-screen">
      {config.modules.map((m) => (
        <div key={m.id}>{renderModule(m, invitationId)}</div>
      ))}
    </main>
  );
}
