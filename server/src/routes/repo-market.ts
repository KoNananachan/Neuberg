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

// ── Types ──

interface RepoSummary {
  sofrRate: number;
  effFedFunds: number;
  triPartyVol: number;
  bilateralVol: number;
  totalFails: number;
}

interface RepoRateEntry {
  type: string;
  rate: number;
  change1d: number;
  volume: number;
  percentile1Y: number;
}

interface CollateralEntry {
  type: string;
  avgRate: number;
  haircut: number;
  volumeShare: number;
  change1w: number;
}

interface TermStructureEntry {
  tenor: string;
  rate: number;
  spreadToON: number;
  volume: number;
}

interface FailsEntry {
  weekEnding: string;
  treasuryFails: number;
  agencyFails: number;
  total: number;
  change: number;
}

interface RepoMarketResponse {
  summary: RepoSummary;
  rates: RepoRateEntry[];
  collateral: CollateralEntry[];
  termStructure: TermStructureEntry[];
  fails: FailsEntry[];
  generatedAt: string;
}

// ── Cache ──

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: RepoMarketResponse; ts: number } | null = null;

// ── Static configs ──

const RATE_CONFIGS = [
  { type: 'SOFR',              baseRate: 5.31, baseVol: 2100, pctRange: [60, 80] },
  { type: 'BGCR',              baseRate: 5.30, baseVol: 780,  pctRange: [55, 75] },
  { type: 'TGCR',              baseRate: 5.29, baseVol: 650,  pctRange: [50, 72] },
  { type: 'Tri-Party GC',      baseRate: 5.30, baseVol: 5200, pctRange: [58, 78] },
  { type: 'GCF Treasury',      baseRate: 5.31, baseVol: 310,  pctRange: [55, 76] },
  { type: 'GCF Agency',        baseRate: 5.33, baseVol: 85,   pctRange: [48, 70] },
  { type: 'Fed Funds Effective', baseRate: 5.33, baseVol: 95,  pctRange: [65, 85] },
  { type: 'OBFR',              baseRate: 5.32, baseVol: 230,  pctRange: [60, 80] },
];

const COLLATERAL_CONFIGS = [
  { type: 'Treasury',    baseRate: 5.30, haircut: 2.0,  volumeShare: 62, spreadBps: 0 },
  { type: 'Agency',      baseRate: 5.32, haircut: 2.5,  volumeShare: 15, spreadBps: 2 },
  { type: 'Agency MBS',  baseRate: 5.38, haircut: 4.0,  volumeShare: 12, spreadBps: 8 },
  { type: 'Corp Bond',   baseRate: 5.55, haircut: 5.0,  volumeShare: 6,  spreadBps: 25 },
  { type: 'Equity',      baseRate: 5.80, haircut: 8.0,  volumeShare: 3,  spreadBps: 50 },
  { type: 'Municipal',   baseRate: 5.45, haircut: 5.0,  volumeShare: 2,  spreadBps: 15 },
];

const TERM_TENORS = [
  { tenor: 'O/N', baseRate: 5.31, baseVol: 5800, spreadToON: 0 },
  { tenor: '1W',  baseRate: 5.32, baseVol: 420,  spreadToON: 1 },
  { tenor: '2W',  baseRate: 5.33, baseVol: 180,  spreadToON: 2 },
  { tenor: '1M',  baseRate: 5.34, baseVol: 310,  spreadToON: 3 },
  { tenor: '3M',  baseRate: 5.36, baseVol: 250,  spreadToON: 5 },
  { tenor: '6M',  baseRate: 5.32, baseVol: 120,  spreadToON: 1 },
  { tenor: '1Y',  baseRate: 5.22, baseVol: 65,   spreadToON: -9 },
];

// ── Data generation ──

function generate(): RepoMarketResponse {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-repo-market'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // Summary
  const sofrRate = Math.round(jitter(5.31, 0.004) * 1000) / 1000;
  const effFedFunds = Math.round(jitter(5.33, 0.003) * 1000) / 1000;
  const triPartyVol = Math.round(jitter(5400, 0.08) * 10) / 10;
  const bilateralVol = Math.round(jitter(2800, 0.10) * 10) / 10;
  const totalFails = Math.round(jitter(42, 0.25) * 10) / 10;

  const summary: RepoSummary = { sofrRate, effFedFunds, triPartyVol, bilateralVol, totalFails };

  // Rates
  const rates: RepoRateEntry[] = RATE_CONFIGS.map(cfg => {
    const rate = Math.round(jitter(cfg.baseRate, 0.005) * 1000) / 1000;
    const change1d = Math.round((rng() - 0.5) * 4 * 100) / 100;
    const volume = Math.round(jitter(cfg.baseVol, 0.08) * 10) / 10;
    const percentile1Y = Math.round(cfg.pctRange[0] + rng() * (cfg.pctRange[1] - cfg.pctRange[0]));
    return { type: cfg.type, rate, change1d, volume, percentile1Y };
  });

  // Collateral
  const collateral: CollateralEntry[] = COLLATERAL_CONFIGS.map(cfg => {
    const avgRate = Math.round(jitter(cfg.baseRate, 0.005) * 100) / 100;
    const haircut = Math.round(jitter(cfg.haircut, 0.05) * 100) / 100;
    const volumeShare = Math.round(jitter(cfg.volumeShare, 0.06) * 10) / 10;
    const change1w = Math.round((rng() - 0.5) * 6 * 100) / 100;
    return { type: cfg.type, avgRate, haircut, volumeShare, change1w };
  });

  // Term structure
  const onRate = Math.round(jitter(5.31, 0.004) * 1000) / 1000;
  const termStructure: TermStructureEntry[] = TERM_TENORS.map(cfg => {
    const rate = Math.round(jitter(cfg.baseRate, 0.005) * 1000) / 1000;
    const spreadToON = Math.round((rate - onRate) * 10000) / 100;
    const volume = Math.round(jitter(cfg.baseVol, 0.12) * 10) / 10;
    return { tenor: cfg.tenor, rate, spreadToON, volume };
  });

  // Fails (8 weeks)
  const fails: FailsEntry[] = [];
  let prevTotal = 0;
  for (let w = 7; w >= 0; w--) {
    const d = new Date();
    d.setDate(d.getDate() - w * 7);
    // Align to Wednesday (T+1 settlement reporting)
    const dayOfWeek = d.getDay();
    const offset = (dayOfWeek >= 3) ? dayOfWeek - 3 : dayOfWeek + 4;
    d.setDate(d.getDate() - offset);

    const weekEnding = d.toISOString().slice(0, 10);
    const treasuryFails = Math.round(jitter(35, 0.30) * 10) / 10;
    const agencyFails = Math.round(jitter(8, 0.35) * 10) / 10;
    const total = Math.round((treasuryFails + agencyFails) * 10) / 10;
    const change = prevTotal > 0
      ? Math.round(((total - prevTotal) / prevTotal) * 10000) / 100
      : 0;
    prevTotal = total;
    fails.push({ weekEnding, treasuryFails, agencyFails, total, change });
  }

  return { summary, rates, collateral, termStructure, fails, generatedAt: new Date().toISOString() };
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
    console.error('[RepoMarket] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate repo market data' });
  }
});

export default router;
