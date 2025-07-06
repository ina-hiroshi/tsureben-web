/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        script: ['"Dancing Script"', 'cursive'],
      },
      animation: {
        marqueeVertical: 'marqueeVertical 30s linear infinite',
      },
      keyframes: {
        marqueeVertical: {
          '0%': { transform: 'translateY(0%)' },
          '100%': { transform: 'translateY(-50%)' }, // ← 全体の半分だけ上へ
        },
      },
    },
  },
  plugins: [],
};