/**
 * ShapeTriggerOptionButtons
 *
 * Shows trigger condition icons and action blocks positioned around shape edges.
 * 
 * For SELECTED shapes: shows available trigger options based on price state
 * For ALL shapes with triggers: shows the condition icon + action blocks (dock-styled)
 */

import { useMemo, type CSSProperties } from 'react'

import type { TriggerCondition, ShapeTrigger } from '../../utils/strategyStorage'
import type { ChartDims, PriceDomain } from '../../utils/chartMapping'
import {
    computeLineBoundsPx,
    computeCircleBoundsPx,
    computeRectangleBoundsPx,
    computeParallelBoundsPx,
    getLinePriceState,
    getCirclePriceState,
    getRectanglePriceState,
    getParallelPriceState,
} from '../../utils/shapeGeometry'
import type {
    ActivationLine,
    CircleAnnotation,
    RectangleAnnotation,
    ParallelLinesAnnotation,
} from '../../utils/strategyStorage'
import { getConditionIcon } from '../strategy-builder/TriggerIcons'

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

type Anchor = 'top' | 'bottom' | 'left' | 'right' | 'center'

type PositionedButton = {
    condition: TriggerCondition
    x: number
    y: number
    anchor: Anchor
    hasActiveTrigger: boolean
    trigger?: ShapeTrigger
}



function getConditionLabel(condition: TriggerCondition): string {
    const labels: Record<string, string> = {
        cross_up: 'Cross Up',
        cross_down: 'Cross Down',
        touch: 'Touch',
        exit_top: 'Exit Top',
        exit_bottom: 'Exit Bottom',
        exit_left: 'Exit Left',
        exit_right: 'Exit Right',
        exit_any: 'Exit Any',
        enter_top: 'Enter Top',
        enter_bottom: 'Enter Bottom',
        enter_left: 'Enter Left',
        enter_right: 'Enter Right',
        enter_any: 'Enter Any',
        enter: 'Enter',
        exit: 'Exit',
        touch_edge: 'Touch Edge',
        break_upper: 'Break Upper',
        break_lower: 'Break Lower',
        enter_channel: 'Enter Channel',
        exit_side: 'Exit Side',
        enter_zone: 'Enter Zone',
        inside_channel: 'Inside Channel',
    }
    return labels[condition] || condition
}

function conditionToAnchor(condition: TriggerCondition): Anchor {
    if (condition.includes('_top') || condition === 'cross_up' || condition === 'break_upper') return 'top'
    if (condition.includes('_bottom') || condition === 'cross_down' || condition === 'break_lower') return 'bottom'
    if (condition.includes('_left')) return 'left'
    if (condition.includes('_right')) return 'right'
    if (condition === 'exit' || condition === 'enter') return 'top'
    if (condition === 'touch_edge') return 'right'
    return 'center'
}

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────

export default function ShapeTriggerOptionButtons({
    selectedShape,
    activationLines,
    circles,
    rectangles,
    parallelLines,
    allTriggers,
    lastPrice,
    chartDims,
    domain,
    timeWindowMs,
    timeCenter,
    onSelectCondition,
}: {
    selectedShape: { type: 'line' | 'circle' | 'rectangle' | 'parallel'; id: string } | null
    activationLines: ActivationLine[]
    circles: CircleAnnotation[]
    rectangles: RectangleAnnotation[]
    parallelLines: ParallelLinesAnnotation[]
    allTriggers: ShapeTrigger[]
    lastPrice: number | null
    chartDims: ChartDims
    domain: PriceDomain
    timeWindowMs: number
    timeCenter: number
    onSelectCondition: (condition: TriggerCondition) => void
    onSelectAction?: (triggerId: string, actionId: string) => void
}) {



    // Buttons for selected shape
    const existingConditions = useMemo(() => {
        return new Set(allTriggers.filter(t => t.shapeId === selectedShape?.id).map(t => t.condition))
    }, [allTriggers, selectedShape?.id])

    const selectedShapeButtons = useMemo((): PositionedButton[] => {
        if (!selectedShape || typeof lastPrice !== 'number') {
            return []
        }

        const currentTs = Date.now()
        const thresholdPrice = (domain.max - domain.min) * 0.01

        let bounds: { x: number; y: number; width: number; height: number } | null = null
        let conditions: { condition: TriggerCondition; anchor: Anchor }[] = []

        if (selectedShape.type === 'line') {
            const line = activationLines.find((l) => l.id === selectedShape.id)
            if (!line) return []
            bounds = computeLineBoundsPx(line, timeCenter, timeWindowMs, chartDims, domain)
            const state = getLinePriceState(line, lastPrice, currentTs, thresholdPrice)

            if (state.state === 'above') {
                conditions = [{ condition: 'cross_down', anchor: 'bottom' }]
            } else if (state.state === 'below') {
                conditions = [{ condition: 'cross_up', anchor: 'top' }]
            }
            conditions.push({ condition: 'touch', anchor: 'center' })
        }

        if (selectedShape.type === 'circle') {
            const circle = circles.find((c) => c.id === selectedShape.id)
            if (!circle) return []
            bounds = computeCircleBoundsPx(circle, timeCenter, timeWindowMs, chartDims, domain)
            const state = getCirclePriceState(circle, lastPrice, currentTs)

            if (state.state === 'inside') {
                conditions = [{ condition: 'exit', anchor: 'top' }]
            } else {
                conditions = [{ condition: 'enter', anchor: 'top' }]
            }
            conditions.push({ condition: 'touch_edge', anchor: 'right' })
        }

        if (selectedShape.type === 'rectangle') {
            const rect = rectangles.find((r) => r.id === selectedShape.id)
            if (!rect) return []
            bounds = computeRectangleBoundsPx(rect, timeCenter, timeWindowMs, chartDims, domain)
            const state = getRectanglePriceState(rect, lastPrice, currentTs)

            if (state.state === 'inside') {
                conditions = [
                    { condition: 'exit_top', anchor: 'top' },
                    { condition: 'exit_bottom', anchor: 'bottom' },
                    { condition: 'exit_left', anchor: 'left' },
                    { condition: 'exit_right', anchor: 'right' },
                    { condition: 'exit_any', anchor: 'center' },
                ]
            } else {
                conditions = [
                    { condition: 'enter_top', anchor: 'top' },
                    { condition: 'enter_bottom', anchor: 'bottom' },
                    { condition: 'enter_left', anchor: 'left' },
                    { condition: 'enter_right', anchor: 'right' },
                    { condition: 'enter_any', anchor: 'center' },
                ]
            }
        }

        if (selectedShape.type === 'parallel') {
            const parallel = parallelLines.find((p) => p.id === selectedShape.id)
            if (!parallel) return []
            bounds = computeParallelBoundsPx(parallel, timeCenter, timeWindowMs, chartDims, domain)
            const state = getParallelPriceState(parallel, lastPrice, currentTs, thresholdPrice)

            if (state.state === 'in_channel') {
                conditions = [
                    { condition: 'break_upper', anchor: 'top' },
                    { condition: 'break_lower', anchor: 'bottom' },
                    { condition: 'exit_any', anchor: 'center' },
                ]
            } else {
                conditions = [{ condition: 'enter_channel', anchor: 'center' }]
            }
        }

        if (!bounds) return []

        return conditions.map(({ condition, anchor }) => {
            const cx = bounds!.x + bounds!.width / 2
            const cy = bounds!.y + bounds!.height / 2

            let x = cx
            let y = cy
            const edgeOffset = 0

            switch (anchor) {
                case 'top':
                    y = bounds!.y - edgeOffset
                    break
                case 'bottom':
                    y = bounds!.y + bounds.height + edgeOffset
                    break
                case 'left':
                    x = bounds!.x - edgeOffset
                    break
                case 'right':
                    x = bounds!.x + bounds!.width + edgeOffset
                    break
            }

            const trigger = allTriggers.find(t => t.shapeId === selectedShape.id && t.condition === condition)
            return { condition, x, y, anchor, hasActiveTrigger: existingConditions.has(condition), trigger }
        })
    }, [activationLines, allTriggers, chartDims, circles, domain, existingConditions, lastPrice, parallelLines, rectangles, selectedShape, timeCenter, timeWindowMs])

    // ─────────────────────────────────────────────────────────────────
    // STYLES
    // ─────────────────────────────────────────────────────────────────

    const iconBtnStyle: CSSProperties = {
        position: 'absolute',
        width: 28,
        height: 28,
        borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.2)',
        background: 'rgba(var(--kf-deep-rgb), 0.75)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        color: 'var(--kf-text)',
        cursor: 'pointer',
        display: 'grid',
        placeItems: 'center',
        transition: 'all 0.15s ease',
        zIndex: 160,
        pointerEvents: 'auto',
    }

    const activeIconBtnStyle: CSSProperties = {
        ...iconBtnStyle,
        background: 'rgba(var(--kf-deep-rgb), 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.4)',
    }

    return (
        <>
            {/* Selected shape option buttons (Add Trigger) */}
            {selectedShapeButtons.map((btn) => (
                <div key={btn.condition}>
                    <div
                        className="kf-floating-ui"
                        style={{
                            ...(btn.hasActiveTrigger ? activeIconBtnStyle : iconBtnStyle),
                            // Hide add button if trigger exists (let PillManager show the trigger)
                            display: btn.hasActiveTrigger ? 'none' : 'grid',
                            left: btn.x,
                            top: btn.y,
                            transform: 'translate(-50%, -50%)',
                        }}
                        onClick={() => !btn.hasActiveTrigger && onSelectCondition(btn.condition)}
                        title={getConditionLabel(btn.condition)}
                    >
                        {getConditionIcon(btn.condition, 16)}
                    </div>
                </div>
            ))}
        </>
    )
}

// Export position calculation for TriggerPillManager to use
export function getIconPositionForCondition(
    condition: TriggerCondition,
    bounds: { x: number; y: number; width: number; height: number },
): { x: number; y: number; anchor: Anchor } {
    const cx = bounds.x + bounds.width / 2
    const cy = bounds.y + bounds.height / 2
    const edgeOffset = 16

    const anchor = conditionToAnchor(condition)

    let x = cx
    let y = cy

    switch (anchor) {
        case 'top':
            y = bounds.y - edgeOffset
            break
        case 'bottom':
            y = bounds.y + bounds.height + edgeOffset
            break
        case 'left':
            x = bounds.x - edgeOffset
            break
        case 'right':
            x = bounds.x + bounds.width + edgeOffset
            break
    }

    return { x, y, anchor }
}
