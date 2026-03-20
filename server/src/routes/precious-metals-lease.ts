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

// -- Types --

interface LeaseRateTenor {
  tenor: string;
  rate: number;
  change1d: number;
}

interface ForwardPriceTenor {
  tenor: string;
  forwardPrice: number;
  basis: number;
  annualizedBasis: number;
}

interface MetalLeaseData {
  metal: string;
  symbol: string;
  spotPrice: number;
  change1d: number;
  change1dPct: number;
  change1w: number;
  change1wPct: number;
  change1m: number;
  change1mPct: number;
  leaseRates: LeaseRateTenor[];
  gofo: GofoRate[] | null;
  forwardPrices: ForwardPriceTenor[];
  curveStructure: 'CONTANGO' | 'BACKWARDATION';
  impliedConvenienceYield: number;
}

interface GofoRate {
  tenor: string;
  rate: number;
  change1d: number;
}

interface LbmaFix {
  metal: string;
  amFix: number | null;
  pmFix: number | null;
  dailyFix: number | null;
  change: number;
  currency: string;
}

interface MetalRatio {
  name: string;
  value: number;
  change1d: number;
  historicalAvg: number;
  percentile: number;
  zScore: number;
}

interface CentralBankHolding {
  country: string;
  totalHoldingsTonnes: number;
  changeMTD: number;
  changeYTD: number;
  action: 'Buyer' | 'Seller' | 'Unchanged';
}

interface EtfHolding {
  ticker: string;
  metal: string;
  holdingsTonnes: number;
  changeToday: number;
  change1w: number;
  change1m: number;
  aumBillions: number;
}

interface TermStructureComparison {
  tenor: string;
  gold: number;
  silver: number;
  platinum: number;
  palladium: number;
}

// -- Seed Data --

interface MetalSeed {
  metal: string;
  symbol: string;
  spotBase: number;
  leaseRateRange: [number, number];
  decimals: number;
}

const METAL_SEEDS: MetalSeed[] = [
  { metal: 'Gold',      symbol: 'XAU', spotBase: 2340,  leaseRateRange: [0.10, 0.50],  decimals: 2 },
  { metal: 'Silver',    symbol: 'XAG', spotBase: 29.50, leaseRateRange: [0.30, 1.50],  decimals: 3 },
  { metal: 'Platinum',  symbol: 'XPT', spotBase: 965,   leaseRateRange: [1.00, 4.00],  decimals: 2 },
  { metal: 'Palladium', symbol: 'XPD', spotBase: 1020,  leaseRateRange: [2.00, 8.00],  decimals: 2 },
];

const TENORS = ['1M', '2M', '3M', '6M', '12M'];
const TENOR_MONTHS = [1, 2, 3, 6, 12];

const CB_SEEDS = [
  { country: 'China',          holdingsBase: 2264,  ytdBias: 1 },
  { country: 'Poland',         holdingsBase: 420,   ytdBias: 1 },
  { country: 'India',          holdingsBase: 854,   ytdBias: 1 },
  { country: 'Turkey',         holdingsBase: 585,   ytdBias: 1 },
  { country: 'Czech Republic', holdingsBase: 42,    ytdBias: 1 },
  { country: 'Singapore',      holdingsBase: 236,   ytdBias: 1 },
  { country: 'Qatar',          holdingsBase: 110,   ytdBias: 1 },
  { country: 'United States',  holdingsBase: 8133,  ytdBias: 0 },
  { country: 'Germany',        holdingsBase: 3352,  ytdBias: 0 },
  { country: 'Kazakhstan',     holdingsBase: 378,   ytdBias: -1 },
];

const ETF_SEEDS = [
  { ticker: 'GLD',  metal: 'Gold',      holdingsBase: 860,    aumBase: 56.8  },
  { ticker: 'SLV',  metal: 'Silver',    holdingsBase: 13400,  aumBase: 10.2  },
  { ticker: 'PPLT', metal: 'Platinum',  holdingsBase: 16.2,   aumBase: 0.88  },
  { ticker: 'PALL', metal: 'Palladium', holdingsBase: 5.1,    aumBase: 0.29  },
];

const CACHE_TTL = 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

// -- Helpers --

function roundTo(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

function jitter(rng: () => number, base: number, pct: number): number {
  return base * (1 + (rng() - 0.5) * 2 * pct);
}

function rangeVal(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

// -- Generator --

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('precious-metals-lease-' + day));

  // 1. Metal-level data (spot, lease rates, forwards, GOFO)
  const metals: MetalLeaseData[] = METAL_SEEDS.map(seed => {
    const spot = roundTo(jitter(rng, seed.spotBase, 0.03), seed.decimals);

    // Price changes
    const change1d = roundTo((rng() - 0.48) * seed.spotBase * 0.012, seed.decimals);
    const change1dPct = roundTo((change1d / (spot - change1d)) * 100, 2);
    const change1w = roundTo((rng() - 0.47) * seed.spotBase * 0.025, seed.decimals);
    const change1wPct = roundTo((change1w / (spot - change1w)) * 100, 2);
    const change1m = roundTo((rng() - 0.46) * seed.spotBase * 0.05, seed.decimals);
    const change1mPct = roundTo((change1m / (spot - change1m)) * 100, 2);

    // Lease rates by tenor — upward-sloping term structure with some noise
    const baseRate = rangeVal(rng, seed.leaseRateRange[0], seed.leaseRateRange[1]);
    const leaseRates: LeaseRateTenor[] = TENORS.map((tenor, i) => {
      const tenorMultiplier = 1 + i * 0.15 + rng() * 0.08;
      const rate = roundTo(baseRate * tenorMultiplier, 4);
      const change1dRate = roundTo((rng() - 0.5) * 0.02, 4);
      return { tenor, rate, change1d: change1dRate };
    });

    // GOFO (Gold Forward Offered Rate) — only for gold
    let gofo: GofoRate[] | null = null;
    if (seed.symbol === 'XAU') {
      const gofoBase = rangeVal(rng, 0.01, 0.15);
      gofo = TENORS.map((tenor, i) => {
        const multiplier = 1 + i * 0.25 + rng() * 0.05;
        const rate = roundTo(gofoBase * multiplier, 4);
        const change1dGofo = roundTo((rng() - 0.5) * 0.005, 4);
        return { tenor, rate, change1d: change1dGofo };
      });
    }

    // Forward prices — derived from lease rate / risk-free rate relationship
    const riskFreeRate = 0.0525; // ~5.25% USD rate
    const isContango = rng() > 0.3;
    const forwardPrices: ForwardPriceTenor[] = TENORS.map((tenor, i) => {
      const months = TENOR_MONTHS[i];
      const yearFraction = months / 12;
      // Forward = Spot * e^((r - lease) * T)
      const leaseRate = leaseRates[i].rate / 100;
      const netCarry = isContango
        ? (riskFreeRate - leaseRate) * yearFraction
        : (leaseRate - riskFreeRate * 0.5) * yearFraction * -1;
      const forwardPrice = roundTo(spot * Math.exp(netCarry + (rng() - 0.5) * 0.001), seed.decimals);
      const basis = roundTo(forwardPrice - spot, seed.decimals);
      const annualizedBasis = months > 0 ? roundTo((basis / spot) * (12 / months) * 100, 4) : 0;
      return { tenor, forwardPrice, basis, annualizedBasis };
    });

    // Curve structure from 3M forward
    const threeMonthBasis = forwardPrices[2].basis;
    const curveStructure: 'CONTANGO' | 'BACKWARDATION' = threeMonthBasis >= 0 ? 'CONTANGO' : 'BACKWARDATION';

    // Implied convenience yield = risk-free rate - lease rate (annualized, from 6M point)
    const sixMonthLease = leaseRates[3].rate / 100;
    const impliedConvenienceYield = roundTo((riskFreeRate - sixMonthLease) * 100, 4);

    return {
      metal: seed.metal,
      symbol: seed.symbol,
      spotPrice: spot,
      change1d,
      change1dPct,
      change1w,
      change1wPct,
      change1m,
      change1mPct,
      leaseRates,
      gofo,
      forwardPrices,
      curveStructure,
      impliedConvenienceYield,
    };
  });

  // 2. LBMA fix prices
  const lbmaFixes: LbmaFix[] = METAL_SEEDS.map(seed => {
    const spotRef = metals.find(m => m.symbol === seed.symbol)!;
    const isGold = seed.symbol === 'XAU';
    const fixBase = spotRef.spotPrice;

    if (isGold) {
      const amFix = roundTo(fixBase * (1 + (rng() - 0.5) * 0.003), 2);
      const pmFix = roundTo(fixBase * (1 + (rng() - 0.5) * 0.003), 2);
      const change = roundTo(pmFix - amFix, 2);
      return { metal: seed.metal, amFix, pmFix, dailyFix: null, change, currency: 'USD' };
    } else {
      const dailyFix = roundTo(fixBase * (1 + (rng() - 0.5) * 0.004), seed.decimals);
      const prevFix = roundTo(fixBase * (1 + (rng() - 0.5) * 0.004), seed.decimals);
      const change = roundTo(dailyFix - prevFix, seed.decimals);
      return { metal: seed.metal, amFix: null, pmFix: null, dailyFix, change, currency: 'USD' };
    }
  });

  // 3. Metal ratios
  const goldSpot = metals[0].spotPrice;
  const silverSpot = metals[1].spotPrice;
  const platinumSpot = metals[2].spotPrice;

  const gsRatio = roundTo(goldSpot / silverSpot, 2);
  const gsHistAvg = 67.5;
  const gsStdDev = 12.8;
  const gsZScore = roundTo((gsRatio - gsHistAvg) / gsStdDev, 2);
  const gsPercentile = roundTo(100 / (1 + Math.exp(-1.7 * gsZScore)), 1);

  const pgRatio = roundTo(platinumSpot / goldSpot, 4);
  const pgHistAvg = 0.62;
  const pgStdDev = 0.18;
  const pgZScore = roundTo((pgRatio - pgHistAvg) / pgStdDev, 2);
  const pgPercentile = roundTo(100 / (1 + Math.exp(-1.7 * pgZScore)), 1);

  const ratios: MetalRatio[] = [
    {
      name: 'Gold/Silver Ratio',
      value: gsRatio,
      change1d: roundTo((rng() - 0.5) * 0.8, 2),
      historicalAvg: gsHistAvg,
      percentile: gsPercentile,
      zScore: gsZScore,
    },
    {
      name: 'Platinum/Gold Ratio',
      value: pgRatio,
      change1d: roundTo((rng() - 0.5) * 0.005, 4),
      historicalAvg: pgHistAvg,
      percentile: pgPercentile,
      zScore: pgZScore,
    },
  ];

  // 4. Central bank gold holdings changes (top 10)
  const centralBanks: CentralBankHolding[] = CB_SEEDS.map(cb => {
    const totalHoldingsTonnes = roundTo(jitter(rng, cb.holdingsBase, 0.005), 1);
    let changeMTD: number;
    let changeYTD: number;
    let action: 'Buyer' | 'Seller' | 'Unchanged';

    if (cb.ytdBias > 0) {
      changeMTD = roundTo(rng() * 12 + 0.5, 1);
      changeYTD = roundTo(rng() * 60 + 5, 1);
      action = 'Buyer';
    } else if (cb.ytdBias < 0) {
      changeMTD = roundTo(-(rng() * 8 + 0.5), 1);
      changeYTD = roundTo(-(rng() * 30 + 3), 1);
      action = 'Seller';
    } else {
      changeMTD = 0;
      changeYTD = 0;
      action = 'Unchanged';
    }

    return {
      country: cb.country,
      totalHoldingsTonnes,
      changeMTD,
      changeYTD,
      action,
    };
  });

  // 5. ETF holdings
  const etfHoldings: EtfHolding[] = ETF_SEEDS.map(etf => {
    const holdingsTonnes = roundTo(jitter(rng, etf.holdingsBase, 0.02), 2);
    const changeToday = roundTo((rng() - 0.5) * etf.holdingsBase * 0.004, 2);
    const change1w = roundTo((rng() - 0.48) * etf.holdingsBase * 0.01, 2);
    const change1m = roundTo((rng() - 0.45) * etf.holdingsBase * 0.025, 2);
    const aumBillions = roundTo(jitter(rng, etf.aumBase, 0.03), 2);

    return {
      ticker: etf.ticker,
      metal: etf.metal,
      holdingsTonnes,
      changeToday,
      change1w,
      change1m,
      aumBillions,
    };
  });

  // 6. Lease rate term structure comparison across metals
  const termStructureComparison: TermStructureComparison[] = TENORS.map((tenor, i) => {
    return {
      tenor,
      gold: metals[0].leaseRates[i].rate,
      silver: metals[1].leaseRates[i].rate,
      platinum: metals[2].leaseRates[i].rate,
      palladium: metals[3].leaseRates[i].rate,
    };
  });

  return {
    metals,
    lbmaFixes,
    ratios,
    centralBanks,
    etfHoldings,
    termStructureComparison,
    generatedAt: new Date().toISOString(),
  };
}

// -- Route --

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[PreciousMetalsLease] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate precious metals lease data' });
  }
});

export default router;
