import type { Config } from "tailwindcss";
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))", foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))", border: "hsl(var(--border))", muted: "hsl(var(--muted))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        success: "#14856d", coral: "#ed927c", navy: "#173b46", mint: "#e5f5ef",
      },
      fontFamily: { sans: ["var(--font-app)", "Tahoma", "Arial", "sans-serif"] },
      boxShadow: { soft: "0 12px 40px rgba(22, 60, 72, .08)", float: "0 18px 50px rgba(10, 93, 95, .15)" },
      borderRadius: { "4xl": "2rem" },
      backgroundImage: { "hero-glow": "radial-gradient(circle at 85% 20%, rgba(178, 229, 209, .65), transparent 34%), linear-gradient(130deg, #f1faf7 0%, #f8fbf8 55%, #fff7f2 100%)" },
      keyframes: { float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-8px)" } } },
      animation: { float: "float 5s ease-in-out infinite" },
    },
  },
  plugins: [],
};
export default config;
