import { Router } from 'express';

const router = Router();

// ── PRNG ──

function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededRandom(tag: string) {
  const d = new Date().toISOString().slice(0, 10);
  return mulberry32(hashSeed(tag + d));
}

// ── Helpers ──

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

// ── Types ──

interface PortfolioMarginSummary {
  totalPortfolioValue: number;
  initialMargin: number;
  maintenanceMargin: number;
  excessMargin: number;
  marginUtilization: number;
  buyingPower: number;
  specialMemorandumAccount: number;
  netLiquidationValue: number;
  cashBalance: number;
  timestamp: string;
}

interface AssetClassBreakdown {
  assetClass: string;
  notional: number;
  marginRequirement: number;
  marginRate: number;
  contributionToTotal: number;
  positionCount: number;
}

interface PositionMargin {
  symbol: string;
  description: string;
  quantity: number;
  marketValue: number;
  marginRequirement: number;
  marginRate: number;
  assetClass: string;
  riskWeight: number;
  side: 'LONG' | 'SHORT';
}

interface MarginScenario {
  scenario: string;
  shockPercent: number;
  portfolioValueChange: number;
  projectedPortfolioValue: number;
  projectedMarginRequired: number;
  marginCallAmount: number;
  excessDeficit: number;
}

interface HistoricalUtilization {
  date: string;
  utilization: number;
  portfolioValue: number;
  marginRequired: number;
}

type AlertLevel = 'WARNING' | 'CRITICAL' | 'CALL';

interface MarginAlert {
  id: string;
  level: AlertLevel;
  message: string;
  triggerPercent: number;
  currentPercent: number;
  deadline: string | null;
  createdAt: string;
  acknowledged: boolean;
}

interface PortfolioMarginResponse {
  summary: PortfolioMarginSummary;
  assetClassBreakdown: AssetClassBreakdown[];
  positions: PositionMargin[];
  scenarios: MarginScenario[];
  historicalUtilization: HistoricalUtilization[];
  alerts: MarginAlert[];
}

// ── Data Generation ──

function generateSummary(rng: () => number): PortfolioMarginSummary {
  // Realistic portfolio margin account — institutional-scale
  const totalPortfolioValue = round2(2_400_000 + (rng() - 0.5) * 800_000);
  const cashBalance = round2(320_000 + (rng() - 0.5) * 120_000);
  const netLiquidationValue = round2(totalPortfolioValue + cashBalance);

  // Portfolio margin typically allows 6.5:1 leverage vs Reg-T 2:1
  const initialMarginRate = 0.15 + rng() * 0.08; // 15-23%
  const maintenanceMarginRate = initialMarginRate * (0.7 + rng() * 0.1); // ~70-80% of initial
  const initialMargin = round2(totalPortfolioValue * initialMarginRate);
  const maintenanceMargin = round2(totalPortfolioValue * maintenanceMarginRate);
  const excessMargin = round2(netLiquidationValue - initialMargin);

  const marginUtilization = round4(initialMargin / netLiquidationValue);
  const buyingPower = round2(excessMargin / initialMarginRate);
  const specialMemorandumAccount = round2(excessMargin * (0.85 + rng() * 0.1));

  return {
    totalPortfolioValue,
    initialMargin,
    maintenanceMargin,
    excessMargin,
    marginUtilization,
    buyingPower,
    specialMemorandumAccount,
    netLiquidationValue,
    cashBalance,
    timestamp: new Date().toISOString(),
  };
}

function generateAssetClassBreakdown(
  rng: () => number,
  totalPortfolioValue: number,
): AssetClassBreakdown[] {
  // Realistic allocation: equities dominate, options for hedging, some futures/FI
  const equityPct = 0.52 + (rng() - 0.5) * 0.12;
  const optionsPct = 0.18 + (rng() - 0.5) * 0.06;
  const futuresPct = 0.16 + (rng() - 0.5) * 0.06;
  const fiPct = 1 - equityPct - optionsPct - futuresPct;

  const classes = [
    {
      assetClass: 'Equities',
      allocationPct: equityPct,
      marginRate: 0.15 + rng() * 0.05, // 15-20% portfolio margin
      positionCount: 8 + Math.floor(rng() * 4),
    },
    {
      assetClass: 'Options',
      allocationPct: optionsPct,
      marginRate: 0.20 + rng() * 0.10, // 20-30% — risk-based
      positionCount: 4 + Math.floor(rng() * 3),
    },
    {
      assetClass: 'Futures',
      allocationPct: futuresPct,
      marginRate: 0.05 + rng() * 0.04, // 5-9% — exchange minimum
      positionCount: 2 + Math.floor(rng() * 3),
    },
    {
      assetClass: 'Fixed Income',
      allocationPct: Math.max(fiPct, 0.04),
      marginRate: 0.02 + rng() * 0.03, // 2-5% — low risk
      positionCount: 1 + Math.floor(rng() * 2),
    },
  ];

  // Normalize allocations to sum to 1
  const totalAlloc = classes.reduce((s, c) => s + c.allocationPct, 0);
  let totalMarginReq = 0;

  const breakdown = classes.map((c) => {
    const normAlloc = c.allocationPct / totalAlloc;
    const notional = round2(totalPortfolioValue * normAlloc);
    const marginRequirement = round2(notional * c.marginRate);
    totalMarginReq += marginRequirement;
    return {
      assetClass: c.assetClass,
      notional,
      marginRequirement,
      marginRate: round4(c.marginRate),
      contributionToTotal: 0, // computed below
      positionCount: c.positionCount,
    };
  });

  // Compute contribution as fraction of total margin requirement
  for (const b of breakdown) {
    b.contributionToTotal = round4(totalMarginReq > 0 ? b.marginRequirement / totalMarginReq : 0);
  }

  return breakdown;
}

function generatePositions(rng: () => number, totalPortfolioValue: number): PositionMargin[] {
  const equitySymbols = [
    { symbol: 'AAPL', desc: 'Apple Inc' },
    { symbol: 'MSFT', desc: 'Microsoft Corp' },
    { symbol: 'NVDA', desc: 'NVIDIA Corp' },
    { symbol: 'AMZN', desc: 'Amazon.com Inc' },
    { symbol: 'GOOGL', desc: 'Alphabet Inc Cl A' },
    { symbol: 'META', desc: 'Meta Platforms Inc' },
    { symbol: 'TSLA', desc: 'Tesla Inc' },
    { symbol: 'JPM', desc: 'JPMorgan Chase & Co' },
    { symbol: 'V', desc: 'Visa Inc' },
    { symbol: 'UNH', desc: 'UnitedHealth Group' },
  ];

  const optionSymbols = [
    { symbol: 'SPX 5500C 06/20', desc: 'SPX Jun 5500 Call' },
    { symbol: 'SPX 4800P 06/20', desc: 'SPX Jun 4800 Put' },
    { symbol: 'AAPL 220C 07/18', desc: 'AAPL Jul 220 Call' },
    { symbol: 'QQQ 480P 06/20', desc: 'QQQ Jun 480 Put' },
    { symbol: 'IWM 210P 07/18', desc: 'IWM Jul 210 Put' },
  ];

  const futureSymbols = [
    { symbol: 'ESM5', desc: 'E-mini S&P 500 Jun25' },
    { symbol: 'NQM5', desc: 'E-mini NASDAQ Jun25' },
    { symbol: 'ZBM5', desc: 'US T-Bond Jun25' },
  ];

  const fiSymbols = [
    { symbol: 'US912828ZT09', desc: 'UST 2.875% 05/31' },
    { symbol: 'US91282CJL09', desc: 'UST 4.25% 02/28' },
  ];

  const positions: PositionMargin[] = [];
  const avgPositionValue = totalPortfolioValue / 20;

  // Equities (10 positions)
  for (const eq of equitySymbols) {
    const side: 'LONG' | 'SHORT' = rng() > 0.85 ? 'SHORT' : 'LONG';
    const scaleFactor = 0.4 + rng() * 1.2;
    const marketValue = round2(avgPositionValue * scaleFactor);
    const price = 80 + rng() * 400;
    const quantity = Math.round(marketValue / price) * (side === 'SHORT' ? -1 : 1);
    const marginRate = round4(0.15 + rng() * 0.05);
    const riskWeight = round4(0.8 + rng() * 0.4);

    positions.push({
      symbol: eq.symbol,
      description: eq.desc,
      quantity,
      marketValue: round2(Math.abs(quantity) * price),
      marginRequirement: round2(Math.abs(quantity) * price * marginRate),
      marginRate,
      assetClass: 'Equities',
      riskWeight,
      side,
    });
  }

  // Options (5 positions)
  for (const opt of optionSymbols) {
    const side: 'LONG' | 'SHORT' = rng() > 0.6 ? 'SHORT' : 'LONG';
    const contracts = Math.floor(5 + rng() * 45);
    const premium = round2(3 + rng() * 25);
    const notional = round2(contracts * 100 * premium);
    const marginRate = round4(0.20 + rng() * 0.12);
    const riskWeight = round4(1.0 + rng() * 0.8);

    positions.push({
      symbol: opt.symbol,
      description: opt.desc,
      quantity: contracts * (side === 'SHORT' ? -1 : 1),
      marketValue: notional,
      marginRequirement: round2(notional * marginRate),
      marginRate,
      assetClass: 'Options',
      riskWeight,
      side,
    });
  }

  // Futures (3 positions)
  for (const fut of futureSymbols) {
    const side: 'LONG' | 'SHORT' = rng() > 0.5 ? 'SHORT' : 'LONG';
    const contracts = Math.floor(1 + rng() * 8);
    // E-mini S&P multiplier $50, NASDAQ $20, bonds $1000
    const multiplier = fut.symbol.startsWith('ES') ? 50 : fut.symbol.startsWith('NQ') ? 20 : 1000;
    const basePrice = fut.symbol.startsWith('ES') ? 5400 + rng() * 200
      : fut.symbol.startsWith('NQ') ? 18500 + rng() * 1000
      : 118 + rng() * 6;
    const notional = round2(contracts * multiplier * basePrice);
    const marginRate = round4(0.04 + rng() * 0.05);
    const riskWeight = round4(0.6 + rng() * 0.3);

    positions.push({
      symbol: fut.symbol,
      description: fut.desc,
      quantity: contracts * (side === 'SHORT' ? -1 : 1),
      marketValue: notional,
      marginRequirement: round2(notional * marginRate),
      marginRate,
      assetClass: 'Futures',
      riskWeight,
      side,
    });
  }

  // Fixed income (2 positions)
  for (const fi of fiSymbols) {
    const faceValue = round2(100_000 + rng() * 200_000);
    const bondPrice = 95 + rng() * 10; // % of par
    const marketValue = round2(faceValue * (bondPrice / 100));
    const marginRate = round4(0.02 + rng() * 0.03);
    const riskWeight = round4(0.1 + rng() * 0.2);

    positions.push({
      symbol: fi.symbol,
      description: fi.desc,
      quantity: Math.round(faceValue / 1000), // in $1k face value units
      marketValue,
      marginRequirement: round2(marketValue * marginRate),
      marginRate,
      assetClass: 'Fixed Income',
      riskWeight,
      side: 'LONG',
    });
  }

  return positions;
}

function generateScenarios(
  rng: () => number,
  summary: PortfolioMarginSummary,
): MarginScenario[] {
  const scenarios = [
    { scenario: 'Market Crash', shockPercent: -20 },
    { scenario: 'Correction', shockPercent: -10 },
    { scenario: 'Flat Market', shockPercent: 0 },
    { scenario: 'Rally', shockPercent: 10 },
    { scenario: 'Melt-Up', shockPercent: 20 },
  ];

  return scenarios.map((s) => {
    const pctChange = s.shockPercent / 100;
    // Portfolio value change is not perfectly linear — add noise for realism
    const beta = 1.0 + (rng() - 0.5) * 0.3;
    const portfolioValueChange = round2(summary.totalPortfolioValue * pctChange * beta);
    const projectedPortfolioValue = round2(summary.totalPortfolioValue + portfolioValueChange);

    // Margin requirements increase in sell-offs due to vol expansion
    const volMultiplier = s.shockPercent < 0
      ? 1 + Math.abs(pctChange) * (0.5 + rng() * 0.3) // margin rises in crashes
      : 1 - pctChange * 0.1; // slight margin relief in rallies

    const projectedMarginRequired = round2(summary.initialMargin * volMultiplier);
    const projectedNetLiq = round2(projectedPortfolioValue + summary.cashBalance);
    const excessDeficit = round2(projectedNetLiq - projectedMarginRequired);
    const marginCallAmount = excessDeficit < 0 ? round2(Math.abs(excessDeficit)) : 0;

    return {
      scenario: s.scenario,
      shockPercent: s.shockPercent,
      portfolioValueChange,
      projectedPortfolioValue,
      projectedMarginRequired,
      marginCallAmount,
      excessDeficit,
    };
  });
}

function generateHistoricalUtilization(
  rng: () => number,
  currentUtilization: number,
  currentPortfolioValue: number,
): HistoricalUtilization[] {
  const today = new Date();
  const points: HistoricalUtilization[] = [];

  // Walk backward from current utilization with mean-reverting noise
  let util = currentUtilization;

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);

    // Mean-reverting random walk around current utilization
    const drift = (currentUtilization - util) * 0.08;
    const noise = (rng() - 0.5) * 0.04;
    util = clamp(util + drift + noise, 0.05, 0.95);

    const portfolioValue = round2(
      currentPortfolioValue * (1 + (rng() - 0.5) * 0.03),
    );
    const marginRequired = round2(portfolioValue * util);

    points.push({
      date: dateStr,
      utilization: round4(util),
      portfolioValue,
      marginRequired,
    });
  }

  return points;
}

function generateAlerts(
  rng: () => number,
  summary: PortfolioMarginSummary,
): MarginAlert[] {
  const today = new Date();
  const utilizationPct = round2(summary.marginUtilization * 100);

  const alertTemplates: {
    level: AlertLevel;
    triggerPct: number;
    msgFn: (trigger: number, current: number) => string;
    hasDeadline: boolean;
  }[] = [
    {
      level: 'WARNING',
      triggerPct: 70,
      msgFn: (t, c) => `Margin utilization at ${c}% approaching warning threshold of ${t}%`,
      hasDeadline: false,
    },
    {
      level: 'WARNING',
      triggerPct: 75,
      msgFn: (t, c) => `Portfolio concentration risk: single position exceeds ${t}% of net liquidation value (current: ${c}%)`,
      hasDeadline: false,
    },
    {
      level: 'CRITICAL',
      triggerPct: 85,
      msgFn: (t, _c) => `Approaching maintenance margin — reduce positions or deposit funds. Threshold: ${t}%`,
      hasDeadline: true,
    },
    {
      level: 'CALL',
      triggerPct: 90,
      msgFn: (t, _c) => `MARGIN CALL: Account below minimum maintenance requirement. Liquidation threshold: ${t}%`,
      hasDeadline: true,
    },
    {
      level: 'WARNING',
      triggerPct: 60,
      msgFn: (t, c) => `Overnight margin requirement increases by 10% at market close. Current utilization: ${c}%, overnight threshold: ${t}%`,
      hasDeadline: false,
    },
  ];

  // Select 3-5 alerts based on RNG
  const count = 3 + Math.floor(rng() * 3);
  const selected = alertTemplates.slice(0, count);

  return selected.map((tpl, idx) => {
    const currentPct = round2(
      tpl.level === 'CALL'
        ? tpl.triggerPct + rng() * 3
        : utilizationPct + (rng() - 0.5) * 10,
    );

    const createdHoursAgo = Math.floor(rng() * 72);
    const createdAt = new Date(today.getTime() - createdHoursAgo * 3600_000);

    let deadline: string | null = null;
    if (tpl.hasDeadline) {
      const deadlineHoursFromNow = 24 + Math.floor(rng() * 48);
      deadline = new Date(today.getTime() + deadlineHoursFromNow * 3600_000).toISOString();
    }

    return {
      id: `MRG-${String(1000 + idx + Math.floor(rng() * 9000))}`,
      level: tpl.level,
      message: tpl.msgFn(tpl.triggerPct, currentPct),
      triggerPercent: tpl.triggerPct,
      currentPercent: currentPct,
      deadline,
      createdAt: createdAt.toISOString(),
      acknowledged: rng() > 0.6,
    };
  });
}

function generatePortfolioMarginData(): PortfolioMarginResponse {
  const rng = seededRandom('portfolio-margin');

  const summary = generateSummary(rng);
  const assetClassBreakdown = generateAssetClassBreakdown(rng, summary.totalPortfolioValue);
  const positions = generatePositions(rng, summary.totalPortfolioValue);
  const scenarios = generateScenarios(rng, summary);
  const historicalUtilization = generateHistoricalUtilization(
    rng,
    summary.marginUtilization,
    summary.totalPortfolioValue,
  );
  const alerts = generateAlerts(rng, summary);

  return {
    summary,
    assetClassBreakdown,
    positions,
    scenarios,
    historicalUtilization,
    alerts,
  };
}

// ── Cache (5min TTL, stale fallback) ──

let cache: { data: PortfolioMarginResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 60 * 60_000;

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generatePortfolioMarginData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[PortfolioMargin] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate portfolio margin data' });
  }
});

export default router;
