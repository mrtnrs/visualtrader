import { useCallback, useMemo, useEffect, useRef, useState, type ReactNode } from 'react'
import { ViewportPortal } from '@xyflow/react'

import type {
  ActivationLine,
  CircleAnnotation,
  ParallelLinesAnnotation,
  RectangleAnnotation,
  ShapeTrigger,
  TriggerAction,
  TriggerCondition,
} from '../../utils/strategyStorage'
import { type ChartDims, type PriceDomain, priceToY } from '../../utils/chartMapping'
import { computeCircleBoundsPx, computeLineBoundsPx, computeParallelBoundsPx, computeRectangleBoundsPx } from '../../utils/shapeGeometry'
import { getActionDockInfo } from '../strategy-builder/TriggerIcons'
import TriggerPill, { type TriggerPillAnchor } from './TriggerPill'

function conditionToAnchor(condition: TriggerCondition): TriggerPillAnchor {
  switch (condition) {
    case 'cross_up':
      return 'top'
    case 'cross_down':
      return 'bottom'
    case 'touch':
      return 'center'

    case 'exit':
    case 'enter':
      return 'top'
    case 'touch_edge':
      return 'right'

    case 'exit_top':
      return 'top'
    case 'exit_bottom':
      return 'bottom'
    case 'exit_left':
      return 'left'
    case 'exit_right':
      return 'right'
    case 'exit_any':
      return 'center'
    case 'enter_top':
      return 'top'
    case 'enter_bottom':
      return 'bottom'
    case 'enter_left':
      return 'left'
    case 'enter_right':
      return 'right'
    case 'enter_any':
    case 'enter_zone':
      return 'center'
    case 'exit_side':
      return 'right'

    case 'break_upper':
      return 'top'
    case 'break_lower':
      return 'bottom'
    case 'inside_channel':
      return 'center'
    case 'enter_channel':
      return 'center'

    default:
      return 'center'
  }
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

function anchorPoint(bounds: { x: number; y: number; width: number; height: number }, anchor: TriggerPillAnchor) {
  const cx = bounds.x + bounds.width / 2
  const cy = bounds.y + bounds.height / 2

  // Align pills to STRADDLE the shape line (Center of Badge on Line).
  // Badge size is 28px (half=14). Gap = -14 ensures geometric center.
  const gap = -14

  switch (anchor) {
    case 'top':
      return { x: cx, y: bounds.y - gap }
    case 'bottom':
      return { x: cx, y: bounds.y + bounds.height + gap }
    case 'left':
      return { x: bounds.x - gap, y: cy }
    case 'right':
      return { x: bounds.x + bounds.width + gap, y: cy }
    case 'center':
    default:
      // Center: Origin Top. y = Top.
      // To center 28px badge at cy: Top = cy - 14.
      return { x: cx, y: cy - 14 }
  }
}

function applyStackOffset(pos: { x: number; y: number }, anchor: TriggerPillAnchor, index: number) {
  const step = 28
  if (index <= 0) {
    return pos
  }
  switch (anchor) {
    case 'top':
      return { x: pos.x, y: pos.y - index * step }
    case 'bottom':
      return { x: pos.x, y: pos.y + index * step }
    case 'left':
      return { x: pos.x - index * step, y: pos.y }
    case 'right':
      return { x: pos.x + index * step, y: pos.y }
    case 'center':
    default:
      return { x: pos.x, y: pos.y + index * step }
  }
}

export default function TriggerPillManager({
  activationLines,
  circles,
  rectangles,
  parallelLines,
  triggers,
  isDragging,
  selectedShapeId,
  chartDims,
  domain,
  timeWindowMs,
  timeCenter,
  lastPrice,
  lastCandleTimestamp,
  selectedTriggerId,
  onSelectTrigger,
  selectedActionId,
  onSelectAction,
  onDropAction,
  onDropChildAction,
  onRemoveTrigger,
  onToggleTrigger,
  onDragChildActionStart,
  onOpenChildActionContextMenu,
  onEditAction,
  onClickBadge,
}: {
  activationLines: ActivationLine[]
  circles: CircleAnnotation[]
  rectangles: RectangleAnnotation[]
  parallelLines: ParallelLinesAnnotation[]
  triggers: ShapeTrigger[]
  isDragging?: boolean
  selectedShapeId: string | null
  chartDims: ChartDims
  domain: PriceDomain
  timeWindowMs: number
  timeCenter: number
  lastPrice?: number | null
  lastCandleTimestamp?: number
  /* Selection State (Lifted) */
  selectedTriggerId: string | null
  onSelectTrigger: (triggerId: string | null) => void
  selectedActionId: string | null
  onSelectAction: (actionId: string | null) => void

  onDropAction: (triggerId: string, blockType: string, side: string | null) => void
  onDropChildAction: (triggerId: string, parentActionId: string, blockType: string, side: string | null) => void
  onRemoveTrigger: (triggerId: string) => void
  onToggleTrigger: (triggerId: string) => void
  onDragChildActionStart?: (triggerId: string, actionId: string, startY: number, type: 'price' | 'offset', startVal: number) => void
  onOpenChildActionContextMenu?: (opts: { x: number; y: number; triggerId: string; actionId: string }) => void
  onEditAction: (triggerId: string, actionId: string) => void
  onClickBadge?: (shapeId: string) => void
}) {
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const primaryActionEls = useRef(new Map<string, HTMLDivElement | null>())
  const [layoutRev, setLayoutRev] = useState(0)

  const onPrimaryActionEl = useCallback((triggerId: string, el: HTMLDivElement | null) => {
    const prev = primaryActionEls.current.get(triggerId) ?? null
    if (prev === el) {
      return
    }
    primaryActionEls.current.set(triggerId, el)
    setLayoutRev((v) => v + 1)
  }, [])

  const triggersByShape = useMemo(() => {
    const m = new Map<string, ShapeTrigger[]>()
    for (const t of triggers) {
      const list = m.get(t.shapeId)
      if (list) {
        list.push(t)
      } else {
        m.set(t.shapeId, [t])
      }
    }
    return m
  }, [triggers])

  // Handle global clicks to deselect
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.kf-floating-ui')) {
        onSelectTrigger(null)
        onSelectAction(null)
      }
    }

    if (selectedTriggerId) {
      window.addEventListener('mousedown', handleGlobalClick)
    }
    return () => window.removeEventListener('mousedown', handleGlobalClick)
  }, [selectedTriggerId, onSelectTrigger, onSelectAction])

  const pillsCacheRef = useRef<null | { computedAt: number; pills: Array<{ trigger: ShapeTrigger; position: { x: number; y: number }; anchor: TriggerPillAnchor; expanded: boolean; disabled?: boolean; collapsedCount?: number }> }>(null)

  const pills = useMemo(() => {
    if (isDragging) {
      const cached = pillsCacheRef.current
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
      if (cached && now - cached.computedAt < 33) {
        return cached.pills
      }
    }

    const rectanglesById = new Map<string, RectangleAnnotation>()
    for (const r of rectangles) {
      rectanglesById.set(r.id, r)
    }

    const lineBoundsById = new Map<string, { x: number; y: number; width: number; height: number }>()
    for (const l of activationLines) {
      lineBoundsById.set(l.id, computeLineBoundsPx(l, timeCenter, timeWindowMs, chartDims, domain))
    }

    const circleBoundsById = new Map<string, { x: number; y: number; width: number; height: number }>()
    for (const c of circles) {
      circleBoundsById.set(c.id, computeCircleBoundsPx(c, timeCenter, timeWindowMs, chartDims, domain))
    }

    const rectangleBoundsById = new Map<string, { x: number; y: number; width: number; height: number }>()
    for (const r of rectangles) {
      rectangleBoundsById.set(r.id, computeRectangleBoundsPx(r, timeCenter, timeWindowMs, chartDims, domain))
    }

    const parallelBoundsById = new Map<string, { x: number; y: number; width: number; height: number }>()
    for (const p of parallelLines) {
      parallelBoundsById.set(p.id, computeParallelBoundsPx(p, timeCenter, timeWindowMs, chartDims, domain))
    }

    const res: Array<{
      trigger: ShapeTrigger
      position: { x: number; y: number }
      anchor: TriggerPillAnchor
      expanded: boolean
      disabled?: boolean
      collapsedCount?: number
    }> = []

    for (const [, ts] of triggersByShape) {
      if (ts.length === 0) {
        continue
      }

      // SHOW ALWAYS
      ts.forEach((t, idx) => {
        const bounds =
          t.shapeType === 'line'
            ? (lineBoundsById.get(t.shapeId) ?? null)
            : t.shapeType === 'circle'
              ? (circleBoundsById.get(t.shapeId) ?? null)
              : t.shapeType === 'rectangle'
                ? (rectangleBoundsById.get(t.shapeId) ?? null)
                : t.shapeType === 'parallel'
                  ? (parallelBoundsById.get(t.shapeId) ?? null)
                  : null

        if (!bounds) {
          return
        }

        // Logic to disable impossible triggers (e.g. past time)
        let disabled = false
        if (t.shapeType === 'rectangle' && lastCandleTimestamp) {
          const s = rectanglesById.get(t.shapeId) ?? null
          if (s) {
            const leftTime = Math.min(s.a.timestamp, s.b.timestamp)
            if ((t.condition === 'exit_left' || t.condition === 'enter_left') && leftTime < lastCandleTimestamp) {
              disabled = true
            }
          }
        }

        const anchor = conditionToAnchor(t.condition as TriggerCondition)
        const base = anchorPoint(bounds, anchor)
        const stacked = applyStackOffset(base, anchor, idx)

        const x = clamp(stacked.x, 10, chartDims.width - 10)
        const y = clamp(stacked.y, 10, chartDims.height - 10)

        res.push({ trigger: t, position: { x, y }, anchor, expanded: true, disabled })
      })
    }

    return res
  }, [activationLines, chartDims, circles, domain, isDragging, parallelLines, rectangles, selectedShapeId, timeCenter, timeWindowMs, triggersByShape, lastCandleTimestamp])

  useEffect(() => {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
    pillsCacheRef.current = { computedAt: now, pills }
  }, [pills])

  const visualChildActions = useMemo(() => {
    const padR = chartDims.paddingRight ?? chartDims.padding
    const endX = chartDims.width - padR - 12
    const blockW = 120
    const blockH = 46

    const overlayRect = overlayRef.current?.getBoundingClientRect() ?? null
    const originForTrigger = (triggerId: string, fallback: { x: number; y: number }): { x: number; y: number } => {
      if (!overlayRect) {
        return fallback
      }
      const el = primaryActionEls.current.get(triggerId) ?? null
      if (!el) {
        return fallback
      }
      const r = el.getBoundingClientRect()
      const x = r.right - overlayRect.left
      const y = r.top + r.height / 2 - overlayRect.top
      if (!(Number.isFinite(x) && Number.isFinite(y))) {
        return fallback
      }
      return { x, y }
    }

    const resolveLevel = (a: TriggerAction): { level: number; color: string } | null => {
      const cfg = a.config ?? {}

      if ((a.type === 'stop_loss' || a.type === 'stop_loss_limit') && typeof cfg.stopPrice === 'number' && Number.isFinite(cfg.stopPrice)) {
        return { level: cfg.stopPrice, color: '#ef4444' }
      }

      if ((a.type === 'take_profit' || a.type === 'take_profit_limit') && typeof cfg.triggerPrice === 'number' && Number.isFinite(cfg.triggerPrice)) {
        return { level: cfg.triggerPrice, color: '#22c55e' }
      }

      if ((a.type === 'trailing_stop' || a.type === 'trailing_stop_limit') && typeof lastPrice === 'number' && typeof cfg.trailingOffset === 'number') {
        const unit = cfg.trailingOffsetUnit ?? 'percent'
        const raw = cfg.trailingOffset
        const delta = unit === 'percent' ? (lastPrice * raw) / 100 : raw
        const side = cfg.side === 'buy' ? 'buy' : 'sell'
        const level = side === 'buy' ? lastPrice + delta : lastPrice - delta
        if (!Number.isFinite(level)) {
          return null
        }
        return { level, color: '#38bdf8' }
      }

      if ((a.type === 'limit_buy' || a.type === 'limit_sell') && typeof cfg.limitPrice === 'number' && Number.isFinite(cfg.limitPrice)) {
        return { level: cfg.limitPrice, color: a.type === 'limit_buy' ? '#22c55e' : '#ef4444' }
      }

      return null
    }

    const nodes: ReactNode[] = []

    for (const pill of pills) {
      if (pill.trigger.triggeredAt) {
        continue
      }
      const primary = pill.trigger.actions[0]
      if (!primary || !Array.isArray(primary.children) || primary.children.length === 0) {
        continue
      }

      const origin = originForTrigger(pill.trigger.id, { x: pill.position.x, y: pill.position.y })

      for (const child of primary.children) {
        const resolved = resolveLevel(child)
        if (!resolved) {
          continue
        }

        const y = priceToY(resolved.level, domain, chartDims)
        if (!(typeof y === 'number' && Number.isFinite(y))) {
          continue
        }

        const selected = selectedTriggerId === pill.trigger.id && selectedActionId === child.id
        const placeBelow = typeof lastPrice === 'number' ? lastPrice > resolved.level : true
        const rawTop = placeBelow ? y : y - blockH
        const top = clamp(rawTop, 8, chartDims.height - blockH - 8)

        const left = endX - blockW - 10

        const side = child.config?.side || (child.type.includes('buy') ? 'buy' : child.type.includes('sell') ? 'sell' : null)
        const info = getActionDockInfo(child.type, side, 16)

        const cfg = child.config ?? {}
        const closePercent = typeof cfg.closePercent === 'number' && Number.isFinite(cfg.closePercent) ? cfg.closePercent : null
        const closeText = closePercent != null ? `Close ${Math.max(1, Math.min(100, Math.round(closePercent)))}% of position` : null

        const secondaryText = (() => {
          if ((child.type === 'trailing_stop' || child.type === 'trailing_stop_limit') && typeof cfg.trailingOffset === 'number') {
            const unit = cfg.trailingOffsetUnit ?? 'percent'
            const raw = cfg.trailingOffset
            const off = unit === 'percent' ? `${raw.toFixed(2)}%` : raw.toLocaleString(undefined, { maximumFractionDigits: 2 })
            return `Trail ${off}`
          }
          return null
        })()

        nodes.push(
          <svg
            key={`child_link_${pill.trigger.id}_${child.id}`}
            style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', width: '100%', height: '100%', pointerEvents: 'none', zIndex: 155 }}
          >
            <path
              d={`M${origin.x},${origin.y} C${origin.x + 40},${origin.y} ${origin.x + 40},${y} ${left},${y}`}
              fill="none"
              stroke={resolved.color}
              strokeOpacity={pill.trigger.isActive ? 0.55 : 0.22}
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />
            <circle cx={left} cy={y} r={3} fill={resolved.color} opacity={pill.trigger.isActive ? 0.9 : 0.4} />
          </svg>,
        )

        nodes.push(
          <div
            key={`child_block_${pill.trigger.id}_${child.id}`}
            className="kf-floating-ui"
            style={{
              position: 'absolute',
              left,
              top,
              width: blockW,
              height: blockH,
              borderRadius: 14,
              border: selected ? '2px solid rgba(255, 255, 255, 0.6)' : '1px solid var(--kf-border-1)',
              background: 'rgba(var(--kf-deep-rgb), 0.78)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              boxShadow: selected ? '0 8px 24px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '9px 10px',
              cursor: 'pointer',
              pointerEvents: 'auto',
              opacity: pill.trigger.isActive ? 1 : 0.55,
              zIndex: 156,
            }}
            onContextMenu={(e) => {
              if (!onOpenChildActionContextMenu) {
                return
              }
              e.preventDefault()
              e.stopPropagation()
              onSelectTrigger(pill.trigger.id)
              onSelectAction(child.id)
              onOpenChildActionContextMenu({ x: e.clientX, y: e.clientY, triggerId: pill.trigger.id, actionId: child.id })
            }}
            onPointerDown={(e) => {
              if (!onDragChildActionStart) {
                return
              }
              e.preventDefault()
              e.stopPropagation()
              const cfg = child.config ?? {}
              const dragType: 'price' | 'offset' = child.type === 'trailing_stop' || child.type === 'trailing_stop_limit' ? 'offset' : 'price'
              const startVal = dragType === 'offset' ? (typeof cfg.trailingOffset === 'number' ? cfg.trailingOffset : 0) : resolved.level
              onSelectTrigger(pill.trigger.id)
              onSelectAction(child.id)
              onDragChildActionStart(pill.trigger.id, child.id, e.clientY, dragType, startVal)
            }}
            onClick={(e) => {
              e.stopPropagation()
              onSelectTrigger(pill.trigger.id)
              onSelectAction(child.id)
            }}
          >
            <div style={{ color: resolved.color, display: 'grid', placeItems: 'center' }}>{info.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--kf-text)', textAlign: 'center', lineHeight: 1.05 }}>{info.label}</div>
            {closeText ? (
              <div style={{ fontSize: 10, fontWeight: 900, opacity: 0.95, color: 'var(--kf-text)', textAlign: 'center', lineHeight: 1.1 }}>
                {closeText}
              </div>
            ) : null}
            {secondaryText ? (
              <div style={{ fontSize: 10, fontWeight: 800, opacity: 0.75, color: 'var(--kf-text)', textAlign: 'center', lineHeight: 1.1 }}>
                {secondaryText}
              </div>
            ) : null}
          </div>,
        )
      }
    }

    return nodes
  }, [chartDims, domain, lastPrice, layoutRev, onDragChildActionStart, onOpenChildActionContextMenu, onSelectAction, onSelectTrigger, pills, selectedActionId, selectedTriggerId])

  return (
    <ViewportPortal>
      <div ref={overlayRef} style={{ position: 'absolute', left: 0, top: 0, width: chartDims.width, height: chartDims.height, zIndex: 160, pointerEvents: 'none' }}>
        {visualChildActions}
        {pills.map((p) => (
          <TriggerPill
            key={p.trigger.id}
            trigger={p.trigger}
            position={p.position}
            anchor={p.anchor}
            expanded={p.expanded}
            collapsedCount={p.collapsedCount}
            isSelected={selectedTriggerId === p.trigger.id}
            isShapeSelected={selectedShapeId === p.trigger.shapeId}
            disabled={p.disabled}
            onPrimaryActionEl={onPrimaryActionEl}
            onSelect={(e) => {
              e.stopPropagation()
              onSelectTrigger(p.trigger.id)
            }}
            onDropAction={onDropAction}
            onDropChildAction={onDropChildAction}
            onRemoveTrigger={onRemoveTrigger}
            onToggleActive={onToggleTrigger}
            onEditAction={onEditAction}
            onClickBadge={onClickBadge}
            selectedActionId={selectedActionId}
            onSelectAction={onSelectAction}
          />
        ))}
      </div>
    </ViewportPortal>
  )
}
