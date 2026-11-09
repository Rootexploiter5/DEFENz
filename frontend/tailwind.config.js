/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: "#05070f",
          surface: "rgba(13, 17, 30, 0.72)",
          surfaceHover: "rgba(22, 29, 49, 0.82)",
          border: "rgba(56, 189, 248, 0.16)",
          borderGlow: "rgba(0, 245, 212, 0.4)",
          cyan: "#00f5d4",
          violet: "#8b5cf6",
          fuchsia: "#d946ef",
          blue: "#3b82f6",
          emerald: "#10b981",
          gold: "#f59e0b",
          danger: "#f43f5e",
        },
      },
      backgroundImage: {
        'radial-glow': 'radial-gradient(circle at 50% 0%, rgba(0, 245, 212, 0.12), transparent 50%), radial-gradient(circle at 100% 50%, rgba(139, 92, 246, 0.1), transparent 50%)',
        'cyber-gradient': 'linear-gradient(135deg, rgba(0, 245, 212, 0.15) 0%, rgba(139, 92, 246, 0.15) 50%, rgba(217, 70, 239, 0.15) 100%)',
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 15px rgba(0, 245, 212, 0.2)' },
          '100%': { boxShadow: '0 0 25px rgba(139, 92, 246, 0.35)' },
        },
      },
    },
  },
  plugins: [],
};
