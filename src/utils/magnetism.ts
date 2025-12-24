import type { PricePoint } from './chartMapping'

export type MagnetLevel = {
  price: number
  kind: 'round' | 'swing'
  score: number
}

function niceRoundStep(price: number): number {
  const abs = Math.abs(price)
  if (abs >= 100_000) return 1000
  if (abs >= 10_000) return 100
  if (abs >= 1000) return 50
  if (abs >= 100) return 10
  if (abs >= 10) return 1
  return 0.1
}

function findSwingLevels(points: PricePoint[]): MagnetLevel[] {
  if (points.length < 10) {
    return []
  }

  const levels: number[] = []
  const window = 3

  for (let i = window; i < points.length - window; i++) {
    const p = points[i]!.price

    let higher = true
    let lower = true

    for (let k = 1; k <= window; k++) {
      const l = points[i - k]!.price
      const r = points[i + k]!.price
      if (p <= l || p <= r) {
        higher = false
      }
      if (p >= l || p >= r) {
        lower = false
      }
      if (!higher && !lower) {
        break
      }
    }

    if (higher || lower) {
      levels.push(p)
    }
  }

  if (levels.length === 0) {
    return []
  }

  const step = niceRoundStep(levels[Math.floor(levels.length / 2)] ?? levels[0]!)
  const buckets = new Map<number, number>()

  for (const l of levels) {
    const b = Math.round(l / step) * step
    buckets.set(b, (buckets.get(b) ?? 0) + 1)
  }

  return Array.from(buckets.entries())
    .map(([price, count]) => ({ price, kind: 'swing' as const, score: count }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 14)
}

export function computeMagnetLevels(points: PricePoint[], lastPrice: number | null): MagnetLevel[] {
  const out: MagnetLevel[] = []

  if (typeof lastPrice === 'number' && Number.isFinite(lastPrice)) {
    const step = niceRoundStep(lastPrice)
    const center = Math.round(lastPrice / step) * step
    for (let i = -8; i <= 8; i++) {
      const p = center + i * step
      out.push({ price: p, kind: 'round', score: 1 })
    }
  }

  out.push(...findSwingLevels(points))

  const dedup = new Map<number, MagnetLevel>()
  for (const l of out) {
    const key = Math.round(l.price * 100) / 100
    const prev = dedup.get(key)
    if (!prev) {
      dedup.set(key, l)
      continue
    }
    dedup.set(key, { ...prev, score: prev.score + l.score })
  }

  return Array.from(dedup.values()).sort((a, b) => b.score - a.score)
}

export function applyMagnet(price: number, levels: MagnetLevel[], strength01: number): { price: number; snapped: boolean } {
  if (!Number.isFinite(price)) {
    return { price, snapped: false }
  }

  const strength = Math.max(0, Math.min(1, strength01))
  if (strength <= 0 || levels.length === 0) {
    return { price, snapped: false }
  }

  const radius = Math.max(1e-9, Math.abs(price) * (0.0002 + 0.0018 * strength))

  let best: MagnetLevel | null = null
  let bestDist = Number.POSITIVE_INFINITY

  for (const l of levels) {
    const d = Math.abs(l.price - price)
    if (d < bestDist) {
      best = l
      bestDist = d
    }
  }

  if (!best || bestDist > radius) {
    return { price, snapped: false }
  }

  return { price: best.price, snapped: true }
}
