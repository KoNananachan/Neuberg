import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['ICLN', 'TAN', 'FAN', 'KRBN', 'XLE', 'XOP', 'CL=F', 'NG=F', 'TSLA', 'ENPH', 'FSLR', 'NEE', '^VIX'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const cleanEnergy = ['ICLN', 'TAN', 'FAN'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0) }; });
  const fossilFuel = ['XLE', 'XOP'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0) }; });
  const cleanStocks = ['TSLA', 'ENPH', 'FSLR', 'NEE'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), marketCap: r1((q?.marketCap || 0) / 1e9) }; });
  const iclnChg = qMap.get('ICLN')?.regularMarketChangePercent || 0;
  const xleChg = qMap.get('XLE')?.regularMarketChangePercent || 0;
  return { cleanEnergy, fossilFuel, cleanStocks, carbonPrice: r2(qMap.get('KRBN')?.regularMarketPrice || 30), summary: { cleanVsFossil: r2(iclnChg - xleChg), transitionMomentum: iclnChg > xleChg ? 'Clean outperforming' : 'Fossil outperforming', oilPrice: r2(qMap.get('CL=F')?.regularMarketPrice || 75), vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[ClimateRisk] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
