"use client";

// ============================================================================
// EDITOR CANVAS - Vista previa en vivo del editor.
//
// El contenido se maquetaba siempre a un ancho estrecho dentro de una tarjeta
// blanca, sin ninguna referencia de dispositivo. Ahora va dentro de
// DevicePreviewFrame, que lo muestra dentro de un iPhone o de una ventana de
// escritorio.
//
// El renderer mantiene el estado del tema en --invify-primary dentro de su <main>,
// así que las animaciones del preloader que se ven en el panel lateral usan
// exactamente los mismos colores que se verán en la invitación publicada.
// ============================================================================
import { InvitationRenderer } from "@/components/invitation/InvitationRenderer";
import {
  DevicePreviewFrame,
  DeviceScrollArea,
  type DeviceMode,
} from "@/components/editor/DevicePreviewFrame";
import type { BuilderConfig } from "@/lib/types";

interface EditorCanvasProps {
  config: BuilderConfig;
  selectedId: string | null;
  device: DeviceMode;
}

export function EditorCanvas({ config, selectedId, device }: EditorCanvasProps) {
  return (
    <DevicePreviewFrame
      mode={device}
      className="h-full w-full"
      caption={
        device === "mobile"
          ? "390 × 844 px · como lo ve el invitado en su móvil"
          : "1280 × 800 px"
      }
    >
      <DeviceScrollArea>
        <div className="pointer-events-none select-none">
          <InvitationRenderer config={config} invitationId="editor-preview" demo />
        </div>
      </DeviceScrollArea>
    </DevicePreviewFrame>
  );
}