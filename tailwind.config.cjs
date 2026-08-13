import type { Config } from "tailwindcss";

export default {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        obsidian: '#140906',
        graphite: '#1C110C',
        slate: '#261812',
        pearl: '#F0F0F2',
        ash: '#9E8D81',
        mahogany: '#CD9B46',
        cream: '#EEDDC0',
        sage: '#6DB88A',
        amber: '#CD9B46',
        rose: '#C96B6B',
      },
      fontFamily: {
        sans: ['Parkinsans', 'Instrument Sans', 'sans-serif'],
        brand: ['Parkinsans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;