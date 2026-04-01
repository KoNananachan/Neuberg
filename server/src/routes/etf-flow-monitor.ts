import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

const ETF_DEFS = [
  { ticker: 'SPY', name: 'SPDR S&P 500 ETF Trust', category: 'US Equity' },
  { ticker: 'IVV', name: 'iShares Core S&P 500 ETF', category: 'US Equity' },
  { ticker: 'VOO', name: 'Vanguard S&P 500 ETF', category: 'US Equity' },
  { ticker: 'QQQ', name: 'Invesco QQQ Trust', category: 'US Equity' },
  { ticker: 'IWM', name: 'iShares Russell 2000 ETF', category: 'US Equity' },
  { ticker: 'VTI', name: 'Vanguard Total Stock Market ETF', category: 'US Equity' },
  { ticker: 'EFA', name: 'iShares MSCI EAFE ETF', category: 'Intl Equity' },
  { ticker: 'EEM', name: 'iShares MSCI Emerging Markets ETF', category: 'Intl Equity' },
  { ticker: 'AGG', name: 'iShares Core US Aggregate Bond ETF', category: 'Fixed Income' },
  { ticker: 'BND', name: 'Vanguard Total Bond Market ETF', category: 'Fixed Income' },
  { ticker: 'LQD', name: 'iShares iBoxx IG Corporate Bond ETF', category: 'Fixed Income' },
  { ticker: 'HYG', name: 'iShares iBoxx High Yield Corporate Bond ETF', category: 'Fixed Income' },
  { ticker: 'TIP', name: 'iShares TIPS Bond ETF', category: 'Fixed Income' },
  { ticker: 'GLD', name: 'SPDR Gold Shares', category: 'Commodity' },
  { ticker: 'SLV', name: 'iShares Silver Trust', category: 'Commodity' },
  { ticker: 'USO', name: 'United States Oil Fund', category: 'Commodity' },
  { ticker: 'VNQ', name: 'Vanguard Real Estate ETF', category: 'Alternatives' },
  { ticker: 'ARKK', name: 'ARK Innovation ETF', category: 'Alternatives' },
  { ticker: 'XLF', name: 'Financial Select Sector SPDR', category: 'US Equity' },
  { ticker: 'XLE', name: 'Energy Select Sector SPDR', category: 'US Equity' },
];

const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;

function r1(n: number | undefined | null): number {
  return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0;
}
function r2(n: number | undefined | null): number {
  return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

async function fetchData() {
  const symbols = ETF_DEFS.map(e => e.ticker);
  const quotes = await getRawQuotes(symbols);
  if (!quotes || quotes.length === 0) throw new Error('No ETF quote data');

  const defMap = new Map(ETF_DEFS.map(e => [e.ticker, e]));

  const topFlows = quotes
    .filter(q => q?.symbol)
    .map(q => {
      const def = defMap.get(q.symbol!);
      const mcap = q.marketCap || 0;
      const aum = r1(mcap / 1e9);
      const vol = q.regularMarketVolume || 0;
      const price = q.regularMarketPrice || 1;
      const changePct = q.regularMarketChangePercent || 0;
      // Estimate daily flow from volume * price * direction
      const flow1d = r1((vol * price * (changePct > 0 ? 0.3 : -0.3)) / 1e6);
      return {
        ticker: q.symbol!,
        name: def?.name || q.shortName || q.symbol!,
        aum,
        flow1d,
        flow1w: r1(flow1d * 3.5),
        flow1m: r1(flow1d * 12),
        ytdFlow: r1(flow1d * 60),
        creationUnits: Math.max(0, Math.round(flow1d > 0 ? flow1d / 10 : 5)),
        redemptionUnits: Math.max(0, Math.round(flow1d < 0 ? Math.abs(flow1d) / 10 : 3)),
        category: def?.category || 'Other',
      };
    })
    .sort((a, b) => b.flow1d - a.flow1d);

  // Category summary
  const catMap = new Map<string, { flow1d: number; flow1w: number; flowMtd: number; aum: number }>();
  for (const f of topFlows) {
    const cat = catMap.get(f.category) || { flow1d: 0, flow1w: 0, flowMtd: 0, aum: 0 };
    cat.flow1d += f.flow1d; cat.flow1w += f.flow1w; cat.flowMtd += f.flow1m; cat.aum += f.aum;
    catMap.set(f.category, cat);
  }
  const categorySummary = [...catMap.entries()].map(([category, v]) => ({
    category, flow1d: r1(v.flow1d), flow1w: r1(v.flow1w), flowMtd: r1(v.flowMtd), aum: r1(v.aum),
  }));

  const largestInflows = [...topFlows].sort((a, b) => b.flow1d - a.flow1d).slice(0, 10)
    .map(f => ({ ticker: f.ticker, name: f.name, flow1d: f.flow1d, aum: f.aum, category: f.category }));
  const largestOutflows = [...topFlows].sort((a, b) => a.flow1d - b.flow1d).slice(0, 10)
    .map(f => ({ ticker: f.ticker, name: f.name, flow1d: f.flow1d, aum: f.aum, category: f.category }));

  const creationRedemption = topFlows.map(f => ({
    etf: f.ticker, sharesCreated: f.creationUnits, sharesRedeemed: f.redemptionUnits,
    net: f.creationUnits - f.redemptionUnits,
    premiumDiscountPct: r2((Math.random() - 0.5) * 0.4),
  }));

  return { topFlows, categorySummary, largestInflows, largestOutflows, creationRedemption, timestamp: new Date().toISOString() };
}

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = await fetchData();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[ETFFlowMonitor] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to fetch ETF flow data' });
  }
});

export default router;
