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
#   - NEXT_PUBLIC_* van en --build-env-vars: Next las inyecta en el bundle del
#     cliente DURANTE el build (ARG del Dockerfile). Son públicas, no secretas.
#   - Las secretas (Stripe, Admin) van en --set-env-vars Tiempo de ejecución.
gcloud run deploy invify \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --build-env-vars "NEXT_PUBLIC_SITE_URL=https://invify-online.web.app,NEXT_PUBLIC_FIREBASE_API_KEY=<tu_api_key>,NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=invify-online.firebaseapp.com,NEXT_PUBLIC_FIREBASE_PROJECT_ID=invify-online,NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=invify-online.firebasestorage.app,NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=20249934592,NEXT_PUBLIC_FIREBASE_APP_ID=1:20249934592:web:ca04868e2fe19de51c51e5,NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<tu_publishable_key_test>" \
  --set-env-vars "FIREBASE_ADMIN_PROJECT_ID=invify-online,STRIPE_SECRET_KEY=<tu_clave_secreta_test_de_env.local>" \
  --env-vars-file=env.cloudrun.yaml
#  -> NUNCA pongas la private key de la cuenta de servicio ni el webhook secret
#     en el flag. Crea env.cloudrun.yaml (gitignored) con:
#       FIREBASE_ADMIN_CLIENT_EMAIL: "xxx@invify-online.iam.gserviceaccount.com"
#       FIREBASE_ADMIN_PRIVATE_KEY: "-----BEGIN RSA PRIVATE KEY-----\n..." # con \n
#       STRIPE_WEBHOOK_SECRET: "whsec_..."

# 3) Actualiza el rewrite de Hosting al servicio de Run
firebase deploy --only hosting
```

> Las claves secretas (cliente email, private key, webhook secret) viven en un
> archivo `env.cloudrun.yaml` (o Secret Manager) y **nunca se commitean**.

### Webhook de Stripe
En el Dashboard de Stripe → **Webhooks**, añade el endpoint
`https://<url-de-cloud-run>/api/stripe/webhook` con el evento
`checkout.session.completed` (y opcionalmente `expired`/`async_payment_failed`).
Pega el *Signing secret* en `STRIPE_WEBHOOK_SECRET`. Para pruebas locales:
`stripe listen --forward-to localhost:3000/api/stripe/webhook`.

## Scripts

- `npm run dev` · `npm run build` · `npm run lint` · `npm run typecheck`
- `npm run seed` para poblar `/plans` (Stripe TEST), `/templates/demo-boda` y `/site/config`
- `npm run emulators` para probar Auth/Firestore/Storage localmente.
