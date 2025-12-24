type ResetOptions = {
  clearSnapshots?: boolean
}

export function resetAppToInitial(options: ResetOptions = {}) {
  try {
    localStorage.removeItem('krakenforge:app:startup-mode:v1')
    localStorage.removeItem('krakenforge:account:paper:v1')
    localStorage.removeItem('krakenforge:ui:account-column:v1')
    localStorage.removeItem('krakenforge:ui:panels:v1')
    localStorage.removeItem('krakenforge:ui-panels:v1')
    localStorage.removeItem('krakenforge:autosave:v2')
    localStorage.removeItem('krakenforge:last-loaded-snapshot:v2')
    if (options.clearSnapshots) {
      localStorage.removeItem('krakenforge:snapshots:v2')
    }
  } catch {
  }

  window.location.reload()
}
