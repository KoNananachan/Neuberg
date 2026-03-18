import { Router, Request, Response } from 'express';

const router = Router();

// ── Seeded PRNG ──

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// ── Helpers ──

function round2(n: number): number { return Math.round(n * 100) / 100; }

function gaussianFromUniform(rng: () => number): number {
  const u1 = rng();
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
}

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

// ── Types ──

type CrowdingLevel = 'Low' | 'Medium' | 'High';
type PrimaryStyle = 'Value' | 'Growth' | 'Momentum' | 'Quality' | 'Blend';
type RotationSignal = 'Bullish' | 'Bearish' | 'Neutral';

interface StyleFactor {
  name: string;
  currentReturn1M: number;
  return3M: number;
  returnYTD: number;
  returnYear: number;
  sharpe: number;
  zscore: number;
  crowding: CrowdingLevel;
  description: string;
}

interface StyleReturn {
  month: string;
  value: number;
  growth: number;
  momentum: number;
  quality: number;
  size: number;
  lowVol: number;
}

interface StockExposure {
  ticker: string;
  name: string;
  sector: string;
  marketCap: number;
  valueScore: number;
  growthScore: number;
  momentumScore: number;
  qualityScore: number;
  sizeScore: number;
  lowVolScore: number;
  primaryStyle: PrimaryStyle;
  return1M: number;
  returnYTD: number;
}

interface RotationEvent {
  date: string;
  fromStyle: string;
  toStyle: string;
  signal: RotationSignal;
  confidence: number;
}

interface EquityStyleSummary {
  bestFactor: string;
  worstFactor: string;
  mostCrowded: string;
  valueVsGrowthSpread: number;
  momentumStrength: string;
}

interface EquityStyleData {
  timestamp: string;
  factors: StyleFactor[];
  styleReturns: StyleReturn[];
  stocks: StockExposure[];
  rotation: RotationEvent[];
  summary: EquityStyleSummary;
}

// ── Constants ──

const FACTOR_DEFS = [
  { name: 'Value', desc: 'Captures returns from stocks with low P/E, low P/B, and high dividend yield relative to peers. Tends to outperform in late-cycle recoveries and inflationary environments.' },
  { name: 'Growth', desc: 'Targets companies with above-average EPS growth and revenue expansion. Historically performs well in low-rate, liquidity-rich environments with strong earnings momentum.' },
  { name: 'Momentum', desc: 'Exploits 12-minus-1-month price continuation. Strongest factor historically but subject to sharp reversals during regime changes and volatility spikes.' },
  { name: 'Quality', desc: 'Favors firms with high ROE, low debt-to-equity, and stable earnings. Acts as a defensive tilt, outperforming in risk-off periods and late-cycle drawdowns.' },
  { name: 'Size', desc: 'Captures the small-cap premium based on market capitalization. Small caps tend to lead in early economic recoveries but underperform in tightening cycles.' },
  { name: 'Low Volatility', desc: 'Selects stocks with lowest realized volatility. Provides downside protection and stable compounding, but lags in strong risk-on rallies.' },
] as const;

const FACTOR_PARAMS: Record<string, { returnBase: number; vol: number; sharpeBase: number; crowdBias: number }> = {
  'Value':          { returnBase: 1.2,  vol: 12, sharpeBase: 0.45, crowdBias: 0.35 },
  'Growth':         { returnBase: 2.1,  vol: 18, sharpeBase: 0.55, crowdBias: 0.70 },
  'Momentum':       { returnBase: 1.8,  vol: 20, sharpeBase: 0.50, crowdBias: 0.55 },
  'Quality':        { returnBase: 1.0,  vol: 10, sharpeBase: 0.60, crowdBias: 0.40 },
  'Size':           { returnBase: 0.8,  vol: 22, sharpeBase: 0.30, crowdBias: 0.25 },
  'Low Volatility': { returnBase: 0.6,  vol: 8,  sharpeBase: 0.65, crowdBias: 0.30 },
};

const STOCK_DEFS: readonly { ticker: string; name: string; sector: string; marketCap: number; styleBias: PrimaryStyle }[] = [
  { ticker: 'AAPL',  name: 'Apple Inc.',            sector: 'Technology',       marketCap: 3420, styleBias: 'Quality' },
  { ticker: 'MSFT',  name: 'Microsoft Corp.',       sector: 'Technology',       marketCap: 3180, styleBias: 'Quality' },
  { ticker: 'AMZN',  name: 'Amazon.com Inc.',       sector: 'Consumer Disc.',   marketCap: 2150, styleBias: 'Growth' },
  { ticker: 'GOOG',  name: 'Alphabet Inc.',         sector: 'Technology',       marketCap: 2080, styleBias: 'Growth' },
  { ticker: 'META',  name: 'Meta Platforms Inc.',    sector: 'Technology',       marketCap: 1620, styleBias: 'Momentum' },
  { ticker: 'BRK.B', name: 'Berkshire Hathaway',    sector: 'Financials',       marketCap: 1080, styleBias: 'Value' },
  { ticker: 'JNJ',   name: 'Johnson & Johnson',     sector: 'Healthcare',       marketCap: 380,  styleBias: 'Value' },
  { ticker: 'JPM',   name: 'JPMorgan Chase',        sector: 'Financials',       marketCap: 690,  styleBias: 'Value' },
  { ticker: 'V',     name: 'Visa Inc.',             sector: 'Financials',       marketCap: 610,  styleBias: 'Quality' },
  { ticker: 'PG',    name: 'Procter & Gamble',      sector: 'Consumer Staples', marketCap: 395,  styleBias: 'Blend' },
  { ticker: 'UNH',   name: 'UnitedHealth Group',    sector: 'Healthcare',       marketCap: 520,  styleBias: 'Quality' },
  { ticker: 'HD',    name: 'Home Depot Inc.',        sector: 'Consumer Disc.',   marketCap: 385,  styleBias: 'Blend' },
  { ticker: 'NVDA',  name: 'NVIDIA Corp.',          sector: 'Technology',       marketCap: 2950, styleBias: 'Momentum' },
  { ticker: 'XOM',   name: 'Exxon Mobil Corp.',     sector: 'Energy',           marketCap: 460,  styleBias: 'Value' },
  { ticker: 'LLY',   name: 'Eli Lilly & Co.',       sector: 'Healthcare',       marketCap: 740,  styleBias: 'Growth' },
  { ticker: 'AVGO',  name: 'Broadcom Inc.',         sector: 'Technology',       marketCap: 820,  styleBias: 'Momentum' },
  { ticker: 'COST',  name: 'Costco Wholesale',      sector: 'Consumer Staples', marketCap: 410,  styleBias: 'Quality' },
  { ticker: 'WMT',   name: 'Walmart Inc.',          sector: 'Consumer Staples', marketCap: 620,  styleBias: 'Blend' },
  { ticker: 'MRK',   name: 'Merck & Co.',           sector: 'Healthcare',       marketCap: 310,  styleBias: 'Value' },
  { ticker: 'ABBV',  name: 'AbbVie Inc.',           sector: 'Healthcare',       marketCap: 340,  styleBias: 'Blend' },
] as const;

const STYLE_NAMES: readonly string[] = ['Value', 'Growth', 'Momentum', 'Quality', 'Size', 'Low Volatility'];

// ── Cache ──

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: EquityStyleData | null; ts: number } = { data: null, ts: 0 };

// ── Data Generation ──

function generate(): EquityStyleData {
  const rng = seededRandom('equity-style');
  const now = new Date();

  // --- factors ---
  const factors: StyleFactor[] = FACTOR_DEFS.map(def => {
    const params = FACTOR_PARAMS[def.name];
    const g = gaussianFromUniform(rng);
    const currentReturn1M = round2(params.returnBase + g * params.vol * 0.08);
    const return3M = round2(currentReturn1M * (2.2 + rng() * 0.8) + gaussianFromUniform(rng) * 1.5);
    const returnYTD = round2(return3M * (1.4 + rng() * 0.6) + gaussianFromUniform(rng) * 2.0);
    const returnYear = round2(returnYTD * (1.3 + rng() * 0.5) + gaussianFromUniform(rng) * 3.0);
    const sharpe = round2(params.sharpeBase + gaussianFromUniform(rng) * 0.35);
    const zscore = round2(gaussianFromUniform(rng) * 1.8);

    const crowdRaw = params.crowdBias + rng() * 0.3 - 0.15;
    const crowding: CrowdingLevel = crowdRaw > 0.6 ? 'High' : crowdRaw > 0.35 ? 'Medium' : 'Low';

    return {
      name: def.name,
      currentReturn1M,
      return3M,
      returnYTD,
      returnYear,
      sharpe,
      zscore,
      crowding,
      description: def.desc,
    };
  });

  // --- styleReturns (12 months) ---
  const styleReturns: StyleReturn[] = [];
  for (let m = 11; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const month = d.toISOString().slice(0, 7);
    styleReturns.push({
      month,
      value: round2(FACTOR_PARAMS['Value'].returnBase * 0.8 + gaussianFromUniform(rng) * 2.5),
      growth: round2(FACTOR_PARAMS['Growth'].returnBase * 0.8 + gaussianFromUniform(rng) * 3.5),
      momentum: round2(FACTOR_PARAMS['Momentum'].returnBase * 0.8 + gaussianFromUniform(rng) * 3.8),
      quality: round2(FACTOR_PARAMS['Quality'].returnBase * 0.8 + gaussianFromUniform(rng) * 2.0),
      size: round2(FACTOR_PARAMS['Size'].returnBase * 0.8 + gaussianFromUniform(rng) * 4.0),
      lowVol: round2(FACTOR_PARAMS['Low Volatility'].returnBase * 0.8 + gaussianFromUniform(rng) * 1.5),
    });
  }

  // --- stocks ---
  const stocks: StockExposure[] = STOCK_DEFS.map(s => {
    const biasMap: Record<PrimaryStyle, number[]> = {
      'Value':    [1.5, -0.5, 0.0, 0.5, 0.0, 0.3],
      'Growth':   [-0.5, 1.5, 0.5, 0.3, -0.3, -0.5],
      'Momentum': [0.0, 0.5, 1.5, 0.0, -0.2, -0.8],
      'Quality':  [0.3, 0.2, 0.0, 1.5, 0.2, 0.5],
      'Blend':    [0.3, 0.3, 0.2, 0.3, 0.0, 0.2],
    };
    const bias = biasMap[s.styleBias];

    const clampScore = (v: number): number => round2(Math.max(-2, Math.min(2, v)));
    const valueScore = clampScore(bias[0] + gaussianFromUniform(rng) * 0.6);
    const growthScore = clampScore(bias[1] + gaussianFromUniform(rng) * 0.6);
    const momentumScore = clampScore(bias[2] + gaussianFromUniform(rng) * 0.6);
    const qualityScore = clampScore(bias[3] + gaussianFromUniform(rng) * 0.6);
    const sizeScore = clampScore(bias[4] + gaussianFromUniform(rng) * 0.6);
    const lowVolScore = clampScore(bias[5] + gaussianFromUniform(rng) * 0.6);

    // Determine primary style from highest absolute score
    const scores: { style: PrimaryStyle; val: number }[] = [
      { style: 'Value', val: valueScore },
      { style: 'Growth', val: growthScore },
      { style: 'Momentum', val: momentumScore },
      { style: 'Quality', val: qualityScore },
    ];
    scores.sort((a, b) => Math.abs(b.val) - Math.abs(a.val));
    const topScore = scores[0];
    const secondScore = scores[1];
    const primaryStyle: PrimaryStyle =
      Math.abs(topScore.val) - Math.abs(secondScore.val) < 0.3 ? 'Blend' : topScore.style;

    const return1M = round2(gaussianFromUniform(rng) * 5 + 0.5);
    const returnYTD = round2(gaussianFromUniform(rng) * 15 + 3);

    return {
      ticker: s.ticker,
      name: s.name,
      sector: s.sector,
      marketCap: s.marketCap,
      valueScore,
      growthScore,
      momentumScore,
      qualityScore,
      sizeScore,
      lowVolScore,
      primaryStyle,
      return1M,
      returnYTD,
    };
  });

  // --- rotation signals (4 recent) ---
  const rotation: RotationEvent[] = [];
  for (let i = 0; i < 4; i++) {
    const daysAgo = Math.floor(rng() * 25) + 1 + i * 7;
    const eventDate = new Date(now);
    eventDate.setDate(eventDate.getDate() - daysAgo);

    const fromIdx = Math.floor(rng() * STYLE_NAMES.length);
    let toIdx = Math.floor(rng() * (STYLE_NAMES.length - 1));
    if (toIdx >= fromIdx) toIdx += 1;

    const signals: RotationSignal[] = ['Bullish', 'Bearish', 'Neutral'];
    const signal = pick(signals, rng);
    const confidence = Math.round(55 + rng() * 40);

    rotation.push({
      date: eventDate.toISOString().slice(0, 10),
      fromStyle: STYLE_NAMES[fromIdx],
      toStyle: STYLE_NAMES[toIdx],
      signal,
      confidence,
    });
  }
  rotation.sort((a, b) => b.date.localeCompare(a.date));

  // --- summary ---
  const sortedByReturn = [...factors].sort((a, b) => b.currentReturn1M - a.currentReturn1M);
  const best = sortedByReturn[0];
  const worst = sortedByReturn[sortedByReturn.length - 1];
  const mostCrowdedFactor = [...factors].sort((a, b) => {
    const order: Record<CrowdingLevel, number> = { High: 3, Medium: 2, Low: 1 };
    return order[b.crowding] - order[a.crowding] || b.zscore - a.zscore;
  })[0];

  const valueFactor = factors.find(f => f.name === 'Value');
  const growthFactor = factors.find(f => f.name === 'Growth');
  const valueVsGrowthSpread = round2(
    (valueFactor?.currentReturn1M ?? 0) - (growthFactor?.currentReturn1M ?? 0)
  );

  const momentumFactor = factors.find(f => f.name === 'Momentum');
  const momReturn = momentumFactor?.currentReturn1M ?? 0;
  const momentumStrength = momReturn > 2.0 ? 'Strong' : momReturn > 0.5 ? 'Moderate' : momReturn > -0.5 ? 'Weak' : 'Negative';

  const summary: EquityStyleSummary = {
    bestFactor: `${best.name} (+${best.currentReturn1M}%)`,
    worstFactor: `${worst.name} (${worst.currentReturn1M}%)`,
    mostCrowded: mostCrowdedFactor.name,
    valueVsGrowthSpread,
    momentumStrength,
  };

  return {
    timestamp: now.toISOString(),
    factors,
    styleReturns,
    stocks,
    rotation,
    summary,
  };
}

// ── Route ──

router.get('/', (_req: Request, res: Response) => {
  try {
    const now = Date.now();
    if (cache.data && now - cache.ts < CACHE_TTL) {
      return res.json(cache.data);
    }
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[EquityStyle] Error:', (err as Error).message);
    if (cache.data) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate equity style analysis data' });
  }
});

export default router;
