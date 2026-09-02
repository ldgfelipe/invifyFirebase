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
