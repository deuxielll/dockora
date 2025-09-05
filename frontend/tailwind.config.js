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
        'dark-bg': '#1a1a1a', // Base background
        'dark-bg-secondary': '#202020', // Slightly lighter for raised/inset elements
        'accent': '#3b82f6',
        'accent-hover': '#2563eb',
        // Adjusted gray shades for better neomorphism contrast
        'gray-200': '#d1d5db', // Tailwind's default gray-300, good for primary text
        'gray-300': '#9ca3af', // Tailwind's default gray-400, good for secondary text
        'gray-400': '#6b7280', // Tailwind's default gray-500, good for tertiary text/placeholders
        'gray-500': '#4b5563', // Tailwind's default gray-600
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