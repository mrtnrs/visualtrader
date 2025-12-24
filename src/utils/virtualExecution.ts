import { applySlippage } from './slippage'

import {
  getCirclePriceState,
  getParallelPriceState,
  getRectanglePriceState,
  getLinePriceState,
  type CirclePriceState,
  type ParallelPriceState,
  type RectanglePriceState,
} from './shapeGeometry'
import type { ChartDims, PriceDomain } from './chartMapping'
import type {
  ActivationLine,
  ActionConfig,
  CircleAnnotation,
  ParallelLinesAnnotation,
  RectangleAnnotation,
  ShapeTrigger,
  TriggerAction,
} from './strategyStorage'
import { crossed, linePriceAt } from '../blocks'
import type { PaperAccountV1, PaperExecutionEvent, AccountOrder, AccountOrderType, AccountPosition } from '../contexts/AccountContext'

type Tick = {
  symbol: string
  timestamp: number
  price: number
  prevTimestamp: number
  prevPrice: number
}

type ShapeStateContext = {
  activationLines: ActivationLine[]
  rectangles: RectangleAnnotation[]
  circles: CircleAnnotation[]
  parallelLines: ParallelLinesAnnotation[]

  chartDims: ChartDims
  domain: PriceDomain
  timeCenter: number
  timeWindowMs: number

  thresholdPrice: number
}

const MAX_LEVERAGE = 5
const MARGIN_CALL_LEVEL_PCT = 100
const LIQUIDATION_LEVEL_PCT = 40

function id(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

function sanitizeLeverage(raw: unknown): number {
  const n = typeof raw === 'number' && Number.isFinite(raw) ? raw : 1
  return clamp(Math.round(n), 1, MAX_LEVERAGE)
}

function addEvent(paper: PaperAccountV1, e: Omit<PaperExecutionEvent, 'id'>): PaperAccountV1 {
  const next: PaperExecutionEvent = { id: id('evt'), ...e }
  const existing = Array.isArray(paper.executionEvents) ? paper.executionEvents : []
  const merged = [next, ...existing].slice(0, 500)
  return { ...paper, executionEvents: merged }
}

function sweepClosedOrders(paper: PaperAccountV1): PaperAccountV1 {
  const history = Array.isArray(paper.orderHistory) ? paper.orderHistory : []
  const keep: AccountOrder[] = []
  const moved: AccountOrder[] = []

  for (const o of paper.openOrders) {
    if (o.status === 'open') {
      keep.push(o)
    } else {
      moved.push(o)
    }
  }

  if (moved.length === 0) {
    return paper
  }

  const nextHist = [...moved, ...history].slice(0, 500)
  return { ...paper, openOrders: keep, orderHistory: nextHist }
}

function ensureUsd(paper: PaperAccountV1): number {
  const v = paper.balances?.USD
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

function setUsd(paper: PaperAccountV1, nextUsd: number): PaperAccountV1 {
  return { ...paper, balances: { ...(paper.balances ?? {}), USD: nextUsd } }
}

function getPositionMarginUsedUsd(p: AccountPosition): number {
  if (typeof p.marginUsedUsd === 'number' && Number.isFinite(p.marginUsedUsd) && p.marginUsedUsd >= 0) {
    return p.marginUsedUsd
  }
  if (typeof p.reservedUsd === 'number' && Number.isFinite(p.reservedUsd) && p.reservedUsd >= 0) {
    return p.reservedUsd
  }
  const notional = p.amount * p.entryPrice
  return Number.isFinite(notional) && notional > 0 ? notional : 0
}

function unrealizedPnlUsd(p: AccountPosition, markPrice: number): number {
  if (!(typeof markPrice === 'number' && Number.isFinite(markPrice) && markPrice > 0)) {
    return 0
  }
  const diff = p.side === 'long' ? markPrice - p.entryPrice : p.entryPrice - markPrice
  const pnl = diff * p.amount
  return Number.isFinite(pnl) ? pnl : 0
}

function marginSnapshot(
  paper: PaperAccountV1,
  markPrice: number,
  markSymbol?: string,
): { equityUsd: number; usedMarginUsd: number; marginLevelPct: number } {
  const freeUsd = ensureUsd(paper)
  let usedMarginUsd = 0
  let lockedUsd = 0
  let upnlUsd = 0

  for (const p of paper.openPositions) {
    const mu = getPositionMarginUsedUsd(p)
    usedMarginUsd += mu
    lockedUsd += mu
    const mp = markSymbol && p.symbol !== markSymbol ? p.entryPrice : markPrice
    upnlUsd += unrealizedPnlUsd(p, mp)
  }

  usedMarginUsd = Number.isFinite(usedMarginUsd) ? Math.max(0, usedMarginUsd) : 0
  lockedUsd = Number.isFinite(lockedUsd) ? Math.max(0, lockedUsd) : 0
  upnlUsd = Number.isFinite(upnlUsd) ? upnlUsd : 0

  const equityUsd = freeUsd + lockedUsd + upnlUsd
  const marginLevelPct = usedMarginUsd > 0 ? (equityUsd / usedMarginUsd) * 100 : Number.POSITIVE_INFINITY
  return { equityUsd, usedMarginUsd, marginLevelPct }
}

function actionToOrderType(a: TriggerAction): AccountOrderType | null {
  if (a.type === 'market_buy' || a.type === 'market_sell') return 'market'
  if (a.type === 'limit_buy' || a.type === 'limit_sell') return 'limit'
  if (a.type === 'stop_loss') return 'stop-loss'
  if (a.type === 'stop_loss_limit') return 'stop-loss-limit'
  if (a.type === 'take_profit') return 'take-profit'
  if (a.type === 'take_profit_limit') return 'take-profit-limit'
  if (a.type === 'trailing_stop') return 'trailing-stop'
  if (a.type === 'trailing_stop_limit') return 'trailing-stop-limit'
  return null
}

function orderSideFromAction(a: TriggerAction): 'buy' | 'sell' {
  if (a.type === 'market_sell' || a.type === 'limit_sell') return 'sell'
  if (a.type === 'market_buy' || a.type === 'limit_buy') return 'buy'
  return a.config?.side === 'sell' ? 'sell' : 'buy'
}

function computeOrderAmount(paper: PaperAccountV1, cfg: ActionConfig, price: number): number {
  if (!(typeof price === 'number' && Number.isFinite(price) && price > 0)) {
    return 0
  }

  const unit = cfg.sizeUnit ?? 'usd'
  const raw = typeof cfg.size === 'number' && Number.isFinite(cfg.size) ? cfg.size : 0
  if (raw <= 0) {
    return 0
  }

  if (unit === 'base') {
    return raw
  }

  if (unit === 'percent') {
    const equity = marginSnapshot(paper, price).equityUsd
    const usdAmount = equity * (clamp(raw, 0, 100) / 100)
    return usdAmount / price
  }

  return raw / price
}

function maybeOneShot(a: TriggerAction): boolean {
  if (Boolean(a.config?.oneShot)) {
    return true
  }
  if (Array.isArray(a.children)) {
    return a.children.some(maybeOneShot)
  }
  return false
}

function isTriggerOneShot(trigger: ShapeTrigger): boolean {
  return trigger.actions.some(maybeOneShot)
}

function rectangleEdge(prev: Tick, next: Tick, rect: RectangleAnnotation): 'top' | 'bottom' | 'left' | 'right' | null {
  const minPrice = Math.min(rect.a.price, rect.b.price)
  const maxPrice = Math.max(rect.a.price, rect.b.price)
  const minTs = Math.min(rect.a.timestamp, rect.b.timestamp)
  const maxTs = Math.max(rect.a.timestamp, rect.b.timestamp)

  const prevInside = prev.price >= minPrice && prev.price <= maxPrice && prev.timestamp >= minTs && prev.timestamp <= maxTs
  const nextInside = next.price >= minPrice && next.price <= maxPrice && next.timestamp >= minTs && next.timestamp <= maxTs

  if (prevInside && !nextInside) {
    if (next.price > maxPrice) return 'top'
    if (next.price < minPrice) return 'bottom'
    if (next.timestamp < minTs) return 'left'
    if (next.timestamp > maxTs) return 'right'
  }

  if (!prevInside && nextInside) {
    if (prev.price > maxPrice) return 'top'
    if (prev.price < minPrice) return 'bottom'
    if (prev.timestamp < minTs) return 'left'
    if (prev.timestamp > maxTs) return 'right'
  }

  return null
}

function didTriggerFire(trigger: ShapeTrigger, tick: Tick, ctx: ShapeStateContext): boolean {
  if (!trigger.isActive) {
    return false
  }

  if (trigger.triggeredAt && isTriggerOneShot(trigger)) {
    return false
  }

  const prev = { timestamp: tick.prevTimestamp, price: tick.prevPrice }
  const next = { timestamp: tick.timestamp, price: tick.price }

  if (trigger.shapeType === 'line') {
    const line = ctx.activationLines.find((l) => l.id === trigger.shapeId)
    if (!line) return false

    const prevLevel = linePriceAt(line, prev.timestamp)
    const nextLevel = linePriceAt(line, next.timestamp)

    if (trigger.condition === 'cross_up') {
      return crossed(prev.price, next.price, prevLevel) && next.price > nextLevel
    }
    if (trigger.condition === 'cross_down') {
      return crossed(prev.price, next.price, prevLevel) && next.price < nextLevel
    }
    if (trigger.condition === 'touch') {
      const diff = next.price - nextLevel
      return Math.abs(diff) <= ctx.thresholdPrice
    }

    return false
  }

  if (trigger.shapeType === 'rectangle') {
    const rect = ctx.rectangles.find((r) => r.id === trigger.shapeId)
    if (!rect) return false

    const prevState: RectanglePriceState = getRectanglePriceState(rect, prev.price, prev.timestamp)
    const nextState: RectanglePriceState = getRectanglePriceState(rect, next.price, next.timestamp)

    const edge = rectangleEdge(
      {
        symbol: tick.symbol,
        timestamp: prev.timestamp,
        price: prev.price,
        prevTimestamp: prev.timestamp,
        prevPrice: prev.price,
      },
      {
        symbol: tick.symbol,
        timestamp: next.timestamp,
        price: next.price,
        prevTimestamp: prev.timestamp,
        prevPrice: prev.price,
      },
      rect,
    )

    if (trigger.condition === 'exit_any') {
      return prevState.state === 'inside' && nextState.state === 'outside'
    }
    if (trigger.condition === 'enter_any') {
      return prevState.state === 'outside' && nextState.state === 'inside'
    }

    if (trigger.condition === 'enter_zone') {
      return prevState.state === 'outside' && nextState.state === 'inside'
    }

    if (trigger.condition === 'exit_side') {
      return (
        prevState.state === 'inside' &&
        nextState.state === 'outside' &&
        (edge === 'left' || edge === 'right')
      )
    }

    if (trigger.condition === 'exit_top') return prevState.state === 'inside' && nextState.state === 'outside' && edge === 'top'
    if (trigger.condition === 'exit_bottom') return prevState.state === 'inside' && nextState.state === 'outside' && edge === 'bottom'
    if (trigger.condition === 'exit_left') return prevState.state === 'inside' && nextState.state === 'outside' && edge === 'left'
    if (trigger.condition === 'exit_right') return prevState.state === 'inside' && nextState.state === 'outside' && edge === 'right'

    if (trigger.condition === 'enter_top') return prevState.state === 'outside' && nextState.state === 'inside' && edge === 'top'
    if (trigger.condition === 'enter_bottom') return prevState.state === 'outside' && nextState.state === 'inside' && edge === 'bottom'
    if (trigger.condition === 'enter_left') return prevState.state === 'outside' && nextState.state === 'inside' && edge === 'left'
    if (trigger.condition === 'enter_right') return prevState.state === 'outside' && nextState.state === 'inside' && edge === 'right'

    return false
  }

  if (trigger.shapeType === 'circle') {
    const circle = ctx.circles.find((c) => c.id === trigger.shapeId)
    if (!circle) return false

    const prevState: CirclePriceState = getCirclePriceState(circle, prev.price, prev.timestamp)
    const nextState: CirclePriceState = getCirclePriceState(circle, next.price, next.timestamp)

    if (trigger.condition === 'enter') {
      return prevState.state === 'outside' && nextState.state === 'inside'
    }
    if (trigger.condition === 'exit') {
      return prevState.state === 'inside' && nextState.state === 'outside'
    }
    if (trigger.condition === 'touch_edge') {
      return Boolean(nextState.touchingEdge) && !Boolean(prevState.touchingEdge)
    }

    return false
  }

  if (trigger.shapeType === 'parallel') {
    const p = ctx.parallelLines.find((x) => x.id === trigger.shapeId)
    if (!p) return false

    const prevState: ParallelPriceState = getParallelPriceState(p, prev.price, prev.timestamp, ctx.thresholdPrice)
    const nextState: ParallelPriceState = getParallelPriceState(p, next.price, next.timestamp, ctx.thresholdPrice)

    if (trigger.condition === 'enter_channel') {
      return prevState.state !== 'in_channel' && nextState.state === 'in_channel'
    }

    if (trigger.condition === 'inside_channel') {
      return prevState.state !== 'in_channel' && nextState.state === 'in_channel'
    }

    if (trigger.condition === 'exit_any') {
      return prevState.state === 'in_channel' && nextState.state !== 'in_channel'
    }

    if (trigger.condition === 'break_upper') {
      return prevState.state === 'in_channel' && nextState.state === 'above_upper'
    }

    if (trigger.condition === 'break_lower') {
      return prevState.state === 'in_channel' && nextState.state === 'below_lower'
    }

    return false
  }

  return false
}

function fillPriceForMarket(side: 'buy' | 'sell', lastPrice: number, qty: number, slippageConfig: any): number {
  const config = slippageConfig && typeof slippageConfig === 'object' ? slippageConfig : { enabled: false, model: 'percentage', percentBps: 0 }
  return applySlippage(lastPrice, side, qty, config)
}

function canOpenLeveragedPosition(
  paper: PaperAccountV1,
  marginUsedUsd: number,
  markPrice: number,
  markSymbol?: string,
): { ok: true } | { ok: false; message: string } {
  if (!(Number.isFinite(marginUsedUsd) && marginUsedUsd > 0)) {
    return { ok: false, message: 'Invalid margin requirement' }
  }

  const freeUsd = ensureUsd(paper)
  if (freeUsd < marginUsedUsd) {
    return { ok: false, message: 'Insufficient free USD margin' }
  }

  const snap = marginSnapshot(paper, markPrice, markSymbol)
  const nextUsed = snap.usedMarginUsd + marginUsedUsd
  const nextMarginLevelPct = nextUsed > 0 ? (snap.equityUsd / nextUsed) * 100 : Number.POSITIVE_INFINITY
  if (nextMarginLevelPct < MARGIN_CALL_LEVEL_PCT) {
    return { ok: false, message: `Margin level too low (${nextMarginLevelPct.toFixed(1)}%)` }
  }

  return { ok: true }
}

function openPosition(paper: PaperAccountV1, order: AccountOrder, fillPrice: number, now: number): { paper: PaperAccountV1; position: AccountPosition | null } {
  const usd = ensureUsd(paper)

  if (!(typeof fillPrice === 'number' && Number.isFinite(fillPrice) && fillPrice > 0)) {
    return { paper: addEvent(paper, { timestamp: now, kind: 'error', message: 'Invalid fill price', symbol: order.symbol, orderId: order.id }), position: null }
  }

  const notionalUsd = order.amount * fillPrice
  if (!(Number.isFinite(notionalUsd) && notionalUsd > 0)) {
    return { paper: addEvent(paper, { timestamp: now, kind: 'error', message: 'Invalid notional', symbol: order.symbol, orderId: order.id }), position: null }
  }

  const lev = sanitizeLeverage(order.leverage)
  const marginUsedUsd = notionalUsd / lev

  const ok = canOpenLeveragedPosition(paper, marginUsedUsd, fillPrice, order.symbol)
  if (!ok.ok) {
    return { paper: addEvent(paper, { timestamp: now, kind: 'error', message: ok.message, symbol: order.symbol, orderId: order.id }), position: null }
  }

  const side = order.side === 'buy' ? 'long' : 'short'
  const pos: AccountPosition = {
    id: id('pos'),
    symbol: order.symbol,
    side,
    amount: order.amount,
    entryPrice: fillPrice,
    openedAt: now,
    leverage: lev,
    marginUsedUsd,
  }

  let next = paper
  next = setUsd(next, usd - marginUsedUsd)
  next = { ...next, openPositions: [...next.openPositions, pos] }
  next = addEvent(next, { timestamp: now, kind: 'position_opened', symbol: order.symbol, positionId: pos.id })
  return { paper: next, position: pos }
}

function closePosition(paper: PaperAccountV1, positionId: string, closePercent: number | undefined, fillPrice: number, now: number): PaperAccountV1 {
  const pos = paper.openPositions.find((p) => p.id === positionId)
  if (!pos) {
    return addEvent(paper, { timestamp: now, kind: 'error', message: 'Position not found', positionId })
  }

  const pct = typeof closePercent === 'number' ? clamp(closePercent, 1, 100) : 100
  const closingAmount = pos.amount * (pct / 100)

  if (!(typeof fillPrice === 'number' && Number.isFinite(fillPrice) && fillPrice > 0)) {
    return addEvent(paper, { timestamp: now, kind: 'error', message: 'Invalid fill price', positionId })
  }

  const usd = ensureUsd(paper)

  const totalMarginUsed = getPositionMarginUsedUsd(pos)
  const releasedMargin = totalMarginUsed * (closingAmount / pos.amount)

  const pnl = pos.side === 'long'
    ? (fillPrice - pos.entryPrice) * closingAmount
    : (pos.entryPrice - fillPrice) * closingAmount

  let next = setUsd(paper, usd + releasedMargin + pnl)

  const remaining = pos.amount - closingAmount
  if (remaining > 1e-12) {
    const remainingMargin = totalMarginUsed * (remaining / pos.amount)
    next = {
      ...next,
      openPositions: next.openPositions.map((p) => (p.id === positionId ? { ...p, amount: remaining, marginUsedUsd: remainingMargin } : p)),
    }
  } else {
    next = { ...next, openPositions: next.openPositions.filter((p) => p.id !== positionId) }

    // Cancel any remaining open exit orders for this position, otherwise they become orphaned
    // (lines/pills can still render even though the position + cards are gone).
    next = {
      ...next,
      openOrders: next.openOrders.map((o) => (o.status === 'open' && o.positionId === positionId ? { ...o, status: 'canceled' as const } : o)),
    }

    const hist = {
      id: id('hist'),
      symbol: pos.symbol,
      side: pos.side,
      amount: pos.amount,
      entryPrice: pos.entryPrice,
      exitPrice: fillPrice,
      openedAt: pos.openedAt,
      closedAt: now,
      realizedPnl: pnl,
    }
    next = { ...next, positionHistory: [hist, ...next.positionHistory] }
    next = addEvent(next, { timestamp: now, kind: 'position_closed', symbol: pos.symbol, positionId })
  }
  return next
}

function enforceLiquidation(paper: PaperAccountV1, markPrice: number, now: number, markSymbol?: string): PaperAccountV1 {
  const snap = marginSnapshot(paper, markPrice, markSymbol)
  if (!(snap.marginLevelPct < LIQUIDATION_LEVEL_PCT) || paper.openPositions.length === 0) {
    return paper
  }

  let next = addEvent(paper, { timestamp: now, kind: 'error', message: `Liquidation triggered (margin level ${snap.marginLevelPct.toFixed(1)}%)` })

  // Prevent immediate re-entry by canceling any open orders
  const anyOpen = next.openOrders.some((o) => o.status === 'open')
  if (anyOpen) {
    next = { ...next, openOrders: next.openOrders.map((o) => (o.status === 'open' ? { ...o, status: 'canceled' as const } : o)) }
  }

  // Liquidate largest margin consumers first until margin level recovers or no positions left
  const sorted = [...next.openPositions].sort((a, b) => getPositionMarginUsedUsd(b) - getPositionMarginUsedUsd(a))
  for (const p of sorted) {
    const cur = marginSnapshot(next, markPrice, markSymbol)
    if (!(cur.marginLevelPct < LIQUIDATION_LEVEL_PCT)) {
      break
    }
    next = closePosition(next, p.id, 100, markPrice, now)
  }

  next = { ...next, updatedAt: now }
  return next
}

function normalizeTrailDelta(refPrice: number, raw: number, unit: 'percent' | 'price'): number {
  if (!Number.isFinite(refPrice) || refPrice <= 0) {
    return raw
  }
  return unit === 'percent' ? (refPrice * raw) / 100 : raw
}

function updateTrailingOrder(order: AccountOrder, lastPrice: number): AccountOrder {
  const raw = typeof order.trailingOffset === 'number' ? order.trailingOffset : null
  if (raw == null || !Number.isFinite(raw) || raw <= 0) {
    return order
  }

  const unit = order.trailingOffsetUnit ?? 'price'
  const ref = typeof order.trailRefPrice === 'number' && Number.isFinite(order.trailRefPrice) ? order.trailRefPrice : lastPrice

  if (order.side === 'sell') {
    const nextRef = Math.max(ref, lastPrice)
    const delta = normalizeTrailDelta(nextRef, raw, unit)
    const stopLevel = nextRef - delta
    if (nextRef === ref && order.price === stopLevel) {
      return order
    }
    return { ...order, trailRefPrice: nextRef, price: stopLevel }
  }

  const nextRef = Math.min(ref, lastPrice)
  const delta = normalizeTrailDelta(nextRef, raw, unit)
  const stopLevel = nextRef + delta
  if (nextRef === ref && order.price === stopLevel) {
    return order
  }
  return { ...order, trailRefPrice: nextRef, price: stopLevel }
}

function shouldFillOrder(order: AccountOrder, lastPrice: number): boolean {
  if (order.status !== 'open') {
    return false
  }

  if (order.type === 'market') {
    return true
  }

  if (!(typeof lastPrice === 'number' && Number.isFinite(lastPrice))) {
    return false
  }

  const p = order.price
  if (!(typeof p === 'number' && Number.isFinite(p))) {
    return false
  }

  if (order.type === 'limit') {
    return order.side === 'buy' ? lastPrice <= p : lastPrice >= p
  }

  if (order.type === 'stop-loss' || order.type === 'stop-loss-limit' || order.type === 'trailing-stop' || order.type === 'trailing-stop-limit') {
    return order.side === 'buy' ? lastPrice >= p : lastPrice <= p
  }

  if (order.type === 'take-profit' || order.type === 'take-profit-limit') {
    return order.side === 'buy' ? lastPrice <= p : lastPrice >= p
  }

  return false
}

function cancelOcoSiblings(paper: PaperAccountV1, filled: AccountOrder): PaperAccountV1 {
  const gid = filled.ocoGroupId
  if (!gid) {
    return paper
  }

  const nextOrders = paper.openOrders.map((o) => {
    if (o.id === filled.id) {
      return o
    }
    if (o.status === 'open' && o.ocoGroupId === gid) {
      return { ...o, status: 'canceled' as const }
    }
    return o
  })

  return { ...paper, openOrders: nextOrders }
}

function stepOpenOrders(paper: PaperAccountV1, tick: Tick): PaperAccountV1 {
  const now = Date.now()
  let nextPaper = paper

  let trailChanged = false
  const updatedOrders: AccountOrder[] = []
  for (const o of nextPaper.openOrders) {
    if (o.status !== 'open') {
      updatedOrders.push(o)
      continue
    }

    if (o.type === 'trailing-stop' || o.type === 'trailing-stop-limit') {
      if (o.positionId) {
        const pos = nextPaper.openPositions.find((p) => p.id === o.positionId)
        if (!pos) {
          updatedOrders.push(o)
          continue
        }
      }
      const next = updateTrailingOrder(o, tick.price)
      if (next !== o) {
        trailChanged = true
      }
      updatedOrders.push(next)
      continue
    }

    updatedOrders.push(o)
  }

  if (trailChanged) {
    nextPaper = { ...nextPaper, openOrders: updatedOrders }
  }

  let changed = false
  const filledOrders: AccountOrder[] = []

  for (const o of nextPaper.openOrders) {
    if (!shouldFillOrder(o, tick.price)) {
      continue
    }
    filledOrders.push(o)
  }

  if (filledOrders.length === 0) {
    return nextPaper
  }

  for (const o of filledOrders) {
    if (o.positionId) {
      const filled: AccountOrder = { ...o, status: 'filled', filledAt: now, filledPrice: tick.price }
      nextPaper = { ...nextPaper, openOrders: nextPaper.openOrders.map((x) => (x.id === o.id ? filled : x)) }
      changed = true
      nextPaper = addEvent(nextPaper, { timestamp: now, kind: 'order_filled', symbol: o.symbol, orderId: o.id, positionId: o.positionId })

      const cp = typeof o.closePercent === 'number' ? o.closePercent : 100
      nextPaper = closePosition(nextPaper, o.positionId, cp, tick.price, now)
      nextPaper = cancelOcoSiblings(nextPaper, o)
      continue
    }

    const fillPrice =
      o.type === 'market'
        ? fillPriceForMarket(o.side, tick.price, o.amount, nextPaper.slippageConfig)
        : o.type === 'limit' && typeof o.price === 'number'
          ? o.price
          : tick.price
    const res = openPosition(nextPaper, o, fillPrice, now)
    if (!res.position) {
      const canceled: AccountOrder = { ...o, status: 'canceled' }
      nextPaper = { ...res.paper, openOrders: res.paper.openOrders.map((x) => (x.id === o.id ? canceled : x)) }
      changed = true
      continue
    }

    const filled: AccountOrder = { ...o, status: 'filled', filledAt: now, filledPrice: fillPrice }
    nextPaper = { ...res.paper, openOrders: res.paper.openOrders.map((x) => (x.id === o.id ? filled : x)) }
    changed = true
    nextPaper = addEvent(nextPaper, { timestamp: now, kind: 'order_filled', symbol: o.symbol, orderId: o.id })
  }

  if (!changed) {
    return nextPaper
  }

  nextPaper = { ...nextPaper, updatedAt: now }
  return sweepClosedOrders(nextPaper)
}

function buildOrderFromAction(options: {
  paper: PaperAccountV1
  action: TriggerAction
  tick: Tick
  positionId?: string
  closePercent?: number
  ocoGroupId?: string
}): AccountOrder | null {
  const { paper, action, tick, positionId, closePercent, ocoGroupId } = options
  const cfg = action.config ?? {}

  const type = actionToOrderType(action)
  if (!type) {
    return null
  }

  const side = positionId ? (action.config?.side === 'buy' || action.config?.side === 'sell' ? action.config.side : null) : null

  const orderSide = positionId
    ? side ?? 'sell'
    : orderSideFromAction(action)

  const base: AccountOrder = {
    id: id('ord'),
    symbol: tick.symbol,
    side: orderSide,
    type,
    price: null,
    amount: 0,
    createdAt: Date.now(),
    status: 'open',
    leverage: positionId ? undefined : sanitizeLeverage(cfg.leverage),
    ocoGroupId,
    positionId,
    closePercent,
    trailingOffset: null,
    trailingOffsetUnit: undefined,
    trailRefPrice: null,
  }

  if (type === 'market') {
    const amt = computeOrderAmount(paper, cfg, tick.price)
    return { ...base, amount: amt }
  }

  if (type === 'limit') {
    const price = typeof cfg.limitPrice === 'number' ? cfg.limitPrice : null
    const amt = computeOrderAmount(paper, cfg, tick.price)
    return { ...base, price, amount: amt }
  }

  if (type === 'stop-loss') {
    const price = typeof cfg.stopPrice === 'number' ? cfg.stopPrice : null
    const amt = positionId ? 0 : computeOrderAmount(paper, cfg, tick.price)
    return { ...base, price, amount: positionId ? 0 : amt }
  }

  if (type === 'stop-loss-limit') {
    const price = typeof cfg.stopPrice === 'number' ? cfg.stopPrice : null
    const price2 = typeof cfg.limitPrice === 'number' ? cfg.limitPrice : null
    const amt = positionId ? 0 : computeOrderAmount(paper, cfg, tick.price)
    return { ...base, price, price2, amount: positionId ? 0 : amt }
  }

  if (type === 'take-profit') {
    const price = typeof cfg.triggerPrice === 'number' ? cfg.triggerPrice : null
    const amt = positionId ? 0 : computeOrderAmount(paper, cfg, tick.price)
    return { ...base, price, amount: positionId ? 0 : amt }
  }

  if (type === 'take-profit-limit') {
    const price = typeof cfg.triggerPrice === 'number' ? cfg.triggerPrice : null
    const price2 = typeof cfg.limitPrice === 'number' ? cfg.limitPrice : null
    const amt = positionId ? 0 : computeOrderAmount(paper, cfg, tick.price)
    return { ...base, price, price2, amount: positionId ? 0 : amt }
  }

  if (type === 'trailing-stop' || type === 'trailing-stop-limit') {
    const raw = typeof cfg.trailingOffset === 'number' ? cfg.trailingOffset : null
    const unit = cfg.trailingOffsetUnit ?? 'percent'
    const amt = positionId ? 0 : computeOrderAmount(paper, cfg, tick.price)

    const seed: AccountOrder = {
      ...base,
      amount: positionId ? 0 : amt,
      trailingOffset: raw,
      trailingOffsetUnit: unit,
      trailRefPrice: tick.price,
    }

    const seeded = updateTrailingOrder(seed, tick.price)

    if (type === 'trailing-stop-limit') {
      const price2 = typeof cfg.limitOffset === 'number' ? cfg.limitOffset : null
      return { ...seeded, price2 }
    }

    return seeded
  }

  return null
}

function executeActionChain(options: {
  paper: PaperAccountV1
  triggerId: string
  action: TriggerAction
  tick: Tick
  parentPositionId?: string
  ocoGroupId?: string
}): { paper: PaperAccountV1; positionId?: string } {
  const { paper, triggerId, action, tick, parentPositionId, ocoGroupId } = options
  const now = Date.now()

  if (action.type === 'alert') {
    const msg = typeof action.config?.message === 'string' ? action.config.message : ''
    const nextPaper = addEvent(paper, { timestamp: now, kind: 'alert', symbol: tick.symbol, triggerId, actionId: action.id, message: msg })
    return { paper: nextPaper }
  }

  const isExit =
    action.type === 'stop_loss' ||
    action.type === 'stop_loss_limit' ||
    action.type === 'take_profit' ||
    action.type === 'take_profit_limit' ||
    action.type === 'trailing_stop' ||
    action.type === 'trailing_stop_limit'

  const closePercent = typeof action.config?.closePercent === 'number' ? clamp(action.config.closePercent, 1, 100) : 100

  let paperAfter = paper
  let positionId = parentPositionId

  if (isExit) {
    if (!parentPositionId) {
      paperAfter = addEvent(paperAfter, {
        timestamp: now,
        kind: 'error',
        symbol: tick.symbol,
        triggerId,
        actionId: action.id,
        message: 'Exit action requires a parent position',
      })
      return { paper: paperAfter }
    }

    const pos = paperAfter.openPositions.find((p) => p.id === parentPositionId)
    const side = pos?.side === 'short' ? 'buy' : 'sell'

    const actionWithSide: TriggerAction = { ...action, config: { ...action.config, side } }

    const order = buildOrderFromAction({
      paper: paperAfter,
      action: actionWithSide,
      tick,
      positionId: parentPositionId,
      closePercent,
      ocoGroupId,
    })

    if (!order) {
      paperAfter = addEvent(paperAfter, { timestamp: now, kind: 'error', symbol: tick.symbol, triggerId, actionId: action.id, message: 'Unsupported action type' })
      return { paper: paperAfter }
    }

    const withOrder = { ...paperAfter, openOrders: [order, ...paperAfter.openOrders], updatedAt: now }
    paperAfter = addEvent(withOrder, { timestamp: now, kind: 'order_created', symbol: tick.symbol, triggerId, actionId: action.id, orderId: order.id, positionId: parentPositionId })
  } else {
    const order = buildOrderFromAction({ paper: paperAfter, action, tick })
    if (!order) {
      paperAfter = addEvent(paperAfter, { timestamp: now, kind: 'error', symbol: tick.symbol, triggerId, actionId: action.id, message: 'Unsupported action type' })
      return { paper: paperAfter }
    }

    const withOrder = { ...paperAfter, openOrders: [order, ...paperAfter.openOrders], updatedAt: now }
    paperAfter = addEvent(withOrder, { timestamp: now, kind: 'order_created', symbol: tick.symbol, triggerId, actionId: action.id, orderId: order.id })

    if (order.type === 'market') {
      const qty = order.amount
      const fill = fillPriceForMarket(order.side, tick.price, qty, paperAfter.slippageConfig)

      const res = openPosition(paperAfter, order, fill, now)
      paperAfter = res.paper

      if (!res.position) {
        const canceled = { ...order, status: 'canceled' as const }
        paperAfter = { ...paperAfter, openOrders: paperAfter.openOrders.map((x) => (x.id === order.id ? canceled : x)) }
      } else {
        const filled = { ...order, status: 'filled' as const, filledAt: now, filledPrice: fill }
        paperAfter = { ...paperAfter, openOrders: paperAfter.openOrders.map((x) => (x.id === order.id ? filled : x)) }
        paperAfter = addEvent(paperAfter, { timestamp: now, kind: 'order_filled', symbol: tick.symbol, triggerId, actionId: action.id, orderId: order.id })
        positionId = res.position.id
      }

      paperAfter = sweepClosedOrders(paperAfter)
    }
  }

  if (Array.isArray(action.children) && action.children.length > 0) {
    const childOco = ocoGroupId ?? (positionId ? id('oco') : undefined)
    for (const c of action.children) {
      const res = executeActionChain({
        paper: paperAfter,
        triggerId,
        action: c,
        tick,
        parentPositionId: positionId,
        ocoGroupId: childOco,
      })
      paperAfter = res.paper
    }
  }

  return { paper: paperAfter, positionId }
}

export function stepPaperTradingFromShapeTriggers(options: {
  paper: PaperAccountV1
  shapeTriggers: ShapeTrigger[]
  tick: Tick
  ctx: ShapeStateContext
}): { paper: PaperAccountV1; firedTriggerIds: string[] } {
  const now = Date.now()
  let nextPaper = stepOpenOrders(options.paper, options.tick)
  nextPaper = enforceLiquidation(nextPaper, options.tick.price, now, options.tick.symbol)
  const fired: string[] = []

  for (const t of options.shapeTriggers) {
    const firedNow = didTriggerFire(t, options.tick, options.ctx)
    if (!firedNow) {
      continue
    }

    fired.push(t.id)
    nextPaper = addEvent(nextPaper, { timestamp: now, kind: 'trigger_fired', symbol: options.tick.symbol, triggerId: t.id })

    for (const a of t.actions) {
      const res = executeActionChain({ paper: nextPaper, triggerId: t.id, action: a, tick: options.tick })
      nextPaper = res.paper
    }

    nextPaper = { ...nextPaper, updatedAt: now }
  }

  nextPaper = enforceLiquidation(nextPaper, options.tick.price, now, options.tick.symbol)
  return { paper: nextPaper, firedTriggerIds: fired }
}

export function shouldDeactivateTrigger(trigger: ShapeTrigger, tick: Tick, ctx: ShapeStateContext): boolean {
  if (!trigger.isActive) return false

  if (trigger.shapeType === 'line') {
    const line = ctx.activationLines.find((l) => l.id === trigger.shapeId)
    if (!line) return false

    // Time check: if line is strictly in the past, it cannot be triggered
    // Assuming segment is defined by a and b
    const maxTs = Math.max(line.a.timestamp, line.b.timestamp)
    if (tick.timestamp > maxTs) return true

    const state = getLinePriceState(line, tick.price, tick.timestamp, ctx.thresholdPrice)

    if (trigger.condition === 'cross_up' && state.state === 'above') return true
    if (trigger.condition === 'cross_down' && state.state === 'below') return true
  }

  if (trigger.shapeType === 'rectangle') {
    const rect = ctx.rectangles.find((r) => r.id === trigger.shapeId)
    if (!rect) return false

    const maxTs = Math.max(rect.a.timestamp, rect.b.timestamp)
    if (tick.timestamp > maxTs) return true

    const state = getRectanglePriceState(rect, tick.price, tick.timestamp)

    if (state.state === 'inside' && trigger.condition.startsWith('enter')) return true
    if (state.state === 'outside' && trigger.condition.startsWith('exit')) return true
  }

  if (trigger.shapeType === 'circle') {
    const circle = ctx.circles.find((c) => c.id === trigger.shapeId)
    if (!circle) return false

    // Circles are tricky for time bounds without explicit radius in time domain
    // Skipping strict time check for circle for now

    const state = getCirclePriceState(circle, tick.price, tick.timestamp)

    if (state.state === 'inside' && trigger.condition === 'enter') return true
    if (state.state === 'outside' && trigger.condition === 'exit') return true
  }

  if (trigger.shapeType === 'parallel') {
    const p = ctx.parallelLines.find((x) => x.id === trigger.shapeId)
    if (!p) return false

    const maxTs = Math.max(p.a.timestamp, p.b.timestamp)
    if (tick.timestamp > maxTs) return true

    const state = getParallelPriceState(p, tick.price, tick.timestamp, ctx.thresholdPrice)

    if (trigger.condition === 'break_upper' && state.state === 'above_upper') return true
    if (trigger.condition === 'break_lower' && state.state === 'below_lower') return true

    if (trigger.condition === 'enter_channel' && state.state === 'in_channel') return true

    if ((trigger.condition === 'break_upper' || trigger.condition === 'break_lower' || trigger.condition === 'exit_any') && state.state !== 'in_channel') {
      return true
    }
  }

  return false
}
