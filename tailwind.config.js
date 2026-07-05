/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Quanto-style teal accent scale
        brand: {
          50: "#e6f6f1",
          100: "#c5eae0",
          200: "#93d7c5",
          300: "#5fc2a8",
          400: "#3eae91",
          500: "#2f9b80", // primary teal
          600: "#2a8a72",
          700: "#237360",
          800: "#1c5c4d",
          900: "#134239",
        },
        // Positive/negative accents
        mint: "#34d399", // green for income/positive
        // Semantic tokens -> CSS vars (flip in dark mode)
        bg: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-2": "rgb(var(--surface-2) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        content: "rgb(var(--content) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        faint: "rgb(var(--faint) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "SF Pro Display", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.04), 0 6px 20px rgba(0,0,0,0.06)",
        fab: "0 4px 18px rgba(0,0,0,0.55)",
      },
      backgroundImage: {
        // teal→blue gradient used for CTAs, premium banners, active accents
        "brand-gradient": "linear-gradient(135deg, #2f9b80 0%, #2b7f9e 100%)",
      },
    },
  },
  plugins: [],
};
