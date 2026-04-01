import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['LQD', 'HYG', 'JNK', 'EMB', 'VCSH', 'VCIT', 'VCLT', 'MUB', '^TNX', '^TYX', '^IRX', '^VIX'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5;
  const sectors = [
    { name: 'IG Short', proxy: 'VCSH', avgSpread: 40 }, { name: 'IG Intermediate', proxy: 'VCIT', avgSpread: 80 },
    { name: 'IG Long', proxy: 'VCLT', avgSpread: 120 }, { name: 'IG Aggregate', proxy: 'LQD', avgSpread: 90 },
    { name: 'High Yield', proxy: 'HYG', avgSpread: 350 }, { name: 'Junk', proxy: 'JNK', avgSpread: 420 },
    { name: 'EM Sovereign', proxy: 'EMB', avgSpread: 280 }, { name: 'Municipal', proxy: 'MUB', avgSpread: 60 },
  ].map(s => { const q = qMap.get(s.proxy); const yld = (q?.trailingAnnualDividendYield || 0) * 100; const spread = Math.round((yld - tnx) * 100); return { sector: s.name, proxy: s.proxy, yield: r2(yld), spreadBps: spread, historicalAvg: s.avgSpread, vsAvg: spread - s.avgSpread, signal: spread > s.avgSpread * 1.2 ? 'Wide' : spread < s.avgSpread * 0.8 ? 'Tight' : 'Fair', change: r2(q?.regularMarketChangePercent || 0) }; });
  return { sectors, summary: { avgSpreadBps: Math.round(sectors.reduce((s, c) => s + c.spreadBps, 0) / sectors.length), wideCount: sectors.filter(s => s.signal === 'Wide').length, tightCount: sectors.filter(s => s.signal === 'Tight').length, vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[CreditSpread] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
