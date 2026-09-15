import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          green: {
            DEFAULT: "#2d6a4f",
            50: "#f0faf4",
            600: "#2d6a4f",
            700: "#1b4332",
            800: "#14532d",
          },
          amber: {
            DEFAULT: "#f59e0b",
            400: "#fbbf24",
          },
        },
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-poppins)", "system-ui", "sans-serif"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
        "3xs": ["0.6875rem", { lineHeight: "1rem" }],
        "body-sm": ["0.8125rem", { lineHeight: "1.25rem" }],
        "body-md": ["0.9375rem", { lineHeight: "1.375rem" }],
        "heading-sm": ["1.0625rem", { lineHeight: "1.5rem" }],
        "display-sm": ["1.625rem", { lineHeight: "1.15" }],
        "display-lg": ["2rem", { lineHeight: "1.15" }],
        "display-md": ["2.125rem", { lineHeight: "1" }],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};

export default config;
