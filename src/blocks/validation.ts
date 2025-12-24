import type { Block, MarketState } from './types'
import { getBlockLevelPrice } from './core'

export type BlockValidation = {
  ok: boolean
  level: 'ok' | 'warn' | 'error'
  message: string
}

export function validateBlock(block: Block, market: MarketState): BlockValidation {
  if (block.kind !== 'entry') {
    if (block.kind === 'iceberg') {
      const total = block.params?.totalQuantity
      const vis = block.params?.visibleQuantity
      if (!(typeof total === 'number' && Number.isFinite(total) && total > 0)) {
        return { ok: false, level: 'error', message: 'Total quantity must be > 0' }
      }
      if (!(typeof vis === 'number' && Number.isFinite(vis) && vis > 0)) {
        return { ok: false, level: 'error', message: 'Visible quantity must be > 0' }
      }
    } else {
      if (!(block.allocation.quantity > 0)) {
        return { ok: false, level: 'error', message: 'Quantity must be > 0' }
      }
    }
  }

  const levelPrice = getBlockLevelPrice(block, market)

  if (block.kind === 'market' || block.kind === 'close') {
    if (levelPrice == null) {
      return { ok: false, level: 'warn', message: 'Waiting for last price' }
    }
    return { ok: true, level: 'ok', message: 'OK' }
  }

  if (block.kind === 'trailing_stop' || block.kind === 'trailing_stop_limit') {
    if (typeof block.params?.trailingOffset !== 'number' || !Number.isFinite(block.params.trailingOffset)) {
      return { ok: false, level: 'error', message: 'Trailing offset is required' }
    }
    if (levelPrice == null) {
      return { ok: false, level: 'warn', message: 'Waiting for last price' }
    }
    return { ok: true, level: 'ok', message: 'OK' }
  }

  if (block.kind === 'limit' || block.kind === 'iceberg') {
    if (typeof block.params?.limitPrice !== 'number' || !Number.isFinite(block.params.limitPrice)) {
      return { ok: false, level: 'error', message: 'Limit price is required' }
    }
    return { ok: true, level: 'ok', message: 'OK' }
  }

  if (block.kind === 'stop_loss_limit') {
    if (typeof block.params?.stopPrice !== 'number' || !Number.isFinite(block.params.stopPrice)) {
      return { ok: false, level: 'error', message: 'Stop price is required' }
    }
    if (typeof block.params?.limitPrice !== 'number' || !Number.isFinite(block.params.limitPrice)) {
      return { ok: false, level: 'error', message: 'Limit price is required' }
    }
    return { ok: true, level: 'ok', message: 'OK' }
  }

  if (block.kind === 'take_profit_limit') {
    if (typeof block.params?.triggerPrice !== 'number' || !Number.isFinite(block.params.triggerPrice)) {
      return { ok: false, level: 'error', message: 'Trigger price is required' }
    }
    if (typeof block.params?.limitPrice !== 'number' || !Number.isFinite(block.params.limitPrice)) {
      return { ok: false, level: 'error', message: 'Limit price is required' }
    }
    return { ok: true, level: 'ok', message: 'OK' }
  }

  if (block.kind === 'stop_loss') {
    if (typeof block.params?.stopPrice !== 'number' || !Number.isFinite(block.params.stopPrice)) {
      return { ok: false, level: 'error', message: 'Stop price is required' }
    }
    return { ok: true, level: 'ok', message: 'OK' }
  }

  if (block.kind === 'take_profit') {
    if (typeof block.params?.triggerPrice !== 'number' || !Number.isFinite(block.params.triggerPrice)) {
      return { ok: false, level: 'error', message: 'Trigger price is required' }
    }
    return { ok: true, level: 'ok', message: 'OK' }
  }

  return { ok: true, level: 'ok', message: 'OK' }
}
