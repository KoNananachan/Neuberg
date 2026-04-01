import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'META', 'NVDA', 'AMD', 'V', 'MA', 'JPM', 'GS', 'XOM', 'CVX', 'KO', 'PEP', 'HD', 'LOW'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const pairs = [['AAPL', 'MSFT'], ['GOOGL', 'META'], ['NVDA', 'AMD'], ['V', 'MA'], ['JPM', 'GS'], ['XOM', 'CVX'], ['KO', 'PEP'], ['HD', 'LOW']].map(([a, b]) => { const qa = qMap.get(a); const qb = qMap.get(b); const chgA = qa?.regularMarketChangePercent || 0; const chgB = qb?.regularMarketChangePercent || 0; const spread = r2(chgA - chgB); return { leg1: a, leg2: b, leg1Price: r2(qa?.regularMarketPrice || 0), leg2Price: r2(qb?.regularMarketPrice || 0), leg1Change: r2(chgA), leg2Change: r2(chgB), spread, signal: Math.abs(spread) > 2 ? 'Divergence (trade opportunity)' : 'Correlated', ratio: r2((qa?.regularMarketPrice || 1) / (qb?.regularMarketPrice || 1)) }; });
  return { pairs, summary: { activePairs: pairs.filter(p => p.signal.includes('Divergence')).length, avgSpread: r2(pairs.reduce((s, p) => s + Math.abs(p.spread), 0) / pairs.length) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[EquityPairsTrading] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
