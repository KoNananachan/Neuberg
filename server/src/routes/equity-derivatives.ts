import { Router } from 'express';
const router = Router();

function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return h >>> 0;
}
function seededRandom(tag: string) {
  const d = new Date().toISOString().slice(0, 10);
  return mulberry32(hashSeed(tag + d));
}

// ── Types ──

interface MarketOverview {
  vixLevel: number;
  vixChange: number;
  totalOptionsVolume: number;
  putCallRatio: number;
  impliedCorrelation: number;
  realizedVol20d: number;
  impliedVol30d: number;
  skewIndex: number;
}

interface OptionsFlowEntry {
  underlying: string;
  direction: 'call' | 'put';
  strike: number;
  expiry: string;
  volume: number;
  openInterest: number;
  premium: number;
  impliedVol: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  flowType: 'sweep' | 'block' | 'spread' | 'unusual';
}

interface VolSurfaceCell {
  tenor: number;
  strike: number;
  iv: number;
}

interface VolatilitySurface {
  tenors: number[];
  strikes: number[];
  surface: VolSurfaceCell[];
}

interface IndexPutCallEntry {
  index: string;
  putCallRatioVolume: number;
  putCallRatioPremium: number;
  totalCallVolume: number;
  totalPutVolume: number;
  totalCallOI: number;
  totalPutOI: number;
}

interface SectorVolEntry {
  sector: string;
  impliedVol30d: number;
  realizedVol20d: number;
  ivRvSpread: number;
  skew25d: number;
  mostActiveOption: string;
}

interface VolTermStructurePoint {
  tenor: string;
  spxIv: number;
  vixFutures: number;
}

interface EquityDerivativesResponse {
  timestamp: string;
  marketOverview: MarketOverview;
  optionsFlow: OptionsFlowEntry[];
  volatilitySurface: VolatilitySurface;
  indexPutCallRatios: IndexPutCallEntry[];
  sectorVolatility: SectorVolEntry[];
  volTermStructure: VolTermStructurePoint[];
}

// ── Cache ──

let cache: { data: EquityDerivativesResponse | null; ts: number } = { data: null, ts: 0 };
const CACHE_TTL = 12 * 60 * 60_000;

// ── Constants ──

const FLOW_UNDERLYINGS = ['SPY', 'QQQ', 'AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMZN', 'META', 'JPM', 'GS', 'AMD', 'GOOGL', 'NFLX', 'BA', 'XOM'];

const BASE_SPOTS: Record<string, number> = {
  SPY: 585, QQQ: 505, AAPL: 230, TSLA: 265, NVDA: 140, MSFT: 435,
  AMZN: 210, META: 610, JPM: 245, GS: 580, AMD: 165, GOOGL: 175,
  NFLX: 920, BA: 185, XOM: 110,
};

const GICS_SECTORS = [
  'Energy', 'Materials', 'Industrials', 'Consumer Discretionary',
  'Consumer Staples', 'Health Care', 'Financials',
  'Information Technology', 'Communication Services',
  'Utilities', 'Real Estate',
];

const SECTOR_TICKERS: Record<string, string> = {
  'Energy': 'XLE', 'Materials': 'XLB', 'Industrials': 'XLI',
  'Consumer Discretionary': 'XLY', 'Consumer Staples': 'XLP',
  'Health Care': 'XLV', 'Financials': 'XLF',
  'Information Technology': 'XLK', 'Communication Services': 'XLC',
  'Utilities': 'XLU', 'Real Estate': 'XLRE',
};

const SECTOR_BASE_IV: Record<string, number> = {
  'Energy': 28, 'Materials': 22, 'Industrials': 20,
  'Consumer Discretionary': 26, 'Consumer Staples': 14,
  'Health Care': 20, 'Financials': 22,
  'Information Technology': 28, 'Communication Services': 25,
  'Utilities': 15, 'Real Estate': 22,
};

// ── Helpers ──

function r2(v: number): number {
  return Math.round(v * 100) / 100;
}

function r1(v: number): number {
  return Math.round(v * 10) / 10;
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function jitter(base: number, pct: number, rng: () => number): number {
  return base * (1 + (rng() - 0.5) * 2 * pct);
}

function futureExpiry(daysOut: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOut);
  // Snap to nearest Friday
  const dow = d.getDay();
  const diff = (5 - dow + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

// ── Generator ──

function generate(): EquityDerivativesResponse {
  const rng = seededRandom('equity-derivatives');

  // 1. Market Overview
  const vixLevel = r2(12 + rng() * 13); // 12-25
  const vixChange = r2((rng() - 0.5) * 4); // -2 to +2
  const totalOptionsVolume = r1(30 + rng() * 40); // 30-70 million
  const putCallRatio = r2(0.7 + rng() * 0.6); // 0.7-1.3
  const impliedCorrelation = r1(30 + rng() * 40); // 30-70%
  const realizedVol20d = r2(10 + rng() * 15); // 10-25%
  const impliedVol30d = r2(realizedVol20d + 1 + rng() * 4); // typically above realized
  const skewIndex = r2(1.05 + rng() * 0.2); // 1.05-1.25

  const marketOverview: MarketOverview = {
    vixLevel,
    vixChange,
    totalOptionsVolume,
    putCallRatio,
    impliedCorrelation,
    realizedVol20d,
    impliedVol30d,
    skewIndex,
  };

  // 2. Options Flow Summary (10-15 entries)
  const flowCount = 10 + Math.floor(rng() * 6);
  const optionsFlow: OptionsFlowEntry[] = [];
  const directions: Array<'call' | 'put'> = ['call', 'put'];
  const sentiments: Array<'bullish' | 'bearish' | 'neutral'> = ['bullish', 'bearish', 'neutral'];
  const flowTypes: Array<'sweep' | 'block' | 'spread' | 'unusual'> = ['sweep', 'block', 'spread', 'unusual'];

  for (let i = 0; i < flowCount; i++) {
    const underlying = pick(FLOW_UNDERLYINGS, rng);
    const spot = BASE_SPOTS[underlying] ?? 200;
    const direction = pick(directions, rng);
    const isCall = direction === 'call';
    // Strikes: slightly OTM is most common
    const moneyness = isCall
      ? 1 + rng() * 0.1 // calls: 100%-110% of spot
      : 1 - rng() * 0.1; // puts: 90%-100% of spot
    const strike = Math.round(spot * moneyness);
    const daysToExpiry = pick([7, 14, 30, 45, 60, 90, 180], rng);
    const expiry = futureExpiry(daysToExpiry);
    const volume = Math.round(1000 + rng() * 29000);
    const openInterest = Math.round(volume * (2 + rng() * 8));
    const premium = r2(0.5 + rng() * 15); // 0.5-15.5 million
    const baseIv = vixLevel + (rng() - 0.3) * 20;
    const impliedVol = r2(Math.max(10, baseIv));

    // Sentiment: calls with high volume tend bullish, puts bearish
    let sentiment: 'bullish' | 'bearish' | 'neutral';
    const sentRoll = rng();
    if (isCall) {
      sentiment = sentRoll < 0.6 ? 'bullish' : sentRoll < 0.85 ? 'neutral' : 'bearish';
    } else {
      sentiment = sentRoll < 0.55 ? 'bearish' : sentRoll < 0.8 ? 'neutral' : 'bullish';
    }

    const flowType = pick(flowTypes, rng);

    optionsFlow.push({
      underlying,
      direction,
      strike,
      expiry,
      volume,
      openInterest,
      premium,
      impliedVol,
      sentiment,
      flowType,
    });
  }

  // Sort by premium descending (most notable first)
  optionsFlow.sort((a, b) => b.premium - a.premium);

  // 3. Volatility Surface (SPX)
  const tenors = [7, 14, 30, 60, 90, 180, 365];
  const strikes = [80, 90, 95, 100, 105, 110, 120]; // % of spot

  const surface: VolSurfaceCell[] = [];
  for (const tenor of tenors) {
    for (const strikeMoneyness of strikes) {
      // Base ATM vol increases with tenor (term structure)
      const baseAtm = vixLevel * (0.9 + 0.1 * Math.sqrt(tenor / 30));
      // Skew: lower strikes have higher IV (put skew)
      const moneynessOffset = (100 - strikeMoneyness) / 100;
      const skewContribution = moneynessOffset * 0.5 * vixLevel; // ~50% of VIX per unit moneyness
      // Short-dated skew is steeper
      const tenorSkewMultiplier = 1.0 / Math.sqrt(tenor / 30);
      const skewAdjustment = skewContribution * tenorSkewMultiplier;
      // Small jitter
      const noise = (rng() - 0.5) * 0.8;
      const iv = r2(Math.max(5, baseAtm + skewAdjustment + noise));
      surface.push({ tenor, strike: strikeMoneyness, iv });
    }
  }

  const volatilitySurface: VolatilitySurface = { tenors, strikes, surface };

  // 4. Index Put/Call Ratios
  const indexNames = ['SPX', 'NDX', 'RUT', 'DJX', 'VIX'];
  const indexPutCallRatios: IndexPutCallEntry[] = indexNames.map(index => {
    const callVol = Math.round(200000 + rng() * 800000);
    const putVol = Math.round(callVol * (0.8 + rng() * 0.8));
    const callOI = Math.round(callVol * (3 + rng() * 7));
    const putOI = Math.round(putVol * (3 + rng() * 7));
    const pcRatioVol = r2(putVol / callVol);
    const premiumBias = 1 + (rng() - 0.5) * 0.6; // puts tend to have higher premium
    const pcRatioPremium = r2(pcRatioVol * premiumBias);

    return {
      index,
      putCallRatioVolume: pcRatioVol,
      putCallRatioPremium: pcRatioPremium,
      totalCallVolume: callVol,
      totalPutVolume: putVol,
      totalCallOI: callOI,
      totalPutOI: putOI,
    };
  });

  // 5. Sector Volatility (11 GICS sectors)
  const sectorVolatility: SectorVolEntry[] = GICS_SECTORS.map(sector => {
    const baseIv = SECTOR_BASE_IV[sector] ?? 20;
    const iv30d = r2(jitter(baseIv, 0.15, rng));
    const rv20d = r2(iv30d * (0.7 + rng() * 0.4)); // realized typically lower
    const spread = r2(iv30d - rv20d);
    const skew = r2(1.05 + rng() * 0.2); // 1.05-1.25
    const ticker = SECTOR_TICKERS[sector] ?? 'XLK';
    const strikeOffset = Math.round((0.95 + rng() * 0.1) * 100);
    const optionType = rng() > 0.5 ? 'C' : 'P';
    const mostActiveOption = `${ticker} ${strikeOffset} ${optionType}`;

    return {
      sector,
      impliedVol30d: iv30d,
      realizedVol20d: rv20d,
      ivRvSpread: spread,
      skew25d: skew,
      mostActiveOption,
    };
  });

  // 6. Volatility Term Structure
  const tenorLabels = ['1w', '2w', '1m', '2m', '3m', '6m', '1y'];
  const tenorDays = [7, 14, 30, 60, 90, 180, 365];
  const volTermStructure: VolTermStructurePoint[] = tenorLabels.map((tenor, i) => {
    // Normal upward-sloping term structure
    const days = tenorDays[i];
    const baseSpxIv = vixLevel * (0.85 + 0.15 * Math.sqrt(days / 30));
    const spxIv = r2(baseSpxIv + (rng() - 0.5) * 1.5);
    // VIX futures: front month close to VIX spot, back months converge to long-term mean (~18-20)
    const longTermMean = 18 + rng() * 3;
    const convergence = Math.min(1, days / 365);
    const vixFut = r2(vixLevel + (longTermMean - vixLevel) * convergence + (rng() - 0.5) * 0.8);

    return { tenor, spxIv, vixFutures: vixFut };
  });

  return {
    timestamp: new Date().toISOString(),
    marketOverview,
    optionsFlow,
    volatilitySurface,
    indexPutCallRatios,
    sectorVolatility,
    volTermStructure,
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now - cache.ts < CACHE_TTL) {
      return res.json(cache.data);
    }
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err: any) {
    console.error('[EquityDerivatives] Error:', err?.message || err);
    if (cache.data) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate equity derivatives data' });
  }
});

export default router;
