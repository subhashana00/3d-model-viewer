import { SceneSettings, ExportSettings, DepthSettings } from '@/types'

interface ControlsPanelProps {
  settings: SceneSettings
  exportSettings: ExportSettings
  onSettingChange: <K extends keyof SceneSettings>(key: K, value: SceneSettings[K]) => void
  onExportSettingChange: <K extends keyof ExportSettings>(key: K, value: ExportSettings[K]) => void
  onCameraReset: () => void
  onCameraPreset: (preset: 'front' | 'top' | 'isometric') => void
  showModelExport?: boolean
  onExportModel?: () => void
  isDepthMode?: boolean
  depthSettings?: DepthSettings
  onDepthSettingChange?: <K extends keyof DepthSettings>(key: K, value: DepthSettings[K]) => void
}

function ControlsPanel({
  settings, exportSettings, onSettingChange, onExportSettingChange,
  onCameraReset, onCameraPreset, showModelExport, onExportModel,
  isDepthMode, depthSettings, onDepthSettingChange
}: ControlsPanelProps) {
  return (
    <div className="fixed top-4 right-4 bottom-4 w-[280px] overflow-y-auto p-5 rounded-2xl z-50 glass animate-slide-in-right">

      {/* Depth Controls (depth mode only) */}
      {isDepthMode && depthSettings && onDepthSettingChange && (
        <section className="pb-3 mb-3 border-b border-white/10">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-white/40 mb-3">Depth Controls</h3>
          <div className="flex items-center justify-between gap-2 mb-2">
            <label className="text-[13px] text-white/60">Strength</label>
            <input type="range" min="0.05" max="2" step="0.05"
              value={depthSettings.depthStrength}
              onChange={(e) => onDepthSettingChange('depthStrength', parseFloat(e.target.value))}
              className="flex-1 cursor-pointer" />
            <span className="text-[12px] text-white/40 min-w-[28px] text-right">{depthSettings.depthStrength.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <label className="text-[13px] text-white/60">Resolution</label>
            <div className="flex gap-1">
              {([64, 128, 256] as const).map((res) => (
                <button key={res}
                  className={`btn-preset ${depthSettings.meshResolution === res ? 'active' : ''}`}
                  onClick={() => onDepthSettingChange('meshResolution', res)}>
                  {res}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <label className="text-[13px] text-white/60">Smoothness</label>
            <input type="range" min="0" max="5" step="1"
              value={depthSettings.smoothness}
              onChange={(e) => onDepthSettingChange('smoothness', parseInt(e.target.value))}
              className="flex-1 cursor-pointer" />
            <span className="text-[12px] text-white/40 min-w-[28px] text-right">{depthSettings.smoothness}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <label className="text-[13px] text-white/60">Thickness</label>
            <button
              className={`toggle-switch ${depthSettings.addThickness ? 'active' : ''}`}
              onClick={() => onDepthSettingChange('addThickness', !depthSettings.addThickness)}>
              <span className="toggle-knob" />
            </button>
          </div>
        </section>
      )}

      {/* Background */}
      <section className="pb-3 mb-3 border-b border-white/10">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-white/40 mb-3">Background</h3>
        <div className="flex items-center justify-between gap-2 mb-2">
          <label className="text-[13px] text-white/60">Transparent</label>
          <button className={`toggle-switch ${settings.backgroundTransparent ? 'active' : ''}`}
            onClick={() => onSettingChange('backgroundTransparent', !settings.backgroundTransparent)}>
            <span className="toggle-knob" />
          </button>
        </div>
        {!settings.backgroundTransparent && (
          <div className="flex items-center justify-between gap-2">
            <label className="text-[13px] text-white/60">Color</label>
            <input type="color" value={settings.backgroundColor}
              onChange={(e) => onSettingChange('backgroundColor', e.target.value)} className="w-11 h-7 cursor-pointer" />
          </div>
        )}
      </section>

      {/* Model Appearance */}
      <section className="pb-3 mb-3 border-b border-white/10">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-white/40 mb-3">Model Appearance</h3>
        {!isDepthMode && (
          <>
            <div className="flex items-center justify-between gap-2 mb-2">
              <label className="text-[13px] text-white/60">Custom Color</label>
              <button className={`toggle-switch ${settings.useCustomColor ? 'active' : ''}`}
                onClick={() => onSettingChange('useCustomColor', !settings.useCustomColor)}>
                <span className="toggle-knob" />
              </button>
            </div>
            {settings.useCustomColor && (
              <div className="flex items-center justify-between gap-2 mb-2">
                <label className="text-[13px] text-white/60">Color</label>
                <input type="color" value={settings.modelColor}
                  onChange={(e) => onSettingChange('modelColor', e.target.value)} className="w-11 h-7 cursor-pointer" />
              </div>
            )}
          </>
        )}
        <div className="flex items-center justify-between gap-2 mb-2">
          <label className="text-[13px] text-white/60">Shadows</label>
          <button className={`toggle-switch ${settings.showShadows ? 'active' : ''}`}
            onClick={() => onSettingChange('showShadows', !settings.showShadows)}>
            <span className="toggle-knob" />
          </button>
        </div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <label className="text-[13px] text-white/60">Wireframe</label>
          <button className={`toggle-switch ${settings.showWireframe ? 'active' : ''}`}
            onClick={() => onSettingChange('showWireframe', !settings.showWireframe)}>
            <span className="toggle-knob" />
          </button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <label className="text-[13px] text-white/60">Grid</label>
          <button className={`toggle-switch ${settings.showGrid ? 'active' : ''}`}
            onClick={() => onSettingChange('showGrid', !settings.showGrid)}>
            <span className="toggle-knob" />
          </button>
        </div>
      </section>

      {/* Lighting */}
      <section className="pb-3 mb-3 border-b border-white/10">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-white/40 mb-3">Lighting</h3>
        <div className="flex items-center justify-between gap-2 mb-2">
          <label className="text-[13px] text-white/60">Intensity</label>
          <input type="range" min="0.1" max="2" step="0.1"
            value={settings.lightingIntensity}
            onChange={(e) => onSettingChange('lightingIntensity', parseFloat(e.target.value))}
            className="flex-1 cursor-pointer" />
          <span className="text-[12px] text-white/40 min-w-[28px] text-right">{settings.lightingIntensity.toFixed(1)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <label className="text-[13px] text-white/60">Preset</label>
          <div className="flex gap-1">
            {(['soft', 'studio', 'dramatic'] as const).map((preset) => (
              <button key={preset}
                className={`btn-preset ${settings.lightingPreset === preset ? 'active' : ''}`}
                onClick={() => onSettingChange('lightingPreset', preset)}>
                {preset.charAt(0).toUpperCase() + preset.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Camera */}
      <section className="pb-3 mb-3 border-b border-white/10">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-white/40 mb-3">Camera</h3>
        <button className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[13px] font-medium text-white/60 bg-white/5 rounded-xl mb-2 hover:bg-white/[0.08] hover:text-white transition-all"
          onClick={onCameraReset}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
          </svg>
          Reset View
        </button>
        <div className="flex items-center justify-between gap-2">
          <label className="text-[13px] text-white/60">Presets</label>
          <div className="flex gap-1">
            {(['front', 'top', 'isometric'] as const).map((preset) => (
              <button key={preset} className="btn-preset" onClick={() => onCameraPreset(preset)}>
                {preset.charAt(0).toUpperCase() + preset.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Export */}
      <section>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-white/40 mb-3">Export Settings</h3>
        <div className="flex items-center justify-between gap-2 mb-2">
          <label className="text-[13px] text-white/60">Resolution</label>
          <div className="flex gap-1">
            {(['1k', '2k', '4k'] as const).map((res) => (
              <button key={res} className={`btn-preset ${exportSettings.resolution === res ? 'active' : ''}`}
                onClick={() => onExportSettingChange('resolution', res)}>{res.toUpperCase()}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <label className="text-[13px] text-white/60">Format</label>
          <div className="flex gap-1">
            {(['png', 'jpeg'] as const).map((fmt) => (
              <button key={fmt} className={`btn-preset ${exportSettings.format === fmt ? 'active' : ''}`}
                onClick={() => onExportSettingChange('format', fmt)}>{fmt.toUpperCase()}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <label className="text-[13px] text-white/60">Aspect</label>
          <div className="flex gap-1">
            {(['1:1', '4:3', '16:9'] as const).map((ratio) => (
              <button key={ratio} className={`btn-preset ${exportSettings.aspectRatio === ratio ? 'active' : ''}`}
                onClick={() => onExportSettingChange('aspectRatio', ratio)}>{ratio}</button>
            ))}
          </div>
        </div>

        {showModelExport && onExportModel && (
          <button onClick={onExportModel}
            className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-medium text-white bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download GLB Model
          </button>
        )}
      </section>
    </div>
  )
}

export default ControlsPanel
