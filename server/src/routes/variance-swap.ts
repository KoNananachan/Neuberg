import { Router } from 'express';

const router = Router();

// ── Deterministic seeded PRNG ──

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

// ── Helpers ──

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── Types ──

interface IndexVariance {
  underlying: string;
  impliedVar: number;
  realizedVar: number;
  varianceRiskPremium: number;
  change1D: number;
  change1W: number;
  term: '1M' | '3M';
}

interface TermStructureEntry {
  tenor: '1M' | '3M' | '6M' | '1Y' | '2Y';
  spxImpliedVar: number;
  spxRealizedVar: number;
  premium: number;
  skew: number;
}

interface SingleStockVariance {
  ticker: string;
  impliedVar: number;
  realizedVar: number;
  premium: number;
  earningsImpact: number;
  signal: 'sell var' | 'buy var' | 'neutral';
}

interface DispersionMetrics {
  indexImpliedCorr: number;
  componentAvgVar: number;
  indexVar: number;
  dispersionSpread: number;
  signal: 'long dispersion' | 'short dispersion' | 'neutral';
}

interface VolOfVol {
  vvix: number;
  change1D: number;
  percentile1Y: number;
  regime: 'low' | 'normal' | 'elevated' | 'crisis';
}

interface TradeIdea {
  trade: string;
  rationale: string;
  expectedPnL: string;
  riskReward: number;
}

interface VarianceSwapResponse {
  indices: IndexVariance[];
  termStructure: TermStructureEntry[];
  singleStocks: SingleStockVariance[];
  dispersionMetrics: DispersionMetrics;
  volOfVol: VolOfVol;
  tradeIdeas: TradeIdea[];
  generatedAt: string;
}

// ── Static templates ──

const INDEX_CONFIGS = [
  { underlying: 'SPX',           baseImplied: 18, baseRealized: 14 },
  { underlying: 'EURO STOXX 50', baseImplied: 20, baseRealized: 16 },
  { underlying: 'FTSE 100',     baseImplied: 17, baseRealized: 13 },
  { underlying: 'Nikkei 225',   baseImplied: 22, baseRealized: 18 },
  { underlying: 'DAX',          baseImplied: 19, baseRealized: 15 },
  { underlying: 'HSCEI',        baseImplied: 25, baseRealized: 20 },
] as const;

const TENOR_CONFIGS: { tenor: TermStructureEntry['tenor']; baseImplied: number; baseRealized: number; baseSkew: number }[] = [
  { tenor: '1M', baseImplied: 17.5, baseRealized: 14.0, baseSkew: -2.8 },
  { tenor: '3M', baseImplied: 18.8, baseRealized: 14.5, baseSkew: -3.5 },
  { tenor: '6M', baseImplied: 19.5, baseRealized: 15.0, baseSkew: -4.0 },
  { tenor: '1Y', baseImplied: 20.2, baseRealized: 15.5, baseSkew: -4.5 },
  { tenor: '2Y', baseImplied: 21.0, baseRealized: 16.0, baseSkew: -5.0 },
];

const STOCK_CONFIGS = [
  { ticker: 'AAPL', baseImplied: 24, baseRealized: 20, nearEarnings: false },
  { ticker: 'NVDA', baseImplied: 35, baseRealized: 30, nearEarnings: true },
  { ticker: 'TSLA', baseImplied: 48, baseRealized: 42, nearEarnings: false },
  { ticker: 'AMZN', baseImplied: 28, baseRealized: 22, nearEarnings: true },
  { ticker: 'META', baseImplied: 30, baseRealized: 25, nearEarnings: false },
  { ticker: 'GOOG', baseImplied: 26, baseRealized: 21, nearEarnings: true },
  { ticker: 'JPM',  baseImplied: 20, baseRealized: 16, nearEarnings: false },
  { ticker: 'XOM',  baseImplied: 22, baseRealized: 18, nearEarnings: false },
];

// ── Cache ──

const CACHE_TTL = 12 * 60 * 60 * 1000;
let cacheData: VarianceSwapResponse | null = null;
let cacheTime = 0;

// ── Data generation ──

function generate(): VarianceSwapResponse {
  const today = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('variance-swap-' + today));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // ── 1. Indices ──
  const indices: IndexVariance[] = INDEX_CONFIGS.map(cfg => {
    const impliedVar = round2(clamp(jitter(cfg.baseImplied, 0.15), 14, 35));
    const realizedVar = round2(clamp(jitter(cfg.baseRealized, 0.15), 10, 30));
    const varianceRiskPremium = round2(impliedVar - realizedVar);
    const change1D = round2((rng() - 0.5) * 2 * 1.5);
    const change1W = round2((rng() - 0.5) * 2 * 3.0);
    const term: '1M' | '3M' = rng() > 0.5 ? '1M' : '3M';
    return { underlying: cfg.underlying, impliedVar, realizedVar, varianceRiskPremium, change1D, change1W, term };
  });

  // ── 2. Term structure ──
  const termStructure: TermStructureEntry[] = TENOR_CONFIGS.map(cfg => {
    const spxImpliedVar = round2(clamp(jitter(cfg.baseImplied, 0.10), 14, 35));
    const spxRealizedVar = round2(clamp(jitter(cfg.baseRealized, 0.10), 10, 30));
    const premium = round2(spxImpliedVar - spxRealizedVar);
    const skew = round2(jitter(cfg.baseSkew, 0.15));
    return { tenor: cfg.tenor, spxImpliedVar, spxRealizedVar, premium, skew };
  });

  // ── 3. Single stocks ──
  const singleStocks: SingleStockVariance[] = STOCK_CONFIGS.map(cfg => {
    const impliedVar = round2(clamp(jitter(cfg.baseImplied, 0.12), 14, 35));
    const realizedVar = round2(clamp(jitter(cfg.baseRealized, 0.12), 10, 30));
    const premium = round2(impliedVar - realizedVar);
    const earningsImpact = cfg.nearEarnings ? round2(clamp(rng() * 15, 0, 15)) : 0;
    let signal: SingleStockVariance['signal'] = 'neutral';
    if (premium > 5) signal = 'sell var';
    else if (premium < 1) signal = 'buy var';
    return { ticker: cfg.ticker, impliedVar, realizedVar, premium, earningsImpact, signal };
  });

  // ── 4. Dispersion metrics ──
  const indexImpliedCorr = round2(clamp(0.35 + (rng() - 0.5) * 0.5, 0.2, 0.7));
  const componentAvgVar = round2(
    singleStocks.reduce((sum, s) => sum + s.impliedVar, 0) / singleStocks.length,
  );
  const indexVar = round2(clamp(jitter(indices[0]?.impliedVar ?? 18, 0.08), 14, 35));
  const dispersionSpread = round2(componentAvgVar - indexVar * Math.sqrt(indexImpliedCorr));
  let dispersionSignal: DispersionMetrics['signal'] = 'neutral';
  if (dispersionSpread > 8) dispersionSignal = 'long dispersion';
  else if (dispersionSpread < 2) dispersionSignal = 'short dispersion';

  const dispersionMetrics: DispersionMetrics = {
    indexImpliedCorr,
    componentAvgVar,
    indexVar,
    dispersionSpread,
    signal: dispersionSignal,
  };

  // ── 5. Vol of vol ──
  const vvix = round2(clamp(jitter(105, 0.15), 80, 140));
  const vvixChange1D = round2((rng() - 0.5) * 2 * 5);
  const percentile1Y = Math.round(clamp(rng() * 100, 0, 100));
  let regime: VolOfVol['regime'] = 'normal';
  if (vvix < 90) regime = 'low';
  else if (vvix > 120) regime = 'elevated';
  if (vvix > 130) regime = 'crisis';

  const volOfVol: VolOfVol = {
    vvix,
    change1D: vvixChange1D,
    percentile1Y,
    regime,
  };

  // ── 6. Trade ideas ──
  const spx3mImplied = termStructure.find(t => t.tenor === '3M')?.spxImpliedVar ?? 18.8;
  const spx1mImplied = termStructure.find(t => t.tenor === '1M')?.spxImpliedVar ?? 17.5;
  const spx1yImplied = termStructure.find(t => t.tenor === '1Y')?.spxImpliedVar ?? 20.2;

  const tradeIdeas: TradeIdea[] = [
    {
      trade: `Sell 3M SPX variance at ${spx3mImplied.toFixed(1)}`,
      rationale: `Implied variance of ${spx3mImplied.toFixed(1)} trades ${round2(termStructure[1]?.premium ?? 4)} vol pts above realized. VRP capture opportunity with limited event risk.`,
      expectedPnL: `+${round2(clamp(rng() * 3 + 1, 0.5, 4.5))} vol pts (~$${Math.round(clamp(rng() * 300 + 100, 100, 500))}k notional)`,
      riskReward: round2(clamp(0.5 + rng() * 2.5, 0.5, 3.0)),
    },
    {
      trade: `Long ${spx1mImplied.toFixed(1)}/${spx3mImplied.toFixed(1)} 1M/3M calendar variance spread`,
      rationale: `Term structure steep at ${round2(spx3mImplied - spx1mImplied)} pts. Roll-down provides positive carry if realized vol stays subdued.`,
      expectedPnL: `+${round2(clamp(rng() * 2 + 0.5, 0.5, 3.0))} vol pts (~$${Math.round(clamp(rng() * 200 + 80, 80, 350))}k notional)`,
      riskReward: round2(clamp(0.5 + rng() * 2.5, 0.5, 3.0)),
    },
    {
      trade: `Long dispersion: sell ${indexVar.toFixed(1)} SPX var, buy component basket at ${componentAvgVar.toFixed(1)}`,
      rationale: `Implied correlation at ${(indexImpliedCorr * 100).toFixed(0)}% is ${indexImpliedCorr > 0.5 ? 'elevated' : 'below average'}. Dispersion spread of ${dispersionSpread.toFixed(1)} vol pts offers ${dispersionSpread > 5 ? 'attractive' : 'moderate'} entry.`,
      expectedPnL: `+${round2(clamp(rng() * 4 + 1, 1, 5))} vol pts (~$${Math.round(clamp(rng() * 400 + 150, 150, 600))}k notional)`,
      riskReward: round2(clamp(0.5 + rng() * 2.5, 0.5, 3.0)),
    },
  ];

  return {
    indices,
    termStructure,
    singleStocks,
    dispersionMetrics,
    volOfVol,
    tradeIdeas,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cacheData && now - cacheTime < CACHE_TTL) {
      return res.json(cacheData);
    }
    const data = generate();
    cacheData = data;
    cacheTime = now;
    res.json(data);
  } catch (err: unknown) {
    console.error('[VarianceSwap] Error:', (err as Error)?.message);
    if (cacheData) return res.json(cacheData);
    res.status(500).json({ error: 'Failed to generate variance swap data' });
  }
});

export default router;
