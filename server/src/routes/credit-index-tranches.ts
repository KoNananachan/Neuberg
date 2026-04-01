import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['BKLN', 'SRLN', 'FLOT', 'HYG', 'JNK', 'ANGL', '^IRX', '^TNX', '^VIX'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const irx = qMap.get('^IRX')?.regularMarketPrice || 5;
  const tranches = [{ rating: 'Super Senior', proxy: 'BKLN', spread: 80 }, { rating: 'Senior', proxy: 'SRLN', spread: 130 }, { rating: 'Mezzanine', proxy: 'FLOT', spread: 200 }, { rating: 'Junior Mezz', proxy: 'HYG', spread: 350 }, { rating: 'Equity', proxy: 'JNK', spread: 600 }].map(t => { const q = qMap.get(t.proxy); return { tranche: t.rating, spreadBps: t.spread, yield: r2((q?.trailingAnnualDividendYield || 0) * 100), change: r2(q?.regularMarketChangePercent || 0), allInYield: r2(irx + t.spread / 100) }; });
  return { tranches, baseRate: r2(irx), vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20), generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[CreditIndexTranches] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
