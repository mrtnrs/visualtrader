import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent, type PointerEvent as ReactPointerEvent } from 'react'
import {
  addEdge,
  ReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type ReactFlowInstance,
  applyNodeChanges,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react'
import type { NodePositionChange } from '@xyflow/system'
import '@xyflow/react/dist/style.css'

import { getDraggedNodeType } from './SidebarPalette'
import { StrategyBuilderBar, ExitPicker, useHasRootBlock } from '../strategy-builder'
import type { ExitBlockType } from '../strategy-builder'
import AccountSidebar from './AccountSidebar'
import PriceChartLayer from './PriceChartLayer'
import ShapeTriggerTooltip from './ShapeTriggerTooltip'
import TriggerPillManager from './TriggerPillManager'
import ShapeTriggerOptionButtons from './ShapeTriggerOptionButtons'
import TriggerActionConfigModal from './TriggerActionConfigModal'
import { CanvasToolbar } from './CanvasToolbar'
import SettingsPanel from '../ui/SettingsPanel'
import ContextMenu, { type ContextMenuItem } from '../ui/ContextMenu'
import { IconLock, IconUnlock, IconTrash } from './CanvasIcons'
import { getNodeDefinition, nodeTypes } from '../../utils/nodeRegistry'
import { useStrategyContext } from '../../contexts/StrategyContext'
import { useAccountContext } from '../../contexts/AccountContext'
import { stepPaperTradingFromShapeTriggers, shouldDeactivateTrigger } from '../../utils/virtualExecution'

import { avg } from '../../utils/indicators'
import { applyMagnet, computeMagnetLevels } from '../../utils/magnetism'
import {
  deleteStrategySet,
  listStrategySets,
  loadAutosave,
  loadStrategySet,
  saveAutosave,
  saveStrategySet,
  type ActivationLine,
  type CircleAnnotation,
  type ShapeTrigger,
  type TriggerCondition,
  type TriggerAction,
  type TriggerActionType,
  type ActionConfig,
  type RectangleAnnotation,
  type ParallelLinesAnnotation,
  type StrategySetV1,
} from '../../utils/strategyStorage'
import { blocksFromReactFlow, linePriceAt, stepRuntime, type IndicatorSnapshot } from '../../blocks'
import {
  computePriceDomain,
  clamp,
  getTimeWindowMs,
  timeframeToMs,
  DEFAULT_CHART_DIMS,
  type ChartDims,
  type PriceDomain,
  priceToY,
  timestampToX,
  TIME_WINDOW_MS,
  type ChartTimeframe,
  xToTimestamp,
  yToPrice,
} from '../../utils/chartMapping'
import type { OrderNodeData, StrategyNodeType } from '../nodes/types'
import {
  computeCircleBoundsPx,
  computeLineBoundsPx,
  computeParallelBoundsPx,
  computeRectangleBoundsPx,
  getCirclePriceState,
  getLinePriceState,
  getParallelPriceState,
  getRectanglePriceState,
} from '../../utils/shapeGeometry'

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

function findTriggerAction(actions: TriggerAction[], id: string): TriggerAction | null {
  for (const a of actions) {
    if (a.id === id) {
      return a
    }
    if (Array.isArray(a.children) && a.children.length) {
      const hit = findTriggerAction(a.children, id)
      if (hit) {
        return hit
      }
    }
  }
  return null
}

function updateTriggerActionConfig(actions: TriggerAction[], id: string, config: ActionConfig): TriggerAction[] {
  return actions.map((a) => {
    if (a.id === id) {
      return { ...a, config }
    }
    if (Array.isArray(a.children) && a.children.length) {
      return { ...a, children: updateTriggerActionConfig(a.children, id, config) }
    }
    return a
  })
}

function removeTriggerAction(actions: TriggerAction[], id: string): TriggerAction[] {
  const next: TriggerAction[] = []
  for (const a of actions) {
    if (a.id === id) {
      continue
    }
    if (Array.isArray(a.children) && a.children.length) {
      const nextChildren = removeTriggerAction(a.children, id)
      if (nextChildren !== a.children) {
        next.push({ ...a, children: nextChildren.length ? nextChildren : undefined })
      } else {
        next.push(a)
      }
    } else {
      next.push(a)
    }
  }
  return next
}

function addChildAction(actions: TriggerAction[], parentId: string, child: TriggerAction): TriggerAction[] {
  return actions.map((a) => {
    if (a.id === parentId) {
      const nextChildren = Array.isArray(a.children) ? a.children.concat(child) : [child]
      return { ...a, children: nextChildren }
    }
    if (Array.isArray(a.children) && a.children.length) {
      return { ...a, children: addChildAction(a.children, parentId, child) }
    }
    return a
  })
}

function distancePointToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  if (!(len2 > 0)) {
    return Math.hypot(px - ax, py - ay)
  }
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2))
  const cx = ax + t * dx
  const cy = ay + t * dy
  return Math.hypot(px - cx, py - cy)
}

let nodeId = 0
const getId = () => `node_${nodeId++}`

const initialNodes: Node[] = []
const initialEdges: Edge[] = []

function isRootNodeType(t: string): t is 'market' | 'limit' {
  return t === 'market' || t === 'limit'
}

function isExitNodeType(t: string): t is ExitBlockType {
  return (
    t === 'stop_loss' ||
    t === 'stop_loss_limit' ||
    t === 'take_profit' ||
    t === 'take_profit_limit' ||
    t === 'trailing_stop' ||
    t === 'trailing_stop_limit'
  )
}



export default function StrategyCanvas() {


  const [chartMode, setChartMode] = useState<'line' | 'candles'>('candles')
  const [chartTimeframe, setChartTimeframe] = useState<ChartTimeframe>('1m')
  const [followNow, setFollowNow] = useState(true)
  const [timeCenter, setTimeCenter] = useState<number>(() => Date.now())
  const [timeZoom, setTimeZoom] = useState(1)
  const [priceZoom, setPriceZoom] = useState(1)
  const [pricePan, setPricePan] = useState(0)
  const [isPanning, setIsPanning] = useState(false)

  const [placementMode, setPlacementMode] = useState<null | 'buy' | 'sell'>(null)
  const [snapPrices, setSnapPrices] = useState(false)
  const [placementPreview, setPlacementPreview] = useState<null | { y: number; price: number; side: 'buy' | 'sell' }>(null)
  const [activationLines, setActivationLines] = useState<ActivationLine[]>([])
  const [circles, setCircles] = useState<CircleAnnotation[]>([])
  const [rectangles, setRectangles] = useState<RectangleAnnotation[]>([])
  const [parallelLines, setParallelLines] = useState<ParallelLinesAnnotation[]>([])
  const [shapeTriggers, setShapeTriggers] = useState<ShapeTrigger[]>([])

  const [drawLineMode, setDrawLineMode] = useState(false)
  const [lineDraft, setLineDraft] = useState<null | { a: { timestamp: number; price: number }; b: { timestamp: number; price: number } }>(null)

  const [drawCircleMode, setDrawCircleMode] = useState(false)
  const [circleDraft, setCircleDraft] = useState<null | { center: { timestamp: number; price: number }; edge: { timestamp: number; price: number } }>(null)

  const [drawRectangleMode, setDrawRectangleMode] = useState(false)
  const [rectangleDraft, setRectangleDraft] = useState<null | { a: { timestamp: number; price: number }; b: { timestamp: number; price: number } }>(null)

  const [drawParallelMode, setDrawParallelMode] = useState(false)
  const [parallelDraft, setParallelDraft] = useState<null | { a: { timestamp: number; price: number }; b: { timestamp: number; price: number } }>(null)
  const [parallelOffsetDraft, setParallelOffsetDraft] = useState<null | { timestamp: number; price: number }>(null)

  const activationLinesRef = useRef<ActivationLine[]>([])
  const circlesRef = useRef<CircleAnnotation[]>([])
  const rectanglesRef = useRef<RectangleAnnotation[]>([])
  const parallelLinesRef = useRef<ParallelLinesAnnotation[]>([])

  const interactionDisabledRef = useRef(false)
  const selectedActivationLineIdRef = useRef<string | null>(null)
  const chartDimsRef = useRef<ChartDims>(DEFAULT_CHART_DIMS)
  const domainRef = useRef<PriceDomain>({ min: 0, max: 1 })
  const timeCenterRef = useRef<number>(Date.now())
  const timeWindowMsRef = useRef<number>(TIME_WINDOW_MS)

  const [hoverPos, setHoverPos] = useState<null | { x: number; y: number }>(null)

  const [selectedActivationLineId, setSelectedActivationLineId] = useState<string | null>(null)
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null)
  const [selectedRectangleId, setSelectedRectangleId] = useState<string | null>(null)
  const [selectedParallelId, setSelectedParallelId] = useState<string | null>(null)
  const [selectedTriggerId, setSelectedTriggerId] = useState<string | null>(null)
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null)
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null)

  const [pendingExitEditorOrderId, setPendingExitEditorOrderId] = useState<string | null>(null)

  const [nodeContextMenu, setNodeContextMenu] = useState<null | { x: number; y: number; nodeId: string }>(null)

  const [draggingLineEndpoint, setDraggingLineEndpoint] = useState<null | { id: string; endpoint: 'a' | 'b' }>(null)
  const [draggingLine, setDraggingLine] = useState<
    null | { id: string; startPointerTs: number; startPointerPrice: number; startA: ActivationLine['a']; startB: ActivationLine['b'] }
  >(null)

  const [draggingCircle, setDraggingCircle] = useState<
    null | {
      id: string
      mode: 'move' | 'edge'
      startPointerTs: number
      startPointerPrice: number
      startCenter: CircleAnnotation['center']
      startEdge: CircleAnnotation['edge']
    }
  >(null)

  const [draggingRectangle, setDraggingRectangle] = useState<
    null | {
      id: string
      mode: 'move' | 'a' | 'b'
      startPointerTs: number
      startPointerPrice: number
      startA: RectangleAnnotation['a']
      startB: RectangleAnnotation['b']
    }
  >(null)

  const [draggingParallel, setDraggingParallel] = useState<
    null | {
      id: string
      mode: 'move' | 'a' | 'b' | 'offset'
      startPointerTs: number
      startPointerPrice: number
      startA: ParallelLinesAnnotation['a']
      startB: ParallelLinesAnnotation['b']
      startOffset: ParallelLinesAnnotation['offset']
    }
  >(null)

  const [draggingChildAction, setDraggingChildAction] = useState<
    null | {
      triggerId: string
      actionId: string
      startPointerY: number
      type: 'price' | 'offset'
      startVal: number
    }
  >(null)

  const [draggingPositionExit, setDraggingPositionExit] = useState<
    null | {
      orderId: string
      startPointerY: number
      type: 'price' | 'offset'
      startVal: number
    }
  >(null)

  const onDragChildActionStart = useCallback(
    (triggerId: string, actionId: string, startY: number, type: 'price' | 'offset', startVal: number) => {
      setDraggingChildAction({ triggerId, actionId, startPointerY: startY, type, startVal })
    },
    [],
  )

  const onDragPositionExitStart = useCallback(
    (orderId: string, startY: number, type: 'price' | 'offset', startVal: number) => {
      setDraggingPositionExit({ orderId, startPointerY: startY, type, startVal })
    },
    [],
  )

  const [contextMenu, setContextMenu] = useState<null | { x: number; y: number; items: ContextMenuItem[] }>(null)
  const [hoveredLineHandle, setHoveredLineHandle] = useState<null | { id: string; endpoint: 'a' | 'b' }>(null)
  const [hoveredLineBody, setHoveredLineBody] = useState<null | { id: string }>(null)

  const [hoveredToolId, setHoveredToolId] = useState<string | null>(null)

  const [magnetEnabled, setMagnetEnabled] = useState(false)
  const [magnetStrength, setMagnetStrength] = useState(0.6)



  const [setNameDraft, setSetNameDraft] = useState('')
  const [setListVersion, setSetListVersion] = useState(0)
  const [selectedSetName, setSelectedSetName] = useState('')

  const [showSettings, setShowSettings] = useState(false)
  const [showExitPicker, setShowExitPicker] = useState(false)

  const chartHostRef = useRef<HTMLDivElement | null>(null)
  const [chartDims, setChartDims] = useState<ChartDims>(() => DEFAULT_CHART_DIMS)

  const rfRef = useRef<ReactFlowInstance | null>(null)

  const axisDragRef = useRef<
    | null
    | { kind: 'price'; startY: number; startZoom: number; startPan: number }
    | { kind: 'time_zoom'; startX: number; startZoom: number; anchorT: number; anchorTs: number }
  >(null)

  const paneDragGateRef = useRef<{ allowed: boolean }>({ allowed: false })
  const paneDragDidMoveRef = useRef(false)
  const prevTickRef = useRef<{ timestamp: number | null; price: number | null }>({ timestamp: null, price: null })

  const paneDragRef = useRef<
    | null
    | {
      startX: number
      startY: number
      startCenter: number
      startPricePan: number
      startDomainRange: number
    }
  >(null)

  const [nodes, setNodes] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const { screenToFlowPosition, setCenter, getZoom } = useReactFlow()
  const hasRootBlock = useHasRootBlock(nodes)

  const {
    dispatch,
    state: { symbol, lastPrice, priceHistory, selectedNodeId, wsStatus, startupMode },
  } = useStrategyContext()

  const { state: accountState, dispatch: accountDispatch } = useAccountContext()

  const selectedDockNodeType = useMemo(() => {
    if (!selectedNodeId) {
      return null
    }
    const n = nodes.find((x) => x.id === selectedNodeId)
    return (n?.type ?? null) as string | null
  }, [nodes, selectedNodeId])

  const selectedTriggerPrimaryActionType = useMemo(() => {
    if (!selectedTriggerId) {
      return null
    }
    const t = shapeTriggers.find((x) => x.id === selectedTriggerId)
    const primary = t?.actions?.[0]
    return (primary?.type ?? null) as string | null
  }, [selectedTriggerId, shapeTriggers])

  const selectedPositionDockType = useMemo(() => {
    if (!selectedPositionId) {
      return null
    }
    const p = accountState.paper?.openPositions?.find((x) => x.id === selectedPositionId)
    if (!p) {
      return null
    }
    return p.side === 'long' ? ('market_buy' as const) : ('market_sell' as const)
  }, [accountState.paper?.openPositions, selectedPositionId])

  const topMarkets = useMemo(() => ['BTC/USD', 'ETH/USD', 'SOL/USD', 'XRP/USD', 'DOGE/USD'], [])

  const [symbolDraft, setSymbolDraft] = useState(symbol)

  const topbarScrollRef = useRef<HTMLDivElement | null>(null)
  const marketAnchorRef = useRef<HTMLDivElement | null>(null)
  const marketInputWrapRef = useRef<HTMLDivElement | null>(null)
  const marketInputRef = useRef<HTMLInputElement | null>(null)
  const marketMenuRef = useRef<HTMLDivElement | null>(null)

  const [showMarketMenu, setShowMarketMenu] = useState(false)
  const [marketMenuPos, setMarketMenuPos] = useState<null | { left: number; top: number; width: number }>(null)

  useEffect(() => {
    setSymbolDraft(symbol)
  }, [symbol])

  // Keep activationLinesRef in sync with state (for use in stable event handlers)
  useEffect(() => {
    activationLinesRef.current = activationLines
  }, [activationLines])

  useEffect(() => {
    circlesRef.current = circles
  }, [circles])

  useEffect(() => {
    rectanglesRef.current = rectangles
  }, [rectangles])

  useEffect(() => {
    parallelLinesRef.current = parallelLines
  }, [parallelLines])

  useEffect(() => {
    interactionDisabledRef.current = Boolean(placementMode || drawLineMode || drawCircleMode || drawRectangleMode || drawParallelMode)
  }, [drawCircleMode, drawLineMode, drawParallelMode, drawRectangleMode, placementMode])

  useEffect(() => {
    selectedActivationLineIdRef.current = selectedActivationLineId
  }, [selectedActivationLineId])

  useEffect(() => {
    chartDimsRef.current = chartDims
  }, [chartDims])

  useEffect(() => {
    timeCenterRef.current = timeCenter
  }, [timeCenter])

  const updateMarketMenuPos = useCallback(() => {
    const el = marketInputRef.current ?? marketInputWrapRef.current
    if (!el) {
      return
    }
    const r = el.getBoundingClientRect()
    setMarketMenuPos({ left: r.left, top: r.bottom + 6, width: r.width })
  }, [])

  useEffect(() => {
    if (!showMarketMenu) {
      return
    }

    updateMarketMenuPos()

    const onDocPointerDown = (e: PointerEvent) => {
      const target = e.target as unknown as globalThis.Node | null
      if (!target) {
        return
      }
      if (marketAnchorRef.current?.contains(target)) {
        return
      }
      if (marketMenuRef.current?.contains(target)) {
        return
      }
      setShowMarketMenu(false)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowMarketMenu(false)
      }
    }

    window.addEventListener('pointerdown', onDocPointerDown)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', updateMarketMenuPos)

    return () => {
      window.removeEventListener('pointerdown', onDocPointerDown)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', updateMarketMenuPos)
    }
  }, [showMarketMenu, updateMarketMenuPos])

  const volumeSeries = useMemo(() => priceHistory.map((p) => (typeof p.volume === 'number' ? p.volume : 0)), [priceHistory])
  const priceSeries = useMemo(() => priceHistory.map((p) => p.price), [priceHistory])

  const indicators: IndicatorSnapshot = useMemo(() => {
    const recent = priceSeries.slice(-40)
    const recentVol = volumeSeries.slice(-40)
    return {
      rsi: (() => {
        if (recent.length < 15) return null
        // simple RSI(14)
        let gain = 0
        let loss = 0
        for (let i = 1; i < recent.length; i += 1) {
          const d = recent[i]! - recent[i - 1]!
          if (d >= 0) gain += d
          else loss += -d
        }
        const avgGain = gain / 14
        const avgLoss = loss / 14
        if (avgLoss === 0) return 100
        const rs = avgGain / avgLoss
        const rsi = 100 - 100 / (1 + rs)
        return Number.isFinite(rsi) ? rsi : null
      })(),
      avgVolume: avg(recentVol),
    }
  }, [priceSeries, volumeSeries])

  const sets = useMemo(() => listStrategySets(), [setListVersion])

  const autoDomain = useMemo(() => computePriceDomain(priceHistory, lastPrice), [lastPrice, priceHistory])
  const domain = useMemo(() => {
    const mid = (autoDomain.min + autoDomain.max) / 2
    const half = Math.max(1e-9, (autoDomain.max - autoDomain.min) / 2)
    const z = Math.max(0.25, Math.min(6, priceZoom))
    const scaledHalf = half / z
    return { min: mid - scaledHalf + pricePan, max: mid + scaledHalf + pricePan }
  }, [autoDomain.max, autoDomain.min, pricePan, priceZoom])

  const priceSnapStep = useMemo(() => {
    const range = domain.max - domain.min
    if (!(range > 0)) {
      return 1
    }
    return niceStep(range / 6)
  }, [domain.max, domain.min])

  const snapPrice = useCallback(
    (price: number) => {
      if (!snapPrices && !magnetEnabled) {
        return price
      }

      let next = price

      if (snapPrices) {
        const s = priceSnapStep
        if (s > 0 && Number.isFinite(next)) {
          next = Math.round(next / s) * s
        }
      }

      if (magnetEnabled) {
        const levels = computeMagnetLevels(priceHistory, lastPrice)
        next = applyMagnet(next, levels, magnetStrength).price
      }

      return next
    },
    [lastPrice, magnetEnabled, magnetStrength, priceHistory, priceSnapStep, snapPrices],
  )

  useEffect(() => {
    if (!draggingChildAction) {
      return
    }

    const onMove = (e: PointerEvent) => {
      const host = chartHostRef.current
      if (!host) {
        return
      }
      const rect = host.getBoundingClientRect()
      const localY = e.clientY - rect.top
      const nextPrice = snapPrice(yToPrice(localY, domain, chartDims))

      setShapeTriggers((ts) =>
        ts.map((t) => {
          if (t.id !== draggingChildAction.triggerId) {
            return t
          }

          const action = findTriggerAction(t.actions, draggingChildAction.actionId)
          if (!action) {
            return t
          }

          const cfg = action.config ?? {}
          let nextCfg: ActionConfig = { ...cfg }

          if (draggingChildAction.type === 'offset') {
            if (typeof lastPrice !== 'number' || !Number.isFinite(lastPrice)) {
              return t
            }
            const side = cfg.side === 'buy' ? 'buy' : 'sell'
            const unit = cfg.trailingOffsetUnit ?? 'percent'
            const priceDelta = side === 'buy' ? Math.max(0, nextPrice - lastPrice) : Math.max(0, lastPrice - nextPrice)
            const raw = unit === 'percent' ? (lastPrice > 0 ? (priceDelta * 100) / lastPrice : 0) : priceDelta
            nextCfg = { ...nextCfg, trailingOffset: raw }
          } else {
            if (action.type === 'stop_loss' || action.type === 'stop_loss_limit') {
              nextCfg = { ...nextCfg, stopPrice: nextPrice }
            } else if (action.type === 'take_profit' || action.type === 'take_profit_limit') {
              nextCfg = { ...nextCfg, triggerPrice: nextPrice }
            } else if (action.type === 'limit_buy' || action.type === 'limit_sell') {
              nextCfg = { ...nextCfg, limitPrice: nextPrice }
            } else {
              nextCfg = { ...nextCfg, triggerPrice: nextPrice }
            }
          }

          const nextActions = updateTriggerActionConfig(t.actions, action.id, nextCfg)
          return { ...t, actions: nextActions }
        }),
      )
    }

    const onUp = () => {
      setDraggingChildAction(null)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [chartDims, domain, draggingChildAction, lastPrice, snapPrice])

  useEffect(() => {
    if (!draggingPositionExit) {
      return
    }

    const onMove = (e: PointerEvent) => {
      const host = chartHostRef.current
      const paper = accountState.paper
      if (!host || !paper) {
        return
      }

      const rect = host.getBoundingClientRect()
      const localY = e.clientY - rect.top
      const nextPrice = snapPrice(yToPrice(localY, domain, chartDims))

      const now = Date.now()

      const nextOrders = paper.openOrders.map((o) => {
        if (o.id !== draggingPositionExit.orderId) {
          return o
        }
        if (o.status !== 'open') {
          return o
        }

        if (draggingPositionExit.type === 'offset') {
          if (typeof lastPrice !== 'number' || !Number.isFinite(lastPrice)) {
            return o
          }

          const side = o.side === 'buy' ? 'buy' : 'sell'
          const unit = o.trailingOffsetUnit ?? 'percent'
          const ref = lastPrice

          const priceDelta = side === 'buy' ? Math.max(0, nextPrice - ref) : Math.max(0, ref - nextPrice)
          const raw = unit === 'percent' ? (ref > 0 ? (priceDelta * 100) / ref : 0) : priceDelta

          const delta = unit === 'percent' ? (ref * raw) / 100 : raw
          const stopLevel = side === 'buy' ? ref + delta : ref - delta

          return { ...o, trailingOffset: raw, trailRefPrice: ref, price: stopLevel }
        }

        if (o.type === 'stop-loss-limit' || o.type === 'take-profit-limit') {
          const nextPrice2 = typeof o.price2 === 'number' && Number.isFinite(o.price2) ? nextPrice : o.price2
          return { ...o, price: nextPrice, price2: nextPrice2 }
        }

        return { ...o, price: nextPrice }
      })

      accountDispatch({ type: 'set_paper', paper: { ...paper, openOrders: nextOrders, updatedAt: now } })
    }

    const onUp = () => {
      setDraggingPositionExit(null)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [accountDispatch, accountState.paper, chartDims, domain, draggingPositionExit, lastPrice, snapPrice])

  const makeSnapshot = useCallback(() => {
    return {
      version: 2 as const,
      name: 'autosave',
      createdAt: Date.now(),
      symbol,
      chart: {
        timeframe: chartTimeframe,
        mode: chartMode,
        followNow,
        timeCenter,
        timeZoom,
        priceZoom,
        pricePan,
      },
      ui: {
        snapPrices,
        magnet: { enabled: magnetEnabled, strength: magnetStrength },
      },
      nodes,
      edges,
      activationLines,
      circles,
      rectangles,
      parallelLines,
      shapeTriggers,
    }
  }, [activationLines, chartMode, chartTimeframe, circles, edges, followNow, magnetEnabled, magnetStrength, nodes, parallelLines, pricePan, priceZoom, rectangles, shapeTriggers, snapPrices, symbol, timeCenter, timeZoom])

  const applySnapshot = useCallback(
    (snap: any) => {
      if (!snap) {
        return
      }

      if (typeof snap.symbol === 'string' && snap.symbol.trim()) {
        dispatch({ type: 'set_symbol', symbol: snap.symbol })
      }

      if (snap.chart) {
        if (snap.chart.timeframe) setChartTimeframe(snap.chart.timeframe)
        if (snap.chart.mode) setChartMode(snap.chart.mode)
        if (typeof snap.chart.followNow === 'boolean') setFollowNow(snap.chart.followNow)
        if (typeof snap.chart.timeCenter === 'number') setTimeCenter(snap.chart.timeCenter)
        if (typeof snap.chart.timeZoom === 'number') setTimeZoom(snap.chart.timeZoom)
        if (typeof snap.chart.priceZoom === 'number') setPriceZoom(snap.chart.priceZoom)
        if (typeof snap.chart.pricePan === 'number') setPricePan(snap.chart.pricePan)
      }

      if (snap.ui) {
        if (typeof snap.ui.snapPrices === 'boolean') setSnapPrices(snap.ui.snapPrices)
        setMagnetEnabled(Boolean(snap.ui.magnet?.enabled))
        setMagnetStrength(typeof snap.ui.magnet?.strength === 'number' ? snap.ui.magnet.strength : 0.6)
      }

      setActivationLines(Array.isArray(snap.activationLines) ? snap.activationLines : [])
      setCircles(Array.isArray(snap.circles) ? snap.circles : [])
      setRectangles(Array.isArray(snap.rectangles) ? snap.rectangles : [])
      setParallelLines(Array.isArray(snap.parallelLines) ? snap.parallelLines : [])
      setShapeTriggers(Array.isArray(snap.shapeTriggers) ? snap.shapeTriggers : [])

      nodeId = 0
      setNodes(Array.isArray(snap.nodes) ? snap.nodes : [])
      setEdges(Array.isArray(snap.edges) ? snap.edges : [])

      window.setTimeout(() => {
        const rf = rfRef.current
        if (!rf) {
          return
        }
        try {
          void rf.fitView({ padding: 0.2, duration: 0 })
        } catch {
        }
      }, 0)
    },
    [dispatch, setEdges, setNodes],
  )

  useEffect(() => {
    const autosave = loadAutosave()
    if (autosave) {
      applySnapshot(autosave)
    }
  }, [applySnapshot])

  useEffect(() => {
    const t = window.setTimeout(() => {
      saveAutosave(makeSnapshot() as any)
    }, 450)
    return () => window.clearTimeout(t)
  }, [activationLines, chartMode, chartTimeframe, circles, edges, followNow, magnetEnabled, magnetStrength, makeSnapshot, nodes, parallelLines, pricePan, priceZoom, rectangles, shapeTriggers, snapPrices, timeCenter, timeZoom])

  const baseTimeWindowMs = useMemo(() => {
    const ideal = getTimeWindowMs(chartTimeframe, 120)
    return Math.max(TIME_WINDOW_MS, ideal)
  }, [chartTimeframe])

  const timeWindowMs = useMemo(() => {
    const z = clamp(timeZoom, 0.08, 12)
    return Math.max(TIME_WINDOW_MS, Math.round(baseTimeWindowMs * z))
  }, [baseTimeWindowMs, timeZoom])

  useEffect(() => {
    domainRef.current = domain
  }, [domain])

  useEffect(() => {
    timeWindowMsRef.current = timeWindowMs
  }, [timeWindowMs])

  useEffect(() => {
    if (!followNow) {
      return
    }
    setTimeCenter(Date.now())
  }, [followNow, lastPrice, priceHistory.length])

  useEffect(() => {
    if (!placementMode) {
      setPlacementPreview(null)
    }
  }, [placementMode])

  useEffect(() => {
    const intervalMinutes = Math.max(1, Math.round(timeframeToMs(chartTimeframe) / 60_000))
    const pair = symbol.replace('BTC', 'XBT').replace('/', '')
    const since = Math.floor((Date.now() - timeWindowMs * 2) / 1000)
    const intervalMs = intervalMinutes * 60_000

    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      ; (async () => {
        try {
          const url = `https://api.kraken.com/0/public/OHLC?pair=${encodeURIComponent(pair)}&interval=${intervalMinutes}&since=${since}`
          const res = await fetch(url, { signal: controller.signal })
          const json = (await res.json()) as any
          const result = json?.result
          if (!result) {
            return
          }
          const key = Object.keys(result).find((k) => k !== 'last')
          const rows = key ? result[key] : null
          if (!Array.isArray(rows)) {
            return
          }

          const points = rows
            .flatMap((r: any[]) => {
              const ts = Number(r?.[0]) * 1000
              const open = Number(r?.[1])
              const high = Number(r?.[2])
              const low = Number(r?.[3])
              const close = Number(r?.[4])
              if (!Number.isFinite(ts) || !Number.isFinite(open) || !Number.isFinite(high) || !Number.isFinite(low) || !Number.isFinite(close)) {
                return []
              }
              return [
                { timestamp: ts + intervalMs * 0.05, price: open },
                { timestamp: ts + intervalMs * 0.35, price: high },
                { timestamp: ts + intervalMs * 0.55, price: low },
                { timestamp: ts + intervalMs * 0.85, price: close },
              ]
            })
            .filter((p: any) => Number.isFinite(p.timestamp) && Number.isFinite(p.price))

          dispatch({ type: 'seed_history', points })
        } catch (e) {
          if ((e as any)?.name === 'AbortError') {
            return
          }
        }
      })()
    }, 250)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [chartTimeframe, dispatch, symbol, timeWindowMs])

  useEffect(() => {
    const el = chartHostRef.current
    if (!el) {
      return
    }

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) {
        return
      }
      const rect = entry.contentRect
      const w = Math.max(420, Math.floor(rect.width))
      const h = Math.max(320, Math.floor(rect.height))
      setChartDims((prev) => {
        if (prev.width === w && prev.height === h) {
          return prev
        }
        return { ...prev, width: w, height: h }
      })
    })

    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    activationLinesRef.current = activationLines
  }, [activationLines])

  useEffect(() => {
    const host = chartHostRef.current
    if (!host) {
      return
    }

    const shouldAllowPaneDrag = (target: EventTarget | null) => {
      const el = target as HTMLElement | null
      if (!el) {
        return false
      }

      if (el.closest('[data-chart-ui="1"]')) {
        return false
      }
      if (el.closest('[data-chart-shape="1"]')) {
        return false
      }
      if (el.closest('[data-activation-line-endpoint]')) {
        return false
      }
      if (el.closest('[data-axis-overlay]')) {
        return false
      }
      if (el.closest('.kf-floating-ui')) {
        return false
      }
      if (el.closest('.react-flow__node')) {
        return false
      }
      if (el.closest('.react-flow__handle')) {
        return false
      }
      if (el.closest('.react-flow__edge')) {
        return false
      }

      return true
    }

    const onPointerDownCapture = (e: PointerEvent) => {
      if (e.button !== 0) {
        paneDragGateRef.current = { allowed: false }
        return
      }

      if (interactionDisabledRef.current) {
        paneDragDidMoveRef.current = false
        paneDragRef.current = null
        paneDragGateRef.current = { allowed: false }
        setIsPanning(false)
        return
      }

      const elements = document.elementsFromPoint(e.clientX, e.clientY)
      const host = chartHostRef.current
      if (host) {
        const rect = host.getBoundingClientRect()
        const localX = e.clientX - rect.left
        const localY = e.clientY - rect.top
        const now = timeCenterRef.current
        const windowMs = timeWindowMsRef.current
        const dims = chartDimsRef.current
        const dom = domainRef.current
        const ts = xToTimestamp(localX, now, windowMs, dims)
        const p = snapPrice(yToPrice(localY, dom, dims))

        const handleThresh = 14

        for (const c of circlesRef.current) {
          if (c.locked || c.id === '__draft_circle__') {
            continue
          }
          const ex = timestampToX(c.edge.timestamp, now, windowMs, dims)
          const ey = priceToY(c.edge.price, dom, dims)
          if (Math.hypot(localX - ex, localY - ey) <= handleThresh) {
            setSelectedCircleId(c.id)
            setSelectedActivationLineId(null)
            setSelectedRectangleId(null)
            setSelectedParallelId(null)
            setDraggingCircle({ id: c.id, mode: 'edge', startPointerTs: ts, startPointerPrice: p, startCenter: c.center, startEdge: c.edge })
            paneDragGateRef.current = { allowed: false }
            paneDragRef.current = null
            setIsPanning(false)
            return
          }
        }

        for (const r of rectanglesRef.current) {
          if (r.locked || r.id === '__draft_rect__') {
            continue
          }
          const ax = timestampToX(r.a.timestamp, now, windowMs, dims)
          const ay = priceToY(r.a.price, dom, dims)
          const bx = timestampToX(r.b.timestamp, now, windowMs, dims)
          const by = priceToY(r.b.price, dom, dims)
          const dA = Math.hypot(localX - ax, localY - ay)
          const dB = Math.hypot(localX - bx, localY - by)
          if (dA <= handleThresh || dB <= handleThresh) {
            const mode: 'a' | 'b' = dA <= dB ? 'a' : 'b'
            setSelectedRectangleId(r.id)
            setSelectedActivationLineId(null)
            setSelectedCircleId(null)
            setSelectedParallelId(null)
            setDraggingRectangle({ id: r.id, mode, startPointerTs: ts, startPointerPrice: p, startA: r.a, startB: r.b })
            paneDragGateRef.current = { allowed: false }
            paneDragRef.current = null
            setIsPanning(false)
            return
          }
        }

        for (const pl of parallelLinesRef.current) {
          if (pl.locked || pl.id === '__draft_parallel__') {
            continue
          }
          const ax = timestampToX(pl.a.timestamp, now, windowMs, dims)
          const ay = priceToY(pl.a.price, dom, dims)
          const bx = timestampToX(pl.b.timestamp, now, windowMs, dims)
          const by = priceToY(pl.b.price, dom, dims)
          const ox = timestampToX(pl.offset.timestamp, now, windowMs, dims)
          const oy = priceToY(pl.offset.price, dom, dims)
          const dA = Math.hypot(localX - ax, localY - ay)
          const dB = Math.hypot(localX - bx, localY - by)
          const dO = Math.hypot(localX - ox, localY - oy)
          if (dA <= handleThresh || dB <= handleThresh || dO <= handleThresh) {
            const mode: 'a' | 'b' | 'offset' = dO <= dA && dO <= dB ? 'offset' : dA <= dB ? 'a' : 'b'
            setSelectedParallelId(pl.id)
            setSelectedActivationLineId(null)
            setSelectedCircleId(null)
            setSelectedRectangleId(null)
            setDraggingParallel({ id: pl.id, mode, startPointerTs: ts, startPointerPrice: p, startA: pl.a, startB: pl.b, startOffset: pl.offset })
            paneDragGateRef.current = { allowed: false }
            paneDragRef.current = null
            setIsPanning(false)
            return
          }
        }

        const annHandleEl = elements.find((el) => (el as Element)?.hasAttribute?.('data-annotation-handle')) as Element | undefined
        if (annHandleEl) {
          const kind = annHandleEl.getAttribute('data-annotation-kind')
          const id = annHandleEl.getAttribute('data-annotation-id')
          const handle = annHandleEl.getAttribute('data-annotation-handle')
          if (kind && id && handle) {
            if (kind === 'circle') {
              const c = circlesRef.current.find((x) => x.id === id)
              if (c && !c.locked && c.id !== '__draft_circle__' && handle === 'edge') {
                setSelectedCircleId(c.id)
                setSelectedActivationLineId(null)
                setSelectedRectangleId(null)
                setSelectedParallelId(null)
                setDraggingCircle({ id: c.id, mode: 'edge', startPointerTs: ts, startPointerPrice: p, startCenter: c.center, startEdge: c.edge })
                paneDragGateRef.current = { allowed: false }
                paneDragRef.current = null
                setIsPanning(false)
                return
              }
            }

            if (kind === 'rect') {
              const r = rectanglesRef.current.find((x) => x.id === id)
              if (r && !r.locked && r.id !== '__draft_rect__' && (handle === 'a' || handle === 'b')) {
                setSelectedRectangleId(r.id)
                setSelectedActivationLineId(null)
                setSelectedCircleId(null)
                setSelectedParallelId(null)
                setDraggingRectangle({ id: r.id, mode: handle, startPointerTs: ts, startPointerPrice: p, startA: r.a, startB: r.b })
                paneDragGateRef.current = { allowed: false }
                paneDragRef.current = null
                setIsPanning(false)
                return
              }
            }

            if (kind === 'parallel') {
              const pl = parallelLinesRef.current.find((x) => x.id === id)
              if (pl && !pl.locked && pl.id !== '__draft_parallel__' && (handle === 'a' || handle === 'b' || handle === 'offset')) {
                setSelectedParallelId(pl.id)
                setSelectedActivationLineId(null)
                setSelectedCircleId(null)
                setSelectedRectangleId(null)
                setDraggingParallel({ id: pl.id, mode: handle, startPointerTs: ts, startPointerPrice: p, startA: pl.a, startB: pl.b, startOffset: pl.offset })
                paneDragGateRef.current = { allowed: false }
                paneDragRef.current = null
                setIsPanning(false)
                return
              }
            }
          }
        }

        const annEl = elements.find((el) => (el as Element)?.hasAttribute?.('data-annotation-kind')) as Element | undefined
        if (annEl) {
          const kind = annEl.getAttribute('data-annotation-kind')
          const id = annEl.getAttribute('data-annotation-id')
          if (kind && id) {
            if (kind === 'circle') {
              const c = circlesRef.current.find((x) => x.id === id)
              if (c && !c.locked && c.id !== '__draft_circle__') {
                setSelectedCircleId(c.id)
                setSelectedActivationLineId(null)
                setSelectedRectangleId(null)
                setSelectedParallelId(null)
                setDraggingCircle({ id: c.id, mode: 'move', startPointerTs: ts, startPointerPrice: p, startCenter: c.center, startEdge: c.edge })
                paneDragGateRef.current = { allowed: false }
                paneDragRef.current = null
                setIsPanning(false)
                return
              }
            }

            if (kind === 'rect') {
              const r = rectanglesRef.current.find((x) => x.id === id)
              if (r && !r.locked && r.id !== '__draft_rect__') {
                setSelectedRectangleId(r.id)
                setSelectedActivationLineId(null)
                setSelectedCircleId(null)
                setSelectedParallelId(null)
                setDraggingRectangle({ id: r.id, mode: 'move', startPointerTs: ts, startPointerPrice: p, startA: r.a, startB: r.b })
                paneDragGateRef.current = { allowed: false }
                paneDragRef.current = null
                setIsPanning(false)
                return
              }
            }

            if (kind === 'parallel') {
              const pl = parallelLinesRef.current.find((x) => x.id === id)
              if (pl && !pl.locked && pl.id !== '__draft_parallel__') {
                setSelectedParallelId(pl.id)
                setSelectedActivationLineId(null)
                setSelectedCircleId(null)
                setSelectedRectangleId(null)
                setDraggingParallel({ id: pl.id, mode: 'move', startPointerTs: ts, startPointerPrice: p, startA: pl.a, startB: pl.b, startOffset: pl.offset })
                paneDragGateRef.current = { allowed: false }
                paneDragRef.current = null
                setIsPanning(false)
                return
              }
            }
          }
        }
      }

      const selectedId = selectedActivationLineIdRef.current
      if (selectedId) {
        const host = chartHostRef.current
        if (host) {
          const rect = host.getBoundingClientRect()
          const localX = e.clientX - rect.left
          const localY = e.clientY - rect.top
          if (localX >= 0 && localY >= 0 && localX <= rect.width && localY <= rect.height) {
            const line = activationLinesRef.current.find((l) => l.id === selectedId)
            if (line && !line.locked && line.id !== '__draft__') {
              const now = timeCenterRef.current
              const windowMs = timeWindowMsRef.current
              const dims = chartDimsRef.current
              const dom = domainRef.current
              const ax = timestampToX(line.a.timestamp, now, windowMs, dims)
              const ay = priceToY(line.a.price, dom, dims)
              const bx = timestampToX(line.b.timestamp, now, windowMs, dims)
              const by = priceToY(line.b.price, dom, dims)

              const dA = Math.hypot(localX - ax, localY - ay)
              const dB = Math.hypot(localX - bx, localY - by)
              const thresh = 18
              if (dA <= thresh || dB <= thresh) {
                setDraggingLineEndpoint({ id: line.id, endpoint: dA <= dB ? 'a' : 'b' })
                paneDragGateRef.current = { allowed: false }
                paneDragRef.current = null
                setIsPanning(false)
                return
              }

              const dLine = distancePointToSegment(localX, localY, ax, ay, bx, by)
              if (dLine <= 10) {
                const ts = xToTimestamp(localX, now, windowMs, dims)
                const p = snapPrice(yToPrice(localY, dom, dims))
                setDraggingLine({ id: line.id, startPointerTs: ts, startPointerPrice: p, startA: line.a, startB: line.b })
                paneDragGateRef.current = { allowed: false }
                paneDragRef.current = null
                setIsPanning(false)
                return
              }
            }
          }
        }
      }

      // activation line endpoint hit test (existing)
      // (keep after annotation handling so we don't accidentally grab the pane)

      const endpointEl = elements.find((el) => (el as Element)?.hasAttribute?.('data-activation-line-endpoint')) as
        | Element
        | undefined
      if (endpointEl) {
        const lineId = endpointEl.getAttribute('data-activation-line-id')
        const endpoint = endpointEl.getAttribute('data-activation-line-endpoint')
        if (lineId && (endpoint === 'a' || endpoint === 'b')) {
          const line = activationLinesRef.current.find((l) => l.id === lineId)
          if (line && !line.locked && line.id !== '__draft__') {
            setSelectedActivationLineId(line.id)
            setDraggingLineEndpoint({ id: line.id, endpoint })
            paneDragGateRef.current = { allowed: false }
            paneDragRef.current = null
            setIsPanning(false)
            return
          }
        }
      }

      const targetNode = e.target as unknown as globalThis.Node | null
      const hostEl = chartHostRef.current
      if (!targetNode || !hostEl?.contains(targetNode)) {
        paneDragGateRef.current = { allowed: false }
        return
      }

      paneDragDidMoveRef.current = false
      paneDragRef.current = null
      paneDragGateRef.current = { allowed: shouldAllowPaneDrag(e.target) }
    }

    const onPointerUpCapture = () => {
      paneDragGateRef.current = { allowed: false }
      paneDragRef.current = null
      setIsPanning(false)
    }

    window.addEventListener('pointerdown', onPointerDownCapture, { capture: true })
    window.addEventListener('pointerup', onPointerUpCapture, { capture: true })
    window.addEventListener('pointercancel', onPointerUpCapture, { capture: true })

    return () => {
      window.removeEventListener('pointerdown', onPointerDownCapture, { capture: true } as any)
      window.removeEventListener('pointerup', onPointerUpCapture, { capture: true } as any)
      window.removeEventListener('pointercancel', onPointerUpCapture, { capture: true } as any)
    }
  }, [])

  useEffect(() => {
    const rf = rfRef.current
    if (!rf) {
      return
    }
    void rf.fitBounds({ x: 0, y: 0, width: chartDims.width, height: chartDims.height }, { padding: 0, duration: 0 })
  }, [chartDims.height, chartDims.width])

  const applyAnchors = useCallback(
    (node: Node): Node => {
      if (!node.type || node.type === 'entry') {
        return node
      }

      const type = node.type as StrategyNodeType
      const data = node.data as OrderNodeData

      if (node.parentId) {
        return node
      }
      const now = timeCenter

      const anchorY = node.position.y + 20
      const anchorX = node.position.x + 20
      const anchorPriceRaw = yToPrice(anchorY, domain, chartDims)
      let anchorPrice = snapPrice(anchorPriceRaw)
      if (type === 'market' && typeof lastPrice === 'number' && Number.isFinite(lastPrice)) {
        anchorPrice = lastPrice
      }
      const anchorTimestamp = xToTimestamp(anchorX, now, timeWindowMs, chartDims)

      let nextData: OrderNodeData = { ...data, anchorPrice, anchorTimestamp }

      if (type === 'limit') {
        nextData = { ...nextData, limitPrice: anchorPrice }
      }
      if (type === 'iceberg') {
        nextData = { ...nextData, limitPrice: anchorPrice }
      }
      if (type === 'stop_loss' || type === 'stop_loss_limit') {
        nextData = { ...nextData, stopPrice: anchorPrice }
      }
      if (type === 'take_profit' || type === 'take_profit_limit') {
        nextData = { ...nextData, triggerPrice: anchorPrice }
      }

      if ((type === 'trailing_stop' || type === 'trailing_stop_limit') && typeof lastPrice === 'number') {
        const offset =
          data.side === 'buy' ? Math.max(0, anchorPrice - lastPrice) : Math.max(0, lastPrice - anchorPrice)
        nextData = { ...nextData, trailingOffset: offset }
      }

      // Set correct initial position for market blocks to avoid jump
      let nextPosition = node.position
      if (type === 'market' && typeof lastPrice === 'number' && Number.isFinite(lastPrice)) {
        // Position market blocks exactly at current time (now)
        const now = timeCenter
        const desiredX = timestampToX(now, now, timeWindowMs, chartDims)
        const desiredY = priceToY(lastPrice, domain, chartDims) - 25  // center on price line
        nextPosition = { x: desiredX, y: desiredY }
      }

      return { ...node, position: nextPosition, data: nextData }
    },
    [chartDims, domain, lastPrice, snapPrice, timeCenter, timeWindowMs],
  )

  useEffect(() => {
    setNodes((nds) => {
      const now = timeCenter
      let changed = false

      const next = nds.map((n) => {
        if (!n.type || n.type === 'entry') {
          return n
        }

        const data = n.data as OrderNodeData

        if (n.parentId) {
          return n
        }

        let desiredY: number | null = null
        let desiredX: number | null = null
        let desiredAnchorPrice: number | null = null

        if (typeof data.anchorTimestamp === 'number') {
          desiredX = timestampToX(data.anchorTimestamp, now, timeWindowMs, chartDims) - 20
        }

        if (n.type === 'market' && typeof lastPrice === 'number' && Number.isFinite(lastPrice)) {
          // Center market block vertically on price line (approx half card height = ~35px)
          desiredY = priceToY(lastPrice, domain, chartDims) - 25
          // Position exactly at current time (now)
          desiredX = timestampToX(now, now, timeWindowMs, chartDims)
          desiredAnchorPrice = lastPrice
        }

        if ((n.type === 'trailing_stop' || n.type === 'trailing_stop_limit') && typeof lastPrice === 'number') {
          if (typeof data.trailingOffset === 'number' && Number.isFinite(data.trailingOffset)) {
            const stopPrice = data.side === 'buy' ? lastPrice + data.trailingOffset : lastPrice - data.trailingOffset
            desiredY = priceToY(stopPrice, domain, chartDims) - 20
            desiredAnchorPrice = stopPrice
          }
        }

        if (desiredY == null) {
          if (typeof data.anchorPrice !== 'number') {
            return n
          }
          desiredY = priceToY(data.anchorPrice, domain, chartDims) - 20
        }

        const xOk = desiredX == null || Math.abs(n.position.x - desiredX) < 0.5
        const yOk = Math.abs(n.position.y - desiredY) < 0.5

        if (xOk && yOk) {
          return n
        }

        changed = true

        const nextPos = {
          x: desiredX == null ? n.position.x : desiredX,
          y: desiredY,
        }

        if (desiredAnchorPrice != null) {
          return {
            ...n,
            position: nextPos,
            data: { ...(data as Record<string, unknown>), anchorPrice: desiredAnchorPrice },
          }
        }

        return { ...n, position: nextPos }
      })

      return changed ? next : nds
    })
  }, [chartDims, domain, lastPrice, priceHistory.length, setNodes, timeCenter, timeWindowMs])

  const onNodesChangeWithAnchors = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => {
        let updated = applyNodeChanges(changes, nds)

        const resizedHeights = new Map<string, number>()
        for (const c of changes) {
          if (c.type !== 'dimensions') {
            continue
          }
          if (typeof c.dimensions?.height === 'number' && Number.isFinite(c.dimensions.height)) {
            resizedHeights.set(c.id, c.dimensions.height)
          }
        }

        const withSizing = resizedHeights.size
          ? updated.map((n) => {
            if (!n.type || n.type === 'entry' || n.parentId) {
              return n
            }
            if (n.type !== 'trailing_stop' && n.type !== 'trailing_stop_limit') {
              return n
            }

            const h = resizedHeights.get(n.id)
            if (typeof h !== 'number') {
              return n
            }

            const minH = 110
            const maxH = 240
            const t = Math.max(0, Math.min(1, (h - minH) / (maxH - minH)))
            const closePercent = Math.max(1, Math.min(100, Math.round(t * 100)))

            const existing = n.data as Record<string, unknown>
            if (existing.closePercent === closePercent) {
              return n
            }
            return { ...n, data: { ...existing, closePercent } }
          })
          : updated

        return withSizing.map(applyAnchors)
      })
    },
    [applyAnchors, setNodes],
  )

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  )

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }, [])

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault()

      const type = getDraggedNodeType(event)
      if (!type) {
        return
      }

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })

      const rootNodes = nodes.filter((n) => isRootNodeType(n.type ?? ''))
      const nearestRoot = rootNodes.length
        ? rootNodes
          .map((n) => {
            const dx = (n.position?.x ?? 0) - position.x
            const dy = (n.position?.y ?? 0) - position.y
            return { n, d: dx * dx + dy * dy }
          })
          .sort((a, b) => a.d - b.d)[0]?.n ?? null
        : null

      if (isExitNodeType(type) && !nearestRoot) {
        return
      }
      const def = getNodeDefinition(type)

      const data = { ...(def.defaultData as Record<string, unknown>) }
      if (type !== 'entry') {
        ; (data as any).skin = 'card'
      }

      ; (data as any).active = true

      // Read side from drag data (set by StrategyBuilderBar)
      const side = event.dataTransfer.getData('application/krakenforge-side')
      if (side === 'buy' || side === 'sell') {
        ; (data as any).side = side
      }

      if (isExitNodeType(type) && nearestRoot) {
        const rootSide = (nearestRoot.data as Record<string, unknown>)?.side
          ; (data as any).side = rootSide === 'buy' ? 'sell' : 'buy'
          ; (data as any).isChild = true
      }

      const newNode: Node = {
        id: getId(),
        type,
        position,
        data,
      }

      const anchored = applyAnchors(newNode)
      setNodes((nds) => nds.concat(anchored))

      if (isExitNodeType(type) && nearestRoot) {
        const newEdge: Edge = {
          id: `edge_${nearestRoot.id}_${anchored.id}`,
          source: nearestRoot.id,
          target: anchored.id,
          type: 'default',
        }
        setEdges((es) => [...es, newEdge])
      }
    },
    [applyAnchors, getNodeDefinition, nodes, screenToFlowPosition, setEdges, setNodes],
  )

  const onPaneClick = useCallback(
    (event?: any) => {
      const debugAnn = typeof window !== 'undefined' && window.localStorage.getItem('kf_debug_annotations') === '1'
      if (debugAnn) {
        console.log('[kf] onPaneClick', {
          paneDragDidMove: paneDragDidMoveRef.current,
          drawLineMode,
          drawCircleMode,
          drawRectangleMode,
          drawParallelMode,
          placementMode,
          hasLineDraft: Boolean(lineDraft),
          hasCircleDraft: Boolean(circleDraft),
          hasRectangleDraft: Boolean(rectangleDraft),
          hasParallelDraft: Boolean(parallelDraft),
          hasParallelOffsetDraft: Boolean(parallelOffsetDraft),
        })
      }

      if (paneDragDidMoveRef.current) {
        paneDragDidMoveRef.current = false
        if (!drawLineMode && !drawCircleMode && !drawRectangleMode && !drawParallelMode) {
          return
        }
      }

      if (drawCircleMode) {
        if (!event) {
          return
        }
        const host = chartHostRef.current
        if (!host) {
          return
        }
        const rect = host.getBoundingClientRect()
        const localX = (event.clientX as number) - rect.left
        const localY = (event.clientY as number) - rect.top
        const now = timeCenter
        const ts = xToTimestamp(localX, now, timeWindowMs, chartDims)
        const p = snapPrice(yToPrice(localY, domain, chartDims))

        if (!circleDraft) {
          if (debugAnn) {
            console.log('[kf] circle: start', { ts, p })
          }
          setCircleDraft({ center: { timestamp: ts, price: p }, edge: { timestamp: ts, price: p } })
          return
        }

        const name = `Circle ${circles.length + 1}`
        const id = `circle_${Date.now()}`
        const nextCircle: CircleAnnotation = {
          id,
          name,
          center: circleDraft.center,
          edge: { timestamp: ts, price: p },
          createdAt: Date.now(),
        }
        if (debugAnn) {
          console.log('[kf] circle: finish', { id, ts, p })
        }
        setCircles((cs) => cs.concat(nextCircle))
        setCircleDraft(null)
        setDrawCircleMode(false)
        return
      }

      if (drawRectangleMode) {
        if (!event) {
          return
        }
        const host = chartHostRef.current
        if (!host) {
          return
        }
        const rect = host.getBoundingClientRect()
        const localX = (event.clientX as number) - rect.left
        const localY = (event.clientY as number) - rect.top
        const now = timeCenter
        const ts = xToTimestamp(localX, now, timeWindowMs, chartDims)
        const p = snapPrice(yToPrice(localY, domain, chartDims))

        if (!rectangleDraft) {
          if (debugAnn) {
            console.log('[kf] rect: start', { ts, p })
          }
          setRectangleDraft({ a: { timestamp: ts, price: p }, b: { timestamp: ts, price: p } })
          return
        }

        const name = `Rectangle ${rectangles.length + 1}`
        const id = `rect_${Date.now()}`
        const nextRect: RectangleAnnotation = {
          id,
          name,
          a: rectangleDraft.a,
          b: { timestamp: ts, price: p },
          createdAt: Date.now(),
        }
        if (debugAnn) {
          console.log('[kf] rect: finish', { id, ts, p })
        }
        setRectangles((rs) => rs.concat(nextRect))
        setRectangleDraft(null)
        setDrawRectangleMode(false)
        return
      }

      if (drawParallelMode) {
        if (!event) {
          return
        }
        const host = chartHostRef.current
        if (!host) {
          return
        }
        const rect = host.getBoundingClientRect()
        const localX = (event.clientX as number) - rect.left
        const localY = (event.clientY as number) - rect.top
        const now = timeCenter
        const ts = xToTimestamp(localX, now, timeWindowMs, chartDims)
        const p = snapPrice(yToPrice(localY, domain, chartDims))

        if (!parallelDraft) {
          if (debugAnn) {
            console.log('[kf] parallel: start', { ts, p })
          }
          setParallelDraft({ a: { timestamp: ts, price: p }, b: { timestamp: ts, price: p } })
          return
        }
        if (!parallelOffsetDraft) {
          if (debugAnn) {
            console.log('[kf] parallel: second', { ts, p })
          }
          setParallelDraft({ ...parallelDraft, b: { timestamp: ts, price: p } })
          setParallelOffsetDraft({ timestamp: ts, price: p })
          return
        }

        const name = `Parallel ${parallelLines.length + 1}`
        const id = `parallel_${Date.now()}`
        const nextParallel: ParallelLinesAnnotation = {
          id,
          name,
          a: parallelDraft.a,
          b: parallelDraft.b,
          offset: { timestamp: ts, price: p },
          createdAt: Date.now(),
        }
        if (debugAnn) {
          console.log('[kf] parallel: finish', { id, ts, p })
        }
        setParallelLines((ps) => ps.concat(nextParallel))
        setParallelDraft(null)
        setParallelOffsetDraft(null)
        setDrawParallelMode(false)
        return
      }

      if (drawLineMode) {
        if (!event) {
          return
        }

        const host = chartHostRef.current
        if (!host) {
          return
        }

        const rect = host.getBoundingClientRect()
        const localX = (event.clientX as number) - rect.left
        const localY = (event.clientY as number) - rect.top

        const now = timeCenter
        const ts = xToTimestamp(localX, now, timeWindowMs, chartDims)
        const p = snapPrice(yToPrice(localY, domain, chartDims))

        if (!lineDraft) {
          if (debugAnn) {
            console.log('[kf] line: start', { ts, p })
          }
          setLineDraft({ a: { timestamp: ts, price: p }, b: { timestamp: ts, price: p } })
          return
        }

        const name = `Line ${activationLines.length + 1}`
        const id = `line_${Date.now()}`
        const nextLine: ActivationLine = {
          id,
          name,
          a: lineDraft.a,
          b: { timestamp: ts, price: p },
          createdAt: Date.now(),
        }

        if (debugAnn) {
          console.log('[kf] line: finish', { id, ts, p })
        }

        setActivationLines((ls) => ls.concat(nextLine))
        setLineDraft(null)
        setDrawLineMode(false)
        return
      }

      if (placementMode) {
        if (!event) {
          return
        }

        setFollowNow(false)

        const host = chartHostRef.current
        if (!host) {
          return
        }

        const rect = host.getBoundingClientRect()
        const localX = (event.clientX as number) - rect.left
        const localY = (event.clientY as number) - rect.top

        const now = timeCenter
        const anchorTs = xToTimestamp(localX, now, timeWindowMs, chartDims)
        const anchorPrice = snapPrice(yToPrice(localY, domain, chartDims))
        const snappedY = priceToY(anchorPrice, domain, chartDims)

        const x = timestampToX(anchorTs, now, timeWindowMs, chartDims) - 20
        const y = snappedY - 20

        const position = { x, y }

        const def = getNodeDefinition('limit')
        const data = {
          ...(def.defaultData as Record<string, unknown>),
          side: placementMode,
          skin: 'card',
        } as OrderNodeData

        const newNode: Node = {
          id: getId(),
          type: 'limit',
          position,
          data,
        }

        setNodes((nds) => nds.concat(applyAnchors(newNode)))
        dispatch({ type: 'select_node', nodeId: newNode.id })
        setPlacementMode(null)
        setPlacementPreview(null)
        return
      }

      if (!drawLineMode && !drawCircleMode && !drawRectangleMode && !drawParallelMode) {
        setSelectedActivationLineId(null)
        setSelectedCircleId(null)
        setSelectedRectangleId(null)
        setSelectedParallelId(null)
        setSelectedTriggerId(null)
        setSelectedActionId(null)
        setSelectedPositionId(null)
      }

      dispatch({ type: 'select_node', nodeId: null })
    },
    [
      activationLines.length,
      applyAnchors,
      chartDims,
      circleDraft,
      circles.length,
      dispatch,
      domain,
      drawCircleMode,
      drawLineMode,
      drawParallelMode,
      drawRectangleMode,
      getNodeDefinition,
      lineDraft,
      parallelDraft,
      parallelLines.length,
      parallelOffsetDraft,
      placementMode,
      rectangleDraft,
      rectangles.length,
      screenToFlowPosition,
      setNodes,
      snapPrice,
      timeCenter,
      timeWindowMs,
    ],
  )

  const closePositionNow = useCallback(
    (positionId: string) => {
      const paper = accountState.paper
      if (!paper) {
        return
      }
      if (!(typeof lastPrice === 'number' && Number.isFinite(lastPrice))) {
        return
      }
      const pos = paper.openPositions.find((p) => p.id === positionId)
      if (!pos) {
        return
      }

      const now = Date.now()
      const pct = 100
      const closingAmount = pos.amount * (pct / 100)
      const totalMarginUsed = typeof pos.marginUsedUsd === 'number' && Number.isFinite(pos.marginUsedUsd) ? pos.marginUsedUsd : pos.amount * pos.entryPrice
      const releasedMargin = totalMarginUsed * (closingAmount / pos.amount)
      const pnl = pos.side === 'long'
        ? (lastPrice - pos.entryPrice) * closingAmount
        : (pos.entryPrice - lastPrice) * closingAmount

      const usd = typeof paper.balances?.USD === 'number' && Number.isFinite(paper.balances.USD) ? paper.balances.USD : 0
      const nextUsd = usd + releasedMargin + pnl

      const hist = {
        id: `hist_${now}_${Math.random().toString(16).slice(2)}`,
        symbol: pos.symbol,
        side: pos.side,
        amount: pos.amount,
        entryPrice: pos.entryPrice,
        exitPrice: lastPrice,
        openedAt: pos.openedAt,
        closedAt: now,
        realizedPnl: pnl,
      }

      const canceled = paper.openOrders
        .filter((o) => o.positionId === positionId && o.status === 'open')
        .map((o) => ({ ...o, status: 'canceled' as const }))

      const nextPaper = {
        ...paper,
        balances: { ...(paper.balances ?? {}), USD: nextUsd },
        openPositions: paper.openPositions.filter((p) => p.id !== positionId),
        openOrders: paper.openOrders.filter((o) => o.positionId !== positionId),
        orderHistory: [...canceled, ...(paper.orderHistory ?? [])],
        positionHistory: [hist, ...(paper.positionHistory ?? [])],
        updatedAt: now,
      }

      accountDispatch({ type: 'set_paper', paper: nextPaper })
      setSelectedPositionId(null)
    },
    [accountDispatch, accountState.paper, lastPrice],
  )

  const onDropPositionAction = useCallback(
    (positionId: string, blockType: string) => {
      const paper = accountState.paper
      if (!paper) {
        return
      }
      const pos = paper.openPositions.find((p) => p.id === positionId)
      if (!pos) {
        return
      }

      const now = Date.now()
      const side = pos.side === 'long' ? 'sell' : 'buy'

      const mkOrder = (patch: any) => ({
        id: `ord_${now}_${Math.random().toString(16).slice(2)}`,
        symbol: pos.symbol,
        side,
        type: patch.type,
        price: patch.price ?? null,
        price2: patch.price2 ?? null,
        amount: 0,
        createdAt: now,
        status: 'open' as const,
        positionId,
        closePercent: patch.closePercent ?? 100,
        trailingOffset: patch.trailingOffset ?? null,
        trailingOffsetUnit: patch.trailingOffsetUnit,
        trailRefPrice: patch.trailRefPrice ?? null,
        ocoGroupId: patch.ocoGroupId,
      })

      let order: any = null
      if (blockType === 'stop_loss' || blockType === 'stop_loss_limit') {
        const stop = pos.entryPrice * (pos.side === 'long' ? 0.99 : 1.01)
        order = mkOrder({
          type: blockType === 'stop_loss' ? 'stop-loss' : 'stop-loss-limit',
          price: stop,
          price2: blockType === 'stop_loss_limit' ? stop : null,
        })
      } else if (blockType === 'take_profit' || blockType === 'take_profit_limit') {
        const tp = pos.entryPrice * (pos.side === 'long' ? 1.01 : 0.99)
        order = mkOrder({
          type: blockType === 'take_profit' ? 'take-profit' : 'take-profit-limit',
          price: tp,
          price2: blockType === 'take_profit_limit' ? tp : null,
        })
      } else if (blockType === 'trailing_stop' || blockType === 'trailing_stop_limit') {
        const ref = typeof lastPrice === 'number' && Number.isFinite(lastPrice) ? lastPrice : pos.entryPrice
        order = mkOrder({
          type: blockType === 'trailing_stop' ? 'trailing-stop' : 'trailing-stop-limit',
          trailingOffset: 0.5,
          trailingOffsetUnit: 'percent',
          trailRefPrice: ref,
          price2: blockType === 'trailing_stop_limit' ? 0.25 : null,
        })
      } else {
        return
      }

      setPendingExitEditorOrderId(order.id)

      const nextPaper = {
        ...paper,
        openOrders: [...paper.openOrders, order],
        updatedAt: now,
      }

      accountDispatch({ type: 'set_paper', paper: nextPaper })
    },
    [accountDispatch, accountState.paper, lastPrice],
  )

  const onNodeClick = useCallback(
    (_: MouseEvent, node: Node) => {
      setSelectedPositionId(null)
      dispatch({ type: 'select_node', nodeId: node.id })
    },
    [dispatch],
  )

  const onNodeContextMenu = useCallback(
    (e: MouseEvent, node: Node) => {
      e.preventDefault()
      e.stopPropagation()
      setNodeContextMenu({ x: e.clientX, y: e.clientY, nodeId: node.id })
    },
    [],
  )

  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId))
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))
      dispatch({ type: 'select_node', nodeId: null })
      setNodeContextMenu(null)
    },
    [dispatch, setEdges, setNodes],
  )

  const deleteNodeWithChildren = useCallback(
    (nodeId: string) => {
      // Find all child node IDs recursively
      const collectChildren = (parentId: string, nds: Node[]): string[] => {
        const childIds = nds.filter((n) => n.parentId === parentId).map((n) => n.id)
        const nestedChildren = childIds.flatMap((cid) => collectChildren(cid, nds))
        return [...childIds, ...nestedChildren]
      }

      const idsToDelete = new Set([nodeId, ...collectChildren(nodeId, nodes)])

      setNodes((nds) => nds.filter((n) => !idsToDelete.has(n.id)))
      setEdges((eds) => eds.filter((e) => !idsToDelete.has(e.source) && !idsToDelete.has(e.target)))
      dispatch({ type: 'select_node', nodeId: null })
      setNodeContextMenu(null)
    },
    [dispatch, nodes, setEdges, setNodes],
  )

  const onUpdateNodeData = useCallback(
    (nodeIdToUpdate: string, patch: Partial<OrderNodeData> & { label?: string }) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== nodeIdToUpdate) {
            return n
          }
          if (!n.type || n.type === 'entry') {
            return n
          }

          const nodeType = n.type as StrategyNodeType
          const nextData = { ...(n.data as Record<string, unknown>), ...patch } as OrderNodeData

          let nextPosition = n.position
          const now = timeCenter

          if (nodeType === 'limit' && typeof patch.limitPrice === 'number') {
            const y = priceToY(patch.limitPrice, domain, chartDims)
            nextPosition = { ...nextPosition, y: y - 20 }
          }
          if ((nodeType === 'stop_loss' || nodeType === 'stop_loss_limit') && typeof patch.stopPrice === 'number') {
            const y = priceToY(patch.stopPrice, domain, chartDims)
            nextPosition = { ...nextPosition, y: y - 20 }
          }
          if ((nodeType === 'take_profit' || nodeType === 'take_profit_limit') && typeof patch.triggerPrice === 'number') {
            const y = priceToY(patch.triggerPrice, domain, chartDims)
            nextPosition = { ...nextPosition, y: y - 20 }
          }
          if (typeof patch.anchorTimestamp === 'number') {
            const x = timestampToX(patch.anchorTimestamp, now, timeWindowMs, chartDims)
            nextPosition = { ...nextPosition, x: x - 20 }
          }

          return applyAnchors({ ...n, position: nextPosition, data: nextData })
        }),
      )
    },
    [applyAnchors, chartDims, domain, setNodes, timeCenter, timeWindowMs],
  )

  const onPriceAxisPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      axisDragRef.current = { kind: 'price', startY: e.clientY, startZoom: priceZoom, startPan: pricePan }
        ; (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
    },
    [pricePan, priceZoom],
  )

  const onPriceAxisWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const dy = e.deltaY
      const factor = Math.exp(-dy / 180)

      const z0 = clamp(priceZoom, 0.25, 6)
      const z1 = clamp(z0 * factor, 0.25, 6)

      const range0 = domain.max - domain.min
      if (!(range0 > 0)) {
        setPriceZoom(z1)
        return
      }

      // Always use anchor zoom mode (anchored on last price)
      const lp = typeof lastPrice === 'number' && Number.isFinite(lastPrice) ? lastPrice : null
      const anchorPrice = lp != null && lp >= domain.min && lp <= domain.max ? lp : (domain.min + domain.max) / 2
      const t = clamp((domain.max - anchorPrice) / range0, 0, 1)
      const range1 = range0 * (z0 / z1)

      const newMax = anchorPrice + t * range1
      const newCenter = newMax - range1 / 2
      const autoMid = (autoDomain.min + autoDomain.max) / 2

      setPriceZoom(z1)
      setPricePan(newCenter - autoMid)
    },
    [
      autoDomain.max,
      autoDomain.min,
      chartDims.height,
      chartDims.padding,
      chartDims.paddingBottom,
      chartDims.paddingTop,
      domain.max,
      domain.min,
      lastPrice,
      priceZoom,
    ],
  )

  const onTimeAxisPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      setFollowNow(false)
      const host = chartHostRef.current
      if (!host) {
        return
      }
      const rect = host.getBoundingClientRect()
      const padL = chartDims.paddingLeft ?? chartDims.padding
      const padR = chartDims.paddingRight ?? chartDims.padding
      const usableW = Math.max(1, chartDims.width - padL - padR)
      const localX = e.clientX - rect.left
      const t = clamp((localX - padL) / usableW, 0, 1)
      const start = timeCenter - timeWindowMs / 2
      const anchorTs = start + t * timeWindowMs
      axisDragRef.current = { kind: 'time_zoom', startX: e.clientX, startZoom: timeZoom, anchorT: t, anchorTs }
        ; (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
    },
    [chartDims.padding, chartDims.paddingLeft, chartDims.paddingRight, chartDims.width, timeCenter, timeWindowMs, timeZoom],
  )

  const onTimeAxisWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setFollowNow(false)

      const host = chartHostRef.current
      if (!host) {
        return
      }

      const rect = host.getBoundingClientRect()
      const padL = chartDims.paddingLeft ?? chartDims.padding
      const padR = chartDims.paddingRight ?? chartDims.padding
      const usableW = Math.max(1, chartDims.width - padL - padR)
      const localX = e.clientX - rect.left
      const t = clamp((localX - padL) / usableW, 0, 1)

      const start = timeCenter - timeWindowMs / 2
      const anchorTs = start + t * timeWindowMs

      const factor = Math.exp(e.deltaY / 260)
      const nextZoom = clamp(timeZoom * factor, 0.08, 12)
      const newWindow = Math.max(TIME_WINDOW_MS, Math.round(baseTimeWindowMs * nextZoom))

      setTimeZoom(nextZoom)
      setTimeCenter(anchorTs + (0.5 - t) * newWindow)
    },
    [baseTimeWindowMs, chartDims.padding, chartDims.paddingLeft, chartDims.paddingRight, chartDims.width, timeCenter, timeWindowMs, timeZoom],
  )

  const onAxisPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = axisDragRef.current
      if (!drag) {
        return
      }

      if (drag.kind === 'price') {
        const dy = e.clientY - drag.startY
        const factor = Math.exp(-dy / 180)
        setPriceZoom(Math.max(0.25, Math.min(6, drag.startZoom * factor)))
        const padT = chartDims.paddingTop ?? chartDims.padding
        const padB = chartDims.paddingBottom ?? chartDims.padding
        const usableH = Math.max(1, chartDims.height - padT - padB)
        const range = domain.max - domain.min
        if (range > 0) {
          const pricePerPx = range / usableH
          setPricePan(drag.startPan + dy * pricePerPx)
        }
      }

      if (drag.kind === 'time_zoom') {
        const dx = e.clientX - drag.startX
        const factor = Math.exp(dx / 180)
        const nextZoom = clamp(drag.startZoom * factor, 0.08, 12)
        const newWindow = Math.max(TIME_WINDOW_MS, Math.round(baseTimeWindowMs * nextZoom))
        setTimeZoom(nextZoom)
        setTimeCenter(drag.anchorTs + (0.5 - drag.anchorT) * newWindow)
      }
    },
    [
      baseTimeWindowMs,
      chartDims.height,
      chartDims.padding,
      chartDims.paddingBottom,
      chartDims.paddingTop,
      chartDims.width,
      domain.max,
      domain.min,
    ],
  )

  const onPaneMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (e.buttons !== 1) {
        const host = chartHostRef.current
        if (host && !isPanning) {
          const rect = host.getBoundingClientRect()
          const localX = e.clientX - rect.left
          const localY = e.clientY - rect.top
          setHoverPos({ x: localX, y: localY })

          if (selectedActivationLineId) {
            const line = activationLines.find((l) => l.id === selectedActivationLineId)
            if (line && !line.locked) {
              const ax = timestampToX(line.a.timestamp, timeCenter, timeWindowMs, chartDims)
              const ay = priceToY(line.a.price, domain, chartDims)
              const bx = timestampToX(line.b.timestamp, timeCenter, timeWindowMs, chartDims)
              const by = priceToY(line.b.price, domain, chartDims)

              const dA = Math.hypot(localX - ax, localY - ay)
              const dB = Math.hypot(localX - bx, localY - by)
              const thresh = 18
              if (dA <= thresh) {
                setHoveredLineHandle({ id: line.id, endpoint: 'a' })
                setHoveredLineBody(null)
              } else if (dB <= thresh) {
                setHoveredLineHandle({ id: line.id, endpoint: 'b' })
                setHoveredLineBody(null)
              } else {
                setHoveredLineHandle(null)
                const dLine = distancePointToSegment(localX, localY, ax, ay, bx, by)
                setHoveredLineBody(dLine <= 10 ? { id: line.id } : null)
              }
            } else {
              setHoveredLineHandle(null)
              setHoveredLineBody(null)
            }
          } else {
            setHoveredLineHandle(null)
            setHoveredLineBody(null)
          }
        }
      }

      if (drawLineMode && lineDraft) {
        const host = chartHostRef.current
        if (host) {
          const rect = host.getBoundingClientRect()
          const localX = e.clientX - rect.left
          const localY = e.clientY - rect.top
          const now = timeCenter
          const ts = xToTimestamp(localX, now, timeWindowMs, chartDims)
          const p = snapPrice(yToPrice(localY, domain, chartDims))
          setLineDraft({ ...lineDraft, b: { timestamp: ts, price: p } })
        }
      }

      if (drawCircleMode && circleDraft) {
        const host = chartHostRef.current
        if (host) {
          const rect = host.getBoundingClientRect()
          const localX = e.clientX - rect.left
          const localY = e.clientY - rect.top
          const now = timeCenter
          const ts = xToTimestamp(localX, now, timeWindowMs, chartDims)
          const p = snapPrice(yToPrice(localY, domain, chartDims))
          setCircleDraft({ ...circleDraft, edge: { timestamp: ts, price: p } })
        }
      }

      if (drawRectangleMode && rectangleDraft) {
        const host = chartHostRef.current
        if (host) {
          const rect = host.getBoundingClientRect()
          const localX = e.clientX - rect.left
          const localY = e.clientY - rect.top
          const now = timeCenter
          const ts = xToTimestamp(localX, now, timeWindowMs, chartDims)
          const p = snapPrice(yToPrice(localY, domain, chartDims))
          setRectangleDraft({ ...rectangleDraft, b: { timestamp: ts, price: p } })
        }
      }

      if (drawParallelMode && parallelDraft) {
        const host = chartHostRef.current
        if (host) {
          const rect = host.getBoundingClientRect()
          const localX = e.clientX - rect.left
          const localY = e.clientY - rect.top
          const now = timeCenter
          const ts = xToTimestamp(localX, now, timeWindowMs, chartDims)
          const p = snapPrice(yToPrice(localY, domain, chartDims))
          if (!parallelOffsetDraft) {
            setParallelDraft({ ...parallelDraft, b: { timestamp: ts, price: p } })
          } else {
            setParallelOffsetDraft({ timestamp: ts, price: p })
          }
        }
      }

      if (placementMode && e.buttons === 0) {
        const host = chartHostRef.current
        if (host) {
          const rect = host.getBoundingClientRect()
          const localY = e.clientY - rect.top
          const raw = yToPrice(localY, domain, chartDims)
          const p = snapPrice(raw)
          const y = priceToY(p, domain, chartDims)
          setPlacementPreview({ y, price: p, side: placementMode })
        }
      }

      // Don't pan while dragging exit order price tags
      if (draggingPositionExit) {
        paneDragRef.current = null
        paneDragDidMoveRef.current = false
        setIsPanning(false)
        return
      }

      if (e.buttons === 1 && (drawLineMode || drawCircleMode || drawRectangleMode || drawParallelMode)) {
        paneDragRef.current = null
        paneDragDidMoveRef.current = false
        setIsPanning(false)
        return
      }

      if (e.buttons !== 1) {
        paneDragRef.current = null
        setIsPanning(false)
        return
      }

      if (!paneDragGateRef.current.allowed) {
        paneDragRef.current = null
        setIsPanning(false)
        return
      }

      const padL = chartDims.paddingLeft ?? chartDims.padding
      const padR = chartDims.paddingRight ?? chartDims.padding
      const padT = chartDims.paddingTop ?? chartDims.padding
      const padB = chartDims.paddingBottom ?? chartDims.padding

      const usableW = Math.max(1, chartDims.width - padL - padR)
      const usableH = Math.max(1, chartDims.height - padT - padB)

      if (!paneDragRef.current) {
        setFollowNow(false)
        setIsPanning(true)
        paneDragRef.current = {
          startX: e.clientX,
          startY: e.clientY,
          startCenter: timeCenter,
          startPricePan: pricePan,
          startDomainRange: domain.max - domain.min,
        }
      }

      const drag = paneDragRef.current
      if (!drag) {
        return
      }

      const dx = e.clientX - drag.startX
      const dy = e.clientY - drag.startY

      if (Math.abs(dx) + Math.abs(dy) > 2) {
        paneDragDidMoveRef.current = true
      }

      const msPerPx = timeWindowMs / usableW
      setTimeCenter(drag.startCenter - dx * msPerPx)

      if (drag.startDomainRange > 0) {
        const pricePerPx = drag.startDomainRange / usableH
        setPricePan(drag.startPricePan + dy * pricePerPx)
      }
    },
    [
      activationLines,
      chartDims,
      domain,
      draggingPositionExit,
      drawCircleMode,
      drawLineMode,
      drawParallelMode,
      drawRectangleMode,
      isPanning,
      circleDraft,
      lineDraft,
      parallelDraft,
      parallelOffsetDraft,
      placementMode,
      pricePan,
      selectedActivationLineId,
      rectangleDraft,
      snapPrice,
      timeCenter,
      timeWindowMs,
    ],
  )

  useEffect(() => {
    const latest = priceHistory[0]
    if (!latest || typeof latest.timestamp !== 'number') {
      return
    }

    const prev = prevTickRef.current
    if (prev.timestamp != null && latest.timestamp === prev.timestamp) {
      return
    }

    prevTickRef.current = { timestamp: latest.timestamp, price: latest.price }

    const prevPrice = prev.price
    const prevTs = prev.timestamp

    if (typeof prevPrice !== 'number' || typeof prevTs !== 'number') {
      return
    }

    const market = { symbol, lastPrice: latest.price }

    if (startupMode === 'virtual' && accountState.paper) {
      const now = timeCenterRef.current
      const windowMs = timeWindowMsRef.current
      const dims = chartDimsRef.current
      const dom = domainRef.current
      const thresholdPrice = Math.max(1e-9, (dom.max - dom.min) * 0.001)

      const result = stepPaperTradingFromShapeTriggers({
        paper: accountState.paper,
        shapeTriggers,
        tick: {
          symbol,
          timestamp: latest.timestamp,
          price: latest.price,
          prevTimestamp: prevTs,
          prevPrice,
        },
        ctx: {
          activationLines,
          rectangles: rectanglesRef.current,
          circles: circlesRef.current,
          parallelLines: parallelLinesRef.current,
          chartDims: dims,
          domain: dom,
          timeCenter: now,
          timeWindowMs: windowMs,
          thresholdPrice,
        },
      })

      if (result.paper !== accountState.paper) {
        accountDispatch({ type: 'set_paper', paper: result.paper })
      }

      if (result.firedTriggerIds.length > 0) {
        const fired = new Set(result.firedTriggerIds)
        const firedAt = Date.now()
        setShapeTriggers((prevTriggers) => {
          let changed = false
          const next = prevTriggers.map((t) => {
            if (!fired.has(t.id)) {
              return t
            }
            if (t.triggeredAt) {
              return t
            }
            changed = true
            return { ...t, triggeredAt: firedAt }
          })
          return changed ? next : prevTriggers
        })
      }

      // ─────────────────────────────────────────────────────────────
      // AUTO-DEACTIVATE INVALID TRIGGERS
      // ─────────────────────────────────────────────────────────────
      // Check if any active triggers are now positionally invalid (e.g. passed)
      // We do this in a separate pass to ensure state is fresh
      if (shapeTriggers.some(t => t.isActive)) {
        const tick = {
          symbol,
          timestamp: latest.timestamp,
          price: latest.price,
          prevTimestamp: prevTs,
          prevPrice,
        }
        const ctx = {
          activationLines,
          rectangles: rectanglesRef.current,
          circles: circlesRef.current,
          parallelLines: parallelLinesRef.current,
          chartDims: dims,
          domain: dom,
          timeCenter: now,
          timeWindowMs: windowMs,
          thresholdPrice,
        }

        let deactivationChanged = false
        const toDeactivate = new Set<string>()

        for (const t of shapeTriggers) {
          if (t.isActive && shouldDeactivateTrigger(t, tick, ctx)) {
            toDeactivate.add(t.id)
            deactivationChanged = true
          }
        }

        if (deactivationChanged) {
          setShapeTriggers(prev => prev.map(t => {
            if (toDeactivate.has(t.id)) {
              return { ...t, isActive: false }
            }
            return t
          }))
        }
      }
    }

    setNodes((nds) => {
      const blocks = blocksFromReactFlow(nds, edges)
      const blockById = new Map(blocks.map((b) => [b.id, b]))
      const nodeDataById = new Map(
        nds
          .filter((n) => n.type && n.type !== 'entry')
          .map((n) => [n.id, (n.data as OrderNodeData | undefined) ?? null] as const),
      )

      let changed = false

      const next = nds.map((n) => {
        if (!n.type || n.type === 'entry') {
          return n
        }

        const block = blockById.get(n.id)
        if (!block) {
          return n
        }

        const data = (n.data as OrderNodeData | undefined) ?? null
        if (!data) {
          return n
        }

        let priceHitOverride: boolean | undefined
        if (data.activationLineId) {
          const line = activationLines.find((l) => l.id === data.activationLineId)
          if (line) {
            const prevLevel = linePriceAt(line, prevTs)
            const nextLevel = linePriceAt(line, latest.timestamp)
            const a = prevPrice - prevLevel
            const b = latest.price - nextLevel
            priceHitOverride = (a <= 0 && b > 0) || (a >= 0 && b < 0)
          } else {
            priceHitOverride = false
          }
        }

        const nextRuntime = stepRuntime({
          block,
          market,
          indicators,
          prev: data.runtime,
          gates: data.gates,
          failAction: data.failAction,
          partialFillPercent: data.partialFillPercent,
          priceHitOverride,
        })

        let enriched = nextRuntime

        if (enriched.status === 'filled' && block.parentId) {
          const parent = blockById.get(block.parentId)
          const parentData = parent ? nodeDataById.get(parent.id) : null
          const entryPrice =
            typeof parentData?.limitPrice === 'number'
              ? parentData.limitPrice
              : typeof parentData?.anchorPrice === 'number'
                ? parentData.anchorPrice
                : null

          const fillPrice = typeof enriched.fillPrice === 'number' ? enriched.fillPrice : latest.price
          if (entryPrice != null && entryPrice > 0) {
            const sign = (parentData?.side ?? 'buy') === 'sell' ? -1 : 1
            const pnlPct = (sign * (fillPrice - entryPrice) * 100) / entryPrice
            enriched = { ...enriched, lastPnlPct: Number.isFinite(pnlPct) ? pnlPct : undefined }
          }
        }

        if (block.kind === 'stop_loss' || block.kind === 'stop_loss_limit' || block.kind === 'trailing_stop' || block.kind === 'trailing_stop_limit') {
          const dist =
            typeof latest.price === 'number' && typeof data.anchorPrice === 'number' && latest.price !== 0
              ? Math.abs(latest.price - data.anchorPrice) / latest.price
              : null
          const riskLevel = dist == null ? undefined : dist < 0.002 ? 'danger' : dist < 0.005 ? 'warn' : 'ok'
          enriched = { ...enriched, riskLevel }
        }

        const prevRuntime = data.runtime
        const same =
          prevRuntime?.status === enriched.status &&
          prevRuntime?.filledPercent === enriched.filledPercent &&
          prevRuntime?.fillPrice === enriched.fillPrice &&
          prevRuntime?.note === enriched.note &&
          prevRuntime?.lastPnlPct === enriched.lastPnlPct &&
          prevRuntime?.riskLevel === enriched.riskLevel

        if (same) {
          return n
        }

        changed = true
        return { ...n, data: { ...(data as any), runtime: enriched } }
      })

      return changed ? next : nds
    })
  }, [activationLines, accountDispatch, accountState.paper, edges, indicators, priceHistory, setNodes, shapeTriggers, startupMode, symbol])

  const activationLinesWithDraft = useMemo(() => {
    if (!lineDraft) {
      return activationLines
    }
    return activationLines.concat({
      id: '__draft__',
      name: 'Draft',
      a: lineDraft.a,
      b: lineDraft.b,
      createdAt: Date.now(),
    })
  }, [activationLines, lineDraft])

  const circlesWithDraft = useMemo(() => {
    if (!circleDraft) {
      return circles
    }
    return circles.concat({
      id: '__draft_circle__',
      name: 'Draft',
      center: circleDraft.center,
      edge: circleDraft.edge,
      createdAt: Date.now(),
      locked: true,
    })
  }, [circleDraft, circles])

  const rectanglesWithDraft = useMemo(() => {
    if (!rectangleDraft) {
      return rectangles
    }
    return rectangles.concat({
      id: '__draft_rect__',
      name: 'Draft',
      a: rectangleDraft.a,
      b: rectangleDraft.b,
      createdAt: Date.now(),
      locked: true,
    })
  }, [rectangleDraft, rectangles])

  const parallelLinesWithDraft = useMemo(() => {
    if (!parallelDraft) {
      return parallelLines
    }
    return parallelLines.concat({
      id: '__draft_parallel__',
      name: 'Draft',
      a: parallelDraft.a,
      b: parallelDraft.b,
      offset: parallelOffsetDraft ?? parallelDraft.a,
      createdAt: Date.now(),
      locked: true,
    })
  }, [parallelDraft, parallelLines, parallelOffsetDraft])

  const onSaveSet = useCallback(() => {
    const name = (setNameDraft ?? '').trim()
    if (!name) {
      return
    }

    const selected = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null
    const rootCandidate = selected && isRootNodeType(selected.type ?? '') ? selected : nodes.find((n) => isRootNodeType(n.type ?? '')) ?? null
    if (!rootCandidate) {
      return
    }

    const rootType = (rootCandidate.type ?? null) as StrategyNodeType | null
    if (!rootType) {
      return
    }

    const rootData = (rootCandidate.data as OrderNodeData | undefined) ?? ({} as OrderNodeData)
    const rootRefPrice = rootType === 'market'
      ? (typeof lastPrice === 'number' && Number.isFinite(lastPrice) && lastPrice > 0 ? lastPrice : null)
      : (typeof rootData.anchorPrice === 'number' && Number.isFinite(rootData.anchorPrice) && rootData.anchorPrice > 0
        ? rootData.anchorPrice
        : (typeof rootData.limitPrice === 'number' && Number.isFinite(rootData.limitPrice) && rootData.limitPrice > 0 ? rootData.limitPrice : null))

    if (!rootRefPrice) {
      return
    }

    const byId = new Map(nodes.map((n) => [n.id, n]))
    const out = new Map<string, string[]>()
    for (const e of edges) {
      if (!e.source || !e.target) continue
      const src = String(e.source)
      const tgt = String(e.target)
      const arr = out.get(src)
      if (arr) arr.push(tgt)
      else out.set(src, [tgt])
    }

    const ordered: Node[] = []
    const seen = new Set<string>()
    const q: string[] = [rootCandidate.id]
    while (q.length) {
      const id = q.shift() as string
      if (seen.has(id)) continue
      const n = byId.get(id)
      if (!n) continue
      seen.add(id)
      ordered.push(n)
      const nxt = out.get(id) ?? []
      for (const child of nxt) {
        if (!seen.has(child)) q.push(child)
      }
    }

    if (ordered.length === 0) {
      return
    }

    const rootPos = ordered[0].position
    const idToIndex = new Map<string, number>()
    ordered.forEach((n, idx) => idToIndex.set(n.id, idx))

    const setNodes: StrategySetV1['nodes'] = ordered.map((n) => {
      const t = (n.type ?? null) as StrategyNodeType | null
      const data = (n.data as OrderNodeData | undefined) ?? ({} as OrderNodeData)
      const {
        runtime,
        anchorPrice,
        anchorTimestamp,
        trailRefPrice,
        triggered,
        limitPrice,
        stopPrice,
        triggerPrice,
        trailingOffset,
        limitOffset,
        ...rest
      } = data as any

      const pctFromPrice = (p: number | undefined) => {
        if (!(typeof p === 'number' && Number.isFinite(p) && rootRefPrice > 0)) return undefined
        return ((p - rootRefPrice) * 100) / rootRefPrice
      }
      const pctFromDelta = (d: number | undefined) => {
        if (!(typeof d === 'number' && Number.isFinite(d) && rootRefPrice > 0)) return undefined
        return (d * 100) / rootRefPrice
      }

      return {
        type: t ?? 'market',
        dx: (n.position?.x ?? 0) - (rootPos?.x ?? 0),
        data: rest as any,
        limitPricePct: pctFromPrice(limitPrice),
        stopPricePct: pctFromPrice(stopPrice),
        triggerPricePct: pctFromPrice(triggerPrice),
        trailingOffsetPct: pctFromDelta(trailingOffset),
        limitOffsetPct: pctFromDelta(limitOffset),
      }
    })

    const setEdges: StrategySetV1['edges'] = edges
      .flatMap((e) => {
        const si = idToIndex.get(String(e.source))
        const ti = idToIndex.get(String(e.target))
        if (typeof si !== 'number' || typeof ti !== 'number') return []
        return [{ source: si, target: ti }]
      })

    saveStrategySet({
      version: 1,
      name,
      createdAt: Date.now(),
      rootType,
      nodes: setNodes,
      edges: setEdges,
    })

    setSetNameDraft('')
    setSelectedSetName(name)
    setSetListVersion((v) => v + 1)
  }, [edges, lastPrice, nodes, selectedNodeId, setNameDraft])

  const onLoadSet = useCallback(() => {
    const name = (selectedSetName ?? '').trim()
    if (!name) {
      return
    }

    const set = loadStrategySet(name)
    if (!set) {
      return
    }

    const rootRefPrice = typeof lastPrice === 'number' && Number.isFinite(lastPrice) && lastPrice > 0 ? lastPrice : null
    if (!rootRefPrice) {
      return
    }

    const now = timeCenter
    const rootX = timestampToX(now, now, timeWindowMs, chartDims) - 20
    const rootY = priceToY(rootRefPrice, domain, chartDims) - 35

    const newIds: string[] = []
    const newNodes: Node[] = []

    for (const sn of set.nodes) {
      const id = getId()
      newIds.push(id)

      const baseData = { ...(sn.data as any) } as OrderNodeData
      let posX = rootX + (sn.dx ?? 0)
      let posY = rootY

      const pctToPrice = (pct: number | undefined) => {
        if (!(typeof pct === 'number' && Number.isFinite(pct))) return null
        return rootRefPrice * (1 + pct / 100)
      }

      if (sn.type !== 'market') {
        const p = pctToPrice(sn.stopPricePct) ?? pctToPrice(sn.triggerPricePct) ?? pctToPrice(sn.limitPricePct)
        if (p != null) {
          posY = priceToY(p, domain, chartDims) - 20
        }
      }

      if (sn.type === 'limit' || sn.type === 'iceberg') {
        const p = pctToPrice(sn.limitPricePct)
        if (p != null) {
          ; (baseData as any).limitPrice = p
        }
      }

      if (sn.type === 'stop_loss' || sn.type === 'stop_loss_limit') {
        const p = pctToPrice(sn.stopPricePct)
        if (p != null) {
          ; (baseData as any).stopPrice = p
        }
        if (sn.type === 'stop_loss_limit') {
          const p2 = pctToPrice(sn.limitPricePct)
          if (p2 != null) {
            ; (baseData as any).limitPrice = p2
          }
        }
      }

      if (sn.type === 'take_profit' || sn.type === 'take_profit_limit') {
        const p = pctToPrice(sn.triggerPricePct)
        if (p != null) {
          ; (baseData as any).triggerPrice = p
        }
        if (sn.type === 'take_profit_limit') {
          const p2 = pctToPrice(sn.limitPricePct)
          if (p2 != null) {
            ; (baseData as any).limitPrice = p2
          }
        }
      }

      if (sn.type === 'trailing_stop' || sn.type === 'trailing_stop_limit') {
        const raw = typeof sn.trailingOffsetPct === 'number' && Number.isFinite(sn.trailingOffsetPct) ? (rootRefPrice * sn.trailingOffsetPct) / 100 : null
        if (raw != null) {
          const side = (baseData.side ?? 'sell') as any
          const stopPrice = side === 'buy' ? rootRefPrice + raw : rootRefPrice - raw
          posY = priceToY(stopPrice, domain, chartDims) - 20
            ; (baseData as any).trailingOffset = raw
        }
        if (sn.type === 'trailing_stop_limit') {
          const lim = typeof sn.limitOffsetPct === 'number' && Number.isFinite(sn.limitOffsetPct) ? (rootRefPrice * sn.limitOffsetPct) / 100 : null
          if (lim != null) {
            ; (baseData as any).limitOffset = lim
          }
        }
      }

      const nextNode: Node = {
        id,
        type: sn.type,
        position: { x: posX, y: posY },
        data: { ...baseData, active: true } as any,
      }

      newNodes.push(applyAnchors(nextNode))
    }

    const newEdges: Edge[] = set.edges.map((e) => {
      const source = newIds[e.source]
      const target = newIds[e.target]
      return {
        id: `edge_${source}_${target}_${Date.now()}`,
        source,
        target,
        type: 'default',
      }
    })

    setNodes((nds) => nds.concat(newNodes))
    setEdges((eds) => eds.concat(newEdges))

    dispatch({ type: 'select_node', nodeId: newIds[0] ?? null })
  }, [applyAnchors, chartDims, dispatch, domain, lastPrice, selectedSetName, setEdges, setNodes, timeCenter, timeWindowMs])

  const onDeleteSet = useCallback(() => {
    const name = (selectedSetName ?? '').trim()
    if (!name) {
      return
    }
    deleteStrategySet(name)
    setSelectedSetName('')
    setSetListVersion((v) => v + 1)
  }, [selectedSetName])

  const activateFlow = useCallback(
    (rootNodeId: string) => {
      if (startupMode !== 'virtual') {
        return
      }

      const paper = accountState.paper
      if (!paper) {
        return
      }

      if (!(typeof lastPrice === 'number' && Number.isFinite(lastPrice) && lastPrice > 0)) {
        return
      }

      const root = nodes.find((n) => n.id === rootNodeId)
      if (!root || !root.type) {
        return
      }
      if (!isRootNodeType(root.type)) {
        return
      }

      if (root.type !== 'market') {
        return
      }

      const rootData = (root.data as OrderNodeData | undefined) ?? ({} as OrderNodeData)
      if (rootData.active === false) {
        return
      }
      const qty = typeof rootData.quantity === 'number' && Number.isFinite(rootData.quantity) ? rootData.quantity : 0
      if (!(qty > 0)) {
        return
      }

      const now = Date.now()
      const side = rootData.side === 'sell' ? 'sell' : 'buy'

      const usd = typeof paper.balances?.USD === 'number' && Number.isFinite(paper.balances.USD) ? paper.balances.USD : 0

      const marketFill = lastPrice
      const notionalUsd = qty * marketFill
      if (!(Number.isFinite(notionalUsd) && notionalUsd > 0)) {
        return
      }
      if (usd < notionalUsd) {
        return
      }

      const posId = `pos_${now}_${Math.random().toString(16).slice(2)}`
      const positionSide = side === 'buy' ? 'long' : 'short'

      const position = {
        id: posId,
        symbol,
        side: positionSide as 'long' | 'short',
        amount: qty,
        entryPrice: marketFill,
        openedAt: now,
        leverage: 1,
        marginUsedUsd: notionalUsd,
      }

      const ocoGroupId = `oco_${now}_${Math.random().toString(16).slice(2)}`

      const outgoing = new Map<string, string[]>()
      for (const e of edges) {
        const src = String(e.source)
        const tgt = String(e.target)
        const arr = outgoing.get(src)
        if (arr) arr.push(tgt)
        else outgoing.set(src, [tgt])
      }

      const reachable = new Set<string>()
      const q: string[] = [rootNodeId]
      while (q.length) {
        const id = q.shift() as string
        if (reachable.has(id)) continue
        reachable.add(id)
        const nxt = outgoing.get(id) ?? []
        for (const nId of nxt) {
          if (!reachable.has(nId)) q.push(nId)
        }
      }

      const exitSide = positionSide === 'short' ? 'buy' : 'sell'

      const mkExitOrder = (patch: any) => ({
        id: `ord_${now}_${Math.random().toString(16).slice(2)}`,
        symbol,
        side: exitSide,
        type: patch.type,
        price: patch.price ?? null,
        price2: patch.price2 ?? null,
        amount: 0,
        createdAt: now,
        status: 'open' as const,
        positionId: posId,
        closePercent: patch.closePercent ?? 100,
        trailingOffset: patch.trailingOffset ?? null,
        trailingOffsetUnit: patch.trailingOffsetUnit,
        trailRefPrice: patch.trailRefPrice ?? null,
        ocoGroupId,
      })

      const createdExitOrders: any[] = []
      for (const n of nodes) {
        if (!reachable.has(n.id)) continue
        if (!n.type) continue
        if (!isExitNodeType(n.type)) continue

        const data = (n.data as OrderNodeData | undefined) ?? ({} as OrderNodeData)
        const closePercent = typeof (data as any).closePercent === 'number' ? (data as any).closePercent : 100

        if (n.type === 'stop_loss' || n.type === 'stop_loss_limit') {
          const stopPrice = typeof (data as any).stopPrice === 'number' ? (data as any).stopPrice : null
          const limitPrice = typeof (data as any).limitPrice === 'number' ? (data as any).limitPrice : null
          createdExitOrders.push(
            mkExitOrder({
              type: n.type === 'stop_loss' ? 'stop-loss' : 'stop-loss-limit',
              price: stopPrice,
              price2: n.type === 'stop_loss_limit' ? limitPrice : null,
              closePercent,
            }),
          )
          continue
        }

        if (n.type === 'take_profit' || n.type === 'take_profit_limit') {
          const triggerPrice = typeof (data as any).triggerPrice === 'number' ? (data as any).triggerPrice : null
          const limitPrice = typeof (data as any).limitPrice === 'number' ? (data as any).limitPrice : null
          createdExitOrders.push(
            mkExitOrder({
              type: n.type === 'take_profit' ? 'take-profit' : 'take-profit-limit',
              price: triggerPrice,
              price2: n.type === 'take_profit_limit' ? limitPrice : null,
              closePercent,
            }),
          )
          continue
        }

        if (n.type === 'trailing_stop' || n.type === 'trailing_stop_limit') {
          const raw = typeof (data as any).trailingOffset === 'number' ? (data as any).trailingOffset : null
          const limitOffset = typeof (data as any).limitOffset === 'number' ? (data as any).limitOffset : null
          const stopLevel = raw != null ? (exitSide === 'sell' ? lastPrice - raw : lastPrice + raw) : null
          createdExitOrders.push(
            mkExitOrder({
              type: n.type === 'trailing_stop' ? 'trailing-stop' : 'trailing-stop-limit',
              price: stopLevel,
              price2: n.type === 'trailing_stop_limit' ? limitOffset : null,
              closePercent,
              trailingOffset: raw,
              trailingOffsetUnit: 'price',
              trailRefPrice: lastPrice,
            }),
          )
          continue
        }
      }

      const nextPaper = {
        ...paper,
        balances: { ...(paper.balances ?? {}), USD: usd - notionalUsd },
        openPositions: [...paper.openPositions, position as any],
        openOrders: [...paper.openOrders, ...createdExitOrders],
        updatedAt: now,
      }

      accountDispatch({ type: 'set_paper', paper: nextPaper as any })
      setSelectedPositionId(posId)

      setNodes((nds) =>
        nds.map((n) => {
          if (!reachable.has(n.id)) {
            return n
          }
          const d = (n.data as any) ?? {}
          if (d.active === false) {
            return n
          }
          return { ...n, data: { ...d, active: false } }
        }),
      )
    },
    [accountDispatch, accountState.paper, edges, lastPrice, nodes, startupMode, symbol],
  )

  useEffect(() => {
    const onActivate = (e: Event) => {
      const any = e as any
      const nodeId = any?.detail?.nodeId
      if (typeof nodeId !== 'string') {
        return
      }
      activateFlow(nodeId)
    }
    window.addEventListener('kf_activate_node', onActivate as any)
    return () => window.removeEventListener('kf_activate_node', onActivate as any)
  }, [activateFlow])

  const onPaneScroll = useCallback(
    (event?: any) => {
      if (!event) {
        return
      }
      setFollowNow(false)

      const host = chartHostRef.current
      if (!host) {
        return
      }

      const rect = host.getBoundingClientRect()
      const padL = chartDims.paddingLeft ?? chartDims.padding
      const padR = chartDims.paddingRight ?? chartDims.padding
      const usableW = Math.max(1, chartDims.width - padL - padR)
      const clientX = (event as any).clientX ?? (event as any).nativeEvent?.clientX ?? rect.left + padL
      const localX = clientX - rect.left
      const t = clamp((localX - padL) / usableW, 0, 1)

      const start = timeCenter - timeWindowMs / 2
      const anchorTs = start + t * timeWindowMs

      const deltaY = (event as any).deltaY ?? (event as any).nativeEvent?.deltaY ?? 0
      const factor = Math.exp(deltaY / 260)
      const nextZoom = clamp(timeZoom * factor, 0.08, 12)
      const newWindow = Math.max(TIME_WINDOW_MS, Math.round(baseTimeWindowMs * nextZoom))

      setTimeZoom(nextZoom)
      setTimeCenter(anchorTs + (0.5 - t) * newWindow)
    },
    [
      baseTimeWindowMs,
      chartDims.padding,
      chartDims.paddingLeft,
      chartDims.paddingRight,
      chartDims.width,
      timeCenter,
      timeWindowMs,
      timeZoom,
    ],
  )

  const onAxisPointerUp = useCallback((e: React.PointerEvent) => {
    axisDragRef.current = null
    try {
      ; (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }
  }, [])

  const onAttachTrailingStop = useCallback(
    (parentNodeId: string, variant: 'trailing_stop' | 'trailing_stop_limit') => {
      const def = getNodeDefinition(variant)

      const childId = getId()

      setNodes((nds) => {
        const parent = nds.find((n) => n.id === parentNodeId)
        if (!parent) {
          return nds
        }

        const nextNodes = nds.map((n) => {
          if (n.id !== parentNodeId) {
            return n
          }

          const existing = n.data as Record<string, unknown>
          const currentCount = typeof existing.childrenCount === 'number' ? existing.childrenCount : 0

          return {
            ...n,
            data: { ...existing, hasChildren: true, childrenCount: currentCount + 1 },
          }
        })

        const baseX = parent.position.x + 300
        const baseY = parent.position.y + 28

        const childNode: Node = {
          id: childId,
          type: variant,
          position: { x: baseX, y: baseY },
          data: { ...(def.defaultData as Record<string, unknown>), isChild: true } as OrderNodeData,
        }

        return nextNodes.concat(childNode)
      })

      setEdges((eds) =>
        eds.concat({
          id: `e_${parentNodeId}_${variant}_${Date.now()}`,
          source: parentNodeId,
          sourceHandle: `${parentNodeId}-source`,
          target: childId,
          targetHandle: `${childId}-target`,
          animated: true,
          label: 'child',
        }),
      )
    },
    [getNodeDefinition, setEdges, setNodes],
  )

  const HEADER_HEIGHT = 64

  const showAccountColumn = startupMode === 'virtual' && Boolean(accountState.paper)

  const ACCOUNT_COLUMN_KEY = 'krakenforge:ui:account-column:v1'
  const [accountColumnWidth, setAccountColumnWidth] = useState(() => {
    try {
      const raw = localStorage.getItem(ACCOUNT_COLUMN_KEY)
      if (!raw) return 360
      const parsed = JSON.parse(raw) as any
      const w = Number(parsed?.width)
      if (!Number.isFinite(w)) return 360
      return Math.max(260, Math.min(620, w))
    } catch {
      return 360
    }
  })

  const accountResizeRef = useRef<null | { startX: number; startW: number }>(null)
  const [isResizingAccountColumn, setIsResizingAccountColumn] = useState(false)

  useEffect(() => {
    if (!showAccountColumn) {
      return
    }
    try {
      localStorage.setItem(ACCOUNT_COLUMN_KEY, JSON.stringify({ width: accountColumnWidth }))
    } catch {
    }
  }, [accountColumnWidth, showAccountColumn])

  useEffect(() => {
    if (!isResizingAccountColumn) {
      return
    }

    const onMove = (e: PointerEvent) => {
      const st = accountResizeRef.current
      if (!st) {
        return
      }
      const next = st.startW + (e.clientX - st.startX)
      setAccountColumnWidth(Math.max(260, Math.min(620, next)))
    }

    const onUp = () => {
      setIsResizingAccountColumn(false)
      accountResizeRef.current = null
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [isResizingAccountColumn])

  useEffect(() => {
    if (!draggingLineEndpoint) {
      return
    }

    const onMove = (e: PointerEvent) => {
      const host = chartHostRef.current
      if (!host) {
        return
      }
      const rect = host.getBoundingClientRect()
      const localX = e.clientX - rect.left
      const localY = e.clientY - rect.top

      const ts = xToTimestamp(localX, timeCenter, timeWindowMs, chartDims)
      const p = snapPrice(yToPrice(localY, domain, chartDims))

      setActivationLines((ls) =>
        ls.map((l) => {
          if (l.id !== draggingLineEndpoint.id) {
            return l
          }
          if (l.locked) {
            return l
          }
          if (draggingLineEndpoint.endpoint === 'a') {
            return { ...l, a: { timestamp: ts, price: p } }
          }
          return { ...l, b: { timestamp: ts, price: p } }
        }),
      )
    }

    const onUp = () => {
      setDraggingLineEndpoint(null)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [chartDims, domain, draggingLineEndpoint, snapPrice, timeCenter, timeWindowMs])

  useEffect(() => {
    if (!draggingLine) {
      return
    }

    const onMove = (e: PointerEvent) => {
      const host = chartHostRef.current
      if (!host) {
        return
      }
      const rect = host.getBoundingClientRect()
      const localX = e.clientX - rect.left
      const localY = e.clientY - rect.top

      const ts = xToTimestamp(localX, timeCenter, timeWindowMs, chartDims)
      const p = snapPrice(yToPrice(localY, domain, chartDims))
      const dt = ts - draggingLine.startPointerTs
      const dp = p - draggingLine.startPointerPrice

      setActivationLines((ls) =>
        ls.map((l) => {
          if (l.id !== draggingLine.id) {
            return l
          }
          if (l.locked) {
            return l
          }
          return {
            ...l,
            a: { timestamp: draggingLine.startA.timestamp + dt, price: snapPrice(draggingLine.startA.price + dp) },
            b: { timestamp: draggingLine.startB.timestamp + dt, price: snapPrice(draggingLine.startB.price + dp) },
          }
        }),
      )
    }

    const onUp = () => {
      setDraggingLine(null)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [chartDims, domain, draggingLine, snapPrice, timeCenter, timeWindowMs])

  useEffect(() => {
    if (!draggingCircle) {
      return
    }

    const onMove = (e: PointerEvent) => {
      const host = chartHostRef.current
      if (!host) {
        return
      }
      const rect = host.getBoundingClientRect()
      const localX = e.clientX - rect.left
      const localY = e.clientY - rect.top
      const ts = xToTimestamp(localX, timeCenter, timeWindowMs, chartDims)
      const p = snapPrice(yToPrice(localY, domain, chartDims))

      if (draggingCircle.mode === 'edge') {
        setCircles((cs) => cs.map((c) => (c.id === draggingCircle.id ? { ...c, edge: { timestamp: ts, price: p } } : c)))
        return
      }

      const dt = ts - draggingCircle.startPointerTs
      const dp = p - draggingCircle.startPointerPrice
      setCircles((cs) =>
        cs.map((c) => {
          if (c.id !== draggingCircle.id) {
            return c
          }
          if (c.locked) {
            return c
          }
          return {
            ...c,
            center: { timestamp: draggingCircle.startCenter.timestamp + dt, price: snapPrice(draggingCircle.startCenter.price + dp) },
            edge: { timestamp: draggingCircle.startEdge.timestamp + dt, price: snapPrice(draggingCircle.startEdge.price + dp) },
          }
        }),
      )
    }

    const onUp = () => setDraggingCircle(null)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [chartDims, domain, draggingCircle, snapPrice, timeCenter, timeWindowMs])

  useEffect(() => {
    if (!draggingRectangle) {
      return
    }

    const onMove = (e: PointerEvent) => {
      const host = chartHostRef.current
      if (!host) {
        return
      }
      const rect = host.getBoundingClientRect()
      const localX = e.clientX - rect.left
      const localY = e.clientY - rect.top
      const ts = xToTimestamp(localX, timeCenter, timeWindowMs, chartDims)
      const p = snapPrice(yToPrice(localY, domain, chartDims))

      if (draggingRectangle.mode === 'a' || draggingRectangle.mode === 'b') {
        setRectangles((rs) =>
          rs.map((r) => {
            if (r.id !== draggingRectangle.id) {
              return r
            }
            if (r.locked) {
              return r
            }
            if (draggingRectangle.mode === 'a') {
              return { ...r, a: { timestamp: ts, price: p } }
            }
            return { ...r, b: { timestamp: ts, price: p } }
          }),
        )
        return
      }

      const dt = ts - draggingRectangle.startPointerTs
      const dp = p - draggingRectangle.startPointerPrice
      setRectangles((rs) =>
        rs.map((r) => {
          if (r.id !== draggingRectangle.id) {
            return r
          }
          if (r.locked) {
            return r
          }
          return {
            ...r,
            a: { timestamp: draggingRectangle.startA.timestamp + dt, price: snapPrice(draggingRectangle.startA.price + dp) },
            b: { timestamp: draggingRectangle.startB.timestamp + dt, price: snapPrice(draggingRectangle.startB.price + dp) },
          }
        }),
      )
    }

    const onUp = () => setDraggingRectangle(null)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [chartDims, domain, draggingRectangle, snapPrice, timeCenter, timeWindowMs])

  useEffect(() => {
    if (!draggingParallel) {
      return
    }

    const onMove = (e: PointerEvent) => {
      const host = chartHostRef.current
      if (!host) {
        return
      }
      const rect = host.getBoundingClientRect()
      const localX = e.clientX - rect.left
      const localY = e.clientY - rect.top
      const ts = xToTimestamp(localX, timeCenter, timeWindowMs, chartDims)
      const p = snapPrice(yToPrice(localY, domain, chartDims))

      setParallelLines((ps) =>
        ps.map((pl) => {
          if (pl.id !== draggingParallel.id) {
            return pl
          }
          if (pl.locked) {
            return pl
          }

          if (draggingParallel.mode === 'offset') {
            return { ...pl, offset: { timestamp: ts, price: p } }
          }
          if (draggingParallel.mode === 'b') {
            return { ...pl, b: { timestamp: ts, price: p } }
          }
          if (draggingParallel.mode === 'a') {
            const dtA = ts - draggingParallel.startA.timestamp
            const dpA = p - draggingParallel.startA.price
            return {
              ...pl,
              a: { timestamp: ts, price: p },
              offset: { timestamp: draggingParallel.startOffset.timestamp + dtA, price: snapPrice(draggingParallel.startOffset.price + dpA) },
            }
          }

          const dt = ts - draggingParallel.startPointerTs
          const dp = p - draggingParallel.startPointerPrice
          return {
            ...pl,
            a: { timestamp: draggingParallel.startA.timestamp + dt, price: snapPrice(draggingParallel.startA.price + dp) },
            b: { timestamp: draggingParallel.startB.timestamp + dt, price: snapPrice(draggingParallel.startB.price + dp) },
            offset: { timestamp: draggingParallel.startOffset.timestamp + dt, price: snapPrice(draggingParallel.startOffset.price + dp) },
          }
        }),
      )
    }

    const onUp = () => setDraggingParallel(null)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [chartDims, domain, draggingParallel, snapPrice, timeCenter, timeWindowMs])

  useEffect(() => {
    if (!selectedActivationLineId) {
      return
    }
    const exists = activationLines.some((l) => l.id === selectedActivationLineId)
    if (!exists) {
      setSelectedActivationLineId(null)
    }
  }, [activationLines, selectedActivationLineId])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        return
      }

      if (e.key === 'Escape') {
        setSelectedActivationLineId(null)
        setSelectedCircleId(null)
        setSelectedRectangleId(null)
        setSelectedParallelId(null)
        setContextMenu(null)
        return
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedActivationLineId) {
          const line = activationLines.find((l) => l.id === selectedActivationLineId)
          if (!line || line.locked) {
            return
          }
          e.preventDefault()
          setActivationLines((ls) => ls.filter((l) => l.id !== selectedActivationLineId))
          setShapeTriggers((ts) => ts.filter((t) => t.shapeId !== selectedActivationLineId))
          setSelectedActivationLineId(null)
          return
        }

        if (selectedCircleId) {
          const c = circles.find((x) => x.id === selectedCircleId)
          if (!c || c.locked) {
            return
          }
          e.preventDefault()
          setCircles((cs) => cs.filter((x) => x.id !== selectedCircleId))
          setShapeTriggers((ts) => ts.filter((t) => t.shapeId !== selectedCircleId))
          setSelectedCircleId(null)
          return
        }

        if (selectedRectangleId) {
          const r = rectangles.find((x) => x.id === selectedRectangleId)
          if (!r || r.locked) {
            return
          }
          e.preventDefault()
          setRectangles((rs) => rs.filter((x) => x.id !== selectedRectangleId))
          setShapeTriggers((ts) => ts.filter((t) => t.shapeId !== selectedRectangleId))
          setSelectedRectangleId(null)
          return
        }

        if (selectedParallelId) {
          const p = parallelLines.find((x) => x.id === selectedParallelId)
          if (!p || p.locked) {
            return
          }
          e.preventDefault()
          setParallelLines((ps) => ps.filter((x) => x.id !== selectedParallelId))
          setShapeTriggers((ts) => ts.filter((t) => t.shapeId !== selectedParallelId))
          setSelectedParallelId(null)
          return
        }

        if (selectedNodeId) {
          e.preventDefault()
          deleteNode(selectedNodeId)
          return
        }
      }

      if (e.key === 'Enter') {
        if (!selectedNodeId) return
        const n = nodes.find((x) => x.id === selectedNodeId)
        if (n?.type && isRootNodeType(n.type)) {
          e.preventDefault()
          activateFlow(n.id)
        }
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'l' || e.key === 'L')) {
        if (selectedActivationLineId) {
          e.preventDefault()
          setActivationLines((ls) => ls.map((l) => (l.id === selectedActivationLineId ? { ...l, locked: !l.locked } : l)))
          return
        }
        if (selectedCircleId) {
          e.preventDefault()
          setCircles((cs) => cs.map((c) => (c.id === selectedCircleId ? { ...c, locked: !c.locked } : c)))
          return
        }
        if (selectedRectangleId) {
          e.preventDefault()
          setRectangles((rs) => rs.map((r) => (r.id === selectedRectangleId ? { ...r, locked: !r.locked } : r)))
          return
        }
        if (selectedParallelId) {
          e.preventDefault()
          setParallelLines((ps) => ps.map((p) => (p.id === selectedParallelId ? { ...p, locked: !p.locked } : p)))
          return
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activationLines, activateFlow, circles, deleteNode, nodes, parallelLines, rectangles, selectedActivationLineId, selectedCircleId, selectedNodeId, selectedParallelId, selectedRectangleId])

  const selectedShape = useMemo(() => {
    if (selectedActivationLineId) return { type: 'line' as const, id: selectedActivationLineId }
    if (selectedRectangleId) return { type: 'rectangle' as const, id: selectedRectangleId }
    if (selectedCircleId) return { type: 'circle' as const, id: selectedCircleId }
    if (selectedParallelId) return { type: 'parallel' as const, id: selectedParallelId }
    return null
  }, [selectedActivationLineId, selectedCircleId, selectedParallelId, selectedRectangleId])

  const [showShapeTriggerTooltip, setShowShapeTriggerTooltip] = useState(false)
  // Tooltip is now shown only by clicking the trigger badge, not auto on selection

  const triggersForSelectedShape = useMemo(() => {
    if (!selectedShape) return []
    return shapeTriggers.filter((t) => t.shapeId === selectedShape.id && t.shapeType === selectedShape.type)
  }, [selectedShape, shapeTriggers])

  const [actionEditor, setActionEditor] = useState<null | { triggerId: string; actionId: string }>(null)

  const activeActionEditor = useMemo(() => {
    if (!actionEditor) {
      return null
    }
    const t = shapeTriggers.find((x) => x.id === actionEditor.triggerId)
    if (!t) {
      return null
    }
    const a = findTriggerAction(t.actions, actionEditor.actionId)
    if (!a) {
      return null
    }
    return { triggerId: t.id, actionId: a.id, actionType: a.type as TriggerActionType, config: a.config as ActionConfig }
  }, [actionEditor, shapeTriggers])

  const shapeTriggerTooltip = useMemo(() => {
    if (!selectedShape || !showShapeTriggerTooltip) {
      return null
    }
    if (typeof lastPrice !== 'number' || !Number.isFinite(lastPrice)) {
      return null
    }

    const currentTs = priceHistory[0]?.timestamp ?? Date.now()
    const thresholdPrice = Math.max(1e-9, (domain.max - domain.min) * 0.001)

    const existing = new Set(triggersForSelectedShape.map((t) => t.condition))

    let bounds: { x: number; y: number; width: number; height: number } | null = null
    let conditions: Array<{ condition: TriggerCondition; label: string; disabled?: boolean }> = []

    if (selectedShape.type === 'line') {
      const l = activationLines.find((x) => x.id === selectedShape.id)
      if (!l) return null
      bounds = computeLineBoundsPx(l, timeCenter, timeWindowMs, chartDims, domain)
      const state = getLinePriceState(l, lastPrice, currentTs, thresholdPrice)
      const crossUpDisabled = state.state === 'above'
      const crossDownDisabled = state.state === 'below'
      conditions = [
        { condition: 'cross_up', label: 'Cross Up', disabled: crossUpDisabled || existing.has('cross_up') },
        { condition: 'cross_down', label: 'Cross Down', disabled: crossDownDisabled || existing.has('cross_down') },
        { condition: 'touch', label: 'Touch', disabled: existing.has('touch') },
      ]
    }

    if (selectedShape.type === 'rectangle') {
      const r = rectangles.find((x) => x.id === selectedShape.id)
      if (!r) return null
      bounds = computeRectangleBoundsPx(r, timeCenter, timeWindowMs, chartDims, domain)
      const state = getRectanglePriceState(r, lastPrice, currentTs)
      const inside = state.state === 'inside'
      conditions = inside
        ? [
          { condition: 'exit_top', label: 'Exit Top', disabled: existing.has('exit_top') },
          { condition: 'exit_bottom', label: 'Exit Bottom', disabled: existing.has('exit_bottom') },
          { condition: 'exit_left', label: 'Exit Left (time)', disabled: existing.has('exit_left') },
          { condition: 'exit_right', label: 'Exit Right (time)', disabled: existing.has('exit_right') },
          { condition: 'exit_any', label: 'Exit Any Edge', disabled: existing.has('exit_any') },
        ]
        : [
          { condition: 'enter_top', label: 'Enter Top', disabled: existing.has('enter_top') },
          { condition: 'enter_bottom', label: 'Enter Bottom', disabled: existing.has('enter_bottom') },
          { condition: 'enter_left', label: 'Enter Left (time)', disabled: existing.has('enter_left') },
          { condition: 'enter_right', label: 'Enter Right (time)', disabled: existing.has('enter_right') },
          { condition: 'enter_any', label: 'Enter Any Edge', disabled: existing.has('enter_any') },
        ]
    }

    if (selectedShape.type === 'circle') {
      const c = circles.find((x) => x.id === selectedShape.id)
      if (!c) return null
      bounds = computeCircleBoundsPx(c, timeCenter, timeWindowMs, chartDims, domain)
      const state = getCirclePriceState(c, lastPrice, currentTs)
      const inside = state.state === 'inside'
      conditions = [
        { condition: 'exit', label: 'Exit', disabled: !inside || existing.has('exit') },
        { condition: 'enter', label: 'Enter', disabled: inside || existing.has('enter') },
        { condition: 'touch_edge', label: 'Touch Edge', disabled: existing.has('touch_edge') },
      ]
    }

    if (selectedShape.type === 'parallel') {
      const p = parallelLines.find((x) => x.id === selectedShape.id)
      if (!p) return null
      bounds = computeParallelBoundsPx(p, timeCenter, timeWindowMs, chartDims, domain)
      const state = getParallelPriceState(p, lastPrice, currentTs, thresholdPrice)
      const inChannel = state.state === 'in_channel'
      conditions = inChannel
        ? [
          { condition: 'break_upper', label: 'Break Upper', disabled: existing.has('break_upper') },
          { condition: 'break_lower', label: 'Break Lower', disabled: existing.has('break_lower') },
          { condition: 'exit_any', label: 'Exit Any', disabled: existing.has('exit_any') },
        ]
        : [
          { condition: 'enter_channel', label: 'Enter Channel', disabled: existing.has('enter_channel') },
        ]
    }

    if (!bounds) {
      return null
    }

    const tooltipW = 240
    const pad = 10
    const preferRight = bounds.x + bounds.width + pad + tooltipW <= chartDims.width
    const x = preferRight ? bounds.x + bounds.width + pad : Math.max(pad, bounds.x - tooltipW - pad)
    const y = Math.max(pad, Math.min(chartDims.height - pad - 220, bounds.y + bounds.height / 2 - 70))

    return {
      x,
      y,
      title: 'Shape Trigger',
      conditions,
    }
  }, [activationLines, chartDims, circles, domain, lastPrice, parallelLines, priceHistory, rectangles, selectedShape, showShapeTriggerTooltip, timeCenter, timeWindowMs, triggersForSelectedShape])

  const onAddShapeTrigger = useCallback(
    (condition: TriggerCondition) => {
      if (!selectedShape) {
        return
      }
      const exists = shapeTriggers.some((t) => t.shapeId === selectedShape.id && t.shapeType === selectedShape.type && t.condition === condition)
      if (exists) {
        setShowShapeTriggerTooltip(false)
        return
      }
      const now = Date.now()
      setShapeTriggers((ts) => [
        ...ts,
        {
          id: `trigger_${now}`,
          shapeId: selectedShape.id,
          shapeType: selectedShape.type,
          condition,
          actions: [],
          isActive: true,
          createdAt: now,
        },
      ])
      setShowShapeTriggerTooltip(false)
    },
    [selectedShape, shapeTriggers],
  )

  const onToggleShapeTrigger = useCallback((triggerId: string) => {
    setShapeTriggers((ts) => ts.map((t) => (t.id === triggerId ? { ...t, isActive: !t.isActive } : t)))
  }, [])

  const onRemoveShapeTrigger = useCallback((triggerId: string) => {
    setShapeTriggers((ts) => ts.filter((t) => t.id !== triggerId))
  }, [])

  const mapDroppedBlockToActionType = useCallback((blockType: string, side: string | null): TriggerActionType | null => {
    if (blockType === 'market') {
      return side === 'sell' ? 'market_sell' : 'market_buy'
    }
    if (blockType === 'limit') {
      return side === 'sell' ? 'limit_sell' : 'limit_buy'
    }
    if (blockType === 'stop_loss') return 'stop_loss'
    if (blockType === 'stop_loss_limit') return 'stop_loss_limit'
    if (blockType === 'take_profit') return 'take_profit'
    if (blockType === 'take_profit_limit') return 'take_profit_limit'
    if (blockType === 'trailing_stop') return 'trailing_stop'
    if (blockType === 'trailing_stop_limit') return 'trailing_stop_limit'
    return null
  }, [])

  const defaultConfigForAction = useCallback(
    (type: TriggerActionType, side: string | null): ActionConfig => {
      const base: ActionConfig = { side: side === 'sell' ? 'sell' : side === 'buy' ? 'buy' : undefined }
      if (type === 'trailing_stop' || type === 'trailing_stop_limit') {
        const nextSide = base.side === 'buy' ? 'buy' : 'sell'
        return { ...base, side: nextSide, closePercent: 100, trailingOffsetUnit: 'percent', trailingOffset: 1 }
      }

      const mid = (domain.min + domain.max) / 2
      const anchorPrice =
        typeof lastPrice === 'number' && Number.isFinite(lastPrice) && lastPrice >= domain.min && lastPrice <= domain.max
          ? lastPrice
          : typeof mid === 'number' && Number.isFinite(mid)
            ? mid
            : typeof lastPrice === 'number' && Number.isFinite(lastPrice)
              ? lastPrice
              : 1

      if (typeof anchorPrice === 'number' && Number.isFinite(anchorPrice)) {
        if (type === 'take_profit' || type === 'take_profit_limit') {
          const mult = base.side === 'buy' ? 0.99 : 1.01
          return { ...base, triggerPrice: anchorPrice * mult }
        }
        if (type === 'stop_loss' || type === 'stop_loss_limit') {
          const mult = base.side === 'buy' ? 1.01 : 0.99
          return { ...base, stopPrice: anchorPrice * mult }
        }
        if (type === 'limit_buy') {
          return { ...base, limitPrice: anchorPrice * 0.995 }
        }
        if (type === 'limit_sell') {
          return { ...base, limitPrice: anchorPrice * 1.005 }
        }
      }
      return base
    },
    [domain.max, domain.min, lastPrice],
  )

  const onDropActionOnTrigger = useCallback(
    (triggerId: string, blockType: string, side: string | null) => {
      const now = Date.now()

      const type = mapDroppedBlockToActionType(blockType, side)
      if (!type) {
        return
      }

      const actionId = `action_${now}_${Math.random().toString(16).slice(2)}`
      const config = defaultConfigForAction(type, side)

      setShapeTriggers((ts) =>
        ts.map((t) => {
          if (t.id !== triggerId) {
            return t
          }
          return {
            ...t,
            actions: [
              ...t.actions,
              {
                type,
                id: actionId,
                config,
              },
            ],
          }
        }),
      )

      setActionEditor({ triggerId, actionId })
    },
    [defaultConfigForAction, mapDroppedBlockToActionType],
  )

  const onDropChildActionOnTrigger = useCallback(
    (triggerId: string, parentActionId: string, blockType: string, side: string | null) => {
      const now = Date.now()
      const type = mapDroppedBlockToActionType(blockType, side)
      if (!type) {
        return
      }
      const actionId = `action_${now}_${Math.random().toString(16).slice(2)}`
      const config = defaultConfigForAction(type, side)

      const child: TriggerAction = {
        id: actionId,
        type,
        config,
      }

      setShapeTriggers((ts) =>
        ts.map((t) => {
          if (t.id !== triggerId) {
            return t
          }
          return { ...t, actions: addChildAction(t.actions, parentActionId, child) }
        }),
      )
    },
    [defaultConfigForAction, mapDroppedBlockToActionType],
  )

  const onOpenChildActionContextMenu = useCallback(
    (opts: { x: number; y: number; triggerId: string; actionId: string }) => {
      setContextMenu({
        x: opts.x,
        y: opts.y,
        items: [
          {
            id: 'delete_child_action',
            label: 'Delete action',
            icon: <IconTrash />,
            danger: true,
            onClick: () => {
              setShapeTriggers((ts) =>
                ts.map((t) => (t.id === opts.triggerId ? { ...t, actions: removeTriggerAction(t.actions, opts.actionId) } : t)),
              )
              setSelectedActionId((cur) => (cur === opts.actionId ? null : cur))
            },
          },
        ],
      })
    },
    [setShapeTriggers, setSelectedActionId],
  )

  const onEditTriggerAction = useCallback((triggerId: string, actionId: string) => {
    setActionEditor({ triggerId, actionId })
  }, [])

  return (
    <div style={{ height: '100vh', width: '100vw', position: 'relative', background: 'var(--kf-canvas)' }}>
      <SettingsPanel open={showSettings} mode={startupMode} onRequestClose={() => setShowSettings(false)} />
      {contextMenu ? (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} items={contextMenu.items} onClose={() => setContextMenu(null)} />
      ) : null}

      <TriggerActionConfigModal
        open={Boolean(activeActionEditor)}
        actionType={activeActionEditor?.actionType ?? null}
        config={activeActionEditor?.config ?? null}
        onClose={() => setActionEditor(null)}
        onSave={(next) => {
          const ed = activeActionEditor
          if (!ed) {
            return
          }
          setShapeTriggers((ts) =>
            ts.map((t) => (t.id === ed.triggerId ? { ...t, actions: updateTriggerActionConfig(t.actions, ed.actionId, next) } : t)),
          )
          setActionEditor(null)
        }}
      />
      {showMarketMenu && marketMenuPos ? (
        <div
          ref={marketMenuRef}
          style={{
            position: 'fixed',
            left: marketMenuPos.left,
            top: marketMenuPos.top,
            width: marketMenuPos.width,
            zIndex: 1000,
            borderRadius: 12,
            border: '1px solid var(--kf-border-1)',
            background: 'rgba(var(--kf-deep-rgb), 0.55)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            boxShadow: '0 18px 50px rgba(var(--kf-deep-rgb), 0.75)',
            overflow: 'hidden',
          }}
          role="listbox"
          aria-label="Market selection"
        >
          {topMarkets.map((m) => {
            const active = (symbolDraft.trim() || symbol) === m
            return (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setSymbolDraft(m)
                  dispatch({ type: 'set_symbol', symbol: m })
                  setShowMarketMenu(false)
                }}
                style={{
                  width: '100%',
                  height: 34,
                  padding: '0 10px',
                  borderRadius: 0,
                  border: 'none',
                  background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
                  color: 'var(--kf-text)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontWeight: active ? 800 : 650,
                  fontSize: 12,
                }}
                onMouseEnter={(e) => {
                  if (active) return
                    ; (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')
                }}
                onMouseLeave={(e) => {
                  ; (e.currentTarget.style.background = active ? 'rgba(255,255,255,0.06)' : 'transparent')
                }}
                aria-selected={active}
              >
                {m}
              </button>
            )
          })}
        </div>
      ) : null}

      <div
        data-topbar="1"
        className="kf-topbar"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: HEADER_HEIGHT,
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 12px',
          borderBottom: '1px solid var(--kf-border-1)',
          background: 'var(--kf-surface-1)',
          color: 'var(--kf-text)',
          overflow: 'hidden',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div
          ref={topbarScrollRef}
          onScroll={() => {
            if (showMarketMenu) {
              updateMarketMenuPos()
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flex: 1,
            minWidth: 0,
            overflowX: 'hidden',
            paddingRight: 12,
          }}
        >
          <CanvasToolbar
            symbol={symbol}
            symbolDraft={symbolDraft}
            setSymbolDraft={setSymbolDraft}
            onSymbolChange={(s) => dispatch({ type: 'set_symbol', symbol: s })}
            wsStatus={wsStatus}
            showMarketMenu={showMarketMenu}
            setShowMarketMenu={setShowMarketMenu}
            updateMarketMenuPos={updateMarketMenuPos}
            marketInputRef={marketInputRef}
            marketInputWrapRef={marketInputWrapRef}
            chartTimeframe={chartTimeframe}
            setChartTimeframe={setChartTimeframe}
            chartMode={chartMode}
            setChartMode={setChartMode}
            followNow={followNow}
            onNowClick={() => {
              setFollowNow(true)
              setTimeCenter(Date.now())
              if (typeof lastPrice === 'number' && Number.isFinite(lastPrice)) {
                const mid = (autoDomain.min + autoDomain.max) / 2
                if (Number.isFinite(mid)) {
                  setPricePan(lastPrice - mid)
                }
              }
            }}
            snapPrices={snapPrices}
            setSnapPrices={setSnapPrices}
            magnetEnabled={magnetEnabled}
            setMagnetEnabled={setMagnetEnabled}
            magnetStrength={magnetStrength}
            setMagnetStrength={setMagnetStrength}
            onOpenSettings={() => setShowSettings(true)}
            drawLineMode={drawLineMode}
            toggleLineMode={() => {
              setLineDraft(null)
              setCircleDraft(null)
              setRectangleDraft(null)
              setParallelDraft(null)
              setParallelOffsetDraft(null)
              setDrawCircleMode(false)
              setDrawRectangleMode(false)
              setDrawParallelMode(false)
              setDrawLineMode((v) => !v)
            }}
            drawParallelMode={drawParallelMode}
            toggleParallelMode={() => {
              setLineDraft(null)
              setCircleDraft(null)
              setRectangleDraft(null)
              setParallelOffsetDraft(null)
              setDrawLineMode(false)
              setDrawCircleMode(false)
              setDrawRectangleMode(false)
              setDrawParallelMode((v) => !v)
              setParallelDraft(null)
            }}
            drawCircleMode={drawCircleMode}
            toggleCircleMode={() => {
              setLineDraft(null)
              setRectangleDraft(null)
              setParallelDraft(null)
              setParallelOffsetDraft(null)
              setDrawLineMode(false)
              setDrawRectangleMode(false)
              setDrawParallelMode(false)
              setDrawCircleMode((v) => !v)
              setCircleDraft(null)
            }}
            drawRectangleMode={drawRectangleMode}
            toggleRectangleMode={() => {
              setLineDraft(null)
              setCircleDraft(null)
              setParallelDraft(null)
              setParallelOffsetDraft(null)
              setDrawLineMode(false)
              setDrawCircleMode(false)
              setDrawParallelMode(false)
              setDrawRectangleMode((v) => !v)
              setRectangleDraft(null)
            }}
            canClear={activationLines.length + circles.length + rectangles.length + parallelLines.length > 0}
            onClearAnnotations={() => {
              if (activationLines.length + circles.length + rectangles.length + parallelLines.length === 0) {
                return
              }
              const ok = window.confirm('Delete all annotations? This cannot be undone.')
              if (!ok) {
                return
              }
              setActivationLines([])
              setSelectedActivationLineId(null)
              setCircles([])
              setRectangles([])
              setParallelLines([])
              setShapeTriggers([])
              setSelectedCircleId(null)
              setSelectedRectangleId(null)
              setSelectedParallelId(null)
            }}
          />
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          top: HEADER_HEIGHT,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          background: 'var(--kf-canvas)',
        }}
      >
        {showAccountColumn ? (
          <>
            <div
              style={{
                width: accountColumnWidth,
                flex: '0 0 auto',
                borderRight: '1px solid var(--kf-border-1)',
                background: 'var(--kf-surface-2)',
                overflow: 'hidden',
              }}
            >
              <AccountSidebar
                triggers={shapeTriggers}
                onSelectTrigger={(t) => {

                  setFollowNow(false)
                  setSelectedActivationLineId(null)
                  setSelectedRectangleId(null)
                  setSelectedCircleId(null)
                  setSelectedParallelId(null)

                  if (t.shapeType === 'line') setSelectedActivationLineId(t.shapeId)
                  else if (t.shapeType === 'rectangle') setSelectedRectangleId(t.shapeId)
                  else if (t.shapeType === 'circle') setSelectedCircleId(t.shapeId)
                  else if (t.shapeType === 'parallel') setSelectedParallelId(t.shapeId)

                  // Center view by updating time/price axes
                  let targetTs: number | null = null
                  let targetPrice: number | null = null

                  const l = activationLines.find(x => x.id === t.shapeId)
                  if (l) {
                    targetTs = (l.a.timestamp + l.b.timestamp) / 2
                    targetPrice = (l.a.price + l.b.price) / 2
                  }

                  const r = rectanglesRef.current.find(x => x.id === t.shapeId)
                  if (r) {
                    targetTs = (r.a.timestamp + r.b.timestamp) / 2
                    targetPrice = (r.a.price + r.b.price) / 2
                  }

                  const c = circlesRef.current.find(x => x.id === t.shapeId)
                  if (c) {
                    targetTs = c.center.timestamp
                    targetPrice = c.center.price
                  }

                  const p = parallelLinesRef.current.find(x => x.id === t.shapeId)
                  if (p) {
                    targetTs = (p.a.timestamp + p.b.timestamp) / 2
                    targetPrice = (p.a.price + p.b.price) / 2
                  }

                  if (targetTs !== null && targetPrice !== null) {
                    setTimeCenter(targetTs)

                    const mid = (autoDomain.min + autoDomain.max) / 2
                    if (Number.isFinite(mid)) {
                      setPricePan(targetPrice - mid)
                    }
                  }
                }}
                onDeleteTrigger={(t) => {
                  setShapeTriggers(prev => prev.filter(x => x.id !== t.id))
                }}
                setNameDraft={setNameDraft}
                setSetNameDraft={setSetNameDraft}
                onSaveSet={onSaveSet}
                selectedSetName={selectedSetName}
                setSelectedSetName={setSelectedSetName}
                sets={sets}
                onLoadSet={onLoadSet}
                onDeleteSet={onDeleteSet}
              />
            </div>

            <div
              onPointerDown={(e: ReactPointerEvent) => {
                e.preventDefault()
                accountResizeRef.current = { startX: e.clientX, startW: accountColumnWidth }
                setIsResizingAccountColumn(true)
              }}
              style={{
                width: 8,
                flex: '0 0 auto',
                cursor: 'col-resize',
                background: 'transparent',
              }}
            />
          </>
        ) : null}

        <div style={{ flex: '1 1 auto', display: 'flex', minWidth: 0 }}>
          <div style={{ flex: '1 1 auto', position: 'relative', minWidth: 0 }}>
            <div
              ref={chartHostRef}
              className="strategy-canvas-host"
              data-panning={isPanning ? '1' : '0'}
              data-placement={placementMode ? '1' : '0'}
              data-handle-hover={hoveredLineHandle || hoveredLineBody ? '1' : '0'}
              data-handle-dragging={draggingLineEndpoint || draggingCircle || draggingRectangle || draggingParallel ? '1' : '0'}
              onMouseLeave={() => setHoverPos(null)}
              onContextMenu={(e) => {
                e.preventDefault()
                e.stopPropagation()

                // If a shape is selected, show the trigger tooltip instead of context menu
                if (selectedShape) {
                  setShowShapeTriggerTooltip(true)
                  return
                }

                const target = e.target as Element | null
                const el = target?.closest?.('[data-activation-line-id]')
                const lineId = el?.getAttribute('data-activation-line-id')
                const line = lineId ? activationLines.find((l) => l.id === lineId) : null

                const items: ContextMenuItem[] = []
                if (line && line.id !== '__draft__') {
                  setSelectedActivationLineId(line.id)
                  setSelectedCircleId(null)
                  setSelectedRectangleId(null)
                  setSelectedParallelId(null)
                  items.push({
                    id: 'lock',
                    label: line.locked ? 'Unlock line' : 'Lock line',
                    icon: line.locked ? <IconUnlock /> : <IconLock />,
                    onClick: () =>
                      setActivationLines((ls) => ls.map((l) => (l.id === line.id ? { ...l, locked: !l.locked } : l))),
                  })
                  items.push({
                    id: 'delete',
                    label: 'Delete line',
                    icon: <IconTrash />,
                    danger: true,
                    disabled: Boolean(line.locked),
                    onClick: () => {
                      if (line.locked) {
                        return
                      }
                      setActivationLines((ls) => ls.filter((l) => l.id !== line.id))
                      setShapeTriggers((ts) => ts.filter((t) => t.shapeId !== line.id))
                      setSelectedActivationLineId(null)
                    },
                  })
                  items.push({ id: 'sep1', label: '---', onClick: () => { } })
                }

                const annEl = (target as Element | null)?.closest?.('[data-annotation-kind]')
                const kind = annEl?.getAttribute('data-annotation-kind')
                const annId = annEl?.getAttribute('data-annotation-id')
                if (kind && annId) {
                  if (kind === 'circle') {
                    const c = circles.find((x) => x.id === annId)
                    if (c && c.id !== '__draft_circle__') {
                      setSelectedCircleId(c.id)
                      setSelectedActivationLineId(null)
                      setSelectedRectangleId(null)
                      setSelectedParallelId(null)
                      items.push({
                        id: 'lock_circle',
                        label: c.locked ? 'Unlock circle' : 'Lock circle',
                        icon: c.locked ? <IconUnlock /> : <IconLock />,
                        onClick: () => setCircles((cs) => cs.map((cc) => (cc.id === c.id ? { ...cc, locked: !cc.locked } : cc))),
                      })
                      items.push({
                        id: 'delete_circle',
                        label: 'Delete circle',
                        icon: <IconTrash />,
                        danger: true,
                        disabled: Boolean(c.locked),
                        onClick: () => {
                          if (c.locked) return
                          setCircles((cs) => cs.filter((cc) => cc.id !== c.id))
                          setShapeTriggers((ts) => ts.filter((t) => t.shapeId !== c.id))
                          setSelectedCircleId(null)
                        },
                      })
                      items.push({ id: 'sep_c', label: '---', onClick: () => { } })
                    }
                  }

                  if (kind === 'rect') {
                    const r = rectangles.find((x) => x.id === annId)
                    if (r && r.id !== '__draft_rect__') {
                      setSelectedRectangleId(r.id)
                      setSelectedActivationLineId(null)
                      setSelectedCircleId(null)
                      setSelectedParallelId(null)
                      items.push({
                        id: 'lock_rect',
                        label: r.locked ? 'Unlock rectangle' : 'Lock rectangle',
                        icon: r.locked ? <IconUnlock /> : <IconLock />,
                        onClick: () => setRectangles((rs) => rs.map((rr) => (rr.id === r.id ? { ...rr, locked: !rr.locked } : rr))),
                      })
                      items.push({
                        id: 'delete_rect',
                        label: 'Delete rectangle',
                        icon: <IconTrash />,
                        danger: true,
                        disabled: Boolean(r.locked),
                        onClick: () => {
                          if (r.locked) return
                          setRectangles((rs) => rs.filter((rr) => rr.id !== r.id))
                          setShapeTriggers((ts) => ts.filter((t) => t.shapeId !== r.id))
                          setSelectedRectangleId(null)
                        },
                      })
                      items.push({ id: 'sep_r', label: '---', onClick: () => { } })
                    }
                  }

                  if (kind === 'parallel') {
                    const p = parallelLines.find((x) => x.id === annId)
                    if (p && p.id !== '__draft_parallel__') {
                      setSelectedParallelId(p.id)
                      setSelectedActivationLineId(null)
                      setSelectedCircleId(null)
                      setSelectedRectangleId(null)
                      items.push({
                        id: 'lock_parallel',
                        label: p.locked ? 'Unlock parallel' : 'Lock parallel',
                        icon: p.locked ? <IconUnlock /> : <IconLock />,
                        onClick: () => setParallelLines((ps) => ps.map((pp) => (pp.id === p.id ? { ...pp, locked: !pp.locked } : pp))),
                      })
                      items.push({
                        id: 'delete_parallel',
                        label: 'Delete parallel',
                        icon: <IconTrash />,
                        danger: true,
                        disabled: Boolean(p.locked),
                        onClick: () => {
                          if (p.locked) return
                          setParallelLines((ps) => ps.filter((pp) => pp.id !== p.id))
                          setShapeTriggers((ts) => ts.filter((t) => t.shapeId !== p.id))
                          setSelectedParallelId(null)
                        },
                      })
                      items.push({ id: 'sep_p', label: '---', onClick: () => { } })
                    }
                  }
                }

                items.push({
                  id: 'delete_all',
                  label: 'Delete all annotations',
                  icon: <IconTrash />,
                  danger: true,
                  disabled: activationLines.length + circles.length + rectangles.length + parallelLines.length === 0,
                  onClick: () => {
                    const ok = window.confirm('Delete all annotations? This cannot be undone.')
                    if (!ok) {
                      return
                    }
                    setActivationLines([])
                    setCircles([])
                    setRectangles([])
                    setParallelLines([])
                    setShapeTriggers([])
                    setSelectedActivationLineId(null)
                    setSelectedCircleId(null)
                    setSelectedRectangleId(null)
                    setSelectedParallelId(null)
                  },
                })

                setContextMenu({ x: e.clientX, y: e.clientY, items })
              }}
              style={{ height: '100%', width: '100%', background: 'var(--kf-canvas)', position: 'relative' }}
            >
              <style>{`
                .strategy-canvas-host .react-flow__pane { cursor: crosshair; }
                .strategy-canvas-host[data-placement="1"] .react-flow__pane { cursor: crosshair; }
                .strategy-canvas-host[data-panning="1"] .react-flow__pane { cursor: grabbing; }
                .strategy-canvas-host[data-handle-hover="1"] .react-flow__pane { cursor: grab; }
                .strategy-canvas-host[data-handle-dragging="1"] .react-flow__pane { cursor: grabbing; }
              `}</style>

              {/* Strategy Builder Floating Dock */}
              <StrategyBuilderBar
                hasRootBlock={hasRootBlock}
                selectedActionType={((selectedPositionDockType ?? selectedTriggerPrimaryActionType ?? selectedDockNodeType) ?? null) as any}
                selectedShape={
                  selectedActivationLineId ? { type: 'line', id: selectedActivationLineId } :
                    selectedRectangleId ? { type: 'rectangle', id: selectedRectangleId } :
                      selectedCircleId ? { type: 'circle', id: selectedCircleId } :
                        selectedParallelId ? { type: 'parallel', id: selectedParallelId } :
                          null
                }
                onAddExitClick={() => setShowExitPicker(true)}
                onSelectCondition={(condition) => {
                  onAddShapeTrigger(condition as unknown as TriggerCondition)
                }}
                onClearSelection={() => {
                  setSelectedActivationLineId(null)
                  setSelectedCircleId(null)
                  setSelectedRectangleId(null)
                  setSelectedParallelId(null)
                }}
              />

              {shapeTriggerTooltip ? (
                <ShapeTriggerTooltip
                  x={shapeTriggerTooltip.x}
                  y={shapeTriggerTooltip.y}
                  title={shapeTriggerTooltip.title}
                  conditions={shapeTriggerTooltip.conditions}
                  triggers={triggersForSelectedShape}
                  isLocked={
                    selectedShape?.type === 'line' ? activationLines.find((l) => l.id === selectedShape.id)?.locked :
                      selectedShape?.type === 'circle' ? circles.find((c) => c.id === selectedShape.id)?.locked :
                        selectedShape?.type === 'rectangle' ? rectangles.find((r) => r.id === selectedShape.id)?.locked :
                          selectedShape?.type === 'parallel' ? parallelLines.find((p) => p.id === selectedShape.id)?.locked :
                            false
                  }
                  onSelectCondition={onAddShapeTrigger}
                  onToggleTrigger={onToggleShapeTrigger}
                  onRemoveTrigger={onRemoveShapeTrigger}
                  onLockShape={() => {
                    if (!selectedShape) return
                    if (selectedShape.type === 'line') {
                      setActivationLines((ls) => ls.map((l) => l.id === selectedShape.id ? { ...l, locked: !l.locked } : l))
                    } else if (selectedShape.type === 'circle') {
                      setCircles((cs) => cs.map((c) => c.id === selectedShape.id ? { ...c, locked: !c.locked } : c))
                    } else if (selectedShape.type === 'rectangle') {
                      setRectangles((rs) => rs.map((r) => r.id === selectedShape.id ? { ...r, locked: !r.locked } : r))
                    } else if (selectedShape.type === 'parallel') {
                      setParallelLines((ps) => ps.map((p) => p.id === selectedShape.id ? { ...p, locked: !p.locked } : p))
                    }
                  }}
                  onDeleteShape={() => {
                    if (!selectedShape) return
                    const isLocked =
                      selectedShape.type === 'line' ? activationLines.find((l) => l.id === selectedShape.id)?.locked :
                        selectedShape.type === 'circle' ? circles.find((c) => c.id === selectedShape.id)?.locked :
                          selectedShape.type === 'rectangle' ? rectangles.find((r) => r.id === selectedShape.id)?.locked :
                            selectedShape.type === 'parallel' ? parallelLines.find((p) => p.id === selectedShape.id)?.locked :
                              false
                    if (isLocked) return
                    if (selectedShape.type === 'line') {
                      setActivationLines((ls) => ls.filter((l) => l.id !== selectedShape.id))
                      setShapeTriggers((ts) => ts.filter((t) => t.shapeId !== selectedShape.id))
                      setSelectedActivationLineId(null)
                    } else if (selectedShape.type === 'circle') {
                      setCircles((cs) => cs.filter((c) => c.id !== selectedShape.id))
                      setShapeTriggers((ts) => ts.filter((t) => t.shapeId !== selectedShape.id))
                      setSelectedCircleId(null)
                    } else if (selectedShape.type === 'rectangle') {
                      setRectangles((rs) => rs.filter((r) => r.id !== selectedShape.id))
                      setShapeTriggers((ts) => ts.filter((t) => t.shapeId !== selectedShape.id))
                      setSelectedRectangleId(null)
                    } else if (selectedShape.type === 'parallel') {
                      setParallelLines((ps) => ps.filter((p) => p.id !== selectedShape.id))
                      setShapeTriggers((ts) => ts.filter((t) => t.shapeId !== selectedShape.id))
                      setSelectedParallelId(null)
                    }
                    setShowShapeTriggerTooltip(false)
                  }}
                  onDeleteAllAnnotations={() => {
                    const ok = window.confirm('Delete all annotations? This cannot be undone.')
                    if (!ok) return
                    setActivationLines([])
                    setCircles([])
                    setRectangles([])
                    setParallelLines([])
                    setShapeTriggers([])
                    setSelectedActivationLineId(null)
                    setSelectedCircleId(null)
                    setSelectedRectangleId(null)
                    setSelectedParallelId(null)
                    setShowShapeTriggerTooltip(false)
                  }}
                  onClose={() => setShowShapeTriggerTooltip(false)}
                />
              ) : null}

              {/* Exit Picker Popover */}
              <ExitPicker
                isOpen={showExitPicker}
                onClose={() => setShowExitPicker(false)}
                onSelectExit={(type: ExitBlockType) => {
                  // Auto-create the exit block and connect to first root block
                  const rootNode = nodes.find((n) => n.type === 'market' || n.type === 'limit')
                  if (!rootNode) {
                    setShowExitPicker(false)
                    return
                  }

                  const id = getId()
                  const def = getNodeDefinition(type)
                  const baseData = { ...(def.defaultData as Record<string, unknown>) }

                  const rootSide = (rootNode.data as Record<string, unknown>).side
                  const side = rootSide === 'buy' ? 'sell' : 'buy'

                  const data = {
                    ...baseData,
                    label: (baseData.label as string | undefined) ?? type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
                    side,
                    active: true,
                    skin: 'card',
                    isChild: true,
                  }

                  const newNode: Node = {
                    id,
                    type,
                    position: {
                      x: rootNode.position.x + 220,
                      y: rootNode.position.y + 120,
                    },
                    data,
                  }

                  setNodes((ns) => [...ns, applyAnchors(newNode)])

                  // Auto-connect to root
                  const newEdge: Edge = {
                    id: `edge_${rootNode.id}_${id}`,
                    source: rootNode.id,
                    target: id,
                    type: 'default',
                  }
                  setEdges((es) => [...es, newEdge])

                  setShowExitPicker(false)
                  dispatch({ type: 'select_node', nodeId: id })
                }}
              />

              <div
                data-axis-overlay="price"
                onPointerDown={onPriceAxisPointerDown}
                onPointerMove={onAxisPointerMove}
                onPointerUp={onAxisPointerUp}
                onWheel={onPriceAxisWheel}
                onDoubleClick={() => {
                  setPriceZoom(1)
                  setPricePan(0)
                }}
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  bottom: 44,
                  width: 54,
                  zIndex: 160,
                  cursor: 'ns-resize',
                }}
              />

              {placementPreview ? (
                <div style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, zIndex: 55, pointerEvents: 'none' }}>
                  <svg width={chartDims.width} height={chartDims.height}>
                    {(() => {
                      const padL = chartDims.paddingLeft ?? chartDims.padding
                      const padR = chartDims.paddingRight ?? chartDims.padding
                      const w = chartDims.width
                      const color = placementPreview.side === 'buy' ? '#22c55e' : '#ef4444'

                      return (
                        <g>
                          <line
                            x1={padL}
                            x2={w - padR}
                            y1={placementPreview.y}
                            y2={placementPreview.y}
                            stroke={color}
                            strokeOpacity={0.45}
                            strokeDasharray="6 6"
                            strokeWidth={2}
                          />
                          <rect
                            x={w - padR - 126}
                            y={placementPreview.y - 12}
                            width={122}
                            height={18}
                            rx={9}
                            fill={color}
                            fillOpacity={0.18}
                            stroke={color}
                            strokeOpacity={0.55}
                          />
                          <text x={w - padR - 65} y={placementPreview.y + 1} fill="#e5e7eb" fontSize={11} fontWeight={800} textAnchor="middle">
                            {placementPreview.side.toUpperCase()} @ {placementPreview.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </text>
                        </g>
                      )
                    })()}
                  </svg>
                </div>
              ) : null}

              <div
                data-axis-overlay="time"
                onPointerDown={onTimeAxisPointerDown}
                onPointerMove={onAxisPointerMove}
                onPointerUp={onAxisPointerUp}
                onWheel={onTimeAxisWheel}
                onDoubleClick={() => {
                  setFollowNow(true)
                  setTimeCenter(Date.now())
                  setTimeZoom(1)
                }}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 54,
                  bottom: 0,
                  height: 44,
                  zIndex: 160,
                  cursor: 'col-resize',
                }}
              />

              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChangeWithAnchors}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onPaneClick={onPaneClick}
                onPaneMouseMove={onPaneMouseMove}
                onPaneScroll={onPaneScroll}
                onNodeClick={onNodeClick}
                onNodeContextMenu={onNodeContextMenu}
                selectionOnDrag={false}
                onInit={(rf) => {
                  rfRef.current = rf
                  void rf.fitBounds({ x: 0, y: 0, width: chartDims.width, height: chartDims.height }, { padding: 0, duration: 0 })
                }}
                proOptions={{ hideAttribution: true }}
                minZoom={0.01}
                maxZoom={4}
                panOnDrag={false}
                panOnScroll={false}
                zoomOnScroll={false}
                zoomOnPinch={false}
                zoomOnDoubleClick={false}
              >
                <PriceChartLayer
                  timeframe={chartTimeframe}
                  mode={chartMode}
                  timeWindowMs={timeWindowMs}
                  timeCenter={timeCenter}
                  domain={domain}
                  dims={chartDims}
                  nodes={nodes}
                  edges={edges}
                  shapeTriggers={shapeTriggers}
                  selectedShapeId={selectedShape?.id ?? null}
                  selectedPositionId={selectedPositionId}
                  activationLines={activationLinesWithDraft}
                  circles={circlesWithDraft}
                  rectangles={rectanglesWithDraft}
                  parallelLines={parallelLinesWithDraft}
                  interactionDisabled={interactionDisabledRef.current}
                  selectedNodeId={selectedNodeId}
                  hoverPos={hoverPos}
                  isPanning={Boolean(paneDragRef.current)}
                  selectedActivationLineId={selectedActivationLineId}
                  selectedCircleId={selectedCircleId}
                  selectedRectangleId={selectedRectangleId}
                  selectedParallelId={selectedParallelId}
                  onSelectActivationLine={(id) => {
                    setSelectedActivationLineId(id)
                    setSelectedCircleId(null)
                    setSelectedRectangleId(null)
                    setSelectedParallelId(null)
                    setSelectedPositionId(null)
                    dispatch({ type: 'select_node', nodeId: null })
                  }}
                  onSelectCircle={(id) => {
                    setSelectedCircleId(id)
                    setSelectedActivationLineId(null)
                    setSelectedRectangleId(null)
                    setSelectedParallelId(null)
                    setSelectedPositionId(null)
                    dispatch({ type: 'select_node', nodeId: null })
                  }}
                  onSelectRectangle={(id) => {
                    setSelectedRectangleId(id)
                    setSelectedActivationLineId(null)
                    setSelectedCircleId(null)
                    setSelectedParallelId(null)
                    setSelectedPositionId(null)
                    dispatch({ type: 'select_node', nodeId: null })
                  }}
                  onSelectParallel={(id) => {
                    setSelectedParallelId(id)
                    setSelectedActivationLineId(null)
                    setSelectedCircleId(null)
                    setSelectedRectangleId(null)
                    setSelectedPositionId(null)
                    dispatch({ type: 'select_node', nodeId: null })
                  }}
                  onStartDragActivationLineEndpoint={(id: string, endpoint: 'a' | 'b') => {
                    setSelectedActivationLineId(id)
                    setDraggingLineEndpoint({ id, endpoint })
                  }}
                  onSelectPosition={(id) => {
                    setSelectedPositionId(id)
                    setSelectedActivationLineId(null)
                    setSelectedCircleId(null)
                    setSelectedRectangleId(null)
                    setSelectedParallelId(null)
                    setSelectedTriggerId(null)
                    setSelectedActionId(null)
                    dispatch({ type: 'select_node', nodeId: null })
                  }}
                  onDropPositionAction={onDropPositionAction}
                  onClosePosition={closePositionNow}
                  onDragPositionExitStart={onDragPositionExitStart}
                  openExitEditorOrderId={pendingExitEditorOrderId}
                  onConsumeExitEditorOrderId={() => setPendingExitEditorOrderId(null)}
                />
              </ReactFlow>

              {/* Render pills outside ReactFlow so drops aren't intercepted */}
              <TriggerPillManager
                activationLines={activationLines}
                circles={circles}
                rectangles={rectangles}
                parallelLines={parallelLines}
                triggers={shapeTriggers}
                isDragging={Boolean(draggingLineEndpoint || draggingCircle || draggingRectangle || draggingParallel)}
                selectedShapeId={selectedActivationLineId || selectedCircleId || selectedRectangleId || selectedParallelId}
                chartDims={chartDims}
                domain={domain}
                timeWindowMs={timeWindowMs}
                timeCenter={timeCenter}
                lastPrice={lastPrice}
                lastCandleTimestamp={priceHistory[priceHistory.length - 1]?.timestamp}
                selectedTriggerId={selectedTriggerId}
                onSelectTrigger={(id) => {
                  if (id !== selectedTriggerId) setSelectedActionId(null)
                  setSelectedTriggerId(id)
                }}
                selectedActionId={selectedActionId}
                onSelectAction={setSelectedActionId}
                onDragChildActionStart={onDragChildActionStart}
                onOpenChildActionContextMenu={onOpenChildActionContextMenu}
                onDropAction={onDropActionOnTrigger}
                onDropChildAction={onDropChildActionOnTrigger}
                onRemoveTrigger={onRemoveShapeTrigger}
                onToggleTrigger={onToggleShapeTrigger}
                onEditAction={onEditTriggerAction}
                onClickBadge={(shapeId) => {
                  const line = activationLines.find((l) => l.id === shapeId)
                  const circle = circles.find((c) => c.id === shapeId)
                  const rect = rectangles.find((r) => r.id === shapeId)
                  const parallel = parallelLines.find((p) => p.id === shapeId)

                  if (line) setSelectedActivationLineId(shapeId)
                  else if (circle) setSelectedCircleId(shapeId)
                  else if (rect) setSelectedRectangleId(shapeId)
                  else if (parallel) setSelectedParallelId(shapeId)
                }}
              />

              {/* Context-aware trigger option buttons on selected shape edges */}
              <ShapeTriggerOptionButtons
                selectedShape={selectedShape}
                activationLines={activationLines}
                circles={circles}
                rectangles={rectangles}
                parallelLines={parallelLines}
                allTriggers={shapeTriggers}
                lastPrice={lastPrice}
                chartDims={chartDims}
                domain={domain}
                timeWindowMs={timeWindowMs}
                timeCenter={timeCenter}
                onSelectCondition={onAddShapeTrigger}
                onSelectAction={(triggerId, actionId) => {
                  // Select the shape and action for editing
                  const trigger = shapeTriggers.find((t) => t.id === triggerId)
                  if (!trigger) return

                  // Select the shape
                  if (trigger.shapeType === 'line') setSelectedActivationLineId(trigger.shapeId)
                  else if (trigger.shapeType === 'circle') setSelectedCircleId(trigger.shapeId)
                  else if (trigger.shapeType === 'rectangle') setSelectedRectangleId(trigger.shapeId)
                  else if (trigger.shapeType === 'parallel') setSelectedParallelId(trigger.shapeId)

                  // Open action editor
                  onEditTriggerAction(triggerId, actionId)
                }}
              />
            </div>
          </div>
        </div>
      </div>
      {/* Node context menu */}
      {nodeContextMenu && (
        <ContextMenu
          x={nodeContextMenu.x}
          y={nodeContextMenu.y}
          items={(() => {
            const nodeId = nodeContextMenu.nodeId
            const hasChildren = nodes.some((n) => n.parentId === nodeId)
            const items: ContextMenuItem[] = [
              {
                id: 'delete_block',
                label: hasChildren ? 'Delete Block Only' : 'Delete Block',
                danger: true,
                onClick: () => deleteNode(nodeId),
              },
            ]

            const n = nodes.find((x) => x.id === nodeId)
            if (n?.type && isRootNodeType(n.type)) {
              items.unshift({
                id: 'activate',
                label: 'Activate',
                onClick: () => activateFlow(nodeId),
              })
            }
            if (hasChildren) {
              items.push({
                id: 'delete_block_children',
                label: 'Delete Block + Children',
                danger: true,
                onClick: () => deleteNodeWithChildren(nodeId),
              })
            }
            return items
          })()}
          onClose={() => setNodeContextMenu(null)}
        />
      )}
    </div>
  )
}
