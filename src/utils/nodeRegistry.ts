import type { NodeTypes } from '@xyflow/react'

import EntryNode from '../components/nodes/EntryNode'
import OrderNode from '../components/nodes/OrderNode'
import type { BaseNodeData, OrderNodeData, StrategyNodeType } from '../components/nodes/types'

export type NodeDefinition = {
  type: StrategyNodeType
  label: string
  defaultData: BaseNodeData | OrderNodeData
}

export const nodeDefinitions: NodeDefinition[] = [
  { type: 'entry', label: 'Entry', defaultData: { label: 'Start' } },
  {
    type: 'limit',
    label: 'Limit',
    defaultData: { label: 'Limit', side: 'buy', active: false, quantity: 0.01, postOnly: false },
  },
  { type: 'market', label: 'Market', defaultData: { label: 'Market', side: 'buy', active: false, quantity: 0.01 } },
  {
    type: 'stop_loss',
    label: 'Stop Loss',
    defaultData: { label: 'Stop Loss', side: 'sell', active: false, quantity: 0.01 },
  },
  {
    type: 'stop_loss_limit',
    label: 'Stop Loss Limit',
    defaultData: { label: 'Stop Loss Limit', side: 'sell', active: false, quantity: 0.01 },
  },
  {
    type: 'take_profit',
    label: 'Take Profit',
    defaultData: { label: 'Take Profit', side: 'sell', active: false, quantity: 0.01 },
  },
  {
    type: 'take_profit_limit',
    label: 'Take Profit Limit',
    defaultData: { label: 'Take Profit Limit', side: 'sell', active: false, quantity: 0.01 },
  },
  {
    type: 'iceberg',
    label: 'Iceberg',
    defaultData: {
      label: 'Iceberg',
      side: 'buy',
      active: false,
      quantity: 0,
      totalQuantity: 0.05,
      visibleQuantity: 0.01,
    },
  },
  {
    type: 'trailing_stop',
    label: 'Trailing Stop',
    defaultData: { label: 'Trailing Stop', side: 'sell', active: false, quantity: 0.01, trailingOffset: 50, closePercent: 100 },
  },
  {
    type: 'trailing_stop_limit',
    label: 'Trailing Stop Limit',
    defaultData: {
      label: 'Trailing Stop Limit',
      side: 'sell',
      active: false,
      quantity: 0.01,
      trailingOffset: 50,
      limitOffset: 25,
      closePercent: 100,
    },
  },
]

export const nodeTypes = {
  entry: EntryNode,
  limit: OrderNode,
  market: OrderNode,
  stop_loss: OrderNode,
  stop_loss_limit: OrderNode,
  take_profit: OrderNode,
  take_profit_limit: OrderNode,
  iceberg: OrderNode,
  trailing_stop: OrderNode,
  trailing_stop_limit: OrderNode,
} satisfies NodeTypes

export function getNodeDefinition(type: StrategyNodeType): NodeDefinition {
  const def = nodeDefinitions.find((d) => d.type === type)
  if (!def) {
    throw new Error(`Unknown node type: ${type}`)
  }
  return def
}
