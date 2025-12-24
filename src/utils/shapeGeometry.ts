import { linePriceAt } from '../blocks'
import { priceToY, timestampToX, type ChartDims, type PriceDomain } from './chartMapping'
import type { ActivationLine, CircleAnnotation, ParallelLinesAnnotation, RectangleAnnotation } from './strategyStorage'

export type ShapeBounds = { x: number; y: number; width: number; height: number }

export type CirclePriceState = { kind: 'circle'; state: 'inside' | 'outside'; touchingEdge: boolean }
export type RectanglePriceState = { kind: 'rectangle'; state: 'inside' | 'outside' }
export type LinePriceState = { kind: 'line'; state: 'above' | 'below' | 'on' }
export type ParallelPriceState = { kind: 'parallel'; state: 'in_channel' | 'above_upper' | 'below_lower' }

export type ShapePriceState = CirclePriceState | RectanglePriceState | LinePriceState | ParallelPriceState

export function getCirclePriceState(
  circle: CircleAnnotation,
  price: number,
  timestamp: number,
  edgeEpsNorm = 0.05,
): CirclePriceState {
  const centerTs = circle.center.timestamp
  const centerPrice = circle.center.price

  const radiusTs = Math.max(1e-9, Math.abs(circle.edge.timestamp - centerTs))
  const radiusPrice = Math.max(1e-9, Math.abs(circle.edge.price - centerPrice))

  const dx = (timestamp - centerTs) / radiusTs
  const dy = (price - centerPrice) / radiusPrice
  const d = Math.hypot(dx, dy)

  const touchingEdge = Math.abs(d - 1) <= edgeEpsNorm
  return { kind: 'circle', state: d <= 1 ? 'inside' : 'outside', touchingEdge }
}

export function computeLineBoundsPx(
  line: ActivationLine,
  now: number,
  timeWindowMs: number,
  dims: ChartDims,
  domain: PriceDomain,
): ShapeBounds {
  const ax = timestampToX(line.a.timestamp, now, timeWindowMs, dims)
  const ay = priceToY(line.a.price, domain, dims)
  const bx = timestampToX(line.b.timestamp, now, timeWindowMs, dims)
  const by = priceToY(line.b.price, domain, dims)
  const x = Math.min(ax, bx)
  const y = Math.min(ay, by)
  const width = Math.max(1, Math.abs(bx - ax))
  const height = Math.max(1, Math.abs(by - ay))
  return { x, y, width, height }
}

export function computeRectangleBoundsPx(
  rect: RectangleAnnotation,
  now: number,
  timeWindowMs: number,
  dims: ChartDims,
  domain: PriceDomain,
): ShapeBounds {
  const ax = timestampToX(rect.a.timestamp, now, timeWindowMs, dims)
  const ay = priceToY(rect.a.price, domain, dims)
  const bx = timestampToX(rect.b.timestamp, now, timeWindowMs, dims)
  const by = priceToY(rect.b.price, domain, dims)
  const x = Math.min(ax, bx)
  const y = Math.min(ay, by)
  const width = Math.max(1, Math.abs(bx - ax))
  const height = Math.max(1, Math.abs(by - ay))
  return { x, y, width, height }
}

export function computeCircleBoundsPx(
  circle: CircleAnnotation,
  now: number,
  timeWindowMs: number,
  dims: ChartDims,
  domain: PriceDomain,
): ShapeBounds & { cx: number; cy: number; r: number } {
  const cx = timestampToX(circle.center.timestamp, now, timeWindowMs, dims)
  const cy = priceToY(circle.center.price, domain, dims)
  const ex = timestampToX(circle.edge.timestamp, now, timeWindowMs, dims)
  const ey = priceToY(circle.edge.price, domain, dims)
  const rx = Math.max(1, Math.abs(ex - cx))
  const ry = Math.max(1, Math.abs(ey - cy))
  const r = Math.max(rx, ry)
  return { x: cx - rx, y: cy - ry, width: rx * 2, height: ry * 2, cx, cy, r }
}

export function computeParallelBoundsPx(
  p: ParallelLinesAnnotation,
  now: number,
  timeWindowMs: number,
  dims: ChartDims,
  domain: PriceDomain,
): ShapeBounds {
  const ax = timestampToX(p.a.timestamp, now, timeWindowMs, dims)
  const ay = priceToY(p.a.price, domain, dims)
  const bx = timestampToX(p.b.timestamp, now, timeWindowMs, dims)
  const by = priceToY(p.b.price, domain, dims)
  const ox = timestampToX(p.offset.timestamp, now, timeWindowMs, dims)
  const oy = priceToY(p.offset.price, domain, dims)
  const dx = ox - ax
  const dy = oy - ay
  const a2x = ax + dx
  const a2y = ay + dy
  const b2x = bx + dx
  const b2y = by + dy

  const minX = Math.min(ax, bx, a2x, b2x)
  const maxX = Math.max(ax, bx, a2x, b2x)
  const minY = Math.min(ay, by, a2y, b2y)
  const maxY = Math.max(ay, by, a2y, b2y)

  return { x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) }
}

export function getLinePriceState(line: ActivationLine, price: number, timestamp: number, thresholdPrice: number): LinePriceState {
  const lineP = linePriceAt(line, timestamp)
  const diff = price - lineP
  if (Math.abs(diff) <= thresholdPrice) {
    return { kind: 'line', state: 'on' }
  }
  return { kind: 'line', state: diff > 0 ? 'above' : 'below' }
}

export function getRectanglePriceState(rect: RectangleAnnotation, price: number, timestamp: number): RectanglePriceState {
  const minPrice = Math.min(rect.a.price, rect.b.price)
  const maxPrice = Math.max(rect.a.price, rect.b.price)
  const minTs = Math.min(rect.a.timestamp, rect.b.timestamp)
  const maxTs = Math.max(rect.a.timestamp, rect.b.timestamp)
  const inside = price >= minPrice && price <= maxPrice && timestamp >= minTs && timestamp <= maxTs
  return { kind: 'rectangle', state: inside ? 'inside' : 'outside' }
}

export function getCirclePriceStatePx(
  circle: CircleAnnotation,
  price: number,
  timestamp: number,
  now: number,
  timeWindowMs: number,
  dims: ChartDims,
  domain: PriceDomain,
  edgeEpsPx = 6,
): CirclePriceState {
  const cx = timestampToX(circle.center.timestamp, now, timeWindowMs, dims)
  const cy = priceToY(circle.center.price, domain, dims)
  const ex = timestampToX(circle.edge.timestamp, now, timeWindowMs, dims)
  const ey = priceToY(circle.edge.price, domain, dims)
  const r = Math.max(1, Math.hypot(ex - cx, ey - cy))
  const px = timestampToX(timestamp, now, timeWindowMs, dims)
  const py = priceToY(price, domain, dims)
  const d = Math.hypot(px - cx, py - cy)
  const touchingEdge = Math.abs(d - r) <= edgeEpsPx
  return { kind: 'circle', state: d <= r ? 'inside' : 'outside', touchingEdge }
}

export function getParallelPriceState(p: ParallelLinesAnnotation, price: number, timestamp: number, thresholdPrice: number): ParallelPriceState {
  const base = linePriceAt({ a: p.a, b: p.b }, timestamp)
  const dt = p.offset.timestamp - p.a.timestamp
  const dp = p.offset.price - p.a.price
  const shifted = linePriceAt(
    {
      a: { timestamp: p.a.timestamp + dt, price: p.a.price + dp },
      b: { timestamp: p.b.timestamp + dt, price: p.b.price + dp },
    },
    timestamp,
  )

  const upper = Math.max(base, shifted)
  const lower = Math.min(base, shifted)

  if (price > upper + thresholdPrice) {
    return { kind: 'parallel', state: 'above_upper' }
  }
  if (price < lower - thresholdPrice) {
    return { kind: 'parallel', state: 'below_lower' }
  }
  return { kind: 'parallel', state: 'in_channel' }
}
