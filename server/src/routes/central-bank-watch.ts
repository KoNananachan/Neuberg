import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^IRX', '^TNX', '^TYX', '^VIX', 'DXY=X', 'EURUSD=X', 'USDJPY=X', 'GBPUSD=X', 'AUDUSD=X', 'TLT', 'GLD'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const irx = qMap.get('^IRX')?.regularMarketPrice || 5; const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5;
  const banks = [
    { bank: 'Federal Reserve', rate: r3(Math.round(irx * 4) / 4 + 0.25), bias: tnx < irx ? 'Easing' : 'Hold', fx: 'DXY=X', nextMeeting: 'TBD' },
    { bank: 'ECB', rate: r3(Math.round(irx * 4) / 4 - 0.75), bias: 'Easing', fx: 'EURUSD=X', nextMeeting: 'TBD' },
    { bank: 'Bank of Japan', rate: 0.5, bias: 'Tightening', fx: 'USDJPY=X', nextMeeting: 'TBD' },
    { bank: 'Bank of England', rate: r3(Math.round(irx * 4) / 4 - 0.25), bias: 'Hold', fx: 'GBPUSD=X', nextMeeting: 'TBD' },
    { bank: 'RBA', rate: r3(Math.round(irx * 4) / 4 - 0.5), bias: 'Hold', fx: 'AUDUSD=X', nextMeeting: 'TBD' },
  ].map(b => ({ ...b, fxRate: r2(qMap.get(b.fx)?.regularMarketPrice || 0), fxChange: r2(qMap.get(b.fx)?.regularMarketChangePercent || 0) }));
  const marketSignals = { vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20), goldChange: r2(qMap.get('GLD')?.regularMarketChangePercent || 0), bondChange: r2(qMap.get('TLT')?.regularMarketChangePercent || 0), yieldSpread: r3(tnx - irx) };
  return { banks, marketSignals, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[CentralBankWatch] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
