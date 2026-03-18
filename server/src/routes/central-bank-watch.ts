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

// -- Central bank base data --

const BANKS = [
  { name: 'Federal Reserve', abbr: 'Fed', rate: 5.375, meetingCycle: 42, lastAction: 'Hold', lastActionDate: '2024-01-31', balanceSheet: 7.5, govtBonds: 4.8, mortgageBonds: 2.3, otherAssets: 0.4, gdpPct: 27.2 },
  { name: 'European Central Bank', abbr: 'ECB', rate: 4.50, meetingCycle: 42, lastAction: 'Hold', lastActionDate: '2024-01-25', balanceSheet: 7.0, govtBonds: 4.9, mortgageBonds: 0.0, otherAssets: 2.1, gdpPct: 48.5 },
  { name: 'Bank of Japan', abbr: 'BOJ', rate: 0.10, meetingCycle: 49, lastAction: 'Hike 25bp', lastActionDate: '2024-03-19', balanceSheet: 4.5, govtBonds: 3.8, mortgageBonds: 0.0, otherAssets: 0.7, gdpPct: 107.5 },
  { name: 'Bank of England', abbr: 'BOE', rate: 5.25, meetingCycle: 42, lastAction: 'Hold', lastActionDate: '2024-02-01', balanceSheet: 1.0, govtBonds: 0.75, mortgageBonds: 0.0, otherAssets: 0.25, gdpPct: 30.8 },
  { name: "People's Bank of China", abbr: 'PBoC', rate: 3.45, meetingCycle: 30, lastAction: 'Cut 25bp', lastActionDate: '2024-02-20', balanceSheet: 5.5, govtBonds: 1.5, mortgageBonds: 0.0, otherAssets: 4.0, gdpPct: 30.5 },
  { name: 'Reserve Bank of Australia', abbr: 'RBA', rate: 4.35, meetingCycle: 42, lastAction: 'Hold', lastActionDate: '2024-02-06', balanceSheet: 0.38, govtBonds: 0.28, mortgageBonds: 0.0, otherAssets: 0.10, gdpPct: 22.0 },
  { name: 'Bank of Canada', abbr: 'BOC', rate: 5.00, meetingCycle: 49, lastAction: 'Hold', lastActionDate: '2024-01-24', balanceSheet: 0.28, govtBonds: 0.22, mortgageBonds: 0.0, otherAssets: 0.06, gdpPct: 13.5 },
  { name: 'Swiss National Bank', abbr: 'SNB', rate: 1.75, meetingCycle: 91, lastAction: 'Hold', lastActionDate: '2023-12-14', balanceSheet: 0.80, govtBonds: 0.10, mortgageBonds: 0.0, otherAssets: 0.70, gdpPct: 103.0 },
  { name: 'Riksbank', abbr: 'Riksbank', rate: 4.00, meetingCycle: 49, lastAction: 'Hold', lastActionDate: '2024-02-01', balanceSheet: 0.14, govtBonds: 0.10, mortgageBonds: 0.02, otherAssets: 0.02, gdpPct: 22.5 },
  { name: 'Reserve Bank of New Zealand', abbr: 'RBNZ', rate: 5.50, meetingCycle: 49, lastAction: 'Hold', lastActionDate: '2024-02-28', balanceSheet: 0.05, govtBonds: 0.04, mortgageBonds: 0.0, otherAssets: 0.01, gdpPct: 19.5 },
];

const STANCES = ['Very Hawkish', 'Hawkish', 'Neutral', 'Dovish', 'Very Dovish'] as const;

const SIGNALS: Record<string, string[]> = {
  'Very Hawkish': ['Rates may need to rise further', 'Inflation risks to the upside', 'Prepared to act forcefully'],
  'Hawkish': ['Higher for longer', 'Not yet time to cut', 'Inflation still elevated'],
  'Neutral': ['Data dependent', 'Balanced risks', 'Monitoring incoming data closely'],
  'Dovish': ['Gradual normalization ahead', 'Inflation trajectory encouraging', 'Open to easing if warranted'],
  'Very Dovish': ['Prepared to ease aggressively', 'Growth risks dominate', 'Accommodative stance appropriate'],
};

const LAST_ACTIONS = ['Hold', 'Hike 25bp', 'Cut 25bp', 'Cut 50bp'] as const;

const DOMINANT_THEMES = [
  'Disinflation Watch', 'Higher for Longer', 'Diverging Policy Paths',
  'Global Easing Cycle', 'Soft Landing Hopes', 'Stagflation Fears',
  'Synchronized Tightening', 'Cautious Optimism',
];

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-central-bank-watch'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const pick = <T>(arr: readonly T[] | T[]): T => arr[Math.floor(rng() * arr.length)];
  const round2 = (v: number) => Math.round(v * 100) / 100;
  const round1 = (v: number) => Math.round(v * 10) / 10;

  // Helper to generate a future meeting date
  const nextMeetingDate = (cycleDays: number, idx: number): string => {
    const base = new Date();
    const offset = Math.floor(rng() * cycleDays) + 7 + idx * 3;
    base.setDate(base.getDate() + offset);
    return base.toISOString().slice(0, 10);
  };

  // 1. Rate Decisions (10 items)
  const rateDecisions = BANKS.map((b, idx) => {
    const rateShift = (rng() - 0.5) * 0.5; // +/- 25bp jitter
    const currentRate = round2(b.rate + rateShift * 0.1);
    const holdProb = round1(40 + rng() * 45); // 40-85%
    const remaining = 100 - holdProb;
    const hikeShare = rng();
    const hikeProb = round1(remaining * hikeShare);
    const cutProb = round1(remaining - hikeProb);
    const expectedShift = hikeProb > cutProb ? 0.25 : cutProb > hikeProb ? -0.25 : 0;
    const expectedRate = round2(currentRate + (holdProb > 60 ? 0 : expectedShift));
    const meetingDate = nextMeetingDate(b.meetingCycle, idx);

    // Vary last action based on RNG
    const actionRoll = rng();
    let lastAction: string;
    let lastActionDate: string;
    if (actionRoll < 0.5) {
      lastAction = b.lastAction;
      lastActionDate = b.lastActionDate;
    } else {
      lastAction = pick(LAST_ACTIONS);
      const daysAgo = Math.floor(rng() * 60) + 14;
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      lastActionDate = d.toISOString().slice(0, 10);
    }

    return {
      bank: b.name,
      currentRate,
      nextMeeting: meetingDate,
      expectedRate,
      holdProb,
      hikeProb,
      cutProb,
      lastAction,
      lastActionDate,
    };
  });

  // 2. Balance Sheets (6 items - major CBs only)
  const balanceSheetBanks = BANKS.slice(0, 6);
  const balanceSheets = balanceSheetBanks.map(b => {
    const totalAssets = round2(jitter(b.balanceSheet, 0.05));
    const monthlyChange = round2((rng() - 0.55) * 0.15 * totalAssets); // slight bias toward shrinkage
    const qoqChange = round2((rng() - 0.52) * 0.04 * totalAssets);
    const govtBonds = round2(jitter(b.govtBonds, 0.04));
    const mortgageBonds = round2(jitter(b.mortgageBonds, 0.04));
    const otherAssets = round2(totalAssets - govtBonds - mortgageBonds);
    const percentGDP = round1(jitter(b.gdpPct, 0.03));

    return {
      bank: b.name,
      totalAssets,
      monthlyChange,
      qoqChange,
      govtBonds,
      mortgageBonds: mortgageBonds > 0 ? mortgageBonds : 0,
      otherAssets: round2(Math.max(otherAssets, 0)),
      percentGDP,
    };
  });

  // 3. Forward Guidance (6 items)
  const guidanceBanks = BANKS.slice(0, 6);
  const forwardGuidance = guidanceBanks.map(b => {
    const stance = pick(STANCES);
    const signal = pick(SIGNALS[stance]);
    const confidence = round1(45 + rng() * 50); // 45-95%
    const marketPricing = round2(b.rate + (rng() - 0.5) * 1.5);
    const daysAgo = Math.floor(rng() * 21) + 1;
    const updated = new Date();
    updated.setDate(updated.getDate() - daysAgo);
    const lastUpdated = updated.toISOString().slice(0, 10);

    return {
      bank: b.name,
      stance,
      signal,
      confidence,
      marketPricing,
      lastUpdated,
    };
  });

  // 4. Rate Paths (6 items)
  const pathBanks = BANKS.slice(0, 6);
  const ratePaths = pathBanks.map(b => {
    const current = round2(jitter(b.rate, 0.02));
    // Generate a plausible forward curve
    const direction = rng() > 0.5 ? -1 : 1; // bias toward cuts or hikes
    const pace = rng() * 0.25 + 0.05; // 5-30bp per quarter
    const plus3m = round2(current + direction * pace * (0.8 + rng() * 0.4));
    const plus6m = round2(current + direction * pace * 2 * (0.8 + rng() * 0.4));
    const plus12m = round2(current + direction * pace * 3.5 * (0.8 + rng() * 0.4));
    const plus24m = round2(current + direction * pace * 5 * (0.8 + rng() * 0.4));
    const terminalRate = direction < 0
      ? round2(Math.max(current - rng() * 2, 0))
      : round2(current + rng() * 1.5);
    const terminalMonths = Math.floor(rng() * 18) + 6;
    const terminalDateObj = new Date();
    terminalDateObj.setMonth(terminalDateObj.getMonth() + terminalMonths);
    const terminalDate = terminalDateObj.toISOString().slice(0, 7); // YYYY-MM

    return {
      bank: b.name,
      current,
      plus3m,
      plus6m,
      plus12m,
      plus24m,
      terminalRate,
      terminalDate,
    };
  });

  // 5. Market Summary
  const allCurrentRates = rateDecisions.map(r => r.currentRate);
  const globalAvgRate = round2(allCurrentRates.reduce((a, r) => a + r, 0) / allCurrentRates.length);
  const netHawkishCount = forwardGuidance.filter(g =>
    g.stance === 'Hawkish' || g.stance === 'Very Hawkish'
  ).length - forwardGuidance.filter(g =>
    g.stance === 'Dovish' || g.stance === 'Very Dovish'
  ).length;

  // Find the nearest upcoming meeting
  const sorted = [...rateDecisions].sort((a, b) => a.nextMeeting.localeCompare(b.nextMeeting));
  const nextDecisionBank = sorted[0]?.bank ?? 'Federal Reserve';
  const nextDecisionDate = sorted[0]?.nextMeeting ?? new Date().toISOString().slice(0, 10);

  const totalAssetsGlobal = round2(balanceSheets.reduce((a, b) => a + b.totalAssets, 0));
  const dominantTheme = pick(DOMINANT_THEMES);

  const marketSummary = {
    globalAvgRate,
    netHawkishCount,
    nextDecisionBank,
    nextDecisionDate,
    totalAssetsGlobal,
    dominantTheme,
  };

  return {
    rateDecisions,
    balanceSheets,
    forwardGuidance,
    ratePaths,
    marketSummary,
    generatedAt: new Date().toISOString(),
  };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[CentralBankWatch] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate central bank watch data' });
  }
});

export default router;
