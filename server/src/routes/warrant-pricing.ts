import { Router } from 'express';

const router = Router();

function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function mulberry32(a: number): () => number {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const UNDERLYINGS = [
  { symbol: 'SPX', name: 'S&P 500 Index', basePrice: 5420, isIndex: true },
  { symbol: 'NDX', name: 'Nasdaq 100 Index', basePrice: 18950, isIndex: true },
  { symbol: 'HSI', name: 'Hang Seng Index', basePrice: 17680, isIndex: true },
  { symbol: 'NKY', name: 'Nikkei 225 Index', basePrice: 38200, isIndex: true },
  { symbol: 'DAX', name: 'DAX Index', basePrice: 18350, isIndex: true },
  { symbol: 'AAPL', name: 'Apple Inc', basePrice: 198, isIndex: false },
  { symbol: 'TSLA', name: 'Tesla Inc', basePrice: 248, isIndex: false },
  { symbol: 'NVDA', name: 'NVIDIA Corp', basePrice: 875, isIndex: false },
  { symbol: 'AMZN', name: 'Amazon.com Inc', basePrice: 186, isIndex: false },
  { symbol: 'MSFT', name: 'Microsoft Corp', basePrice: 425, isIndex: false },
];

const ISSUERS = ['Goldman Sachs', 'JP Morgan', 'UBS', 'Societe Generale', 'BNP Paribas'];

const WARRANT_DEFS: {
  underlyingIdx: number;
  issuerIdx: number;
  type: 'call' | 'put' | 'turbo-call' | 'turbo-put' | 'inline';
  strikePct: number;
  daysToExpiry: number;
  exercise: 'European' | 'American';
}[] = [
  // SPX warrants
  { underlyingIdx: 0, issuerIdx: 0, type: 'call', strikePct: 0.95, daysToExpiry: 180, exercise: 'European' },
  { underlyingIdx: 0, issuerIdx: 1, type: 'put', strikePct: 1.05, daysToExpiry: 120, exercise: 'European' },
  { underlyingIdx: 0, issuerIdx: 2, type: 'turbo-call', strikePct: 0.88, daysToExpiry: 90, exercise: 'American' },
  // NDX warrants
  { underlyingIdx: 1, issuerIdx: 3, type: 'call', strikePct: 0.97, daysToExpiry: 240, exercise: 'European' },
  { underlyingIdx: 1, issuerIdx: 4, type: 'put', strikePct: 1.03, daysToExpiry: 150, exercise: 'European' },
  { underlyingIdx: 1, issuerIdx: 0, type: 'inline', strikePct: 1.00, daysToExpiry: 60, exercise: 'European' },
  // HSI warrants
  { underlyingIdx: 2, issuerIdx: 1, type: 'call', strikePct: 0.92, daysToExpiry: 90, exercise: 'European' },
  { underlyingIdx: 2, issuerIdx: 2, type: 'put', strikePct: 1.08, daysToExpiry: 180, exercise: 'European' },
  { underlyingIdx: 2, issuerIdx: 3, type: 'turbo-put', strikePct: 1.12, daysToExpiry: 60, exercise: 'American' },
  // NKY warrants
  { underlyingIdx: 3, issuerIdx: 4, type: 'call', strikePct: 0.96, daysToExpiry: 120, exercise: 'European' },
  { underlyingIdx: 3, issuerIdx: 0, type: 'put', strikePct: 1.04, daysToExpiry: 200, exercise: 'European' },
  { underlyingIdx: 3, issuerIdx: 1, type: 'turbo-call', strikePct: 0.85, daysToExpiry: 45, exercise: 'American' },
  // DAX warrants
  { underlyingIdx: 4, issuerIdx: 2, type: 'call', strikePct: 0.98, daysToExpiry: 160, exercise: 'European' },
  { underlyingIdx: 4, issuerIdx: 3, type: 'put', strikePct: 1.02, daysToExpiry: 90, exercise: 'European' },
  { underlyingIdx: 4, issuerIdx: 4, type: 'inline', strikePct: 1.00, daysToExpiry: 75, exercise: 'European' },
  // AAPL warrants
  { underlyingIdx: 5, issuerIdx: 0, type: 'call', strikePct: 0.93, daysToExpiry: 270, exercise: 'American' },
  { underlyingIdx: 5, issuerIdx: 1, type: 'put', strikePct: 1.07, daysToExpiry: 180, exercise: 'American' },
  { underlyingIdx: 5, issuerIdx: 2, type: 'turbo-call', strikePct: 0.82, daysToExpiry: 60, exercise: 'American' },
  // TSLA warrants
  { underlyingIdx: 6, issuerIdx: 3, type: 'call', strikePct: 0.90, daysToExpiry: 365, exercise: 'American' },
  { underlyingIdx: 6, issuerIdx: 4, type: 'put', strikePct: 1.10, daysToExpiry: 120, exercise: 'American' },
  { underlyingIdx: 6, issuerIdx: 0, type: 'turbo-put', strikePct: 1.15, daysToExpiry: 45, exercise: 'American' },
  // NVDA warrants
  { underlyingIdx: 7, issuerIdx: 1, type: 'call', strikePct: 0.94, daysToExpiry: 300, exercise: 'American' },
  { underlyingIdx: 7, issuerIdx: 2, type: 'put', strikePct: 1.06, daysToExpiry: 150, exercise: 'American' },
  { underlyingIdx: 7, issuerIdx: 3, type: 'inline', strikePct: 1.00, daysToExpiry: 90, exercise: 'European' },
  // AMZN warrants
  { underlyingIdx: 8, issuerIdx: 4, type: 'call', strikePct: 0.96, daysToExpiry: 210, exercise: 'American' },
  { underlyingIdx: 8, issuerIdx: 0, type: 'put', strikePct: 1.04, daysToExpiry: 90, exercise: 'American' },
  { underlyingIdx: 8, issuerIdx: 1, type: 'turbo-call', strikePct: 0.80, daysToExpiry: 30, exercise: 'American' },
  // MSFT warrants
  { underlyingIdx: 9, issuerIdx: 2, type: 'call', strikePct: 0.97, daysToExpiry: 180, exercise: 'American' },
  { underlyingIdx: 9, issuerIdx: 3, type: 'put', strikePct: 1.03, daysToExpiry: 240, exercise: 'American' },
  { underlyingIdx: 9, issuerIdx: 4, type: 'turbo-put', strikePct: 1.18, daysToExpiry: 60, exercise: 'American' },
];

function generateIsin(rng: () => number, idx: number): string {
  const countries = ['DE', 'CH', 'FR', 'LU', 'GB'];
  const country = countries[idx % countries.length];
  const digits = Array.from({ length: 9 }, () => Math.floor(rng() * 10)).join('');
  const checkDigit = Math.floor(rng() * 10);
  return `${country}${digits}${checkDigit}`;
}

const CACHE_TTL = 60 * 60 * 1000;
let cacheData: unknown = null;
let cacheTime = 0;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const seed = hashSeed('warrant-pricing-' + day);
  const rng = mulberry32(seed);

  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const round2 = (v: number) => Math.round(v * 100) / 100;
  const round4 = (v: number) => Math.round(v * 10000) / 10000;
  const round1 = (v: number) => Math.round(v * 10) / 10;

  // Normal approximation for Black-Scholes delta
  function normCdf(x: number): number {
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
    const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const sign = x < 0 ? -1 : 1;
    const absX = Math.abs(x);
    const t = 1 / (1 + p * absX);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX / 2);
    return 0.5 * (1 + sign * y);
  }

  function normPdf(x: number): number {
    return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  }

  const today = new Date();

  const warrants = WARRANT_DEFS.map((def, idx) => {
    const underlying = UNDERLYINGS[def.underlyingIdx];
    const issuer = ISSUERS[def.issuerIdx];
    const isin = generateIsin(rng, idx);

    // Underlying spot price with daily jitter
    const spotPrice = round2(jitter(underlying.basePrice, 0.03));

    // Strike price
    const strike = round2(underlying.basePrice * def.strikePct);

    // Time to expiry
    const dte = def.daysToExpiry + Math.floor((rng() - 0.5) * 10);
    const T = dte / 365;

    // Expiry date
    const expiryDate = new Date(today);
    expiryDate.setDate(expiryDate.getDate() + dte);
    const expiry = expiryDate.toISOString().slice(0, 10);

    // Determine warrant category label
    const isCall = def.type === 'call' || def.type === 'turbo-call';
    const isPut = def.type === 'put' || def.type === 'turbo-put';
    const isInline = def.type === 'inline';
    const isTurbo = def.type === 'turbo-call' || def.type === 'turbo-put';

    // Volatility: higher for single stocks, lower for indices, varies by time
    const baseVol = underlying.isIndex ? 15 + rng() * 10 : 25 + rng() * 25;
    const volSkew = isCall ? -2 + rng() * 4 : 2 + rng() * 6;
    const impliedVolatility = round1(baseVol + volSkew);
    const historicalVolatility = round1(impliedVolatility * (0.8 + rng() * 0.3));
    const sigma = impliedVolatility / 100;

    // Risk-free rate
    const r = 0.045;

    // Black-Scholes d1, d2
    const d1 = (Math.log(spotPrice / strike) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
    const d2 = d1 - sigma * Math.sqrt(T);

    // Moneyness
    let moneyness: 'ITM' | 'ATM' | 'OTM';
    const mRatio = spotPrice / strike;
    if (isInline) {
      moneyness = Math.abs(mRatio - 1) < 0.02 ? 'ATM' : mRatio > 1 ? 'ITM' : 'OTM';
    } else if (isCall) {
      moneyness = mRatio > 1.02 ? 'ITM' : mRatio < 0.98 ? 'OTM' : 'ATM';
    } else {
      moneyness = mRatio < 0.98 ? 'ITM' : mRatio > 1.02 ? 'OTM' : 'ATM';
    }

    // Greeks from Black-Scholes
    let delta: number;
    if (isTurbo) {
      // Turbo warrants have delta close to 1 (or -1 for puts)
      delta = isCall
        ? round4(0.85 + rng() * 0.14)
        : round4(-(0.85 + rng() * 0.14));
    } else if (isInline) {
      // Inline warrants have near-zero delta when ATM
      delta = round4((rng() - 0.5) * 0.3);
    } else {
      delta = isCall
        ? round4(normCdf(d1))
        : round4(normCdf(d1) - 1);
    }

    const gamma = round4(normPdf(d1) / (spotPrice * sigma * Math.sqrt(T)));
    const theta = round2(-(spotPrice * normPdf(d1) * sigma / (2 * Math.sqrt(T)) + (isCall ? -1 : 1) * r * strike * Math.exp(-r * T) * normCdf((isCall ? 1 : -1) * d2)) / 365);
    const vega = round2(spotPrice * normPdf(d1) * Math.sqrt(T) / 100);
    const rho = round4((isCall ? 1 : -1) * strike * T * Math.exp(-r * T) * normCdf((isCall ? 1 : -1) * d2) / 100);

    // Intrinsic and time value
    let intrinsicValue: number;
    if (isInline) {
      // Inline warrants pay out if spot stays within a range
      intrinsicValue = round2(Math.max(0, 1 - Math.abs(spotPrice - strike) / strike * 10));
    } else if (isCall) {
      intrinsicValue = round2(Math.max(0, spotPrice - strike));
    } else {
      intrinsicValue = round2(Math.max(0, strike - spotPrice));
    }

    // Warrant price (simplified Black-Scholes)
    let theoreticalPrice: number;
    if (isTurbo) {
      // Turbo warrants priced close to intrinsic + small premium
      const turboPremium = round2(spotPrice * 0.002 * Math.sqrt(T) + rng() * spotPrice * 0.005);
      theoreticalPrice = round2(Math.max(0.01, intrinsicValue + turboPremium));
    } else if (isInline) {
      // Inline warrant price based on probability of staying in range
      theoreticalPrice = round2(0.3 + rng() * 0.6);
    } else {
      // Standard Black-Scholes call/put price
      if (isCall) {
        theoreticalPrice = round2(Math.max(0.01, spotPrice * normCdf(d1) - strike * Math.exp(-r * T) * normCdf(d2)));
      } else {
        theoreticalPrice = round2(Math.max(0.01, strike * Math.exp(-r * T) * normCdf(-d2) - spotPrice * normCdf(-d1)));
      }
    }

    const lastPrice = round2(theoreticalPrice * (1 + (rng() - 0.5) * 0.04));
    const timeValue = round2(Math.max(0, lastPrice - intrinsicValue));

    // Bid/ask spread: tighter for liquid products
    const spreadPct = isTurbo ? 0.005 + rng() * 0.01 : 0.01 + rng() * 0.03;
    const bid = round2(Math.max(0.01, lastPrice * (1 - spreadPct)));
    const ask = round2(lastPrice * (1 + spreadPct));

    // Daily change
    const dailyChange = round2((rng() - 0.48) * lastPrice * 0.08);
    const dailyChangePct = round2(dailyChange / (lastPrice - dailyChange) * 100);

    // Volume: higher for ATM/ITM, lower for deep OTM
    const volumeMultiplier = moneyness === 'ATM' ? 3 : moneyness === 'ITM' ? 2 : 1;
    const volume = Math.round((10000 + rng() * 500000) * volumeMultiplier);

    // Effective gearing
    const effectiveGearing = round2(Math.abs(delta) * (spotPrice / lastPrice));

    // Premium %
    let premiumPct: number;
    if (isCall) {
      premiumPct = round2(((lastPrice + strike - spotPrice) / spotPrice) * 100);
    } else if (isPut) {
      premiumPct = round2(((lastPrice - strike + spotPrice) / spotPrice) * 100);
    } else {
      premiumPct = round2(((lastPrice / 1) - 1) * 100);
    }

    // Break-even price
    let breakEvenPrice: number;
    if (isCall) {
      breakEvenPrice = round2(strike + lastPrice);
    } else if (isPut) {
      breakEvenPrice = round2(strike - lastPrice);
    } else {
      breakEvenPrice = round2(spotPrice);
    }

    return {
      isin,
      issuer,
      underlying: underlying.symbol,
      underlyingName: underlying.name,
      spotPrice,
      strike,
      expiry,
      type: def.type,
      exerciseStyle: def.exercise,
      lastPrice,
      bid,
      ask,
      dailyChange,
      dailyChangePct,
      volume,
      greeks: { delta, gamma, theta, vega, rho },
      impliedVolatility,
      historicalVolatility,
      effectiveGearing,
      premiumPct,
      breakEvenPrice,
      intrinsicValue,
      timeValue,
      moneyness,
      daysToExpiry: dte,
    };
  });

  // --- Summary ---
  const sortedByVolume = [...warrants].sort((a, b) => b.volume - a.volume);
  const mostActive = sortedByVolume.slice(0, 5).map(w => ({
    isin: w.isin,
    underlying: w.underlying,
    type: w.type,
    strike: w.strike,
    volume: w.volume,
    lastPrice: w.lastPrice,
  }));

  const sortedByIV = [...warrants].sort((a, b) => b.impliedVolatility - a.impliedVolatility);
  const highestIV = sortedByIV.slice(0, 5).map(w => ({
    isin: w.isin,
    underlying: w.underlying,
    type: w.type,
    impliedVolatility: w.impliedVolatility,
    historicalVolatility: w.historicalVolatility,
    ivHvSpread: round1(w.impliedVolatility - w.historicalVolatility),
  }));

  const sortedByChange = [...warrants].sort((a, b) => Math.abs(b.dailyChangePct) - Math.abs(a.dailyChangePct));
  const biggestMovers = sortedByChange.slice(0, 5).map(w => ({
    isin: w.isin,
    underlying: w.underlying,
    type: w.type,
    lastPrice: w.lastPrice,
    dailyChange: w.dailyChange,
    dailyChangePct: w.dailyChangePct,
  }));

  const summary = { mostActive, highestIV, biggestMovers };

  // --- Issuer Comparison Table ---
  const issuerComparison = ISSUERS.map(issuerName => {
    const issuerWarrants = warrants.filter(w => w.issuer === issuerName);
    const count = issuerWarrants.length;
    const totalVolume = issuerWarrants.reduce((acc, w) => acc + w.volume, 0);
    const avgSpread = count > 0
      ? round2(issuerWarrants.reduce((acc, w) => acc + (w.ask - w.bid) / w.lastPrice * 100, 0) / count)
      : 0;
    const avgIV = count > 0
      ? round1(issuerWarrants.reduce((acc, w) => acc + w.impliedVolatility, 0) / count)
      : 0;
    const underlyingsCovered = [...new Set(issuerWarrants.map(w => w.underlying))];
    const typesOffered = [...new Set(issuerWarrants.map(w => w.type))];

    return {
      issuer: issuerName,
      warrantsCount: count,
      totalVolume,
      avgSpreadPct: avgSpread,
      avgImpliedVolatility: avgIV,
      underlyingsCovered,
      typesOffered,
    };
  });

  return {
    warrants,
    summary,
    issuerComparison,
    timestamp: new Date().toISOString(),
  };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cacheData && now - cacheTime < CACHE_TTL) return res.json(cacheData);
    const data = generate();
    cacheData = data;
    cacheTime = now;
    res.json(data);
  } catch (err) {
    console.error('[WarrantPricing] Error:', (err as Error).message);
    if (cacheData) return res.json(cacheData);
    res.status(500).json({ error: 'Failed to generate warrant pricing data' });
  }
});

export default router;
