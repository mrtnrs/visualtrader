/**
 * ExitPicker Component
 *
 * Popover menu for selecting exit block types.
 * Displays when user clicks "Add Exit" button.
 */

import { useEffect, useRef, type MouseEvent, type CSSProperties } from 'react'
import type { ExitBlockType, ExitPickerProps } from './strategy-builder.types'

// ─────────────────────────────────────────────────────────────────
// EXIT OPTIONS
// ─────────────────────────────────────────────────────────────────

interface ExitOption {
    type: ExitBlockType
    label: string
    icon: string
    description: string
}

const EXIT_OPTIONS: ExitOption[] = [
    {
        type: 'stop_loss',
        label: 'Stop Loss',
        icon: '⛔',
        description: 'Market sell when price drops below stop',
    },
    {
        type: 'stop_loss_limit',
        label: 'Stop Loss Limit',
        icon: '⛔',
        description: 'Limit sell when price drops below stop',
    },
    {
        type: 'take_profit',
        label: 'Take Profit',
        icon: '🎯',
        description: 'Market sell when price rises to target',
    },
    {
        type: 'take_profit_limit',
        label: 'Take Profit Limit',
        icon: '🎯',
        description: 'Limit sell when price rises to target',
    },
    {
        type: 'trailing_stop',
        label: 'Trailing Stop',
        icon: '📈',
        description: 'Dynamic stop that follows price',
    },
    {
        type: 'trailing_stop_limit',
        label: 'Trailing Stop Limit',
        icon: '📈',
        description: 'Trailing stop with limit execution',
    },
]

// ─────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────

const pickerStyle: CSSProperties = {
    position: 'fixed',
    bottom: 100,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: 12,
    minWidth: 240,
    background: 'var(--kf-surface-3)',
    border: '1px solid var(--kf-border-1)',
    borderRadius: 12,
    boxShadow: '0 16px 48px rgba(var(--kf-deep-rgb), 0.6)',
    backdropFilter: 'blur(12px)',
    zIndex: 1001,
}

const headerStyle: CSSProperties = {
    padding: '8px 12px',
    marginBottom: 4,
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--kf-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
}

const itemStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px',
    background: 'transparent',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    textAlign: 'left',
    color: 'var(--kf-text)',
    transition: 'background 0.12s ease',
}

// ─────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────

export function ExitPicker({ isOpen, onClose, onSelectExit }: ExitPickerProps) {
    const pickerRef = useRef<HTMLDivElement>(null)

    // Close on click outside or Escape
    useEffect(() => {
        if (!isOpen) return

        const handleClickOutside = (e: globalThis.MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
                onClose()
            }
        }

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose()
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('keydown', handleEscape)

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleEscape)
        }
    }, [isOpen, onClose])

    // Focus first item on open
    useEffect(() => {
        if (isOpen && pickerRef.current) {
            const firstButton = pickerRef.current.querySelector('button')
            firstButton?.focus()
        }
    }, [isOpen])

    if (!isOpen) return null

    const handleItemClick = (e: MouseEvent, type: ExitBlockType) => {
        e.stopPropagation()
        onSelectExit(type)
        onClose()
    }

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            const buttons = pickerRef.current?.querySelectorAll('button')
            if (!buttons) return

            const currentIndex = Array.from(buttons).findIndex((btn) => btn === document.activeElement)
            let nextIndex = e.key === 'ArrowDown' ? currentIndex + 1 : currentIndex - 1

            if (nextIndex < 0) nextIndex = buttons.length - 1
            if (nextIndex >= buttons.length) nextIndex = 0

            buttons[nextIndex]?.focus()
        }
    }

    return (
        <div ref={pickerRef} style={pickerStyle} role="menu" aria-label="Select exit order type" onKeyDown={handleKeyDown}>
            <div style={headerStyle}>Add Exit Order</div>

            {EXIT_OPTIONS.map((option) => (
                <button
                    key={option.type}
                    type="button"
                    role="menuitem"
                    style={itemStyle}
                    onClick={(e) => handleItemClick(e, option.type)}
                    onMouseEnter={(e) => {
                        ; (e.currentTarget.style.background = 'var(--kf-surface-4)')
                    }}
                    onMouseLeave={(e) => {
                        ; (e.currentTarget.style.background = 'transparent')
                    }}
                >
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{option.icon}</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{option.label}</span>
                        <span style={{ fontSize: 11, color: 'var(--kf-text-muted)' }}>{option.description}</span>
                    </div>
                </button>
            ))}
        </div>
    )
}

export default ExitPicker
