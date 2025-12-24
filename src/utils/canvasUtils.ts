import type { ExitBlockType } from '../components/strategy-builder'

/**
 * Calculate a "nice" step value for axis ticks
 */
export function niceStep(rawStep: number) {
    if (!Number.isFinite(rawStep) || rawStep <= 0) {
        return 1
    }
    const exp = Math.floor(Math.log10(rawStep))
    const base = Math.pow(10, exp)
    const frac = rawStep / base
    const niceFrac = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10
    return niceFrac * base
}

/**
 * Calculate distance from a point to a line segment
 */
export function distancePointToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
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

/**
 * Generate a unique node ID
 */
export function getId() {
    return `node_${nodeId++}`
}

/**
 * Reset node ID counter (used when loading snapshots)
 */
export function resetNodeId() {
    nodeId = 0
}

/**
 * Check if a node type is a root order type (market or limit)
 */
export function isRootNodeType(t: string): t is 'market' | 'limit' {
    return t === 'market' || t === 'limit'
}

/**
 * Check if a node type is an exit order type
 */
export function isExitNodeType(t: string): t is ExitBlockType {
    return (
        t === 'stop_loss' ||
        t === 'stop_loss_limit' ||
        t === 'take_profit' ||
        t === 'take_profit_limit' ||
        t === 'trailing_stop' ||
        t === 'trailing_stop_limit'
    )
}
