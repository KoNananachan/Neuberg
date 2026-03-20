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

interface ImpactEstimate {
  symbol: string;
  avgDailyVolume: number;
  bidAskSpread: number;
  orderSize: number;
  pctADV: number;
  permanentImpact: number;
  temporaryImpact: number;
  totalImpact: number;
  estimatedCost: number;
  optimalHorizon: number;
}

interface ImplementationShortfall {
  symbol: string;
  side: 'buy' | 'sell';
  decisionPrice: number;
  avgExecPrice: number;
  slippage: number;
  marketImpact: number;
  timingCost: number;
  opportunityCost: number;
  totalCost: number;
  benchmark: 'VWAP' | 'TWAP' | 'arrival';
}

interface ExecutionStrategy {
  name: 'aggressive' | 'neutral' | 'passive';
  expectedCost: number;
  expectedRisk: number;
  completionTime: number;
  frontRunRisk: 'low' | 'medium' | 'high';
}

interface OptimalExecution {
  symbol: string;
  orderSize: number;
  side: 'buy' | 'sell';
  strategies: ExecutionStrategy[];
}

interface LiquidityMetrics {
  avgSpread: number;
  avgDepth: number;
  avgResiliency: number;
  kyleLambda: number;
  toxicFlowPct: number;
  avgTradeSize: number;
}

// ── Security Universe ──

const SECURITIES = [
  { symbol: 'AAPL', baseADV: 60, basePrice: 185, baseBidAsk: 0.8, volatility: 0.22 },
  { symbol: 'MSFT', baseADV: 28, basePrice: 420, baseBidAsk: 1.0, volatility: 0.20 },
  { symbol: 'GOOGL', baseADV: 22, basePrice: 175, baseBidAsk: 1.2, volatility: 0.24 },
  { symbol: 'AMZN', baseADV: 35, basePrice: 195, baseBidAsk: 0.9, volatility: 0.25 },
  { symbol: 'NVDA', baseADV: 45, basePrice: 880, baseBidAsk: 1.5, volatility: 0.35 },
  { symbol: 'JPM', baseADV: 12, basePrice: 210, baseBidAsk: 2.0, volatility: 0.18 },
  { symbol: 'GS', baseADV: 3.5, basePrice: 480, baseBidAsk: 3.5, volatility: 0.22 },
  { symbol: 'SPY', baseADV: 80, basePrice: 530, baseBidAsk: 0.3, volatility: 0.12 },
  { symbol: 'QQQ', baseADV: 50, basePrice: 460, baseBidAsk: 0.4, volatility: 0.16 },
  { symbol: 'TLT', baseADV: 18, basePrice: 92, baseBidAsk: 1.8, volatility: 0.14 },
];

const IS_SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'JPM', 'GS', 'SPY'];
const OE_SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'JPM', 'SPY'];
const BENCHMARKS: Array<'VWAP' | 'TWAP' | 'arrival'> = ['VWAP', 'TWAP', 'arrival'];
const SIDES: Array<'buy' | 'sell'> = ['buy', 'sell'];

// ── Almgren-Chriss Model Helpers ──

function almgrenChrissPermanentImpact(participationRate: number, volatility: number, eta: number): number {
  // Permanent impact proportional to sqrt(participation rate)
  // eta is the permanent impact coefficient (market-dependent)
  return eta * volatility * Math.sqrt(participationRate) * 10000; // in bps
}

function almgrenChrissTemporaryImpact(orderRate: number, volatility: number, gamma: number, avgVolume: number): number {
  // Temporary impact proportional to order execution rate
  // gamma is the temporary impact coefficient
  const normalizedRate = orderRate / avgVolume;
  return gamma * volatility * normalizedRate * 10000; // in bps
}

function optimalExecutionHorizon(orderSize: number, adv: number, volatility: number): number {
  // Almgren-Chriss optimal horizon balances urgency risk vs impact cost
  // T* ~ sqrt(orderSize / ADV) * (1 / volatility) scaled to hours
  const participationRate = orderSize / adv;
  const rawHours = Math.sqrt(participationRate) * (0.2 / Math.max(volatility, 0.05)) * 24;
  return Math.max(0.5, Math.min(8.0, rawHours));
}

// ── Cache ──

const CACHE_TTL = 12 * 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('market-impact-' + day));
  const jitter = (base: number, pct: number) => Math.max(0, base * (1 + (rng() - 0.5) * 2 * pct));
  const round2 = (v: number) => Math.round(v * 100) / 100;
  const round1 = (v: number) => Math.round(v * 10) / 10;

  // ── 1. Impact Estimates ──
  const impactEstimates: ImpactEstimate[] = SECURITIES.map(sec => {
    const adv = Math.round(jitter(sec.baseADV, 0.08) * 1_000_000);
    const price = round2(jitter(sec.basePrice, 0.03));
    const bidAskSpread = round2(jitter(sec.baseBidAsk, 0.15));
    const vol = jitter(sec.volatility, 0.10);

    // Order size: 0.5% to 3% of ADV
    const pctADV = round2(jitter(1.5, 0.6));
    const orderSize = Math.round(adv * (pctADV / 100));

    const participationRate = orderSize / adv;
    const eta = jitter(0.15, 0.20); // permanent impact coefficient
    const gamma = jitter(0.08, 0.20); // temporary impact coefficient

    const permanentImpact = round2(almgrenChrissPermanentImpact(participationRate, vol, eta));
    const temporaryImpact = round2(almgrenChrissTemporaryImpact(orderSize, vol, gamma, adv));
    const totalImpact = round2(permanentImpact + temporaryImpact);

    const estimatedCost = round2((totalImpact / 10000) * price * orderSize);
    const horizon = round1(optimalExecutionHorizon(orderSize, adv, vol));

    return {
      symbol: sec.symbol,
      avgDailyVolume: Math.round(adv / 1_000_000 * 10) / 10,
      bidAskSpread,
      orderSize,
      pctADV,
      permanentImpact,
      temporaryImpact,
      totalImpact,
      estimatedCost,
      optimalHorizon: horizon,
    };
  });

  // ── 2. Implementation Shortfall ──
  const implementationShortfall: ImplementationShortfall[] = IS_SYMBOLS.map(sym => {
    const sec = SECURITIES.find(s => s.symbol === sym)!;
    const side = SIDES[Math.floor(rng() * 2)];
    const decisionPrice = round2(jitter(sec.basePrice, 0.02));

    // Slippage: typically 1-8 bps for large caps
    const slippage = round2(jitter(3.5, 0.5));
    // Market impact: 2-15 bps
    const marketImpact = round2(jitter(6.0, 0.5));
    // Timing cost: 0.5-5 bps
    const timingCost = round2(jitter(2.0, 0.6));
    // Opportunity cost: 0-4 bps
    const opportunityCost = round2(jitter(1.5, 0.7));

    // Avg exec price: decision +/- total costs
    const totalBps = slippage + marketImpact + timingCost + opportunityCost;
    const priceShift = decisionPrice * (totalBps / 10000);
    const avgExecPrice = round2(side === 'buy' ? decisionPrice + priceShift : decisionPrice - priceShift);

    // Total cost in $K: based on realistic order notional ($2M-$20M)
    const notional = jitter(8_000_000, 0.5);
    const totalCost = round2((totalBps / 10000) * notional / 1000);

    const benchmark = BENCHMARKS[Math.floor(rng() * BENCHMARKS.length)];

    return {
      symbol: sym,
      side,
      decisionPrice,
      avgExecPrice,
      slippage,
      marketImpact,
      timingCost,
      opportunityCost,
      totalCost,
      benchmark,
    };
  });

  // ── 3. Optimal Execution ──
  const optimalExecution: OptimalExecution[] = OE_SYMBOLS.map(sym => {
    const sec = SECURITIES.find(s => s.symbol === sym)!;
    const side = SIDES[Math.floor(rng() * 2)];
    const adv = sec.baseADV * 1_000_000;
    const orderSize = Math.round(jitter(adv * 0.02, 0.4));

    const participationRate = orderSize / adv;
    const vol = sec.volatility;

    // Aggressive: fast execution, higher cost, higher front-run risk
    const aggressiveCost = round2(jitter(12, 0.3) * Math.sqrt(participationRate) * vol / 0.2);
    const aggressiveRisk = round2(jitter(3, 0.3));
    const aggressiveTime = round1(Math.max(0.5, jitter(1.5, 0.3)));

    // Neutral: balanced
    const neutralCost = round2(jitter(7, 0.3) * Math.sqrt(participationRate) * vol / 0.2);
    const neutralRisk = round2(jitter(5, 0.3));
    const neutralTime = round1(Math.max(1.0, jitter(3.0, 0.3)));

    // Passive: slow execution, lower cost, lower front-run risk but higher timing risk
    const passiveCost = round2(jitter(4, 0.3) * Math.sqrt(participationRate) * vol / 0.2);
    const passiveRisk = round2(jitter(9, 0.3));
    const passiveTime = round1(Math.max(2.0, jitter(5.5, 0.3)));

    const frontRunRiskLevels: Array<'low' | 'medium' | 'high'> = ['high', 'medium', 'low'];

    const strategies: ExecutionStrategy[] = [
      {
        name: 'aggressive' as const,
        expectedCost: aggressiveCost,
        expectedRisk: aggressiveRisk,
        completionTime: aggressiveTime,
        frontRunRisk: frontRunRiskLevels[0],
      },
      {
        name: 'neutral' as const,
        expectedCost: neutralCost,
        expectedRisk: neutralRisk,
        completionTime: neutralTime,
        frontRunRisk: frontRunRiskLevels[1],
      },
      {
        name: 'passive' as const,
        expectedCost: passiveCost,
        expectedRisk: passiveRisk,
        completionTime: passiveTime,
        frontRunRisk: frontRunRiskLevels[2],
      },
    ];

    return {
      symbol: sym,
      orderSize,
      side,
      strategies,
    };
  });

  // ── 4. Liquidity Metrics ──
  const liquidityMetrics: LiquidityMetrics = {
    avgSpread: round2(jitter(1.8, 0.15)),
    avgDepth: round2(jitter(12.5, 0.20)),
    avgResiliency: round2(jitter(4.2, 0.25)),
    kyleLambda: round2(jitter(0.035, 0.20) * 10000) / 10000,
    toxicFlowPct: round2(jitter(18.5, 0.15)),
    avgTradeSize: round2(jitter(285, 0.20)),
  };

  return {
    impactEstimates,
    implementationShortfall,
    optimalExecution,
    liquidityMetrics,
    generatedAt: new Date().toISOString(),
  };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[MarketImpactModel] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate market impact model data' });
  }
});

export default router;
