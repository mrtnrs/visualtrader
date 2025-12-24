/**
 * Strategy Builder Components
 *
 * Barrel export for all strategy builder components.
 */

// Components
export { StrategyBuilderBar } from './StrategyBuilderBar'
export { DockItem } from './DockItem'
export { ExitPicker } from './ExitPicker'

// Hooks
export { useHasRootBlock, useRootBlockInfo } from './useHasRootBlock'

// Types
export type {
    BlockType,
    RootBlockType,
    ExitBlockType,
    BlockSide,
    BlockDefinition,
    DockConfig,
    DockItemProps,
    StrategyBuilderBarProps,
    ExitPickerProps,
    ShapeType,
    SelectedShape,
    TriggerCondition,
    LineCondition,
    RectangleCondition,
    CircleCondition,
    ParallelCondition,
    TriggerActionType,
    ActionPickerProps,
    ActionConfig,
} from './strategy-builder.types'

// Constants
export { DEFAULT_DOCK_CONFIG } from './strategy-builder.types'
