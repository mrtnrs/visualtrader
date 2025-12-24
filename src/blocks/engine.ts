import type { Block, MarketState } from './types'
import { getBlockLevelPrice } from './core'

export type TriggerGate = {
  rsi?: { enabled: boolean; period: number; op: 'lt' | 'gt'; value: number }
  volume?: { enabled: boolean; op: 'lt' | 'gt'; value: number; lookback: number }
}

export type TriggerFailAction = 'freeze' | 'partial_fill' | 'override'

export type BlockRuntime = {
  status: 'idle' | 'armed' | 'frozen' | 'filled'
  fillPrice?: number
  fillTimestamp?: number
  filledPercent?: number
  note?: string
  lastPnlPct?: number
  riskLevel?: 'ok' | 'warn' | 'danger'
}

export type IndicatorSnapshot = {
  rsi: number | null
  avgVolume: number | null
}

export function isBlockPriceHit(block: Block, market: MarketState): boolean {
  if (!block.active) {
    return false
  }

  const last = market.lastPrice
  if (typeof last !== 'number') {
    return false
  }

  if (block.kind === 'market') {
    return true
  }

  const level = getBlockLevelPrice(block, market)
  if (level == null || !Number.isFinite(level)) {
    return false
  }

  if (block.kind === 'limit' || block.kind === 'iceberg') {
    return block.side === 'buy' ? last <= level : last >= level
  }

  if (block.kind === 'stop_loss' || block.kind === 'stop_loss_limit') {
    return block.side === 'buy' ? last >= level : last <= level
  }

  if (block.kind === 'take_profit' || block.kind === 'take_profit_limit') {
    return block.side === 'buy' ? last <= level : last >= level
  }

  if (block.kind === 'trailing_stop' || block.kind === 'trailing_stop_limit') {
    return block.side === 'buy' ? last >= level : last <= level
  }

  return false
}

export function evalGates(gates: TriggerGate | undefined, indicators: IndicatorSnapshot): { ok: boolean; reason: string } {
  if (!gates) {
    return { ok: true, reason: '' }
  }

  if (gates.rsi?.enabled) {
    const rsi = indicators.rsi
    if (typeof rsi !== 'number') {
      return { ok: false, reason: 'RSI unavailable' }
    }
    if (gates.rsi.op === 'lt' && !(rsi < gates.rsi.value)) {
      return { ok: false, reason: `RSI >= ${gates.rsi.value}` }
    }
    if (gates.rsi.op === 'gt' && !(rsi > gates.rsi.value)) {
      return { ok: false, reason: `RSI <= ${gates.rsi.value}` }
    }
  }

  if (gates.volume?.enabled) {
    const av = indicators.avgVolume
    if (typeof av !== 'number') {
      return { ok: false, reason: 'Volume unavailable' }
    }
    if (gates.volume.op === 'lt' && !(av < gates.volume.value)) {
      return { ok: false, reason: `Vol >= ${gates.volume.value}` }
    }
    if (gates.volume.op === 'gt' && !(av > gates.volume.value)) {
      return { ok: false, reason: `Vol <= ${gates.volume.value}` }
    }
  }

  return { ok: true, reason: '' }
}

export function stepRuntime(options: {
  block: Block
  market: MarketState
  indicators: IndicatorSnapshot
  prev: BlockRuntime | undefined
  gates?: TriggerGate
  failAction?: TriggerFailAction
  partialFillPercent?: number
  priceHitOverride?: boolean
}): BlockRuntime {
  const { block, market, indicators, prev, gates, failAction, partialFillPercent, priceHitOverride } = options

  const now = Date.now()
  const existing = prev ?? { status: 'idle' as const }

  if (existing.status === 'filled') {
    return existing
  }

  if (!block.active) {
    return { status: 'idle' }
  }

  const priceHit = typeof priceHitOverride === 'boolean' ? priceHitOverride : isBlockPriceHit(block, market)
  if (!priceHit) {
    return existing.status === 'frozen' ? existing : { status: 'armed' }
  }

  const gateResult = evalGates(gates, indicators)
  if (!gateResult.ok) {
    if (failAction === 'override') {
      return {
        status: 'filled',
        fillPrice: typeof market.lastPrice === 'number' ? market.lastPrice : undefined,
        fillTimestamp: now,
        filledPercent: 100,
        note: gateResult.reason,
      }
    }

    if (failAction === 'partial_fill') {
      const pct = typeof partialFillPercent === 'number' ? Math.max(1, Math.min(100, partialFillPercent)) : 25
      return {
        status: 'filled',
        fillPrice: typeof market.lastPrice === 'number' ? market.lastPrice : undefined,
        fillTimestamp: now,
        filledPercent: pct,
        note: gateResult.reason,
      }
    }

    return { status: 'frozen', note: gateResult.reason }
  }

  return {
    status: 'filled',
    fillPrice: typeof market.lastPrice === 'number' ? market.lastPrice : undefined,
    fillTimestamp: now,
    filledPercent: 100,
  }
}

export function linePriceAt(line: { a: { timestamp: number; price: number }; b: { timestamp: number; price: number } }, ts: number): number {
  const t0 = line.a.timestamp
  const t1 = line.b.timestamp
  if (t0 === t1) {
    return line.b.price
  }
  const t = (ts - t0) / (t1 - t0)
  return line.a.price + t * (line.b.price - line.a.price)
}

export function crossed(prevPrice: number | null, nextPrice: number | null, level: number): boolean {
  if (typeof prevPrice !== 'number' || typeof nextPrice !== 'number') {
    return false
  }
  const a = prevPrice - level
  const b = nextPrice - level
  return (a <= 0 && b > 0) || (a >= 0 && b < 0)
}
