import { Router } from 'express';

const router = Router();

// ── Seeded PRNG ──

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ── Types ──

interface OvernightRate {
  rate: string;
  current: number;
  priorDay: number;
  change: number;
  weekAvg: number;
  monthAvg: number;
  high: number;
  low: number;
}

interface TermRate {
  tenor: string;
  rate: number;
  change: number;
  weekChange: number;
  spreadToON: number;
  percentile: number;
}

interface FedFundsImplied {
  meeting: string;
  impliedRate: number;
  changeFromCurrent: number;
  holdProb: number;
  cutProb25: number;
  cutProb50: number;
  hikProb25: number;
  marketPricing: string;
}

interface MoneyMarketFlow {
  category: string;
  totalAUM: number;
  weeklyFlow: number;
  monthlyFlow: number;
  yield: number;
  avgMaturity: number;
}

interface MarketSummary {
  sofrRate: number;
  effrRate: number;
  sofrVolume: number;
  rrpUsage: number;
  fedFundsTarget: string;
  nextFOMC: string;
  impliedCuts: number;
}

interface FundingRateMonitorResponse {
  overnightRates: OvernightRate[];
  termRates: TermRate[];
  fedFundsImplied: FedFundsImplied[];
  moneyMarketFlows: MoneyMarketFlow[];
  marketSummary: MarketSummary;
  generatedAt: string;
}

// ── Static configs ──

const OVERNIGHT_CONFIGS = [
  { rate: 'SOFR',           base: 5.31 },
  { rate: 'EFFR',           base: 5.33 },
  { rate: 'OBFR',           base: 5.32 },
  { rate: 'TGCR',           base: 5.29 },
  { rate: 'BGCR',           base: 5.30 },
  { rate: 'Tri-Party Repo', base: 5.30 },
  { rate: 'Fed RRP',        base: 5.30 },
  { rate: 'IORB',           base: 5.40 },
];

const TERM_CONFIGS = [
  { tenor: '1M SOFR',   base: 5.32 },
  { tenor: '3M SOFR',   base: 5.35 },
  { tenor: '6M SOFR',   base: 5.28 },
  { tenor: '12M SOFR',  base: 5.15 },
  { tenor: '1M T-Bill',  base: 5.28 },
  { tenor: '3M T-Bill',  base: 5.25 },
];

const FOMC_DATES = [
  '2026-01-29', '2026-03-19', '2026-05-07', '2026-06-18',
  '2026-07-30', '2026-09-17', '2026-11-05', '2026-12-17',
  '2027-01-27', '2027-03-17', '2027-05-05', '2027-06-16',
];

const MMF_CONFIGS = [
  { category: 'Govt MMF',          baseAUM: 4.20, baseYield: 5.15, baseMat: 30 },
  { category: 'Prime MMF',         baseAUM: 0.85, baseYield: 5.28, baseMat: 25 },
  { category: 'Tax-Exempt MMF',    baseAUM: 0.13, baseYield: 3.45, baseMat: 18 },
  { category: 'Retail MMF',        baseAUM: 0.62, baseYield: 5.05, baseMat: 28 },
  { category: 'Institutional MMF', baseAUM: 0.35, baseYield: 5.22, baseMat: 22 },
  { category: 'Total',             baseAUM: 6.15, baseYield: 5.12, baseMat: 26 },
];

const SOFR_ON_BASE = 5.31;

// ── Cache ──

const CACHE_TTL = 12 * 60 * 60 * 1000;
let cache: { data: FundingRateMonitorResponse; ts: number } | null = null;

// ── Data generation ──

function generate(): FundingRateMonitorResponse {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-funding-rate-monitor'));
  const jitter = (base: number, bps: number) => {
    const offset = (rng() - 0.5) * 2 * (bps / 10000);
    return Math.round((base + offset) * 10000) / 10000;
  };
  const round4 = (n: number) => Math.round(n * 10000) / 10000;
  const round2 = (n: number) => Math.round(n * 100) / 100;

  // 1. Overnight Rates
  const overnightRates: OvernightRate[] = OVERNIGHT_CONFIGS.map(cfg => {
    const current = round4(jitter(cfg.base, 3));
    const priorDay = round4(jitter(cfg.base, 3));
    const change = round4(current - priorDay);
    const weekAvg = round4(jitter(cfg.base, 2));
    const monthAvg = round4(jitter(cfg.base, 4));
    const high = round4(cfg.base + 0.04 + rng() * 0.06);
    const low = round4(cfg.base - 0.04 - rng() * 0.06);
    return { rate: cfg.rate, current, priorDay, change, weekAvg, monthAvg, high, low };
  });

  // 2. Term Rates
  const termRates: TermRate[] = TERM_CONFIGS.map(cfg => {
    const rate = round4(jitter(cfg.base, 4));
    const change = round4((rng() - 0.5) * 0.006);
    const weekChange = round4((rng() - 0.5) * 0.012);
    const spreadToON = round2((rate - SOFR_ON_BASE) * 100); // bps
    const percentile = Math.round(rng() * 100);
    return { tenor: cfg.tenor, rate, change, weekChange, spreadToON, percentile };
  });

  // 3. Fed Funds Implied — pick next 8 FOMC meetings from today
  const today = new Date();
  const futureMeetings = FOMC_DATES.filter(d => new Date(d) > today).slice(0, 8);
  // If we don't have 8 future meetings, pad with synthetic dates
  while (futureMeetings.length < 8) {
    const last = new Date(futureMeetings[futureMeetings.length - 1] || today);
    last.setDate(last.getDate() + 45);
    futureMeetings.push(last.toISOString().slice(0, 10));
  }

  const currentEffr = 5.33;
  const fedFundsImplied: FedFundsImplied[] = futureMeetings.map((meeting, i) => {
    // Progressive easing: each meeting slightly more easing priced in
    const easingBps = i * 4 + rng() * 6;
    const impliedRate = round4(currentEffr - easingBps / 100);
    const changeFromCurrent = round4(impliedRate - currentEffr);

    // Probability distribution: more easing priced further out
    const cutBias = Math.min(i * 8 + rng() * 10, 85);
    const cutProb50 = round2(Math.max(0, cutBias - 30 - rng() * 10));
    const cutProb25 = round2(Math.max(0, cutBias - cutProb50 - rng() * 5));
    const hikProb25 = round2(Math.max(0, (5 - i * 0.5) + rng() * 3));
    const holdProb = round2(Math.max(0, 100 - cutProb25 - cutProb50 - hikProb25));

    let marketPricing: string;
    if (holdProb > 60) marketPricing = 'Hold';
    else if (cutProb25 > cutProb50 && cutProb25 > holdProb) marketPricing = '-25bp';
    else if (cutProb50 > 30) marketPricing = '-50bp';
    else if (hikProb25 > 30) marketPricing = '+25bp';
    else marketPricing = 'Hold';

    return { meeting, impliedRate, changeFromCurrent, holdProb, cutProb25, cutProb50, hikProb25, marketPricing };
  });

  // 4. Money Market Flows
  const moneyMarketFlows: MoneyMarketFlow[] = MMF_CONFIGS.map(cfg => {
    const totalAUM = round2(jitter(cfg.baseAUM, 200)); // trillions with small jitter
    const weeklyFlow = round2((rng() - 0.45) * cfg.baseAUM * 80); // billions
    const monthlyFlow = round2((rng() - 0.42) * cfg.baseAUM * 200); // billions
    const yld = round2(jitter(cfg.baseYield, 5));
    const avgMaturity = Math.round(cfg.baseMat + (rng() - 0.5) * 10);
    return { category: cfg.category, totalAUM, weeklyFlow, monthlyFlow, yield: yld, avgMaturity };
  });

  // 5. Market Summary
  const sofrEntry = overnightRates.find(r => r.rate === 'SOFR');
  const effrEntry = overnightRates.find(r => r.rate === 'EFFR');
  const impliedCuts = fedFundsImplied.filter(f => f.marketPricing.startsWith('-')).length;

  const marketSummary: MarketSummary = {
    sofrRate: sofrEntry?.current ?? 5.31,
    effrRate: effrEntry?.current ?? 5.33,
    sofrVolume: round2(1800 + (rng() - 0.5) * 600),
    rrpUsage: round2(300 + (rng() - 0.5) * 200),
    fedFundsTarget: '5.25 - 5.50',
    nextFOMC: futureMeetings[0],
    impliedCuts,
  };

  return {
    overnightRates,
    termRates,
    fedFundsImplied,
    moneyMarketFlows,
    marketSummary,
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
    console.error('[FundingRateMonitor] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate funding rate monitor data' });
  }
});

export default router;
