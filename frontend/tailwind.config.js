/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      'xs': '480px',
      ...require('tailwindcss/defaultTheme').screens,
    },
    extend: {
      colors: {
        brand: {
          bg: 'var(--color-bg)',
          surface: 'var(--color-surface)',
          'surface-hover': 'var(--color-surface-2)',
          border: 'var(--color-border)',
          text: 'var(--color-text)',
          muted: 'var(--color-muted)',
          accent: 'var(--color-accent)',
        },
        status: {
          available: 'var(--color-available)',
          running: 'var(--color-running)',
          cleaning: 'var(--color-cleaning)',
          polishing: 'var(--color-polishing)',
          damaged: 'var(--color-damaged)',
          scrapped: 'var(--color-scrapped)',
          missing: 'var(--color-missing)',
          maintenance: 'var(--color-maintenance)',
        }
      },
      fontFamily: {
        sans: ['"Fira Sans"', 'sans-serif'],
        mono: ['"Fira Code"', 'monospace'],
        heading: ['"Outfit"', 'sans-serif'],
      },
      boxShadow: {
        'premium-glow': '0 0 20px -5px rgba(59, 130, 246, 0.25)',
      }
    },
  },
  plugins: [],
}
