export type SlippageConfig = {
  enabled: boolean
  model: 'percentage'
  percentBps: number
}

export const DEFAULT_SLIPPAGE_CONFIG: SlippageConfig = {
  enabled: true,
  model: 'percentage',
  percentBps: 2,
}

export function applySlippage(price: number, side: 'buy' | 'sell', quantity: number, config: SlippageConfig): number {
  if (!Number.isFinite(price) || price <= 0) {
    return price
  }
  if (!config.enabled) {
    return price
  }

  const bps = Number.isFinite(config.percentBps) ? Math.max(0, config.percentBps) : 0
  const magnitude = price * (bps / 10_000)

  const randomized = magnitude * (0.8 + Math.random() * 0.4)
  const signed = side === 'buy' ? randomized : -randomized

  void quantity
  return price + signed
}
