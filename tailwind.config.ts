import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    // Design target: 390px (iPhone 13/14/15)
    screens: {
      sm: "390px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      // ── Colours ────────────────────────────────────
      colors: {
        background: {
          DEFAULT: "hsl(var(--background))",
          subtle: "hsl(var(--background-subtle))",
        },
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
          border: "hsl(var(--card-border))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },

      // ── Border radius (Apex spec) ───────────────────
      borderRadius: {
        card:   "var(--radius-card)",    // 20px
        button: "var(--radius-button)",  // 14px
        input:  "var(--radius-input)",   // 14px
        nav:    "var(--radius-nav)",     // 24px — active pill
        // Keep Tailwind defaults for one-off usage
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "20px",
        "2xl": "24px",
      },

      // ── Typography ─────────────────────────────────
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      fontSize: {
        // Spec sizes
        hero:    ["2rem",    { lineHeight: "1.15", fontWeight: "700" }],   // 32px
        title:   ["1.5rem",  { lineHeight: "1.25", fontWeight: "700" }],   // 24px
        section: ["1.125rem",{ lineHeight: "1.4",  fontWeight: "700" }],   // 18px
        body:    ["0.9375rem",{ lineHeight: "1.6", fontWeight: "400" }],   // 15px
        caption: ["0.8125rem",{ lineHeight: "1.5", fontWeight: "500" }],   // 13px
        // Keep standard scale
        xs:  ["0.75rem",  { lineHeight: "1.125rem" }],
        sm:  ["0.875rem", { lineHeight: "1.375rem" }],
        base:["1rem",     { lineHeight: "1.625rem" }],
        lg:  ["1.125rem", { lineHeight: "1.75rem" }],
        xl:  ["1.25rem",  { lineHeight: "1.875rem" }],
        "2xl":["1.5rem",  { lineHeight: "2rem" }],
      },

      // ── Spacing ─────────────────────────────────────
      spacing: {
        // Spec values
        "page": "20px",    // outer page padding
        "card": "16px",    // card inner padding
        "section": "24px", // between sections
        "element": "12px", // between elements
        "nav": "72px",     // bottom nav height
        // Safe area
        "safe-top":    "env(safe-area-inset-top, 0px)",
        "safe-bottom": "env(safe-area-inset-bottom, 0px)",
      },

      // ── Shadows (spec: shadow-sm only) ──────────────
      boxShadow: {
        sm:   "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)",
        card: "0 1px 2px 0 rgb(0 0 0 / 0.04)",
      },

      // ── Animations ──────────────────────────────────
      animation: {
        "fade-in":   "fadeIn 0.18s ease-out",
        "slide-up":  "slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-down":"slideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        fadeIn:    { from: { opacity: "0" },         to: { opacity: "1" } },
        slideUp:   { from: { opacity: "0", transform: "translateY(6px)" },  to: { opacity: "1", transform: "translateY(0)" } },
        slideDown: { from: { opacity: "0", transform: "translateY(-6px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },

      // ── Height utilities ─────────────────────────────
      height: {
        nav: "72px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
