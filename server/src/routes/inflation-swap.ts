import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^TNX', '^TYX', '^IRX', 'TIP', 'STIP', 'GLD', 'DBC', 'CL=F', '^VIX'];
const CACHE_TTL = 10 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5; const tipYld = (qMap.get('TIP')?.trailingAnnualDividendYield || 0.02) * 100;
  const swapRates = [{ tenor: '1Y', rate: r2(tnx * 0.8 - tipYld * 0.8) }, { tenor: '2Y', rate: r2(tnx * 0.85 - tipYld * 0.85) }, { tenor: '5Y', rate: r2(tnx * 0.9 - tipYld * 0.9) }, { tenor: '10Y', rate: r2(tnx - tipYld) }, { tenor: '30Y', rate: r2((qMap.get('^TYX')?.regularMarketPrice || 4.8) - tipYld * 1.05) }];
  return { swapRates, nominalYield: r2(tnx), realYield: r2(tipYld), commoditySignal: r2(qMap.get('DBC')?.regularMarketChangePercent || 0), oilPrice: r2(qMap.get('CL=F')?.regularMarketPrice || 0), generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[InflationSwap]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
