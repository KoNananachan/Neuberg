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

const BENCHMARK_RATES = [
  { id: 'EFFR', name: 'Fed Funds Effective', base: 5.33, region: 'US' },
  { id: 'SOFR', name: 'SOFR', base: 5.31, region: 'US' },
  { id: 'OBFR', name: 'Overnight Bank Funding', base: 5.32, region: 'US' },
  { id: 'BGCR', name: 'Broad General Collateral', base: 5.30, region: 'US' },
  { id: 'TGCR', name: 'Tri-Party GC Rate', base: 5.29, region: 'US' },
  { id: 'IORB', name: 'Interest on Reserve Bal', base: 5.40, region: 'US' },
  { id: 'ESTR', name: 'Euro Short-Term Rate', base: 3.90, region: 'EU' },
  { id: 'SONIA', name: 'Sterling Overnight IA', base: 5.20, region: 'UK' },
  { id: 'TONAR', name: 'Tokyo Overnight Avg', base: 0.08, region: 'JP' },
  { id: 'SARON', name: 'Swiss Avg Rate ON', base: 1.50, region: 'CH' },
];

const CP_RATES = [
  { tenor: 'Overnight', aa: 5.32, a2p2: 5.45 },
  { tenor: '1 Week', aa: 5.30, a2p2: 5.48 },
  { tenor: '2 Weeks', aa: 5.28, a2p2: 5.45 },
  { tenor: '1 Month', aa: 5.25, a2p2: 5.42 },
  { tenor: '2 Months', aa: 5.20, a2p2: 5.38 },
  { tenor: '3 Months', aa: 5.15, a2p2: 5.35 },
];

const TBILL_TENORS = [
  { tenor: '4-Week', base: 5.28 },
  { tenor: '8-Week', base: 5.25 },
  { tenor: '13-Week', base: 5.22 },
  { tenor: '26-Week', base: 5.10 },
  { tenor: '52-Week', base: 4.85 },
];

const MMF_CATEGORIES = [
  { type: 'Government', baseYield: 5.15, baseAUM: 4200 },
  { type: 'Prime', baseYield: 5.25, baseAUM: 800 },
  { type: 'Treasury', baseYield: 5.10, baseAUM: 1500 },
  { type: 'Municipal', baseYield: 3.40, baseAUM: 130 },
];

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-money-market'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  const benchmarks = BENCHMARK_RATES.map(r => {
    const rate = Math.round(jitter(r.base, 0.005) * 1000) / 1000;
    const change1d = Math.round((rng() - 0.5) * 0.03 * 1000) / 1000;
    const volume = r.region === 'US' ? Math.round(jitter(1800, 0.15)) : Math.round(jitter(500, 0.2));
    const percentile75 = Math.round((rate + 0.01 + rng() * 0.03) * 1000) / 1000;
    const percentile25 = Math.round((rate - 0.01 - rng() * 0.03) * 1000) / 1000;

    const history = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return { date: d.toISOString().slice(0, 10), rate: Math.round(jitter(r.base, 0.004) * 1000) / 1000 };
    });

    return { id: r.id, name: r.name, region: r.region, rate, change1d, volume, percentile75, percentile25, history };
  });

  const commercialPaper = CP_RATES.map(cp => ({
    tenor: cp.tenor,
    aaFinancial: Math.round(jitter(cp.aa, 0.005) * 100) / 100,
    aaNonFinancial: Math.round(jitter(cp.aa + 0.05, 0.005) * 100) / 100,
    a2p2: Math.round(jitter(cp.a2p2, 0.005) * 100) / 100,
    spread: Math.round((cp.a2p2 - cp.aa) * 100),
  }));

  const tbills = TBILL_TENORS.map(t => ({
    tenor: t.tenor,
    yield: Math.round(jitter(t.base, 0.005) * 100) / 100,
    discountRate: Math.round(jitter(t.base - 0.08, 0.005) * 100) / 100,
    change1d: Math.round((rng() - 0.5) * 0.04 * 100) / 100,
    change1w: Math.round((rng() - 0.48) * 0.08 * 100) / 100,
  }));

  const mmFunds = MMF_CATEGORIES.map(f => ({
    type: f.type,
    avgYield7d: Math.round(jitter(f.baseYield, 0.01) * 100) / 100,
    totalAUM: Math.round(jitter(f.baseAUM, 0.05)),
    netFlows1w: Math.round((rng() - 0.45) * f.baseAUM * 0.02),
    avgWAM: Math.round(20 + rng() * 35),
    avgWAL: Math.round(40 + rng() * 50),
  }));

  const fedFundsDistribution = Array.from({ length: 8 }, (_, i) => {
    const rateBucket = 5.25 + i * 0.02;
    return { rate: Math.round(rateBucket * 100) / 100, volume: Math.round(jitter(200, 0.3)) };
  });

  const rrpUsage = {
    total: Math.round(jitter(500, 0.1)),
    counterparties: Math.round(50 + rng() * 30),
    rate: Math.round(jitter(5.30, 0.003) * 100) / 100,
    change1d: Math.round((rng() - 0.5) * 30),
  };

  const summary = {
    totalMMFAUM: Math.round(mmFunds.reduce((a, f) => a + f.totalAUM, 0)),
    avgGovernmentYield: mmFunds.find(f => f.type === 'Government')?.avgYield7d ?? 0,
    sofrRate: benchmarks.find(b => b.id === 'SOFR')?.rate ?? 0,
    fedFundsRate: benchmarks.find(b => b.id === 'EFFR')?.rate ?? 0,
    tbill3m: tbills.find(t => t.tenor === '13-Week')?.yield ?? 0,
  };

  return { benchmarks, commercialPaper, tbills, mmFunds, fedFundsDistribution, rrpUsage, summary, generatedAt: new Date().toISOString() };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[MoneyMarket] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate money market data' });
  }
});

export default router;
