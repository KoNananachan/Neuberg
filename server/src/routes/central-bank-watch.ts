import { Router } from 'express';

const router = Router();

// ── Seeded PRNG ──

function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) { const char = str.charCodeAt(i); hash = ((hash << 5) - hash) + char; hash |= 0; }
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

const CACHE_TTL = 60 * 60 * 1000;
let cacheData: unknown = null;
let cacheTime = 0;

// ── Static configs ──

interface BankConfig {
  id: string;
  name: string;
  country: string;
  currentRate: number;
  lastChange: number; // bps
  lastChangeDate: string;
  nextMeetingDayOffset: number;
  meetingIntervalDays: number;
  inflationTarget: number;
  baseInflation: number;
  baseBias: 'hawkish' | 'dovish' | 'neutral';
  balanceSheet: number; // trillions in local currency
  balanceSheetChangeYoY: number; // percent
  currency: string;
}

const BANKS: BankConfig[] = [
  { id: 'fed', name: 'Federal Reserve', country: 'United States', currentRate: 5.375, lastChange: -25, lastChangeDate: '2024-12-18', nextMeetingDayOffset: 42, meetingIntervalDays: 42, inflationTarget: 2.0, baseInflation: 3.1, baseBias: 'hawkish', balanceSheet: 7.5, balanceSheetChangeYoY: -8.2, currency: 'USD' },
  { id: 'ecb', name: 'European Central Bank', country: 'Eurozone', currentRate: 4.50, lastChange: -25, lastChangeDate: '2024-10-17', nextMeetingDayOffset: 35, meetingIntervalDays: 42, inflationTarget: 2.0, baseInflation: 2.9, baseBias: 'neutral', balanceSheet: 6.6, balanceSheetChangeYoY: -12.5, currency: 'EUR' },
  { id: 'boj', name: 'Bank of Japan', country: 'Japan', currentRate: -0.10, lastChange: 0, lastChangeDate: '2024-03-19', nextMeetingDayOffset: 28, meetingIntervalDays: 49, inflationTarget: 2.0, baseInflation: 2.8, baseBias: 'dovish', balanceSheet: 756, balanceSheetChangeYoY: 2.1, currency: 'JPY' },
  { id: 'boe', name: 'Bank of England', country: 'United Kingdom', currentRate: 5.25, lastChange: 0, lastChangeDate: '2024-09-19', nextMeetingDayOffset: 38, meetingIntervalDays: 42, inflationTarget: 2.0, baseInflation: 4.0, baseBias: 'hawkish', balanceSheet: 0.82, balanceSheetChangeYoY: -14.3, currency: 'GBP' },
  { id: 'pboc', name: "People's Bank of China", country: 'China', currentRate: 3.45, lastChange: -10, lastChangeDate: '2024-08-20', nextMeetingDayOffset: 20, meetingIntervalDays: 30, inflationTarget: 3.0, baseInflation: 0.7, baseBias: 'dovish', balanceSheet: 45.2, balanceSheetChangeYoY: 3.8, currency: 'CNY' },
  { id: 'rba', name: 'Reserve Bank of Australia', country: 'Australia', currentRate: 4.35, lastChange: 0, lastChangeDate: '2023-11-07', nextMeetingDayOffset: 45, meetingIntervalDays: 42, inflationTarget: 2.5, baseInflation: 3.4, baseBias: 'neutral', balanceSheet: 0.53, balanceSheetChangeYoY: -9.7, currency: 'AUD' },
  { id: 'boc', name: 'Bank of Canada', country: 'Canada', currentRate: 5.00, lastChange: 0, lastChangeDate: '2024-01-24', nextMeetingDayOffset: 50, meetingIntervalDays: 49, inflationTarget: 2.0, baseInflation: 2.9, baseBias: 'neutral', balanceSheet: 0.27, balanceSheetChangeYoY: -18.6, currency: 'CAD' },
  { id: 'snb', name: 'Swiss National Bank', country: 'Switzerland', currentRate: 1.75, lastChange: 0, lastChangeDate: '2023-12-14', nextMeetingDayOffset: 60, meetingIntervalDays: 91, inflationTarget: 2.0, baseInflation: 1.3, baseBias: 'neutral', balanceSheet: 0.84, balanceSheetChangeYoY: -5.1, currency: 'CHF' },
  { id: 'riksbank', name: 'Sveriges Riksbank', country: 'Sweden', currentRate: 4.00, lastChange: 0, lastChangeDate: '2024-02-01', nextMeetingDayOffset: 55, meetingIntervalDays: 49, inflationTarget: 2.0, baseInflation: 3.2, baseBias: 'neutral', balanceSheet: 0.88, balanceSheetChangeYoY: -22.1, currency: 'SEK' },
  { id: 'norges', name: 'Norges Bank', country: 'Norway', currentRate: 4.50, lastChange: 25, lastChangeDate: '2023-12-14', nextMeetingDayOffset: 40, meetingIntervalDays: 49, inflationTarget: 2.0, baseInflation: 4.8, baseBias: 'hawkish', balanceSheet: 0.42, balanceSheetChangeYoY: -3.2, currency: 'NOK' },
  { id: 'rbnz', name: 'Reserve Bank of New Zealand', country: 'New Zealand', currentRate: 5.50, lastChange: 0, lastChangeDate: '2024-02-28', nextMeetingDayOffset: 48, meetingIntervalDays: 49, inflationTarget: 2.0, baseInflation: 4.7, baseBias: 'hawkish', balanceSheet: 0.058, balanceSheetChangeYoY: -11.4, currency: 'NZD' },
  { id: 'rbi', name: 'Reserve Bank of India', country: 'India', currentRate: 6.50, lastChange: 0, lastChangeDate: '2023-02-08', nextMeetingDayOffset: 32, meetingIntervalDays: 56, inflationTarget: 4.0, baseInflation: 5.1, baseBias: 'neutral', balanceSheet: 62.5, balanceSheetChangeYoY: 12.3, currency: 'INR' },
];

const VOTE_SPLITS = ['9-0', '8-1', '7-2', '6-3', '5-4', '8-0-1', '7-1-1', '6-2-1', '5-3-1', '11-0', '10-1', '9-2'];

const GUIDANCE_PHRASES: Record<string, string[]> = {
  fed: [
    'Prepared to adjust the stance of monetary policy as appropriate',
    'Committee remains highly attentive to inflation risks',
    'Economic activity expanded at a solid pace',
    'Labor market remains tight but gradually rebalancing',
    'Need sustained evidence inflation is moving to 2%',
    'We will let the data guide our decisions',
  ],
  ecb: [
    'Governing Council determined to ensure timely return to target',
    'Data-dependent approach remains appropriate',
    'Domestic price pressures remain elevated',
    'The transmission of our policy is working',
    'We should not declare victory too early',
    'Inflation expected to decline gradually',
  ],
  boj: [
    'Accommodative financial conditions to be maintained',
    'Virtuous cycle between wages and prices strengthening',
    'Will adjust degree of easing if outlook realized',
    'The exit from ultra-loose policy must be carefully managed',
    'Spring wage negotiations show promising results',
    'Underlying inflation expected to gradually increase',
  ],
  boe: [
    'Committee voted to maintain Bank Rate at current level',
    'Services inflation remains elevated',
    'Restrictive monetary policy is weighing on activity',
    'We need to see more evidence that inflation persistence is fading',
    'Rate cuts will come, but we must be patient',
    'We are on the last mile of bringing inflation down',
  ],
  pboc: [
    'Prudent monetary policy will be precise and forceful',
    'Will keep liquidity reasonably ample',
    'Focus on supporting the real economy',
    'Will use structural monetary policy tools flexibly',
    'Cross-cyclical adjustment to stabilize expectations',
    'Maintain the yuan exchange rate basically stable',
  ],
  rba: [
    'Returning inflation to target within a reasonable timeframe',
    'Board remains resolute in its determination to return inflation to target',
    'Inflation is still too high and is proving persistent',
    'The path of interest rates will depend upon the data',
    'A further increase in rates cannot be ruled out',
    'Conditions in the labor market continue to ease gradually',
  ],
  boc: [
    'Governing Council remains prepared to raise rates further if needed',
    'Monetary policy is working to ease price pressures',
    'Shelter cost inflation remains elevated',
    'The economy is in excess supply',
    'Looking for sustained downward momentum in core inflation',
    'Progress toward 2% target is expected to be gradual and uneven',
  ],
  snb: [
    'Tighter monetary policy counters inflationary pressure',
    'Swiss franc appreciation has dampened imported inflation',
    'Inflation is likely to remain in the target range',
    'Prepared to be active in the foreign exchange market as necessary',
    'The global economic outlook remains uncertain',
    'Conditions in the mortgage and real estate markets remain under watch',
  ],
  riksbank: [
    'Monetary policy needs to remain contractionary',
    'Inflation is on the way down but risks remain',
    'The krona has strengthened somewhat',
    'Rate cuts may begin if inflation continues falling',
    'Economic activity is expected to be weak in the near term',
    'Underlying inflation trend is still above target',
  ],
  norges: [
    'Policy rate likely to remain at current level for some time',
    'Inflation is above target and the krone is weak',
    'Tighter policy is needed to bring inflation down',
    'Output and employment are expected to decline slightly',
    'Wage growth has been higher than projected',
    'Monetary policy is having a tightening effect on the economy',
  ],
  rbnz: [
    'The OCR needs to remain at restrictive levels for the foreseeable future',
    'Non-tradables inflation is still too high',
    'Demand growth needs to weaken further to reduce inflation',
    'Migration has eased some pressure in the labor market',
    'House price inflation is a risk to the outlook',
    'Committee is confident that inflation will return to target',
  ],
  rbi: [
    'Remains focused on withdrawal of accommodation',
    'Food inflation has been volatile and warrants monitoring',
    'The Indian economy has shown resilience amid global uncertainty',
    'Policy stance remains disinflationary',
    'High-frequency indicators suggest economic activity remains buoyant',
    'Core inflation has moderated but services inflation remains sticky',
  ],
};

const TONE_MAP: Record<string, ('hawkish' | 'dovish' | 'neutral' | 'mixed')[]> = {
  hawkish: ['hawkish', 'hawkish', 'mixed', 'neutral'],
  dovish: ['dovish', 'dovish', 'mixed', 'neutral'],
  neutral: ['neutral', 'mixed', 'hawkish', 'dovish'],
};

// ── Data generation ──

function generate() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const seed = hashSeed('central-bank-watch-' + todayStr);
  const rng = mulberry32(seed);

  const round2 = (v: number) => Math.round(v * 100) / 100;
  const round1 = (v: number) => Math.round(v * 10) / 10;
  const pick = <T>(arr: readonly T[] | T[]): T => arr[Math.floor(rng() * arr.length)];
  const jitter = (base: number, range: number) => base + (rng() - 0.5) * 2 * range;

  const today = new Date();

  const futureDate = (daysAhead: number): string => {
    const d = new Date(today);
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().slice(0, 10);
  };

  const pastDate = (daysAgo: number): string => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
  };

  // ── 1. Banks ──

  const banks = BANKS.map((b) => {
    const rateNoise = round2(jitter(b.currentRate, 0.02));
    const currentRate = rateNoise;
    const lastChange = b.lastChange + (rng() < 0.3 ? (rng() > 0.5 ? 25 : -25) : 0);
    const lastChangeDate = b.lastChangeDate;

    const meetingOffset = Math.floor(rng() * 30) + 10;
    const nextMeeting = futureDate(meetingOffset);

    const inflationTarget = b.inflationTarget;
    const currentInflation = round1(jitter(b.baseInflation, 0.4));

    const biases: Array<'hawkish' | 'dovish' | 'neutral'> = ['hawkish', 'dovish', 'neutral'];
    const bias = rng() < 0.7 ? b.baseBias : pick(biases);

    const balanceSheet = round2(jitter(b.balanceSheet, b.balanceSheet * 0.02));
    const balanceSheetChangeYoY = round1(jitter(b.balanceSheetChangeYoY, 1.5));

    return {
      name: b.name,
      country: b.country,
      currentRate,
      lastChange,
      lastChangeDate,
      nextMeeting,
      inflationTarget,
      currentInflation,
      bias,
      balanceSheet,
      balanceSheetChangeYoY,
      currency: b.currency,
    };
  });

  // ── 2. Rate History ──

  const rateHistory: Record<string, Array<{ date: string; rate: number; change: number; voteSplit: string }>> = {};

  for (const b of BANKS) {
    const decisions: Array<{ date: string; rate: number; change: number; voteSplit: string }> = [];
    let runningRate = b.currentRate;

    for (let i = 0; i < 8; i++) {
      const daysBack = 30 + i * b.meetingIntervalDays + Math.floor(rng() * 7);
      const date = pastDate(daysBack);

      // Earlier decisions may have had different rates
      const changeBps = i === 0 ? b.lastChange :
        rng() < 0.4 ? 0 :
        rng() < 0.6 ? -25 :
        rng() < 0.8 ? 25 : (rng() > 0.5 ? 50 : -50);

      const rate = round2(runningRate);
      const voteSplit = pick(VOTE_SPLITS);

      decisions.push({ date, rate, change: changeBps, voteSplit });

      // Walk rate backwards
      runningRate = round2(runningRate - changeBps / 100);
    }

    rateHistory[b.id] = decisions;
  }

  // ── 3. Market Expectations (Fed, ECB, BOE) ──

  const expectationBanks = ['fed', 'ecb', 'boe'] as const;

  const marketExpectations: Record<string, Array<{
    meeting: string;
    date: string;
    probabilityHike: number;
    probabilityHold: number;
    probabilityCut: number;
  }>> = {};

  for (const bankId of expectationBanks) {
    const cfg = BANKS.find((b) => b.id === bankId)!;
    const meetings: Array<{
      meeting: string;
      date: string;
      probabilityHike: number;
      probabilityHold: number;
      probabilityCut: number;
    }> = [];

    for (let i = 1; i <= 3; i++) {
      const offset = cfg.nextMeetingDayOffset + (i - 1) * cfg.meetingIntervalDays + Math.floor(rng() * 5);
      const date = futureDate(offset);

      // First meeting: more certainty; later meetings: more uncertainty
      let holdProb: number;
      let hikeProb: number;
      let cutProb: number;

      if (i === 1) {
        holdProb = round1(40 + rng() * 40); // 40-80
        const remaining = round1(100 - holdProb);
        cutProb = round1(remaining * (0.5 + rng() * 0.4));
        hikeProb = round1(100 - holdProb - cutProb);
      } else if (i === 2) {
        holdProb = round1(25 + rng() * 35); // 25-60
        const remaining = round1(100 - holdProb);
        cutProb = round1(remaining * (0.4 + rng() * 0.4));
        hikeProb = round1(100 - holdProb - cutProb);
      } else {
        holdProb = round1(15 + rng() * 30); // 15-45
        const remaining = round1(100 - holdProb);
        cutProb = round1(remaining * (0.3 + rng() * 0.5));
        hikeProb = round1(100 - holdProb - cutProb);
      }

      // Ensure non-negative
      hikeProb = Math.max(0, hikeProb);
      cutProb = Math.max(0, cutProb);

      const meetingLabel = i === 1 ? 'Next' : i === 2 ? 'Second' : 'Third';

      meetings.push({
        meeting: meetingLabel,
        date,
        probabilityHike: hikeProb,
        probabilityHold: holdProb,
        probabilityCut: cutProb,
      });
    }

    marketExpectations[bankId] = meetings;
  }

  // ── 4. Forward Guidance ──

  const forwardGuidance: Record<string, {
    lastStatementSummary: string;
    tone: 'hawkish' | 'dovish' | 'neutral' | 'mixed';
    keyPhrase: string;
  }> = {};

  for (const b of BANKS) {
    const phrases = GUIDANCE_PHRASES[b.id] || GUIDANCE_PHRASES.fed;
    const keyPhrase = pick(phrases);

    const toneOptions = TONE_MAP[b.baseBias] || TONE_MAP.neutral;
    const tone = pick(toneOptions);

    // Build a short summary
    const summaries = [
      `${b.name} signals patience on rate changes`,
      `${b.name} emphasizes data-dependent approach`,
      `${b.name} maintains restrictive stance`,
      `${b.name} hints at potential easing ahead`,
      `${b.name} flags upside risks to inflation`,
      `${b.name} notes improving economic conditions`,
      `${b.name} warns of persistent price pressures`,
      `${b.name} sees balanced risks to the outlook`,
    ];
    const lastStatementSummary = pick(summaries);

    forwardGuidance[b.id] = { lastStatementSummary, tone, keyPhrase };
  }

  // ── 5. Global Rate Heatmap ──

  const globalRateHeatmap = banks
    .map((b) => {
      let direction: string;
      const bankCfg = BANKS.find((cfg) => cfg.name === b.name)!;
      if (bankCfg.lastChange > 0) direction = 'up';
      else if (bankCfg.lastChange < 0) direction = 'down';
      else direction = 'unchanged';

      return {
        name: b.name,
        country: b.country,
        currentRate: b.currentRate,
        direction,
      };
    })
    .sort((a, b) => b.currentRate - a.currentRate);

  // ── 6. Policy Timeline ──

  const policyTimeline: Array<{
    bank: string;
    country: string;
    date: string;
    type: string;
  }> = [];

  for (const b of BANKS) {
    // Generate next 2-3 meetings within 3 months
    const numMeetings = 2 + (rng() > 0.5 ? 1 : 0);
    for (let i = 0; i < numMeetings; i++) {
      const offset = b.nextMeetingDayOffset + i * b.meetingIntervalDays + Math.floor(rng() * 5);
      if (offset > 90) break; // Only next 3 months
      policyTimeline.push({
        bank: b.name,
        country: b.country,
        date: futureDate(offset),
        type: 'Rate Decision',
      });
    }
  }

  // Sort by date ascending
  policyTimeline.sort((a, b) => a.date.localeCompare(b.date));

  return {
    banks,
    rateHistory,
    marketExpectations,
    forwardGuidance,
    globalRateHeatmap,
    policyTimeline,
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
    console.error('[CentralBankWatch] Error:', (err as Error)?.message);
    if (cacheData) return res.json(cacheData);
    res.status(500).json({ error: 'Failed to generate central bank watch data' });
  }
});

export default router;
