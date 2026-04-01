import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^VIX', '^GSPC', 'XLF', 'JPM', 'BAC', 'C', 'GS', 'MS', 'WFC', 'HYG', 'LQD', '^TNX'];
const CACHE_TTL = 10 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  const banks = ['JPM', 'BAC', 'C', 'GS', 'MS', 'WFC'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice), change: r2(q?.regularMarketChangePercent), marketCap: r1((q?.marketCap || 0) / 1e9), pe: r2(q?.trailingPE) }; });
  const xlf = qMap.get('XLF'); const hyg = qMap.get('HYG'); const lqd = qMap.get('LQD');
  return { banks, sectorEtf: { ticker: 'XLF', price: r2(xlf?.regularMarketPrice), change: r2(xlf?.regularMarketChangePercent) }, riskIndicators: { vix: r2(vix), riskLevel: vix > 30 ? 'High' : vix > 20 ? 'Elevated' : 'Normal', creditSpread: r2(((hyg?.trailingAnnualDividendYield || 0) - (lqd?.trailingAnnualDividendYield || 0)) * 100), tenYear: r2(qMap.get('^TNX')?.regularMarketPrice) }, generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[OperationalRisk]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
