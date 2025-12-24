import type { Block, BlockKind, MarketState } from './types'

export function getBlockLevelPrice(block: Block, market: MarketState): number | null {
  if (block.kind === 'entry') {
    return Number.isFinite(block.anchor.price) ? block.anchor.price : null
  }

  if (block.kind === 'market' || block.kind === 'close') {
    return typeof market.lastPrice === 'number' ? market.lastPrice : null
  }

  if (block.kind === 'limit' || block.kind === 'iceberg') {
    return typeof block.params?.limitPrice === 'number' ? block.params.limitPrice : null
  }

  if (block.kind === 'stop_loss_limit') {
    return typeof block.params?.stopPrice === 'number' ? block.params.stopPrice : null
  }

  if (block.kind === 'take_profit_limit') {
    return typeof block.params?.triggerPrice === 'number' ? block.params.triggerPrice : null
  }

  if (block.kind === 'stop_loss') {
    return typeof block.params?.stopPrice === 'number' ? block.params.stopPrice : null
  }

  if (block.kind === 'take_profit') {
    return typeof block.params?.triggerPrice === 'number' ? block.params.triggerPrice : null
  }

  if (block.kind === 'trailing_stop' || block.kind === 'trailing_stop_limit') {
    if (typeof market.lastPrice !== 'number') {
      return null
    }
    const off = block.params?.trailingOffset
    if (typeof off !== 'number' || !Number.isFinite(off)) {
      return null
    }
    return block.side === 'buy' ? market.lastPrice + off : market.lastPrice - off
  }

  return null
}

export function blockKindShort(kind: BlockKind): string {
  if (kind === 'limit') return 'LMT'
  if (kind === 'market') return 'MKT'
  if (kind === 'stop_loss' || kind === 'stop_loss_limit') return 'STOP'
  if (kind === 'take_profit' || kind === 'take_profit_limit') return 'TP'
  if (kind === 'trailing_stop' || kind === 'trailing_stop_limit') return 'TRAIL'
  if (kind === 'iceberg') return 'ICE'
  if (kind === 'close') return 'CLOSE'
  return 'ENTRY'
}
