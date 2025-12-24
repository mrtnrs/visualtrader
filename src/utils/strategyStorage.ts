import type { Edge, Node } from '@xyflow/react'

import type { ChartTimeframe } from './chartMapping'
import type { OrderNodeData, StrategyNodeType } from '../components/nodes/types'

export type ActivationLine = {
  id: string
  name: string
  a: { timestamp: number; price: number }
  b: { timestamp: number; price: number }
  createdAt: number
  locked?: boolean
}

export type CircleAnnotation = {
  id: string
  name: string
  center: { timestamp: number; price: number }
  edge: { timestamp: number; price: number }
  createdAt: number
  locked?: boolean
}

export type RectangleAnnotation = {
  id: string
  name: string
  a: { timestamp: number; price: number }
  b: { timestamp: number; price: number }
  createdAt: number
  locked?: boolean
}

export type ParallelLinesAnnotation = {
  id: string
  name: string
  a: { timestamp: number; price: number }
  b: { timestamp: number; price: number }
  offset: { timestamp: number; price: number }
  createdAt: number
  locked?: boolean
}

export type ShapeType = 'line' | 'rectangle' | 'circle' | 'parallel'

export type LineCondition = 'cross_up' | 'cross_down' | 'touch'

export type RectangleCondition =
  | 'exit_top' | 'exit_bottom' | 'exit_left' | 'exit_right' | 'exit_any'
  | 'enter_top' | 'enter_bottom' | 'enter_left' | 'enter_right' | 'enter_any' | 'enter_zone'
  | 'exit_side'  // Legacy, kept for compatibility

export type CircleCondition = 'enter' | 'exit' | 'touch_edge'

export type ParallelCondition = 'break_upper' | 'break_lower' | 'inside_channel' | 'enter_channel' | 'exit_any'

export type TriggerCondition = LineCondition | RectangleCondition | CircleCondition | ParallelCondition

export type TriggerActionType =
  | 'market_buy'
  | 'market_sell'
  | 'limit_buy'
  | 'limit_sell'
  | 'alert'
  | 'stop_loss'
  | 'stop_loss_limit'
  | 'take_profit'
  | 'take_profit_limit'
  | 'trailing_stop'
  | 'trailing_stop_limit'

export type ActionConfig = {
  size?: number
  sizeUnit?: 'usd' | 'base' | 'percent'
  leverage?: number
  side?: 'buy' | 'sell'
  limitPrice?: number
  stopPrice?: number
  triggerPrice?: number
  trailingOffset?: number
  trailingOffsetUnit?: 'percent' | 'price'
  limitOffset?: number
  closePercent?: number
  oneShot?: boolean
  message?: string
}

export type TriggerAction = {
  id: string
  type: TriggerActionType
  config: ActionConfig
  children?: TriggerAction[]
}

export type ShapeTrigger = {
  id: string
  shapeId: string
  shapeType: ShapeType
  condition: TriggerCondition
  actions: TriggerAction[]
  isActive: boolean
  createdAt: number
  triggeredAt?: number
}

export type StrategySnapshotV2 = {
  version: 2
  name: string
  createdAt: number

  symbol: string

  chart: {
    timeframe: ChartTimeframe
    mode: 'line' | 'candles'
    followNow: boolean
    timeCenter: number
    timeZoom: number
    priceZoom: number
    pricePan: number
  }

  ui: {
    snapPrices: boolean
    magnet: { enabled: boolean; strength: number }
  }

  nodes: Node[]
  edges: Edge[]
  activationLines: ActivationLine[]
  circles?: CircleAnnotation[]
  rectangles?: RectangleAnnotation[]
  parallelLines?: ParallelLinesAnnotation[]
  shapeTriggers?: ShapeTrigger[]
}

const SNAPSHOT_KEY = 'krakenforge:snapshots:v2'
const AUTOSAVE_KEY = 'krakenforge:autosave:v2'
const LAST_LOADED_KEY = 'krakenforge:last-loaded-snapshot:v2'

const SET_KEY = 'krakenforge:strategy-sets:v1'

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

type SnapshotIndex = Record<string, StrategySnapshotV2>

function readIndex(): SnapshotIndex {
  const parsed = safeJsonParse<SnapshotIndex>(localStorage.getItem(SNAPSHOT_KEY))
  if (!parsed || typeof parsed !== 'object') {
    return {}
  }
  return parsed
}

function writeIndex(next: SnapshotIndex) {
  localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(next))
}

export function listSnapshots(): { name: string; createdAt: number }[] {
  const idx = readIndex()
  return Object.entries(idx)
    .map(([name, s]) => ({ name, createdAt: typeof s?.createdAt === 'number' ? s.createdAt : 0 }))
    .sort((a, b) => b.createdAt - a.createdAt)
}

export function loadSnapshot(name: string): StrategySnapshotV2 | null {
  const idx = readIndex()
  const snap = idx[name]
  if (!snap || snap.version !== 2) {
    return null
  }
  return snap
}

export function saveSnapshot(snapshot: StrategySnapshotV2) {
  const idx = readIndex()
  idx[snapshot.name] = snapshot
  writeIndex(idx)
  localStorage.setItem(LAST_LOADED_KEY, snapshot.name)
}

export function deleteSnapshot(name: string) {
  const idx = readIndex()
  if (!(name in idx)) {
    return
  }
  delete idx[name]
  writeIndex(idx)
}

export function loadAutosave(): StrategySnapshotV2 | null {
  const snap = safeJsonParse<StrategySnapshotV2>(localStorage.getItem(AUTOSAVE_KEY))
  if (!snap || snap.version !== 2) {
    return null
  }
  return snap
}

export function saveAutosave(snapshot: StrategySnapshotV2) {
  localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(snapshot))
}

export function getLastLoadedSnapshotName(): string | null {
  const raw = localStorage.getItem(LAST_LOADED_KEY)
  return raw && raw.trim() ? raw : null
}

export type StrategySetNodeV1 = {
  type: StrategyNodeType
  dx: number
  data: Omit<
    OrderNodeData,
    'runtime' | 'anchorPrice' | 'anchorTimestamp' | 'trailRefPrice' | 'triggered' |
    'limitPrice' | 'stopPrice' | 'triggerPrice' | 'trailingOffset' | 'limitOffset'
  >
  limitPricePct?: number
  stopPricePct?: number
  triggerPricePct?: number
  trailingOffsetPct?: number
  limitOffsetPct?: number
}

export type StrategySetV1 = {
  version: 1
  name: string
  createdAt: number
  rootType: StrategyNodeType
  nodes: StrategySetNodeV1[]
  edges: { source: number; target: number }[]
}

type SetIndex = Record<string, StrategySetV1>

function readSetIndex(): SetIndex {
  const parsed = safeJsonParse<SetIndex>(localStorage.getItem(SET_KEY))
  if (!parsed || typeof parsed !== 'object') {
    return {}
  }
  return parsed
}

function writeSetIndex(next: SetIndex) {
  localStorage.setItem(SET_KEY, JSON.stringify(next))
}

export function listStrategySets(): { name: string; createdAt: number }[] {
  const idx = readSetIndex()
  return Object.entries(idx)
    .map(([name, s]) => ({ name, createdAt: typeof s?.createdAt === 'number' ? s.createdAt : 0 }))
    .sort((a, b) => b.createdAt - a.createdAt)
}

export function loadStrategySet(name: string): StrategySetV1 | null {
  const idx = readSetIndex()
  const set = idx[name]
  if (!set || set.version !== 1) {
    return null
  }
  return set
}

export function saveStrategySet(set: StrategySetV1) {
  const idx = readSetIndex()
  idx[set.name] = set
  writeSetIndex(idx)
}

export function deleteStrategySet(name: string) {
  const idx = readSetIndex()
  if (!(name in idx)) {
    return
  }
  delete idx[name]
  writeSetIndex(idx)
}
