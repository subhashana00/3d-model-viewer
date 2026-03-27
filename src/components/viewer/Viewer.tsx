import { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import { SceneSettings, ExportSettings, ViewerControls, DepthModelData, DepthSettings } from '@/types'
import { LIGHTING_PRESETS } from '@/constants/lighting'
import { loadModelFromFile, positionCamera } from '@/utils/model-loader'

interface ViewerProps {
  modelFile: File | null
  depthData: DepthModelData | null
  depthSettings: DepthSettings
  settings: SceneSettings
  onReady: (controls: ViewerControls) => void
}

function Viewer({ modelFile, depthData, depthSettings, settings, onReady }: ViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const modelRef = useRef<THREE.Object3D | null>(null)
  const gridRef = useRef<THREE.GridHelper | null>(null)
  const animationRef = useRef<number>(0)
  const initialCameraPos = useRef(new THREE.Vector3())
  const initialCameraTarget = useRef(new THREE.Vector3())

  const removeCurrentModel = useCallback(() => {
    const scene = sceneRef.current
    if (!scene || !modelRef.current) return
    scene.remove(modelRef.current)
    modelRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose()
        const mats = Array.isArray(child.material) ? child.material : [child.material]
        mats.forEach(m => {
          if (m.map) m.map.dispose()
          if (m.displacementMap) m.displacementMap.dispose()
          m.dispose()
        })
      }
    })
    modelRef.current = null
  }, [])

  const setupLighting = useCallback((scene: THREE.Scene, preset: string, intensity: number) => {
    const lightsToRemove = scene.children.filter(child => child instanceof THREE.Light)
    lightsToRemove.forEach(light => scene.remove(light))
    const config = LIGHTING_PRESETS[preset] || LIGHTING_PRESETS.studio

    scene.add(new THREE.AmbientLight(config.ambient.color, config.ambient.intensity * intensity))
    scene.add(new THREE.HemisphereLight(config.hemisphere.skyColor, config.hemisphere.groundColor, config.hemisphere.intensity * intensity))

    config.directional.forEach(({ color, intensity: li, position }) => {
      const dirLight = new THREE.DirectionalLight(color, li * intensity)
      dirLight.position.set(position[0], position[1], position[2])
      dirLight.castShadow = true
      dirLight.shadow.mapSize.set(2048, 2048)
      scene.add(dirLight)
    })
  }, [])

  // Initialize scene
  useEffect(() => {
    if (!containerRef.current) return
    const scene = new THREE.Scene()
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.set(3, 2, 3)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.minDistance = 0.5
    controls.maxDistance = 50
    controlsRef.current = controls

    setupLighting(scene, 'studio', 1)

    const grid = new THREE.GridHelper(10, 20, 0x444444, 0x222222)
    grid.visible = false
    scene.add(grid)
    gridRef.current = grid

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationRef.current)
      renderer.dispose()
      controls.dispose()
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement)
      }
    }
  }, [setupLighting])

  // Load 3D model from file
  useEffect(() => {
    if (!modelFile || !sceneRef.current) return
    removeCurrentModel()
    loadModelFromFile(modelFile).then((object) => {
      sceneRef.current?.add(object)
      modelRef.current = object
      if (cameraRef.current && controlsRef.current) {
        positionCamera(cameraRef.current, controlsRef.current, initialCameraPos.current, initialCameraTarget.current)
      }
    })
  }, [modelFile, removeCurrentModel])

  // Create depth mesh
  useEffect(() => {
    if (!depthData || !sceneRef.current) return
    removeCurrentModel()

    const loader = new THREE.TextureLoader()
    const imageTexture = loader.load(depthData.imageDataUrl)
    const depthTexture = loader.load(depthData.depthDataUrl)
    imageTexture.colorSpace = THREE.SRGBColorSpace

    const aspect = depthData.width / depthData.height
    const planeW = aspect >= 1 ? 2 : 2 * aspect
    const planeH = aspect >= 1 ? 2 / aspect : 2
    const res = depthSettings.meshResolution

    const geometry = new THREE.PlaneGeometry(planeW, planeH, res, res)
    const material = new THREE.MeshStandardMaterial({
      map: imageTexture,
      displacementMap: depthTexture,
      displacementScale: depthSettings.depthStrength,
      side: THREE.FrontSide,
    })

    const group = new THREE.Group()
    const frontMesh = new THREE.Mesh(geometry, material)
    frontMesh.castShadow = true
    frontMesh.receiveShadow = true
    group.add(frontMesh)

    if (depthSettings.addThickness) {
      const backGeo = new THREE.PlaneGeometry(planeW, planeH, 1, 1)
      const backMat = new THREE.MeshStandardMaterial({ color: 0x444444, side: THREE.FrontSide })
      const backMesh = new THREE.Mesh(backGeo, backMat)
      backMesh.position.z = -0.1
      backMesh.rotation.y = Math.PI
      backMesh.castShadow = true
      group.add(backMesh)
    }

    sceneRef.current.add(group)
    modelRef.current = group

    if (cameraRef.current && controlsRef.current) {
      positionCamera(cameraRef.current, controlsRef.current, initialCameraPos.current, initialCameraTarget.current, 3)
    }
  }, [depthData, depthSettings, removeCurrentModel])

  // Update background
  useEffect(() => {
    if (!rendererRef.current) return
    if (settings.backgroundTransparent) {
      rendererRef.current.setClearColor(0x000000, 0)
    } else {
      rendererRef.current.setClearColor(settings.backgroundColor, 1)
    }
  }, [settings.backgroundColor, settings.backgroundTransparent])

  // Update lighting
  useEffect(() => {
    if (!sceneRef.current) return
    setupLighting(sceneRef.current, settings.lightingPreset, settings.lightingIntensity)
  }, [settings.lightingPreset, settings.lightingIntensity, setupLighting])

  // Update wireframe
  useEffect(() => {
    if (!modelRef.current) return
    modelRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material]
        mats.forEach(mat => { mat.wireframe = settings.showWireframe })
      }
    })
  }, [settings.showWireframe])

  // Update grid
  useEffect(() => {
    if (gridRef.current) gridRef.current.visible = settings.showGrid
  }, [settings.showGrid])

  // Update model color (upload mode only)
  useEffect(() => {
    if (!modelRef.current || !settings.useCustomColor) return
    const color = new THREE.Color(settings.modelColor)
    modelRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material && !Array.isArray(child.material)) {
        child.material.color = color
      }
    })
  }, [settings.modelColor, settings.useCustomColor])

  // Update shadows
  useEffect(() => {
    if (!modelRef.current || !rendererRef.current) return
    rendererRef.current.shadowMap.enabled = settings.showShadows
    modelRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = settings.showShadows
        child.receiveShadow = settings.showShadows
      }
    })
  }, [settings.showShadows])

  // Expose controls to parent
  useEffect(() => {
    const resetCamera = () => {
      if (cameraRef.current && controlsRef.current) {
        cameraRef.current.position.copy(initialCameraPos.current)
        controlsRef.current.target.copy(initialCameraTarget.current)
        controlsRef.current.update()
      }
    }

    const setCameraPreset = (preset: 'front' | 'top' | 'isometric') => {
      if (!cameraRef.current || !controlsRef.current) return
      const distance = 4
      const presets: Record<string, { position: [number, number, number]; target: [number, number, number] }> = {
        front: { position: [0, 0, distance], target: [0, 0, 0] },
        top: { position: [0, distance, 0.01], target: [0, 0, 0] },
        isometric: { position: [distance, distance * 0.6, distance], target: [0, 0, 0] }
      }
      const config = presets[preset]
      if (config) {
        cameraRef.current.position.set(...config.position)
        controlsRef.current.target.set(...config.target)
        controlsRef.current.update()
      }
    }

    const exportImage = ({ resolution, format, aspectRatio }: ExportSettings) => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return
      const resolutions = { '1k': 1024, '2k': 2048, '4k': 4096 }
      const aspects = { '1:1': 1, '4:3': 4 / 3, '16:9': 16 / 9 }
      const width = resolutions[resolution] || 2048
      const aspect = aspects[aspectRatio] || 16 / 9
      const height = Math.round(width / aspect)

      const origW = rendererRef.current.domElement.width
      const origH = rendererRef.current.domElement.height
      const origA = cameraRef.current.aspect
      const gridWas = gridRef.current?.visible

      if (gridRef.current) gridRef.current.visible = false
      rendererRef.current.setSize(width, height)
      cameraRef.current.aspect = aspect
      cameraRef.current.updateProjectionMatrix()
      rendererRef.current.render(sceneRef.current, cameraRef.current)

      const link = document.createElement('a')
      link.download = `model-export-${resolution}.${format}`
      link.href = rendererRef.current.domElement.toDataURL(format === 'jpeg' ? 'image/jpeg' : 'image/png', 0.95)
      link.click()

      rendererRef.current.setSize(origW, origH)
      cameraRef.current.aspect = origA
      cameraRef.current.updateProjectionMatrix()
      if (gridRef.current) gridRef.current.visible = gridWas || false
      rendererRef.current.render(sceneRef.current, cameraRef.current)
    }

    const exportModel = () => {
      if (!modelRef.current) return
      const exporter = new GLTFExporter()
      exporter.parse(
        modelRef.current,
        (result) => {
          const output = result instanceof ArrayBuffer ? result : JSON.stringify(result, null, 2)
          const blob = new Blob([output], { type: result instanceof ArrayBuffer ? 'application/octet-stream' : 'application/json' })
          const link = document.createElement('a')
          link.href = URL.createObjectURL(blob)
          link.download = result instanceof ArrayBuffer ? 'model.glb' : 'model.gltf'
          link.click()
          URL.revokeObjectURL(link.href)
        },
        (error) => console.error('Export failed:', error),
        { binary: true }
      )
    }

    onReady({ resetCamera, setCameraPreset, exportImage, exportModel })
  }, [onReady])

  return <div ref={containerRef} className="fixed inset-0 z-0 animate-fade-in" />
}

export default Viewer
