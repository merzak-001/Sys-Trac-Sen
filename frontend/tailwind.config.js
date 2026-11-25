/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sensus: {
          blue: '#003799',
          'blue-dark': '#002566',
          'blue-light': '#e8f0fe',
          green: '#72D54A',
          'green-dark': '#55b331',
          'green-light': '#ecfdf5',
          warning: '#f59e0b',
          danger: '#ef4444',
          bg: '#f8fafc',
          card: '#ffffff',
          text: '#1e293b',
          muted: '#64748b',
          border: '#e2e8f0'
        }
      }
    },
  },
  plugins: [],
}

