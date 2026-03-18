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

interface OptionEntry {
  asset: 'BTC' | 'ETH';
  expiry: string;
  strike: number;
  type: 'Call' | 'Put';
  iv: number;
  price: number;
  delta: number;
  gamma: number;
  volume: number;
  openInterest: number;
}

interface PerpFunding {
  pair: string;
  exchange: string;
  fundingRate: number;
  annualized: number;
  openInterest: number;
  volume24h: number;
  basis: number;
  nextFunding: string;
}

interface BasisTrade {
  asset: 'BTC' | 'ETH';
  venue: string;
  spotPrice: number;
  futuresPrice: number;
  basis: number;
  annualizedBasis: number;
  daysToExpiry: number;
  direction: 'Contango' | 'Backwardation';
}

interface TermStructureEntry {
  asset: 'BTC' | 'ETH';
  tenor: string;
  iv: number;
  rv: number;
  ivRvSpread: number;
  skew25d: number;
  putCallRatio: number;
}

interface MarketSummary {
  btcPrice: number;
  ethPrice: number;
  totalOptionsOI: number;
  totalPerpOI: number;
  avgFundingRate: number;
  maxPainBTC: number;
  maxPainETH: number;
  dvol: number;
}

// ── Static Data ──

const OPTION_TEMPLATES: { asset: 'BTC' | 'ETH'; expiry: string; strikeBase: number; type: 'Call' | 'Put' }[] = [
  { asset: 'BTC', expiry: 'Mar 29', strikeBase: 65000, type: 'Call' },
  { asset: 'BTC', expiry: 'Apr 26', strikeBase: 70000, type: 'Put' },
  { asset: 'BTC', expiry: 'Jun 28', strikeBase: 75000, type: 'Call' },
  { asset: 'BTC', expiry: 'Sep 27', strikeBase: 80000, type: 'Put' },
  { asset: 'BTC', expiry: 'Dec 27', strikeBase: 72000, type: 'Call' },
  { asset: 'ETH', expiry: 'Mar 29', strikeBase: 3200, type: 'Call' },
  { asset: 'ETH', expiry: 'Apr 26', strikeBase: 3500, type: 'Put' },
  { asset: 'ETH', expiry: 'Jun 28', strikeBase: 4000, type: 'Call' },
  { asset: 'ETH', expiry: 'Sep 27', strikeBase: 4500, type: 'Put' },
  { asset: 'ETH', expiry: 'Dec 27', strikeBase: 3800, type: 'Call' },
];

const PERP_PAIRS: { pair: string; exchange: string; baseOI: number; baseVol: number }[] = [
  { pair: 'BTC-PERP', exchange: 'Binance', baseOI: 8500, baseVol: 22000 },
  { pair: 'ETH-PERP', exchange: 'Bybit', baseOI: 4200, baseVol: 12000 },
  { pair: 'SOL-PERP', exchange: 'OKX', baseOI: 1200, baseVol: 4500 },
  { pair: 'DOGE-PERP', exchange: 'Binance', baseOI: 380, baseVol: 1800 },
  { pair: 'AVAX-PERP', exchange: 'dYdX', baseOI: 280, baseVol: 950 },
  { pair: 'LINK-PERP', exchange: 'Bybit', baseOI: 320, baseVol: 1100 },
  { pair: 'MATIC-PERP', exchange: 'OKX', baseOI: 190, baseVol: 720 },
  { pair: 'ARB-PERP', exchange: 'dYdX', baseOI: 150, baseVol: 580 },
];

const BASIS_TEMPLATES: { asset: 'BTC' | 'ETH'; venue: string; baseDays: number }[] = [
  { asset: 'BTC', venue: 'CME', baseDays: 45 },
  { asset: 'BTC', venue: 'Binance', baseDays: 30 },
  { asset: 'BTC', venue: 'Deribit', baseDays: 60 },
  { asset: 'ETH', venue: 'CME', baseDays: 45 },
  { asset: 'ETH', venue: 'Binance', baseDays: 30 },
  { asset: 'ETH', venue: 'Deribit', baseDays: 60 },
];

const TENORS = ['7d', '14d', '30d', '60d', '90d', '180d'];

const FUNDING_HOURS = ['00:00', '08:00', '16:00'];

// ── Cache ──

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

// ── Generator ──

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('crypto-derivatives-' + day));
  const jitter = (base: number, pct: number) => Math.max(0, base * (1 + (rng() - 0.5) * 2 * pct));
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const round4 = (n: number) => Math.round(n * 10000) / 10000;

  // BTC/ETH spot prices for reference
  const btcSpot = round2(jitter(68500, 0.04));
  const ethSpot = round2(jitter(3650, 0.05));

  // ── 1. Options Data (10 items) ──
  const optionsData: OptionEntry[] = OPTION_TEMPLATES.map(t => {
    const isCall = t.type === 'Call';
    const isBTC = t.asset === 'BTC';
    const strikeJitter = isBTC ? Math.round(jitter(t.strikeBase, 0.03) / 500) * 500 : Math.round(jitter(t.strikeBase, 0.04) / 50) * 50;
    const baseIV = isBTC ? jitter(55, 0.15) : jitter(65, 0.15);
    const iv = round2(baseIV);
    const basePrice = isBTC ? jitter(2800, 0.4) : jitter(180, 0.4);
    const price = round2(basePrice);
    const delta = round4(isCall ? jitter(0.45, 0.35) : -jitter(0.45, 0.35));
    const gamma = round4(isBTC ? jitter(0.00002, 0.3) : jitter(0.0003, 0.3));
    const volume = Math.round(jitter(isBTC ? 1200 : 3500, 0.5));
    const openInterest = Math.round(jitter(isBTC ? 8500 : 22000, 0.4));

    return {
      asset: t.asset,
      expiry: t.expiry,
      strike: strikeJitter,
      type: t.type,
      iv,
      price,
      delta,
      gamma,
      volume,
      openInterest,
    };
  });

  // ── 2. Perpetual Funding (8 items) ──
  const perpetualFunding: PerpFunding[] = PERP_PAIRS.map(p => {
    // Funding rate between -0.01% and +0.05% per 8h
    const fundingRate = round4(-0.01 + rng() * 0.06);
    const annualized = round2(fundingRate * 3 * 365);
    const openInterest = round2(jitter(p.baseOI, 0.15));
    const volume24h = round2(jitter(p.baseVol, 0.2));
    const basis = round4(jitter(0.15, 0.8) * (rng() > 0.2 ? 1 : -1));
    const nextFundingHour = FUNDING_HOURS[Math.floor(rng() * FUNDING_HOURS.length)];

    return {
      pair: p.pair,
      exchange: p.exchange,
      fundingRate,
      annualized,
      openInterest,
      volume24h,
      basis,
      nextFunding: nextFundingHour + ' UTC',
    };
  });

  // ── 3. Basis Trades (6 items) ──
  const basisTrades: BasisTrade[] = BASIS_TEMPLATES.map(b => {
    const isBTC = b.asset === 'BTC';
    const spotPrice = round2(isBTC ? btcSpot : ethSpot);
    const basisPct = round4(jitter(0.8, 0.6) * (rng() > 0.15 ? 1 : -1));
    const futuresPrice = round2(spotPrice * (1 + basisPct / 100));
    const daysToExpiry = Math.round(jitter(b.baseDays, 0.2));
    const annualizedBasis = round2((basisPct / Math.max(1, daysToExpiry)) * 365);
    const direction: 'Contango' | 'Backwardation' = futuresPrice >= spotPrice ? 'Contango' : 'Backwardation';

    return {
      asset: b.asset,
      venue: b.venue,
      spotPrice,
      futuresPrice,
      basis: basisPct,
      annualizedBasis,
      daysToExpiry,
      direction,
    };
  });

  // ── 4. Term Structure (12 items: 6 per asset) ──
  const termStructure: TermStructureEntry[] = [];
  for (const asset of ['BTC', 'ETH'] as const) {
    const isBTC = asset === 'BTC';
    const baseIV = isBTC ? 52 : 62;
    const baseRV = isBTC ? 45 : 55;

    TENORS.forEach((tenor, idx) => {
      // IV tends to increase with tenor (term structure slope)
      const tenorMultiplier = 1 + idx * 0.04;
      const iv = round2(jitter(baseIV * tenorMultiplier, 0.08));
      const rv = round2(jitter(baseRV * (1 + idx * 0.02), 0.1));
      const ivRvSpread = round2(iv - rv);
      // 25-delta skew: puts more expensive (negative skew in crypto means calls > puts)
      const skew25d = round2(jitter(3.5, 0.6) * (rng() > 0.3 ? -1 : 1));
      const putCallRatio = round2(jitter(0.75, 0.2));

      termStructure.push({ asset, tenor, iv, rv, ivRvSpread, skew25d, putCallRatio });
    });
  }

  // ── 5. Market Summary ──
  const totalOptionsOI = round2(optionsData.reduce((a, o) => a + o.openInterest * (o.asset === 'BTC' ? btcSpot : ethSpot), 0) / 1e9);
  const totalPerpOI = round2(perpetualFunding.reduce((a, p) => a + p.openInterest, 0) / 1e3);
  const avgFundingRate = round4(perpetualFunding.reduce((a, p) => a + p.fundingRate, 0) / perpetualFunding.length);
  const maxPainBTC = Math.round(jitter(67000, 0.04) / 1000) * 1000;
  const maxPainETH = Math.round(jitter(3500, 0.05) / 100) * 100;
  const dvol = round2(jitter(58, 0.12));

  const marketSummary: MarketSummary = {
    btcPrice: btcSpot,
    ethPrice: ethSpot,
    totalOptionsOI,
    totalPerpOI,
    avgFundingRate,
    maxPainBTC,
    maxPainETH,
    dvol,
  };

  return {
    optionsData,
    perpetualFunding,
    basisTrades,
    termStructure,
    marketSummary,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[CryptoDerivatives] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate crypto derivatives data' });
  }
});

export default router;
