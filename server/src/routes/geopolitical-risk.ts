import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

// Geopolitical risk proxies: defense, oil, gold, VIX, safe havens
const SYMBOLS = [
  '^VIX', 'GC=F', 'CL=F', 'DXY=X', // Risk gauges
  'TLT', // Flight to safety
  'ITA', 'PPA', // Defense ETFs
  'LMT', 'RTX', 'NOC', 'GD', 'BA', // Defense stocks
  'FXI', 'EWZ', 'EWW', 'EWY', // EM country ETFs
  'UNG', // Energy security
];

const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
function clamp(n: number, min: number, max: number): number { return Math.max(min, Math.min(max, n)); }

async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));

  const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  const goldChg = qMap.get('GC=F')?.regularMarketChangePercent || 0;
  const oilChg = qMap.get('CL=F')?.regularMarketChangePercent || 0;
  const tltChg = qMap.get('TLT')?.regularMarketChangePercent || 0;
  const dxyChg = qMap.get('DXY=X')?.regularMarketChangePercent || 0;

  // Composite geopolitical risk score
  const vixScore = clamp(Math.round((vix - 12) * 3), 0, 100);
  const goldScore = clamp(Math.round(50 + goldChg * 10), 0, 100);
  const oilScore = clamp(Math.round(50 + oilChg * 8), 0, 100);
  const safeHavenScore = clamp(Math.round(50 + tltChg * 12 + dxyChg * 8), 0, 100);

  const compositeRisk = Math.round((vixScore * 0.3 + goldScore * 0.25 + oilScore * 0.25 + safeHavenScore * 0.2));
  const riskLevel = compositeRisk >= 70 ? 'Elevated' : compositeRisk >= 45 ? 'Moderate' : 'Low';

  const indicators = [
    { name: 'VIX (Fear Index)', value: r1(vix), score: vixScore, signal: vix > 25 ? 'Risk-Off' : 'Normal' },
    { name: 'Gold (Safe Haven)', value: r2(qMap.get('GC=F')?.regularMarketPrice || 0), changePct: r2(goldChg), score: goldScore, signal: goldChg > 1 ? 'Flight to Safety' : 'Calm' },
    { name: 'Oil (Supply Risk)', value: r2(qMap.get('CL=F')?.regularMarketPrice || 0), changePct: r2(oilChg), score: oilScore, signal: oilChg > 3 ? 'Supply Concern' : 'Stable' },
    { name: 'Treasuries (TLT)', changePct: r2(tltChg), score: safeHavenScore, signal: tltChg > 1 ? 'Flight to Quality' : 'Normal' },
  ];

  const defenseStocks = ['LMT', 'RTX', 'NOC', 'GD', 'BA'].map(sym => {
    const q = qMap.get(sym);
    return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), marketCap: r1((q?.marketCap || 0) / 1e9) };
  });

  const emCountries = [
    { country: 'China', etf: 'FXI' }, { country: 'Brazil', etf: 'EWZ' },
    { country: 'Mexico', etf: 'EWW' }, { country: 'South Korea', etf: 'EWY' },
  ].map(c => {
    const q = qMap.get(c.etf);
    return { country: c.country, etf: c.etf, change: r2(q?.regularMarketChangePercent || 0), signal: (q?.regularMarketChangePercent || 0) < -1 ? 'Stress' : 'Stable' };
  });

  return { compositeRisk, riskLevel, indicators, defenseStocks, emergingMarkets: emCountries, generatedAt: new Date().toISOString() };
}

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = await fetchData(); cache = { data, ts: now }; res.json(data);
  } catch (err) {
    console.error('[GeopoliticalRisk] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});
export default router;
