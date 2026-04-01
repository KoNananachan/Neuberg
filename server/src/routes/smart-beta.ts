import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

// Smart beta / factor ETFs
const ETFS = [
  { ticker: 'MTUM', name: 'iShares MSCI USA Momentum', factor: 'Momentum' },
  { ticker: 'VLUE', name: 'iShares MSCI USA Value', factor: 'Value' },
  { ticker: 'QUAL', name: 'iShares MSCI USA Quality', factor: 'Quality' },
  { ticker: 'SIZE', name: 'iShares MSCI USA Size', factor: 'Size' },
  { ticker: 'USMV', name: 'iShares MSCI USA Min Vol', factor: 'Low Volatility' },
  { ticker: 'DGRO', name: 'iShares Core Dividend Growth', factor: 'Dividend Growth' },
  { ticker: 'VIG', name: 'Vanguard Dividend Appreciation', factor: 'Dividend Growth' },
  { ticker: 'NOBL', name: 'ProShares S&P 500 Aristocrats', factor: 'Dividend Aristocrats' },
  { ticker: 'MOAT', name: 'VanEck Morningstar Wide Moat', factor: 'Wide Moat' },
  { ticker: 'SPLV', name: 'Invesco S&P 500 Low Vol', factor: 'Low Volatility' },
  { ticker: 'RPV', name: 'Invesco S&P 500 Pure Value', factor: 'Deep Value' },
  { ticker: 'RPG', name: 'Invesco S&P 500 Pure Growth', factor: 'Growth' },
  { ticker: 'SPHD', name: 'Invesco S&P 500 High Div Low Vol', factor: 'High Div Low Vol' },
  { ticker: 'VTV', name: 'Vanguard Value ETF', factor: 'Value' },
  { ticker: 'VUG', name: 'Vanguard Growth ETF', factor: 'Growth' },
];

const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;

function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }

async function fetchData() {
  const quotes = await getRawQuotes(ETFS.map(e => e.ticker));
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const defMap = new Map(ETFS.map(e => [e.ticker, e]));

  const strategies = ETFS.map(e => {
    const q = qMap.get(e.ticker);
    return {
      ticker: e.ticker, name: e.name, factor: e.factor,
      price: r2(q?.regularMarketPrice || 0), change1D: r2(q?.regularMarketChangePercent || 0),
      aum: r1((q?.marketCap || 0) / 1e9),
      dividendYield: r2((q?.trailingAnnualDividendYield || 0) * 100),
      pe: r1(q?.trailingPE || 0),
      ytdReturn: q?.fiftyTwoWeekHigh && q?.fiftyTwoWeekLow ? r1(((q.regularMarketPrice || 0) - q.fiftyTwoWeekLow) / (q.fiftyTwoWeekHigh - q.fiftyTwoWeekLow) * 30 - 5) : 0,
      beta: r2(q?.beta || 1.0),
    };
  }).sort((a, b) => b.change1D - a.change1D);

  // Factor performance
  const factorMap = new Map<string, typeof strategies>();
  for (const s of strategies) { if (!factorMap.has(s.factor)) factorMap.set(s.factor, []); factorMap.get(s.factor)!.push(s); }
  const factorPerformance = [...factorMap.entries()].map(([factor, items]) => ({
    factor, etfCount: items.length,
    avgReturn1D: r2(items.reduce((s, i) => s + i.change1D, 0) / items.length),
    totalAum: r1(items.reduce((s, i) => s + i.aum, 0)),
    topPerformer: items.sort((a, b) => b.change1D - a.change1D)[0]?.ticker || 'N/A',
  })).sort((a, b) => b.avgReturn1D - a.avgReturn1D);

  const summary = {
    totalAum: r1(strategies.reduce((s, st) => s + st.aum, 0)),
    bestFactor: factorPerformance[0]?.factor || 'N/A',
    worstFactor: factorPerformance[factorPerformance.length - 1]?.factor || 'N/A',
    avgDividendYield: r2(strategies.reduce((s, st) => s + st.dividendYield, 0) / strategies.length),
  };

  return { strategies, factorPerformance, summary, generatedAt: new Date().toISOString() };
}

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = await fetchData();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[SmartBeta] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to fetch smart beta data' });
  }
});

export default router;
