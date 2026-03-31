import { Router } from 'express';

import { mulberry32, hashSeed, seededRandom } from '../lib/seeded-data.js';
const router = Router();

// ── Types ──

interface CDSIndex {
  name: string;
  level: number;
  dailyChangeBps: number;
  weekChangeBps: number;
  monthChangeBps: number;
  series: number;
}

interface SingleNameCDS {
  entity: string;
  sector: string;
  rating: string;
  spread5Y: number;
  dailyChangeBps: number;
  spread1Y: number;
  spread10Y: number;
  recoveryRate: number;
  cdsImpliedPD: number;
}

interface SectorAggregate {
  sector: string;
  avgSpread: number;
  medianSpread: number;
  wideningEntities: number;
  tighteningEntities: number;
  spreadRange: { min: number; max: number };
  trend30d: 'widening' | 'tightening' | 'stable';
}

interface CDSBasis {
  issuer: string;
  cdsBps: number;
  cashSpreadBps: number;
  basisBps: number;
  basisTrend: 'positive' | 'negative' | 'neutral';
}

interface SignificantMove {
  entity: string;
  direction: 'wider' | 'tighter';
  moveBps: number;
  currentSpread: number;
  catalyst: string;
}

interface TermStructureEntry {
  entity: string;
  tenors: { '1Y': number; '3Y': number; '5Y': number; '7Y': number; '10Y': number };
}

interface CDSMarketMonitorResponse {
  timestamp: string;
  indexOverview: CDSIndex[];
  singleNameSpreads: SingleNameCDS[];
  sectorAggregates: SectorAggregate[];
  cdsBasis: CDSBasis[];
  significantMoves: SignificantMove[];
  termStructure: TermStructureEntry[];
}

// ── Seed Data ──

const INDEX_SEEDS = [
  { name: 'CDX IG',           levelBase: 60,  series: 42 },
  { name: 'CDX HY',           levelBase: 400, series: 42 },
  { name: 'iTraxx Europe',    levelBase: 65,  series: 41 },
  { name: 'iTraxx Crossover', levelBase: 350, series: 41 },
];

interface EntitySeed {
  entity: string;
  sector: string;
  rating: string;
  spread5YBase: number;
  recoveryBase: number;
}

const ENTITY_SEEDS: EntitySeed[] = [
  { entity: 'Apple',             sector: 'Technology',      rating: 'AA+',  spread5YBase: 20,  recoveryBase: 40 },
  { entity: 'Microsoft',         sector: 'Technology',      rating: 'AAA',  spread5YBase: 18,  recoveryBase: 40 },
  { entity: 'JPMorgan',          sector: 'Financials',      rating: 'A+',   spread5YBase: 45,  recoveryBase: 40 },
  { entity: 'Goldman Sachs',     sector: 'Financials',      rating: 'A+',   spread5YBase: 55,  recoveryBase: 40 },
  { entity: 'Ford',              sector: 'Automotive',      rating: 'BB+',  spread5YBase: 180, recoveryBase: 35 },
  { entity: 'General Motors',    sector: 'Automotive',      rating: 'BBB',  spread5YBase: 140, recoveryBase: 35 },
  { entity: 'Tesla',             sector: 'Automotive',      rating: 'BBB-', spread5YBase: 120, recoveryBase: 35 },
  { entity: 'T-Mobile',          sector: 'Telecom',         rating: 'BBB',  spread5YBase: 85,  recoveryBase: 40 },
  { entity: 'Netflix',           sector: 'Media',           rating: 'BBB',  spread5YBase: 75,  recoveryBase: 40 },
  { entity: 'Meta',              sector: 'Technology',      rating: 'AA-',  spread5YBase: 35,  recoveryBase: 40 },
  { entity: 'Amazon',            sector: 'Technology',      rating: 'AA',   spread5YBase: 25,  recoveryBase: 40 },
  { entity: 'Boeing',            sector: 'Aerospace',       rating: 'BBB-', spread5YBase: 200, recoveryBase: 35 },
  { entity: 'Delta Airlines',    sector: 'Airlines',        rating: 'BBB-', spread5YBase: 160, recoveryBase: 30 },
  { entity: 'Carnival Corp',     sector: 'Leisure',         rating: 'B+',   spread5YBase: 350, recoveryBase: 25 },
  { entity: 'AMC Entertainment', sector: 'Media',           rating: 'CCC+', spread5YBase: 800, recoveryBase: 15 },
  { entity: "Macy's",            sector: 'Retail',          rating: 'BB+',  spread5YBase: 280, recoveryBase: 30 },
  { entity: 'Nordstrom',         sector: 'Retail',          rating: 'BB+',  spread5YBase: 250, recoveryBase: 30 },
  { entity: 'Sprint/T-Mobile',   sector: 'Telecom',         rating: 'BBB',  spread5YBase: 100, recoveryBase: 40 },
  { entity: 'Verizon',           sector: 'Telecom',         rating: 'BBB+', spread5YBase: 55,  recoveryBase: 40 },
  { entity: 'AT&T',              sector: 'Telecom',         rating: 'BBB',  spread5YBase: 95,  recoveryBase: 40 },
];

const CATALYST_POOL = [
  'Earnings beat expectations',
  'Earnings miss / guidance cut',
  'Rating downgrade by S&P',
  'Rating upgrade by Moody\'s',
  'M&A announcement',
  'Macro risk-off repricing',
  'Sector rotation out of risk',
  'Leveraged buyout rumors',
  'Debt refinancing concerns',
  'Strong cash flow report',
  'Covenant breach risk',
  'Credit facility amendment',
  'Asset sale announcement',
  'Management restructuring',
  'Industry headwinds',
];

// ── Cache ──

let cache: { data: CDSMarketMonitorResponse; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

// ── Helpers ──

const IG_RATINGS = new Set(['AAA', 'AA+', 'AA', 'AA-', 'A+', 'A', 'A-', 'BBB+', 'BBB', 'BBB-']);

function isIG(rating: string): boolean {
  return IG_RATINGS.has(rating);
}

// ── Generator ──

function generate(): CDSMarketMonitorResponse {
  const rng = seededRandom('credit-default-swaps');

  const jitter = (base: number, pct: number): number => base * (1 + (rng() - 0.5) * 2 * pct);
  const round1 = (v: number): number => Math.round(v * 10) / 10;
  const round2 = (v: number): number => Math.round(v * 100) / 100;

  // ── 1. Index Overview ──
  const indexOverview: CDSIndex[] = INDEX_SEEDS.map((idx) => {
    const level = round1(jitter(idx.levelBase, 0.08));
    const dailyChangeBps = round2((rng() - 0.48) * idx.levelBase * 0.025);
    const weekChangeBps = round2((rng() - 0.46) * idx.levelBase * 0.05);
    const monthChangeBps = round2((rng() - 0.44) * idx.levelBase * 0.10);
    return { name: idx.name, level, dailyChangeBps, weekChangeBps, monthChangeBps, series: idx.series };
  });

  // ── 2. Single-Name CDS Spreads ──
  const singleNameSpreads: SingleNameCDS[] = ENTITY_SEEDS.map((s) => {
    const spread5Y = round1(jitter(s.spread5YBase, 0.10));
    const dailyChangeBps = round1((rng() - 0.48) * s.spread5YBase * 0.03);

    // Term structure: 1Y tighter than 5Y, 10Y wider
    const spread1Y = round1(spread5Y * (0.45 + rng() * 0.15));
    const spread10Y = round1(spread5Y * (1.15 + rng() * 0.20));

    const recoveryRate = round1(jitter(s.recoveryBase, 0.05));

    // CDS implied default probability: spread / (1 - recovery) * tenor
    const cdsImpliedPD = round2(
      ((spread5Y / 10000) / (1 - s.recoveryBase / 100)) * 5 * 100,
    );

    return {
      entity: s.entity,
      sector: s.sector,
      rating: s.rating,
      spread5Y,
      dailyChangeBps,
      spread1Y,
      spread10Y,
      recoveryRate,
      cdsImpliedPD,
    };
  });

  // ── 3. Sector Aggregates ──
  const sectorMap = new Map<string, SingleNameCDS[]>();
  for (const sn of singleNameSpreads) {
    const arr = sectorMap.get(sn.sector) || [];
    arr.push(sn);
    sectorMap.set(sn.sector, arr);
  }

  const sectorAggregates: SectorAggregate[] = Array.from(sectorMap.entries()).map(
    ([sector, entities]) => {
      const spreads = entities.map((e) => e.spread5Y).sort((a, b) => a - b);
      const avgSpread = round1(spreads.reduce((a, b) => a + b, 0) / spreads.length);
      const medianSpread = round1(
        spreads.length % 2 === 0
          ? (spreads[spreads.length / 2 - 1] + spreads[spreads.length / 2]) / 2
          : spreads[Math.floor(spreads.length / 2)],
      );

      const wideningEntities = entities.filter((e) => e.dailyChangeBps > 0).length;
      const tighteningEntities = entities.filter((e) => e.dailyChangeBps < 0).length;

      const trendVal = rng();
      const trend30d: 'widening' | 'tightening' | 'stable' =
        trendVal < 0.35 ? 'widening' : trendVal < 0.65 ? 'stable' : 'tightening';

      return {
        sector,
        avgSpread,
        medianSpread,
        wideningEntities,
        tighteningEntities,
        spreadRange: { min: spreads[0], max: spreads[spreads.length - 1] },
        trend30d,
      };
    },
  );

  // ── 4. CDS Basis (vs cash bonds) ──
  const basisIssuers = singleNameSpreads.slice(0, 10);
  const cdsBasis: CDSBasis[] = basisIssuers.map((sn) => {
    const cdsBps = sn.spread5Y;
    // Cash spread typically slightly different from CDS spread
    const basisOffset = round1((rng() - 0.45) * 30);
    const cashSpreadBps = round1(cdsBps - basisOffset);
    const basisBps = round1(cdsBps - cashSpreadBps);

    const basisTrend: 'positive' | 'negative' | 'neutral' =
      basisBps > 5 ? 'positive' : basisBps < -5 ? 'negative' : 'neutral';

    return { issuer: sn.entity, cdsBps, cashSpreadBps, basisBps, basisTrend };
  });

  // ── 5. Recent Significant Moves ──
  const shuffledEntities = [...singleNameSpreads].sort(() => rng() - 0.5);
  const movers = shuffledEntities.slice(0, 10);

  const significantMoves: SignificantMove[] = movers.map((sn) => {
    const direction: 'wider' | 'tighter' = rng() > 0.45 ? 'wider' : 'tighter';
    const moveScale = isIG(sn.rating) ? 0.08 : 0.12;
    const moveBps = round1(sn.spread5Y * moveScale * (0.5 + rng() * 0.5));
    const catalystIdx = Math.floor(rng() * CATALYST_POOL.length);

    return {
      entity: sn.entity,
      direction,
      moveBps,
      currentSpread: sn.spread5Y,
      catalyst: CATALYST_POOL[catalystIdx],
    };
  });

  // ── 6. Term Structure for selected names ──
  const termStructureNames = [
    singleNameSpreads[0],  // Apple
    singleNameSpreads[2],  // JPMorgan
    singleNameSpreads[4],  // Ford
    singleNameSpreads[11], // Boeing
    singleNameSpreads[13], // Carnival Corp
  ];

  const termStructure: TermStructureEntry[] = termStructureNames.map((sn) => {
    const s5 = sn.spread5Y;
    return {
      entity: sn.entity,
      tenors: {
        '1Y': round1(s5 * (0.40 + rng() * 0.15)),
        '3Y': round1(s5 * (0.70 + rng() * 0.12)),
        '5Y': s5,
        '7Y': round1(s5 * (1.08 + rng() * 0.10)),
        '10Y': round1(s5 * (1.18 + rng() * 0.15)),
      },
    };
  });

  return {
    timestamp: new Date().toISOString(),
    indexOverview,
    singleNameSpreads,
    sectorAggregates,
    cdsBasis,
    significantMoves,
    termStructure,
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL) {
      res.json(cache.data);
      return;
    }
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[CreditDefaultSwaps] Error:', (err as Error).message);
    if (cache) {
      res.json(cache.data);
      return;
    }
    res.status(500).json({ error: 'Failed to generate CDS market monitor data' });
  }
});

export default router;
