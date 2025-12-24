import { useState } from 'react'
import type { ChartTimeframe } from '../../utils/chartMapping'

// Icons (moved from StrategyCanvas)
function IconCandles() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="8" width="4" height="8" rx="1" />
            <line x1="6" y1="4" x2="6" y2="8" />
            <line x1="6" y1="16" x2="6" y2="20" />
            <rect x="14" y="10" width="4" height="6" rx="1" />
            <line x1="16" y1="6" x2="16" y2="10" />
            <line x1="16" y1="16" x2="16" y2="18" />
        </svg>
    )
}

function IconLine() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 17l4-4 4 4 10-10" />
        </svg>
    )
}

function IconNow() {
    return (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="8" r="5" />
            <circle cx="8" cy="8" r="1" fill="currentColor" />
            <line x1="8" y1="1" x2="8" y2="3" />
            <line x1="8" y1="13" x2="8" y2="15" />
            <line x1="1" y1="8" x2="3" y2="8" />
            <line x1="13" y1="8" x2="15" y2="8" />
        </svg>
    )
}

function IconChevronDown() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
        </svg>
    )
}

function IconGrid() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
    )
}

function IconMagnet() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 13v-8a2 2 0 0 1 2 -2h1a2 2 0 0 1 2 2v8a2 2 0 0 0 6 0v-8a2 2 0 0 1 2 -2h1a2 2 0 0 1 2 2v8a8 8 0 0 1 -16 0" />
            <path d="M4 8l5 0" />
            <path d="M15 8l4 0" />
        </svg>
    )
}

function IconCircle() {
    return (
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="8" r="5.4" strokeOpacity="0.95" />
        </svg>
    )
}

function IconRectangle() {
    return (
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="10" height="8" rx="1.8" strokeOpacity="0.95" />
        </svg>
    )
}

function IconParallelLines() {
    return (
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6 L13 3.5" />
            <path d="M3 12.5 L13 10" opacity="0.9" />
        </svg>
    )
}

function IconTrash() {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.5 5.2V12.4c0 0.9 0.7 1.6 1.6 1.6h3.8c0.9 0 1.6-0.7 1.6-1.6V5.2" />
            <path d="M3.8 5.2H12.2" />
            <path d="M6.2 5.2V4.1c0-0.7 0.6-1.3 1.3-1.3h1c0.7 0 1.3 0.6 1.3 1.3V5.2" />
            <path d="M6.6 7.2V12" opacity="0.85" />
            <path d="M9.4 7.2V12" opacity="0.85" />
        </svg>
    )
}

function IconSettings() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
    )
}


export type CanvasToolbarProps = {
    // Market
    symbol: string
    symbolDraft: string
    setSymbolDraft: (v: string) => void
    onSymbolChange: (symbol: string) => void
    wsStatus: string
    showMarketMenu: boolean
    setShowMarketMenu: (v: boolean) => void
    updateMarketMenuPos: () => void
    marketInputRef: React.RefObject<HTMLInputElement | null>
    marketInputWrapRef: React.RefObject<HTMLDivElement | null>

    // Chart settings
    chartTimeframe: ChartTimeframe
    setChartTimeframe: (tf: ChartTimeframe) => void
    chartMode: 'line' | 'candles'
    setChartMode: (m: 'line' | 'candles') => void

    // View controls
    followNow: boolean
    onNowClick: () => void

    // Snap/Magnet
    snapPrices: boolean
    setSnapPrices: (v: boolean) => void
    magnetEnabled: boolean
    setMagnetEnabled: (v: boolean) => void
    magnetStrength: number
    setMagnetStrength: (v: number) => void

    // Drawing Tools
    drawLineMode: boolean
    toggleLineMode: () => void
    drawParallelMode: boolean
    toggleParallelMode: () => void
    drawCircleMode: boolean
    toggleCircleMode: () => void
    drawRectangleMode: boolean
    toggleRectangleMode: () => void
    onClearAnnotations: () => void
    canClear: boolean

    // Settings
    onOpenSettings: () => void
}

export function CanvasToolbar({
    symbol: _symbol,
    symbolDraft,
    setSymbolDraft,
    onSymbolChange,
    wsStatus,
    showMarketMenu,
    setShowMarketMenu,
    updateMarketMenuPos,
    marketInputRef,
    marketInputWrapRef,
    chartTimeframe,
    setChartTimeframe,
    chartMode,
    setChartMode,
    followNow,
    onNowClick,
    snapPrices,
    setSnapPrices,
    magnetEnabled,
    setMagnetEnabled,
    magnetStrength,
    setMagnetStrength,
    drawLineMode,
    toggleLineMode,
    drawParallelMode,
    toggleParallelMode,
    drawCircleMode,
    toggleCircleMode,
    drawRectangleMode,
    toggleRectangleMode,
    onClearAnnotations,
    canClear,
    onOpenSettings,
}: CanvasToolbarProps) {
    const [hoveredToolId, setHoveredToolId] = useState<string | null>(null)

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 12px',
                height: 48,
                background: 'var(--kf-surface-2)',
                borderBottom: '1px solid var(--kf-border-1)',
                gap: 12,
                flex: '0 0 auto',
                minWidth: '100%', // Ensure it takes full width of scroll container
            }}
        >
            {/* Left section */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: '1 1 auto' }}>
                {/* Market selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '0 0 auto' }}>
                    <span style={{ fontSize: 12, color: 'var(--kf-text-muted)', fontWeight: 700 }}>Market</span>
                    <div
                        ref={marketInputWrapRef}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            height: 30,
                            borderRadius: 10,
                            border: '1px solid var(--kf-border-1)',
                            background: 'var(--kf-surface-4)',
                            overflow: 'hidden',
                        }}
                    >
                        <input
                            ref={marketInputRef}
                            className="kf-market-input"
                            value={symbolDraft}
                            onChange={(e) => setSymbolDraft(e.target.value)}
                            onBlur={() => onSymbolChange(symbolDraft.trim() || 'BTC/USD')}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    onSymbolChange(symbolDraft.trim() || 'BTC/USD')
                                }
                            }}
                            autoComplete="off"
                            spellCheck={false}
                            placeholder="BTC/USD"
                            style={{
                                height: 30,
                                width: 122,
                                border: 'none',
                                background: 'transparent',
                                color: 'var(--kf-text)',
                                padding: '0 10px',
                                outline: 'none',
                                appearance: 'none',
                                WebkitAppearance: 'none',
                                MozAppearance: 'none',
                                fontWeight: 700,
                                fontSize: 12,
                            }}
                            title={`WebSocket: ${wsStatus}`}
                        />

                        <button
                            type="button"
                            onClick={() => {
                                const next = !showMarketMenu
                                setShowMarketMenu(next)
                                if (next) {
                                    updateMarketMenuPos()
                                }
                            }}
                            style={{
                                height: 30,
                                width: 28,
                                padding: 0,
                                border: 'none',
                                background: 'transparent',
                                color: 'var(--kf-text)',
                                opacity: 0.6,
                                cursor: 'pointer',
                                display: 'grid',
                                placeItems: 'center',
                            }}
                            title="Show market list"
                            aria-label="Show market list"
                        >
                            <IconChevronDown />
                        </button>
                    </div>
                </div>

                {/* Chart controls container */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: 4,
                        borderRadius: 12,
                        border: '1px solid var(--kf-border-2)',
                        background: 'var(--kf-surface-3)',
                        flex: '0 0 auto',
                    }}
                >
                    {/* Timeframe buttons */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: 2,
                            borderRadius: 11,
                            border: '3px solid #00000091',
                            background: 'var(--kf-surface-4)',
                        }}
                        aria-label="Timeframe"
                    >
                        {(['1m', '5m', '15m', '1h', '1d'] as const).map((tf) => (
                            <button
                                key={tf}
                                onClick={() => setChartTimeframe(tf)}
                                style={{
                                    height: 28,
                                    borderRadius: 9,
                                    border: chartTimeframe === tf ? '2px solid #00000091' : '2px solid transparent',
                                    background: chartTimeframe === tf ? 'rgba(255, 255, 255, 0.28)' : 'transparent',
                                    color: 'var(--kf-text)',
                                    padding: '0 10px',
                                    cursor: 'pointer',
                                    fontWeight: chartTimeframe === tf ? 800 : 650,
                                    fontSize: 12,
                                }}
                                aria-pressed={chartTimeframe === tf}
                            >
                                {tf}
                            </button>
                        ))}
                    </div>

                    {/* Chart mode toggle */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: 2,
                            borderRadius: 11,
                            border: '3px solid #00000091',
                            background: 'var(--kf-surface-4)',
                        }}
                        aria-label="Chart mode"
                    >
                        <button
                            type="button"
                            onClick={() => setChartMode('candles')}
                            style={{
                                height: 28,
                                width: 34,
                                borderRadius: 9,
                                border: chartMode === 'candles' ? '2px solid #00000091' : '2px solid transparent',
                                background: chartMode === 'candles' ? 'rgba(255, 255, 255, 0.28)' : 'transparent',
                                color: 'var(--kf-text)',
                                cursor: 'pointer',
                                display: 'grid',
                                placeItems: 'center',
                                padding: 0,
                                lineHeight: 0,
                            }}
                            aria-pressed={chartMode === 'candles'}
                            title="Candles"
                        >
                            <IconCandles />
                        </button>
                        <button
                            type="button"
                            onClick={() => setChartMode('line')}
                            style={{
                                height: 28,
                                width: 34,
                                borderRadius: 9,
                                border: chartMode === 'line' ? '2px solid #00000091' : '2px solid transparent',
                                background: chartMode === 'line' ? 'rgba(255, 255, 255, 0.28)' : 'transparent',
                                color: 'var(--kf-text)',
                                cursor: 'pointer',
                                display: 'grid',
                                placeItems: 'center',
                                padding: 0,
                                lineHeight: 0,
                            }}
                            aria-pressed={chartMode === 'line'}
                            title="Line"
                        >
                            <IconLine />
                        </button>
                    </div>

                    {/* NOW button */}
                    <button
                        type="button"
                        onClick={onNowClick}
                        style={{
                            height: 30,
                            borderRadius: 10,
                            border: '1px solid var(--kf-border-1)',
                            background: followNow ? 'var(--kf-surface-3)' : 'var(--kf-surface-4)',
                            color: 'var(--kf-text)',
                            padding: '0 10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            fontWeight: followNow ? 800 : 650,
                            fontSize: 12,
                        }}
                        title="Center on the latest price and time"
                    >
                        <IconNow />
                        NOW
                    </button>
                </div>

                {/* Separator */}
                <div style={{ width: 1, height: 26, background: 'var(--kf-border-1)', flex: '0 0 auto' }} />

                {/* Snap/Magnet Controls */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: 2,
                        borderRadius: 11,
                        border: '3px solid #00000091',
                        background: 'var(--kf-surface-4)',
                    }}
                    aria-label="Snap mode"
                >
                    <button
                        onClick={() => {
                            // Toggle: Off -> Snap -> Magnet -> Off
                            if (!snapPrices && !magnetEnabled) {
                                setSnapPrices(true)
                            } else if (snapPrices && !magnetEnabled) {
                                setSnapPrices(false)
                                setMagnetEnabled(true)
                            } else {
                                setMagnetEnabled(false)
                            }
                        }}
                        style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            border: 'none',
                            background: (snapPrices || magnetEnabled) ? 'var(--kf-surface-4)' : 'transparent',
                            color: magnetEnabled ? 'var(--kf-accent)' : snapPrices ? 'var(--kf-text)' : 'var(--kf-text-muted)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'color 0.2s',
                            padding: 0,
                        }}
                        title={`Snap Mode: ${magnetEnabled ? 'Magnet (price levels)' : snapPrices ? 'Grid (round prices)' : 'Off'}`}
                    >
                        {magnetEnabled ? <IconMagnet /> : snapPrices ? <IconGrid /> : <IconMagnet />}
                    </button>

                    <span
                        style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: 'var(--kf-text)',
                            minWidth: 48,
                            textAlign: 'center',
                        }}
                    >
                        {magnetEnabled ? 'Magnet' : snapPrices ? 'Snap' : 'Off'}
                    </span>

                    {/* Styled Slider */}
                    <input
                        type="range"
                        className="kf-magnet-slider"
                        min={0}
                        max={1}
                        step={0.05}
                        value={magnetStrength}
                        disabled={!magnetEnabled}
                        onChange={(e) => setMagnetStrength(Number(e.target.value))}
                        style={{
                            width: 80,
                            height: 4,
                            borderRadius: 2,
                            appearance: 'none',
                            WebkitAppearance: 'none',
                            cursor: magnetEnabled ? 'pointer' : 'not-allowed',
                            opacity: magnetEnabled ? 1 : 0.4,
                            background: 'transparent',
                            ['--kf-magnet-track' as any]: magnetEnabled
                                ? `linear-gradient(to right, var(--kf-accent) ${magnetStrength * 100}%, rgba(255, 255, 255, 0.2) ${magnetStrength * 100}%)`
                                : 'rgba(255, 255, 255, 0.2)',
                        } as any}
                        title="Magnet strength"
                    />
                </div>

                {/* Drawing Tools Section */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: 4,
                        borderRadius: 12,
                        border: '1px solid var(--kf-border-2)',
                        background: 'var(--kf-surface-3)',
                        flex: '0 0 auto',
                    }}
                    aria-label="Drawing tools"
                >
                    {(
                        [
                            { id: 'line', icon: <IconLine />, active: drawLineMode, onClick: toggleLineMode, label: 'Line' },
                            { id: 'parallel', icon: <IconParallelLines />, active: drawParallelMode, onClick: toggleParallelMode, label: 'Parallel Lines' },
                            { id: 'circle', icon: <IconCircle />, active: drawCircleMode, onClick: toggleCircleMode, label: 'Circle' },
                            { id: 'rect', icon: <IconRectangle />, active: drawRectangleMode, onClick: toggleRectangleMode, label: 'Rectangle' },
                        ] as const
                    ).map((t) => (
                        <div key={t.id} style={{ position: 'relative' }} onMouseLeave={() => setHoveredToolId(null)}>
                            <button
                                type="button"
                                onClick={t.onClick}
                                onMouseEnter={() => setHoveredToolId(t.id)}
                                style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 8,
                                    border: t.active ? '1px solid var(--kf-border-2)' : '1px solid transparent',
                                    background: t.active ? 'var(--kf-surface-4)' : 'transparent',
                                    color: t.active ? 'var(--kf-text)' : 'var(--kf-text-muted)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: 0,
                                }}
                                aria-pressed={t.active}
                            >
                                {t.icon}
                            </button>
                            {hoveredToolId === t.id && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: '50%',
                                        transform: 'translateX(-50%) translateY(8px)',
                                        zIndex: 1000,
                                        pointerEvents: 'none',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 0,
                                            height: 0,
                                            borderLeft: '5px solid transparent',
                                            borderRight: '5px solid transparent',
                                            borderBottom: '5px solid rgba(var(--kf-deep-rgb), 0.9)',
                                            marginBottom: -1,
                                        }}
                                    />
                                    <div
                                        style={{
                                            padding: '4px 8px',
                                            borderRadius: 6,
                                            background: 'rgba(var(--kf-deep-rgb), 0.9)',
                                            border: '1px solid var(--kf-border-1)',
                                            backdropFilter: 'blur(4px)',
                                            color: 'var(--kf-text)',
                                            fontSize: 11,
                                            fontWeight: 600,
                                            whiteSpace: 'nowrap',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                        }}
                                    >
                                        {t.label}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    <div style={{ width: 1, height: 16, background: 'var(--kf-border-1)', margin: '0 4px' }} />

                    <button
                        type="button"
                        onClick={onClearAnnotations}
                        disabled={!canClear}
                        style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            border: '1px solid transparent',
                            background: 'transparent',
                            color: canClear ? '#fecaca' : 'var(--kf-text-muted)',
                            opacity: canClear ? 1 : 0.4,
                            cursor: canClear ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                        }}
                        title="Clear all annotations"
                    >
                        <IconTrash />
                    </button>
                </div>
            </div>

            {/* Right section - spacer + settings */}
            <div style={{ flex: '1 1 auto' }} />

            {/* Settings container - consistent with other controls */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: 4,
                    borderRadius: 12,
                    border: '1px solid var(--kf-border-2)',
                    background: 'var(--kf-surface-3)',
                    flex: '0 0 auto',
                }}
            >
                <button
                    type="button"
                    onClick={onOpenSettings}
                    style={{
                        height: 28,
                        borderRadius: 8,
                        border: '1px solid transparent', // Subtle border
                        background: 'transparent',
                        color: 'var(--kf-text)',
                        padding: '0 8px',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: 10,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                    }}
                    title="Settings"
                >
                    <IconSettings />
                    settings
                </button>
            </div>
        </div>
    )
}
