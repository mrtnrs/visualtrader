import { memo } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'

import type { BaseNodeData } from './types'


type EntryNodeData = BaseNodeData

type EntryNodeType = Node<EntryNodeData, 'entry'>

function EntryNode({ data, selected }: NodeProps<EntryNodeType>) {


  return (
    <div
      style={{
        minWidth: 180,
        borderRadius: 12,
        border: selected ? '2px solid #60a5fa' : '1px solid var(--kf-border-2)',
        background: 'var(--kf-surface-3)',
        color: 'var(--kf-text)',
        padding: 12,
        boxShadow: '0 10px 25px rgba(var(--kf-deep-rgb), 0.55)',
      }}
    >
      <div style={{ fontSize: 12, color: 'var(--kf-text-muted)', marginBottom: 6 }}>Entry</div>
      <div style={{ fontWeight: 700 }}>{data.label}</div>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}

export default memo(EntryNode)
