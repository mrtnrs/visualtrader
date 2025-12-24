export type StrategyNodeType =
  | 'entry'
  | 'limit'
  | 'market'
  | 'stop_loss'
  | 'stop_loss_limit'
  | 'take_profit'
  | 'take_profit_limit'
  | 'iceberg'
  | 'trailing_stop'
  | 'trailing_stop_limit'

export type OrderSide = 'buy' | 'sell'

export type BaseNodeData = {
  label: string
}

export type OrderNodeData = BaseNodeData & {
  side: OrderSide
  active: boolean
  quantity: number

  skin?: 'card' | 'line'

  gates?: {
    rsi?: { enabled: boolean; period: number; op: 'lt' | 'gt'; value: number }
    volume?: { enabled: boolean; op: 'lt' | 'gt'; value: number; lookback: number }
  }
  failAction?: 'freeze' | 'partial_fill' | 'override'
  partialFillPercent?: number

  activationLineId?: string

  runtime?: {
    status: 'idle' | 'armed' | 'frozen' | 'filled'
    filledPercent?: number
    fillPrice?: number
    fillTimestamp?: number
    note?: string
    lastPnlPct?: number
    riskLevel?: 'ok' | 'warn' | 'danger'
  }

  anchorPrice?: number
  anchorTimestamp?: number

  limitPrice?: number
  stopPrice?: number
  triggerPrice?: number
  trailingOffset?: number
  limitOffset?: number
  closePercent?: number
  trailRefPrice?: number
  triggered?: boolean
  postOnly?: boolean
  totalQuantity?: number
  visibleQuantity?: number

  isChild?: boolean
  hasChildren?: boolean
  childrenCount?: number
}
