/**
 * TriggerIcons
 *
 * Shared icon components for trigger conditions.
 * Used by StrategyBuilderBar and ShapeTriggerOptionButtons.
 */

import type { ReactNode } from 'react'
import type { TriggerCondition } from '../../utils/strategyStorage'

// ─────────────────────────────────────────────────────────────────
// LINE CONDITION ICONS
// ─────────────────────────────────────────────────────────────────

export function IconCrossUp({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 16l8-8 8 8" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3" />
        </svg>
    )
}

export function IconCrossDown({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 8l8 8 8-8" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3" />
        </svg>
    )
}

export function IconTouch({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="3" fill="#f59e0b" />
            <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    )
}

// ─────────────────────────────────────────────────────────────────
// RECTANGLE CONDITION ICONS
// ─────────────────────────────────────────────────────────────────

export function IconExitTop({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="4" y="8" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />
            <path d="M12 8V3" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M9 5l3-3 3 3" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

export function IconExitBottom({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="4" y="6" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />
            <path d="M12 16v5" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M9 19l3 3 3-3" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

export function IconExitLeft({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="8" y="4" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />
            <path d="M8 12H3" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M5 9l-3 3 3 3" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

export function IconExitRight({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="4" y="4" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />
            <path d="M16 12h5" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M19 9l3 3-3 3" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

export function IconEnterTop({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" fill="#22c55e" fillOpacity="0.15" />
            <path d="M12 2v8" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M9 7l3 3 3-3" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

export function IconEnterBottom({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="4" y="4" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" fill="#22c55e" fillOpacity="0.15" />
            <path d="M12 22v-8" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M9 17l3-3 3 3" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

export function IconEnterLeft({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="10" y="4" width="10" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" fill="#22c55e" fillOpacity="0.15" />
            <path d="M2 12h8" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M7 9l3 3-3 3" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

export function IconEnterRight({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="4" y="4" width="10" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" fill="#22c55e" fillOpacity="0.15" />
            <path d="M22 12h-8" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M17 9l-3 3 3 3" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

export function IconEnterAny({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="6" y="6" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" fill="#22c55e" fillOpacity="0.2" />
            <path d="M12 2v4" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 18v4" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
            <path d="M2 12h4" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
            <path d="M18 12h4" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
        </svg>
    )
}

export function IconExitAny({ size = 20 }: { size?: number }) {
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

// ─────────────────────────────────────────────────────────────────
// CIRCLE CONDITION ICONS
// ─────────────────────────────────────────────────────────────────

export function IconEnterCircle({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" fill="#22c55e" fillOpacity="0.15" />
            <path d="M2 12h6" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
            <path d="M6 9l3 3-3 3" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

export function IconExitCircle({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />
            <path d="M16 12h6" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
            <path d="M20 9l3 3-3 3" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

export function IconTouchEdge({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <circle cx="19" cy="12" r="3" fill="#f59e0b" />
        </svg>
    )
}

// ─────────────────────────────────────────────────────────────────
// PARALLEL LINE CONDITION ICONS
// ─────────────────────────────────────────────────────────────────

export function IconBreakUpper({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <line x1="2" y1="8" x2="22" y2="8" stroke="currentColor" strokeWidth="1.5" />
            <line x1="2" y1="16" x2="22" y2="16" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 8V3" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M9 5l3-3 3 3" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

export function IconBreakLower({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <line x1="2" y1="8" x2="22" y2="8" stroke="currentColor" strokeWidth="1.5" />
            <line x1="2" y1="16" x2="22" y2="16" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 16v5" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M9 19l3 3 3-3" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

export function IconEnterChannel({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="2" y="8" width="20" height="8" fill="#22c55e" fillOpacity="0.15" />
            <line x1="2" y1="8" x2="22" y2="8" stroke="currentColor" strokeWidth="1.5" />
            <line x1="2" y1="16" x2="22" y2="16" stroke="currentColor" strokeWidth="1.5" />
            <path d="M2 12h6" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
            <path d="M6 9l3 3-3 3" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

// ─────────────────────────────────────────────────────────────────
// HELPER: GET ICON BY CONDITION
// ─────────────────────────────────────────────────────────────────

export function getConditionIcon(condition: TriggerCondition, size = 16): ReactNode {
    switch (condition) {
        // Line
        case 'cross_up':
            return <IconCrossUp size={size} />
        case 'cross_down':
            return <IconCrossDown size={size} />
        case 'touch':
            return <IconTouch size={size} />

        // Rectangle exits
        case 'exit_top':
            return <IconExitTop size={size} />
        case 'exit_bottom':
            return <IconExitBottom size={size} />
        case 'exit_left':
            return <IconExitLeft size={size} />
        case 'exit_right':
            return <IconExitRight size={size} />
        case 'exit_any':
            return <IconExitAny size={size} />

        // Rectangle enters
        case 'enter_top':
            return <IconEnterTop size={size} />
        case 'enter_bottom':
            return <IconEnterBottom size={size} />
        case 'enter_left':
            return <IconEnterLeft size={size} />
        case 'enter_right':
            return <IconEnterRight size={size} />
        case 'enter_any':
            return <IconEnterAny size={size} />

        // Circle
        case 'enter':
            return <IconEnterCircle size={size} />
        case 'exit':
            return <IconExitCircle size={size} />
        case 'touch_edge':
            return <IconTouchEdge size={size} />

        // Parallel
        case 'break_upper':
            return <IconBreakUpper size={size} />
        case 'break_lower':
            return <IconBreakLower size={size} />
        case 'enter_channel':
            return <IconEnterChannel size={size} />

        default:
            return <IconExitAny size={size} />
    }
}

// ─────────────────────────────────────────────────────────────────
// ACTION ICONS
// ─────────────────────────────────────────────────────────────────

export function IconMarketBuy({ size = 16 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 20V4" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M5 11l7-7 7 7" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

export function IconMarketSell({ size = 16 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 4v16" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M5 13l7 7 7-7" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

export function IconLimitBuy({ size = 16 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 8h16" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 2" />
            <path d="M12 18V10" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M8 14l4-4 4 4" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

export function IconLimitSell({ size = 16 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 16h16" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 2" />
            <path d="M12 6v8" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M8 10l4 4 4-4" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}


export function IconStopLoss({ size = 16 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M7 4h10l3 3v10l-3 3H7l-3-3V7l3-3z" stroke="#ef4444" strokeWidth="2" strokeLinejoin="round" fill="#ef4444" fillOpacity="0.12" />
            <path d="M8 12h8" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
        </svg>
    )
}

export function IconTakeProfit({ size = 16 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="8" stroke="#22c55e" strokeWidth="2" fill="#22c55e" fillOpacity="0.10" />
            <circle cx="12" cy="12" r="3" stroke="#22c55e" strokeWidth="2" fill="none" />
        </svg>
    )
}

export function IconTrailingStop({ size = 16 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 15c2-4 4-6 7-7 3-1 5 0 5 0" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M6 19c2-3 5-5 8-6" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
            <circle cx="18" cy="8" r="2" fill="#38bdf8" />
        </svg>
    )
}

export function getActionIcon(actionType: string, size = 14): ReactNode {
    switch (actionType) {
        case 'market_buy':
        case 'limit_buy':
            return <IconMarketBuy size={size} />
        case 'market_sell':
        case 'limit_sell':
            return <IconMarketSell size={size} />
        case 'stop_loss':
        case 'stop_loss_limit':
            return <IconStopLoss size={size} />
        case 'take_profit':
        case 'take_profit_limit':
            return <IconTakeProfit size={size} />
        case 'trailing_stop':
        case 'trailing_stop_limit':
            return <IconTrailingStop size={size} />
        default:
            return <IconMarketBuy size={size} />
    }
}

// ─────────────────────────────────────────────────────────────────
// UTILITY ICONS
// ─────────────────────────────────────────────────────────────────

export function IconTrash({ size = 14 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4.5 5.2V12.4c0 0.9 0.7 1.6 1.6 1.6h3.8c0.9 0 1.6-0.7 1.6-1.6V5.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M3.8 5.2H12.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M6.2 5.2V4.1c0-0.7 0.6-1.3 1.3-1.3h1c0.7 0 1.3 0.6 1.3 1.3V5.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M6.6 7.2V12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.85" />
            <path d="M9.4 7.2V12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.85" />
        </svg>
    )
}

export function IconSettings({ size = 14 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 10.4C9.32548 10.4 10.4 9.32548 10.4 8C10.4 6.67452 9.32548 5.6 8 5.6C6.67452 5.6 5.6 6.67452 5.6 8C5.6 9.32548 6.67452 10.4 8 10.4Z" stroke="currentColor" strokeWidth="1.2" />
            <path d="M12.9 9.8C12.95 9.5 13 9.25 13 9V7C13 6.75 12.95 6.5 12.9 6.2L14.7 4.8C14.85 4.65 14.9 4.45 14.8 4.25L13.2 1.45C13.1 1.25 12.9 1.15 12.7 1.25L10.6 2.1C10.15 1.75 9.65 1.5 9.15 1.3L8.85 0.1C8.8 0.05 8.65 0 8.5 0H5.5C5.35 0 5.2 0.05 5.15 0.1L4.85 1.3C4.35 1.5 3.85 1.75 3.4 2.1L1.3 1.25C1.1 1.15 0.9 1.25 0.8 1.45L-0.8 4.25C-0.9 4.45 -0.85 4.65 -0.7 4.8L1.1 6.2C1.05 6.5 1 6.75 1 7V9C1 9.25 1.05 9.5 1.1 9.8L-0.7 11.2C-0.75 11.35 -0.8 11.55 -0.8 11.75L0.8 14.55C0.9 14.75 1.1 14.85 1.3 14.75L3.4 13.9C3.85 14.25 4.35 14.5 4.85 14.7L5.15 15.9C5.2 15.95 5.35 16 5.5 16H8.5C8.65 16 8.8 15.95 8.85 15.9L9.15 14.7C9.65 14.5 10.15 14.25 10.6 13.9L12.7 14.75C12.9 14.85 13.1 14.75 13.2 14.55L14.8 11.75C14.9 11.55 14.85 11.35 14.7 11.2L12.9 9.8ZM8 8.8C7.55817 8.8 7.2 8.44183 7.2 8C7.2 7.55817 7.55817 7.2 8 7.2C8.44183 7.2 8.8 7.55817 8.8 8C8.8 8.44183 8.44183 8.8 8 8.8Z" transform="translate(1 1) scale(0.87)" stroke="currentColor" strokeWidth="1.2" opacity="0.85" />
        </svg>
    )
}

// ─────────────────────────────────────────────────────────────────
// DOCK-STYLE PRIMITIVES (Copied from StrategyBuilderBar)
// ─────────────────────────────────────────────────────────────────

export function IconMarket({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.15" />
        </svg>
    )
}

export function IconLimit({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 2" />
            <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.15" />
        </svg>
    )
}

export function IconLong({ size = 16 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 20V4" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" />
            <path d="M5 11l7-7 7 7" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

export function IconShort({ size = 16 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 4v16" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
            <path d="M5 13l7 7 7-7" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

export function IconPower({ size = 14 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 1V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M4.5 3.5C2.5 4.5 1.2 6.6 1.2 9C1.2 12.8 4.2 15.8 8 15.8C11.8 15.8 14.8 12.8 14.8 9C14.8 6.6 13.5 4.5 11.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    )
}

export function IconArrowRight({ size = 14 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 8h10M10 5l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

/**
 * Returns dock-style label and icon for action types.
 * Matches exact wording from StrategyBuilderBar dock items.
 */
export function getActionDockInfo(actionType: string, side?: string | null, size = 24): { label: string; icon: ReactNode } {
    const isBuy = side === 'buy' || actionType.includes('buy')
    const isSell = side === 'sell' || actionType.includes('sell')

    switch (actionType) {
        case 'market':
        case 'market_buy':
            return {
                label: 'Market Long',
                icon: <><IconMarket size={size} /><IconLong size={size * 0.75} /></>
            }
        case 'market_sell':
            return {
                label: 'Market Short',
                icon: <><IconMarket size={size} /><IconShort size={size * 0.75} /></>
            }

        case 'limit':
        case 'limit_buy':
            return {
                label: 'Limit Long',
                icon: <><IconLimit size={size} /><IconLong size={size * 0.75} /></>
            }
        case 'limit_sell':
            return {
                label: 'Limit Short',
                icon: <><IconLimit size={size} /><IconShort size={size * 0.75} /></>
            }

        case 'stop_loss':
        case 'stop_loss_market':
        case 'stop_loss_limit':
            return { label: 'Stop Loss', icon: <IconStopLoss size={size} /> }

        case 'take_profit':
        case 'take_profit_limit':
            return { label: 'Take Profit', icon: <IconTakeProfit size={size} /> }

        case 'trailing_stop':
        case 'trailing_stop_limit':
            return { label: 'Trailing Stop', icon: <IconTrailingStop size={size} /> }

        case 'alert':
            return { label: 'Alert', icon: <IconMarket size={size} /> }

        default:
            if (isBuy) return { label: 'Market Long', icon: <><IconMarket size={size} /><IconLong size={size * 0.75} /></> }
            if (isSell) return { label: 'Market Short', icon: <><IconMarket size={size} /><IconShort size={size * 0.75} /></> }
            return { label: actionType, icon: <IconMarket size={size} /> }
    }
}
