import { createContext, useContext, useEffect, useMemo, useReducer, type Dispatch, type ReactNode } from 'react'

import { DEFAULT_SLIPPAGE_CONFIG, type SlippageConfig } from '../utils/slippage'

type AccountOrderSide = 'buy' | 'sell'

type AccountOrderStatus = 'open' | 'filled' | 'canceled'

type AccountOrderType =
  | 'market'
  | 'limit'
  | 'stop-loss'
  | 'stop-loss-limit'
  | 'take-profit'
  | 'take-profit-limit'
  | 'trailing-stop'
  | 'trailing-stop-limit'

type AccountOrder = {
  id: string
  symbol: string
  side: AccountOrderSide
  type: AccountOrderType
  price: number | null
  price2?: number | null
  amount: number
  createdAt: number
  status: AccountOrderStatus

  filledAt?: number
  filledPrice?: number

  leverage?: number

  ocoGroupId?: string

  positionId?: string
  closePercent?: number

  trailingOffset?: number | null
  trailingOffsetUnit?: 'percent' | 'price'
  trailRefPrice?: number | null
}

type AccountPosition = {
  id: string
  symbol: string
  side: 'long' | 'short'
  amount: number
  entryPrice: number
  openedAt: number

  leverage?: number
  marginUsedUsd?: number

  reservedUsd?: number
}

type PositionHistoryItem = {
  id: string
  symbol: string
  side: 'long' | 'short'
  amount: number
  entryPrice: number
  exitPrice: number
  openedAt: number
  closedAt: number
  realizedPnl: number
}

type PaperExecutionEvent = {
  id: string
  timestamp: number
  kind: 'trigger_fired' | 'order_created' | 'order_filled' | 'position_opened' | 'position_closed' | 'alert' | 'error'
  message?: string
  symbol?: string
  triggerId?: string
  actionId?: string
  orderId?: string
  positionId?: string
}

type PaperAccountV1 = {
  version: 1
  currency: 'USD'
  balances: Record<string, number>
  openOrders: AccountOrder[]
  orderHistory?: AccountOrder[]
  openPositions: AccountPosition[]
  positionHistory: PositionHistoryItem[]
  executionEvents?: PaperExecutionEvent[]
  slippageConfig?: SlippageConfig
  createdAt: number
  updatedAt: number
}

type AccountState = {
  paper: PaperAccountV1 | null
}

type AccountAction =
  | { type: 'ensure_paper'; initialUsd: number }
  | { type: 'set_paper'; paper: PaperAccountV1 | null }
  | { type: 'reset_paper' }
  | { type: 'set_slippage_config'; config: SlippageConfig }

type AccountContextValue = {
  state: AccountState
  dispatch: Dispatch<AccountAction>
}

const STORAGE_KEY_PAPER = 'krakenforge:account:paper:v1'

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

function makeEmptyPaper(initialUsd: number): PaperAccountV1 {
  const now = Date.now()
  return {
    version: 1,
    currency: 'USD',
    balances: { USD: initialUsd },
    openOrders: [],
    orderHistory: [],
    openPositions: [],
    positionHistory: [],
    slippageConfig: DEFAULT_SLIPPAGE_CONFIG,
    createdAt: now,
    updatedAt: now,
  }
}

function readPaper(): PaperAccountV1 | null {
  const parsed = safeJsonParse<PaperAccountV1>(localStorage.getItem(STORAGE_KEY_PAPER))
  if (!parsed || parsed.version !== 1) {
    return null
  }
  if (!parsed.balances || typeof parsed.balances !== 'object') {
    return null
  }
  return parsed
}

function writePaper(paper: PaperAccountV1 | null) {
  try {
    if (!paper) {
      localStorage.removeItem(STORAGE_KEY_PAPER)
      return
    }
    localStorage.setItem(STORAGE_KEY_PAPER, JSON.stringify(paper))
  } catch {
  }
}

function accountReducer(state: AccountState, action: AccountAction): AccountState {
  switch (action.type) {
    case 'set_paper':
      return { ...state, paper: action.paper }
    case 'reset_paper':
      return { ...state, paper: null }
    case 'ensure_paper': {
      const existing = state.paper
      if (existing) {
        return state
      }
      const next = makeEmptyPaper(action.initialUsd)
      return { ...state, paper: next }
    }
    case 'set_slippage_config': {
      const paper = state.paper
      if (!paper) {
        return state
      }
      return { ...state, paper: { ...paper, slippageConfig: action.config, updatedAt: Date.now() } }
    }
    default:
      return state
  }
}

const AccountContext = createContext<AccountContextValue | null>(null)

export function AccountProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(accountReducer, {
    paper: readPaper(),
  })

  useEffect(() => {
    writePaper(state.paper)
  }, [state.paper])

  const value = useMemo(() => ({ state, dispatch }), [state])

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

export function useAccountContext() {
  const ctx = useContext(AccountContext)
  if (!ctx) {
    throw new Error('useAccountContext must be used within AccountProvider')
  }
  return ctx
}

export type { AccountOrder, AccountOrderType, AccountPosition, PaperAccountV1, PaperExecutionEvent, PositionHistoryItem }
