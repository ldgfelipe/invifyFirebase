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
    ],
  },
  // Permite despliegue en Firebase Hosting + Cloud Functions/Cloud Run.
  output: "standalone",
  experimental: {
    // Habilita la generación de sitemap/robots en App Router.
    typedRoutes: false,
  },
};

export default nextConfig;
