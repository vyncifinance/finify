/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary:  '#0E3B2E',
        gold:     '#C7A15A',
        success:  '#059669',
        danger:   '#DC2626',
      },
    },
  },
  plugins: [],
}