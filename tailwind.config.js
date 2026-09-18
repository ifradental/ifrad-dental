/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        dentist: {
          primary: '#1e6bb8',
          secondary: '#3b82f6',
          dark: '#0f3d69',
          light: '#e8f2fc',
          accent: '#0d9488',
          tabActive: '#0284c7',
          tabBg: '#bae6fd',
          surface: '#f8fafc',
          card: '#ffffff',
          border: '#cbd5e1'
        }
      }
    },
  },
  plugins: [],
}

