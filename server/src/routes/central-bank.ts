import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^IRX', '^TNX', '^TYX', '^VIX', 'DXY=X', 'EURUSD=X', 'USDJPY=X', 'GBPUSD=X', 'TLT', 'GLD'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const irx = qMap.get('^IRX')?.regularMarketPrice || 5;
  const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5;
  const fedRate = r3(Math.round(irx * 4) / 4 + 0.25);
  const centralBanks = [
    { bank: 'Federal Reserve', country: 'US', rate: fedRate, lastChange: 'Hold', nextMeeting: 'TBD', currency: 'USD', proxy: 'DXY=X' },
    { bank: 'ECB', country: 'Eurozone', rate: r3(fedRate - 1.0), lastChange: 'Cut', nextMeeting: 'TBD', currency: 'EUR', proxy: 'EURUSD=X' },
    { bank: 'Bank of Japan', country: 'Japan', rate: 0.5, lastChange: 'Hike', nextMeeting: 'TBD', currency: 'JPY', proxy: 'USDJPY=X' },
    { bank: 'Bank of England', country: 'UK', rate: r3(fedRate - 0.5), lastChange: 'Hold', nextMeeting: 'TBD', currency: 'GBP', proxy: 'GBPUSD=X' },
  ].map(cb => ({ ...cb, fxRate: r2(qMap.get(cb.proxy)?.regularMarketPrice || 0), fxChange: r2(qMap.get(cb.proxy)?.regularMarketChangePercent || 0) }));
  const yieldCurve = { threeMonth: r3(irx), tenYear: r3(tnx), thirtyYear: r3(qMap.get('^TYX')?.regularMarketPrice || 4.8), spread3m10y: r3(tnx - irx) };
  const marketReaction = { vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20), dollarIndex: r2(qMap.get('DXY=X')?.regularMarketPrice || 104), goldChange: r2(qMap.get('GLD')?.regularMarketChangePercent || 0), bondChange: r2(qMap.get('TLT')?.regularMarketChangePercent || 0) };
  return { centralBanks, yieldCurve, marketReaction, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[CentralBank] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
