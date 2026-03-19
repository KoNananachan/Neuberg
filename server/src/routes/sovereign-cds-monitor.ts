import { Router } from 'express';

const router = Router();

// ── Seeded PRNG ──

function mulberry32(a: number) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  }
  return h;
}

// ── Types ──

type Region = 'G7' | 'EU Periphery' | 'EM Asia' | 'EM LatAm' | 'MENA';

interface CountrySeed {
  country: string;
  iso: string;
  region: Region;
  rating: string;
  spread5yBase: number;
  spread10yBase: number;
  recoveryRateBase: number;
  basisVsCashBase: number;
}

interface CountryCDS {
  country: string;
  iso: string;
  region: Region;
  rating: string;
  spread5y: number;
  spread10y: number;
  probabilityOfDefault: number;
  recoveryRate: number;
  change1d: number;
  change1w: number;
  change1m: number;
  basisVsCash: number;
}

interface HistoricalPoint {
  date: string;
  spread: number;
}

interface HistoricalSeries {
  country: string;
  data: HistoricalPoint[];
}

interface Alert {
  country: string;
  type: 'WIDENING' | 'TIGHTENING';
  magnitude: number;
  currentSpread: number;
  previousSpread: number;
  timeframe: string;
}

interface RegionalSummary {
  region: Region;
  avgSpread5y: number;
  medianSpread5y: number;
  widestCountry: string;
  tightestCountry: string;
  avgChange1d: number;
}

interface RiskFreeBenchmark {
  name: string;
  tenor: string;
  yield: number;
  change1d: number;
}

// ── Seed Data (30 countries) ──

const COUNTRY_SEEDS: CountrySeed[] = [
  // G7
  { country: 'United States',  iso: 'US', region: 'G7', rating: 'AA+',  spread5yBase: 22,   spread10yBase: 28,   recoveryRateBase: 40, basisVsCashBase: -5  },
  { country: 'Germany',        iso: 'DE', region: 'G7', rating: 'AAA',  spread5yBase: 14,   spread10yBase: 18,   recoveryRateBase: 40, basisVsCashBase: -3  },
  { country: 'Japan',          iso: 'JP', region: 'G7', rating: 'A+',   spread5yBase: 30,   spread10yBase: 38,   recoveryRateBase: 40, basisVsCashBase: -8  },
  { country: 'United Kingdom', iso: 'GB', region: 'G7', rating: 'AA',   spread5yBase: 24,   spread10yBase: 30,   recoveryRateBase: 40, basisVsCashBase: -4  },
  { country: 'France',         iso: 'FR', region: 'G7', rating: 'AA-',  spread5yBase: 32,   spread10yBase: 40,   recoveryRateBase: 40, basisVsCashBase: -6  },
  { country: 'Italy',          iso: 'IT', region: 'G7', rating: 'BBB',  spread5yBase: 112,  spread10yBase: 128,  recoveryRateBase: 40, basisVsCashBase: -18 },
  { country: 'Canada',         iso: 'CA', region: 'G7', rating: 'AAA',  spread5yBase: 20,   spread10yBase: 26,   recoveryRateBase: 40, basisVsCashBase: -4  },

  // EU Periphery
  { country: 'Spain',          iso: 'ES', region: 'EU Periphery', rating: 'A',    spread5yBase: 68,   spread10yBase: 82,   recoveryRateBase: 40, basisVsCashBase: -12 },
  { country: 'Portugal',       iso: 'PT', region: 'EU Periphery', rating: 'A-',   spread5yBase: 52,   spread10yBase: 64,   recoveryRateBase: 40, basisVsCashBase: -10 },
  { country: 'Greece',         iso: 'GR', region: 'EU Periphery', rating: 'BBB-', spread5yBase: 98,   spread10yBase: 118,  recoveryRateBase: 35, basisVsCashBase: -22 },
  { country: 'Ireland',        iso: 'IE', region: 'EU Periphery', rating: 'AA-',  spread5yBase: 28,   spread10yBase: 35,   recoveryRateBase: 40, basisVsCashBase: -5  },
  { country: 'Cyprus',         iso: 'CY', region: 'EU Periphery', rating: 'BBB',  spread5yBase: 88,   spread10yBase: 105,  recoveryRateBase: 35, basisVsCashBase: -16 },
  { country: 'Croatia',        iso: 'HR', region: 'EU Periphery', rating: 'BBB+', spread5yBase: 75,   spread10yBase: 90,   recoveryRateBase: 35, basisVsCashBase: -14 },

  // EM Asia
  { country: 'China',          iso: 'CN', region: 'EM Asia', rating: 'A+',   spread5yBase: 62,   spread10yBase: 75,   recoveryRateBase: 40, basisVsCashBase: -10 },
  { country: 'Indonesia',      iso: 'ID', region: 'EM Asia', rating: 'BBB',  spread5yBase: 88,   spread10yBase: 105,  recoveryRateBase: 35, basisVsCashBase: -15 },
  { country: 'South Korea',    iso: 'KR', region: 'EM Asia', rating: 'AA',   spread5yBase: 32,   spread10yBase: 40,   recoveryRateBase: 40, basisVsCashBase: -6  },
  { country: 'Malaysia',       iso: 'MY', region: 'EM Asia', rating: 'A-',   spread5yBase: 58,   spread10yBase: 70,   recoveryRateBase: 40, basisVsCashBase: -9  },
  { country: 'Philippines',    iso: 'PH', region: 'EM Asia', rating: 'BBB+', spread5yBase: 72,   spread10yBase: 86,   recoveryRateBase: 35, basisVsCashBase: -12 },
  { country: 'Thailand',       iso: 'TH', region: 'EM Asia', rating: 'BBB+', spread5yBase: 55,   spread10yBase: 66,   recoveryRateBase: 40, basisVsCashBase: -8  },

  // EM LatAm
  { country: 'Brazil',         iso: 'BR', region: 'EM LatAm', rating: 'BB',   spread5yBase: 162,  spread10yBase: 185,  recoveryRateBase: 30, basisVsCashBase: -25 },
  { country: 'Mexico',         iso: 'MX', region: 'EM LatAm', rating: 'BBB',  spread5yBase: 118,  spread10yBase: 138,  recoveryRateBase: 35, basisVsCashBase: -18 },
  { country: 'Colombia',       iso: 'CO', region: 'EM LatAm', rating: 'BB+',  spread5yBase: 148,  spread10yBase: 170,  recoveryRateBase: 30, basisVsCashBase: -22 },
  { country: 'Chile',          iso: 'CL', region: 'EM LatAm', rating: 'A',    spread5yBase: 58,   spread10yBase: 70,   recoveryRateBase: 40, basisVsCashBase: -8  },
  { country: 'Peru',           iso: 'PE', region: 'EM LatAm', rating: 'BBB',  spread5yBase: 82,   spread10yBase: 98,   recoveryRateBase: 35, basisVsCashBase: -13 },
  { country: 'Argentina',      iso: 'AR', region: 'EM LatAm', rating: 'CCC+', spread5yBase: 1150, spread10yBase: 1320, recoveryRateBase: 20, basisVsCashBase: -85 },

  // MENA
  { country: 'Saudi Arabia',   iso: 'SA', region: 'MENA', rating: 'A',    spread5yBase: 58,   spread10yBase: 70,   recoveryRateBase: 40, basisVsCashBase: -8  },
  { country: 'Turkey',         iso: 'TR', region: 'MENA', rating: 'B+',   spread5yBase: 365,  spread10yBase: 410,  recoveryRateBase: 25, basisVsCashBase: -45 },
  { country: 'Egypt',          iso: 'EG', region: 'MENA', rating: 'B-',   spread5yBase: 510,  spread10yBase: 580,  recoveryRateBase: 25, basisVsCashBase: -55 },
  { country: 'UAE',            iso: 'AE', region: 'MENA', rating: 'AA',   spread5yBase: 42,   spread10yBase: 52,   recoveryRateBase: 40, basisVsCashBase: -6  },
  { country: 'Qatar',          iso: 'QA', region: 'MENA', rating: 'AA-',  spread5yBase: 48,   spread10yBase: 58,   recoveryRateBase: 40, basisVsCashBase: -7  },
];

const RISK_FREE_BENCHMARKS: { name: string; tenor: string; yieldBase: number }[] = [
  { name: 'US Treasury',         tenor: '5Y',  yieldBase: 4.15 },
  { name: 'US Treasury',         tenor: '10Y', yieldBase: 4.32 },
  { name: 'German Bund',         tenor: '5Y',  yieldBase: 2.25 },
  { name: 'German Bund',         tenor: '10Y', yieldBase: 2.42 },
  { name: 'JGB',                 tenor: '10Y', yieldBase: 0.88 },
  { name: 'UK Gilt',             tenor: '10Y', yieldBase: 4.08 },
];

// Top 10 by widest spread for historical series
const HISTORICAL_TOP10_COUNTRIES = [
  'Argentina', 'Egypt', 'Turkey', 'Brazil', 'Colombia',
  'Mexico', 'Italy', 'Greece', 'Indonesia', 'Cyprus',
];

// ── Cache ──

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

// ── Helpers ──

function roundTo(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

// ── Generator ──

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('sovereign-cds-monitor-' + day));

  const jitter = (base: number, pct: number): number =>
    base * (1 + (rng() - 0.5) * 2 * pct);

  // ── Country CDS Spreads ──
  const countries: CountryCDS[] = COUNTRY_SEEDS.map(s => {
    const spread5y = roundTo(jitter(s.spread5yBase, 0.10), 1);
    const spread10y = roundTo(jitter(s.spread10yBase, 0.10), 1);
    const recoveryRate = roundTo(jitter(s.recoveryRateBase, 0.03), 1);
    const change1d = roundTo((rng() - 0.48) * s.spread5yBase * 0.03, 1);
    const change1w = roundTo((rng() - 0.46) * s.spread5yBase * 0.06, 1);
    const change1m = roundTo((rng() - 0.44) * s.spread5yBase * 0.10, 1);
    // Implied probability of default over 5Y horizon: spread / (1 - recovery) / 10000 * 5 * 100
    const probabilityOfDefault = roundTo(
      (spread5y / 10000) / (1 - recoveryRate / 100) * 5 * 100, 2
    );
    const basisVsCash = roundTo(jitter(s.basisVsCashBase, 0.15), 1);

    return {
      country: s.country,
      iso: s.iso,
      region: s.region,
      rating: s.rating,
      spread5y,
      spread10y,
      probabilityOfDefault,
      recoveryRate,
      change1d,
      change1w,
      change1m,
      basisVsCash,
    };
  }).sort((a, b) => a.spread5y - b.spread5y);

  // ── Historical Spread Series (30 days for top 10 widest) ──
  const historicalSeries: HistoricalSeries[] = HISTORICAL_TOP10_COUNTRIES.map(name => {
    const seed = COUNTRY_SEEDS.find(s => s.country === name)!;
    const baseSpread = seed.spread5yBase;
    const points: HistoricalPoint[] = [];
    const today = new Date();
    // Use a sub-RNG seeded per country for stable historical data
    const histRng = mulberry32(hashSeed('hist-' + name + '-' + day));

    let prevSpread = baseSpread * (1 + (histRng() - 0.5) * 0.12);
    for (let d = 29; d >= 0; d--) {
      const date = new Date(today);
      date.setDate(date.getDate() - d);
      // Random walk with mean reversion
      const drift = (baseSpread - prevSpread) * 0.05;
      const shock = (histRng() - 0.5) * baseSpread * 0.04;
      prevSpread = Math.max(1, prevSpread + drift + shock);
      points.push({
        date: date.toISOString().slice(0, 10),
        spread: roundTo(prevSpread, 1),
      });
    }

    return { country: name, data: points };
  });

  // ── Widening / Tightening Alerts ──
  const ALERT_THRESHOLD_PCT = 0.02; // 2% move triggers alert
  const alerts: Alert[] = [];

  for (const c of countries) {
    const seed = COUNTRY_SEEDS.find(s => s.country === c.country)!;
    // Daily alert
    if (Math.abs(c.change1d) > seed.spread5yBase * ALERT_THRESHOLD_PCT) {
      alerts.push({
        country: c.country,
        type: c.change1d > 0 ? 'WIDENING' : 'TIGHTENING',
        magnitude: roundTo(Math.abs(c.change1d), 1),
        currentSpread: c.spread5y,
        previousSpread: roundTo(c.spread5y - c.change1d, 1),
        timeframe: '1D',
      });
    }
    // Weekly alert (higher threshold)
    if (Math.abs(c.change1w) > seed.spread5yBase * 0.04) {
      alerts.push({
        country: c.country,
        type: c.change1w > 0 ? 'WIDENING' : 'TIGHTENING',
        magnitude: roundTo(Math.abs(c.change1w), 1),
        currentSpread: c.spread5y,
        previousSpread: roundTo(c.spread5y - c.change1w, 1),
        timeframe: '1W',
      });
    }
  }

  // Sort alerts by magnitude descending
  alerts.sort((a, b) => b.magnitude - a.magnitude);

  // ── Regional Summary ──
  const regionNames: Region[] = ['G7', 'EU Periphery', 'EM Asia', 'EM LatAm', 'MENA'];
  const regionalSummary: RegionalSummary[] = regionNames.map(region => {
    const members = countries.filter(c => c.region === region);
    if (members.length === 0) {
      return {
        region, avgSpread5y: 0, medianSpread5y: 0,
        widestCountry: 'N/A', tightestCountry: 'N/A', avgChange1d: 0,
      };
    }
    const spreads = members.map(m => m.spread5y).sort((a, b) => a - b);
    const avg = roundTo(spreads.reduce((s, v) => s + v, 0) / spreads.length, 1);
    const mid = Math.floor(spreads.length / 2);
    const median = spreads.length % 2 === 0
      ? roundTo((spreads[mid - 1] + spreads[mid]) / 2, 1)
      : spreads[mid];
    const widest = members.reduce((w, m) => m.spread5y > w.spread5y ? m : w);
    const tightest = members.reduce((t, m) => m.spread5y < t.spread5y ? m : t);
    const avgChange = roundTo(
      members.reduce((s, m) => s + m.change1d, 0) / members.length, 1
    );

    return {
      region,
      avgSpread5y: avg,
      medianSpread5y: median,
      widestCountry: widest.country,
      tightestCountry: tightest.country,
      avgChange1d: avgChange,
    };
  });

  // ── Risk-Free Benchmarks ──
  const riskFreeBenchmarks: RiskFreeBenchmark[] = RISK_FREE_BENCHMARKS.map(b => ({
    name: b.name,
    tenor: b.tenor,
    yield: roundTo(jitter(b.yieldBase, 0.03), 3),
    change1d: roundTo((rng() - 0.48) * 0.06, 3),
  }));

  return {
    countries,
    historicalSeries,
    alerts,
    regionalSummary,
    riskFreeBenchmarks,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

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
    console.error('[SovereignCDSMonitor] Error:', (err as Error).message);
    if (cache) {
      res.json(cache.data);
      return;
    }
    res.status(502).json({ error: 'Failed to generate sovereign CDS monitor data' });
  }
});

export default router;
