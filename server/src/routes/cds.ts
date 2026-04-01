import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
// Credit spread proxies via bond ETFs
const SYMBOLS = ['HYG', 'LQD', 'JNK', 'EMB', 'AGG', 'TLT', '^TNX', '^VIX', 'XLF', 'KRE'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5;
  const creditSectors = [
    { name: 'Investment Grade', etf: 'LQD', typicalSpread: 1.2 }, { name: 'High Yield', etf: 'HYG', typicalSpread: 3.5 },
    { name: 'Junk Bonds', etf: 'JNK', typicalSpread: 4.2 }, { name: 'EM Sovereign', etf: 'EMB', typicalSpread: 3.0 },
  ].map(s => {
    const q = qMap.get(s.etf); const yld = (q?.trailingAnnualDividendYield || 0) * 100;
    const impliedSpread = r2(yld - tnx);
    return { sector: s.name, etf: s.etf, yield: r2(yld), impliedSpread, historicalAvg: s.typicalSpread, vsHistorical: r2(impliedSpread - s.typicalSpread), signal: impliedSpread > s.typicalSpread + 0.5 ? 'Widening (stress)' : impliedSpread < s.typicalSpread - 0.3 ? 'Tight (complacent)' : 'Normal', price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0) };
  });
  const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  return { creditSectors, summary: { avgSpread: r2(creditSectors.reduce((s, c) => s + c.impliedSpread, 0) / creditSectors.length), vix: r2(vix), riskAppetite: vix < 18 ? 'Risk-On' : vix > 25 ? 'Risk-Off' : 'Neutral', bankSectorHealth: r2(qMap.get('KRE')?.regularMarketChangePercent || 0) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[CDS] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
