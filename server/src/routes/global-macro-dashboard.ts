import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^GSPC', '^DJI', '^IXIC', '^RUT', '^VIX', '^TNX', '^IRX', 'DXY=X', 'GLD', 'CL=F', 'HYG', 'TLT', 'EEM', 'FXI', 'EURUSD=X', 'USDJPY=X'];
const CACHE_TTL = 5 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const vix = qMap.get('^VIX')?.regularMarketPrice || 20; const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5; const irx = qMap.get('^IRX')?.regularMarketPrice || 5;
  const dashboard = { equities: { spx: r2(qMap.get('^GSPC')?.regularMarketChangePercent || 0), nasdaq: r2(qMap.get('^IXIC')?.regularMarketChangePercent || 0), russell: r2(qMap.get('^RUT')?.regularMarketChangePercent || 0) }, rates: { tenYear: r2(tnx), threeMonth: r2(irx), yieldCurve: r2(tnx - irx) }, fx: { dollar: r2(qMap.get('DXY=X')?.regularMarketPrice || 104), eurUsd: r2(qMap.get('EURUSD=X')?.regularMarketPrice || 0), usdJpy: r2(qMap.get('USDJPY=X')?.regularMarketPrice || 0) }, commodities: { gold: r2(qMap.get('GLD')?.regularMarketChangePercent || 0), oil: r2(qMap.get('CL=F')?.regularMarketPrice || 0) }, risk: { vix: r2(vix), credit: r2(qMap.get('HYG')?.regularMarketChangePercent || 0), em: r2(qMap.get('EEM')?.regularMarketChangePercent || 0) } };
  return { dashboard, regime: vix < 18 ? 'Risk-On' : vix > 25 ? 'Risk-Off' : 'Neutral', generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[GlobalMacroDashboard]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
