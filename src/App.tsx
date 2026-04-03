import { useState, useCallback, useEffect, useRef } from 'react'
import { ModelInfo, SceneSettings, ExportSettings, ViewerControls, AppMode, DepthSettings, DepthModelData, TransformMode, MaterialEntry, AppSnapshot } from '@/types'
import { ModeSwitch, Header } from '@/components/layout'
import { UploadCard, ImageUploadCard } from '@/components/upload'
import { Viewer, ControlsPanel, ExportButton, Toolbar, StatusBar } from '@/components/viewer'
import { loadImage, generateDepthMap } from '@/utils/depth-generator'
import { createHistory, HistoryManager } from '@/utils/history'

const DEFAULT_SETTINGS: SceneSettings = {
  backgroundColor: '#1a1a1a',
  backgroundTransparent: false,
  lightingIntensity: 1,
  lightingPreset: 'studio',
  showWireframe: false,
  showGrid: false,
  modelColor: '#6366f1',
  useCustomColor: false,
  showShadows: true,
  shadowSettings: {
    dropShadow: {
      enabled: true,
      color: '#000000',
      opacity: 0.4,
      blur: 8,
      offsetX: 0,
      offsetY: 2,
    },
    innerShadow: {
      enabled: false,
      color: '#000000',
      opacity: 0.3,
      blur: 4,
      offsetX: 0,
      offsetY: 0,
    },
    contactShadow: true,
    contactShadowOpacity: 0.5,
  },
  // Advanced lighting defaults
  exposure: 1.1,
  colorTemperature: 0,
  environmentPreset: 'studio',
  envIntensity: 0.5,
  rimLight: {
    enabled: false,
    color: '#6366f1',
    intensity: 1.0,
  },
  spotLight: {
    enabled: false,
    color: '#ffffff',
    intensity: 1.0,
    angle: 0.5,
    penumbra: 0.5,
    positionAngle: 45,
    height: 5,
  },
  bloom: {
    enabled: false,
    intensity: 0.5,
    threshold: 0.8,
    radius: 0.4,
  },
}

function App() {
  const [mode, setMode] = useState<AppMode>('upload')
  const [modelFile, setModelFile] = useState<File | null>(null)
  const [depthData, setDepthData] = useState<DepthModelData | null>(null)
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null)
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null)
  const [viewerRef, setViewerRef] = useState<ViewerControls | null>(null)
  const [transformMode, setTransformMode] = useState<TransformMode>('orbit')
  const [materials, setMaterials] = useState<MaterialEntry[]>([])
  const [materialColors, setMaterialColors] = useState<Record<string, string>>({})
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null)

  // Undo/redo
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const historyRef = useRef<HistoryManager<AppSnapshot> | null>(null)
  const isRestoringRef = useRef(false) // prevents double-push during undo/redo restore

  const [settings, setSettings] = useState<SceneSettings>(DEFAULT_SETTINGS)

  const [depthSettings, setDepthSettings] = useState<DepthSettings>({
    depthStrength: 0.5,
    meshResolution: 128,
    smoothness: 1,
    addThickness: false
  })

  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    resolution: '2k',
    format: 'png',
    aspectRatio: '16:9'
  })

  // --- History helpers ---

  const getSnapshot = useCallback((): AppSnapshot => ({
    settings: structuredClone(settings),
    materialColors: { ...materialColors },
  }), [settings, materialColors])

  const pushHistory = useCallback(() => {
    if (isRestoringRef.current) return
    if (!historyRef.current) {
      historyRef.current = createHistory<AppSnapshot>(getSnapshot())
    } else {
      historyRef.current.push(getSnapshot())
    }
    setCanUndo(historyRef.current.canUndo())
    setCanRedo(historyRef.current.canRedo())
  }, [getSnapshot])

  const restoreSnapshot = useCallback((snap: AppSnapshot) => {
    isRestoringRef.current = true
    setSettings(snap.settings)
    setMaterialColors(snap.materialColors)
    // Apply material colors to the 3D scene
    if (viewerRef) {
      Object.entries(snap.materialColors).forEach(([id, color]) => {
        viewerRef.setMaterialColor(id, color)
      })
    }
    setTimeout(() => {
      isRestoringRef.current = false
      if (historyRef.current) {
        setCanUndo(historyRef.current.canUndo())
        setCanRedo(historyRef.current.canRedo())
      }
    }, 0)
  }, [viewerRef])

  const handleUndo = useCallback(() => {
    if (!historyRef.current) return
    const snap = historyRef.current.undo()
    if (snap) restoreSnapshot(snap)
  }, [restoreSnapshot])

  const handleRedo = useCallback(() => {
    if (!historyRef.current) return
    const snap = historyRef.current.redo()
    if (snap) restoreSnapshot(snap)
  }, [restoreSnapshot])

  // Push history when settings or material colors change (debounced)
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (isRestoringRef.current) return
    if (!modelFile && !depthData) return // no model loaded yet
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
    pushTimerRef.current = setTimeout(() => {
      pushHistory()
    }, 400) // debounce 400ms so slider drags don't flood history
    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
    }
  }, [settings, materialColors, pushHistory, modelFile, depthData])

  // --- Refresh materials list from viewer ---

  const refreshMaterials = useCallback(() => {
    if (!viewerRef) return
    const mats = viewerRef.getMaterials()
    setMaterials(mats)
    // Sync materialColors state
    const colors: Record<string, string> = {}
    mats.forEach(m => { colors[m.id] = m.currentColor })
    setMaterialColors(colors)
  }, [viewerRef])

  // Refresh materials whenever the model loads
  useEffect(() => {
    if (viewerRef && (modelFile || depthData)) {
      // Slight delay for model to load
      const t = setTimeout(refreshMaterials, 500)
      return () => clearTimeout(t)
    }
  }, [viewerRef, modelFile, depthData, refreshMaterials])

  // --- Callbacks ---

  const handleFileUpload = useCallback((file: File) => {
    setModelFile(file)
    setDepthData(null)
    setOriginalImage(null)
    setMaterials([])
    setMaterialColors({})
    historyRef.current = null
    setCanUndo(false)
    setCanRedo(false)
    setModelInfo({
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
      type: file.name.split('.').pop()?.toUpperCase() || 'UNKNOWN',
      source: 'upload'
    })
  }, [])

  const handleDepthGeneration = useCallback(async (imageFile: File) => {
    const image = await loadImage(imageFile)
    setOriginalImage(image)
    const data = generateDepthMap(image, depthSettings.smoothness)
    setDepthData(data)
    setModelFile(null)
    setMaterials([])
    setMaterialColors({})
    historyRef.current = null
    setCanUndo(false)
    setCanRedo(false)
    setModelInfo({
      name: imageFile.name.replace(/\.[^.]+$/, '') + ' (Depth 3D)',
      size: (imageFile.size / 1024).toFixed(0) + ' KB',
      type: 'Depth 3D',
      source: 'depth-generated'
    })
  }, [depthSettings.smoothness])

  const handleReplace = useCallback(() => {
    setModelFile(null)
    setDepthData(null)
    setOriginalImage(null)
    setModelInfo(null)
    setTransformMode('orbit')
    setMaterials([])
    setMaterialColors({})
    setSelectedMaterialId(null)
    historyRef.current = null
    setCanUndo(false)
    setCanRedo(false)
  }, [])

  const handleModeChange = useCallback((newMode: AppMode) => {
    setMode(newMode)
    handleReplace()
  }, [handleReplace])

  const updateSetting = useCallback(<K extends keyof SceneSettings>(key: K, value: SceneSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }, [])

  const updateExportSetting = useCallback(<K extends keyof ExportSettings>(key: K, value: ExportSettings[K]) => {
    setExportSettings(prev => ({ ...prev, [key]: value }))
  }, [])

  const updateDepthSetting = useCallback(<K extends keyof DepthSettings>(key: K, value: DepthSettings[K]) => {
    setDepthSettings(prev => ({ ...prev, [key]: value }))

    if (key === 'smoothness' && originalImage) {
      const data = generateDepthMap(originalImage, value as number)
      setDepthData(data)
    }
  }, [originalImage])

  const handleCameraReset = useCallback(() => viewerRef?.resetCamera(), [viewerRef])
  const handleCameraPreset = useCallback((preset: 'front' | 'top' | 'isometric') => viewerRef?.setCameraPreset(preset), [viewerRef])
  const handleExportImage = useCallback(() => viewerRef?.exportImage(exportSettings), [viewerRef, exportSettings])
  const handleExportModel = useCallback(() => viewerRef?.exportModel(), [viewerRef])

  const handleTransformModeChange = useCallback((mode: TransformMode) => {
    setTransformMode(mode)
    viewerRef?.setTransformMode(mode)
  }, [viewerRef])

  const handleResetTransform = useCallback(() => {
    viewerRef?.resetModelTransform()
  }, [viewerRef])

  // Per-part material color change
  const handleMaterialColorChange = useCallback((materialId: string, color: string) => {
    viewerRef?.setMaterialColor(materialId, color)
    setMaterialColors(prev => ({ ...prev, [materialId]: color }))
    // Update materials list to show new color
    setMaterials(prev => prev.map(m =>
      m.id === materialId ? { ...m, currentColor: color } : m
    ))
  }, [viewerRef])

  const handleResetMaterialColors = useCallback(() => {
    viewerRef?.resetMaterialColors()
    refreshMaterials()
  }, [viewerRef, refreshMaterials])

  // Click-to-select a material on the model
  const handleMaterialSelect = useCallback((materialId: string | null) => {
    setSelectedMaterialId(materialId)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    if (!viewerRef) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      // Undo: Ctrl+Z
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault()
        handleUndo()
        return
      }
      // Redo: Ctrl+Shift+Z or Ctrl+Y
      if ((e.ctrlKey || e.metaKey) && (e.shiftKey && e.key === 'z' || e.key === 'y')) {
        e.preventDefault()
        handleRedo()
        return
      }

      switch (e.key.toLowerCase()) {
        case 'v':
          handleTransformModeChange('orbit')
          break
        case 'g':
          handleTransformModeChange('grab')
          break
        case 'r':
          handleTransformModeChange('rotate')
          break
        case 's':
          handleTransformModeChange('scale')
          break
        case 'x':
          handleResetTransform()
          break
        case 'f':
          handleCameraReset()
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [viewerRef, handleTransformModeChange, handleResetTransform, handleCameraReset, handleUndo, handleRedo])

  const hasModel = modelFile !== null || depthData !== null
  const isDepthMode = depthData !== null

  return (
    <div className="figma-workspace">
      {!hasModel ? (
        <>
          <ModeSwitch mode={mode} onModeChange={handleModeChange} />
          {mode === 'upload' ? (
            <UploadCard onFileUpload={handleFileUpload} />
          ) : (
            <ImageUploadCard onGenerate={handleDepthGeneration} />
          )}
        </>
      ) : (
        <>
          <Viewer
            modelFile={modelFile}
            depthData={depthData}
            depthSettings={depthSettings}
            settings={settings}
            transformMode={transformMode}
            onReady={setViewerRef}
            onMaterialSelect={handleMaterialSelect}
          />

          <Header
            onReplace={handleReplace}
            modelSource={modelInfo?.source}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={handleUndo}
            onRedo={handleRedo}
          />

          <Toolbar
            transformMode={transformMode}
            onModeChange={handleTransformModeChange}
            onResetTransform={handleResetTransform}
          />

          <ControlsPanel
            settings={settings}
            exportSettings={exportSettings}
            onSettingChange={updateSetting}
            onExportSettingChange={updateExportSetting}
            onCameraReset={handleCameraReset}
            onCameraPreset={handleCameraPreset}
            showModelExport={isDepthMode}
            onExportModel={handleExportModel}
            isDepthMode={isDepthMode}
            depthSettings={depthSettings}
            onDepthSettingChange={updateDepthSetting}
            materials={materials}
            onMaterialColorChange={handleMaterialColorChange}
            onResetMaterialColors={handleResetMaterialColors}
            selectedMaterialId={selectedMaterialId}
            onMaterialSelect={handleMaterialSelect}
          />

          <ExportButton
            onExportImage={handleExportImage}
            onExportModel={handleExportModel}
            format={exportSettings.format}
            showModelExport={isDepthMode}
          />

          <StatusBar
            info={modelInfo}
            transformMode={transformMode}
            onZoomFit={handleCameraReset}
          />
        </>
      )}
    </div>
  )
}

export default App
