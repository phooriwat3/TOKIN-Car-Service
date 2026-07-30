import type { Config } from 'tailwindcss';
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#17212B',
        brand: '#07529A',
        'brand-dark': '#063B70',
        'brand-light': '#EAF2F9',
        'brand-mid': '#0B65B8',
        canvas: '#F3F5F7',
        line: '#D9DEE5',
        accent: '#D58B16',
        'accent-light': '#FFF6E5',
        success: '#17724A',
        'success-light': '#E9F5EF',
        danger: '#B83B35',
        'danger-light': '#FAECEB',
      },
      fontFamily: {
        sans: ['Sarabun', 'Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 1px 2px rgba(23,33,43,.05)',
        card: '0 1px 2px rgba(23,33,43,.05), 0 8px 24px rgba(23,33,43,.035)',
        'card-hover': '0 2px 4px rgba(23,33,43,.07), 0 14px 32px rgba(23,33,43,.07)',
        sidebar: '8px 0 30px rgba(10,25,40,.12)',
        header: '0 1px 0 #D9DEE5, 0 2px 8px rgba(0,0,0,.04)',
        modal: '0 24px 64px rgba(10,25,40,.2)',
        btn: '0 1px 2px rgba(6,59,112,.2)',
      },
      borderRadius: {
        DEFAULT: '6px',
        sm: '6px',
        md: '8px',
        lg: '10px',
        xl: '12px',
        '2xl': '16px',
        full: '9999px',
      },
      transitionDuration: {
        DEFAULT: '200ms',
      },
    },
  },
  plugins: [],
} satisfies Config;

