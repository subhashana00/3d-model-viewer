/**
 * Loads an image from a File object and returns an HTMLImageElement.
 */
export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Generates a grayscale depth map from an image using luminance conversion
 * and optional box-blur smoothing.
 */
export function generateDepthMap(
  image: HTMLImageElement,
  smoothness: number = 0
): { depthDataUrl: string; imageDataUrl: string; width: number; height: number } {
  // Cap dimensions for performance
  const maxDim = 1024
  let width = image.width
  let height = image.height
  if (width > maxDim || height > maxDim) {
    const scale = maxDim / Math.max(width, height)
    width = Math.round(width * scale)
    height = Math.round(height * scale)
  }

  // Draw original image
  const imageCanvas = document.createElement('canvas')
  imageCanvas.width = width
  imageCanvas.height = height
  const imageCtx = imageCanvas.getContext('2d')!
  imageCtx.drawImage(image, 0, 0, width, height)
  const imageDataUrl = imageCanvas.toDataURL('image/png')

  // Create depth map
  const depthCanvas = document.createElement('canvas')
  depthCanvas.width = width
  depthCanvas.height = height
  const depthCtx = depthCanvas.getContext('2d')!
  depthCtx.drawImage(image, 0, 0, width, height)

  const imageData = depthCtx.getImageData(0, 0, width, height)
  const data = imageData.data

  // Convert to grayscale using luminance formula
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
    data[i] = gray
    data[i + 1] = gray
    data[i + 2] = gray
  }

  // Apply blur passes for smoothness
  if (smoothness > 0) {
    applyBoxBlur(data, width, height, Math.round(smoothness))
  }

  depthCtx.putImageData(imageData, 0, 0)
  const depthDataUrl = depthCanvas.toDataURL('image/png')

  return { depthDataUrl, imageDataUrl, width, height }
}

/**
 * Simple multi-pass box blur on raw pixel data.
 */
function applyBoxBlur(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  passes: number
): void {
  const copy = new Uint8ClampedArray(data.length)
  const radius = 3

  for (let pass = 0; pass < passes; pass++) {
    copy.set(data)

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, count = 0

        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = Math.min(Math.max(x + dx, 0), width - 1)
            const ny = Math.min(Math.max(y + dy, 0), height - 1)
            const idx = (ny * width + nx) * 4
            r += copy[idx]
            g += copy[idx + 1]
            b += copy[idx + 2]
            count++
          }
        }

        const idx = (y * width + x) * 4
        data[idx] = r / count
        data[idx + 1] = g / count
        data[idx + 2] = b / count
      }
    }
  }
}
