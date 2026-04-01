import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['LQD', 'HYG', 'JNK', 'EMB', 'BNDX', 'ANGL', 'AGG', '^TNX', '^VIX', 'KRE', 'XLF'];
const CACHE_TTL = 5 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5; const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  const regions = [{ name: 'US IG', proxy: 'LQD' }, { name: 'US HY', proxy: 'HYG' }, { name: 'US Junk', proxy: 'JNK' }, { name: 'EM', proxy: 'EMB' }, { name: 'International', proxy: 'BNDX' }, { name: 'Fallen Angels', proxy: 'ANGL' }].map(r => { const q = qMap.get(r.proxy); const yld = (q?.trailingAnnualDividendYield || 0) * 100; return { region: r.name, proxy: r.proxy, yield: r2(yld), spread: r2(yld - tnx), change: r2(q?.regularMarketChangePercent || 0), signal: (yld - tnx) > 4 ? 'Stress' : 'Normal' }; });
  return { regions, summary: { avgSpread: r2(regions.reduce((s, r) => s + r.spread, 0) / regions.length), vix: r2(vix), bankHealth: r2(qMap.get('KRE')?.regularMarketChangePercent || 0), stressCount: regions.filter(r => r.signal === 'Stress').length }, generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[GlobalCreditMonitor]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
