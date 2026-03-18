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

interface CommodityOption {
  name: string;
  symbol: string;
  spotPrice: number;
  unit: string;
  atmVol: number;
  vol1mChange: number;
  putSkew25d: number;
  callSkew25d: number;
  totalVolume: number;
  totalOI: number;
  putCallRatio: number;
}

interface VolSurfaceCell {
  strike: number;
  strikePct: number;
  tenor: string;
  impliedVol: number;
}

interface VolSurface {
  commodity: string;
  symbol: string;
  spotPrice: number;
  surface: VolSurfaceCell[];
}

interface ActiveOption {
  commodity: string;
  expiry: string;
  strike: number;
  type: 'Call' | 'Put';
  volume: number;
  openInterest: number;
  lastPrice: number;
  impliedVol: number;
  delta: number;
  gamma: number;
}

interface SeasonalEntry {
  commodity: string;
  symbol: string;
  monthlyVol: number[];
}

interface Summary {
  totalVolume: number;
  totalOI: number;
  mostActiveCommodity: string;
  avgImpliedVol: number;
}

// ── Commodity definitions ──

const COMMODITIES = [
  { name: 'Crude Oil (WTI)', symbol: 'CL', baseSpot: 72.50, unit: '$/bbl', baseAtmVol: 31, baseSkewPut: 3.2, baseSkewCall: -1.8 },
  { name: 'Natural Gas', symbol: 'NG', baseSpot: 3.25, unit: '$/MMBtu', baseAtmVol: 55, baseSkewPut: 5.5, baseSkewCall: -2.5 },
  { name: 'Gold', symbol: 'GC', baseSpot: 2035.0, unit: '$/oz', baseAtmVol: 17, baseSkewPut: 1.8, baseSkewCall: -0.9 },
  { name: 'Silver', symbol: 'SI', baseSpot: 24.80, unit: '$/oz', baseAtmVol: 28, baseSkewPut: 2.5, baseSkewCall: -1.4 },
  { name: 'Copper', symbol: 'HG', baseSpot: 3.85, unit: '$/lb', baseAtmVol: 25, baseSkewPut: 2.2, baseSkewCall: -1.2 },
  { name: 'Corn', symbol: 'ZC', baseSpot: 485.0, unit: '$/bu', baseAtmVol: 25, baseSkewPut: 2.0, baseSkewCall: -1.0 },
  { name: 'Soybeans', symbol: 'ZS', baseSpot: 1245.0, unit: '$/bu', baseAtmVol: 22, baseSkewPut: 1.9, baseSkewCall: -1.1 },
  { name: 'Wheat', symbol: 'ZW', baseSpot: 620.0, unit: '$/bu', baseAtmVol: 30, baseSkewPut: 2.8, baseSkewCall: -1.5 },
];

// Vol surface commodities (top 3: WTI, Gold, NatGas)
const VOL_SURFACE_SYMBOLS = ['CL', 'GC', 'NG'];
const STRIKE_PCTS = [0.80, 0.90, 0.95, 1.00, 1.05, 1.10, 1.20];
const TENORS = ['1M', '3M', '6M', '1Y'];
const TENOR_MULTIPLIERS: Record<string, number> = { '1M': 0.92, '3M': 1.0, '6M': 1.05, '1Y': 1.10 };

// Seasonal vol patterns: base monthly vol multiplier by commodity type
// Energy: higher in winter (Nov-Feb), lower in summer
const ENERGY_SEASONAL = [1.15, 1.10, 1.02, 0.95, 0.90, 0.88, 0.90, 0.92, 0.95, 1.00, 1.08, 1.18];
// Agriculture: higher around planting (Apr-May) and harvest (Sep-Oct)
const AGRI_SEASONAL = [0.90, 0.92, 0.98, 1.12, 1.15, 1.05, 0.95, 0.93, 1.08, 1.12, 1.00, 0.92];
// Metals: relatively flat with slight Q4 uptick
const METALS_SEASONAL = [0.98, 0.96, 0.95, 0.97, 0.98, 0.97, 0.96, 0.98, 1.00, 1.02, 1.05, 1.08];

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('commodity-options-' + day));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // ── 1. Commodities ──
  const commodities: CommodityOption[] = COMMODITIES.map(c => {
    const spotPrice = Math.round(jitter(c.baseSpot, 0.06) * 100) / 100;
    const atmVol = Math.round(jitter(c.baseAtmVol, 0.10) * 100) / 100;
    const vol1mChange = Math.round((rng() - 0.45) * 6 * 100) / 100;
    const putSkew25d = Math.round(jitter(c.baseSkewPut, 0.15) * 100) / 100;
    const callSkew25d = Math.round(jitter(c.baseSkewCall, 0.15) * 100) / 100;
    const totalVolume = Math.round(jitter(c.symbol === 'CL' ? 450000 : c.symbol === 'GC' ? 320000 : c.symbol === 'NG' ? 280000 : 120000, 0.20));
    const totalOI = Math.round(jitter(totalVolume * 3.5, 0.15));
    const putCallRatio = Math.round(jitter(0.85, 0.20) * 100) / 100;

    return {
      name: c.name,
      symbol: c.symbol,
      spotPrice,
      unit: c.unit,
      atmVol,
      vol1mChange,
      putSkew25d: Math.max(0.5, putSkew25d),
      callSkew25d: Math.min(-0.2, callSkew25d),
      totalVolume,
      totalOI,
      putCallRatio,
    };
  });

  // ── 2. Summary ──
  const totalVolume = commodities.reduce((a, c) => a + c.totalVolume, 0);
  const totalOI = commodities.reduce((a, c) => a + c.totalOI, 0);
  const mostActive = [...commodities].sort((a, b) => b.totalVolume - a.totalVolume)[0];
  const avgImpliedVol = Math.round((commodities.reduce((a, c) => a + c.atmVol, 0) / commodities.length) * 100) / 100;

  const summary: Summary = {
    totalVolume,
    totalOI,
    mostActiveCommodity: mostActive.name,
    avgImpliedVol,
  };

  // ── 3. Vol surfaces (top 3) ──
  const volSurfaces: VolSurface[] = VOL_SURFACE_SYMBOLS.map(sym => {
    const comm = commodities.find(c => c.symbol === sym)!;
    const surface: VolSurfaceCell[] = [];

    for (const tenor of TENORS) {
      const tenorMult = TENOR_MULTIPLIERS[tenor];
      for (const pct of STRIKE_PCTS) {
        // Vol smile: higher vol for OTM puts (low strike) and OTM calls (high strike)
        const moneyness = pct - 1.0;
        // Quadratic smile + skew: puts get more vol boost than calls
        const smileComponent = moneyness < 0
          ? comm.putSkew25d * 4 * moneyness * moneyness
          : comm.callSkew25d * -4 * moneyness * moneyness;
        const baseVol = comm.atmVol * tenorMult + smileComponent;
        const impliedVol = Math.round(jitter(Math.max(baseVol * 0.7, baseVol), 0.03) * 100) / 100;
        const strike = Math.round(comm.spotPrice * pct * 100) / 100;

        surface.push({
          strike,
          strikePct: Math.round(pct * 100),
          tenor,
          impliedVol: Math.max(5, impliedVol),
        });
      }
    }

    return {
      commodity: comm.name,
      symbol: sym,
      spotPrice: comm.spotPrice,
      surface,
    };
  });

  // ── 4. Most active options (10) ──
  const expiryMonths = ['2024-04', '2024-05', '2024-06', '2024-07', '2024-09', '2024-12'];
  const activeOptions: ActiveOption[] = [];

  for (let i = 0; i < 10; i++) {
    const commIdx = Math.floor(rng() * commodities.length);
    const comm = commodities[commIdx];
    const isCall = rng() > 0.45;
    const strikePct = isCall ? 1 + rng() * 0.12 : 1 - rng() * 0.12;
    const strike = Math.round(comm.spotPrice * strikePct * 100) / 100;
    const expiryIdx = Math.floor(rng() * expiryMonths.length);
    const expiryDay = 15 + Math.floor(rng() * 10);
    const expiry = `${expiryMonths[expiryIdx]}-${String(expiryDay).padStart(2, '0')}`;
    const volume = Math.round(jitter(8000, 0.6));
    const openInterest = Math.round(jitter(volume * 4, 0.3));
    const impliedVol = Math.round(jitter(comm.atmVol * (isCall ? 0.95 : 1.05), 0.10) * 100) / 100;
    const moneyness = (comm.spotPrice - strike) / comm.spotPrice;
    const rawDelta = isCall
      ? Math.max(0.05, Math.min(0.95, 0.5 + moneyness * 3))
      : Math.max(-0.95, Math.min(-0.05, -0.5 + moneyness * 3));
    const delta = Math.round(rawDelta * 1000) / 1000;
    const gamma = Math.round(jitter(0.015, 0.4) * 10000) / 10000;
    const lastPrice = Math.round(jitter(comm.spotPrice * 0.03, 0.5) * 100) / 100;

    activeOptions.push({
      commodity: comm.name,
      expiry,
      strike,
      type: isCall ? 'Call' : 'Put',
      volume: Math.max(500, volume),
      openInterest: Math.max(1000, openInterest),
      lastPrice: Math.max(0.01, lastPrice),
      impliedVol: Math.max(5, impliedVol),
      delta,
      gamma: Math.max(0.0001, gamma),
    });
  }

  // Sort by volume descending
  activeOptions.sort((a, b) => b.volume - a.volume);

  // ── 5. Seasonal vol patterns ──
  const seasonalPatterns: SeasonalEntry[] = COMMODITIES.map(c => {
    let baseSeasonal: number[];
    if (c.symbol === 'CL' || c.symbol === 'NG') {
      baseSeasonal = ENERGY_SEASONAL;
    } else if (c.symbol === 'GC' || c.symbol === 'SI' || c.symbol === 'HG') {
      baseSeasonal = METALS_SEASONAL;
    } else {
      baseSeasonal = AGRI_SEASONAL;
    }

    const monthlyVol = baseSeasonal.map(mult => {
      const vol = c.baseAtmVol * mult;
      return Math.round(jitter(vol, 0.04) * 100) / 100;
    });

    return {
      commodity: c.name,
      symbol: c.symbol,
      monthlyVol,
    };
  });

  return {
    summary,
    commodities,
    volSurfaces,
    mostActiveOptions: activeOptions,
    seasonalPatterns,
    generatedAt: new Date().toISOString(),
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
    console.error('[CommodityOptions] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate commodity options data' });
  }
});

export default router;
