import { useEffect, useMemo, useState } from 'react'

import Modal from '../ui/Modal'
import type { ActionConfig, TriggerActionType } from '../../utils/strategyStorage'
import { useStrategyContext } from '../../contexts/StrategyContext'
import { useAccountContext } from '../../contexts/AccountContext'

function toNumber(value: string): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function actionTitle(type: TriggerActionType): string {
  switch (type) {
    case 'market_buy':
      return 'Market Buy'
    case 'market_sell':
      return 'Market Sell'
    case 'limit_buy':
      return 'Limit Buy'
    case 'limit_sell':
      return 'Limit Sell'
    case 'alert':
      return 'Alert'
    case 'stop_loss':
      return 'Stop Loss'
    case 'stop_loss_limit':
      return 'Stop Loss Limit'
    case 'take_profit':
      return 'Take Profit'
    case 'take_profit_limit':
      return 'Take Profit Limit'
    case 'trailing_stop':
      return 'Trailing Stop'
    case 'trailing_stop_limit':
      return 'Trailing Stop Limit'
    default:
      return type
  }
}

function isBuyAction(type: TriggerActionType | null): boolean {
  return type === 'market_buy' || type === 'limit_buy'
}

// ═══════════════════════════════════════════════════════════════════════════
// Segmented Control Component
// ═══════════════════════════════════════════════════════════════════════════

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  disabled?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        background: 'var(--kf-surface-3)',
        borderRadius: 10,
        padding: 3,
        gap: 2,
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            style={{
              flex: 1,
              height: 30,
              borderRadius: 8,
              border: 'none',
              background: active ? 'var(--kf-accent)' : 'transparent',
              color: active ? '#fff' : 'var(--kf-text-muted)',
              fontWeight: 750,
              fontSize: 12,
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
              opacity: disabled ? 0.5 : 1,
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Quick Percentage Buttons
// ═══════════════════════════════════════════════════════════════════════════

function QuickPercentButtons({
  onSelect,
  activePercent,
}: {
  onSelect: (pct: number) => void
  activePercent?: number
}) {
  const presets = [10, 25, 50, 75, 100]
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {presets.map((pct) => {
        const active = activePercent === pct
        return (
          <button
            key={pct}
            type="button"
            onClick={() => onSelect(pct)}
            style={{
              flex: 1,
              height: 32,
              borderRadius: 8,
              border: active ? '1px solid var(--kf-accent)' : '1px solid var(--kf-border-2)',
              background: active ? 'rgba(96, 165, 250, 0.15)' : 'var(--kf-surface-4)',
              color: active ? 'var(--kf-accent)' : 'var(--kf-text)',
              fontWeight: 800,
              fontSize: 12,
              cursor: 'pointer',
              transition: 'all 0.12s ease',
            }}
          >
            {pct}%
          </button>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Leverage Slider with Risk Gradient
// ═══════════════════════════════════════════════════════════════════════════

function LeverageSlider({
  value,
  onChange,
  max = 5,
  marginUsd,
  baseSymbol,
  lastPrice,
}: {
  value: number
  onChange: (v: number) => void
  max?: number
  marginUsd?: number
  baseSymbol?: string
  lastPrice?: number | null
}) {
  const riskColor = value <= 2 ? '#22c55e' : value <= 3 ? '#eab308' : '#ef4444'
  const pct = ((value - 1) / (max - 1)) * 100

  const lp = typeof lastPrice === 'number' && Number.isFinite(lastPrice) && lastPrice > 0 ? lastPrice : null
  const leveragedUsd = marginUsd != null ? marginUsd * value : null
  const leveragedBase = leveragedUsd != null && lp ? leveragedUsd / lp : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 12, color: 'var(--kf-text-muted)', fontWeight: 750 }}>Leverage</div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 900,
            color: riskColor,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span style={{ fontSize: 18 }}>{value}×</span>
          {value >= 4 && (
            <span style={{ fontSize: 10, opacity: 0.8 }}>High Risk</span>
          )}
        </div>
      </div>
      <div style={{ position: 'relative', height: 8 }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            borderRadius: 4,
            background: 'linear-gradient(to right, #22c55e 0%, #eab308 50%, #ef4444 100%)',
            opacity: 0.3,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${pct}%`,
            borderRadius: 4,
            background: `linear-gradient(to right, #22c55e 0%, ${riskColor} 100%)`,
            transition: 'width 0.15s ease',
          }}
        />
        <input
          type="range"
          min={1}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: -4,
            width: '100%',
            height: 16,
            opacity: 0,
            cursor: 'pointer',
          }}
        />
      </div>
      {/* Clickable leverage labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {Array.from({ length: max }, (_, i) => {
          const lev = i + 1
          const active = value === lev
          const labelColor = lev <= 2 ? '#22c55e' : lev <= 3 ? '#eab308' : '#ef4444'
          return (
            <button
              key={lev}
              type="button"
              onClick={() => onChange(lev)}
              style={{
                background: active ? `${labelColor}20` : 'transparent',
                border: active ? `1px solid ${labelColor}50` : '1px solid transparent',
                borderRadius: 6,
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 800,
                color: active ? labelColor : 'var(--kf-text-muted)',
                cursor: 'pointer',
                transition: 'all 0.12s ease',
                opacity: active ? 1 : 0.7,
              }}
            >
              {lev}×
            </button>
          )
        })}
      </div>

      {/* Leveraged position size */}
      {value > 1 && leveragedUsd != null && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            padding: '10px 12px',
            background: 'rgba(96, 165, 250, 0.08)',
            borderRadius: 10,
            marginTop: 4,
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#60a5fa', fontWeight: 700, marginBottom: 3 }}>Position Size</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#60a5fa' }}>
              ${leveragedUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          </div>
          {leveragedBase != null && (
            <div style={{ textAlign: 'center', borderLeft: '1px solid var(--kf-border-1)' }}>
              <div style={{ fontSize: 10, color: '#60a5fa', fontWeight: 700, marginBottom: 3 }}>Position ({baseSymbol ?? 'BTC'})</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#60a5fa' }}>
                {leveragedBase.toLocaleString(undefined, { maximumFractionDigits: 6 })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Value Display Card (Shows USD / BTC / % simultaneously)
// ═══════════════════════════════════════════════════════════════════════════

function ValueDisplayCard({
  sizeVal,
  sizeUnit,
  lastPrice,
  symbol,
  balance,
}: {
  sizeVal: number
  sizeUnit: 'usd' | 'base' | 'percent'
  lastPrice: number | null
  symbol: string | null
  balance: number
}) {
  const lp = typeof lastPrice === 'number' && Number.isFinite(lastPrice) && lastPrice > 0 ? lastPrice : null
  const base = symbol?.split('/')?.[0] ?? 'BTC'

  const usdVal = useMemo(() => {
    if (sizeUnit === 'usd') return sizeVal
    if (sizeUnit === 'percent') return balance * (sizeVal / 100)
    if (sizeUnit === 'base' && lp) return sizeVal * lp
    return 0
  }, [balance, lp, sizeUnit, sizeVal])

  const baseVal = useMemo(() => {
    if (sizeUnit === 'base') return sizeVal
    if (sizeUnit === 'usd' && lp) return sizeVal / lp
    if (sizeUnit === 'percent' && lp) return (balance * (sizeVal / 100)) / lp
    return 0
  }, [balance, lp, sizeUnit, sizeVal])

  const pctVal = useMemo(() => {
    if (sizeUnit === 'percent') return sizeVal
    if (balance > 0) return (usdVal / balance) * 100
    return 0
  }, [balance, sizeUnit, sizeVal, usdVal])

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 8,
        padding: 12,
        background: 'var(--kf-surface-3)',
        borderRadius: 12,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 10, color: 'var(--kf-text-muted)', fontWeight: 700, marginBottom: 4 }}>USD</div>
        <div style={{ fontSize: 15, fontWeight: 900, color: sizeUnit === 'usd' ? 'var(--kf-accent)' : 'var(--kf-text)' }}>
          ${usdVal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </div>
      </div>
      <div style={{ textAlign: 'center', borderLeft: '1px solid var(--kf-border-1)', borderRight: '1px solid var(--kf-border-1)' }}>
        <div style={{ fontSize: 10, color: 'var(--kf-text-muted)', fontWeight: 700, marginBottom: 4 }}>{base}</div>
        <div style={{ fontSize: 15, fontWeight: 900, color: sizeUnit === 'base' ? 'var(--kf-accent)' : 'var(--kf-text)' }}>
          {baseVal.toLocaleString(undefined, { maximumFractionDigits: 6 })}
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 10, color: 'var(--kf-text-muted)', fontWeight: 700, marginBottom: 4 }}>% of Balance</div>
        <div style={{ fontSize: 15, fontWeight: 900, color: sizeUnit === 'percent' ? 'var(--kf-accent)' : 'var(--kf-text)' }}>
          {pctVal.toFixed(1)}%
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Price Input with Difference Indicator
// ═══════════════════════════════════════════════════════════════════════════

function PriceInputWithDiff({
  label,
  value,
  onChange,
  lastPrice,
  inverted,
}: {
  label: string
  value: number | undefined
  onChange: (v: number) => void
  lastPrice: number | null
  inverted?: boolean // For short positions where lower is better
}) {
  const lp = typeof lastPrice === 'number' && Number.isFinite(lastPrice) && lastPrice > 0 ? lastPrice : null
  const diff = lp && value ? ((value - lp) / lp) * 100 : null
  const diffColor = diff
    ? inverted
      ? diff < 0 ? '#22c55e' : '#ef4444'
      : diff > 0 ? '#22c55e' : '#ef4444'
    : 'var(--kf-text-muted)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 12, color: 'var(--kf-text-muted)', fontWeight: 750 }}>{label}</div>
        {diff != null && (
          <div style={{ fontSize: 11, fontWeight: 800, color: diffColor }}>
            {diff >= 0 ? '+' : ''}{diff.toFixed(2)}% from current
          </div>
        )}
      </div>
      <div style={{ position: 'relative' }}>
        <input
          type="number"
          value={value == null ? '' : String(value)}
          onChange={(e) => onChange(toNumber(e.target.value))}
          placeholder={lp ? `Current: ${lp.toLocaleString()}` : ''}
          style={{
            width: '100%',
            height: 42,
            borderRadius: 10,
            border: '1px solid var(--kf-border-2)',
            background: 'var(--kf-surface-4)',
            color: 'var(--kf-text)',
            padding: '0 12px',
            outline: 'none',
            fontSize: 14,
            fontWeight: 700,
          }}
        />
      </div>
      {lp && (
        <div style={{ fontSize: 10, color: 'var(--kf-text-muted)', opacity: 0.7 }}>
          Current: ${lp.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Toggle Switch
// ═══════════════════════════════════════════════════════════════════════════

function _ToggleSwitch({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 12px',
        background: 'var(--kf-surface-3)',
        borderRadius: 10,
        cursor: 'pointer',
      }}
    >
      <div>
        <div style={{ fontSize: 12, fontWeight: 750, color: 'var(--kf-text)' }}>{label}</div>
        {description && (
          <div style={{ fontSize: 10, color: 'var(--kf-text-muted)', marginTop: 2 }}>{description}</div>
        )}
      </div>
      <div
        style={{
          width: 44,
          height: 24,
          borderRadius: 12,
          background: checked ? 'var(--kf-accent)' : 'var(--kf-surface-4)',
          border: '1px solid var(--kf-border-2)',
          position: 'relative',
          transition: 'background 0.15s ease',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 2,
            left: checked ? 22 : 2,
            width: 18,
            height: 18,
            borderRadius: 9,
            background: '#fff',
            transition: 'left 0.15s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }}
        />
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ display: 'none' }}
      />
    </label>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Trailing Offset Input
// ═══════════════════════════════════════════════════════════════════════════

function TrailingOffsetInput({
  offset,
  unit,
  onOffsetChange,
  onUnitChange,
  lastPrice,
}: {
  offset: number | undefined
  unit: 'percent' | 'price'
  onOffsetChange: (v: number) => void
  onUnitChange: (v: 'percent' | 'price') => void
  lastPrice: number | null
}) {
  const lp = typeof lastPrice === 'number' && Number.isFinite(lastPrice) && lastPrice > 0 ? lastPrice : null
  const resolvedPrice = lp && offset
    ? unit === 'percent'
      ? lp * (1 - offset / 100)
      : lp - offset
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 12, color: 'var(--kf-text-muted)', fontWeight: 750 }}>Trailing Offset</div>
        {resolvedPrice && (
          <div style={{ fontSize: 11, fontWeight: 800, color: '#38bdf8' }}>
            → ${resolvedPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
        <input
          type="number"
          value={offset == null ? '' : String(offset)}
          onChange={(e) => onOffsetChange(toNumber(e.target.value))}
          placeholder={unit === 'percent' ? '2.5' : '100'}
          style={{
            height: 42,
            borderRadius: 10,
            border: '1px solid var(--kf-border-2)',
            background: 'var(--kf-surface-4)',
            color: 'var(--kf-text)',
            padding: '0 12px',
            outline: 'none',
            fontSize: 14,
            fontWeight: 700,
          }}
        />
        <SegmentedControl
          options={[
            { value: 'percent' as const, label: '%' },
            { value: 'price' as const, label: '$' },
          ]}
          value={unit}
          onChange={onUnitChange}
        />
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Close Percent Slider
// ═══════════════════════════════════════════════════════════════════════════

function ClosePercentSlider({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 12, color: 'var(--kf-text-muted)', fontWeight: 750 }}>Close Percent</div>
        <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--kf-accent)' }}>{value}%</div>
      </div>
      <div style={{ position: 'relative', height: 6 }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            borderRadius: 3,
            background: 'var(--kf-surface-4)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${value}%`,
            borderRadius: 3,
            background: 'var(--kf-accent)',
            transition: 'width 0.1s ease',
          }}
        />
        <input
          type="range"
          min={1}
          max={100}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: -6,
            width: '100%',
            height: 18,
            opacity: 0,
            cursor: 'pointer',
          }}
        />
      </div>
      <QuickPercentButtons onSelect={onChange} activePercent={value} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Modal Component
// ═══════════════════════════════════════════════════════════════════════════

export default function TriggerActionConfigModal({
  open,
  actionType,
  config,
  onSave,
  onClose,
}: {
  open: boolean
  actionType: TriggerActionType | null
  config: ActionConfig | null
  onSave: (next: ActionConfig) => void
  onClose: () => void
}) {
  const { state: strategyState } = useStrategyContext()
  const { state: accountState } = useAccountContext()

  const lastPrice = strategyState.lastPrice
  const symbol = strategyState.symbol
  const balance = accountState.paper?.balances?.USD ?? 10000

  const [draft, setDraft] = useState<ActionConfig>({})

  useEffect(() => {
    if (!open) return
    setDraft(config ?? { size: 1000, sizeUnit: 'usd', leverage: 1, oneShot: true })
  }, [config, open])

  const title = useMemo(() => {
    if (!actionType) return 'Action'
    return actionTitle(actionType)
  }, [actionType])

  const isBuy = isBuyAction(actionType)
  const accentColor = isBuy ? '#22c55e' : '#ef4444'

  const showSize = actionType === 'market_buy' || actionType === 'market_sell' || actionType === 'limit_buy' || actionType === 'limit_sell'
  const showLeverage = showSize
  const showLimitPrice = actionType === 'limit_buy' || actionType === 'limit_sell' || actionType === 'stop_loss_limit' || actionType === 'take_profit_limit'
  const showStopPrice = actionType === 'stop_loss' || actionType === 'stop_loss_limit'
  const showTriggerPrice = actionType === 'take_profit' || actionType === 'take_profit_limit'
  const showTrailingOffset = actionType === 'trailing_stop' || actionType === 'trailing_stop_limit'
  const showLimitOffset = actionType === 'trailing_stop_limit'
  const showClosePercent = actionType === 'trailing_stop' || actionType === 'trailing_stop_limit' || actionType === 'stop_loss' || actionType === 'stop_loss_limit' || actionType === 'take_profit' || actionType === 'take_profit_limit'
  const showMessage = actionType === 'alert'

  const handleQuickPercent = (pct: number) => {
    const usdAmount = balance * (pct / 100)
    setDraft((d) => ({ ...d, size: usdAmount, sizeUnit: 'usd' }))
  }

  const footer = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
      <button
        type="button"
        onClick={onClose}
        style={{
          height: 40,
          padding: '0 16px',
          borderRadius: 12,
          border: '1px solid var(--kf-border-2)',
          background: 'var(--kf-surface-4)',
          color: 'var(--kf-text)',
          cursor: 'pointer',
          fontWeight: 850,
          fontSize: 13,
        }}
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={() => onSave(draft)}
        style={{
          height: 40,
          padding: '0 20px',
          borderRadius: 12,
          border: `1px solid ${accentColor}50`,
          background: `${accentColor}20`,
          color: accentColor,
          cursor: 'pointer',
          fontWeight: 900,
          fontSize: 13,
        }}
      >
        Save
      </button>
    </div>
  )

  return (
    <Modal open={open} title={title} onRequestClose={onClose} footer={footer} maxWidth={560}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* SIZE SECTION */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {showSize && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--kf-text)' }}>
                Position Size
              </div>
              <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--kf-accent)' }}>
                {(() => {
                  const pct = balance > 0 ? ((draft.size ?? 0) / balance) * 100 : 0
                  return `${Math.round(pct)}% of balance`
                })()}
              </div>
            </div>

            {/* Main slider */}
            <div
              style={{
                position: 'relative',
                height: 8,
                borderRadius: 4,
                boxShadow: '0 1px 0 rgba(255, 255, 255, 0.06)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                  borderRadius: 4,
                  background: 'var(--kf-surface-4)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${balance > 0 ? Math.min(100, ((draft.size ?? 0) / balance) * 100) : 0}%`,
                  borderRadius: 4,
                  background: 'linear-gradient(to right, var(--kf-accent), color-mix(in srgb, var(--kf-accent) 70%, #000))',
                  transition: 'width 0.08s ease',
                }}
              />
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={balance > 0 ? Math.min(100, ((draft.size ?? 0) / balance) * 100) : 0}
                onChange={(e) => {
                  const pct = Number(e.target.value)
                  const usdAmount = balance * (pct / 100)
                  setDraft((d) => ({ ...d, size: usdAmount, sizeUnit: 'usd' }))
                }}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: -6,
                  width: '100%',
                  height: 20,
                  opacity: 0,
                  cursor: 'pointer',
                }}
              />
            </div>

            {/* Quick percent buttons */}
            <QuickPercentButtons
              onSelect={handleQuickPercent}
              activePercent={
                balance > 0
                  ? Math.round(((draft.size ?? 0) / balance) * 100)
                  : undefined
              }
            />

            {/* Live conversion display */}
            <ValueDisplayCard
              sizeVal={draft.size ?? 0}
              sizeUnit={(draft.sizeUnit ?? 'usd') as 'usd' | 'base' | 'percent'}
              lastPrice={lastPrice}
              symbol={symbol}
              balance={balance}
            />
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* LEVERAGE */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {showLeverage && (
          <LeverageSlider
            value={draft.leverage ?? 1}
            onChange={(v) => setDraft((d) => ({ ...d, leverage: v }))}
            marginUsd={draft.size ?? 0}
            baseSymbol={symbol?.split('/')?.[0] ?? 'BTC'}
            lastPrice={lastPrice}
          />
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* PRICE INPUTS */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {showLimitPrice && (
          <PriceInputWithDiff
            label="Limit Price"
            value={draft.limitPrice}
            onChange={(v) => setDraft((d) => ({ ...d, limitPrice: v }))}
            lastPrice={lastPrice}
          />
        )}

        {showStopPrice && (
          <PriceInputWithDiff
            label="Stop Price"
            value={draft.stopPrice}
            onChange={(v) => setDraft((d) => ({ ...d, stopPrice: v }))}
            lastPrice={lastPrice}
            inverted={isBuy}
          />
        )}

        {showTriggerPrice && (
          <PriceInputWithDiff
            label="Trigger Price"
            value={draft.triggerPrice}
            onChange={(v) => setDraft((d) => ({ ...d, triggerPrice: v }))}
            lastPrice={lastPrice}
          />
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* TRAILING OFFSET */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {showTrailingOffset && (
          <TrailingOffsetInput
            offset={draft.trailingOffset}
            unit={(draft.trailingOffsetUnit ?? 'percent') as 'percent' | 'price'}
            onOffsetChange={(v) => setDraft((d) => ({ ...d, trailingOffset: v }))}
            onUnitChange={(v) => setDraft((d) => ({ ...d, trailingOffsetUnit: v }))}
            lastPrice={lastPrice}
          />
        )}

        {showLimitOffset && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 12, color: 'var(--kf-text-muted)', fontWeight: 750 }}>Limit Offset</div>
            <input
              type="number"
              value={draft.limitOffset == null ? '' : String(draft.limitOffset)}
              onChange={(e) => setDraft((d) => ({ ...d, limitOffset: toNumber(e.target.value) }))}
              placeholder="Offset from stop level"
              style={{
                height: 42,
                borderRadius: 10,
                border: '1px solid var(--kf-border-2)',
                background: 'var(--kf-surface-4)',
                color: 'var(--kf-text)',
                padding: '0 12px',
                outline: 'none',
                fontSize: 14,
                fontWeight: 700,
              }}
            />
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* CLOSE PERCENT */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {showClosePercent && (
          <ClosePercentSlider
            value={draft.closePercent ?? 100}
            onChange={(v) => setDraft((d) => ({ ...d, closePercent: v }))}
          />
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* ALERT MESSAGE */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {showMessage && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 12, color: 'var(--kf-text-muted)', fontWeight: 750 }}>Message</div>
            <textarea
              value={draft.message ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, message: e.target.value }))}
              placeholder="Alert message..."
              rows={3}
              style={{
                borderRadius: 10,
                border: '1px solid var(--kf-border-2)',
                background: 'var(--kf-surface-4)',
                color: 'var(--kf-text)',
                padding: 12,
                outline: 'none',
                fontSize: 13,
                resize: 'none',
              }}
            />
          </div>
        )}

        {/* One shot is always true by default, hidden from UI */}
      </div>
    </Modal>
  )
}
