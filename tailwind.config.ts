import type { Config } from 'tailwindcss';

/**
 * Toutes les couleurs pointent vers des variables CSS (src/app/globals.css),
 * redéfinies sous `.dark`. Les modificateurs d'opacité (`bg-ink/[0.04]`)
 * fonctionnent grâce au format `rgb(var(--x) / <alpha-value>)`.
 * Règles d'usage : voir DESIGN.md à la racine du dépôt.
 */
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-body)', 'system-ui', 'sans-serif'],
      },
      colors: {
        background: token('bg-canvas'),
        surface: token('bg-surface'),
        subtle: token('bg-subtle'),
        muted: token('bg-muted'),
        borderc: {
          DEFAULT: token('border-subtle'),
          strong: token('border-strong'),
        },
        ink: {
          DEFAULT: token('text-primary'),
          secondary: token('text-secondary'),
          tertiary: token('text-tertiary'),
        },
        'on-primary': token('text-on-accent'),
        primary: {
          DEFAULT: token('accent'),
          hover: token('accent-hover'),
          50: token('accent-subtle'),
          100: token('accent-subtle-strong'),
          200: token('accent-border'),
          500: token('accent'),
          600: token('accent-hover'),
          700: token('accent-strong'),
        },
        success: {
          DEFAULT: token('success-fg'),
          solid: token('success-solid'),
          50: token('success-bg'),
          100: token('success-border'),
        },
        warning: {
          DEFAULT: token('warning-fg'),
          solid: token('warning-solid'),
          50: token('warning-bg'),
          100: token('warning-border'),
        },
        danger: {
          DEFAULT: token('error-fg'),
          solid: token('error-solid'),
          50: token('error-bg'),
          100: token('error-border'),
        },
        /** Teintes des réponses A/B/C/D : réservées au jeu (joueur, projection, histogramme). */
        answer: {
          a: token('answer-a'),
          b: token('answer-b'),
          c: token('answer-c'),
          d: token('answer-d'),
        },
        medal: {
          gold: token('medal-gold'),
          silver: token('medal-silver'),
          bronze: token('medal-bronze'),
        },
        /** Alias historique, ramené sur l'accent : plus de seconde couleur décorative. */
        accent: {
          DEFAULT: token('accent'),
          50: token('accent-subtle'),
          100: token('accent-subtle-strong'),
        },
      },
      fontSize: {
        display: ['3.5rem', { lineHeight: '1.05', letterSpacing: '-0.025em', fontWeight: '700' }],
        h1: ['2.25rem', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '700' }],
        h2: ['1.75rem', { lineHeight: '1.2', letterSpacing: '-0.015em', fontWeight: '600' }],
        h3: ['1.375rem', { lineHeight: '1.3', fontWeight: '600' }],
        'card-title': ['1.125rem', { lineHeight: '1.4', fontWeight: '600' }],
        body: ['1rem', { lineHeight: '1.6', fontWeight: '400' }],
        small: ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],
        caption: ['0.8125rem', { lineHeight: '1.4', fontWeight: '500' }],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '6px',
        lg: '8px',
        /** Réservé aux grandes surfaces de jeu (tuiles de réponse, projection). */
        xl: '12px',
      },
      boxShadow: {
        xs: '0 1px 2px rgb(var(--shadow-color) / 0.04)',
        sm: '0 1px 3px rgb(var(--shadow-color) / 0.06)',
        /** Réservé aux surfaces flottantes (menus, modales, toasts). */
        md: '0 8px 24px -8px rgb(var(--shadow-color) / 0.16), 0 2px 6px -2px rgb(var(--shadow-color) / 0.08)',
        lg: '0 8px 24px -8px rgb(var(--shadow-color) / 0.16), 0 2px 6px -2px rgb(var(--shadow-color) / 0.08)',
        glow: '0 0 0 3px rgb(var(--accent) / 0.22)',
      },
      spacing: {
        18: '4.5rem',
      },
      maxWidth: {
        content: '1200px',
      },
      keyframes: {
        countdown: {
          '0%': { transform: 'scale(1.5)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-10px)' },
          '75%': { transform: 'translateX(10px)' },
        },
        pop: {
          '0%': { transform: 'scale(0.5)', opacity: '0' },
          '80%': { transform: 'scale(1.1)', opacity: '1' },
          '100%': { transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-success': {
          '0%': { boxShadow: '0 0 0 0 rgb(var(--success-solid) / 0.35)' },
          '70%': { boxShadow: '0 0 0 12px rgb(var(--success-solid) / 0)' },
          '100%': { boxShadow: '0 0 0 0 rgb(var(--success-solid) / 0)' },
        },
        'confetti-fall': {
          '0%': { transform: 'translateY(-10px) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(220px) rotate(340deg)', opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        countdown: 'countdown 0.5s ease-out',
        shake: 'shake 0.3s ease-in-out',
        pop: 'pop 0.4s ease-out',
        shimmer: 'shimmer 1.6s infinite linear',
        'fade-in-up': 'fade-in-up 0.35s ease-out both',
        'pulse-success': 'pulse-success 1.2s ease-out',
        'confetti-fall': 'confetti-fall 1.6s ease-in forwards',
        float: 'float 3s ease-in-out infinite',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
export default config;
