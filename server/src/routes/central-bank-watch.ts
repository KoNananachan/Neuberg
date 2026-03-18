import { Router } from 'express';

const router = Router();

// ── Seeded PRNG ──

function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function mulberry32(a: number): () => number {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ── Cache ──

const CACHE_TTL = 5 * 60 * 1000;
let cacheData: unknown = null;
let cacheTime = 0;

// ── Static configs ──

interface BankConfig {
  name: string;
  abbr: string;
  currentRate: number;
  previousRate: number;
  lastChangeDate: string;
  lastChangeDirection: 'hike' | 'cut' | 'hold';
  nextMeetingDayOffset: number;
  meetingIntervalDays: number;
  ytdChangeBps: number;
}

const BANKS: BankConfig[] = [
  { name: 'Federal Reserve', abbr: 'Fed', currentRate: 5.375, previousRate: 5.50, lastChangeDate: '2024-12-18', lastChangeDirection: 'cut', nextMeetingDayOffset: 42, meetingIntervalDays: 42, ytdChangeBps: -25 },
  { name: 'European Central Bank', abbr: 'ECB', currentRate: 4.00, previousRate: 4.25, lastChangeDate: '2024-10-17', lastChangeDirection: 'cut', nextMeetingDayOffset: 35, meetingIntervalDays: 42, ytdChangeBps: -75 },
  { name: 'Bank of Japan', abbr: 'BOJ', currentRate: 0.50, previousRate: 0.25, lastChangeDate: '2025-01-24', lastChangeDirection: 'hike', nextMeetingDayOffset: 28, meetingIntervalDays: 49, ytdChangeBps: 25 },
  { name: 'Bank of England', abbr: 'BOE', currentRate: 5.25, previousRate: 5.25, lastChangeDate: '2024-09-19', lastChangeDirection: 'hold', nextMeetingDayOffset: 38, meetingIntervalDays: 42, ytdChangeBps: 0 },
  { name: "People's Bank of China", abbr: 'PBOC', currentRate: 3.45, previousRate: 3.55, lastChangeDate: '2024-08-20', lastChangeDirection: 'cut', nextMeetingDayOffset: 20, meetingIntervalDays: 30, ytdChangeBps: -35 },
  { name: 'Reserve Bank of Australia', abbr: 'RBA', currentRate: 4.35, previousRate: 4.35, lastChangeDate: '2023-11-07', lastChangeDirection: 'hold', nextMeetingDayOffset: 45, meetingIntervalDays: 42, ytdChangeBps: 0 },
  { name: 'Bank of Canada', abbr: 'BOC', currentRate: 5.00, previousRate: 5.00, lastChangeDate: '2024-01-24', lastChangeDirection: 'hold', nextMeetingDayOffset: 50, meetingIntervalDays: 49, ytdChangeBps: 0 },
  { name: 'Swiss National Bank', abbr: 'SNB', currentRate: 1.75, previousRate: 1.75, lastChangeDate: '2023-12-14', lastChangeDirection: 'hold', nextMeetingDayOffset: 60, meetingIntervalDays: 91, ytdChangeBps: 0 },
  { name: 'Sveriges Riksbank', abbr: 'Riksbank', currentRate: 4.00, previousRate: 4.00, lastChangeDate: '2024-02-01', lastChangeDirection: 'hold', nextMeetingDayOffset: 55, meetingIntervalDays: 49, ytdChangeBps: 0 },
  { name: 'Reserve Bank of New Zealand', abbr: 'RBNZ', currentRate: 5.50, previousRate: 5.50, lastChangeDate: '2024-02-28', lastChangeDirection: 'hold', nextMeetingDayOffset: 48, meetingIntervalDays: 49, ytdChangeBps: 0 },
];

const RATE_PATH_BANKS = ['Fed', 'ECB', 'BOE'] as const;

const RATE_PATH_BASE: Record<string, { baseRate: number; cutBias: number }> = {
  Fed: { baseRate: 5.375, cutBias: 0.65 },
  ECB: { baseRate: 4.00, cutBias: 0.70 },
  BOE: { baseRate: 5.25, cutBias: 0.60 },
};

const BALANCE_SHEET_BANKS = ['Fed', 'ECB', 'BOJ'] as const;

interface BalanceSheetConfig {
  totalAssets: number;
  govtBonds: number;
  mortgageBonds: number;
  corporateBonds: number;
  percentOfGDP: number;
  peakAssets: number;
}

const BALANCE_SHEET_BASE: Record<string, BalanceSheetConfig> = {
  Fed: { totalAssets: 7.5, govtBonds: 4.8, mortgageBonds: 2.3, corporateBonds: 0, percentOfGDP: 27.2, peakAssets: 8.97 },
  ECB: { totalAssets: 6.6, govtBonds: 4.0, mortgageBonds: 0, corporateBonds: 0.38, percentOfGDP: 48.5, peakAssets: 8.84 },
  BOJ: { totalAssets: 5.4, govtBonds: 4.2, mortgageBonds: 0, corporateBonds: 0.22, percentOfGDP: 127.0, peakAssets: 5.56 },
};

const DIVERGENCE_PAIRS = [
  { pair: 'Fed-ECB', bank1: 'Fed', bank2: 'ECB', fxPair: 'EUR/USD' },
  { pair: 'Fed-BOJ', bank1: 'Fed', bank2: 'BOJ', fxPair: 'USD/JPY' },
  { pair: 'Fed-BOE', bank1: 'Fed', bank2: 'BOE', fxPair: 'GBP/USD' },
  { pair: 'ECB-BOE', bank1: 'ECB', bank2: 'BOE', fxPair: 'EUR/GBP' },
  { pair: 'ECB-BOJ', bank1: 'ECB', bank2: 'BOJ', fxPair: 'EUR/JPY' },
];

interface StatementTemplate {
  bank: string;
  type: 'meeting' | 'minutes' | 'speech';
  phrases: string[];
}

const STATEMENT_TEMPLATES: StatementTemplate[] = [
  { bank: 'Federal Reserve', type: 'meeting', phrases: ['Committee remains attentive to inflation risks', 'Prepared to adjust stance if risks emerge', 'Economic activity expanded at a solid pace', 'Labor market remains tight but gradually rebalancing'] },
  { bank: 'Federal Reserve', type: 'minutes', phrases: ['Several participants noted upside risks to inflation', 'Most agreed policy is well positioned', 'Some members saw risks of easing too soon', 'Participants discussed the uncertain path of disinflation'] },
  { bank: 'Federal Reserve', type: 'speech', phrases: ['We are not yet at the point of considering rate cuts', 'Need sustained evidence inflation is moving to 2%', 'The labor market has come into better balance', 'We will let the data guide our decisions'] },
  { bank: 'European Central Bank', type: 'meeting', phrases: ['Governing Council determined to ensure timely return to target', 'Data-dependent approach remains appropriate', 'Domestic price pressures remain elevated', 'Inflation expected to decline gradually over 2024'] },
  { bank: 'European Central Bank', type: 'speech', phrases: ['We see encouraging signs on the inflation front', 'Wage growth moderating but still above compatible levels', 'The transmission of our policy is working', 'We should not declare victory too early'] },
  { bank: 'Bank of Japan', type: 'meeting', phrases: ['Accommodative financial conditions to be maintained', 'Virtuous cycle between wages and prices strengthening', 'Will adjust degree of easing if outlook realized', 'Underlying inflation expected to gradually increase'] },
  { bank: 'Bank of Japan', type: 'speech', phrases: ['Spring wage negotiations show promising results', 'Conditions for normalizing policy are falling into place', 'We must watch for second-round effects of yen weakness', 'The exit from ultra-loose policy must be carefully managed'] },
  { bank: 'Bank of England', type: 'meeting', phrases: ['Committee voted to maintain Bank Rate at current level', 'Services inflation remains elevated', 'Restrictive monetary policy is weighing on activity', 'Risks around the inflation outlook remain skewed to the upside'] },
  { bank: 'Bank of England', type: 'speech', phrases: ['We need to see more evidence that inflation persistence is fading', 'The economy is evolving broadly in line with expectations', 'We are on the last mile of bringing inflation down', 'Rate cuts will come, but we must be patient'] },
];

// ── Data generation ──

function generate() {
  const seed = hashSeed('central-bank-watch-' + new Date().toISOString().slice(0, 10));
  const rng = mulberry32(seed);
  const round2 = (v: number) => Math.round(v * 100) / 100;
  const round1 = (v: number) => Math.round(v * 10) / 10;
  const pick = <T>(arr: readonly T[] | T[]): T => arr[Math.floor(rng() * arr.length)];
  const jitter = (base: number, range: number) => base + (rng() - 0.5) * 2 * range;

  const today = new Date();

  // Helper: generate a future date from today
  const futureDate = (daysAhead: number): string => {
    const d = new Date(today);
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().slice(0, 10);
  };

  // Helper: generate a past date from today
  const pastDate = (daysAgo: number): string => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
  };

  // ── 1. Rate Decisions ──

  const rateDecisions = BANKS.map((b) => {
    const rateJitter = round2(jitter(b.currentRate, 0.03));
    const currentRate = rateJitter;
    const previousRate = round2(b.previousRate + (rng() - 0.5) * 0.02);

    // Determine last change
    const directions: Array<'hike' | 'cut' | 'hold'> = ['hike', 'cut', 'hold'];
    const lastChangeDirection = rng() < 0.6 ? b.lastChangeDirection : pick(directions);

    // Realistic last change date
    const daysAgoChange = Math.floor(rng() * 90) + 14;
    const lastChangeDate = rng() < 0.5 ? b.lastChangeDate : pastDate(daysAgoChange);

    // Next meeting date
    const meetingOffset = Math.floor(rng() * b.meetingIntervalDays) + 7;
    const nextMeetingDate = futureDate(meetingOffset);

    // Market-implied rate for next meeting
    const impliedShift = (rng() - 0.45) * 0.5; // slight downward bias (cut expectations)
    const marketImpliedRate = round2(currentRate + impliedShift * 0.25);

    // Probabilities sum to 100
    const holdBase = 30 + rng() * 50; // 30-80
    const remainingProb = 100 - holdBase;
    const hikeShare = rng();
    const rawHike = round1(remainingProb * hikeShare);
    const rawCut = round1(remainingProb - rawHike);
    const probabilityHold = round1(100 - rawHike - rawCut);

    // YTD change
    const ytdBase = b.ytdChangeBps;
    const ytdJitter = Math.floor((rng() - 0.5) * 30);
    const ytdChangeBps = ytdBase + ytdJitter;

    return {
      name: b.name,
      currentRate,
      previousRate,
      lastChangeDate,
      lastChangeDirection,
      nextMeetingDate,
      marketImpliedRate,
      probabilityHike: rawHike,
      probabilityHold,
      probabilityCut: rawCut,
      ytdChangeBps,
    };
  });

  // ── 2. Rate Path (Fed, ECB, BOE) ──

  const ratePath: Record<string, Array<{ date: string; impliedRate: number; changeFromCurrent: number; probability: number }>> = {};

  for (const abbr of RATE_PATH_BANKS) {
    const cfg = RATE_PATH_BASE[abbr];
    const currentRate = round2(jitter(cfg.baseRate, 0.02));
    const meetings: Array<{ date: string; impliedRate: number; changeFromCurrent: number; probability: number }> = [];

    let cumulativeRate = currentRate;
    for (let i = 1; i <= 6; i++) {
      const meetingDate = futureDate(i * 42 + Math.floor(rng() * 7));

      // Gradual cuts priced in, with diminishing confidence
      const cutMagnitude = cfg.cutBias * 0.25 * (rng() * 0.6 + 0.7);
      cumulativeRate = round2(cumulativeRate - cutMagnitude);
      // Ensure rate doesn't go negative
      if (cumulativeRate < 0) cumulativeRate = 0;

      const changeFromCurrent = round2(cumulativeRate - currentRate);
      const probability = round1(Math.max(25, 90 - i * 10 - rng() * 8));

      meetings.push({
        date: meetingDate,
        impliedRate: cumulativeRate,
        changeFromCurrent,
        probability,
      });
    }

    ratePath[abbr] = meetings;
  }

  // ── 3. Balance Sheets ──

  const balanceSheets: Record<string, {
    totalAssets: number;
    monthlyChange: number;
    govtBonds: number;
    mortgageBonds: number;
    corporateBonds: number;
    percentOfGDP: number;
    peakAssets: number;
    currentDrawdown: number;
  }> = {};

  for (const abbr of BALANCE_SHEET_BANKS) {
    const cfg = BALANCE_SHEET_BASE[abbr];
    const totalAssets = round2(jitter(cfg.totalAssets, 0.15));
    // Monthly change: slight QT bias
    const monthlyChange = round2((rng() - 0.6) * 80); // -80 to +32 billion
    const govtBonds = round2(jitter(cfg.govtBonds, 0.1));
    const mortgageBonds = cfg.mortgageBonds > 0 ? round2(jitter(cfg.mortgageBonds, 0.08)) : 0;
    const corporateBonds = cfg.corporateBonds > 0 ? round2(jitter(cfg.corporateBonds, 0.05)) : 0;
    const percentOfGDP = round1(jitter(cfg.percentOfGDP, 2.0));
    const peakAssets = round2(cfg.peakAssets + (rng() - 0.5) * 0.1);
    const currentDrawdown = round2(peakAssets - totalAssets);

    balanceSheets[abbr] = {
      totalAssets,
      monthlyChange,
      govtBonds,
      mortgageBonds,
      corporateBonds,
      percentOfGDP,
      peakAssets,
      currentDrawdown: Math.max(0, currentDrawdown),
    };
  }

  // ── 4. Policy Divergence ──

  const bankRateMap: Record<string, number> = {};
  for (const b of BANKS) {
    bankRateMap[b.abbr] = round2(jitter(b.currentRate, 0.03));
  }

  const policyDivergence = DIVERGENCE_PAIRS.map((p) => {
    const rate1 = bankRateMap[p.bank1] ?? 0;
    const rate2 = bankRateMap[p.bank2] ?? 0;
    const currentDiff = round2(rate1 - rate2);

    // 1yr ago diff: slightly different
    const oneYrAgoDiff = round2(currentDiff + (rng() - 0.5) * 1.5);
    const change = round2(currentDiff - oneYrAgoDiff);
    const direction = Math.abs(currentDiff) > Math.abs(oneYrAgoDiff) ? 'widening' : 'narrowing';

    // FX impact: if rate differential widens for bank1, bank1 currency strengthens
    let fxImpact: string;
    if (p.fxPair === 'USD/JPY') {
      fxImpact = change > 0 ? 'USD strength vs JPY' : 'JPY recovery likely';
    } else if (p.fxPair === 'EUR/USD') {
      fxImpact = change > 0 ? 'USD strength vs EUR' : 'EUR support from narrowing spread';
    } else if (p.fxPair === 'GBP/USD') {
      fxImpact = change > 0 ? 'USD strength vs GBP' : 'GBP supported by narrowing differential';
    } else if (p.fxPair === 'EUR/GBP') {
      fxImpact = change > 0 ? 'EUR outperformance vs GBP' : 'GBP supported vs EUR';
    } else {
      fxImpact = change > 0 ? 'First currency strengthening' : 'Second currency strengthening';
    }

    return {
      pair: p.pair,
      fxPair: p.fxPair,
      currentDiff,
      oneYrAgoDiff: round2(oneYrAgoDiff),
      change,
      direction,
      fxImpact,
    };
  });

  // ── 5. Recent Statements ──

  const statementCount = 4 + (rng() > 0.5 ? 1 : 0); // 4 or 5
  const usedTemplates = new Set<number>();
  const recentStatements: Array<{
    bank: string;
    date: string;
    type: 'meeting' | 'minutes' | 'speech';
    hawkishDovishScore: number;
    keyPhrase: string;
    marketReaction: string;
  }> = [];

  for (let i = 0; i < statementCount; i++) {
    let templateIdx: number;
    do {
      templateIdx = Math.floor(rng() * STATEMENT_TEMPLATES.length);
    } while (usedTemplates.has(templateIdx) && usedTemplates.size < STATEMENT_TEMPLATES.length);
    usedTemplates.add(templateIdx);

    const tpl = STATEMENT_TEMPLATES[templateIdx];
    const daysAgo = Math.floor(rng() * 28) + 1;
    const date = pastDate(daysAgo);

    // Hawkish-dovish score: -5 to +5
    const rawScore = (rng() - 0.5) * 10;
    const hawkishDovishScore = Math.round(rawScore * 10) / 10;

    const keyPhrase = pick(tpl.phrases);

    // Market reaction
    const reactions = [
      'Yields rose 3-5bp on hawkish tone',
      'Yields fell 2-4bp as dovish tilt noted',
      'Curve flattened on hold signal',
      'Minimal market reaction, in line with expectations',
      'Dollar strengthened on rate guidance',
      'Risk assets rallied on easing hints',
      'Bond sell-off on tighter-for-longer language',
      'FX volatility spiked on policy surprise',
      'Front-end repriced higher probability of cut',
      'Equity futures dipped on restrictive stance',
    ];
    const marketReaction = pick(reactions);

    recentStatements.push({
      bank: tpl.bank,
      date,
      type: tpl.type,
      hawkishDovishScore,
      keyPhrase,
      marketReaction,
    });
  }

  // Sort statements by date descending
  recentStatements.sort((a, b) => b.date.localeCompare(a.date));

  return {
    rateDecisions,
    ratePath,
    balanceSheets,
    policyDivergence,
    recentStatements,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cacheData && now - cacheTime < CACHE_TTL) {
      return res.json(cacheData);
    }
    const data = generate();
    cacheData = data;
    cacheTime = now;
    res.json(data);
  } catch (err) {
    console.error('[CentralBankWatch] Error:', (err as Error).message);
    if (cacheData) return res.json(cacheData);
    res.status(500).json({ error: 'Failed to generate central bank watch data' });
  }
});

export default router;
