import { type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react'

import { getActionDockInfo } from '../strategy-builder/TriggerIcons'
import type { AccountOrder } from '../../contexts/AccountContext'

function clamp(v: number, min: number, max: number) {
    return Math.max(min, Math.min(max, v))
}

function typeToInfo(oType: string, side: 'buy' | 'sell') {
    if (oType === 'stop-loss' || oType === 'stop-loss-limit') {
        return getActionDockInfo('stop_loss', side, 16)
    }
    if (oType === 'take-profit' || oType === 'take-profit-limit') {
        return getActionDockInfo('take_profit', side, 16)
    }
    if (oType === 'trailing-stop' || oType === 'trailing-stop-limit') {
        return getActionDockInfo('trailing_stop', side, 16)
    }
    return getActionDockInfo('alert', side, 16)
}

function colorFor(oType: string) {
    return oType === 'stop-loss' || oType === 'stop-loss-limit'
        ? '#ef4444'
        : oType === 'take-profit' || oType === 'take-profit-limit'
            ? '#22c55e'
            : '#38bdf8'
}

export interface PositionExitBlockProps {
    order: AccountOrder
    pnlPct?: number | null
    closePercent?: number | null
    left: number
    top: number
    width: number
    height: number
    interactionDisabled: boolean
    onDragStart?: (orderId: string, startY: number, type: 'price' | 'offset', startVal: number) => void
    onContextMenu?: (orderId: string, e: ReactMouseEvent) => void
    onOpenSettings?: (orderId: string) => void
}

export function PositionExitBlock({
    order,
    pnlPct,
    closePercent,
    left,
    top,
    width,
    height,
    interactionDisabled,
    onDragStart,
    onContextMenu,
    onOpenSettings,
}: PositionExitBlockProps) {
    const o = order
    const color = colorFor(o.type)
    const info = typeToInfo(o.type, o.side)

    const cp = typeof closePercent === 'number' && Number.isFinite(closePercent)
        ? clamp(closePercent, 1, 100)
        : typeof o.closePercent === 'number' && Number.isFinite(o.closePercent)
            ? clamp(o.closePercent, 1, 100)
            : 100

    const pnlText = (() => {
        if (!(typeof pnlPct === 'number' && Number.isFinite(pnlPct))) {
            return '--'
        }
        const sign = pnlPct >= 0 ? '+' : ''
        return `${sign}${pnlPct.toFixed(2)}%`
    })()

    const pnlColor = (() => {
        if (!(typeof pnlPct === 'number' && Number.isFinite(pnlPct))) {
            return 'var(--kf-text-muted)'
        }
        return pnlPct >= 0 ? '#22c55e' : '#ef4444'
    })()

    const handlePointerDown = (e: ReactPointerEvent) => {
        if (e.button !== 0) {
            return
        }
        e.preventDefault()
        e.stopPropagation()

        if (onOpenSettings) {
            onOpenSettings(o.id)
            return
        }

        if (!onDragStart) {
            return
        }
        const dragType: 'price' | 'offset' = o.type === 'trailing-stop' || o.type === 'trailing-stop-limit' ? 'offset' : 'price'
        const startVal = dragType === 'offset' ? (typeof o.trailingOffset === 'number' ? o.trailingOffset : 0) : (typeof o.price === 'number' ? o.price : 0)
        onDragStart(o.id, e.clientY, dragType, startVal)
    }

    return (
        <div
            className="kf-floating-ui"
            style={{
                position: 'absolute',
                left,
                top,
                width,
                height,
                borderRadius: 14,
                border: `1px solid rgba(255, 255, 255, 0.12)`,
                background: 'rgba(var(--kf-deep-rgb), 0.78)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                boxShadow: '0 6px 18px rgba(0,0,0,0.22)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '9px 10px',
                cursor: interactionDisabled ? 'default' : (onOpenSettings ? 'pointer' : 'default'),
                pointerEvents: interactionDisabled ? 'none' : 'auto',
                zIndex: 156,
            }}
            onPointerDown={handlePointerDown}
            onContextMenu={(e) => {
                if (!onContextMenu) {
                    return
                }
                e.preventDefault()
                e.stopPropagation()
                onContextMenu(o.id, e)
            }}
        >
            <div style={{ color, display: 'grid', placeItems: 'center' }}>{info.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--kf-text)', textAlign: 'center', lineHeight: 1.05 }}>
                {info.label}{' '}
                <span style={{ color: pnlColor, opacity: 0.95 }}>
                    @ {pnlText}
                </span>
            </div>
            <div style={{ fontSize: 10, fontWeight: 850, opacity: 0.82, color: 'var(--kf-text)', textAlign: 'center', lineHeight: 1.1 }}>
                Closing {cp}% of position
            </div>
        </div>
    )
}

export interface PositionExitConnectorProps {
    orderId: string
    posLeft: number
    posY: number
    y: number
    left: number
    blockWidth: number
    color: string
}

export function PositionExitConnector({ orderId, posLeft, posY, y, left, blockWidth, color }: PositionExitConnectorProps) {
    const startX = posLeft
    const endX = left + blockWidth
    const dx = endX - startX
    const ctrlX = startX + dx * 0.5
    return (
        <svg
            key={`pos_exit_link_${orderId}`}
            style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', width: '100%', height: '100%', pointerEvents: 'none', zIndex: 155 }}
        >
            <path
                d={`M${startX},${posY} C${ctrlX},${posY} ${ctrlX},${y} ${endX},${y}`}
                fill="none"
                stroke={color}
                strokeOpacity={0.55}
                strokeWidth={1.5}
                strokeDasharray="4 4"
            />
            <circle cx={endX} cy={y} r={3} fill={color} opacity={0.9} />
        </svg>
    )
}

// Re-export colorFor for connector
export { colorFor, clamp }
