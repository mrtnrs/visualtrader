import { useEffect, useMemo, useRef, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export type ContextMenuItem = {
  id: string
  icon?: ReactNode
  label: string
  disabled?: boolean
  danger?: boolean
  onClick: () => void
}

type Props = {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

export default function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as unknown as globalThis.Node | null
      if (!target) {
        return
      }
      if (ref.current?.contains(target)) {
        return
      }
      onClose()
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  const style = useMemo((): CSSProperties => {
    const w = 210
    const h = items.length * 34 + 10
    const left = Math.min(x, window.innerWidth - w - 10)
    const top = Math.min(y, window.innerHeight - h - 10)

    return {
      position: 'fixed',
      left,
      top,
      width: w,
      padding: 6,
      borderRadius: 14,
      border: '1px solid var(--kf-border-1)',
      background: 'rgba(var(--kf-deep-rgb), 0.55)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      boxShadow: '0 16px 40px rgba(var(--kf-deep-rgb), 0.55)',
      zIndex: 2000,
    }
  }, [items.length, x, y])

  const itemStyle: CSSProperties = {
    width: '100%',
    height: 32,
    borderRadius: 10,
    border: '1px solid transparent',
    background: 'transparent',
    padding: '0 10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    color: 'var(--kf-text)',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 750,
    outline: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  }

  const dividerStyle: CSSProperties = {
    height: 1,
    background: 'var(--kf-border-1)',
    margin: '6px 6px',
    borderRadius: 1,
  }

  return createPortal(
    <div ref={ref} style={style} role="menu">
      {items.map((it) => {
        if (it.label === '---') {
          return <div key={it.id} style={dividerStyle} />
        }

        const disabled = Boolean(it.disabled)
        const color = it.danger ? '#fecaca' : 'var(--kf-text)'

        return (
          <button
            key={it.id}
            type="button"
            disabled={disabled}
            onClick={() => {
              if (disabled) {
                return
              }
              it.onClick()
              onClose()
            }}
            style={{
              ...itemStyle,
              opacity: disabled ? 0.5 : 1,
              cursor: disabled ? 'not-allowed' : 'pointer',
              color,
            }}
            onMouseEnter={(e) => {
              if (disabled) return
              ;(e.currentTarget.style.background = 'var(--kf-surface-3)')
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget.style.background = 'transparent')
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {it.icon ? <span style={{ width: 16, height: 16, display: 'grid', placeItems: 'center', opacity: 0.9 }}>{it.icon}</span> : null}
              <span>{it.label}</span>
            </span>
          </button>
        )
      })}
    </div>,
    document.body,
  )
}
