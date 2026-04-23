import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#2f2530",
        moss: "#48664a",
        leaf: "#6f985b",
        meadow: "#b6cf7a",
        wheat: "#e4c66d",
        clay: "#b8684b",
        brick: "#8f3f3a",
        sky: "#9bd4d8",
        paper: "#fff8dc",
        panel: "#f7e8b4",
        night: "#273048"
      },
      boxShadow: {
        pixel: "0 0 0 3px #2f2530, 6px 6px 0 #6b4a42",
        soft: "0 18px 45px rgba(47, 37, 48, 0.18)"
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "Inter", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
