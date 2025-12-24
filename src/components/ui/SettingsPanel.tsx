import { useMemo, useState, type CSSProperties } from 'react'

import { resetAppToInitial } from '../../utils/appReset'
import Button from './Button'
import Modal from './Modal'

type Props = {
  open: boolean
  mode: 'kraken' | 'virtual' | null
  onRequestClose: () => void
}

export default function SettingsPanel({ open, mode, onRequestClose }: Props) {
  const [clearSnapshots, setClearSnapshots] = useState(false)

  const rowStyle: CSSProperties = useMemo(
    () => ({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      padding: '10px 0',
      borderBottom: '1px solid var(--kf-border-1)',
    }),
    [],
  )

  const labelStyle: CSSProperties = useMemo(
    () => ({
      color: 'var(--kf-text)',
      fontWeight: 800,
      fontSize: 13,
    }),
    [],
  )

  const subStyle: CSSProperties = useMemo(
    () => ({
      color: 'var(--kf-text-muted)',
      fontWeight: 650,
      fontSize: 12,
      marginTop: 2,
    }),
    [],
  )

  return (
    <Modal
      open={open}
      title="Settings"
      dismissable={true}
      onRequestClose={() => {
        onRequestClose()
      }}
      maxWidth={720}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={rowStyle}>
          <div>
            <div style={labelStyle}>Mode</div>
            <div style={subStyle}>{mode ?? 'Not selected (startup modal will show)'}</div>
          </div>
        </div>

        <div style={rowStyle}>
          <div>
            <div style={labelStyle}>Reset</div>
            <div style={subStyle}>
              Clears startup selection + credentials (in-memory), paper account data, autosave, and returns to the startup modal.
            </div>
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--kf-text)', fontSize: 12, fontWeight: 750 }}>
          <input
            type="checkbox"
            checked={clearSnapshots}
            onChange={(e) => setClearSnapshots(e.target.checked)}
          />
          Also delete saved snapshots
        </label>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
          <Button type="button" variant="secondary" onClick={onRequestClose}>
            Close
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              const ok = window.confirm(
                clearSnapshots
                  ? 'Reset everything including snapshots? This cannot be undone.'
                  : 'Reset app and return to startup modal?'
              )
              if (!ok) {
                return
              }
              resetAppToInitial({ clearSnapshots })
            }}
            style={{ background: '#2a0a0a', border: '1px solid #7f1d1d', color: '#fecaca' }}
          >
            Reset App
          </Button>
        </div>
      </div>
    </Modal>
  )
}
