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

// ── Helpers ──

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

function round(val: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(val * factor) / factor;
}

// ── Types ──

interface SovereignCDS {
  country: string;
  spread5Y: number;
  change1D: number;
  change1W: number;
  change1M: number;
  rating: string;
  impliedPD: number;
  recovery: number;
}

interface CorporateCDS {
  entity: string;
  ticker: string;
  sector: string;
  spread5Y: number;
  change1D: number;
  change1M: number;
  rating: string;
  impliedPD: number;
  recovery: number;
  basis: number;
}

interface CDSIndex {
  name: string;
  spread: number;
  change1D: number;
  change1W: number;
  series: number;
  maturity: string;
  roll: string;
}

interface TermStructureEntry {
  tenor: string;
  igSpread: number;
  hySpread: number;
  slopeVs5Y: number;
}

interface CreditEvent {
  date: string;
  entity: string;
  event: string;
  notionalAffected: number;
  recoveryAuction: number;
}

interface MarketMetrics {
  totalNotional: number;
  weeklyVolume: number;
  basisAvgIG: number;
  basisAvgHY: number;
  skewIndex: number;
  systemicRisk: 'low' | 'moderate' | 'elevated' | 'high';
}

interface CDSResponse {
  sovereignCDS: SovereignCDS[];
  corporateCDS: CorporateCDS[];
  indices: CDSIndex[];
  termStructure: TermStructureEntry[];
  creditEvents: CreditEvent[];
  marketMetrics: MarketMetrics;
  generatedAt: string;
}

// ── Seed Data ──

const SOVEREIGN_SEEDS = [
  { country: 'United States',  spread5YBase: 42,   rating: 'AA+',  recovery: 40 },
  { country: 'Germany',        spread5YBase: 22,   rating: 'AAA',  recovery: 40 },
  { country: 'Japan',          spread5YBase: 35,   rating: 'A+',   recovery: 40 },
  { country: 'United Kingdom', spread5YBase: 28,   rating: 'AA',   recovery: 40 },
  { country: 'France',         spread5YBase: 32,   rating: 'AA-',  recovery: 40 },
  { country: 'Italy',          spread5YBase: 112,  rating: 'BBB',  recovery: 40 },
  { country: 'Spain',          spread5YBase: 68,   rating: 'A',    recovery: 40 },
  { country: 'Brazil',         spread5YBase: 205,  rating: 'BB',   recovery: 40 },
  { country: 'Turkey',         spread5YBase: 440,  rating: 'BB-',  recovery: 40 },
  { country: 'South Africa',   spread5YBase: 195,  rating: 'BB',   recovery: 40 },
  { country: 'China',          spread5YBase: 72,   rating: 'A+',   recovery: 40 },
  { country: 'Mexico',         spread5YBase: 115,  rating: 'BBB',  recovery: 40 },
];

const CORPORATE_SEEDS = [
  { entity: 'JPMorgan Chase',  ticker: 'JPM',   sector: 'Financials',   spread5YBase: 52,   rating: 'A+' },
  { entity: 'Goldman Sachs',   ticker: 'GS',    sector: 'Financials',   spread5YBase: 65,   rating: 'A+' },
  { entity: 'Deutsche Bank',   ticker: 'DB',    sector: 'Financials',   spread5YBase: 92,   rating: 'BBB+' },
  { entity: 'HSBC',            ticker: 'HSBC',  sector: 'Financials',   spread5YBase: 48,   rating: 'A+' },
  { entity: 'Ford Motor',      ticker: 'F',     sector: 'Consumer',     spread5YBase: 195,  rating: 'BB+' },
  { entity: 'General Electric',ticker: 'GE',    sector: 'Industrials',  spread5YBase: 78,   rating: 'BBB+' },
  { entity: 'AT&T',            ticker: 'T',     sector: 'Telecom',      spread5YBase: 108,  rating: 'BBB' },
  { entity: 'Petrobras',       ticker: 'PBR',   sector: 'Energy',       spread5YBase: 165,  rating: 'BB' },
  { entity: 'Glencore',        ticker: 'GLEN',  sector: 'Materials',    spread5YBase: 125,  rating: 'BBB+' },
  { entity: 'SoftBank',        ticker: '9984',  sector: 'Technology',   spread5YBase: 185,  rating: 'BB+' },
];

const INDEX_SEEDS = [
  { name: 'CDX.NA.IG',        spreadBase: 62,   series: 42, roll: 'Mar-26' },
  { name: 'CDX.NA.HY',        spreadBase: 385,  series: 42, roll: 'Mar-26' },
  { name: 'iTraxx Europe',    spreadBase: 68,   series: 41, roll: 'Sep-26' },
  { name: 'iTraxx Crossover', spreadBase: 355,  series: 41, roll: 'Sep-26' },
  { name: 'iTraxx Asia',      spreadBase: 102,  series: 41, roll: 'Sep-26' },
];

const CREDIT_EVENT_TEMPLATES = [
  { entity: 'Orion Health Group',    event: 'Restructuring trigger',  notionalBase: 2.8, recoveryBase: 32 },
  { entity: 'Pacific Maritime Ltd',  event: 'Failure to pay',         notionalBase: 1.5, recoveryBase: 18 },
  { entity: 'Meridian Capital Corp', event: 'Succession event',       notionalBase: 4.2, recoveryBase: 45 },
  { entity: 'Andes Mining SA',       event: 'Failure to pay',         notionalBase: 3.1, recoveryBase: 22 },
  { entity: 'Nordic Telecom AB',     event: 'Restructuring trigger',  notionalBase: 1.9, recoveryBase: 38 },
];

// ── Cache ──

const CACHE_TTL = 60 * 60 * 1000;
let cacheData: CDSResponse | null = null;
let cacheTime = 0;

// ── Generator ──

function generate(): CDSResponse {
  const today = new Date().toISOString().slice(0, 10);
  const seed = hashSeed('cds-' + today);
  const rng = mulberry32(seed);

  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // ── Sovereign CDS ──
  const sovereignCDS: SovereignCDS[] = SOVEREIGN_SEEDS.map(s => {
    const spread5Y = round(jitter(s.spread5YBase, 0.12), 1);
    const change1D = round((rng() - 0.48) * s.spread5YBase * 0.03, 1);
    const change1W = round((rng() - 0.46) * s.spread5YBase * 0.06, 1);
    const change1M = round((rng() - 0.44) * s.spread5YBase * 0.10, 1);
    // Implied PD: spread / (1 - recovery) over 5Y horizon, expressed as %
    const impliedPD = round((spread5Y / 10000) / (1 - s.recovery / 100) * 5 * 100, 2);

    return {
      country: s.country,
      spread5Y,
      change1D,
      change1W,
      change1M,
      rating: s.rating,
      impliedPD,
      recovery: s.recovery,
    };
  });

  // ── Corporate CDS ──
  const corporateCDS: CorporateCDS[] = CORPORATE_SEEDS.map(s => {
    const spread5Y = round(jitter(s.spread5YBase, 0.10), 1);
    const change1D = round((rng() - 0.48) * s.spread5YBase * 0.025, 1);
    const change1M = round((rng() - 0.44) * s.spread5YBase * 0.08, 1);
    const recovery = 40;
    const impliedPD = round((spread5Y / 10000) / (1 - recovery / 100) * 5 * 100, 2);
    const basis = round(clamp((rng() - 0.5) * 60, -30, 30), 1);

    return {
      entity: s.entity,
      ticker: s.ticker,
      sector: s.sector,
      spread5Y,
      change1D,
      change1M,
      rating: s.rating,
      impliedPD,
      recovery,
      basis,
    };
  });

  // ── Indices ──
  const indices: CDSIndex[] = INDEX_SEEDS.map(idx => {
    const spread = round(jitter(idx.spreadBase, 0.08), 1);
    const change1D = round((rng() - 0.48) * idx.spreadBase * 0.02, 1);
    const change1W = round((rng() - 0.46) * idx.spreadBase * 0.05, 1);

    return {
      name: idx.name,
      spread,
      change1D,
      change1W,
      series: idx.series,
      maturity: '5Y',
      roll: idx.roll,
    };
  });

  // ── Term Structure ──
  const igBase5Y = 62;
  const hyBase5Y = 385;
  const termStructure: TermStructureEntry[] = [
    { tenor: '1Y',  igMult: 0.45, hyMult: 0.55 },
    { tenor: '3Y',  igMult: 0.78, hyMult: 0.82 },
    { tenor: '5Y',  igMult: 1.00, hyMult: 1.00 },
    { tenor: '10Y', igMult: 1.18, hyMult: 1.12 },
  ].map(t => {
    const igSpread = round(jitter(igBase5Y * t.igMult, 0.06), 1);
    const hySpread = round(jitter(hyBase5Y * t.hyMult, 0.06), 1);
    const igRef = round(jitter(igBase5Y, 0.06), 1);
    const hyRef = round(jitter(hyBase5Y, 0.06), 1);
    const slopeVs5Y = round(igSpread - igRef, 1);

    return {
      tenor: t.tenor,
      igSpread,
      hySpread,
      slopeVs5Y,
    };
  });

  // ── Credit Events ──
  const todayDate = new Date();
  const creditEvents: CreditEvent[] = CREDIT_EVENT_TEMPLATES.slice(0, 3).map((evt, i) => {
    const daysAgo = Math.floor(rng() * 30) + i * 10 + 1;
    const eventDate = new Date(todayDate);
    eventDate.setDate(eventDate.getDate() - daysAgo);

    return {
      date: eventDate.toISOString().slice(0, 10),
      entity: evt.entity,
      event: evt.event,
      notionalAffected: round(jitter(evt.notionalBase, 0.15), 1),
      recoveryAuction: round(clamp(jitter(evt.recoveryBase, 0.12), 2, 80), 1),
    };
  }).sort((a, b) => b.date.localeCompare(a.date));

  // ── Market Metrics ──
  const totalNotional = round(jitter(9.8, 0.08), 1);
  const weeklyVolume = round(jitter(185, 0.12), 0);
  const basisAvgIG = round(clamp((rng() - 0.5) * 20, -10, 10), 1);
  const basisAvgHY = round(clamp((rng() - 0.5) * 40, -20, 20), 1);
  const skewIndex = round(jitter(1.15, 0.10), 2);

  // Systemic risk based on IG spread level
  const igLevel = indices.find(i => i.name === 'CDX.NA.IG')?.spread ?? 62;
  let systemicRisk: 'low' | 'moderate' | 'elevated' | 'high';
  if (igLevel < 55) systemicRisk = 'low';
  else if (igLevel < 75) systemicRisk = 'moderate';
  else if (igLevel < 100) systemicRisk = 'elevated';
  else systemicRisk = 'high';

  const marketMetrics: MarketMetrics = {
    totalNotional,
    weeklyVolume,
    basisAvgIG,
    basisAvgHY,
    skewIndex,
    systemicRisk,
  };

  return {
    sovereignCDS,
    corporateCDS,
    indices,
    termStructure,
    creditEvents,
    marketMetrics,
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
    console.error('[CDS] Error:', (err as Error).message);
    if (cacheData) return res.json(cacheData);
    res.status(500).json({ error: 'Failed to generate CDS data' });
  }
});

export default router;
