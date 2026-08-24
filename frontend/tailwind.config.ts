import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#17212b',
        mint: '#0f9f8f',
        saffron: '#f59e0b',
      },
    },
  },
  plugins: [],
} satisfies Config;
