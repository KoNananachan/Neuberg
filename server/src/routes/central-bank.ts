import { Router } from 'express';

const router = Router();

// ── Seeded PRNG ──

function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) { const char = str.charCodeAt(i); hash = ((hash << 5) - hash) + char; hash |= 0; }
  return Math.abs(hash);
}

function mulberry32(a: number): () => number {
  return function () {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ── Helpers ──

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
const round2 = (v: number) => Math.round(v * 100) / 100;
const round1 = (v: number) => Math.round(v * 10) / 10;

// ── Cache ──

const CACHE_TTL = 12 * 60 * 60 * 1000;
let cacheData: unknown = null;
let cacheTime = 0;

// ── Types ──

interface PolicyRate {
  bank: string;
  rate: number;
  lastChange: number;
  lastChangeDate: string;
  nextMeeting: string;
  marketImpliedRate: number;
  bias: 'hawkish' | 'neutral' | 'dovish';
}

interface RateExpectation {
  meeting: string;
  fedFundsImplied: number;
  ecbImplied: number;
  boeImplied: number;
  cutProbability: number;
  hikeProbability: number;
  holdProbability: number;
}

interface BalanceSheet {
  bank: string;
  totalAssets: number;
  change1M: number;
  qeQtStatus: 'QE' | 'QT' | 'hold';
  monthlyPace: number;
  assetToGDP: number;
}

interface ForwardGuidance {
  bank: string;
  latestStatement: string;
  tone: 'hawkish' | 'neutral' | 'dovish';
  surpriseIndex: number;
}

interface InflationTarget {
  bank: string;
  target: number;
  currentCPI: number;
  currentCore: number;
  gap: number;
  onTrack: boolean;
}

interface MarketImpact {
  fedPutLevel: number;
  termPremium10Y: number;
  realRate10Y: number;
  breakevenInflation5Y: number;
  dollarIndex: number;
  goldPrice: number;
}

interface CentralBankResponse {
  policyRates: PolicyRate[];
  rateExpectations: RateExpectation[];
  balanceSheets: BalanceSheet[];
  forwardGuidance: ForwardGuidance[];
  inflationTargets: InflationTarget[];
  marketImpact: MarketImpact;
  generatedAt: string;
}

// ── Static configs ──

interface BankRateConfig {
  name: string;
  rateMin: number;
  rateMax: number;
  lastChangeBps: number;
  lastChangeDate: string;
  nextMeeting: string;
  baseBias: 'hawkish' | 'neutral' | 'dovish';
}

const POLICY_RATE_CONFIGS: BankRateConfig[] = [
  { name: 'Federal Reserve', rateMin: 4.25, rateMax: 5.50, lastChangeBps: -25, lastChangeDate: '2024-12-18', nextMeeting: '2025-03-19', baseBias: 'hawkish' },
  { name: 'ECB', rateMin: 3.50, rateMax: 4.50, lastChangeBps: -25, lastChangeDate: '2024-10-17', nextMeeting: '2025-04-17', baseBias: 'neutral' },
  { name: 'Bank of Japan', rateMin: 0, rateMax: 0.25, lastChangeBps: 10, lastChangeDate: '2024-07-31', nextMeeting: '2025-03-14', baseBias: 'dovish' },
  { name: 'Bank of England', rateMin: 4.00, rateMax: 5.25, lastChangeBps: -25, lastChangeDate: '2024-11-07', nextMeeting: '2025-03-20', baseBias: 'neutral' },
  { name: 'PBoC', rateMin: 3.45, rateMax: 3.45, lastChangeBps: -10, lastChangeDate: '2024-08-20', nextMeeting: '2025-03-20', baseBias: 'dovish' },
  { name: 'Reserve Bank of Australia', rateMin: 3.85, rateMax: 4.35, lastChangeBps: 0, lastChangeDate: '2023-11-07', nextMeeting: '2025-04-01', baseBias: 'neutral' },
  { name: 'Bank of Canada', rateMin: 3.50, rateMax: 5.00, lastChangeBps: -50, lastChangeDate: '2024-12-11', nextMeeting: '2025-03-12', baseBias: 'dovish' },
  { name: 'Swiss National Bank', rateMin: 1.00, rateMax: 1.75, lastChangeBps: -25, lastChangeDate: '2024-12-12', nextMeeting: '2025-03-20', baseBias: 'neutral' },
  { name: 'Riksbank', rateMin: 2.50, rateMax: 4.00, lastChangeBps: -25, lastChangeDate: '2024-11-07', nextMeeting: '2025-03-20', baseBias: 'dovish' },
  { name: 'Reserve Bank of India', rateMin: 6.00, rateMax: 6.50, lastChangeBps: 0, lastChangeDate: '2023-02-08', nextMeeting: '2025-04-09', baseBias: 'neutral' },
];

interface BalanceSheetConfig {
  bank: string;
  totalAssetsBase: number;
  gdpBase: number;
  qeQtBase: 'QE' | 'QT' | 'hold';
  monthlyPaceBase: number;
}

const BALANCE_SHEET_CONFIGS: BalanceSheetConfig[] = [
  { bank: 'Fed', totalAssetsBase: 7.4, gdpBase: 27.0, qeQtBase: 'QT', monthlyPaceBase: -60 },
  { bank: 'ECB', totalAssetsBase: 6.5, gdpBase: 15.0, qeQtBase: 'QT', monthlyPaceBase: -40 },
  { bank: 'BoJ', totalAssetsBase: 5.6, gdpBase: 4.2, qeQtBase: 'hold', monthlyPaceBase: 5 },
  { bank: 'BoE', totalAssetsBase: 0.85, gdpBase: 3.3, qeQtBase: 'QT', monthlyPaceBase: -20 },
  { bank: 'PBoC', totalAssetsBase: 6.2, gdpBase: 18.0, qeQtBase: 'QE', monthlyPaceBase: 30 },
];

interface InflationConfig {
  bank: string;
  target: number;
  cpiBase: number;
  coreBase: number;
}

const INFLATION_CONFIGS: InflationConfig[] = [
  { bank: 'Fed', target: 2.0, cpiBase: 3.1, coreBase: 3.3 },
  { bank: 'ECB', target: 2.0, cpiBase: 2.6, coreBase: 2.9 },
  { bank: 'BoJ', target: 2.0, cpiBase: 2.8, coreBase: 2.5 },
  { bank: 'BoE', target: 2.0, cpiBase: 4.0, coreBase: 3.6 },
  { bank: 'BoC', target: 2.0, cpiBase: 2.9, coreBase: 2.6 },
  { bank: 'RBA', target: 2.5, cpiBase: 3.4, coreBase: 3.2 },
];

const FORWARD_GUIDANCE_STATEMENTS: Record<string, string[]> = {
  'Fed': [
    'Data-dependent approach, inflation still above target',
    'Prepared to adjust stance as appropriate based on totality of data',
    'Economic activity expanding at solid pace, labor market rebalancing',
    'Need sustained evidence inflation moving toward 2% before easing',
    'Restrictive policy stance will be maintained until confident on inflation',
  ],
  'ECB': [
    'Determined to ensure timely return of inflation to 2% target',
    'Domestic price pressures remain elevated, data-dependent approach',
    'Transmission of tighter policy is working through the economy',
    'Should not declare victory on inflation prematurely',
    'Gradual disinflation path expected through 2025',
  ],
  'BoJ': [
    'Accommodative conditions to be maintained with careful monitoring',
    'Virtuous cycle between wages and prices strengthening gradually',
    'Exit from ultra-loose policy must be carefully managed',
    'Will adjust degree of easing if inflation outlook is realized',
    'Spring wage negotiations show promising signs for sustained inflation',
  ],
  'BoE': [
    'Services inflation remains elevated, patience required on rate path',
    'Restrictive monetary policy is weighing on economic activity',
    'More evidence needed that inflation persistence is fading',
    'Gradual approach to removing monetary policy restriction appropriate',
    'Last mile of disinflation proving the most challenging',
  ],
  'PBoC': [
    'Prudent monetary policy will be precise and forceful as needed',
    'Focus on supporting real economy and maintaining liquidity',
    'Structural monetary policy tools to be used flexibly',
    'Cross-cyclical adjustment to stabilize market expectations',
    'Yuan exchange rate to be kept basically stable at equilibrium',
  ],
};

// ── Data generation ──

function generate(): CentralBankResponse {
  const todayStr = new Date().toISOString().slice(0, 10);
  const seed = hashSeed('central-bank-' + todayStr);
  const rng = mulberry32(seed);

  const pick = <T>(arr: readonly T[] | T[]): T => arr[Math.floor(rng() * arr.length)];
  const jitter = (base: number, range: number) => base + (rng() - 0.5) * 2 * range;

  // ── 1. Policy Rates ──

  const policyRates: PolicyRate[] = POLICY_RATE_CONFIGS.map((cfg) => {
    const rate = round2(clamp(jitter((cfg.rateMin + cfg.rateMax) / 2, (cfg.rateMax - cfg.rateMin) / 2), cfg.rateMin, cfg.rateMax));
    const impliedOffset = (rng() - 0.5) * 0.5;
    const marketImpliedRate = round2(clamp(rate + impliedOffset, Math.max(0, rate - 0.75), rate + 0.75));
    const biases: Array<'hawkish' | 'neutral' | 'dovish'> = ['hawkish', 'neutral', 'dovish'];
    const bias = rng() < 0.65 ? cfg.baseBias : pick(biases);

    return {
      bank: cfg.name,
      rate,
      lastChange: cfg.lastChangeBps,
      lastChangeDate: cfg.lastChangeDate,
      nextMeeting: cfg.nextMeeting,
      marketImpliedRate,
      bias,
    };
  });

  // ── 2. Rate Expectations ──

  const fedRate = policyRates[0].rate;
  const ecbRate = policyRates[1].rate;
  const boeRate = policyRates[3].rate;

  const meetingLabels = ['Next', '+2', '+3', '+4'];
  const rateExpectations: RateExpectation[] = meetingLabels.map((meeting, i) => {
    const cumulativeDrift = (i + 1) * 0.08;
    const fedImplied = round2(clamp(fedRate - cumulativeDrift + (rng() - 0.4) * 0.3, 3.0, 6.0));
    const ecbImplied = round2(clamp(ecbRate - cumulativeDrift + (rng() - 0.4) * 0.3, 2.0, 5.0));
    const boeImplied = round2(clamp(boeRate - cumulativeDrift + (rng() - 0.4) * 0.3, 3.0, 6.0));

    const uncertainty = 10 + i * 8;
    const cutProb = round1(clamp(25 + i * 10 + (rng() - 0.5) * uncertainty, 0, 80));
    const hikeProb = round1(clamp(10 - i * 2 + (rng() - 0.5) * uncertainty, 0, 50));
    const holdProb = round1(clamp(100 - cutProb - hikeProb, 0, 100));

    // Normalize to 100
    const total = cutProb + hikeProb + holdProb;
    return {
      meeting,
      fedFundsImplied: fedImplied,
      ecbImplied,
      boeImplied,
      cutProbability: round1(cutProb / total * 100),
      hikeProbability: round1(hikeProb / total * 100),
      holdProbability: round1(holdProb / total * 100),
    };
  });

  // ── 3. Balance Sheets ──

  const balanceSheets: BalanceSheet[] = BALANCE_SHEET_CONFIGS.map((cfg) => {
    const totalAssets = round2(clamp(jitter(cfg.totalAssetsBase, cfg.totalAssetsBase * 0.03), cfg.totalAssetsBase * 0.9, cfg.totalAssetsBase * 1.1));
    const change1M = round1(jitter(cfg.monthlyPaceBase * 0.8, Math.abs(cfg.monthlyPaceBase) * 0.3));
    const assetToGDP = round1(clamp((totalAssets / cfg.gdpBase) * 100, 20, 150));
    const statuses: Array<'QE' | 'QT' | 'hold'> = ['QE', 'QT', 'hold'];
    const qeQtStatus = rng() < 0.8 ? cfg.qeQtBase : pick(statuses);
    const monthlyPace = round1(jitter(cfg.monthlyPaceBase, Math.abs(cfg.monthlyPaceBase) * 0.2));

    return {
      bank: cfg.bank,
      totalAssets,
      change1M,
      qeQtStatus,
      monthlyPace,
      assetToGDP,
    };
  });

  // ── 4. Forward Guidance ──

  const guidanceBanks = ['Fed', 'ECB', 'BoJ', 'BoE', 'PBoC'];
  const forwardGuidance: ForwardGuidance[] = guidanceBanks.map((bank) => {
    const statements = FORWARD_GUIDANCE_STATEMENTS[bank] || FORWARD_GUIDANCE_STATEMENTS['Fed'];
    const latestStatement = pick(statements);
    const tones: Array<'hawkish' | 'neutral' | 'dovish'> = ['hawkish', 'neutral', 'dovish'];
    const tone = pick(tones);
    const surpriseIndex = round1(clamp(jitter(0, 1.8), -3, 3));

    return { bank, latestStatement, tone, surpriseIndex };
  });

  // ── 5. Inflation Targets ──

  const inflationTargets: InflationTarget[] = INFLATION_CONFIGS.map((cfg) => {
    const currentCPI = round1(clamp(jitter(cfg.cpiBase, 0.3), 0, 10));
    const currentCore = round1(clamp(jitter(cfg.coreBase, 0.25), 0, 10));
    const gap = round1(currentCPI - cfg.target);
    const onTrack = Math.abs(gap) < 1.0 && currentCPI <= cfg.target + 0.5;

    return {
      bank: cfg.bank,
      target: cfg.target,
      currentCPI,
      currentCore,
      gap,
      onTrack,
    };
  });

  // ── 6. Market Impact ──

  const marketImpact: MarketImpact = {
    fedPutLevel: Math.round(clamp(jitter(4200, 200), 3800, 4600)),
    termPremium10Y: round1(clamp(jitter(35, 20), -20, 80)),
    realRate10Y: round2(clamp(jitter(1.8, 0.4), 0.5, 3.0)),
    breakevenInflation5Y: round2(clamp(jitter(2.35, 0.2), 1.8, 3.0)),
    dollarIndex: round2(clamp(jitter(104.5, 2.5), 98, 112)),
    goldPrice: round2(clamp(jitter(2050, 80), 1850, 2300)),
  };

  return {
    policyRates,
    rateExpectations,
    balanceSheets,
    forwardGuidance,
    inflationTargets,
    marketImpact,
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
    console.error('[CentralBank] Error:', (err as Error)?.message);
    if (cacheData) return res.json(cacheData);
    res.status(500).json({ error: 'Failed to generate central bank data' });
  }
});

export default router;
