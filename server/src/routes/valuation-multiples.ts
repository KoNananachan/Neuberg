import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data';
const router = Router();


// ── Stock definitions ──
const STOCKS = [
  { ticker: 'AAPL', name: 'Apple', sector: 'Technology', mcap: 3200, basePE: 32, baseEV: 26 },
  { ticker: 'MSFT', name: 'Microsoft', sector: 'Technology', mcap: 3100, basePE: 35, baseEV: 28 },
  { ticker: 'GOOGL', name: 'Alphabet', sector: 'Technology', mcap: 2100, basePE: 25, baseEV: 18 },
  { ticker: 'AMZN', name: 'Amazon', sector: 'Technology', mcap: 1900, basePE: 55, baseEV: 22 },
  { ticker: 'NVDA', name: 'NVIDIA', sector: 'Technology', mcap: 2800, basePE: 60, baseEV: 45 },
  { ticker: 'META', name: 'Meta Platforms', sector: 'Technology', mcap: 1400, basePE: 28, baseEV: 16 },
  { ticker: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', mcap: 380, basePE: 16, baseEV: 14 },
  { ticker: 'UNH', name: 'UnitedHealth', sector: 'Healthcare', mcap: 480, basePE: 22, baseEV: 15 },
  { ticker: 'PFE', name: 'Pfizer', sector: 'Healthcare', mcap: 160, basePE: 12, baseEV: 9 },
  { ticker: 'ABBV', name: 'AbbVie', sector: 'Healthcare', mcap: 310, basePE: 18, baseEV: 14 },
  { ticker: 'JPM', name: 'JPMorgan', sector: 'Financials', mcap: 600, basePE: 12, baseEV: 10 },
  { ticker: 'BAC', name: 'Bank of America', sector: 'Financials', mcap: 320, basePE: 11, baseEV: 9 },
  { ticker: 'GS', name: 'Goldman Sachs', sector: 'Financials', mcap: 160, basePE: 14, baseEV: 11 },
  { ticker: 'BRK.B', name: 'Berkshire Hathaway', sector: 'Financials', mcap: 900, basePE: 9, baseEV: 8 },
  { ticker: 'PG', name: 'Procter & Gamble', sector: 'Consumer Staples', mcap: 380, basePE: 26, baseEV: 20 },
  { ticker: 'KO', name: 'Coca-Cola', sector: 'Consumer Staples', mcap: 260, basePE: 24, baseEV: 22 },
  { ticker: 'MCD', name: "McDonald's", sector: 'Consumer Staples', mcap: 210, basePE: 25, baseEV: 21 },
  { ticker: 'WMT', name: 'Walmart', sector: 'Consumer Staples', mcap: 500, basePE: 28, baseEV: 15 },
  { ticker: 'XOM', name: 'Exxon Mobil', sector: 'Energy', mcap: 460, basePE: 13, baseEV: 8 },
  { ticker: 'CVX', name: 'Chevron', sector: 'Energy', mcap: 290, basePE: 12, baseEV: 7 },
  { ticker: 'CAT', name: 'Caterpillar', sector: 'Industrials', mcap: 180, basePE: 17, baseEV: 13 },
  { ticker: 'HON', name: 'Honeywell', sector: 'Industrials', mcap: 140, basePE: 20, baseEV: 15 },
  { ticker: 'UPS', name: 'United Parcel Service', sector: 'Industrials', mcap: 110, basePE: 16, baseEV: 11 },
  { ticker: 'AMT', name: 'American Tower', sector: 'Real Estate', mcap: 95, basePE: 40, baseEV: 25 },
  { ticker: 'PLD', name: 'Prologis', sector: 'Real Estate', mcap: 110, basePE: 38, baseEV: 28 },
];
let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-valuation'));

  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  const stocks = STOCKS.map(s => {
    const peTrailing = Math.round(jitter(s.basePE, 0.12) * 10) / 10;
    const peForward = Math.round(peTrailing * (0.85 + rng() * 0.15) * 10) / 10;
    const evEbitda = Math.round(jitter(s.baseEV, 0.12) * 10) / 10;
    const pSales = Math.round((1 + rng() * 12) * 10) / 10;
    const pBook = Math.round((1 + rng() * 15) * 10) / 10;
    const pFcf = Math.round((peTrailing * (0.8 + rng() * 0.6)) * 10) / 10;
    const evSales = Math.round((pSales * (0.8 + rng() * 0.4)) * 10) / 10;
    const pegRatio = Math.round((0.5 + rng() * 3) * 100) / 100;

    const pe5YPctile = Math.round(rng() * 100);
    const evEbitda5YPctile = Math.round(rng() * 100);
    const pSales5YPctile = Math.round(rng() * 100);

    const history = Array.from({ length: 8 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (7 - i) * 3);
      return {
        date: d.toISOString().slice(0, 10),
        pe: Math.round(jitter(s.basePE, 0.15) * 10) / 10,
        evEbitda: Math.round(jitter(s.baseEV, 0.15) * 10) / 10,
      };
    });

    return {
      ticker: s.ticker, name: s.name, sector: s.sector,
      marketCap: Math.round(jitter(s.mcap, 0.05) * 10) / 10,
      multiples: { peTrailing, peForward, evEbitda, pSales, pBook, pFcf, evSales, pegRatio },
      percentiles: { pe5YPctile, evEbitda5YPctile, pSales5YPctile },
      sectorAvg: { peAvg: 0, evEbitdaAvg: 0, pSalesAvg: 0, pBookAvg: 0 },
      premium: { vsSector: 0, vs5YAvg: Math.round((rng() - 0.5) * 40 * 10) / 10 },
      history,
    };
  });

  // Compute sector averages
  const sectorMap = new Map<string, typeof stocks>();
  for (const s of stocks) {
    if (!sectorMap.has(s.sector)) sectorMap.set(s.sector, []);
    sectorMap.get(s.sector)!.push(s);
  }

  const sectors = [...sectorMap.entries()].map(([sector, items]) => {
    const avgPE = Math.round(items.reduce((a, b) => a + b.multiples.peTrailing, 0) / items.length * 10) / 10;
    const avgEVEBITDA = Math.round(items.reduce((a, b) => a + b.multiples.evEbitda, 0) / items.length * 10) / 10;
    const avgPS = Math.round(items.reduce((a, b) => a + b.multiples.pSales, 0) / items.length * 10) / 10;
    const avgPB = Math.round(items.reduce((a, b) => a + b.multiples.pBook, 0) / items.length * 10) / 10;
    const medianPE = Math.round([...items].sort((a, b) => a.multiples.peTrailing - b.multiples.peTrailing)[Math.floor(items.length / 2)].multiples.peTrailing * 10) / 10;

    for (const s of items) {
      s.sectorAvg = { peAvg: avgPE, evEbitdaAvg: avgEVEBITDA, pSalesAvg: avgPS, pBookAvg: avgPB };
      s.premium.vsSector = Math.round((s.multiples.peTrailing / avgPE - 1) * 100 * 10) / 10;
    }

    return { sector, avgPE, avgEVEBITDA, avgPS, medianPE, stockCount: items.length };
  });

  return { stocks, sectors, generatedAt: new Date().toISOString() };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[ValuationMultiples] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate valuation data' });
  }
});

export default router;
