import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Minitab primary blue
        minitab: {
          blue:     '#0083CA',
          'blue-d': '#006aaa',
          'blue-l': '#e6f3fb',
        },
        // Gauge 색상 기준 (사양서 §5.2)
        gauge: {
          red:    '#EF4444',
          yellow: '#F59E0B',
          green:  '#22C55E',
          blue:   '#0083CA',
        },
        // DPMO 색상 기준 (사양서 §7.3)
        dpmo: {
          red:    '#EF4444',
          yellow: '#F59E0B',
          green:  '#22C55E',
          blue:   '#0083CA',
        },
      },
    },
  },
  plugins: [],
}

export default config
