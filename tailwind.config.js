/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: '#FFF9F0',
        ivory: '#FAF9F6',
        gold: '#D4AF37',
        richBlack: '#0A0A0A',
      }
    },
  },
  plugins: [],
}
