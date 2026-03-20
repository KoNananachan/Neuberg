import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

const INDICES = [
  { id: 'SX5E', name: 'Euro Stoxx 50', baseDivPts: 145, region: 'Europe' },
  { id: 'SPX', name: 'S&P 500', baseDivPts: 72, region: 'US' },
  { id: 'UKX', name: 'FTSE 100', baseDivPts: 280, region: 'UK' },
  { id: 'NKY', name: 'Nikkei 225', baseDivPts: 580, region: 'Japan' },
  { id: 'DAX', name: 'DAX 40', baseDivPts: 540, region: 'Europe' },
  { id: 'HSI', name: 'Hang Seng', baseDivPts: 950, region: 'Asia' },
  { id: 'ASX', name: 'ASX 200', baseDivPts: 320, region: 'Asia' },
];

const SINGLE_STOCKS = [
  { ticker: 'AAPL', name: 'Apple', baseDiv: 1.00, sector: 'Tech' },
  { ticker: 'MSFT', name: 'Microsoft', baseDiv: 3.00, sector: 'Tech' },
  { ticker: 'JPM', name: 'JPMorgan', baseDiv: 4.60, sector: 'Finance' },
  { ticker: 'XOM', name: 'Exxon Mobil', baseDiv: 3.80, sector: 'Energy' },
  { ticker: 'JNJ', name: 'Johnson & Johnson', baseDiv: 4.76, sector: 'Healthcare' },
  { ticker: 'PG', name: 'Procter & Gamble', baseDiv: 3.92, sector: 'Consumer' },
  { ticker: 'KO', name: 'Coca-Cola', baseDiv: 1.94, sector: 'Consumer' },
  { ticker: 'SHEL', name: 'Shell', baseDiv: 2.60, sector: 'Energy' },
  { ticker: 'NESN', name: 'Nestle', baseDiv: 3.00, sector: 'Consumer' },
  { ticker: 'TTE', name: 'TotalEnergies', baseDiv: 3.40, sector: 'Energy' },
  { ticker: 'HSBA', name: 'HSBC', baseDiv: 0.52, sector: 'Finance' },
  { ticker: 'BHP', name: 'BHP Group', baseDiv: 3.50, sector: 'Mining' },
];

const YEARS = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033];


let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-dividend-swaps'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // Index dividend futures/swaps
  const indexSwaps = INDICES.map(idx => {
    const terms = YEARS.map((year, i) => {
      const growthFactor = 1 + (i * 0.01) + (rng() - 0.5) * 0.03;
      const impliedDiv = Math.round(jitter(idx.baseDivPts * growthFactor, 0.04) * 100) / 100;
      const prevClose = Math.round(jitter(impliedDiv, 0.005) * 100) / 100;
      const change1d = Math.round((impliedDiv - prevClose) * 100) / 100;
      const bid = Math.round((impliedDiv - 0.2 - rng() * 0.5) * 100) / 100;
      const ask = Math.round((impliedDiv + 0.2 + rng() * 0.5) * 100) / 100;
      const openInterest = Math.round(500 + rng() * 5000);
      const realizedYTD = i === 0 ? Math.round(jitter(idx.baseDivPts * 0.7, 0.05) * 100) / 100 : null;
      return { year, impliedDiv, prevClose, change1d, bid, ask, openInterest, realizedYTD };
    });

    const spotDiv = Math.round(jitter(idx.baseDivPts, 0.02) * 100) / 100;
    const fwdDiv2y = terms[1]?.impliedDiv ?? 0;
    const divGrowth = Math.round(((fwdDiv2y / spotDiv - 1) * 100) * 10) / 10;

    return { id: idx.id, name: idx.name, region: idx.region, spotDiv, divGrowth, terms };
  });

  // Single stock dividend swaps
  const stockSwaps = SINGLE_STOCKS.map(stk => {
    const terms = YEARS.slice(0, 5).map((year, i) => {
      const growthFactor = 1 + (i * 0.025) + (rng() - 0.5) * 0.04;
      const impliedDiv = Math.round(jitter(stk.baseDiv * growthFactor, 0.06) * 100) / 100;
      const change1d = Math.round((rng() - 0.5) * stk.baseDiv * 0.03 * 100) / 100;
      const impliedGrowth = Math.round((growthFactor - 1) * 100 * 10) / 10;
      return { year, impliedDiv, change1d, impliedGrowth };
    });

    const currentDiv = Math.round(jitter(stk.baseDiv, 0.02) * 100) / 100;
    const divYield = Math.round(jitter(2.5, 0.3) * 100) / 100;

    return { ticker: stk.ticker, name: stk.name, sector: stk.sector, currentDiv, divYield, terms };
  });

  // Dividend seasonality (quarterly breakdown for major indices)
  const seasonality = INDICES.slice(0, 4).map(idx => ({
    id: idx.id,
    q1: Math.round(jitter(idx.baseDivPts * 0.15, 0.08) * 100) / 100,
    q2: Math.round(jitter(idx.baseDivPts * 0.35, 0.06) * 100) / 100,
    q3: Math.round(jitter(idx.baseDivPts * 0.30, 0.07) * 100) / 100,
    q4: Math.round(jitter(idx.baseDivPts * 0.20, 0.08) * 100) / 100,
  }));

  // Sector implied growth
  const sectorGrowth = [...new Set(SINGLE_STOCKS.map(s => s.sector))].map(sector => {
    const ss = stockSwaps.filter(s => s.sector === sector);
    const avgGrowth1y = Math.round(ss.reduce((a, s) => a + (s.terms[0]?.impliedGrowth ?? 0), 0) / ss.length * 10) / 10;
    const avgGrowth3y = Math.round(ss.reduce((a, s) => a + (s.terms[2]?.impliedGrowth ?? 0), 0) / ss.length * 10) / 10;
    return { sector, count: ss.length, avgGrowth1y, avgGrowth3y };
  });

  const summary = {
    years: YEARS,
    totalIndices: INDICES.length,
    totalStocks: SINGLE_STOCKS.length,
  };

  return { indexSwaps, stockSwaps, seasonality, sectorGrowth, summary, generatedAt: new Date().toISOString() };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[DividendSwaps] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate dividend swap data' });
  }
});

export default router;
