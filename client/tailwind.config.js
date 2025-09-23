/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          font: '#333333',
          purple: '#6c5ce7',
          'purple-light': '#a29bfe',
        },
        neutral: {
          white: '#ffffff',
          'low-white': '#f8f9fa',
          gray: '#636e72',
          'gray-light': '#b2bec3',
          black: '#000000',
        },
        status: {
          success: '#00b894',
          error: '#d63031',
          warning: '#fdcb6e',
          blue: '#0984e3',
          green: '#00b894',
          red: '#d63031',
          yellow: '#fdcb6e',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
      fontSize: {
        'xs': ['12px', '16px'],
        'sm': ['14px', '20px'],
        'base': ['16px', '24px'],
        'lg': ['18px', '28px'],
        'xl': ['20px', '28px'],
        '2xl': ['24px', '32px'],
        '3xl': ['30px', '36px'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      borderRadius: {
        'xl': '12px',
      },
      boxShadow: {
        'soft': '0 2px 4px rgba(0, 0, 0, 0.1)',
        'medium': '0 4px 8px rgba(0, 0, 0, 0.15)',
      },
    },
  },
  plugins: [],
}
