import { Router } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// ── Helpers ──

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function round(n: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

// ── Types ──

interface MeetingProbability {
  date: string;
  daysUntil: number;
  probabilities: Record<string, number>; // e.g. "-75bp": 0.2, "-50bp": 5.1, ...
  impliedRate: number;
  mostLikely: string;
}

interface RateDecision {
  date: string;
  actual: number;
  expected: number;
  surprise: number;
  direction: 'HIKE' | 'CUT' | 'HOLD';
}

interface ForwardCurve {
  tenor: string;
  oisRate: number;
  change1d: number;
  change1w: number;
}

interface CentralBankData {
  code: string;
  name: string;
  currency: string;
  currentRate: number;
  rateRange: string;
  meetings: MeetingProbability[];
  ratePath: { date: string; expectedRate: number }[];
  terminalRate: number;
  terminalDate: string;
  recentDecisions: RateDecision[];
  forwardCurve: ForwardCurve[];
  hawkDoveScore: number;
  hawkDoveLabel: string;
}

interface RateProbabilityResponse {
  centralBanks: CentralBankData[];
  timestamp: string;
}

// ── Cache ──

let cache: { data: RateProbabilityResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};


// ── Central bank configuration ──

interface BankConfig {
  code: string;
  name: string;
  currency: string;
  currentRate: number;
  rateRange: string;
  meetingIntervalWeeks: number;
  firstMeetingOffsetDays: number;
  bias: 'dovish' | 'neutral' | 'hawkish';
  terminalOffset: number; // bps from current rate
}

const BANK_CONFIGS: BankConfig[] = [
  {
    code: 'FED',
    name: 'Federal Reserve',
    currency: 'USD',
    currentRate: 4.375,
    rateRange: '4.25-4.50%',
    meetingIntervalWeeks: 6,
    firstMeetingOffsetDays: 18,
    bias: 'dovish',
    terminalOffset: -100,
  },
  {
    code: 'ECB',
    name: 'European Central Bank',
    currency: 'EUR',
    currentRate: 2.65,
    rateRange: '2.65%',
    meetingIntervalWeeks: 6,
    firstMeetingOffsetDays: 25,
    bias: 'dovish',
    terminalOffset: -50,
  },
  {
    code: 'BOJ',
    name: 'Bank of Japan',
    currency: 'JPY',
    currentRate: 0.50,
    rateRange: '0.50%',
    meetingIntervalWeeks: 7,
    firstMeetingOffsetDays: 12,
    bias: 'hawkish',
    terminalOffset: 50,
  },
  {
    code: 'BOE',
    name: 'Bank of England',
    currency: 'GBP',
    currentRate: 4.50,
    rateRange: '4.50%',
    meetingIntervalWeeks: 6,
    firstMeetingOffsetDays: 30,
    bias: 'neutral',
    terminalOffset: -75,
  },
  {
    code: 'RBA',
    name: 'Reserve Bank of Australia',
    currency: 'AUD',
    currentRate: 4.10,
    rateRange: '4.10%',
    meetingIntervalWeeks: 5,
    firstMeetingOffsetDays: 22,
    bias: 'neutral',
    terminalOffset: -50,
  },
  {
    code: 'BOC',
    name: 'Bank of Canada',
    currency: 'CAD',
    currentRate: 3.25,
    rateRange: '3.25%',
    meetingIntervalWeeks: 6,
    firstMeetingOffsetDays: 15,
    bias: 'dovish',
    terminalOffset: -75,
  },
  {
    code: 'SNB',
    name: 'Swiss National Bank',
    currency: 'CHF',
    currentRate: 0.50,
    rateRange: '0.50%',
    meetingIntervalWeeks: 13,
    firstMeetingOffsetDays: 35,
    bias: 'neutral',
    terminalOffset: -25,
  },
  {
    code: 'RIKS',
    name: 'Sveriges Riksbank',
    currency: 'SEK',
    currentRate: 2.25,
    rateRange: '2.25%',
    meetingIntervalWeeks: 8,
    firstMeetingOffsetDays: 20,
    bias: 'dovish',
    terminalOffset: -50,
  },
];

// ── Rate change steps ──

const RATE_STEPS = ['-75bp', '-50bp', '-25bp', 'UNCH', '+25bp', '+50bp', '+75bp'] as const;
const STEP_VALUES: Record<string, number> = {
  '-75bp': -0.75,
  '-50bp': -0.50,
  '-25bp': -0.25,
  'UNCH': 0,
  '+25bp': 0.25,
  '+50bp': 0.50,
  '+75bp': 0.75,
};

// ── OIS forward curve tenors ──

const OIS_TENORS = ['1M', '3M', '6M', '1Y', '2Y'] as const;

// ── Data generation ──

function generateMeetingDates(rng: () => number, cfg: BankConfig): string[] {
  const today = new Date();
  const dates: string[] = [];
  const offset = cfg.firstMeetingOffsetDays + Math.floor(rng() * 7) - 3;

  for (let i = 0; i < 8; i++) {
    const meetingDate = new Date(today);
    meetingDate.setDate(today.getDate() + offset + i * cfg.meetingIntervalWeeks * 7);
    // Snap to weekday (avoid weekends)
    const dow = meetingDate.getDay();
    if (dow === 0) meetingDate.setDate(meetingDate.getDate() + 1);
    if (dow === 6) meetingDate.setDate(meetingDate.getDate() + 2);
    dates.push(meetingDate.toISOString().slice(0, 10));
  }

  return dates;
}

function generateProbabilities(
  rng: () => number,
  cfg: BankConfig,
  meetingIndex: number,
): Record<string, number> {
  const probs: Record<string, number> = {};

  // Determine the center of the distribution based on bias and meeting distance
  let centerIdx: number;
  if (cfg.bias === 'dovish') {
    centerIdx = 1 + Math.min(meetingIndex * 0.3, 1.5); // lean toward cuts
  } else if (cfg.bias === 'hawkish') {
    centerIdx = 4 + Math.min(meetingIndex * 0.2, 1.0); // lean toward hikes
  } else {
    centerIdx = 3; // centered on UNCH
  }

  // Further meetings have flatter distributions (more uncertainty)
  const concentration = Math.max(1.5, 6 - meetingIndex * 0.6);

  // Generate raw weights using gaussian-like distribution
  const rawWeights: number[] = RATE_STEPS.map((_, idx) => {
    const dist = idx - centerIdx;
    return Math.exp((-dist * dist) / (2 * concentration)) + rng() * 0.02;
  });

  // Normalize to 100%
  const total = rawWeights.reduce((s, w) => s + w, 0);
  let remaining = 100;

  for (let i = 0; i < RATE_STEPS.length; i++) {
    if (i === RATE_STEPS.length - 1) {
      probs[RATE_STEPS[i]] = round(Math.max(0, remaining), 1);
    } else {
      const pct = round((rawWeights[i] / total) * 100, 1);
      probs[RATE_STEPS[i]] = Math.max(0, pct);
      remaining -= pct;
    }
  }

  return probs;
}

function findMostLikely(probs: Record<string, number>): string {
  let maxKey = 'UNCH';
  let maxVal = 0;
  for (const [key, val] of Object.entries(probs)) {
    if (val > maxVal) {
      maxVal = val;
      maxKey = key;
    }
  }
  return maxKey;
}

function computeImpliedRate(currentRate: number, probs: Record<string, number>): number {
  let expectedChange = 0;
  for (const [step, pct] of Object.entries(probs)) {
    const val = STEP_VALUES[step] ?? 0;
    expectedChange += val * (pct / 100);
  }
  return round(currentRate + expectedChange, 3);
}

function generateRecentDecisions(rng: () => number, cfg: BankConfig): RateDecision[] {
  const decisions: RateDecision[] = [];
  const today = new Date();
  let rate = cfg.currentRate;

  for (let i = 0; i < 5; i++) {
    const decisionDate = new Date(today);
    decisionDate.setDate(today.getDate() - (i + 1) * cfg.meetingIntervalWeeks * 7 - Math.floor(rng() * 5));

    // Determine what happened at this past meeting
    let changeOptions: number[];
    if (cfg.bias === 'dovish') {
      changeOptions = [-0.25, -0.25, 0, 0, -0.50, 0.25];
    } else if (cfg.bias === 'hawkish') {
      changeOptions = [0.25, 0.25, 0, 0, 0.50, -0.25];
    } else {
      changeOptions = [-0.25, 0, 0, 0, 0.25, 0];
    }

    const actualChange = pick(rng, changeOptions);
    const previousRate = rate - actualChange;
    // Market expected might have been slightly different
    const expectedChange = actualChange + (rng() - 0.5) * 0.15;
    const expected = round(previousRate + expectedChange, 2);
    const surprise = round(rate - expected, 2);

    let direction: 'HIKE' | 'CUT' | 'HOLD';
    if (actualChange > 0) direction = 'HIKE';
    else if (actualChange < 0) direction = 'CUT';
    else direction = 'HOLD';

    decisions.push({
      date: decisionDate.toISOString().slice(0, 10),
      actual: round(rate, 2),
      expected: round(expected, 2),
      surprise,
      direction,
    });

    // Walk rate backward
    rate = round(previousRate, 2);
  }

  return decisions;
}

function generateForwardCurve(rng: () => number, cfg: BankConfig): ForwardCurve[] {
  // OIS-implied rates for various tenors
  const terminalRate = cfg.currentRate + cfg.terminalOffset / 100;
  const tenorMonths: Record<string, number> = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12, '2Y': 24 };

  return OIS_TENORS.map((tenor) => {
    const months = tenorMonths[tenor];
    // Interpolate between current rate and terminal rate
    const t = Math.min(months / 24, 1);
    const baseRate = cfg.currentRate + (terminalRate - cfg.currentRate) * t;
    const jitter = (rng() - 0.5) * 0.08;
    const oisRate = round(baseRate + jitter, 3);

    const change1d = round((rng() - 0.5) * 0.04, 3);
    const change1w = round((rng() - 0.5) * 0.10, 3);

    return { tenor, oisRate, change1d, change1w };
  });
}

function generateHawkDoveScore(rng: () => number, cfg: BankConfig): { score: number; label: string } {
  let baseScore: number;
  if (cfg.bias === 'hawkish') {
    baseScore = 30 + rng() * 50; // 30 to 80
  } else if (cfg.bias === 'dovish') {
    baseScore = -80 + rng() * 50; // -80 to -30
  } else {
    baseScore = -30 + rng() * 60; // -30 to 30
  }

  const score = Math.round(Math.max(-100, Math.min(100, baseScore)));

  let label: string;
  if (score >= 60) label = 'Very Hawkish';
  else if (score >= 25) label = 'Hawkish';
  else if (score >= -25) label = 'Neutral';
  else if (score >= -60) label = 'Dovish';
  else label = 'Very Dovish';

  return { score, label };
}

function generateCentralBankData(rng: () => number, cfg: BankConfig): CentralBankData {
  const meetingDates = generateMeetingDates(rng, cfg);
  const today = new Date();

  // Generate meeting-by-meeting probabilities
  const meetings: MeetingProbability[] = meetingDates.map((date, idx) => {
    const meetDate = new Date(date);
    const daysUntil = Math.round((meetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const probabilities = generateProbabilities(rng, cfg, idx);
    const impliedRate = computeImpliedRate(cfg.currentRate, probabilities);
    const mostLikely = findMostLikely(probabilities);

    return { date, daysUntil, probabilities, impliedRate, mostLikely };
  });

  // Rate path: cumulative expected rate at each meeting
  const ratePath: { date: string; expectedRate: number }[] = [];
  let cumulativeRate = cfg.currentRate;
  for (const meeting of meetings) {
    // Use the probability-weighted expected change for this meeting
    let expectedChange = 0;
    for (const [step, pct] of Object.entries(meeting.probabilities)) {
      const val = STEP_VALUES[step] ?? 0;
      expectedChange += val * (pct / 100);
    }
    cumulativeRate = round(cumulativeRate + expectedChange, 3);
    ratePath.push({ date: meeting.date, expectedRate: cumulativeRate });
  }

  // Terminal rate
  const terminalRate = round(cfg.currentRate + cfg.terminalOffset / 100 + (rng() - 0.5) * 0.15, 3);
  // Terminal date: roughly when rate path converges
  const terminalDateObj = new Date(today);
  terminalDateObj.setMonth(terminalDateObj.getMonth() + 9 + Math.floor(rng() * 6));
  const terminalDate = terminalDateObj.toISOString().slice(0, 10);

  // Recent decisions
  const recentDecisions = generateRecentDecisions(rng, cfg);

  // Forward curve
  const forwardCurve = generateForwardCurve(rng, cfg);

  // Hawk/dove score
  const { score: hawkDoveScore, label: hawkDoveLabel } = generateHawkDoveScore(rng, cfg);

  return {
    code: cfg.code,
    name: cfg.name,
    currency: cfg.currency,
    currentRate: cfg.currentRate,
    rateRange: cfg.rateRange,
    meetings,
    ratePath,
    terminalRate,
    terminalDate,
    recentDecisions,
    forwardCurve,
    hawkDoveScore,
    hawkDoveLabel,
  };
}

function generateRateProbabilityData(): RateProbabilityResponse {
  const rng = seededRandom('rate-probability');

  const centralBanks = BANK_CONFIGS.map((cfg) => generateCentralBankData(rng, cfg));

  return {
    centralBanks,
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

    const data = generateRateProbabilityData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[RateProbability] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate rate probability data' });
  }
});

export default router;
