import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['HACK', 'CIBR', 'BUG', 'CRWD', 'PANW', 'FTNT', 'ZS', 'NET', 'S', 'OKTA', 'CYBR', 'RPD', 'TENB', 'QLYS', 'VRNS'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const segMap: Record<string, string> = { CRWD: 'Endpoint', PANW: 'Platform', FTNT: 'Network', ZS: 'Cloud', NET: 'Edge', S: 'AI Security', OKTA: 'Identity', CYBR: 'Privileged Access', RPD: 'Detection', TENB: 'Vulnerability', QLYS: 'Compliance', VRNS: 'Data Security' };
  const stocks = SYMBOLS.filter(s => !['HACK', 'CIBR', 'BUG'].includes(s)).map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, segment: segMap[sym] || 'Other', price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), marketCap: r1((q?.marketCap || 0) / 1e9), pe: r1(q?.trailingPE || 0), forwardPE: r1(q?.forwardPE || 0) }; });
  const hack = qMap.get('HACK');
  return { stocks, etfs: ['HACK', 'CIBR', 'BUG'].map(sym => { const q = qMap.get(sym); return { ticker: sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0) }; }), summary: { hackChange: r2(hack?.regularMarketChangePercent || 0), totalMarketCap: r1(stocks.reduce((s, st) => s + st.marketCap, 0)), topPerformer: [...stocks].sort((a, b) => b.change - a.change)[0]?.ticker || 'N/A' }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[Cybersecurity] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
