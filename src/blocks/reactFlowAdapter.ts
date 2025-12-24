import type { Edge, Node } from '@xyflow/react'

import type { Block, BlockKind, BlockRole, BlockSkin } from './types'
import type { BaseNodeData, OrderNodeData, StrategyNodeType } from '../components/nodes/types'

function isOrderNodeType(t: StrategyNodeType | null): t is Exclude<StrategyNodeType, 'entry'> {
  return t != null && t !== 'entry'
}

function roleForKind(kind: BlockKind): BlockRole {
  if (kind === 'entry') return 'entry'
  if (kind === 'take_profit' || kind === 'take_profit_limit' || kind === 'stop_loss' || kind === 'stop_loss_limit' || kind === 'trailing_stop' || kind === 'trailing_stop_limit') {
    return 'exit'
  }
  return 'standalone'
}

export function blocksFromReactFlow(nodes: Node[], edges: Edge[]): Block[] {
  const parentByChild = new Map<string, string>()
  for (const e of edges) {
    if (typeof e.source === 'string' && typeof e.target === 'string') {
      parentByChild.set(e.target, e.source)
    }
  }

  const blocks: Block[] = []

  for (const n of nodes) {
    const nodeType = (n.type ?? null) as StrategyNodeType | null

    if (!nodeType) {
      continue
    }

    if (nodeType === 'entry') {
      const data = (n.data as BaseNodeData | undefined) ?? { label: 'Entry' }
      blocks.push({
        id: n.id,
        kind: 'entry',
        role: 'entry',
        side: 'buy',
        label: data.label ?? 'Entry',
        active: true,
        anchor: { price: Number.NaN },
        allocation: { quantity: 0 },
      })
      continue
    }

    if (!isOrderNodeType(nodeType)) {
      continue
    }

    const data = (n.data as OrderNodeData | undefined) ?? ({} as OrderNodeData)

    const kind = nodeType as BlockKind
    const skin = (data as any).skin as BlockSkin | undefined

    const anchorPrice =
      typeof data.anchorPrice === 'number'
        ? data.anchorPrice
        : typeof data.limitPrice === 'number'
          ? data.limitPrice
          : typeof data.stopPrice === 'number'
            ? data.stopPrice
            : typeof data.triggerPrice === 'number'
              ? data.triggerPrice
              : Number.NaN

    blocks.push({
      id: n.id,
      kind,
      role: roleForKind(kind),
      side: data.side ?? 'buy',
      label: data.label ?? kind,
      active: Boolean(data.active),
      skin,
      anchor: {
        price: anchorPrice,
        timestamp: typeof data.anchorTimestamp === 'number' ? data.anchorTimestamp : undefined,
      },
      allocation: {
        quantity: typeof data.quantity === 'number' ? data.quantity : 0,
        closePercent: typeof data.closePercent === 'number' ? data.closePercent : undefined,
      },
      params: {
        postOnly: Boolean(data.postOnly),
        limitPrice: typeof data.limitPrice === 'number' ? data.limitPrice : undefined,
        stopPrice: typeof data.stopPrice === 'number' ? data.stopPrice : undefined,
        triggerPrice: typeof data.triggerPrice === 'number' ? data.triggerPrice : undefined,
        trailingOffset: typeof data.trailingOffset === 'number' ? data.trailingOffset : undefined,
        limitOffset: typeof data.limitOffset === 'number' ? data.limitOffset : undefined,
        totalQuantity: typeof data.totalQuantity === 'number' ? data.totalQuantity : undefined,
        visibleQuantity: typeof data.visibleQuantity === 'number' ? data.visibleQuantity : undefined,
      },
      parentId: (n.parentId as string | undefined) ?? parentByChild.get(n.id) ?? undefined,
      isChild: Boolean((data as any).isChild),
    })
  }

  return blocks
}

