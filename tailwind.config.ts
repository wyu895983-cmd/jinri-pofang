import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#09090B",
        panel: "#12121A",
        acid: "#B6FF3B",
        purple: "#7C3AED",
        muted: "#A1A1AA",
        line: "rgba(255,255,255,0.08)"
      },
      fontFamily: {
        sans: ['"PingFang SC"', "Inter", "system-ui", "sans-serif"]
      },
      fontSize: {
        h1: ["32px", { lineHeight: "40px", fontWeight: "700" }],
        h2: ["20px", { lineHeight: "28px", fontWeight: "600" }],
        body: ["16px", { lineHeight: "26px", fontWeight: "400" }],
        meta: ["13px", { lineHeight: "18px", fontWeight: "400" }],
        label: ["12px", { lineHeight: "16px", fontWeight: "500" }],
        button: ["15px", { lineHeight: "20px", fontWeight: "500" }]
      },
      borderRadius: {
        card: "20px",
        button: "14px"
      },
      boxShadow: {
        glow: "0 0 32px rgba(124, 58, 237, 0.22)",
        acid: "0 0 24px rgba(182, 255, 59, 0.22)",
        card: "0 18px 48px rgba(0, 0, 0, 0.28)"
      }
    }
  },
  plugins: []
};

export default config;
