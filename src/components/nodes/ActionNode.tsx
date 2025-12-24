import { memo } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'

import type { BaseNodeData } from './types'


type ActionNodeData = BaseNodeData

type ActionNodeType = Node<ActionNodeData, 'action'>

function ActionNode({ data, selected }: NodeProps<ActionNodeType>) {


  return (
    <div
      style={{
        minWidth: 200,
        borderRadius: 12,
        border: selected ? '2px solid #f59e0b' : '1px solid var(--kf-border-2)',
        background: 'var(--kf-surface-3)',
        color: 'var(--kf-text)',
        padding: 12,
        boxShadow: '0 10px 25px rgba(var(--kf-deep-rgb), 0.55)',
      }}
    >
      <div style={{ fontSize: 12, color: 'var(--kf-text-muted)', marginBottom: 6 }}>Action</div>
      <div style={{ fontWeight: 700 }}>{data.label}</div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  )
}

export default memo(ActionNode)
