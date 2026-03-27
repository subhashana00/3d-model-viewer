export interface ModelInfo {
  name: string
  size: string
  type: string
  source?: 'upload' | 'depth-generated'
}

export interface ShadowLayer {
  enabled: boolean
  color: string
  opacity: number
  blur: number
  offsetX: number
  offsetY: number
}

export interface ShadowSettings {
  dropShadow: ShadowLayer
  innerShadow: ShadowLayer
  contactShadow: boolean
  contactShadowOpacity: number
}

export interface SceneSettings {
  backgroundColor: string
  backgroundTransparent: boolean
  lightingIntensity: number
  lightingPreset: 'soft' | 'studio' | 'dramatic'
  showWireframe: boolean
  showGrid: boolean
  modelColor: string
  useCustomColor: boolean
  showShadows: boolean
  shadowSettings: ShadowSettings
}

export interface ExportSettings {
  resolution: '1k' | '2k' | '4k'
  format: 'png' | 'jpeg'
  aspectRatio: '1:1' | '4:3' | '16:9'
}

export interface DepthSettings {
  depthStrength: number
  meshResolution: number
  smoothness: number
  addThickness: boolean
}

export interface DepthModelData {
  imageDataUrl: string
  depthDataUrl: string
  width: number
  height: number
}

export interface ViewerControls {
  resetCamera: () => void
  setCameraPreset: (preset: 'front' | 'top' | 'isometric') => void
  exportImage: (settings: ExportSettings) => void
  exportModel: () => void
}

export interface LightingConfig {
  ambient: { color: number; intensity: number }
  hemisphere: { skyColor: number; groundColor: number; intensity: number }
  directional: Array<{ color: number; intensity: number; position: [number, number, number] }>
}

export type LightingPresets = Record<string, LightingConfig>

export type AppMode = 'upload' | 'depth'
