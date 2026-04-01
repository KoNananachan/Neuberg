import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['FXI', 'EWJ', 'EWG', 'EWU', 'EWZ', 'EWW', 'EWY', 'EWT', 'INDA', 'EWA', 'DXY=X', '^VIX', 'EMB', 'EEM'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const countries = [
    { country: 'China', etf: 'FXI' }, { country: 'Japan', etf: 'EWJ' }, { country: 'Germany', etf: 'EWG' },
    { country: 'UK', etf: 'EWU' }, { country: 'Brazil', etf: 'EWZ' }, { country: 'Mexico', etf: 'EWW' },
    { country: 'South Korea', etf: 'EWY' }, { country: 'Taiwan', etf: 'EWT' }, { country: 'India', etf: 'INDA' },
    { country: 'Australia', etf: 'EWA' },
  ].map(c => {
    const q = qMap.get(c.etf); const chg = q?.regularMarketChangePercent || 0;
    return { country: c.country, etf: c.etf, price: r2(q?.regularMarketPrice || 0), change: r2(chg), riskLevel: chg < -2 ? 'Elevated' : chg < -1 ? 'Moderate' : 'Low', vs52wHigh: q?.fiftyTwoWeekHigh ? r2(((q.regularMarketPrice || 0) - q.fiftyTwoWeekHigh) / q.fiftyTwoWeekHigh * 100) : 0 };
  });
  const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  return { countries, summary: { emChange: r2(qMap.get('EEM')?.regularMarketChangePercent || 0), embChange: r2(qMap.get('EMB')?.regularMarketChangePercent || 0), dollarIndex: r2(qMap.get('DXY=X')?.regularMarketPrice || 104), vix: r2(vix), elevatedRiskCount: countries.filter(c => c.riskLevel === 'Elevated').length }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[CountryRisk] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); }
});
export default router;
