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

### Despliegue en Cloud Run + Firebase Hosting

Firebase Hosting actúa como CDN y reescribe todo el tráfico al servicio de
Cloud Run (`invify`), que ejecuta el build standalone de Next.js (SSR + API routes).

```bash
# 1) Despliega reglas/índices (Blaze)
firebase deploy --only firestore:rules,firestore:indexes,storage

# 2) Despliega el servidor en Cloud Run (build con Cloud Build)
gcloud run deploy invify \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "NEXT_PUBLIC_SITE_URL=https://invify-online.web.app,NEXT_PUBLIC_FIREBASE_API_KEY=...,NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...,NEXT_PUBLIC_FIREBASE_PROJECT_ID=...,NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...,NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...,NEXT_PUBLIC_FIREBASE_APP_ID=...,NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=..." \
  --set-secrets "STRIPE_SECRET_KEY=stripe-secret:latest,FIREBASE_ADMIN_PROJECT_ID=firebase-admin-project:latest,FIREBASE_ADMIN_CLIENT_EMAIL=firebase-admin-email:latest,FIREBASE_ADMIN_PRIVATE_KEY=firebase-admin-key:latest,STRIPE_WEBHOOK_SECRET=stripe-webhook:latest"

# 3) Actualiza el rewrite de Hosting al servicio de Run
firebase deploy --only hosting
```

> Usa **Secret Manager** para las claves secretas. Nunca las commitees.

### Webhook de Stripe
En el Dashboard de Stripe → **Webhooks**, añade el endpoint
`https://<url-de-cloud-run>/api/stripe/webhook` con el evento
`checkout.session.completed` (y opcionalmente `expired`/`async_payment_failed`).
Pega el *Signing secret* en `STRIPE_WEBHOOK_SECRET`. Para pruebas locales:
`stripe listen --forward-to localhost:3000/api/stripe/webhook`.

## Scripts

- `npm run dev` · `npm run build` · `npm run lint` · `npm run typecheck`
- `npm run emulators` para probar Auth/Firestore/Storage localmente.
