/** Longest side of a stored image, in pixels. Keeps boards small enough for browser storage. */
const MAX_IMAGE_SIDE = 1600
const MAX_IMAGE_FILE_BYTES = 20 * 1024 * 1024
/** Images are placed at most this wide/tall on the board (world units). */
const MAX_PLACED_SIDE = 480

export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

export function isAcceptedImage(file: File) {
  return ACCEPTED_IMAGE_TYPES.includes(file.type)
}

/**
 * Decode an image file, downscale it and re-encode it as WebP (which keeps
 * transparency). Re-encoding also strips metadata such as GPS location.
 * Returns the data URL and a sensible size to place it at on the board.
 */
export async function prepareImage(file: File) {
  if (!isAcceptedImage(file)) throw new Error('Use a PNG, JPEG, WebP or GIF image.')
  if (file.size > MAX_IMAGE_FILE_BYTES) throw new Error('That image is over 20 MB.')

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const src = canvas.toDataURL('image/webp', 0.85)
  const placed = Math.min(1, MAX_PLACED_SIDE / Math.max(canvas.width, canvas.height))
  return { src, width: Math.round(canvas.width * placed), height: Math.round(canvas.height * placed) }
}

const cache = new Map<string, HTMLImageElement>()

/**
 * A decoded image for drawing on the canvas, or null while it loads.
 * `onLoad` fires once it is ready so the caller can redraw.
 */
export function getDrawableImage(src: string, onLoad?: () => void) {
  let image = cache.get(src)
  if (!image) {
    image = new Image()
    image.src = src
    cache.set(src, image)
  }
  if (image.complete && image.naturalWidth > 0) return image
  if (onLoad) {
    // On error too, so callers waiting for the image never hang; a placeholder is drawn instead.
    image.addEventListener('load', onLoad, { once: true })
    image.addEventListener('error', onLoad, { once: true })
  }
  return null
}
