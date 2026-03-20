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

const DRY_BULK_INDICES = [
  { id: 'BDI', name: 'Baltic Dry Index', base: 1450 },
  { id: 'BCI', name: 'Baltic Capesize Index', base: 2100 },
  { id: 'BPI', name: 'Baltic Panamax Index', base: 1350 },
  { id: 'BSI', name: 'Baltic Supramax Index', base: 1100 },
  { id: 'BHSI', name: 'Baltic Handysize Index', base: 650 },
];

const CONTAINER_ROUTES = [
  { id: 'SCFI', name: 'Shanghai Containerized Freight Index', base: 1050 },
  { id: 'FBX', name: 'Freightos Baltic Index (Global)', base: 1800 },
  { id: 'CCFI', name: 'China Containerized Freight Index', base: 1020 },
];

const TANKER_INDICES = [
  { id: 'BDTI', name: 'Baltic Dirty Tanker Index', base: 950 },
  { id: 'BCTI', name: 'Baltic Clean Tanker Index', base: 680 },
];

const TRADE_ROUTES = [
  { id: 'C5TC', name: 'Capesize 5TC Avg', unit: '$/day', base: 18500 },
  { id: 'P5TC', name: 'Panamax 5TC Avg', unit: '$/day', base: 14200 },
  { id: 'S10TC', name: 'Supramax 10TC Avg', unit: '$/day', base: 12500 },
  { id: 'TD3C', name: 'VLCC MEG-China', unit: 'WS', base: 55 },
  { id: 'TD7', name: 'Aframax N.Sea-UKC', unit: 'WS', base: 120 },
  { id: 'TC2', name: 'MR Product AG-Japan', unit: '$/mt', base: 28 },
];

const CACHE_TTL = 12 * 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-freight-indices'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  const makeHistory = (base: number, pct: number, days: number) =>
    Array.from({ length: days }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      return { date: d.toISOString().slice(0, 10), value: Math.round(jitter(base, pct)) };
    });

  const dryBulk = DRY_BULK_INDICES.map(idx => {
    const current = Math.round(jitter(idx.base, 0.12));
    const change1d = Math.round((rng() - 0.5) * idx.base * 0.04);
    const change1w = Math.round((rng() - 0.48) * idx.base * 0.1);
    const change1m = Math.round((rng() - 0.45) * idx.base * 0.18);
    const ytdChange = Math.round((rng() - 0.4) * idx.base * 0.3);
    const high52w = Math.round(idx.base * (1.15 + rng() * 0.3));
    const low52w = Math.round(idx.base * (0.55 + rng() * 0.2));
    const history = makeHistory(idx.base, 0.15, 90);
    return { id: idx.id, name: idx.name, current, change1d, change1w, change1m, ytdChange, high52w, low52w, history };
  });

  const container = CONTAINER_ROUTES.map(idx => {
    const current = Math.round(jitter(idx.base, 0.15));
    const change1d = Math.round((rng() - 0.5) * idx.base * 0.03);
    const change1w = Math.round((rng() - 0.48) * idx.base * 0.08);
    const change1m = Math.round((rng() - 0.45) * idx.base * 0.15);
    const history = makeHistory(idx.base, 0.18, 52);
    return { id: idx.id, name: idx.name, current, change1d, change1w, change1m, history };
  });

  const tanker = TANKER_INDICES.map(idx => {
    const current = Math.round(jitter(idx.base, 0.14));
    const change1d = Math.round((rng() - 0.5) * idx.base * 0.05);
    const change1w = Math.round((rng() - 0.48) * idx.base * 0.1);
    const history = makeHistory(idx.base, 0.16, 60);
    return { id: idx.id, name: idx.name, current, change1d, change1w, history };
  });

  const tradeRoutes = TRADE_ROUTES.map(r => {
    const current = Math.round(jitter(r.base, 0.12) * 10) / 10;
    const change1d = Math.round((rng() - 0.5) * r.base * 0.06 * 10) / 10;
    const change1w = Math.round((rng() - 0.48) * r.base * 0.12 * 10) / 10;
    return { id: r.id, name: r.name, unit: r.unit, current, change1d, change1w };
  });

  const commodityCorrelation = [
    { commodity: 'Iron Ore', correlation: Math.round((0.5 + rng() * 0.4) * 100) / 100 },
    { commodity: 'Coal', correlation: Math.round((0.4 + rng() * 0.4) * 100) / 100 },
    { commodity: 'Grain', correlation: Math.round((0.2 + rng() * 0.5) * 100) / 100 },
    { commodity: 'Crude Oil', correlation: Math.round((0.3 + rng() * 0.4) * 100) / 100 },
    { commodity: 'Copper', correlation: Math.round((0.3 + rng() * 0.35) * 100) / 100 },
    { commodity: 'LNG', correlation: Math.round((0.15 + rng() * 0.35) * 100) / 100 },
  ];

  const seasonality = Array.from({ length: 12 }, (_, i) => ({
    month: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i],
    avgBDI5y: Math.round(1200 + Math.sin((i - 2) * Math.PI / 6) * 500 + rng() * 100),
    currentYear: Math.round(jitter(1300 + Math.sin((i - 2) * Math.PI / 6) * 400, 0.1)),
  }));

  return { dryBulk, container, tanker, tradeRoutes, commodityCorrelation, seasonality, generatedAt: new Date().toISOString() };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[FreightIndices] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate freight indices data' });
  }
});

export default router;
