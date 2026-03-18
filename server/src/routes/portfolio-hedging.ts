import { Router } from 'express';

const router = Router();

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// -- Types --

interface HedgingStrategy {
  name: string;
  instrument: string;
  type: 'Options' | 'ETF' | 'Futures';
  cost: number;
  protectionLevel: number;
  breakeven: number;
  maxLoss: number;
  effectiveness: number;
  sharpeImpact: number;
  description: string;
}

interface RiskMetrics {
  var95: number;
  var99: number;
  cvar: number;
  maxDrawdown: number;
  beta: number;
  correlationToSPX: number;
  volatility: number;
  skewness: number;
  kurtosis: number;
}

interface OptionsHedge {
  description: string;
  underlying: string;
  strike: number;
  expiry: string;
  type: 'Put' | 'Call' | 'Spread';
  premium: number;
  notional: number;
  delta: number;
  gamma: number;
  costBps: number;
  protectionRange: string;
}

interface TailRiskScenario {
  scenario: string;
  unhedgedLoss: number;
  hedgedLoss: number;
  reduction: number;
  bestHedge: string;
}

interface HedgingSummary {
  totalHedgeCost: number;
  portfolioVaR95: number;
  hedgedVaR95: number;
  varReduction: number;
  optimalStrategy: string;
  costEfficiencyRank: string;
}

interface PortfolioHedgingResponse {
  strategies: HedgingStrategy[];
  riskMetrics: RiskMetrics;
  optionsHedges: OptionsHedge[];
  tailRiskProtection: TailRiskScenario[];
  summary: HedgingSummary;
  generatedAt: string;
}

// -- Base Data --

const BASE_STRATEGIES = [
  {
    name: 'Protective Put',
    instrument: 'SPY',
    type: 'Options' as const,
    baseCost: 1.85,
    baseProtection: 95,
    baseBreakeven: -1.85,
    baseMaxLoss: 1.85,
    baseEffectiveness: 92.4,
    baseSharpeImpact: -0.12,
    description: 'Buy at-the-money SPY puts for full downside protection. Highest cost but strongest hedge for large equity exposure.',
  },
  {
    name: 'Collar Strategy',
    instrument: 'SPY',
    type: 'Options' as const,
    baseCost: 0.45,
    baseProtection: 85,
    baseBreakeven: -3.20,
    baseMaxLoss: 3.20,
    baseEffectiveness: 78.6,
    baseSharpeImpact: -0.08,
    description: 'Sell OTM calls to finance protective puts on SPY. Low-cost hedge that caps upside at +5-7% in exchange for downside floor.',
  },
  {
    name: 'VIX Call Spread',
    instrument: 'VIX',
    type: 'Options' as const,
    baseCost: 0.65,
    baseProtection: 70,
    baseBreakeven: -2.10,
    baseMaxLoss: 0.65,
    baseEffectiveness: 68.2,
    baseSharpeImpact: -0.05,
    description: 'Buy VIX call spreads (20/35) to profit from volatility spikes during sell-offs. Convex payoff with limited premium outlay.',
  },
  {
    name: 'Put Spread',
    instrument: 'QQQ',
    type: 'Options' as const,
    baseCost: 0.92,
    baseProtection: 80,
    baseBreakeven: -2.50,
    baseMaxLoss: 5.00,
    baseEffectiveness: 74.8,
    baseSharpeImpact: -0.07,
    description: 'Buy QQQ put spreads (95/85) targeting 5-15% drawdown zone. Cost-efficient hedge for concentrated tech/growth exposure.',
  },
  {
    name: 'Inverse ETF Allocation',
    instrument: 'SH',
    type: 'ETF' as const,
    baseCost: 0.90,
    baseProtection: 60,
    baseBreakeven: -4.50,
    baseMaxLoss: 4.50,
    baseEffectiveness: 62.5,
    baseSharpeImpact: -0.15,
    description: 'Allocate 5-10% to ProShares Short S&P 500 (SH) for persistent short exposure. Simple to implement but daily reset decay.',
  },
  {
    name: 'Treasury Hedge',
    instrument: 'TLT',
    type: 'ETF' as const,
    baseCost: 0.15,
    baseProtection: 45,
    baseBreakeven: -1.20,
    baseMaxLoss: 8.50,
    baseEffectiveness: 55.3,
    baseSharpeImpact: 0.04,
    description: 'Increase long-duration Treasury allocation via TLT. Effective in risk-off flight-to-quality scenarios but vulnerable to rate rises.',
  },
  {
    name: 'Gold Allocation',
    instrument: 'GLD',
    type: 'ETF' as const,
    baseCost: 0.40,
    baseProtection: 40,
    baseBreakeven: -2.80,
    baseMaxLoss: 12.00,
    baseEffectiveness: 52.1,
    baseSharpeImpact: 0.02,
    description: 'Strategic gold allocation via GLD for inflation and geopolitical risk hedging. Low correlation to equities provides diversification.',
  },
  {
    name: 'Tail Risk Puts (Deep OTM)',
    instrument: 'SPY',
    type: 'Options' as const,
    baseCost: 0.35,
    baseProtection: 50,
    baseBreakeven: -15.00,
    baseMaxLoss: 0.35,
    baseEffectiveness: 88.7,
    baseSharpeImpact: -0.03,
    description: 'Buy far OTM SPY puts (70-80% strike) for catastrophic drawdown protection. Low cost, high convexity, only pays off in severe crashes.',
  },
];

const BASE_OPTIONS_HEDGES = [
  {
    description: 'SPY 95% Put 3M',
    underlying: 'SPY',
    baseStrike: 520,
    expiryOffsetDays: 90,
    type: 'Put' as const,
    basePremium: 8.45,
    baseNotional: 54700,
    baseDelta: -0.32,
    baseGamma: 0.012,
    baseCostBps: 62,
    protectionRange: '-5% to -100%',
  },
  {
    description: 'QQQ 90/80 Put Spread 6M',
    underlying: 'QQQ',
    baseStrike: 440,
    expiryOffsetDays: 180,
    type: 'Spread' as const,
    basePremium: 5.20,
    baseNotional: 48800,
    baseDelta: -0.22,
    baseGamma: 0.008,
    baseCostBps: 45,
    protectionRange: '-10% to -20%',
  },
  {
    description: 'VIX 20/35 Call Spread 2M',
    underlying: 'VIX',
    baseStrike: 20,
    expiryOffsetDays: 60,
    type: 'Spread' as const,
    basePremium: 2.80,
    baseNotional: 28000,
    baseDelta: 0.45,
    baseGamma: 0.025,
    baseCostBps: 38,
    protectionRange: 'VIX 20-35',
  },
  {
    description: 'SPY 80% Put 12M (Tail)',
    underlying: 'SPY',
    baseStrike: 438,
    expiryOffsetDays: 365,
    type: 'Put' as const,
    basePremium: 3.15,
    baseNotional: 54700,
    baseDelta: -0.10,
    baseGamma: 0.004,
    baseCostBps: 22,
    protectionRange: '-20% to -100%',
  },
  {
    description: 'TLT 90% Put 6M (Rate Hedge)',
    underlying: 'TLT',
    baseStrike: 87,
    expiryOffsetDays: 180,
    type: 'Put' as const,
    basePremium: 2.40,
    baseNotional: 9650,
    baseDelta: -0.28,
    baseGamma: 0.015,
    baseCostBps: 18,
    protectionRange: '-10% to -30%',
  },
  {
    description: 'GLD 95/85 Put Spread 3M',
    underlying: 'GLD',
    baseStrike: 215,
    expiryOffsetDays: 90,
    type: 'Spread' as const,
    basePremium: 1.95,
    baseNotional: 22600,
    baseDelta: -0.18,
    baseGamma: 0.009,
    baseCostBps: 15,
    protectionRange: '-5% to -15%',
  },
];

const BASE_TAIL_RISK_SCENARIOS = [
  {
    scenario: '10% Market Crash',
    baseUnhedgedLoss: 10.0,
    baseHedgedLoss: 4.2,
    bestHedge: 'Protective Put',
  },
  {
    scenario: '20% Bear Market',
    baseUnhedgedLoss: 20.0,
    baseHedgedLoss: 9.5,
    bestHedge: 'Collar Strategy',
  },
  {
    scenario: 'Black Swan -30%',
    baseUnhedgedLoss: 30.0,
    baseHedgedLoss: 12.8,
    bestHedge: 'Tail Risk Puts (Deep OTM)',
  },
  {
    scenario: 'Stagflation',
    baseUnhedgedLoss: 18.5,
    baseHedgedLoss: 11.2,
    bestHedge: 'Gold Allocation',
  },
];

// -- Cache --

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: PortfolioHedgingResponse; ts: number } | null = null;

// -- Generator --

function generate(): PortfolioHedgingResponse {
  const rng = seededRandom('portfolio-hedging');
  const jitter = (base: number, pct: number): number => base * (1 + (rng() - 0.5) * 2 * pct);
  const roundTo = (v: number, d: number): number => { const f = 10 ** d; return Math.round(v * f) / f; };

  // -- Strategies --

  const strategies: HedgingStrategy[] = BASE_STRATEGIES.map((s) => ({
    name: s.name,
    instrument: s.instrument,
    type: s.type,
    cost: roundTo(jitter(s.baseCost, 0.08), 2),
    protectionLevel: roundTo(jitter(s.baseProtection, 0.04), 1),
    breakeven: roundTo(jitter(Math.abs(s.baseBreakeven), 0.06) * Math.sign(s.baseBreakeven), 2),
    maxLoss: roundTo(jitter(s.baseMaxLoss, 0.06), 2),
    effectiveness: roundTo(Math.min(99, jitter(s.baseEffectiveness, 0.04)), 1),
    sharpeImpact: roundTo(jitter(Math.abs(s.baseSharpeImpact), 0.10) * Math.sign(s.baseSharpeImpact), 2),
    description: s.description,
  }));

  // -- Risk Metrics --

  const riskMetrics: RiskMetrics = {
    var95: roundTo(jitter(2.45, 0.06), 2),
    var99: roundTo(jitter(3.82, 0.06), 2),
    cvar: roundTo(jitter(4.65, 0.06), 2),
    maxDrawdown: roundTo(jitter(18.3, 0.08), 1),
    beta: roundTo(jitter(0.92, 0.05), 2),
    correlationToSPX: roundTo(Math.min(0.99, jitter(0.87, 0.04)), 2),
    volatility: roundTo(jitter(15.8, 0.06), 1),
    skewness: roundTo(jitter(-0.42, 0.12), 2),
    kurtosis: roundTo(jitter(3.85, 0.08), 2),
  };

  // -- Options Hedges --

  const today = new Date();
  const optionsHedges: OptionsHedge[] = BASE_OPTIONS_HEDGES.map((o) => {
    const expiryDate = new Date(today.getTime() + o.expiryOffsetDays * 86400000);
    const expiryStr = expiryDate.toISOString().slice(0, 10);

    return {
      description: o.description,
      underlying: o.underlying,
      strike: roundTo(jitter(o.baseStrike, 0.03), 0),
      expiry: expiryStr,
      type: o.type,
      premium: roundTo(jitter(o.basePremium, 0.08), 2),
      notional: roundTo(jitter(o.baseNotional, 0.05), 0),
      delta: roundTo(jitter(Math.abs(o.baseDelta), 0.08) * Math.sign(o.baseDelta), 2),
      gamma: roundTo(jitter(o.baseGamma, 0.10), 3),
      costBps: roundTo(jitter(o.baseCostBps, 0.08), 0),
      protectionRange: o.protectionRange,
    };
  });

  // -- Tail Risk Protection --

  const tailRiskProtection: TailRiskScenario[] = BASE_TAIL_RISK_SCENARIOS.map((t) => {
    const unhedgedLoss = roundTo(jitter(t.baseUnhedgedLoss, 0.05), 1);
    const hedgedLoss = roundTo(jitter(t.baseHedgedLoss, 0.08), 1);
    const reduction = roundTo(((unhedgedLoss - hedgedLoss) / unhedgedLoss) * 100, 1);

    return {
      scenario: t.scenario,
      unhedgedLoss,
      hedgedLoss,
      reduction,
      bestHedge: t.bestHedge,
    };
  });

  // -- Summary --

  const totalHedgeCost = roundTo(
    strategies.reduce((sum, s) => sum + s.cost, 0) / strategies.length * 1.15,
    2,
  );
  const portfolioVaR95 = riskMetrics.var95;
  const hedgedVaR95 = roundTo(portfolioVaR95 * jitter(0.58, 0.06), 2);
  const varReduction = roundTo(((portfolioVaR95 - hedgedVaR95) / portfolioVaR95) * 100, 1);

  const sortedByEfficiency = [...strategies].sort(
    (a, b) => (b.effectiveness / Math.max(b.cost, 0.01)) - (a.effectiveness / Math.max(a.cost, 0.01)),
  );
  const sortedByEffectiveness = [...strategies].sort((a, b) => b.effectiveness - a.effectiveness);

  const summary: HedgingSummary = {
    totalHedgeCost,
    portfolioVaR95,
    hedgedVaR95,
    varReduction,
    optimalStrategy: sortedByEffectiveness[0].name,
    costEfficiencyRank: sortedByEfficiency[0].name,
  };

  return {
    strategies,
    riskMetrics,
    optionsHedges,
    tailRiskProtection,
    summary,
    generatedAt: new Date().toISOString(),
  };
}

// -- Route --

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[PortfolioHedging] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate portfolio hedging data' });
  }
});

export default router;
