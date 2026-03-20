import { Router } from 'express';

const router = Router();

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// -- Types --

interface SectorDef {
  name: string;
  igBase: number;
  hyBase: number;
  igWeightBase: number;
  hyWeightBase: number;
  igRating: string;
  hyRating: string;
  igDurationBase: number;
  hyDurationBase: number;
  numIssuersBase: number;
  numIssuersHyBase: number;
}

interface SectorData {
  name: string;
  igSpread: number;
  hySpread: number;
  igChange1w: number;
  igChange1m: number;
  hyChange1w: number;
  hyChange1m: number;
  igPercentile: number;
  hyPercentile: number;
  igZScore: number;
  hyZScore: number;
  igWeight: number;
  hyWeight: number;
  igRating: string;
  hyRating: string;
  igDuration: number;
  hyDuration: number;
  numIssuers: number;
  numIssuersHy: number;
}

interface IgVsHyEntry {
  sector: string;
  igSpread: number;
  hySpread: number;
  differential: number;
  historicalAvg: number;
  richCheap: 'Rich' | 'Fair' | 'Cheap';
}

interface Summary {
  broadIgSpread: number;
  broadHySpread: number;
  tightestSector: string;
  widestSector: string;
  tightestSectorHy: string;
  widestSectorHy: string;
  avgPercentileIg: number;
  avgPercentileHy: number;
}

interface SectorCreditSpreadResponse {
  sectors: SectorData[];
  igVsHy: IgVsHyEntry[];
  summary: Summary;
  generatedAt: string;
}

// -- Static Definitions --

const SECTOR_DEFS: SectorDef[] = [
  { name: 'Energy',                  igBase: 135, hyBase: 420, igWeightBase: 9.2,  hyWeightBase: 13.5, igRating: 'A-',   hyRating: 'B+',  igDurationBase: 7.8,  hyDurationBase: 4.2, numIssuersBase: 48,  numIssuersHyBase: 62 },
  { name: 'Materials',               igBase: 105, hyBase: 380, igWeightBase: 4.1,  hyWeightBase: 5.8,  igRating: 'BBB+', hyRating: 'B+',  igDurationBase: 6.9,  hyDurationBase: 3.9, numIssuersBase: 35,  numIssuersHyBase: 28 },
  { name: 'Industrials',             igBase: 95,  hyBase: 355, igWeightBase: 8.8,  hyWeightBase: 9.2,  igRating: 'A-',   hyRating: 'BB-', igDurationBase: 7.2,  hyDurationBase: 4.0, numIssuersBase: 72,  numIssuersHyBase: 55 },
  { name: 'Consumer Discretionary',  igBase: 110, hyBase: 410, igWeightBase: 7.5,  hyWeightBase: 11.8, igRating: 'BBB+', hyRating: 'B',   igDurationBase: 6.5,  hyDurationBase: 3.6, numIssuersBase: 58,  numIssuersHyBase: 78 },
  { name: 'Consumer Staples',        igBase: 75,  hyBase: 310, igWeightBase: 6.3,  hyWeightBase: 4.5,  igRating: 'A',    hyRating: 'BB',  igDurationBase: 7.0,  hyDurationBase: 4.1, numIssuersBase: 42,  numIssuersHyBase: 22 },
  { name: 'Healthcare',              igBase: 80,  hyBase: 370, igWeightBase: 10.5, hyWeightBase: 10.2, igRating: 'A',    hyRating: 'B+',  igDurationBase: 7.5,  hyDurationBase: 3.8, numIssuersBase: 65,  numIssuersHyBase: 52 },
  { name: 'Financials',              igBase: 100, hyBase: 340, igWeightBase: 22.0, hyWeightBase: 8.5,  igRating: 'A',    hyRating: 'BB',  igDurationBase: 5.8,  hyDurationBase: 3.4, numIssuersBase: 120, numIssuersHyBase: 38 },
  { name: 'Technology',              igBase: 70,  hyBase: 320, igWeightBase: 11.2, hyWeightBase: 7.8,  igRating: 'A+',   hyRating: 'BB-', igDurationBase: 7.1,  hyDurationBase: 3.7, numIssuersBase: 55,  numIssuersHyBase: 42 },
  { name: 'Communication',           igBase: 115, hyBase: 430, igWeightBase: 8.0,  hyWeightBase: 12.0, igRating: 'BBB',  hyRating: 'B',   igDurationBase: 7.3,  hyDurationBase: 3.5, numIssuersBase: 32,  numIssuersHyBase: 45 },
  { name: 'Utilities',               igBase: 90,  hyBase: 290, igWeightBase: 6.8,  hyWeightBase: 3.8,  igRating: 'A-',   hyRating: 'BB+', igDurationBase: 8.2,  hyDurationBase: 4.5, numIssuersBase: 52,  numIssuersHyBase: 18 },
  { name: 'Real Estate',             igBase: 140, hyBase: 450, igWeightBase: 3.2,  hyWeightBase: 5.2,  igRating: 'BBB',  hyRating: 'B+',  igDurationBase: 6.0,  hyDurationBase: 3.3, numIssuersBase: 38,  numIssuersHyBase: 32 },
  { name: 'Transportation',          igBase: 100, hyBase: 365, igWeightBase: 2.4,  hyWeightBase: 7.7,  igRating: 'BBB+', hyRating: 'BB-', igDurationBase: 6.8,  hyDurationBase: 3.9, numIssuersBase: 28,  numIssuersHyBase: 35 },
];

// -- Cache --

const CACHE_TTL = 60 * 60 * 1000;
let cache: { data: SectorCreditSpreadResponse; ts: number } | null = null;

// -- Generator --

function generate(): SectorCreditSpreadResponse {
  const rng = seededRandom('sector-credit-spread');
  const jitter = (base: number, pct: number): number => base * (1 + (rng() - 0.5) * 2 * pct);
  const round2 = (n: number): number => Math.round(n * 100) / 100;
  const round1 = (n: number): number => Math.round(n * 10) / 10;

  // 1. Sectors
  const sectors: SectorData[] = SECTOR_DEFS.map((def) => {
    const igSpread = round2(jitter(def.igBase, 0.10));
    const hySpread = round2(jitter(def.hyBase, 0.08));

    // Weekly and monthly changes: proportional to spread level
    const igChange1w = round2((rng() - 0.5) * def.igBase * 0.06);
    const igChange1m = round2((rng() - 0.5) * def.igBase * 0.12);
    const hyChange1w = round2((rng() - 0.5) * def.hyBase * 0.05);
    const hyChange1m = round2((rng() - 0.5) * def.hyBase * 0.10);

    // Historical percentile (0-100)
    const igPercentile = Math.round(jitter(50, 0.6));
    const hyPercentile = Math.round(jitter(50, 0.6));

    // Z-score: derived from percentile with some noise (-2 to +2 range typically)
    const igZScore = round2((igPercentile - 50) / 20 + (rng() - 0.5) * 0.4);
    const hyZScore = round2((hyPercentile - 50) / 20 + (rng() - 0.5) * 0.4);

    // Weights
    const igWeight = round1(jitter(def.igWeightBase, 0.05));
    const hyWeight = round1(jitter(def.hyWeightBase, 0.05));

    // Duration
    const igDuration = round1(jitter(def.igDurationBase, 0.04));
    const hyDuration = round1(jitter(def.hyDurationBase, 0.04));

    // Number of issuers
    const numIssuers = Math.round(jitter(def.numIssuersBase, 0.03));
    const numIssuersHy = Math.round(jitter(def.numIssuersHyBase, 0.03));

    return {
      name: def.name,
      igSpread,
      hySpread,
      igChange1w,
      igChange1m,
      hyChange1w,
      hyChange1m,
      igPercentile: Math.max(0, Math.min(100, igPercentile)),
      hyPercentile: Math.max(0, Math.min(100, hyPercentile)),
      igZScore,
      hyZScore,
      igWeight,
      hyWeight,
      igRating: def.igRating,
      hyRating: def.hyRating,
      igDuration,
      hyDuration,
      numIssuers,
      numIssuersHy,
    };
  });

  // 2. IG vs HY comparison
  const igVsHy: IgVsHyEntry[] = sectors.map((s) => {
    const differential = round2(s.hySpread - s.igSpread);
    // Historical average differential: base it on the sector definition with slight offset
    const def = SECTOR_DEFS.find((d) => d.name === s.name);
    const baseHistDiff = def ? def.hyBase - def.igBase : differential;
    const historicalAvg = round2(jitter(baseHistDiff, 0.08));

    // Rich/Cheap: if current differential is tighter than historical, it's Rich; wider = Cheap
    const deviation = differential - historicalAvg;
    let richCheap: 'Rich' | 'Fair' | 'Cheap';
    if (deviation < -15) {
      richCheap = 'Rich';
    } else if (deviation > 15) {
      richCheap = 'Cheap';
    } else {
      richCheap = 'Fair';
    }

    return {
      sector: s.name,
      igSpread: s.igSpread,
      hySpread: s.hySpread,
      differential,
      historicalAvg,
      richCheap,
    };
  });

  // 3. Summary
  const totalIgWeight = sectors.reduce((sum, s) => sum + s.igWeight, 0);
  const totalHyWeight = sectors.reduce((sum, s) => sum + s.hyWeight, 0);

  const broadIgSpread = round2(
    sectors.reduce((sum, s) => sum + s.igSpread * s.igWeight, 0) / totalIgWeight
  );
  const broadHySpread = round2(
    sectors.reduce((sum, s) => sum + s.hySpread * s.hyWeight, 0) / totalHyWeight
  );

  const tightestIg = sectors.reduce((min, s) => s.igSpread < min.igSpread ? s : min, sectors[0]);
  const widestIg = sectors.reduce((max, s) => s.igSpread > max.igSpread ? s : max, sectors[0]);
  const tightestHy = sectors.reduce((min, s) => s.hySpread < min.hySpread ? s : min, sectors[0]);
  const widestHy = sectors.reduce((max, s) => s.hySpread > max.hySpread ? s : max, sectors[0]);

  const avgPercentileIg = Math.round(
    sectors.reduce((sum, s) => sum + s.igPercentile, 0) / sectors.length
  );
  const avgPercentileHy = Math.round(
    sectors.reduce((sum, s) => sum + s.hyPercentile, 0) / sectors.length
  );

  const summary: Summary = {
    broadIgSpread,
    broadHySpread,
    tightestSector: tightestIg.name,
    widestSector: widestIg.name,
    tightestSectorHy: tightestHy.name,
    widestSectorHy: widestHy.name,
    avgPercentileIg,
    avgPercentileHy,
  };

  return {
    sectors,
    igVsHy,
    summary,
    generatedAt: new Date().toISOString(),
  };
}

// -- Route --

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) {
      res.json(cache.data);
      return;
    }
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[SectorCreditSpread] Error:', (err as Error).message);
    if (cache) {
      res.json(cache.data);
      return;
    }
    res.status(500).json({ error: 'Failed to generate sector credit spread data' });
  }
});

export default router;
