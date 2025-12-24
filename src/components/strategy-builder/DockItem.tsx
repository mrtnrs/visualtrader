/**
 * DockItem Component
 *
 * Individual dock item with macOS-style magnification effect.
 * Scales up and nudges when cursor approaches.
 */

import { useRef, useMemo, type CSSProperties, type ReactNode, type DragEvent } from 'react'
import { DRAG_MIME } from '../canvas/SidebarPalette'
import type { BlockType, DockConfig } from './strategy-builder.types'

// ─────────────────────────────────────────────────────────────────
// DEFAULT CONFIG
// ─────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: DockConfig = {
    maxScale: 1.25,   // Subtle scale (was 1.8)
    distance: 60,     // Smaller radius
    nudge: 12,        // Minimal horizontal push
}

// ─────────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────────

export interface DockItemProps {
    mouseX: number | null
    blockType: BlockType
    icon: ReactNode
    label: string
    onDragStart?: (e: DragEvent, type: BlockType) => void
    onClick?: (type: BlockType) => void
    config?: DockConfig
}

// ─────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────

export function DockItem({
    mouseX,
    blockType,
    icon,
    label,
    onDragStart,
    onClick,
    config = DEFAULT_CONFIG,
}: DockItemProps) {
    const ref = useRef<HTMLDivElement>(null)

    // Calculate scale and vertical pop based on mouse distance
    const { scale, translateY } = useMemo(() => {
        if (mouseX === null || !ref.current) {
            return { scale: 1, translateY: 0 }
        }

        const itemBounds = ref.current.getBoundingClientRect()
        const itemCenterX = itemBounds.left + itemBounds.width / 2
        const absDistance = Math.abs(mouseX - itemCenterX)

        // Scale: peaks at cursor position, smooth falloff
        const t = Math.max(0, 1 - absDistance / config.distance)
        const scale = 1 + (config.maxScale - 1) * t * t  // Quadratic for smooth curve

        // Pop up effect: lift items toward cursor (macOS style)
        const translateY = -4 * t * t  // Max 4px lift

        return { scale, translateY }
    }, [mouseX, config.maxScale, config.distance])

    // Dynamic style based on mouse position
    const style: CSSProperties = {
        transform: `scale(${scale}) translateY(${translateY}px)`,
        transformOrigin: 'bottom center',
        transition: mouseX === null ? 'transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
        willChange: 'transform',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '12px 20px',
        minWidth: 64,
        background: 'var(--kf-surface-3)',
        border: '1px solid var(--kf-border-1)',
        borderRadius: 12,
        cursor: 'grab',
        flexShrink: 0,
    }

    const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
        if (!onDragStart) {
            return
        }
        e.dataTransfer.setData(DRAG_MIME, blockType)
        e.dataTransfer.setData('application/krakenforge-block', blockType)
        e.dataTransfer.effectAllowed = 'copy'
        onDragStart(e, blockType)
    }

    const handleClick = () => {
        onClick?.(blockType)
    }

    return (
        <div
            ref={ref}
            style={style}
            draggable={Boolean(onDragStart)}
            onDragStart={handleDragStart}
            onClick={handleClick}
            role="button"
            tabIndex={0}
            aria-label={`Add ${label} block`}
        >
            <div style={{ fontSize: 24, lineHeight: 1, userSelect: 'none' }}>{icon}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--kf-text)', whiteSpace: 'nowrap', userSelect: 'none' }}>
                {label}
            </div>
        </div>
    )
}

export default DockItem
