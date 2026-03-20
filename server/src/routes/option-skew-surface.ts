import { Router } from 'express';

import { mulberry32, hashSeed } from '../lib/seeded-data';
const router = Router();

// ── Types ──

interface StrikeVolEntry {
  strikePercent: number;
  strike: number;
  iv: number;
  ivChange1d: number;
}

interface ExpirySlice {
  tenor: string;
  daysToExpiry: number;
  atmVol: number;
  strikes: StrikeVolEntry[];
}

interface SkewMetrics {
  putCallSpread25d: number;
  riskReversal10d: number;
  butterflySpread25d: number;
  skewSlope: number;
  putSkewSteepness: number;
  skewChange1d: number;
}

interface TermStructureEntry {
  tenor: string;
  daysToExpiry: number;
  atmVol: number;
}

interface UnderlyingData {
  ticker: string;
  spotPrice: number;
  expirySlices: ExpirySlice[];
  skewMetrics: SkewMetrics;
  termStructure: TermStructureEntry[];
}

interface SkewRanking {
  ticker: string;
  skewRichness: number;
  percentileRank: number;
}

interface SummaryData {
  richestSkew: { ticker: string; putCallSpread25d: number };
  cheapestSkew: { ticker: string; putCallSpread25d: number };
  skewRankings: SkewRanking[];
}

interface OptionSkewSurfaceResponse {
  underlyings: UnderlyingData[];
  summary: SummaryData;
  timestamp: string;
}

// ── Underlying universe ──

const TICKERS = ['SPX', 'NDX', 'RUT', 'VIX', 'AAPL', 'MSFT', 'TSLA', 'AMZN'];

// ── Tenor definitions ──

const TENOR_DEFS: Array<{ label: string; days: number }> = [
  { label: '1W', days: 7 },
  { label: '2W', days: 14 },
  { label: '1M', days: 30 },
  { label: '2M', days: 60 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '9M', days: 270 },
  { label: '1Y', days: 365 },
  { label: '18M', days: 548 },
  { label: '2Y', days: 730 },
];

// ── Strike moneyness levels ──

const STRIKE_PERCENTS = [80, 85, 90, 95, 97.5, 100, 102.5, 105, 110, 115, 120];

// ── Vol profiles per underlying ──

interface VolProfile {
  baseSpot: number;
  baseAtmVol: number;       // ATM IV in vol points (e.g. 15 = 15%)
  skewSteepness: number;    // put-skew multiplier (higher = steeper downside skew)
  callWingLift: number;     // OTM call IV elevation factor
  termSlope: number;        // vol change per month in term structure
  invertedSkew: boolean;    // true for VIX-like (calls more expensive than puts)
}

const VOL_PROFILES: Record<string, VolProfile> = {
  SPX:  { baseSpot: 5850, baseAtmVol: 15.0, skewSteepness: 1.40, callWingLift: 0.15, termSlope: 0.20,  invertedSkew: false },
  NDX:  { baseSpot: 20500, baseAtmVol: 18.0, skewSteepness: 1.25, callWingLift: 0.20, termSlope: 0.15,  invertedSkew: false },
  RUT:  { baseSpot: 2250, baseAtmVol: 22.0, skewSteepness: 1.30, callWingLift: 0.18, termSlope: 0.30,  invertedSkew: false },
  VIX:  { baseSpot: 18.5,  baseAtmVol: 80.0, skewSteepness: 0.40, callWingLift: 1.80, termSlope: -1.50, invertedSkew: true },
  AAPL: { baseSpot: 230,  baseAtmVol: 24.0, skewSteepness: 0.90, callWingLift: 0.25, termSlope: 0.18,  invertedSkew: false },
  MSFT: { baseSpot: 435,  baseAtmVol: 22.0, skewSteepness: 0.85, callWingLift: 0.22, termSlope: 0.15,  invertedSkew: false },
  TSLA: { baseSpot: 265,  baseAtmVol: 55.0, skewSteepness: 0.50, callWingLift: 0.60, termSlope: -0.40, invertedSkew: false },
  AMZN: { baseSpot: 210,  baseAtmVol: 28.0, skewSteepness: 0.88, callWingLift: 0.25, termSlope: 0.15,  invertedSkew: false },
};

// ── Helpers ──

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

// ── IV model ──
// Generates a realistic implied vol for a given underlying, strike %, and tenor.
// SPX: steep put skew (~25-30 vol at 80% strike vs ~15 ATM).
// TSLA: high overall vol with flatter skew.
// VIX: inverted skew (OTM calls more expensive than OTM puts).

function computeIv(
  profile: VolProfile,
  strikePercent: number,
  tenorDays: number,
  rng: () => number,
): number {
  const months = tenorDays / 30;

  // ATM vol adjusts along term structure
  const atmVol = profile.baseAtmVol + profile.termSlope * months + (rng() - 0.5) * 0.4;

  // Log moneyness: negative for OTM puts, positive for OTM calls
  const logM = Math.log(strikePercent / 100);

  // Skew flattens with longer expiry (sqrt-time scaling)
  const timeDecay = Math.sqrt(30 / Math.max(tenorDays, 1));

  let iv = atmVol;

  if (profile.invertedSkew) {
    // VIX-style: calls are more expensive (positive logM -> higher IV)
    // Puts are cheaper (negative logM -> lower IV or flat)
    const callComponent = logM > 0
      ? profile.callWingLift * logM * logM * 800 * timeDecay
      : 0;
    const putComponent = logM < 0
      ? profile.skewSteepness * Math.abs(logM) * 20 * timeDecay
      : 0;
    // Linear tilt: calls richer
    const linearTilt = logM * atmVol * 0.15 * timeDecay;
    iv += callComponent - putComponent + linearTilt;
  } else {
    // Standard equity/index skew: puts are more expensive (negative logM -> higher IV)

    // Quadratic put wing (steep for indices like SPX)
    const putWing = logM < 0
      ? profile.skewSteepness * logM * logM * 500 * timeDecay
      : 0;

    // Quadratic call wing (mild elevation for OTM calls)
    const callWing = logM > 0
      ? profile.callWingLift * logM * logM * 300 * timeDecay
      : 0;

    // Linear skew component (puts richer than calls for equity)
    const linearSkew = -logM * atmVol * 0.10 * profile.skewSteepness * timeDecay;

    iv += putWing + callWing + linearSkew;
  }

  // Small noise
  iv += (rng() - 0.5) * 0.2;

  return round2(Math.max(iv, atmVol * 0.30));
}

// ── Data generation ──

function generate(): OptionSkewSurfaceResponse {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('option-skew-surface-' + day));

  // Yesterday's seed for 1-day change calculation
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const prevDay = yesterday.toISOString().slice(0, 10);
  const prevRng = mulberry32(hashSeed('option-skew-surface-' + prevDay));

  const underlyings: UnderlyingData[] = [];

  for (const ticker of TICKERS) {
    const profile = VOL_PROFILES[ticker];

    // Jitter spot price +/- 1%
    const spotPrice = round2(profile.baseSpot * (1 + (rng() - 0.5) * 0.02));

    // Build expiry slices
    const expirySlices: ExpirySlice[] = [];
    const termStructure: TermStructureEntry[] = [];

    // Also build previous-day surface for 1d change
    const prevSlicesAtm: Record<string, number> = {};
    const prevStrikeIvs: Record<string, Record<number, number>> = {};

    // Generate previous day data (consume prevRng in same order for determinism)
    const prevSpot = round2(profile.baseSpot * (1 + (prevRng() - 0.5) * 0.02));
    for (const tenorDef of TENOR_DEFS) {
      prevStrikeIvs[tenorDef.label] = {};
      for (const pct of STRIKE_PERCENTS) {
        const prevIv = computeIv(profile, pct, tenorDef.days, prevRng);
        prevStrikeIvs[tenorDef.label][pct] = prevIv;
        if (pct === 100) {
          prevSlicesAtm[tenorDef.label] = prevIv;
        }
      }
    }

    // Generate current day data
    for (const tenorDef of TENOR_DEFS) {
      const strikes: StrikeVolEntry[] = [];
      let atmVol = 0;

      for (const pct of STRIKE_PERCENTS) {
        const strike = round2(spotPrice * pct / 100);
        const iv = computeIv(profile, pct, tenorDef.days, rng);
        const prevIv = prevStrikeIvs[tenorDef.label]?.[pct] ?? iv;
        const ivChange1d = round2(iv - prevIv);

        if (pct === 100) {
          atmVol = iv;
        }

        strikes.push({ strikePercent: pct, strike, iv, ivChange1d });
      }

      expirySlices.push({
        tenor: tenorDef.label,
        daysToExpiry: tenorDef.days,
        atmVol: round2(atmVol),
        strikes,
      });

      termStructure.push({
        tenor: tenorDef.label,
        daysToExpiry: tenorDef.days,
        atmVol: round2(atmVol),
      });
    }

    // ── Skew metrics (use 1M slice as reference) ──
    const refSlice = expirySlices.find((s) => s.tenor === '1M') ?? expirySlices[2];
    const getIv = (pct: number): number =>
      refSlice.strikes.find((s) => s.strikePercent === pct)?.iv ?? profile.baseAtmVol;
    const getPrevIv = (pct: number): number =>
      prevStrikeIvs['1M']?.[pct] ?? getIv(pct);

    const atmVol = getIv(100);
    const iv90 = getIv(90);   // ~25D put proxy
    const iv110 = getIv(110); // ~25D call proxy
    const iv85 = getIv(85);   // ~10D put proxy
    const iv115 = getIv(115); // ~10D call proxy
    const iv95 = getIv(95);
    const iv105 = getIv(105);

    // 25-delta put-call spread: 25D put IV - 25D call IV (positive = puts richer)
    const putCallSpread25d = round2(iv90 - iv110);

    // 10-delta risk reversal: 10D call IV - 10D put IV (negative = puts richer)
    const riskReversal10d = round2(iv115 - iv85);

    // 25-delta butterfly: average of wings minus ATM
    const butterflySpread25d = round2((iv90 + iv110) / 2 - atmVol);

    // Skew slope: dVol/dStrike at ATM (approximate via 95-105 spread)
    // Expressed as vol change per 10% moneyness move
    const skewSlope = round4((iv95 - iv105) / 10);

    // Put skew steepness: ratio of 80% IV to ATM IV
    const iv80 = getIv(80);
    const putSkewSteepness = round2(iv80 / atmVol);

    // 1-day change in skew (25D put-call spread change)
    const prevPutCallSpread25d = round2(getPrevIv(90) - getPrevIv(110));
    const skewChange1d = round2(putCallSpread25d - prevPutCallSpread25d);

    const skewMetrics: SkewMetrics = {
      putCallSpread25d,
      riskReversal10d,
      butterflySpread25d,
      skewSlope,
      putSkewSteepness,
      skewChange1d,
    };

    underlyings.push({
      ticker,
      spotPrice,
      expirySlices,
      skewMetrics,
      termStructure,
    });
  }

  // ── Summary: richest/cheapest skew, percentile rankings ──

  const sorted = [...underlyings]
    .filter((u) => !VOL_PROFILES[u.ticker].invertedSkew) // exclude VIX from ranking
    .sort((a, b) => b.skewMetrics.putCallSpread25d - a.skewMetrics.putCallSpread25d);

  const allSorted = [...underlyings]
    .sort((a, b) => b.skewMetrics.putCallSpread25d - a.skewMetrics.putCallSpread25d);

  const richest = sorted[0] ?? allSorted[0];
  const cheapest = sorted[sorted.length - 1] ?? allSorted[allSorted.length - 1];

  const skewRankings: SkewRanking[] = allSorted.map((u, idx) => ({
    ticker: u.ticker,
    skewRichness: u.skewMetrics.putCallSpread25d,
    percentileRank: round2((1 - idx / Math.max(allSorted.length - 1, 1)) * 100),
  }));

  const summary: SummaryData = {
    richestSkew: { ticker: richest.ticker, putCallSpread25d: richest.skewMetrics.putCallSpread25d },
    cheapestSkew: { ticker: cheapest.ticker, putCallSpread25d: cheapest.skewMetrics.putCallSpread25d },
    skewRankings,
  };

  return {
    underlyings,
    summary,
    timestamp: new Date().toISOString(),
  };
}

// ── Cache ──

let cache: { data: OptionSkewSurfaceResponse; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();

    if (cache && (now - cache.ts) < TTL) {
      return res.json(cache.data);
    }

    const data = generate();
    cache = { data, ts: now };

    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[OptionSkewSurface] Error:', message);

    // Stale fallback
    if (cache) {
      return res.json(cache.data);
    }

    res.status(500).json({ error: 'Failed to generate option skew surface data' });
  }
});

export default router;
