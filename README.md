# Invify · Plataforma SaaS de invitaciones digitales interactivas

Migración de un plugin de WordPress a una app moderna **Next.js (App Router) + Firebase**.
Onboarding en 3 clics, SEO-friendly (SSR/SSG, Open Graph, sitemap, Event schema) y
diseño premium (dorado `#D4AF37`, serif Playfair).

## Stack

- **Frontend:** Next.js 14 (App Router, SSR/SSG) + TypeScript + TailwindCSS
- **Auth:** Firebase Authentication (email/pass + Google), roles `cliente`/`admin`
- **DB:** Cloud Firestore
- **Storage:** Firebase Storage
- **Hosting:** Firebase Hosting + Functions / Cloud Run (Next standalone)
- **Pagos:** Stripe Checkout (webhook para confirmación)
- **Analytics:** contadores Firestore + Firebase Analytics

## Estructura del proyecto

```
src/
├─ app/
│  ├─ layout.tsx                # Root layout + fuentes + AuthProvider
│  ├─ page.tsx                  # Home (hero + categorías + destacados)
│  ├─ globals.css               # Estilos premium + utilidades
│  ├─ sitemap.ts / robots.ts    # SEO transversal
│  ├─ not-found.tsx
│  ├─ templates/
│  │  ├─ page.tsx               # Catálogo indexable
│  │  └─ [category]/page.tsx    # Landing por categoría (SEO)
│  ├─ i/[slug]/page.tsx         # Vista pública SSR + OG + Event schema
│  ├─ pricing/page.tsx          # Planes + Auth Wall + Stripe
│  ├─ dashboard/                # Área cliente (protegida)
│  │  ├─ layout.tsx             # Guard de sesión
│  │  ├─ page.tsx               # Mis invitaciones
│  │  └─ invitations/[id]/
│  │     ├─ page.tsx            # Editor (título, color, slug)
│  │     └─ stats/page.tsx      # Estadísticas + compartir + PDF + reset
│  └─ api/
│     ├─ stripe/checkout        # Crea sesión de pago (JWT)
│     ├─ stripe/webhook         # Confirma pago y clona plantilla -> invitación
│     ├─ rsvp / quiz / view     # Formularios públicos + contadores
├─ components/
│  ├─ invitation/               # Módulos: Preloader, Header, Countdown, Audio,
│  │                            #   Carousel, Location, Dresscode, Itinerary,
│  │                            #   GiftTable, Quiz, RSVP, ViewCounter, Renderer
│  ├─ auth/AuthWall.tsx
│  ├─ catalog/TemplateCard.tsx
│  └─ pricing/PricingFlow.tsx
├─ lib/
│  ├─ types.ts                  # MODELOS DE DATOS (Firestore + builderConfig)
│  ├─ firebase/{client,admin}.ts
│  ├─ firestore.ts / catalog.ts # Helpers servidor (Admin SDK)
│  ├─ stripe.ts / slug.ts / seo.ts / rateLimit.ts / cn.ts
└─ context/AuthContext.tsx
```

## Modelo de datos (Firestore)

- **/templates** `id, name, category, thumbnailUrl, previewUrl, builderConfig, active`
- **/users** `uid, email, displayName, role, createdAt`
- **/invitations** `id, ownerUid, templateId, title, slug, themeColor, status, createdAt, orderId, builderConfig, stats{views,uniqueViews}, meta?`
  - **/invitations/{id}/rsvps** `nombre, email, personas, fecha, createdAt`
  - **/invitations/{id}/quizResponses** `fecha, datos{}, createdAt`
- **/plans** `id, name, price, currency, features[], stripePriceId`
- **/orders** `id, uid, planId, invitationId, status, stripeSessionId, createdAt`
- **/rateLimits/{bucket}/hits** usado para rate-limit de formularios

`builderConfig` es un array ordenado de módulos (unión discriminada por `type`).
Ver `src/lib/types.ts`.

## Seguridad

- Reglas en `firestore.rules`: negar por defecto; el cliente **nunca** lee
  colecciones completas. Lectura pública de invitaciones solo si `status=published`.
- Escritura de `rsvps`/`quizResponses` anónima pero **validada** (tipos, tamaños,
  rangos) y con **rate-limit** (Firestore, ventana 10 min / 10 envíos por IP).
- Ownership estricto: solo el dueño (o admin) edita/elimina sus invitaciones.
- Slugs únicos garantizados por índice + generación en el webhook.

## Flujo de pago (Stripe)

1. El cliente elige plantilla → `/pricing?template=ID` (Auth Wall si no hay sesión).
2. Elige plan → `POST /api/stripe/checkout` (JWT Firebase) crea `Order(pending)`
   y una Checkout Session con `metadata {orderId,uid,templateId}`.
3. Stripe redirige al webhook `POST /api/stripe/webhook` (firma verificada).
4. Al `checkout.session.completed`: `Order → paid`, se **clona la plantilla**
   en una invitación nueva `status=draft` con **slug único** para el usuario.

## Puesta en marcha

```bash
cp .env.local.example .env.local   # completa credenciales Firebase + Stripe
npm install
npm run dev                        # http://localhost:3000
```

### Paso previo en la consola de Firebase
1. **Firestore** → Create database (modo Native).
2. **Authentication** → habilitar Email/Password y Google (configura OAuth consent).
3. **Storage** → ya disponible con la cuenta Blaze.
4. Desplegar reglas e índices: `firebase deploy --only firestore:rules,firestore:indexes,storage`.

### Despliegue en Cloud Functions (2ª gen) + Firebase Hosting

Usa el backend de **Firebase Frameworks**: `firebase.json` declara
`hosting.source` + `frameworksBackend`, y al desplegar solo hosting, Firebase
detecta Next.js, compila y crea una **Cloud Function 2ª gen** (`ssr-<site>`) con
el rewrite automático. **No necesitas gcloud** — solo la CLI de Firebase.

```bash
# 1) Reglas e índices
firebase deploy --only firestore:rules,firestore:indexes,storage

# 2) App (build + función SSR + hosting). Las NEXT_PUBLIC_* de producción y los
#    secretos viven en .env (raíz, gitignored); fuerzas el valor de SITE_URL en
#    el proceso para que `next build` hornee el correcto en lugar de .env.local.
#    En el ejemplo se usa PowerShell; con bash: export NEXT_PUBLIC_SITE_URL=...
$env:NEXT_PUBLIC_SITE_URL="https://invify-online.web.app"
firebase deploy --only hosting
```

> En producción el Admin SDK usa la cuenta de servicio del runtime de Cloud
> Functions (Application Default Credentials), así que **no definas claves
> `FIREBASE_*` en archivos .env**: son prefijos reservados y Firebase Functions
> rechaza el env. `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` van en `.env` (raíz).

### Webhook de Stripe
En el Dashboard de Stripe → **Webhooks**, añade el endpoint
`https://invify-online.web.app/api/stripe/webhook` con el evento
`checkout.session.completed` (y opcionalmente `expired`/`async_payment_failed`).
Pega el *Signing secret* en `STRIPE_WEBHOOK_SECRET` (en el `.env` de la raíz) y
vuelve a `firebase deploy --only hosting`. Para pruebas locales:
`stripe listen --forward-to http://127.0.0.1:5001/invify-online/us-central1/ssr-invify-online/api/stripe/webhook`.

## Scripts

- `npm run dev` · `npm run build` · `npm run lint` · `npm run typecheck`
- `npm run seed` para poblar `/plans` (Stripe TEST), `/templates/demo-boda` y `/site/config`
- `npm run emulators` para probar Auth/Firestore/Storage localmente.

### Imágenes de las plantillas

Las 31 plantillas se sembraron con URLs de `loremflickr.com`, que ya no sirve
fotos: responde `401 "Bot check / Javascript is needed"` a cualquier petición sin
navegador. No es hotlink ni una cabecera que se pueda ajustar, es un challenge de
JavaScript, así que el navegador no las carga y ningún script puede bajarlas.

Lo que sí se pudo recuperar, porque los nombres cacheados de loremflickr llevan el
id y el secret de Flickr (`8643_16339941182_3b2d363066_h_...` →
`live.staticflickr.com/8643/16339941182_3b2d363066_h.jpg`):

- **104 referencias**: la foto original, tal cual la eligió el seed.
- **32 referencias**: Apuntaban a `/{w}/{h}/{pool}?lock=N`, un endpoint
  *aleatorio* que devolvía una foto distinta en cada visita, así que no había
  ninguna foto concreta que recuperar. Se sustituyeron por una foto temática
  del feed público de Flickr según la categoría.
- **Las 138** (incluidas 2 del hero de `/site/config`) quedan en Firebase Storage
  como WebP: 1000 px la miniatura del catálogo, 1600 px el fondo, 2000 px el
  hero, en `<coleccion>/<id>/<hash>.webp`. El nombre es el hash de los bytes,
  así que repetir el script no duplica archivos.

```bash
node scripts/migrate-template-images.cjs               # dry-run: solo reporte
node scripts/migrate-template-images.cjs --apply       # escribe
node scripts/migrate-template-images.cjs --verify       # las URLs responden 200
node scripts/migrate-template-images.cjs --restore-legacy
```

El dry-run no sube nada ni escribe en Firestore. `--apply` deja las URLs
originales en `legacyImageUrls` de cada documento y guarda un volcado completo en
`scripts/backup-imagenes-plantillas.json` la primera vez (no lo sobrescribe en
corridas posteriores, porque en cuanto el script vuelve a correr dejaría de ser un
respaldo). Las 65 URLs de nivel superior que se procesaron antes de que el
volcado quedara bien están también a mano y validadas en
`scripts/imagenes-originales.json`; `--restore-legacy` las vuelve a cargar y
comprueba cada una contra Flickr antes de escribir.

`/api/thumb/<id>` **sigue en pie**: ahora es el placeholder, no la foto. Se usa
para las plantillas que genera la IA, las invitaciones sin foto y el banco de
 imágenes del editor.

### Entitlements de los planes

Cada invitación guarda una **copia** de las features del plan en el momento de
comprarlo (`inv.features`), y `getInvitationFeatures` la prefiere sobre el
`planId`. Es deliberado —así la invitación conserva lo que se pagó—, pero
significa que cambiar el plan de la cuenta no desbloquea nada en las
invitaciones ya creadas.

Por eso el plan se cambia desde **Admin › Usuarios › Plan**, que llama a
`/api/admin/user-plan` y reescribe también esos snapshots. El motivo es
obligatorio y queda en el log como `admin.plan_changed`.

Bajar de plan **oculta** RSVP/quiz/música, pero **no borra** los datos ya
recogidos: las confirmaciones y respuestas que ya llegaron siguen guardadas.
Perder los datos de los invitados por un cambio de plan sería inaceptable.

```bash
node scripts/fix-plan-entitlements.cjs            # dry-run
node scripts/fix-plan-entitlements.cjs --apply    # escribe el bloque entitlement
```

Este script es necesario porque los ids de `/plans` los genera Stripe y ninguno
coincide con las claves de `PLAN_CATALOG`, así que sin un `entitlement` explícito
en el documento todos los planes caen al fallback permisivo (ilimitadas y todas
las features) y_resultaban iguales entre sí. Clasifica cada plan por su **nombre**
—los ids no sirven— y **no toca** un plan cuyo nombre no reconoce.
