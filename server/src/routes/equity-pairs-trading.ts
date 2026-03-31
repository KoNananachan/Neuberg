import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

// ── Types ──

type Signal = 'BUY' | 'SELL' | 'NEUTRAL';

interface PairEntry {
  stockA: string;
  stockB: string;
  nameA: string;
  nameB: string;
  sector: string;
  correlation: number;
  cointegrationPValue: number;
  halfLife: number;
  currentZScore: number;
  signal: Signal;
}

interface SectorPairStats {
  sector: string;
  intraSectorPairs: number;
  avgIntraCorrelation: number;
  avgIntraCointegration: number;
  crossSectorPairs: number;
  avgCrossCorrelation: number;
  avgCrossCointegration: number;
}

interface SpreadPoint {
  date: string;
  spread: number;
  zScore: number;
}

interface SpreadHistory {
  stockA: string;
  stockB: string;
  points: SpreadPoint[];
}

interface BollingerLevels {
  stockA: string;
  stockB: string;
  mean: number;
  plus1Sigma: number;
  minus1Sigma: number;
  plus2Sigma: number;
  minus2Sigma: number;
  currentSpread: number;
}

interface MeanReversionSpeed {
  stockA: string;
  stockB: string;
  halfLifeDays: number;
  reversionRate: number;
  ouMu: number;
  ouSigma: number;
  ouTheta: number;
}

interface PairPnL {
  stockA: string;
  stockB: string;
  dailyPnL: number;
  weeklyPnL: number;
  monthlyPnL: number;
  ytdPnL: number;
  totalPnL: number;
  openPositionValue: number;
  tradesCount: number;
  avgHoldingDays: number;
}

interface PairRiskMetrics {
  stockA: string;
  stockB: string;
  maxDrawdownPct: number;
  sharpeRatio: number;
  winRatePct: number;
  avgWinPct: number;
  avgLossPct: number;
  profitFactor: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  volatilityAnnualPct: number;
  var95Pct: number;
}

interface EquityPairsTradingResponse {
  topPairs: PairEntry[];
  sectorPairs: SectorPairStats[];
  spreadHistory: SpreadHistory[];
  bollingerLevels: BollingerLevels[];
  meanReversionSpeed: MeanReversionSpeed[];
  pairPnL: PairPnL[];
  riskMetrics: PairRiskMetrics[];
  generatedAt: string;
}

// ── Stock universe ──

interface StockTemplate {
  ticker: string;
  name: string;
  sector: string;
  basePrice: number;
}

const STOCKS: StockTemplate[] = [
  // Technology
  { ticker: 'AAPL', name: 'Apple Inc', sector: 'Technology', basePrice: 178.5 },
  { ticker: 'MSFT', name: 'Microsoft Corp', sector: 'Technology', basePrice: 415.2 },
  { ticker: 'GOOGL', name: 'Alphabet Inc', sector: 'Technology', basePrice: 175.8 },
  { ticker: 'META', name: 'Meta Platforms', sector: 'Technology', basePrice: 505.3 },
  { ticker: 'NVDA', name: 'NVIDIA Corp', sector: 'Technology', basePrice: 875.4 },
  { ticker: 'CRM', name: 'Salesforce Inc', sector: 'Technology', basePrice: 298.7 },
  // Financials
  { ticker: 'JPM', name: 'JPMorgan Chase', sector: 'Financials', basePrice: 198.6 },
  { ticker: 'BAC', name: 'Bank of America', sector: 'Financials', basePrice: 37.8 },
  { ticker: 'GS', name: 'Goldman Sachs', sector: 'Financials', basePrice: 478.2 },
  { ticker: 'MS', name: 'Morgan Stanley', sector: 'Financials', basePrice: 97.4 },
  { ticker: 'C', name: 'Citigroup Inc', sector: 'Financials', basePrice: 58.3 },
  // Healthcare
  { ticker: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', basePrice: 158.4 },
  { ticker: 'UNH', name: 'UnitedHealth Group', sector: 'Healthcare', basePrice: 528.6 },
  { ticker: 'PFE', name: 'Pfizer Inc', sector: 'Healthcare', basePrice: 28.9 },
  { ticker: 'ABBV', name: 'AbbVie Inc', sector: 'Healthcare', basePrice: 181.3 },
  { ticker: 'MRK', name: 'Merck & Co', sector: 'Healthcare', basePrice: 128.7 },
  // Energy
  { ticker: 'XOM', name: 'Exxon Mobil', sector: 'Energy', basePrice: 104.5 },
  { ticker: 'CVX', name: 'Chevron Corp', sector: 'Energy', basePrice: 155.8 },
  { ticker: 'COP', name: 'ConocoPhillips', sector: 'Energy', basePrice: 118.2 },
  { ticker: 'SLB', name: 'Schlumberger', sector: 'Energy', basePrice: 52.4 },
  // Consumer
  { ticker: 'PG', name: 'Procter & Gamble', sector: 'Consumer Staples', basePrice: 162.3 },
  { ticker: 'KO', name: 'Coca-Cola Co', sector: 'Consumer Staples', basePrice: 60.8 },
  { ticker: 'PEP', name: 'PepsiCo Inc', sector: 'Consumer Staples', basePrice: 172.5 },
  { ticker: 'WMT', name: 'Walmart Inc', sector: 'Consumer Staples', basePrice: 168.4 },
  // Industrials
  { ticker: 'CAT', name: 'Caterpillar Inc', sector: 'Industrials', basePrice: 352.6 },
  { ticker: 'DE', name: 'Deere & Co', sector: 'Industrials', basePrice: 398.1 },
  { ticker: 'HON', name: 'Honeywell Intl', sector: 'Industrials', basePrice: 205.7 },
  { ticker: 'UNP', name: 'Union Pacific', sector: 'Industrials', basePrice: 248.3 },
];

// ── Pre-defined pair templates (ensures deterministic, realistic pairs) ──

interface PairTemplate {
  idxA: number;
  idxB: number;
  baseCorrelation: number;
  baseCointegration: number;
  baseHalfLife: number;
}

const PAIR_TEMPLATES: PairTemplate[] = [
  // Technology intra-sector
  { idxA: 0, idxB: 1, baseCorrelation: 0.88, baseCointegration: 0.02, baseHalfLife: 12 },  // AAPL/MSFT
  { idxA: 2, idxB: 3, baseCorrelation: 0.82, baseCointegration: 0.04, baseHalfLife: 15 },  // GOOGL/META
  { idxA: 0, idxB: 4, baseCorrelation: 0.75, baseCointegration: 0.08, baseHalfLife: 18 },  // AAPL/NVDA
  { idxA: 1, idxB: 5, baseCorrelation: 0.79, baseCointegration: 0.05, baseHalfLife: 14 },  // MSFT/CRM
  // Financials intra-sector
  { idxA: 6, idxB: 7, baseCorrelation: 0.91, baseCointegration: 0.01, baseHalfLife: 8 },   // JPM/BAC
  { idxA: 8, idxB: 9, baseCorrelation: 0.93, baseCointegration: 0.01, baseHalfLife: 7 },   // GS/MS
  { idxA: 6, idxB: 10, baseCorrelation: 0.87, baseCointegration: 0.03, baseHalfLife: 10 }, // JPM/C
  { idxA: 7, idxB: 10, baseCorrelation: 0.89, baseCointegration: 0.02, baseHalfLife: 9 },  // BAC/C
  // Healthcare intra-sector
  { idxA: 11, idxB: 14, baseCorrelation: 0.72, baseCointegration: 0.06, baseHalfLife: 20 }, // JNJ/MRK
  { idxA: 13, idxB: 14, baseCorrelation: 0.76, baseCointegration: 0.05, baseHalfLife: 16 }, // ABBV/MRK
  // Energy intra-sector
  { idxA: 16, idxB: 17, baseCorrelation: 0.94, baseCointegration: 0.01, baseHalfLife: 6 }, // XOM/CVX
  { idxA: 17, idxB: 18, baseCorrelation: 0.90, baseCointegration: 0.02, baseHalfLife: 9 }, // CVX/COP
  // Consumer intra-sector
  { idxA: 21, idxB: 22, baseCorrelation: 0.85, baseCointegration: 0.03, baseHalfLife: 11 }, // KO/PEP
  { idxA: 20, idxB: 23, baseCorrelation: 0.74, baseCointegration: 0.07, baseHalfLife: 19 }, // PG/WMT
  // Industrials intra-sector
  { idxA: 24, idxB: 25, baseCorrelation: 0.81, baseCointegration: 0.04, baseHalfLife: 14 }, // CAT/DE
  { idxA: 26, idxB: 27, baseCorrelation: 0.78, baseCointegration: 0.05, baseHalfLife: 16 }, // HON/UNP
  // Cross-sector pairs
  { idxA: 0, idxB: 6, baseCorrelation: 0.62, baseCointegration: 0.18, baseHalfLife: 28 },  // AAPL/JPM
  { idxA: 1, idxB: 12, baseCorrelation: 0.55, baseCointegration: 0.25, baseHalfLife: 35 }, // MSFT/UNH
  { idxA: 16, idxB: 24, baseCorrelation: 0.68, baseCointegration: 0.12, baseHalfLife: 22 }, // XOM/CAT
  { idxA: 20, idxB: 11, baseCorrelation: 0.58, baseCointegration: 0.22, baseHalfLife: 30 }, // PG/JNJ
];
let cache: { data: EquityPairsTradingResponse; ts: number } | null = null;

// ── Helpers ──

function r2(n: number): number { return Math.round(n * 100) / 100; }
function r4(n: number): number { return Math.round(n * 10000) / 10000; }

function formatDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function signalFromZScore(z: number): Signal {
  if (z > 2.0) return 'SELL';
  if (z < -2.0) return 'BUY';
  if (z > 1.5) return 'SELL';
  if (z < -1.5) return 'BUY';
  return 'NEUTRAL';
}

// ── Data generation ──

function generate(): EquityPairsTradingResponse {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('equity-pairs-trading-' + day));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // 1. Top pairs (20)
  const topPairs: PairEntry[] = PAIR_TEMPLATES.map(tmpl => {
    const stockA = STOCKS[tmpl.idxA];
    const stockB = STOCKS[tmpl.idxB];

    const correlation = r4(Math.min(0.99, Math.max(0.40, jitter(tmpl.baseCorrelation, 0.05))));
    const cointegrationPValue = r4(Math.min(0.50, Math.max(0.001, jitter(tmpl.baseCointegration, 0.25))));
    const halfLife = r2(Math.max(3, jitter(tmpl.baseHalfLife, 0.15)));

    // Z-score: usually between -3 and +3, with some clustering around 0
    const rawZ = (rng() - 0.5) * 2; // [-1, 1]
    const stretch = 1.0 + rng() * 2.5; // stretch factor
    const currentZScore = r2(rawZ * stretch);

    const signal = signalFromZScore(currentZScore);

    return {
      stockA: stockA.ticker,
      stockB: stockB.ticker,
      nameA: stockA.name,
      nameB: stockB.name,
      sector: stockA.sector === stockB.sector ? stockA.sector : `${stockA.sector} / ${stockB.sector}`,
      correlation,
      cointegrationPValue,
      halfLife,
      currentZScore,
      signal,
    };
  });

  // 2. Sector pairs analysis
  const sectors = [...new Set(STOCKS.map(s => s.sector))];
  const sectorPairs: SectorPairStats[] = sectors.map(sector => {
    const intraPairs = topPairs.filter(p => p.sector === sector);
    const crossPairs = topPairs.filter(p => p.sector.includes(sector) && p.sector.includes('/'));

    const intraSectorPairs = Math.max(intraPairs.length, Math.floor(3 + rng() * 8));
    const avgIntraCorrelation = r4(intraPairs.length > 0
      ? intraPairs.reduce((s, p) => s + p.correlation, 0) / intraPairs.length
      : 0.75 + rng() * 0.15);
    const avgIntraCointegration = r4(intraPairs.length > 0
      ? intraPairs.reduce((s, p) => s + p.cointegrationPValue, 0) / intraPairs.length
      : 0.02 + rng() * 0.08);

    const crossSectorPairs = Math.max(crossPairs.length, Math.floor(2 + rng() * 5));
    const avgCrossCorrelation = r4(crossPairs.length > 0
      ? crossPairs.reduce((s, p) => s + p.correlation, 0) / crossPairs.length
      : 0.45 + rng() * 0.20);
    const avgCrossCointegration = r4(crossPairs.length > 0
      ? crossPairs.reduce((s, p) => s + p.cointegrationPValue, 0) / crossPairs.length
      : 0.12 + rng() * 0.20);

    return {
      sector,
      intraSectorPairs,
      avgIntraCorrelation,
      avgIntraCointegration,
      crossSectorPairs,
      avgCrossCorrelation,
      avgCrossCointegration,
    };
  });

  // 3. Spread history (30 days for top 5 pairs)
  const spreadHistory: SpreadHistory[] = topPairs.slice(0, 5).map(pair => {
    const baseSpread = 50 + rng() * 150; // base spread level
    const spreadVol = 5 + rng() * 15; // daily spread volatility
    let currentSpread = baseSpread;

    const points: SpreadPoint[] = [];
    const today = new Date();

    for (let d = 29; d >= 0; d--) {
      const date = new Date(today);
      date.setDate(date.getDate() - d);

      // Mean-reverting random walk
      const meanReversion = (baseSpread - currentSpread) * 0.08;
      const shock = (rng() - 0.5) * 2 * spreadVol;
      currentSpread = currentSpread + meanReversion + shock;

      const zScore = r2((currentSpread - baseSpread) / spreadVol);

      points.push({
        date: formatDateStr(date),
        spread: r2(currentSpread),
        zScore,
      });
    }

    return {
      stockA: pair.stockA,
      stockB: pair.stockB,
      points,
    };
  });

  // 4. Bollinger band levels (for top 5 pairs)
  const bollingerLevels: BollingerLevels[] = spreadHistory.map((sh, idx) => {
    const spreads = sh.points.map(p => p.spread);
    const mean = r2(spreads.reduce((s, v) => s + v, 0) / spreads.length);
    const variance = spreads.reduce((s, v) => s + (v - mean) ** 2, 0) / spreads.length;
    const sigma = Math.sqrt(variance);
    const currentSpread = spreads[spreads.length - 1];

    return {
      stockA: sh.stockA,
      stockB: sh.stockB,
      mean,
      plus1Sigma: r2(mean + sigma),
      minus1Sigma: r2(mean - sigma),
      plus2Sigma: r2(mean + 2 * sigma),
      minus2Sigma: r2(mean - 2 * sigma),
      currentSpread: r2(currentSpread),
    };
  });

  // 5. Mean reversion speed
  const meanReversionSpeed: MeanReversionSpeed[] = topPairs.slice(0, 5).map(pair => {
    const halfLifeDays = r2(pair.halfLife);
    // Ornstein-Uhlenbeck parameters
    const ouTheta = r4(Math.log(2) / halfLifeDays); // reversion speed
    const ouMu = r2(50 + rng() * 150); // long-run mean
    const ouSigma = r4(0.5 + rng() * 2.0); // volatility of the process
    const reversionRate = r4(1 - Math.exp(-ouTheta)); // daily reversion rate

    return {
      stockA: pair.stockA,
      stockB: pair.stockB,
      halfLifeDays,
      reversionRate,
      ouMu,
      ouSigma,
      ouTheta,
    };
  });

  // 6. Pair P&L tracking (all 20 pairs)
  const pairPnL: PairPnL[] = topPairs.map(pair => {
    const isStrongPair = pair.correlation > 0.80 && pair.cointegrationPValue < 0.05;
    const basePnL = isStrongPair ? 8000 + rng() * 40000 : -5000 + rng() * 30000;

    const dailyPnL = r2((rng() - 0.45) * 5000); // slight positive bias
    const weeklyPnL = r2((rng() - 0.42) * 15000);
    const monthlyPnL = r2((rng() - 0.40) * 40000);
    const ytdPnL = r2(basePnL * (0.3 + rng() * 1.4));
    const totalPnL = r2(basePnL);
    const openPositionValue = r2(50000 + rng() * 450000);
    const tradesCount = Math.floor(15 + rng() * 85);
    const avgHoldingDays = r2(pair.halfLife * (0.8 + rng() * 0.8));

    return {
      stockA: pair.stockA,
      stockB: pair.stockB,
      dailyPnL,
      weeklyPnL,
      monthlyPnL,
      ytdPnL,
      totalPnL,
      openPositionValue,
      tradesCount,
      avgHoldingDays,
    };
  });

  // 7. Risk metrics (all 20 pairs)
  const riskMetrics: PairRiskMetrics[] = topPairs.map((pair, idx) => {
    const isStrongPair = pair.correlation > 0.80 && pair.cointegrationPValue < 0.05;

    const maxDrawdownPct = r2(isStrongPair ? 3.0 + rng() * 10.0 : 5.0 + rng() * 18.0);
    const sharpeRatio = r2(isStrongPair ? 0.8 + rng() * 2.0 : -0.3 + rng() * 2.0);
    const winRatePct = r2(isStrongPair ? 52 + rng() * 18 : 42 + rng() * 20);
    const avgWinPct = r2(1.5 + rng() * 3.5);
    const avgLossPct = r2(1.0 + rng() * 3.0);
    const profitFactor = r2(winRatePct > 50 ? 1.1 + rng() * 1.2 : 0.6 + rng() * 0.8);
    const maxConsecutiveWins = Math.floor(3 + rng() * 9);
    const maxConsecutiveLosses = Math.floor(2 + rng() * 7);
    const volatilityAnnualPct = r2(8 + rng() * 20);
    const var95Pct = r2(volatilityAnnualPct * 0.08 + rng() * 2.0);

    return {
      stockA: pair.stockA,
      stockB: pair.stockB,
      maxDrawdownPct,
      sharpeRatio,
      winRatePct,
      avgWinPct,
      avgLossPct,
      profitFactor,
      maxConsecutiveWins,
      maxConsecutiveLosses,
      volatilityAnnualPct,
      var95Pct,
    };
  });

  return {
    topPairs,
    sectorPairs,
    spreadHistory,
    bollingerLevels,
    meanReversionSpeed,
    pairPnL,
    riskMetrics,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[EquityPairsTrading] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(502).json({ error: 'Failed to generate equity pairs trading data' });
  }
});

export default router;
