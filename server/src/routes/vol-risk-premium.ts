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

const UNDERLYINGS = [
  { id: 'SPX', name: 'S&P 500', baseIV: 16.5, baseRV: 13.0 },
  { id: 'NDX', name: 'Nasdaq 100', baseIV: 20.0, baseRV: 16.5 },
  { id: 'RUT', name: 'Russell 2000', baseIV: 22.0, baseRV: 18.0 },
  { id: 'ESTX', name: 'Euro Stoxx 50', baseIV: 17.5, baseRV: 14.5 },
  { id: 'NKY', name: 'Nikkei 225', baseIV: 19.0, baseRV: 15.5 },
  { id: 'HSI', name: 'Hang Seng', baseIV: 24.0, baseRV: 20.0 },
  { id: 'AAPL', name: 'Apple', baseIV: 22.0, baseRV: 18.5 },
  { id: 'NVDA', name: 'NVIDIA', baseIV: 45.0, baseRV: 40.0 },
  { id: 'TSLA', name: 'Tesla', baseIV: 55.0, baseRV: 48.0 },
  { id: 'GLD', name: 'Gold', baseIV: 14.0, baseRV: 11.0 },
  { id: 'USO', name: 'Crude Oil', baseIV: 28.0, baseRV: 24.0 },
  { id: 'FXI', name: 'China ETF', baseIV: 26.0, baseRV: 22.0 },
];

const TENORS = ['1W', '2W', '1M', '2M', '3M', '6M', '1Y'];

const CACHE_TTL = 12 * 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-vol-risk-premium'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  const assets = UNDERLYINGS.map(u => {
    const iv30d = Math.round(jitter(u.baseIV, 0.1) * 10) / 10;
    const rv30d = Math.round(jitter(u.baseRV, 0.12) * 10) / 10;
    const vrp = Math.round((iv30d - rv30d) * 10) / 10;
    const vrpPctile = Math.round(rng() * 100);
    const iv10d = Math.round(jitter(u.baseIV * 1.1, 0.1) * 10) / 10;
    const rv10d = Math.round(jitter(u.baseRV * 1.15, 0.12) * 10) / 10;
    const iv60d = Math.round(jitter(u.baseIV * 0.95, 0.08) * 10) / 10;
    const rv60d = Math.round(jitter(u.baseRV * 0.92, 0.1) * 10) / 10;

    const termStructure = TENORS.map((tenor, i) => {
      const factor = 0.9 + i * 0.03;
      const ivTenor = Math.round(jitter(u.baseIV * factor, 0.06) * 10) / 10;
      const rvTenor = Math.round(jitter(u.baseRV * factor, 0.08) * 10) / 10;
      return { tenor, iv: ivTenor, rv: rvTenor, vrp: Math.round((ivTenor - rvTenor) * 10) / 10 };
    });

    const history = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const hIV = Math.round(jitter(u.baseIV, 0.12) * 10) / 10;
      const hRV = Math.round(jitter(u.baseRV, 0.15) * 10) / 10;
      return { date: d.toISOString().slice(0, 10), iv: hIV, rv: hRV, vrp: Math.round((hIV - hRV) * 10) / 10 };
    });

    const strategyReturns = {
      shortStraddle1m: Math.round((rng() - 0.35) * 8 * 100) / 100,
      shortPut1m: Math.round((rng() - 0.3) * 5 * 100) / 100,
      ironCondor1m: Math.round((rng() - 0.25) * 4 * 100) / 100,
      varianceSwap1m: Math.round((rng() - 0.4) * 10 * 100) / 100,
    };

    return {
      id: u.id, name: u.name,
      current: { iv30d, rv30d, vrp, vrpPctile, iv10d, rv10d, iv60d, rv60d },
      termStructure, history, strategyReturns,
    };
  });

  const summary = {
    avgVRP: Math.round(assets.reduce((a, b) => a + b.current.vrp, 0) / assets.length * 10) / 10,
    maxVRP: { id: '', vrp: 0 },
    minVRP: { id: '', vrp: Infinity },
    vixLevel: Math.round(jitter(16.5, 0.08) * 10) / 10,
    vix1dChange: Math.round((rng() - 0.5) * 3 * 10) / 10,
    vvix: Math.round(jitter(85, 0.1) * 10) / 10,
  };
  for (const a of assets) {
    if (a.current.vrp > summary.maxVRP.vrp) summary.maxVRP = { id: a.id, vrp: a.current.vrp };
    if (a.current.vrp < summary.minVRP.vrp) summary.minVRP = { id: a.id, vrp: a.current.vrp };
  }

  return { assets, summary, generatedAt: new Date().toISOString() };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[VolRiskPremium] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate vol risk premium data' });
  }
});

export default router;
