import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'

import type { ShapeTrigger, TriggerCondition } from '../../utils/strategyStorage'
import { IconTrash } from '../strategy-builder/TriggerIcons'

// ─────────────────────────────────────────────────────────────────
// CONDITION ICONS
// ─────────────────────────────────────────────────────────────────

function IconCrossUp({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 16l8-8 8 8" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3" />
    </svg>
  )
}

function IconCrossDown({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 8l8 8 8-8" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3" />
    </svg>
  )
}

function IconTouch({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3" fill="#f59e0b" />
      <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconExitTop({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="8" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />
      <path d="M12 8V3" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M9 5l3-3 3 3" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconExitBottom({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="6" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />
      <path d="M12 16v5" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M9 19l3 3 3-3" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconExitLeft({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="8" y="4" width="10" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />
      <path d="M8 12H3" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M5 9l-3 3 3 3" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconExitRight({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="6" y="4" width="10" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />
      <path d="M16 12h5" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M19 9l3 3-3 3" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconEnterZone({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" fill="#22c55e" fillOpacity="0.2" />
      <path d="M2 12h6" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 9l3 3-3 3" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconExitAny({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />
      <path d="M12 6V2M12 22v-4M6 12H2M22 12h-4" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconBreakUpper({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <line x1="3" y1="8" x2="21" y2="8" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" />
      <line x1="3" y1="16" x2="21" y2="16" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" />
      <path d="M12 12V4" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M9 6l3-3 3 3" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconBreakLower({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <line x1="3" y1="8" x2="21" y2="8" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" />
      <line x1="3" y1="16" x2="21" y2="16" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" />
      <path d="M12 12v8" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M9 18l3 3 3-3" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconEnterChannel({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" />
      <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" />
      <rect x="6" y="8" width="12" height="8" rx="1" fill="#22c55e" fillOpacity="0.15" />
      <path d="M2 12h6" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 9l3 3-3 3" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function getConditionIcon(condition: TriggerCondition): ReactNode {
  switch (condition) {
    case 'cross_up': return <IconCrossUp />
    case 'cross_down': return <IconCrossDown />
    case 'touch': return <IconTouch />
    case 'exit_top': return <IconExitTop />
    case 'exit_bottom': return <IconExitBottom />
    case 'exit_left': return <IconExitLeft />
    case 'exit_right': return <IconExitRight />
    case 'exit_any': return <IconExitAny />
    case 'exit': return <IconExitTop />
    case 'enter_top': return <IconExitBottom /> // Flipped
    case 'enter_bottom': return <IconExitTop /> // Flipped
    case 'enter_left': return <IconExitRight /> // Flipped
    case 'enter_right': return <IconExitLeft /> // Flipped
    case 'enter_any': case 'enter': case 'enter_zone': return <IconEnterZone />
    case 'break_upper': return <IconBreakUpper />
    case 'break_lower': return <IconBreakLower />
    case 'enter_channel': case 'inside_channel': return <IconEnterChannel />
    case 'touch_edge': return <IconTouch />
    default: return null
  }
}

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

type ConditionItem = {
  condition: TriggerCondition
  label: string
  disabled?: boolean
}

export default function ShapeTriggerTooltip({
  x,
  y,
  title,
  conditions,
  triggers,
  isLocked,
  onSelectCondition,
  onToggleTrigger,
  onRemoveTrigger,
  onLockShape,
  onDeleteShape,
  onDeleteAllAnnotations,
  onClose,
}: {
  x: number
  y: number
  title: string
  conditions: ConditionItem[]
  triggers: ShapeTrigger[]
  isLocked?: boolean
  onSelectCondition: (condition: TriggerCondition) => void
  onToggleTrigger: (triggerId: string) => void
  onRemoveTrigger: (triggerId: string) => void
  onLockShape?: () => void
  onDeleteShape?: () => void
  onDeleteAllAnnotations?: () => void
  onClose: () => void
}) {
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const wrapStyle: CSSProperties = {
    position: 'absolute',
    left: x,
    top: y,
    width: 240,
    zIndex: 170,
    borderRadius: 12,
    border: '1px solid var(--kf-border-1)',
    background: 'rgba(var(--kf-deep-rgb), 0.55)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    boxShadow: '0 18px 50px rgba(var(--kf-deep-rgb), 0.55)',
    overflow: 'hidden',
    pointerEvents: 'auto',
    color: 'var(--kf-text)',
  }

  const _headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    padding: '10px 10px 8px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  }

  const sectionTitleStyle: CSSProperties = {
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: 'var(--kf-text-muted)',
    padding: '10px 10px 6px',
  }

  const itemButtonStyle: CSSProperties = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    padding: '8px 10px',
    background: 'transparent',
    border: 'none',
    color: 'var(--kf-text)',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: 12,
    fontWeight: 750,
  }

  const triggerRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: '8px 10px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
  }

  const smallBtn: CSSProperties = {
    height: 22,
    padding: '0 8px',
    borderRadius: 8,
    border: '1px solid var(--kf-border-2)',
    background: 'var(--kf-surface-3)',
    color: 'var(--kf-text)',
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 850,
  }

  return (
    <div ref={wrapperRef} style={wrapStyle} className="kf-floating-ui">

      <div style={sectionTitleStyle}>Add trigger</div>
      <div>
        {conditions.map((c) => (
          <button
            key={c.condition}
            type="button"
            style={{
              ...itemButtonStyle,
              opacity: c.disabled ? 0.35 : 1,
              cursor: c.disabled ? 'not-allowed' : 'pointer',
            }}
            disabled={Boolean(c.disabled)}
            onClick={() => onSelectCondition(c.condition)}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {getConditionIcon(c.condition)}
              {c.label}
            </span>
            <span style={{ opacity: 0.65 }}>+</span>
          </button>
        ))}
      </div>

      {triggers.length > 0 ? <div style={sectionTitleStyle}>Triggers</div> : null}
      <div>
        {triggers.map((t) => (
          <div key={t.id} style={triggerRowStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {getConditionIcon(t.condition)}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ fontSize: 12, fontWeight: 850 }}>{t.condition}</div>
                <div style={{ fontSize: 11, opacity: 0.65 }}>{t.actions.length > 0 ? `${t.actions.length} action(s)` : 'No actions yet'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button type="button" style={smallBtn} onClick={() => onToggleTrigger(t.id)} title="Toggle active">
                {t.isActive ? 'On' : 'Off'}
              </button>
              <button type="button" style={{ ...smallBtn, color: '#ef4444' }} onClick={() => onRemoveTrigger(t.id)} title="Remove">
                <IconTrash size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Shape actions section */}
      <div style={{ borderTop: '1px solid var(--kf-border-1)', marginTop: 12, paddingTop: 12 }}>
        {onLockShape && (
          <button type="button" style={{ ...itemButtonStyle, marginBottom: 4 }} onClick={onLockShape}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                {isLocked ? (
                  <path d="M19 11H5c-1.1 0-2 .9-2 2v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7c0-1.1-.9-2-2-2zm-7 7c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm4-7H8V7c0-2.2 1.8-4 4-4s4 1.8 4 4v4z" fill="currentColor" />
                ) : (
                  <path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5-2.28 0-4.27 1.54-4.84 3.75-.14.54.18 1.08.72 1.22.54.14 1.08-.18 1.22-.72C9.44 3.93 10.63 3 12 3c1.65 0 3 1.35 3 3v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z" fill="currentColor" />
                )}
              </svg>
              {isLocked ? 'Unlock Shape' : 'Lock Shape'}
            </span>
          </button>
        )}
        {onDeleteShape && (
          <button type="button" style={{ ...itemButtonStyle, color: '#ef4444', marginBottom: 4 }} onClick={onDeleteShape} disabled={isLocked}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: isLocked ? 0.4 : 1 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor" />
              </svg>
              Delete Shape
            </span>
          </button>
        )}
        {onDeleteAllAnnotations && (
          <button type="button" style={{ ...itemButtonStyle, color: '#ef4444' }} onClick={onDeleteAllAnnotations}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor" />
              </svg>
              Delete All Annotations
            </span>
          </button>
        )}
      </div>
    </div>
  )
}
