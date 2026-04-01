import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^GSPC', '^VIX', '^TNX', '^IRX', 'DXY=X', 'GC=F', 'CL=F', 'HYG', 'TLT', 'EEM', 'SPY', 'QQQ', 'IWM', 'TIP'];
const CACHE_TTL = 5 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function clamp(n: number, min: number, max: number): number { return Math.max(min, Math.min(max, n)); }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const vix = qMap.get('^VIX')?.regularMarketPrice || 20; const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5; const irx = qMap.get('^IRX')?.regularMarketPrice || 5;
  const growth = clamp(Math.round(50 + (qMap.get('^GSPC')?.regularMarketChangePercent || 0) * 8 + (qMap.get('HYG')?.regularMarketChangePercent || 0) * 5), 0, 100);
  const inflation = clamp(Math.round(50 + (qMap.get('CL=F')?.regularMarketChangePercent || 0) * 3 + (qMap.get('GC=F')?.regularMarketChangePercent || 0) * 3), 0, 100);
  let regime: string;
  if (growth > 55 && inflation < 55) regime = 'Goldilocks (growth + low inflation)';
  else if (growth > 55 && inflation > 55) regime = 'Reflation (growth + rising inflation)';
  else if (growth < 45 && inflation > 55) regime = 'Stagflation (weak growth + inflation)';
  else if (growth < 45 && inflation < 45) regime = 'Deflation (weak growth + falling prices)';
  else regime = 'Transition';
  return { growthScore: growth, inflationScore: inflation, regime, signals: { equityChange: r2(qMap.get('^GSPC')?.regularMarketChangePercent || 0), vix: r2(vix), yieldCurve: r2(tnx - irx), credit: r2(qMap.get('HYG')?.regularMarketChangePercent || 0), dollar: r2(qMap.get('DXY=X')?.regularMarketChangePercent || 0), gold: r2(qMap.get('GC=F')?.regularMarketChangePercent || 0), oil: r2(qMap.get('CL=F')?.regularMarketChangePercent || 0) }, generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[MacroRegimeMonitor]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
