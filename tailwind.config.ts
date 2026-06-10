import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary:  '#0E3B2E',
        gold:     '#C7A15A',
        success:  '#059669',
        danger:   '#DC2626',
        surface:  '#FFFFFF',
        appbg:    '#F8F9FA',
        muted:    '#6B7280',
        border:   '#E5E7EB',
      },
    },
  },
  plugins: [],
}

export default config