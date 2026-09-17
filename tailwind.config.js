/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Playfair Display', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
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
