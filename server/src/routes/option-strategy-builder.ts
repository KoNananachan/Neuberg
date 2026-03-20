import { Router } from 'express';

const router = Router();

// ── Deterministic seeded RNG ──

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// ── Types ──

interface OptionLeg {
  strike: number;
  expiry: string;
  type: 'call' | 'put';
  side: 'long' | 'short';
  quantity: number;
  premium: number;
}

interface StrategyGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

interface PayoffPoint {
  underlyingPrice: number;
  pnl: number;
}

interface VolatilityImpact {
  ivChange: string;
  valueChange: number;
  newPnl: number;
}

interface TimeDecayPoint {
  daysToExpiry: number;
  label: string;
  pnl: number;
}

interface Strategy {
  name: string;
  underlying: string;
  underlyingPrice: number;
  legs: OptionLeg[];
  maxProfit: number;
  maxLoss: number;
  breakevens: number[];
  probabilityOfProfit: number;
  greeks: StrategyGreeks;
  payoffData: PayoffPoint[];
  volatilityImpact: VolatilityImpact[];
  timeDecayProfile: TimeDecayPoint[];
}

interface StrategyComparison {
  name: string;
  riskRewardRatio: number;
  expectedReturn: number;
  maxProfit: number;
  maxLoss: number;
  probabilityOfProfit: number;
}

interface MarketConditions {
  regime: string;
  vixLevel: number;
  ivRank: number;
  historicalVol20d: number;
  impliedVol30d: number;
  recommendations: {
    strategy: string;
    rationale: string;
    confidence: number;
  }[];
}

interface OptionStrategyBuilderResponse {
  strategies: Strategy[];
  strategyComparison: StrategyComparison[];
  marketConditions: MarketConditions;
  timestamp: string;
}

// ── Cache ──

let cache: { data: OptionStrategyBuilderResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 60 * 60_000; // 5 minutes

// ── Helpers ──

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

function generateExpiry(rng: () => number): string {
  const today = new Date();
  const daysOut = 21 + Math.floor(rng() * 25); // 21-45 DTE
  const expiry = new Date(today);
  expiry.setDate(expiry.getDate() + daysOut);
  // Snap to nearest Friday
  const dayOfWeek = expiry.getDay();
  const daysToFriday = (5 - dayOfWeek + 7) % 7;
  expiry.setDate(expiry.getDate() + daysToFriday);
  return expiry.toISOString().slice(0, 10);
}

function generateFarExpiry(rng: () => number): string {
  const today = new Date();
  const daysOut = 50 + Math.floor(rng() * 30); // 50-80 DTE
  const expiry = new Date(today);
  expiry.setDate(expiry.getDate() + daysOut);
  const dayOfWeek = expiry.getDay();
  const daysToFriday = (5 - dayOfWeek + 7) % 7;
  expiry.setDate(expiry.getDate() + daysToFriday);
  return expiry.toISOString().slice(0, 10);
}

function computePayoffData(legs: OptionLeg[], underlying: number): PayoffPoint[] {
  const points: PayoffPoint[] = [];
  const low = Math.round(underlying * 0.92);
  const high = Math.round(underlying * 1.08);
  const step = (high - low) / 19;

  for (let i = 0; i < 20; i++) {
    const price = round2(low + step * i);
    let pnl = 0;

    for (const leg of legs) {
      const intrinsic = leg.type === 'call'
        ? Math.max(0, price - leg.strike)
        : Math.max(0, leg.strike - price);
      const legPnl = leg.side === 'long'
        ? (intrinsic - leg.premium) * leg.quantity * 100
        : (leg.premium - intrinsic) * leg.quantity * 100;
      pnl += legPnl;
    }

    points.push({ underlyingPrice: price, pnl: round2(pnl) });
  }

  return points;
}

function computeMaxProfitLoss(payoff: PayoffPoint[]): { maxProfit: number; maxLoss: number } {
  let maxProfit = -Infinity;
  let maxLoss = Infinity;
  for (const p of payoff) {
    if (p.pnl > maxProfit) maxProfit = p.pnl;
    if (p.pnl < maxLoss) maxLoss = p.pnl;
  }
  return { maxProfit: round2(maxProfit), maxLoss: round2(maxLoss) };
}

function computeBreakevens(payoff: PayoffPoint[]): number[] {
  const breakevens: number[] = [];
  for (let i = 1; i < payoff.length; i++) {
    const prev = payoff[i - 1];
    const curr = payoff[i];
    if ((prev.pnl < 0 && curr.pnl >= 0) || (prev.pnl >= 0 && curr.pnl < 0)) {
      // Linear interpolation
      const ratio = Math.abs(prev.pnl) / (Math.abs(prev.pnl) + Math.abs(curr.pnl));
      const be = prev.underlyingPrice + ratio * (curr.underlyingPrice - prev.underlyingPrice);
      breakevens.push(round2(be));
    }
  }
  return breakevens;
}

function generateVolatilityImpact(rng: () => number, basePnl: number): VolatilityImpact[] {
  const scenarios = ['-20%', '-10%', '0%', '+10%', '+20%'];
  const multipliers = [-0.20, -0.10, 0, 0.10, 0.20];
  return scenarios.map((ivChange, i) => {
    const vegaEffect = multipliers[i] * (300 + rng() * 400); // vega-driven P&L shift
    const newPnl = round2(basePnl + vegaEffect);
    return {
      ivChange,
      valueChange: round2(vegaEffect),
      newPnl,
    };
  });
}

function generateTimeDecayProfile(rng: () => number, basePnl: number, isNetSeller: boolean): TimeDecayPoint[] {
  const labels = ['T-30', 'T-15', 'T-7', 'T-1', 'T-0'];
  const dtes = [30, 15, 7, 1, 0];
  // Net sellers benefit from time decay, net buyers suffer
  const direction = isNetSeller ? 1 : -1;
  return labels.map((label, i) => {
    const decayFraction = 1 - dtes[i] / 30; // 0 at T-30, 1 at T-0
    const thetaAccrual = direction * decayFraction * (200 + rng() * 300);
    const noise = (rng() - 0.5) * 50;
    return {
      daysToExpiry: dtes[i],
      label,
      pnl: round2(basePnl + thetaAccrual + noise),
    };
  });
}

// ── Strategy generators ──

function buildStrategies(rng: () => number): Strategy[] {
  const spot = round2(583 + rng() * 7); // SPY ~583-590
  const expiry = generateExpiry(rng);
  const farExpiry = generateFarExpiry(rng);

  const strategies: Strategy[] = [];

  // 1. Bull Call Spread
  {
    const longStrike = Math.round(spot - 2);
    const shortStrike = Math.round(spot + 8);
    const longPremium = round2(8.50 + rng() * 2.0);
    const shortPremium = round2(3.20 + rng() * 1.0);
    const legs: OptionLeg[] = [
      { strike: longStrike, expiry, type: 'call', side: 'long', quantity: 1, premium: longPremium },
      { strike: shortStrike, expiry, type: 'call', side: 'short', quantity: 1, premium: shortPremium },
    ];
    const payoffData = computePayoffData(legs, spot);
    const { maxProfit, maxLoss } = computeMaxProfitLoss(payoffData);
    const breakevens = computeBreakevens(payoffData);
    strategies.push({
      name: 'Bull Call Spread',
      underlying: 'SPY',
      underlyingPrice: spot,
      legs,
      maxProfit,
      maxLoss,
      breakevens,
      probabilityOfProfit: round2(42 + rng() * 10),
      greeks: { delta: round4(0.30 + rng() * 0.15), gamma: round4(0.005 + rng() * 0.003), theta: round4(-(0.08 + rng() * 0.06)), vega: round4(0.10 + rng() * 0.08) },
      payoffData,
      volatilityImpact: generateVolatilityImpact(rng, payoffData[10]?.pnl ?? 0),
      timeDecayProfile: generateTimeDecayProfile(rng, payoffData[10]?.pnl ?? 0, false),
    });
  }

  // 2. Bear Put Spread
  {
    const longStrike = Math.round(spot + 2);
    const shortStrike = Math.round(spot - 8);
    const longPremium = round2(8.80 + rng() * 2.0);
    const shortPremium = round2(3.60 + rng() * 1.0);
    const legs: OptionLeg[] = [
      { strike: longStrike, expiry, type: 'put', side: 'long', quantity: 1, premium: longPremium },
      { strike: shortStrike, expiry, type: 'put', side: 'short', quantity: 1, premium: shortPremium },
    ];
    const payoffData = computePayoffData(legs, spot);
    const { maxProfit, maxLoss } = computeMaxProfitLoss(payoffData);
    const breakevens = computeBreakevens(payoffData);
    strategies.push({
      name: 'Bear Put Spread',
      underlying: 'SPY',
      underlyingPrice: spot,
      legs,
      maxProfit,
      maxLoss,
      breakevens,
      probabilityOfProfit: round2(40 + rng() * 10),
      greeks: { delta: round4(-(0.30 + rng() * 0.15)), gamma: round4(0.004 + rng() * 0.003), theta: round4(-(0.07 + rng() * 0.05)), vega: round4(0.09 + rng() * 0.07) },
      payoffData,
      volatilityImpact: generateVolatilityImpact(rng, payoffData[10]?.pnl ?? 0),
      timeDecayProfile: generateTimeDecayProfile(rng, payoffData[10]?.pnl ?? 0, false),
    });
  }

  // 3. Iron Condor
  {
    const putShortStrike = Math.round(spot - 10);
    const putLongStrike = Math.round(spot - 15);
    const callShortStrike = Math.round(spot + 10);
    const callLongStrike = Math.round(spot + 15);
    const putShortPrem = round2(2.40 + rng() * 0.8);
    const putLongPrem = round2(1.10 + rng() * 0.5);
    const callShortPrem = round2(2.20 + rng() * 0.8);
    const callLongPrem = round2(0.90 + rng() * 0.5);
    const legs: OptionLeg[] = [
      { strike: putLongStrike, expiry, type: 'put', side: 'long', quantity: 1, premium: putLongPrem },
      { strike: putShortStrike, expiry, type: 'put', side: 'short', quantity: 1, premium: putShortPrem },
      { strike: callShortStrike, expiry, type: 'call', side: 'short', quantity: 1, premium: callShortPrem },
      { strike: callLongStrike, expiry, type: 'call', side: 'long', quantity: 1, premium: callLongPrem },
    ];
    const payoffData = computePayoffData(legs, spot);
    const { maxProfit, maxLoss } = computeMaxProfitLoss(payoffData);
    const breakevens = computeBreakevens(payoffData);
    strategies.push({
      name: 'Iron Condor',
      underlying: 'SPY',
      underlyingPrice: spot,
      legs,
      maxProfit,
      maxLoss,
      breakevens,
      probabilityOfProfit: round2(58 + rng() * 12),
      greeks: { delta: round4((rng() - 0.5) * 0.06), gamma: round4(-(0.002 + rng() * 0.002)), theta: round4(0.10 + rng() * 0.08), vega: round4(-(0.12 + rng() * 0.08)) },
      payoffData,
      volatilityImpact: generateVolatilityImpact(rng, payoffData[10]?.pnl ?? 0),
      timeDecayProfile: generateTimeDecayProfile(rng, payoffData[10]?.pnl ?? 0, true),
    });
  }

  // 4. Iron Butterfly
  {
    const atmStrike = Math.round(spot);
    const putLongStrike = Math.round(spot - 12);
    const callLongStrike = Math.round(spot + 12);
    const putShortPrem = round2(5.80 + rng() * 1.5);
    const callShortPrem = round2(5.50 + rng() * 1.5);
    const putLongPrem = round2(1.20 + rng() * 0.6);
    const callLongPrem = round2(1.00 + rng() * 0.5);
    const legs: OptionLeg[] = [
      { strike: putLongStrike, expiry, type: 'put', side: 'long', quantity: 1, premium: putLongPrem },
      { strike: atmStrike, expiry, type: 'put', side: 'short', quantity: 1, premium: putShortPrem },
      { strike: atmStrike, expiry, type: 'call', side: 'short', quantity: 1, premium: callShortPrem },
      { strike: callLongStrike, expiry, type: 'call', side: 'long', quantity: 1, premium: callLongPrem },
    ];
    const payoffData = computePayoffData(legs, spot);
    const { maxProfit, maxLoss } = computeMaxProfitLoss(payoffData);
    const breakevens = computeBreakevens(payoffData);
    strategies.push({
      name: 'Iron Butterfly',
      underlying: 'SPY',
      underlyingPrice: spot,
      legs,
      maxProfit,
      maxLoss,
      breakevens,
      probabilityOfProfit: round2(32 + rng() * 10),
      greeks: { delta: round4((rng() - 0.5) * 0.04), gamma: round4(-(0.006 + rng() * 0.004)), theta: round4(0.18 + rng() * 0.12), vega: round4(-(0.20 + rng() * 0.10)) },
      payoffData,
      volatilityImpact: generateVolatilityImpact(rng, payoffData[10]?.pnl ?? 0),
      timeDecayProfile: generateTimeDecayProfile(rng, payoffData[10]?.pnl ?? 0, true),
    });
  }

  // 5. Straddle
  {
    const atmStrike = Math.round(spot);
    const callPrem = round2(7.20 + rng() * 2.0);
    const putPrem = round2(6.80 + rng() * 2.0);
    const legs: OptionLeg[] = [
      { strike: atmStrike, expiry, type: 'call', side: 'long', quantity: 1, premium: callPrem },
      { strike: atmStrike, expiry, type: 'put', side: 'long', quantity: 1, premium: putPrem },
    ];
    const payoffData = computePayoffData(legs, spot);
    const { maxProfit, maxLoss } = computeMaxProfitLoss(payoffData);
    const breakevens = computeBreakevens(payoffData);
    strategies.push({
      name: 'Straddle',
      underlying: 'SPY',
      underlyingPrice: spot,
      legs,
      maxProfit,
      maxLoss,
      breakevens,
      probabilityOfProfit: round2(35 + rng() * 8),
      greeks: { delta: round4((rng() - 0.5) * 0.08), gamma: round4(0.012 + rng() * 0.006), theta: round4(-(0.22 + rng() * 0.12)), vega: round4(0.28 + rng() * 0.12) },
      payoffData,
      volatilityImpact: generateVolatilityImpact(rng, payoffData[10]?.pnl ?? 0),
      timeDecayProfile: generateTimeDecayProfile(rng, payoffData[10]?.pnl ?? 0, false),
    });
  }

  // 6. Strangle
  {
    const putStrike = Math.round(spot - 8);
    const callStrike = Math.round(spot + 8);
    const callPrem = round2(3.40 + rng() * 1.2);
    const putPrem = round2(3.00 + rng() * 1.2);
    const legs: OptionLeg[] = [
      { strike: callStrike, expiry, type: 'call', side: 'long', quantity: 1, premium: callPrem },
      { strike: putStrike, expiry, type: 'put', side: 'long', quantity: 1, premium: putPrem },
    ];
    const payoffData = computePayoffData(legs, spot);
    const { maxProfit, maxLoss } = computeMaxProfitLoss(payoffData);
    const breakevens = computeBreakevens(payoffData);
    strategies.push({
      name: 'Strangle',
      underlying: 'SPY',
      underlyingPrice: spot,
      legs,
      maxProfit,
      maxLoss,
      breakevens,
      probabilityOfProfit: round2(28 + rng() * 10),
      greeks: { delta: round4((rng() - 0.5) * 0.06), gamma: round4(0.008 + rng() * 0.004), theta: round4(-(0.14 + rng() * 0.08)), vega: round4(0.22 + rng() * 0.10) },
      payoffData,
      volatilityImpact: generateVolatilityImpact(rng, payoffData[10]?.pnl ?? 0),
      timeDecayProfile: generateTimeDecayProfile(rng, payoffData[10]?.pnl ?? 0, false),
    });
  }

  // 7. Covered Call
  {
    const shortStrike = Math.round(spot + 5);
    const callPrem = round2(4.20 + rng() * 1.5);
    const legs: OptionLeg[] = [
      { strike: 0, expiry, type: 'call', side: 'long', quantity: 1, premium: spot }, // long stock represented as a synthetic
      { strike: shortStrike, expiry, type: 'call', side: 'short', quantity: 1, premium: callPrem },
    ];
    // Covered call payoff is special - compute manually
    const payoffData: PayoffPoint[] = [];
    const low = Math.round(spot * 0.92);
    const high = Math.round(spot * 1.08);
    const step = (high - low) / 19;
    for (let i = 0; i < 20; i++) {
      const price = round2(low + step * i);
      const stockPnl = (price - spot) * 100;
      const callPnl = price > shortStrike
        ? (callPrem - (price - shortStrike)) * 100
        : callPrem * 100;
      payoffData.push({ underlyingPrice: price, pnl: round2(stockPnl + callPnl) });
    }
    const { maxProfit, maxLoss } = computeMaxProfitLoss(payoffData);
    const breakevens = computeBreakevens(payoffData);
    strategies.push({
      name: 'Covered Call',
      underlying: 'SPY',
      underlyingPrice: spot,
      legs: [
        { strike: 0, expiry, type: 'call', side: 'long', quantity: 100, premium: spot },
        { strike: shortStrike, expiry, type: 'call', side: 'short', quantity: 1, premium: callPrem },
      ],
      maxProfit,
      maxLoss,
      breakevens,
      probabilityOfProfit: round2(62 + rng() * 10),
      greeks: { delta: round4(0.55 + rng() * 0.15), gamma: round4(-(0.003 + rng() * 0.002)), theta: round4(0.05 + rng() * 0.04), vega: round4(-(0.06 + rng() * 0.04)) },
      payoffData,
      volatilityImpact: generateVolatilityImpact(rng, payoffData[10]?.pnl ?? 0),
      timeDecayProfile: generateTimeDecayProfile(rng, payoffData[10]?.pnl ?? 0, true),
    });
  }

  // 8. Protective Put
  {
    const putStrike = Math.round(spot - 5);
    const putPrem = round2(3.80 + rng() * 1.5);
    const legs: OptionLeg[] = [
      { strike: 0, expiry, type: 'call', side: 'long', quantity: 100, premium: spot },
      { strike: putStrike, expiry, type: 'put', side: 'long', quantity: 1, premium: putPrem },
    ];
    // Protective put payoff
    const payoffData: PayoffPoint[] = [];
    const low = Math.round(spot * 0.92);
    const high = Math.round(spot * 1.08);
    const step = (high - low) / 19;
    for (let i = 0; i < 20; i++) {
      const price = round2(low + step * i);
      const stockPnl = (price - spot) * 100;
      const putPayoff = Math.max(0, putStrike - price);
      const putPnl = (putPayoff - putPrem) * 100;
      payoffData.push({ underlyingPrice: price, pnl: round2(stockPnl + putPnl) });
    }
    const { maxProfit, maxLoss } = computeMaxProfitLoss(payoffData);
    const breakevens = computeBreakevens(payoffData);
    strategies.push({
      name: 'Protective Put',
      underlying: 'SPY',
      underlyingPrice: spot,
      legs,
      maxProfit,
      maxLoss,
      breakevens,
      probabilityOfProfit: round2(55 + rng() * 10),
      greeks: { delta: round4(0.60 + rng() * 0.15), gamma: round4(0.004 + rng() * 0.003), theta: round4(-(0.06 + rng() * 0.04)), vega: round4(0.08 + rng() * 0.05) },
      payoffData,
      volatilityImpact: generateVolatilityImpact(rng, payoffData[10]?.pnl ?? 0),
      timeDecayProfile: generateTimeDecayProfile(rng, payoffData[10]?.pnl ?? 0, false),
    });
  }

  // 9. Collar
  {
    const putStrike = Math.round(spot - 8);
    const callStrike = Math.round(spot + 8);
    const putPrem = round2(2.80 + rng() * 1.0);
    const callPrem = round2(2.60 + rng() * 1.0);
    // Collar payoff: long stock + long put + short call
    const payoffData: PayoffPoint[] = [];
    const low = Math.round(spot * 0.92);
    const high = Math.round(spot * 1.08);
    const step = (high - low) / 19;
    for (let i = 0; i < 20; i++) {
      const price = round2(low + step * i);
      const stockPnl = (price - spot) * 100;
      const putPayoff = (Math.max(0, putStrike - price) - putPrem) * 100;
      const callPayoff = (callPrem - Math.max(0, price - callStrike)) * 100;
      payoffData.push({ underlyingPrice: price, pnl: round2(stockPnl + putPayoff + callPayoff) });
    }
    const { maxProfit, maxLoss } = computeMaxProfitLoss(payoffData);
    const breakevens = computeBreakevens(payoffData);
    strategies.push({
      name: 'Collar',
      underlying: 'SPY',
      underlyingPrice: spot,
      legs: [
        { strike: 0, expiry, type: 'call', side: 'long', quantity: 100, premium: spot },
        { strike: putStrike, expiry, type: 'put', side: 'long', quantity: 1, premium: putPrem },
        { strike: callStrike, expiry, type: 'call', side: 'short', quantity: 1, premium: callPrem },
      ],
      maxProfit,
      maxLoss,
      breakevens,
      probabilityOfProfit: round2(50 + rng() * 12),
      greeks: { delta: round4(0.45 + rng() * 0.15), gamma: round4(0.001 + rng() * 0.002), theta: round4((rng() - 0.5) * 0.04), vega: round4((rng() - 0.5) * 0.06) },
      payoffData,
      volatilityImpact: generateVolatilityImpact(rng, payoffData[10]?.pnl ?? 0),
      timeDecayProfile: generateTimeDecayProfile(rng, payoffData[10]?.pnl ?? 0, true),
    });
  }

  // 10. Calendar Spread
  {
    const atmStrike = Math.round(spot);
    const nearPrem = round2(4.50 + rng() * 1.5);
    const farPrem = round2(7.20 + rng() * 2.0);
    const legs: OptionLeg[] = [
      { strike: atmStrike, expiry, type: 'call', side: 'short', quantity: 1, premium: nearPrem },
      { strike: atmStrike, expiry: farExpiry, type: 'call', side: 'long', quantity: 1, premium: farPrem },
    ];
    // Calendar spread payoff at near expiry (approximation)
    const payoffData: PayoffPoint[] = [];
    const low = Math.round(spot * 0.92);
    const high = Math.round(spot * 1.08);
    const step = (high - low) / 19;
    const netDebit = farPrem - nearPrem;
    for (let i = 0; i < 20; i++) {
      const price = round2(low + step * i);
      const distFromStrike = Math.abs(price - atmStrike);
      // At near expiry, long option still has time value; approximated as a bell curve around the strike
      const remainingTimeValue = farPrem * 0.6 * Math.exp(-distFromStrike * distFromStrike / (2 * 12 * 12));
      const shortCallPayoff = nearPrem - Math.max(0, price - atmStrike);
      const pnl = (shortCallPayoff + remainingTimeValue - netDebit) * 100;
      payoffData.push({ underlyingPrice: price, pnl: round2(pnl) });
    }
    const { maxProfit, maxLoss } = computeMaxProfitLoss(payoffData);
    const breakevens = computeBreakevens(payoffData);
    strategies.push({
      name: 'Calendar Spread',
      underlying: 'SPY',
      underlyingPrice: spot,
      legs,
      maxProfit,
      maxLoss,
      breakevens,
      probabilityOfProfit: round2(38 + rng() * 12),
      greeks: { delta: round4((rng() - 0.5) * 0.06), gamma: round4(-(0.001 + rng() * 0.002)), theta: round4(0.06 + rng() * 0.04), vega: round4(0.15 + rng() * 0.10) },
      payoffData,
      volatilityImpact: generateVolatilityImpact(rng, payoffData[10]?.pnl ?? 0),
      timeDecayProfile: generateTimeDecayProfile(rng, payoffData[10]?.pnl ?? 0, true),
    });
  }

  // 11. Diagonal Spread
  {
    const nearStrike = Math.round(spot + 5);
    const farStrike = Math.round(spot);
    const nearPrem = round2(3.20 + rng() * 1.2);
    const farPrem = round2(8.00 + rng() * 2.0);
    const legs: OptionLeg[] = [
      { strike: nearStrike, expiry, type: 'call', side: 'short', quantity: 1, premium: nearPrem },
      { strike: farStrike, expiry: farExpiry, type: 'call', side: 'long', quantity: 1, premium: farPrem },
    ];
    // Diagonal spread payoff at near expiry (approximation)
    const payoffData: PayoffPoint[] = [];
    const low = Math.round(spot * 0.92);
    const high = Math.round(spot * 1.08);
    const step = (high - low) / 19;
    const netDebit = farPrem - nearPrem;
    for (let i = 0; i < 20; i++) {
      const price = round2(low + step * i);
      const distFromFarStrike = Math.abs(price - farStrike);
      const remainingTimeValue = farPrem * 0.55 * Math.exp(-distFromFarStrike * distFromFarStrike / (2 * 15 * 15));
      const farIntrinsic = Math.max(0, price - farStrike);
      const shortCallPayoff = nearPrem - Math.max(0, price - nearStrike);
      const pnl = (shortCallPayoff + farIntrinsic + remainingTimeValue - netDebit) * 100;
      payoffData.push({ underlyingPrice: price, pnl: round2(pnl) });
    }
    const { maxProfit, maxLoss } = computeMaxProfitLoss(payoffData);
    const breakevens = computeBreakevens(payoffData);
    strategies.push({
      name: 'Diagonal Spread',
      underlying: 'SPY',
      underlyingPrice: spot,
      legs,
      maxProfit,
      maxLoss,
      breakevens,
      probabilityOfProfit: round2(42 + rng() * 12),
      greeks: { delta: round4(0.20 + rng() * 0.15), gamma: round4(0.001 + rng() * 0.002), theta: round4(0.04 + rng() * 0.04), vega: round4(0.12 + rng() * 0.08) },
      payoffData,
      volatilityImpact: generateVolatilityImpact(rng, payoffData[10]?.pnl ?? 0),
      timeDecayProfile: generateTimeDecayProfile(rng, payoffData[10]?.pnl ?? 0, true),
    });
  }

  // 12. Ratio Spread (1x2 call ratio)
  {
    const longStrike = Math.round(spot);
    const shortStrike = Math.round(spot + 10);
    const longPrem = round2(7.80 + rng() * 2.0);
    const shortPrem = round2(3.00 + rng() * 1.0);
    const legs: OptionLeg[] = [
      { strike: longStrike, expiry, type: 'call', side: 'long', quantity: 1, premium: longPrem },
      { strike: shortStrike, expiry, type: 'call', side: 'short', quantity: 2, premium: shortPrem },
    ];
    // Ratio spread payoff
    const payoffData: PayoffPoint[] = [];
    const low = Math.round(spot * 0.92);
    const high = Math.round(spot * 1.08);
    const step = (high - low) / 19;
    for (let i = 0; i < 20; i++) {
      const price = round2(low + step * i);
      const longPayoff = Math.max(0, price - longStrike) - longPrem;
      const shortPayoff = (shortPrem - Math.max(0, price - shortStrike)) * 2;
      payoffData.push({ underlyingPrice: price, pnl: round2((longPayoff + shortPayoff) * 100) });
    }
    const { maxProfit, maxLoss } = computeMaxProfitLoss(payoffData);
    const breakevens = computeBreakevens(payoffData);
    strategies.push({
      name: 'Ratio Spread',
      underlying: 'SPY',
      underlyingPrice: spot,
      legs,
      maxProfit,
      maxLoss,
      breakevens,
      probabilityOfProfit: round2(48 + rng() * 12),
      greeks: { delta: round4(0.15 + rng() * 0.15), gamma: round4(-(0.003 + rng() * 0.003)), theta: round4(0.08 + rng() * 0.06), vega: round4(-(0.08 + rng() * 0.06)) },
      payoffData,
      volatilityImpact: generateVolatilityImpact(rng, payoffData[10]?.pnl ?? 0),
      timeDecayProfile: generateTimeDecayProfile(rng, payoffData[10]?.pnl ?? 0, true),
    });
  }

  return strategies;
}

// ── Strategy comparison ──

function buildStrategyComparison(strategies: Strategy[]): StrategyComparison[] {
  const comparisons = strategies.map((s) => {
    const absMaxLoss = Math.abs(s.maxLoss);
    const riskRewardRatio = absMaxLoss > 0 ? round2(s.maxProfit / absMaxLoss) : round2(s.maxProfit);
    const expectedReturn = round2(s.maxProfit * (s.probabilityOfProfit / 100) + s.maxLoss * (1 - s.probabilityOfProfit / 100));
    return {
      name: s.name,
      riskRewardRatio,
      expectedReturn,
      maxProfit: s.maxProfit,
      maxLoss: s.maxLoss,
      probabilityOfProfit: s.probabilityOfProfit,
    };
  });

  // Sort by expected return descending, take top 5
  comparisons.sort((a, b) => b.expectedReturn - a.expectedReturn);
  return comparisons.slice(0, 5);
}

// ── Market conditions ──

function buildMarketConditions(rng: () => number): MarketConditions {
  const vixLevel = round2(14 + rng() * 12); // VIX 14-26
  const ivRank = round2(rng() * 100);
  const hv20d = round2(10 + rng() * 12); // 10-22%
  const iv30d = round2(12 + rng() * 14); // 12-26%

  // Determine regime
  let regime: string;
  if (vixLevel > 22) regime = 'high-vol';
  else if (vixLevel < 15) regime = 'low-vol';
  else if (iv30d > hv20d * 1.15) regime = 'bullish';
  else if (iv30d < hv20d * 0.9) regime = 'bearish';
  else regime = 'neutral';

  // Recommendations based on regime
  const allRecs: Record<string, { strategy: string; rationale: string; confidence: number }[]> = {
    'bullish': [
      { strategy: 'Bull Call Spread', rationale: 'Defined risk bullish exposure with reduced cost from short leg; benefits from upward price movement', confidence: round2(72 + rng() * 10) },
      { strategy: 'Covered Call', rationale: 'Generate income on existing long position; limited upside but premium collected enhances yield', confidence: round2(68 + rng() * 10) },
      { strategy: 'Diagonal Spread', rationale: 'Bullish bias with time decay advantage from selling near-term against longer-dated long call', confidence: round2(62 + rng() * 10) },
    ],
    'bearish': [
      { strategy: 'Bear Put Spread', rationale: 'Defined risk bearish position; lower cost than outright put purchase with capped downside protection', confidence: round2(70 + rng() * 10) },
      { strategy: 'Protective Put', rationale: 'Portfolio insurance against downside move; maintains upside participation', confidence: round2(66 + rng() * 10) },
      { strategy: 'Collar', rationale: 'Zero or low-cost downside protection by financing put with covered call; caps upside', confidence: round2(60 + rng() * 10) },
    ],
    'neutral': [
      { strategy: 'Iron Condor', rationale: 'Profit from range-bound market; collects premium with defined risk on both sides', confidence: round2(74 + rng() * 10) },
      { strategy: 'Iron Butterfly', rationale: 'Higher premium collection than condor at ATM strikes; profits if underlying stays near current price', confidence: round2(68 + rng() * 10) },
      { strategy: 'Calendar Spread', rationale: 'Exploit time decay differential; benefits from stable prices and rising implied volatility', confidence: round2(62 + rng() * 10) },
    ],
    'high-vol': [
      { strategy: 'Iron Condor', rationale: 'Elevated premiums improve credit received; wide wings provide margin of safety in volatile conditions', confidence: round2(70 + rng() * 10) },
      { strategy: 'Straddle', rationale: 'Capitalize on expected large move in either direction; high IV means market expects significant movement', confidence: round2(64 + rng() * 10) },
      { strategy: 'Ratio Spread', rationale: 'Collect elevated premium from extra short leg; benefits if realized vol is lower than implied', confidence: round2(58 + rng() * 10) },
    ],
    'low-vol': [
      { strategy: 'Straddle', rationale: 'Cheap entry when premiums are depressed; profits from vol expansion or large directional move', confidence: round2(68 + rng() * 10) },
      { strategy: 'Strangle', rationale: 'Lower cost than straddle in low-vol environment; wider profit zone if volatility expands', confidence: round2(64 + rng() * 10) },
      { strategy: 'Calendar Spread', rationale: 'Buy cheap long-dated vol and sell near-dated; profits if term structure steepens or IV rises', confidence: round2(60 + rng() * 10) },
    ],
  };

  return {
    regime,
    vixLevel,
    ivRank,
    historicalVol20d: hv20d,
    impliedVol30d: iv30d,
    recommendations: allRecs[regime] ?? allRecs['neutral'],
  };
}

// ── Main generator ──

function generateOptionStrategyBuilderData(): OptionStrategyBuilderResponse {
  const rng = seededRandom('option-strategy-builder');

  const strategies = buildStrategies(rng);
  const strategyComparison = buildStrategyComparison(strategies);
  const marketConditions = buildMarketConditions(rng);

  return {
    strategies,
    strategyComparison,
    marketConditions,
    timestamp: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generateOptionStrategyBuilderData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[OptionStrategyBuilder] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate option strategy builder data' });
  }
});

export default router;
