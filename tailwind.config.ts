import type { Config } from 'tailwindcss';
export default { content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'], theme: { extend: { colors: { ink: '#18212f', brand: '#2457a7', canvas: '#f4f6f8', line: '#dce1e7', accent: '#e6a23c' }, boxShadow: { panel: '0 1px 3px rgba(20,30,45,.08)' } } }, plugins: [] } satisfies Config;
