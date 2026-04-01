import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();
const SYMBOLS = [
  'BDRY', 'FDX', 'UPS', 'JBHT', 'XPO', // Shipping/logistics
  'CL=F', 'NG=F', // Energy costs
  'COPX', // Industrial metals
  'IYT', // Transportation ETF
  '^GSPC', // Broad market
];

const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
function clamp(n: number, min: number, max: number): number { return Math.max(min, Math.min(max, n)); }

async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));

  const bdryChg = qMap.get('BDRY')?.regularMarketChangePercent || 0;
  const oilChg = qMap.get('CL=F')?.regularMarketChangePercent || 0;
  const iytChg = qMap.get('IYT')?.regularMarketChangePercent || 0;

  const components = [
    { name: 'Shipping Costs', proxy: 'BDRY', change: r2(bdryChg), score: clamp(Math.round(50 + bdryChg * 5), 0, 100), signal: bdryChg > 3 ? 'Elevated' : 'Normal' },
    { name: 'Energy Costs', proxy: 'CL=F', change: r2(oilChg), score: clamp(Math.round(50 + oilChg * 4), 0, 100), signal: oilChg > 3 ? 'Rising' : 'Stable' },
    { name: 'Transport Sector', proxy: 'IYT', change: r2(iytChg), score: clamp(Math.round(50 - iytChg * 4), 0, 100), signal: iytChg < -1 ? 'Stressed' : 'Normal' },
    { name: 'Industrial Metals', proxy: 'COPX', change: r2(qMap.get('COPX')?.regularMarketChangePercent || 0), score: clamp(Math.round(50 + (qMap.get('COPX')?.regularMarketChangePercent || 0) * 3), 0, 100), signal: 'Monitor' },
  ];

  const logistics = ['FDX', 'UPS', 'JBHT', 'XPO'].map(sym => {
    const q = qMap.get(sym);
    return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), pe: r1(q?.trailingPE || 0) };
  });

  const compositeStress = Math.round(components.reduce((s, c) => s + c.score, 0) / components.length);
  const stressLevel = compositeStress >= 65 ? 'Elevated' : compositeStress >= 45 ? 'Moderate' : 'Low';

  return { compositeStress, stressLevel, components, logistics, generatedAt: new Date().toISOString() };
}

router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[SupplyChainStress] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
