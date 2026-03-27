import { LightingPresets } from '@/types'

export const LIGHTING_PRESETS: LightingPresets = {
  soft: {
    ambient: { color: 0xffffff, intensity: 0.6 },
    hemisphere: { skyColor: 0xffffff, groundColor: 0x444444, intensity: 0.4 },
    directional: [
      { color: 0xffffff, intensity: 0.5, position: [5, 5, 5] }
    ]
  },
  studio: {
    ambient: { color: 0xffffff, intensity: 0.4 },
    hemisphere: { skyColor: 0xffffff, groundColor: 0x080820, intensity: 0.5 },
    directional: [
      { color: 0xffffff, intensity: 0.8, position: [5, 10, 7.5] },
      { color: 0xffffff, intensity: 0.3, position: [-5, 5, -5] }
    ]
  },
  dramatic: {
    ambient: { color: 0x404040, intensity: 0.2 },
    hemisphere: { skyColor: 0x0077ff, groundColor: 0x080820, intensity: 0.3 },
    directional: [
      { color: 0xffffff, intensity: 1.2, position: [10, 10, 5] },
      { color: 0x4488ff, intensity: 0.4, position: [-5, 0, -5] }
    ]
  }
}
