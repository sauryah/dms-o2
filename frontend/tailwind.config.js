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
          bg: '#0a0a0a',
          surface: '#0f0f0f',
          'surface-hover': '#141414',
          'surface-elevated': '#141414',
          border: '#1a1a1a',
          'border-visible': '#2a2a2a',
          text: '#e4e4e4',
          'text-secondary': '#6b7280',
          muted: '#404040',
          accent: '#3b82f6',
          'accent-up': '#10b981',
          'accent-down': '#ef4444',
          'accent-neutral': '#f59e0b',
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
        sans: ['ui-monospace', 'SFMono-Regular', '"SF Mono"', 'Menlo', 'Consolas', 'monospace'],
        mono: ['ui-monospace', 'SFMono-Regular', '"SF Mono"', 'Menlo', 'Consolas', 'monospace'],
        heading: ['ui-monospace', 'SFMono-Regular', '"SF Mono"', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'none': 'none',
        'premium-glow': 'none',
      }
    },
  },
  plugins: [],
}
