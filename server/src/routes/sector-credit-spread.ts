import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['HYG', 'JNK', 'LQD', 'VCIT', 'VCSH', 'IGIB', 'USIG', 'XLF', 'XLE', 'XLK', 'XLV', '^TNX', '^VIX'];
const CACHE_TTL = 5 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const creditEtfs = ['HYG', 'JNK', 'LQD', 'VCIT', 'VCSH', 'IGIB', 'USIG'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice), change: r2(q?.regularMarketChangePercent), yield: r2((q?.trailingAnnualDividendYield || 0) * 100) }; });
  const sectors = ['XLF', 'XLE', 'XLK', 'XLV'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, change: r2(q?.regularMarketChangePercent) }; });
  const hyYield = (qMap.get('HYG')?.trailingAnnualDividendYield || 0) * 100; const igYield = (qMap.get('LQD')?.trailingAnnualDividendYield || 0) * 100;
  return { creditEtfs, sectors, spreads: { hyIg: r2(hyYield - igYield), hyTreasury: r2(hyYield - (qMap.get('^TNX')?.regularMarketPrice || 0)) }, vix: r2(qMap.get('^VIX')?.regularMarketPrice), generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[SectorCreditSpread]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
