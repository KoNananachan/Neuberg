import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'JPM', 'JNJ', 'V', 'UNH', 'PG', 'HD', 'CRM', 'XOM'];
const CACHE_TTL = 15 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const revisions = quotes.filter(q => q?.symbol).map(q => {
    const eps = q.epsTrailingTwelveMonths || 0; const fwd = q.epsForward || eps;
    const revisionPct = eps > 0 ? r2(((fwd - eps) / eps) * 100) : 0;
    return { ticker: q.symbol!, name: q.shortName || q.symbol!, price: r2(q.regularMarketPrice || 0), change: r2(q.regularMarketChangePercent || 0), epsTrailing: r2(eps), epsForward: r2(fwd), revisionPct, direction: revisionPct > 2 ? 'Upgrade' : revisionPct < -2 ? 'Downgrade' : 'Stable', pe: r1(q.trailingPE || 0), forwardPE: r1(q.forwardPE || 0) };
  });
  const upgrades = revisions.filter(r => r.direction === 'Upgrade').length;
  return { revisions, summary: { upgrades, downgrades: revisions.filter(r => r.direction === 'Downgrade').length, stable: revisions.filter(r => r.direction === 'Stable').length, avgRevision: r2(revisions.reduce((s, r) => s + r.revisionPct, 0) / revisions.length), bias: upgrades > revisions.length / 2 ? 'Positive' : 'Negative' }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[EarningsRevision] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
