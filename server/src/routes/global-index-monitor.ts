import { Router } from 'express';

const router = Router();

// ── Seeded PRNG ──

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

// ── Cache ──

let cache: { data: unknown; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

// ── Index definitions ──

interface IndexConfig {
  name: string;
  ticker: string;
  region: 'Americas' | 'Europe' | 'Asia-Pacific';
  country: string;
  currency: string;
  baseLevel: number;
  basePE: number;
  baseDivYield: number;
  baseMarketCap: number; // trillions
  baseVolume: number; // millions of shares
}

const INDICES: IndexConfig[] = [
  // Americas
  { name: 'S&P 500', ticker: 'SPX', region: 'Americas', country: 'United States', currency: 'USD', baseLevel: 5850, basePE: 22.5, baseDivYield: 1.35, baseMarketCap: 48.2, baseVolume: 3800 },
  { name: 'Dow Jones', ticker: 'DJIA', region: 'Americas', country: 'United States', currency: 'USD', baseLevel: 43200, basePE: 20.8, baseDivYield: 1.82, baseMarketCap: 14.6, baseVolume: 320 },
  { name: 'Nasdaq 100', ticker: 'NDX', region: 'Americas', country: 'United States', currency: 'USD', baseLevel: 20800, basePE: 32.4, baseDivYield: 0.62, baseMarketCap: 26.1, baseVolume: 2200 },
  { name: 'Russell 2000', ticker: 'RUT', region: 'Americas', country: 'United States', currency: 'USD', baseLevel: 2180, basePE: 26.3, baseDivYield: 1.42, baseMarketCap: 3.1, baseVolume: 1600 },
  { name: 'S&P/TSX', ticker: 'SPTSX', region: 'Americas', country: 'Canada', currency: 'CAD', baseLevel: 22800, basePE: 16.2, baseDivYield: 2.95, baseMarketCap: 3.8, baseVolume: 280 },
  { name: 'Bovespa', ticker: 'IBOV', region: 'Americas', country: 'Brazil', currency: 'BRL', baseLevel: 132500, basePE: 8.4, baseDivYield: 5.80, baseMarketCap: 1.2, baseVolume: 9500 },
  { name: 'IPC', ticker: 'MXX', region: 'Americas', country: 'Mexico', currency: 'MXN', baseLevel: 56200, basePE: 12.8, baseDivYield: 2.65, baseMarketCap: 0.62, baseVolume: 210 },

  // Europe
  { name: 'STOXX 600', ticker: 'SXXP', region: 'Europe', country: 'Europe', currency: 'EUR', baseLevel: 520, basePE: 14.8, baseDivYield: 3.15, baseMarketCap: 16.4, baseVolume: 850 },
  { name: 'DAX', ticker: 'DAX', region: 'Europe', country: 'Germany', currency: 'EUR', baseLevel: 19200, basePE: 14.2, baseDivYield: 2.82, baseMarketCap: 2.3, baseVolume: 95 },
  { name: 'CAC 40', ticker: 'CAC', region: 'Europe', country: 'France', currency: 'EUR', baseLevel: 7650, basePE: 14.5, baseDivYield: 2.95, baseMarketCap: 3.1, baseVolume: 120 },
  { name: 'FTSE 100', ticker: 'UKX', region: 'Europe', country: 'United Kingdom', currency: 'GBP', baseLevel: 8350, basePE: 12.6, baseDivYield: 3.65, baseMarketCap: 2.8, baseVolume: 780 },
  { name: 'IBEX 35', ticker: 'IBEX', region: 'Europe', country: 'Spain', currency: 'EUR', baseLevel: 11450, basePE: 11.8, baseDivYield: 3.42, baseMarketCap: 0.95, baseVolume: 180 },
  { name: 'FTSE MIB', ticker: 'FTSEMIB', region: 'Europe', country: 'Italy', currency: 'EUR', baseLevel: 34200, basePE: 9.8, baseDivYield: 4.15, baseMarketCap: 0.85, baseVolume: 1200 },
  { name: 'AEX', ticker: 'AEX', region: 'Europe', country: 'Netherlands', currency: 'EUR', baseLevel: 895, basePE: 17.2, baseDivYield: 2.48, baseMarketCap: 1.6, baseVolume: 65 },
  { name: 'SMI', ticker: 'SMI', region: 'Europe', country: 'Switzerland', currency: 'CHF', baseLevel: 12100, basePE: 19.5, baseDivYield: 2.72, baseMarketCap: 1.9, baseVolume: 48 },

  // Asia-Pacific
  { name: 'Nikkei 225', ticker: 'NKY', region: 'Asia-Pacific', country: 'Japan', currency: 'JPY', baseLevel: 39500, basePE: 21.8, baseDivYield: 1.72, baseMarketCap: 6.8, baseVolume: 1400 },
  { name: 'TOPIX', ticker: 'TPX', region: 'Asia-Pacific', country: 'Japan', currency: 'JPY', baseLevel: 2780, basePE: 16.4, baseDivYield: 2.05, baseMarketCap: 6.2, baseVolume: 1100 },
  { name: 'Hang Seng', ticker: 'HSI', region: 'Asia-Pacific', country: 'Hong Kong', currency: 'HKD', baseLevel: 18200, basePE: 9.8, baseDivYield: 3.85, baseMarketCap: 4.1, baseVolume: 1800 },
  { name: 'CSI 300', ticker: 'CSI300', region: 'Asia-Pacific', country: 'China', currency: 'CNY', baseLevel: 3650, basePE: 12.5, baseDivYield: 2.62, baseMarketCap: 5.4, baseVolume: 28000 },
  { name: 'Shanghai Composite', ticker: 'SHCOMP', region: 'Asia-Pacific', country: 'China', currency: 'CNY', baseLevel: 3120, basePE: 13.2, baseDivYield: 2.48, baseMarketCap: 6.8, baseVolume: 32000 },
  { name: 'KOSPI', ticker: 'KOSPI', region: 'Asia-Pacific', country: 'South Korea', currency: 'KRW', baseLevel: 2620, basePE: 13.5, baseDivYield: 1.95, baseMarketCap: 1.9, baseVolume: 680 },
  { name: 'ASX 200', ticker: 'AS51', region: 'Asia-Pacific', country: 'Australia', currency: 'AUD', baseLevel: 8150, basePE: 18.2, baseDivYield: 3.45, baseMarketCap: 2.1, baseVolume: 520 },
  { name: 'Sensex', ticker: 'SENSEX', region: 'Asia-Pacific', country: 'India', currency: 'INR', baseLevel: 78500, basePE: 24.6, baseDivYield: 1.18, baseMarketCap: 4.5, baseVolume: 450 },
  { name: 'Nifty 50', ticker: 'NIFTY', region: 'Asia-Pacific', country: 'India', currency: 'INR', baseLevel: 23800, basePE: 23.8, baseDivYield: 1.22, baseMarketCap: 4.3, baseVolume: 520 },
  { name: 'TAIEX', ticker: 'TWSE', region: 'Asia-Pacific', country: 'Taiwan', currency: 'TWD', baseLevel: 21500, basePE: 16.8, baseDivYield: 3.12, baseMarketCap: 2.4, baseVolume: 3800 },
  { name: 'Straits Times', ticker: 'STI', region: 'Asia-Pacific', country: 'Singapore', currency: 'SGD', baseLevel: 3420, basePE: 11.5, baseDivYield: 4.65, baseMarketCap: 0.52, baseVolume: 120 },
];

// ── Market status helper ──

function getMarketStatus(
  country: string,
  rng: () => number
): 'open' | 'closed' | 'pre-market' {
  // Deterministic but varied status based on region/country
  const r = rng();
  if (
    country === 'United States' ||
    country === 'Canada' ||
    country === 'Brazil' ||
    country === 'Mexico'
  ) {
    if (r < 0.5) return 'open';
    if (r < 0.7) return 'pre-market';
    return 'closed';
  }
  if (
    country === 'Europe' ||
    country === 'Germany' ||
    country === 'France' ||
    country === 'United Kingdom' ||
    country === 'Spain' ||
    country === 'Italy' ||
    country === 'Netherlands' ||
    country === 'Switzerland'
  ) {
    if (r < 0.45) return 'open';
    if (r < 0.65) return 'pre-market';
    return 'closed';
  }
  // Asia-Pacific
  if (r < 0.4) return 'open';
  if (r < 0.55) return 'pre-market';
  return 'closed';
}

// ── Data generation ──

function generate() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const seed = hashSeed('global-index-monitor-' + todayStr);
  const rng = mulberry32(seed);

  const round2 = (v: number) => Math.round(v * 100) / 100;
  const round3 = (v: number) => Math.round(v * 1000) / 1000;

  const indices = INDICES.map((cfg) => {
    // Daily variation: -3% to +3%
    const dailyPct = (rng() - 0.48) * 4.2;
    const changePct = round2(dailyPct);

    // Current level with some variance from base
    const levelVariance = 1 + (rng() - 0.5) * 0.08; // +/- 4% from base
    const last = round2(cfg.baseLevel * levelVariance);
    const change = round2(last * (changePct / 100));
    const previousClose = round2(last - change);

    // Intraday range
    const intraDaySpread = Math.abs(changePct) + rng() * 1.5 + 0.3;
    const high = round2(
      Math.max(last, previousClose) + last * (rng() * intraDaySpread * 0.004)
    );
    const low = round2(
      Math.min(last, previousClose) - last * (rng() * intraDaySpread * 0.004)
    );
    const open = round2(
      previousClose + (high - low) * (rng() - 0.5) * 0.4
    );

    // Period returns
    const ytdReturn = round2((rng() - 0.35) * 24); // skew slightly positive
    const weekReturn = round2((rng() - 0.45) * 6);
    const monthReturn = round2((rng() - 0.42) * 12);
    const quarterReturn = round2((rng() - 0.4) * 18);

    // Volume with variance
    const volumeMultiplier = 0.6 + rng() * 0.8;
    const volume = Math.round(cfg.baseVolume * volumeMultiplier * 1_000_000);

    // Market cap with small variance
    const marketCap = round3(cfg.baseMarketCap * (0.95 + rng() * 0.1));

    // PE with small variance
    const pe = round2(cfg.basePE * (0.92 + rng() * 0.16));

    // Dividend yield with small variance
    const divYield = round2(cfg.baseDivYield * (0.9 + rng() * 0.2));

    const status = getMarketStatus(cfg.country, rng);

    return {
      name: cfg.name,
      ticker: cfg.ticker,
      region: cfg.region,
      country: cfg.country,
      currency: cfg.currency,
      last,
      change,
      changePct,
      open,
      high,
      low,
      previousClose,
      ytdReturn,
      weekReturn,
      monthReturn,
      quarterReturn,
      volume,
      marketCap,
      pe,
      divYield,
      status,
    };
  });

  // ── Global Summary ──

  const advancers = indices.filter((i) => i.changePct > 0).length;
  const decliners = indices.filter((i) => i.changePct < 0).length;
  const unchanged = indices.filter((i) => i.changePct === 0).length;

  const sorted = [...indices].sort((a, b) => b.changePct - a.changePct);
  const bestPerformer = {
    name: sorted[0].name,
    ticker: sorted[0].ticker,
    changePct: sorted[0].changePct,
  };
  const worstPerformer = {
    name: sorted[sorted.length - 1].name,
    ticker: sorted[sorted.length - 1].ticker,
    changePct: sorted[sorted.length - 1].changePct,
  };

  const globalSummary = {
    advancers,
    decliners,
    unchanged,
    bestPerformer,
    worstPerformer,
  };

  // ── Region Performance ──

  const regions: Array<'Americas' | 'Europe' | 'Asia-Pacific'> = [
    'Americas',
    'Europe',
    'Asia-Pacific',
  ];

  const regionPerformance = regions.map((region) => {
    const regionIndices = indices.filter((i) => i.region === region);
    const avgReturn = round2(
      regionIndices.reduce((sum, i) => sum + i.changePct, 0) /
        regionIndices.length
    );
    const regionAdvancers = regionIndices.filter(
      (i) => i.changePct > 0
    ).length;
    const regionDecliners = regionIndices.filter(
      (i) => i.changePct < 0
    ).length;
    const best = regionIndices.reduce((a, b) =>
      a.changePct > b.changePct ? a : b
    );
    const worst = regionIndices.reduce((a, b) =>
      a.changePct < b.changePct ? a : b
    );

    return {
      region,
      avgReturn,
      advancers: regionAdvancers,
      decliners: regionDecliners,
      bestPerformer: { name: best.name, changePct: best.changePct },
      worstPerformer: { name: worst.name, changePct: worst.changePct },
      indexCount: regionIndices.length,
    };
  });

  // ── Heatmap Data ──

  const heatmapData = indices.map((i) => ({
    name: i.name,
    region: i.region,
    changePct: i.changePct,
  }));

  return {
    indices,
    globalSummary,
    regionPerformance,
    heatmapData,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL) {
      return res.json(cache.data);
    }
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error(
      '[GlobalIndexMonitor] Error:',
      (err as Error)?.message
    );
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate global index monitor data' });
  }
});

export default router;
