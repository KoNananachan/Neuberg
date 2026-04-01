import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['BKLN', 'SRLN', 'HYG', 'LQD', '^IRX', '^TNX', '^VIX', 'GS', 'MS', 'JPM', 'BAC', 'KRE'];
const CACHE_TTL = 10 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  const arrangers = ['GS', 'MS', 'JPM', 'BAC'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, change: r2(q?.regularMarketChangePercent || 0) }; });
  const loanMarket = { bklnChange: r2(qMap.get('BKLN')?.regularMarketChangePercent || 0), hygChange: r2(qMap.get('HYG')?.regularMarketChangePercent || 0), baseRate: r2(qMap.get('^IRX')?.regularMarketPrice || 5), issuanceWindow: vix < 20 ? 'Wide Open' : vix > 28 ? 'Shut' : 'Selective' };
  return { arrangers, loanMarket, vix: r2(vix), kreHealth: r2(qMap.get('KRE')?.regularMarketChangePercent || 0), generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[LoanSyndicationPipeline]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
