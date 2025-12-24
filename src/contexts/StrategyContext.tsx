import { createContext, useContext, useEffect, useMemo, useReducer, type Dispatch, type ReactNode } from 'react'

import { createKrakenWebSocketClient } from '../services/krakenWebSocket'

type StrategyState = {
  selectedNodeId: string | null
  symbol: string
  wsStatus: 'connecting' | 'open' | 'closed' | 'error'
  lastPrice: number | null
  priceHistory: { timestamp: number; price: number; volume?: number }[]
  startupMode: 'kraken' | 'virtual' | null
  krakenCreds: null | { apiKey: string; apiSecret: string }
}

type StrategyAction =
  | { type: 'select_node'; nodeId: string | null }
  | { type: 'set_symbol'; symbol: string }
  | { type: 'ws_status'; status: StrategyState['wsStatus'] }
  | { type: 'market_tick'; tick: { timestamp: number; price: number; volume?: number } }
  | { type: 'seed_history'; points: { timestamp: number; price: number; volume?: number }[] }
  | { type: 'set_startup_mode'; mode: StrategyState['startupMode']; apiKey?: string; apiSecret?: string }

type StrategyContextValue = {
  state: StrategyState
  dispatch: Dispatch<StrategyAction>
}

const StrategyContext = createContext<StrategyContextValue | null>(null)

function strategyReducer(state: StrategyState, action: StrategyAction): StrategyState {
  switch (action.type) {
    case 'select_node':
      return { ...state, selectedNodeId: action.nodeId }
    case 'set_symbol':
      return {
        ...state,
        symbol: action.symbol,
        wsStatus: 'connecting',
        lastPrice: null,
        priceHistory: [],
      }
    case 'ws_status':
      return { ...state, wsStatus: action.status }
    case 'market_tick': {
      const last = state.priceHistory[0]
      if (last && action.tick.timestamp - last.timestamp < 250) {
        const merged = [{ ...action.tick }, ...state.priceHistory.slice(1)]
        return { ...state, lastPrice: action.tick.price, priceHistory: merged }
      }

      const nextHistory = [action.tick, ...state.priceHistory].slice(0, 600)
      return { ...state, lastPrice: action.tick.price, priceHistory: nextHistory }
    }
    case 'seed_history': {
      const points = action.points.filter((p) => Number.isFinite(p.price) && Number.isFinite(p.timestamp))
      if (points.length === 0) {
        return state
      }

      const byTs = new Map<number, { timestamp: number; price: number; volume?: number }>()
      for (const p of state.priceHistory) {
        byTs.set(p.timestamp, p)
      }
      for (const p of points) {
        if (!byTs.has(p.timestamp)) {
          byTs.set(p.timestamp, p)
        }
      }

      const merged = Array.from(byTs.values())
        .slice()
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 600)

      const seededLast = typeof state.lastPrice === 'number' ? state.lastPrice : merged[0]?.price ?? null
      return { ...state, lastPrice: seededLast, priceHistory: merged }
    }
    case 'set_startup_mode': {
      if (action.mode === 'kraken') {
        const apiKey = action.apiKey?.trim() ?? ''
        const apiSecret = action.apiSecret?.trim() ?? ''
        return {
          ...state,
          startupMode: 'kraken',
          krakenCreds: apiKey && apiSecret ? { apiKey, apiSecret } : null,
        }
      }
      if (action.mode === 'virtual') {
        return { ...state, startupMode: 'virtual', krakenCreds: null }
      }
      return { ...state, startupMode: null, krakenCreds: null }
    }
    default:
      return state
  }
}

export function StrategyProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(strategyReducer, {
    selectedNodeId: null,
    symbol: 'BTC/USD',
    wsStatus: 'connecting',
    lastPrice: null,
    priceHistory: [],
    startupMode: null,
    krakenCreds: null,
  })

  useEffect(() => {
    dispatch({ type: 'ws_status', status: 'connecting' })
    const client = createKrakenWebSocketClient({
      symbol: state.symbol,
      onTick: (tick) => {
        dispatch({ type: 'market_tick', tick: { timestamp: tick.timestamp, price: tick.price } })
      },
      onStatus: (status) => dispatch({ type: 'ws_status', status }),
    })

    return () => client.close()
  }, [dispatch, state.symbol])

  const value = useMemo(() => ({ state, dispatch }), [state])

  return <StrategyContext.Provider value={value}>{children}</StrategyContext.Provider>
}

export function useStrategyContext() {
  const ctx = useContext(StrategyContext)
  if (!ctx) {
    throw new Error('useStrategyContext must be used within StrategyProvider')
  }
  return ctx
}
