/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        warehouse: {
          bg: '#000000',
          yellow: '#FFD700',
          blue: '#2563eb',
          green: '#10b981',
          red: '#ef4444',
          purple: '#a855f7',
          gray: {
            dark: '#1f2937',
            medium: '#4b5563',
            light: '#9ca3af'
          }
        }
      },
      fontSize: {
        'location': '48px',
        'touch': '20px'
      },
      minHeight: {
        'touch': '60px'
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)'
      }
    },
  },
  plugins: [],
}
