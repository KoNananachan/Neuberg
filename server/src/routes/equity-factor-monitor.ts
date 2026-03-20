import { Router } from 'express';

const router = Router();

// ── Seeded PRNG ──

function mulberry32(a: number) { return function() { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = Math.imul(31, h) + str.charCodeAt(i) | 0; } return h; }

// ── Constants ──

const FACTORS = ['Momentum', 'Value', 'Quality', 'Size', 'Low Vol', 'Growth', 'Dividend Yield'] as const;
type FactorName = typeof FACTORS[number];

const STOCK_UNIVERSE = [
  { ticker: 'AAPL', name: 'Apple Inc.' },
  { ticker: 'MSFT', name: 'Microsoft Corp.' },
  { ticker: 'NVDA', name: 'NVIDIA Corp.' },
  { ticker: 'GOOGL', name: 'Alphabet Inc.' },
  { ticker: 'AMZN', name: 'Amazon.com Inc.' },
  { ticker: 'META', name: 'Meta Platforms Inc.' },
  { ticker: 'TSLA', name: 'Tesla Inc.' },
  { ticker: 'BRK.B', name: 'Berkshire Hathaway' },
  { ticker: 'JPM', name: 'JPMorgan Chase' },
  { ticker: 'V', name: 'Visa Inc.' },
  { ticker: 'UNH', name: 'UnitedHealth Group' },
  { ticker: 'XOM', name: 'Exxon Mobil Corp.' },
  { ticker: 'JNJ', name: 'Johnson & Johnson' },
  { ticker: 'PG', name: 'Procter & Gamble' },
  { ticker: 'MA', name: 'Mastercard Inc.' },
  { ticker: 'HD', name: 'Home Depot Inc.' },
  { ticker: 'AVGO', name: 'Broadcom Inc.' },
  { ticker: 'LLY', name: 'Eli Lilly & Co.' },
  { ticker: 'MRK', name: 'Merck & Co.' },
  { ticker: 'PEP', name: 'PepsiCo Inc.' },
  { ticker: 'COST', name: 'Costco Wholesale' },
  { ticker: 'ABBV', name: 'AbbVie Inc.' },
  { ticker: 'KO', name: 'Coca-Cola Co.' },
  { ticker: 'CRM', name: 'Salesforce Inc.' },
  { ticker: 'CVX', name: 'Chevron Corp.' },
  { ticker: 'BAC', name: 'Bank of America' },
  { ticker: 'WMT', name: 'Walmart Inc.' },
  { ticker: 'CSCO', name: 'Cisco Systems' },
  { ticker: 'TMO', name: 'Thermo Fisher Sci.' },
  { ticker: 'ACN', name: 'Accenture plc' },
];

// ── Helpers ──

function round2(n: number): number { return Math.round(n * 100) / 100; }
function round4(n: number): number { return Math.round(n * 10000) / 10000; }

function gaussianFromUniform(rng: () => number): number {
  const u1 = rng();
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
}

// ── Types ──

interface FactorPerformance {
  factor: string;
  dailyReturn: number;
  mtdReturn: number;
  ytdReturn: number;
  sharpe1Y: number;
  maxDrawdown1Y: number;
  currentZScore: number;
}

interface FactorSpread {
  factor: string;
  longLegReturn: number;
  shortLegReturn: number;
  spreadReturn: number;
  spreadVol: number;
  informationRatio: number;
}

interface CrowdingIndicator {
  factor: string;
  crowdingScore: number;
  shortInterestConcentration: number;
  turnoverRatio: number;
  valuationSpread: number;
  signal: 'crowded' | 'normal' | 'uncrowded';
}

interface FactorCorrelationMatrix {
  factors: string[];
  matrix: number[][];
}

interface StockMover {
  ticker: string;
  name: string;
  factorScore: number;
  dailyReturn: number;
  contribution: number;
}

interface TopFactorMovers {
  longSide: StockMover[];
  shortSide: StockMover[];
}

interface RegimeAnalysis {
  currentRegime: 'risk-on' | 'risk-off' | 'rotation' | 'compression';
  dominantFactor: string;
  worstFactor: string;
  regimeAge: number;
  regimeDescription: string;
}

interface EquityFactorMonitorData {
  timestamp: string;
  factorPerformance: FactorPerformance[];
  factorSpread: FactorSpread[];
  crowdingIndicators: CrowdingIndicator[];
  factorCorrelationMatrix: FactorCorrelationMatrix;
  topFactorMovers: TopFactorMovers;
  regimeAnalysis: RegimeAnalysis;
}

// ── Cache ──

const CACHE_TTL = 60 * 60 * 1000;
let cache: { data: EquityFactorMonitorData | null; ts: number } = { data: null, ts: 0 };

// ── Data Generation ──

function generate(): EquityFactorMonitorData {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-equity-factor-monitor'));

  // Base parameters per factor for realistic ranges
  const factorParams: Record<FactorName, { dailyBase: number; vol: number; ytdBias: number; crowdBias: number }> = {
    'Momentum':       { dailyBase: 0.15, vol: 18, ytdBias: 4.5, crowdBias: 65 },
    'Value':          { dailyBase: 0.08, vol: 14, ytdBias: 2.8, crowdBias: 45 },
    'Quality':        { dailyBase: 0.10, vol: 11, ytdBias: 3.2, crowdBias: 55 },
    'Size':           { dailyBase: 0.05, vol: 20, ytdBias: 1.5, crowdBias: 35 },
    'Low Vol':        { dailyBase: 0.03, vol: 8,  ytdBias: 2.0, crowdBias: 50 },
    'Growth':         { dailyBase: 0.12, vol: 22, ytdBias: 5.0, crowdBias: 70 },
    'Dividend Yield': { dailyBase: 0.04, vol: 10, ytdBias: 1.8, crowdBias: 40 },
  };

  // 1. Factor Performance
  const factorPerformance: FactorPerformance[] = FACTORS.map(factor => {
    const params = factorParams[factor];
    const g = gaussianFromUniform(rng);
    const dailyReturn = round2(params.dailyBase * g);
    const mtdReturn = round2(dailyReturn * (3 + rng() * 8) + gaussianFromUniform(rng) * 1.2);
    const ytdReturn = round2(params.ytdBias + gaussianFromUniform(rng) * params.vol * 0.3);
    const sharpe1Y = round2(0.3 + gaussianFromUniform(rng) * 0.8);
    const maxDrawdown1Y = round2(-(3 + rng() * params.vol * 0.8));
    const currentZScore = round2(gaussianFromUniform(rng) * 1.5);
    return { factor, dailyReturn, mtdReturn, ytdReturn, sharpe1Y, maxDrawdown1Y, currentZScore };
  });

  // 2. Factor Spread
  const factorSpread: FactorSpread[] = FACTORS.map(factor => {
    const params = factorParams[factor];
    const longLegReturn = round2(rng() * 2.5 - 0.5);
    const shortLegReturn = round2(rng() * 2.0 - 1.2);
    const spreadReturn = round2(longLegReturn - shortLegReturn);
    const spreadVol = round2(params.vol * (0.4 + rng() * 0.3));
    const informationRatio = spreadVol > 0 ? round2((spreadReturn * 12) / spreadVol) : 0;
    return { factor, longLegReturn, shortLegReturn, spreadReturn, spreadVol, informationRatio };
  });

  // 3. Crowding Indicators
  const crowdingIndicators: CrowdingIndicator[] = FACTORS.map(factor => {
    const params = factorParams[factor];
    const crowdingScore = Math.round(params.crowdBias + gaussianFromUniform(rng) * 15);
    const clampedScore = Math.max(0, Math.min(100, crowdingScore));
    const shortInterestConcentration = round2(15 + rng() * 35);
    const turnoverRatio = round2(0.5 + rng() * 2.5);
    const valuationSpread = round2(0.8 + rng() * 3.5);
    const signal: CrowdingIndicator['signal'] = clampedScore >= 70 ? 'crowded' : clampedScore <= 35 ? 'uncrowded' : 'normal';
    return { factor, crowdingScore: clampedScore, shortInterestConcentration, turnoverRatio, valuationSpread, signal };
  });

  // 4. Factor Correlation Matrix (7x7, symmetric, diag = 1)
  const rawCorr: number[][] = Array.from({ length: 7 }, () => Array(7).fill(0));
  for (let i = 0; i < 7; i++) {
    rawCorr[i][i] = 1.0;
    for (let j = i + 1; j < 7; j++) {
      const corr = round4(gaussianFromUniform(rng) * 0.4);
      const clamped = Math.max(-0.95, Math.min(0.95, corr));
      rawCorr[i][j] = round4(clamped);
      rawCorr[j][i] = round4(clamped);
    }
  }
  const factorCorrelationMatrix: FactorCorrelationMatrix = {
    factors: [...FACTORS],
    matrix: rawCorr,
  };

  // 5. Top Factor Movers (10 per side)
  const shuffledStocks = [...STOCK_UNIVERSE].sort(() => rng() - 0.5);
  const longSide: StockMover[] = shuffledStocks.slice(0, 10).map(s => ({
    ticker: s.ticker,
    name: s.name,
    factorScore: round2(1.5 + rng() * 2.5),
    dailyReturn: round2(0.3 + rng() * 3.5),
    contribution: round4(0.01 + rng() * 0.15),
  }));
  const shortSide: StockMover[] = shuffledStocks.slice(10, 20).map(s => ({
    ticker: s.ticker,
    name: s.name,
    factorScore: round2(-(1.5 + rng() * 2.5)),
    dailyReturn: round2(-(0.3 + rng() * 3.5)),
    contribution: round4(-(0.01 + rng() * 0.15)),
  }));
  // Sort by absolute contribution descending
  longSide.sort((a, b) => b.contribution - a.contribution);
  shortSide.sort((a, b) => a.contribution - b.contribution);
  const topFactorMovers: TopFactorMovers = { longSide, shortSide };

  // 6. Regime Analysis
  const sortedByYtd = [...factorPerformance].sort((a, b) => b.ytdReturn - a.ytdReturn);
  const dominantFactor = sortedByYtd[0].factor;
  const worstFactor = sortedByYtd[sortedByYtd.length - 1].factor;

  // Determine regime from factor dispersion
  const ytdValues = factorPerformance.map(f => f.ytdReturn);
  const avgYtd = ytdValues.reduce((a, b) => a + b, 0) / ytdValues.length;
  const dispersion = Math.sqrt(ytdValues.reduce((a, v) => a + (v - avgYtd) ** 2, 0) / ytdValues.length);

  const avgDaily = factorPerformance.reduce((a, f) => a + f.dailyReturn, 0) / factorPerformance.length;

  let currentRegime: RegimeAnalysis['currentRegime'];
  let regimeDescription: string;

  if (avgDaily > 0.05 && dispersion < 4) {
    currentRegime = 'risk-on';
    regimeDescription = `Broad factor strength with low dispersion (${round2(dispersion)}%). Most factors posting positive returns, indicating risk-seeking behavior across styles. ${dominantFactor} leads the advance.`;
  } else if (avgDaily < -0.05 && dispersion < 4) {
    currentRegime = 'risk-off';
    regimeDescription = `Broad factor weakness with compressed spreads. Defensive posture across styles. ${worstFactor} under heaviest pressure. Quality and Low Vol providing relative shelter.`;
  } else if (dispersion >= 4) {
    currentRegime = 'rotation';
    regimeDescription = `High inter-factor dispersion (${round2(dispersion)}%) signals active style rotation. ${dominantFactor} sharply outperforming ${worstFactor}. Consider pair positioning between leading and lagging factors.`;
  } else {
    currentRegime = 'compression';
    regimeDescription = `Factor returns converging with minimal differentiation. Dispersion at ${round2(dispersion)}%. Low conviction environment; spreads may widen as catalysts emerge. Monitor crowding signals for breakout direction.`;
  }

  const regimeAge = Math.floor(5 + rng() * 40);

  const regimeAnalysis: RegimeAnalysis = {
    currentRegime,
    dominantFactor,
    worstFactor,
    regimeAge,
    regimeDescription,
  };

  return {
    timestamp: new Date().toISOString(),
    factorPerformance,
    factorSpread,
    crowdingIndicators,
    factorCorrelationMatrix,
    topFactorMovers,
    regimeAnalysis,
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now - cache.ts < CACHE_TTL) {
      return res.json(cache.data);
    }
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[EquityFactorMonitor] Error:', (err as Error).message);
    if (cache.data) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate equity factor monitor data' });
  }
});

export default router;
