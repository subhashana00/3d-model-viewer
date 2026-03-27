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
  const shadowPlaneRef = useRef<THREE.Mesh | null>(null)
  const contactShadowGroupRef = useRef<THREE.Group | null>(null)

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
      dirLight.shadow.camera.near = 0.1
      dirLight.shadow.camera.far = 50
      dirLight.shadow.camera.left = -10
      dirLight.shadow.camera.right = 10
      dirLight.shadow.camera.top = 10
      dirLight.shadow.camera.bottom = -10
      dirLight.shadow.normalBias = 0.02
      scene.add(dirLight)
    })
  }, [])

  // Create the shadow ground plane
  const createShadowPlane = useCallback((scene: THREE.Scene) => {
    // Remove existing shadow plane
    if (shadowPlaneRef.current) {
      scene.remove(shadowPlaneRef.current)
      shadowPlaneRef.current.geometry.dispose()
      ;(shadowPlaneRef.current.material as THREE.Material).dispose()
      shadowPlaneRef.current = null
    }

    const planeGeo = new THREE.PlaneGeometry(30, 30)
    const planeMat = new THREE.ShadowMaterial({
      opacity: 0.4,
      color: 0x000000,
    })
    const plane = new THREE.Mesh(planeGeo, planeMat)
    plane.rotation.x = -Math.PI / 2
    plane.position.y = -0.01
    plane.receiveShadow = true
    plane.name = '__shadow_plane__'
    scene.add(plane)
    shadowPlaneRef.current = plane
  }, [])

  // Create contact shadow (baked floor shadow using render target)
  const createContactShadow = useCallback((scene: THREE.Scene) => {
    // Remove existing
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

    // Soft contact shadow disc under the model
    const shadowGeo = new THREE.CircleGeometry(1.5, 64)
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
    gradient.addColorStop(0, 'rgba(0,0,0,0.5)')
    gradient.addColorStop(0.4, 'rgba(0,0,0,0.3)')
    gradient.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 256, 256)

    const shadowTex = new THREE.CanvasTexture(canvas)
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.MultiplyBlending,
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

    // Create shadow plane and contact shadow
    createShadowPlane(scene)
    createContactShadow(scene)

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
  }, [setupLighting, createShadowPlane, createContactShadow])

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
      // Position shadow plane at the bottom of the model
      updateShadowPlanePosition(object)
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
    updateShadowPlanePosition(group)
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
      // Scale contact shadow based on model size
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
    // Toggle shadow plane and contact shadow visibility
    if (shadowPlaneRef.current) {
      shadowPlaneRef.current.visible = settings.showShadows
    }
    if (contactShadowGroupRef.current) {
      contactShadowGroupRef.current.visible = settings.showShadows
    }
  }, [settings.showShadows])

  // Update shadow settings (drop shadow, inner shadow, contact shadow)
  useEffect(() => {
    if (!settings.showShadows) return
    const { shadowSettings } = settings

    // Drop Shadow — controls the ground shadow plane
    if (shadowPlaneRef.current) {
      const mat = shadowPlaneRef.current.material as THREE.ShadowMaterial
      mat.opacity = shadowSettings.dropShadow.enabled ? shadowSettings.dropShadow.opacity : 0
      mat.color = new THREE.Color(shadowSettings.dropShadow.color)

      // Blur: adjust shadow map softness via light shadow radius
      const scene = sceneRef.current
      if (scene) {
        scene.traverse((child) => {
          if (child instanceof THREE.DirectionalLight && child.shadow) {
            child.shadow.radius = shadowSettings.dropShadow.blur
            // Offset shadow position
            child.shadow.camera.updateProjectionMatrix()
          }
        })
      }
      shadowPlaneRef.current.visible = shadowSettings.dropShadow.enabled
    }

    // Contact Shadow
    if (contactShadowGroupRef.current) {
      contactShadowGroupRef.current.visible = shadowSettings.contactShadow
      contactShadowGroupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          ;(child.material as THREE.MeshBasicMaterial).opacity = shadowSettings.contactShadowOpacity
        }
      })
    }

    // Inner Shadow — simulate via hemisphere light ground color darkening + model self-shadow
    if (sceneRef.current && shadowSettings.innerShadow.enabled) {
      const innerColor = new THREE.Color(shadowSettings.innerShadow.color)
      const intensity = shadowSettings.innerShadow.opacity
      // Apply inner shadow as ambient occlusion simulation on model
      if (modelRef.current) {
        modelRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material]
            mats.forEach(mat => {
              if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
                mat.aoMapIntensity = intensity * 3
                // Darken emissive to simulate inner shadow
                mat.emissive = innerColor.clone().multiplyScalar(intensity * 0.1)
                mat.needsUpdate = true
              }
            })
          }
        })
      }
    } else if (modelRef.current) {
      // Reset inner shadow effects
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

    // Needs re-render
    if (rendererRef.current) {
      rendererRef.current.shadowMap.needsUpdate = true
    }
  }, [settings.showShadows, settings.shadowSettings])

  // Update directional light offset for drop shadow offset
  useEffect(() => {
    if (!sceneRef.current || !settings.showShadows) return
    const { dropShadow } = settings.shadowSettings
    sceneRef.current.traverse((child) => {
      if (child instanceof THREE.DirectionalLight && child.shadow) {
        // Apply shadow offset by moving the shadow camera
        child.shadow.camera.left = -10 + dropShadow.offsetX
        child.shadow.camera.right = 10 + dropShadow.offsetX
        child.shadow.camera.top = 10 - dropShadow.offsetY
        child.shadow.camera.bottom = -10 - dropShadow.offsetY
        child.shadow.camera.updateProjectionMatrix()
      }
    })
  }, [settings.shadowSettings.dropShadow.offsetX, settings.shadowSettings.dropShadow.offsetY, settings.showShadows])

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
