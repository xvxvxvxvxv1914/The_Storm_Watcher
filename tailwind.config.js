/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'tsw-orange': '#f97316',
        'tsw-amber': '#fbbf24',
        'tsw-green': '#10b981',
        'tsw-purple': '#7c3aed',
        'tsw-blue': '#3b82f6',
        'tsw-dark': '#0a0a1a',
        'tsw-surface': '#0f0f23',
      },
      borderRadius: {
        btn: '0.5rem',
        card: '0.75rem',
        section: '1rem',
      },
      fontSize: {
        'display-xl': ['5rem', { lineHeight: '1.1', fontWeight: '700' }],
        'display-lg': ['3.75rem', { lineHeight: '1.1', fontWeight: '700' }],
        'display-md': ['3rem', { lineHeight: '1.15', fontWeight: '700' }],
        'heading-xl': ['2rem', { lineHeight: '1.2', fontWeight: '700' }],
        'heading-lg': ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],
        'heading-md': ['1.25rem', { lineHeight: '1.4', fontWeight: '600' }],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
