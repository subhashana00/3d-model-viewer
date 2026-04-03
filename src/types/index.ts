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

/** A single material entry discovered on the model */
export interface MaterialEntry {
  id: string            // unique key (mesh uuid + material index)
  name: string          // display name
  meshName: string      // parent mesh name
  originalColor: string // hex color at load time
  currentColor: string  // current hex color
  hasTexture: boolean   // whether material has a texture map
}

/** Rim light settings */
export interface RimLightSettings {
  enabled: boolean
  color: string
  intensity: number
}

/** Spot light settings */
export interface SpotLightSettings {
  enabled: boolean
  color: string
  intensity: number
  angle: number      // 0.1 – 1.0 (fraction of PI/2)
  penumbra: number   // 0 – 1
  positionAngle: number  // degrees 0–360 around the model
  height: number     // 1 – 10
}

/** Bloom / glow settings */
export interface BloomSettings {
  enabled: boolean
  intensity: number  // 0 – 2
  threshold: number  // 0 – 1
  radius: number     // 0 – 1
}

export type EnvironmentPreset = 'none' | 'studio' | 'sunset' | 'dawn' | 'night' | 'warehouse'

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
  // Advanced lighting
  exposure: number             // 0.5 – 3
  colorTemperature: number     // -100 (cool) to +100 (warm)
  environmentPreset: EnvironmentPreset
  envIntensity: number         // 0 – 2
  rimLight: RimLightSettings
  spotLight: SpotLightSettings
  bloom: BloomSettings
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

export type TransformMode = 'orbit' | 'grab' | 'rotate' | 'scale'

export interface ViewerControls {
  resetCamera: () => void
  setCameraPreset: (preset: 'front' | 'top' | 'isometric') => void
  exportImage: (settings: ExportSettings) => void
  exportModel: () => void
  setTransformMode: (mode: TransformMode) => void
  resetModelTransform: () => void
  getMaterials: () => MaterialEntry[]
  setMaterialColor: (materialId: string, color: string) => void
  resetMaterialColors: () => void
}

export interface LightingConfig {
  ambient: { color: number; intensity: number }
  hemisphere: { skyColor: number; groundColor: number; intensity: number }
  directional: Array<{ color: number; intensity: number; position: [number, number, number] }>
}

export type LightingPresets = Record<string, LightingConfig>

export type AppMode = 'upload' | 'depth'

/** Snapshot for undo/redo */
export interface AppSnapshot {
  settings: SceneSettings
  materialColors: Record<string, string>  // materialId -> hex
}
