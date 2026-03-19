import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sand: "#fffaf1",
        ink: "#132238",
        teal: {
          50: "#effcf9",
          100: "#d1f5ec",
          600: "#0f766e",
          700: "#0e5f59",
        },
        coral: {
          100: "#ffe3d6",
          500: "#f97316",
        },
      },
      boxShadow: {
        soft: "0 24px 60px rgba(19, 34, 56, 0.12)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
