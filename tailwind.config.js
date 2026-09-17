/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        evergreen: {
          light: "#ECFFC7",
          calm: "#CEF5A4",
          vivid: "#ADEE68",
          dark: "#36893B",
          veryDark: "#154618",
        },
        offwhite: {
          light: "#FDF8F2",
          calm: "#EAE0D7",
          vivid: "#9A9288",
        },
        lilac: {
          light: "#F6EBFE",
          calm: "#DBB9F3",
          vivid: "#BC73F2",
        },
        gold: {
          light: "#FFEFD3",
          calm: "#F8C677",
          vivid: "#F8A21A",
        },
        blue: {
          light: "#E8F0FF",
          calm: "#B6C5F3",
          vivid: "#668CFF",
        },
        // Aliases for existing `brand-*` utilities
        brand: {
          50: "#ECFFC7",
          100: "#CEF5A4",
          200: "#ADEE68",
          300: "#ADEE68",
          400: "#36893B",
          500: "#36893B",
          600: "#36893B",
          700: "#154618",
          800: "#154618",
          900: "#154618",
        },
        mint: "#36893B",
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
        "brand-gradient": "linear-gradient(135deg, #36893B 0%, #154618 100%)",
      },
    },
  },
  plugins: [],
};
