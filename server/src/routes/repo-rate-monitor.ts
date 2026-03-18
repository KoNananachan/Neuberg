import { Router } from 'express';

const router = Router();

// ── Seeded PRNG ──

function mulberry32(a: number) { return function(){let t=(a+=0x6d2b79f5);t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;}; }
function hashSeed(str: string): number { let hash=0;for(let i=0;i<str.length;i++){const char=str.charCodeAt(i);hash=((hash<<5)-hash)+char;hash|=0;}return Math.abs(hash); }

// ── Cache ──

let cache: { data: any; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

// ── Types ──

interface OvernightRate {
  name: string;
  code: string;
  rate: number;
  change: number;
  weekAvg: number;
  monthAvg: number;
}

interface TermRepo {
  tenor: string;
  gcRate: number;
  spreadToSOFR: number;
  volume: number;
}

interface CollateralSpecific {
  collateral: string;
  overnightRate: number;
  termRate: number;
  haircut: number;
  availability: 'AMPLE' | 'TIGHT' | 'SCARCE';
}

interface SpecialCollateral {
  issue: string;
  tenor: string;
  repoRate: number;
  spreadToGC: number;
  specialness: number;
}

interface MarketSummary {
  totalVolume: number;
  avgGCRate: number;
  gcFfSpread: number;
  dayOverDayChange: number;
}

interface RepoRateMonitorResponse {
  overnightRates: OvernightRate[];
  termRepo: TermRepo[];
  collateralSpecific: CollateralSpecific[];
  specialCollateral: SpecialCollateral[];
  marketSummary: MarketSummary;
  generatedAt: string;
}

// ── Static configs ──

const OVERNIGHT_CONFIGS = [
  { name: 'Secured Overnight Financing Rate',   code: 'SOFR',          base: 4.31 },
  { name: 'Fed Funds Effective Rate',            code: 'FF Effective',  base: 4.33 },
  { name: 'Overnight Bank Funding Rate',         code: 'OBFR',         base: 4.32 },
  { name: 'Tri-Party General Collateral Rate',   code: 'TGCR',         base: 4.30 },
  { name: 'Broad General Collateral Rate',       code: 'BGCR',         base: 4.30 },
  { name: 'Tri-Party GC Repo',                   code: 'Tri-Party GC', base: 4.29 },
];

const TERM_CONFIGS = [
  { tenor: '1W',  baseGC: 4.33, baseVolume: 185 },
  { tenor: '2W',  baseGC: 4.35, baseVolume: 92  },
  { tenor: '1M',  baseGC: 4.38, baseVolume: 128 },
  { tenor: '3M',  baseGC: 4.44, baseVolume: 65  },
  { tenor: '6M',  baseGC: 4.50, baseVolume: 34  },
];

const COLLATERAL_CONFIGS = [
  { collateral: 'UST GC',        baseON: 4.30, baseTerm: 4.38, baseHaircut: 2.0  },
  { collateral: 'Agency MBS',    baseON: 4.36, baseTerm: 4.45, baseHaircut: 4.5  },
  { collateral: 'Corporate',     baseON: 4.52, baseTerm: 4.62, baseHaircut: 8.0  },
];

const SPECIAL_CONFIGS = [
  { issue: 'On-the-Run 2Y UST',  tenor: '2Y',  baseRate: 3.95, baseGC: 4.30 },
  { issue: 'On-the-Run 5Y UST',  tenor: '5Y',  baseRate: 3.88, baseGC: 4.30 },
  { issue: 'On-the-Run 10Y UST', tenor: '10Y', baseRate: 3.80, baseGC: 4.30 },
  { issue: 'On-the-Run 30Y UST', tenor: '30Y', baseRate: 4.05, baseGC: 4.30 },
];

// ── Data generation ──

function generate(): RepoRateMonitorResponse {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-repo-rate-monitor'));
  const round4 = (n: number) => Math.round(n * 10000) / 10000;
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const round1 = (n: number) => Math.round(n * 10) / 10;
  const jitter = (base: number, bps: number) => round4(base + (rng() - 0.5) * 2 * (bps / 10000));

  // 1. Overnight Rates
  const overnightRates: OvernightRate[] = OVERNIGHT_CONFIGS.map(cfg => {
    const rate = jitter(cfg.base, 3);
    const change = round4((rng() - 0.5) * 0.006);
    const weekAvg = jitter(cfg.base, 2);
    const monthAvg = jitter(cfg.base, 4);
    return { name: cfg.name, code: cfg.code, rate, change, weekAvg, monthAvg };
  });

  const sofrRate = overnightRates[0].rate;
  const ffRate = overnightRates[1].rate;

  // 2. Term Repo
  const termRepo: TermRepo[] = TERM_CONFIGS.map(cfg => {
    const gcRate = jitter(cfg.baseGC, 4);
    const spreadToSOFR = round2((gcRate - sofrRate) * 100); // bps
    const volume = round1(cfg.baseVolume * (0.85 + rng() * 0.3));
    return { tenor: cfg.tenor, gcRate, spreadToSOFR, volume };
  });

  // 3. Collateral-Specific
  const collateralSpecific: CollateralSpecific[] = COLLATERAL_CONFIGS.map(cfg => {
    const overnightRate = jitter(cfg.baseON, 4);
    const termRate = jitter(cfg.baseTerm, 5);
    const haircut = round1(cfg.baseHaircut + (rng() - 0.5) * 1.0);

    // Availability based on overnight rate distance from GC
    const spread = overnightRate - sofrRate;
    let availability: 'AMPLE' | 'TIGHT' | 'SCARCE';
    if (spread > 0.15) availability = 'SCARCE';
    else if (spread > 0.05) availability = 'TIGHT';
    else availability = 'AMPLE';

    return { collateral: cfg.collateral, overnightRate, termRate, haircut, availability };
  });

  // 4. Special Collateral (on-the-run USTs trading special)
  const specialCollateral: SpecialCollateral[] = SPECIAL_CONFIGS.map(cfg => {
    const repoRate = jitter(cfg.baseRate, 8);
    const gcRate = jitter(cfg.baseGC, 3);
    const spreadToGC = round2((repoRate - gcRate) * 100); // bps (negative = trading special)
    const specialness = round1(Math.abs(spreadToGC)); // bps magnitude
    return { issue: cfg.issue, tenor: cfg.tenor, repoRate, spreadToGC, specialness };
  });

  // 5. Market Summary
  const totalVolume = round1(
    termRepo.reduce((sum, t) => sum + t.volume, 0) + 2100 + rng() * 400,
  );
  const avgGCRate = round4(
    overnightRates
      .filter(r => ['TGCR', 'BGCR', 'Tri-Party GC'].includes(r.code))
      .reduce((sum, r) => sum + r.rate, 0) / 3,
  );
  const gcFfSpread = round2((avgGCRate - ffRate) * 100); // bps
  const dayOverDayChange = round4((rng() - 0.5) * 0.008);

  const marketSummary: MarketSummary = {
    totalVolume,
    avgGCRate,
    gcFfSpread,
    dayOverDayChange,
  };

  return {
    overnightRates,
    termRepo,
    collateralSpecific,
    specialCollateral,
    marketSummary,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[RepoRateMonitor] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate repo rate monitor data' });
  }
});

export default router;
