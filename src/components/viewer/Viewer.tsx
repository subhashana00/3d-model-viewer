import { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { TransformControls } from 'three/addons/controls/TransformControls.js'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { SceneSettings, ExportSettings, ViewerControls, DepthModelData, DepthSettings, TransformMode, MaterialEntry } from '@/types'
import { LIGHTING_PRESETS } from '@/constants/lighting'
import { loadModelFromFile, positionCamera } from '@/utils/model-loader'

interface ViewerProps {
  modelFile: File | null
  depthData: DepthModelData | null
  depthSettings: DepthSettings
  settings: SceneSettings
  transformMode: TransformMode
  onReady: (controls: ViewerControls) => void
  onMaterialSelect?: (materialId: string | null) => void
}

function Viewer({ modelFile, depthData, depthSettings, settings, transformMode, onReady, onMaterialSelect }: ViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const transformControlsRef = useRef<TransformControls | null>(null)
  const modelRef = useRef<THREE.Object3D | null>(null)
  const gridRef = useRef<THREE.GridHelper | null>(null)
  const animationRef = useRef<number>(0)
  const initialCameraPos = useRef(new THREE.Vector3())
  const initialCameraTarget = useRef(new THREE.Vector3())
  const shadowPlaneRef = useRef<THREE.Mesh | null>(null)
  const contactShadowGroupRef = useRef<THREE.Group | null>(null)
  const initialModelPos = useRef(new THREE.Vector3())
  const initialModelRot = useRef(new THREE.Euler())
  const initialModelScale = useRef(new THREE.Vector3(1, 1, 1))
  // Store original material colors for per-part editing
  const originalMaterialColors = useRef<Map<string, THREE.Color>>(new Map())
  // Raycasting for click-to-select
  const raycasterRef = useRef(new THREE.Raycaster())
  const mouseRef = useRef(new THREE.Vector2())
  // Selection highlight: store the currently highlighted mesh edges
  const selectionOutlineRef = useRef<THREE.LineSegments | null>(null)
  const selectedMeshRef = useRef<THREE.Mesh | null>(null)
  // Track if user is dragging (to distinguish drag from click)
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null)
  // Advanced lighting refs
  const rimLightRef = useRef<THREE.DirectionalLight | null>(null)
  const spotLightRef = useRef<THREE.SpotLight | null>(null)
  const spotLightHelperRef = useRef<THREE.SpotLightHelper | null>(null)
  const composerRef = useRef<EffectComposer | null>(null)
  const bloomPassRef = useRef<UnrealBloomPass | null>(null)
  const bloomEnabledRef = useRef(false)

  const removeCurrentModel = useCallback(() => {
    const scene = sceneRef.current
    if (!scene || !modelRef.current) return
    if (transformControlsRef.current) {
      transformControlsRef.current.detach()
    }
    // Clear selection outline
    clearSelectionOutline()
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

  // Clear the selection outline from the scene
  const clearSelectionOutline = () => {
    if (selectionOutlineRef.current && sceneRef.current) {
      sceneRef.current.remove(selectionOutlineRef.current)
      selectionOutlineRef.current.geometry.dispose()
      ;(selectionOutlineRef.current.material as THREE.Material).dispose()
      selectionOutlineRef.current = null
    }
    selectedMeshRef.current = null
  }

  // Highlight a mesh with an edge outline
  const highlightMesh = useCallback((mesh: THREE.Mesh) => {
    clearSelectionOutline()
    if (!sceneRef.current) return

    const edges = new THREE.EdgesGeometry(mesh.geometry, 30)
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x6366f1,
      linewidth: 2,
      transparent: true,
      opacity: 0.8,
      depthTest: true,
    })
    const outline = new THREE.LineSegments(edges, lineMat)
    // Match the mesh's world transform
    outline.matrixAutoUpdate = false
    mesh.updateMatrixWorld(true)
    outline.matrix.copy(mesh.matrixWorld)
    outline.renderOrder = 999
    sceneRef.current.add(outline)
    selectionOutlineRef.current = outline
    selectedMeshRef.current = mesh
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
      dirLight.shadow.mapSize.set(4096, 4096)
      dirLight.shadow.camera.near = 0.1
      dirLight.shadow.camera.far = 100
      dirLight.shadow.camera.left = -15
      dirLight.shadow.camera.right = 15
      dirLight.shadow.camera.top = 15
      dirLight.shadow.camera.bottom = -15
      dirLight.shadow.normalBias = 0.02
      dirLight.shadow.bias = -0.0005
      dirLight.shadow.radius = 4
      scene.add(dirLight)
    })
  }, [])

  const createShadowPlane = useCallback((scene: THREE.Scene) => {
    if (shadowPlaneRef.current) {
      scene.remove(shadowPlaneRef.current)
      shadowPlaneRef.current.geometry.dispose()
      ;(shadowPlaneRef.current.material as THREE.Material).dispose()
      shadowPlaneRef.current = null
    }
    const planeGeo = new THREE.PlaneGeometry(50, 50)
    const planeMat = new THREE.ShadowMaterial({ opacity: 0.35, color: 0x000000 })
    const plane = new THREE.Mesh(planeGeo, planeMat)
    plane.rotation.x = -Math.PI / 2
    plane.position.y = -0.01
    plane.receiveShadow = true
    plane.name = '__shadow_plane__'
    scene.add(plane)
    shadowPlaneRef.current = plane
  }, [])

  const createContactShadow = useCallback((scene: THREE.Scene) => {
    if (contactShadowGroupRef.current) {
      scene.remove(contactShadowGroupRef.current)
      contactShadowGroupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose()
          ;(child.material as THREE.Material).dispose()
        }
      })
      contactShadowGroupRef.current = null
    }
    const group = new THREE.Group()
    group.name = '__contact_shadow__'
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256)
    gradient.addColorStop(0, 'rgba(0,0,0,0.6)')
    gradient.addColorStop(0.2, 'rgba(0,0,0,0.45)')
    gradient.addColorStop(0.5, 'rgba(0,0,0,0.2)')
    gradient.addColorStop(0.8, 'rgba(0,0,0,0.05)')
    gradient.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 512, 512)
    const shadowTex = new THREE.CanvasTexture(canvas)
    shadowTex.needsUpdate = true
    const shadowGeo = new THREE.PlaneGeometry(2, 2)
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex, transparent: true, opacity: 0.5,
      depthWrite: false, blending: THREE.MultiplyBlending,
    })
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat)
    shadowMesh.rotation.x = -Math.PI / 2
    shadowMesh.position.y = -0.005
    shadowMesh.name = '__contact_shadow_mesh__'
    group.add(shadowMesh)
    scene.add(group)
    contactShadowGroupRef.current = group
  }, [])

  // Initialize scene
  useEffect(() => {
    if (!containerRef.current) return
    const scene = new THREE.Scene()
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.set(3, 2, 3)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
      alpha: true,
      powerPreference: 'high-performance'
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.minDistance = 0.5
    controls.maxDistance = 50
    controls.enablePan = true
    controls.panSpeed = 0.8
    controlsRef.current = controls

    const tControls = new TransformControls(camera, renderer.domElement)
    tControls.setSize(0.75)
    tControls.addEventListener('dragging-changed', (event) => {
      controls.enabled = !(event as unknown as { value: boolean }).value
    })
    scene.add(tControls)
    transformControlsRef.current = tControls

    setupLighting(scene, 'studio', 1)

    const grid = new THREE.GridHelper(10, 20, 0x444444, 0x222222)
    grid.visible = false
    scene.add(grid)
    gridRef.current = grid

    createShadowPlane(scene)
    createContactShadow(scene)

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate)
      controls.update()
      // Update selection outline position to follow the model
      if (selectionOutlineRef.current && selectedMeshRef.current) {
        selectedMeshRef.current.updateMatrixWorld(true)
        selectionOutlineRef.current.matrix.copy(selectedMeshRef.current.matrixWorld)
      }
      // Use composer for bloom, fallback to direct render
      if (bloomEnabledRef.current && composerRef.current) {
        composerRef.current.render()
      } else {
        renderer.render(scene, camera)
      }
    }
    animate()

    // --- Click-to-select raycasting ---
    const domEl = renderer.domElement

    const handlePointerDown = (e: PointerEvent) => {
      pointerDownPosRef.current = { x: e.clientX, y: e.clientY }
    }

    const handlePointerUp = (e: PointerEvent) => {
      if (!pointerDownPosRef.current) return
      const dx = e.clientX - pointerDownPosRef.current.x
      const dy = e.clientY - pointerDownPosRef.current.y
      pointerDownPosRef.current = null
      // Only treat as a click if the pointer didn't move much (not a drag)
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) return

      // Don't pick if transform controls are being used
      if (tControls.dragging) return

      const rect = domEl.getBoundingClientRect()
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      raycasterRef.current.setFromCamera(mouseRef.current, camera)

      if (!modelRef.current) return

      // Collect all meshes from the model (exclude helpers/shadows)
      const meshes: THREE.Mesh[] = []
      modelRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && !child.name.startsWith('__')) {
          meshes.push(child)
        }
      })

      const intersects = raycasterRef.current.intersectObjects(meshes, false)

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh
        // Determine material id
        const mats = Array.isArray(hitMesh.material) ? hitMesh.material : [hitMesh.material]
        // Use face material index for multi-material, default 0
        const matIdx = intersects[0].face?.materialIndex ?? 0
        const idx = Math.min(matIdx, mats.length - 1)
        const matId = `${hitMesh.uuid}_${idx}`

        highlightMesh(hitMesh)
        onMaterialSelect?.(matId)
      } else {
        // Clicked empty space — deselect
        clearSelectionOutline()
        onMaterialSelect?.(null)
      }
    }

    domEl.addEventListener('pointerdown', handlePointerDown)
    domEl.addEventListener('pointerup', handlePointerUp)

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
      if (composerRef.current) {
        composerRef.current.setSize(window.innerWidth, window.innerHeight)
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      domEl.removeEventListener('pointerdown', handlePointerDown)
      domEl.removeEventListener('pointerup', handlePointerUp)
      cancelAnimationFrame(animationRef.current)
      tControls.dispose()
      if (composerRef.current) {
        composerRef.current.dispose()
        composerRef.current = null
      }
      renderer.dispose()
      controls.dispose()
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement)
      }
    }
  }, [setupLighting, createShadowPlane, createContactShadow, highlightMesh, onMaterialSelect])

  // Handle transform mode changes
  useEffect(() => {
    const tControls = transformControlsRef.current
    const oControls = controlsRef.current
    if (!tControls || !oControls) return

    if (transformMode === 'orbit') {
      tControls.detach()
      oControls.enabled = true
    } else if (modelRef.current) {
      tControls.attach(modelRef.current)
      if (transformMode === 'grab') {
        tControls.setMode('translate')
      } else if (transformMode === 'rotate') {
        tControls.setMode('rotate')
      } else if (transformMode === 'scale') {
        tControls.setMode('scale')
      }
    }
  }, [transformMode])

  // Load 3D model from file
  useEffect(() => {
    if (!modelFile || !sceneRef.current) return
    removeCurrentModel()
    originalMaterialColors.current.clear()
    loadModelFromFile(modelFile).then((object) => {
      sceneRef.current?.add(object)
      modelRef.current = object
      initialModelPos.current.copy(object.position)
      initialModelRot.current.copy(object.rotation)
      initialModelScale.current.copy(object.scale)

      if (cameraRef.current && controlsRef.current) {
        positionCamera(cameraRef.current, controlsRef.current, initialCameraPos.current, initialCameraTarget.current)
      }
      updateShadowPlanePosition(object)

      if (transformMode !== 'orbit' && transformControlsRef.current) {
        transformControlsRef.current.attach(object)
        if (transformMode === 'grab') transformControlsRef.current.setMode('translate')
        else if (transformMode === 'rotate') transformControlsRef.current.setMode('rotate')
        else if (transformMode === 'scale') transformControlsRef.current.setMode('scale')
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
    initialModelPos.current.copy(group.position)
    initialModelRot.current.copy(group.rotation)
    initialModelScale.current.copy(group.scale)

    if (cameraRef.current && controlsRef.current) {
      positionCamera(cameraRef.current, controlsRef.current, initialCameraPos.current, initialCameraTarget.current, 3)
    }
    updateShadowPlanePosition(group)

    if (transformMode !== 'orbit' && transformControlsRef.current) {
      transformControlsRef.current.attach(group)
    }
  }, [depthData, depthSettings, removeCurrentModel])

  // Helper: position shadow plane at model bottom
  const updateShadowPlanePosition = (object: THREE.Object3D) => {
    const box = new THREE.Box3().setFromObject(object)
    const bottomY = box.min.y
    if (shadowPlaneRef.current) {
      shadowPlaneRef.current.position.y = bottomY - 0.01
    }
    if (contactShadowGroupRef.current) {
      contactShadowGroupRef.current.position.y = bottomY - 0.005
      const size = new THREE.Vector3()
      box.getSize(size)
      const maxDim = Math.max(size.x, size.z)
      const center = new THREE.Vector3()
      box.getCenter(center)
      contactShadowGroupRef.current.position.x = center.x
      contactShadowGroupRef.current.position.z = center.z
      contactShadowGroupRef.current.scale.set(maxDim * 0.8, maxDim * 0.8, 1)
    }
  }

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

  // Update shadows (master toggle)
  useEffect(() => {
    if (!rendererRef.current) return
    rendererRef.current.shadowMap.enabled = settings.showShadows
    if (modelRef.current) {
      modelRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = settings.showShadows
          child.receiveShadow = settings.showShadows
        }
      })
    }
    if (shadowPlaneRef.current) {
      shadowPlaneRef.current.visible = settings.showShadows
    }
    if (contactShadowGroupRef.current) {
      contactShadowGroupRef.current.visible = settings.showShadows
    }
  }, [settings.showShadows])

  // Update shadow settings
  useEffect(() => {
    if (!settings.showShadows) return
    const { shadowSettings } = settings

    if (shadowPlaneRef.current) {
      const mat = shadowPlaneRef.current.material as THREE.ShadowMaterial
      mat.opacity = shadowSettings.dropShadow.enabled ? shadowSettings.dropShadow.opacity : 0
      mat.color = new THREE.Color(shadowSettings.dropShadow.color)
      shadowPlaneRef.current.visible = shadowSettings.dropShadow.enabled

      const scene = sceneRef.current
      if (scene) {
        scene.traverse((child) => {
          if (child instanceof THREE.DirectionalLight && child.shadow) {
            child.shadow.radius = Math.max(1, shadowSettings.dropShadow.blur * 0.5)
            child.shadow.camera.updateProjectionMatrix()
          }
        })
      }
    }

    if (contactShadowGroupRef.current) {
      contactShadowGroupRef.current.visible = shadowSettings.contactShadow
      contactShadowGroupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          ;(child.material as THREE.MeshBasicMaterial).opacity = shadowSettings.contactShadowOpacity
        }
      })
    }

    if (sceneRef.current && shadowSettings.innerShadow.enabled) {
      const innerColor = new THREE.Color(shadowSettings.innerShadow.color)
      const intensity = shadowSettings.innerShadow.opacity
      if (modelRef.current) {
        modelRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material]
            mats.forEach(mat => {
              if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
                mat.aoMapIntensity = intensity * 3
                mat.emissive = innerColor.clone().multiplyScalar(intensity * 0.1)
                mat.needsUpdate = true
              }
            })
          }
        })
      }
    } else if (modelRef.current) {
      modelRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material]
          mats.forEach(mat => {
            if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
              mat.aoMapIntensity = 1
              mat.emissive = new THREE.Color(0x000000)
              mat.needsUpdate = true
            }
          })
        }
      })
    }

    if (rendererRef.current) {
      rendererRef.current.shadowMap.needsUpdate = true
    }
  }, [settings.showShadows, settings.shadowSettings])

  // Update directional light offset
  useEffect(() => {
    if (!sceneRef.current || !settings.showShadows) return
    const { dropShadow } = settings.shadowSettings
    sceneRef.current.traverse((child) => {
      if (child instanceof THREE.DirectionalLight && child.shadow) {
        child.shadow.camera.left = -15 + dropShadow.offsetX
        child.shadow.camera.right = 15 + dropShadow.offsetX
        child.shadow.camera.top = 15 - dropShadow.offsetY
        child.shadow.camera.bottom = -15 - dropShadow.offsetY
        child.shadow.camera.updateProjectionMatrix()
      }
    })
  }, [settings.shadowSettings.dropShadow.offsetX, settings.shadowSettings.dropShadow.offsetY, settings.showShadows])

  // ========== ADVANCED LIGHTING EFFECTS ==========

  // Update exposure
  useEffect(() => {
    if (!rendererRef.current) return
    rendererRef.current.toneMappingExposure = settings.exposure
  }, [settings.exposure])

  // Update color temperature (tints directional lights warm/cool)
  useEffect(() => {
    if (!sceneRef.current) return
    const t = settings.colorTemperature // -100 to +100
    // Map to a color: warm = orange tint, cool = blue tint
    const warmColor = new THREE.Color(1, 0.85, 0.7)  // warm amber
    const coolColor = new THREE.Color(0.7, 0.85, 1)   // cool blue
    const neutral = new THREE.Color(1, 1, 1)
    const tintColor = t > 0
      ? neutral.clone().lerp(warmColor, t / 100)
      : neutral.clone().lerp(coolColor, -t / 100)

    sceneRef.current.traverse((child) => {
      if (child instanceof THREE.DirectionalLight && child !== rimLightRef.current) {
        child.color.copy(tintColor)
      }
    })
  }, [settings.colorTemperature, settings.lightingPreset, settings.lightingIntensity])

  // Environment map (procedural gradient-based)
  useEffect(() => {
    if (!rendererRef.current || !sceneRef.current) return
    const scene = sceneRef.current
    const renderer = rendererRef.current
    const preset = settings.environmentPreset
    const intensity = settings.envIntensity

    if (preset === 'none') {
      scene.environment = null
      return
    }

    // Build a procedural gradient environment
    const envScene = new THREE.Scene()
    const gradientColors: Record<string, { top: THREE.Color; mid: THREE.Color; bot: THREE.Color }> = {
      studio:    { top: new THREE.Color(0.35, 0.35, 0.4),  mid: new THREE.Color(0.5, 0.5, 0.55),   bot: new THREE.Color(0.2, 0.2, 0.22) },
      sunset:    { top: new THREE.Color(0.15, 0.15, 0.4),  mid: new THREE.Color(0.9, 0.4, 0.2),    bot: new THREE.Color(0.5, 0.25, 0.1) },
      dawn:      { top: new THREE.Color(0.2, 0.25, 0.5),   mid: new THREE.Color(0.7, 0.5, 0.6),    bot: new THREE.Color(0.4, 0.35, 0.35) },
      night:     { top: new THREE.Color(0.02, 0.02, 0.08), mid: new THREE.Color(0.05, 0.05, 0.15),  bot: new THREE.Color(0.01, 0.01, 0.03) },
      warehouse: { top: new THREE.Color(0.4, 0.38, 0.35),  mid: new THREE.Color(0.55, 0.52, 0.48), bot: new THREE.Color(0.25, 0.23, 0.2) },
    }
    const colors = gradientColors[preset] || gradientColors.studio

    // Create a gradient on a sphere
    const skyGeo = new THREE.SphereGeometry(100, 32, 16)
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        topColor: { value: colors.top },
        midColor: { value: colors.mid },
        bottomColor: { value: colors.bot },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 midColor;
        uniform vec3 bottomColor;
        varying vec3 vWorldPos;
        void main() {
          float h = normalize(vWorldPos).y;
          vec3 col = h > 0.0 ? mix(midColor, topColor, h) : mix(midColor, bottomColor, -h);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    })
    const skyMesh = new THREE.Mesh(skyGeo, skyMat)
    envScene.add(skyMesh)

    const pmremGenerator = new THREE.PMREMGenerator(renderer)
    pmremGenerator.compileCubemapShader()
    const envMap = pmremGenerator.fromScene(envScene, 0, 0.1, 1000).texture
    scene.environment = envMap
    ;(scene as unknown as { environmentIntensity: number }).environmentIntensity = intensity
    pmremGenerator.dispose()
    skyGeo.dispose()
    skyMat.dispose()

    return () => {
      if (scene.environment === envMap) {
        scene.environment = null
      }
      envMap.dispose()
    }
  }, [settings.environmentPreset, settings.envIntensity])

  // Rim light
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    const { rimLight } = settings

    // Remove existing rim light
    if (rimLightRef.current) {
      scene.remove(rimLightRef.current)
      rimLightRef.current.dispose()
      rimLightRef.current = null
    }

    if (!rimLight.enabled) return

    const light = new THREE.DirectionalLight(
      new THREE.Color(rimLight.color),
      rimLight.intensity
    )
    light.name = '__rim_light__'
    // Position behind the model
    light.position.set(-3, 3, -5)
    light.castShadow = false
    scene.add(light)
    rimLightRef.current = light
  }, [settings.rimLight])

  // Spot light
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    const { spotLight: sl } = settings

    // Remove existing
    if (spotLightRef.current) {
      scene.remove(spotLightRef.current)
      spotLightRef.current.dispose()
      spotLightRef.current = null
    }
    if (spotLightHelperRef.current) {
      scene.remove(spotLightHelperRef.current)
      spotLightHelperRef.current.dispose()
      spotLightHelperRef.current = null
    }

    if (!sl.enabled) return

    const light = new THREE.SpotLight(
      new THREE.Color(sl.color),
      sl.intensity * 2,  // scale up for visibility
      50,
      sl.angle * (Math.PI / 2),
      sl.penumbra
    )
    light.name = '__spot_light__'
    // Position based on angle around the model
    const rad = (sl.positionAngle * Math.PI) / 180
    const dist = 6
    light.position.set(
      Math.cos(rad) * dist,
      sl.height,
      Math.sin(rad) * dist
    )
    light.target.position.set(0, 0, 0)
    light.castShadow = true
    light.shadow.mapSize.set(2048, 2048)
    light.shadow.bias = -0.001
    scene.add(light)
    scene.add(light.target)
    spotLightRef.current = light
  }, [settings.spotLight])

  // Bloom / glow effect (post-processing)
  useEffect(() => {
    const renderer = rendererRef.current
    const scene = sceneRef.current
    const camera = cameraRef.current
    if (!renderer || !scene || !camera) return
    const { bloom } = settings

    if (!bloom.enabled) {
      bloomEnabledRef.current = false
      if (composerRef.current) {
        composerRef.current.dispose()
        composerRef.current = null
        bloomPassRef.current = null
      }
      return
    }

    // Create or update composer
    if (!composerRef.current) {
      const composer = new EffectComposer(renderer)
      composer.addPass(new RenderPass(scene, camera))
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        bloom.intensity,
        bloom.radius,
        bloom.threshold
      )
      composer.addPass(bloomPass)
      composer.addPass(new OutputPass())
      composerRef.current = composer
      bloomPassRef.current = bloomPass
    } else if (bloomPassRef.current) {
      bloomPassRef.current.strength = bloom.intensity
      bloomPassRef.current.radius = bloom.radius
      bloomPassRef.current.threshold = bloom.threshold
    }
    bloomEnabledRef.current = true
  }, [settings.bloom])

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

      // Hide transform controls & selection outline during export
      const tControls = transformControlsRef.current
      const wasAttached = tControls && tControls.object
      if (tControls) tControls.detach()
      const hadOutline = selectionOutlineRef.current
      if (hadOutline) hadOutline.visible = false

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
      if (hadOutline) hadOutline.visible = true
      rendererRef.current.render(sceneRef.current, cameraRef.current)

      if (wasAttached && modelRef.current && tControls) {
        tControls.attach(modelRef.current)
      }
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

    const setTransformMode = (mode: TransformMode) => {
      const tControls = transformControlsRef.current
      const oControls = controlsRef.current
      if (!tControls || !oControls) return

      if (mode === 'orbit') {
        tControls.detach()
        oControls.enabled = true
      } else if (modelRef.current) {
        tControls.attach(modelRef.current)
        oControls.enabled = true
        if (mode === 'grab') tControls.setMode('translate')
        else if (mode === 'rotate') tControls.setMode('rotate')
        else if (mode === 'scale') tControls.setMode('scale')
      }
    }

    const resetModelTransform = () => {
      if (modelRef.current) {
        modelRef.current.position.copy(initialModelPos.current)
        modelRef.current.rotation.copy(initialModelRot.current)
        modelRef.current.scale.copy(initialModelScale.current)
        updateShadowPlanePosition(modelRef.current)
      }
    }

    // --- Material management ---

    const getMaterials = (): MaterialEntry[] => {
      const entries: MaterialEntry[] = []
      if (!modelRef.current) return entries
      modelRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material]
          mats.forEach((mat, idx) => {
            if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial || mat instanceof THREE.MeshBasicMaterial || mat instanceof THREE.MeshPhongMaterial || mat instanceof THREE.MeshLambertMaterial) {
              const id = `${child.uuid}_${idx}`
              if (!originalMaterialColors.current.has(id)) {
                originalMaterialColors.current.set(id, mat.color.clone())
              }
              entries.push({
                id,
                name: mat.name || `Material ${entries.length + 1}`,
                meshName: child.name || `Mesh ${entries.length + 1}`,
                originalColor: '#' + (originalMaterialColors.current.get(id)!).getHexString(),
                currentColor: '#' + mat.color.getHexString(),
                hasTexture: !!mat.map,
              })
            }
          })
        }
      })
      return entries
    }

    const setMaterialColor = (materialId: string, color: string) => {
      if (!modelRef.current) return
      const threeColor = new THREE.Color(color)
      modelRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material]
          mats.forEach((mat, idx) => {
            const id = `${child.uuid}_${idx}`
            if (id === materialId && 'color' in mat) {
              mat.color = threeColor.clone()
              mat.needsUpdate = true
            }
          })
        }
      })
    }

    const resetMaterialColors = () => {
      if (!modelRef.current) return
      modelRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material]
          mats.forEach((mat, idx) => {
            const id = `${child.uuid}_${idx}`
            const orig = originalMaterialColors.current.get(id)
            if (orig && 'color' in mat) {
              mat.color = orig.clone()
              mat.needsUpdate = true
            }
          })
        }
      })
    }

    onReady({ resetCamera, setCameraPreset, exportImage, exportModel, setTransformMode, resetModelTransform, getMaterials, setMaterialColor, resetMaterialColors })
  }, [onReady])

  return <div ref={containerRef} className="viewer-canvas" />
}

export default Viewer
