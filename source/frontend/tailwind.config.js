/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  // Class-based: <html class="dark"> activates `dark:` variants.  The class
  // is toggled by ThemeToggle on load (auto-detect) + on user click.
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      colors: {
        // Score-band palette (mirrors backend badge colors)
        score: {
          excellent: "#4c1",
          good: "#97ca00",
          fair: "#dfb317",
          poor: "#fe7d37",
          bad: "#e05d44",
        },
      },
    },
  },
  plugins: [],
};
