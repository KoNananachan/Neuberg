import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^TNX', '^TYX', '^IRX', 'TLT', 'TIP', 'DXY=X', '^VIX', 'GLD'];
const CACHE_TTL = 30 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5; const tyx = qMap.get('^TYX')?.regularMarketPrice || 4.8;
  const countries = [{ name: 'United States', debtT: 36.2, gdpT: 29.2, debtToGDP: 124 }, { name: 'Japan', debtT: 10.5, gdpT: 4.2, debtToGDP: 250 }, { name: 'China', debtT: 14.5, gdpT: 18.5, debtToGDP: 78 }, { name: 'UK', debtT: 3.2, gdpT: 3.4, debtToGDP: 94 }, { name: 'France', debtT: 3.5, gdpT: 3.1, debtToGDP: 113 }, { name: 'Italy', debtT: 3.1, gdpT: 2.2, debtToGDP: 141 }];
  const globalTotal = countries.reduce((s, c) => s + c.debtT, 0);
  return { countries, globalDebtT: r2(globalTotal), bondMarketSignals: { tenYear: r2(tnx), thirtyYear: r2(tyx), termPremium: r2(tyx - tnx), goldPrice: r2(qMap.get('GLD')?.regularMarketPrice || 0), dollarIndex: r2(qMap.get('DXY=X')?.regularMarketPrice || 104), fiscalStress: (tyx - tnx) > 0.5 ? 'Elevated' : 'Normal' }, generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[GlobalDebtClock]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
