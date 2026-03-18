import { Router } from 'express';

const router = Router();

function mulberry32(a: number) { return function(){let t=(a+=0x6d2b79f5);t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;}; }
function hashSeed(str: string): number { let hash=0;for(let i=0;i<str.length;i++){const char=str.charCodeAt(i);hash=((hash<<5)-hash)+char;hash|=0;}return Math.abs(hash); }

let cache: { data: any; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

// ── Types ──

interface SkewSurfaceRow {
  ticker: string;
  spotPrice: number;
  strike: number;
  strikePercent: number;
  ivByTenor: Record<string, number>;
}

interface SkewMetrics {
  ticker: string;
  putCallSkew25D: number;
  putCallSkew10D: number;
  atmVol: number;
  skewSlope: number;
  convexity: number;
}

interface TermStructureRow {
  ticker: string;
  atmVols: Record<string, number>;
  shape: 'contango' | 'backwardation' | 'humped';
}

interface RiskReversalRow {
  ticker: string;
  rr25d1M: number;
  rr25d3M: number;
  rr10d1M: number;
  rr10d3M: number;
}

interface VolatilitySkewResponse {
  skewSurface: SkewSurfaceRow[];
  skewMetrics: SkewMetrics[];
  termStructure: TermStructureRow[];
  riskReversal: RiskReversalRow[];
  timestamp: string;
}

// ── Ticker universe ──

const TICKERS = ['SPY', 'QQQ', 'IWM', 'AAPL', 'MSFT', 'NVDA', 'TSLA', 'META', 'AMZN', 'GOOGL'];

const STRIKE_PERCENTS = [80, 85, 90, 95, 100, 105, 110, 115, 120];

const SURFACE_TENORS = ['1W', '1M', '3M', '6M', '1Y'];

const TERM_TENORS = ['1W', '1M', '2M', '3M', '6M', '9M', '1Y'];

// ── Ticker profiles ──

interface TickerProfile {
  baseSpot: number;
  baseAtmVol: number;
  skewSteepness: number;   // multiplier for put-side vol premium
  callWingFactor: number;  // multiplier for call-side wing vol
  termSlope: number;       // vol increase per month in term structure
  type: 'index' | 'megacap' | 'highvol';
}

const PROFILES: Record<string, TickerProfile> = {
  SPY:   { baseSpot: 585,  baseAtmVol: 16.0, skewSteepness: 1.00, callWingFactor: 0.30, termSlope: 0.40, type: 'index' },
  QQQ:   { baseSpot: 505,  baseAtmVol: 19.0, skewSteepness: 1.10, callWingFactor: 0.35, termSlope: 0.35, type: 'index' },
  IWM:   { baseSpot: 225,  baseAtmVol: 22.0, skewSteepness: 1.05, callWingFactor: 0.35, termSlope: 0.50, type: 'index' },
  AAPL:  { baseSpot: 230,  baseAtmVol: 24.0, skewSteepness: 1.15, callWingFactor: 0.40, termSlope: 0.30, type: 'megacap' },
  MSFT:  { baseSpot: 435,  baseAtmVol: 22.0, skewSteepness: 1.10, callWingFactor: 0.38, termSlope: 0.30, type: 'megacap' },
  NVDA:  { baseSpot: 140,  baseAtmVol: 45.0, skewSteepness: 1.50, callWingFactor: 0.65, termSlope: -0.30, type: 'highvol' },
  TSLA:  { baseSpot: 265,  baseAtmVol: 55.0, skewSteepness: 1.60, callWingFactor: 0.70, termSlope: -0.50, type: 'highvol' },
  META:  { baseSpot: 610,  baseAtmVol: 32.0, skewSteepness: 1.20, callWingFactor: 0.45, termSlope: -0.20, type: 'megacap' },
  AMZN:  { baseSpot: 210,  baseAtmVol: 28.0, skewSteepness: 1.15, callWingFactor: 0.42, termSlope: 0.25, type: 'megacap' },
  GOOGL: { baseSpot: 175,  baseAtmVol: 26.0, skewSteepness: 1.12, callWingFactor: 0.40, termSlope: 0.28, type: 'megacap' },
};

// ── Tenor days mapping ──

const TENOR_DAYS: Record<string, number> = {
  '1W': 7,
  '1M': 30,
  '2M': 60,
  '3M': 90,
  '6M': 180,
  '9M': 270,
  '1Y': 365,
};

// ── Helpers ──

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ── Implied vol model ──
// Produces realistic skew: deep OTM puts are expensive, OTM calls are cheaper,
// with the smile steepness decaying for longer tenors (sqrt time scaling).

function computeIv(
  profile: TickerProfile,
  strikePercent: number,
  tenorDays: number,
  rng: () => number,
): number {
  const months = tenorDays / 30;
  // ATM vol rises (contango) or falls (backwardation) with tenor
  const atmVol = profile.baseAtmVol + profile.termSlope * months + (rng() - 0.5) * 0.8;

  // Log moneyness
  const logM = Math.log(strikePercent / 100);

  // Time decay for skew: short-dated = steeper skew
  const timeDecay = Math.sqrt(30 / Math.max(tenorDays, 1));

  // Put wing (negative logM -> higher vol)
  const putWing = logM < 0
    ? profile.skewSteepness * logM * logM * 600 * timeDecay
    : 0;

  // Call wing (positive logM -> moderately higher vol)
  const callWing = logM > 0
    ? profile.callWingFactor * logM * logM * 400 * timeDecay
    : 0;

  // Linear skew component (puts more expensive than calls)
  const linearSkew = -logM * atmVol * 0.12 * profile.skewSteepness * timeDecay;

  // Small noise
  const noise = (rng() - 0.5) * 0.3;

  return round2(Math.max(atmVol + putWing + callWing + linearSkew + noise, atmVol * 0.25));
}

// ── Data generation ──

function generateData(): VolatilitySkewResponse {
  const dateKey = new Date().toISOString().slice(0, 10);
  const seed = hashSeed('volatility-skew-' + dateKey);
  const rng = mulberry32(seed);

  // Jitter spot prices per ticker
  const spots: Record<string, number> = {};
  for (const ticker of TICKERS) {
    const profile = PROFILES[ticker];
    spots[ticker] = round2(profile.baseSpot * (1 + (rng() - 0.5) * 0.02));
  }

  // ── Skew surface ──
  const skewSurface: SkewSurfaceRow[] = [];
  for (const ticker of TICKERS) {
    const profile = PROFILES[ticker];
    const spot = spots[ticker];
    for (const pct of STRIKE_PERCENTS) {
      const strike = round2(spot * pct / 100);
      const ivByTenor: Record<string, number> = {};
      for (const tenor of SURFACE_TENORS) {
        const days = TENOR_DAYS[tenor];
        ivByTenor[tenor] = computeIv(profile, pct, days, rng);
      }
      skewSurface.push({
        ticker,
        spotPrice: spot,
        strike,
        strikePercent: pct,
        ivByTenor,
      });
    }
  }

  // ── Skew metrics ──
  const skewMetrics: SkewMetrics[] = TICKERS.map((ticker) => {
    const profile = PROFILES[ticker];
    const rows = skewSurface.filter((r) => r.ticker === ticker);

    // Use 1M tenor for metrics
    const getIv = (pct: number): number => {
      const row = rows.find((r) => r.strikePercent === pct);
      return row?.ivByTenor['1M'] ?? profile.baseAtmVol;
    };

    const atmVol = getIv(100);
    const iv90 = getIv(90);  // ~25D put
    const iv110 = getIv(110); // ~25D call
    const iv85 = getIv(85);  // ~10D put
    const iv115 = getIv(115); // ~10D call

    const putCallSkew25D = round2(iv90 - iv110);
    const putCallSkew10D = round2(iv85 - iv115);

    // Skew slope: change in IV per 1% moneyness (linear regression proxy)
    const ivAtStrikes = STRIKE_PERCENTS.map((pct) => ({ pct, iv: getIv(pct) }));
    const n = ivAtStrikes.length;
    const meanPct = ivAtStrikes.reduce((s, x) => s + x.pct, 0) / n;
    const meanIv = ivAtStrikes.reduce((s, x) => s + x.iv, 0) / n;
    let num = 0;
    let den = 0;
    for (const pt of ivAtStrikes) {
      num += (pt.pct - meanPct) * (pt.iv - meanIv);
      den += (pt.pct - meanPct) * (pt.pct - meanPct);
    }
    const skewSlope = round2(den > 0 ? num / den : 0);

    // Convexity (butterfly): average of wings minus ATM
    const convexity = round2((iv90 + iv110) / 2 - atmVol);

    return { ticker, putCallSkew25D, putCallSkew10D, atmVol: round2(atmVol), skewSlope, convexity };
  });

  // ── Term structure ──
  const termStructure: TermStructureRow[] = TICKERS.map((ticker) => {
    const profile = PROFILES[ticker];
    const atmVols: Record<string, number> = {};

    for (const tenor of TERM_TENORS) {
      const days = TENOR_DAYS[tenor];
      atmVols[tenor] = computeIv(profile, 100, days, rng);
    }

    // Determine shape
    const shortVol = atmVols['1W'];
    const midVol = atmVols['3M'];
    const longVol = atmVols['1Y'];

    let shape: 'contango' | 'backwardation' | 'humped';
    if (midVol > shortVol && midVol > longVol) {
      shape = 'humped';
    } else if (longVol >= shortVol) {
      shape = 'contango';
    } else {
      shape = 'backwardation';
    }

    return { ticker, atmVols, shape };
  });

  // ── Risk reversal ──
  const riskReversal: RiskReversalRow[] = TICKERS.map((ticker) => {
    const profile = PROFILES[ticker];

    // 25D risk reversal: 25D call IV - 25D put IV (negative for equity = puts richer)
    // Approximate: 110% strike call vs 90% strike put
    const getIvForTenor = (pct: number, tenorDays: number) =>
      computeIv(profile, pct, tenorDays, rng);

    const put25d1M = getIvForTenor(90, 30);
    const call25d1M = getIvForTenor(110, 30);
    const put25d3M = getIvForTenor(90, 90);
    const call25d3M = getIvForTenor(110, 90);

    const put10d1M = getIvForTenor(85, 30);
    const call10d1M = getIvForTenor(115, 30);
    const put10d3M = getIvForTenor(85, 90);
    const call10d3M = getIvForTenor(115, 90);

    return {
      ticker,
      rr25d1M: round2(call25d1M - put25d1M),
      rr25d3M: round2(call25d3M - put25d3M),
      rr10d1M: round2(call10d1M - put10d1M),
      rr10d3M: round2(call10d3M - put10d3M),
    };
  });

  return {
    skewSurface,
    skewMetrics,
    termStructure,
    riskReversal,
    timestamp: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();

    // Serve from cache if fresh
    if (cache && (now - cache.ts) < TTL) {
      return res.json(cache.data);
    }

    // Generate fresh data
    const data = generateData();

    // Update cache
    cache = { data, ts: now };

    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[VolatilitySkew] Error:', message);

    // Stale fallback
    if (cache) {
      return res.json(cache.data);
    }

    res.status(500).json({ error: 'Failed to generate volatility skew data' });
  }
});

export default router;
