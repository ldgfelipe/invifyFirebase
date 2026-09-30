/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Dominios permitidos para optimización de imágenes (Firebase Storage + CDN de mapas).
    remotePatterns: [
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "api.mapbox.com" },
      { protocol: "https", hostname: "loremflickr.com" },
    ],
  },
  // Firebase Hosting Frameworks genera su propio bundle; "standalone" rompe el probe (timeout 10s en deploy)
  // output: "standalone",
  experimental: {
    // Habilita la generación de sitemap/robots en App Router.
    typedRoutes: false,
  },
  // Sin bloque headers() a proposito: se probo y este runtime descarta las
  // cabeceras de respuesta que Next anade (HSTS, nosniff, Referrer-Policy,
  // X-Frame-Options) igual que hace con las de firebase.json. Solo pasan
  // X-Robots-Tag y Cache-Control. Dejarlo aqui seria una config muerta que
  // aparenta proteger el sitio. ParaServir estas cabeceras de verdad hay que
  // migrar a Firebase App Hosting o poner Cloudflare delante.
};

export default nextConfig;