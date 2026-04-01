import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['BRK-B', 'BX', 'KKR', 'APO', 'CG', 'ARES', 'OWL', 'BAM', 'IVZ', 'BEN', 'TROW', 'BLK', 'SCHW', '^GSPC'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const spxChg = qMap.get('^GSPC')?.regularMarketChangePercent || 0;
  const managers = SYMBOLS.filter(s => s !== '^GSPC').map(sym => { const q = qMap.get(sym); const chg = q?.regularMarketChangePercent || 0; return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(chg), alpha: r2(chg - spxChg), marketCap: r1((q?.marketCap || 0) / 1e9), pe: r1(q?.trailingPE || 0), dividendYield: r2((q?.trailingAnnualDividendYield || 0) * 100) }; }).sort((a, b) => b.alpha - a.alpha);
  return { managers, summary: { topPerformer: managers[0]?.ticker || 'N/A', avgAlpha: r2(managers.reduce((s, m) => s + m.alpha, 0) / managers.length), spxBenchmark: r2(spxChg) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[FundManagerRanking] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
