import { useState } from 'react'
import { SceneSettings, ExportSettings, DepthSettings, ShadowSettings, ShadowLayer } from '@/types'

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

// Helper: Figma-style shadow layer editor
function ShadowLayerEditor({
  label,
  icon,
  layer,
  onChange,
  accentColor,
}: {
  label: string
  icon: React.ReactNode
  layer: ShadowLayer
  onChange: (layer: ShadowLayer) => void
  accentColor?: string
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="shadow-layer-card">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <button
          className="flex items-center gap-2 flex-1 text-left"
          onClick={() => setExpanded(!expanded)}
        >
          <span className={`shadow-layer-icon ${layer.enabled ? 'active' : ''}`} style={layer.enabled && accentColor ? { background: accentColor } : {}}>
            {icon}
          </span>
          <div className="flex flex-col">
            <span className="text-[13px] font-medium text-white/80">{label}</span>
            {layer.enabled && !expanded && (
              <span className="text-[10px] text-white/30">
                {layer.opacity.toFixed(0)}% • Blur {layer.blur}
              </span>
            )}
          </div>
          <svg
            className={`w-3.5 h-3.5 text-white/30 ml-auto transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        <button
          className={`toggle-switch ${layer.enabled ? 'active' : ''}`}
          onClick={() => onChange({ ...layer, enabled: !layer.enabled })}
        >
          <span className="toggle-knob" />
        </button>
      </div>

      {/* Expanded controls */}
      {expanded && layer.enabled && (
        <div className="mt-3 pl-1 space-y-2.5 shadow-layer-controls">
          {/* Color */}
          <div className="flex items-center justify-between gap-2">
            <label className="text-[12px] text-white/50">Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={layer.color}
                onChange={(e) => onChange({ ...layer, color: e.target.value })}
                className="w-8 h-6 cursor-pointer"
              />
              <span className="text-[11px] text-white/30 font-mono uppercase w-[52px]">{layer.color}</span>
            </div>
          </div>

          {/* Opacity */}
          <div className="flex items-center justify-between gap-2">
            <label className="text-[12px] text-white/50">Opacity</label>
            <div className="flex items-center gap-2 flex-1 max-w-[140px]">
              <input
                type="range" min="0" max="1" step="0.05"
                value={layer.opacity}
                onChange={(e) => onChange({ ...layer, opacity: parseFloat(e.target.value) })}
                className="flex-1 cursor-pointer min-w-0"
              />
              <span className="text-[11px] text-white/30 w-[28px] text-right">{Math.round(layer.opacity * 100)}%</span>
            </div>
          </div>

          {/* Blur */}
          <div className="flex items-center justify-between gap-2">
            <label className="text-[12px] text-white/50">Blur</label>
            <div className="flex items-center gap-2 flex-1 max-w-[140px]">
              <input
                type="range" min="0" max="20" step="1"
                value={layer.blur}
                onChange={(e) => onChange({ ...layer, blur: parseInt(e.target.value) })}
                className="flex-1 cursor-pointer min-w-0"
              />
              <span className="text-[11px] text-white/30 w-[28px] text-right">{layer.blur}</span>
            </div>
          </div>

          {/* Offset X */}
          <div className="flex items-center justify-between gap-2">
            <label className="text-[12px] text-white/50">X offset</label>
            <div className="flex items-center gap-2 flex-1 max-w-[140px]">
              <input
                type="range" min="-10" max="10" step="0.5"
                value={layer.offsetX}
                onChange={(e) => onChange({ ...layer, offsetX: parseFloat(e.target.value) })}
                className="flex-1 cursor-pointer min-w-0"
              />
              <span className="text-[11px] text-white/30 w-[28px] text-right">{layer.offsetX}</span>
            </div>
          </div>

          {/* Offset Y */}
          <div className="flex items-center justify-between gap-2">
            <label className="text-[12px] text-white/50">Y offset</label>
            <div className="flex items-center gap-2 flex-1 max-w-[140px]">
              <input
                type="range" min="-10" max="10" step="0.5"
                value={layer.offsetY}
                onChange={(e) => onChange({ ...layer, offsetY: parseFloat(e.target.value) })}
                className="flex-1 cursor-pointer min-w-0"
              />
              <span className="text-[11px] text-white/30 w-[28px] text-right">{layer.offsetY}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ControlsPanel({
  settings, exportSettings, onSettingChange, onExportSettingChange,
  onCameraReset, onCameraPreset, showModelExport, onExportModel,
  isDepthMode, depthSettings, onDepthSettingChange
}: ControlsPanelProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const updateShadowSettings = (updates: Partial<ShadowSettings>) => {
    onSettingChange('shadowSettings', {
      ...settings.shadowSettings,
      ...updates,
    })
  }

  const updateDropShadow = (layer: ShadowLayer) => {
    updateShadowSettings({ dropShadow: layer })
  }

  const updateInnerShadow = (layer: ShadowLayer) => {
    updateShadowSettings({ innerShadow: layer })
  }

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        className="controls-toggle-btn"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle controls"
      >
        {mobileOpen ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        )}
      </button>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="controls-backdrop"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Controls Panel */}
      <div className={`controls-panel ${mobileOpen ? 'open' : ''}`}>
        {/* Mobile Drag Handle */}
        <div className="controls-drag-handle">
          <div className="drag-handle-bar" />
        </div>

        {/* Depth Controls (depth mode only) */}
        {isDepthMode && depthSettings && onDepthSettingChange && (
          <section className="pb-3 mb-3 border-b border-white/10">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-white/40 mb-3">Depth Controls</h3>
            <div className="flex items-center justify-between gap-2 mb-2">
              <label className="text-[13px] text-white/60 shrink-0">Strength</label>
              <input type="range" min="0.05" max="2" step="0.05"
                value={depthSettings.depthStrength}
                onChange={(e) => onDepthSettingChange('depthStrength', parseFloat(e.target.value))}
                className="flex-1 cursor-pointer min-w-0" />
              <span className="text-[12px] text-white/40 min-w-[28px] text-right">{depthSettings.depthStrength.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <label className="text-[13px] text-white/60 shrink-0">Resolution</label>
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
              <label className="text-[13px] text-white/60 shrink-0">Smoothness</label>
              <input type="range" min="0" max="5" step="1"
                value={depthSettings.smoothness}
                onChange={(e) => onDepthSettingChange('smoothness', parseInt(e.target.value))}
                className="flex-1 cursor-pointer min-w-0" />
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

        {/* ===== SHADOWS (Figma-Style) ===== */}
        <section className="pb-3 mb-3 border-b border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Shadows</h3>
            <button
              className={`toggle-switch ${settings.showShadows ? 'active' : ''}`}
              onClick={() => onSettingChange('showShadows', !settings.showShadows)}
            >
              <span className="toggle-knob" />
            </button>
          </div>

          {settings.showShadows && (
            <div className="space-y-2">
              {/* Drop Shadow */}
              <ShadowLayerEditor
                label="Drop Shadow"
                accentColor="rgba(99,102,241,0.3)"
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="4" y="4" width="16" height="16" rx="2"/>
                    <path d="M8 20h12a2 2 0 0 0 2-2V8" opacity="0.4"/>
                  </svg>
                }
                layer={settings.shadowSettings.dropShadow}
                onChange={updateDropShadow}
              />

              {/* Inner Shadow */}
              <ShadowLayerEditor
                label="Inner Shadow"
                accentColor="rgba(168,85,247,0.3)"
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <rect x="7" y="7" width="10" height="10" rx="1" opacity="0.4"/>
                  </svg>
                }
                layer={settings.shadowSettings.innerShadow}
                onChange={updateInnerShadow}
              />

              {/* Contact Shadow */}
              <div className="shadow-layer-card">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`shadow-layer-icon ${settings.shadowSettings.contactShadow ? 'active' : ''}`}
                      style={settings.shadowSettings.contactShadow ? { background: 'rgba(236,72,153,0.3)' } : {}}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <ellipse cx="12" cy="18" rx="8" ry="3"/>
                        <path d="M12 2v12" opacity="0.4"/>
                      </svg>
                    </span>
                    <div className="flex flex-col">
                      <span className="text-[13px] font-medium text-white/80">Contact Shadow</span>
                      {settings.shadowSettings.contactShadow && (
                        <span className="text-[10px] text-white/30">
                          {Math.round(settings.shadowSettings.contactShadowOpacity * 100)}% opacity
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    className={`toggle-switch ${settings.shadowSettings.contactShadow ? 'active' : ''}`}
                    onClick={() => updateShadowSettings({ contactShadow: !settings.shadowSettings.contactShadow })}
                  >
                    <span className="toggle-knob" />
                  </button>
                </div>
                {settings.shadowSettings.contactShadow && (
                  <div className="mt-3 pl-1">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[12px] text-white/50">Opacity</label>
                      <div className="flex items-center gap-2 flex-1 max-w-[140px]">
                        <input
                          type="range" min="0" max="1" step="0.05"
                          value={settings.shadowSettings.contactShadowOpacity}
                          onChange={(e) => updateShadowSettings({ contactShadowOpacity: parseFloat(e.target.value) })}
                          className="flex-1 cursor-pointer min-w-0"
                        />
                        <span className="text-[11px] text-white/30 w-[28px] text-right">
                          {Math.round(settings.shadowSettings.contactShadowOpacity * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Lighting */}
        <section className="pb-3 mb-3 border-b border-white/10">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-white/40 mb-3">Lighting</h3>
          <div className="flex items-center justify-between gap-2 mb-2">
            <label className="text-[13px] text-white/60 shrink-0">Intensity</label>
            <input type="range" min="0.1" max="2" step="0.1"
              value={settings.lightingIntensity}
              onChange={(e) => onSettingChange('lightingIntensity', parseFloat(e.target.value))}
              className="flex-1 cursor-pointer min-w-0" />
            <span className="text-[12px] text-white/40 min-w-[28px] text-right">{settings.lightingIntensity.toFixed(1)}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <label className="text-[13px] text-white/60 shrink-0">Preset</label>
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
            <label className="text-[13px] text-white/60 shrink-0">Presets</label>
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
            <label className="text-[13px] text-white/60 shrink-0">Resolution</label>
            <div className="flex gap-1">
              {(['1k', '2k', '4k'] as const).map((res) => (
                <button key={res} className={`btn-preset ${exportSettings.resolution === res ? 'active' : ''}`}
                  onClick={() => onExportSettingChange('resolution', res)}>{res.toUpperCase()}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <label className="text-[13px] text-white/60 shrink-0">Format</label>
            <div className="flex gap-1">
              {(['png', 'jpeg'] as const).map((fmt) => (
                <button key={fmt} className={`btn-preset ${exportSettings.format === fmt ? 'active' : ''}`}
                  onClick={() => onExportSettingChange('format', fmt)}>{fmt.toUpperCase()}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <label className="text-[13px] text-white/60 shrink-0">Aspect</label>
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
    </>
  )
}

export default ControlsPanel
