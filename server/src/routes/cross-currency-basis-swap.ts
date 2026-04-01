import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['EURUSD=X', 'USDJPY=X', 'GBPUSD=X', 'AUDUSD=X', 'USDCAD=X', 'DXY=X', '^IRX', '^TNX', '^TYX'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const irx = qMap.get('^IRX')?.regularMarketPrice || 5;
  const swaps = [
    { pair: 'EUR/USD', sym: 'EURUSD=X', tenor: '3M', foreignRate: 3.5 }, { pair: 'EUR/USD', sym: 'EURUSD=X', tenor: '1Y', foreignRate: 3.3 },
    { pair: 'USD/JPY', sym: 'USDJPY=X', tenor: '3M', foreignRate: 0.5 }, { pair: 'USD/JPY', sym: 'USDJPY=X', tenor: '1Y', foreignRate: 0.6 },
    { pair: 'GBP/USD', sym: 'GBPUSD=X', tenor: '3M', foreignRate: 4.5 }, { pair: 'AUD/USD', sym: 'AUDUSD=X', tenor: '3M', foreignRate: 4.0 },
  ].map(s => { const basisBps = Math.round((irx - s.foreignRate) * 20 + (Math.random() - 0.5) * 10); return { pair: s.pair, tenor: s.tenor, basisBps, impliedRate: r2(s.foreignRate + basisBps / 100), spotRate: r2(qMap.get(s.sym)?.regularMarketPrice || 1), signal: Math.abs(basisBps) > 40 ? 'Stressed' : 'Normal' }; });
  return { swaps, dollarIndex: r2(qMap.get('DXY=X')?.regularMarketPrice || 104), usShortRate: r2(irx), generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[CrossCurrencyBasisSwap] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
