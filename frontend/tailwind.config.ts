import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#162F2B",
        sage: { 50: "#F4F8F6", 100: "#E5F0EB", 500: "#4F8B75", 600: "#39725E", 700: "#2D5A4B" },
        coral: "#EC806A"
      },
      boxShadow: { soft: "0 16px 45px rgba(31, 61, 53, 0.08)" },
      fontFamily: { sans: ["var(--font-inter)", "system-ui", "sans-serif"] }
    }
  },
  plugins: []
};

export default config;
