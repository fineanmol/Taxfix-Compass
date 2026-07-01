/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Apple Science Blue scale (fixed across themes)
        brand: {
          50: "#e6f0fb",
          100: "#cce0f7",
          200: "#99c2ef",
          300: "#66a3e6",
          400: "#3385de",
          500: "#0a72d6",
          600: "#0066cc", // Science Blue
          700: "#0058b0",
          800: "#004a94",
          900: "#003a75",
        },
        // Positive/negative accents
        mint: "#34c759", // Apple system green
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
        fab: "0 8px 24px rgba(0,102,204,0.4)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #0a72d6 0%, #0066cc 100%)",
      },
    },
  },
  plugins: [],
};
