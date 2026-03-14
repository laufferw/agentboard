/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        base: '#0a0a0f',
        surface: '#12121a',
        raised: '#1a1a26',
        border: '#2a2a3a',
        cyan: '#00d4ff',
        'cyan-dim': '#00a0c0',
        'cyan-glow': '#00d4ff33',
        muted: '#6a6a80',
        text: '#c8c8d8',
        'text-bright': '#e8e8f0',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', '"SF Mono"', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
