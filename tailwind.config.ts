import type { Config } from "tailwindcss";

/**
 * Configuración de TailwindCSS.
 * Paleta premium "boda": dorado #D4AF37, cremas y serif (Playfair Display).
 */
const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: "#D4AF37",
          50: "#FBF7EC",
          100: "#F3E9C9",
          200: "#E6D195",
          300: "#D4AF37",
          400: "#C29A2B",
          500: "#A87F1F",
          600: "#8A6618",
        },
        ink: "#1C1B19",
        cream: "#FAF6EF",
        champagne: "#F6EBD9",
      },
      fontFamily: {
        serif: ["var(--font-playfair)", "Playfair Display", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 10px 40px -12px rgba(212, 175, 55, 0.35)",
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        fadeInUp: "fadeInUp 0.6s ease-out both",
        shimmer: "shimmer 1.6s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
