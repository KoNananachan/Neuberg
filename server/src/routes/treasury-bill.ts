import { Router } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

// ── Helpers ──

function round(n: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

function jitter(rng: () => number, base: number, spread: number): number {
  return base + (rng() - 0.5) * 2 * spread;
}

function generateCUSIP(rng: () => number): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let cusip = '912796';
  for (let i = 0; i < 3; i++) {
    cusip += chars[Math.floor(rng() * chars.length)];
  }
  return cusip;
}

function addDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ── Cache ──

let cache: { data: unknown; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};


// ── Data Generation ──

function generate() {
  const rng = seededRandom('treasury-bill-monitor');
  const today = new Date();

  // ── 1. T-Bill Rates ──

  const tbillTenors = [
    { term: '4W',  days: 28,  baseDiscount: 4.22, baseInvestment: 4.30 },
    { term: '8W',  days: 56,  baseDiscount: 4.20, baseInvestment: 4.29 },
    { term: '13W', days: 91,  baseDiscount: 4.18, baseInvestment: 4.28 },
    { term: '17W', days: 119, baseDiscount: 4.15, baseInvestment: 4.26 },
    { term: '26W', days: 182, baseDiscount: 4.08, baseInvestment: 4.20 },
    { term: '52W', days: 364, baseDiscount: 3.92, baseInvestment: 4.08 },
  ];

  const tbillRates = tbillTenors.map(t => {
    const discountRate = round(jitter(rng, t.baseDiscount, 0.08), 3);
    const investmentRate = round(jitter(rng, t.baseInvestment, 0.08), 3);
    const price = round(100 - (discountRate * t.days / 360), 4);
    return {
      term: t.term,
      days: t.days,
      discountRate,
      investmentRate,
      price,
      change1d: round(jitter(rng, 0, 0.02), 3),
      change1w: round(jitter(rng, 0, 0.04), 3),
      change1m: round(jitter(rng, -0.02, 0.06), 3),
    };
  });

  // ── 2. Money Market Rates ──

  const fedFundsEffective = round(jitter(rng, 4.33, 0.02), 2);
  const sofrRate = round(jitter(rng, 4.30, 0.02), 2);

  const moneyMarketRates = [
    {
      name: 'Fed Funds Effective',
      id: 'EFFR',
      rate: fedFundsEffective,
      change1d: round(jitter(rng, 0, 0.005), 3),
      change1w: round(jitter(rng, 0, 0.01), 3),
      category: 'fed_funds',
    },
    {
      name: 'Fed Funds Target (Upper)',
      id: 'FF_UPPER',
      rate: 4.50,
      change1d: 0,
      change1w: 0,
      category: 'fed_funds',
    },
    {
      name: 'Fed Funds Target (Lower)',
      id: 'FF_LOWER',
      rate: 4.25,
      change1d: 0,
      change1w: 0,
      category: 'fed_funds',
    },
    {
      name: 'SOFR',
      id: 'SOFR',
      rate: sofrRate,
      change1d: round(jitter(rng, 0, 0.004), 3),
      change1w: round(jitter(rng, 0, 0.008), 3),
      category: 'sofr',
    },
    {
      name: 'SOFR 30-Day Avg',
      id: 'SOFR_30D',
      rate: round(jitter(rng, 4.31, 0.015), 3),
      change1d: round(jitter(rng, 0, 0.002), 3),
      change1w: round(jitter(rng, 0, 0.005), 3),
      category: 'sofr',
    },
    {
      name: 'SOFR 90-Day Avg',
      id: 'SOFR_90D',
      rate: round(jitter(rng, 4.33, 0.02), 3),
      change1d: round(jitter(rng, 0, 0.002), 3),
      change1w: round(jitter(rng, 0, 0.005), 3),
      category: 'sofr',
    },
    {
      name: 'SOFR 180-Day Avg',
      id: 'SOFR_180D',
      rate: round(jitter(rng, 4.36, 0.025), 3),
      change1d: round(jitter(rng, 0, 0.001), 3),
      change1w: round(jitter(rng, 0, 0.004), 3),
      category: 'sofr',
    },
    {
      name: 'Prime Rate',
      id: 'PRIME',
      rate: 7.50,
      change1d: 0,
      change1w: 0,
      category: 'administered',
    },
    {
      name: 'Discount Window Primary Credit',
      id: 'DISCOUNT_PRIMARY',
      rate: 4.50,
      change1d: 0,
      change1w: 0,
      category: 'administered',
    },
    {
      name: 'ON RRP Rate',
      id: 'ON_RRP',
      rate: 4.25,
      change1d: 0,
      change1w: 0,
      category: 'administered',
    },
    {
      name: 'IORB',
      id: 'IORB',
      rate: 4.40,
      change1d: 0,
      change1w: 0,
      category: 'administered',
    },
    {
      name: 'CP 1M AA Financial',
      id: 'CP_1M_AA_FIN',
      rate: round(jitter(rng, 4.35, 0.04), 3),
      change1d: round(jitter(rng, 0, 0.008), 3),
      change1w: round(jitter(rng, 0, 0.015), 3),
      category: 'commercial_paper',
    },
    {
      name: 'CP 3M AA Financial',
      id: 'CP_3M_AA_FIN',
      rate: round(jitter(rng, 4.28, 0.04), 3),
      change1d: round(jitter(rng, 0, 0.008), 3),
      change1w: round(jitter(rng, 0, 0.015), 3),
      category: 'commercial_paper',
    },
    {
      name: 'CP 1M AA Non-Financial',
      id: 'CP_1M_AA_NONFIN',
      rate: round(jitter(rng, 4.38, 0.04), 3),
      change1d: round(jitter(rng, 0, 0.008), 3),
      change1w: round(jitter(rng, 0, 0.015), 3),
      category: 'commercial_paper',
    },
    {
      name: 'CP 3M AA Non-Financial',
      id: 'CP_3M_AA_NONFIN',
      rate: round(jitter(rng, 4.32, 0.04), 3),
      change1d: round(jitter(rng, 0, 0.008), 3),
      change1w: round(jitter(rng, 0, 0.015), 3),
      category: 'commercial_paper',
    },
  ];

  // ── 3. T-Bill Auction Results (last 8) ──

  const auctionTerms = ['4-Week', '8-Week', '13-Week', '17-Week', '26-Week', '52-Week', '4-Week', '8-Week'];
  const auctionBaseRates = [4.22, 4.20, 4.18, 4.15, 4.08, 3.92, 4.23, 4.21];

  const recentAuctions = auctionTerms.map((term, i) => {
    const daysBack = (i + 1) * 4 + Math.floor(rng() * 3);
    const issueDate = addDays(today, -daysBack);
    const termDays = term === '4-Week' ? 28 : term === '8-Week' ? 56 : term === '13-Week' ? 91 :
      term === '17-Week' ? 119 : term === '26-Week' ? 182 : 364;
    const maturityDate = addDays(new Date(issueDate), termDays);
    const highRate = round(jitter(rng, auctionBaseRates[i], 0.06), 3);
    const indirectPct = round(jitter(rng, 62, 8), 1);
    const directPct = round(jitter(rng, 18, 5), 1);
    const dealerPct = round(100 - indirectPct - directPct, 1);

    return {
      cusip: generateCUSIP(rng),
      term,
      issueDate,
      maturityDate,
      highRate,
      allotmentRatio: round(jitter(rng, 88, 8), 2),
      bidToCover: round(jitter(rng, 2.80, 0.30), 2),
      indirectPct,
      directPct,
      dealerPct: Math.max(0, dealerPct),
      totalTendered: round(jitter(rng, 185, 40), 1),
      totalAccepted: round(jitter(rng, 70, 12), 1),
    };
  });

  // ── 4. Upcoming Auctions ──

  const upcomingTerms = ['4-Week', '8-Week', '13-Week', '26-Week', '4-Week', '8-Week'];
  const upcomingEstSizes = [80, 75, 70, 60, 80, 75];

  const upcomingAuctions = upcomingTerms.map((term, i) => {
    const announceDaysAhead = i * 3 + 1;
    const auctionDaysAhead = announceDaysAhead + 2;
    const settleDaysAhead = auctionDaysAhead + 2;

    return {
      term,
      announcementDate: addDays(today, announceDaysAhead),
      auctionDate: addDays(today, auctionDaysAhead),
      settlementDate: addDays(today, settleDaysAhead),
      estimatedSizeB: round(jitter(rng, upcomingEstSizes[i], 5), 0),
    };
  });

  // ── 5. Money Market Fund Flows (last 8 weeks) ──

  const fundFlows = Array.from({ length: 8 }, (_, i) => {
    const weekEnd = addDays(today, -(i * 7));
    const govtAUM = round(jitter(rng, 4350, 120), 1);
    const primeAUM = round(jitter(rng, 820, 40), 1);
    const taxExemptAUM = round(jitter(rng, 115, 10), 1);

    return {
      weekEnding: weekEnd,
      government: {
        aum: govtAUM,
        netFlow: round(jitter(rng, 2.5, 15), 1),
      },
      prime: {
        aum: primeAUM,
        netFlow: round(jitter(rng, -0.8, 6), 1),
      },
      taxExempt: {
        aum: taxExemptAUM,
        netFlow: round(jitter(rng, 0.3, 2), 1),
      },
      totalAUM: round(govtAUM + primeAUM + taxExemptAUM, 1),
      totalNetFlow: round(jitter(rng, 1.8, 18), 1),
    };
  }).reverse();

  // ── 6. Short-Term Yield Curve ──

  const yieldCurvePoints = [
    { tenor: '1D', months: 0.033, tbillBase: 4.30, mmBase: 4.33 },
    { tenor: '1W', months: 0.25,  tbillBase: 4.28, mmBase: 4.32 },
    { tenor: '2W', months: 0.5,   tbillBase: 4.27, mmBase: 4.31 },
    { tenor: '1M', months: 1,     tbillBase: 4.25, mmBase: 4.30 },
    { tenor: '2M', months: 2,     tbillBase: 4.22, mmBase: 4.28 },
    { tenor: '3M', months: 3,     tbillBase: 4.18, mmBase: 4.25 },
    { tenor: '6M', months: 6,     tbillBase: 4.08, mmBase: 4.18 },
    { tenor: '9M', months: 9,     tbillBase: 4.00, mmBase: 4.12 },
    { tenor: '12M', months: 12,   tbillBase: 3.92, mmBase: 4.06 },
  ];

  const shortTermYieldCurve = yieldCurvePoints.map(p => ({
    tenor: p.tenor,
    months: p.months,
    tbillEquivalentYield: round(jitter(rng, p.tbillBase, 0.06), 3),
    moneyMarketRate: round(jitter(rng, p.mmBase, 0.06), 3),
  }));

  return {
    tbillRates,
    moneyMarketRates,
    recentAuctions,
    upcomingAuctions,
    fundFlows,
    shortTermYieldCurve,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }
    const data = generate();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err) {
    console.error('[TreasuryBill] Error:', (err as Error).message);
    if (cache.data) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate treasury bill monitor data' });
  }
});

export default router;
