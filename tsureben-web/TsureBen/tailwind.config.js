// tailwind.config.js

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
        marqueeVertical: 'marqueeVertical var(--marquee-duration, 30s) linear infinite',
        marqueeHorizontal: 'marqueeHorizontal var(--marquee-duration, 30s) linear infinite', // ← 追加
      },
      keyframes: {
        marqueeVertical: {
          '0%': { transform: 'translateY(0%)' },
          '100%': { transform: 'translateY(-50%)' },
        },
        marqueeHorizontal: { // ← 追加
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
};