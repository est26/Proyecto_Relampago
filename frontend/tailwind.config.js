/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        marca: {
          50: '#eef4ff', 100: '#dbe6ff', 200: '#bcd0ff',
          500: '#3b6bd6', 600: '#2f56b3', 700: '#264790', 900: '#16294f'
        }
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif']
      }
    }
  },
  plugins: []
};
