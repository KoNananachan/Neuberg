import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['DXY=X', 'EURUSD=X', 'USDJPY=X', 'USDCNY=X', 'GLD', 'FXI', 'EWJ', '^TNX'];
const CACHE_TTL = 30 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  // Static reserve data with real-time FX context
  const reserves = [{ country: 'China', reservesT: 3.2, composition: 'USD-heavy', fxProxy: 'USDCNY=X' }, { country: 'Japan', reservesT: 1.3, composition: 'USD/EUR mix', fxProxy: 'USDJPY=X' }, { country: 'Switzerland', reservesT: 0.9, composition: 'Diversified' }, { country: 'India', reservesT: 0.65, composition: 'USD-heavy' }, { country: 'Saudi Arabia', reservesT: 0.45, composition: 'USD peg' }].map(r => ({ ...r, fxChange: r.fxProxy ? r2(qMap.get(r.fxProxy)?.regularMarketChangePercent || 0) : 0 }));
  return { reserves, dollarIndex: r2(qMap.get('DXY=X')?.regularMarketPrice || 104), goldPrice: r2(qMap.get('GLD')?.regularMarketPrice || 0), tenYearYield: r2(qMap.get('^TNX')?.regularMarketPrice || 4.5), generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[FXReserves]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
