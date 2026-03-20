import { Router } from 'express';

const router = Router();

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

// ── Types ──

interface G10CarryMatrixEntry {
  funding: string;
  target: string;
  carryBps: number;
  spotRate: number;
  forwardPoints: number;
  impliedYield: number;
}

interface EmCarryOpportunity {
  currency: string;
  policyRate: number;
  realRate: number;
  carryVsUSD: number;
  carryVsJPY: number;
  carryVsEUR: number;
  vol3M: number;
  carryToRisk: number;
  rating: 'attractive' | 'moderate' | 'unattractive';
}

interface CarryToRiskEntry {
  pair: string;
  carry: number;
  vol: number;
  carryToRisk: number;
  rank: number;
  signal: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';
}

interface DailyCarryPerformance {
  date: string;
  g10CarryIndex: number;
  emCarryIndex: number;
  spotReturnG10: number;
  spotReturnEM: number;
  totalReturnG10: number;
  totalReturnEM: number;
}

interface CarryPnlDecomposition {
  pair: string;
  period: string;
  spotReturn: number;
  carryReturn: number;
  totalReturn: number;
  rollDown: number;
  transactionCost: number;
  netReturn: number;
}

interface CarryRiskMetric {
  pair: string;
  maxDrawdown: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  worstMonth: number;
  bestMonth: number;
  winRate: number;
}

interface CentralBankDifferential {
  country: string;
  bank: string;
  currentRate: number;
  expectedRate6M: number;
  rateChangeProb: number;
  direction: 'hike' | 'hold' | 'cut';
  vsUSDSpread: number;
  vsJPYSpread: number;
  lastAction: string;
  nextMeeting: string;
}

interface VolTermStructureEntry {
  pair: string;
  vol1W: number;
  vol1M: number;
  vol3M: number;
  vol6M: number;
  vol1Y: number;
  termSlope: number;
  riskReversal25D: number;
  butterfly25D: number;
}

interface FxCarryTradeMonitorResponse {
  g10CarryMatrix: G10CarryMatrixEntry[];
  emCarryOpportunities: EmCarryOpportunity[];
  carryToRiskRankings: CarryToRiskEntry[];
  historicalPerformance: DailyCarryPerformance[];
  pnlDecomposition: CarryPnlDecomposition[];
  riskMetrics: CarryRiskMetric[];
  centralBankDifferentials: CentralBankDifferential[];
  volTermStructure: VolTermStructureEntry[];
  generatedAt: string;
}

// ── Cache ──

const CACHE_TTL = 12 * 60 * 60 * 1000;
let cache: { data: FxCarryTradeMonitorResponse; ts: number } | null = null;

// ── Static configs ──

const G10_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'NZD', 'CAD', 'NOK', 'SEK'] as const;

const FUNDING_CURRENCIES: string[] = ['JPY', 'CHF', 'EUR'];
const TARGET_CURRENCIES: string[] = ['USD', 'GBP', 'AUD', 'NZD', 'CAD', 'NOK', 'SEK'];

const G10_POLICY_RATES: Record<string, number> = {
  USD: 4.375, EUR: 2.65, GBP: 4.50, JPY: 0.50, CHF: 1.25,
  AUD: 4.10, NZD: 3.75, CAD: 3.00, NOK: 4.25, SEK: 3.25,
};

const G10_SPOT_RATES: Record<string, number> = {
  'JPY/USD': 0.00661, 'JPY/GBP': 0.00521, 'JPY/AUD': 0.00676,
  'JPY/NZD': 0.00715, 'JPY/CAD': 0.00480, 'JPY/NOK': 0.00610,
  'JPY/SEK': 0.00605, 'CHF/USD': 1.1285, 'CHF/GBP': 0.8892,
  'CHF/AUD': 1.1530, 'CHF/NZD': 1.2185, 'CHF/CAD': 0.8195,
  'CHF/NOK': 1.0415, 'CHF/SEK': 1.0325, 'EUR/USD': 1.0845,
  'EUR/GBP': 0.8545, 'EUR/AUD': 1.1080, 'EUR/NZD': 1.1710,
  'EUR/CAD': 0.7878, 'EUR/NOK': 1.0010, 'EUR/SEK': 0.9924,
};

const EM_CURRENCIES = [
  { ccy: 'MXN', rate: 9.50, cpi: 4.2, spotVsUSD: 17.18, creditRating: 'BBB' },
  { ccy: 'BRL', rate: 13.25, cpi: 4.8, spotVsUSD: 4.92, creditRating: 'BB' },
  { ccy: 'ZAR', rate: 7.50, cpi: 5.1, spotVsUSD: 18.62, creditRating: 'BB-' },
  { ccy: 'TRY', rate: 42.50, cpi: 44.5, spotVsUSD: 34.25, creditRating: 'B' },
  { ccy: 'INR', rate: 6.25, cpi: 5.0, spotVsUSD: 83.45, creditRating: 'BBB-' },
  { ccy: 'IDR', rate: 6.00, cpi: 2.8, spotVsUSD: 15825, creditRating: 'BBB' },
] as const;

const CARRY_PAIRS_FOR_RANKING = [
  { pair: 'AUD/JPY', baseCarry: 3.60, baseVol: 10.8 },
  { pair: 'NZD/JPY', baseCarry: 3.25, baseVol: 11.2 },
  { pair: 'GBP/JPY', baseCarry: 4.00, baseVol: 10.5 },
  { pair: 'USD/JPY', baseCarry: 3.875, baseVol: 9.4 },
  { pair: 'MXN/JPY', baseCarry: 9.00, baseVol: 14.5 },
  { pair: 'BRL/JPY', baseCarry: 12.75, baseVol: 16.8 },
  { pair: 'ZAR/JPY', baseCarry: 7.00, baseVol: 15.2 },
  { pair: 'TRY/JPY', baseCarry: 42.00, baseVol: 28.5 },
  { pair: 'INR/JPY', baseCarry: 5.75, baseVol: 8.2 },
  { pair: 'IDR/JPY', baseCarry: 5.50, baseVol: 9.8 },
  { pair: 'AUD/CHF', baseCarry: 2.85, baseVol: 8.5 },
  { pair: 'NZD/CHF', baseCarry: 2.50, baseVol: 9.0 },
  { pair: 'GBP/CHF', baseCarry: 3.25, baseVol: 8.2 },
  { pair: 'USD/CHF', baseCarry: 3.125, baseVol: 7.8 },
  { pair: 'MXN/EUR', baseCarry: 6.85, baseVol: 12.8 },
  { pair: 'BRL/EUR', baseCarry: 10.60, baseVol: 15.2 },
];

const CB_CONFIGS = [
  { country: 'United States', bank: 'Federal Reserve', rate: 4.375, lastAction: '2025-12-18 -25bp', nextMeeting: '2026-03-25', bias: 0 },
  { country: 'Eurozone', bank: 'ECB', rate: 2.65, lastAction: '2026-01-30 -25bp', nextMeeting: '2026-04-17', bias: -1 },
  { country: 'Japan', bank: 'BOJ', rate: 0.50, lastAction: '2025-12-19 +25bp', nextMeeting: '2026-04-25', bias: 1 },
  { country: 'United Kingdom', bank: 'BOE', rate: 4.50, lastAction: '2025-11-07 -25bp', nextMeeting: '2026-03-20', bias: 0 },
  { country: 'Australia', bank: 'RBA', rate: 4.10, lastAction: '2026-02-18 -25bp', nextMeeting: '2026-04-01', bias: -1 },
  { country: 'New Zealand', bank: 'RBNZ', rate: 3.75, lastAction: '2026-02-19 -50bp', nextMeeting: '2026-04-09', bias: -1 },
  { country: 'Canada', bank: 'BOC', rate: 3.00, lastAction: '2026-01-29 -25bp', nextMeeting: '2026-04-16', bias: -1 },
  { country: 'Switzerland', bank: 'SNB', rate: 1.25, lastAction: '2025-12-12 -25bp', nextMeeting: '2026-03-20', bias: -1 },
  { country: 'Norway', bank: 'Norges Bank', rate: 4.25, lastAction: '2025-12-19 hold', nextMeeting: '2026-03-27', bias: 0 },
  { country: 'Sweden', bank: 'Riksbank', rate: 3.25, lastAction: '2026-01-29 -25bp', nextMeeting: '2026-03-26', bias: -1 },
  { country: 'Mexico', bank: 'Banxico', rate: 9.50, lastAction: '2026-02-06 -50bp', nextMeeting: '2026-03-27', bias: -1 },
  { country: 'Brazil', bank: 'BCB', rate: 13.25, lastAction: '2026-01-29 +100bp', nextMeeting: '2026-03-19', bias: 1 },
  { country: 'South Africa', bank: 'SARB', rate: 7.50, lastAction: '2026-01-30 -25bp', nextMeeting: '2026-03-27', bias: 0 },
  { country: 'Turkey', bank: 'CBRT', rate: 42.50, lastAction: '2026-01-23 -250bp', nextMeeting: '2026-04-17', bias: -1 },
  { country: 'India', bank: 'RBI', rate: 6.25, lastAction: '2026-02-07 -25bp', nextMeeting: '2026-04-09', bias: -1 },
  { country: 'Indonesia', bank: 'BI', rate: 6.00, lastAction: '2026-01-15 hold', nextMeeting: '2026-03-19', bias: 0 },
];

const VOL_PAIRS = [
  { pair: 'USD/JPY', base1W: 8.2, base1M: 9.0, base3M: 9.4, base6M: 9.8, base1Y: 10.2, baseRR: -1.2, baseBF: 0.35 },
  { pair: 'AUD/JPY', base1W: 9.5, base1M: 10.2, base3M: 10.8, base6M: 11.2, base1Y: 11.5, baseRR: -1.5, baseBF: 0.42 },
  { pair: 'NZD/JPY', base1W: 10.0, base1M: 10.6, base3M: 11.2, base6M: 11.6, base1Y: 12.0, baseRR: -1.6, baseBF: 0.45 },
  { pair: 'GBP/JPY', base1W: 9.2, base1M: 9.8, base3M: 10.5, base6M: 10.9, base1Y: 11.2, baseRR: -1.3, baseBF: 0.38 },
  { pair: 'EUR/JPY', base1W: 8.5, base1M: 9.2, base3M: 9.8, base6M: 10.2, base1Y: 10.5, baseRR: -1.1, baseBF: 0.32 },
  { pair: 'USD/TRY', base1W: 16.5, base1M: 18.2, base3M: 20.5, base6M: 22.8, base1Y: 25.2, baseRR: 4.5, baseBF: 1.85 },
  { pair: 'USD/MXN', base1W: 10.5, base1M: 11.2, base3M: 12.5, base6M: 13.0, base1Y: 13.5, baseRR: 1.8, baseBF: 0.62 },
  { pair: 'USD/BRL', base1W: 13.2, base1M: 14.5, base3M: 15.8, base6M: 16.5, base1Y: 17.0, baseRR: 2.5, baseBF: 0.95 },
  { pair: 'USD/ZAR', base1W: 13.0, base1M: 14.0, base3M: 14.8, base6M: 15.2, base1Y: 15.6, baseRR: 2.2, baseBF: 0.82 },
  { pair: 'USD/INR', base1W: 4.2, base1M: 5.0, base3M: 5.8, base6M: 6.2, base1Y: 6.5, baseRR: 0.8, baseBF: 0.25 },
  { pair: 'USD/IDR', base1W: 6.8, base1M: 7.5, base3M: 8.2, base6M: 8.8, base1Y: 9.2, baseRR: 1.2, baseBF: 0.38 },
  { pair: 'EUR/CHF', base1W: 4.5, base1M: 5.0, base3M: 5.5, base6M: 5.8, base1Y: 6.0, baseRR: -0.4, baseBF: 0.15 },
];

// ── Data generation ──

function generate(): FxCarryTradeMonitorResponse {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-fx-carry-trade-monitor'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const signedJitter = (range: number) => (rng() - 0.5) * 2 * range;

  // ── G10 Carry Matrix ──
  const g10CarryMatrix: G10CarryMatrixEntry[] = [];
  for (const funding of FUNDING_CURRENCIES) {
    for (const target of TARGET_CURRENCIES) {
      if (funding === target) continue;
      const key = `${funding}/${target}`;
      const baseSpot = G10_SPOT_RATES[key];
      if (baseSpot === undefined) continue;

      const fundingRate = G10_POLICY_RATES[funding];
      const targetRate = G10_POLICY_RATES[target];
      const rawCarryBps = Math.round((targetRate - fundingRate) * 100);
      const carryBps = Math.round(rawCarryBps + signedJitter(15));
      const spotRate = Math.round(jitter(baseSpot, 0.012) * 100000) / 100000;
      // Forward points reflect interest rate differential
      const fwdPts = Math.round((-rawCarryBps * baseSpot * 0.01 / 4) * 100 + signedJitter(50)) / 100;
      const impliedYield = Math.round((targetRate + signedJitter(0.15)) * 100) / 100;

      g10CarryMatrix.push({
        funding,
        target,
        carryBps,
        spotRate,
        forwardPoints: fwdPts,
        impliedYield,
      });
    }
  }

  // ── EM Carry Opportunities ──
  const emCarryOpportunities: EmCarryOpportunity[] = EM_CURRENCIES.map(em => {
    const policyRate = Math.round(jitter(em.rate, 0.02) * 100) / 100;
    const realRate = Math.round((em.rate - em.cpi + signedJitter(0.5)) * 100) / 100;
    const carryVsUSD = Math.round((em.rate - G10_POLICY_RATES.USD + signedJitter(0.3)) * 100) / 100;
    const carryVsJPY = Math.round((em.rate - G10_POLICY_RATES.JPY + signedJitter(0.3)) * 100) / 100;
    const carryVsEUR = Math.round((em.rate - G10_POLICY_RATES.EUR + signedJitter(0.3)) * 100) / 100;

    // EM vol is higher; base vol scaled by credit quality
    const volMultiplier = em.creditRating === 'B' ? 2.2 : em.creditRating === 'BB-' ? 1.6 :
      em.creditRating === 'BB' ? 1.4 : em.creditRating === 'BBB-' ? 1.0 : 0.9;
    const vol3M = Math.round(jitter(8.5 * volMultiplier, 0.10) * 100) / 100;
    const carryToRisk = vol3M > 0 ? Math.round((carryVsUSD / vol3M) * 100) / 100 : 0;

    let rating: 'attractive' | 'moderate' | 'unattractive';
    if (carryToRisk >= 0.6 && realRate > 0) rating = 'attractive';
    else if (carryToRisk >= 0.3) rating = 'moderate';
    else rating = 'unattractive';

    return {
      currency: em.ccy,
      policyRate,
      realRate,
      carryVsUSD,
      carryVsJPY,
      carryVsEUR,
      vol3M,
      carryToRisk,
      rating,
    };
  });

  // ── Carry-to-Risk Rankings ──
  const carryToRiskRankings: CarryToRiskEntry[] = CARRY_PAIRS_FOR_RANKING.map(cfg => {
    const carry = Math.round(jitter(cfg.baseCarry, 0.08) * 100) / 100;
    const vol = Math.round(jitter(cfg.baseVol, 0.10) * 100) / 100;
    const ctr = vol > 0 ? Math.round((carry / vol) * 100) / 100 : 0;

    let signal: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';
    if (ctr >= 0.8) signal = 'strong_buy';
    else if (ctr >= 0.5) signal = 'buy';
    else if (ctr >= 0.25) signal = 'neutral';
    else if (ctr >= 0.1) signal = 'sell';
    else signal = 'strong_sell';

    return { pair: cfg.pair, carry, vol, carryToRisk: ctr, rank: 0, signal };
  });
  carryToRiskRankings.sort((a, b) => b.carryToRisk - a.carryToRisk);
  carryToRiskRankings.forEach((entry, i) => { entry.rank = i + 1; });

  // ── Historical Carry Performance (30 days) ──
  const historicalPerformance: DailyCarryPerformance[] = [];
  let g10CumSpot = 0;
  let emCumSpot = 0;
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - 30);

  for (let d = 0; d < 30; d++) {
    const dt = new Date(baseDate);
    dt.setDate(dt.getDate() + d);
    const dateStr = dt.toISOString().slice(0, 10);

    // Daily carry accrual (annualized rate / 252 trading days)
    const g10DailyCarry = 3.5 / 252;
    const emDailyCarry = 7.2 / 252;

    // Daily spot return: mean-reverting random walk
    const g10SpotDaily = Math.round(signedJitter(0.35) * 100) / 100;
    const emSpotDaily = Math.round(signedJitter(0.55) * 100) / 100;

    g10CumSpot += g10SpotDaily;
    emCumSpot += emSpotDaily;

    const g10CarryAccrued = Math.round(g10DailyCarry * (d + 1) * 100) / 100;
    const emCarryAccrued = Math.round(emDailyCarry * (d + 1) * 100) / 100;

    historicalPerformance.push({
      date: dateStr,
      g10CarryIndex: Math.round((100 + g10CumSpot + g10CarryAccrued) * 100) / 100,
      emCarryIndex: Math.round((100 + emCumSpot + emCarryAccrued) * 100) / 100,
      spotReturnG10: Math.round(g10CumSpot * 100) / 100,
      spotReturnEM: Math.round(emCumSpot * 100) / 100,
      totalReturnG10: Math.round((g10CumSpot + g10CarryAccrued) * 100) / 100,
      totalReturnEM: Math.round((emCumSpot + emCarryAccrued) * 100) / 100,
    });
  }

  // ── P&L Decomposition ──
  const pnlPairs = ['AUD/JPY', 'NZD/JPY', 'MXN/JPY', 'BRL/JPY', 'GBP/CHF', 'USD/TRY', 'USD/ZAR', 'INR/JPY'];
  const pnlPeriods = ['1W', '1M', '3M', 'YTD'];
  const pnlDecomposition: CarryPnlDecomposition[] = [];

  for (const pair of pnlPairs) {
    for (const period of pnlPeriods) {
      const periodMultiplier = period === '1W' ? 7 / 365 : period === '1M' ? 1 / 12 :
        period === '3M' ? 0.25 : 0.22; // YTD ~80 days into year

      // Find matching carry rate for this pair
      const matchedCarry = CARRY_PAIRS_FOR_RANKING.find(c => c.pair === pair);
      const annualCarry = matchedCarry?.baseCarry ?? 4.0;

      const carryReturn = Math.round((annualCarry * periodMultiplier + signedJitter(0.15 * periodMultiplier * 12)) * 100) / 100;
      const spotReturn = Math.round(signedJitter(2.5 * Math.sqrt(periodMultiplier * 12)) * 100) / 100;
      const rollDown = Math.round((0.08 * periodMultiplier * 12 + signedJitter(0.05)) * 100) / 100;
      const transactionCost = Math.round((-0.02 * (period === '1W' ? 1 : period === '1M' ? 1 : period === '3M' ? 2 : 3) + signedJitter(0.01)) * 100) / 100;
      const totalReturn = Math.round((spotReturn + carryReturn) * 100) / 100;
      const netReturn = Math.round((totalReturn + rollDown + transactionCost) * 100) / 100;

      pnlDecomposition.push({
        pair,
        period,
        spotReturn,
        carryReturn,
        totalReturn,
        rollDown,
        transactionCost,
        netReturn,
      });
    }
  }

  // ── Risk Metrics ──
  const riskMetrics: CarryRiskMetric[] = CARRY_PAIRS_FOR_RANKING.map(cfg => {
    const annualizedReturn = Math.round(jitter(cfg.baseCarry, 0.15) * 100) / 100;
    const vol = Math.round(jitter(cfg.baseVol, 0.10) * 100) / 100;
    const maxDD = Math.round((jitter(cfg.baseVol * 1.5, 0.20) + rng() * 3) * 100) / 100;
    const sharpe = vol > 0 ? Math.round(((annualizedReturn / vol) + signedJitter(0.15)) * 100) / 100 : 0;
    const downVol = Math.round(jitter(cfg.baseVol * 0.7, 0.12) * 100) / 100;
    const sortino = downVol > 0 ? Math.round(((annualizedReturn / downVol) + signedJitter(0.2)) * 100) / 100 : 0;
    const calmar = maxDD > 0 ? Math.round(((annualizedReturn / maxDD) + signedJitter(0.08)) * 100) / 100 : 0;
    const worstMonth = Math.round((-jitter(cfg.baseVol * 0.6, 0.15) + signedJitter(1.0)) * 100) / 100;
    const bestMonth = Math.round((jitter(cfg.baseVol * 0.4, 0.15) + jitter(cfg.baseCarry / 12, 0.10)) * 100) / 100;
    const winRate = Math.round((55 + signedJitter(10)) * 10) / 10;

    return {
      pair: cfg.pair,
      maxDrawdown: maxDD,
      sharpeRatio: sharpe,
      sortinoRatio: sortino,
      calmarRatio: calmar,
      worstMonth,
      bestMonth,
      winRate: Math.max(35, Math.min(75, winRate)),
    };
  });

  // ── Central Bank Rate Differentials ──
  const usdRate = G10_POLICY_RATES.USD;
  const jpyRate = G10_POLICY_RATES.JPY;
  const centralBankDifferentials: CentralBankDifferential[] = CB_CONFIGS.map(cfg => {
    const currentRate = Math.round(jitter(cfg.rate, 0.01) * 100) / 100;
    const biasShift = cfg.bias * 0.25;
    const expectedRate6M = Math.round((cfg.rate + biasShift + signedJitter(0.15)) * 100) / 100;
    const changeProb = Math.abs(biasShift) > 0
      ? Math.round((60 + signedJitter(15)) * 10) / 10
      : Math.round((25 + signedJitter(10)) * 10) / 10;

    const direction: 'hike' | 'hold' | 'cut' = cfg.bias > 0 ? 'hike' : cfg.bias < 0 ? 'cut' : 'hold';
    const vsUSDSpread = Math.round((cfg.rate - usdRate) * 100);
    const vsJPYSpread = Math.round((cfg.rate - jpyRate) * 100);

    return {
      country: cfg.country,
      bank: cfg.bank,
      currentRate,
      expectedRate6M,
      rateChangeProb: Math.max(5, Math.min(95, changeProb)),
      direction,
      vsUSDSpread,
      vsJPYSpread,
      lastAction: cfg.lastAction,
      nextMeeting: cfg.nextMeeting,
    };
  });

  // ── FX Volatility Term Structure ──
  const volTermStructure: VolTermStructureEntry[] = VOL_PAIRS.map(cfg => {
    const vol1W = Math.round(jitter(cfg.base1W, 0.08) * 100) / 100;
    const vol1M = Math.round(jitter(cfg.base1M, 0.08) * 100) / 100;
    const vol3M = Math.round(jitter(cfg.base3M, 0.08) * 100) / 100;
    const vol6M = Math.round(jitter(cfg.base6M, 0.08) * 100) / 100;
    const vol1Y = Math.round(jitter(cfg.base1Y, 0.08) * 100) / 100;
    // Term slope: (1Y vol - 1W vol) / 1W vol, positive = contango, negative = backwardation
    const termSlope = Math.round(((vol1Y - vol1W) / vol1W) * 10000) / 100;
    const riskReversal25D = Math.round(jitter(cfg.baseRR, 0.12) * 100) / 100;
    const butterfly25D = Math.round(jitter(cfg.baseBF, 0.10) * 100) / 100;

    return {
      pair: cfg.pair,
      vol1W,
      vol1M,
      vol3M,
      vol6M,
      vol1Y,
      termSlope,
      riskReversal25D,
      butterfly25D,
    };
  });

  return {
    g10CarryMatrix,
    emCarryOpportunities,
    carryToRiskRankings,
    historicalPerformance,
    pnlDecomposition,
    riskMetrics,
    centralBankDifferentials,
    volTermStructure,
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
    console.error('[FxCarryTradeMonitor] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(502).json({ error: 'Failed to generate FX carry trade monitor data' });
  }
});

export default router;
