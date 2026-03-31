import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

// --- Baltic Dry Bulk Indices ---
const BALTIC_INDICES = [
  { id: 'BDI', name: 'Baltic Dry Index', base: 1680 },
  { id: 'BCI', name: 'Baltic Capesize Index', base: 2450 },
  { id: 'BPI', name: 'Baltic Panamax Index', base: 1520 },
  { id: 'BSI', name: 'Baltic Supramax Index', base: 1180 },
  { id: 'BHSI', name: 'Baltic Handysize Index', base: 720 },
];

// --- SCFI Container Routes ---
const SCFI_ROUTES = [
  { route: 'Shanghai - Europe', baseRate: 1420, unit: 'TEU' as const },
  { route: 'Shanghai - US West Coast', baseRate: 1850, unit: 'FEU' as const },
  { route: 'Shanghai - US East Coast', baseRate: 2680, unit: 'FEU' as const },
  { route: 'Shanghai - SE Asia', baseRate: 320, unit: 'TEU' as const },
  { route: 'Shanghai - Mediterranean', baseRate: 1380, unit: 'TEU' as const },
];

// --- Tanker Routes ---
const TANKER_ROUTES = [
  { route: 'MEG-China', type: 'VLCC', baseWs: 58, baseTce: 42000 },
  { route: 'MEG-Japan', type: 'VLCC', baseWs: 55, baseTce: 38500 },
  { route: 'WAF-China', type: 'VLCC', baseWs: 62, baseTce: 45000 },
  { route: 'WAF-UKC', type: 'Suezmax', baseWs: 92, baseTce: 34000 },
  { route: 'N.Sea-UKC', type: 'Aframax', baseWs: 118, baseTce: 29500 },
  { route: 'MEG-Japan (Clean)', type: 'MR', baseWs: 185, baseTce: 23000 },
];

// --- LNG Carrier Data ---
const LNG_ROUTES = [
  { route: 'Atlantic Spot', baseRate: 68000, type: 'spot' as const },
  { route: 'Pacific Spot', baseRate: 72000, type: 'spot' as const },
  { route: 'MEG-Asia Spot', baseRate: 75000, type: 'spot' as const },
  { route: '1-Year Term (174k cbm)', baseRate: 58000, type: 'term' as const },
  { route: '3-Year Term (174k cbm)', baseRate: 52000, type: 'term' as const },
  { route: '5-Year Term (174k cbm)', baseRate: 47000, type: 'term' as const },
];

// --- FFA Quarters ---
const FFA_QUARTERS = [
  { label: 'Cal Q1', baseCapesizeTce: 19200, basePanamaxTce: 13800 },
  { label: 'Cal Q2', baseCapesizeTce: 21500, basePanamaxTce: 15200 },
  { label: 'Cal Q3', baseCapesizeTce: 24800, basePanamaxTce: 16500 },
  { label: 'Cal Q4', baseCapesizeTce: 22000, basePanamaxTce: 14900 },
  { label: 'Next Year Q1', baseCapesizeTce: 18500, basePanamaxTce: 13200 },
  { label: 'Next Year Q2', baseCapesizeTce: 20800, basePanamaxTce: 14600 },
  { label: 'Next Year Q3', baseCapesizeTce: 23500, basePanamaxTce: 15800 },
  { label: 'Next Year Q4', baseCapesizeTce: 21200, basePanamaxTce: 14300 },
];

// --- Fleet Segments ---
const FLEET_SEGMENTS = [
  { segment: 'Capesize', baseCount: 1820, baseUtilization: 0.89, baseOrderbook: 142 },
  { segment: 'Panamax', baseCount: 2560, baseUtilization: 0.91, baseOrderbook: 198 },
  { segment: 'Supramax', baseCount: 3480, baseUtilization: 0.88, baseOrderbook: 275 },
  { segment: 'Handysize', baseCount: 3120, baseUtilization: 0.86, baseOrderbook: 165 },
  { segment: 'VLCC', baseCount: 880, baseUtilization: 0.92, baseOrderbook: 68 },
  { segment: 'Suezmax', baseCount: 580, baseUtilization: 0.90, baseOrderbook: 52 },
  { segment: 'Aframax', baseCount: 720, baseUtilization: 0.88, baseOrderbook: 85 },
  { segment: 'MR Tanker', baseCount: 1650, baseUtilization: 0.87, baseOrderbook: 210 },
  { segment: 'Container (>12k TEU)', baseCount: 950, baseUtilization: 0.93, baseOrderbook: 320 },
  { segment: 'Container (3-12k TEU)', baseCount: 2100, baseUtilization: 0.90, baseOrderbook: 185 },
  { segment: 'LNG Carrier', baseCount: 680, baseUtilization: 0.94, baseOrderbook: 295 },
];

// --- Port Congestion ---
const PORTS = [
  { port: 'Shanghai', country: 'China', baseVessels: 145, baseWaitDays: 2.2 },
  { port: 'Singapore', country: 'Singapore', baseVessels: 168, baseWaitDays: 1.6 },
  { port: 'Rotterdam', country: 'Netherlands', baseVessels: 72, baseWaitDays: 1.3 },
  { port: 'Ningbo-Zhoushan', country: 'China', baseVessels: 112, baseWaitDays: 2.5 },
  { port: 'Busan', country: 'South Korea', baseVessels: 68, baseWaitDays: 1.1 },
  { port: 'Los Angeles/Long Beach', country: 'USA', baseVessels: 55, baseWaitDays: 1.8 },
  { port: 'Port Hedland', country: 'Australia', baseVessels: 48, baseWaitDays: 4.2 },
  { port: 'Fujairah', country: 'UAE', baseVessels: 85, baseWaitDays: 3.1 },
  { port: 'Santos', country: 'Brazil', baseVessels: 42, baseWaitDays: 3.8 },
  { port: 'Houston', country: 'USA', baseVessels: 62, baseWaitDays: 2.4 },
];


let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('freight-rate-monitor-' + day));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // --- Baltic Indices ---
  const balticIndices = BALTIC_INDICES.map(idx => {
    const current = Math.round(jitter(idx.base, 0.15));
    const change1d = Math.round((rng() - 0.5) * idx.base * 0.04);
    const change1dPct = Math.round(change1d / current * 10000) / 100;
    const change1w = Math.round((rng() - 0.48) * idx.base * 0.08);
    const change1wPct = Math.round(change1w / current * 10000) / 100;
    const change1m = Math.round((rng() - 0.45) * idx.base * 0.16);
    const change1mPct = Math.round(change1m / current * 10000) / 100;
    const ytdChange = Math.round((rng() - 0.42) * idx.base * 0.28);
    const ytdChangePct = Math.round(ytdChange / current * 10000) / 100;
    const high52w = Math.round(idx.base * (1.2 + rng() * 0.25));
    const low52w = Math.round(idx.base * (0.55 + rng() * 0.2));
    return {
      id: idx.id, name: idx.name, current,
      change1d, change1dPct, change1w, change1wPct,
      change1m, change1mPct, ytdChange, ytdChangePct,
      high52w, low52w,
    };
  });

  // --- SCFI Container Rates ---
  const scfiComposite = Math.round(jitter(1050, 0.15));
  const scfiChange1w = Math.round((rng() - 0.48) * 1050 * 0.06);
  const scfiChange1wPct = Math.round(scfiChange1w / scfiComposite * 10000) / 100;

  const containerRates = {
    scfiComposite,
    scfiChange1w,
    scfiChange1wPct,
    routes: SCFI_ROUTES.map(r => {
      const rate = Math.round(jitter(r.baseRate, 0.18));
      const weeklyChange = Math.round((rng() - 0.48) * r.baseRate * 0.08);
      const weeklyChangePct = Math.round(weeklyChange / rate * 10000) / 100;
      return {
        route: r.route,
        rate,
        unit: `$/${r.unit}`,
        weeklyChange,
        weeklyChangePct,
      };
    }),
  };

  // --- Tanker Rates ---
  const tankerRates = TANKER_ROUTES.map(t => {
    const worldscale = Math.round(jitter(t.baseWs, 0.16) * 10) / 10;
    const tce = Math.round(jitter(t.baseTce, 0.18));
    const wsChange1d = Math.round((rng() - 0.5) * t.baseWs * 0.05 * 10) / 10;
    const tceChange1d = Math.round((rng() - 0.5) * t.baseTce * 0.05);
    const wsChange1w = Math.round((rng() - 0.48) * t.baseWs * 0.1 * 10) / 10;
    const tceChange1w = Math.round((rng() - 0.48) * t.baseTce * 0.1);
    return {
      route: t.route,
      vesselType: t.type,
      worldscale,
      tce,
      tceUnit: '$/day',
      wsChange1d,
      tceChange1d,
      wsChange1w,
      tceChange1w,
    };
  });

  // --- LNG Carrier Rates ---
  const lngRates = LNG_ROUTES.map(l => {
    const rate = Math.round(jitter(l.baseRate, 0.2));
    const change1w = Math.round((rng() - 0.48) * l.baseRate * 0.08);
    const change1wPct = Math.round(change1w / rate * 10000) / 100;
    return {
      route: l.route,
      type: l.type,
      rate,
      unit: '$/day',
      change1w,
      change1wPct,
    };
  });

  // --- Forward Freight Agreements (FFAs) ---
  const currentYear = new Date().getFullYear();
  const ffas = FFA_QUARTERS.map((q, i) => {
    const year = i < 4 ? currentYear : currentYear + 1;
    const quarterNum = (i % 4) + 1;
    const capesizeTce = Math.round(jitter(q.baseCapesizeTce, 0.12));
    const panamaxTce = Math.round(jitter(q.basePanamaxTce, 0.12));
    const capesizeChange1w = Math.round((rng() - 0.48) * q.baseCapesizeTce * 0.06);
    const panamaxChange1w = Math.round((rng() - 0.48) * q.basePanamaxTce * 0.06);
    const capesizeVolume = Math.round(jitter(1200, 0.3));
    const panamaxVolume = Math.round(jitter(850, 0.3));
    return {
      label: q.label,
      year,
      quarter: `Q${quarterNum}`,
      capesize: {
        tce: capesizeTce,
        change1w: capesizeChange1w,
        change1wPct: Math.round(capesizeChange1w / capesizeTce * 10000) / 100,
        volume: capesizeVolume,
      },
      panamax: {
        tce: panamaxTce,
        change1w: panamaxChange1w,
        change1wPct: Math.round(panamaxChange1w / panamaxTce * 10000) / 100,
        volume: panamaxVolume,
      },
    };
  });

  // --- Fleet Data ---
  const fleetData = FLEET_SEGMENTS.map(f => {
    const vesselCount = Math.round(jitter(f.baseCount, 0.03));
    const utilization = Math.round(jitter(f.baseUtilization, 0.04) * 1000) / 1000;
    const utilizationPct = Math.round(utilization * 10000) / 100;
    const orderbook = Math.round(jitter(f.baseOrderbook, 0.1));
    const orderbookPctOfFleet = Math.round(orderbook / vesselCount * 10000) / 100;
    const avgAge = Math.round((8 + rng() * 7) * 10) / 10;
    const scrapped1m = Math.round(rng() * f.baseCount * 0.003);
    const delivered1m = Math.round(rng() * f.baseOrderbook * 0.02);
    return {
      segment: f.segment,
      vesselCount,
      utilizationPct,
      orderbook,
      orderbookPctOfFleet,
      avgAgeYears: avgAge,
      scrapped1m,
      delivered1m,
    };
  });

  const totalFleet = fleetData.reduce((sum, f) => sum + f.vesselCount, 0);
  const totalOrderbook = fleetData.reduce((sum, f) => sum + f.orderbook, 0);
  const avgUtilization = Math.round(fleetData.reduce((sum, f) => sum + f.utilizationPct, 0) / fleetData.length * 100) / 100;

  // --- Port Congestion ---
  const portCongestion = PORTS.map(p => {
    const vesselsWaiting = Math.round(jitter(p.baseVessels, 0.25));
    const avgWaitDays = Math.round(jitter(p.baseWaitDays, 0.3) * 10) / 10;
    const change1w = Math.round((rng() - 0.48) * p.baseVessels * 0.12);
    const change1wPct = Math.round(change1w / vesselsWaiting * 10000) / 100;
    const congestionLevel = avgWaitDays > 3.5 ? 'high' : avgWaitDays > 2.0 ? 'moderate' : 'low';
    const berths = Math.round(jitter(vesselsWaiting * 1.8, 0.1));
    const berthUtilization = Math.round(vesselsWaiting / berths * 10000) / 100;
    return {
      port: p.port,
      country: p.country,
      vesselsWaiting,
      avgWaitDays,
      change1w,
      change1wPct,
      congestionLevel,
      berthUtilization,
    };
  });

  return {
    balticIndices,
    containerRates,
    tankerRates,
    lngRates,
    ffas,
    fleetData: {
      segments: fleetData,
      totalFleet,
      totalOrderbook,
      orderbookPctOfFleet: Math.round(totalOrderbook / totalFleet * 10000) / 100,
      avgUtilization,
    },
    portCongestion,
    timestamp: new Date().toISOString(),
  };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[FreightRateMonitor] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate freight rate data' });
  }
});

export default router;
