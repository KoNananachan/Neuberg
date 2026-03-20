import { Router } from 'express';

const router = Router();

function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function mulberry32(a: number): () => number {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const CACHE_TTL = 60 * 60 * 1000;
let cacheData: unknown = null;
let cacheTime = 0;

const TENOR_LABELS = ['1Y', '2Y', '3Y', '5Y', '7Y', '10Y', '15Y', '20Y', '30Y'] as const;
const TENOR_YEARS = [1, 2, 3, 5, 7, 10, 15, 20, 30];

const STATES = [
  { code: 'CA', name: 'California', baseYield: 3.15, rating: 'AA-', debt: 82, revGrowth: 3.2 },
  { code: 'NY', name: 'New York', baseYield: 3.25, rating: 'AA', debt: 68, revGrowth: 2.8 },
  { code: 'TX', name: 'Texas', baseYield: 2.90, rating: 'AAA', debt: 56, revGrowth: 4.1 },
  { code: 'FL', name: 'Florida', baseYield: 2.85, rating: 'AAA', debt: 38, revGrowth: 3.9 },
  { code: 'IL', name: 'Illinois', baseYield: 3.75, rating: 'BBB+', debt: 44, revGrowth: 1.2 },
  { code: 'PA', name: 'Pennsylvania', baseYield: 3.20, rating: 'AA-', debt: 32, revGrowth: 2.1 },
  { code: 'OH', name: 'Ohio', baseYield: 3.05, rating: 'AA', debt: 26, revGrowth: 2.4 },
  { code: 'NJ', name: 'New Jersey', baseYield: 3.50, rating: 'A-', debt: 36, revGrowth: 1.8 },
  { code: 'MA', name: 'Massachusetts', baseYield: 3.10, rating: 'AA+', debt: 29, revGrowth: 2.9 },
  { code: 'VA', name: 'Virginia', baseYield: 2.88, rating: 'AAA', debt: 17, revGrowth: 3.5 },
  { code: 'WA', name: 'Washington', baseYield: 2.92, rating: 'AA+', debt: 23, revGrowth: 3.3 },
  { code: 'CO', name: 'Colorado', baseYield: 2.95, rating: 'AA+', debt: 13, revGrowth: 3.7 },
  { code: 'GA', name: 'Georgia', baseYield: 3.00, rating: 'AAA', debt: 18, revGrowth: 3.6 },
  { code: 'NC', name: 'North Carolina', baseYield: 2.88, rating: 'AAA', debt: 15, revGrowth: 4.0 },
  { code: 'MN', name: 'Minnesota', baseYield: 3.08, rating: 'AAA', debt: 14, revGrowth: 2.7 },
];

const SECTORS = [
  { name: 'GO', label: 'General Obligation', baseYield: 2.95, baseSpread: 15, issuance: 85, defaultRate: 0.0 },
  { name: 'revenue', label: 'Revenue', baseYield: 3.25, baseSpread: 45, issuance: 120, defaultRate: 0.02 },
  { name: 'water_sewer', label: 'Water/Sewer', baseYield: 3.10, baseSpread: 30, issuance: 35, defaultRate: 0.0 },
  { name: 'transportation', label: 'Transportation', baseYield: 3.35, baseSpread: 55, issuance: 42, defaultRate: 0.03 },
  { name: 'education', label: 'Education', baseYield: 3.15, baseSpread: 35, issuance: 48, defaultRate: 0.01 },
  { name: 'healthcare', label: 'Healthcare', baseYield: 3.45, baseSpread: 65, issuance: 30, defaultRate: 0.05 },
  { name: 'housing', label: 'Housing', baseYield: 3.30, baseSpread: 50, issuance: 22, defaultRate: 0.02 },
  { name: 'airport', label: 'Airport', baseYield: 3.40, baseSpread: 60, issuance: 18, defaultRate: 0.01 },
];

const TAX_BRACKETS = [0.22, 0.24, 0.32, 0.35, 0.37];

const UNDERWRITERS = [
  'J.P. Morgan', 'BofA Securities', 'Morgan Stanley', 'Citigroup',
  'Goldman Sachs', 'Wells Fargo', 'Barclays', 'RBC Capital Markets',
  'Raymond James', 'Piper Sandler', 'Stifel', 'Jefferies',
];

const ISSUERS = [
  { issuer: 'State of California', state: 'CA', type: 'GO' as const },
  { issuer: 'New York City Transitional Finance Authority', state: 'NY', type: 'revenue' as const },
  { issuer: 'Texas Water Development Board', state: 'TX', type: 'revenue' as const },
  { issuer: 'Florida Board of Education', state: 'FL', type: 'GO' as const },
  { issuer: 'Illinois State Toll Highway Authority', state: 'IL', type: 'revenue' as const },
  { issuer: 'Commonwealth of Pennsylvania', state: 'PA', type: 'GO' as const },
  { issuer: 'Ohio Turnpike Commission', state: 'OH', type: 'revenue' as const },
  { issuer: 'New Jersey Turnpike Authority', state: 'NJ', type: 'revenue' as const },
  { issuer: 'Massachusetts Bay Transportation Authority', state: 'MA', type: 'revenue' as const },
  { issuer: 'Virginia Public Building Authority', state: 'VA', type: 'GO' as const },
  { issuer: 'Port of Seattle', state: 'WA', type: 'revenue' as const },
  { issuer: 'Colorado Health Facilities Authority', state: 'CO', type: 'revenue' as const },
  { issuer: 'Georgia Road & Tollway Authority', state: 'GA', type: 'revenue' as const },
  { issuer: 'North Carolina Capital Facilities Finance Agency', state: 'NC', type: 'revenue' as const },
  { issuer: 'Minnesota Housing Finance Agency', state: 'MN', type: 'revenue' as const },
  { issuer: 'City of Los Angeles Department of Water & Power', state: 'CA', type: 'revenue' as const },
  { issuer: 'Metropolitan Transportation Authority', state: 'NY', type: 'revenue' as const },
  { issuer: 'Dallas Fort Worth International Airport', state: 'TX', type: 'revenue' as const },
  { issuer: 'Miami-Dade County', state: 'FL', type: 'GO' as const },
  { issuer: 'City of Chicago', state: 'IL', type: 'GO' as const },
];

const RATINGS_POOL = ['AAA', 'AA+', 'AA', 'AA-', 'A+', 'A', 'A-'];

function generateData() {
  const today = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(today + '-municipal-bond'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // --- Yield Curve: AAA GO muni yields ---
  const baseAAAYields = [2.10, 2.25, 2.40, 2.65, 2.85, 3.05, 3.35, 3.55, 3.70];
  const baseTreasuryYields = [3.80, 3.75, 3.72, 3.70, 3.75, 3.85, 4.00, 4.15, 4.30];

  const yieldCurve = TENOR_LABELS.map((tenor, i) => {
    const yld = Math.round(jitter(baseAAAYields[i], 0.04) * 1000) / 1000;
    const treasuryYld = Math.round(jitter(baseTreasuryYields[i], 0.03) * 1000) / 1000;
    const change = Math.round((rng() - 0.5) * 8 * 10) / 10;
    const muniToTreasuryRatio = Math.round((yld / treasuryYld) * 1000) / 10;
    return { tenor, maturityYears: TENOR_YEARS[i], yield: yld, change, muniToTreasuryRatio };
  });

  // --- State Breakdown ---
  const stateBreakdown = STATES.map(st => {
    const avgYield = Math.round(jitter(st.baseYield, 0.06) * 1000) / 1000;
    const spread = Math.round((avgYield - 2.80) * 100 + (rng() - 0.5) * 10);
    const outstandingDebt = Math.round(jitter(st.debt, 0.05) * 10) / 10;
    const revenueGrowth = Math.round(jitter(st.revGrowth, 0.15) * 10) / 10;
    return {
      state: st.code,
      name: st.name,
      avgYield,
      spread,
      creditRating: st.rating,
      outstandingDebt,
      revenueGrowth,
    };
  });

  // --- Sector Data ---
  const sectorData = SECTORS.map(sec => {
    const avgYield = Math.round(jitter(sec.baseYield, 0.05) * 1000) / 1000;
    const spread = Math.round(jitter(sec.baseSpread, 0.12));
    const issuanceYTD = Math.round(jitter(sec.issuance, 0.10) * 10) / 10;
    const defaultRate = Math.round(jitter(Math.max(sec.defaultRate, 0.001), 0.20) * 1000) / 1000;
    return {
      sector: sec.label,
      avgYield,
      spread,
      issuanceYTD,
      defaultRate,
    };
  });

  // --- Tax Equivalent Yields ---
  const tenYearAAAYield = yieldCurve.find(p => p.tenor === '10Y')!.yield;
  const tenYearAYield = Math.round((tenYearAAAYield + 0.55 + rng() * 0.15) * 1000) / 1000;
  const thirtyYearAAAYield = yieldCurve.find(p => p.tenor === '30Y')!.yield;

  const taxEquivalent = TAX_BRACKETS.map(bracket => {
    const pct = Math.round(bracket * 100);
    return {
      taxBracket: `${pct}%`,
      federalRate: pct,
      tenYearAAA: Math.round((tenYearAAAYield / (1 - bracket)) * 1000) / 1000,
      tenYearA: Math.round((tenYearAYield / (1 - bracket)) * 1000) / 1000,
      thirtyYearAAA: Math.round((thirtyYearAAAYield / (1 - bracket)) * 1000) / 1000,
    };
  });

  // --- New Issuance (Recent Deals) ---
  const dealCount = 10 + Math.floor(rng() * 6);
  const newIssuance = Array.from({ length: dealCount }, () => {
    const issuerInfo = ISSUERS[Math.floor(rng() * ISSUERS.length)];
    const maturityYears = 5 + Math.floor(rng() * 26);
    const matDate = new Date();
    matDate.setFullYear(matDate.getFullYear() + maturityYears);
    const amount = Math.round((50 + rng() * 950) * 10) / 10;
    const coupon = Math.round((2.5 + rng() * 2.5) * 100) / 100;
    const ratingIdx = Math.floor(rng() * RATINGS_POOL.length);
    const underwriter = UNDERWRITERS[Math.floor(rng() * UNDERWRITERS.length)];

    return {
      issuer: issuerInfo.issuer,
      state: issuerInfo.state,
      amount,
      coupon,
      maturity: matDate.toISOString().slice(0, 10),
      rating: RATINGS_POOL[ratingIdx],
      type: issuerInfo.type === 'GO' ? 'GO' : 'revenue',
      underwriter,
    };
  });

  // --- Market Metrics ---
  const totalOutstanding = Math.round(jitter(4.05, 0.03) * 100) / 100;
  const ytdIssuance = Math.round(jitter(310, 0.08) * 10) / 10;
  const netFlows = Math.round((rng() - 0.4) * 20 * 10) / 10;
  const muniETFFlows = Math.round((rng() - 0.45) * 8 * 10) / 10;
  const avgDuration = Math.round(jitter(5.8, 0.06) * 100) / 100;

  const marketMetrics = {
    totalOutstanding,
    ytdIssuance,
    netFlows,
    muniETFFlows,
    avgDuration,
  };

  return {
    yieldCurve,
    stateBreakdown,
    sectorData,
    taxEquivalent,
    newIssuance,
    marketMetrics,
    generatedAt: new Date().toISOString(),
  };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cacheData && now - cacheTime < CACHE_TTL) {
      return res.json(cacheData);
    }
    const data = generateData();
    cacheData = data;
    cacheTime = now;
    res.json(data);
  } catch (err: unknown) {
    const error = err as Error | undefined;
    console.error('[MunicipalBond] Error:', error?.message);
    if (cacheData) {
      return res.json(cacheData);
    }
    res.status(500).json({ error: 'Failed to generate municipal bond data' });
  }
});

export default router;
