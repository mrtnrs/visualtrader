import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'

import Button from './Button'
import Modal from './Modal'

type Mode = 'kraken' | 'virtual'

type Props = {
  open: boolean
  defaultMode?: Mode
  onComplete: (payload: { mode: Mode; apiKey?: string; apiSecret?: string }) => void
}

const STORAGE_KEY = 'krakenforge:app:startup-mode:v1'

type StoredV1 = {
  version: 1
  mode: Mode
}

function safeReadStored(): StoredV1 | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as any
    if (!parsed || parsed.version !== 1) return null
    if (parsed.mode !== 'kraken' && parsed.mode !== 'virtual') return null
    return parsed as StoredV1
  } catch {
    return null
  }
}

function safeWriteStored(mode: Mode) {
  try {
    const next: StoredV1 = { version: 1, mode }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
  }
}

export function useStartupModePreference() {
  const [pref, setPref] = useState<Mode | null>(() => safeReadStored()?.mode ?? null)

  const write = useCallback((mode: Mode) => {
    safeWriteStored(mode)
    setPref(mode)
  }, [])

  return { pref, write }
}

export default function StartupModeModal({ open, defaultMode = 'virtual', onComplete }: Props) {
  const [mode, setMode] = useState<Mode>(defaultMode)
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')

  useEffect(() => {
    if (!open) {
      return
    }
    setMode(defaultMode)
  }, [defaultMode, open])

  const colStyle: CSSProperties = useMemo(
    () => ({
      flex: '1 1 0',
      borderRadius: 18,
      border: '1px solid var(--kf-border-1)',
      background: 'var(--kf-surface-3)',
      padding: 18,
      minHeight: 240,
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
    }),
    [],
  )

  const headingStyle: CSSProperties = useMemo(
    () => ({
      fontSize: 16,
      fontWeight: 900,
      letterSpacing: 0.2,
    }),
    [],
  )

  const smallStyle: CSSProperties = useMemo(
    () => ({
      color: 'var(--kf-text)',
      fontSize: 13,
      lineHeight: 1.45,
    }),
    [],
  )

  const inputStyle: CSSProperties = useMemo(
    () => ({
      height: 40,
      borderRadius: 12,
      border: '1px solid var(--kf-border-2)',
      background: 'var(--kf-surface-4)',
      color: 'var(--kf-text)',
      padding: '0 12px',
      outline: 'none',
      fontSize: 13,
      fontWeight: 650,
    }),
    [],
  )

  const krakenReady = apiKey.trim().length > 0 && apiSecret.trim().length > 0

  return (
    <Modal open={open} dismissable={false} title="Welcome">
      <div style={{ display: 'flex', gap: 16 }}>
        <div
          style={{
            ...colStyle,
            boxShadow: mode === 'kraken' ? 'inset 0 0 0 2px #00000091' : undefined,
          }}
          onMouseDown={() => setMode('kraken')}
        >
          <div style={headingStyle}>Use Kraken API</div>
          <div style={smallStyle}>
            Real money. Connect your Kraken account.
            <br />
            Keys are kept in-memory for this session only.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="API Key"
              style={inputStyle}
              autoComplete="off"
              spellCheck={false}
            />
            <input
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder="API Secret"
              style={inputStyle}
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <div style={{ marginTop: 'auto', display: 'flex' }}>
            <Button
              type="button"
              variant="primary"
              disabled={!krakenReady}
              onClick={() => {
                onComplete({ mode: 'kraken', apiKey: apiKey.trim(), apiSecret: apiSecret.trim() })
              }}
              style={{ width: '100%', outline: 'none' }}
            >
              Continue
            </Button>
          </div>
        </div>

        <div
          style={{
            ...colStyle,
            boxShadow: mode === 'virtual' ? 'inset 0 0 0 2px #00000091' : undefined,
          }}
          onMouseDown={() => setMode('virtual')}
        >
          <div style={headingStyle}>Use Virtual Balance</div>
          <div style={smallStyle}>
            Paper mode. No API keys.
            <br />
            Safe for experimenting.
          </div>

          <div style={{ marginTop: 'auto', display: 'flex' }}>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                onComplete({ mode: 'virtual' })
              }}
              style={{ width: '100%', outline: 'none' }}
            >
              Continue
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
