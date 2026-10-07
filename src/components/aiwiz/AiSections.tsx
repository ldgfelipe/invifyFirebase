// ============================================================================
// AI SECTIONS - Agrupa los dos bloques del asistente de IA de la landing.
//
// Existe solo por el `open` del wizard. Antes cada botón gestionaba el suyo y
// el de AIPromo intentaba abrirlo con `window.dispatchEvent(new Event("ai:open"))`
// que NO escuchaba nadie en toda la aplicación: ese botón no hacía nada. El de
// AiCta sí funcionaba porque montaba su propio <AiWizard>.
//
// Con el estado aquí arriba hay una sola instancia del wizard y los dos botones
// abren exactamente la misma cosa. Adiós al evento global, que además era un
// acoplamiento invisible: si alguien renombraba la cadena, el botón se quedaba
// muerto sin que nada fallara en la consola.
// ============================================================================
"use client";

import { useState } from "react";
import { AiCta } from "./AiCta";
import { AIPromo } from "./AIPromo";
import { AiWizard } from "./AiWizard";

export function AiSections({
  previewUrl,
  previewName,
}: {
  previewUrl?: string;
  previewName?: string;
}) {
  const [open, setOpen] = useState(false);
  const abrir = () => setOpen(true);
  const cerrar = () => setOpen(false);

  return (
    <>
      <AiCta onOpen={abrir} />
      <AIPromo previewUrl={previewUrl} previewName={previewName} onOpen={abrir} />
      <AiWizard open={open} onClose={cerrar} />
    </>
  );
}