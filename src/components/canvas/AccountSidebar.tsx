import { useMemo, type CSSProperties } from 'react'

import { useAccountContext } from '../../contexts/AccountContext'
import { useStrategyContext } from '../../contexts/StrategyContext'
import type { ShapeTrigger } from '../../utils/strategyStorage'
import { getConditionIcon, IconTrash } from '../strategy-builder/TriggerIcons'

function formatUsd(v: number) {
  return v.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
}

function fmt4(v: number) {
  return v.toLocaleString(undefined, { maximumFractionDigits: 4 })
}

type SetInfo = {
  name: string
  createdAt: number
}

type AccountSidebarProps = {
  triggers?: ShapeTrigger[]
  onSelectTrigger?: (trigger: ShapeTrigger) => void
  onDeleteTrigger?: (trigger: ShapeTrigger) => void
  setNameDraft: string
  setSetNameDraft: (v: string) => void
  onSaveSet: () => void
  selectedSetName: string
  setSelectedSetName: (v: string) => void
  sets: SetInfo[]
  onLoadSet: () => void
  onDeleteSet: () => void
}

export default function AccountSidebar({
  triggers = [],
  onSelectTrigger,
  onDeleteTrigger,
  setNameDraft,
  setSetNameDraft,
  onSaveSet,
  selectedSetName,
  setSelectedSetName,
  sets,
  onLoadSet,
  onDeleteSet,
}: AccountSidebarProps) {
  const { state } = useAccountContext()
  const paper = state.paper

  const {
    state: { lastPrice, symbol },
  } = useStrategyContext()

  const activeTriggers = useMemo(() => triggers.filter(t => t.isActive), [triggers])

  const sectionStyle: CSSProperties = useMemo(
    () => ({
      borderRadius: 16,
      border: '1px solid var(--kf-border-1)',
      background: 'var(--kf-surface-3)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }),
    [],
  )

  const sectionHeaderStyle: CSSProperties = useMemo(
    () => ({
      padding: '8px 12px',
      borderBottom: '1px solid var(--kf-border-1)',
      background: 'var(--kf-surface-4)',
      fontSize: 11,
      fontWeight: 900,
      letterSpacing: 0.5,
      color: 'var(--kf-text)',
      textTransform: 'uppercase',
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }),
    [],
  )

  const bodyStyle: CSSProperties = useMemo(
    () => ({
      padding: 0,
      color: 'var(--kf-text)',
      fontSize: 12,
      overflowY: 'auto',
    }),
    [],
  )

  const tableWrapStyle: CSSProperties = useMemo(
    () => ({
      overflowX: 'auto',
      overflowY: 'auto',
      maxHeight: 200,
    }),
    [],
  )

  const thStyle: CSSProperties = useMemo(
    () => ({
      textAlign: 'left',
      fontSize: 10,
      fontWeight: 850,
      color: 'var(--kf-text-muted)',
      padding: '6px 10px',
      borderBottom: '1px solid var(--kf-border-1)',
      whiteSpace: 'nowrap',
      background: 'var(--kf-surface-3)',
      position: 'sticky',
      top: 0,
    }),
    [],
  )

  const tdStyle: CSSProperties = useMemo(
    () => ({
      padding: '6px 10px',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      whiteSpace: 'nowrap',
      fontSize: 11,
      fontWeight: 650,
    }),
    [],
  )

  const emptyStyle: CSSProperties = useMemo(
    () => ({
      color: 'var(--kf-text-muted)',
      fontSize: 11,
      fontWeight: 650,
      padding: '8px 10px',
    }),
    [],
  )

  const usdBalance = useMemo(() => {
    const v = paper?.balances?.USD
    return typeof v === 'number' && Number.isFinite(v) ? v : 0
  }, [paper?.balances?.USD])

  const pnlFor = useMemo(() => {
    const lp = typeof lastPrice === 'number' && Number.isFinite(lastPrice) ? lastPrice : null
    return (pos: { symbol: string; side: 'long' | 'short'; amount: number; entryPrice: number }) => {
      if (!lp || pos.symbol !== symbol || !(pos.entryPrice > 0)) {
        return null
      }
      const diff = pos.side === 'long' ? lp - pos.entryPrice : pos.entryPrice - lp
      const pnlUsd = diff * pos.amount
      const pnlPct = (diff * 100) / pos.entryPrice
      if (!Number.isFinite(pnlUsd) || !Number.isFinite(pnlPct)) {
        return null
      }
      return { pnlUsd, pnlPct }
    }
  }, [lastPrice, symbol])

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 8,
      }}
    >
      {/* ───────────────────────────────────────────────────────────── */}
      {/* ACCOUNT SECTION */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div style={{ ...sectionStyle, flex: '1 1 auto', minHeight: 0 }}>
        <div style={sectionHeaderStyle}>Account</div>
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0, paddingBottom: 0 }}>

          {/* Balance */}
          <div style={{ padding: '8px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--kf-border-1)' }}>
              <div style={{ color: 'var(--kf-text-muted)', fontWeight: 750 }}>USD Balance</div>
              <div style={{ fontWeight: 900, fontSize: 13 }}>{formatUsd(usdBalance)}</div>
            </div>
          </div>

          {/* Open Positions */}
          <div>
            <div style={{ padding: '8px 12px 4px 12px', fontSize: 10, fontWeight: 800, color: 'var(--kf-text-muted)', textTransform: 'uppercase' }}>Open Positions</div>
            <div style={tableWrapStyle}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 320 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Symbol</th>
                    <th style={thStyle}>Side</th>
                    <th style={thStyle}>Amt</th>
                    <th style={thStyle}>Entry</th>
                    <th style={thStyle}>PnL</th>
                  </tr>
                </thead>
                <tbody>
                  {paper?.openPositions?.length ? (
                    paper.openPositions.map((p) => (
                      <tr key={p.id}>
                        <td style={tdStyle}>{p.symbol}</td>
                        <td style={tdStyle}>{p.side}</td>
                        <td style={tdStyle}>{fmt4(p.amount)}</td>
                        <td style={tdStyle}>{fmt4(p.entryPrice)}</td>
                        <td style={{ ...tdStyle, color: (() => {
                          const pnl = pnlFor(p)
                          if (!pnl) return 'var(--kf-text-muted)'
                          return pnl.pnlUsd >= 0 ? '#22c55e' : '#ef4444'
                        })() }}>
                          {(() => {
                            const pnl = pnlFor(p)
                            if (!pnl) return '--'
                            const usd = pnl.pnlUsd
                            const pct = pnl.pnlPct
                            const usdStr = `${usd >= 0 ? '+' : ''}${usd.toFixed(2)}`
                            const pctStr = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`
                            return `${usdStr} (${pctStr})`
                          })()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={5} style={emptyStyle}>No open positions</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Open Orders */}
          <div>
            <div style={{ padding: '8px 12px 4px 12px', fontSize: 10, fontWeight: 800, color: 'var(--kf-text-muted)', textTransform: 'uppercase' }}>Open Orders</div>
            <div style={tableWrapStyle}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 320 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Side</th>
                    <th style={thStyle}>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {paper?.openOrders?.length ? (
                    paper.openOrders.map((o) => (
                      <tr key={o.id}>
                        <td style={tdStyle}>{o.type}</td>
                        <td style={tdStyle}>{o.side}</td>
                        <td style={tdStyle}>{o.price ?? 'Market'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={3} style={emptyStyle}>No open orders</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Closed Orders */}
          <div>
            <div style={{ padding: '8px 12px 4px 12px', fontSize: 10, fontWeight: 800, color: 'var(--kf-text-muted)', textTransform: 'uppercase' }}>Closed Orders</div>
            <div style={tableWrapStyle}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 320 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Side</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Fill</th>
                  </tr>
                </thead>
                <tbody>
                  {paper?.orderHistory?.length ? (
                    paper.orderHistory.slice(0, 50).map((o) => (
                      <tr key={o.id}>
                        <td style={tdStyle}>{o.type}</td>
                        <td style={tdStyle}>{o.side}</td>
                        <td style={tdStyle}>{o.status}</td>
                        <td style={tdStyle}>{typeof o.filledPrice === 'number' ? o.filledPrice : '--'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={4} style={emptyStyle}>No closed orders</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TRIGGERS SECTION */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div style={{ ...sectionStyle, flex: '1 1 auto', minHeight: 0 }}>
        <div style={sectionHeaderStyle}>
          Triggers <span style={{ opacity: 0.5, fontSize: 10 }}>{activeTriggers.length} Active</span>
        </div>
        <div style={bodyStyle}>
          {activeTriggers.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {activeTriggers.map(t => (
                <div
                  key={t.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--kf-border-1)',
                    background: 'transparent',
                    transition: 'background 0.1s'
                  }}
                  className="hover:bg-white/5"
                  onClick={() => onSelectTrigger?.(t)}
                >
                  <div style={{ color: 'var(--kf-accent)' }}>
                    {getConditionIcon(t.condition, 14)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.condition}</div>
                    <div style={{ fontSize: 10, opacity: 0.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.shapeType} • {t.actions.length} actions</div>
                  </div>

                  {/* Status Indicator */}
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />

                  {/* Delete Button */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteTrigger?.(t)
                    }}
                    style={{
                      padding: 4, borderRadius: 4,
                      color: 'var(--kf-text-muted)',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                    className="hover:bg-white/10 hover:text-red-400"
                  >
                    <IconTrash size={12} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: 12, color: 'var(--kf-text-muted)', fontStyle: 'italic' }}>
              No active triggers
            </div>
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* STRATEGIES SECTION */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div style={{ ...sectionStyle, flex: '0 0 auto' }}>
        <div style={sectionHeaderStyle}>Strategies</div>
        <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--kf-text-muted)', textTransform: 'uppercase' }}>Sets</div>

          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={setNameDraft}
              onChange={(e) => setSetNameDraft(e.target.value)}
              placeholder="Set name..."
              style={{
                flex: 1,
                height: 28,
                borderRadius: 6,
                border: '1px solid var(--kf-border-2)',
                background: 'var(--kf-surface-4)',
                color: 'var(--kf-text)',
                padding: '0 8px',
                fontSize: 11,
              }}
            />
            <button
              onClick={onSaveSet}
              disabled={!setNameDraft.trim()}
              style={{
                height: 28,
                borderRadius: 6,
                border: '1px solid var(--kf-border-2)',
                background: 'var(--kf-surface-4)',
                color: 'var(--kf-text)',
                padding: '0 12px',
                cursor: setNameDraft.trim() ? 'pointer' : 'not-allowed',
                fontWeight: 700,
                fontSize: 11,
                opacity: setNameDraft.trim() ? 1 : 0.5,
              }}
            >
              Save
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <select
              value={selectedSetName}
              onChange={(e) => setSelectedSetName(e.target.value)}
              style={{
                height: 28,
                borderRadius: 6,
                border: '1px solid var(--kf-border-2)',
                background: 'var(--kf-surface-4)',
                color: 'var(--kf-text)',
                padding: '0 8px',
                fontSize: 11,
                width: '100%',
              }}
            >
              <option value="">(select set)</option>
              {sets.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>

            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={onLoadSet}
                disabled={!selectedSetName.trim()}
                style={{
                  flex: 1,
                  height: 28,
                  borderRadius: 6,
                  border: '1px solid var(--kf-border-2)',
                  background: 'var(--kf-surface-4)',
                  color: 'var(--kf-text)',
                  padding: '0 10px',
                  cursor: selectedSetName.trim() ? 'pointer' : 'not-allowed',
                  fontWeight: 700,
                  fontSize: 11,
                  opacity: selectedSetName.trim() ? 1 : 0.5,
                }}
              >
                Load
              </button>
              <button
                onClick={() => {
                  if (selectedSetName.trim() && window.confirm(`Delete set '${selectedSetName}'?`)) {
                    onDeleteSet()
                  }
                }}
                disabled={!selectedSetName.trim()}
                style={{
                  height: 28,
                  borderRadius: 6,
                  border: '1px solid #7f1d1d',
                  background: 'var(--kf-surface-4)',
                  color: '#fecaca',
                  padding: '0 10px',
                  cursor: selectedSetName.trim() ? 'pointer' : 'not-allowed',
                  fontWeight: 700,
                  fontSize: 11,
                  opacity: selectedSetName.trim() ? 1 : 0.5,
                }}
              >
                Delete
              </button>
            </div>
          </div>

          {sets.length === 0 && (
            <div style={{ color: 'var(--kf-text-muted)', fontSize: 10, fontStyle: 'italic', textAlign: 'center' }}>
              No saved sets
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
