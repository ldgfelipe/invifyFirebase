// ============================================================================
// SITE FOOTER - Punto de entrada del pie de página.
//
// El marcado vive en SiteFooterView.tsx porque necesita ser cliente (usa
// usePathname para ocultarse en /i/[slug]), mientras que las páginas del CMS se
// leen con el Admin SDK, que solo funciona en el servidor. Este archivo es el
// puente: recibe los datos ya cargados por el layout raíz y se los pasa.
// ============================================================================
import { SiteFooterView, type FooterPage } from "./SiteFooterView";

export function SiteFooter({ pages = [] }: { pages?: FooterPage[] }) {
  return <SiteFooterView pages={pages} />;
}