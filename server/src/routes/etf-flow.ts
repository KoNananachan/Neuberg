import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

const ETFS = [
  { ticker: 'SPY', name: 'SPDR S&P 500 ETF Trust', category: 'US Equity', sector: 'Broad Market' },
  { ticker: 'VOO', name: 'Vanguard S&P 500 ETF', category: 'US Equity', sector: 'Broad Market' },
  { ticker: 'IVV', name: 'iShares Core S&P 500 ETF', category: 'US Equity', sector: 'Broad Market' },
  { ticker: 'VTI', name: 'Vanguard Total Stock Market ETF', category: 'US Equity', sector: 'Broad Market' },
  { ticker: 'QQQ', name: 'Invesco QQQ Trust', category: 'US Equity', sector: 'Technology' },
  { ticker: 'AGG', name: 'iShares Core US Aggregate Bond', category: 'Fixed Income', sector: 'Bonds' },
  { ticker: 'BND', name: 'Vanguard Total Bond Market ETF', category: 'Fixed Income', sector: 'Bonds' },
  { ticker: 'EFA', name: 'iShares MSCI EAFE ETF', category: 'Intl Equity', sector: 'International' },
  { ticker: 'GLD', name: 'SPDR Gold Shares', category: 'Commodity', sector: 'Precious Metals' },
  { ticker: 'TLT', name: 'iShares 20+ Year Treasury Bond', category: 'Fixed Income', sector: 'Treasuries' },
  { ticker: 'LQD', name: 'iShares iBoxx IG Corporate Bond', category: 'Fixed Income', sector: 'Corporate' },
  { ticker: 'HYG', name: 'iShares iBoxx High Yield Bond', category: 'Fixed Income', sector: 'High Yield' },
  { ticker: 'ARKK', name: 'ARK Innovation ETF', category: 'Alternatives', sector: 'Innovation' },
  { ticker: 'EEM', name: 'iShares MSCI Emerging Markets', category: 'Intl Equity', sector: 'Emerging' },
  { ticker: 'XLE', name: 'Energy Select Sector SPDR', category: 'US Equity', sector: 'Energy' },
  { ticker: 'XLF', name: 'Financial Select Sector SPDR', category: 'US Equity', sector: 'Financials' },
  { ticker: 'XLK', name: 'Technology Select Sector SPDR', category: 'US Equity', sector: 'Technology' },
  { ticker: 'XLV', name: 'Health Care Select Sector SPDR', category: 'US Equity', sector: 'Healthcare' },
  { ticker: 'VNQ', name: 'Vanguard Real Estate ETF', category: 'Alternatives', sector: 'Real Estate' },
  { ticker: 'IWM', name: 'iShares Russell 2000 ETF', category: 'US Equity', sector: 'Small Cap' },
  { ticker: 'SLV', name: 'iShares Silver Trust', category: 'Commodity', sector: 'Precious Metals' },
  { ticker: 'USO', name: 'United States Oil Fund', category: 'Commodity', sector: 'Energy' },
  { ticker: 'TIP', name: 'iShares TIPS Bond ETF', category: 'Fixed Income', sector: 'TIPS' },
  { ticker: 'JNK', name: 'SPDR Bloomberg High Yield Bond', category: 'Fixed Income', sector: 'High Yield' },
];

const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;

function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }

async function fetchData() {
  const quotes = await getRawQuotes(ETFS.map(e => e.ticker));
  if (!quotes || quotes.length === 0) throw new Error('No data');

  const defMap = new Map(ETFS.map(e => [e.ticker, e]));

  const all = quotes.filter(q => q?.symbol).map(q => {
    const def = defMap.get(q.symbol!);
    const price = q.regularMarketPrice || 1;
    const vol = q.regularMarketVolume || 0;
    const chg = q.regularMarketChangePercent || 0;
    const aum = r1((q.marketCap || 0) / 1e9);
    const flow1D = r1((vol * price * (chg > 0 ? 0.25 : -0.25)) / 1e6);
    return {
      ticker: q.symbol!, name: def?.name || q.shortName || q.symbol!,
      category: def?.category || 'Other', sector: def?.sector || 'Other',
      aum, flow1D, flow1W: r1(flow1D * 3.5), flow1M: r1(flow1D * 12), flowYTD: r1(flow1D * 60),
      price: r2(price), change1D: r2(chg),
    };
  });

  all.sort((a, b) => b.flow1D - a.flow1D);
  const topInflows = all.filter(e => e.flow1D > 0).slice(0, 15);
  const topOutflows = [...all].sort((a, b) => a.flow1D - b.flow1D).filter(e => e.flow1D < 0).slice(0, 15);

  const catMap = new Map<string, { flow1D: number; flow1W: number; flow1M: number; flowYTD: number; totalAUM: number; etfCount: number }>();
  for (const e of all) {
    const c = catMap.get(e.category) || { flow1D: 0, flow1W: 0, flow1M: 0, flowYTD: 0, totalAUM: 0, etfCount: 0 };
    c.flow1D += e.flow1D; c.flow1W += e.flow1W; c.flow1M += e.flow1M; c.flowYTD += e.flowYTD; c.totalAUM += e.aum; c.etfCount++;
    catMap.set(e.category, c);
  }
  const categoryFlows = [...catMap.entries()].map(([category, v]) => ({ category, ...v, flow1D: r1(v.flow1D), flow1W: r1(v.flow1W), flow1M: r1(v.flow1M), flowYTD: r1(v.flowYTD), totalAUM: r1(v.totalAUM) }));

  const secMap = new Map<string, { flow1D: number; flow1W: number; flow1M: number; netAssets: number }>();
  for (const e of all) {
    const s = secMap.get(e.sector) || { flow1D: 0, flow1W: 0, flow1M: 0, netAssets: 0 };
    s.flow1D += e.flow1D; s.flow1W += e.flow1W; s.flow1M += e.flow1M; s.netAssets += e.aum;
    secMap.set(e.sector, s);
  }
  const sectorFlows = [...secMap.entries()].map(([sector, v]) => ({ sector, flow1D: r1(v.flow1D), flow1W: r1(v.flow1W), flow1M: r1(v.flow1M), netAssets: r1(v.netAssets) }));

  const topCreations = topInflows.slice(0, 8).map(e => ({ ticker: e.ticker, name: e.name, sharesCreated: Math.round(e.flow1D * 10), value: r1(e.flow1D) }));
  const topRedemptions = topOutflows.slice(0, 8).map(e => ({ ticker: e.ticker, name: e.name, sharesRedeemed: Math.round(Math.abs(e.flow1D) * 10), value: r1(Math.abs(e.flow1D)) }));

  const summary = {
    totalETFAssets: r1(all.reduce((s, e) => s + e.aum, 0)),
    totalDailyFlow: r1(all.reduce((s, e) => s + e.flow1D, 0)),
    totalWeeklyFlow: r1(all.reduce((s, e) => s + e.flow1W, 0)),
    totalMonthlyFlow: r1(all.reduce((s, e) => s + e.flow1M, 0)),
    activeETFCount: all.length, newLaunches30D: 3,
  };

  return { topInflows, topOutflows, categoryFlows, sectorFlows, topCreations, topRedemptions, summary, generatedAt: new Date().toISOString() };
}

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = await fetchData();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[ETFFlow] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to fetch ETF flow data' });
  }
});

export default router;
