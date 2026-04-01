import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['ES=F', 'NQ=F', 'YM=F', 'RTY=F', '^GSPC', '^IXIC', '^DJI', '^RUT', 'SPY', 'QQQ', 'DIA', 'IWM', '^VIX'];
const CACHE_TTL = 2 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const arbs = [{ name: 'S&P 500', future: 'ES=F', cash: '^GSPC', etf: 'SPY' }, { name: 'Nasdaq 100', future: 'NQ=F', cash: '^IXIC', etf: 'QQQ' }, { name: 'Dow Jones', future: 'YM=F', cash: '^DJI', etf: 'DIA' }, { name: 'Russell 2000', future: 'RTY=F', cash: '^RUT', etf: 'IWM' }].map(a => { const fp = qMap.get(a.future)?.regularMarketPrice || 0; const cp = qMap.get(a.cash)?.regularMarketPrice || fp; const ep = qMap.get(a.etf)?.regularMarketPrice || 0; return { index: a.name, futuresPrice: r2(fp), cashPrice: r2(cp), etfPrice: r2(ep), futuresBasis: r2(fp - cp), etfPremium: r2(cp > 0 ? ((ep * (cp / ep > 10 ? 1 : cp / ep) - cp) / cp) * 100 : 0), opportunity: Math.abs(fp - cp) > cp * 0.002 ? 'Active' : 'No arb' }; });
  return { arbs, vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20), generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[IndexArbitrage]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
