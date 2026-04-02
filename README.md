<p align="center">
  <img src="client/public/logo-512.png" width="120" height="120" alt="Neuberg" />
</p>

<h1 align="center">Neuberg</h1>

<p align="center">
  <strong>The open-source Bloomberg Terminal.</strong><br/>
  516 panels. Real-time data. Trade everything.
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
  <img src="https://img.shields.io/badge/Trade-Stocks_|_Crypto_|_Prediction_Markets-ff3366" alt="Trade Everything" />
</p>

---

## What is Neuberg?

Neuberg is building the **all-in-one financial terminal** that Bloomberg charges $24,000/year for — but open-source, web-based, and accessible to everyone.

We aim to cover **every Bloomberg function** in a single, customizable dashboard: equities, fixed income, derivatives, commodities, FX, credit, macro, and alternative data. Today we ship **516 drag-and-drop panels** powered by real market data, with more added every week.

**You can trade directly from the terminal** — US stocks via Alpaca, 49 crypto perpetual contracts via Hyperliquid (including stock perps like AAPL, TSLA, NVDA), and prediction markets via Polymarket. All from one screen.

> **Our mission:** Democratize institutional-grade financial intelligence.

### Why Neuberg?

| | Bloomberg Terminal | Neuberg |
|---|---|---|
| **Price** | $24,000/year | Open-source |
| **Access** | Dedicated hardware | Any browser |
| **Customization** | Limited | Fully drag-and-drop DIY |
| **Trading** | Separate systems | Built-in: stocks, crypto, predictions |
| **AI** | Separate product | Built-in sentiment & analysis |
| **Prediction Markets** | None | Native Polymarket integration |
| **Crypto / DeFi** | Limited | Full perpetuals + on-chain |

---

## Trade Everything

Neuberg isn't just a data terminal — it's a **trading platform**.

- **US Stocks** — Paper & live trading via Alpaca (4,000+ symbols, market/limit orders, real-time P&L)
- **Crypto Perpetuals** — Hyperliquid integration with 49 perps including stock perps (AAPL, TSLA, NVDA, META, GOOGL — trade stocks 24/7 with leverage)
- **Prediction Markets** — Polymarket with full orderbook, EIP-712 wallet auth, and position tracking
- **Web3 Wallet** — RainbowKit + wagmi (Polygon, Arbitrum, Mainnet)

All trading interfaces are built into the drag-and-drop panel system. Open a chart next to your orderbook next to the news feed — build your perfect trading layout.

---

## 516 Market Data Panels

Every panel fetches **real market data** from Yahoo Finance. Panels only load when you open them — zero API calls for panels you don't use.

<details>
<summary><strong>Equities (80+ panels)</strong></summary>

Stock screener, valuation multiples, earnings calendar & whisper, insider transactions, institutional ownership, short squeeze monitor, equity pairs trading, factor rotation, style box analysis, market breadth, sector rotation, index rebalance tracking, dark pool volume estimates, block trade detection, IPO calendar, SPAC monitor, shareholder activism, dividend calendar & capture strategies.
</details>

<details>
<summary><strong>Fixed Income & Credit (90+ panels)</strong></summary>

Full yield curve (3M to 30Y) with real Treasury yields, bond ladder, duration management, relative value analysis, credit spreads (IG, HY, EM, Muni) with rich/cheap signals, CLO tranche analytics, ABS/MBS monitor, covered bonds, CDS index monitor, credit impulse, default risk, convertible bond analyzer with delta and bond floor, leveraged loans, distressed debt.
</details>

<details>
<summary><strong>FX & Rates (40+ panels)</strong></summary>

7 major + EM currency pairs with real-time rates, FX carry trade monitor with Sharpe ratios, FX option vol matrix, vol surface, risk reversals, interest rate swap curves, swaption vol surface, central bank watch (Fed, ECB, BOJ, BOE, RBA), rate probability from yield curve slope, cross-currency basis swaps.
</details>

<details>
<summary><strong>Commodities (40+ panels)</strong></summary>

Precious metals (Gold, Silver, Platinum, Palladium) spot + ETFs, energy (WTI, Brent, Natural Gas) with storage estimates, agriculture (15 futures: grains, softs, livestock), industrial metals (Copper, Aluminum, Zinc, Nickel), commodity forward curves, seasonality, spread analysis (crack spread, frac spread, gold/silver ratio), shipping indices (BDI proxy).
</details>

<details>
<summary><strong>Macro & Risk (60+ panels)</strong></summary>

GDP nowcast, recession probability, financial conditions index, inflation monitor (breakevens, TIPS, commodity signals), geopolitical risk composite, global PMI dashboard (10 countries), supply chain stress, trade balance, labor market, macro regime monitor (Goldilocks / Stagflation quadrant), fiscal deficit, central bank balance sheets, global liquidity.
</details>

<details>
<summary><strong>Derivatives & Volatility (30+ panels)</strong></summary>

VIX-derived implied volatility for equities, FX, commodities, options skew surface, variance swaps, vol arbitrage, equity index futures (ES, NQ, YM, RTY) with cash basis, merger arbitrage (MNA ETF + deal spreads), convertible arbitrage, swaption vol surface, interest rate vol surface.
</details>

<details>
<summary><strong>Alternative & Thematic (50+ panels)</strong></summary>

AI/Tech CapEx (17 semiconductor + cloud stocks), cybersecurity (12 stocks + HACK/CIBR ETFs), clean energy vs. fossil fuel comparison, nuclear energy (uranium miners + utilities), data center infrastructure, space economy, ESG ratings, carbon credits, green bonds, luxury collectibles, sports media rights, rare earth & battery metals.
</details>

### Intelligence

- **AI News Analysis** — Every article analyzed for sentiment, location, and conflict detection
- **News Clustering** — AI groups related articles into stories
- **Conflict Map** — Real-time war/conflict events plotted on an interactive world map
- **Fear & Greed Index** — Real-time gauge with historical comparison
- **6 Languages** — English, Spanish, French, Japanese, Korean, Chinese

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
| **Layout** | FlexLayout React (drag-and-drop panels) |
| **Deployment** | Docker, Google Cloud Run |

---

## Quick Start

```bash
git clone https://github.com/KoNananachan/Neuberg.git
cd Neuberg
npm install

cp .env.example .env
# Edit .env with your API keys

cd server && npx prisma db push && cd ..
npm run dev
```

Frontend: `http://localhost:5174` · Backend: `http://localhost:3001`

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
│       └── stores/            # Zustand state management
├── server/                    # Express backend
│   ├── prisma/                # Schema (SQLite)
│   └── src/
│       ├── routes/            # 516 REST API endpoints (lazy-loaded)
│       └── services/
│           ├── ai/            # Sentiment analysis + clustering
│           ├── scraper/       # News pipeline
│           ├── stocks/        # Yahoo Finance, insider tracking
│           └── websocket/     # Real-time price updates
├── Dockerfile                 # Multi-stage production build
└── LICENSE                    # BSL 1.1 (Bauhinia AI Limited)
```

---

## Community

- **Live Terminal** — [neuberg.ai](https://neuberg.ai)
- **Discord** — [discord.gg/6dr83qcJ](https://discord.gg/6dr83qcJ)
- **Issues** — [GitHub Issues](https://github.com/KoNananachan/Neuberg/issues)

## License

Licensed under the [Business Source License 1.1](LICENSE).

**Licensor:** Bauhinia AI Limited

You may view, fork, and modify the code for non-commercial purposes. Commercial use requires a separate license. See [LICENSE](LICENSE) for details.

---

<p align="center">
  <sub>Built with real market data. Not financial advice. Trade at your own risk.</sub>
</p>
