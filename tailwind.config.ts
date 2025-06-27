// tailwind.config.ts

import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}', 
    './components/**/*.{ts,tsx}', 
    './pages/**/*.{ts,tsx}' // add all needed directories
  ],
  theme: {
    extend: {
      fontFamily: {
        neue: ['NeueMontreal', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
