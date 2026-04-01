import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['DXY=X', 'EURUSD=X', 'USDJPY=X', 'GBPUSD=X', 'AUDUSD=X', 'USDCAD=X', 'USDCNY=X', '^IRX', '^TNX', '^VIX', 'GLD'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r4(n: number): number { return Math.round(n * 10000) / 10000; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const dxyChg = qMap.get('DXY=X')?.regularMarketChangePercent || 0;
  const forecasts = [
    { pair: 'EUR/USD', sym: 'EURUSD=X' }, { pair: 'USD/JPY', sym: 'USDJPY=X' }, { pair: 'GBP/USD', sym: 'GBPUSD=X' },
    { pair: 'AUD/USD', sym: 'AUDUSD=X' }, { pair: 'USD/CAD', sym: 'USDCAD=X' }, { pair: 'USD/CNY', sym: 'USDCNY=X' },
  ].map(f => { const q = qMap.get(f.sym); const rate = q?.regularMarketPrice || 1; const chg = q?.regularMarketChangePercent || 0; return { pair: f.pair, currentRate: r4(rate), change: r2(chg), trend: chg > 0.3 ? 'Bullish' : chg < -0.3 ? 'Bearish' : 'Neutral', support: r4(rate * 0.98), resistance: r4(rate * 1.02) }; });
  return { forecasts, dollarOutlook: { index: r2(qMap.get('DXY=X')?.regularMarketPrice || 104), change: r2(dxyChg), forecast: dxyChg > 0.3 ? 'Strengthening' : dxyChg < -0.3 ? 'Weakening' : 'Range-bound' }, drivers: { rateDifferential: r2((qMap.get('^TNX')?.regularMarketPrice || 4.5) - 3.5), vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20), goldSignal: r2(qMap.get('GLD')?.regularMarketChangePercent || 0) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[CurrencyForecast] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
