import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^VIX', '^GSPC', 'IPO', 'GS', 'MS', 'JPM', 'RIVN', 'COIN', 'HOOD', 'RBLX', 'SOFI', 'AFRM', 'DKNG', 'PLTR'];
const CACHE_TTL = 15 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  const recentIPOs = ['RIVN', 'COIN', 'HOOD', 'RBLX', 'SOFI', 'AFRM', 'DKNG', 'PLTR'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), marketCap: r1((q?.marketCap || 0) / 1e9), vs52wHigh: q?.fiftyTwoWeekHigh ? r2(((q.regularMarketPrice || 0) - q.fiftyTwoWeekHigh) / q.fiftyTwoWeekHigh * 100) : 0 }; });
  const ipoEtf = qMap.get('IPO');
  return { recentIPOs, ipoEtf: { price: r2(ipoEtf?.regularMarketPrice || 0), change: r2(ipoEtf?.regularMarketChangePercent || 0) }, summary: { vix: r2(vix), ipoWindow: vix < 18 ? 'Wide Open' : vix < 25 ? 'Selective' : 'Shut', spxChange: r2(qMap.get('^GSPC')?.regularMarketChangePercent || 0), underwriterSentiment: r2((['GS', 'MS', 'JPM'].reduce((s, sym) => s + (qMap.get(sym)?.regularMarketChangePercent || 0), 0)) / 3) }, generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[IPOCalendar]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
