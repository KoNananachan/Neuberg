import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['MTUM', 'VLUE', 'SIZE', 'QUAL', 'USMV', 'IWD', 'IWF', 'SPY', 'QQQ', 'IWM', '^VIX', '^GSPC', '^TNX'];
const CACHE_TTL = 5 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const factors = [{ sym: 'MTUM', factor: 'Momentum' }, { sym: 'VLUE', factor: 'Value' }, { sym: 'SIZE', factor: 'Size' }, { sym: 'QUAL', factor: 'Quality' }, { sym: 'USMV', factor: 'Low Vol' }].map(f => { const q = qMap.get(f.sym); return { factor: f.factor, ticker: f.sym, price: r2(q?.regularMarketPrice), change: r2(q?.regularMarketChangePercent) }; });
  const stylePair = { value: r2(qMap.get('IWD')?.regularMarketChangePercent), growth: r2(qMap.get('IWF')?.regularMarketChangePercent) };
  return { factors, stylePair, benchmarks: { spy: r2(qMap.get('SPY')?.regularMarketChangePercent), qqq: r2(qMap.get('QQQ')?.regularMarketChangePercent), iwm: r2(qMap.get('IWM')?.regularMarketChangePercent) }, vix: r2(qMap.get('^VIX')?.regularMarketPrice), tenYear: r2(qMap.get('^TNX')?.regularMarketPrice), generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[QuantFactor]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
