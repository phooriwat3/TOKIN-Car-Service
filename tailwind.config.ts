import type { Config } from 'tailwindcss';
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1A2332',
        brand: '#00498E',
        'brand-dark': '#003A71',
        'brand-light': '#E6F0F9',
        'brand-mid': '#0055A5',
        canvas: '#F5F7FA',
        line: '#DDE3EC',
        accent: '#F0A500',
        'accent-light': '#FFF8E6',
        success: '#1A7F4E',
        'success-light': '#E6F5EE',
        danger: '#C0392B',
        'danger-light': '#FDECEA',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 1px 3px rgba(0,73,142,.07), 0 1px 2px rgba(0,0,0,.04)',
        card: '0 2px 8px rgba(0,73,142,.08), 0 1px 3px rgba(0,0,0,.05)',
        'card-hover': '0 6px 20px rgba(0,73,142,.12), 0 2px 6px rgba(0,0,0,.06)',
        sidebar: '4px 0 24px rgba(0,0,0,.15)',
        header: '0 1px 0 #DDE3EC, 0 2px 8px rgba(0,0,0,.04)',
        modal: '0 20px 60px rgba(0,73,142,.18)',
        btn: '0 1px 3px rgba(0,73,142,.25)',
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.25rem',
      },
      transitionDuration: {
        DEFAULT: '200ms',
      },
    },
  },
  plugins: [],
} satisfies Config;

