/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        mc: {
          dirt: '#2d1e12',
          darkdirt: '#1b1208',
          grass: '#4a7227',
          grasslight: '#5b8e30',
          grassdark: '#2f4d15',
          stone: '#707070',
          darkstone: '#373737',
          lightstone: '#8f8f8f',
          wood: '#5c3e1e',
          diamond: '#4dedf4',
          emerald: '#17dd62',
          gold: '#fdb813',
          redstone: '#ff2222',
          obsidian: '#1b1226',
          gui: '#362d26',
          guilight: '#483c33',
          guiborder: '#18120c',
          text: '#f5ebd7',
          textyellow: '#ffff55',
        },
        football: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Inter"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', '"Inter"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        pixel: ['"Plus Jakarta Sans"', '"Inter"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace'],
      },
    },
  },
  plugins: [],
};
