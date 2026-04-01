import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['XLI', 'FXI', 'EWJ', 'EWG', 'EWU', 'INDA', 'EWZ', 'EWY', 'EWT', 'EWA', 'EEM', 'IYT', 'COPX', '^VIX'];
const CACHE_TTL = 10 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const regions = [{ name: 'US', proxy: 'XLI' }, { name: 'China', proxy: 'FXI' }, { name: 'Japan', proxy: 'EWJ' }, { name: 'Eurozone', proxy: 'EWG' }, { name: 'UK', proxy: 'EWU' }, { name: 'India', proxy: 'INDA' }, { name: 'Brazil', proxy: 'EWZ' }, { name: 'Korea', proxy: 'EWY' }, { name: 'Taiwan', proxy: 'EWT' }, { name: 'Australia', proxy: 'EWA' }].map(r => { const q = qMap.get(r.proxy); const chg = q?.regularMarketChangePercent || 0; return { region: r.name, proxy: r.proxy, change: r2(chg), pmiEstimate: Math.round(50 + chg * 2), zone: chg > 0.5 ? 'Expansion' : chg < -0.5 ? 'Contraction' : 'Borderline' }; });
  return { regions, summary: { globalPMIEst: Math.round(regions.reduce((s, r) => s + r.pmiEstimate, 0) / regions.length), expandingCount: regions.filter(r => r.zone === 'Expansion').length, vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20) }, generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[GlobalPMIDashboard]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
