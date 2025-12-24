/**
 * useHasRootBlock Hook
 *
 * Detects whether any root block (Market or Limit) exists on the canvas.
 * Used to conditionally show exit-related UI elements.
 */

import { useMemo } from 'react'
import type { Node } from '@xyflow/react'

// Root block types that can have exits attached
const ROOT_BLOCK_TYPES = ['market', 'limit'] as const

type RootBlockType = (typeof ROOT_BLOCK_TYPES)[number]

/**
 * Hook to detect if any root block exists on the canvas.
 *
 * @param nodes - Array of nodes from ReactFlow
 * @returns boolean indicating if at least one root block exists
 */
export function useHasRootBlock(nodes: Node[]): boolean {
    return useMemo(() => {
        return nodes.some((node) => {
            const nodeType = node.type as string | undefined
            return ROOT_BLOCK_TYPES.includes(nodeType as RootBlockType)
        })
    }, [nodes])
}

/**
 * More detailed variant that returns counts and info.
 * Useful for debugging or more complex UI logic.
 */
export function useRootBlockInfo(nodes: Node[]) {
    return useMemo(() => {
        const rootBlocks = nodes.filter((node) => {
            const nodeType = node.type as string | undefined
            return ROOT_BLOCK_TYPES.includes(nodeType as RootBlockType)
        })

        return {
            hasRootBlock: rootBlocks.length > 0,
            rootBlockCount: rootBlocks.length,
            rootBlockIds: rootBlocks.map((n) => n.id),
            rootBlockTypes: rootBlocks.map((n) => n.type),
        }
    }, [nodes])
}

export default useHasRootBlock
