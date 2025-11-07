/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'neon-dark': '#0A0A0F',
        'neon-accent': '#00FFC8',
        'neon-text': '#EAFBFF',
      },
    },
  },
  plugins: [],
}

