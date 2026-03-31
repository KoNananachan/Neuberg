import { Router } from 'express';
import { mulberry32, hashSeed } from '../lib/seeded-data.js';
const router = Router();

// ── Types ──

type Strategy = 'buyout' | 'growth' | 'venture' | 'infrastructure' | 'real_estate' | 'credit';
type BuyerType = 'secondary_fund' | 'pension' | 'endowment' | 'sovereign_wealth';

interface SecondaryTransaction {
  fundName: string;
  strategy: Strategy;
  vintageYear: number;
  gp: string;
  navMillions: number;
  transactionPricePct: number;
  discountPremiumPct: number;
  buyerType: BuyerType;
  dealSizeMillions: number;
  closingDate: string;
}

interface StrategyPricing {
  strategy: Strategy;
  avgPriceOfNav: number;
  bidAskSpread: number;
  dealCount: number;
  totalVolume: number;
}

interface VolumeStatistics {
  quarterlyVolume: { quarter: string; volumeBillions: number; dealCount: number }[];
  yoyChangePct: number;
  buyerBreakdown: { type: BuyerType; pct: number }[];
  sellerBreakdown: { type: string; pct: number }[];
  gpLedPct: number;
  lpLedPct: number;
}

interface PricingTrend {
  strategy: Strategy;
  currentPct: number;
  sixMonthAgoPct: number;
  oneYearAgoPct: number;
  trendDirection: 'tightening' | 'widening' | 'stable';
}

interface Participant {
  name: string;
  volumeBillions: number;
  dealCount: number;
}

interface TopParticipants {
  topBuyers: Participant[];
  topSellers: Participant[];
}

interface UnfundedOverhang {
  totalUnfundedBillions: number;
  byStrategy: { strategy: Strategy; unfundedBillions: number; pctOfTotal: number }[];
  avgFundLife: number;
  overcommitmentRatio: number;
}

interface DiscountPercentile {
  strategy: Strategy;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

interface PrivateEquitySecondariesResponse {
  transactions: SecondaryTransaction[];
  marketPricing: StrategyPricing[];
  volumeStats: VolumeStatistics;
  pricingTrends: PricingTrend[];
  topParticipants: TopParticipants;
  unfundedOverhang: UnfundedOverhang;
  discountPercentiles: DiscountPercentile[];
  timestamp: string;
}

// ── Cache ──

let cache: { data: PrivateEquitySecondariesResponse; ts: number } | null = null;
let staleData: PrivateEquitySecondariesResponse | null = null;
const TTL = 5 * 60 * 1000;

// ── Helpers ──

const round1 = (v: number) => Math.round(v * 10) / 10;
const round2 = (v: number) => Math.round(v * 100) / 100;

// ── Static Data ──

const STRATEGIES: Strategy[] = ['buyout', 'growth', 'venture', 'infrastructure', 'real_estate', 'credit'];
const BUYER_TYPES: BuyerType[] = ['secondary_fund', 'pension', 'endowment', 'sovereign_wealth'];

const GP_NAMES: { gp: string; funds: { name: string; strategy: Strategy; vintageBase: number }[] }[] = [
  { gp: 'Blackstone', funds: [
    { name: 'Blackstone Capital Partners VIII', strategy: 'buyout', vintageBase: 2019 },
    { name: 'Blackstone Capital Partners IX', strategy: 'buyout', vintageBase: 2022 },
    { name: 'Blackstone Real Estate Partners X', strategy: 'real_estate', vintageBase: 2021 },
    { name: 'Blackstone Infrastructure Partners III', strategy: 'infrastructure', vintageBase: 2022 },
  ]},
  { gp: 'KKR', funds: [
    { name: 'KKR Americas XII', strategy: 'buyout', vintageBase: 2017 },
    { name: 'KKR Americas Fund XIII', strategy: 'buyout', vintageBase: 2021 },
    { name: 'KKR Global Infrastructure IV', strategy: 'infrastructure', vintageBase: 2020 },
    { name: 'KKR Real Estate Partners Americas III', strategy: 'real_estate', vintageBase: 2019 },
  ]},
  { gp: 'Apollo', funds: [
    { name: 'Apollo Investment Fund IX', strategy: 'buyout', vintageBase: 2018 },
    { name: 'Apollo Investment Fund X', strategy: 'buyout', vintageBase: 2022 },
    { name: 'Apollo Credit Fund IV', strategy: 'credit', vintageBase: 2021 },
  ]},
  { gp: 'Carlyle', funds: [
    { name: 'Carlyle Partners VII', strategy: 'buyout', vintageBase: 2018 },
    { name: 'Carlyle Partners VIII', strategy: 'buyout', vintageBase: 2022 },
    { name: 'Carlyle Realty Partners IX', strategy: 'real_estate', vintageBase: 2020 },
  ]},
  { gp: 'TPG', funds: [
    { name: 'TPG Partners VIII', strategy: 'buyout', vintageBase: 2019 },
    { name: 'TPG Growth V', strategy: 'growth', vintageBase: 2020 },
    { name: 'TPG Rise Climate II', strategy: 'infrastructure', vintageBase: 2022 },
  ]},
  { gp: 'Warburg Pincus', funds: [
    { name: 'Warburg Pincus Global Growth XIV', strategy: 'growth', vintageBase: 2021 },
    { name: 'Warburg Pincus China-Southeast Asia III', strategy: 'growth', vintageBase: 2019 },
  ]},
  { gp: 'Thoma Bravo', funds: [
    { name: 'Thoma Bravo Fund XV', strategy: 'buyout', vintageBase: 2022 },
    { name: 'Thoma Bravo Discover Fund IV', strategy: 'growth', vintageBase: 2021 },
  ]},
  { gp: 'Advent International', funds: [
    { name: 'Advent International GPE X', strategy: 'buyout', vintageBase: 2021 },
    { name: 'Advent Technology Fund II', strategy: 'growth', vintageBase: 2022 },
  ]},
  { gp: 'General Atlantic', funds: [
    { name: 'General Atlantic Fund II', strategy: 'growth', vintageBase: 2020 },
  ]},
  { gp: 'Bain Capital', funds: [
    { name: 'Bain Capital Fund XIII', strategy: 'buyout', vintageBase: 2019 },
    { name: 'Bain Capital Credit CLO Fund V', strategy: 'credit', vintageBase: 2021 },
  ]},
  { gp: 'Brookfield', funds: [
    { name: 'Brookfield Infrastructure Fund V', strategy: 'infrastructure', vintageBase: 2022 },
    { name: 'Brookfield Real Estate Finance Fund VII', strategy: 'real_estate', vintageBase: 2020 },
  ]},
  { gp: 'Ares Management', funds: [
    { name: 'Ares Corporate Opportunities Fund VI', strategy: 'credit', vintageBase: 2020 },
    { name: 'Ares Special Opportunities Fund III', strategy: 'credit', vintageBase: 2021 },
  ]},
  { gp: 'Sequoia Capital', funds: [
    { name: 'Sequoia Capital Global Growth Fund IV', strategy: 'venture', vintageBase: 2021 },
    { name: 'Sequoia Capital US Venture Fund XVIII', strategy: 'venture', vintageBase: 2022 },
  ]},
  { gp: 'Andreessen Horowitz', funds: [
    { name: 'a16z Growth Fund IV', strategy: 'venture', vintageBase: 2022 },
    { name: 'a16z Crypto Fund IV', strategy: 'venture', vintageBase: 2022 },
  ]},
  { gp: 'Insight Partners', funds: [
    { name: 'Insight Partners XII', strategy: 'growth', vintageBase: 2021 },
  ]},
  { gp: 'EQT', funds: [
    { name: 'EQT X', strategy: 'buyout', vintageBase: 2022 },
    { name: 'EQT Infrastructure VI', strategy: 'infrastructure', vintageBase: 2023 },
  ]},
];

// NAV pricing ranges by strategy: [min%, max%]
const STRATEGY_PRICING: Record<Strategy, [number, number]> = {
  buyout:         [90, 98],
  venture:        [70, 85],
  growth:         [85, 95],
  infrastructure: [95, 102],
  real_estate:    [80, 92],
  credit:         [92, 100],
};

// Base NAV ranges by strategy ($M)
const NAV_RANGES: Record<Strategy, [number, number]> = {
  buyout:         [80, 650],
  venture:        [30, 280],
  growth:         [60, 400],
  infrastructure: [100, 500],
  real_estate:    [50, 350],
  credit:         [70, 300],
};

const TOP_BUYERS: { name: string; baseVolume: number; baseDeals: number }[] = [
  { name: 'Ardian',                    baseVolume: 8.2,  baseDeals: 24 },
  { name: 'Lexington Partners',        baseVolume: 7.5,  baseDeals: 21 },
  { name: 'Coller Capital',            baseVolume: 6.8,  baseDeals: 18 },
  { name: 'HarbourVest Partners',      baseVolume: 5.9,  baseDeals: 16 },
  { name: 'Blackstone Strategic Partners', baseVolume: 5.4, baseDeals: 12 },
  { name: 'Goldman Sachs Vintage',     baseVolume: 4.8,  baseDeals: 14 },
  { name: 'Pantheon Ventures',         baseVolume: 4.2,  baseDeals: 15 },
  { name: 'AlpInvest Partners',        baseVolume: 3.9,  baseDeals: 13 },
  { name: 'CPP Investments',           baseVolume: 3.5,  baseDeals: 8 },
  { name: 'StepStone Group',           baseVolume: 3.1,  baseDeals: 11 },
];

const TOP_SELLERS: { name: string; baseVolume: number; baseDeals: number }[] = [
  { name: 'CalPERS',                   baseVolume: 5.8,  baseDeals: 14 },
  { name: 'New York State Common',     baseVolume: 4.2,  baseDeals: 11 },
  { name: 'Oregon PERS',              baseVolume: 3.5,  baseDeals: 9 },
  { name: 'Teacher Retirement System of Texas', baseVolume: 3.1, baseDeals: 8 },
  { name: 'Washington State Investment Board', baseVolume: 2.8, baseDeals: 7 },
  { name: 'UK Universities Superannuation', baseVolume: 2.5, baseDeals: 6 },
  { name: 'Harvard Management Company', baseVolume: 2.3,  baseDeals: 5 },
  { name: 'GIC (Singapore)',           baseVolume: 2.1,  baseDeals: 6 },
  { name: 'Norges Bank Investment Management', baseVolume: 1.9, baseDeals: 4 },
  { name: 'Ontario Teachers',         baseVolume: 1.7,  baseDeals: 5 },
];

const QUARTERLY_VOLUME_BASE: { quarter: string; baseVolume: number; baseDeals: number }[] = [
  { quarter: 'Q1 2024', baseVolume: 28.5, baseDeals: 185 },
  { quarter: 'Q2 2024', baseVolume: 32.1, baseDeals: 198 },
  { quarter: 'Q3 2024', baseVolume: 30.8, baseDeals: 192 },
  { quarter: 'Q4 2024', baseVolume: 36.4, baseDeals: 215 },
  { quarter: 'Q1 2025', baseVolume: 34.2, baseDeals: 205 },
  { quarter: 'Q2 2025', baseVolume: 38.6, baseDeals: 224 },
  { quarter: 'Q3 2025', baseVolume: 37.1, baseDeals: 218 },
  { quarter: 'Q4 2025', baseVolume: 42.3, baseDeals: 242 },
];

// Unfunded base data by strategy ($B)
const UNFUNDED_BASE: { strategy: Strategy; base: number }[] = [
  { strategy: 'buyout',         base: 420 },
  { strategy: 'growth',         base: 185 },
  { strategy: 'venture',        base: 245 },
  { strategy: 'infrastructure', base: 165 },
  { strategy: 'real_estate',    base: 130 },
  { strategy: 'credit',         base: 155 },
];

// ── Generator ──

function generate(): PrivateEquitySecondariesResponse {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('private-equity-secondaries-' + day));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const pick = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
  const range = (min: number, max: number) => min + rng() * (max - min);

  // Flatten all funds for transaction pool
  const allFunds = GP_NAMES.flatMap(gp =>
    gp.funds.map(f => ({ ...f, gp: gp.gp }))
  );

  // 1. Recent Secondary Transactions (20)
  const today = new Date();
  const usedIndices = new Set<number>();
  const transactions: SecondaryTransaction[] = [];

  for (let i = 0; i < 20; i++) {
    let idx: number;
    if (usedIndices.size < allFunds.length) {
      do { idx = Math.floor(rng() * allFunds.length); } while (usedIndices.has(idx));
      usedIndices.add(idx);
    } else {
      idx = Math.floor(rng() * allFunds.length);
    }

    const fund = allFunds[idx];
    const strategy = fund.strategy;
    const [priceLo, priceHi] = STRATEGY_PRICING[strategy];
    const [navLo, navHi] = NAV_RANGES[strategy];

    const navMillions = round1(range(navLo, navHi));
    const transactionPricePct = round1(range(priceLo, priceHi));
    const discountPremiumPct = round1(transactionPricePct - 100);
    const dealSizeMillions = round1(navMillions * transactionPricePct / 100);

    const daysAgo = Math.floor(rng() * 60);
    const closingDate = new Date(today.getTime() - daysAgo * 86400000).toISOString().slice(0, 10);

    const vintageYear = fund.vintageBase + Math.floor(rng() * 2);

    transactions.push({
      fundName: fund.name,
      strategy,
      vintageYear,
      gp: fund.gp,
      navMillions,
      transactionPricePct,
      discountPremiumPct,
      buyerType: pick(BUYER_TYPES),
      dealSizeMillions,
      closingDate,
    });
  }

  // Sort by closing date descending
  transactions.sort((a, b) => b.closingDate.localeCompare(a.closingDate));

  // 2. Market Pricing by Strategy
  const marketPricing: StrategyPricing[] = STRATEGIES.map(strategy => {
    const [lo, hi] = STRATEGY_PRICING[strategy];
    const avg = round1(jitter((lo + hi) / 2, 0.03));
    const spread = round1(range(1.5, 4.5));
    const count = Math.round(jitter(
      strategy === 'buyout' ? 65 : strategy === 'venture' ? 45 : strategy === 'growth' ? 38 :
      strategy === 'infrastructure' ? 25 : strategy === 'real_estate' ? 30 : 28,
      0.12
    ));
    const volume = round1(jitter(
      strategy === 'buyout' ? 18.5 : strategy === 'venture' ? 8.2 : strategy === 'growth' ? 10.6 :
      strategy === 'infrastructure' ? 7.8 : strategy === 'real_estate' ? 6.4 : 5.8,
      0.10
    ));
    return { strategy, avgPriceOfNav: avg, bidAskSpread: spread, dealCount: count, totalVolume: volume };
  });

  // 3. Volume Statistics
  const quarterlyVolume = QUARTERLY_VOLUME_BASE.map(q => ({
    quarter: q.quarter,
    volumeBillions: round1(jitter(q.baseVolume, 0.08)),
    dealCount: Math.round(jitter(q.baseDeals, 0.08)),
  }));

  const latestQtr = quarterlyVolume[quarterlyVolume.length - 1];
  const yearAgoQtr = quarterlyVolume[quarterlyVolume.length - 5] || quarterlyVolume[0];
  const yoyChangePct = round1(((latestQtr.volumeBillions - yearAgoQtr.volumeBillions) / yearAgoQtr.volumeBillions) * 100);

  // Buyer breakdown
  const buyerPcts = [rng(), rng(), rng(), rng()];
  const buyerTotal = buyerPcts.reduce((s, v) => s + v, 0);
  const buyerBreakdown: { type: BuyerType; pct: number }[] = BUYER_TYPES.map((type, i) => ({
    type,
    pct: round1((buyerPcts[i] / buyerTotal) * 100),
  }));
  // Adjust secondary_fund to be dominant (45-55%)
  const sfIdx = 0;
  const otherSum = buyerBreakdown.filter((_, i) => i !== sfIdx).reduce((s, b) => s + b.pct, 0);
  const sfTarget = round1(range(45, 55));
  const scaleFactor = (100 - sfTarget) / otherSum;
  buyerBreakdown.forEach((b, i) => { if (i !== sfIdx) b.pct = round1(b.pct * scaleFactor); });
  buyerBreakdown[sfIdx].pct = round1(100 - buyerBreakdown.filter((_, i) => i !== sfIdx).reduce((s, b) => s + b.pct, 0));

  // Seller breakdown
  const sellerTypes = ['pension', 'endowment', 'insurance', 'family_office', 'fund_of_funds', 'other'];
  const sellerPcts = sellerTypes.map(() => rng());
  const sellerTotal = sellerPcts.reduce((s, v) => s + v, 0);
  const sellerBreakdown = sellerTypes.map((type, i) => ({
    type,
    pct: round1((sellerPcts[i] / sellerTotal) * 100),
  }));
  // Normalize to 100
  const sellerSum = sellerBreakdown.reduce((s, b) => s + b.pct, 0);
  sellerBreakdown[0].pct = round1(sellerBreakdown[0].pct + (100 - sellerSum));

  const gpLedPct = round1(range(42, 52));
  const lpLedPct = round1(100 - gpLedPct);

  const volumeStats: VolumeStatistics = {
    quarterlyVolume,
    yoyChangePct,
    buyerBreakdown,
    sellerBreakdown,
    gpLedPct,
    lpLedPct,
  };

  // 4. Pricing Trends by Strategy
  const pricingTrends: PricingTrend[] = STRATEGIES.map(strategy => {
    const [lo, hi] = STRATEGY_PRICING[strategy];
    const mid = (lo + hi) / 2;
    const current = round1(jitter(mid, 0.03));
    const sixMonthAgo = round1(current - range(-2.5, 3.5));
    const oneYearAgo = round1(current - range(-1.5, 5.0));

    let trendDirection: 'tightening' | 'widening' | 'stable';
    const diff = current - oneYearAgo;
    if (diff > 1.5) trendDirection = 'tightening';
    else if (diff < -1.5) trendDirection = 'widening';
    else trendDirection = 'stable';

    return { strategy, currentPct: current, sixMonthAgoPct: sixMonthAgo, oneYearAgoPct: oneYearAgo, trendDirection };
  });

  // 5. Top Participants
  const topBuyers: Participant[] = TOP_BUYERS.map(b => ({
    name: b.name,
    volumeBillions: round1(jitter(b.baseVolume, 0.10)),
    dealCount: Math.round(jitter(b.baseDeals, 0.12)),
  }));

  const topSellers: Participant[] = TOP_SELLERS.map(s => ({
    name: s.name,
    volumeBillions: round1(jitter(s.baseVolume, 0.10)),
    dealCount: Math.round(jitter(s.baseDeals, 0.12)),
  }));

  const topParticipants: TopParticipants = { topBuyers, topSellers };

  // 6. Unfunded Commitments Overhang
  const unfundedEntries = UNFUNDED_BASE.map(u => ({
    strategy: u.strategy,
    unfundedBillions: round1(jitter(u.base, 0.08)),
    pctOfTotal: 0,
  }));
  const totalUnfunded = unfundedEntries.reduce((s, u) => s + u.unfundedBillions, 0);
  unfundedEntries.forEach(u => { u.pctOfTotal = round1((u.unfundedBillions / totalUnfunded) * 100); });

  const unfundedOverhang: UnfundedOverhang = {
    totalUnfundedBillions: round1(totalUnfunded),
    byStrategy: unfundedEntries,
    avgFundLife: round1(jitter(12.5, 0.06)),
    overcommitmentRatio: round2(jitter(1.15, 0.05)),
  };

  // 7. NAV Discount Percentile Rankings
  const discountPercentiles: DiscountPercentile[] = STRATEGIES.map(strategy => {
    const [lo, hi] = STRATEGY_PRICING[strategy];
    const mid = (lo + hi) / 2;
    const spread = hi - lo;

    return {
      strategy,
      p10: round1(lo - spread * 0.3 + rng() * 2),
      p25: round1(lo + rng() * 2),
      p50: round1(mid + (rng() - 0.5) * 2),
      p75: round1(hi - spread * 0.15 + rng() * 2),
      p90: round1(hi + rng() * 2),
    };
  });

  return {
    transactions,
    marketPricing,
    volumeStats,
    pricingTrends,
    topParticipants,
    unfundedOverhang,
    discountPercentiles,
    timestamp: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL) return res.json(cache.data);
    const data = generate();
    staleData = cache?.data ?? staleData;
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[PrivateEquitySecondaries] Error:', (err as Error).message);
    if (staleData) return res.json(staleData);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate private equity secondaries data' });
  }
});

export default router;
