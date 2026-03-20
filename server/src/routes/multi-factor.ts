import { Router } from 'express';

const router = Router();

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const FACTORS = [
  { id: 'MKT', name: 'Market Beta', description: 'Broad equity market exposure' },
  { id: 'SMB', name: 'Size (Small-Big)', description: 'Small cap premium' },
  { id: 'HML', name: 'Value (High-Low)', description: 'Value vs growth premium' },
  { id: 'MOM', name: 'Momentum', description: '12-1 month price momentum' },
  { id: 'QMJ', name: 'Quality', description: 'Profitability, growth, safety' },
  { id: 'BAB', name: 'Low Volatility', description: 'Betting against beta' },
  { id: 'STR', name: 'Short-Term Reversal', description: '1-month reversal' },
  { id: 'LIQ', name: 'Liquidity', description: 'Illiquidity premium' },
];

const STOCKS = [
  { ticker: 'AAPL', name: 'Apple', sector: 'Technology' },
  { ticker: 'MSFT', name: 'Microsoft', sector: 'Technology' },
  { ticker: 'GOOGL', name: 'Alphabet', sector: 'Technology' },
  { ticker: 'AMZN', name: 'Amazon', sector: 'Technology' },
  { ticker: 'NVDA', name: 'NVIDIA', sector: 'Technology' },
  { ticker: 'META', name: 'Meta', sector: 'Technology' },
  { ticker: 'TSLA', name: 'Tesla', sector: 'Consumer Disc.' },
  { ticker: 'JPM', name: 'JPMorgan', sector: 'Financials' },
  { ticker: 'JNJ', name: 'J&J', sector: 'Healthcare' },
  { ticker: 'V', name: 'Visa', sector: 'Financials' },
  { ticker: 'PG', name: 'P&G', sector: 'Consumer Staples' },
  { ticker: 'UNH', name: 'UnitedHealth', sector: 'Healthcare' },
  { ticker: 'HD', name: 'Home Depot', sector: 'Consumer Disc.' },
  { ticker: 'MA', name: 'Mastercard', sector: 'Financials' },
  { ticker: 'XOM', name: 'Exxon Mobil', sector: 'Energy' },
  { ticker: 'LLY', name: 'Eli Lilly', sector: 'Healthcare' },
  { ticker: 'AVGO', name: 'Broadcom', sector: 'Technology' },
  { ticker: 'MRK', name: 'Merck', sector: 'Healthcare' },
  { ticker: 'PEP', name: 'PepsiCo', sector: 'Consumer Staples' },
  { ticker: 'COST', name: 'Costco', sector: 'Consumer Staples' },
];

const CACHE_TTL = 12 * 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-multi-factor'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  const factorReturns = FACTORS.map(f => {
    const return1d = Math.round((rng() - 0.48) * 1.5 * 100) / 100;
    const return1w = Math.round((rng() - 0.47) * 3 * 100) / 100;
    const return1m = Math.round((rng() - 0.45) * 6 * 100) / 100;
    const returnYtd = Math.round((rng() - 0.4) * 15 * 100) / 100;
    const sharpe = Math.round((rng() * 3 - 0.5) * 100) / 100;
    const volatility = Math.round((5 + rng() * 20) * 100) / 100;
    const drawdown = Math.round(-(rng() * 15) * 100) / 100;
    const zScore = Math.round((rng() * 4 - 2) * 100) / 100;

    const history = Array.from({ length: 12 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (11 - i));
      return { date: d.toISOString().slice(0, 7), return: Math.round((rng() - 0.45) * 6 * 100) / 100 };
    });

    return { ...f, return1d, return1w, return1m, returnYtd, sharpe, volatility, drawdown, zScore, history };
  });

  const correlationMatrix = FACTORS.map(f1 => ({
    factor: f1.id,
    correlations: FACTORS.map(f2 => ({
      factor: f2.id,
      value: f1.id === f2.id ? 1.0 : Math.round((rng() * 1.4 - 0.7) * 100) / 100,
    })),
  }));

  const stockExposures = STOCKS.map(s => {
    const exposures: Record<string, number> = {};
    FACTORS.forEach(f => {
      if (f.id === 'MKT') exposures[f.id] = Math.round((0.6 + rng() * 0.8) * 100) / 100;
      else exposures[f.id] = Math.round((rng() * 2 - 1) * 100) / 100;
    });

    const specificRisk = Math.round((10 + rng() * 25) * 100) / 100;
    const totalRisk = Math.round(Math.sqrt(specificRisk ** 2 + (exposures['MKT'] * 16) ** 2) * 100) / 100;
    const expectedReturn = Math.round((rng() * 20 - 3) * 100) / 100;
    const alpha = Math.round((rng() * 6 - 2) * 100) / 100;
    const r2 = Math.round((0.3 + rng() * 0.6) * 100) / 100;

    return { ...s, exposures, specificRisk, totalRisk, expectedReturn, alpha, r2 };
  });

  const sectorExposures = [...new Set(STOCKS.map(s => s.sector))].map(sector => {
    const sectorStocks = stockExposures.filter(s => s.sector === sector);
    const avgExposures: Record<string, number> = {};
    FACTORS.forEach(f => {
      avgExposures[f.id] = Math.round(sectorStocks.reduce((a, s) => a + s.exposures[f.id], 0) / sectorStocks.length * 100) / 100;
    });
    return {
      sector,
      count: sectorStocks.length,
      avgExposures,
      avgRisk: Math.round(sectorStocks.reduce((a, s) => a + s.totalRisk, 0) / sectorStocks.length * 100) / 100,
    };
  });

  const riskDecomposition = {
    systematic: Math.round(jitter(65, 0.1) * 10) / 10,
    specific: Math.round(jitter(35, 0.1) * 10) / 10,
    factorContributions: FACTORS.map(f => ({
      factor: f.id,
      contribution: Math.round(jitter(8, 0.4) * 10) / 10,
    })),
  };

  return { factorReturns, correlationMatrix, stockExposures, sectorExposures, riskDecomposition, generatedAt: new Date().toISOString() };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[MultiFactor] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate multi-factor data' });
  }
});

export default router;
