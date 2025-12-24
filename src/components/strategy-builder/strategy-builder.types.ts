/**
 * Strategy Builder Types
 *
 * Shared types for the Strategy Builder floating dock and related components.
 */

import type { ReactNode, DragEvent } from 'react'

// ─────────────────────────────────────────────────────────────────
// BLOCK TYPES
// ─────────────────────────────────────────────────────────────────

/**
 * Root block types that can be placed from the dock.
 */
export type RootBlockType = 'market' | 'limit'

/**
 * Exit block types shown in the Exit Picker.
 */
export type ExitBlockType =
    | 'stop_loss'
    | 'stop_loss_limit'
    | 'take_profit'
    | 'take_profit_limit'
    | 'trailing_stop'
    | 'trailing_stop_limit'

export type BlockType = RootBlockType | ExitBlockType

// ─────────────────────────────────────────────────────────────────
// DOCK ITEM
// ─────────────────────────────────────────────────────────────────

export interface BlockDefinition {
    type: BlockType
    label: string
    icon: ReactNode
    isRoot: boolean
    description?: string
}

export interface DockItemProps {
    /** Current mouse X position (null when mouse is outside dock) */
    mouseX: number | null
    /** Block type for drag data */
    blockType: BlockType
    /** Icon to display */
    icon: ReactNode
    /** Label to display */
    label: string
    /** Called when drag starts */
    onDragStart?: (e: DragEvent, type: BlockType) => void
    /** Called on click */
    onClick?: (type: BlockType) => void
    /** Dock configuration (scale, distance, nudge) */
    config?: DockConfig
    /** Additional className */
    className?: string
}

// ─────────────────────────────────────────────────────────────────
// DOCK CONFIGURATION
// ─────────────────────────────────────────────────────────────────

export interface DockConfig {
    /** Maximum scale when cursor is directly over item (default: 1.8) */
    maxScale: number
    /** Radius of effect in pixels (default: 100) */
    distance: number
    /** How far items push apart horizontally in pixels (default: 35) */
    nudge: number
}

export const DEFAULT_DOCK_CONFIG: DockConfig = {
    maxScale: 1.8,
    distance: 100,
    nudge: 35,
}

// ─────────────────────────────────────────────────────────────────
// STRATEGY BUILDER BAR
// ─────────────────────────────────────────────────────────────────

/** Side of the trade: buy = long, sell = short */
export type BlockSide = 'buy' | 'sell'

/** Shape types that can have triggers attached */
export type ShapeType = 'line' | 'rectangle' | 'circle' | 'parallel'

/** Selected shape info passed to the dock */
export interface SelectedShape {
    type: ShapeType
    id: string
}

/** Trigger conditions for each shape type */
export type LineCondition = 'cross_up' | 'cross_down' | 'touch'
export type RectangleCondition =
    | 'exit_top' | 'exit_bottom' | 'exit_left' | 'exit_right' | 'exit_any'
    | 'enter_top' | 'enter_bottom' | 'enter_left' | 'enter_right' | 'enter_any'
    | 'enter_zone'
    | 'exit_side'
export type CircleCondition = 'enter' | 'exit' | 'touch_edge'
export type ParallelCondition = 'break_upper' | 'break_lower' | 'inside_channel' | 'enter_channel' | 'exit_any'

export type TriggerCondition = LineCondition | RectangleCondition | CircleCondition | ParallelCondition

/** Trigger action types */
export type TriggerActionType =
    | 'market_buy'
    | 'market_sell'
    | 'limit_buy'
    | 'limit_sell'
    | 'alert'
    | 'stop_loss'
    | 'stop_loss_limit'
    | 'take_profit'
    | 'take_profit_limit'
    | 'trailing_stop'
    | 'trailing_stop_limit'

export interface StrategyBuilderBarProps {
    /** Whether a root block exists on canvas (enables exit picker) */
    hasRootBlock: boolean
    /** Currently selected shape (null = show default dock) */
    selectedShape?: SelectedShape | null
    /** Called when user starts dragging a tile */
    onDragStart?: (e: DragEvent, type: BlockType) => void
    /** Called when user starts dragging with side info */
    onDragStartWithSide?: (e: DragEvent, type: BlockType, side: BlockSide) => void
    /** Called when Add Exit button is clicked */
    onAddExitClick?: () => void
    /** Called when user selects a trigger condition for the selected shape */
    onSelectCondition?: (condition: TriggerCondition) => void
    /** Called when user clears shape selection */
    onClearSelection?: () => void
    /** Currently selected action type (for context) */
    selectedActionType?: TriggerActionType | null
    /** Optional dock configuration */
    config?: Partial<DockConfig>
}

// ─────────────────────────────────────────────────────────────────
// EXIT PICKER
// ─────────────────────────────────────────────────────────────────

export interface ExitPickerProps {
    /** Whether picker is open */
    isOpen: boolean
    /** Called when picker closes */
    onClose: () => void
    /** Called when user selects an exit type */
    onSelectExit: (type: ExitBlockType) => void
    /** Optional: anchor element for positioning */
    anchorEl?: HTMLElement | null
}

// ─────────────────────────────────────────────────────────────────
// ACTION PICKER (for trigger conditions)
// ─────────────────────────────────────────────────────────────────

export interface ActionPickerProps {
    /** Whether picker is open */
    isOpen: boolean
    /** The condition being configured */
    condition: TriggerCondition | null
    /** Shape this trigger is for */
    shapeId: string | null
    /** Called when picker closes */
    onClose: () => void
    /** Called when user selects an action */
    onSelectAction: (action: TriggerActionType, config: ActionConfig) => void
}

export interface ActionConfig {
    size?: number
    sizeUnit?: 'usd' | 'base' | 'percent'
    leverage?: number
    side?: 'buy' | 'sell'
    limitPrice?: number
    stopPrice?: number
    triggerPrice?: number
    trailingOffset?: number
    trailingOffsetUnit?: 'percent' | 'price'
    limitOffset?: number
    closePercent?: number
    oneShot?: boolean
    message?: string
}

