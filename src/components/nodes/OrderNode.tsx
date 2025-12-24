import { memo, useMemo } from 'react'
import { Handle, NodeResizer, Position, type Node, type NodeProps } from '@xyflow/react'

import type { OrderNodeData, StrategyNodeType } from './types'
import { useStrategyContext } from '../../contexts/StrategyContext'


type OrderNodeKind = Exclude<StrategyNodeType, 'entry'>
export type OrderNodeType = Node<OrderNodeData, OrderNodeKind>

type Props = NodeProps<OrderNodeType>

function sideColor(side: OrderNodeData['side']) {
  return side === 'buy' ? '#22c55e' : '#ef4444'
}

function typeLabel(type: StrategyNodeType) {
  switch (type) {
    case 'limit':
      return 'Limit'
    case 'market':
      return 'Market'
    case 'stop_loss':
      return 'Stop Loss'
    case 'stop_loss_limit':
      return 'Stop Loss Limit'
    case 'take_profit':
      return 'Take Profit'
    case 'take_profit_limit':
      return 'Take Profit Limit'
    case 'iceberg':
      return 'Iceberg'
    case 'trailing_stop':
      return 'Trailing Stop'
    case 'trailing_stop_limit':
      return 'Trailing Stop Limit'
    default:
      return type
  }
}

function formatMaybe(n: number | undefined) {
  if (typeof n !== 'number' || !Number.isFinite(n)) {
    return '--'
  }
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}



function formatMaybeOffset(n: number | undefined) {
  if (typeof n !== 'number' || !Number.isFinite(n)) {
    return '--'
  }
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function chipStyle(color: string) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 8px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
    border: '1px solid var(--kf-border-1)',
    background: 'var(--kf-surface-5)',
    color,
    letterSpacing: 0.2,
  } as const
}

function OrderNode({ id, type, data, selected, height }: Props) {


  const {
    state: { lastPrice },
  } = useStrategyContext()

  const label = typeLabel(type)

  const isTriggering = useMemo(() => {
    if (!data.active || lastPrice == null) {
      return false
    }

    if (type === 'market') {
      return true
    }

    if (type === 'limit' && typeof data.limitPrice === 'number') {
      return data.side === 'buy' ? lastPrice <= data.limitPrice : lastPrice >= data.limitPrice
    }

    if ((type === 'stop_loss' || type === 'stop_loss_limit') && typeof data.stopPrice === 'number') {
      return data.side === 'buy' ? lastPrice >= data.stopPrice : lastPrice <= data.stopPrice
    }

    if ((type === 'take_profit' || type === 'take_profit_limit') && typeof data.triggerPrice === 'number') {
      return data.side === 'buy' ? lastPrice <= data.triggerPrice : lastPrice >= data.triggerPrice
    }

    return false
  }, [data.active, data.limitPrice, data.side, data.stopPrice, data.triggerPrice, lastPrice, type])


  const borderColor = selected ? '#60a5fa' : isTriggering ? '#f59e0b' : 'var(--kf-border-2)'

  const childCount = typeof data.childrenCount === 'number' ? data.childrenCount : 0

  const isTrailing = type === 'trailing_stop' || type === 'trailing_stop_limit'
  const isResizable = !data.isChild && isTrailing
  const nodeWidth = data.isChild ? 160 : 180
  const minH = 110
  const maxH = 240
  const defaultH = 150
  const nodeHeight = isResizable ? Math.max(minH, Math.min(maxH, height ?? defaultH)) : undefined

  const closePercent = typeof data.closePercent === 'number' ? data.closePercent : 100

  const showActivate = type === 'market' && !data.isChild && data.active

  const primaryValue = useMemo(() => {
    if (type === 'market') return formatMaybe(lastPrice ?? undefined)
    if (type === 'limit') return formatMaybe(data.limitPrice)
    if (type === 'stop_loss' || type === 'stop_loss_limit') return formatMaybe(data.stopPrice)
    if (type === 'take_profit' || type === 'take_profit_limit') return formatMaybe(data.triggerPrice)

    if (type === 'trailing_stop' || type === 'trailing_stop_limit') {
      if (lastPrice == null || typeof data.trailingOffset !== 'number') {
        return '--'
      }
      const stopPrice = data.side === 'buy' ? lastPrice + data.trailingOffset : lastPrice - data.trailingOffset
      return formatMaybe(stopPrice)
    }

    return '--'
  }, [data.limitPrice, data.side, data.stopPrice, data.trailingOffset, data.triggerPrice, lastPrice, type])

  const primaryLabel = useMemo(() => {
    if (type === 'limit') return 'Limit'
    if (type === 'stop_loss' || type === 'stop_loss_limit') return 'Stop'
    if (type === 'take_profit' || type === 'take_profit_limit') return 'Trigger'
    if (type === 'trailing_stop' || type === 'trailing_stop_limit') return 'Stop'
    return 'Price'
  }, [type])

  const isLineSkin = data.skin === 'line'

  return (
    isLineSkin ? (
      <div
        style={{
          position: 'relative',
          width: nodeWidth,
          minWidth: nodeWidth,
          maxWidth: nodeWidth,
          height: nodeHeight ?? 64,
          boxSizing: 'border-box',
          borderRadius: 999,
          border: `2px solid ${borderColor}`,
          background: 'var(--kf-surface-3)',
          color: 'var(--kf-text)',
          padding: '10px 12px',
          boxShadow: isTriggering
            ? '0 0 0 1px rgba(245,158,11,0.4), 0 18px 40px rgba(var(--kf-deep-rgb), 0.65)'
            : '0 18px 40px rgba(var(--kf-deep-rgb), 0.65)',
          opacity: data.active ? 1 : 0.75,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          overflow: type === 'market' ? 'visible' : 'hidden',
        }}
      >
        {type === 'market' ? (
          <div
            style={{
              position: 'absolute',
              left: -10,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 0,
              height: 0,
              borderTop: '7px solid transparent',
              borderBottom: '7px solid transparent',
              borderRight: `10px solid ${sideColor(data.side)}`,
              opacity: 0.9,
              pointerEvents: 'none',
            }}
          />
        ) : null}

        {isResizable ? (
          <NodeResizer
            isVisible={selected}
            minWidth={nodeWidth}
            maxWidth={nodeWidth}
            minHeight={minH}
            maxHeight={maxH}
            color="#38bdf8"
          />
        ) : null}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={chipStyle('#9ca3af')}>{label}</div>
          <div style={chipStyle(sideColor(data.side))}>{data.side.toUpperCase()}</div>
          <div
            style={{
              fontWeight: 900,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {data.label}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--kf-text-muted)', fontWeight: 800 }}>{primaryLabel}</div>
          <div style={{ fontSize: 18, fontWeight: 950, letterSpacing: -0.4 }}>{primaryValue}</div>
        </div>

        <Handle id={`${id}-target`} type="target" position={Position.Left} />
        <Handle id={`${id}-source`} type="source" position={Position.Right} />
      </div>
    ) : (
      <div
        style={{
          position: 'relative',
          width: nodeWidth,
          minWidth: nodeWidth,
          maxWidth: nodeWidth,
          height: nodeHeight,
          boxSizing: 'border-box',
          borderRadius: 14,
          border: selected ? `1.5px solid #60a5fa` : isTriggering ? `1.5px solid #f59e0b` : `1px solid rgba(255,255,255,0.08)`,
          background: data.isChild
            ? 'rgba(var(--kf-deep-rgb), 0.85)'
            : 'rgba(var(--kf-deep-rgb), 0.88)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          color: 'var(--kf-text)',
          padding: data.isChild ? 10 : 12,
          boxShadow: isTriggering
            ? `0 0 0 1px rgba(245,158,11,0.3), 0 12px 32px rgba(0,0,0,0.4)`
            : '0 12px 32px rgba(0,0,0,0.35)',
          opacity: data.active ? 1 : 0.7,
          overflow: type === 'market' ? 'visible' : 'hidden',
        }}
      >
        {type === 'market' ? (
          <div
            style={{
              position: 'absolute',
              left: -10,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 0,
              height: 0,
              borderTop: '7px solid transparent',
              borderBottom: '7px solid transparent',
              borderRight: `10px solid ${sideColor(data.side)}`,
              opacity: 0.9,
              pointerEvents: 'none',
            }}
          />
        ) : null}

        {isResizable ? (
          <NodeResizer
            isVisible={selected}
            minWidth={nodeWidth}
            maxWidth={nodeWidth}
            minHeight={minH}
            maxHeight={maxH}
            color="#38bdf8"
          />
        ) : null}

        {/* Row 1: Type + Side + Status */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 900, color: 'var(--kf-text)' }}>{label}</span>
            {data.isChild ? <span style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b' }}>CHILD</span> : null}
            {data.hasChildren ? <span style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b' }}>{childCount > 0 ? `+${childCount}` : 'linked'}</span> : null}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: sideColor(data.side) }}>{data.side.toUpperCase()}</span>
            {showActivate ? (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  window.dispatchEvent(new CustomEvent('kf_activate_node', { detail: { nodeId: id } }))
                }}
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: 'rgba(34,197,94,0.18)',
                  color: '#22c55e',
                  border: '1px solid rgba(34,197,94,0.35)',
                  cursor: 'pointer',
                }}
              >
                ACTIVATE
              </button>
            ) : (
              <span style={{
                fontSize: 9,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 4,
                background: data.active ? 'rgba(34,197,94,0.15)' : 'rgba(156,163,175,0.15)',
                color: data.active ? '#22c55e' : '#9ca3af'
              }}>
                {data.active ? 'ON' : 'OFF'}
              </span>
            )}
          </div>
        </div>


        {/* Row 3: Compact chips for params (trailing stop only) */}
        {(type === 'trailing_stop' || type === 'trailing_stop_limit') ? (
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#38bdf8' }}>
              OFFSET {formatMaybeOffset(data.trailingOffset)}
            </span>

            {!data.isChild ? (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b' }}>
                CLOSE {closePercent}%
              </span>
            ) : null}

            {type === 'trailing_stop_limit' ? (
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--kf-text-muted)' }}>
                LIMIT {formatMaybeOffset(data.limitOffset)}
              </span>
            ) : null}
          </div>
        ) : null}

        <Handle id={`${id}-target`} type="target" position={Position.Left} />
        <Handle id={`${id}-source`} type="source" position={Position.Right} />
      </div>
    )
  )
}

export default memo(OrderNode)
