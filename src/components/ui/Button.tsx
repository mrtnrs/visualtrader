import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  leftIcon?: ReactNode
}

export default function Button({ variant = 'secondary', leftIcon, style, children, ...props }: Props) {
  const base: CSSProperties = {
    height: 40,
    borderRadius: 12,
    border: '1px solid transparent',
    padding: '0 8px',
    fontSize: 13,
    fontWeight: 750,
    fontFamily: 'inherit',
    cursor: props.disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    lineHeight: 1,
    outline: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  }

  const variants: Record<ButtonVariant, CSSProperties> = {
    primary: {
      background: '#7232f5',
      color: 'rgba(255,255,255,0.95)',
      border: '1px solid rgba(255,255,255,0.10)',
      boxShadow: '0 10px 30px rgba(var(--kf-deep-rgb), 0.65)',
    },
    secondary: {
      background: 'var(--kf-surface-4)',
      color: 'var(--kf-text)',
      border: '1px solid var(--kf-border-2)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--kf-text)',
      border: '1px solid transparent',
    },
  }

  const disabledStyle: CSSProperties = props.disabled
    ? {
        opacity: 0.55,
        boxShadow: 'none',
      }
    : {}

  return (
    <button {...props} style={{ ...base, ...variants[variant], ...disabledStyle, ...style }}>
      {leftIcon ? <span style={{ display: 'inline-flex', alignItems: 'center', lineHeight: 0 }}>{leftIcon}</span> : null}
      <span>{children}</span>
    </button>
  )
}
