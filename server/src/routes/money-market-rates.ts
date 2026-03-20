import { Router } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// ── Helpers ──

function round(n: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

function jitter(rng: () => number, base: number, spread: number): number {
  return base + (rng() - 0.5) * 2 * spread;
}

// ── Types ──

interface OvernightRate {
  name: string;
  id: string;
  rate: number;
  previousDay: number;
  dailyChangeBps: number;
  weekAgo: number;
  monthAgo: number;
}

interface TBillYield {
  tenor: string;
  days: number;
  yield: number;
  discountRate: number;
  investmentRate: number;
  dailyChangeBps: number;
}

interface TermRepoRate {
  tenor: string;
  rate: number;
  previousDay: number;
  dailyChangeBps: number;
}

interface RepoMarket {
  overnightRepoRate: number;
  termRepo: TermRepoRate[];
  totalRRPVolumeBillions: number;
  counterparties: number;
  concentrationTop5Pct: number;
}

interface PaperRate {
  tenor: string;
  rate: number;
}

interface CommercialPaperAndCD {
  aaFinancialCP: PaperRate[];
  aaNonfinancialCP: PaperRate[];
  certificatesOfDeposit: PaperRate[];
  totalCPOutstandingBillions: number;
}

interface SOFRTermRate {
  tenor: string;
  rate: number;
  dailyChangeBps: number;
}

interface EURIBORRate {
  tenor: string;
  rate: number;
  dailyChangeBps: number;
}

interface TransitionRates {
  sofrTermRates: SOFRTermRate[];
  euribor: EURIBORRate[];
  sonia: number;
  soniaDailyChangeBps: number;
  tona: number;
  tonaDailyChangeBps: number;
}

interface FedFundsFuturesContract {
  month: string;
  impliedRate: number;
  probCutBps25: number;
  probHikeBps25: number;
  probUnchanged: number;
}

interface MoneyMarketRatesResponse {
  timestamp: string;
  fedFundsTargetLower: number;
  fedFundsTargetUpper: number;
  keyOvernightRates: OvernightRate[];
  tBillYields: TBillYield[];
  repoMarket: RepoMarket;
  commercialPaperAndCD: CommercialPaperAndCD;
  transitionRates: TransitionRates;
  fedFundsFutures: FedFundsFuturesContract[];
}

// ── Cache ──

let cache: { data: MoneyMarketRatesResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};


// ── Data Generation ──

function generate(): MoneyMarketRatesResponse {
  const rng = seededRandom('money-market-rates');

  // ── 1. Key Overnight Rates ──

  const sofrRate = round(jitter(rng, 4.32, 0.025), 2);
  const effrRate = round(jitter(rng, 4.33, 0.02), 2);
  const obfrRate = round(jitter(rng, 4.32, 0.02), 2);
  const tgcrRate = round(jitter(rng, 4.30, 0.02), 2);
  const bgcrRate = round(jitter(rng, 4.30, 0.02), 2);

  function makeOvernightRate(name: string, id: string, rate: number): OvernightRate {
    const prevDay = round(rate + jitter(rng, 0, 0.02), 2);
    const changeBps = round((rate - prevDay) * 100, 1);
    return {
      name,
      id,
      rate,
      previousDay: prevDay,
      dailyChangeBps: changeBps,
      weekAgo: round(rate + jitter(rng, 0, 0.03), 2),
      monthAgo: round(rate + jitter(rng, 0.02, 0.05), 2),
    };
  }

  const keyOvernightRates: OvernightRate[] = [
    makeOvernightRate('Secured Overnight Financing Rate', 'SOFR', sofrRate),
    makeOvernightRate('Effective Federal Funds Rate', 'EFFR', effrRate),
    makeOvernightRate('Overnight Bank Funding Rate', 'OBFR', obfrRate),
    makeOvernightRate('Tri-Party General Collateral Rate', 'TGCR', tgcrRate),
    makeOvernightRate('Broad General Collateral Rate', 'BGCR', bgcrRate),
  ];

  // ── 2. Treasury Bill Yields ──

  const tbillTenors = [
    { tenor: '4-week',  days: 28,  baseYield: 4.30, baseDiscount: 4.27, baseInvestment: 4.35 },
    { tenor: '8-week',  days: 56,  baseYield: 4.29, baseDiscount: 4.25, baseInvestment: 4.33 },
    { tenor: '13-week', days: 91,  baseYield: 4.27, baseDiscount: 4.22, baseInvestment: 4.31 },
    { tenor: '17-week', days: 119, baseYield: 4.25, baseDiscount: 4.20, baseInvestment: 4.29 },
    { tenor: '26-week', days: 182, baseYield: 4.20, baseDiscount: 4.14, baseInvestment: 4.25 },
    { tenor: '52-week', days: 364, baseYield: 4.05, baseDiscount: 3.95, baseInvestment: 4.12 },
  ];

  const tBillYields: TBillYield[] = tbillTenors.map(t => ({
    tenor: t.tenor,
    days: t.days,
    yield: round(jitter(rng, t.baseYield, 0.06), 3),
    discountRate: round(jitter(rng, t.baseDiscount, 0.06), 3),
    investmentRate: round(jitter(rng, t.baseInvestment, 0.06), 3),
    dailyChangeBps: round(jitter(rng, 0, 1.5), 1),
  }));

  // ── 3. Repo Market ──

  const overnightRepoRate = round(jitter(rng, 4.30, 0.03), 2);

  const termRepoTenors = [
    { tenor: '1-week',  base: 4.31 },
    { tenor: '2-week',  base: 4.32 },
    { tenor: '1-month', base: 4.34 },
    { tenor: '3-month', base: 4.38 },
  ];

  const termRepo: TermRepoRate[] = termRepoTenors.map(t => {
    const rate = round(jitter(rng, t.base, 0.03), 2);
    const prev = round(rate + jitter(rng, 0, 0.02), 2);
    return {
      tenor: t.tenor,
      rate,
      previousDay: prev,
      dailyChangeBps: round((rate - prev) * 100, 1),
    };
  });

  const totalRRPVolumeBillions = round(jitter(rng, 400, 100), 1);
  const counterparties = Math.floor(65 + rng() * 30);
  const concentrationTop5Pct = round(jitter(rng, 28, 6), 1);

  const repoMarket: RepoMarket = {
    overnightRepoRate,
    termRepo,
    totalRRPVolumeBillions,
    counterparties,
    concentrationTop5Pct,
  };

  // ── 4. Commercial Paper & CD Rates ──

  const cpTenors = ['overnight', '7-day', '15-day', '30-day', '60-day', '90-day'];
  const cpFinBase = [4.32, 4.34, 4.36, 4.40, 4.44, 4.48];
  const cpNonFinBase = [4.30, 4.32, 4.34, 4.37, 4.41, 4.44];

  const aaFinancialCP: PaperRate[] = cpTenors.map((tenor, i) => ({
    tenor,
    rate: round(jitter(rng, cpFinBase[i], 0.04), 3),
  }));

  const aaNonfinancialCP: PaperRate[] = cpTenors.map((tenor, i) => ({
    tenor,
    rate: round(jitter(rng, cpNonFinBase[i], 0.04), 3),
  }));

  const cdTenors = ['1-month', '3-month', '6-month', '12-month'];
  const cdBase = [4.38, 4.42, 4.48, 4.55];

  const certificatesOfDeposit: PaperRate[] = cdTenors.map((tenor, i) => ({
    tenor,
    rate: round(jitter(rng, cdBase[i], 0.05), 3),
  }));

  const totalCPOutstandingBillions = round(jitter(rng, 1150, 80), 1);

  const commercialPaperAndCD: CommercialPaperAndCD = {
    aaFinancialCP,
    aaNonfinancialCP,
    certificatesOfDeposit,
    totalCPOutstandingBillions,
  };

  // ── 5. LIBOR Transition / Global Reference Rates ──

  const sofrTermTenors = [
    { tenor: '1-month',  base: 4.33 },
    { tenor: '3-month',  base: 4.35 },
    { tenor: '6-month',  base: 4.30 },
    { tenor: '12-month', base: 4.18 },
  ];

  const sofrTermRates: SOFRTermRate[] = sofrTermTenors.map(t => ({
    tenor: t.tenor,
    rate: round(jitter(rng, t.base, 0.04), 3),
    dailyChangeBps: round(jitter(rng, 0, 1.0), 1),
  }));

  const euriborTenors = [
    { tenor: 'overnight', base: 3.16 },
    { tenor: '1-week',    base: 3.18 },
    { tenor: '1-month',   base: 3.22 },
    { tenor: '3-month',   base: 3.28 },
    { tenor: '6-month',   base: 3.35 },
    { tenor: '12-month',  base: 3.42 },
  ];

  const euribor: EURIBORRate[] = euriborTenors.map(t => ({
    tenor: t.tenor,
    rate: round(jitter(rng, t.base, 0.05), 3),
    dailyChangeBps: round(jitter(rng, 0, 1.0), 1),
  }));

  const soniaRate = round(jitter(rng, 4.70, 0.10), 2);
  const soniaDailyChangeBps = round(jitter(rng, 0, 1.0), 1);

  const tonaRate = round(jitter(rng, 0.05, 0.03), 3);
  const tonaDailyChangeBps = round(jitter(rng, 0, 0.5), 1);

  const transitionRates: TransitionRates = {
    sofrTermRates,
    euribor,
    sonia: soniaRate,
    soniaDailyChangeBps,
    tona: tonaRate,
    tonaDailyChangeBps,
  };

  // ── 6. Fed Funds Futures (Implied Rates) ──

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const fedFundsFutures: FedFundsFuturesContract[] = [];
  let impliedBase = 4.33;

  for (let i = 1; i <= 8; i++) {
    const futureMonth = (currentMonth + i) % 12;
    const futureYear = currentYear + Math.floor((currentMonth + i) / 12);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const label = `${monthNames[futureMonth]} ${futureYear}`;

    // Gradual drift lower reflecting market expectations of easing
    const drift = -0.03 * i + jitter(rng, 0, 0.02);
    impliedBase = round(Math.max(3.50, impliedBase + drift), 3);
    const impliedRate = round(jitter(rng, impliedBase, 0.02), 3);

    // Derive probabilities from distance to nearest 25bp increments
    const distFromCurrent = (4.33 - impliedRate) * 100; // in bps
    const cutsImplied = distFromCurrent / 25;
    const probCut = round(Math.max(0, Math.min(100, cutsImplied * 40 + jitter(rng, 0, 10))), 1);
    const probHike = round(Math.max(0, Math.min(100, -cutsImplied * 15 + jitter(rng, 0, 5))), 1);
    const probUnchanged = round(Math.max(0, 100 - probCut - probHike), 1);

    fedFundsFutures.push({
      month: label,
      impliedRate,
      probCutBps25: probCut,
      probHikeBps25: probHike,
      probUnchanged,
    });
  }

  return {
    timestamp: new Date().toISOString(),
    fedFundsTargetLower: 4.25,
    fedFundsTargetUpper: 4.50,
    keyOvernightRates,
    tBillYields,
    repoMarket,
    commercialPaperAndCD,
    transitionRates,
    fedFundsFutures,
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
    return res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[MoneyMarketRates] Error:', message);

    // Stale fallback
    if (cache.data) {
      return res.json(cache.data);
    }

    return res.status(500).json({ error: 'Failed to generate money market rates data' });
  }
});

export default router;
