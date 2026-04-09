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
        obsidian: '#0A0A0C',
        graphite: '#141418',
        slate: '#1E1E24',
        pearl: '#F0F0F2',
        ash: '#8A8A96',
        mahogany: '#B87B5A',
        sage: '#6DB88A',
        amber: '#D4A85A',
        rose: '#C96B6B',
      },
      fontFamily: {
        sans: ['Instrument Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;