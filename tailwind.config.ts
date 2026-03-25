import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '2rem',
        lg: '4rem',
        xl: '5rem',
        '2xl': '6rem',
      },
    },
    screens: {
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      maxWidth: {
        'mobile-app': '480px',
        'content': '1280px',
      },
      spacing: {
        'safe-bottom': 'var(--safe-area-bottom)',
        'nav-height': 'var(--nav-height)',
      },
      fontSize: {
        'fluid-h1': 'clamp(1.75rem, 5vw, 2.5rem)',
        'fluid-h2': 'clamp(1.5rem, 4vw, 2rem)',
        'fluid-body': 'clamp(0.875rem, 2vw, 1rem)',
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          glow: "var(--primary-glow)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          glow: "var(--secondary-glow)",
        },
        accent: "var(--accent)",
        surface: {
          DEFAULT: "var(--surface)",
          alt: "var(--surface-alt)",
        },
        // Korean Theme Foundation Palette
        hanji: {
          DEFAULT: "#F6F1E7",
          dark: "#E9DFCF",
        },
        ink: {
          DEFAULT: "#2B231D",
          soft: "#4A4038",
        },
        teal: {
          DEFAULT: "#4F7C78",
          light: "#EAF2F1",
        },
        navy: "#2E4057",
        red: "#A64B43",
        gold: "#B9935A",
        sand: "#E9DFCF",
        stone: "#D8CEC0",
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
