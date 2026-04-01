import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();
// Treasury yields + TIPs as fiscal proxy
const SYMBOLS = ['^TNX', '^TYX', '^IRX', 'TLT', 'TIP', 'SHY', 'DXY=X', '^GSPC'];

const CACHE_TTL = 15 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }

async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));

  const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5;
  const tyx = qMap.get('^TYX')?.regularMarketPrice || 4.8;
  const irx = qMap.get('^IRX')?.regularMarketPrice || 5.0;
  const dxy = qMap.get('DXY=X')?.regularMarketPrice || 104;

  // Bond market signals about fiscal health
  const yieldIndicators = [
    { maturity: '3-Month', yield: r2(irx), change: r2(qMap.get('^IRX')?.regularMarketChange || 0) },
    { maturity: '10-Year', yield: r2(tnx), change: r2(qMap.get('^TNX')?.regularMarketChange || 0) },
    { maturity: '30-Year', yield: r2(tyx), change: r2(qMap.get('^TYX')?.regularMarketChange || 0) },
  ];

  const termPremium = r2(tyx - tnx); // 30y - 10y as term premium proxy
  const realYield = r2(tnx - ((qMap.get('TIP')?.trailingAnnualDividendYield || 0.02) * 100));

  const fiscalSignals = [
    { indicator: 'Term Premium', value: termPremium, unit: '%', signal: termPremium > 0.5 ? 'Elevated (fiscal concern)' : 'Normal' },
    { indicator: 'Real Yield (10Y)', value: realYield, unit: '%', signal: realYield > 2 ? 'Restrictive' : realYield > 1 ? 'Neutral' : 'Accommodative' },
    { indicator: 'Dollar Index', value: r2(dxy), change: r2(qMap.get('DXY=X')?.regularMarketChangePercent || 0), signal: dxy > 106 ? 'Strong (demand for USD assets)' : 'Moderate' },
    { indicator: 'Long Bond (TLT)', value: r2(qMap.get('TLT')?.regularMarketPrice || 0), change: r2(qMap.get('TLT')?.regularMarketChangePercent || 0), signal: (qMap.get('TLT')?.regularMarketChangePercent || 0) < -0.5 ? 'Selling pressure' : 'Stable' },
  ];

  // US debt context (static reference, updated periodically)
  const debtContext = {
    nationalDebtT: 36.2, debtToGDP: 124, annualDeficitT: 1.9, interestCostT: 1.1,
    interestAsPercentOfRevenue: 22, note: 'Estimates based on CBO projections',
  };

  return { yieldIndicators, fiscalSignals, debtContext, generatedAt: new Date().toISOString() };
}

router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[FiscalDeficit] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
