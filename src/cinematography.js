import timeline from './camera-path.json' with { type: 'json' }

export const SHOTS = timeline.knots
export const CINEMA = timeline

function valueAt(progress, key) {
  const p = Math.min(1, Math.max(0, progress))
  let index = SHOTS.findIndex((shot, i) => i < SHOTS.length - 1 && p <= SHOTS[i + 1].p)
  if (index < 0) index = SHOTS.length - 2
  const a = SHOTS[index], b = SHOTS[index + 1]
  const before = SHOTS[Math.max(0, index - 1)], after = SHOTS[Math.min(SHOTS.length - 1, index + 2)]
  const span = b.p - a.p, t = (p - a.p) / span
  const hermite = (v0, v1, previous, next) => {
    const m0 = (v1 - previous) / (b.p - before.p)
    const m1 = (next - v0) / (after.p - a.p)
    return (2*t**3 - 3*t*t + 1)*v0 + (t**3 - 2*t*t + t)*span*m0 + (-2*t**3 + 3*t*t)*v1 + (t**3 - t*t)*span*m1
  }
  return Array.isArray(a[key])
    ? a[key].map((value, i) => hermite(value, b[key][i], before[key][i], after[key][i]))
    : hermite(a[key], b[key], before[key], after[key])
}

export function shotAt(progress) {
  return {
    position: valueAt(progress, 'position'), target: valueAt(progress, 'target'),
    fov: valueAt(progress, 'fov'), roll: valueAt(progress, 'roll'),
  }
}

export function rainfallAt(progress) {
  const t = Math.min(1, Math.max(0, (progress - timeline.rainStart) / (timeline.rainFull - timeline.rainStart)))
  return t*t*(3 - 2*t)
}
