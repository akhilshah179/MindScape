/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: token('canvas'),
        surface: { DEFAULT: token('surface'), 2: token('surface-2'), 3: token('surface-3') },
        line: { DEFAULT: token('line'), strong: token('line-strong') },
        ink: { DEFAULT: token('ink'), 2: token('ink-2'), 3: token('ink-3') },
        accent: { DEFAULT: token('accent'), 2: token('accent-2'), soft: token('accent-soft'), ink: token('accent-ink') },
        ok: token('ok'),
        warn: token('warn'),
        bad: token('bad'),
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'ui-sans-serif', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: { xl: '0.875rem', '2xl': '1.125rem', '3xl': '1.5rem' },
      boxShadow: {
        card: '0 1px 2px rgb(0 0 0 / 0.04), 0 8px 24px -12px rgb(0 0 0 / 0.18)',
        lift: '0 2px 4px rgb(0 0 0 / 0.06), 0 24px 48px -16px rgb(0 0 0 / 0.35)',
        glow: '0 0 0 1px rgb(var(--accent) / 0.35), 0 8px 32px -8px rgb(var(--accent) / 0.45)',
      },
      backgroundImage: {
        'accent-gradient': 'linear-gradient(135deg, rgb(var(--accent)) 0%, rgb(var(--accent-2)) 100%)',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'fade-up': { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'none' } },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
        'fade-up': 'fade-up .35s cubic-bezier(.2,.8,.2,1) both',
      },
    },
  },
  plugins: [],
}
