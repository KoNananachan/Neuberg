import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();
const SYMBOLS = ['REMX', 'LIT', 'ALB', 'SQM', 'LAC', 'PLL', 'MP', 'UUUU', 'TSLA', 'RIVN', 'NIO', 'HG=F'];

const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }

async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));

  const segMap: Record<string, string> = { ALB: 'Lithium', SQM: 'Lithium', LAC: 'Lithium', PLL: 'Lithium', MP: 'Rare Earth', UUUU: 'Rare Earth/Uranium', TSLA: 'EV Demand', RIVN: 'EV Demand', NIO: 'EV Demand' };

  const stocks = SYMBOLS.filter(s => !['REMX', 'LIT', 'HG=F'].includes(s)).map(sym => {
    const q = qMap.get(sym);
    return { ticker: sym, name: q?.shortName || sym, segment: segMap[sym] || 'Other', price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), marketCap: r1((q?.marketCap || 0) / 1e9), pe: r1(q?.trailingPE || 0) };
  });

  const remx = qMap.get('REMX'); const lit = qMap.get('LIT'); const copper = qMap.get('HG=F');
  return { stocks, summary: { remxPrice: r2(remx?.regularMarketPrice || 0), remxChange: r2(remx?.regularMarketChangePercent || 0), litPrice: r2(lit?.regularMarketPrice || 0), litChange: r2(lit?.regularMarketChangePercent || 0), copperPrice: r2(copper?.regularMarketPrice || 0), totalMarketCap: r1(stocks.reduce((s, st) => s + st.marketCap, 0)) }, generatedAt: new Date().toISOString() };
}

router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[RareEarthBatteryMetals] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
