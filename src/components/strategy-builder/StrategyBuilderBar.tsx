/**
 * StrategyBuilderBar Component
 *
 * Floating bottom bar with macOS dock-style magnification effect.
 * Context-sensitive: shows different items based on selected shape.
 */

import { useRef, useState, type CSSProperties, type DragEvent, type ReactNode } from 'react'
import { DockItem } from './DockItem'
import type {
    BlockType,
    DockConfig,
    StrategyBuilderBarProps,
    ShapeType,
    TriggerCondition,
    LineCondition,
    RectangleCondition,
    CircleCondition,
    ParallelCondition,
} from './strategy-builder.types'

// ─────────────────────────────────────────────────────────────────
// ICONS
// ─────────────────────────────────────────────────────────────────

function IconMarket({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.15" />
        </svg>
    )
}

function IconLimit({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 2" />
            <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.15" />
        </svg>
    )
}

function IconLong({ size = 16 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 20V4" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" />
            <path d="M5 11l7-7 7 7" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

function IconShort({ size = 16 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 4v16" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
            <path d="M5 13l7 7 7-7" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

// Shape condition icons
function IconCrossUp({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 16l8-8 8 8" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3" />
        </svg>
    )
}

function IconCrossDown({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 8l8 8 8-8" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3" />
        </svg>
    )
}

function IconTouch({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="3" fill="#f59e0b" />
            <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    )
}

function IconExitTop({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="4" y="8" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />
            <path d="M12 8V3" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M9 5l3-3 3 3" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

function IconExitBottom({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="4" y="6" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />
            <path d="M12 16v5" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M9 19l3 3 3-3" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

function IconEnterZone({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" fill="#22c55e" fillOpacity="0.2" />
            <path d="M2 12h6" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
            <path d="M6 9l3 3-3 3" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

function IconExitAny({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="5" y="7" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.08" />
            <path d="M12 4v3" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M12 17v3" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M4 12h3" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M17 12h3" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
    )
}

function IconStop({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M7 4h10l3 3v10l-3 3H7l-3-3V7l3-3z" stroke="#ef4444" strokeWidth="2" strokeLinejoin="round" fill="#ef4444" fillOpacity="0.12" />
            <path d="M8 12h8" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
        </svg>
    )
}

function IconTarget({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="8" stroke="#22c55e" strokeWidth="2" fill="#22c55e" fillOpacity="0.10" />
            <circle cx="12" cy="12" r="3" stroke="#22c55e" strokeWidth="2" fill="none" />
            <path d="M12 4v2" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 18v2" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
        </svg>
    )
}

function IconTrail({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 15c2-4 4-6 7-7 3-1 5 0 5 0" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M6 19c2-3 5-5 8-6" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
            <circle cx="18" cy="8" r="2" fill="#38bdf8" />
        </svg>
    )
}

function IconBack({ size = 18 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M19 12H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

// ─────────────────────────────────────────────────────────────────
// DOCK ITEM DEFINITIONS
// ─────────────────────────────────────────────────────────────────

interface DockItemDef {
    id: string
    label: string
    icon: ReactNode
    condition?: TriggerCondition
    type?: BlockType
    side?: 'buy' | 'sell'
}

const DEFAULT_ITEMS: DockItemDef[] = [
    { id: 'market-long', type: 'market', label: 'Market Long', icon: <><IconMarket /><IconLong /></>, side: 'buy' },
    { id: 'market-short', type: 'market', label: 'Market Short', icon: <><IconMarket /><IconShort /></>, side: 'sell' },
    { id: 'limit-long', type: 'limit', label: 'Limit Long', icon: <><IconLimit /><IconLong /></>, side: 'buy' },
    { id: 'limit-short', type: 'limit', label: 'Limit Short', icon: <><IconLimit /><IconShort /></>, side: 'sell' },
    { id: 'stop-loss', type: 'stop_loss', label: 'Stop Loss', icon: <IconStop />, side: 'sell' },
    { id: 'take-profit', type: 'take_profit', label: 'Take Profit', icon: <IconTarget />, side: 'sell' },
    { id: 'trailing-stop', type: 'trailing_stop', label: 'Trailing Stop', icon: <IconTrail />, side: 'sell' },
]

const LINE_ITEMS: DockItemDef[] = [
    { id: 'cross-up', label: 'Cross Up', icon: <IconCrossUp />, condition: 'cross_up' as LineCondition },
    { id: 'cross-down', label: 'Cross Down', icon: <IconCrossDown />, condition: 'cross_down' as LineCondition },
    { id: 'touch', label: 'Touch', icon: <IconTouch />, condition: 'touch' as LineCondition },
]

const RECTANGLE_ITEMS: DockItemDef[] = [
    { id: 'exit-top', label: 'Exit Top', icon: <IconExitTop />, condition: 'exit_top' as RectangleCondition },
    { id: 'exit-bottom', label: 'Exit Bottom', icon: <IconExitBottom />, condition: 'exit_bottom' as RectangleCondition },
    { id: 'exit-left', label: 'Exit Left', icon: <IconBack />, condition: 'exit_left' as RectangleCondition },
    { id: 'exit-right', label: 'Exit Right', icon: <IconBack />, condition: 'exit_right' as RectangleCondition },
    { id: 'exit-any', label: 'Exit Any', icon: <IconExitAny />, condition: 'exit_any' as RectangleCondition },
    { id: 'enter-top', label: 'Enter Top', icon: <IconEnterZone />, condition: 'enter_top' as RectangleCondition },
    { id: 'enter-bottom', label: 'Enter Bottom', icon: <IconEnterZone />, condition: 'enter_bottom' as RectangleCondition },
    { id: 'enter-left', label: 'Enter Left', icon: <IconEnterZone />, condition: 'enter_left' as RectangleCondition },
    { id: 'enter-right', label: 'Enter Right', icon: <IconEnterZone />, condition: 'enter_right' as RectangleCondition },
    { id: 'enter-any', label: 'Enter Any', icon: <IconEnterZone />, condition: 'enter_any' as RectangleCondition },
]

const CIRCLE_ITEMS: DockItemDef[] = [
    { id: 'enter', label: 'Enter', icon: <IconEnterZone />, condition: 'enter' as CircleCondition },
    { id: 'exit', label: 'Exit', icon: <IconExitTop />, condition: 'exit' as CircleCondition },
    { id: 'touch-edge', label: 'Touch Edge', icon: <IconTouch />, condition: 'touch_edge' as CircleCondition },
]

const PARALLEL_ITEMS: DockItemDef[] = [
    { id: 'break-upper', label: 'Break Upper', icon: <IconCrossUp />, condition: 'break_upper' as ParallelCondition },
    { id: 'break-lower', label: 'Break Lower', icon: <IconCrossDown />, condition: 'break_lower' as ParallelCondition },
    { id: 'exit-any', label: 'Exit Any', icon: <IconExitAny />, condition: 'exit_any' as ParallelCondition },
    { id: 'enter-channel', label: 'Enter Channel', icon: <IconEnterZone />, condition: 'enter_channel' as ParallelCondition },
]

const _ITEMS_BY_SHAPE: Record<ShapeType, DockItemDef[]> = {
    line: LINE_ITEMS,
    rectangle: RECTANGLE_ITEMS,
    circle: CIRCLE_ITEMS,
    parallel: PARALLEL_ITEMS,
}

const SHAPE_LABELS: Record<ShapeType, string> = {
    line: 'Line',
    rectangle: 'Rectangle',
    circle: 'Circle',
    parallel: 'Parallel Lines',
}

// ─────────────────────────────────────────────────────────────────
// CONFIG & STYLES
// ─────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: DockConfig = {
    maxScale: 1.25,
    distance: 60,
    nudge: 12,
}

const barStyle: CSSProperties = {
    position: 'absolute',
    bottom: 68,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'flex-end',
    gap: 8,
    padding: '12px 20px',
    background: 'var(--kf-surface-2)',
    border: '1px solid var(--kf-border-1)',
    borderRadius: 16,
    boxShadow: '0 8px 24px rgba(var(--kf-deep-rgb), 0.3)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    transition: 'opacity 0.15s ease',
}

const backButtonStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    background: 'var(--kf-surface-3)',
    border: '1px solid var(--kf-border-1)',
    borderRadius: 8,
    color: 'var(--kf-text-muted)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
}

const shapeLabelStyle: CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--kf-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginRight: 8,
    alignSelf: 'center',
}

// ─────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────

export function StrategyBuilderBar({
    hasRootBlock,
    selectedShape,
    onDragStart,
    onDragStartWithSide,
    onAddExitClick,
    onSelectCondition,
    onClearSelection,

    selectedActionType,
    config: configOverride,
}: StrategyBuilderBarProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [mouseX, setMouseX] = useState<number | null>(null)

    const config: DockConfig = { ...DEFAULT_CONFIG, ...configOverride }
    const isShapeMode = selectedShape !== null && selectedShape !== undefined

    // Dock shows only action items (conditions are shown as icons on shape edges)
    // Filter to only entry actions - exit actions (stop loss, take profit, trailing stop)
    // only make sense as child actions on a buy, so we don't show them in the root dock
    const ENTRY_ACTIONS: DockItemDef[] = DEFAULT_ITEMS.filter(
        (item) => item.type === 'market' || item.type === 'limit'
    )
    const CHILD_ACTIONS: DockItemDef[] = DEFAULT_ITEMS.filter(
        (item) => item.type === 'stop_loss' || item.type === 'take_profit' || item.type === 'trailing_stop'
    )

    let items = ENTRY_ACTIONS
    if (selectedActionType && (selectedActionType.includes('market') || selectedActionType.includes('limit'))) {
        items = CHILD_ACTIONS
    }

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => setMouseX(e.clientX)
    const handleMouseLeave = () => setMouseX(null)

    const handleItemClick = (item: DockItemDef) => {
        if (item.condition && onSelectCondition) {
            onSelectCondition(item.condition)
        }
    }

    const handleDragStart = (e: DragEvent, item: DockItemDef) => {
        if (item.type) {
            // Set the block type MIME for TriggerPill drop zone
            e.dataTransfer.setData('application/krakenforge-block', item.type)
            e.dataTransfer.effectAllowed = 'copy'
            onDragStart?.(e, item.type)
            if (item.side) {
                onDragStartWithSide?.(e, item.type, item.side)
                e.dataTransfer.setData('application/krakenforge-side', item.side)
            }
        }
    }

    return (
        <div
            ref={containerRef}
            className="kf-floating-ui"
            style={barStyle}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            {/* Back button when in shape mode */}
            {isShapeMode && (
                <>
                    <button
                        type="button"
                        style={backButtonStyle}
                        onClick={onClearSelection}
                        title="Back to blocks"
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--kf-surface-4)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--kf-surface-3)' }}
                    >
                        <IconBack />
                    </button>
                    <div style={shapeLabelStyle}>{SHAPE_LABELS[selectedShape.type]}</div>
                    <div style={{ width: 1, height: 32, background: 'var(--kf-border-1)' }} />
                </>
            )}

            {/* Dock items */}
            {items.map((item) => (
                <DockItem
                    key={item.id}
                    mouseX={mouseX}
                    blockType={item.type ?? 'market'}
                    icon={item.icon}
                    label={item.label}
                    config={config}
                    onClick={() => handleItemClick(item)}
                    onDragStart={item.type ? (e) => handleDragStart(e, item) : undefined}
                />
            ))}

            {/* Add Exit button (only in default mode with root block) */}
            {!isShapeMode && hasRootBlock && (
                <>
                    <div style={{ width: 1, height: 40, background: 'var(--kf-border-1)', margin: '0 4px' }} />
                    <button
                        type="button"
                        style={{
                            padding: '8px 14px',
                            background: 'var(--kf-surface-4)',
                            border: '1px solid var(--kf-border-1)',
                            borderRadius: 10,
                            color: 'var(--kf-text)',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                        }}
                        onClick={onAddExitClick}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--kf-surface-5)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--kf-surface-4)' }}
                    >
                        + Add Exit
                    </button>
                </>
            )}
        </div>
    )
}

export default StrategyBuilderBar
