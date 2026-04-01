import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['JNJ', 'PG', 'KO', 'PEP', 'XOM', 'CVX', 'JPM', 'BAC', 'ABBV', 'MRK', 'T', 'VZ', 'HD', 'WMT', 'MSFT', 'AAPL', 'O', 'SPG', 'VIG', 'SCHD'];
const CACHE_TTL = 15 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const forecasts = quotes.filter(q => q?.symbol && q.trailingAnnualDividendRate).map(q => { const rate = q.trailingAnnualDividendRate || 0; const price = q.regularMarketPrice || 1; return { ticker: q.symbol!, name: q.shortName || q.symbol!, currentYield: r2((rate / price) * 100), annualDividend: r2(rate), price: r2(price), change: r2(q.regularMarketChangePercent || 0), payoutRatio: r2((q.payoutRatio || 0.4) * 100), forecastGrowth: r2(rate > 3 ? 5 : rate > 1 ? 3 : 8) }; }).sort((a, b) => b.currentYield - a.currentYield);
  return { forecasts, summary: { avgYield: r2(forecasts.reduce((s, f) => s + f.currentYield, 0) / forecasts.length), topYield: forecasts[0]?.ticker || 'N/A', avgGrowthForecast: r2(forecasts.reduce((s, f) => s + f.forecastGrowth, 0) / forecasts.length) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[EquityDividendForecast] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
