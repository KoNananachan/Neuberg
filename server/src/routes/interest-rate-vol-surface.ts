import { Router } from 'express';

const router = Router();

function mulberry32(a: number) { return function() { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hashSeed(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) { h = Math.imul(31, h) + s.charCodeAt(i) | 0; } return h; }

// Option expiries for swaption grid
const EXPIRIES = ['1M', '3M', '6M', '1Y', '2Y', '5Y', '10Y'];
// Underlying swap tenors
const SWAP_TENORS = ['1Y', '2Y', '5Y', '10Y', '20Y', '30Y'];

// Strike offsets for vol smile/skew (in basis points relative to ATM)
const STRIKE_OFFSETS = [
  { offset: -100, label: 'ATM-100bp' },
  { offset: -50,  label: 'ATM-50bp' },
  { offset: 0,    label: 'ATM' },
  { offset: 50,   label: 'ATM+50bp' },
  { offset: 100,  label: 'ATM+100bp' },
];

// Cap/floor tenors
const CAP_FLOOR_TENORS = ['1Y', '2Y', '3Y', '5Y', '7Y', '10Y'];

// Currency configurations with realistic base vol levels (normal vol in bps)
const CURRENCIES: Array<{
  id: string;
  name: string;
  volMultiplier: number;
  baseSwapRate: Record<string, number>;
}> = [
  {
    id: 'USD', name: 'US Dollar', volMultiplier: 1.0,
    baseSwapRate: { '1Y': 4.35, '2Y': 4.20, '5Y': 3.95, '10Y': 3.78, '20Y': 3.68, '30Y': 3.62 },
  },
  {
    id: 'EUR', name: 'Euro', volMultiplier: 0.82,
    baseSwapRate: { '1Y': 2.85, '2Y': 2.72, '5Y': 2.58, '10Y': 2.50, '20Y': 2.45, '30Y': 2.40 },
  },
  {
    id: 'GBP', name: 'British Pound', volMultiplier: 0.93,
    baseSwapRate: { '1Y': 4.10, '2Y': 3.95, '5Y': 3.78, '10Y': 3.65, '20Y': 3.55, '30Y': 3.48 },
  },
  {
    id: 'JPY', name: 'Japanese Yen', volMultiplier: 0.52,
    baseSwapRate: { '1Y': 0.45, '2Y': 0.55, '5Y': 0.78, '10Y': 1.05, '20Y': 1.50, '30Y': 1.72 },
  },
];

// Base ATM normal vol grid (bps) for USD — expiry x tenor
// Short expiry + short tenor = lower vol; long expiry + long tenor = higher vol
const BASE_NORMAL_VOLS: Record<string, Record<string, number>> = {
  '1M':  { '1Y': 52, '2Y': 56, '5Y': 64, '10Y': 72, '20Y': 78, '30Y': 82 },
  '3M':  { '1Y': 56, '2Y': 60, '5Y': 68, '10Y': 76, '20Y': 82, '30Y': 86 },
  '6M':  { '1Y': 60, '2Y': 64, '5Y': 73, '10Y': 80, '20Y': 86, '30Y': 90 },
  '1Y':  { '1Y': 66, '2Y': 70, '5Y': 78, '10Y': 86, '20Y': 92, '30Y': 96 },
  '2Y':  { '1Y': 72, '2Y': 76, '5Y': 84, '10Y': 91, '20Y': 97, '30Y': 101 },
  '5Y':  { '1Y': 80, '2Y': 84, '5Y': 92, '10Y': 98, '20Y': 104, '30Y': 108 },
  '10Y': { '1Y': 86, '2Y': 90, '5Y': 98, '10Y': 105, '20Y': 110, '30Y': 114 },
};

// Base cap/floor flat vol (bps) by tenor for USD
const BASE_CAP_FLOOR_VOLS: Record<string, number> = {
  '1Y': 58, '2Y': 64, '3Y': 70, '5Y': 78, '7Y': 84, '10Y': 90,
};

const CACHE_TTL = 12 * 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-ir-vol-surface'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // Helper: convert normal vol (bps) to lognormal vol (%) given ATM rate
  // Approximation: lognormal_vol ≈ normal_vol_bps / (atmRate * 100)
  const normalToLognormal = (normalBps: number, atmRate: number): number => {
    if (atmRate <= 0.01) return 0;
    return Math.round((normalBps / (atmRate * 100)) * 100) / 100;
  };

  // ── Generate per-currency data ──
  const currencies = CURRENCIES.map(ccy => {
    const ccySeed = hashSeed(day + '-ir-vol-' + ccy.id);
    const ccyRng = mulberry32(ccySeed);
    const ccyJitter = (base: number, pct: number) => base * (1 + (ccyRng() - 0.5) * 2 * pct);

    // ATM swap rates with daily jitter
    const atmRates: Record<string, number> = {};
    for (const tenor of SWAP_TENORS) {
      const base = ccy.baseSwapRate[tenor] ?? 3.0;
      atmRates[tenor] = Math.round(ccyJitter(base, 0.012) * 1000) / 1000;
    }

    // ── 1. Swaption Normal Vol Surface ──
    const normalVolSurface = EXPIRIES.map(expiry => {
      const cells: Record<string, {
        normalVol: number;
        lognormalVol: number;
        change1d: number;
        change1w: number;
        change1m: number;
      }> = {};

      for (const tenor of SWAP_TENORS) {
        const baseNormal = (BASE_NORMAL_VOLS[expiry]?.[tenor] ?? 80) * ccy.volMultiplier;
        const normalVol = Math.round(ccyJitter(baseNormal, 0.05) * 10) / 10;
        const lognormalVol = normalToLognormal(normalVol, atmRates[tenor] ?? 3.0);

        const change1d = Math.round((ccyRng() - 0.5) * 4 * 10) / 10;
        const change1w = Math.round((ccyRng() - 0.48) * 8 * 10) / 10;
        const change1m = Math.round((ccyRng() - 0.46) * 14 * 10) / 10;

        cells[tenor] = { normalVol, lognormalVol, change1d, change1w, change1m };
      }

      return { expiry, cells };
    });

    // ── 2. Vol Smile/Skew ──
    // For key expiry/tenor combinations, show vol at different strike offsets
    const smileKeyCombos = [
      { expiry: '1M', tenor: '10Y' },
      { expiry: '3M', tenor: '10Y' },
      { expiry: '6M', tenor: '10Y' },
      { expiry: '1Y', tenor: '5Y' },
      { expiry: '1Y', tenor: '10Y' },
      { expiry: '1Y', tenor: '30Y' },
      { expiry: '5Y', tenor: '10Y' },
      { expiry: '5Y', tenor: '30Y' },
      { expiry: '10Y', tenor: '10Y' },
      { expiry: '10Y', tenor: '30Y' },
    ];

    const volSmile = smileKeyCombos.map(combo => {
      const baseVol = (BASE_NORMAL_VOLS[combo.expiry]?.[combo.tenor] ?? 85) * ccy.volMultiplier;
      const atmRate = atmRates[combo.tenor] ?? 3.0;

      const points = STRIKE_OFFSETS.map(so => {
        const absOff = Math.abs(so.offset);
        // Smile: wings are higher than ATM; slight receiver skew (negative offset = slightly higher)
        let volAdj = 0;
        if (absOff === 50) volAdj = 2.0 + ccyRng() * 1.5;
        else if (absOff === 100) volAdj = 6.0 + ccyRng() * 3.0;
        if (so.offset < 0) volAdj *= 1.12;

        const normalVol = Math.round(ccyJitter(baseVol + volAdj, 0.03) * 10) / 10;
        const lognormalVol = normalToLognormal(normalVol, atmRate);
        const strike = Math.round((atmRate + so.offset / 10000) * 10000) / 10000;

        return {
          offset: so.offset,
          label: so.label,
          strike,
          normalVol,
          lognormalVol,
        };
      });

      return { expiry: combo.expiry, tenor: combo.tenor, points };
    });

    // ── 3. Cap/Floor Implied Vols ──
    const capFloorVols = CAP_FLOOR_TENORS.map(tenor => {
      const baseVol = (BASE_CAP_FLOOR_VOLS[tenor] ?? 75) * ccy.volMultiplier;
      const atmRate = atmRates[tenor] ?? atmRates['5Y'] ?? 3.0;

      // ATM cap/floor vol
      const atmCapVol = Math.round(ccyJitter(baseVol, 0.05) * 10) / 10;
      // OTM cap (ATM+100bp) slightly higher
      const otmCapVol = Math.round(ccyJitter(baseVol + 4 + ccyRng() * 3, 0.04) * 10) / 10;
      // OTM floor (ATM-100bp) slightly higher with receiver skew
      const otmFloorVol = Math.round(ccyJitter(baseVol + 5 + ccyRng() * 3.5, 0.04) * 10) / 10;

      const change1d = Math.round((ccyRng() - 0.5) * 3 * 10) / 10;
      const change1w = Math.round((ccyRng() - 0.48) * 6 * 10) / 10;

      return {
        tenor,
        atmRate: Math.round(atmRate * 1000) / 1000,
        atmCapVol,
        otmCapVol,
        otmFloorVol,
        lognormalAtmCapVol: normalToLognormal(atmCapVol, atmRate),
        change1d,
        change1w,
      };
    });

    // ── 4. Historical Vol Surface Comparison ──
    // Show how current surface compares to 1d, 1w, 1m ago
    const historicalComparison = EXPIRIES.map(expiry => {
      const tenorChanges: Record<string, {
        current: number;
        change1d: number;
        change1w: number;
        change1m: number;
      }> = {};

      for (const tenor of SWAP_TENORS) {
        const cell = normalVolSurface.find(r => r.expiry === expiry)?.cells[tenor];
        if (cell) {
          tenorChanges[tenor] = {
            current: cell.normalVol,
            change1d: cell.change1d,
            change1w: cell.change1w,
            change1m: cell.change1m,
          };
        }
      }

      return { expiry, tenors: tenorChanges };
    });

    // ── Currency summary ──
    const allNormalVols = normalVolSurface.flatMap(row =>
      SWAP_TENORS.map(t => row.cells[t]?.normalVol ?? 0)
    );
    const avgNormalVol = Math.round(
      allNormalVols.reduce((a, b) => a + b, 0) / allNormalVols.length * 10
    ) / 10;

    return {
      currency: ccy.id,
      name: ccy.name,
      atmRates,
      normalVolSurface,
      volSmile,
      capFloorVols,
      historicalComparison,
      avgNormalVol,
    };
  });

  // ── Cross-currency benchmarks ──
  const benchmarkCombos = [
    { label: '1Yx10Y', expiry: '1Y', tenor: '10Y' },
    { label: '5Yx10Y', expiry: '5Y', tenor: '10Y' },
    { label: '10Yx10Y', expiry: '10Y', tenor: '10Y' },
    { label: '1Yx30Y', expiry: '1Y', tenor: '30Y' },
    { label: '5Yx30Y', expiry: '5Y', tenor: '30Y' },
  ];

  const benchmarks = benchmarkCombos.map(bc => {
    const ccyVols = currencies.map(ccyData => {
      const row = ccyData.normalVolSurface.find(r => r.expiry === bc.expiry);
      const cell = row?.cells[bc.tenor];
      return {
        currency: ccyData.currency,
        normalVol: cell?.normalVol ?? 0,
        lognormalVol: cell?.lognormalVol ?? 0,
        change1d: cell?.change1d ?? 0,
        change1w: cell?.change1w ?? 0,
        change1m: cell?.change1m ?? 0,
      };
    });
    return { label: bc.label, expiry: bc.expiry, tenor: bc.tenor, currencies: ccyVols };
  });

  // ── Overall summary ──
  const usdData = currencies.find(c => c.currency === 'USD');
  const usdAllVols = usdData?.normalVolSurface.flatMap(row =>
    SWAP_TENORS.map(t => row.cells[t]?.normalVol ?? 0)
  ) ?? [];
  const usdAvg = usdAllVols.length > 0
    ? usdAllVols.reduce((a, b) => a + b, 0) / usdAllVols.length
    : 0;

  let volRegime: 'low' | 'normal' | 'elevated' | 'high';
  if (usdAvg < 60) volRegime = 'low';
  else if (usdAvg < 80) volRegime = 'normal';
  else if (usdAvg < 100) volRegime = 'elevated';
  else volRegime = 'high';

  // Find most active cell (largest absolute 1d change across USD surface)
  let maxAbsChange = 0;
  let mostActiveExpiry = EXPIRIES[0];
  let mostActiveTenor = SWAP_TENORS[0];
  if (usdData) {
    for (const row of usdData.normalVolSurface) {
      for (const tenor of SWAP_TENORS) {
        const absChange = Math.abs(row.cells[tenor]?.change1d ?? 0);
        if (absChange > maxAbsChange) {
          maxAbsChange = absChange;
          mostActiveExpiry = row.expiry;
          mostActiveTenor = tenor;
        }
      }
    }
  }

  // Average vol by expiry bucket (USD)
  const avgVolByExpiry: Record<string, number> = {};
  if (usdData) {
    for (const row of usdData.normalVolSurface) {
      const vols = SWAP_TENORS.map(t => row.cells[t]?.normalVol ?? 0);
      avgVolByExpiry[row.expiry] = Math.round(
        vols.reduce((a, b) => a + b, 0) / vols.length * 10
      ) / 10;
    }
  }

  // Average vol by tenor bucket (USD)
  const avgVolByTenor: Record<string, number> = {};
  if (usdData) {
    for (const tenor of SWAP_TENORS) {
      const vols = usdData.normalVolSurface.map(row => row.cells[tenor]?.normalVol ?? 0);
      avgVolByTenor[tenor] = Math.round(
        vols.reduce((a, b) => a + b, 0) / vols.length * 10
      ) / 10;
    }
  }

  const summary = {
    volRegime,
    usdAvgNormalVol: Math.round(usdAvg * 10) / 10,
    mostActiveExpiry,
    mostActiveTenor,
    avgVolByExpiry,
    avgVolByTenor,
  };

  return {
    currencies,
    benchmarks,
    summary,
    expiries: EXPIRIES,
    swapTenors: SWAP_TENORS,
    strikeOffsets: STRIKE_OFFSETS.map(s => s.label),
    capFloorTenors: CAP_FLOOR_TENORS,
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
    console.error('[InterestRateVolSurface] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(502).json({ error: 'Failed to generate interest rate volatility surface data' });
  }
});

export default router;
