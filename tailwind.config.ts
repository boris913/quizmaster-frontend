import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      colors: {
        background: '#FAFAFB',
        surface: '#FFFFFF',
        primary: {
          DEFAULT: '#5B5CEB',
          hover: '#4F46E5',
          50: '#F1F0FE',
          100: '#E4E3FD',
          200: '#C9C7FB',
          500: '#5B5CEB',
          600: '#4F46E5',
          700: '#4338CA',
        },
        success: {
          DEFAULT: '#22C55E',
          50: '#F0FDF4',
          100: '#DCFCE7',
        },
        danger: {
          DEFAULT: '#EF4444',
          50: '#FEF2F2',
          100: '#FEE2E2',
        },
        warning: {
          DEFAULT: '#F59E0B',
          50: '#FFFBEB',
          100: '#FEF3C7',
        },
        accent: {
          DEFAULT: '#7C3AED',
          50: '#F5F3FF',
          100: '#EDE9FE',
        },
        ink: {
          DEFAULT: '#111827',
          secondary: '#6B7280',
        },
        borderc: '#ECECEC',
      },
      fontSize: {
        display: ['3.5rem', { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '700' }],
        h1: ['2.25rem', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '700' }],
        h2: ['1.75rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '600' }],
        h3: ['1.375rem', { lineHeight: '1.3', fontWeight: '600' }],
        'card-title': ['1.125rem', { lineHeight: '1.4', fontWeight: '600' }],
        body: ['1rem', { lineHeight: '1.6', fontWeight: '400' }],
        small: ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],
        caption: ['0.8125rem', { lineHeight: '1.4', fontWeight: '500' }],
      },
      borderRadius: {
        sm: '8px',
        DEFAULT: '12px',
        md: '12px',
        lg: '16px',
        xl: '24px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(17, 24, 39, 0.04), 0 1px 1px rgba(17, 24, 39, 0.03)',
        md: '0 8px 24px -8px rgba(17, 24, 39, 0.12), 0 2px 8px -2px rgba(17, 24, 39, 0.06)',
        lg: '0 24px 48px -12px rgba(17, 24, 39, 0.18), 0 8px 16px -4px rgba(17, 24, 39, 0.08)',
        glow: '0 0 0 4px rgba(91, 92, 235, 0.12)',
      },
      spacing: {
        18: '4.5rem',
      },
      maxWidth: {
        content: '1280px',
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
          '0%': { boxShadow: '0 0 0 0 rgba(34,197,94,0.35)' },
          '70%': { boxShadow: '0 0 0 12px rgba(34,197,94,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(34,197,94,0)' },
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
