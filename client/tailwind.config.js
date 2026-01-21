/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Jaipur Pink City inspired colors
        'jaipur-pink': {
          50: '#fdf2f4',
          100: '#fce7ea',
          200: '#f9d0d8',
          300: '#f4a9b8',
          400: '#ed7a93',
          500: '#e04d70',
          600: '#cd2d5a',
          700: '#ac2049',
          800: '#8f1d41',
          900: '#7a1c3c',
        },
        'terracotta': {
          50: '#fef6f3',
          100: '#fdebe4',
          200: '#fcd5c7',
          300: '#f9b69e',
          400: '#f48c6b',
          500: '#ec6943',
          600: '#da4f2c',
          700: '#b63e22',
          800: '#943521',
          900: '#7a2f20',
        },
        'gold': {
          50: '#fdfbe9',
          100: '#fcf7c5',
          200: '#faed8e',
          300: '#f6dc4d',
          400: '#f0c820',
          500: '#e0b013',
          600: '#c1890e',
          700: '#9a6310',
          800: '#7f4e14',
          900: '#6c4017',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'orb-glow': 'orb-glow 2s ease-in-out infinite alternate',
        'fade-in': 'fade-in 0.3s ease-out',
      },
      keyframes: {
        'orb-glow': {
          '0%': { boxShadow: '0 0 20px 5px rgba(224, 77, 112, 0.3)' },
          '100%': { boxShadow: '0 0 40px 15px rgba(224, 77, 112, 0.5)' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(-4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
