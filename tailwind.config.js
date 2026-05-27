/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0a',
        panel: '#141414',
        panel2: '#1c1c1c',
        border: '#2a2a2a',
        gold: '#d4af37',
        goldDim: '#a8862b',
        muted: '#8a8a8a',
      },
      fontFamily: {
        display: ['Bebas Neue', 'Oswald', 'Anton', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'DM Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
