import { Router } from 'express';

const router = Router();

// ── Types ──

interface RevisionEntry {
  symbol: string;
  name: string;
  sector: string;
  currentQEps: number;
  currentQRevision1m: number;
  currentQRevision3m: number;
  currentQUpRevisions: number;
  currentQDownRevisions: number;
  currentQRevisionRatio: number;
  nextQEps: number;
  nextQRevision1m: number;
  nextQRevision3m: number;
  fyEps: number;
  fyRevision1m: number;
  fyRevision3m: number;
  fyUpRevisions: number;
  fyDownRevisions: number;
  fyRevenue: number;
  fyRevenueRevision1m: number;
  revisionMomentum: number;
  earningsYield: number;
  peRatio: number;
  revisionHistory: number[];
  signal: string | null;
}

interface SectorRevision {
  sector: string;
  avgRevision1m: number;
  avgRevision3m: number;
  upgrades: number;
  downgrades: number;
  ratio: number;
  momentum: number;
}

interface EarningsRevisionsResponse {
  entries: RevisionEntry[];
  sectorRevisions: SectorRevision[];
  marketRevision: number;
  breadth: number;
  timestamp: string;
}

// ── Stock Universe ──

interface StockDef {
  symbol: string;
  name: string;
  sector: string;
  basePrice: number;
  baseFyEps: number;
  baseFyRevenue: number;
  bias: number; // -1 to +1: negative=downgrade bias, positive=upgrade bias
}

const STOCK_UNIVERSE: StockDef[] = [
  { symbol: 'AAPL', name: 'Apple Inc', sector: 'Technology', basePrice: 195, baseFyEps: 6.58, baseFyRevenue: 394, bias: 0.3 },
  { symbol: 'MSFT', name: 'Microsoft Corp', sector: 'Technology', basePrice: 420, baseFyEps: 12.10, baseFyRevenue: 245, bias: 0.5 },
  { symbol: 'GOOGL', name: 'Alphabet Inc', sector: 'Comm Services', basePrice: 155, baseFyEps: 6.52, baseFyRevenue: 350, bias: 0.35 },
  { symbol: 'AMZN', name: 'Amazon.com Inc', sector: 'Consumer', basePrice: 185, baseFyEps: 4.72, baseFyRevenue: 638, bias: 0.45 },
  { symbol: 'NVDA', name: 'NVIDIA Corp', sector: 'Technology', basePrice: 880, baseFyEps: 25.08, baseFyRevenue: 113, bias: 0.85 },
  { symbol: 'META', name: 'Meta Platforms', sector: 'Comm Services', basePrice: 510, baseFyEps: 21.20, baseFyRevenue: 163, bias: 0.4 },
  { symbol: 'TSLA', name: 'Tesla Inc', sector: 'Consumer', basePrice: 175, baseFyEps: 2.28, baseFyRevenue: 112, bias: -0.2 },
  { symbol: 'JPM', name: 'JPMorgan Chase', sector: 'Financials', basePrice: 198, baseFyEps: 16.23, baseFyRevenue: 178, bias: 0.15 },
  { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', basePrice: 156, baseFyEps: 10.05, baseFyRevenue: 88, bias: -0.05 },
  { symbol: 'UNH', name: 'UnitedHealth Group', sector: 'Healthcare', basePrice: 525, baseFyEps: 27.60, baseFyRevenue: 390, bias: 0.1 },
  { symbol: 'V', name: 'Visa Inc', sector: 'Financials', basePrice: 282, baseFyEps: 9.92, baseFyRevenue: 36, bias: 0.2 },
  { symbol: 'PG', name: 'Procter & Gamble', sector: 'Consumer', basePrice: 162, baseFyEps: 6.37, baseFyRevenue: 85, bias: 0.0 },
  { symbol: 'HD', name: 'Home Depot Inc', sector: 'Consumer', basePrice: 365, baseFyEps: 15.15, baseFyRevenue: 155, bias: -0.1 },
  { symbol: 'XOM', name: 'Exxon Mobil Corp', sector: 'Energy', basePrice: 104, baseFyEps: 9.12, baseFyRevenue: 344, bias: -0.25 },
  { symbol: 'LLY', name: 'Eli Lilly & Co', sector: 'Healthcare', basePrice: 790, baseFyEps: 12.65, baseFyRevenue: 46, bias: 0.6 },
  { symbol: 'AVGO', name: 'Broadcom Inc', sector: 'Technology', basePrice: 1350, baseFyEps: 47.52, baseFyRevenue: 51, bias: 0.55 },
  { symbol: 'MA', name: 'Mastercard Inc', sector: 'Financials', basePrice: 468, baseFyEps: 14.38, baseFyRevenue: 27, bias: 0.2 },
  { symbol: 'COST', name: 'Costco Wholesale', sector: 'Consumer', basePrice: 730, baseFyEps: 16.12, baseFyRevenue: 254, bias: 0.15 },
  { symbol: 'ABBV', name: 'AbbVie Inc', sector: 'Healthcare', basePrice: 172, baseFyEps: 11.28, baseFyRevenue: 56, bias: 0.05 },
  { symbol: 'MRK', name: 'Merck & Co', sector: 'Healthcare', basePrice: 128, baseFyEps: 7.74, baseFyRevenue: 64, bias: -0.1 },
  { symbol: 'PEP', name: 'PepsiCo Inc', sector: 'Consumer', basePrice: 172, baseFyEps: 8.15, baseFyRevenue: 93, bias: -0.05 },
  { symbol: 'KO', name: 'Coca-Cola Co', sector: 'Consumer', basePrice: 60, baseFyEps: 2.82, baseFyRevenue: 46, bias: 0.0 },
  { symbol: 'WMT', name: 'Walmart Inc', sector: 'Consumer', basePrice: 168, baseFyEps: 6.62, baseFyRevenue: 648, bias: 0.1 },
  { symbol: 'NFLX', name: 'Netflix Inc', sector: 'Comm Services', basePrice: 620, baseFyEps: 19.08, baseFyRevenue: 39, bias: 0.5 },
  { symbol: 'CRM', name: 'Salesforce Inc', sector: 'Technology', basePrice: 295, baseFyEps: 9.86, baseFyRevenue: 38, bias: 0.3 },
];

// ── Cache ──

let cache: { data: EarningsRevisionsResponse; expiresAt: number } | null = null;
const CACHE_TTL = 10 * 60_000; // 10 minutes

// ── Deterministic pseudo-random ──

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function generateData(): EarningsRevisionsResponse {
  // Seed changes every 10 minutes to simulate gradual data evolution
  const timeBucket = Math.floor(Date.now() / (10 * 60_000));
  const rand = seededRandom(timeBucket);

  const entries: RevisionEntry[] = STOCK_UNIVERSE.map((stock) => {
    const r = rand;

    // Bias-adjusted revisions: positive bias = more likely positive revisions
    const biasFactor = stock.bias;
    const noiseCQ1m = (r() - 0.5 + biasFactor * 0.3) * 8;
    const noiseCQ3m = (r() - 0.5 + biasFactor * 0.3) * 14;
    const noiseNQ1m = (r() - 0.5 + biasFactor * 0.25) * 6;
    const noiseNQ3m = (r() - 0.5 + biasFactor * 0.25) * 10;
    const noiseFY1m = (r() - 0.5 + biasFactor * 0.35) * 5;
    const noiseFY3m = (r() - 0.5 + biasFactor * 0.35) * 10;

    const currentQRevision1m = Math.round(noiseCQ1m * 100) / 100;
    const currentQRevision3m = Math.round(noiseCQ3m * 100) / 100;
    const nextQRevision1m = Math.round(noiseNQ1m * 100) / 100;
    const nextQRevision3m = Math.round(noiseNQ3m * 100) / 100;
    const fyRevision1m = Math.round(noiseFY1m * 100) / 100;
    const fyRevision3m = Math.round(noiseFY3m * 100) / 100;

    // Up/down revisions for current quarter
    const totalAnalysts = Math.floor(r() * 15) + 15; // 15-30 analysts
    const upRatio = Math.max(0, Math.min(1, 0.5 + biasFactor * 0.3 + (r() - 0.5) * 0.4));
    const currentQUpRevisions = Math.round(totalAnalysts * upRatio);
    const currentQDownRevisions = totalAnalysts - currentQUpRevisions;
    const currentQRevisionRatio = totalAnalysts > 0
      ? Math.round((currentQUpRevisions / totalAnalysts) * 100) / 100
      : 0.5;

    // Full-year up/down
    const fyTotalAnalysts = Math.floor(r() * 20) + 20;
    const fyUpRatio = Math.max(0, Math.min(1, 0.5 + biasFactor * 0.35 + (r() - 0.5) * 0.35));
    const fyUpRevisions = Math.round(fyTotalAnalysts * fyUpRatio);
    const fyDownRevisions = fyTotalAnalysts - fyUpRevisions;

    // EPS values (based on base + revision adjustments)
    const currentQEps = Math.round((stock.baseFyEps / 4) * (1 + currentQRevision1m / 100) * 100) / 100;
    const nextQEps = Math.round((stock.baseFyEps / 4) * (1 + nextQRevision1m / 100) * 100) / 100;
    const fyEps = Math.round(stock.baseFyEps * (1 + fyRevision1m / 100) * 100) / 100;

    // Revenue
    const fyRevenue = Math.round(stock.baseFyRevenue * (1 + (r() - 0.5 + biasFactor * 0.1) * 0.06) * 10) / 10;
    const fyRevenueRevision1m = Math.round((r() - 0.5 + biasFactor * 0.2) * 4 * 100) / 100;

    // P/E and earnings yield
    const peRatio = Math.round((stock.basePrice / fyEps) * 10) / 10;
    const earningsYield = Math.round((fyEps / stock.basePrice) * 10000) / 100;

    // Revision momentum: composite of multiple factors
    const momentum = Math.round(
      Math.max(-100, Math.min(100,
        (fyRevision1m * 5) +
        (currentQRevision1m * 3) +
        ((currentQRevisionRatio - 0.5) * 80) +
        (biasFactor * 20)
      ))
    );

    // Revision history (12 monthly points)
    const revisionHistory: number[] = [];
    let cumRev = 0;
    for (let m = 0; m < 12; m++) {
      const monthlyDelta = (r() - 0.5 + biasFactor * 0.15) * 3;
      cumRev += monthlyDelta;
      revisionHistory.push(Math.round(cumRev * 100) / 100);
    }

    // Signal
    let signal: string | null = null;
    if (momentum >= 60) signal = 'STRONG_UPGRADE';
    else if (momentum >= 25) signal = 'UPGRADE';
    else if (momentum >= -25) signal = 'STABLE';
    else if (momentum >= -60) signal = 'DOWNGRADE';
    else signal = 'STRONG_DOWNGRADE';

    return {
      symbol: stock.symbol,
      name: stock.name,
      sector: stock.sector,
      currentQEps,
      currentQRevision1m,
      currentQRevision3m,
      currentQUpRevisions,
      currentQDownRevisions,
      currentQRevisionRatio,
      nextQEps,
      nextQRevision1m,
      nextQRevision3m,
      fyEps,
      fyRevision1m,
      fyRevision3m,
      fyUpRevisions,
      fyDownRevisions,
      fyRevenue,
      fyRevenueRevision1m,
      revisionMomentum: momentum,
      earningsYield,
      peRatio,
      revisionHistory,
      signal,
    };
  });

  // Sector aggregation
  const sectorMap = new Map<string, RevisionEntry[]>();
  for (const entry of entries) {
    const arr = sectorMap.get(entry.sector) || [];
    arr.push(entry);
    sectorMap.set(entry.sector, arr);
  }

  const sectorRevisions: SectorRevision[] = [];
  for (const [sector, stocks] of sectorMap) {
    const n = stocks.length;
    const avgRevision1m = Math.round((stocks.reduce((s, e) => s + e.fyRevision1m, 0) / n) * 100) / 100;
    const avgRevision3m = Math.round((stocks.reduce((s, e) => s + e.fyRevision3m, 0) / n) * 100) / 100;
    const upgrades = stocks.filter(e => e.fyRevision1m > 0).length;
    const downgrades = stocks.filter(e => e.fyRevision1m < 0).length;
    const total = upgrades + downgrades;
    const ratio = total > 0 ? Math.round((upgrades / total) * 100) / 100 : 0.5;
    const momentum = Math.round(stocks.reduce((s, e) => s + e.revisionMomentum, 0) / n);

    sectorRevisions.push({ sector, avgRevision1m, avgRevision3m, upgrades, downgrades, ratio, momentum });
  }

  // Sort sectors by momentum descending
  sectorRevisions.sort((a, b) => b.momentum - a.momentum);

  // Market-level aggregates
  const totalStocks = entries.length;
  const marketRevision = Math.round((entries.reduce((s, e) => s + e.fyRevision1m, 0) / totalStocks) * 100) / 100;
  const breadth = Math.round((entries.filter(e => e.fyRevision1m > 0).length / totalStocks) * 100);

  return {
    entries,
    sectorRevisions,
    marketRevision,
    breadth,
    timestamp: new Date().toISOString(),
  };
}

// ── Route ──

// GET /api/earnings-revisions
router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generateData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[EarningsRevisions] Error generating data:', message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate earnings revisions data' });
  }
});

export default router;
