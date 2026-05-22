// Catmull-Rom spline evaluation for camera path preview
import { applyEasing } from '@/lib/easing'
import type { EasingType } from '@/types/protocol'

export type Vec3 = [number, number, number]

export interface SplineKeyframe {
  pos: Vec3
  easing: EasingType
  bezierHandles?: [number, number, number, number]
}

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  return 0.5 * (
    2 * p1 +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t
  )
}

export function catmullRomVec3(p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, t: number): Vec3 {
  return [
    catmullRom(p0[0], p1[0], p2[0], p3[0], t),
    catmullRom(p0[1], p1[1], p2[1], p3[1], t),
    catmullRom(p0[2], p1[2], p2[2], p3[2], t),
  ]
}

/** Build spline path with optional per-segment easing */
export function buildSplinePath(
  positions: Vec3[],
  samplesPerSegment = 20,
  keyframes?: SplineKeyframe[],
): Vec3[] {
  if (positions.length < 2) return positions

  const points: Vec3[] = []
  const n = positions.length

  for (let i = 0; i < n - 1; i++) {
    const p0 = positions[Math.max(0, i - 1)]
    const p1 = positions[i]
    const p2 = positions[i + 1]
    const p3 = positions[Math.min(n - 1, i + 2)]

    // Easing from the keyframe at segment start (i)
    const kf = keyframes?.[i]
    const easing: EasingType = kf?.easing ?? 'linear'
    const handles = kf?.bezierHandles

    for (let s = 0; s < samplesPerSegment; s++) {
      const rawT = s / samplesPerSegment
      const t = applyEasing(rawT, easing, handles)
      points.push(catmullRomVec3(p0, p1, p2, p3, t))
    }
  }
  points.push(positions[n - 1])
  return points
}
