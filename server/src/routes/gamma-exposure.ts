import { Router } from 'express';

const router = Router();

// ── Types ──

interface GexStrike {
  strike: number;
  callGamma: number;
  putGamma: number;
  netGamma: number;
  callOI: number;
  putOI: number;
  totalOI: number;
}

interface KeyLevel {
  price: number;
  type: string;
  description: string;
}

interface GexSummary {
  symbol: string;
  spot: number;
  totalNetGamma: number;
  gammaFlip: number;
  maxGammaStrike: number;
  zeroDteGamma: number;
  putWall: number;
  callWall: number;
  gammaRegime: string;
  expectedMoveUp: number;
  expectedMoveDown: number;
  keyLevels: KeyLevel[];
  gammaHistory: number[];
}

interface GammaExposureResponse {
  strikes: GexStrike[];
  summary: GexSummary;
  availableSymbols: string[];
  timestamp: string;
}

// ── Supported symbols ──

const SUPPORTED_SYMBOLS = ['SPY', 'QQQ', 'IWM', 'AAPL', 'TSLA', 'NVDA', 'AMZN', 'MSFT'];

// ── Spot prices (baseline) ──

const BASE_SPOTS: Record<string, number> = {
  SPY: 585, QQQ: 505, IWM: 225, AAPL: 230, TSLA: 265, NVDA: 140, AMZN: 210, MSFT: 435,
};

// ── GEX profiles per symbol ──

interface GexProfile {
  avgGamma: number;      // average gamma magnitude in $M
  strikeSpacing: number;  // strike interval
  strikeRange: number;    // +/- % from spot
  oiScale: number;        // scale factor for open interest
  callBias: number;       // >1 means calls dominate above spot
  putBias: number;        // >1 means puts dominate below spot
  type: 'index' | 'stock';
}

const GEX_PROFILES: Record<string, GexProfile> = {
  SPY:  { avgGamma: 800, strikeSpacing: 1, strikeRange: 0.08, oiScale: 50000, callBias: 1.3, putBias: 1.5, type: 'index' },
  QQQ:  { avgGamma: 500, strikeSpacing: 1, strikeRange: 0.08, oiScale: 35000, callBias: 1.2, putBias: 1.4, type: 'index' },
  IWM:  { avgGamma: 200, strikeSpacing: 1, strikeRange: 0.10, oiScale: 20000, callBias: 1.1, putBias: 1.3, type: 'index' },
  AAPL: { avgGamma: 150, strikeSpacing: 2.5, strikeRange: 0.10, oiScale: 15000, callBias: 1.1, putBias: 1.2, type: 'stock' },
  TSLA: { avgGamma: 300, strikeSpacing: 5, strikeRange: 0.15, oiScale: 25000, callBias: 1.4, putBias: 1.1, type: 'stock' },
  NVDA: { avgGamma: 250, strikeSpacing: 2, strikeRange: 0.12, oiScale: 20000, callBias: 1.3, putBias: 1.2, type: 'stock' },
  AMZN: { avgGamma: 120, strikeSpacing: 2.5, strikeRange: 0.10, oiScale: 12000, callBias: 1.15, putBias: 1.25, type: 'stock' },
  MSFT: { avgGamma: 100, strikeSpacing: 5, strikeRange: 0.10, oiScale: 10000, callBias: 1.1, putBias: 1.2, type: 'stock' },
};

// ── Seeded random ──

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function roundToNearest(v: number, step: number): number {
  return Math.round(v / step) * step;
}

// ── Data generation ──

function generateGexData(symbol: string, cycleSeed: number): GammaExposureResponse {
  const profile = GEX_PROFILES[symbol] ?? GEX_PROFILES['SPY'];
  const rng = seededRandom(cycleSeed + symbol.charCodeAt(0) * 1000 + symbol.charCodeAt(1));

  // Jitter spot price +/- 0.8%
  const spotBase = BASE_SPOTS[symbol] ?? 100;
  const spot = Math.round(spotBase * (1 + (rng() - 0.5) * 0.016) * 100) / 100;

  // Build strike ladder
  const lowStrike = roundToNearest(spot * (1 - profile.strikeRange), profile.strikeSpacing);
  const highStrike = roundToNearest(spot * (1 + profile.strikeRange), profile.strikeSpacing);
  const strikes: GexStrike[] = [];

  // Track walls
  let maxPutOI = 0;
  let putWallStrike = lowStrike;
  let maxCallOI = 0;
  let callWallStrike = highStrike;
  let maxAbsGamma = 0;
  let maxGammaStrike = spot;

  for (let k = lowStrike; k <= highStrike; k += profile.strikeSpacing) {
    const moneyness = (k - spot) / spot; // negative = below spot, positive = above
    const distFromSpot = Math.abs(moneyness);

    // Gamma peaks near ATM, decays away from it (roughly Gaussian)
    const atmProximity = Math.exp(-distFromSpot * distFromSpot / (2 * 0.03 * 0.03));

    // Call gamma: positive for dealers (they are short calls above spot = positive gamma)
    // Higher call gamma above spot (call overwriting)
    const callWeight = moneyness > 0 ? profile.callBias : 0.6;
    const callGammaRaw = profile.avgGamma * atmProximity * callWeight * (0.7 + rng() * 0.6);

    // Put gamma: negative for dealers (they are short puts below spot = negative gamma)
    // Higher put gamma below spot (protective puts)
    const putWeight = moneyness < 0 ? profile.putBias : 0.5;
    const putGammaRaw = -profile.avgGamma * atmProximity * putWeight * (0.7 + rng() * 0.6);

    // Round number strikes get extra OI (and gamma)
    const isRoundNumber = k % (profile.strikeSpacing * 5) === 0 || k % 10 === 0;
    const roundMultiplier = isRoundNumber ? 1.4 + rng() * 0.3 : 1.0;

    const callGamma = Math.round(callGammaRaw * roundMultiplier * 100) / 100;
    const putGamma = Math.round(putGammaRaw * roundMultiplier * 100) / 100;
    const netGamma = Math.round((callGamma + putGamma) * 100) / 100;

    // Open interest: correlated with gamma magnitude, round numbers get more
    const baseCallOI = Math.round(profile.oiScale * atmProximity * callWeight * roundMultiplier * (0.5 + rng()));
    const basePutOI = Math.round(profile.oiScale * atmProximity * putWeight * roundMultiplier * (0.5 + rng()));
    const callOI = Math.max(baseCallOI, 0);
    const putOI = Math.max(basePutOI, 0);

    strikes.push({
      strike: k,
      callGamma,
      putGamma,
      netGamma,
      callOI,
      putOI,
      totalOI: callOI + putOI,
    });

    // Track walls
    if (putOI > maxPutOI) { maxPutOI = putOI; putWallStrike = k; }
    if (callOI > maxCallOI) { maxCallOI = callOI; callWallStrike = k; }
    if (Math.abs(netGamma) > maxAbsGamma) { maxAbsGamma = Math.abs(netGamma); maxGammaStrike = k; }
  }

  // Put wall should be below spot (realistic), call wall above spot
  if (putWallStrike >= spot) {
    // Force put wall to a round number ~3-5% below spot
    putWallStrike = roundToNearest(spot * (1 - 0.03 - rng() * 0.02), profile.strikeSpacing);
    if (putWallStrike < lowStrike) putWallStrike = lowStrike;
  }
  if (callWallStrike <= spot) {
    // Force call wall to a round number ~2-4% above spot
    callWallStrike = roundToNearest(spot * (1 + 0.02 + rng() * 0.02), profile.strikeSpacing);
    if (callWallStrike > highStrike) callWallStrike = highStrike;
  }

  // Total net gamma
  const totalNetGamma = Math.round(strikes.reduce((sum, s) => sum + s.netGamma, 0) * 100) / 100;

  // Gamma flip: find where cumulative net gamma crosses zero (scanning from low to high)
  let cumGamma = 0;
  let gammaFlip = spot;
  for (let i = 0; i < strikes.length; i++) {
    const prevCum = cumGamma;
    cumGamma += strikes[i].netGamma;
    if (prevCum < 0 && cumGamma >= 0) {
      // Interpolate between this strike and previous
      gammaFlip = strikes[i].strike;
      break;
    }
    if (prevCum >= 0 && cumGamma < 0) {
      gammaFlip = strikes[i].strike;
      break;
    }
  }
  // Ensure gamma flip is near spot (realistic)
  gammaFlip = clamp(gammaFlip, spot * 0.97, spot * 1.03);
  gammaFlip = Math.round(gammaFlip * 100) / 100;

  // 0DTE gamma contribution (typically 15-40% of total)
  const zeroDteGamma = Math.round(Math.abs(totalNetGamma) * (0.15 + rng() * 0.25) * 100) / 100;

  // Gamma regime
  let gammaRegime: string;
  if (totalNetGamma > profile.avgGamma * 0.3) gammaRegime = 'POSITIVE';
  else if (totalNetGamma < -profile.avgGamma * 0.3) gammaRegime = 'NEGATIVE';
  else gammaRegime = 'NEUTRAL';

  // Expected move from dealer hedging
  // Positive gamma = dealers dampen moves (smaller expected move)
  // Negative gamma = dealers amplify moves (larger expected move)
  const baseMoveUp = 0.5 + rng() * 0.8; // 0.5-1.3%
  const baseMoveDown = 0.6 + rng() * 1.0; // 0.6-1.6%
  const gammaMultiplier = gammaRegime === 'POSITIVE' ? 0.7 : gammaRegime === 'NEGATIVE' ? 1.4 : 1.0;
  const expectedMoveUp = Math.round(baseMoveUp * gammaMultiplier * 100) / 100;
  const expectedMoveDown = Math.round(baseMoveDown * gammaMultiplier * 100) / 100;

  // Key levels
  const keyLevels: KeyLevel[] = [
    {
      price: gammaFlip,
      type: 'GAMMA_FLIP',
      description: `Net gamma flips sign at ${gammaFlip.toFixed(2)} - key inflection point`,
    },
    {
      price: putWallStrike,
      type: 'PUT_WALL',
      description: `Largest put OI concentration (${(maxPutOI / 1000).toFixed(0)}K contracts) - support level`,
    },
    {
      price: callWallStrike,
      type: 'CALL_WALL',
      description: `Largest call OI concentration (${(maxCallOI / 1000).toFixed(0)}K contracts) - resistance level`,
    },
    {
      price: maxGammaStrike,
      type: 'MAX_GAMMA',
      description: `Highest absolute gamma - dealer hedging pressure peak`,
    },
    {
      price: Math.round(spot * (1 - expectedMoveDown / 100) * 100) / 100,
      type: 'EXPECTED_LOW',
      description: `Expected move low (-${expectedMoveDown.toFixed(2)}%) from dealer positioning`,
    },
    {
      price: Math.round(spot * (1 + expectedMoveUp / 100) * 100) / 100,
      type: 'EXPECTED_HIGH',
      description: `Expected move high (+${expectedMoveUp.toFixed(2)}%) from dealer positioning`,
    },
  ];

  // Gamma history: 20 data points of total net gamma
  const gammaHistory: number[] = [];
  const histRng = seededRandom(cycleSeed + symbol.charCodeAt(0) * 777);
  let histGamma = totalNetGamma;
  for (let i = 0; i < 20; i++) {
    histGamma += (histRng() - 0.48) * profile.avgGamma * 0.3; // slight mean-reversion drift
    histGamma = clamp(histGamma, -profile.avgGamma * 3, profile.avgGamma * 3);
    gammaHistory.push(Math.round(histGamma * 100) / 100);
  }

  return {
    strikes,
    summary: {
      symbol,
      spot,
      totalNetGamma,
      gammaFlip,
      maxGammaStrike,
      zeroDteGamma,
      putWall: putWallStrike,
      callWall: callWallStrike,
      gammaRegime,
      expectedMoveUp,
      expectedMoveDown,
      keyLevels,
      gammaHistory,
    },
    availableSymbols: SUPPORTED_SYMBOLS,
    timestamp: new Date().toISOString(),
  };
}

// ── Cache ──

const cache = new Map<string, { data: GammaExposureResponse; expiresAt: number }>();
const CACHE_TTL = 3 * 60_000; // 3 minutes

// ── Route ──

// GET /api/gamma-exposure?symbol=SPY
router.get('/', (req, res) => {
  try {
    const rawSymbol = typeof req.query.symbol === 'string' ? req.query.symbol.trim().toUpperCase() : 'SPY';
    const symbol = SUPPORTED_SYMBOLS.includes(rawSymbol) ? rawSymbol : 'SPY';
    const now = Date.now();

    // Check cache
    const cached = cache.get(symbol);
    if (cached && now < cached.expiresAt) {
      return res.json(cached.data);
    }

    // Generate deterministic data per 3-minute cycle
    const cycleSeed = Math.floor(now / CACHE_TTL);
    const response = generateGexData(symbol, cycleSeed);

    cache.set(symbol, { data: response, expiresAt: now + CACHE_TTL });

    // Evict expired entries
    if (cache.size > 50) {
      for (const [key, val] of cache) {
        if (now > val.expiresAt) cache.delete(key);
      }
    }

    res.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[GammaExposure] Error:', message);

    const symbol = typeof req.query.symbol === 'string' ? req.query.symbol.trim().toUpperCase() : 'SPY';
    const cached = cache.get(symbol);
    if (cached) return res.json(cached.data);

    res.status(500).json({ error: 'Failed to fetch gamma exposure data' });
  }
});

export default router;
