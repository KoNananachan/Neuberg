import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['XLI', 'EFA', 'FXI', 'EWJ', 'EWG', 'EWU', 'EWZ', 'INDA', 'EEM', '^GSPC', 'IYT', 'COPX'];
const CACHE_TTL = 10 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const countries = [{ name: 'US', proxy: 'XLI' }, { name: 'China', proxy: 'FXI' }, { name: 'Japan', proxy: 'EWJ' }, { name: 'Germany', proxy: 'EWG' }, { name: 'UK', proxy: 'EWU' }, { name: 'India', proxy: 'INDA' }, { name: 'Brazil', proxy: 'EWZ' }].map(c => { const q = qMap.get(c.proxy); const chg = q?.regularMarketChangePercent || 0; return { country: c.name, proxy: c.proxy, change: r2(chg), pmiSignal: chg > 0.5 ? 'Expansion (>50)' : chg < -0.5 ? 'Contraction (<50)' : 'Borderline (~50)' }; });
  return { countries, summary: { expandingCount: countries.filter(c => c.pmiSignal.includes('Expansion')).length, globalActivity: r2(qMap.get('XLI')?.regularMarketChangePercent || 0), transportProxy: r2(qMap.get('IYT')?.regularMarketChangePercent || 0), copperProxy: r2(qMap.get('COPX')?.regularMarketChangePercent || 0) }, generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[GlobalPMI]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
