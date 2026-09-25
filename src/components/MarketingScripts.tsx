// ============================================================================
// MarketingScripts
// Carga los scripts de marketing que el admin define en /site/config:
//   - Google Tag Manager (gtmId)
//   - Meta Pixel (metaPixelId)
//   - Scripts libres en <head> y antes de </body>
//
// Es un Server Component: lee la config una vez y la sirve como HTML, que es lo
// correcto para GTM/pixels (deben existir antes de que corra la página).
// Se regenera con revalidate = 300, igual que las páginas.
//
// Nota de seguridad: /site/config solo lo puede escribir un admin
// (firestore.rules → allow write: if isAdmin()), por eso es aceptable que
// estos campos se inyecten como HTML. No poner aquí claves ni secretos: eso
// vive en variables de entorno o en colecciones de servidor.
import { getSiteSettings } from "@/lib/site";

const isValidGtmId = (v: unknown): v is string =>
  typeof v === "string" && /^GTM-[A-Z0-9]{4,10}$/i.test(v.trim());

const isValidPixelId = (v: unknown): v is string =>
  typeof v === "string" && /^\d{8,20}$/.test(v.trim());

/** Descarta valores que no sean un ID plausible, para no romper el layout. */
function safe(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

export async function MarketingHead() {
  let settings: Awaited<ReturnType<typeof getSiteSettings>> | null = null;
  try {
    settings = await getSiteSettings();
  } catch {
    settings = null;
  }

  const gtmId = isValidGtmId(settings?.gtmId) ? settings.gtmId.trim() : "";
  const pixelId = isValidPixelId(settings?.metaPixelId) ? settings.metaPixelId.trim() : "";
  const custom = safe(settings?.customHeadScripts);

  return (
    <>
      {gtmId && (
        <>
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`,
            }}
          />
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        </>
      )}

      {pixelId && (
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${pixelId}');fbq('track','PageView');`,
          }}
        />
      )}

      {custom && <div dangerouslySetInnerHTML={{ __html: custom }} />}
    </>
  );
}

/** Scripts que deben correr al final del body. */
export async function MarketingBody() {
  let custom = "";
  try {
    const settings = await getSiteSettings();
    custom = safe(settings.customBodyScripts);
  } catch {
    custom = "";
  }
  if (!custom) return null;
  return <div dangerouslySetInnerHTML={{ __html: custom }} />;
}
