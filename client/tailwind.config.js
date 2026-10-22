/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#f5f3ee",
          900: "#efeee8",
          850: "#fffcf8",
          800: "#fffefa",
          700: "#e8ece5",
          600: "#d8e1d9",
          500: "#b0c1b6",
        },
        parchment: {
          DEFAULT: "#303e36",
          dim: "#5f6c63",
          faint: "#7a857b",
        },
        gold: {
          DEFAULT: "#92734e",
          soft: "#dfcfad",
          deep: "#785b38",
        },
        jade: "#55846b",
        amber: "#ab8640",
        sky: "#55799a",
        rose: "#ae6870",
        violet: "#8775a0",
        danger: "#b54e58",
      },
      fontFamily: {
        sans: ["'Inter Variable'", "system-ui", "sans-serif"],
        display: ["'Fraunces Variable'", "Georgia", "serif"],
      },
      boxShadow: {
        glow: "0 0 60px -16px rgba(216, 184, 117, 0.35)",
        panel: "0 24px 80px -32px rgba(65, 78, 56, 0.18)",
        stat: "0 0 24px -8px rgba(255, 255, 255, 0.15)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "1" },
        },
        drift: {
          "0%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(2%, -2%, 0) scale(1.04)" },
          "100%": { transform: "translate3d(0,0,0) scale(1)" },
        },
      },
      animation: {
        "fade-up": "fadeUp 0.55s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fadeIn 0.4s ease-out both",
        float: "float 7s ease-in-out infinite",
        shimmer: "shimmer 2.4s linear infinite",
        "pulse-soft": "pulseSoft 3.5s ease-in-out infinite",
        drift: "drift 18s ease-in-out infinite",
      },
      backgroundImage: {
        "grid-faint":
          "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
      },
      backgroundSize: {
        "grid-sm": "32px 32px",
      },
    },
  },
  plugins: [],
};
