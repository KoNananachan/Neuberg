import { Router } from 'express';

const router = Router();

// ── Types ──

interface CorporateCdsEntry {
  entity: string;
  ticker: string;
  sector: string;
  rating: string;
  cds5y: number;
  change1d: number;
  change1w: number;
  change1m: number;
  change3m: number;
  high52w: number;
  low52w: number;
  percentile: number;
  recovery: number;
  impliedPd: number;
  zSpread: number;
  cdsBondBasis: number;
  history: number[];
  signal: string | null;
}

interface CdsSectorSummary {
  sector: string;
  avgSpread: number;
  change1d: number;
  widest: { entity: string; spread: number };
  tightest: { entity: string; spread: number };
}

interface CorporateCdsResponse {
  entries: CorporateCdsEntry[];
  sectorSummary: CdsSectorSummary[];
  igIndex: number;
  igIndexChange: number;
  hyIndex: number;
  hyIndexChange: number;
  timestamp: string;
}

// ── Seed Data ──

interface CorporateSeed {
  entity: string;
  ticker: string;
  sector: string;
  rating: string;
  cdsBase: number;
  recovery: number;
}

const CORPORATE_SEEDS: CorporateSeed[] = [
  // Banks
  { entity: 'JPMorgan Chase', ticker: 'JPM', sector: 'Banks', rating: 'A+', cdsBase: 52, recovery: 0.40 },
  { entity: 'Goldman Sachs', ticker: 'GS', sector: 'Banks', rating: 'A+', cdsBase: 62, recovery: 0.40 },
  { entity: 'Bank of America', ticker: 'BAC', sector: 'Banks', rating: 'A', cdsBase: 58, recovery: 0.40 },
  { entity: 'Citigroup', ticker: 'C', sector: 'Banks', rating: 'A', cdsBase: 65, recovery: 0.40 },
  { entity: 'Wells Fargo', ticker: 'WFC', sector: 'Banks', rating: 'A+', cdsBase: 55, recovery: 0.40 },
  { entity: 'Morgan Stanley', ticker: 'MS', sector: 'Banks', rating: 'A', cdsBase: 68, recovery: 0.40 },

  // Tech
  { entity: 'Apple', ticker: 'AAPL', sector: 'Tech', rating: 'AA+', cdsBase: 32, recovery: 0.40 },
  { entity: 'Microsoft', ticker: 'MSFT', sector: 'Tech', rating: 'AAA', cdsBase: 28, recovery: 0.40 },
  { entity: 'Amazon', ticker: 'AMZN', sector: 'Tech', rating: 'AA', cdsBase: 35, recovery: 0.40 },
  { entity: 'Meta', ticker: 'META', sector: 'Tech', rating: 'AA-', cdsBase: 42, recovery: 0.40 },
  { entity: 'Tesla', ticker: 'TSLA', sector: 'Tech', rating: 'BBB', cdsBase: 135, recovery: 0.40 },
  { entity: 'Alphabet', ticker: 'GOOGL', sector: 'Tech', rating: 'AA+', cdsBase: 30, recovery: 0.40 },

  // Energy
  { entity: 'ExxonMobil', ticker: 'XOM', sector: 'Energy', rating: 'AA-', cdsBase: 45, recovery: 0.40 },
  { entity: 'Chevron', ticker: 'CVX', sector: 'Energy', rating: 'AA', cdsBase: 40, recovery: 0.40 },

  // Telecom
  { entity: 'AT&T', ticker: 'T', sector: 'Telecom', rating: 'BBB', cdsBase: 110, recovery: 0.40 },
  { entity: 'Verizon', ticker: 'VZ', sector: 'Telecom', rating: 'BBB+', cdsBase: 85, recovery: 0.40 },

  // Auto
  { entity: 'Ford', ticker: 'F', sector: 'Auto', rating: 'BB+', cdsBase: 185, recovery: 0.40 },
  { entity: 'General Motors', ticker: 'GM', sector: 'Auto', rating: 'BBB-', cdsBase: 145, recovery: 0.40 },

  // Industrials
  { entity: 'Boeing', ticker: 'BA', sector: 'Industrials', rating: 'BBB-', cdsBase: 175, recovery: 0.40 },
  { entity: 'General Electric', ticker: 'GE', sector: 'Industrials', rating: 'BBB+', cdsBase: 78, recovery: 0.40 },

  // Healthcare
  { entity: 'Pfizer', ticker: 'PFE', sector: 'Healthcare', rating: 'A', cdsBase: 48, recovery: 0.40 },
  { entity: 'Johnson & Johnson', ticker: 'JNJ', sector: 'Healthcare', rating: 'AAA', cdsBase: 25, recovery: 0.40 },

  // Retail
  { entity: 'Walmart', ticker: 'WMT', sector: 'Retail', rating: 'AA', cdsBase: 30, recovery: 0.40 },
  { entity: 'Target', ticker: 'TGT', sector: 'Retail', rating: 'A', cdsBase: 55, recovery: 0.40 },
];

// ── Helpers ──

function jitter(base: number, pct: number): number {
  return base * (1 + (Math.random() - 0.5) * 2 * pct);
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function generateHistory(base: number): number[] {
  const points: number[] = [];
  let current = base * (0.82 + Math.random() * 0.36);
  for (let i = 0; i < 20; i++) {
    current += (Math.random() - 0.48) * base * 0.05;
    current = Math.max(5, current);
    points.push(roundTo(current, 1));
  }
  return points;
}

function computePercentile(current: number, high: number, low: number): number {
  const range = high - low;
  if (range <= 0) return 50;
  return Math.round(((current - low) / range) * 100);
}

function computeImpliedPd(cds5y: number, recovery: number): number {
  // Simplified implied PD: CDS spread / (1 - recovery) / 10000 * 100 for annual %
  const annualPd = (cds5y / 10000) / (1 - recovery) * 100;
  return roundTo(annualPd, 2);
}

function determineSignal(
  cds5y: number,
  change1d: number,
  change1w: number,
  percentile: number,
  cdsBondBasis: number,
  rating: string,
): string | null {
  // Widening: significant daily increase
  if (change1d > cds5y * 0.05 && change1w > 0) return 'WIDENING';
  // Tightening: significant daily decrease
  if (change1d < -cds5y * 0.05 && change1w < 0) return 'TIGHTENING';
  // Crossover risk: HY-rated and spread very high relative to range
  const igRatings = new Set(['AAA', 'AA+', 'AA', 'AA-', 'A+', 'A', 'A-', 'BBB+', 'BBB', 'BBB-']);
  if (igRatings.has(rating) && percentile > 85) return 'CROSSOVER_RISK';
  // Negative basis: CDS significantly below bond spread
  if (cdsBondBasis < -15) return 'NEGATIVE_BASIS';
  return null;
}

function buildEntry(seed: CorporateSeed): CorporateCdsEntry {
  const cds5y = roundTo(jitter(seed.cdsBase, 0.08), 1);
  const change1d = roundTo((Math.random() - 0.46) * seed.cdsBase * 0.04, 1);
  const change1w = roundTo((Math.random() - 0.44) * seed.cdsBase * 0.08, 1);
  const change1m = roundTo((Math.random() - 0.42) * seed.cdsBase * 0.14, 1);
  const change3m = roundTo((Math.random() - 0.40) * seed.cdsBase * 0.22, 1);

  const history = generateHistory(seed.cdsBase);
  const allValues = [...history, cds5y];
  const high52w = roundTo(Math.max(...allValues) * (1 + Math.random() * 0.12), 1);
  const low52w = roundTo(Math.min(...allValues) * (0.88 + Math.random() * 0.08), 1);
  const percentile = computePercentile(cds5y, high52w, low52w);
  const impliedPd = computeImpliedPd(cds5y, seed.recovery);

  // Z-spread: typically close to CDS spread, with some basis
  const zSpread = roundTo(cds5y + (Math.random() - 0.45) * 20, 1);
  const cdsBondBasis = roundTo(cds5y - zSpread, 1);

  const signal = determineSignal(cds5y, change1d, change1w, percentile, cdsBondBasis, seed.rating);

  return {
    entity: seed.entity,
    ticker: seed.ticker,
    sector: seed.sector,
    rating: seed.rating,
    cds5y,
    change1d,
    change1w,
    change1m,
    change3m,
    high52w,
    low52w,
    percentile,
    recovery: seed.recovery,
    impliedPd,
    zSpread,
    cdsBondBasis,
    history,
    signal,
  };
}

function buildSectorSummary(entries: CorporateCdsEntry[]): CdsSectorSummary[] {
  const sectorMap = new Map<string, CorporateCdsEntry[]>();
  for (const e of entries) {
    if (!sectorMap.has(e.sector)) sectorMap.set(e.sector, []);
    sectorMap.get(e.sector)!.push(e);
  }

  const summaries: CdsSectorSummary[] = [];
  for (const [sector, sectorEntries] of sectorMap) {
    const avgSpread = roundTo(
      sectorEntries.reduce((sum, e) => sum + e.cds5y, 0) / sectorEntries.length,
      1,
    );
    const avgChange1d = roundTo(
      sectorEntries.reduce((sum, e) => sum + e.change1d, 0) / sectorEntries.length,
      1,
    );

    let widest = sectorEntries[0];
    let tightest = sectorEntries[0];
    for (const e of sectorEntries) {
      if (e.cds5y > widest.cds5y) widest = e;
      if (e.cds5y < tightest.cds5y) tightest = e;
    }

    summaries.push({
      sector,
      avgSpread,
      change1d: avgChange1d,
      widest: { entity: widest.entity, spread: widest.cds5y },
      tightest: { entity: tightest.entity, spread: tightest.cds5y },
    });
  }

  return summaries.sort((a, b) => b.avgSpread - a.avgSpread);
}

// ── Cache ──

let cache: { data: CorporateCdsResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 5 * 60_000; // 5 minutes

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const entries = CORPORATE_SEEDS.map(buildEntry);
    const sectorSummary = buildSectorSummary(entries);

    // CDX IG index: weighted average of IG-rated CDS
    const igEntries = entries.filter((e) => {
      const igRatings = ['AAA', 'AA+', 'AA', 'AA-', 'A+', 'A', 'A-', 'BBB+', 'BBB', 'BBB-'];
      return igRatings.includes(e.rating);
    });
    const igIndex = igEntries.length > 0
      ? roundTo(igEntries.reduce((sum, e) => sum + e.cds5y, 0) / igEntries.length, 1)
      : 65;
    const igIndexChange = roundTo((Math.random() - 0.45) * 3, 1);

    // CDX HY index: weighted average of HY-rated CDS (or use all if few HY)
    const hyEntries = entries.filter((e) => {
      const hyRatings = ['BB+', 'BB', 'BB-', 'B+', 'B', 'B-', 'CCC'];
      return hyRatings.includes(e.rating);
    });
    const hyIndex = hyEntries.length > 0
      ? roundTo(hyEntries.reduce((sum, e) => sum + e.cds5y, 0) / hyEntries.length, 1)
      : 350;
    const hyIndexChange = roundTo((Math.random() - 0.45) * 8, 1);

    const result: CorporateCdsResponse = {
      entries,
      sectorSummary,
      igIndex,
      igIndexChange,
      hyIndex,
      hyIndexChange,
      timestamp: new Date().toISOString(),
    };

    cache = { data: result, expiresAt: now + CACHE_TTL };
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[CorporateCDS] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to fetch corporate CDS data' });
  }
});

export default router;
