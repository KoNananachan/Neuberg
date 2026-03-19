import { Router } from 'express';
const router = Router();
function mulberry32(a: number) { return function(){let t=(a+=0x6d2b79f5);t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;}; }
function hashSeed(str: string): number { let hash=0;for(let i=0;i<str.length;i++){const char=str.charCodeAt(i);hash=((hash<<5)-hash)+char;hash|=0;}return Math.abs(hash); }
let cache: { data: any; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

// --- ETF Definitions for Creation/Redemption Monitor ---

interface ETFDef {
  ticker: string;
  name: string;
  baseNav: number;
  baseAum: number;           // $B
  baseShares: number;        // millions outstanding
  baseCreationUnits: number; // daily creation units
  baseRedemptionUnits: number;
  liquidityTier: 'high' | 'medium' | 'low'; // affects premium/discount range
}

const ETF_DEFS: ETFDef[] = [
  { ticker: 'SPY',  name: 'SPDR S&P 500 ETF Trust',                          baseNav: 540,   baseAum: 500,  baseShares: 926,   baseCreationUnits: 30,  baseRedemptionUnits: 25,  liquidityTier: 'high' },
  { ticker: 'IVV',  name: 'iShares Core S&P 500 ETF',                        baseNav: 542,   baseAum: 420,  baseShares: 775,   baseCreationUnits: 22,  baseRedemptionUnits: 18,  liquidityTier: 'high' },
  { ticker: 'VOO',  name: 'Vanguard S&P 500 ETF',                            baseNav: 497,   baseAum: 440,  baseShares: 885,   baseCreationUnits: 20,  baseRedemptionUnits: 16,  liquidityTier: 'high' },
  { ticker: 'QQQ',  name: 'Invesco QQQ Trust',                               baseNav: 480,   baseAum: 250,  baseShares: 521,   baseCreationUnits: 25,  baseRedemptionUnits: 20,  liquidityTier: 'high' },
  { ticker: 'IWM',  name: 'iShares Russell 2000 ETF',                        baseNav: 210,   baseAum: 68,   baseShares: 324,   baseCreationUnits: 18,  baseRedemptionUnits: 15,  liquidityTier: 'medium' },
  { ticker: 'DIA',  name: 'SPDR Dow Jones Industrial Average ETF Trust',     baseNav: 398,   baseAum: 36,   baseShares: 90,    baseCreationUnits: 8,   baseRedemptionUnits: 6,   liquidityTier: 'medium' },
  { ticker: 'EFA',  name: 'iShares MSCI EAFE ETF',                           baseNav: 82,    baseAum: 78,   baseShares: 951,   baseCreationUnits: 12,  baseRedemptionUnits: 10,  liquidityTier: 'medium' },
  { ticker: 'EEM',  name: 'iShares MSCI Emerging Markets ETF',               baseNav: 43,    baseAum: 22,   baseShares: 512,   baseCreationUnits: 10,  baseRedemptionUnits: 12,  liquidityTier: 'low' },
  { ticker: 'VWO',  name: 'Vanguard FTSE Emerging Markets ETF',              baseNav: 44,    baseAum: 75,   baseShares: 1705,  baseCreationUnits: 14,  baseRedemptionUnits: 11,  liquidityTier: 'low' },
  { ticker: 'AGG',  name: 'iShares Core US Aggregate Bond ETF',              baseNav: 99,    baseAum: 112,  baseShares: 1131,  baseCreationUnits: 15,  baseRedemptionUnits: 12,  liquidityTier: 'high' },
  { ticker: 'BND',  name: 'Vanguard Total Bond Market ETF',                  baseNav: 73,    baseAum: 108,  baseShares: 1479,  baseCreationUnits: 14,  baseRedemptionUnits: 11,  liquidityTier: 'high' },
  { ticker: 'TLT',  name: 'iShares 20+ Year Treasury Bond ETF',              baseNav: 92,    baseAum: 55,   baseShares: 598,   baseCreationUnits: 16,  baseRedemptionUnits: 14,  liquidityTier: 'medium' },
  { ticker: 'LQD',  name: 'iShares iBoxx $ Investment Grade Corp Bond ETF',  baseNav: 109,   baseAum: 36,   baseShares: 330,   baseCreationUnits: 10,  baseRedemptionUnits: 8,   liquidityTier: 'medium' },
  { ticker: 'HYG',  name: 'iShares iBoxx $ High Yield Corporate Bond ETF',   baseNav: 78,    baseAum: 18,   baseShares: 231,   baseCreationUnits: 12,  baseRedemptionUnits: 14,  liquidityTier: 'low' },
  { ticker: 'GLD',  name: 'SPDR Gold Shares',                                baseNav: 215,   baseAum: 64,   baseShares: 298,   baseCreationUnits: 10,  baseRedemptionUnits: 8,   liquidityTier: 'medium' },
  { ticker: 'SLV',  name: 'iShares Silver Trust',                            baseNav: 28,    baseAum: 12,   baseShares: 429,   baseCreationUnits: 8,   baseRedemptionUnits: 7,   liquidityTier: 'low' },
  { ticker: 'XLF',  name: 'Financial Select Sector SPDR Fund',               baseNav: 44,    baseAum: 42,   baseShares: 955,   baseCreationUnits: 10,  baseRedemptionUnits: 8,   liquidityTier: 'medium' },
  { ticker: 'XLK',  name: 'Technology Select Sector SPDR Fund',              baseNav: 215,   baseAum: 62,   baseShares: 288,   baseCreationUnits: 12,  baseRedemptionUnits: 9,   liquidityTier: 'medium' },
  { ticker: 'XLE',  name: 'Energy Select Sector SPDR Fund',                  baseNav: 90,    baseAum: 38,   baseShares: 422,   baseCreationUnits: 9,   baseRedemptionUnits: 11,  liquidityTier: 'medium' },
  { ticker: 'XLV',  name: 'Health Care Select Sector SPDR Fund',             baseNav: 146,   baseAum: 40,   baseShares: 274,   baseCreationUnits: 8,   baseRedemptionUnits: 7,   liquidityTier: 'medium' },
];

// --- SPY Creation Basket: Top 20 Holdings ---

interface BasketHolding {
  ticker: string;
  name: string;
  baseShares: number;    // shares per creation unit (50,000 SPY shares)
  baseWeight: number;    // % weight in basket
}

const SPY_BASKET: BasketHolding[] = [
  { ticker: 'AAPL',  name: 'Apple Inc.',                  baseShares: 3420,  baseWeight: 7.12 },
  { ticker: 'MSFT',  name: 'Microsoft Corp.',             baseShares: 2580,  baseWeight: 6.88 },
  { ticker: 'NVDA',  name: 'NVIDIA Corp.',                baseShares: 2150,  baseWeight: 6.35 },
  { ticker: 'AMZN',  name: 'Amazon.com Inc.',             baseShares: 1890,  baseWeight: 3.85 },
  { ticker: 'META',  name: 'Meta Platforms Inc.',          baseShares: 920,   baseWeight: 2.62 },
  { ticker: 'GOOGL', name: 'Alphabet Inc. Class A',       baseShares: 1340,  baseWeight: 2.18 },
  { ticker: 'GOOG',  name: 'Alphabet Inc. Class C',       baseShares: 1120,  baseWeight: 1.85 },
  { ticker: 'BRK.B', name: 'Berkshire Hathaway Inc. B',   baseShares: 680,   baseWeight: 1.72 },
  { ticker: 'LLY',   name: 'Eli Lilly and Co.',           baseShares: 320,   baseWeight: 1.55 },
  { ticker: 'AVGO',  name: 'Broadcom Inc.',               baseShares: 290,   baseWeight: 1.48 },
  { ticker: 'JPM',   name: 'JPMorgan Chase & Co.',        baseShares: 780,   baseWeight: 1.42 },
  { ticker: 'XOM',   name: 'Exxon Mobil Corp.',           baseShares: 910,   baseWeight: 1.25 },
  { ticker: 'TSLA',  name: 'Tesla Inc.',                  baseShares: 1050,  baseWeight: 1.18 },
  { ticker: 'UNH',   name: 'UnitedHealth Group Inc.',     baseShares: 280,   baseWeight: 1.15 },
  { ticker: 'V',     name: 'Visa Inc.',                   baseShares: 520,   baseWeight: 1.08 },
  { ticker: 'MA',    name: 'Mastercard Inc.',             baseShares: 340,   baseWeight: 1.02 },
  { ticker: 'PG',    name: 'Procter & Gamble Co.',        baseShares: 640,   baseWeight: 0.98 },
  { ticker: 'COST',  name: 'Costco Wholesale Corp.',      baseShares: 180,   baseWeight: 0.95 },
  { ticker: 'JNJ',   name: 'Johnson & Johnson',           baseShares: 590,   baseWeight: 0.92 },
  { ticker: 'HD',    name: 'Home Depot Inc.',              baseShares: 360,   baseWeight: 0.88 },
];

// --- Generator ---

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('etf-creation-redemption-' + day));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const round2 = (v: number) => Math.round(v * 100) / 100;
  const round4 = (v: number) => Math.round(v * 10000) / 10000;

  // Premium/discount range based on liquidity tier
  const premDiscRange = (tier: 'high' | 'medium' | 'low'): number => {
    switch (tier) {
      case 'high':   return 0.05;  // +/- 0.05%
      case 'medium': return 0.15;  // +/- 0.15%
      case 'low':    return 0.50;  // +/- 0.50%
    }
  };

  // --- ETFs with creation/redemption data ---
  const etfs = ETF_DEFS.map(etf => {
    const nav = round2(jitter(etf.baseNav, 0.008));
    const pdRange = premDiscRange(etf.liquidityTier);
    const premiumDiscount = round4((rng() - 0.5) * 2 * pdRange);
    const marketPrice = round2(nav * (1 + premiumDiscount / 100));
    const sharesOutstanding = round2(jitter(etf.baseShares, 0.03));
    const creationUnits = Math.max(1, Math.round(jitter(etf.baseCreationUnits, 0.4)));
    const redemptionUnits = Math.max(1, Math.round(jitter(etf.baseRedemptionUnits, 0.4)));
    const netFlow = creationUnits - redemptionUnits;
    const aum = round2(jitter(etf.baseAum, 0.03));

    return {
      ticker: etf.ticker,
      name: etf.name,
      nav,
      marketPrice,
      premiumDiscount,
      sharesOutstanding,
      creationUnits,
      redemptionUnits,
      netFlow,
      aum,
    };
  });

  // --- Creation basket for SPY (top 20 holdings per creation unit) ---
  const creationBasket = SPY_BASKET.map(h => {
    const shares = Math.round(jitter(h.baseShares, 0.02));
    const weight = round2(jitter(h.baseWeight, 0.03));
    // Approximate value per share from weight and SPY NAV
    const spyNav = etfs.find(e => e.ticker === 'SPY')!.nav;
    const totalBasketValue = spyNav * 50000; // 50,000 shares per creation unit
    const value = round2((weight / 100) * totalBasketValue);
    return {
      ticker: h.ticker,
      name: h.name,
      shares,
      weight,
      value,
    };
  });

  // --- Flow history: 20-day net creation/redemption flows for SPY, QQQ, IWM ---
  const flowTickers = ['SPY', 'QQQ', 'IWM'] as const;
  const flowBaseRanges: Record<string, { min: number; max: number }> = {
    SPY: { min: -15, max: 25 },
    QQQ: { min: -12, max: 18 },
    IWM: { min: -8,  max: 10 },
  };
  const flowHistory: { date: string; ticker: string; netFlow: number }[] = [];
  for (let i = 19; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    // Skip weekends
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;
    const dateStr = d.toISOString().slice(0, 10);
    for (const ticker of flowTickers) {
      const range = flowBaseRanges[ticker];
      const netFlow = Math.round(range.min + rng() * (range.max - range.min));
      flowHistory.push({ date: dateStr, ticker, netFlow });
    }
  }

  // --- Premium/discount history: 20-day for major ETFs ---
  const pdTickers = ['SPY', 'QQQ', 'IWM', 'EEM', 'HYG', 'TLT', 'GLD'] as const;
  const pdTierMap: Record<string, 'high' | 'medium' | 'low'> = {
    SPY: 'high', QQQ: 'high', IWM: 'medium', EEM: 'low',
    HYG: 'low', TLT: 'medium', GLD: 'medium',
  };
  const premiumDiscountHistory: { date: string; ticker: string; premiumDiscount: number }[] = [];
  for (let i = 19; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;
    const dateStr = d.toISOString().slice(0, 10);
    for (const ticker of pdTickers) {
      const range = premDiscRange(pdTierMap[ticker]);
      const pd = round4((rng() - 0.5) * 2 * range);
      premiumDiscountHistory.push({ date: dateStr, ticker, premiumDiscount: pd });
    }
  }

  // --- Summary ---
  const totalAum = round2(etfs.reduce((sum, e) => sum + e.aum, 0));
  const totalCreationUnits = etfs.reduce((sum, e) => sum + e.creationUnits, 0);
  const totalRedemptionUnits = etfs.reduce((sum, e) => sum + e.redemptionUnits, 0);
  const avgPremiumDiscount = round4(etfs.reduce((sum, e) => sum + e.premiumDiscount, 0) / etfs.length);

  const summary = {
    totalAum,
    totalCreationUnits,
    totalRedemptionUnits,
    avgPremiumDiscount,
  };

  return {
    etfs,
    creationBasket,
    flowHistory,
    premiumDiscountHistory,
    summary,
    timestamp: new Date().toISOString(),
  };
}

// --- Route ---

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[ETFCreationRedemption] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate ETF creation/redemption data' });
  }
});

export default router;
