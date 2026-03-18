import { Router } from 'express';

const router = Router();

// ── Types ──

interface IssuerRating {
  name: string;
  type: 'sovereign' | 'corporate';
  sector: string;
  ratings: { sp: string; moodys: string; fitch: string };
  outlook: { sp: string; moodys: string; fitch: string };
  lastAction: {
    agency: string;
    date: string;
    action: string;
    from: string;
    to: string;
  };
  debtToGdp: number | null;
  debtToEbitda: number | null;
  spreadBps: number;
  cdsSpread: number;
  defaultProbability1Y: number;
}

interface RatingAction {
  date: string;
  issuer: string;
  agency: string;
  action: string;
  from: string;
  to: string;
  rationale: string;
}

interface CreditRatingsResponse {
  issuers: IssuerRating[];
  recentActions: RatingAction[];
  generatedAt: string;
}

// ── Seeded PRNG ──

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

// ── Issuer Seed Data ──

interface IssuerSeed {
  name: string;
  type: 'sovereign' | 'corporate';
  sector: string;
  sp: string;
  moodys: string;
  fitch: string;
  outlookBase: string;
  debtMetric: number; // debtToGdp for sovereign, debtToEbitda for corporate
  spreadBase: number;
  cdsBase: number;
}

const ISSUER_SEEDS: IssuerSeed[] = [
  // Sovereigns
  { name: 'United States', type: 'sovereign', sector: 'Government', sp: 'AA+', moodys: 'Aaa', fitch: 'AA+', outlookBase: 'Stable', debtMetric: 123.4, spreadBase: 0, cdsBase: 32 },
  { name: 'Germany', type: 'sovereign', sector: 'Government', sp: 'AAA', moodys: 'Aaa', fitch: 'AAA', outlookBase: 'Stable', debtMetric: 64.3, spreadBase: 0, cdsBase: 18 },
  { name: 'Japan', type: 'sovereign', sector: 'Government', sp: 'A+', moodys: 'A1', fitch: 'A', outlookBase: 'Stable', debtMetric: 255.2, spreadBase: 45, cdsBase: 28 },
  { name: 'United Kingdom', type: 'sovereign', sector: 'Government', sp: 'AA', moodys: 'Aa3', fitch: 'AA-', outlookBase: 'Stable', debtMetric: 101.2, spreadBase: 22, cdsBase: 35 },
  { name: 'France', type: 'sovereign', sector: 'Government', sp: 'AA-', moodys: 'Aa2', fitch: 'AA-', outlookBase: 'Negative', debtMetric: 111.8, spreadBase: 55, cdsBase: 42 },
  { name: 'Italy', type: 'sovereign', sector: 'Government', sp: 'BBB', moodys: 'Baa3', fitch: 'BBB', outlookBase: 'Stable', debtMetric: 140.6, spreadBase: 165, cdsBase: 105 },
  { name: 'Spain', type: 'sovereign', sector: 'Government', sp: 'A', moodys: 'Baa1', fitch: 'A-', outlookBase: 'Positive', debtMetric: 107.5, spreadBase: 90, cdsBase: 62 },
  { name: 'China', type: 'sovereign', sector: 'Government', sp: 'A+', moodys: 'A1', fitch: 'A+', outlookBase: 'Stable', debtMetric: 83.6, spreadBase: 68, cdsBase: 68 },
  { name: 'India', type: 'sovereign', sector: 'Government', sp: 'BBB-', moodys: 'Baa3', fitch: 'BBB-', outlookBase: 'Positive', debtMetric: 83.1, spreadBase: 130, cdsBase: 98 },
  { name: 'Brazil', type: 'sovereign', sector: 'Government', sp: 'BB', moodys: 'Ba2', fitch: 'BB', outlookBase: 'Stable', debtMetric: 74.4, spreadBase: 210, cdsBase: 165 },
  { name: 'Mexico', type: 'sovereign', sector: 'Government', sp: 'BBB', moodys: 'Baa2', fitch: 'BBB-', outlookBase: 'Negative', debtMetric: 52.8, spreadBase: 155, cdsBase: 118 },
  { name: 'Australia', type: 'sovereign', sector: 'Government', sp: 'AAA', moodys: 'Aaa', fitch: 'AAA', outlookBase: 'Stable', debtMetric: 52.1, spreadBase: 8, cdsBase: 20 },

  // Corporates
  { name: 'Apple', type: 'corporate', sector: 'Technology', sp: 'AA+', moodys: 'Aaa', fitch: 'AA+', outlookBase: 'Stable', debtMetric: 1.2, spreadBase: 42, cdsBase: 32 },
  { name: 'Microsoft', type: 'corporate', sector: 'Technology', sp: 'AAA', moodys: 'Aaa', fitch: 'AAA', outlookBase: 'Stable', debtMetric: 0.8, spreadBase: 35, cdsBase: 28 },
  { name: 'Amazon', type: 'corporate', sector: 'Technology', sp: 'AA', moodys: 'A1', fitch: 'AA-', outlookBase: 'Stable', debtMetric: 1.5, spreadBase: 55, cdsBase: 35 },
  { name: 'JPMorgan', type: 'corporate', sector: 'Financials', sp: 'A+', moodys: 'Aa2', fitch: 'AA-', outlookBase: 'Stable', debtMetric: 3.2, spreadBase: 68, cdsBase: 52 },
  { name: 'Goldman Sachs', type: 'corporate', sector: 'Financials', sp: 'A+', moodys: 'A1', fitch: 'A+', outlookBase: 'Stable', debtMetric: 4.1, spreadBase: 82, cdsBase: 62 },
  { name: 'AT&T', type: 'corporate', sector: 'Telecom', sp: 'BBB', moodys: 'Baa2', fitch: 'BBB', outlookBase: 'Stable', debtMetric: 3.8, spreadBase: 145, cdsBase: 110 },
  { name: 'Ford', type: 'corporate', sector: 'Auto', sp: 'BB+', moodys: 'Ba1', fitch: 'BB+', outlookBase: 'Positive', debtMetric: 5.2, spreadBase: 235, cdsBase: 185 },
  { name: 'Boeing', type: 'corporate', sector: 'Industrials', sp: 'BBB-', moodys: 'Baa3', fitch: 'BBB-', outlookBase: 'Negative', debtMetric: 6.8, spreadBase: 215, cdsBase: 175 },
  { name: 'Tesla', type: 'corporate', sector: 'Auto', sp: 'BBB', moodys: 'Baa3', fitch: 'BBB-', outlookBase: 'Stable', debtMetric: 1.8, spreadBase: 170, cdsBase: 135 },
  { name: 'Pfizer', type: 'corporate', sector: 'Healthcare', sp: 'A', moodys: 'A2', fitch: 'A', outlookBase: 'Stable', debtMetric: 2.4, spreadBase: 62, cdsBase: 48 },
  { name: 'ExxonMobil', type: 'corporate', sector: 'Energy', sp: 'AA-', moodys: 'Aa2', fitch: 'AA-', outlookBase: 'Stable', debtMetric: 1.3, spreadBase: 58, cdsBase: 45 },
  { name: 'Walmart', type: 'corporate', sector: 'Retail', sp: 'AA', moodys: 'Aa2', fitch: 'AA', outlookBase: 'Stable', debtMetric: 1.6, spreadBase: 40, cdsBase: 30 },
  { name: 'Netflix', type: 'corporate', sector: 'Media', sp: 'BBB+', moodys: 'Baa1', fitch: 'BBB+', outlookBase: 'Positive', debtMetric: 2.1, spreadBase: 105, cdsBase: 78 },
];

// ── Rating Scale Constants ──

const OUTLOOKS = ['Stable', 'Positive', 'Negative', 'Watch'] as const;

const SP_SCALE = [
  'AAA', 'AA+', 'AA', 'AA-', 'A+', 'A', 'A-',
  'BBB+', 'BBB', 'BBB-', 'BB+', 'BB', 'BB-',
  'B+', 'B', 'B-', 'CCC+', 'CCC', 'CCC-',
];

const MOODYS_SCALE = [
  'Aaa', 'Aa1', 'Aa2', 'Aa3', 'A1', 'A2', 'A3',
  'Baa1', 'Baa2', 'Baa3', 'Ba1', 'Ba2', 'Ba3',
  'B1', 'B2', 'B3', 'Caa1', 'Caa2', 'Caa3',
];

const AGENCIES = ['S&P', "Moody's", 'Fitch'] as const;
const ACTIONS = ['Upgrade', 'Downgrade', 'Affirm', 'Review'] as const;

const ACTION_RATIONALES: Record<string, string[]> = {
  Upgrade: [
    'Improved fiscal outlook and reduced debt trajectory',
    'Stronger credit metrics and sustained deleveraging',
    'Resilient economic performance exceeding expectations',
    'Enhanced liquidity position and funding flexibility',
    'Revenue growth and margin expansion driving improved coverage',
  ],
  Downgrade: [
    'Deteriorating fiscal position and rising debt burden',
    'Weakening credit fundamentals and elevated leverage',
    'Policy uncertainty weighing on institutional framework',
    'Persistent structural headwinds in core markets',
    'Negative free cash flow outlook amid higher funding costs',
  ],
  Affirm: [
    'Credit profile remains consistent with current rating',
    'Adequate financial flexibility despite macroeconomic challenges',
    'Stable revenue base and manageable debt maturity schedule',
    'Balanced risk profile relative to sector peers',
    'Maintained investment-grade metrics within tolerance range',
  ],
  Review: [
    'Placed on review pending completion of strategic review',
    'Under review for potential impact of regulatory changes',
    'Watchlist placement due to pending M&A activity',
    'Review initiated following unexpected leadership transition',
    'Monitoring evolving market conditions for credit impact',
  ],
};

// ── Helpers ──

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function pickOutlook(rand: () => number, base: string): string {
  const r = rand();
  // 60% chance keep base, 20% Stable, 10% Positive, 10% Negative/Watch
  if (r < 0.60) return base;
  if (r < 0.80) return 'Stable';
  if (r < 0.90) return 'Positive';
  return r < 0.95 ? 'Negative' : 'Watch';
}

function adjacentRating(scale: string[], current: string, direction: number): string {
  const idx = scale.indexOf(current);
  if (idx < 0) return current;
  const newIdx = Math.max(0, Math.min(scale.length - 1, idx + direction));
  return scale[newIdx];
}

function computeDefaultProb(cdsSpread: number, recovery: number): number {
  // Simplified: annual PD = CDS / (1 - recovery) / 10000 * 100
  return roundTo((cdsSpread / 10000) / (1 - recovery) * 100, 3);
}

function generateDateWithinDays(rand: () => number, daysBack: number): string {
  const now = new Date();
  const offset = Math.floor(rand() * daysBack);
  const d = new Date(now.getTime() - offset * 86400000);
  return d.toISOString().split('T')[0];
}

function buildIssuer(seed: IssuerSeed, rand: () => number): IssuerRating {
  const spreadJitter = 1 + (rand() - 0.5) * 0.12;
  const spreadBps = roundTo(seed.spreadBase * spreadJitter + rand() * 5, 1);
  const cdsJitter = 1 + (rand() - 0.5) * 0.10;
  const cdsSpread = roundTo(seed.cdsBase * cdsJitter, 1);

  // Outlook per agency
  const spOutlook = pickOutlook(rand, seed.outlookBase);
  const moodysOutlook = pickOutlook(rand, seed.outlookBase);
  const fitchOutlook = pickOutlook(rand, seed.outlookBase);

  // Last rating action
  const agencyIdx = Math.floor(rand() * AGENCIES.length);
  const agency = AGENCIES[agencyIdx];
  const actionR = rand();
  let action: string;
  if (actionR < 0.10) action = 'Upgrade';
  else if (actionR < 0.22) action = 'Downgrade';
  else if (actionR < 0.85) action = 'Affirm';
  else action = 'Review';

  // Determine from/to based on action and agency
  let fromRating: string;
  let toRating: string;
  const scale = agency === "Moody's" ? MOODYS_SCALE : SP_SCALE;
  const currentRating = agency === "Moody's" ? seed.moodys : (agency === 'S&P' ? seed.sp : seed.fitch);

  if (action === 'Upgrade') {
    toRating = currentRating;
    fromRating = adjacentRating(scale, currentRating, 1);
  } else if (action === 'Downgrade') {
    fromRating = adjacentRating(scale, currentRating, -1);
    toRating = currentRating;
  } else {
    fromRating = currentRating;
    toRating = currentRating;
  }

  const actionDate = generateDateWithinDays(rand, 180);

  const defaultProbability1Y = computeDefaultProb(cdsSpread, 0.40);

  return {
    name: seed.name,
    type: seed.type,
    sector: seed.sector,
    ratings: { sp: seed.sp, moodys: seed.moodys, fitch: seed.fitch },
    outlook: { sp: spOutlook, moodys: moodysOutlook, fitch: fitchOutlook },
    lastAction: {
      agency,
      date: actionDate,
      action,
      from: fromRating,
      to: toRating,
    },
    debtToGdp: seed.type === 'sovereign' ? roundTo(seed.debtMetric + (rand() - 0.5) * 3, 1) : null,
    debtToEbitda: seed.type === 'corporate' ? roundTo(seed.debtMetric + (rand() - 0.5) * 0.4, 1) : null,
    spreadBps: Math.max(0, spreadBps),
    cdsSpread,
    defaultProbability1Y,
  };
}

function buildRecentActions(
  issuers: IssuerRating[],
  rand: () => number,
): RatingAction[] {
  const actions: RatingAction[] = [];

  for (let i = 0; i < 15; i++) {
    const issuerIdx = Math.floor(rand() * issuers.length);
    const issuer = issuers[issuerIdx];
    const agencyIdx = Math.floor(rand() * AGENCIES.length);
    const agency = AGENCIES[agencyIdx];

    const actionR = rand();
    let action: string;
    if (actionR < 0.15) action = 'Upgrade';
    else if (actionR < 0.35) action = 'Downgrade';
    else if (actionR < 0.80) action = 'Affirm';
    else action = 'Review';

    const scale = agency === "Moody's" ? MOODYS_SCALE : SP_SCALE;
    const currentRating = agency === "Moody's"
      ? issuer.ratings.moodys
      : (agency === 'S&P' ? issuer.ratings.sp : issuer.ratings.fitch);

    let fromRating: string;
    let toRating: string;

    if (action === 'Upgrade') {
      toRating = currentRating;
      fromRating = adjacentRating(scale, currentRating, 1);
    } else if (action === 'Downgrade') {
      fromRating = adjacentRating(scale, currentRating, -1);
      toRating = currentRating;
    } else {
      fromRating = currentRating;
      toRating = currentRating;
    }

    const rationaleList = ACTION_RATIONALES[action] || ACTION_RATIONALES['Affirm'];
    const rationale = rationaleList[Math.floor(rand() * rationaleList.length)];

    actions.push({
      date: generateDateWithinDays(rand, 90),
      issuer: issuer.name,
      agency,
      action,
      from: fromRating,
      to: toRating,
      rationale,
    });
  }

  // Sort by date descending
  actions.sort((a, b) => b.date.localeCompare(a.date));
  return actions;
}

// ── Cache ──

let cache: { data: CreditRatingsResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 5 * 60_000; // 5 minutes

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    // Seed based on current date for deterministic daily data
    const dateStr = new Date().toISOString().split('T')[0];
    const seed = hashSeed('credit-ratings-' + dateStr);
    const rand = seededRandom(seed);

    const issuers = ISSUER_SEEDS.map((s) => buildIssuer(s, rand));
    const recentActions = buildRecentActions(issuers, rand);

    const result: CreditRatingsResponse = {
      issuers,
      recentActions,
      generatedAt: new Date().toISOString(),
    };

    cache = { data: result, expiresAt: now + CACHE_TTL };
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[CreditRatings] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to fetch credit ratings data' });
  }
});

export default router;
