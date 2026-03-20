import { Router } from 'express';

const router = Router();

// ── Types ──

interface AltmanZComponents {
  workingCapital: number;
  retainedEarnings: number;
  ebit: number;
  marketEquity: number;
  sales: number;
}

interface AltmanZ {
  score: number;
  zone: 'Safe' | 'Grey' | 'Distress';
  components: AltmanZComponents;
}

interface BeneishMComponents {
  dsri: number;
  gmi: number;
  aqi: number;
  sgi: number;
  depi: number;
  sgai: number;
  tata: number;
  lvgi: number;
}

interface BeneishM {
  score: number;
  manipulation: 'Unlikely' | 'Possible' | 'Likely';
  components: BeneishMComponents;
}

interface PiotroskiFComponents {
  roa: boolean;
  cfo: boolean;
  deltaRoa: boolean;
  accrual: boolean;
  deltaLeverage: boolean;
  deltaLiquidity: boolean;
  equityOffer: boolean;
  deltaMargin: boolean;
  deltaTurnover: boolean;
}

interface PiotroskiF {
  score: number;
  grade: 'Strong' | 'Moderate' | 'Weak';
  components: PiotroskiFComponents;
}

interface EarningsQualityStock {
  ticker: string;
  name: string;
  sector: string;
  marketCap: number;
  altmanZ: AltmanZ;
  beneishM: BeneishM;
  piotroskiF: PiotroskiF;
  accrualRatio: number;
  earningsPersistence: number;
  cashFlowToIncome: number;
  revenueQuality: number;
  overallGrade: 'A' | 'B' | 'C' | 'D' | 'F';
}

interface EarningsQualityResponse {
  stocks: EarningsQualityStock[];
  generatedAt: string;
}

// ── Seeded PRNG ──

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

// ── Stock Seed Data ──

interface StockSeed {
  ticker: string;
  name: string;
  sector: string;
  marketCap: number;
  quality: 'high' | 'medium' | 'low';
}

const STOCK_SEEDS: StockSeed[] = [
  // High quality
  { ticker: 'AAPL', name: 'Apple Inc.', sector: 'Technology', marketCap: 3420000, quality: 'high' },
  { ticker: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology', marketCap: 3180000, quality: 'high' },
  { ticker: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology', marketCap: 2120000, quality: 'high' },
  { ticker: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', marketCap: 385000, quality: 'high' },
  { ticker: 'PG', name: 'Procter & Gamble', sector: 'Consumer Staples', marketCap: 392000, quality: 'high' },
  { ticker: 'KO', name: 'Coca-Cola Co.', sector: 'Consumer Staples', marketCap: 268000, quality: 'high' },
  { ticker: 'WMT', name: 'Walmart Inc.', sector: 'Consumer Staples', marketCap: 652000, quality: 'high' },
  { ticker: 'COST', name: 'Costco Wholesale', sector: 'Consumer Staples', marketCap: 402000, quality: 'high' },
  // Medium quality
  { ticker: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer Disc.', marketCap: 2080000, quality: 'medium' },
  { ticker: 'META', name: 'Meta Platforms', sector: 'Technology', marketCap: 1520000, quality: 'medium' },
  { ticker: 'TSLA', name: 'Tesla Inc.', sector: 'Consumer Disc.', marketCap: 820000, quality: 'medium' },
  { ticker: 'NFLX', name: 'Netflix Inc.', sector: 'Communication', marketCap: 310000, quality: 'medium' },
  { ticker: 'AMD', name: 'Advanced Micro Devices', sector: 'Technology', marketCap: 225000, quality: 'medium' },
  { ticker: 'CRM', name: 'Salesforce Inc.', sector: 'Technology', marketCap: 275000, quality: 'medium' },
  { ticker: 'UBER', name: 'Uber Technologies', sector: 'Technology', marketCap: 165000, quality: 'medium' },
  // Lower quality
  { ticker: 'RIVN', name: 'Rivian Automotive', sector: 'Consumer Disc.', marketCap: 14500, quality: 'low' },
  { ticker: 'SNAP', name: 'Snap Inc.', sector: 'Communication', marketCap: 18200, quality: 'low' },
  { ticker: 'PLTR', name: 'Palantir Technologies', sector: 'Technology', marketCap: 62000, quality: 'low' },
  { ticker: 'SOFI', name: 'SoFi Technologies', sector: 'Financials', marketCap: 15800, quality: 'low' },
  { ticker: 'LCID', name: 'Lucid Group', sector: 'Consumer Disc.', marketCap: 7200, quality: 'low' },
];

// ── Helpers ──

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function buildStock(seed: StockSeed, rand: () => number): EarningsQualityStock {
  const jitter = () => (rand() - 0.5) * 2; // -1 to 1

  // ── Altman Z-Score ──
  // High quality: 3.0-5.0, Medium: 1.8-3.5, Low: 0.5-2.2
  let zBase: number;
  if (seed.quality === 'high') zBase = lerp(3.2, 4.8, rand());
  else if (seed.quality === 'medium') zBase = lerp(2.0, 3.4, rand());
  else zBase = lerp(0.5, 2.1, rand());
  const zScore = roundTo(zBase + jitter() * 0.15, 2);

  const zZone: 'Safe' | 'Grey' | 'Distress' =
    zScore >= 2.99 ? 'Safe' : zScore >= 1.81 ? 'Grey' : 'Distress';

  // Components scaled roughly to produce the total score via Altman formula
  const wcRatio = roundTo(zScore * 0.20 + jitter() * 0.04, 3);
  const reRatio = roundTo(zScore * 0.25 + jitter() * 0.03, 3);
  const ebitRatio = roundTo(zScore * 0.18 + jitter() * 0.03, 3);
  const meRatio = roundTo(zScore * 0.22 + jitter() * 0.05, 3);
  const salesRatio = roundTo(zScore * 0.15 + jitter() * 0.04, 3);

  const altmanZ: AltmanZ = {
    score: roundTo(zScore, 2),
    zone: zZone,
    components: {
      workingCapital: wcRatio,
      retainedEarnings: reRatio,
      ebit: ebitRatio,
      marketEquity: meRatio,
      sales: salesRatio,
    },
  };

  // ── Beneish M-Score ──
  // Below -2.22 = unlikely manipulation; above -1.78 = likely; between = possible
  // High quality: -3.0 to -2.0, Medium: -2.5 to -1.5, Low: -2.0 to 0.0
  let mBase: number;
  if (seed.quality === 'high') mBase = lerp(-2.8, -2.0, rand());
  else if (seed.quality === 'medium') mBase = lerp(-2.3, -1.5, rand());
  else mBase = lerp(-1.8, -0.2, rand());
  const mScore = roundTo(mBase + jitter() * 0.12, 2);

  const manipulation: 'Unlikely' | 'Possible' | 'Likely' =
    mScore < -2.22 ? 'Unlikely' : mScore < -1.78 ? 'Possible' : 'Likely';

  // Beneish component indices (each typically 0.8-1.4 for normal, elevated for manipulation)
  const dsri = roundTo(1.0 + rand() * 0.3 + (seed.quality === 'low' ? rand() * 0.4 : 0), 3);
  const gmi = roundTo(1.0 + rand() * 0.2 + (seed.quality === 'low' ? rand() * 0.3 : 0), 3);
  const aqi = roundTo(1.0 + rand() * 0.25 + (seed.quality === 'low' ? rand() * 0.5 : 0), 3);
  const sgi = roundTo(1.0 + rand() * 0.3 + (seed.quality === 'medium' ? rand() * 0.2 : 0), 3);
  const depi = roundTo(1.0 + rand() * 0.15 + (seed.quality === 'low' ? rand() * 0.2 : 0), 3);
  const sgai = roundTo(1.0 - rand() * 0.15 + (seed.quality === 'high' ? rand() * 0.1 : 0), 3);
  const tata = roundTo(-0.05 + rand() * 0.1 + (seed.quality === 'low' ? rand() * 0.08 : 0), 4);
  const lvgi = roundTo(1.0 + rand() * 0.2 + (seed.quality === 'low' ? rand() * 0.3 : 0), 3);

  const beneishM: BeneishM = {
    score: roundTo(mScore, 2),
    manipulation,
    components: { dsri, gmi, aqi, sgi, depi, sgai, tata, lvgi },
  };

  // ── Piotroski F-Score ──
  // High quality: 6-9, Medium: 4-7, Low: 1-5
  let fTarget: number;
  if (seed.quality === 'high') fTarget = Math.floor(lerp(6, 9.99, rand()));
  else if (seed.quality === 'medium') fTarget = Math.floor(lerp(4, 7.99, rand()));
  else fTarget = Math.floor(lerp(1, 5.99, rand()));

  // Distribute boolean signals to reach target score
  const allSignals = [
    'roa', 'cfo', 'deltaRoa', 'accrual', 'deltaLeverage',
    'deltaLiquidity', 'equityOffer', 'deltaMargin', 'deltaTurnover',
  ] as const;

  // Start all false, randomly set fTarget of them to true
  const trueIndices = new Set<number>();
  const shuffled = Array.from({ length: 9 }, (_, i) => i);
  // Fisher-Yates with seeded random
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  for (let i = 0; i < fTarget; i++) {
    trueIndices.add(shuffled[i]);
  }

  const fComponents: PiotroskiFComponents = {
    roa: trueIndices.has(0),
    cfo: trueIndices.has(1),
    deltaRoa: trueIndices.has(2),
    accrual: trueIndices.has(3),
    deltaLeverage: trueIndices.has(4),
    deltaLiquidity: trueIndices.has(5),
    equityOffer: trueIndices.has(6),
    deltaMargin: trueIndices.has(7),
    deltaTurnover: trueIndices.has(8),
  };

  const fGrade: 'Strong' | 'Moderate' | 'Weak' =
    fTarget >= 7 ? 'Strong' : fTarget >= 4 ? 'Moderate' : 'Weak';

  const piotroskiF: PiotroskiF = {
    score: fTarget,
    grade: fGrade,
    components: fComponents,
  };

  // ── Additional Metrics ──
  // Accrual ratio: high quality near 0, low quality more negative or highly positive
  let accrualBase: number;
  if (seed.quality === 'high') accrualBase = lerp(-0.05, 0.05, rand());
  else if (seed.quality === 'medium') accrualBase = lerp(-0.08, 0.12, rand());
  else accrualBase = lerp(-0.15, 0.25, rand());
  const accrualRatio = roundTo(accrualBase, 3);

  // Earnings persistence: high quality 0.7-0.95, low quality 0.1-0.5
  let persistenceBase: number;
  if (seed.quality === 'high') persistenceBase = lerp(0.72, 0.95, rand());
  else if (seed.quality === 'medium') persistenceBase = lerp(0.45, 0.75, rand());
  else persistenceBase = lerp(0.10, 0.50, rand());
  const earningsPersistence = roundTo(persistenceBase, 3);

  // Cash flow to income ratio: high quality 1.0-1.5, low quality 0.2-0.8
  let cfiBase: number;
  if (seed.quality === 'high') cfiBase = lerp(1.0, 1.45, rand());
  else if (seed.quality === 'medium') cfiBase = lerp(0.70, 1.15, rand());
  else cfiBase = lerp(0.15, 0.75, rand());
  const cashFlowToIncome = roundTo(cfiBase, 3);

  // Revenue quality: high quality 0.8-1.0, low quality 0.3-0.6
  let rqBase: number;
  if (seed.quality === 'high') rqBase = lerp(0.80, 0.98, rand());
  else if (seed.quality === 'medium') rqBase = lerp(0.55, 0.80, rand());
  else rqBase = lerp(0.25, 0.60, rand());
  const revenueQuality = roundTo(rqBase, 3);

  // ── Overall Grade ──
  // Composite score from all metrics
  const zNorm = Math.min(zScore / 5.0, 1.0);
  const mNorm = Math.min(Math.max((-mScore - 0.5) / 2.5, 0), 1.0);
  const fNorm = fTarget / 9.0;
  const composite = zNorm * 0.25 + mNorm * 0.20 + fNorm * 0.20 +
    earningsPersistence * 0.15 + Math.min(cashFlowToIncome / 1.5, 1.0) * 0.10 +
    revenueQuality * 0.10;

  let overallGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  if (composite >= 0.80) overallGrade = 'A';
  else if (composite >= 0.65) overallGrade = 'B';
  else if (composite >= 0.50) overallGrade = 'C';
  else if (composite >= 0.35) overallGrade = 'D';
  else overallGrade = 'F';

  return {
    ticker: seed.ticker,
    name: seed.name,
    sector: seed.sector,
    marketCap: seed.marketCap,
    altmanZ,
    beneishM,
    piotroskiF,
    accrualRatio,
    earningsPersistence,
    cashFlowToIncome,
    revenueQuality,
    overallGrade,
  };
}

// ── Cache ──

let cache: { data: EarningsQualityResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 60 * 60_000; // 5 minutes

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    // Seed based on current date for deterministic daily data
    const dateStr = new Date().toISOString().split('T')[0];
    const seed = hashSeed('earnings-quality-' + dateStr);
    const rand = seededRandom(seed);

    const stocks = STOCK_SEEDS.map((s) => buildStock(s, rand));

    const result: EarningsQualityResponse = {
      stocks,
      generatedAt: new Date().toISOString(),
    };

    cache = { data: result, expiresAt: now + CACHE_TTL };
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[EarningsQuality] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate earnings quality data' });
  }
});

export default router;
