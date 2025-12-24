import { type DragEvent as ReactDragEvent, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react'

import type { AccountPosition } from '../../contexts/AccountContext'

function clamp(v: number, min: number, max: number) {
    return Math.max(min, Math.min(max, v))
}

function IconPosition({ side, size = 18, color }: { side: 'long' | 'short'; size?: number; color: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d={side === 'long' ? 'M12 20V4M5 11l7-7 7 7' : 'M12 4v16M5 13l7 7 7-7'}
                stroke={color}
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

export interface PositionCardProps {
    position: AccountPosition
    left: number
    top: number
    width: number
    height: number
    selected: boolean
    dropHover: boolean
    lastPrice: number | null
    interactionDisabled: boolean
    onSelect?: (id: string | null) => void
    onClose?: (id: string) => void
    onDragOver?: (e: ReactDragEvent, id: string) => void
    onDragLeave?: (e: ReactDragEvent, id: string) => void
    onDrop?: (e: ReactDragEvent, id: string) => void
}

export default function PositionCard({
    position,
    left,
    top,
    width,
    height,
    selected,
    dropHover,
    lastPrice,
    interactionDisabled,
    onSelect,
    onClose,
    onDragOver,
    onDragLeave,
    onDrop,
}: PositionCardProps) {
    const p = position
    const entry = p.entryPrice
    const sideColor = p.side === 'long' ? '#22c55e' : '#ef4444'

    const pnl = (() => {
        const lp = typeof lastPrice === 'number' && Number.isFinite(lastPrice) ? lastPrice : null
        if (!lp || !(entry > 0)) {
            return null
        }
        const diff = p.side === 'long' ? lp - entry : entry - lp
        const pnlUsd = diff * p.amount
        const pnlPct = (diff * 100) / entry
        if (!Number.isFinite(pnlUsd) || !Number.isFinite(pnlPct)) {
            return null
        }
        return { pnlUsd, pnlPct }
    })()

    const pnlColor = pnl ? (pnl.pnlUsd >= 0 ? '#22c55e' : '#ef4444') : 'var(--kf-text-muted)'

    const handleSelect = (e: ReactPointerEvent) => {
        e.preventDefault()
        e.stopPropagation()
        onSelect?.(p.id)
    }

    const handleClose = (e: ReactMouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (typeof window !== 'undefined') {
            const ok = window.confirm('Close this position?')
            if (!ok) {
                return
            }
        }
        onClose?.(p.id)
    }

    const handleDragOver = (e: ReactDragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        e.dataTransfer.dropEffect = 'copy'
        onDragOver?.(e, p.id)
    }

    const handleDragLeave = (e: ReactDragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        onDragLeave?.(e, p.id)
    }

    const handleDrop = (e: ReactDragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        onDrop?.(e, p.id)
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
                borderRadius: 10,
                border: `1.5px solid ${sideColor}50`,
                background: 'rgba(var(--kf-deep-rgb), 0.88)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                boxShadow: selected
                    ? `0 0 0 2px ${sideColor}40, 0 8px 24px rgba(0,0,0,0.35)`
                    : '0 8px 24px rgba(0,0,0,0.3)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '8px 10px',
                pointerEvents: interactionDisabled ? 'none' : 'auto',
                cursor: interactionDisabled ? 'default' : 'pointer',
                outline: dropHover ? `2px solid rgba(34,197,94,0.75)` : 'none',
            }}
            onPointerDown={handleSelect}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Row 1: Position type + Close button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <IconPosition side={p.side} size={14} color={sideColor} />
                    <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--kf-text)' }}>
                        {p.side.toUpperCase()} {p.symbol?.split('/')?.[0] ?? 'BTC'}
                    </span>
                </div>
                <button
                    type="button"
                    onClick={handleClose}
                    title="Close position"
                    style={{
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        border: 'none',
                        background: `${sideColor}20`,
                        color: sideColor,
                        fontSize: 13,
                        lineHeight: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: interactionDisabled ? 'default' : 'pointer',
                    }}
                >
                    ×
                </button>
            </div>

            {/* Row 2: Amount left, P&L right */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--kf-text)' }}>
                    {p.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} {p.symbol?.split('/')?.[0] ?? 'BTC'}
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: pnlColor, lineHeight: 1 }}>
                        {pnl ? `${pnl.pnlUsd >= 0 ? '+' : ''}${pnl.pnlUsd.toFixed(2)}` : '--'}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: pnlColor, opacity: 0.8 }}>
                        {pnl ? `${pnl.pnlPct >= 0 ? '+' : ''}${pnl.pnlPct.toFixed(2)}%` : ''}
                    </div>
                </div>
            </div>
        </div>
    )
}

// Re-export clamp for use in parent
export { clamp }
