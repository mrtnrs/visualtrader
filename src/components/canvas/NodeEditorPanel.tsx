import { useMemo } from 'react'
import type { Node } from '@xyflow/react'

import { useStrategyContext } from '../../contexts/StrategyContext'
import type { OrderNodeData, OrderSide, StrategyNodeType } from '../nodes/types'

import type { ActivationLine } from '../../utils/strategyStorage'

type Props = {
  nodes: Node[]
  activationLines: ActivationLine[]
  onUpdateNodeData: (nodeId: string, patch: Partial<OrderNodeData> & { label?: string }) => void
  onAttachTrailingStop: (parentNodeId: string, variant: 'trailing_stop' | 'trailing_stop_limit') => void
  onCollapse?: () => void
}

function toNumber(value: string): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

export default function NodeEditorPanel({ nodes, activationLines, onUpdateNodeData, onAttachTrailingStop, onCollapse }: Props) {


  const {
    state: { selectedNodeId },
  } = useStrategyContext()

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) {
      return null
    }
    return nodes.find((n) => n.id === selectedNodeId) ?? null
  }, [nodes, selectedNodeId])

  const nodeType = (selectedNode?.type ?? null) as StrategyNodeType | null
  const nodeData = (selectedNode?.data as OrderNodeData | undefined) ?? null
  const nodeLabel = nodeData?.label ?? ''

  const isOrderNode = nodeType != null && nodeType !== 'entry'

  const side = (nodeData?.side ?? 'buy') as OrderSide
  const active = Boolean(nodeData?.active)
  const quantity = typeof nodeData?.quantity === 'number' ? nodeData.quantity : 0

  const lineOptions = activationLines
  const rsiGate = nodeData?.gates?.rsi
  const volGate = nodeData?.gates?.volume

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
        <div style={{ fontWeight: 700 }}>Node</div>
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
            title="Collapse Node panel"
          >
            Collapse
          </button>
        ) : null}
      </div>

      {!selectedNode ? (
        <div style={{ color: 'var(--kf-text-muted)' }}>Select a node to edit its parameters.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--kf-text-muted)' }}>{nodeType}</div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 12, color: 'var(--kf-text-muted)' }}>Label</div>
            <input
              value={nodeLabel}
              onChange={(e) => onUpdateNodeData(selectedNode.id, { label: e.target.value })}
              style={{
                height: 36,
                borderRadius: 10,
                border: '1px solid var(--kf-border-2)',
                background: 'var(--kf-surface-4)',
                color: 'var(--kf-text)',
                padding: '0 10px',
                outline: 'none',
              }}
            />
          </label>

          {isOrderNode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ fontSize: 12, color: 'var(--kf-text-muted)' }}>Active</div>
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => onUpdateNodeData(selectedNode.id, { active: e.target.checked })}
                />
              </label>

              <div style={{ borderTop: '1px solid var(--kf-border-1)', paddingTop: 10, marginTop: 4 }}>
                <div style={{ fontSize: 12, color: 'var(--kf-text-muted)', marginBottom: 8 }}>Cross-line activation</div>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 12, color: 'var(--kf-text-muted)' }}>Activation line</div>
                  <select
                    value={nodeData?.activationLineId ?? ''}
                    onChange={(e) => onUpdateNodeData(selectedNode.id, { activationLineId: e.target.value || undefined })}
                    style={{
                      height: 36,
                      borderRadius: 10,
                      border: '1px solid var(--kf-border-2)',
                      background: 'var(--kf-surface-4)',
                      color: 'var(--kf-text)',
                      padding: '0 10px',
                      outline: 'none',
                    }}
                  >
                    <option value="">(none)</option>
                    {lineOptions.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div style={{ borderTop: '1px solid var(--kf-border-1)', paddingTop: 10, marginTop: 4 }}>
                <div style={{ fontSize: 12, color: 'var(--kf-text-muted)', marginBottom: 8 }}>Bot triggers (gates)</div>

                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ fontSize: 12, color: 'var(--kf-text-muted)' }}>RSI gate</div>
                  <input
                    type="checkbox"
                    checked={Boolean(nodeData?.gates?.rsi?.enabled)}
                    onChange={(e) => {
                      const enabled = e.target.checked
                      const prev = nodeData?.gates?.rsi
                      onUpdateNodeData(selectedNode.id, {
                        gates: {
                          ...(nodeData?.gates ?? {}),
                          rsi: {
                            enabled,
                            period: typeof prev?.period === 'number' ? prev.period : 14,
                            op: prev?.op === 'gt' ? 'gt' : 'lt',
                            value: typeof prev?.value === 'number' ? prev.value : 30,
                          },
                        },
                      })
                    }}
                  />
                </label>

                {rsiGate?.enabled ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ fontSize: 12, color: 'var(--kf-text-muted)' }}>Op</div>
                      <select
                        value={rsiGate.op}
                        onChange={(e) =>
                          onUpdateNodeData(selectedNode.id, {
                            gates: {
                              ...(nodeData?.gates ?? {}),
                              rsi: { ...(rsiGate as any), op: e.target.value as any },
                            },
                          })
                        }
                        style={{
                          height: 36,
                          borderRadius: 10,
                          border: '1px solid var(--kf-border-2)',
                          background: 'var(--kf-surface-4)',
                          color: 'var(--kf-text)',
                          padding: '0 10px',
                          outline: 'none',
                        }}
                      >
                        <option value="lt">&lt;</option>
                        <option value="gt">&gt;</option>
                      </select>
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ fontSize: 12, color: 'var(--kf-text-muted)' }}>Value</div>
                      <input
                        value={String(rsiGate.value)}
                        onChange={(e) =>
                          onUpdateNodeData(selectedNode.id, {
                            gates: {
                              ...(nodeData?.gates ?? {}),
                              rsi: { ...(rsiGate as any), value: toNumber(e.target.value) },
                            },
                          })
                        }
                        style={{
                          height: 36,
                          borderRadius: 10,
                          border: '1px solid var(--kf-border-2)',
                          background: 'var(--kf-surface-4)',
                          color: 'var(--kf-text)',
                          padding: '0 10px',
                          outline: 'none',
                        }}
                      />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ fontSize: 12, color: 'var(--kf-text-muted)' }}>Period</div>
                      <input
                        value={String(rsiGate.period)}
                        onChange={(e) =>
                          onUpdateNodeData(selectedNode.id, {
                            gates: {
                              ...(nodeData?.gates ?? {}),
                              rsi: { ...(rsiGate as any), period: Math.max(2, Math.round(toNumber(e.target.value))) },
                            },
                          })
                        }
                        style={{
                          height: 36,
                          borderRadius: 10,
                          border: '1px solid var(--kf-border-2)',
                          background: 'var(--kf-surface-4)',
                          color: 'var(--kf-text)',
                          padding: '0 10px',
                          outline: 'none',
                        }}
                      />
                    </label>
                  </div>
                ) : null}

                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 8 }}>
                  <div style={{ fontSize: 12, color: 'var(--kf-text-muted)' }}>Volume gate</div>
                  <input
                    type="checkbox"
                    checked={Boolean(nodeData?.gates?.volume?.enabled)}
                    onChange={(e) => {
                      const enabled = e.target.checked
                      const prev = nodeData?.gates?.volume
                      onUpdateNodeData(selectedNode.id, {
                        gates: {
                          ...(nodeData?.gates ?? {}),
                          volume: {
                            enabled,
                            op: prev?.op === 'gt' ? 'gt' : 'lt',
                            value: typeof prev?.value === 'number' ? prev.value : 0,
                            lookback: typeof prev?.lookback === 'number' ? prev.lookback : 40,
                          },
                        },
                      })
                    }}
                  />
                </label>

                {volGate?.enabled ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ fontSize: 12, color: 'var(--kf-text-muted)' }}>Op</div>
                      <select
                        value={volGate.op}
                        onChange={(e) =>
                          onUpdateNodeData(selectedNode.id, {
                            gates: {
                              ...(nodeData?.gates ?? {}),
                              volume: { ...(volGate as any), op: e.target.value as any },
                            },
                          })
                        }
                        style={{
                          height: 36,
                          borderRadius: 10,
                          border: '1px solid var(--kf-border-2)',
                          background: 'var(--kf-surface-4)',
                          color: 'var(--kf-text)',
                          padding: '0 10px',
                          outline: 'none',
                        }}
                      >
                        <option value="lt">&lt;</option>
                        <option value="gt">&gt;</option>
                      </select>
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ fontSize: 12, color: 'var(--kf-text-muted)' }}>Value</div>
                      <input
                        value={String(volGate.value)}
                        onChange={(e) =>
                          onUpdateNodeData(selectedNode.id, {
                            gates: {
                              ...(nodeData?.gates ?? {}),
                              volume: { ...(volGate as any), value: toNumber(e.target.value) },
                            },
                          })
                        }
                        style={{
                          height: 36,
                          borderRadius: 10,
                          border: '1px solid var(--kf-border-2)',
                          background: 'var(--kf-surface-4)',
                          color: 'var(--kf-text)',
                          padding: '0 10px',
                          outline: 'none',
                        }}
                      />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ fontSize: 12, color: 'var(--kf-text-muted)' }}>Lookback</div>
                      <input
                        value={String(volGate.lookback)}
                        onChange={(e) =>
                          onUpdateNodeData(selectedNode.id, {
                            gates: {
                              ...(nodeData?.gates ?? {}),
                              volume: { ...(volGate as any), lookback: Math.max(5, Math.round(toNumber(e.target.value))) },
                            },
                          })
                        }
                        style={{
                          height: 36,
                          borderRadius: 10,
                          border: '1px solid var(--kf-border-2)',
                          background: 'var(--kf-surface-4)',
                          color: 'var(--kf-text)',
                          padding: '0 10px',
                          outline: 'none',
                        }}
                      />
                    </label>
                  </div>
                ) : null}

                <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                  <div style={{ fontSize: 12, color: 'var(--kf-text-muted)' }}>On gate fail</div>
                  <select
                    value={nodeData?.failAction ?? 'freeze'}
                    onChange={(e) => onUpdateNodeData(selectedNode.id, { failAction: e.target.value as any })}
                    style={{
                      height: 36,
                      borderRadius: 10,
                      border: '1px solid var(--kf-border-2)',
                      background: 'var(--kf-surface-4)',
                      color: 'var(--kf-text)',
                      padding: '0 10px',
                      outline: 'none',
                    }}
                  >
                    <option value="freeze">Freeze</option>
                    <option value="partial_fill">Partial fill</option>
                    <option value="override">Override</option>
                  </select>
                </label>

                {nodeData?.failAction === 'partial_fill' ? (
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 12, color: 'var(--kf-text-muted)' }}>Partial fill percent</div>
                    <input
                      value={String(nodeData?.partialFillPercent ?? 25)}
                      onChange={(e) => onUpdateNodeData(selectedNode.id, { partialFillPercent: Math.max(1, Math.min(100, toNumber(e.target.value))) })}
                      style={{
                        height: 36,
                        borderRadius: 10,
                        border: '1px solid var(--kf-border-2)',
                        background: 'var(--kf-surface-4)',
                        color: 'var(--kf-text)',
                        padding: '0 10px',
                        outline: 'none',
                      }}
                    />
                  </label>
                ) : null}
              </div>

              {nodeData?.runtime ? (
                <div style={{ borderTop: '1px solid var(--kf-border-1)', paddingTop: 10, marginTop: 4, fontSize: 12, color: 'var(--kf-text-muted)' }}>
                  Runtime: {nodeData.runtime.status}
                  {typeof nodeData.runtime.filledPercent === 'number' ? ` · ${nodeData.runtime.filledPercent}%` : ''}
                  {nodeData.runtime.note ? ` · ${nodeData.runtime.note}` : ''}
                </div>
              ) : null}

              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 12, color: 'var(--kf-text-muted)' }}>Side</div>
                <select
                  value={side}
                  onChange={(e) => onUpdateNodeData(selectedNode.id, { side: e.target.value as OrderSide })}
                  style={{
                    height: 36,
                    borderRadius: 10,
                    border: '1px solid var(--kf-border-2)',
                    background: 'var(--kf-surface-4)',
                    color: 'var(--kf-text)',
                    padding: '0 10px',
                    outline: 'none',
                  }}
                >
                  <option value="buy">Buy</option>
                  <option value="sell">Sell</option>
                </select>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 12, color: 'var(--kf-text-muted)' }}>Quantity</div>
                <input
                  value={String(quantity)}
                  onChange={(e) => onUpdateNodeData(selectedNode.id, { quantity: toNumber(e.target.value) })}
                  style={{
                    height: 36,
                    borderRadius: 10,
                    border: '1px solid var(--kf-border-2)',
                    background: 'var(--kf-surface-4)',
                    color: 'var(--kf-text)',
                    padding: '0 10px',
                    outline: 'none',
                  }}
                />
              </label>

              {nodeType === 'limit' ? (
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 12, color: 'var(--kf-text-muted)' }}>Limit price</div>
                  <input
                    value={String(nodeData?.limitPrice ?? '')}
                    onChange={(e) => onUpdateNodeData(selectedNode.id, { limitPrice: toNumber(e.target.value) })}
                    style={{
                      height: 36,
                      borderRadius: 10,
                      border: '1px solid var(--kf-border-2)',
                      background: 'var(--kf-surface-4)',
                      color: 'var(--kf-text)',
                      padding: '0 10px',
                      outline: 'none',
                    }}
                  />
                </label>
              ) : null}

              {nodeType === 'limit' ? (
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ fontSize: 12, color: 'var(--kf-text-muted)' }}>Post only</div>
                  <input
                    type="checkbox"
                    checked={Boolean(nodeData?.postOnly)}
                    onChange={(e) => onUpdateNodeData(selectedNode.id, { postOnly: e.target.checked })}
                  />
                </label>
              ) : null}

              {nodeType === 'stop_loss' || nodeType === 'stop_loss_limit' ? (
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 12, color: 'var(--kf-text-muted)' }}>Stop price</div>
                  <input
                    value={String(nodeData?.stopPrice ?? '')}
                    onChange={(e) => onUpdateNodeData(selectedNode.id, { stopPrice: toNumber(e.target.value) })}
                    style={{
                      height: 36,
                      borderRadius: 10,
                      border: '1px solid var(--kf-border-2)',
                      background: 'var(--kf-surface-4)',
                      color: 'var(--kf-text)',
                      padding: '0 10px',
                      outline: 'none',
                    }}
                  />
                </label>
              ) : null}

              {nodeType === 'stop_loss_limit' ? (
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 12, color: 'var(--kf-text-muted)' }}>Limit price</div>
                  <input
                    value={String(nodeData?.limitPrice ?? '')}
                    onChange={(e) => onUpdateNodeData(selectedNode.id, { limitPrice: toNumber(e.target.value) })}
                    style={{
                      height: 36,
                      borderRadius: 10,
                      border: '1px solid var(--kf-border-2)',
                      background: 'var(--kf-surface-4)',
                      color: 'var(--kf-text)',
                      padding: '0 10px',
                      outline: 'none',
                    }}
                  />
                </label>
              ) : null}

              {nodeType === 'take_profit' || nodeType === 'take_profit_limit' ? (
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 12, color: 'var(--kf-text-muted)' }}>Trigger price</div>
                  <input
                    value={String(nodeData?.triggerPrice ?? '')}
                    onChange={(e) => onUpdateNodeData(selectedNode.id, { triggerPrice: toNumber(e.target.value) })}
                    style={{
                      height: 36,
                      borderRadius: 10,
                      border: '1px solid var(--kf-border-2)',
                      background: 'var(--kf-surface-4)',
                      color: 'var(--kf-text)',
                      padding: '0 10px',
                      outline: 'none',
                    }}
                  />
                </label>
              ) : null}

              {nodeType === 'take_profit_limit' ? (
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 12, color: 'var(--kf-text-muted)' }}>Limit price</div>
                  <input
                    value={String(nodeData?.limitPrice ?? '')}
                    onChange={(e) => onUpdateNodeData(selectedNode.id, { limitPrice: toNumber(e.target.value) })}
                    style={{
                      height: 36,
                      borderRadius: 10,
                      border: '1px solid var(--kf-border-2)',
                      background: 'var(--kf-surface-4)',
                      color: 'var(--kf-text)',
                      padding: '0 10px',
                      outline: 'none',
                    }}
                  />
                </label>
              ) : null}

              {nodeType === 'trailing_stop' || nodeType === 'trailing_stop_limit' ? (
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 12, color: 'var(--kf-text-muted)' }}>Trailing offset</div>
                  <input
                    value={String(nodeData?.trailingOffset ?? '')}
                    onChange={(e) => onUpdateNodeData(selectedNode.id, { trailingOffset: toNumber(e.target.value) })}
                    style={{
                      height: 36,
                      borderRadius: 10,
                      border: '1px solid var(--kf-border-2)',
                      background: 'var(--kf-surface-4)',
                      color: 'var(--kf-text)',
                      padding: '0 10px',
                      outline: 'none',
                    }}
                  />
                </label>
              ) : null}

              {nodeType === 'trailing_stop' || nodeType === 'trailing_stop_limit' ? (
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 12, color: 'var(--kf-text-muted)' }}>Close percent</div>
                  <input
                    value={String(nodeData?.closePercent ?? 100)}
                    onChange={(e) => onUpdateNodeData(selectedNode.id, { closePercent: Math.max(1, Math.min(100, toNumber(e.target.value))) })}
                    style={{
                      height: 36,
                      borderRadius: 10,
                      border: '1px solid var(--kf-border-2)',
                      background: 'var(--kf-surface-4)',
                      color: 'var(--kf-text)',
                      padding: '0 10px',
                      outline: 'none',
                    }}
                  />
                </label>
              ) : null}

              {nodeType === 'trailing_stop_limit' ? (
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 12, color: 'var(--kf-text-muted)' }}>Limit offset</div>
                  <input
                    value={String(nodeData?.limitOffset ?? '')}
                    onChange={(e) => onUpdateNodeData(selectedNode.id, { limitOffset: toNumber(e.target.value) })}
                    style={{
                      height: 36,
                      borderRadius: 10,
                      border: '1px solid var(--kf-border-2)',
                      background: 'var(--kf-surface-4)',
                      color: 'var(--kf-text)',
                      padding: '0 10px',
                      outline: 'none',
                    }}
                  />
                </label>
              ) : null}

              {nodeType === 'iceberg' ? (
                <>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 12, color: 'var(--kf-text-muted)' }}>Limit price</div>
                    <input
                      value={String(nodeData?.limitPrice ?? '')}
                      onChange={(e) => onUpdateNodeData(selectedNode.id, { limitPrice: toNumber(e.target.value) })}
                      style={{
                        height: 36,
                        borderRadius: 10,
                        border: '1px solid var(--kf-border-2)',
                        background: 'var(--kf-surface-4)',
                        color: 'var(--kf-text)',
                        padding: '0 10px',
                        outline: 'none',
                      }}
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 12, color: 'var(--kf-text-muted)' }}>Total quantity</div>
                    <input
                      value={String(nodeData?.totalQuantity ?? '')}
                      onChange={(e) => onUpdateNodeData(selectedNode.id, { totalQuantity: toNumber(e.target.value) })}
                      style={{
                        height: 36,
                        borderRadius: 10,
                        border: '1px solid var(--kf-border-2)',
                        background: 'var(--kf-surface-4)',
                        color: 'var(--kf-text)',
                        padding: '0 10px',
                        outline: 'none',
                      }}
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 12, color: 'var(--kf-text-muted)' }}>Visible quantity</div>
                    <input
                      value={String(nodeData?.visibleQuantity ?? '')}
                      onChange={(e) => onUpdateNodeData(selectedNode.id, { visibleQuantity: toNumber(e.target.value) })}
                      style={{
                        height: 36,
                        borderRadius: 10,
                        border: '1px solid var(--kf-border-2)',
                        background: 'var(--kf-surface-4)',
                        color: 'var(--kf-text)',
                        padding: '0 10px',
                        outline: 'none',
                      }}
                    />
                  </label>
                </>
              ) : null}

              {nodeType === 'limit' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
                  <div style={{ fontSize: 12, color: 'var(--kf-text-muted)' }}>Child blocks</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => onAttachTrailingStop(selectedNode.id, 'trailing_stop')}
                      style={{
                        flex: 1,
                        height: 34,
                        borderRadius: 10,
                        border: '1px solid var(--kf-border-2)',
                        background: 'var(--kf-surface-4)',
                        color: 'var(--kf-text)',
                        cursor: 'pointer',
                      }}
                    >
                      + Trailing Stop
                    </button>
                    <button
                      type="button"
                      onClick={() => onAttachTrailingStop(selectedNode.id, 'trailing_stop_limit')}
                      style={{
                        flex: 1,
                        height: 34,
                        borderRadius: 10,
                        border: '1px solid var(--kf-border-2)',
                        background: 'var(--kf-surface-4)',
                        color: 'var(--kf-text)',
                        cursor: 'pointer',
                      }}
                    >
                      + Trailing Stop Limit
                    </button>
                  </div>
                </div>
              ) : null}

              {typeof nodeData?.anchorPrice === 'number' ? (
                <div style={{ fontSize: 12, color: 'var(--kf-text-muted)' }}>
                  Anchor price: {nodeData.anchorPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
              ) : null}
            </div>
          ) : null}

          <div style={{ fontSize: 12, color: 'var(--kf-text-muted)' }}>More config UI will go here per-node type.</div>
        </div>
      )}
    </aside>
  )
}
