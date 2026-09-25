/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Dominios permitidos para optimizaciòn de imǭgenes (Firebase Storage + CDN de mapas).
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
};

export default nextConfig;
