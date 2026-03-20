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

// --- Static Data ---

interface ETFDef {
  ticker: string;
  name: string;
  assetClass: string;
  sector?: string;
  region: string;
  baseAum: number;       // $B
  baseFlow1d: number;    // $M
}

const ETF_DEFS: ETFDef[] = [
  // Equity - US Large Cap (dominate flows)
  { ticker: 'SPY', name: 'SPDR S&P 500 ETF Trust', assetClass: 'Equity', region: 'US', baseAum: 520, baseFlow1d: 1200 },
  { ticker: 'VOO', name: 'Vanguard S&P 500 ETF', assetClass: 'Equity', region: 'US', baseAum: 430, baseFlow1d: 900 },
  { ticker: 'IVV', name: 'iShares Core S&P 500 ETF', assetClass: 'Equity', region: 'US', baseAum: 410, baseFlow1d: 850 },
  { ticker: 'QQQ', name: 'Invesco QQQ Trust', assetClass: 'Equity', region: 'US', baseAum: 260, baseFlow1d: 600 },
  { ticker: 'VTI', name: 'Vanguard Total Stock Market ETF', assetClass: 'Equity', region: 'US', baseAum: 380, baseFlow1d: 500 },
  // Fixed Income
  { ticker: 'AGG', name: 'iShares Core US Aggregate Bond ETF', assetClass: 'Fixed Income', region: 'US', baseAum: 110, baseFlow1d: 280 },
  { ticker: 'BND', name: 'Vanguard Total Bond Market ETF', assetClass: 'Fixed Income', region: 'US', baseAum: 105, baseFlow1d: 250 },
  { ticker: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', assetClass: 'Fixed Income', region: 'US', baseAum: 55, baseFlow1d: 320 },
  { ticker: 'HYG', name: 'iShares iBoxx $ High Yield Corporate Bond ETF', assetClass: 'Fixed Income', region: 'US', baseAum: 18, baseFlow1d: 180 },
  { ticker: 'LQD', name: 'iShares iBoxx $ Investment Grade Corporate Bond ETF', assetClass: 'Fixed Income', region: 'US', baseAum: 35, baseFlow1d: 150 },
  // Commodity
  { ticker: 'GLD', name: 'SPDR Gold Shares', assetClass: 'Commodity', region: 'Global', baseAum: 62, baseFlow1d: 200 },
  // International / EM
  { ticker: 'EEM', name: 'iShares MSCI Emerging Markets ETF', assetClass: 'Equity', region: 'Emerging Markets', baseAum: 22, baseFlow1d: 120 },
  { ticker: 'VWO', name: 'Vanguard FTSE Emerging Markets ETF', assetClass: 'Equity', region: 'Emerging Markets', baseAum: 75, baseFlow1d: 90 },
  // Sector / Thematic
  { ticker: 'XLF', name: 'Financial Select Sector SPDR Fund', assetClass: 'Equity', region: 'US', baseAum: 42, baseFlow1d: 160 },
  { ticker: 'ARKK', name: 'ARK Innovation ETF', assetClass: 'Alternative', region: 'US', baseAum: 6.8, baseFlow1d: -80 },
];

const ASSET_CLASS_DEFS = [
  { assetClass: 'Equity', baseAum: 6200, baseFlow1d: 4800 },
  { assetClass: 'Fixed Income', baseAum: 1850, baseFlow1d: 1100 },
  { assetClass: 'Commodity', baseAum: 320, baseFlow1d: 280 },
  { assetClass: 'Currency', baseAum: 85, baseFlow1d: 45 },
  { assetClass: 'Alternative', baseAum: 110, baseFlow1d: -30 },
  { assetClass: 'Multi-Asset', baseAum: 240, baseFlow1d: 120 },
];

const REGION_DEFS = [
  { region: 'US', baseAum: 6800, topETF: 'SPY' },
  { region: 'Europe', baseAum: 1200, topETF: 'VGK' },
  { region: 'Asia Pacific', baseAum: 850, topETF: 'EWJ' },
  { region: 'Emerging Markets', baseAum: 480, topETF: 'EEM' },
  { region: 'Global', baseAum: 560, topETF: 'ACWI' },
  { region: 'Other', baseAum: 110, topETF: 'FM' },
];

const SECTOR_DEFS = [
  { sector: 'Information Technology', topETF: 'XLK' },
  { sector: 'Health Care', topETF: 'XLV' },
  { sector: 'Financials', topETF: 'XLF' },
  { sector: 'Consumer Discretionary', topETF: 'XLY' },
  { sector: 'Communication Services', topETF: 'XLC' },
  { sector: 'Industrials', topETF: 'XLI' },
  { sector: 'Consumer Staples', topETF: 'XLP' },
  { sector: 'Energy', topETF: 'XLE' },
  { sector: 'Utilities', topETF: 'XLU' },
  { sector: 'Real Estate', topETF: 'XLRE' },
  { sector: 'Materials', topETF: 'XLB' },
];

// --- Cache ---

const CACHE_TTL = 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

// --- Generator ---

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('etf-flows-' + day));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const jitterSigned = (base: number, pct: number) => {
    const magnitude = Math.abs(base) * (1 + (rng() - 0.5) * 2 * pct);
    return base >= 0 ? magnitude * (rng() > 0.2 ? 1 : -1) : magnitude * (rng() > 0.3 ? -1 : 1);
  };
  const round2 = (v: number) => Math.round(v * 100) / 100;

  // --- topFlows (15 ETFs) ---
  const topFlows = ETF_DEFS.map(etf => {
    const flow1d = round2(jitterSigned(etf.baseFlow1d, 0.3));
    const flow1w = round2(flow1d * jitter(4.2, 0.25));
    const flow1m = round2(flow1w * jitter(3.5, 0.3));
    const aum = round2(jitter(etf.baseAum, 0.05));
    return {
      ticker: etf.ticker,
      name: etf.name,
      flow1d,
      flow1w,
      flow1m,
      aum,
      assetClass: etf.assetClass,
    };
  });

  // --- byAssetClass (6 classes) ---
  const momentumLabels: Array<'Accelerating' | 'Steady' | 'Decelerating'> = ['Accelerating', 'Steady', 'Decelerating'];
  const byAssetClass = ASSET_CLASS_DEFS.map(ac => {
    const flow1d = round2(jitterSigned(ac.baseFlow1d, 0.25));
    const flow1w = round2(flow1d * jitter(4.5, 0.2));
    const flow1m = round2(flow1w * jitter(3.8, 0.25));
    const aum = round2(jitter(ac.baseAum, 0.03));
    const momentumIdx = Math.floor(rng() * 3);
    return {
      assetClass: ac.assetClass,
      flow1d,
      flow1w,
      flow1m,
      aum,
      flowMomentum: momentumLabels[momentumIdx],
    };
  });

  // --- byRegion (6 regions) ---
  const byRegion = REGION_DEFS.map(r => {
    const baseFlow1w = jitter(r.baseAum * 0.008, 0.4);
    const flow1w = round2(jitterSigned(baseFlow1w, 0.3) * (rng() > 0.25 ? 1 : -1));
    const flow1m = round2(flow1w * jitter(3.6, 0.25));
    const aum = round2(jitter(r.baseAum, 0.03));
    return {
      region: r.region,
      flow1w,
      flow1m,
      aum,
      topETF: r.topETF,
    };
  });

  // --- sectorFlows (11 GICS sectors) ---
  const sectorMomentumLabels: Array<'Inflow' | 'Outflow' | 'Neutral'> = ['Inflow', 'Outflow', 'Neutral'];
  const sectorFlows = SECTOR_DEFS.map(s => {
    const baseWeekly = jitter(350, 0.6);
    const flow1w = round2((rng() > 0.4 ? 1 : -1) * baseWeekly);
    const flow1m = round2(flow1w * jitter(3.5, 0.3));
    let momentum: 'Inflow' | 'Outflow' | 'Neutral';
    if (flow1w > 100) momentum = 'Inflow';
    else if (flow1w < -100) momentum = 'Outflow';
    else momentum = sectorMomentumLabels[Math.floor(rng() * 3)];
    return {
      sector: s.sector,
      flow1w,
      flow1m,
      topETF: s.topETF,
      momentum,
    };
  });

  // --- summary ---
  const totalInflows1d = round2(byAssetClass.reduce((s, a) => s + Math.max(0, a.flow1d), 0) / 1000);
  const totalInflows1w = round2(byAssetClass.reduce((s, a) => s + Math.max(0, a.flow1w), 0) / 1000);
  const totalInflows1m = round2(byAssetClass.reduce((s, a) => s + Math.max(0, a.flow1m), 0) / 1000);
  const totalAUM = round2(byAssetClass.reduce((s, a) => s + a.aum, 0) / 1000);

  const sortedByFlow1d = [...topFlows].sort((a, b) => b.flow1d - a.flow1d);
  const topInflowETF = sortedByFlow1d[0]?.ticker ?? 'SPY';
  const topOutflowETF = sortedByFlow1d[sortedByFlow1d.length - 1]?.ticker ?? 'ARKK';

  const summary = {
    totalInflows1d,
    totalInflows1w,
    totalInflows1m,
    topInflowETF,
    topOutflowETF,
    totalAUM,
  };

  return {
    summary,
    byAssetClass,
    topFlows,
    byRegion,
    sectorFlows,
    generatedAt: new Date().toISOString(),
  };
}

// --- Route ---

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[ETFFlows] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate ETF flow data' });
  }
});

export default router;
