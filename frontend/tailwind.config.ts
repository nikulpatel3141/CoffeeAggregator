import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: 'rgb(var(--color-canvas) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        elevated: 'rgb(var(--color-surface-elevated) / <alpha-value>)',
        text: 'rgb(var(--color-text) / <alpha-value>)',
        muted: 'rgb(var(--color-text-muted) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        coffee: {
          DEFAULT: 'rgb(var(--color-coffee) / <alpha-value>)',
          strong: 'rgb(var(--color-coffee-strong) / <alpha-value>)',
        },
        crema: 'rgb(var(--color-crema) / <alpha-value>)',
        terracotta: 'rgb(var(--color-terracotta) / <alpha-value>)',
        sage: 'rgb(var(--color-sage) / <alpha-value>)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        body: ['var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        subtle: '0 1px 2px rgb(49 38 31 / 0.06)',
        raised: '0 8px 24px rgb(49 38 31 / 0.10)',
        floating: '0 18px 48px rgb(49 38 31 / 0.16)',
      },
      borderRadius: {
        surface: '0.875rem',
        control: '0.625rem',
      },
      transitionProperty: {
        surface: 'color, background-color, border-color, box-shadow, transform',
      },
      transitionDuration: {
        calm: '180ms',
      },
      transitionTimingFunction: {
        gentle: 'cubic-bezier(0.2, 0, 0, 1)',
      },
    },
  },
  plugins: [],
}
export default config
