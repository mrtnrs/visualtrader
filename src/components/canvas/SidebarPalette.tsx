import type { DragEvent } from 'react'

import type { StrategyNodeType } from '../nodes/types'
import { nodeDefinitions } from '../../utils/nodeRegistry'


const DRAG_MIME = 'application/krakenforge-node'

export function getDraggedNodeType(event: DragEvent): StrategyNodeType | null {
  const type = event.dataTransfer.getData(DRAG_MIME) || event.dataTransfer.getData('text/plain')
  if (!type) {
    return null
  }
  return type as StrategyNodeType
}

export default function SidebarPalette({ onCollapse }: { onCollapse?: () => void }) {


  const onDragStart = (event: DragEvent, type: StrategyNodeType) => {
    event.dataTransfer.setData(DRAG_MIME, type)
    event.dataTransfer.setData('text/plain', type)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <aside
      style={{
        width: '100%',
        height: '100%',
        border: '1px solid var(--kf-border-1)',
        borderRadius: 14,
        background: 'var(--kf-surface-2)',
        color: 'var(--kf-text)',
        padding: 12,
        overflow: 'auto',
        boxShadow: '0 18px 50px rgba(var(--kf-deep-rgb), 0.65)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
        <div style={{ fontWeight: 700 }}>Blocks</div>
        {onCollapse ? (
          <button
            type="button"
            onClick={onCollapse}
            style={{
              height: 28,
              borderRadius: 10,
              border: '1px solid var(--kf-border-2)',
              background: 'var(--kf-surface-3)',
              color: 'var(--kf-text)',
              padding: '0 10px',
              cursor: 'pointer',
              fontWeight: 800,
            }}
            title="Collapse Blocks panel"
          >
            Collapse
          </button>
        ) : null}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {nodeDefinitions.map((d) => (
          <div
            key={d.type}
            draggable
            onDragStart={(e) => onDragStart(e, d.type)}
            style={{
              borderRadius: 12,
              border: '1px solid var(--kf-border-1)',
              background: 'var(--kf-surface-3)',
              padding: 10,
              cursor: 'grab',
            }}
          >
            <div style={{ fontWeight: 700 }}>{d.label}</div>
            <div style={{ fontSize: 12, color: 'var(--kf-text-muted)' }}>{d.type}</div>
          </div>
        ))}
      </div>
    </aside>
  )
}

export { DRAG_MIME }
