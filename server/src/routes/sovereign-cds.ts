import { Router } from 'express';

const router = Router();

// ── Seeded PRNG ──

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ── Seed Data ──

interface CountryCdsSeed {
  country: string;
  baseSpread: number;
  rating: string;
  high52w: number;
  low52w: number;
}

const CDS_SEEDS: CountryCdsSeed[] = [
  { country: 'United States',  baseSpread: 35,   rating: 'AAA',  high52w: 48,   low52w: 22 },
  { country: 'Germany',        baseSpread: 15,   rating: 'AAA',  high52w: 22,   low52w: 8 },
  { country: 'United Kingdom', baseSpread: 30,   rating: 'AA',   high52w: 42,   low52w: 18 },
  { country: 'France',         baseSpread: 25,   rating: 'AA',   high52w: 38,   low52w: 15 },
  { country: 'Japan',          baseSpread: 25,   rating: 'A+',   high52w: 40,   low52w: 14 },
  { country: 'Italy',          baseSpread: 120,  rating: 'BBB',  high52w: 175,  low52w: 85 },
  { country: 'Spain',          baseSpread: 60,   rating: 'A',    high52w: 88,   low52w: 38 },
  { country: 'Brazil',         baseSpread: 160,  rating: 'BB-',  high52w: 225,  low52w: 110 },
  { country: 'Turkey',         baseSpread: 400,  rating: 'B',    high52w: 580,  low52w: 280 },
  { country: 'South Africa',   baseSpread: 200,  rating: 'BB-',  high52w: 290,  low52w: 140 },
  { country: 'Mexico',         baseSpread: 100,  rating: 'BBB',  high52w: 145,  low52w: 68 },
  { country: 'China',          baseSpread: 60,   rating: 'A+',   high52w: 95,   low52w: 35 },
  { country: 'Russia',         baseSpread: 800,  rating: 'CC',   high52w: 1200, low52w: 550 },
  { country: 'Argentina',      baseSpread: 2500, rating: 'CCC',  high52w: 4200, low52w: 1600 },
  { country: 'Indonesia',      baseSpread: 80,   rating: 'BBB',  high52w: 115,  low52w: 52 },
];

const US_TERM_BASE: Record<string, number> = { '1Y': 18, '2Y': 22, '3Y': 28, '5Y': 35, '7Y': 40, '10Y': 45 };
const IT_TERM_BASE: Record<string, number> = { '1Y': 85, '2Y': 95, '3Y': 108, '5Y': 120, '7Y': 128, '10Y': 132 };

const CRISIS_DATA = [
  { event: 'GFC 2008',          usSpread: 90,   italySpread: 290,  brazilSpread: 580,  turkeySpread: 720,  avgEM: 650,  peakDate: '2008-11-20' },
  { event: 'Euro Crisis 2012',  usSpread: 45,   italySpread: 580,  brazilSpread: 210,  turkeySpread: 310,  avgEM: 420,  peakDate: '2012-06-18' },
  { event: 'Taper Tantrum 2013', usSpread: 32,   italySpread: 260,  brazilSpread: 230,  turkeySpread: 280,  avgEM: 380,  peakDate: '2013-06-24' },
  { event: 'COVID 2020',        usSpread: 55,   italySpread: 250,  brazilSpread: 360,  turkeySpread: 620,  avgEM: 510,  peakDate: '2020-03-23' },
  { event: 'Rate Hike 2022',    usSpread: 28,   italySpread: 180,  brazilSpread: 260,  turkeySpread: 580,  avgEM: 420,  peakDate: '2022-10-12' },
];

interface DefaultProbSeed {
  country: string;
  pd1y: number;
  pd3y: number;
  pd5y: number;
  pd10y: number;
  recoveryAssumption: number;
  creditWatch: boolean;
  outlook: string;
}

const DEFAULT_PROB_SEEDS: DefaultProbSeed[] = [
  { country: 'United States',  pd1y: 0.06, pd3y: 0.22, pd5y: 0.58, pd10y: 1.40, recoveryAssumption: 40, creditWatch: false, outlook: 'Stable' },
  { country: 'Germany',        pd1y: 0.02, pd3y: 0.09, pd5y: 0.25, pd10y: 0.62, recoveryAssumption: 40, creditWatch: false, outlook: 'Stable' },
  { country: 'Japan',          pd1y: 0.04, pd3y: 0.16, pd5y: 0.42, pd10y: 1.10, recoveryAssumption: 40, creditWatch: false, outlook: 'Stable' },
  { country: 'Italy',          pd1y: 0.20, pd3y: 0.72, pd5y: 1.98, pd10y: 4.80, recoveryAssumption: 40, creditWatch: false, outlook: 'Negative' },
  { country: 'Brazil',         pd1y: 0.27, pd3y: 0.95, pd5y: 2.65, pd10y: 6.20, recoveryAssumption: 25, creditWatch: false, outlook: 'Stable' },
  { country: 'Turkey',         pd1y: 0.67, pd3y: 2.30, pd5y: 6.50, pd10y: 14.80, recoveryAssumption: 25, creditWatch: false, outlook: 'Negative' },
  { country: 'Russia',         pd1y: 1.33, pd3y: 4.50, pd5y: 12.80, pd10y: 28.50, recoveryAssumption: 15, creditWatch: true, outlook: 'Watch' },
  { country: 'Argentina',      pd1y: 4.10, pd3y: 13.50, pd5y: 35.20, pd10y: 62.00, recoveryAssumption: 15, creditWatch: true, outlook: 'Negative' },
  { country: 'China',          pd1y: 0.10, pd3y: 0.38, pd5y: 1.00, pd10y: 2.45, recoveryAssumption: 40, creditWatch: false, outlook: 'Stable' },
  { country: 'Indonesia',      pd1y: 0.13, pd3y: 0.50, pd5y: 1.32, pd10y: 3.20, recoveryAssumption: 30, creditWatch: false, outlook: 'Positive' },
];

// ── Cache ──

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

// ── Generator ──

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-sovereign-cds'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const round2 = (v: number) => Math.round(v * 100) / 100;
  const round1 = (v: number) => Math.round(v * 10) / 10;

  // 1. CDS Spreads
  const cdsSpreads = CDS_SEEDS.map(seed => {
    const spread5y = round1(jitter(seed.baseSpread, 0.08));
    const change = round1((rng() - 0.48) * seed.baseSpread * 0.04);
    const weekChange = round1((rng() - 0.45) * seed.baseSpread * 0.06);
    const monthChange = round1((rng() - 0.42) * seed.baseSpread * 0.10);
    const range = seed.high52w - seed.low52w;
    const percentile = Math.round(((spread5y - seed.low52w) / (range || 1)) * 100);
    const impliedPD = round2(spread5y / 10000 * 100 / 0.6 * 5);

    return {
      country: seed.country,
      spread5y,
      change,
      weekChange,
      monthChange,
      high52w: seed.high52w,
      low52w: seed.low52w,
      percentile: Math.max(0, Math.min(100, percentile)),
      impliedPD,
      rating: seed.rating,
    };
  });

  // 2. Term Structure
  const tenors = ['1Y', '2Y', '3Y', '5Y', '7Y', '10Y'] as const;
  const termStructure: {
    country: string;
    tenor: string;
    spread: number;
    change: number;
    impliedHazardRate: number;
  }[] = [];

  for (const tenor of tenors) {
    const usBase = US_TERM_BASE[tenor];
    const usSpread = round1(jitter(usBase, 0.06));
    termStructure.push({
      country: 'United States',
      tenor,
      spread: usSpread,
      change: round1((rng() - 0.5) * usBase * 0.03),
      impliedHazardRate: round2(usSpread / 10000 / 0.6 * 100),
    });
  }
  for (const tenor of tenors) {
    const itBase = IT_TERM_BASE[tenor];
    const itSpread = round1(jitter(itBase, 0.06));
    termStructure.push({
      country: 'Italy',
      tenor,
      spread: itSpread,
      change: round1((rng() - 0.5) * itBase * 0.03),
      impliedHazardRate: round2(itSpread / 10000 / 0.6 * 100),
    });
  }

  // 3. Crisis Comparison
  const currentUS = cdsSpreads.find(c => c.country === 'United States')!.spread5y;
  const currentIT = cdsSpreads.find(c => c.country === 'Italy')!.spread5y;
  const currentBR = cdsSpreads.find(c => c.country === 'Brazil')!.spread5y;
  const currentTR = cdsSpreads.find(c => c.country === 'Turkey')!.spread5y;
  const emCountries = cdsSpreads.filter(c => ['Brazil', 'Turkey', 'South Africa', 'Mexico', 'Argentina', 'Indonesia'].includes(c.country));
  const currentAvgEM = Math.round(emCountries.reduce((sum, c) => sum + c.spread5y, 0) / emCountries.length);

  const crisisComparison = [
    ...CRISIS_DATA,
    {
      event: 'Current',
      usSpread: Math.round(currentUS),
      italySpread: Math.round(currentIT),
      brazilSpread: Math.round(currentBR),
      turkeySpread: Math.round(currentTR),
      avgEM: currentAvgEM,
      peakDate: day,
    },
  ];

  // 4. Default Probabilities
  const defaultProbabilities = DEFAULT_PROB_SEEDS.map(seed => ({
    country: seed.country,
    pd1y: round2(jitter(seed.pd1y, 0.05)),
    pd3y: round2(jitter(seed.pd3y, 0.05)),
    pd5y: round2(jitter(seed.pd5y, 0.05)),
    pd10y: round2(jitter(seed.pd10y, 0.05)),
    recoveryAssumption: seed.recoveryAssumption,
    creditWatch: seed.creditWatch,
    outlook: seed.outlook,
  }));

  // 5. Market Summary
  const dmCountries = cdsSpreads.filter(c =>
    ['United States', 'Germany', 'United Kingdom', 'France', 'Japan'].includes(c.country),
  );
  const avgDMSpread = round1(dmCountries.reduce((sum, c) => sum + c.spread5y, 0) / dmCountries.length);
  const avgEMSpread = round1(emCountries.reduce((sum, c) => sum + c.spread5y, 0) / emCountries.length);

  const sortedByChange = [...cdsSpreads].sort((a, b) => b.change - a.change);
  const mostWidened = sortedByChange[0].country;
  const mostTightened = sortedByChange[sortedByChange.length - 1].country;

  const globalRiskIndex = round1(
    (avgEMSpread / 600) * 50 + (avgDMSpread / 40) * 30 + (rng() * 20),
  );

  const themes = [
    'EM Spread Compression',
    'DM Safe-Haven Demand',
    'Rate Divergence',
    'Geopolitical Risk Premium',
    'Credit Repricing',
    'Risk-On Sentiment',
    'Fiscal Concerns',
  ];
  const dominantTheme = themes[Math.floor(rng() * themes.length)];

  const marketSummary = {
    avgDMSpread,
    avgEMSpread,
    mostWidened,
    mostTightened,
    globalRiskIndex: Math.max(0, Math.min(100, globalRiskIndex)),
    dominantTheme,
  };

  return {
    cdsSpreads,
    termStructure,
    crisisComparison,
    defaultProbabilities,
    marketSummary,
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
    console.error('[SovereignCDS] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate sovereign CDS data' });
  }
});

export default router;
