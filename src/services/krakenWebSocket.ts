export type PriceTick = {
  symbol: string
  price: number
  timestamp: number
}

export type KrakenWsClient = {
  close: () => void
}

type KrakenWsStatus = 'connecting' | 'open' | 'closed' | 'error'

type KrakenTickerMessage = {
  channel?: string
  type?: string
  data?: Array<{
    symbol?: string
    last?: number
  }>
}

export function createKrakenWebSocketClient(options: {
  symbol: string
  onTick: (tick: PriceTick) => void
  onStatus?: (status: KrakenWsStatus) => void
}): KrakenWsClient {
  const { symbol, onTick, onStatus } = options

  onStatus?.('connecting')
  const ws = new WebSocket('wss://ws.kraken.com/v2')

  const onOpen = () => {
    onStatus?.('open')
    ws.send(
      JSON.stringify({
        method: 'subscribe',
        params: {
          channel: 'ticker',
          symbol: [symbol],
        },
      }),
    )
  }

  const onMessage = (event: MessageEvent) => {
    let parsed: unknown
    try {
      parsed = JSON.parse(String(event.data))
    } catch {
      return
    }

    const msg = parsed as KrakenTickerMessage
    if (msg.channel !== 'ticker') {
      return
    }

    if (!msg.data || !Array.isArray(msg.data) || msg.data.length === 0) {
      return
    }

    const item = msg.data[0]
    if (typeof item?.last !== 'number') {
      return
    }

    onTick({
      symbol: item.symbol ?? symbol,
      price: item.last,
      timestamp: Date.now(),
    })
  }

  const onClose = () => {
    onStatus?.('closed')
  }

  const onError = () => {
    onStatus?.('error')
  }

  ws.addEventListener('open', onOpen)
  ws.addEventListener('message', onMessage)
  ws.addEventListener('close', onClose)
  ws.addEventListener('error', onError)

  return {
    close: () => {
      ws.removeEventListener('open', onOpen)
      ws.removeEventListener('message', onMessage)
      ws.removeEventListener('close', onClose)
      ws.removeEventListener('error', onError)
      ws.close()
    },
  }
}
