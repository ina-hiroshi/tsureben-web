export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        tsure: {
          bg: '#4b4039',
          surface: '#ede3d2',
          'surface-hover': '#f5ebe0',
          primary: '#5a3e28',
          accent: '#ffa726',
          'accent-hover': '#ffbd4a',
          'on-primary': '#ede3d2',
          border: '#c4b5a0',
          live: '#ff7043',
          muted: '#8f735a',
          overlay: 'rgba(42, 33, 28, 0.6)',
        },
      },
      fontFamily: {
        script: ['"Dancing Script"', 'cursive'],
        sans: ['"Noto Sans JP"', 'system-ui', 'sans-serif'],
      },
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
      boxShadow: {
        'tsure-raised':
          '0 1px 0 rgba(237, 227, 210, 0.55) inset, 0 2px 0 rgba(90, 62, 40, 0.14), 0 5px 16px rgba(42, 33, 28, 0.3)',
        'tsure-button':
          '0 2px 0 rgba(90, 62, 40, 0.24), 0 4px 10px rgba(42, 33, 28, 0.26)',
        'tsure-chip':
          '0 1px 0 rgba(90, 62, 40, 0.1), 0 2px 6px rgba(42, 33, 28, 0.2)',
      },
    },
  },
  plugins: [],
};
