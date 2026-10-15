// Vehicle front is -Z. Side shots translate along Z with a fixed optical axis.
export const SHOTS = [
  { p: 0, position: [6.3, 2.8, -6.6], target: [0, 0.65, 0], fov: 36 },
  { p: 0.06, position: [5.9, 2.5, -6.2], target: [0, 0.65, 0], fov: 36 },
  { p: 0.16, position: [4, 0.8, -1.4], target: [0, 0.8, -1.4], fov: 32 },
  { p: 0.4, position: [4, 0.8, 1.4], target: [0, 0.8, 1.4], fov: 32 },
  { p: 0.52, position: [0, 1.05, 6.5], target: [0, 0.65, 0], fov: 38 },
  { p: 0.65, position: [0, 1.05, 6.5], target: [0, 0.65, 0], fov: 38 },
  { p: 0.74, position: [3.5, 0.8, 1.65], target: [0, 0.8, 1.65], fov: 32 },
  { p: 1, position: [3.5, 0.8, -1.65], target: [0, 0.8, -1.65], fov: 32 },
]

export function shotAt(progress, aspect = 16 / 9) {
  const p = Math.min(1, Math.max(0, progress))
  let index = SHOTS.findIndex((shot, i) => i < SHOTS.length - 1 && p <= SHOTS[i + 1].p)
  if (index < 0) index = SHOTS.length - 2
  const a = SHOTS[index], b = SHOTS[index + 1]
  let t = (p - a.p) / (b.p - a.p)
  // Tracking passes run at constant speed; only the connecting shots ease.
  if (index !== 2 && index !== 6) t = t * t * (3 - 2 * t)
  const mix = (x, y) => x + (y - x) * t
  const position = a.position.map((value, i) => mix(value, b.position[i]))
  const target = a.target.map((value, i) => mix(value, b.target[i]))
  if (aspect < 1) {
    // Dolly out along the optical axis; preserve true side-on framing.
    const factor = 2.15
    position.forEach((value, i) => { position[i] = target[i] + (value - target[i]) * factor })
  }
  return { position, target, fov: mix(a.fov, b.fov) }
}

export function rainfallAt(progress) {
  const t = Math.min(1, Math.max(0, (progress - 0.58) / 0.06))
  return t * t * (3 - 2 * t)
}
