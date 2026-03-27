import { useState, useCallback } from 'react'
import { ModelInfo, SceneSettings, ExportSettings, ViewerControls, AppMode, DepthSettings, DepthModelData } from '@/types'
import { ModeSwitch, Header } from '@/components/layout'
import { UploadCard, ImageUploadCard } from '@/components/upload'
import { Viewer, ControlsPanel, ModelInfoPanel, ExportButton } from '@/components/viewer'
import { loadImage, generateDepthMap } from '@/utils/depth-generator'

function App() {
  const [mode, setMode] = useState<AppMode>('upload')
  const [modelFile, setModelFile] = useState<File | null>(null)
  const [depthData, setDepthData] = useState<DepthModelData | null>(null)
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null)
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null)
  const [viewerRef, setViewerRef] = useState<ViewerControls | null>(null)

  const [depthSettings, setDepthSettings] = useState<DepthSettings>({
    depthStrength: 0.5,
    meshResolution: 128,
    smoothness: 1,
    addThickness: false
  })

  const [settings, setSettings] = useState<SceneSettings>({
    backgroundColor: '#1a1a1a',
    backgroundTransparent: false,
    lightingIntensity: 1,
    lightingPreset: 'studio',
    showWireframe: false,
    showGrid: false,
    modelColor: '#6366f1',
    useCustomColor: false,
    showShadows: true
  })

  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    resolution: '2k',
    format: 'png',
    aspectRatio: '16:9'
  })

  const handleFileUpload = useCallback((file: File) => {
    setModelFile(file)
    setDepthData(null)
    setOriginalImage(null)
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

    // Smoothness requires regenerating the depth map
    if (key === 'smoothness' && originalImage) {
      const data = generateDepthMap(originalImage, value as number)
      setDepthData(data)
    }
  }, [originalImage])

  const handleCameraReset = useCallback(() => viewerRef?.resetCamera(), [viewerRef])
  const handleCameraPreset = useCallback((preset: 'front' | 'top' | 'isometric') => viewerRef?.setCameraPreset(preset), [viewerRef])
  const handleExportImage = useCallback(() => viewerRef?.exportImage(exportSettings), [viewerRef, exportSettings])
  const handleExportModel = useCallback(() => viewerRef?.exportModel(), [viewerRef])

  const hasModel = modelFile !== null || depthData !== null
  const isDepthMode = depthData !== null

  return (
    <div className="w-full h-full relative bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a]">
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
            onReady={setViewerRef}
          />
          <Header
            onReplace={handleReplace}
            modelSource={modelInfo?.source}
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
          />
          <ModelInfoPanel info={modelInfo} />
          <ExportButton
            onExportImage={handleExportImage}
            onExportModel={handleExportModel}
            format={exportSettings.format}
            showModelExport={isDepthMode}
          />
        </>
      )}
    </div>
  )
}

export default App
