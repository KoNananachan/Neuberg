import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['ALL', 'TRV', 'CB', 'PGR', 'MET', 'AIG', 'AFL', 'PRU', 'HIG', 'RNR', 'ACGL', 'KIE', '^VIX'];
const CACHE_TTL = 10 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const stocks = ['ALL', 'TRV', 'CB', 'PGR', 'MET', 'AIG', 'AFL', 'PRU', 'HIG', 'RNR', 'ACGL'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), pe: r1(q?.trailingPE || 0), priceToBook: r2(q?.priceToBook || 0), divYield: r2((q?.trailingAnnualDividendYield || 0) * 100), marketCap: r1((q?.marketCap || 0) / 1e9) }; });
  const kie = qMap.get('KIE');
  return { stocks, summary: { kieChange: r2(kie?.regularMarketChangePercent || 0), avgPB: r2(stocks.reduce((s, st) => s + st.priceToBook, 0) / stocks.length), avgDivYield: r2(stocks.reduce((s, st) => s + st.divYield, 0) / stocks.length), vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20), totalMarketCap: r1(stocks.reduce((s, st) => s + st.marketCap, 0)) }, generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[InsuranceMarket]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
