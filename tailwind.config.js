/** @type {import('tailwindcss').Config} */

module.exports = {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
    // load tailwind classes of vue-tailwind-lib components:
    './node_modules/@nethserver/vue-tailwind-lib/dist/vue-tailwind-lib.es.js'
  ],
  theme: {
    extend: {
      colors: {
        transparent: 'transparent',
        current: 'currentColor',
        // tailwind cyan palette
        primary: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          950: '#083344'
        }
      },
      animation: {
        'spin-fast': 'spin 0.5s linear infinite'
      }
    }
  },
  plugins: [require('@tailwindcss/forms')],
  darkMode: 'class'
}
