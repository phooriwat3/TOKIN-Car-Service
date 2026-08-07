import type { Config } from 'tailwindcss';
import colors from 'tailwindcss/colors';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7fd',
          100: '#daeaf9',
          200: '#a8cdf0',
          300: '#5b99e0',
          400: '#2e71c9',
          500: '#1457ad',
          600: '#0f4285',
          700: '#0d3261',
          800: '#0a2240',
          900: '#071628',
          950: '#040d1a',
          DEFAULT: '#1457ad',
          dark: '#0d3261',
          light: '#f0f7fd',
          mid: '#0f4285',
        },
        accent: {
          50: '#fffbeb',
          100: '#fef3c7',
          400: '#f59e0b',
          500: '#d97706',
          600: '#b45309',
          DEFAULT: '#d97706',
          light: '#fffbeb',
        },
        ink: {
          DEFAULT: '#0f172a',
          2: '#1e293b',
        },
        canvas: '#f8fafc',
        surface: {
          DEFAULT: '#ffffff',
          2: '#f1f5f9',
          3: '#e2e8f0',
        },
        line: {
          DEFAULT: '#e2e8f0',
          2: '#cbd5e1',
        },
        neutral: colors.slate,
        success: {
          DEFAULT: '#16a34a',
          light: '#dcfce7',
        },
        danger: {
          DEFAULT: '#dc2626',
          light: '#fee2e2',
        },
        warning: {
          DEFAULT: '#d97706',
          light: '#fef3c7',
        },
        info: {
          DEFAULT: '#2563eb',
          light: '#dbeafe',
        },
        violet: {
          DEFAULT: '#7c3aed',
          light: '#ede9fe',
        },
      },
      fontFamily: {
        display: ['Inter', 'Sarabun', 'Segoe UI', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'Sarabun', 'Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        panel: 'var(--shadow-xs)',
        card: 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
        sidebar: 'var(--shadow-sidebar)',
        header: 'var(--shadow-header)',
        modal: 'var(--shadow-modal)',
        btn: 'var(--shadow-btn)',
        inner: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
      },
      borderRadius: {
        DEFAULT: 'var(--radius-md)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        full: '9999px',
      },
      transitionDuration: {
        DEFAULT: '200ms',
      },
    },
  },
  plugins: [],
} satisfies Config;
