import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        slate: "#64748b",
        shell: "#f8fafc",
        mist: "#e2e8f0",
        success: "#047857",
        danger: "#dc2626",
        warning: "#b45309"
      },
      boxShadow: {
        panel: "0 16px 40px rgba(15, 23, 42, 0.08)"
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        pulseLine: {
          "0%, 100%": { opacity: "0.45" },
          "50%": { opacity: "1" }
        }
      },
      animation: {
        rise: "rise 0.55s ease-out both",
        pulseLine: "pulseLine 2.4s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
