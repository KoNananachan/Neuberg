import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^IRX', '^TNX', '^TYX', '^VIX', 'TLT', 'SHV', 'BIL', 'DXY=X', '^GSPC', 'GLD'];
const CACHE_TTL = 15 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const irx = qMap.get('^IRX')?.regularMarketPrice || 5; const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5; const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  const marketIndicators = [
    { name: 'T-Bill Yield', value: r3(irx), change: r3(qMap.get('^IRX')?.regularMarketChange || 0), signal: 'Normal' },
    { name: '10Y Treasury', value: r3(tnx), change: r3(qMap.get('^TNX')?.regularMarketChange || 0), signal: 'Monitor' },
    { name: 'VIX', value: r2(vix), change: r2(qMap.get('^VIX')?.regularMarketChange || 0), signal: vix > 25 ? 'Elevated' : 'Normal' },
    { name: 'Dollar Index', value: r2(qMap.get('DXY=X')?.regularMarketPrice || 104), change: r2(qMap.get('DXY=X')?.regularMarketChangePercent || 0), signal: 'Monitor' },
    { name: 'Gold (safe haven)', value: r2(qMap.get('GLD')?.regularMarketPrice || 0), change: r2(qMap.get('GLD')?.regularMarketChangePercent || 0), signal: (qMap.get('GLD')?.regularMarketChangePercent || 0) > 1 ? 'Flight to safety' : 'Calm' },
  ];
  // Static debt context
  const debtContext = { currentDebtLimitT: 36.1, currentDebtT: 35.8, headroom: 0.3, xDateEstimate: 'TBD', status: 'Monitor' };
  return { marketIndicators, debtContext, summary: { marketStress: vix > 25 ? 'Elevated' : 'Low', tBillSignal: 'Normal', spxChange: r2(qMap.get('^GSPC')?.regularMarketChangePercent || 0) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[DebtCeiling] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
