import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Gauge 색상 기준 (사양서 §5.2)
        gauge: {
          red:    '#EF4444',  // Cpk/Ppk < 1.0
          yellow: '#F59E0B',  // 1.0 ~ 1.33
          green:  '#22C55E',  // >= 1.33
          blue:   '#3B82F6',  // >= 1.67
        },
        // DPMO 색상 기준 (사양서 §7.3)
        dpmo: {
          red:    '#EF4444',  // > 1,000
          yellow: '#F59E0B',  // 63 ~ 1,000
          green:  '#22C55E',  // < 63
          blue:   '#3B82F6',  // < 1
        },
      },
    },
  },
  plugins: [],
}

export default config
