export function computeRsi(values: number[], period = 14): number | null {
  if (values.length < period + 1) {
    return null
  }

  let gain = 0
  let loss = 0

  for (let i = values.length - period; i < values.length; i++) {
    const prev = values[i - 1]
    const curr = values[i]
    const d = curr - prev
    if (d >= 0) {
      gain += d
    } else {
      loss += -d
    }
  }

  if (gain === 0 && loss === 0) {
    return 50
  }

  const avgGain = gain / period
  const avgLoss = loss / period

  if (avgLoss === 0) {
    return 100
  }

  const rs = avgGain / avgLoss
  const rsi = 100 - 100 / (1 + rs)
  return Number.isFinite(rsi) ? rsi : null
}

export function avg(values: number[]): number | null {
  if (values.length === 0) {
    return null
  }
  let s = 0
  for (const v of values) {
    s += v
  }
  return s / values.length
}
