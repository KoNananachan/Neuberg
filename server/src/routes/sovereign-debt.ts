import { Router, Request, Response } from 'express';

const router = Router();

// --- deterministic seed helpers (daily) ---
function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// ── Types ──

interface CountrySeed {
  name: string;
  isoCode: string;
  region: 'Americas' | 'EMEA' | 'Asia-Pacific';
  debtToGdp: number;
  totalDebt: number;
  rating: string;
  ratingOutlook: 'Stable' | 'Negative' | 'Positive';
  tenYearYieldBase: number;
  cdsSpreadBase: number;
  fiscalBalance: number;
  currentAccount: number;
  fxReserves: number;
  debtMaturityAvg: number;
  changeDebtToGdp1Y: number;
}

interface SovereignDebtEntry {
  name: string;
  isoCode: string;
  region: string;
  debtToGdp: number;
  totalDebt: number;
  rating: string;
  ratingOutlook: string;
  tenYearYield: number;
  cdsSpread: number;
  fiscalBalance: number;
  currentAccount: number;
  fxReserves: number;
  debtMaturityAvg: number;
  changeDebtToGdp1Y: number;
}

interface SovereignDebtSummary {
  avgDebtToGdp: number;
  avgYield: number;
  avgCds: number;
  totalGlobalDebt: number;
  countriesNegativeOutlook: number;
}

interface SovereignDebtResponse {
  countries: SovereignDebtEntry[];
  summary: SovereignDebtSummary;
  timestamp: string;
}

// ── Seed Data (20 major sovereign issuers) ──

const COUNTRY_SEEDS: CountrySeed[] = [
  {
    name: 'United States', isoCode: 'US', region: 'Americas',
    debtToGdp: 123.0, totalDebt: 33.17, rating: 'AA+', ratingOutlook: 'Stable',
    tenYearYieldBase: 4.25, cdsSpreadBase: 32, fiscalBalance: -6.3,
    currentAccount: -3.0, fxReserves: 36.2, debtMaturityAvg: 6.2, changeDebtToGdp1Y: 2.8,
  },
  {
    name: 'Japan', isoCode: 'JP', region: 'Asia-Pacific',
    debtToGdp: 260.1, totalDebt: 9.21, rating: 'A+', ratingOutlook: 'Stable',
    tenYearYieldBase: 0.92, cdsSpreadBase: 28, fiscalBalance: -5.8,
    currentAccount: 3.5, fxReserves: 1230, debtMaturityAvg: 9.3, changeDebtToGdp1Y: 3.2,
  },
  {
    name: 'China', isoCode: 'CN', region: 'Asia-Pacific',
    debtToGdp: 83.6, totalDebt: 14.69, rating: 'A+', ratingOutlook: 'Stable',
    tenYearYieldBase: 2.68, cdsSpreadBase: 68, fiscalBalance: -7.1,
    currentAccount: 1.5, fxReserves: 3220, debtMaturityAvg: 7.1, changeDebtToGdp1Y: 4.5,
  },
  {
    name: 'Germany', isoCode: 'DE', region: 'EMEA',
    debtToGdp: 64.3, totalDebt: 2.85, rating: 'AAA', ratingOutlook: 'Stable',
    tenYearYieldBase: 2.35, cdsSpreadBase: 18, fiscalBalance: -1.6,
    currentAccount: 6.2, fxReserves: 270, debtMaturityAvg: 7.8, changeDebtToGdp1Y: -1.2,
  },
  {
    name: 'United Kingdom', isoCode: 'GB', region: 'EMEA',
    debtToGdp: 101.2, totalDebt: 3.16, rating: 'AA', ratingOutlook: 'Stable',
    tenYearYieldBase: 4.12, cdsSpreadBase: 35, fiscalBalance: -4.8,
    currentAccount: -3.2, fxReserves: 185, debtMaturityAvg: 14.6, changeDebtToGdp1Y: 1.8,
  },
  {
    name: 'France', isoCode: 'FR', region: 'EMEA',
    debtToGdp: 111.8, totalDebt: 3.21, rating: 'AA-', ratingOutlook: 'Negative',
    tenYearYieldBase: 3.05, cdsSpreadBase: 42, fiscalBalance: -5.5,
    currentAccount: -0.8, fxReserves: 230, debtMaturityAvg: 8.4, changeDebtToGdp1Y: 2.1,
  },
  {
    name: 'Italy', isoCode: 'IT', region: 'EMEA',
    debtToGdp: 140.6, totalDebt: 2.98, rating: 'BBB', ratingOutlook: 'Stable',
    tenYearYieldBase: 3.85, cdsSpreadBase: 105, fiscalBalance: -7.2,
    currentAccount: 0.5, fxReserves: 195, debtMaturityAvg: 7.1, changeDebtToGdp1Y: 1.4,
  },
  {
    name: 'Canada', isoCode: 'CA', region: 'Americas',
    debtToGdp: 106.4, totalDebt: 1.87, rating: 'AAA', ratingOutlook: 'Stable',
    tenYearYieldBase: 3.45, cdsSpreadBase: 25, fiscalBalance: -1.1,
    currentAccount: -0.4, fxReserves: 108, debtMaturityAvg: 5.8, changeDebtToGdp1Y: 0.6,
  },
  {
    name: 'Brazil', isoCode: 'BR', region: 'Americas',
    debtToGdp: 74.4, totalDebt: 1.42, rating: 'BB', ratingOutlook: 'Stable',
    tenYearYieldBase: 11.85, cdsSpreadBase: 165, fiscalBalance: -8.1,
    currentAccount: -2.5, fxReserves: 340, debtMaturityAvg: 4.2, changeDebtToGdp1Y: 3.8,
  },
  {
    name: 'India', isoCode: 'IN', region: 'Asia-Pacific',
    debtToGdp: 83.1, totalDebt: 2.68, rating: 'BBB-', ratingOutlook: 'Positive',
    tenYearYieldBase: 7.18, cdsSpreadBase: 98, fiscalBalance: -6.4,
    currentAccount: -1.2, fxReserves: 620, debtMaturityAvg: 10.6, changeDebtToGdp1Y: 1.1,
  },
  {
    name: 'Australia', isoCode: 'AU', region: 'Asia-Pacific',
    debtToGdp: 52.1, totalDebt: 0.72, rating: 'AAA', ratingOutlook: 'Stable',
    tenYearYieldBase: 4.15, cdsSpreadBase: 20, fiscalBalance: -1.4,
    currentAccount: 1.2, fxReserves: 55, debtMaturityAvg: 6.5, changeDebtToGdp1Y: 0.4,
  },
  {
    name: 'South Korea', isoCode: 'KR', region: 'Asia-Pacific',
    debtToGdp: 54.3, totalDebt: 0.93, rating: 'AA', ratingOutlook: 'Stable',
    tenYearYieldBase: 3.52, cdsSpreadBase: 38, fiscalBalance: -2.6,
    currentAccount: 3.8, fxReserves: 418, debtMaturityAvg: 9.8, changeDebtToGdp1Y: 1.5,
  },
  {
    name: 'Spain', isoCode: 'ES', region: 'EMEA',
    debtToGdp: 107.5, totalDebt: 1.62, rating: 'A', ratingOutlook: 'Positive',
    tenYearYieldBase: 3.28, cdsSpreadBase: 62, fiscalBalance: -3.6,
    currentAccount: 2.1, fxReserves: 90, debtMaturityAvg: 7.9, changeDebtToGdp1Y: -0.8,
  },
  {
    name: 'Mexico', isoCode: 'MX', region: 'Americas',
    debtToGdp: 52.8, totalDebt: 0.74, rating: 'BBB', ratingOutlook: 'Negative',
    tenYearYieldBase: 9.45, cdsSpreadBase: 118, fiscalBalance: -3.9,
    currentAccount: -1.4, fxReserves: 210, debtMaturityAvg: 8.1, changeDebtToGdp1Y: 2.2,
  },
  {
    name: 'Indonesia', isoCode: 'ID', region: 'Asia-Pacific',
    debtToGdp: 39.2, totalDebt: 0.51, rating: 'BBB', ratingOutlook: 'Stable',
    tenYearYieldBase: 6.72, cdsSpreadBase: 88, fiscalBalance: -2.3,
    currentAccount: -0.1, fxReserves: 138, debtMaturityAvg: 8.8, changeDebtToGdp1Y: 0.9,
  },
  {
    name: 'South Africa', isoCode: 'ZA', region: 'EMEA',
    debtToGdp: 72.8, totalDebt: 0.26, rating: 'BB-', ratingOutlook: 'Negative',
    tenYearYieldBase: 10.25, cdsSpreadBase: 225, fiscalBalance: -5.5,
    currentAccount: -1.8, fxReserves: 58, debtMaturityAvg: 12.1, changeDebtToGdp1Y: 3.1,
  },
  {
    name: 'Turkey', isoCode: 'TR', region: 'EMEA',
    debtToGdp: 35.2, totalDebt: 0.31, rating: 'B+', ratingOutlook: 'Positive',
    tenYearYieldBase: 25.40, cdsSpreadBase: 310, fiscalBalance: -5.2,
    currentAccount: -4.1, fxReserves: 135, debtMaturityAvg: 5.4, changeDebtToGdp1Y: 4.6,
  },
  {
    name: 'Poland', isoCode: 'PL', region: 'EMEA',
    debtToGdp: 49.8, totalDebt: 0.38, rating: 'A-', ratingOutlook: 'Stable',
    tenYearYieldBase: 5.62, cdsSpreadBase: 52, fiscalBalance: -5.1,
    currentAccount: -1.0, fxReserves: 175, debtMaturityAvg: 5.1, changeDebtToGdp1Y: 1.3,
  },
  {
    name: 'Saudi Arabia', isoCode: 'SA', region: 'EMEA',
    debtToGdp: 26.2, totalDebt: 0.27, rating: 'A', ratingOutlook: 'Stable',
    tenYearYieldBase: 4.88, cdsSpreadBase: 55, fiscalBalance: -2.0,
    currentAccount: 5.8, fxReserves: 435, debtMaturityAvg: 10.2, changeDebtToGdp1Y: 2.4,
  },
  {
    name: 'Argentina', isoCode: 'AR', region: 'Americas',
    debtToGdp: 88.5, totalDebt: 0.39, rating: 'CCC', ratingOutlook: 'Negative',
    tenYearYieldBase: 18.50, cdsSpreadBase: 980, fiscalBalance: -4.4,
    currentAccount: -1.8, fxReserves: 28, debtMaturityAvg: 6.9, changeDebtToGdp1Y: 5.2,
  },
];

// ── Helpers ──

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function applyVariation(base: number, rng: () => number, pctRange: number): number {
  return base * (1 + (rng() - 0.5) * 2 * pctRange);
}

function buildCountryEntry(seed: CountrySeed): SovereignDebtEntry {
  const rng = seededRandom(`sov-debt-${seed.isoCode}`);

  const tenYearYield = roundTo(applyVariation(seed.tenYearYieldBase, rng, 0.04), 2);
  const cdsSpread = roundTo(applyVariation(seed.cdsSpreadBase, rng, 0.06), 1);
  const fiscalBalance = roundTo(applyVariation(seed.fiscalBalance, rng, 0.03), 1);
  const currentAccount = roundTo(
    seed.currentAccount + (rng() - 0.5) * 0.4,
    1,
  );
  const fxReserves = roundTo(applyVariation(seed.fxReserves, rng, 0.02), 1);
  const debtMaturityAvg = roundTo(applyVariation(seed.debtMaturityAvg, rng, 0.02), 1);
  const debtToGdp = roundTo(applyVariation(seed.debtToGdp, rng, 0.01), 1);
  const totalDebt = roundTo(applyVariation(seed.totalDebt, rng, 0.01), 2);
  const changeDebtToGdp1Y = roundTo(
    seed.changeDebtToGdp1Y + (rng() - 0.5) * 0.6,
    1,
  );

  return {
    name: seed.name,
    isoCode: seed.isoCode,
    region: seed.region,
    debtToGdp,
    totalDebt,
    rating: seed.rating,
    ratingOutlook: seed.ratingOutlook,
    tenYearYield,
    cdsSpread,
    fiscalBalance,
    currentAccount,
    fxReserves,
    debtMaturityAvg,
    changeDebtToGdp1Y,
  };
}

function buildSummary(countries: SovereignDebtEntry[]): SovereignDebtSummary {
  const count = countries.length;
  const avgDebtToGdp = roundTo(
    countries.reduce((sum, c) => sum + c.debtToGdp, 0) / count,
    1,
  );
  const avgYield = roundTo(
    countries.reduce((sum, c) => sum + c.tenYearYield, 0) / count,
    2,
  );
  const avgCds = roundTo(
    countries.reduce((sum, c) => sum + c.cdsSpread, 0) / count,
    1,
  );
  const totalGlobalDebt = roundTo(
    countries.reduce((sum, c) => sum + c.totalDebt, 0),
    2,
  );
  const countriesNegativeOutlook = countries.filter(
    (c) => c.ratingOutlook === 'Negative',
  ).length;

  return { avgDebtToGdp, avgYield, avgCds, totalGlobalDebt, countriesNegativeOutlook };
}

// ── Cache (5min TTL, stale fallback on error) ──

let cache: { data: SovereignDebtResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 12 * 60 * 60_000;

// ── Route ──

router.get('/', (_req: Request, res: Response) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const countries = COUNTRY_SEEDS.map(buildCountryEntry);
    const summary = buildSummary(countries);

    const result: SovereignDebtResponse = {
      countries,
      summary,
      timestamp: new Date().toISOString(),
    };

    cache = { data: result, expiresAt: now + CACHE_TTL };
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[SovereignDebt] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to fetch sovereign debt data' });
  }
});

export default router;
