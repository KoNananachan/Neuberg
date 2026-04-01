import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['EURUSD=X', 'USDJPY=X', 'GBPUSD=X', 'USDCHF=X', 'AUDUSD=X', 'USDCAD=X', 'DXY=X', '^IRX', '^TNX'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r4(n: number): number { return Math.round(n * 10000) / 10000; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const irx = qMap.get('^IRX')?.regularMarketPrice || 5;
  const pairs = [
    { pair: 'EUR/USD', sym: 'EURUSD=X', foreignRate: 3.5 }, { pair: 'USD/JPY', sym: 'USDJPY=X', foreignRate: 0.5 },
    { pair: 'GBP/USD', sym: 'GBPUSD=X', foreignRate: 4.5 }, { pair: 'USD/CHF', sym: 'USDCHF=X', foreignRate: 1.5 },
    { pair: 'AUD/USD', sym: 'AUDUSD=X', foreignRate: 4.0 }, { pair: 'USD/CAD', sym: 'USDCAD=X', foreignRate: 4.25 },
  ].map(p => { const q = qMap.get(p.sym); const rate = q?.regularMarketPrice || 1; const basisBps = Math.round((irx - p.foreignRate) * 25); return { pair: p.pair, rate: r4(rate), change: r2(q?.regularMarketChangePercent || 0), basisBps, impliedYieldDiff: r2(irx - p.foreignRate), signal: Math.abs(basisBps) > 30 ? 'Wide' : 'Normal' }; });
  return { pairs, dollarIndex: r2(qMap.get('DXY=X')?.regularMarketPrice || 104), usRate: r2(irx), generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[CrossCurrencyBasis] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
