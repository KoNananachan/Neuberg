import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^TNX', '^TYX', '^IRX', 'TLT', 'TIP', 'DXY=X', '^GSPC', '^VIX', 'GLD', 'SHV'];
const CACHE_TTL = 15 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5; const tyx = qMap.get('^TYX')?.regularMarketPrice || 4.8;
  const indicators = [
    { name: 'Term Premium', value: r2(tyx - tnx), signal: (tyx - tnx) > 0.5 ? 'Fiscal concern (steepening)' : 'Normal' },
    { name: 'Real Yield', value: r2(tnx - ((qMap.get('TIP')?.trailingAnnualDividendYield || 0.02) * 100)), signal: 'Monitor' },
    { name: 'Dollar Strength', value: r2(qMap.get('DXY=X')?.regularMarketPrice || 104), signal: (qMap.get('DXY=X')?.regularMarketChangePercent || 0) > 0.3 ? 'USD demand' : 'Stable' },
    { name: 'Gold (fiscal hedge)', value: r2(qMap.get('GLD')?.regularMarketPrice || 0), change: r2(qMap.get('GLD')?.regularMarketChangePercent || 0), signal: (qMap.get('GLD')?.regularMarketChangePercent || 0) > 1 ? 'Fiscal concern signal' : 'Normal' },
  ];
  return { indicators, debtContext: { nationalDebtT: 36.2, debtToGDP: 124, annualDeficitT: 1.9 }, summary: { vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20), bondMarketSignal: (tyx - tnx) > 0.5 ? 'Fiscal stress' : 'Benign' }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[FiscalPolicy] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
