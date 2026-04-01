import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['BTC-USD', 'ETH-USD', 'SOL-USD', 'BNB-USD', 'XRP-USD', 'IBIT', 'BITO', 'ETHA', '^IRX'];
const CACHE_TTL = 2 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r4(n: number): number { return Math.round(n * 10000) / 10000; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const cryptos = ['BTC-USD', 'ETH-USD', 'SOL-USD', 'BNB-USD', 'XRP-USD'].map(sym => { const q = qMap.get(sym); const chg = q?.regularMarketChangePercent || 0; return { asset: sym.replace('-USD', ''), price: r2(q?.regularMarketPrice || 0), change24h: r2(chg), fundingRateEst: r4(chg > 3 ? 0.03 : chg > 0 ? 0.01 : chg < -3 ? -0.02 : -0.005), sentiment: chg > 2 ? 'Bullish (longs paying)' : chg < -2 ? 'Bearish (shorts paying)' : 'Neutral' }; });
  const etfs = ['IBIT', 'BITO', 'ETHA'].map(sym => { const q = qMap.get(sym); return { ticker: sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), volume: q?.regularMarketVolume || 0 }; });
  return { cryptos, etfs, baseRate: r2(qMap.get('^IRX')?.regularMarketPrice || 5), generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[FundingRateMonitor] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
