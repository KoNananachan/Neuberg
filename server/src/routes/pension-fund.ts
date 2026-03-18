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

// ── Seed Data ──

interface FundDef {
  name: string;
  baseAssets: number; // $B
  baseFundingRatio: number; // %
  baseDiscountRate: number; // %
  region: 'US' | 'Canada' | 'Europe' | 'Asia';
  allocation: { equity: number; fixedIncome: number; realEstate: number; alternatives: number; cash: number };
}

const FUNDS: FundDef[] = [
  { name: 'CalPERS', baseAssets: 502, baseFundingRatio: 82, baseDiscountRate: 6.8, region: 'US', allocation: { equity: 50, fixedIncome: 28, realEstate: 8, alternatives: 11, cash: 3 } },
  { name: 'CalSTRS', baseAssets: 318, baseFundingRatio: 79, baseDiscountRate: 7.0, region: 'US', allocation: { equity: 48, fixedIncome: 25, realEstate: 14, alternatives: 10, cash: 3 } },
  { name: 'NY State Common', baseAssets: 268, baseFundingRatio: 95, baseDiscountRate: 5.9, region: 'US', allocation: { equity: 52, fixedIncome: 23, realEstate: 8, alternatives: 14, cash: 3 } },
  { name: 'FL State Board', baseAssets: 215, baseFundingRatio: 84, baseDiscountRate: 6.7, region: 'US', allocation: { equity: 55, fixedIncome: 22, realEstate: 7, alternatives: 13, cash: 3 } },
  { name: 'TX Teachers', baseAssets: 198, baseFundingRatio: 78, baseDiscountRate: 7.25, region: 'US', allocation: { equity: 46, fixedIncome: 27, realEstate: 9, alternatives: 15, cash: 3 } },
  { name: 'OH STRS', baseAssets: 96, baseFundingRatio: 81, baseDiscountRate: 7.0, region: 'US', allocation: { equity: 51, fixedIncome: 26, realEstate: 10, alternatives: 10, cash: 3 } },
  { name: 'TIAA', baseAssets: 345, baseFundingRatio: 103, baseDiscountRate: 5.5, region: 'US', allocation: { equity: 42, fixedIncome: 32, realEstate: 12, alternatives: 10, cash: 4 } },
  { name: 'Ontario Teachers', baseAssets: 250, baseFundingRatio: 107, baseDiscountRate: 5.4, region: 'Canada', allocation: { equity: 35, fixedIncome: 26, realEstate: 18, alternatives: 18, cash: 3 } },
  { name: 'CPP Investments', baseAssets: 570, baseFundingRatio: 113, baseDiscountRate: 5.0, region: 'Canada', allocation: { equity: 37, fixedIncome: 22, realEstate: 17, alternatives: 22, cash: 2 } },
  { name: 'ABP Netherlands', baseAssets: 540, baseFundingRatio: 109, baseDiscountRate: 4.5, region: 'Europe', allocation: { equity: 39, fixedIncome: 30, realEstate: 14, alternatives: 14, cash: 3 } },
  { name: 'Norges Bank IM', baseAssets: 1600, baseFundingRatio: 105, baseDiscountRate: 4.0, region: 'Europe', allocation: { equity: 72, fixedIncome: 25, realEstate: 3, alternatives: 0, cash: 0 } },
  { name: 'GIC Singapore', baseAssets: 770, baseFundingRatio: 101, baseDiscountRate: 4.8, region: 'Asia', allocation: { equity: 40, fixedIncome: 25, realEstate: 15, alternatives: 17, cash: 3 } },
];

const ALLOCATION_CATEGORIES = [
  { category: 'Public Equity', basePct: 47.2, baseBenchmark: 45.0 },
  { category: 'Fixed Income', basePct: 25.8, baseBenchmark: 27.0 },
  { category: 'Real Estate', basePct: 11.4, baseBenchmark: 10.0 },
  { category: 'Alternatives', basePct: 12.1, baseBenchmark: 14.0 },
  { category: 'Cash & Equivalents', basePct: 3.5, baseBenchmark: 4.0 },
] as const;

const MONTHS_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ── Cache ──

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

// ── Generator ──

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-pension-fund'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const roundTo = (v: number, d: number) => { const f = 10 ** d; return Math.round(v * f) / f; };

  // ── Top Funds ──
  const topFunds = FUNDS.map(fund => {
    const assets = roundTo(jitter(fund.baseAssets, 0.04), 1);
    const fundingRatio = roundTo(jitter(fund.baseFundingRatio, 0.03), 1);
    const liabilities = roundTo(assets / (fundingRatio / 100), 1);
    const discountRate = roundTo(jitter(fund.baseDiscountRate, 0.05), 2);
    const ytdReturn = roundTo((rng() - 0.3) * 20, 1); // range roughly -7% to +13%

    // Jitter allocation slightly while ensuring sum = 100
    const rawAlloc = {
      equity: roundTo(jitter(fund.allocation.equity, 0.04), 1),
      fixedIncome: roundTo(jitter(fund.allocation.fixedIncome, 0.04), 1),
      realEstate: roundTo(jitter(fund.allocation.realEstate, 0.06), 1),
      alternatives: roundTo(jitter(fund.allocation.alternatives, 0.06), 1),
      cash: 0,
    };
    const allocSum = rawAlloc.equity + rawAlloc.fixedIncome + rawAlloc.realEstate + rawAlloc.alternatives;
    rawAlloc.cash = roundTo(Math.max(0, 100 - allocSum), 1);

    return {
      name: fund.name,
      assets,
      liabilities,
      fundingRatio,
      discountRate,
      ytdReturn,
      allocation: rawAlloc,
    };
  });

  // ── Summary ──
  const totalAssets = roundTo(topFunds.reduce((s, f) => s + f.assets, 0) / 1000, 2); // $T
  const totalLiabilities = roundTo(topFunds.reduce((s, f) => s + f.liabilities, 0) / 1000, 2); // $T
  const avgFundingRatio = roundTo(topFunds.reduce((s, f) => s + f.fundingRatio, 0) / topFunds.length, 1);
  const avgDiscountRate = roundTo(topFunds.reduce((s, f) => s + f.discountRate, 0) / topFunds.length, 2);
  const ytdReturn = roundTo(topFunds.reduce((s, f) => s + f.ytdReturn, 0) / topFunds.length, 1);

  const summary = {
    avgFundingRatio,
    totalAssets,
    totalLiabilities,
    avgDiscountRate,
    ytdReturn,
  };

  // ── Asset Allocation (aggregate) ──
  const assetAllocation = ALLOCATION_CATEGORIES.map(cat => {
    const percentage = roundTo(jitter(cat.basePct, 0.04), 1);
    const change1y = roundTo((rng() - 0.45) * 4, 1); // -2.2pp to +2.2pp
    const benchmark = roundTo(jitter(cat.baseBenchmark, 0.03), 1);
    return { category: cat.category, percentage, change1y, benchmark };
  });

  // ── Liability Analysis ──
  const liabilityAnalysis = {
    durationGap: roundTo(1.5 + rng() * 3.5, 1), // 1.5-5.0 years
    pvboPerBp: roundTo(jitter(850, 0.12), 0), // $M per bp
    interestRateSensitivity: roundTo(8 + rng() * 7, 1), // 8-15% per 100bp
    inflationSensitivity: roundTo(3 + rng() * 5, 1), // 3-8%
  };

  // ── Funding Trend (12 months) ──
  const now = new Date();
  const currentMonth = now.getMonth();
  let runningFundingRatio = avgFundingRatio - 3 + rng() * 2; // start slightly lower
  let runningDiscountRate = avgDiscountRate + 0.1 + rng() * 0.2;

  const fundingTrend = Array.from({ length: 12 }, (_, i) => {
    const monthIdx = (currentMonth - 11 + i + 12) % 12;
    const year = now.getFullYear() - (currentMonth - 11 + i < 0 ? 1 : 0);
    const month = `${MONTHS_LABELS[monthIdx]} ${year}`;

    // Walk funding ratio toward current average
    runningFundingRatio += (rng() - 0.45) * 1.5;
    if (i === 11) runningFundingRatio = avgFundingRatio; // end at current
    const avgFR = roundTo(runningFundingRatio, 1);

    runningDiscountRate += (rng() - 0.5) * 0.08;
    if (i === 11) runningDiscountRate = avgDiscountRate;
    const avgDR = roundTo(runningDiscountRate, 2);

    // SP500 monthly return approximation
    const sp500Return = roundTo((rng() - 0.42) * 8, 1); // slight positive bias

    return { month, avgFundingRatio: avgFR, avgDiscountRate: avgDR, sp500Return };
  });

  return {
    summary,
    topFunds,
    assetAllocation,
    liabilityAnalysis,
    fundingTrend,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[PensionFund] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate pension fund data' });
  }
});

export default router;
