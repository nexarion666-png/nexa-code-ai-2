import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#050b14",
        panel: "#07111e",
        panel2: "#0b1727",
        line: "#17283d",
        ink: "#e7eefb",
        muted: "#91a2bc",
        accent: "#6d4aff",
        accent2: "#3f7cff"
      },
      boxShadow: {
        glow: "0 0 35px rgba(99, 72, 255, .15)"
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};
export default config;
