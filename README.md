<p align="center">
  <img src="https://neuberg.ai/favicon.svg" width="80" height="80" alt="Neuberg" />
</p>

<h1 align="center">Neuberg</h1>

<p align="center">
  <strong>The open-source Bloomberg Terminal for the internet age.</strong><br/>
  516 panels. Real-time data. One dashboard.
</p>

<p align="center">
  <a href="https://neuberg.ai"><img src="https://img.shields.io/badge/Live-neuberg.ai-ff9900?style=for-the-badge" alt="Live Demo" /></a>
  <a href="https://discord.gg/6dr83qcJ"><img src="https://img.shields.io/badge/Discord-Join-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-BSL_1.1-yellow?style=for-the-badge" alt="License" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Panels-516-ff9900" alt="516 Panels" />
  <img src="https://img.shields.io/badge/Data-Real--time_Yahoo_Finance-00d4aa" alt="Real-time Data" />
  <img src="https://img.shields.io/badge/Languages-6-blue" alt="6 Languages" />
  <img src="https://img.shields.io/badge/Assets-Stocks_|_Crypto_|_FX_|_Commodities_|_Bonds-purple" alt="Multi-Asset" />
</p>

---

## What is Neuberg?

Neuberg is building the **all-in-one financial terminal** that Bloomberg charges $24,000/year for — but open-source, web-based, and accessible to everyone.

We aim to cover **every Bloomberg function** in a single, customizable dashboard: from equities and fixed income to derivatives, commodities, FX, credit, macro, and alternative data. Today we ship **516 drag-and-drop panels** powered by real market data, with more added every week.

> **Our mission:** Democratize institutional-grade financial intelligence.

### Key Differentiators

| | Bloomberg Terminal | Neuberg |
|---|---|---|
| **Price** | $24,000/year | Free & open-source |
| **Access** | Dedicated hardware | Any browser |
| **Customization** | Limited | Fully drag-and-drop DIY |
| **AI Integration** | Separate product | Built-in sentiment & analysis |
| **Prediction Markets** | None | Native Polymarket integration |
| **Crypto** | Limited | Full DeFi + CEX coverage |

---

## Features

### Market Data — 516 Panels

Every panel fetches **real market data** from Yahoo Finance, with lazy-loading (data is only fetched when you open a panel).

<details>
<summary><strong>Equities (80+ panels)</strong></summary>

- Stock screener, valuation multiples, earnings calendar & whisper
- Insider transactions, institutional ownership, short squeeze monitor
- Equity pairs trading, factor rotation, style box analysis
- Market breadth, sector rotation, index rebalance tracking
- Dark pool volume estimates, block trade detection
- IPO calendar, SPAC monitor, shareholder activism
</details>

<details>
<summary><strong>Fixed Income & Credit (90+ panels)</strong></summary>

- Full yield curve (3M to 30Y) with real Treasury yields
- Bond ladder, duration management, relative value
- Credit spreads (IG, HY, EM, Muni) with rich/cheap signals
- CLO tranche analytics, ABS/MBS monitor, covered bonds
- CDS index monitor, credit impulse, default risk
- Convertible bond analyzer with delta and bond floor
</details>

<details>
<summary><strong>FX & Rates (40+ panels)</strong></summary>

- 7 major + EM currency pairs with real-time rates
- FX carry trade monitor with Sharpe ratios
- FX option vol matrix, vol surface, risk reversals
- Interest rate swap curves, swaption vol surface
- Central bank watch (Fed, ECB, BOJ, BOE, RBA)
- Rate probability from yield curve slope
</details>

<details>
<summary><strong>Commodities (40+ panels)</strong></summary>

- Precious metals (Gold, Silver, Platinum, Palladium) spot + ETFs
- Energy (WTI, Brent, Natural Gas) with storage estimates
- Agriculture (15 futures: grains, softs, livestock)
- Industrial metals (Copper, Aluminum, Zinc, Nickel)
- Commodity forward curves, seasonality, spread analysis
- Shipping indices (BDI proxy via BDRY ETF)
</details>

<details>
<summary><strong>Macro & Risk (60+ panels)</strong></summary>

- GDP nowcast, recession probability, financial conditions index
- Inflation monitor (breakevens, TIPS, commodity signals)
- Geopolitical risk composite (VIX, gold, oil, defense)
- Global PMI dashboard (10 countries from ETF proxies)
- Supply chain stress, trade balance, labor market
- Macro regime monitor (Goldilocks / Stagflation quadrant)
</details>

<details>
<summary><strong>Derivatives & Volatility (30+ panels)</strong></summary>

- VIX-derived implied volatility for equities, FX, commodities
- Options skew surface, variance swaps, vol arbitrage
- Equity index futures (ES, NQ, YM, RTY) with cash basis
- Merger arbitrage (MNA ETF + deal spreads)
- Convertible arbitrage opportunities
</details>

<details>
<summary><strong>Alternative & Thematic (50+ panels)</strong></summary>

- AI/Tech CapEx (17 semiconductor + cloud stocks)
- Cybersecurity (12 stocks + HACK/CIBR ETFs)
- Clean energy vs. fossil fuel comparison
- Nuclear energy (uranium miners + utilities)
- Data center infrastructure, space economy
- ESG ratings, carbon credits, green bonds
- Luxury collectibles, sports media rights
</details>

### Trading

- **Stock Trading** — Alpaca paper & live trading with real-time P&L
- **Crypto Perpetuals** — Hyperliquid integration (49 perps including stock perps)
- **Prediction Markets** — Polymarket with orderbook, wallet auth, and position tracking
- **Web3 Wallet** — RainbowKit + wagmi (Polygon, Arbitrum, Mainnet)

### Intelligence

- **AI News Analysis** — Every article analyzed for sentiment, location, and conflict detection
- **News Clustering** — AI groups related articles into stories
- **Conflict Map** — Real-time war/conflict events plotted on an interactive world map
- **Fear & Greed Index** — Real-time gauge with tick marks and historical comparison

### Platform

- **Drag & Drop Layout** — Arrange any combination of 516 panels via FlexLayout
- **6 Languages** — English, Spanish, French, Japanese, Korean, Chinese
- **Real-time WebSocket** — Live price updates with delta compression
- **Adaptive Polling** — Background services pause when no users are connected
- **Lazy Loading** — Panels and routes load on-demand, not at startup

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS 4 |
| **Backend** | Express 5, TypeScript, Prisma (SQLite) |
| **Data** | Yahoo Finance (516 panels), CoinGecko, Polymarket, Hyperliquid |
| **AI** | OpenAI-compatible API (Gemini, GPT, or local models) |
| **Real-time** | WebSocket with delta compression |
| **Charts** | TradingView lightweight-charts, MapLibre GL |
| **Web3** | wagmi, viem, RainbowKit |
| **Auth** | Google OAuth, email verification |
| **Layout** | FlexLayout React (drag-and-drop panels) |
| **Deployment** | Docker, Google Cloud Run |

---

## Quick Start

```bash
git clone https://github.com/KoNananachan/Neuberg.git
cd Neuberg

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your API keys

# Initialize database
cd server && npx prisma db push && cd ..

# Start development
npm run dev
```

Frontend: `http://localhost:5174` · Backend: `http://localhost:3001`

See [.env.example](.env.example) for all configuration options.

---

## Architecture

```
Neuberg/
├── client/                    # React frontend (Vite)
│   └── src/
│       ├── api/hooks/         # 500+ React Query data hooks
│       ├── components/
│       │   ├── layout/        # App shell, dock layout, top bar
│       │   ├── panels/        # 516 panel components (lazy-loaded)
│       │   └── trading/       # Orderbook, trade form, portfolio
│       ├── i18n/              # 6-language translations (9,800+ keys)
│       ├── realtime/          # WebSocket hook
│       └── stores/            # Zustand state management
├── server/                    # Express backend
│   ├── prisma/                # Schema (SQLite)
│   └── src/
│       ├── config/            # Zod-validated environment
│       ├── middleware/         # Auth, rate limiting
│       ├── routes/            # 516 REST API endpoints (lazy-loaded)
│       └── services/
│           ├── ai/            # Sentiment analysis + clustering
│           ├── scraper/       # News pipeline (adaptive polling)
│           ├── stocks/        # Yahoo Finance, insider tracking
│           └── websocket/     # WS server with client-aware broadcasting
├── Dockerfile                 # Multi-stage production build
└── LICENSE                    # BSL 1.1 (Bauhinia AI Limited)
```

### Cost-Efficient Design

Neuberg is designed to minimize Cloud Run costs:

- **Lazy routes** — 516 server routes load on first request, not at startup
- **Client-aware polling** — All background services check WebSocket client count; with 0 users, Yahoo Finance makes **0 API calls**
- **Adaptive scraper** — News polling slows from 60s to 5min when idle
- **React Query staleTime** — 10min default prevents redundant client requests
- **Tab-aware refresh** — `refetchIntervalInBackground: false` stops all polling when the browser tab is hidden

---

## Deployment

```bash
# Build & push container image
gcloud builds submit --tag gcr.io/PROJECT_ID/neuberg

# Deploy to Cloud Run
gcloud run deploy neuberg \
  --image gcr.io/PROJECT_ID/neuberg \
  --platform managed --region us-central1 \
  --allow-unauthenticated --port 8080 \
  --memory 1Gi --cpu 1 \
  --min-instances 1 --max-instances 3
```

Environment variables are injected via Cloud Run (not baked into the image). See [CLAUDE.md](CLAUDE.md) for the full list.

---

## Roadmap

- [ ] Real-time options chain data
- [ ] Portfolio analytics with Sharpe/Sortino
- [ ] Backtesting engine
- [ ] Mobile-responsive layout
- [ ] Plugin system for custom panels
- [ ] Self-hosted data providers (reduce Yahoo Finance dependency)
- [ ] API documentation (OpenAPI spec)

---

## Community

- **Live Demo** — [neuberg.ai](https://neuberg.ai)
- **Discord** — [discord.gg/6dr83qcJ](https://discord.gg/6dr83qcJ)
- **Issues** — [GitHub Issues](https://github.com/KoNananachan/Neuberg/issues)

---

## License

Licensed under the [Business Source License 1.1](LICENSE).

**Licensor:** Bauhinia AI Limited

You may view, fork, and modify the code for non-commercial purposes. Commercial use requires a separate license from the licensor. See [LICENSE](LICENSE) for full terms.

---

<p align="center">
  <sub>Built with real market data. Not financial advice. Use at your own risk.</sub>
</p>
