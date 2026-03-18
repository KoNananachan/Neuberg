import { Router } from 'express';

const router = Router();

// ── Types ──

interface CentralBank {
  name: string;
  code: string;
  currency: string;
  currentRate: number;
  previousRate: number;
  lastChangeDate: string;
  lastChangeDirection: string;
  lastChangeBps: number;
  nextMeetingDate: string;
  daysToMeeting: number;
  marketExpectedRate: number;
  marketExpectedChange: number;
  marketProbHike: number;
  marketProbCut: number;
  marketProbHold: number;
  yearEndExpected: number;
  totalCutsExpected: number;
  inflationTarget: number;
  currentInflation: number;
  rateHistory: number[];
  bias: string;
}

interface CentralBankResponse {
  banks: CentralBank[];
  globalAvgRate: number;
  globalBias: string;
  nextMajorMeeting: { bank: string; date: string; daysAway: number };
  timestamp: string;
}

// ── Cache ──

let cache: { data: CentralBankResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 15 * 60_000; // 15 minutes

// ── Static bank configuration ──

interface BankConfig {
  name: string;
  code: string;
  currency: string;
  currentRate: number;
  previousRate: number;
  lastChangeDate: string;
  lastChangeDirection: string;
  lastChangeBps: number;
  nextMeetingDate: string;
  inflationTarget: number;
  currentInflation: number;
  bias: string;
  baseHistory: number[];
}

const BANK_CONFIGS: BankConfig[] = [
  {
    name: 'Federal Reserve',
    code: 'FED',
    currency: 'USD',
    currentRate: 5.375,
    previousRate: 5.50,
    lastChangeDate: '2024-12-18',
    lastChangeDirection: 'CUT',
    lastChangeBps: 25,
    nextMeetingDate: '2025-06-18',
    inflationTarget: 2.0,
    currentInflation: 2.8,
    bias: 'NEUTRAL',
    baseHistory: [0.25, 0.25, 0.50, 1.00, 1.75, 2.50, 3.25, 4.00, 4.50, 4.75, 5.00, 5.25, 5.25, 5.50, 5.50, 5.50, 5.50, 5.50, 5.50, 5.375],
  },
  {
    name: 'European Central Bank',
    code: 'ECB',
    currency: 'EUR',
    currentRate: 3.75,
    previousRate: 4.00,
    lastChangeDate: '2025-01-30',
    lastChangeDirection: 'CUT',
    lastChangeBps: 25,
    nextMeetingDate: '2025-06-05',
    inflationTarget: 2.0,
    currentInflation: 2.4,
    bias: 'DOVISH',
    baseHistory: [0.00, 0.00, 0.00, 0.50, 1.25, 2.00, 2.50, 3.00, 3.50, 3.75, 4.00, 4.25, 4.50, 4.50, 4.50, 4.50, 4.25, 4.00, 4.00, 3.75],
  },
  {
    name: 'Bank of Japan',
    code: 'BOJ',
    currency: 'JPY',
    currentRate: 0.50,
    previousRate: 0.25,
    lastChangeDate: '2025-01-24',
    lastChangeDirection: 'HIKE',
    lastChangeBps: 25,
    nextMeetingDate: '2025-06-13',
    inflationTarget: 2.0,
    currentInflation: 3.2,
    bias: 'HAWKISH',
    baseHistory: [-0.10, -0.10, -0.10, -0.10, -0.10, -0.10, -0.10, -0.10, -0.10, -0.10, -0.10, -0.10, -0.10, 0.00, 0.00, 0.10, 0.10, 0.25, 0.25, 0.50],
  },
  {
    name: 'Bank of England',
    code: 'BOE',
    currency: 'GBP',
    currentRate: 4.50,
    previousRate: 4.75,
    lastChangeDate: '2025-02-06',
    lastChangeDirection: 'CUT',
    lastChangeBps: 25,
    nextMeetingDate: '2025-06-19',
    inflationTarget: 2.0,
    currentInflation: 3.0,
    bias: 'NEUTRAL',
    baseHistory: [0.10, 0.25, 0.50, 1.00, 1.75, 2.25, 3.00, 3.50, 4.00, 4.50, 5.00, 5.25, 5.25, 5.25, 5.25, 5.25, 5.00, 5.00, 4.75, 4.50],
  },
  {
    name: 'Swiss National Bank',
    code: 'SNB',
    currency: 'CHF',
    currentRate: 0.50,
    previousRate: 0.75,
    lastChangeDate: '2025-03-20',
    lastChangeDirection: 'CUT',
    lastChangeBps: 25,
    nextMeetingDate: '2025-06-19',
    inflationTarget: 2.0,
    currentInflation: 1.1,
    bias: 'DOVISH',
    baseHistory: [-0.75, -0.75, -0.75, -0.75, -0.25, 0.50, 1.00, 1.50, 1.75, 1.75, 1.75, 1.75, 1.50, 1.50, 1.25, 1.00, 1.00, 0.75, 0.75, 0.50],
  },
  {
    name: 'Reserve Bank of Australia',
    code: 'RBA',
    currency: 'AUD',
    currentRate: 4.10,
    previousRate: 4.35,
    lastChangeDate: '2025-02-18',
    lastChangeDirection: 'CUT',
    lastChangeBps: 25,
    nextMeetingDate: '2025-05-20',
    inflationTarget: 2.5,
    currentInflation: 3.4,
    bias: 'NEUTRAL',
    baseHistory: [0.10, 0.10, 0.10, 0.35, 0.85, 1.35, 1.85, 2.35, 2.85, 3.10, 3.35, 3.60, 3.85, 4.10, 4.35, 4.35, 4.35, 4.35, 4.35, 4.10],
  },
  {
    name: 'Bank of Canada',
    code: 'BOC',
    currency: 'CAD',
    currentRate: 3.00,
    previousRate: 3.25,
    lastChangeDate: '2025-01-29',
    lastChangeDirection: 'CUT',
    lastChangeBps: 25,
    nextMeetingDate: '2025-06-04',
    inflationTarget: 2.0,
    currentInflation: 2.7,
    bias: 'DOVISH',
    baseHistory: [0.25, 0.25, 0.50, 1.00, 1.50, 2.50, 3.25, 3.75, 4.25, 4.50, 4.75, 5.00, 5.00, 5.00, 5.00, 4.75, 4.25, 3.75, 3.25, 3.00],
  },
  {
    name: 'Sveriges Riksbank',
    code: 'RIKS',
    currency: 'SEK',
    currentRate: 2.25,
    previousRate: 2.50,
    lastChangeDate: '2025-01-29',
    lastChangeDirection: 'CUT',
    lastChangeBps: 25,
    nextMeetingDate: '2025-06-17',
    inflationTarget: 2.0,
    currentInflation: 1.5,
    bias: 'DOVISH',
    baseHistory: [0.00, 0.00, 0.00, 0.75, 1.25, 1.75, 2.50, 3.00, 3.50, 3.75, 4.00, 4.00, 4.00, 4.00, 3.75, 3.50, 3.25, 2.75, 2.50, 2.25],
  },
  {
    name: 'Reserve Bank of New Zealand',
    code: 'RBNZ',
    currency: 'NZD',
    currentRate: 3.75,
    previousRate: 4.25,
    lastChangeDate: '2025-02-19',
    lastChangeDirection: 'CUT',
    lastChangeBps: 50,
    nextMeetingDate: '2025-05-28',
    inflationTarget: 2.0,
    currentInflation: 2.2,
    bias: 'DOVISH',
    baseHistory: [0.25, 0.75, 1.00, 1.50, 2.00, 2.50, 3.00, 4.25, 4.75, 5.25, 5.50, 5.50, 5.50, 5.50, 5.50, 5.50, 5.25, 4.75, 4.25, 3.75],
  },
  {
    name: "People's Bank of China",
    code: 'PBOC',
    currency: 'CNY',
    currentRate: 3.10,
    previousRate: 3.10,
    lastChangeDate: '2024-10-21',
    lastChangeDirection: 'CUT',
    lastChangeBps: 25,
    nextMeetingDate: '2025-06-20',
    inflationTarget: 3.0,
    currentInflation: 0.7,
    bias: 'DOVISH',
    baseHistory: [3.85, 3.85, 3.85, 3.70, 3.65, 3.65, 3.55, 3.55, 3.45, 3.45, 3.45, 3.45, 3.45, 3.45, 3.45, 3.35, 3.35, 3.35, 3.10, 3.10],
  },
];

// ── Data generation helpers ──

function daysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  const diff = target.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function generateMarketExpectations(cfg: BankConfig): {
  marketExpectedRate: number;
  marketExpectedChange: number;
  marketProbHike: number;
  marketProbCut: number;
  marketProbHold: number;
  yearEndExpected: number;
  totalCutsExpected: number;
} {
  // Generate realistic expectations based on bias and current conditions
  const inflationGap = cfg.currentInflation - cfg.inflationTarget;

  let probCut: number;
  let probHike: number;
  let probHold: number;

  if (cfg.bias === 'DOVISH') {
    probCut = 55 + Math.random() * 20;
    probHike = 2 + Math.random() * 5;
    probHold = 100 - probCut - probHike;
  } else if (cfg.bias === 'HAWKISH') {
    probHike = 40 + Math.random() * 25;
    probCut = 3 + Math.random() * 5;
    probHold = 100 - probHike - probCut;
  } else {
    // NEUTRAL
    probHold = 45 + Math.random() * 20;
    probCut = (100 - probHold) * (inflationGap < 0.5 ? 0.65 : 0.35);
    probHike = 100 - probHold - probCut;
  }

  // Round probabilities
  probCut = Math.round(probCut * 10) / 10;
  probHike = Math.round(probHike * 10) / 10;
  probHold = Math.round((100 - probCut - probHike) * 10) / 10;

  // Expected change based on probabilities
  const expectedChangeBps = Math.round(probHike * 0.25 - probCut * 0.25);

  // Market expected rate
  const marketExpectedRate = Math.round((cfg.currentRate + expectedChangeBps / 100) * 1000) / 1000;

  // Year-end expected rate
  let yearEndCuts: number;
  if (cfg.bias === 'DOVISH') {
    yearEndCuts = 50 + Math.round(Math.random() * 75);
  } else if (cfg.bias === 'HAWKISH') {
    yearEndCuts = -25 - Math.round(Math.random() * 50); // Negative = hikes
  } else {
    yearEndCuts = Math.round(Math.random() * 50);
  }

  const yearEndExpected = Math.round((cfg.currentRate - yearEndCuts / 100) * 100) / 100;

  // Total cuts expected over 12 months
  const totalCutsExpected = cfg.bias === 'HAWKISH' ? -yearEndCuts : yearEndCuts;

  return {
    marketExpectedRate,
    marketExpectedChange: expectedChangeBps,
    marketProbHike: probHike,
    marketProbCut: probCut,
    marketProbHold: probHold,
    yearEndExpected,
    totalCutsExpected,
  };
}

function generateCentralBankData(): CentralBankResponse {
  const banks: CentralBank[] = BANK_CONFIGS.map((cfg) => {
    const expectations = generateMarketExpectations(cfg);
    const daysToMeeting = daysUntil(cfg.nextMeetingDate);

    return {
      name: cfg.name,
      code: cfg.code,
      currency: cfg.currency,
      currentRate: cfg.currentRate,
      previousRate: cfg.previousRate,
      lastChangeDate: cfg.lastChangeDate,
      lastChangeDirection: cfg.lastChangeDirection,
      lastChangeBps: cfg.lastChangeBps,
      nextMeetingDate: cfg.nextMeetingDate,
      daysToMeeting,
      ...expectations,
      inflationTarget: cfg.inflationTarget,
      currentInflation: cfg.currentInflation,
      rateHistory: cfg.baseHistory,
      bias: cfg.bias,
    };
  });

  // Calculate global average rate
  const globalAvgRate = Math.round((banks.reduce((sum, b) => sum + b.currentRate, 0) / banks.length) * 100) / 100;

  // Determine global bias
  const dovishCount = banks.filter((b) => b.bias === 'DOVISH').length;
  const hawkishCount = banks.filter((b) => b.bias === 'HAWKISH').length;
  let globalBias: string;
  if (dovishCount > hawkishCount + 2) {
    globalBias = 'EASING';
  } else if (hawkishCount > dovishCount + 2) {
    globalBias = 'TIGHTENING';
  } else {
    globalBias = 'NEUTRAL';
  }

  // Next major meeting (closest among FED, ECB, BOE, BOJ)
  const majorCodes = ['FED', 'ECB', 'BOE', 'BOJ'];
  const majorBanks = banks
    .filter((b) => majorCodes.includes(b.code))
    .sort((a, b) => a.daysToMeeting - b.daysToMeeting);
  const nextMajor = majorBanks[0];

  return {
    banks,
    globalAvgRate,
    globalBias,
    nextMajorMeeting: nextMajor
      ? { bank: nextMajor.code, date: nextMajor.nextMeetingDate, daysAway: nextMajor.daysToMeeting }
      : { bank: 'FED', date: '2025-06-18', daysAway: 0 },
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

    const data = generateCentralBankData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[CentralBanks] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate central bank data' });
  }
});

export default router;
