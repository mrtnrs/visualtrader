# 📈 Visual Trader

**Draw your trades. Watch them execute.**

Visual Trader is a visual strategy builder for Kraken that lets you draw directly on price charts to define trading logic. Just draw lines, shapes, and zones, then drag&drop actions to them. When price hits your levels, trades execute automatically.

---

## ✨ What is this?

Ever wished you could just *draw* your trading strategy on a chart?

Traditional trading platforms make you fill out order forms, calculate stop-loss levels, and manually enter prices. Visual Trader flips this around: **draw first, configure later**.

```
🎨 Draw a trendline → ⚡ Attach "Market Buy when price crosses up"
📦 Draw a rectangle → 🎯 Attach "Stop Loss when price exits bottom"  
⭕ Draw a circle    → 🔄 Attach "Take Profit at 50% when price touches edge"
```

The app includes a **paper trading engine** so you can test strategies with live Kraken data—no real money at risk.

---

## 🚀 Quick Start

```bash
# Clone the repo
git clone https://github.com/mrtnrs/visualtrader.git
cd visualtrader

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to start trading.

---

## 🎮 How to Use

### 1. The Chart
The main canvas shows live BTC/USD (or selected pair) from Kraken's WebSocket feed. You can:
- **Pan**: Click and drag the background
- **Zoom**: Scroll to zoom the price axis
- **Change symbol**: Use the market selector in the toolbar

### 2. Drawing Shapes
Select a drawing tool from the toolbar:

| Tool | What it does |
|------|-------------|
| 📏 **Line** | Draw trendlines, support/resistance levels |
| 📦 **Rectangle** | Define price zones (consolidation areas, supply/demand) |
| ⭕ **Circle** | Mark key price points with radius |
| ═══ **Parallel Lines** | Draw channels |

### 3. Adding Triggers
Click any shape to show its trigger options. Choose a condition:

- **Line**: Cross Up, Cross Down, Touch
- **Rectangle**: Exit Top/Bottom/Left/Right, Enter Zone
- **Circle**: Enter, Exit, Touch Edge
- **Parallel Lines**: Break Upper, Break Lower, Enter Channel

### 4. Attaching Actions
Drag an action block from the bottom dock onto a trigger:

| Action | Description |
|--------|-------------|
| **Market** | Instant buy/sell at market price |
| **Limit** | Buy/sell at specified price |
| **Stop Loss** | Close position if price moves against you |
| **Take Profit** | Close position at profit target |
| **Trailing Stop** | Dynamic stop that follows price |

### 5. Paper Trading
Starting the app grants you a beautiful sum of 10k (sadly virtual) money to trade. Trades update your balance, so show us what you can do! 

---

## 🏗️ Project Structure

```
src/
├── components/
│   ├── canvas/                    # Core trading interface
│   │   ├── StrategyCanvas.tsx     # Main orchestrator: shape drawing, node management,
│   │   │                          # drag-drop handling, keyboard shortcuts, context menus
│   │   ├── PriceChartLayer.tsx    # HTML5 Canvas for candlesticks, price axis, grid lines
│   │   ├── TriggerPillManager.tsx # Renders trigger badges on shapes, child action cards,
│   │   │                          # connector lines between triggers and their actions
│   │   ├── AccountSidebar.tsx     # Paper trading dashboard: balance, positions, P&L
│   │   └── CanvasToolbar.tsx      # Top toolbar: symbol picker, timeframe, drawing tools
│   │
│   ├── nodes/                     # React Flow node components (the draggable cards)
│   │   ├── OrderNode.tsx          # Renders Market/Limit/Stop/TP blocks with live prices
│   │   └── EntryNode.tsx          # Entry point nodes for strategy flows
│   │
│   └── strategy-builder/          # Bottom dock UI
│       ├── StrategyBuilderBar.tsx # macOS-style dock with action blocks to drag onto triggers
│       └── DockItem.tsx           # Individual draggable dock items with magnification effect
│
├── contexts/
│   ├── AccountContext.tsx         # Paper trading state: positions, orders, balance, margin
│   └── StrategyContext.tsx        # Active strategy config, selected nodes, UI mode
│
└── utils/
    ├── virtualExecution.ts        # Paper trading engine: order fills, margin calc, liquidation,
    │                              # trailing stop updates, OCO handling (~1000 lines)
    ├── shapeGeometry.ts           # Geometric helpers: point-in-rect, line-price intersection,
    │                              # circle containment checks for trigger evaluation
    ├── chartMapping.ts            # Coordinate transforms: price↔Y, timestamp↔X
    ├── strategyStorage.ts         # localStorage save/load for strategies and sets
    └── triggerActionUtils.ts      # Helper functions for managing nested action trees
```

---


## 📦 Key Features

- **Visual Strategy Builder** — Draw shapes, attach triggers, define actions
- **Real-time Data** — Live WebSocket feed from Kraken
- **Shape Triggers** — 15+ condition types (cross up/down, enter/exit zone, etc.)
- **Paper Trading** — Full margin simulation with leverage, liquidation, slippage
- **Strategy Sets** — Save, load, and share complete configurations
- **Child Orders** — Attach SL/TP to entries, stored as relative % offsets
- **Drag & Drop** — Move blocks, resize shapes, reposition orders

---

## 🧪 Paper Trading Engine

The virtual execution layer simulates a real trading environment:

```typescript
// What we simulate:
✅ Market orders (instant fill with slippage)
✅ Limit orders (fill when price crosses)
✅ Stop loss / Take profit
✅ Trailing stops (dynamic stop-price updates)
✅ Leverage 
✅ Margin requirements
✅ Liquidation at 40% margin level
✅ OCO (one-cancels-other) groups
✅ Partial position closes
```

All runs on localStorage—ready to plug into the real Kraken API when you're ready.

---

## 🛠️ Development

```bash
# Run dev server
npm run dev

# Type check
npm run typecheck

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 📄 License

MIT — do whatever you want with it.

---

## Acknowledgments

- [React Flow](https://reactflow.dev/) — The incredible open-source library powering the node graph
- [Kraken](https://www.kraken.com/) — For the WebSocket API

---

<p align="center">
  <a href="https://visualtrader.pages.dev">Live Demo</a> •
  <a href="https://github.com/mrtnrs/visualtrader">GitHub</a>
</p>
