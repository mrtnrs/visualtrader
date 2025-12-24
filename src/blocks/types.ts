export type BlockId = string

export type BlockSide = 'buy' | 'sell'

export type BlockKind =
  | 'entry'
  | 'market'
  | 'limit'
  | 'stop_loss'
  | 'stop_loss_limit'
  | 'take_profit'
  | 'take_profit_limit'
  | 'trailing_stop'
  | 'trailing_stop_limit'
  | 'iceberg'
  | 'close'

export type BlockRole = 'standalone' | 'entry' | 'exit'

export type BlockSkin = 'card' | 'line'

export type BlockAnchor = {
  price: number
  timestamp?: number
}

export type BlockAllocation = {
  quantity: number
  closePercent?: number
}

export type BlockParams = {
  postOnly?: boolean
  limitPrice?: number
  stopPrice?: number
  triggerPrice?: number
  trailingOffset?: number
  limitOffset?: number
  totalQuantity?: number
  visibleQuantity?: number
}

export type Block = {
  id: BlockId
  kind: BlockKind
  role: BlockRole
  side: BlockSide
  label: string
  active: boolean
  skin?: BlockSkin

  anchor: BlockAnchor
  allocation: BlockAllocation
  params?: BlockParams

  parentId?: BlockId
  ocoGroupId?: string

  isChild?: boolean
}

export type MarketState = {
  symbol: string
  lastPrice: number | null
  tickSize?: number
}
