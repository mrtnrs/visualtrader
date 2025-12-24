export const TIME_WINDOW_MS = 5 * 60 * 1000
export const CHART_WIDTH = 2200
export const CHART_HEIGHT = 900
export const CHART_PADDING = 40

export type ChartDims = {
  width: number
  height: number
  padding: number
  paddingLeft?: number
  paddingTop?: number
  paddingRight?: number
  paddingBottom?: number
}

export const DEFAULT_CHART_DIMS: ChartDims = {
  width: CHART_WIDTH,
  height: CHART_HEIGHT,
  padding: CHART_PADDING,
  paddingLeft: 0,
  paddingTop: 0,
  paddingRight: 70,
  paddingBottom: CHART_PADDING,
}

export type ChartTimeframe = '1m' | '5m' | '15m' | '1h' | '1d'

export function timeframeToMs(timeframe: ChartTimeframe) {
  if (timeframe === '1m') return 60_000
  if (timeframe === '5m') return 5 * 60_000
  if (timeframe === '15m') return 15 * 60_000
  if (timeframe === '1h') return 60 * 60_000
  return 24 * 60 * 60_000
}

export function getTimeWindowMs(timeframe: ChartTimeframe, candleCount = 120) {
  return timeframeToMs(timeframe) * candleCount
}

export type PricePoint = { timestamp: number; price: number }
export type PriceDomain = { min: number; max: number }

export function computePriceDomain(points: PricePoint[], lastPrice: number | null): PriceDomain {
  const prices: number[] = []

  for (const p of points) {
    if (Number.isFinite(p.price)) {
      prices.push(p.price)
    }
  }

  if (typeof lastPrice === 'number' && Number.isFinite(lastPrice)) {
    prices.push(lastPrice)
  }

  if (prices.length === 0) {
    return { min: 0, max: 1 }
  }

  let min = Math.min(...prices)
  let max = Math.max(...prices)

  if (min === max) {
    const pad = min === 0 ? 1 : Math.abs(min) * 0.002
    min -= pad
    max += pad
    return { min, max }
  }

  const range = max - min
  const pad = range * 0.06
  min -= pad
  max += pad

  return { min, max }
}

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export function priceToY(price: number, domain: PriceDomain, dims: ChartDims = DEFAULT_CHART_DIMS) {
  const padT = dims.paddingTop ?? dims.padding
  const padB = dims.paddingBottom ?? dims.padding
  const usable = dims.height - padT - padB
  const t = (price - domain.min) / (domain.max - domain.min)
  return padT + (1 - t) * usable
}

export function yToPrice(y: number, domain: PriceDomain, dims: ChartDims = DEFAULT_CHART_DIMS) {
  const padT = dims.paddingTop ?? dims.padding
  const padB = dims.paddingBottom ?? dims.padding
  const usable = dims.height - padT - padB
  const t = 1 - (y - padT) / usable
  return domain.min + t * (domain.max - domain.min)
}

export function timestampToX(
  timestamp: number,
  now: number,
  timeWindowMs: number = TIME_WINDOW_MS,
  dims: ChartDims = DEFAULT_CHART_DIMS,
) {
  const start = now - timeWindowMs / 2
  const padL = dims.paddingLeft ?? dims.padding
  const padR = dims.paddingRight ?? dims.padding
  const usable = dims.width - padL - padR
  const t = (timestamp - start) / timeWindowMs
  return padL + t * usable
}

export function xToTimestamp(
  x: number,
  now: number,
  timeWindowMs: number = TIME_WINDOW_MS,
  dims: ChartDims = DEFAULT_CHART_DIMS,
) {
  const start = now - timeWindowMs / 2
  const padL = dims.paddingLeft ?? dims.padding
  const padR = dims.paddingRight ?? dims.padding
  const usable = dims.width - padL - padR
  const t = (x - padL) / usable
  return start + t * timeWindowMs
}
