import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ViewportPortal, type Edge, type Node } from '@xyflow/react'

import { useStrategyContext } from '../../contexts/StrategyContext'
import { useAccountContext } from '../../contexts/AccountContext'

import PositionCard from './PositionCard'
import { PositionExitBlock, PositionExitConnector, colorFor as exitBlockColorFor } from './PositionExitBlock'
import ContextMenu, { type ContextMenuItem } from '../ui/ContextMenu'
import TriggerActionConfigModal from './TriggerActionConfigModal'
import {
  DEFAULT_CHART_DIMS,
  timeframeToMs,
  timestampToX,
  xToTimestamp,
  type ChartDims,
  type PricePoint,
  type PriceDomain,
  priceToY,
  yToPrice,
  type ChartTimeframe,
} from '../../utils/chartMapping'
import { blockKindShort, blocksFromReactFlow, getBlockLevelPrice, validateBlock, type MarketState } from '../../blocks'
import type { ActionConfig, ActivationLine, CircleAnnotation, ParallelLinesAnnotation, RectangleAnnotation, ShapeTrigger, TriggerAction, TriggerActionType } from '../../utils/strategyStorage'
import type { AccountOrder } from '../../contexts/AccountContext'


function formatPrice(price: number | null) {
  if (price == null || !Number.isFinite(price)) {
    return '--'
  }
  return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

type ChartMode = 'line' | 'candles'

type Candle = {
  start: number
  open: number
  high: number
  low: number
  close: number
}

function IconLock({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M5.2 7V5.7c0-1.8 1.2-3.2 2.8-3.2s2.8 1.4 2.8 3.2V7"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <rect x="4.2" y="7" width="7.6" height="6.6" rx="1.8" fill="currentColor" fillOpacity="0.9" />
    </svg>
  )
}

function sideColor(side: 'buy' | 'sell') {
  return side === 'buy' ? '#22c55e' : '#ef4444'
}

function niceStep(rawStep: number) {
  if (!Number.isFinite(rawStep) || rawStep <= 0) {
    return 1
  }
  const exp = Math.floor(Math.log10(rawStep))
  const base = Math.pow(10, exp)
  const frac = rawStep / base
  const niceFrac = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10
  return niceFrac * base
}

function nearlyMultiple(value: number, step: number) {
  if (!Number.isFinite(value) || !Number.isFinite(step) || step === 0) {
    return false
  }
  const q = value / step
  return Math.abs(q - Math.round(q)) < 1e-6
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function exitOrderToActionType(order: AccountOrder): TriggerActionType | null {
  if (order.type === 'stop-loss') return 'stop_loss'
  if (order.type === 'stop-loss-limit') return 'stop_loss_limit'
  if (order.type === 'take-profit') return 'take_profit'
  if (order.type === 'take-profit-limit') return 'take_profit_limit'
  if (order.type === 'trailing-stop') return 'trailing_stop'
  if (order.type === 'trailing-stop-limit') return 'trailing_stop_limit'
  return null
}

function exitOrderToConfig(order: AccountOrder, actionType: TriggerActionType): ActionConfig {
  const closePercent = typeof order.closePercent === 'number' && Number.isFinite(order.closePercent) ? order.closePercent : 100

  if (actionType === 'stop_loss') {
    return { stopPrice: order.price ?? undefined, closePercent }
  }
  if (actionType === 'stop_loss_limit') {
    return { stopPrice: order.price ?? undefined, limitPrice: order.price2 ?? undefined, closePercent }
  }
  if (actionType === 'take_profit') {
    return { triggerPrice: order.price ?? undefined, closePercent }
  }
  if (actionType === 'take_profit_limit') {
    return { triggerPrice: order.price ?? undefined, limitPrice: order.price2 ?? undefined, closePercent }
  }
  if (actionType === 'trailing_stop') {
    return {
      trailingOffset: order.trailingOffset ?? undefined,
      trailingOffsetUnit: (order.trailingOffsetUnit ?? 'price') as 'percent' | 'price',
      closePercent,
    }
  }
  if (actionType === 'trailing_stop_limit') {
    return {
      trailingOffset: order.trailingOffset ?? undefined,
      trailingOffsetUnit: (order.trailingOffsetUnit ?? 'price') as 'percent' | 'price',
      limitOffset: order.price2 ?? undefined,
      closePercent,
    }
  }
  return { closePercent }
}


export default function PriceChartLayer({
  timeframe,
  mode,
  timeWindowMs,
  timeCenter,
  domain,
  dims,
  nodes,
  edges,
  shapeTriggers = [],
  selectedShapeId,
  selectedPositionId,
  selectedExitOrderId,
  activationLines,
  circles,
  rectangles,
  parallelLines,
  interactionDisabled,
  selectedNodeId,
  hoverPos,
  isPanning,
  selectedActivationLineId,
  selectedCircleId,
  selectedRectangleId,
  selectedParallelId,
  onSelectActivationLine,
  onSelectCircle,
  onSelectRectangle,
  onSelectParallel,
  onStartDragActivationLineEndpoint,
  onSelectPosition,
  onSelectExitOrder,
  onDropPositionAction,
  onClosePosition,
  onDragPositionExitStart,
  openExitEditorOrderId,
  onConsumeExitEditorOrderId,
}: {
  timeframe: ChartTimeframe
  mode: ChartMode
  timeWindowMs: number
  timeCenter: number
  domain: PriceDomain
  dims: ChartDims
  nodes: Node[]
  edges: Edge[]
  shapeTriggers?: ShapeTrigger[]
  selectedShapeId?: string | null
  selectedPositionId?: string | null
  selectedExitOrderId?: string | null
  activationLines: ActivationLine[]
  circles: CircleAnnotation[]
  rectangles: RectangleAnnotation[]
  parallelLines: ParallelLinesAnnotation[]
  interactionDisabled: boolean
  selectedNodeId: string | null
  hoverPos: { x: number; y: number } | null
  isPanning: boolean
  selectedActivationLineId: string | null
  selectedCircleId: string | null
  selectedRectangleId: string | null
  selectedParallelId: string | null
  onSelectActivationLine: (id: string) => void
  onSelectCircle: (id: string) => void
  onSelectRectangle: (id: string) => void
  onSelectParallel: (id: string) => void
  onStartDragActivationLineEndpoint: (id: string, endpoint: 'a' | 'b') => void
  onSelectPosition?: (id: string | null) => void
  onSelectExitOrder?: (orderId: string | null) => void
  onDropPositionAction?: (positionId: string, blockType: string) => void
  onClosePosition?: (positionId: string) => void
  onDragPositionExitStart?: (orderId: string, startY: number, type: 'price' | 'offset', startVal: number) => void
  openExitEditorOrderId?: string | null
  onConsumeExitEditorOrderId?: () => void
}) {


  const {
    state: { symbol, lastPrice, priceHistory, wsStatus },
  } = useStrategyContext()

  const { state: accountState, dispatch: accountDispatch } = useAccountContext()
  const paper = accountState.paper

  const [exitMenu, setExitMenu] = useState<null | { x: number; y: number; orderId: string }>(null)
  const [exitEditor, setExitEditor] = useState<null | { orderId: string; actionType: TriggerActionType; config: ActionConfig }>(null)

  const onDeleteExitOrder = useCallback(
    (orderId: string) => {
      const paper = accountState.paper
      if (!paper) {
        return
      }

      const order = paper.openOrders.find((o) => o.id === orderId)
      if (!order) {
        return
      }

      const now = Date.now()
      const canceled = { ...order, status: 'canceled' as const }
      const nextPaper = {
        ...paper,
        openOrders: paper.openOrders.filter((o) => o.id !== orderId),
        orderHistory: [canceled, ...(paper.orderHistory ?? [])],
        updatedAt: now,
      }
      accountDispatch({ type: 'set_paper', paper: nextPaper })
    },
    [accountDispatch, accountState.paper],
  )

  const onOpenExitEditor = useCallback(
    (orderId: string) => {
      const paper = accountState.paper
      if (!paper) {
        return
      }
      const order = paper.openOrders.find((o) => o.id === orderId)
      if (!order) {
        return
      }
      const actionType = exitOrderToActionType(order)
      if (!actionType) {
        return
      }
      setExitEditor({ orderId, actionType, config: exitOrderToConfig(order, actionType) })
    },
    [accountState.paper],
  )

  useEffect(() => {
    if (!openExitEditorOrderId) {
      return
    }
    const paper = accountState.paper
    const exists = Boolean(paper?.openOrders?.some((o) => o.id === openExitEditorOrderId))
    if (!exists) {
      return
    }
    setExitMenu(null)
    onOpenExitEditor(openExitEditorOrderId)
    onConsumeExitEditorOrderId?.()
  }, [accountState.paper, onConsumeExitEditorOrderId, onOpenExitEditor, openExitEditorOrderId])

  const onSaveExitEditor = useCallback(
    (next: ActionConfig) => {
      const cur = exitEditor
      const paper = accountState.paper
      const lp = typeof lastPrice === 'number' && Number.isFinite(lastPrice) ? lastPrice : null
      if (!cur || !paper) {
        return
      }

      const now = Date.now()

      const updatedOrders = paper.openOrders.map((o) => {
        if (o.id !== cur.orderId) {
          return o
        }
        const closePercent = typeof next.closePercent === 'number' && Number.isFinite(next.closePercent) ? clamp(next.closePercent, 1, 100) : o.closePercent

        if (cur.actionType === 'stop_loss') {
          const stopPrice = typeof next.stopPrice === 'number' && Number.isFinite(next.stopPrice) ? next.stopPrice : null
          return { ...o, price: stopPrice, price2: null, closePercent }
        }
        if (cur.actionType === 'stop_loss_limit') {
          const stopPrice = typeof next.stopPrice === 'number' && Number.isFinite(next.stopPrice) ? next.stopPrice : null
          const limitPrice = typeof next.limitPrice === 'number' && Number.isFinite(next.limitPrice) ? next.limitPrice : null
          return { ...o, price: stopPrice, price2: limitPrice, closePercent }
        }
        if (cur.actionType === 'take_profit') {
          const triggerPrice = typeof next.triggerPrice === 'number' && Number.isFinite(next.triggerPrice) ? next.triggerPrice : null
          return { ...o, price: triggerPrice, price2: null, closePercent }
        }
        if (cur.actionType === 'take_profit_limit') {
          const triggerPrice = typeof next.triggerPrice === 'number' && Number.isFinite(next.triggerPrice) ? next.triggerPrice : null
          const limitPrice = typeof next.limitPrice === 'number' && Number.isFinite(next.limitPrice) ? next.limitPrice : null
          return { ...o, price: triggerPrice, price2: limitPrice, closePercent }
        }
        if (cur.actionType === 'trailing_stop' || cur.actionType === 'trailing_stop_limit') {
          const raw = typeof next.trailingOffset === 'number' && Number.isFinite(next.trailingOffset) ? next.trailingOffset : o.trailingOffset
          const unit = (next.trailingOffsetUnit ?? o.trailingOffsetUnit ?? 'price') as 'percent' | 'price'
          const limitOffset = typeof next.limitOffset === 'number' && Number.isFinite(next.limitOffset) ? next.limitOffset : null

          const delta = lp && raw != null ? (unit === 'percent' ? (lp * raw) / 100 : raw) : null
          const stopLevel = lp && delta != null ? (o.side === 'sell' ? lp - delta : lp + delta) : o.price

          return {
            ...o,
            trailingOffset: raw ?? null,
            trailingOffsetUnit: unit,
            trailRefPrice: lp,
            price: stopLevel ?? null,
            price2: cur.actionType === 'trailing_stop_limit' ? (limitOffset ?? null) : null,
            closePercent,
          }
        }

        return { ...o, closePercent }
      })

      const nextPaper = { ...paper, openOrders: updatedOrders, updatedAt: now }
      accountDispatch({ type: 'set_paper', paper: nextPaper })
      setExitEditor(null)
    },
    [accountDispatch, accountState.paper, exitEditor, lastPrice],
  )

  const prevPriceRef = useRef<number | null>(null)
  const [lastPriceChangeTs, setLastPriceChangeTs] = useState<number>(() => Date.now())
  const [pulseToken, setPulseToken] = useState(0)

  useEffect(() => {
    if (typeof lastPrice !== 'number' || !Number.isFinite(lastPrice)) {
      return
    }
    if (prevPriceRef.current == null) {
      prevPriceRef.current = lastPrice
      return
    }
    if (prevPriceRef.current === lastPrice) {
      return
    }

    prevPriceRef.current = lastPrice
    const ts = Date.now()
    setLastPriceChangeTs(ts)
    setPulseToken((t) => t + 1)

    const t1 = window.setTimeout(() => setPulseToken((t) => t + 1), 2200)
    const t2 = window.setTimeout(() => setPulseToken((t) => t + 1), 10_200)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [lastPrice])

  const now = timeCenter
  const timeframeMs = timeframeToMs(timeframe)

  const chartDims = dims ?? DEFAULT_CHART_DIMS
  const w = chartDims.width
  const h = chartDims.height
  const padL = chartDims.paddingLeft ?? chartDims.padding
  const padT = chartDims.paddingTop ?? chartDims.padding
  const padR = chartDims.paddingRight ?? chartDims.padding
  const padB = chartDims.paddingBottom ?? chartDims.padding

  const axisLabelRight = w - 4
  const axisTextX = axisLabelRight - 6

  const pulseDuration = useMemo(() => {
    const elapsed = Date.now() - lastPriceChangeTs
    const DECAY_START = 2000
    const DECAY_END = 10_000

    if (elapsed < DECAY_START) {
      return 0.6
    }
    if (elapsed < DECAY_END) {
      const t = (elapsed - DECAY_START) / (DECAY_END - DECAY_START)
      return 0.6 + t * 2.4
    }
    return null
  }, [lastPriceChangeTs, pulseToken])

  const points: PricePoint[] = useMemo(() => {
    const copy = priceHistory.slice().sort((a, b) => a.timestamp - b.timestamp)
    return copy
  }, [priceHistory])

  const visiblePoints = useMemo(() => {
    const start = now - timeWindowMs / 2
    const end = now + timeWindowMs / 2
    const next: PricePoint[] = []
    for (const p of points) {
      if (p.timestamp >= start && p.timestamp <= end) {
        next.push(p)
      }
    }
    return next
  }, [now, points, timeWindowMs])

  const candles: Candle[] = useMemo(() => {
    if (visiblePoints.length === 0) {
      return []
    }

    const byBucket = new Map<number, Candle>()
    for (const p of visiblePoints) {
      const bucketStart = Math.floor(p.timestamp / timeframeMs) * timeframeMs
      const existing = byBucket.get(bucketStart)

      if (!existing) {
        byBucket.set(bucketStart, {
          start: bucketStart,
          open: p.price,
          high: p.price,
          low: p.price,
          close: p.price,
        })
        continue
      }

      existing.high = Math.max(existing.high, p.price)
      existing.low = Math.min(existing.low, p.price)
      existing.close = p.price
    }

    return Array.from(byBucket.values()).sort((a, b) => a.start - b.start)
  }, [timeframeMs, visiblePoints])

  const pathD = useMemo(() => {
    if (visiblePoints.length === 0) {
      return ''
    }

    let d = ''
    for (let i = 0; i < visiblePoints.length; i += 1) {
      const p = visiblePoints[i]
      const x = timestampToX(p.timestamp, now, timeWindowMs, chartDims)
      const y = priceToY(p.price, domain, chartDims)
      d += `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)} `
    }

    return d.trim()
  }, [chartDims, domain, now, timeWindowMs, visiblePoints])

  const areaD = useMemo(() => {
    if (visiblePoints.length === 0) {
      return ''
    }

    const bottomY = h - padB

    let d = ''
    let firstX = 0
    let lastX = 0

    for (let i = 0; i < visiblePoints.length; i += 1) {
      const p = visiblePoints[i]
      const x = timestampToX(p.timestamp, now, timeWindowMs, chartDims)
      const y = priceToY(p.price, domain, chartDims)
      if (i === 0) {
        firstX = x
      }
      lastX = x
      d += `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)} `
    }

    return `${d.trim()} L ${lastX.toFixed(2)} ${bottomY.toFixed(2)} L ${firstX.toFixed(2)} ${bottomY.toFixed(2)} Z`
  }, [chartDims, domain, h, now, padB, timeWindowMs, visiblePoints])

  const lastMarker = useMemo(() => {
    if (lastPrice == null) {
      return null
    }

    const lastPointTs =
      visiblePoints.length > 0
        ? visiblePoints[visiblePoints.length - 1]?.timestamp
        : points.length > 0
          ? points[points.length - 1]?.timestamp
          : null
    if (typeof lastPointTs !== 'number' || !Number.isFinite(lastPointTs)) {
      return null
    }

    const markerTs =
      mode === 'candles'
        ? Math.floor(lastPointTs / timeframeMs) * timeframeMs + timeframeMs / 2
        : lastPointTs

    const y = priceToY(lastPrice, domain, chartDims)
    const x = timestampToX(markerTs, now, timeWindowMs, chartDims)
    return { x, y }
  }, [chartDims, domain, lastPrice, mode, now, points, timeframeMs, timeWindowMs, visiblePoints])

  // Compute price marker color based on mode and candle direction
  const priceMarkerColor = useMemo(() => {
    const defaultColor = '#9788ca' // Purple for line mode

    if (mode !== 'candles' || candles.length === 0) {
      return defaultColor
    }

    // Get the latest candle
    const lastCandle = candles[candles.length - 1]
    if (!lastCandle) {
      return 'rgba(255, 255, 255, 0.55)' // White fallback
    }

    // Green if bullish (close >= open), red if bearish
    return lastCandle.close >= lastCandle.open ? '#22c55e' : '#ef4444'
  }, [candles, mode])

  const yTicks = useMemo(() => {
    const tickCount = Math.max(4, Math.min(9, Math.floor((h - padT - padB) / 70)))
    const ticks: { y: number; value: number; major: boolean; decimals: number }[] = []
    if (!Number.isFinite(domain.min) || !Number.isFinite(domain.max) || domain.min === domain.max) {
      return ticks
    }

    const range = Math.abs(domain.max - domain.min)
    const rawStep = range / Math.max(1, tickCount - 1)
    let step = niceStep(rawStep)
    let start = Math.floor(domain.min / step) * step
    let end = Math.ceil(domain.max / step) * step

    const countFor = (s: number) => {
      const st = Math.floor(domain.min / s) * s
      const en = Math.ceil(domain.max / s) * s
      return Math.round((en - st) / s) + 1
    }

    while (countFor(step) > tickCount + 1) {
      step *= 2
      start = Math.floor(domain.min / step) * step
      end = Math.ceil(domain.max / step) * step
    }

    const majorStep = niceStep(step * 5)

    for (let v = start; v <= end + step / 2; v += step) {
      const y = priceToY(v, domain, chartDims)
      if (y < padT - 1 || y > h - padB + 1) {
        continue
      }
      const major = majorStep >= step ? nearlyMultiple(v, majorStep) : false
      const decimals = step >= 1 ? 0 : Math.max(0, Math.ceil(-Math.log10(step)))
      ticks.push({ y, value: v, major, decimals })
    }

    return ticks
  }, [chartDims, domain, h, padB, padT])

  const xTicks = useMemo(() => {
    const start = now - timeWindowMs / 2
    const end = now + timeWindowMs / 2
    const innerWidth = Math.max(1, w - padL - padR)
    const targetTickCount = Math.max(2, Math.floor(innerWidth / 140))
    const ideal = timeWindowMs / targetTickCount

    const candidates = [
      60_000,
      2 * 60_000,
      5 * 60_000,
      10 * 60_000,
      15 * 60_000,
      30 * 60_000,
      60 * 60_000,
      2 * 60 * 60_000,
      4 * 60 * 60_000,
      6 * 60 * 60_000,
      12 * 60 * 60_000,
      24 * 60 * 60_000,
      2 * 24 * 60 * 60_000,
      7 * 24 * 60 * 60_000,
      30 * 24 * 60 * 60_000,
      90 * 24 * 60 * 60_000,
      180 * 24 * 60 * 60_000,
      365 * 24 * 60 * 60_000,
    ]

    const step = candidates.find((c) => c >= ideal) ?? candidates[candidates.length - 1]
    const first = Math.floor(start / step) * step

    const ticks: { ts: number; x: number; label: string }[] = []
    for (let ts = first; ts <= end; ts += step) {
      const x = timestampToX(ts, now, timeWindowMs, chartDims)
      const d = new Date(ts)
      const label =
        timeWindowMs >= 24 * 60 * 60_000
          ? d.toLocaleDateString(undefined, { month: 'short', day: '2-digit' })
          : d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
      ticks.push({ ts, x, label })
    }

    return ticks
  }, [chartDims, now, padL, padR, timeWindowMs, w])

  const hover = useMemo(() => {
    if (!hoverPos || isPanning) {
      return null
    }

    const hx = Math.max(padL, Math.min(w - padR, hoverPos.x))
    const hy = Math.max(padT, Math.min(h - padB, hoverPos.y))
    const ts = xToTimestamp(hx, now, timeWindowMs, chartDims)
    const price = yToPrice(hy, domain, chartDims)

    const d = new Date(ts)
    const labelTime =
      timeframeToMs(timeframe) >= 24 * 60 * 60_000
        ? d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })
        : d.toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
          second: timeframeToMs(timeframe) <= 60_000 ? '2-digit' : undefined,
        })

    return {
      x: hx,
      y: hy,
      ts,
      price,
      labelTime,
      labelPrice: formatPrice(price),
    }
  }, [chartDims, domain, h, hoverPos, isPanning, now, padB, padL, padR, padT, timeframe, timeWindowMs, w])

  const overlays = useMemo(() => {
    const next: {
      id: string
      y: number
      color: string
      label: string
      dim: boolean
      strong: boolean
    }[] = []

    const range = domain.max - domain.min
    const proximityEps = range > 0 ? range * 0.0125 : 0

    const blocks = blocksFromReactFlow(nodes, edges)
    const byId = new Map(blocks.map((b) => [b.id, b]))

    const market: MarketState = { symbol, lastPrice }

    for (const b of blocks) {
      if (b.kind === 'entry') {
        continue
      }

      const level = getBlockLevelPrice(b, market)
      if (level == null || !Number.isFinite(level)) {
        continue
      }

      const y = priceToY(level, domain, chartDims)

      const validation = validateBlock(b, market)

      const baseColor = b.kind === 'trailing_stop' || b.kind === 'trailing_stop_limit' ? '#38bdf8' : sideColor(b.side)
      const color = validation.level === 'error' ? '#ef4444' : validation.level === 'warn' ? '#f59e0b' : baseColor
      const dim = !b.active
      const closePct = typeof b.allocation.closePercent === 'number' ? b.allocation.closePercent : null

      let pnlSuffix = ''
      const parentId = b.parentId
      if (parentId) {
        const parent = byId.get(parentId)
        if (parent && parent.kind !== 'entry') {
          const entryPrice =
            typeof parent.params?.limitPrice === 'number'
              ? parent.params.limitPrice
              : Number.isFinite(parent.anchor.price)
                ? parent.anchor.price
                : null
          const qty = typeof parent.allocation.quantity === 'number' ? parent.allocation.quantity : null
          if (entryPrice != null && qty != null && entryPrice > 0) {
            const sign = parent.side === 'sell' ? -1 : 1
            const pnlPct = (sign * (level - entryPrice) * 100) / entryPrice
            const portion = closePct != null ? closePct / 100 : 1
            const pnlQuote = sign * (level - entryPrice) * qty * portion
            const pctStr = `${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%`
            const quoteStr = `${pnlQuote >= 0 ? '+' : ''}${pnlQuote.toFixed(2)}`
            pnlSuffix = ` · ${pctStr} / ${quoteStr}`
          }
        }
      }

      const near = typeof lastPrice === 'number' && proximityEps > 0 ? Math.abs(lastPrice - level) <= proximityEps : false
      const strong = b.id === selectedNodeId || near

      const suffix =
        closePct != null && (b.kind === 'trailing_stop' || b.kind === 'trailing_stop_limit') ? ` · ${closePct}%` : ''

      next.push({
        id: b.id,
        y,
        color,
        dim,
        strong,
        label: `${blockKindShort(b.kind)} ${b.label}${suffix}${pnlSuffix}${validation.ok ? '' : ` · ${validation.message}`}`,
      })
    }

    const toY = (price: number) => priceToY(price, domain, chartDims)
    const fmt = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 2 })

    const collectActions = (acts: TriggerAction[], out: TriggerAction[]) => {
      for (const a of acts) {
        out.push(a)
        if (Array.isArray(a.children) && a.children.length) {
          collectActions(a.children, out)
        }
      }
    }

    if (Array.isArray(shapeTriggers) && shapeTriggers.length > 0) {
      for (const t of shapeTriggers) {
        const all: TriggerAction[] = []
        collectActions(t.actions, all)

        for (const a of all) {
          const cfg = a.config ?? {}

          let level: number | null = null
          let color = '#9788ca'
          let label = ''

          if ((a.type === 'limit_buy' || a.type === 'limit_sell' || a.type === 'stop_loss_limit' || a.type === 'take_profit_limit') && typeof cfg.limitPrice === 'number') {
            level = cfg.limitPrice
            color = a.type === 'limit_buy' ? '#22c55e' : a.type === 'limit_sell' ? '#ef4444' : '#9788ca'
          }

          if ((a.type === 'stop_loss' || a.type === 'stop_loss_limit') && typeof cfg.stopPrice === 'number') {
            level = cfg.stopPrice
            color = '#ef4444'
          }

          if ((a.type === 'take_profit' || a.type === 'take_profit_limit') && typeof cfg.triggerPrice === 'number') {
            level = cfg.triggerPrice
            color = '#22c55e'
          }

          if ((a.type === 'trailing_stop' || a.type === 'trailing_stop_limit') && typeof lastPrice === 'number' && typeof cfg.trailingOffset === 'number') {
            const unit = cfg.trailingOffsetUnit ?? 'percent'
            const raw = cfg.trailingOffset
            const delta = unit === 'percent' ? (lastPrice * raw) / 100 : raw
            const side = cfg.side === 'buy' ? 'buy' : 'sell'
            level = side === 'buy' ? lastPrice + delta : lastPrice - delta
            color = '#38bdf8'
          }

          if (level != null && Number.isFinite(level)) {
            label = `${fmt(level)}`
            next.push({
              id: `shape_trigger_action_${t.id}_${a.id}`,
              y: toY(level),
              color,
              dim: !t.isActive,
              strong: Boolean(selectedShapeId) && t.shapeId === selectedShapeId,
              label,
            })
          }
        }
      }
    }

    if (paper?.openPositions?.length) {
      for (const p of paper.openPositions) {
        if (p.symbol !== symbol) {
          continue
        }
        const entry = p.entryPrice
        if (!(typeof entry === 'number' && Number.isFinite(entry))) {
          continue
        }
        const y = toY(entry)
        next.push({
          id: `paper_pos_${p.id}`,
          y,
          color: p.side === 'long' ? '#22c55e' : '#ef4444',
          dim: false,
          strong: true,
          label: `${fmt(entry)}`,
        })
      }
    }

    if (paper?.openOrders?.length) {
      for (const o of paper.openOrders) {
        if (o.status !== 'open') {
          continue
        }
        if (!o.positionId) {
          continue
        }
        if (o.symbol !== symbol) {
          continue
        }
        if (!(typeof o.price === 'number' && Number.isFinite(o.price))) {
          continue
        }

        const kind =
          o.type === 'stop-loss' || o.type === 'stop-loss-limit'
            ? 'SL'
            : o.type === 'take-profit' || o.type === 'take-profit-limit'
              ? 'TP'
              : o.type === 'trailing-stop' || o.type === 'trailing-stop-limit'
                ? 'TRAIL'
                : null
        if (!kind) {
          continue
        }

        const color =
          kind === 'SL'
            ? '#ef4444'
            : kind === 'TP'
              ? '#22c55e'
              : '#38bdf8'

        const pct = typeof o.closePercent === 'number' && Number.isFinite(o.closePercent) ? o.closePercent : null
        const suffix = pct != null && pct !== 100 ? ` · ${pct}%` : ''

        next.push({
          id: `paper_pos_ord_${o.id}`,
          y: toY(o.price),
          color,
          dim: false,
          strong: (typeof selectedExitOrderId === 'string' && o.id === selectedExitOrderId) || (Boolean(selectedPositionId) && o.positionId === selectedPositionId),
          label: `${kind} ${fmt(o.price)}${suffix}`,
        })
      }
    }

    return next
  }, [chartDims, domain, edges, lastPrice, nodes, paper?.openOrders, paper?.openPositions, selectedNodeId, selectedPositionId, selectedShapeId, shapeTriggers, symbol])

  const [dropHoverPosId, setDropHoverPosId] = useState<string | null>(null)

  const positionExitBlocks = useMemo(() => {
    if (!paper?.openPositions?.length || !paper?.openOrders?.length) {
      return null
    }

    const W = 150
    const posLeft = w - padR - W - 20
    const blockW = 120
    const blockH = 72
    const nodes: ReactNode[] = []

    const fmt = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 2 })
    const axisLabelWidth = (label: string) => Math.max(68, Math.min(190, label.length * 7 + 18))

    for (const pos of paper.openPositions) {
      if (pos.symbol !== symbol) {
        continue
      }

      const entry = pos.entryPrice
      if (!(typeof entry === 'number' && Number.isFinite(entry))) {
        continue
      }

      const posY = priceToY(entry, domain, chartDims)
      const orders = paper.openOrders.filter((o) => o.status === 'open' && o.positionId === pos.id && o.symbol === symbol)
      if (orders.length === 0) {
        continue
      }

      for (const o of orders) {
        if (!(typeof o.price === 'number' && Number.isFinite(o.price))) {
          continue
        }
        const price = o.price
        const y = priceToY(price, domain, chartDims)
        const top = clamp(y - blockH / 2, padT + 8, h - padB - blockH - 8)
        const color = exitBlockColorFor(o.type)

        const closePercent = typeof o.closePercent === 'number' && Number.isFinite(o.closePercent) ? o.closePercent : 100
        const pnlPct = (() => {
          if (!(entry > 0)) {
            return null
          }
          const raw = pos.side === 'long' ? ((price - entry) * 100) / entry : ((entry - price) * 100) / entry
          return Number.isFinite(raw) ? raw : null
        })()

        const kind =
          o.type === 'stop-loss' || o.type === 'stop-loss-limit'
            ? 'SL'
            : o.type === 'take-profit' || o.type === 'take-profit-limit'
              ? 'TP'
              : o.type === 'trailing-stop' || o.type === 'trailing-stop-limit'
                ? 'TRAIL'
                : null

        const pct = typeof o.closePercent === 'number' && Number.isFinite(o.closePercent) ? o.closePercent : null
        const suffix = pct != null && pct !== 100 ? ` · ${pct}%` : ''
        const axisLabel = `${kind ?? ''} ${fmt(price)}${suffix}`.trim()
        const wLabel = axisLabelWidth(axisLabel)
        const pillLeft = axisLabelRight - wLabel
        const left = pillLeft - blockW

        // Draggable strip along the horizontal level between the card and the axis pill
        nodes.push(
          <div
            key={`pos_exit_drag_strip_${o.id}`}
            style={{
              position: 'absolute',
              left: left + blockW,
              top: y - 8,
              width: Math.max(1, (w - padR) - (left + blockW)),
              height: 16,
              cursor: interactionDisabled ? 'default' : 'ns-resize',
              pointerEvents: interactionDisabled ? 'none' : 'auto',
              background: 'transparent',
              zIndex: 153,
            }}
            onPointerDown={(e) => {
              if (!onDragPositionExitStart) {
                return
              }
              if (interactionDisabled) {
                return
              }
              if (e.button !== 0) {
                return
              }
              e.preventDefault()
              e.stopPropagation()

              const dragType: 'price' | 'offset' =
                o.type === 'trailing-stop' || o.type === 'trailing-stop-limit' ? 'offset' : 'price'
              const startVal =
                dragType === 'offset'
                  ? (typeof o.trailingOffset === 'number' ? o.trailingOffset : 0)
                  : (typeof o.price === 'number' ? o.price : 0)
              onDragPositionExitStart(o.id, e.clientY, dragType, startVal)
            }}
          />,
        )

        nodes.push(
          <div
            key={`pos_exit_drag_${o.id}`}
            style={{
              position: 'absolute',
              left: pillLeft,
              top: y - 10,
              width: wLabel,
              height: 20,
              cursor: interactionDisabled ? 'default' : 'ns-resize',
              pointerEvents: interactionDisabled ? 'none' : 'auto',
              background: 'transparent',
              zIndex: 154,
            }}
            onPointerDown={(e) => {
              if (!onDragPositionExitStart) {
                return
              }
              if (interactionDisabled) {
                return
              }
              if (e.button !== 0) {
                return
              }
              e.preventDefault()
              e.stopPropagation()

              const dragType: 'price' | 'offset' =
                o.type === 'trailing-stop' || o.type === 'trailing-stop-limit' ? 'offset' : 'price'
              const startVal =
                dragType === 'offset' ? (typeof o.trailingOffset === 'number' ? o.trailingOffset : 0) : (typeof o.price === 'number' ? o.price : 0)
              onDragPositionExitStart(o.id, e.clientY, dragType, startVal)
            }}
          />,
        )

        nodes.push(
          <PositionExitConnector
            key={`pos_exit_link_${o.id}`}
            orderId={o.id}
            posLeft={posLeft}
            posY={posY}
            y={y}
            left={left}
            blockWidth={blockW}
            color={color}
          />,
        )

        nodes.push(
          <PositionExitBlock
            key={`pos_exit_block_${o.id}`}
            order={o}
            pnlPct={pnlPct}
            closePercent={closePercent}
            selected={typeof selectedExitOrderId === 'string' && selectedExitOrderId === o.id}
            left={left}
            top={top}
            width={blockW}
            height={blockH}
            interactionDisabled={interactionDisabled}
            onSelect={(orderId) => {
              onSelectExitOrder?.(orderId)
            }}
            onContextMenu={(orderId, e) => {
              setExitEditor(null)
              setExitMenu({ x: e.clientX, y: e.clientY, orderId })
            }}
          />,
        )
      }
    }

    return nodes.length ? nodes : null
  }, [chartDims, domain, h, interactionDisabled, onDragPositionExitStart, padB, padR, padT, paper?.openOrders, paper?.openPositions, symbol, w])

  const positionCards = useMemo(() => {
    if (!paper?.openPositions?.length) {
      return null
    }

    const lp = typeof lastPrice === 'number' && Number.isFinite(lastPrice) ? lastPrice : null
    const W = 150
    const H = 72
    const left = w - padR - W - 20

    return paper.openPositions
      .filter((p) => p.symbol === symbol)
      .map((p) => {
        const entry = p.entryPrice
        if (!(typeof entry === 'number' && Number.isFinite(entry))) {
          return null
        }

        const y = priceToY(entry, domain, chartDims)
        const top = clamp(y - H / 2, padT + 8, h - padB - H - 8)

        const selected = Boolean(selectedPositionId) && selectedPositionId === p.id
        const dropHover = dropHoverPosId === p.id

        return (
          <PositionCard
            key={`pos_card_${p.id}`}
            position={p}
            left={left}
            top={top}
            width={W}
            height={H}
            selected={selected}
            dropHover={dropHover}
            lastPrice={lp}
            interactionDisabled={interactionDisabled}
            onSelect={onSelectPosition}
            onClose={onClosePosition}
            onDragOver={(e, id) => {
              e.dataTransfer.dropEffect = 'copy'
              setDropHoverPosId(id)
            }}
            onDragLeave={(_e, id) => {
              setDropHoverPosId((cur) => (cur === id ? null : cur))
            }}
            onDrop={(e, id) => {
              const blockType = e.dataTransfer.getData('application/krakenforge-block')
              if (blockType) {
                onDropPositionAction?.(id, blockType)
              }
              setDropHoverPosId(null)
            }}
          />
        )
      })
      .filter(Boolean)
  }, [chartDims, domain, dropHoverPosId, h, interactionDisabled, lastPrice, onClosePosition, onDropPositionAction, onSelectPosition, padB, padR, padT, paper?.openPositions, selectedPositionId, symbol, w])

  const visibleLines = useMemo(() => {
    const start = now - timeWindowMs / 2
    const end = now + timeWindowMs / 2
    const next: Array<ActivationLine & { ax: number; ay: number; bx: number; by: number }> = []

    for (const l of activationLines) {
      const ax = timestampToX(l.a.timestamp, now, timeWindowMs, chartDims)
      const ay = priceToY(l.a.price, domain, chartDims)
      const bx = timestampToX(l.b.timestamp, now, timeWindowMs, chartDims)
      const by = priceToY(l.b.price, domain, chartDims)

      const tMin = Math.min(l.a.timestamp, l.b.timestamp)
      const tMax = Math.max(l.a.timestamp, l.b.timestamp)

      if (tMax < start || tMin > end) {
        continue
      }

      next.push({ ...l, ax, ay, bx, by })
    }

    return next
  }, [activationLines, chartDims, domain, now, timeWindowMs])

  const visibleCircles = useMemo(() => {
    const next: Array<CircleAnnotation & { cx: number; cy: number; ex: number; ey: number; rx: number; ry: number }> = []
    for (const c of circles || []) {
      const cx = timestampToX(c.center.timestamp, now, timeWindowMs, chartDims)
      const cy = priceToY(c.center.price, domain, chartDims)
      const ex = timestampToX(c.edge.timestamp, now, timeWindowMs, chartDims)
      const ey = priceToY(c.edge.price, domain, chartDims)
      const rx = Math.max(1, Math.abs(ex - cx))
      const ry = Math.max(1, Math.abs(ey - cy))
      next.push({ ...c, cx, cy, ex, ey, rx, ry })
    }
    return next
  }, [chartDims, circles, domain, now, timeWindowMs])

  const visibleRectangles = useMemo(() => {
    const next: Array<RectangleAnnotation & { ax: number; ay: number; bx: number; by: number; x: number; y: number; w: number; h: number }> = []
    for (const r of rectangles || []) {
      const ax = timestampToX(r.a.timestamp, now, timeWindowMs, chartDims)
      const ay = priceToY(r.a.price, domain, chartDims)
      const bx = timestampToX(r.b.timestamp, now, timeWindowMs, chartDims)
      const by = priceToY(r.b.price, domain, chartDims)
      const x = Math.min(ax, bx)
      const y = Math.min(ay, by)
      const w = Math.max(1, Math.abs(bx - ax))
      const h = Math.max(1, Math.abs(by - ay))
      next.push({ ...r, ax, ay, bx, by, x, y, w, h })
    }
    return next
  }, [chartDims, domain, now, rectangles, timeWindowMs])

  const visibleParallels = useMemo(() => {
    const next: Array<
      ParallelLinesAnnotation & {
        ax: number
        ay: number
        bx: number
        by: number
        ox: number
        oy: number
        a2x: number
        a2y: number
        b2x: number
        b2y: number
      }
    > = []
    for (const p of parallelLines || []) {
      const ax = timestampToX(p.a.timestamp, now, timeWindowMs, chartDims)
      const ay = priceToY(p.a.price, domain, chartDims)
      const bx = timestampToX(p.b.timestamp, now, timeWindowMs, chartDims)
      const by = priceToY(p.b.price, domain, chartDims)
      const ox = timestampToX(p.offset.timestamp, now, timeWindowMs, chartDims)
      const oy = priceToY(p.offset.price, domain, chartDims)
      const dx = ox - ax
      const dy = oy - ay
      next.push({ ...p, ax, ay, bx, by, ox, oy, a2x: ax + dx, a2y: ay + dy, b2x: bx + dx, b2y: by + dy })
    }
    return next
  }, [chartDims, domain, now, parallelLines, timeWindowMs])

  return (
    <ViewportPortal>
      <div style={{ position: 'absolute', left: 0, top: 0, zIndex: -10, pointerEvents: 'none' }}>
        <svg width={w} height={h}>
          <defs>
            <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#9788ca" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#5c45af" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="priceStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#5c45af" />
              <stop offset="100%" stopColor="#9788ca" />
            </linearGradient>
          </defs>

          <rect x={0} y={0} width={w} height={h} fill="var(--kf-canvas)" />
          <rect
            x={padL}
            y={padT}
            width={w - padL - padR}
            height={h - padT - padB}
            fill="var(--kf-canvas)"
            stroke="var(--kf-text)"
            strokeOpacity={0.06}
          />

          <rect
            x={w - padR}
            y={padT}
            width={padR}
            height={h - padT - padB}
            fill="rgba(var(--kf-deep-rgb), 0.28)"
            stroke="var(--kf-text)"
            strokeOpacity={0.06}
          />

          {xTicks.map((t) => (
            <g key={t.ts}>
              <line
                x1={t.x}
                x2={t.x}
                y1={padT}
                y2={h - padB}
                stroke="var(--kf-text)"
                strokeOpacity={0.08}
                strokeDasharray="4 6"
              />
              <text x={t.x} y={h - padB + 18} fill="var(--kf-text)" opacity={0.45} fontSize={11} textAnchor="middle">
                {t.label}
              </text>
            </g>
          ))}

          {hover ? (
            <g style={{ pointerEvents: 'none' }}>
              <line
                x1={padL}
                x2={w - padR}
                y1={hover.y}
                y2={hover.y}
                stroke="var(--kf-text)"
                strokeOpacity={0.35}
                strokeDasharray="4 6"
              />
              <line
                x1={hover.x}
                x2={hover.x}
                y1={padT}
                y2={h - padB}
                stroke="var(--kf-text)"
                strokeOpacity={0.35}
                strokeDasharray="4 6"
              />

              {(() => {
                const label = hover.labelPrice
                const wLabel = Math.max(58, Math.min(120, label.length * 7 + 20))
                return (
                  <g>
                    <rect
                      x={axisLabelRight - wLabel}
                      y={hover.y - 10}
                      width={wLabel}
                      height={20}
                      rx={10}
                      fill="rgba(var(--kf-deep-rgb), 0.82)"
                      stroke="rgba(255,255,255,0.14)"
                    />
                    <text x={axisTextX} y={hover.y + 4} fill="var(--kf-text)" fontSize={11} fontWeight={850} textAnchor="end">
                      {label}
                    </text>
                  </g>
                )
              })()}

              {(() => {
                const label = hover.labelTime
                const wLabel = Math.max(84, Math.min(180, label.length * 6.4 + 26))
                return (
                  <g>
                    <rect
                      x={hover.x - wLabel / 2}
                      y={h - padB + 4}
                      width={wLabel}
                      height={20}
                      rx={10}
                      fill="var(--kf-surface-4)"
                      stroke="var(--kf-border-2)"
                    />
                    <text x={hover.x} y={h - padB + 18} fill="var(--kf-text)" fontSize={11} fontWeight={750} textAnchor="middle">
                      {label}
                    </text>
                  </g>
                )
              })()}
            </g>
          ) : null}

          {yTicks.map((t) => (
            <g key={`${t.value}_${t.major ? 'm' : 'n'}`}>
              <line
                x1={padL}
                x2={w - padR}
                y1={t.y}
                y2={t.y}
                stroke="var(--kf-text)"
                strokeOpacity={t.major ? 0.12 : 0.08}
                strokeWidth={t.major ? 1.6 : 1}
                strokeDasharray="4 6"
              />
              {(() => {
                const label = t.value.toLocaleString(undefined, { maximumFractionDigits: t.decimals, minimumFractionDigits: t.decimals })
                const wLabel = Math.max(56, Math.min(120, label.length * 7 + 18))
                return (
                  <g>
                    <rect
                      x={axisLabelRight - wLabel}
                      y={t.y - 10}
                      width={wLabel}
                      height={20}
                      rx={10}
                      fill="rgba(var(--kf-deep-rgb), 0.52)"
                      stroke="rgba(255,255,255,0.08)"
                      opacity={0.95}
                    />
                    <text
                      x={axisTextX}
                      y={t.y + 4}
                      textAnchor="end"
                      fill="var(--kf-text)"
                      opacity={0.7}
                      fontSize={11}
                      fontWeight={t.major ? 750 : 650}
                    >
                      {label}
                    </text>
                  </g>
                )
              })()}
            </g>
          ))}

          {overlays.map((o) => (
            <g key={o.id}>
              {(() => {
                const isPos = o.id.startsWith('paper_pos_')
                return (
                  <line
                    x1={padL}
                    x2={w - padR}
                    y1={o.y}
                    y2={o.y}
                    stroke={o.color}
                    strokeOpacity={isPos ? 0.85 : o.dim ? 0.22 : o.strong ? 0.68 : 0.42}
                    strokeWidth={isPos ? 2.6 : o.strong ? 2.25 : 1.4}
                  />
                )
              })()}
              {(() => {
                const wLabel = Math.max(68, Math.min(190, o.label.length * 7 + 18))
                const isPos = o.id.startsWith('paper_pos_')
                return (
                  <g>
                    <rect
                      x={axisLabelRight - wLabel}
                      y={o.y - 10}
                      width={wLabel}
                      height={20}
                      rx={10}
                      fill={o.color}
                      fillOpacity={isPos ? 0.92 : o.dim ? 0.16 : o.strong ? 0.35 : 0.28}
                      stroke={o.color}
                      strokeOpacity={isPos ? 0.95 : o.dim ? 0.28 : o.strong ? 0.75 : 0.5}
                    />
                    <text
                      x={axisTextX}
                      y={o.y + 4}
                      textAnchor="end"
                      fill="#e5e7eb"
                      fontSize={11}
                      fontWeight={800}
                      opacity={o.dim ? 0.55 : 0.95}
                    >
                      {o.label}
                    </text>
                  </g>
                )
              })()}
            </g>
          ))}

          {mode === 'line' ? (
            <g>
              {areaD ? <path d={areaD} fill="url(#priceFill)" /> : null}
              {pathD ? (
                <path d={pathD} fill="none" stroke="url(#priceStroke)" strokeWidth={2.5} strokeLinejoin="round" />
              ) : null}
            </g>
          ) : null}

          {mode === 'candles' ? (
            <g>
              {(() => {
                const innerWidth = Math.max(1, w - padL - padR)
                const candleCount = Math.max(1, Math.floor(timeWindowMs / timeframeMs))
                const slot = innerWidth / candleCount
                const bodyW = Math.max(2, slot * 0.6)

                return candles.map((c) => {
                  const centerTs = c.start + timeframeMs / 2
                  const x = timestampToX(centerTs, now, timeWindowMs, chartDims)
                  const yOpen = priceToY(c.open, domain, chartDims)
                  const yClose = priceToY(c.close, domain, chartDims)
                  const yHigh = priceToY(c.high, domain, chartDims)
                  const yLow = priceToY(c.low, domain, chartDims)

                  const isUp = c.close >= c.open
                  const color = isUp ? '#22c55e' : '#ef4444'

                  const bodyTop = Math.min(yOpen, yClose)
                  const bodyH = Math.max(2, Math.abs(yOpen - yClose))

                  return (
                    <g key={c.start}>
                      <line x1={x} x2={x} y1={yHigh} y2={yLow} stroke={color} strokeOpacity={0.9} strokeWidth={2} />
                      <rect
                        x={x - bodyW / 2}
                        y={bodyTop}
                        width={bodyW}
                        height={bodyH}
                        fill={color}
                        fillOpacity={0.75}
                        stroke={color}
                        strokeOpacity={0.95}
                      />
                    </g>
                  )
                })
              })()}
            </g>
          ) : null}

          {lastMarker ? (
            <g>
              <line
                x1={lastMarker.x}
                x2={lastMarker.x}
                y1={padT}
                y2={h - padB}
                stroke={priceMarkerColor}
                strokeOpacity={0.32}
                strokeDasharray="6 6"
              />
              <line
                x1={padL}
                x2={w - padR}
                y1={lastMarker.y}
                y2={lastMarker.y}
                stroke={priceMarkerColor}
                strokeOpacity={0.35}
                strokeDasharray="6 6"
              />
              {pulseDuration != null ? (
                <circle
                  cx={lastMarker.x}
                  cy={lastMarker.y}
                  r={5}
                  fill="none"
                  stroke={priceMarkerColor}
                  strokeWidth={2}
                  opacity={0.55}
                  style={{
                    transformOrigin: `${lastMarker.x}px ${lastMarker.y}px`,
                    animation: `kf-price-pulse ${pulseDuration}s ease-out infinite`,
                  }}
                />
              ) : null}
              <circle cx={lastMarker.x} cy={lastMarker.y} r={5} fill={priceMarkerColor} />
              <text
                x={axisTextX}
                y={lastMarker.y + 4}
                fill={priceMarkerColor}
                fontSize={11}
                fontWeight={700}
                textAnchor="end"
              >
                {formatPrice(lastPrice)}
              </text>
            </g>
          ) : null}

          <text x={padL + 10} y={padT + 22} fill="#e5e7eb" fontSize={14} fontWeight={700}>
            {symbol}
          </text>
          <text x={padL + 10} y={padT + 44} fill="#9ca3af" fontSize={12}>
            {wsStatus} · last {formatPrice(lastPrice)}
          </text>

          <text
            x={w - padR - 10}
            y={padT + 22}
            fill="#9ca3af"
            fontSize={12}
            textAnchor="end"
          >
            {domain.min.toLocaleString(undefined, { maximumFractionDigits: 2 })} –{' '}
            {domain.max.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </text>

        </svg>
      </div>

      {positionCards ? (
        <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, zIndex: 120, pointerEvents: 'none' }}>
          {positionCards}
          {positionExitBlocks}
        </div>
      ) : null}

      {exitMenu ? (
        <ContextMenu
          x={exitMenu.x}
          y={exitMenu.y}
          items={(
            [
              {
                id: 'edit_exit_action',
                label: 'Edit Settings',
                onClick: () => onOpenExitEditor(exitMenu.orderId),
              },
              {
                id: 'delete_exit_action',
                label: 'Delete Action',
                danger: true,
                onClick: () => onDeleteExitOrder(exitMenu.orderId),
              },
            ] satisfies ContextMenuItem[]
          )}
          onClose={() => setExitMenu(null)}
        />
      ) : null}

      <TriggerActionConfigModal
        open={Boolean(exitEditor)}
        actionType={exitEditor?.actionType ?? null}
        config={exitEditor?.config ?? null}
        onSave={onSaveExitEditor}
        onClose={() => setExitEditor(null)}
      />

      <div style={{ position: 'absolute', left: 0, top: 0, zIndex: 80, pointerEvents: interactionDisabled ? 'none' : 'none' }}>
        <svg width={w} height={h}>
          {visibleLines.map((l) => {
            const selected = selectedActivationLineId === l.id
            const locked = Boolean(l.locked)
            const draft = l.id === '__draft__'
            const active = !draft && shapeTriggers.some(t => t.isActive && t.shapeId === l.id)

            const stroke = selected ? '#f5f3ff' : (active ? '#22c55e' : '#a78bfa')
            const strokeOpacity = selected ? 0.95 : 0.65
            const strokeWidth = selected ? 2.6 : 2

            return (
              <g key={l.id} data-chart-shape="1" data-activation-line-id={l.id}>
                <line
                  x1={l.ax}
                  y1={l.ay}
                  x2={l.bx}
                  y2={l.by}
                  stroke="transparent"
                  strokeWidth={12}
                  style={{ cursor: locked || draft ? 'default' : 'grab', pointerEvents: draft ? 'none' : 'stroke' }}
                  data-chart-shape="1"
                  data-activation-line-id={l.id}
                  onPointerDown={(e) => {
                    if (draft) {
                      return
                    }
                    e.preventDefault()
                    e.stopPropagation()
                    onSelectActivationLine(l.id)
                  }}
                />

                <line
                  x1={l.ax}
                  y1={l.ay}
                  x2={l.bx}
                  y2={l.by}
                  stroke={stroke}
                  strokeOpacity={strokeOpacity}
                  strokeWidth={strokeWidth}
                  strokeDasharray={undefined}
                  style={{ pointerEvents: 'none' }}
                />

                {!draft ? (
                  <>
                    <rect
                      x={l.bx - 46}
                      y={l.by - 22}
                      width={92}
                      height={18}
                      rx={9}
                      fill="#7c3aed"
                      fillOpacity={selected ? 0.28 : 0.18}
                      stroke={stroke}
                      strokeOpacity={selected ? 0.65 : 0.35}
                      style={{ pointerEvents: 'none' }}
                    />
                    <text
                      x={locked ? l.bx - 6 : l.bx}
                      y={l.by - 9}
                      fill="#e5e7eb"
                      fontSize={11}
                      fontWeight={800}
                      textAnchor="middle"
                      style={{ pointerEvents: 'none' }}
                    >
                      {l.name}
                    </text>
                    {locked ? (
                      <g
                        transform={`translate(${l.bx + 28}, ${l.by - 19})`}
                        style={{ pointerEvents: 'none', color: '#e5e7eb', opacity: 0.9 }}
                      >
                        <IconLock size={12} />
                      </g>
                    ) : null}
                  </>
                ) : null}

                {selected && !locked && !draft ? (
                  <>
                    <circle
                      cx={l.ax}
                      cy={l.ay}
                      r={6}
                      fill="#f5f3ff"
                      fillOpacity={0.85}
                      stroke="#a78bfa"
                      strokeOpacity={0.9}
                      strokeWidth={2}
                      style={{ cursor: 'move', pointerEvents: 'all' }}
                      data-chart-shape="1"
                      data-activation-line-id={l.id}
                      data-activation-line-endpoint="a"
                      onPointerDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                          ; (e.currentTarget as SVGCircleElement).setPointerCapture(e.pointerId)
                        onStartDragActivationLineEndpoint(l.id, 'a')
                      }}
                    />
                    <circle
                      cx={l.bx}
                      cy={l.by}
                      r={6}
                      fill="#f5f3ff"
                      fillOpacity={0.85}
                      stroke="#a78bfa"
                      strokeOpacity={0.9}
                      strokeWidth={2}
                      style={{ cursor: 'move', pointerEvents: 'all' }}
                      data-chart-shape="1"
                      data-activation-line-id={l.id}
                      data-activation-line-endpoint="b"
                      onPointerDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                          ; (e.currentTarget as SVGCircleElement).setPointerCapture(e.pointerId)
                        onStartDragActivationLineEndpoint(l.id, 'b')
                      }}
                    />
                  </>
                ) : null}
              </g>
            )
          })}

          {visibleParallels.map((p) => {
            const selected = selectedParallelId === p.id
            const locked = Boolean(p.locked)
            const draft = p.id === '__draft_parallel__'
            const active = !draft && shapeTriggers.some(t => t.isActive && t.shapeId === p.id)
            const stroke = selected ? '#f5f3ff' : (active ? '#22c55e' : '#a78bfa')
            const strokeOpacity = selected ? 0.95 : 0.55
            const strokeWidth = selected ? 2.6 : 2
            return (
              <g key={p.id} data-chart-shape="1" data-annotation-kind="parallel" data-annotation-id={p.id}>
                <line
                  x1={p.ax}
                  y1={p.ay}
                  x2={p.bx}
                  y2={p.by}
                  stroke="transparent"
                  strokeWidth={12}
                  style={{ cursor: draft ? 'default' : locked ? 'default' : 'grab', pointerEvents: draft ? 'none' : 'stroke' }}
                  data-chart-shape="1"
                  data-annotation-kind="parallel"
                  data-annotation-id={p.id}
                  onPointerDown={(e) => {
                    if (draft) {
                      return
                    }
                    e.preventDefault()
                    e.stopPropagation()
                    onSelectParallel(p.id)
                  }}
                />
                <line
                  x1={p.a2x}
                  y1={p.a2y}
                  x2={p.b2x}
                  y2={p.b2y}
                  stroke="transparent"
                  strokeWidth={12}
                  style={{ cursor: draft ? 'default' : locked ? 'default' : 'grab', pointerEvents: draft ? 'none' : 'stroke' }}
                  data-chart-shape="1"
                  data-annotation-kind="parallel"
                  data-annotation-id={p.id}
                  onPointerDown={(e) => {
                    if (draft) {
                      return
                    }
                    e.preventDefault()
                    e.stopPropagation()
                    onSelectParallel(p.id)
                  }}
                />

                <line x1={p.ax} y1={p.ay} x2={p.bx} y2={p.by} stroke={stroke} strokeOpacity={strokeOpacity} strokeWidth={strokeWidth} style={{ pointerEvents: 'none' }} />
                <line x1={p.a2x} y1={p.a2y} x2={p.b2x} y2={p.b2y} stroke={stroke} strokeOpacity={strokeOpacity} strokeWidth={strokeWidth} style={{ pointerEvents: 'none' }} />

                {!draft ? (
                  (() => {
                    const cx = (p.ax + p.bx) / 2
                    const cy = (p.ay + p.by) / 2
                    return (
                      <>
                        <rect
                          x={cx - 46}
                          y={cy - 30}
                          width={92}
                          height={18}
                          rx={9}
                          fill="#7c3aed"
                          fillOpacity={selected ? 0.28 : 0.18}
                          stroke={stroke}
                          strokeOpacity={selected ? 0.65 : 0.35}
                          style={{ pointerEvents: 'none' }}
                        />
                        <text
                          x={locked ? cx - 6 : cx}
                          y={cy - 17}
                          fill="#e5e7eb"
                          fontSize={11}
                          fontWeight={800}
                          textAnchor="middle"
                          style={{ pointerEvents: 'none' }}
                        >
                          {p.name}
                        </text>
                        {locked ? (
                          <g transform={`translate(${cx + 28}, ${cy - 27})`} style={{ pointerEvents: 'none', color: '#e5e7eb', opacity: 0.9 }}>
                            <IconLock size={12} />
                          </g>
                        ) : null}
                      </>
                    )
                  })()
                ) : null}

                {selected && !locked && !draft ? (
                  <>
                    <circle
                      cx={p.ax}
                      cy={p.ay}
                      r={6}
                      fill="#f5f3ff"
                      fillOpacity={0.85}
                      stroke="#a78bfa"
                      strokeOpacity={0.9}
                      strokeWidth={2}
                      style={{ cursor: 'move', pointerEvents: 'all' }}
                      data-chart-shape="1"
                      data-annotation-kind="parallel"
                      data-annotation-id={p.id}
                      data-annotation-handle="a"
                    />
                    <circle
                      cx={p.bx}
                      cy={p.by}
                      r={6}
                      fill="#f5f3ff"
                      fillOpacity={0.85}
                      stroke="#a78bfa"
                      strokeOpacity={0.9}
                      strokeWidth={2}
                      style={{ cursor: 'move', pointerEvents: 'all' }}
                      data-chart-shape="1"
                      data-annotation-kind="parallel"
                      data-annotation-id={p.id}
                      data-annotation-handle="b"
                    />
                    <circle
                      cx={p.ox}
                      cy={p.oy}
                      r={6}
                      fill="#f5f3ff"
                      fillOpacity={0.85}
                      stroke="#a78bfa"
                      strokeOpacity={0.9}
                      strokeWidth={2}
                      style={{ cursor: 'move', pointerEvents: 'all' }}
                      data-chart-shape="1"
                      data-annotation-kind="parallel"
                      data-annotation-id={p.id}
                      data-annotation-handle="offset"
                    />
                  </>
                ) : null}
              </g>
            )
          })}

          {visibleRectangles.map((r) => {
            const selected = selectedRectangleId === r.id
            const locked = Boolean(r.locked)
            const draft = r.id === '__draft_rect__'
            const active = !draft && shapeTriggers.some(t => t.isActive && t.shapeId === r.id)
            const stroke = selected ? '#f5f3ff' : (active ? '#22c55e' : '#a78bfa')
            const strokeOpacity = selected ? 0.95 : 0.55
            const strokeWidth = selected ? 2.6 : 2
            const aCursor = (r.ax <= r.bx) === (r.ay <= r.by) ? 'nwse-resize' : 'nesw-resize'
            const bCursor = aCursor === 'nwse-resize' ? 'nesw-resize' : 'nwse-resize'
            return (
              <g key={r.id} data-chart-shape="1" data-annotation-kind="rect" data-annotation-id={r.id}>
                <rect
                  x={r.x}
                  y={r.y}
                  width={r.w}
                  height={r.h}
                  fill="transparent"
                  stroke="transparent"
                  strokeWidth={12}
                  style={{ cursor: draft ? 'default' : locked ? 'default' : 'grab', pointerEvents: draft ? 'none' : 'stroke' }}
                  data-chart-shape="1"
                  data-annotation-kind="rect"
                  data-annotation-id={r.id}
                  onPointerDown={(e) => {
                    if (draft) {
                      return
                    }
                    e.preventDefault()
                    e.stopPropagation()
                    onSelectRectangle(r.id)
                  }}
                />

                <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={stroke} fillOpacity={selected ? 0.12 : 0.06} stroke={stroke} strokeOpacity={strokeOpacity} strokeWidth={strokeWidth} style={{ pointerEvents: 'none' }} />

                {!draft ? (
                  (() => {
                    const cx = r.x + r.w / 2
                    const cy = r.y
                    return (
                      <>
                        <rect
                          x={cx - 46}
                          y={cy - 26}
                          width={92}
                          height={18}
                          rx={9}
                          fill="#7c3aed"
                          fillOpacity={selected ? 0.28 : 0.18}
                          stroke={stroke}
                          strokeOpacity={selected ? 0.65 : 0.35}
                          style={{ pointerEvents: 'none' }}
                        />
                        <text
                          x={locked ? cx - 6 : cx}
                          y={cy - 13}
                          fill="#e5e7eb"
                          fontSize={11}
                          fontWeight={800}
                          textAnchor="middle"
                          style={{ pointerEvents: 'none' }}
                        >
                          {r.name}
                        </text>
                        {locked ? (
                          <g transform={`translate(${cx + 28}, ${cy - 23})`} style={{ pointerEvents: 'none', color: '#e5e7eb', opacity: 0.9 }}>
                            <IconLock size={12} />
                          </g>
                        ) : null}
                      </>
                    )
                  })()
                ) : null}

                {selected && !locked && !draft ? (
                  <>
                    <circle
                      cx={r.ax}
                      cy={r.ay}
                      r={6}
                      fill="#f5f3ff"
                      fillOpacity={0.85}
                      stroke="#a78bfa"
                      strokeOpacity={0.9}
                      strokeWidth={2}
                      style={{ cursor: aCursor, pointerEvents: 'all' }}
                      data-chart-shape="1"
                      data-annotation-kind="rect"
                      data-annotation-id={r.id}
                      data-annotation-handle="a"
                    />
                    <circle
                      cx={r.bx}
                      cy={r.by}
                      r={6}
                      fill="#f5f3ff"
                      fillOpacity={0.85}
                      stroke="#a78bfa"
                      strokeOpacity={0.9}
                      strokeWidth={2}
                      style={{ cursor: bCursor, pointerEvents: 'all' }}
                      data-chart-shape="1"
                      data-annotation-kind="rect"
                      data-annotation-id={r.id}
                      data-annotation-handle="b"
                    />
                  </>
                ) : null}
              </g>
            )
          })}

          {visibleCircles.map((c) => {
            const selected = selectedCircleId === c.id
            const locked = Boolean(c.locked)
            const draft = c.id === '__draft_circle__'
            const active = !draft && shapeTriggers.some(t => t.isActive && t.shapeId === c.id)
            const stroke = selected ? '#f5f3ff' : (active ? '#22c55e' : '#a78bfa')
            const strokeOpacity = selected ? 0.95 : 0.55
            const strokeWidth = selected ? 2.6 : 2
            return (
              <g key={c.id} data-chart-shape="1" data-annotation-kind="circle" data-annotation-id={c.id}>
                <ellipse
                  cx={c.cx}
                  cy={c.cy}
                  rx={c.rx}
                  ry={c.ry}
                  fill="transparent"
                  stroke="transparent"
                  strokeWidth={12}
                  style={{ cursor: draft ? 'default' : locked ? 'default' : 'grab', pointerEvents: draft ? 'none' : 'stroke' }}
                  data-chart-shape="1"
                  data-annotation-kind="circle"
                  data-annotation-id={c.id}
                  onPointerDown={(e) => {
                    if (draft) {
                      return
                    }
                    e.preventDefault()
                    e.stopPropagation()
                    onSelectCircle(c.id)
                  }}
                />

                <ellipse cx={c.cx} cy={c.cy} rx={c.rx} ry={c.ry} fill={stroke} fillOpacity={selected ? 0.08 : 0.04} stroke={stroke} strokeOpacity={strokeOpacity} strokeWidth={strokeWidth} style={{ pointerEvents: 'none' }} />

                {!draft ? (
                  (() => {
                    const cx = c.cx
                    const cy = c.cy - c.ry
                    return (
                      <>
                        <rect
                          x={cx - 46}
                          y={cy - 26}
                          width={92}
                          height={18}
                          rx={9}
                          fill="#7c3aed"
                          fillOpacity={selected ? 0.28 : 0.18}
                          stroke={stroke}
                          strokeOpacity={selected ? 0.65 : 0.35}
                          style={{ pointerEvents: 'none' }}
                        />
                        <text
                          x={locked ? cx - 6 : cx}
                          y={cy - 13}
                          fill="#e5e7eb"
                          fontSize={11}
                          fontWeight={800}
                          textAnchor="middle"
                          style={{ pointerEvents: 'none' }}
                        >
                          {c.name}
                        </text>
                        {locked ? (
                          <g transform={`translate(${cx + 28}, ${cy - 23})`} style={{ pointerEvents: 'none', color: '#e5e7eb', opacity: 0.9 }}>
                            <IconLock size={12} />
                          </g>
                        ) : null}
                      </>
                    )
                  })()
                ) : null}

                {selected && !locked && !draft ? (
                  <circle
                    cx={c.ex}
                    cy={c.ey}
                    r={6}
                    fill="#f5f3ff"
                    fillOpacity={0.85}
                    stroke="#a78bfa"
                    strokeOpacity={0.9}
                    strokeWidth={2}
                    style={{ cursor: 'e-resize', pointerEvents: 'all' }}
                    data-chart-shape="1"
                    data-annotation-kind="circle"
                    data-annotation-id={c.id}
                    data-annotation-handle="edge"
                  />
                ) : null}
              </g>
            )
          })}
        </svg>
      </div>
    </ViewportPortal>
  )
}
