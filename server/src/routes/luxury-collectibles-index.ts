import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['LVMUY', 'RMS.PA', 'MC.PA', 'TIF', 'TPR', 'CPRI', 'RL', 'LULU', 'BIRK', 'GC=F', 'BTC-USD', '^GSPC'];
const CACHE_TTL = 15 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const luxuryStocks = ['LVMUY', 'TPR', 'CPRI', 'RL', 'LULU', 'BIRK'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), marketCap: r1((q?.marketCap || 0) / 1e9) }; });
  const altAssets = [{ name: 'Gold', proxy: 'GC=F' }, { name: 'Bitcoin', proxy: 'BTC-USD' }].map(a => ({ name: a.name, price: r2(qMap.get(a.proxy)?.regularMarketPrice || 0), change: r2(qMap.get(a.proxy)?.regularMarketChangePercent || 0) }));
  return { luxuryStocks, altAssets, summary: { avgLuxuryChange: r2(luxuryStocks.reduce((s, l) => s + l.change, 0) / luxuryStocks.length), spxChange: r2(qMap.get('^GSPC')?.regularMarketChangePercent || 0), wealthEffect: (qMap.get('^GSPC')?.regularMarketChangePercent || 0) > 0.5 ? 'Positive' : 'Neutral' }, generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[LuxuryCollectiblesIndex]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
