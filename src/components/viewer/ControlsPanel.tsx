import { useState } from 'react'
import { SceneSettings, ExportSettings, DepthSettings, ShadowSettings, ShadowLayer, MaterialEntry, EnvironmentPreset } from '@/types'

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
  // Per-part material editing
  materials: MaterialEntry[]
  onMaterialColorChange?: (materialId: string, color: string) => void
  onResetMaterialColors?: () => void
  selectedMaterialId?: string | null
  onMaterialSelect?: (materialId: string | null) => void
}

// Collapsible section with Figma-style header
function PanelSection({ title, icon, children, defaultOpen = true }: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className="panel-section">
      <button className="panel-section-header" onClick={() => setOpen(!open)}>
        <div className="panel-section-title">
          {icon && <span className="panel-section-icon">{icon}</span>}
          {title}
        </div>
        <svg
          className={`panel-section-chevron ${open ? 'open' : ''}`}
          width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && <div className="panel-section-content">{children}</div>}
    </section>
  )
}

// Figma-style property row
function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="prop-row">
      <label className="prop-label">{label}</label>
      <div className="prop-value">{children}</div>
    </div>
  )
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
            <span className="text-[12px] font-medium" style={{ color: 'var(--figma-text)' }}>{label}</span>
            {layer.enabled && !expanded && (
              <span className="text-[10px]" style={{ color: 'var(--figma-text-tertiary)' }}>
                {Math.round(layer.opacity * 100)}% · Blur {layer.blur}
              </span>
            )}
          </div>
          <svg
            className={`w-3 h-3 ml-auto transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            style={{ color: 'var(--figma-text-tertiary)' }}
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
        <div className="mt-2 pl-1 space-y-2 shadow-layer-controls">
          <PropRow label="Color">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={layer.color}
                onChange={(e) => onChange({ ...layer, color: e.target.value })}
                className="w-7 h-5 cursor-pointer"
              />
              <span className="text-[10px] font-mono uppercase" style={{ color: 'var(--figma-text-tertiary)' }}>{layer.color}</span>
            </div>
          </PropRow>

          <PropRow label="Opacity">
            <div className="flex items-center gap-2 flex-1">
              <input
                type="range" min="0" max="1" step="0.05"
                value={layer.opacity}
                onChange={(e) => onChange({ ...layer, opacity: parseFloat(e.target.value) })}
                className="flex-1 cursor-pointer min-w-0"
              />
              <span className="text-[10px] w-[26px] text-right" style={{ color: 'var(--figma-text-tertiary)' }}>{Math.round(layer.opacity * 100)}%</span>
            </div>
          </PropRow>

          <PropRow label="Blur">
            <div className="flex items-center gap-2 flex-1">
              <input
                type="range" min="0" max="20" step="1"
                value={layer.blur}
                onChange={(e) => onChange({ ...layer, blur: parseInt(e.target.value) })}
                className="flex-1 cursor-pointer min-w-0"
              />
              <span className="text-[10px] w-[26px] text-right" style={{ color: 'var(--figma-text-tertiary)' }}>{layer.blur}</span>
            </div>
          </PropRow>

          <PropRow label="X Offset">
            <div className="flex items-center gap-2 flex-1">
              <input
                type="range" min="-10" max="10" step="0.5"
                value={layer.offsetX}
                onChange={(e) => onChange({ ...layer, offsetX: parseFloat(e.target.value) })}
                className="flex-1 cursor-pointer min-w-0"
              />
              <span className="text-[10px] w-[26px] text-right" style={{ color: 'var(--figma-text-tertiary)' }}>{layer.offsetX}</span>
            </div>
          </PropRow>

          <PropRow label="Y Offset">
            <div className="flex items-center gap-2 flex-1">
              <input
                type="range" min="-10" max="10" step="0.5"
                value={layer.offsetY}
                onChange={(e) => onChange({ ...layer, offsetY: parseFloat(e.target.value) })}
                className="flex-1 cursor-pointer min-w-0"
              />
              <span className="text-[10px] w-[26px] text-right" style={{ color: 'var(--figma-text-tertiary)' }}>{layer.offsetY}</span>
            </div>
          </PropRow>
        </div>
      )}
    </div>
  )
}

function ControlsPanel({
  settings, exportSettings, onSettingChange, onExportSettingChange,
  onCameraReset, onCameraPreset, showModelExport, onExportModel,
  isDepthMode, depthSettings, onDepthSettingChange,
  materials, onMaterialColorChange, onResetMaterialColors,
  selectedMaterialId, onMaterialSelect
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
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

        {/* Panel Title */}
        <div className="panel-title-bar">
          <span className="panel-title">Design</span>
        </div>

        {/* Depth Controls (depth mode only) */}
        {isDepthMode && depthSettings && onDepthSettingChange && (
          <PanelSection title="Depth" icon={
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          }>
            <PropRow label="Strength">
              <div className="flex items-center gap-2 flex-1">
                <input type="range" min="0.05" max="2" step="0.05"
                  value={depthSettings.depthStrength}
                  onChange={(e) => onDepthSettingChange('depthStrength', parseFloat(e.target.value))}
                  className="flex-1 cursor-pointer min-w-0" />
                <span className="prop-number">{depthSettings.depthStrength.toFixed(2)}</span>
              </div>
            </PropRow>
            <PropRow label="Resolution">
              <div className="flex gap-1">
                {([64, 128, 256] as const).map((res) => (
                  <button key={res}
                    className={`btn-preset ${depthSettings.meshResolution === res ? 'active' : ''}`}
                    onClick={() => onDepthSettingChange('meshResolution', res)}>
                    {res}
                  </button>
                ))}
              </div>
            </PropRow>
            <PropRow label="Smoothness">
              <div className="flex items-center gap-2 flex-1">
                <input type="range" min="0" max="5" step="1"
                  value={depthSettings.smoothness}
                  onChange={(e) => onDepthSettingChange('smoothness', parseInt(e.target.value))}
                  className="flex-1 cursor-pointer min-w-0" />
                <span className="prop-number">{depthSettings.smoothness}</span>
              </div>
            </PropRow>
            <PropRow label="Thickness">
              <button
                className={`toggle-switch ${depthSettings.addThickness ? 'active' : ''}`}
                onClick={() => onDepthSettingChange('addThickness', !depthSettings.addThickness)}>
                <span className="toggle-knob" />
              </button>
            </PropRow>
          </PanelSection>
        )}

        {/* Background */}
        <PanelSection title="Background" icon={
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
          </svg>
        }>
          <PropRow label="Transparent">
            <button className={`toggle-switch ${settings.backgroundTransparent ? 'active' : ''}`}
              onClick={() => onSettingChange('backgroundTransparent', !settings.backgroundTransparent)}>
              <span className="toggle-knob" />
            </button>
          </PropRow>
          {!settings.backgroundTransparent && (
            <PropRow label="Color">
              <input type="color" value={settings.backgroundColor}
                onChange={(e) => onSettingChange('backgroundColor', e.target.value)} className="w-8 h-6 cursor-pointer" />
            </PropRow>
          )}
        </PanelSection>

        {/* Fills & Materials */}
        <PanelSection title="Fill" icon={
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
          </svg>
        }>
          {!isDepthMode && (
            <>
              <PropRow label="Custom Color">
                <button className={`toggle-switch ${settings.useCustomColor ? 'active' : ''}`}
                  onClick={() => onSettingChange('useCustomColor', !settings.useCustomColor)}>
                  <span className="toggle-knob" />
                </button>
              </PropRow>
              {settings.useCustomColor && (
                <PropRow label="Color">
                  <input type="color" value={settings.modelColor}
                    onChange={(e) => onSettingChange('modelColor', e.target.value)} className="w-8 h-6 cursor-pointer" />
                </PropRow>
              )}
            </>
          )}
          <PropRow label="Wireframe">
            <button className={`toggle-switch ${settings.showWireframe ? 'active' : ''}`}
              onClick={() => onSettingChange('showWireframe', !settings.showWireframe)}>
              <span className="toggle-knob" />
            </button>
          </PropRow>
          <PropRow label="Grid">
            <button className={`toggle-switch ${settings.showGrid ? 'active' : ''}`}
              onClick={() => onSettingChange('showGrid', !settings.showGrid)}>
              <span className="toggle-knob" />
            </button>
          </PropRow>
        </PanelSection>

        {/* Per-Part Materials */}
        {!isDepthMode && materials.length > 0 && (
          <PanelSection title="Materials" icon={
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="13.5" cy="6.5" r="2.5"/>
              <circle cx="17.5" cy="15.5" r="2.5"/>
              <circle cx="8.5" cy="15.5" r="2.5"/>
            </svg>
          }>
            <div className="materials-list">
              {materials.map((mat) => (
                <div
                  key={mat.id}
                  className={`material-item ${selectedMaterialId === mat.id ? 'selected' : ''}`}
                  onClick={() => onMaterialSelect?.(selectedMaterialId === mat.id ? null : mat.id)}
                >
                  <div className="material-swatch-wrap">
                    <input
                      type="color"
                      value={mat.currentColor}
                      onChange={(e) => onMaterialColorChange?.(mat.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="material-swatch"
                      title={`Change color of ${mat.name}`}
                    />
                  </div>
                  <div className="material-info">
                    <span className="material-name">{mat.name}</span>
                    <span className="material-meta">
                      {mat.meshName}
                      {mat.hasTexture && <span className="material-tex-badge">TEX</span>}
                    </span>
                  </div>
                  {mat.currentColor !== mat.originalColor && (
                    <button
                      className="material-reset-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        onMaterialColorChange?.(mat.id, mat.originalColor)
                      }}
                      title="Reset to original color"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            {onResetMaterialColors && (
              <button className="panel-action-btn" onClick={onResetMaterialColors} style={{ marginTop: 6 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
                </svg>
                Reset All Colors
              </button>
            )}
          </PanelSection>
        )}

        {/* Shadows (Figma-Style) */}
        <PanelSection title="Shadow" icon={
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" opacity="0.3"/>
            <circle cx="12" cy="12" r="9"/>
          </svg>
        }>
          <PropRow label="Enabled">
            <button
              className={`toggle-switch ${settings.showShadows ? 'active' : ''}`}
              onClick={() => onSettingChange('showShadows', !settings.showShadows)}
            >
              <span className="toggle-knob" />
            </button>
          </PropRow>

          {settings.showShadows && (
            <div className="space-y-2 mt-1">
              {/* Drop Shadow */}
              <ShadowLayerEditor
                label="Drop Shadow"
                accentColor="rgba(99,102,241,0.2)"
                icon={
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                accentColor="rgba(168,85,247,0.2)"
                icon={
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                      style={settings.shadowSettings.contactShadow ? { background: 'rgba(236,72,153,0.2)' } : {}}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <ellipse cx="12" cy="18" rx="8" ry="3"/>
                        <path d="M12 2v12" opacity="0.4"/>
                      </svg>
                    </span>
                    <div className="flex flex-col">
                      <span className="text-[12px] font-medium" style={{ color: 'var(--figma-text)' }}>Contact Shadow</span>
                      {settings.shadowSettings.contactShadow && (
                        <span className="text-[10px]" style={{ color: 'var(--figma-text-tertiary)' }}>
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
                  <div className="mt-2 pl-1">
                    <PropRow label="Opacity">
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="range" min="0" max="1" step="0.05"
                          value={settings.shadowSettings.contactShadowOpacity}
                          onChange={(e) => updateShadowSettings({ contactShadowOpacity: parseFloat(e.target.value) })}
                          className="flex-1 cursor-pointer min-w-0"
                        />
                        <span className="text-[10px] w-[26px] text-right" style={{ color: 'var(--figma-text-tertiary)' }}>
                          {Math.round(settings.shadowSettings.contactShadowOpacity * 100)}%
                        </span>
                      </div>
                    </PropRow>
                  </div>
                )}
              </div>
            </div>
          )}
        </PanelSection>

        {/* Lighting */}
        <PanelSection title="Lighting" icon={
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
        }>
          <PropRow label="Intensity">
            <div className="flex items-center gap-2 flex-1">
              <input type="range" min="0.1" max="2" step="0.1"
                value={settings.lightingIntensity}
                onChange={(e) => onSettingChange('lightingIntensity', parseFloat(e.target.value))}
                className="flex-1 cursor-pointer min-w-0" />
              <span className="prop-number">{settings.lightingIntensity.toFixed(1)}</span>
            </div>
          </PropRow>
          <PropRow label="Preset">
            <div className="flex gap-1">
              {(['soft', 'studio', 'dramatic'] as const).map((preset) => (
                <button key={preset}
                  className={`btn-preset ${settings.lightingPreset === preset ? 'active' : ''}`}
                  onClick={() => onSettingChange('lightingPreset', preset)}>
                  {preset.charAt(0).toUpperCase() + preset.slice(1)}
                </button>
              ))}
            </div>
          </PropRow>

          {/* Exposure */}
          <PropRow label="Exposure">
            <div className="flex items-center gap-2 flex-1">
              <input type="range" min="0.5" max="3" step="0.1"
                value={settings.exposure}
                onChange={(e) => onSettingChange('exposure', parseFloat(e.target.value))}
                className="flex-1 cursor-pointer min-w-0" />
              <span className="prop-number">{settings.exposure.toFixed(1)}</span>
            </div>
          </PropRow>

          {/* Color Temperature */}
          <PropRow label="Temperature">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-[9px]" style={{ color: '#6ba3ff' }}>❄</span>
              <input type="range" min="-100" max="100" step="5"
                value={settings.colorTemperature}
                onChange={(e) => onSettingChange('colorTemperature', parseInt(e.target.value))}
                className="flex-1 cursor-pointer min-w-0 temp-slider" />
              <span className="text-[9px]" style={{ color: '#ffae42' }}>🔥</span>
            </div>
          </PropRow>
        </PanelSection>

        {/* Environment */}
        <PanelSection title="Environment" defaultOpen={false} icon={
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
        }>
          <PropRow label="Preset">
            <div className="flex gap-1 flex-wrap">
              {(['none', 'studio', 'sunset', 'dawn', 'night', 'warehouse'] as const).map((p) => (
                <button key={p}
                  className={`btn-preset ${settings.environmentPreset === p ? 'active' : ''}`}
                  onClick={() => onSettingChange('environmentPreset', p as EnvironmentPreset)}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </PropRow>
          {settings.environmentPreset !== 'none' && (
            <PropRow label="Intensity">
              <div className="flex items-center gap-2 flex-1">
                <input type="range" min="0" max="2" step="0.1"
                  value={settings.envIntensity}
                  onChange={(e) => onSettingChange('envIntensity', parseFloat(e.target.value))}
                  className="flex-1 cursor-pointer min-w-0" />
                <span className="prop-number">{settings.envIntensity.toFixed(1)}</span>
              </div>
            </PropRow>
          )}
        </PanelSection>

        {/* Rim Light */}
        <PanelSection title="Rim Light" defaultOpen={false} icon={
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3v1m0 16v1m-8-9H3m18 0h-1m-2.636-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707"/>
            <circle cx="12" cy="12" r="4" strokeWidth="2.5"/>
          </svg>
        }>
          <PropRow label="Enabled">
            <button className={`toggle-switch ${settings.rimLight.enabled ? 'active' : ''}`}
              onClick={() => onSettingChange('rimLight', { ...settings.rimLight, enabled: !settings.rimLight.enabled })}>
              <span className="toggle-knob" />
            </button>
          </PropRow>
          {settings.rimLight.enabled && (
            <>
              <PropRow label="Color">
                <input type="color" value={settings.rimLight.color}
                  onChange={(e) => onSettingChange('rimLight', { ...settings.rimLight, color: e.target.value })}
                  className="w-8 h-6 cursor-pointer" />
              </PropRow>
              <PropRow label="Intensity">
                <div className="flex items-center gap-2 flex-1">
                  <input type="range" min="0.1" max="3" step="0.1"
                    value={settings.rimLight.intensity}
                    onChange={(e) => onSettingChange('rimLight', { ...settings.rimLight, intensity: parseFloat(e.target.value) })}
                    className="flex-1 cursor-pointer min-w-0" />
                  <span className="prop-number">{settings.rimLight.intensity.toFixed(1)}</span>
                </div>
              </PropRow>
            </>
          )}
        </PanelSection>

        {/* Spot Light */}
        <PanelSection title="Spot Light" defaultOpen={false} icon={
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18h6"/><path d="M10 22h4"/>
            <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7z"/>
          </svg>
        }>
          <PropRow label="Enabled">
            <button className={`toggle-switch ${settings.spotLight.enabled ? 'active' : ''}`}
              onClick={() => onSettingChange('spotLight', { ...settings.spotLight, enabled: !settings.spotLight.enabled })}>
              <span className="toggle-knob" />
            </button>
          </PropRow>
          {settings.spotLight.enabled && (
            <>
              <PropRow label="Color">
                <input type="color" value={settings.spotLight.color}
                  onChange={(e) => onSettingChange('spotLight', { ...settings.spotLight, color: e.target.value })}
                  className="w-8 h-6 cursor-pointer" />
              </PropRow>
              <PropRow label="Intensity">
                <div className="flex items-center gap-2 flex-1">
                  <input type="range" min="0.1" max="5" step="0.1"
                    value={settings.spotLight.intensity}
                    onChange={(e) => onSettingChange('spotLight', { ...settings.spotLight, intensity: parseFloat(e.target.value) })}
                    className="flex-1 cursor-pointer min-w-0" />
                  <span className="prop-number">{settings.spotLight.intensity.toFixed(1)}</span>
                </div>
              </PropRow>
              <PropRow label="Angle">
                <div className="flex items-center gap-2 flex-1">
                  <input type="range" min="0.1" max="1" step="0.05"
                    value={settings.spotLight.angle}
                    onChange={(e) => onSettingChange('spotLight', { ...settings.spotLight, angle: parseFloat(e.target.value) })}
                    className="flex-1 cursor-pointer min-w-0" />
                  <span className="prop-number">{Math.round(settings.spotLight.angle * 90)}°</span>
                </div>
              </PropRow>
              <PropRow label="Softness">
                <div className="flex items-center gap-2 flex-1">
                  <input type="range" min="0" max="1" step="0.05"
                    value={settings.spotLight.penumbra}
                    onChange={(e) => onSettingChange('spotLight', { ...settings.spotLight, penumbra: parseFloat(e.target.value) })}
                    className="flex-1 cursor-pointer min-w-0" />
                  <span className="prop-number">{Math.round(settings.spotLight.penumbra * 100)}%</span>
                </div>
              </PropRow>
              <PropRow label="Position">
                <div className="flex items-center gap-2 flex-1">
                  <input type="range" min="0" max="360" step="15"
                    value={settings.spotLight.positionAngle}
                    onChange={(e) => onSettingChange('spotLight', { ...settings.spotLight, positionAngle: parseInt(e.target.value) })}
                    className="flex-1 cursor-pointer min-w-0" />
                  <span className="prop-number">{settings.spotLight.positionAngle}°</span>
                </div>
              </PropRow>
              <PropRow label="Height">
                <div className="flex items-center gap-2 flex-1">
                  <input type="range" min="1" max="10" step="0.5"
                    value={settings.spotLight.height}
                    onChange={(e) => onSettingChange('spotLight', { ...settings.spotLight, height: parseFloat(e.target.value) })}
                    className="flex-1 cursor-pointer min-w-0" />
                  <span className="prop-number">{settings.spotLight.height.toFixed(1)}</span>
                </div>
              </PropRow>
            </>
          )}
        </PanelSection>

        {/* Bloom / Glow */}
        <PanelSection title="Bloom" defaultOpen={false} icon={
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        }>
          <PropRow label="Enabled">
            <button className={`toggle-switch ${settings.bloom.enabled ? 'active' : ''}`}
              onClick={() => onSettingChange('bloom', { ...settings.bloom, enabled: !settings.bloom.enabled })}>
              <span className="toggle-knob" />
            </button>
          </PropRow>
          {settings.bloom.enabled && (
            <>
              <PropRow label="Intensity">
                <div className="flex items-center gap-2 flex-1">
                  <input type="range" min="0" max="2" step="0.05"
                    value={settings.bloom.intensity}
                    onChange={(e) => onSettingChange('bloom', { ...settings.bloom, intensity: parseFloat(e.target.value) })}
                    className="flex-1 cursor-pointer min-w-0" />
                  <span className="prop-number">{settings.bloom.intensity.toFixed(2)}</span>
                </div>
              </PropRow>
              <PropRow label="Threshold">
                <div className="flex items-center gap-2 flex-1">
                  <input type="range" min="0" max="1" step="0.05"
                    value={settings.bloom.threshold}
                    onChange={(e) => onSettingChange('bloom', { ...settings.bloom, threshold: parseFloat(e.target.value) })}
                    className="flex-1 cursor-pointer min-w-0" />
                  <span className="prop-number">{settings.bloom.threshold.toFixed(2)}</span>
                </div>
              </PropRow>
              <PropRow label="Radius">
                <div className="flex items-center gap-2 flex-1">
                  <input type="range" min="0" max="1" step="0.05"
                    value={settings.bloom.radius}
                    onChange={(e) => onSettingChange('bloom', { ...settings.bloom, radius: parseFloat(e.target.value) })}
                    className="flex-1 cursor-pointer min-w-0" />
                  <span className="prop-number">{settings.bloom.radius.toFixed(2)}</span>
                </div>
              </PropRow>
            </>
          )}
        </PanelSection>

        {/* Camera */}
        <PanelSection title="Camera" icon={
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
          </svg>
        }>
          <button className="panel-action-btn" onClick={onCameraReset}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
            </svg>
            Reset View
          </button>
          <PropRow label="Presets">
            <div className="flex gap-1">
              {(['front', 'top', 'isometric'] as const).map((preset) => (
                <button key={preset} className="btn-preset" onClick={() => onCameraPreset(preset)}>
                  {preset.charAt(0).toUpperCase() + preset.slice(1)}
                </button>
              ))}
            </div>
          </PropRow>
        </PanelSection>

        {/* Export */}
        <PanelSection title="Export" icon={
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        }>
          <PropRow label="Resolution">
            <div className="flex gap-1">
              {(['1k', '2k', '4k'] as const).map((res) => (
                <button key={res} className={`btn-preset ${exportSettings.resolution === res ? 'active' : ''}`}
                  onClick={() => onExportSettingChange('resolution', res)}>{res.toUpperCase()}</button>
              ))}
            </div>
          </PropRow>
          <PropRow label="Format">
            <div className="flex gap-1">
              {(['png', 'jpeg'] as const).map((fmt) => (
                <button key={fmt} className={`btn-preset ${exportSettings.format === fmt ? 'active' : ''}`}
                  onClick={() => onExportSettingChange('format', fmt)}>{fmt.toUpperCase()}</button>
              ))}
            </div>
          </PropRow>
          <PropRow label="Aspect">
            <div className="flex gap-1">
              {(['1:1', '4:3', '16:9'] as const).map((ratio) => (
                <button key={ratio} className={`btn-preset ${exportSettings.aspectRatio === ratio ? 'active' : ''}`}
                  onClick={() => onExportSettingChange('aspectRatio', ratio)}>{ratio}</button>
              ))}
            </div>
          </PropRow>

          {showModelExport && onExportModel && (
            <button onClick={onExportModel}
              className="panel-export-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download GLB
            </button>
          )}
        </PanelSection>
      </div>
    </>
  )
}

export default ControlsPanel
