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
          dark: "#0b0f19",
          card: "rgba(15, 23, 42, 0.75)",
          border: "rgba(30, 41, 59, 0.7)",
          cyan: "#00f5d4",
          emerald: "#10b981",
          gold: "#f59e0b",
          danger: "#f43f5e",
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};

