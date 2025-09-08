/** @type {import('tailwindcss').Config} */
const plugin = require('tailwindcss/plugin')

module.exports = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        // Adjusted blur and light shadow opacity for a more pronounced effect
        'neo': '8px 8px 20px rgba(0,0,0,0.6), -8px -8px 20px rgba(255,255,255,0.15)',
        'neo-inset': 'inset 8px 8px 20px rgba(0,0,0,0.6), inset -8px -8px 20px rgba(255,255,255,0.15)',
      },
      colors: {
        // Adjusted background shades for better contrast with shadows
        'dark-bg': '#1e1e1e', // Slightly lighter base background
        'dark-bg-secondary': '#252526', // Slightly lighter for raised/inset elements
        'accent': '#3b82f6',
        'accent-hover': '#2563eb',
        // Gray shades remain as previously defined for text readability
        'gray-200': '#d1d5db',
        'gray-300': '#9ca3af',
        'gray-400': '#6b7280',
        'gray-500': '#4b5563',
      },
      textShadow: {
        'neo': '1px 1px 2px rgba(0,0,0,0.7), -1px -1px 2px rgba(255,255,255,0.1)',
      },
      dropShadow: {
        'neo': '4px 4px 8px rgba(0,0,0,0.4), -4px -4px 8px rgba(255,255,255,0.05)',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    plugin(function({ theme, addUtilities }) {
      const newUtilities = {}
      Object.entries(theme('textShadow')).forEach(([key, value]) => {
        newUtilities[`.text-shadow-${key}`] = {
          textShadow: value
        }
      })
      addUtilities(newUtilities)
    })
  ],
}