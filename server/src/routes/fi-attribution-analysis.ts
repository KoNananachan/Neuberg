import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['AGG', 'LQD', 'HYG', 'TLT', 'IEF', 'SHY', 'TIP', 'MUB', 'EMB', 'VCSH', 'VCIT', 'VCLT', '^TNX', '^TYX', '^IRX'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5;
  const attributionSources = [
    { source: 'Duration (rates)', proxies: ['TLT', 'IEF', 'SHY'], description: 'Interest rate exposure' },
    { source: 'Credit Spread', proxies: ['LQD', 'HYG'], description: 'Corporate credit' },
    { source: 'EM Spread', proxies: ['EMB'], description: 'Emerging market credit' },
    { source: 'TIPS (real rates)', proxies: ['TIP'], description: 'Inflation protection' },
  ].map(s => { const avgChg = s.proxies.reduce((sum, p) => sum + (qMap.get(p)?.regularMarketChangePercent || 0), 0) / s.proxies.length; return { source: s.source, description: s.description, contribution: r2(avgChg), direction: avgChg > 0.1 ? 'Positive' : avgChg < -0.1 ? 'Negative' : 'Flat' }; });
  return { attributionSources, yields: { threeMonth: r2(qMap.get('^IRX')?.regularMarketPrice || 5), tenYear: r2(tnx), thirtyYear: r2(qMap.get('^TYX')?.regularMarketPrice || 4.8) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[FIAttributionAnalysis] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
