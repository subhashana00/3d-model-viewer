import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'

/**
 * Prepares a loaded 3D object: disables wireframe, enables shadows,
 * auto-centers, and normalizes scale to fit a 2-unit bounding box.
 */
export function prepareModel(object: THREE.Object3D): void {
  // Ensure no wireframe and enable shadows
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => { mat.wireframe = false })
        } else {
          child.material.wireframe = false
        }
      }
      child.castShadow = true
      child.receiveShadow = true
    }
  })

  // Auto-center and normalize scale
  const box = new THREE.Box3().setFromObject(object)
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())

  object.position.sub(center)

  const maxDim = Math.max(size.x, size.y, size.z)
  const scale = 2 / maxDim
  object.scale.multiplyScalar(scale)
}

/**
 * Positions the camera at a standard distance looking at the origin
 * and stores the initial position for reset functionality.
 */
export function positionCamera(
  camera: THREE.PerspectiveCamera,
  controls: { target: THREE.Vector3; update: () => void },
  initialPos: THREE.Vector3,
  initialTarget: THREE.Vector3,
  distance = 4
): void {
  camera.position.set(distance, distance * 0.6, distance)
  camera.lookAt(0, 0, 0)
  controls.target.set(0, 0, 0)
  controls.update()

  initialPos.copy(camera.position)
  initialTarget.copy(controls.target)
}

/**
 * Loads a 3D model from a File object. Supports GLB, GLTF, and OBJ formats.
 */
export function loadModelFromFile(file: File): Promise<THREE.Object3D> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const extension = file.name.split('.').pop()?.toLowerCase()

    const onLoad = (object: THREE.Object3D) => {
      prepareModel(object)
      URL.revokeObjectURL(url)
      resolve(object)
    }

    const onError = (error: unknown) => {
      URL.revokeObjectURL(url)
      reject(error)
    }

    if (extension === 'glb' || extension === 'gltf') {
      const loader = new GLTFLoader()
      loader.load(url, (gltf) => onLoad(gltf.scene), undefined, onError)
    } else if (extension === 'obj') {
      const loader = new OBJLoader()
      loader.load(url, (obj) => onLoad(obj), undefined, onError)
    } else {
      URL.revokeObjectURL(url)
      reject(new Error(`Unsupported format: ${extension}`))
    }
  })
}

/**
 * Loads a 3D model from a URL. Assumes GLB/GLTF format.
 */
export function loadModelFromUrl(url: string): Promise<THREE.Object3D> {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader()
    loader.load(
      url,
      (gltf) => {
        prepareModel(gltf.scene)
        resolve(gltf.scene)
      },
      undefined,
      reject
    )
  })
}
