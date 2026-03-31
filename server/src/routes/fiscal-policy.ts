import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

// ── Types ──

interface SpendingBreakdown {
  defense: number;
  healthcare: number;
  education: number;
  socialSecurity: number;
  infrastructure: number;
  interest: number;
}

interface RevenueBreakdown {
  incomeTax: number;
  corporateTax: number;
  vat: number;
  socialContributions: number;
  other: number;
}

interface QuarterlyBalance {
  quarter: string;
  balance: number;
}

interface CountryFiscalData {
  country: string;
  budgetBalance: number;
  taxRevenue: number;
  governmentSpending: number;
  debtToGDP: number;
  fiscalBalance: 'surplus' | 'deficit' | 'balanced';
  spendingBreakdown: SpendingBreakdown;
  revenueBreakdown: RevenueBreakdown;
  quarterlyTrend: QuarterlyBalance[];
}

// ── Base values for major economies ──

interface CountrySeed {
  country: string;
  budgetBalanceBase: number;
  taxRevenueBase: number;
  governmentSpendingBase: number;
  debtToGDPBase: number;
  spendingPcts: [number, number, number, number, number, number]; // defense, healthcare, education, socialSecurity, infrastructure, interest
  revenuePcts: [number, number, number, number, number]; // incomeTax, corporateTax, vat, socialContributions, other
}

const COUNTRY_SEEDS: CountrySeed[] = [
  {
    country: 'United States',
    budgetBalanceBase: -5.8,
    taxRevenueBase: 4900,
    governmentSpendingBase: 6200,
    debtToGDPBase: 123.0,
    spendingPcts: [13.0, 25.0, 5.0, 33.0, 4.0, 14.0],
    revenuePcts: [50.0, 9.0, 0.0, 34.0, 7.0],
  },
  {
    country: 'China',
    budgetBalanceBase: -7.1,
    taxRevenueBase: 3100,
    governmentSpendingBase: 3800,
    debtToGDPBase: 83.6,
    spendingPcts: [6.0, 9.0, 15.0, 22.0, 18.0, 5.0],
    revenuePcts: [25.0, 18.0, 28.0, 18.0, 11.0],
  },
  {
    country: 'Japan',
    budgetBalanceBase: -5.6,
    taxRevenueBase: 1750,
    governmentSpendingBase: 2100,
    debtToGDPBase: 255.2,
    spendingPcts: [5.0, 24.0, 8.0, 36.0, 6.0, 16.0],
    revenuePcts: [32.0, 13.0, 17.0, 30.0, 8.0],
  },
  {
    country: 'Germany',
    budgetBalanceBase: -1.6,
    taxRevenueBase: 1820,
    governmentSpendingBase: 1900,
    debtToGDPBase: 63.7,
    spendingPcts: [4.0, 20.0, 10.0, 40.0, 8.0, 4.0],
    revenuePcts: [30.0, 7.0, 20.0, 35.0, 8.0],
  },
  {
    country: 'United Kingdom',
    budgetBalanceBase: -4.4,
    taxRevenueBase: 1120,
    governmentSpendingBase: 1300,
    debtToGDPBase: 101.4,
    spendingPcts: [5.0, 20.0, 10.0, 28.0, 6.0, 10.0],
    revenuePcts: [33.0, 10.0, 21.0, 27.0, 9.0],
  },
  {
    country: 'France',
    budgetBalanceBase: -5.5,
    taxRevenueBase: 1580,
    governmentSpendingBase: 1780,
    debtToGDPBase: 112.9,
    spendingPcts: [4.0, 18.0, 10.0, 38.0, 7.0, 5.0],
    revenuePcts: [27.0, 6.0, 22.0, 37.0, 8.0],
  },
  {
    country: 'India',
    budgetBalanceBase: -8.9,
    taxRevenueBase: 680,
    governmentSpendingBase: 920,
    debtToGDPBase: 83.2,
    spendingPcts: [8.0, 6.0, 10.0, 15.0, 20.0, 22.0],
    revenuePcts: [28.0, 22.0, 25.0, 5.0, 20.0],
  },
  {
    country: 'Brazil',
    budgetBalanceBase: -7.9,
    taxRevenueBase: 620,
    governmentSpendingBase: 800,
    debtToGDPBase: 87.3,
    spendingPcts: [3.0, 10.0, 8.0, 38.0, 5.0, 24.0],
    revenuePcts: [22.0, 12.0, 28.0, 25.0, 13.0],
  },
  {
    country: 'Canada',
    budgetBalanceBase: -1.4,
    taxRevenueBase: 820,
    governmentSpendingBase: 870,
    debtToGDPBase: 106.4,
    spendingPcts: [3.0, 22.0, 11.0, 30.0, 8.0, 7.0],
    revenuePcts: [40.0, 10.0, 12.0, 28.0, 10.0],
  },
  {
    country: 'Australia',
    budgetBalanceBase: -1.9,
    taxRevenueBase: 560,
    governmentSpendingBase: 600,
    debtToGDPBase: 51.8,
    spendingPcts: [4.0, 22.0, 12.0, 28.0, 9.0, 5.0],
    revenuePcts: [42.0, 16.0, 12.0, 20.0, 10.0],
  },
];

// ── Helpers ──

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function jitter(rng: () => number, base: number, pctRange: number): number {
  return base * (1 + (rng() - 0.5) * 2 * pctRange);
}

function jitterAbsolute(rng: () => number, base: number, range: number): number {
  return base + (rng() - 0.5) * 2 * range;
}

// ── Data Generation ──

function generateFiscalData(): CountryFiscalData[] {
  const dateStr = new Date().toISOString().slice(0, 10);
  const seed = hashSeed('fiscal-policy-' + dateStr);
  const rng = mulberry32(seed);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);

  return COUNTRY_SEEDS.map((s) => {
    const budgetBalance = roundTo(jitter(rng, s.budgetBalanceBase, 0.08), 1);
    const taxRevenue = roundTo(jitter(rng, s.taxRevenueBase, 0.04), 1);
    const governmentSpending = roundTo(jitter(rng, s.governmentSpendingBase, 0.04), 1);
    const debtToGDP = roundTo(jitter(rng, s.debtToGDPBase, 0.03), 1);

    let fiscalBalance: 'surplus' | 'deficit' | 'balanced';
    if (budgetBalance > 0.3) {
      fiscalBalance = 'surplus';
    } else if (budgetBalance < -0.3) {
      fiscalBalance = 'deficit';
    } else {
      fiscalBalance = 'balanced';
    }

    // Spending breakdown with small jitter per category, then normalize
    const rawSpending = s.spendingPcts.map((pct) => jitter(rng, pct, 0.06));
    const spendingTotal = rawSpending.reduce((a, b) => a + b, 0);
    const normalizedSpending = rawSpending.map((v) => roundTo((v / spendingTotal) * 100, 1));
    // Adjust last item to ensure sum is exactly 100
    const spendingSum = normalizedSpending.slice(0, -1).reduce((a, b) => a + b, 0);
    normalizedSpending[normalizedSpending.length - 1] = roundTo(100 - spendingSum, 1);

    const spendingBreakdown: SpendingBreakdown = {
      defense: normalizedSpending[0],
      healthcare: normalizedSpending[1],
      education: normalizedSpending[2],
      socialSecurity: normalizedSpending[3],
      infrastructure: normalizedSpending[4],
      interest: normalizedSpending[5],
    };

    // Revenue breakdown with small jitter per category, then normalize
    const rawRevenue = s.revenuePcts.map((pct) => jitter(rng, pct, 0.06));
    const revenueTotal = rawRevenue.reduce((a, b) => a + b, 0);
    const normalizedRevenue = rawRevenue.map((v) => roundTo((v / revenueTotal) * 100, 1));
    const revenueSum = normalizedRevenue.slice(0, -1).reduce((a, b) => a + b, 0);
    normalizedRevenue[normalizedRevenue.length - 1] = roundTo(100 - revenueSum, 1);

    const revenueBreakdown: RevenueBreakdown = {
      incomeTax: normalizedRevenue[0],
      corporateTax: normalizedRevenue[1],
      vat: normalizedRevenue[2],
      socialContributions: normalizedRevenue[3],
      other: normalizedRevenue[4],
    };

    // Quarterly trend: last 4 quarters
    const quarterlyTrend: QuarterlyBalance[] = [];
    for (let i = 3; i >= 0; i--) {
      let q = currentQuarter - i;
      let y = currentYear;
      while (q <= 0) { q += 4; y -= 1; }
      const balance = roundTo(jitterAbsolute(rng, s.budgetBalanceBase, 1.2), 1);
      quarterlyTrend.push({
        quarter: `${y} Q${q}`,
        balance,
      });
    }

    return {
      country: s.country,
      budgetBalance,
      taxRevenue,
      governmentSpending,
      debtToGDP,
      fiscalBalance,
      spendingBreakdown,
      revenueBreakdown,
      quarterlyTrend,
    };
  });
}

// ── Cache (5-minute TTL, stale fallback) ──

let cacheData: CountryFiscalData[] | null = null;
let cacheTime = 0;


// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cacheData && now - cacheTime < CACHE_TTL) {
      return res.json(cacheData);
    }

    const data = generateFiscalData();
    cacheData = data;
    cacheTime = now;
    res.json(data);
  } catch (err: unknown) {
    console.error('[FiscalPolicy] Error:', (err as Error)?.message);
    if (cacheData) {
      return res.json(cacheData);
    }
    res.status(500).json({ error: 'Failed to generate fiscal policy data' });
  }
});

export default router;
