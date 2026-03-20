import { Router } from 'express';

const router = Router();

// ── Deterministic seeded RNG ──

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// ── Types ──

interface ContractConfig {
  name: string;
  underlying: string;
  basePrice: number;
  baseBasis: number;
  baseVolume: number;
  baseOpenInterest: number;
  baseDivYield: number;
  riskFreeRate: number;
  multiplier: number;
  exchange: string;
  currentExpiryMonth: string;
  nextExpiryMonth: string;
}

interface ContractData {
  name: string;
  underlying: string;
  frontMonthPrice: number;
  backMonthPrice: number;
  spotCashIndex: number;
  basis: number;
  basisPct: number;
  fairValue: number;
  richCheap: number;
  volume: number;
  openInterest: number;
  dailyChangePct: number;
  impliedDividendYield: number;
}

interface RollCalendarEntry {
  contract: string;
  underlying: string;
  currentExpiry: string;
  nextExpiry: string;
  rollDate: string;
  daysToRoll: number;
}

interface BasisHistoryPoint {
  date: string;
  esBasis: number;
  nqBasis: number;
}

interface TermStructureEntry {
  contract: string;
  frontMonth: number;
  secondMonth: number;
  thirdMonth: number;
  fourthMonth: number;
  impliedCarry12: number;
  impliedCarry23: number;
  impliedCarry34: number;
}

interface EquityIndexFuturesResponse {
  contracts: ContractData[];
  rollCalendar: RollCalendarEntry[];
  basisHistory: BasisHistoryPoint[];
  termStructure: TermStructureEntry[];
  timestamp: string;
}

// ── Cache ──

let cache: { data: EquityIndexFuturesResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 60 * 60_000; // 5 minutes

// ── Contract configuration ──
// Realistic ranges per the spec:
// ES ~5400-5600, basis 5-15 pts; NQ ~19000-20000, basis 20-60 pts
// Fair value based on rate minus div yield

const CONTRACTS: ContractConfig[] = [
  { name: 'ES',   underlying: 'S&P 500',      basePrice: 5500,  baseBasis: 10,   baseVolume: 1_200_000, baseOpenInterest: 2_800_000, baseDivYield: 1.35, riskFreeRate: 4.35, multiplier: 50,   exchange: 'CME',    currentExpiryMonth: '2026-06', nextExpiryMonth: '2026-09' },
  { name: 'NQ',   underlying: 'NASDAQ 100',   basePrice: 19500, baseBasis: 40,   baseVolume: 650_000,   baseOpenInterest: 1_400_000, baseDivYield: 0.60, riskFreeRate: 4.35, multiplier: 20,   exchange: 'CME',    currentExpiryMonth: '2026-06', nextExpiryMonth: '2026-09' },
  { name: 'YM',   underlying: 'Dow Jones',    basePrice: 42500, baseBasis: 80,   baseVolume: 180_000,   baseOpenInterest: 420_000,   baseDivYield: 1.80, riskFreeRate: 4.35, multiplier: 5,    exchange: 'CBOT',   currentExpiryMonth: '2026-06', nextExpiryMonth: '2026-09' },
  { name: 'RTY',  underlying: 'Russell 2000',  basePrice: 2080,  baseBasis: 4,    baseVolume: 280_000,   baseOpenInterest: 620_000,   baseDivYield: 1.55, riskFreeRate: 4.35, multiplier: 50,   exchange: 'CME',    currentExpiryMonth: '2026-06', nextExpiryMonth: '2026-09' },
  { name: 'FESX', underlying: 'Euro Stoxx 50', basePrice: 5050,  baseBasis: 8,    baseVolume: 420_000,   baseOpenInterest: 1_100_000, baseDivYield: 2.80, riskFreeRate: 2.65, multiplier: 10,   exchange: 'EUREX',  currentExpiryMonth: '2026-06', nextExpiryMonth: '2026-09' },
  { name: 'FDAX', underlying: 'DAX',          basePrice: 18200, baseBasis: 25,   baseVolume: 95_000,    baseOpenInterest: 280_000,   baseDivYield: 2.50, riskFreeRate: 2.65, multiplier: 25,   exchange: 'EUREX',  currentExpiryMonth: '2026-06', nextExpiryMonth: '2026-09' },
  { name: 'NKD',  underlying: 'Nikkei 225',   basePrice: 38500, baseBasis: 60,   baseVolume: 45_000,    baseOpenInterest: 160_000,   baseDivYield: 1.90, riskFreeRate: 0.10, multiplier: 5,    exchange: 'CME',    currentExpiryMonth: '2026-06', nextExpiryMonth: '2026-09' },
  { name: 'HSI',  underlying: 'Hang Seng',    basePrice: 17800, baseBasis: 30,   baseVolume: 120_000,   baseOpenInterest: 350_000,   baseDivYield: 3.20, riskFreeRate: 4.10, multiplier: 50,   exchange: 'HKEX',   currentExpiryMonth: '2026-06', nextExpiryMonth: '2026-09' },
  { name: 'SXF',  underlying: 'S&P/TSX 60',   basePrice: 1280,  baseBasis: 2,    baseVolume: 65_000,    baseOpenInterest: 190_000,   baseDivYield: 2.60, riskFreeRate: 3.50, multiplier: 200,  exchange: 'MX',     currentExpiryMonth: '2026-06', nextExpiryMonth: '2026-09' },
  { name: 'FSMI', underlying: 'SMI',          basePrice: 11600, baseBasis: 12,   baseVolume: 35_000,    baseOpenInterest: 110_000,   baseDivYield: 2.90, riskFreeRate: 1.50, multiplier: 10,   exchange: 'EUREX',  currentExpiryMonth: '2026-06', nextExpiryMonth: '2026-09' },
];

// ── Data generation ──

function generateContracts(rng: () => number): ContractData[] {
  return CONTRACTS.map((cfg) => {
    // Cash / spot index level with realistic daily jitter
    const cashJitter = (rng() - 0.5) * cfg.basePrice * 0.015;
    const spotCashIndex = Math.round((cfg.basePrice + cashJitter) * 100) / 100;

    // Days to front-month expiry (typically 15-75 days)
    const daysToExpiry = 30 + Math.round((rng() - 0.5) * 40);

    // Implied dividend yield with small jitter
    const divYield = cfg.baseDivYield + (rng() - 0.5) * 0.20;
    const impliedDividendYield = Math.round(divYield * 100) / 100;

    // Fair value = cash * (r - d) * T/365
    const carryRate = (cfg.riskFreeRate - divYield) / 100;
    const fairValue = Math.round(spotCashIndex * carryRate * (daysToExpiry / 365) * 100) / 100;

    // Front month price: spot + basis (near fair value with small mispricing)
    const basisJitter = (rng() - 0.5) * cfg.baseBasis * 0.6;
    const basis = Math.round((cfg.baseBasis + basisJitter) * 100) / 100;
    const frontMonthPrice = Math.round((spotCashIndex + basis) * 100) / 100;

    // Back month price: further out, higher carry
    const backMonthCarry = carryRate * ((daysToExpiry + 90) / 365);
    const backMonthBasisJitter = (rng() - 0.5) * cfg.baseBasis * 0.3;
    const backMonthPrice = Math.round((spotCashIndex * (1 + backMonthCarry) + backMonthBasisJitter) * 100) / 100;

    // Basis percentage
    const basisPct = Math.round((basis / spotCashIndex) * 10000 * 100) / 100; // in bps

    // Rich/Cheap: basis vs fair value (positive = rich/expensive, negative = cheap)
    const richCheap = Math.round((basis - fairValue) * 100) / 100;

    // Volume with realistic jitter
    const volume = Math.round(cfg.baseVolume * (0.6 + rng() * 0.8));

    // Open interest with jitter
    const openInterest = Math.round(cfg.baseOpenInterest * (0.85 + rng() * 0.3));

    // Daily change: typically -2% to +2%
    const dailyChangePct = Math.round((rng() - 0.5) * 4.0 * 100) / 100;

    return {
      name: cfg.name,
      underlying: cfg.underlying,
      frontMonthPrice,
      backMonthPrice,
      spotCashIndex,
      basis,
      basisPct,
      fairValue,
      richCheap,
      volume,
      openInterest,
      dailyChangePct,
      impliedDividendYield,
    };
  });
}

function generateRollCalendar(rng: () => number): RollCalendarEntry[] {
  const today = new Date();

  return CONTRACTS.map((cfg) => {
    // Current expiry: 3rd Friday of the expiry month
    const [year, month] = cfg.currentExpiryMonth.split('-').map(Number);
    const currentExpiry = getThirdFriday(year, month);
    const currentExpiryStr = currentExpiry.toISOString().slice(0, 10);

    // Next expiry: 3rd Friday of next quarter month
    const [nextYear, nextMonth] = cfg.nextExpiryMonth.split('-').map(Number);
    const nextExpiry = getThirdFriday(nextYear, nextMonth);
    const nextExpiryStr = nextExpiry.toISOString().slice(0, 10);

    // Roll date: typically 8 calendar days before current expiry (Thursday before expiry week)
    const rollDaysBeforeExpiry = 8 + Math.round((rng() - 0.5) * 2);
    const rollDate = new Date(currentExpiry);
    rollDate.setDate(rollDate.getDate() - rollDaysBeforeExpiry);
    const rollDateStr = rollDate.toISOString().slice(0, 10);

    // Days to roll from today
    const msToRoll = rollDate.getTime() - today.getTime();
    const daysToRoll = Math.max(0, Math.round(msToRoll / (1000 * 60 * 60 * 24)));

    return {
      contract: cfg.name,
      underlying: cfg.underlying,
      currentExpiry: currentExpiryStr,
      nextExpiry: nextExpiryStr,
      rollDate: rollDateStr,
      daysToRoll,
    };
  });
}

function generateBasisHistory(rng: () => number): BasisHistoryPoint[] {
  const entries: BasisHistoryPoint[] = [];
  const today = new Date();

  // ES baseline basis ~10 pts, NQ baseline ~40 pts
  let esBasisWalk = 10.0;
  let nqBasisWalk = 40.0;

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    // Skip weekends
    if (d.getDay() === 0 || d.getDay() === 6) continue;

    const dateStr = d.toISOString().slice(0, 10);

    // Random walk with mean reversion
    esBasisWalk += (rng() - 0.5) * 3.0 + (10.0 - esBasisWalk) * 0.05;
    nqBasisWalk += (rng() - 0.5) * 10.0 + (40.0 - nqBasisWalk) * 0.05;

    entries.push({
      date: dateStr,
      esBasis: Math.round(esBasisWalk * 100) / 100,
      nqBasis: Math.round(nqBasisWalk * 100) / 100,
    });

    if (entries.length >= 20) break;
  }

  // Pad to 20 if weekends reduced count
  while (entries.length < 20) {
    const last = entries[entries.length - 1];
    const d = new Date(last.date);
    d.setDate(d.getDate() + 1);
    // Skip weekends
    if (d.getDay() === 0) d.setDate(d.getDate() + 1);
    if (d.getDay() === 6) d.setDate(d.getDate() + 2);

    esBasisWalk += (rng() - 0.5) * 2.5 + (10.0 - esBasisWalk) * 0.05;
    nqBasisWalk += (rng() - 0.5) * 8.0 + (40.0 - nqBasisWalk) * 0.05;

    entries.push({
      date: d.toISOString().slice(0, 10),
      esBasis: Math.round(esBasisWalk * 100) / 100,
      nqBasis: Math.round(nqBasisWalk * 100) / 100,
    });
  }

  return entries.slice(0, 20);
}

function generateTermStructure(rng: () => number): TermStructureEntry[] {
  // Term structure for ES, NQ, FESX
  const configs = [
    { name: 'ES',   baseSpot: 5500,  rate: 4.35, divYield: 1.35 },
    { name: 'NQ',   baseSpot: 19500, rate: 4.35, divYield: 0.60 },
    { name: 'FESX', baseSpot: 5050,  rate: 2.65, divYield: 2.80 },
  ];

  return configs.map((cfg) => {
    const spotJitter = (rng() - 0.5) * cfg.baseSpot * 0.01;
    const spot = cfg.baseSpot + spotJitter;

    const netCarry = (cfg.rate - cfg.divYield) / 100;

    // Months to expiry: ~1.5, 4.5, 7.5, 10.5 (quarterly cycle)
    const m1Days = 45 + Math.round((rng() - 0.5) * 20);
    const m2Days = m1Days + 91;
    const m3Days = m2Days + 91;
    const m4Days = m3Days + 91;

    const frontMonth = Math.round((spot * (1 + netCarry * m1Days / 365) + (rng() - 0.5) * spot * 0.001) * 100) / 100;
    const secondMonth = Math.round((spot * (1 + netCarry * m2Days / 365) + (rng() - 0.5) * spot * 0.001) * 100) / 100;
    const thirdMonth = Math.round((spot * (1 + netCarry * m3Days / 365) + (rng() - 0.5) * spot * 0.001) * 100) / 100;
    const fourthMonth = Math.round((spot * (1 + netCarry * m4Days / 365) + (rng() - 0.5) * spot * 0.001) * 100) / 100;

    // Implied carry between months (annualized, in bps)
    const impliedCarry12 = Math.round(((secondMonth - frontMonth) / frontMonth) * (365 / 91) * 10000 * 100) / 100;
    const impliedCarry23 = Math.round(((thirdMonth - secondMonth) / secondMonth) * (365 / 91) * 10000 * 100) / 100;
    const impliedCarry34 = Math.round(((fourthMonth - thirdMonth) / thirdMonth) * (365 / 91) * 10000 * 100) / 100;

    return {
      contract: cfg.name,
      frontMonth,
      secondMonth,
      thirdMonth,
      fourthMonth,
      impliedCarry12,
      impliedCarry23,
      impliedCarry34,
    };
  });
}

// ── Helpers ──

function getThirdFriday(year: number, month: number): Date {
  // month is 1-indexed; use UTC to avoid timezone-dependent date shifts
  const d = new Date(Date.UTC(year, month - 1, 1));
  // Find first Friday (UTC day)
  const dayOfWeek = d.getUTCDay();
  const firstFriday = dayOfWeek <= 5 ? (5 - dayOfWeek + 1) : (5 - dayOfWeek + 8);
  // Third Friday = first Friday + 14
  const thirdFriday = firstFriday + 14;
  return new Date(Date.UTC(year, month - 1, thirdFriday));
}

// ── Main generator ──

function generateEquityIndexFuturesData(): EquityIndexFuturesResponse {
  const rng = seededRandom('equity-index-futures');

  const contracts = generateContracts(rng);
  const rollCalendar = generateRollCalendar(rng);
  const basisHistory = generateBasisHistory(rng);
  const termStructure = generateTermStructure(rng);

  return {
    contracts,
    rollCalendar,
    basisHistory,
    termStructure,
    timestamp: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generateEquityIndexFuturesData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[EquityIndexFutures] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate equity index futures data' });
  }
});

export default router;
