/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // <— VAŽNO za ručni toggle preko <html class="dark">
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      container: {
        center: true,
        padding: {
          DEFAULT: '1rem',
          sm: '1.5rem',
          lg: '2rem',
          xl: '2.5rem',
        },
      },
      // (opciono) sitne stilizacije sjena, za “glass” look
      boxShadow: {
        'soft': '0 10px 30px -12px rgba(2,6,23,0.12)',
      },
    },
  },
  plugins: [
    // (opciono) forms ako koristiš <input> / <select>:
    // require('@tailwindcss/forms'),
  ],
}
