import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['XLV', 'XLP', 'XLY', 'ITB', 'XHB', 'VNQ', 'HACK', '^GSPC', '^RUT', 'FXI', 'EWJ', 'INDA', 'EWZ'];
const CACHE_TTL = 15 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const themes = [
    { theme: 'Aging Population', proxies: ['XLV', 'XLP'], signal: 'Healthcare/staples demand' },
    { theme: 'Urbanization', proxies: ['ITB', 'XHB', 'VNQ'], signal: 'Housing/real estate' },
    { theme: 'Digitalization', proxies: ['HACK', 'XLY'], signal: 'Tech adoption' },
  ].map(t => { const avgChg = t.proxies.reduce((s, p) => s + (qMap.get(p)?.regularMarketChangePercent || 0), 0) / t.proxies.length; return { theme: t.theme, signal: t.signal, avgChange: r2(avgChg), momentum: avgChg > 0.5 ? 'Strong' : avgChg < -0.5 ? 'Weak' : 'Neutral' }; });
  const countries = [{ name: 'China', etf: 'FXI', demographic: 'Aging rapidly' }, { name: 'Japan', etf: 'EWJ', demographic: 'Super-aged' }, { name: 'India', etf: 'INDA', demographic: 'Young/growing' }, { name: 'Brazil', etf: 'EWZ', demographic: 'Transitioning' }].map(c => { const q = qMap.get(c.etf); return { country: c.name, etf: c.etf, change: r2(q?.regularMarketChangePercent || 0), demographic: c.demographic }; });
  return { themes, countries, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[DemographicTrends] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
