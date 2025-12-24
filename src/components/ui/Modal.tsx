import { useEffect, useMemo, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

type Props = {
  open: boolean
  title?: ReactNode
  children: ReactNode
  footer?: ReactNode
  dismissable?: boolean
  onRequestClose?: () => void
  maxWidth?: number
}

export default function Modal({
  open,
  title,
  children,
  footer,
  dismissable = true,
  onRequestClose,
  maxWidth = 920,
}: Props) {
  const canClose = dismissable && typeof onRequestClose === 'function'

  const overlayStyle = useMemo((): CSSProperties => {
    return {
      position: 'fixed',
      inset: 0,
      zIndex: 5000,
      display: open ? 'grid' : 'none',
      placeItems: 'center',
      padding: 24,
      background: 'rgba(var(--kf-deep-rgb), 0.70)',
      backdropFilter: 'blur(10px)',
      pointerEvents: 'auto',
    }
  }, [open])

  const panelStyle: CSSProperties = {
    width: `min(${maxWidth}px, calc(100vw - 48px))`,
    borderRadius: 22,
    border: '1px solid var(--kf-border-1)',
    background: 'var(--kf-surface-2)',
    boxShadow: '0 30px 90px rgba(var(--kf-deep-rgb), 0.80)',
    overflow: 'hidden',
  }

  useEffect(() => {
    if (!open) {
      return
    }

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open || !canClose) {
      return
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onRequestClose?.()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [canClose, onRequestClose, open])

  if (!open) {
    return null
  }

  return createPortal(
    <div
      style={overlayStyle}
      onMouseDown={(e) => {
        if (!canClose) {
          return
        }
        if (e.target === e.currentTarget) {
          onRequestClose?.()
        }
      }}
    >
      <div role="dialog" aria-modal="true" style={panelStyle}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 18px',
            borderBottom: '1px solid var(--kf-border-1)',
            background: 'var(--kf-surface-3)',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 850, letterSpacing: 0.2 }}>{title}</div>
          {canClose ? (
            <button
              type="button"
              onClick={() => onRequestClose?.()}
              aria-label="Close"
              style={{
                height: 34,
                width: 34,
                borderRadius: 12,
                border: '1px solid var(--kf-border-1)',
                background: 'var(--kf-surface-4)',
                color: 'var(--kf-text)',
                padding: 0,
                display: 'grid',
                placeItems: 'center',
                lineHeight: 0,
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 18, transform: 'translateY(-1px)' }}>×</span>
            </button>
          ) : null}
        </div>

        <div style={{ padding: 18 }}>{children}</div>

        {footer ? (
          <div
            style={{
              padding: 18,
              borderTop: '1px solid var(--kf-border-1)',
              background: 'var(--kf-surface-3)',
            }}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
