function luminance(rgb) {
  const linear = rgb.map(value => {
    const channel = value / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722
}

function darkenForBanner(rgb) {
  // Preserve more cover brightness while keeping white banner text legible.
  let scale = 1
  while (luminance(rgb.map(value => value * scale)) > 0.1) scale *= 0.95
  return `#${rgb.map(value => Math.floor(value * scale).toString(16).padStart(2, '0')).join('')}`
}

export function bannerColorFromPixels(pixels) {
  const buckets = new Map()
  let opaqueCount = 0
  let colorfulCount = 0
  const total = [0, 0, 0]

  for (let index = 0; index < pixels.length; index += 4) {
    const [r, g, b, alpha] = pixels.subarray(index, index + 4)
    if (alpha < 128) continue
    opaqueCount++
    total[0] += r
    total[1] += g
    total[2] += b
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const saturation = max ? (max - min) / max : 0
    if (max < 24 || min > 235 || saturation < 0.15) continue

    colorfulCount++
    // Group nearby colors so JPEG noise does not split one dominant region.
    const key = `${r >> 5},${g >> 5},${b >> 5}`
    const bucket = buckets.get(key) || { count: 0, sum: [0, 0, 0], score: 0 }
    bucket.count++
    bucket.sum[0] += r
    bucket.sum[1] += g
    bucket.sum[2] += b
    bucket.score += 1 + saturation * 0.5
    buckets.set(key, bucket)
  }

  if (!opaqueCount) return null
  // A tiny colored mark should not tint an otherwise monochrome cover.
  if (colorfulCount < opaqueCount * 0.08 || !buckets.size) {
    return darkenForBanner(total.map(value => value / opaqueCount))
  }
  const dominant = [...buckets.values()].reduce((best, bucket) => bucket.score > best.score ? bucket : best)
  return darkenForBanner(dominant.sum.map(value => value / dominant.count))
}

export async function extractBannerColor(blob) {
  const objectUrl = URL.createObjectURL(blob)
  try {
    const image = new Image()
    image.src = objectUrl
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return null
    // Match the centered square crop used by the visible album cover.
    const side = Math.min(image.naturalWidth, image.naturalHeight)
    context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2,
      side, side, 0, 0, 32, 32)
    return bannerColorFromPixels(context.getImageData(0, 0, 32, 32).data)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
