/** @type {import('tailwindcss').Config} */
const plugin = require('tailwindcss/plugin')

module.exports = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        'neo': '8px 8px 16px rgba(0,0,0,0.4), -8px -8px 16px rgba(255,255,255,0.05)',
        'neo-inset': 'inset 8px 8px 16px rgba(0,0,0,0.4), inset -8px -8px 16px rgba(255,255,255,0.05)',
      },
      colors: {
        'dark-bg': '#1e1e1e',
        'dark-bg-secondary': '#252526',
        'accent': '#3b82f6',
        'accent-hover': '#2563eb',
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