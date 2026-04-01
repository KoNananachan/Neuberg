import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^GSPC', 'DXY=X', 'FXI', 'EWJ', 'EWG', 'EWU', 'EWZ', 'EFA', 'EEM', '^VIX', 'GS', 'MS', 'JPM', 'LRCX', 'AVGO'];
const CACHE_TTL = 15 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const regions = [{ region: 'China', etf: 'FXI' }, { region: 'Japan', etf: 'EWJ' }, { region: 'Germany', etf: 'EWG' }, { region: 'UK', etf: 'EWU' }, { region: 'Brazil', etf: 'EWZ' }].map(r => { const q = qMap.get(r.etf); return { region: r.region, etf: r.etf, change: r2(q?.regularMarketChangePercent || 0), sentiment: (q?.regularMarketChangePercent || 0) > 0.5 ? 'Favorable' : (q?.regularMarketChangePercent || 0) < -0.5 ? 'Challenging' : 'Neutral' }; });
  const advisors = ['GS', 'MS', 'JPM'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), pe: r1(q?.trailingPE || 0) }; });
  return { regions, advisors, summary: { dollarIndex: r2(qMap.get('DXY=X')?.regularMarketPrice || 104), dollarChange: r2(qMap.get('DXY=X')?.regularMarketChangePercent || 0), emSentiment: r2(qMap.get('EEM')?.regularMarketChangePercent || 0), vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20), dealEnvironment: (qMap.get('^VIX')?.regularMarketPrice || 20) < 20 ? 'Favorable' : 'Cautious' }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[CrossBorderMA] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
