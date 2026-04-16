/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#16161A",
        cream: "#F7F3EA",
        clay: "#A25C42",
        sand: "#D8C9A7",
        moss: "#5A6A4A",
      },
      fontFamily: {
        display: ["Playfair Display", "serif"],
        body: ["Manrope", "sans-serif"],
      },
      boxShadow: {
        card: "0 12px 35px rgba(22,22,26,0.09)",
      },
    },
  },
  plugins: [],
};
