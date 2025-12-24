import { useEffect } from 'react'
import { ReactFlowProvider } from '@xyflow/react'

import StrategyCanvas from './components/canvas/StrategyCanvas'
import StartupModeModal, { useStartupModePreference } from './components/ui/StartupModeModal'
import { AccountProvider, useAccountContext } from './contexts/AccountContext'
import { StrategyProvider } from './contexts/StrategyContext'
import { useStrategyContext } from './contexts/StrategyContext'

function AppShell() {
  const { pref, write } = useStartupModePreference()
  const { state, dispatch } = useStrategyContext()
  const { state: accountState, dispatch: accountDispatch } = useAccountContext()

  const needsStartup =
    !pref || (pref === 'kraken' && (!state.krakenCreds?.apiKey || !state.krakenCreds?.apiSecret))

  useEffect(() => {
    if (!pref) {
      return
    }
    if (pref === 'virtual' && state.startupMode !== 'virtual') {
      dispatch({ type: 'set_startup_mode', mode: 'virtual' })
    }
    if (pref === 'virtual' && !accountState.paper) {
      accountDispatch({ type: 'ensure_paper', initialUsd: 10_000 })
    }
  }, [accountDispatch, accountState.paper, dispatch, pref, state.startupMode])

  return (
    <>
      <StrategyCanvas />
      <StartupModeModal
        open={needsStartup}
        defaultMode={pref ?? 'virtual'}
        onComplete={(payload) => {
          write(payload.mode)
          dispatch({
            type: 'set_startup_mode',
            mode: payload.mode,
            apiKey: payload.apiKey,
            apiSecret: payload.apiSecret,
          })
          if (payload.mode === 'virtual') {
            accountDispatch({ type: 'ensure_paper', initialUsd: 10_000 })
          }
        }}
      />
    </>
  )
}

function App() {
  return (
    <StrategyProvider>
      <AccountProvider>
        <ReactFlowProvider>
          <AppShell />
        </ReactFlowProvider>
      </AccountProvider>
    </StrategyProvider>
  )
}

export default App
