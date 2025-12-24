import { useCallback, useMemo, useState, type CSSProperties, type DragEvent } from 'react'
import type { ShapeTrigger } from '../../utils/strategyStorage'
import { getConditionIcon, getActionDockInfo, IconSettings, IconTrash, IconPower, IconArrowRight } from '../strategy-builder/TriggerIcons'

export type TriggerPillAnchor = 'top' | 'bottom' | 'left' | 'right' | 'center'

export default function TriggerPill({
  trigger,
  position,
  anchor,
  expanded,
  isSelected,
  isShapeSelected,
  disabled,
  onSelect,
  onDropAction,
  onDropChildAction,
  onRemoveTrigger,
  onToggleActive,
  onEditAction,
  onClickBadge,
  selectedActionId: _unusedSelectedActionId,
  onSelectAction,
  onPrimaryActionEl,
}: {
  trigger: ShapeTrigger
  position: { x: number; y: number }
  anchor: TriggerPillAnchor
  expanded: boolean
  isSelected: boolean // Action Block selected
  isShapeSelected?: boolean // Shape selected
  disabled?: boolean
  onSelect: (e: React.MouseEvent) => void
  collapsedCount?: number
  onDropAction: (triggerId: string, blockType: string, side: string | null) => void
  onDropChildAction: (triggerId: string, parentActionId: string, blockType: string, side: string | null) => void
  onRemoveTrigger: (triggerId: string) => void
  onToggleActive: (triggerId: string) => void
  onEditAction: (triggerId: string, actionId: string) => void
  onClickBadge?: (shapeId: string) => void
  selectedActionId: string | null
  onSelectAction: (actionId: string | null) => void
  onPrimaryActionEl?: (triggerId: string, el: HTMLDivElement | null) => void
}) {
  void _unusedSelectedActionId // suppress unused warning
  const [dropHover, setDropHover] = useState(false)

  const actionBlockRef = useCallback(
    (el: HTMLDivElement | null) => {
      onPrimaryActionEl?.(trigger.id, el)
    },
    [onPrimaryActionEl, trigger.id],
  )

  // Position & Layout logic based on anchor direction
  const { transform, flexDirection, arrowRotation } = useMemo(() => {
    switch (anchor) {
      case 'top':
        return {
          transform: 'translate(-50%, -100%)',
          flexDirection: 'column-reverse' as const,
          arrowRotation: -90
        }
      case 'left':
        return {
          transform: 'translate(-100%, -50%)',
          flexDirection: 'row-reverse' as const,
          arrowRotation: 180
        }
      case 'right':
        return {
          transform: 'translate(0%, -50%)',
          flexDirection: 'row' as const,
          arrowRotation: 0
        }
      case 'bottom':
      default:
        return {
          transform: 'translate(-50%, 0%)',
          flexDirection: 'column' as const,
          arrowRotation: 90
        }
    }
  }, [anchor])

  const wrapStyle: CSSProperties = {
    position: 'absolute',
    left: position.x,
    top: position.y,
    transform,
    zIndex: 160,
    pointerEvents: disabled ? 'none' : 'auto',
    display: 'flex',
    flexDirection,
    alignItems: 'center',
    gap: 2, // Tight gap
    opacity: disabled ? 0.4 : 1,
    filter: disabled ? 'grayscale(1)' : 'none',
  }


  const triggerBadgeStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 8,
    // Flat color, no transparency (surface-3 is usually solid, fallback to dark grey)
    background: 'var(--kf-surface-3, #2a2a30)',
    border: '1px solid var(--kf-border-1)',
    color: 'var(--kf-text)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
    transition: 'all 0.15s ease',
    opacity: 1,
  }

  // 2. Connector Arrow
  const arrowStyle: CSSProperties = {
    color: isShapeSelected ? '#fff' : 'var(--kf-text-muted)',
    opacity: isShapeSelected ? 1 : 0.6,
    transform: `rotate(${arrowRotation}deg)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  // 3. Action Block logic
  const primaryAction = trigger.actions[0]

  // Drag & Drop Handlers
  const onDragOver = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
    setDropHover(true)
  }

  const onDragLeave = (e: DragEvent) => {
    e.preventDefault()
    setDropHover(false)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const blockType = e.dataTransfer.getData('application/krakenforge-block')
    const side = e.dataTransfer.getData('application/krakenforge-side')

    if (blockType) {
      if (primaryAction) {
        onDropChildAction(trigger.id, primaryAction.id, blockType, side || null)
      }
    }
    setDropHover(false)
  }

  const handleBlockClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect(e)
    if (primaryAction) {
      onSelectAction(primaryAction.id)
    }
  }

  // Floating Controls (only visible when selected)
  const renderFloatingControls = () => {
    if (!isSelected) return null

    const btnStyle: CSSProperties = {
      position: 'absolute',
      width: 26,
      height: 26,
      borderRadius: 13,
      background: 'var(--kf-surface-4)',
      border: '1px solid var(--kf-border-1)',
      color: 'var(--kf-text)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
      zIndex: 10,
      transition: 'transform 0.1s ease, background 0.1s',
    }

    return (
      <>
        {/* Settings (Top Right) */}
        {primaryAction && (
          <div
            style={{ ...btnStyle, top: -10, right: -10 }}
            onClick={(e) => { e.stopPropagation(); onEditAction(trigger.id, primaryAction.id); }}
            title="Edit Settings"
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--kf-surface-5)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--kf-surface-4)'}
          >
            <IconSettings size={14} />
          </div>
        )}

        {/* Power (Bottom Left) */}
        <div
          style={{ ...btnStyle, bottom: -10, left: -10, color: trigger.isActive ? '#22c55e' : 'var(--kf-text-muted)' }}
          onClick={(e) => { e.stopPropagation(); onToggleActive(trigger.id); }}
          title={trigger.isActive ? "Turn Off" : "Turn On"}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--kf-surface-5)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--kf-surface-4)'}
        >
          <IconPower size={14} />
        </div>

        {/* Delete (Bottom Right) */}
        <div
          style={{ ...btnStyle, bottom: -10, right: -10, color: '#ef4444' }}
          onClick={(e) => { e.stopPropagation(); onRemoveTrigger(trigger.id); }}
          title="Delete Trigger"
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--kf-surface-5)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--kf-surface-4)'}
        >
          <IconTrash size={14} />
        </div>
      </>
    )
  }

  // If no action, show "Drop to Add" placeholder
  if (!primaryAction) {
    const emptyBlockStyle: CSSProperties = {
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      padding: '8px 12px',
      borderRadius: 14,
      border: '1px dashed var(--kf-text-muted)',
      background: dropHover ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)',
      cursor: 'pointer',
      minWidth: 90,
      height: 56,
      transition: 'all 0.15s ease',
      opacity: disabled ? 0.5 : 1, // Dim if disabled
    }

    // Drag handlers for empty block
    const onEmptyDragOver = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      e.dataTransfer.dropEffect = 'copy'
      setDropHover(true)
    }

    const onEmptyDrop = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const blockType = e.dataTransfer.getData('application/krakenforge-block')
      const side = e.dataTransfer.getData('application/krakenforge-side')
      if (blockType) {
        onDropAction(trigger.id, blockType, side || null)
      }
      setDropHover(false)
    }

    return (
      <div style={wrapStyle} className="kf-floating-ui kf-trigger-pill">
        {/* Condition (Always Visible) */}
        <div
          style={triggerBadgeStyle}
          onClick={(e) => { e.stopPropagation(); onClickBadge?.(trigger.shapeId); }}
          title="Select Shape"
        >
          {getConditionIcon(trigger.condition, 18)}
        </div>

        {/* Arrow */}
        <div style={arrowStyle}>
          <IconArrowRight size={14} />
        </div>

        {/* Empty Drop Zone */}
        <div
          style={{
            ...emptyBlockStyle,
            borderColor: dropHover ? '#22c55e' : 'var(--kf-text-muted)',
          }}
          ref={actionBlockRef}
          onDragOver={onEmptyDragOver}
          onDragLeave={() => setDropHover(false)}
          onDrop={onEmptyDrop}
          onClick={handleBlockClick}
        >
          {renderFloatingControls()}

          <div style={{ color: dropHover ? '#22c55e' : 'var(--kf-text-muted)', opacity: 0.7 }}>
            +
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--kf-text-muted)', opacity: 0.8 }}>
            {dropHover ? 'Drop!' : 'Add Action'}
          </div>
        </div>
      </div>
    )
  }

  // Normal Action Block logic (if action exists)
  // Derive side from config or type if not explicit
  const side = primaryAction.config?.side || (primaryAction.type.includes('buy') ? 'buy' : primaryAction.type.includes('sell') ? 'sell' : null)
  const actionInfo = getActionDockInfo(primaryAction.type, side, 18)

  const actionBlockStyle: CSSProperties = {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    // Adjust padding to compensate for border width change (1px -> 2px)
    padding: isSelected ? '9px 13px' : '10px 14px',
    borderRadius: 14,
    border: isSelected ? '2px solid rgba(255, 255, 255, 0.6)' : '1px solid var(--kf-border-1)',
    background: 'var(--kf-surface-2)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    boxShadow: isSelected ? '0 8px 24px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.15)',
    minWidth: 90,
    opacity: trigger.isActive ? 1 : 0.6,
    filter: trigger.isActive ? 'none' : 'grayscale(0.8)',
  }

  if (!expanded) {
    // Revert to simple badge if collapsed (fallback)
    const badgeStyle: CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 28,
      height: 28,
      borderRadius: 8,
      border: '1px solid rgba(255,255,255,0.15)',
      background: 'rgba(var(--kf-deep-rgb), 0.65)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      color: 'var(--kf-text)',
      cursor: 'pointer',
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    }
    return (
      <div style={wrapStyle} className="kf-floating-ui kf-trigger-pill">
        <div
          style={badgeStyle}
          onClick={() => onClickBadge?.(trigger.shapeId)}
          title={trigger.condition}
        >
          {getConditionIcon(trigger.condition, 18)}
        </div>
      </div>
    )
  }

  return (
    <div style={wrapStyle} className="kf-floating-ui kf-trigger-pill">
      {/* 1. Condition Icon (Click to select shape) */}
      <div
        style={triggerBadgeStyle}
        onClick={(e) => { e.stopPropagation(); onClickBadge?.(trigger.shapeId); }}
        title="Select Shape"
      >
        {getConditionIcon(trigger.condition, 18)}
      </div>

      {/* 2. Arrow */}
      <div style={arrowStyle}>
        <IconArrowRight size={14} />
      </div>

      {/* 3. Action Block */}
      <div
        style={{
          ...actionBlockStyle,
          ...(dropHover ? { borderColor: '#22c55e', background: 'rgba(34,197,94,0.1)' } : {})
        }}
        ref={actionBlockRef}
        onClick={handleBlockClick}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {/* Floating Controls Layer */}
        {renderFloatingControls()}

        {/* Icon - Color matched to side */}
        <div style={{ color: actionInfo.label.includes('Short') || actionInfo.label.includes('Sell') || actionInfo.label.includes('Exit') ? '#ef4444' : '#22c55e' }}>
          {actionInfo.icon}
        </div>

        {/* Text */}
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--kf-text)', textAlign: 'center' }}>
          {actionInfo.label}
        </div>

        {/* Value (e.g. Size/Price) */}
        {primaryAction.config && typeof primaryAction.config.size === 'number' && (
          <div style={{ fontSize: 10, opacity: 0.7, fontWeight: 600, marginTop: -2 }}>
            {primaryAction.config.size.toLocaleString()}
          </div>
        )}

        {/* Hint for drag-drop if hovering */}
        {dropHover && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 14,
            background: 'rgba(34,197,94,0.2)',
            display: 'grid', placeItems: 'center',
            fontSize: 10, fontWeight: 800, color: '#fff',
            backdropFilter: 'blur(2px)'
          }}>
            + ADD
          </div>
        )}
      </div>
    </div>
  )
}
