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

interface PositionSummary {
  totalNetPositions: number;
  treasuryNet: number;
  agencyNet: number;
  corpNet: number;
  weeklyChange: number;
}

interface PositionEntry {
  category: string;
  longPosition: number;
  shortPosition: number;
  netPosition: number;
  change1w: number;
  change4w: number;
}

interface CorporatePositionEntry {
  category: string;
  netPosition: number;
  change1w: number;
  change4w: number;
}

interface HistoricalTrendEntry {
  weekEnding: string;
  totalNet: number;
  treasuryNet: number;
  corpNet: number;
}

interface FinancingActivity {
  triPartyRepo: number;
  bilateralRepo: number;
  reverseRepo: number;
  netFinancing: number;
  change1w: number;
}

interface PrimaryDealerResponse {
  summary: PositionSummary;
  positions: PositionEntry[];
  corporatePositions: CorporatePositionEntry[];
  historicalTrend: HistoricalTrendEntry[];
  financingActivity: FinancingActivity;
  generatedAt: string;
}

// ── Cache ──

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: PrimaryDealerResponse; ts: number } | null = null;

// ── Static configs ──

const POSITION_CONFIGS = [
  { category: 'Treasury Bills',           baseLong: 72,  baseShort: 35, netBias: 37  },
  { category: 'Treasury Coupons <6Y',     baseLong: 95,  baseShort: 55, netBias: 40  },
  { category: 'Treasury Coupons 6-11Y',   baseLong: 48,  baseShort: 32, netBias: 16  },
  { category: 'Treasury Coupons >11Y',    baseLong: 28,  baseShort: 22, netBias: 6   },
  { category: 'Agency Debt',              baseLong: 18,  baseShort: 8,  netBias: 10  },
  { category: 'Agency MBS',               baseLong: 42,  baseShort: 55, netBias: -13 },
];

const CORPORATE_CONFIGS = [
  { category: 'IG Corporate',    baseNet: 15,   range: 6  },
  { category: 'HY Corporate',    baseNet: 3.5,  range: 2  },
  { category: 'Commercial Paper', baseNet: 8,   range: 3  },
  { category: 'Asset-Backed',    baseNet: 5,    range: 2  },
];

// ── Data generation ──

function generate(): PrimaryDealerResponse {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-primary-dealer'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const round2 = (v: number) => Math.round(v * 100) / 100;

  // Positions (6 categories)
  const positions: PositionEntry[] = POSITION_CONFIGS.map(cfg => {
    const longPosition = round2(jitter(cfg.baseLong, 0.08));
    const shortPosition = round2(jitter(cfg.baseShort, 0.10));
    const netPosition = round2(longPosition - shortPosition);
    const change1w = round2((rng() - 0.48) * 4);
    const change4w = round2((rng() - 0.48) * 8);
    return { category: cfg.category, longPosition, shortPosition, netPosition, change1w, change4w };
  });

  // Aggregate treasury/agency nets
  const treasuryNet = round2(
    positions.filter(p => p.category.startsWith('Treasury')).reduce((s, p) => s + p.netPosition, 0)
  );
  const agencyNet = round2(
    positions.filter(p => p.category.startsWith('Agency')).reduce((s, p) => s + p.netPosition, 0)
  );

  // Corporate positions (4 categories)
  const corporatePositions: CorporatePositionEntry[] = CORPORATE_CONFIGS.map(cfg => {
    const netPosition = round2(cfg.baseNet + (rng() - 0.5) * cfg.range);
    const change1w = round2((rng() - 0.48) * 2);
    const change4w = round2((rng() - 0.48) * 4);
    return { category: cfg.category, netPosition, change1w, change4w };
  });

  const corpNet = round2(corporatePositions.reduce((s, c) => s + c.netPosition, 0));
  const totalNetPositions = round2(treasuryNet + agencyNet + corpNet);
  const weeklyChange = round2(
    positions.reduce((s, p) => s + p.change1w, 0) + corporatePositions.reduce((s, c) => s + c.change1w, 0)
  );

  const summary: PositionSummary = { totalNetPositions, treasuryNet, agencyNet, corpNet, weeklyChange };

  // Historical trend (12 weeks)
  const historicalTrend: HistoricalTrendEntry[] = [];
  for (let w = 11; w >= 0; w--) {
    const d = new Date();
    d.setDate(d.getDate() - w * 7);
    // Align to Wednesday (NY Fed reporting day)
    const dayOfWeek = d.getDay();
    const offset = (dayOfWeek >= 3) ? dayOfWeek - 3 : dayOfWeek + 4;
    d.setDate(d.getDate() - offset);
    const weekEnding = d.toISOString().slice(0, 10);

    const tNet = round2(jitter(treasuryNet, 0.12));
    const cNet = round2(jitter(corpNet, 0.15));
    const total = round2(tNet + agencyNet + cNet + (rng() - 0.5) * 6);
    historicalTrend.push({ weekEnding, totalNet: total, treasuryNet: tNet, corpNet: cNet });
  }

  // Financing activity
  const triPartyRepo = round2(jitter(2400, 0.06));
  const bilateralRepo = round2(jitter(1800, 0.08));
  const reverseRepo = round2(jitter(1600, 0.07));
  const netFinancing = round2(triPartyRepo + bilateralRepo - reverseRepo);
  const finChange1w = round2((rng() - 0.48) * 40);

  const financingActivity: FinancingActivity = {
    triPartyRepo, bilateralRepo, reverseRepo, netFinancing, change1w: finChange1w,
  };

  return { summary, positions, corporatePositions, historicalTrend, financingActivity, generatedAt: new Date().toISOString() };
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
    console.error('[PrimaryDealer] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate primary dealer data' });
  }
});

export default router;
