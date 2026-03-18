import { Router } from 'express';
import { getQuotes, getHistory } from '../services/stocks/yahoo-finance.js';

const router = Router();

// In-memory cache (3 min TTL)
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 3 * 60_000;
function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return Promise.resolve(entry.data as T);
  return fn().then(data => { cache.set(key, { data, ts: Date.now() }); return data; });
}

// ── Symbol definitions ──

interface SymbolDef {
  symbol: string;
  name: string;
  category: 'equity' | 'bond' | 'fx' | 'volatility' | 'money_market';
}

const LIQUIDITY_SYMBOLS: SymbolDef[] = [
  // Equity liquidity
  { symbol: 'SPY', name: 'S&P 500 ETF', category: 'equity' },
  { symbol: 'QQQ', name: 'Nasdaq 100 ETF', category: 'equity' },
  { symbol: 'IWM', name: 'Russell 2000 ETF', category: 'equity' },
  // Bond liquidity
  { symbol: 'TLT', name: 'Long Treasury 20Y+', category: 'bond' },
  { symbol: 'HYG', name: 'High Yield Corp Bond', category: 'bond' },
  { symbol: 'LQD', name: 'IG Corp Bond', category: 'bond' },
  // Volatility
  { symbol: '^VIX', name: 'VIX Index', category: 'volatility' },
  // FX liquidity
  { symbol: 'FXE', name: 'Euro ETF', category: 'fx' },
  { symbol: 'FXY', name: 'Yen ETF', category: 'fx' },
  // Dollar liquidity
  { symbol: 'DX-Y.NYB', name: 'US Dollar Index', category: 'fx' },
  // Money market stress
  { symbol: 'SHY', name: 'Short Treasury 1-3Y', category: 'money_market' },
];

const ALL_SYMBOLS = LIQUIDITY_SYMBOLS.map(s => s.symbol);

// ── History bar type ──

interface HistoryBar {
  date: string | number;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
}

// ── Calculation helpers ──

function calcVolumeRatios(bars: HistoryBar[]): number[] {
  const valid = bars.filter(b => b.volume != null && b.volume > 0);
  if (valid.length < 5) return [];

  // Rolling 20-day average volume ratios for each day
  const ratios: number[] = [];
  for (let i = 0; i < valid.length; i++) {
    const lookback = valid.slice(Math.max(0, i - 19), i + 1);
    const avg = lookback.reduce((s, b) => s + (b.volume ?? 0), 0) / lookback.length;
    ratios.push(avg > 0 ? (valid[i].volume ?? 0) / avg : 1);
  }
  return ratios;
}

function calcCurrentVolumeRatio(bars: HistoryBar[]): number {
  const valid = bars.filter(b => b.volume != null && b.volume > 0);
  if (valid.length < 5) return 1;

  const last = valid[valid.length - 1].volume ?? 0;
  const avg20 = valid.slice(-20).reduce((s, b) => s + (b.volume ?? 0), 0) / Math.min(valid.length, 20);
  return avg20 > 0 ? last / avg20 : 1;
}

function calcSpreadProxy(bars: HistoryBar[]): number[] {
  // Parkinson estimator: (high - low) / close
  return bars
    .filter(b => b.high != null && b.low != null && b.close != null && b.close > 0)
    .map(b => (b.high! - b.low!) / b.close!);
}

function calcCurrentSpreadProxy(bars: HistoryBar[]): number {
  const valid = bars.filter(b => b.high != null && b.low != null && b.close != null && b.close > 0);
  if (valid.length === 0) return 0;
  const last = valid[valid.length - 1];
  return (last.high! - last.low!) / last.close!;
}

function calcRealizedVol5d(bars: HistoryBar[]): number {
  const valid = bars.filter(b => b.close != null && b.close > 0);
  if (valid.length < 6) return 0;

  const recent = valid.slice(-6); // need 6 bars for 5 returns
  const returns: number[] = [];
  for (let i = 1; i < recent.length; i++) {
    returns.push(Math.log(recent[i].close! / recent[i - 1].close!));
  }

  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1);
  // Annualized vol
  return Math.sqrt(variance * 252) * 100;
}

function calcVolumeTrend(bars: HistoryBar[]): 'rising' | 'stable' | 'falling' {
  const valid = bars.filter(b => b.volume != null && b.volume > 0);
  if (valid.length < 10) return 'stable';

  const recent5 = valid.slice(-5).reduce((s, b) => s + (b.volume ?? 0), 0) / 5;
  const prev5 = valid.slice(-10, -5).reduce((s, b) => s + (b.volume ?? 0), 0) / 5;

  if (prev5 === 0) return 'stable';
  const change = (recent5 - prev5) / prev5;

  if (change > 0.15) return 'rising';
  if (change < -0.15) return 'falling';
  return 'stable';
}

type LiquidityGrade = 'A' | 'B' | 'C' | 'D' | 'F';

function gradeLiquidity(volumeRatio: number, spreadProxy: number, realizedVol: number): LiquidityGrade {
  // Score components: high volume = good, low spread = good, low vol = good
  let score = 0;

  // Volume component (0-40)
  if (volumeRatio >= 1.3) score += 40;
  else if (volumeRatio >= 1.0) score += 30;
  else if (volumeRatio >= 0.7) score += 20;
  else if (volumeRatio >= 0.4) score += 10;

  // Spread component (0-30) - lower is better
  if (spreadProxy < 0.005) score += 30;
  else if (spreadProxy < 0.01) score += 25;
  else if (spreadProxy < 0.02) score += 15;
  else if (spreadProxy < 0.03) score += 5;

  // Volatility component (0-30) - lower is better
  if (realizedVol < 10) score += 30;
  else if (realizedVol < 20) score += 25;
  else if (realizedVol < 30) score += 15;
  else if (realizedVol < 50) score += 5;

  if (score >= 80) return 'A';
  if (score >= 60) return 'B';
  if (score >= 40) return 'C';
  if (score >= 20) return 'D';
  return 'F';
}

function gradeToScore(grade: LiquidityGrade): number {
  switch (grade) {
    case 'A': return 90;
    case 'B': return 70;
    case 'C': return 50;
    case 'D': return 30;
    case 'F': return 10;
  }
}

type LiquidityLevel = 'abundant' | 'normal' | 'tightening' | 'stressed' | 'crisis';

function scoreToLevel(score: number): LiquidityLevel {
  if (score >= 80) return 'abundant';
  if (score >= 60) return 'normal';
  if (score >= 40) return 'tightening';
  if (score >= 20) return 'stressed';
  return 'crisis';
}

// ── Composite score calculation ──

interface IndicatorResult {
  name: string;
  symbol: string;
  category: 'equity' | 'bond' | 'fx' | 'volatility' | 'money_market';
  volumeRatio: number;
  spreadProxy: number;
  realizedVol5d: number;
  volumeTrend: 'rising' | 'stable' | 'falling';
  liquidityGrade: LiquidityGrade;
  sparklineVolume: number[];
  sparklineSpread: number[];
}

function buildCompositeScore(indicators: IndicatorResult[]): {
  composite: number;
  equity: number;
  bond: number;
  fx: number;
  moneyMarket: number;
} {
  // Group by category
  const groups: Record<string, IndicatorResult[]> = {
    equity: [],
    bond: [],
    fx: [],
    volatility: [],
    money_market: [],
  };
  for (const ind of indicators) {
    groups[ind.category]?.push(ind);
  }

  function categoryScore(items: IndicatorResult[]): number {
    if (items.length === 0) return 50;
    return items.reduce((s, i) => s + gradeToScore(i.liquidityGrade), 0) / items.length;
  }

  const equityScore = categoryScore(groups.equity);
  const bondScore = categoryScore(groups.bond);
  const fxScore = categoryScore(groups.fx);

  // VIX special handling: high VIX = low liquidity
  let volScore = 50;
  const vixInd = groups.volatility.find(i => i.symbol === '^VIX');
  if (vixInd) {
    // Invert: high spread proxy (range) and vol = low liquidity
    const vixLevel = vixInd.spreadProxy * 100; // approximate VIX-like value
    volScore = Math.max(0, Math.min(100, 100 - vixLevel * 2));
    // Better: use realized vol to approximate
    volScore = Math.max(0, Math.min(100, 100 - vixInd.realizedVol5d));
  }

  const mmScore = categoryScore(groups.money_market);

  // Weighted composite: equity 40%, bond 25%, vol 15%, fx 10%, money market 10%
  const composite = Math.round(
    equityScore * 0.40 +
    bondScore * 0.25 +
    volScore * 0.15 +
    fxScore * 0.10 +
    mmScore * 0.10
  );

  return {
    composite: Math.max(0, Math.min(100, composite)),
    equity: Math.round(equityScore),
    bond: Math.round(bondScore),
    fx: Math.round(fxScore),
    moneyMarket: Math.round(mmScore),
  };
}

// ── Build daily composite history (last 20 trading days) ──

function buildDailyHistory(allHistories: Map<string, HistoryBar[]>, symbols: SymbolDef[]): Array<{
  date: string;
  composite: number;
  equity: number;
  bond: number;
}> {
  // Find common dates from the first symbol with data
  const firstHist = [...allHistories.values()].find(h => h.length > 0);
  if (!firstHist) return [];

  const dates = firstHist
    .filter(b => b.close != null)
    .slice(-20)
    .map(b => String(b.date));

  return dates.map((date, dateIdx) => {
    const dayIndicators: IndicatorResult[] = [];

    for (const sym of symbols) {
      const hist = allHistories.get(sym.symbol);
      if (!hist || hist.length < 5) continue;

      // Find bars up to this date
      const idx = hist.findIndex(b => String(b.date) === date);
      if (idx < 5) continue;

      const barsUpToDate = hist.slice(0, idx + 1);
      const volRatio = calcCurrentVolumeRatio(barsUpToDate);
      const spread = calcCurrentSpreadProxy(barsUpToDate);
      const realVol = calcRealizedVol5d(barsUpToDate);

      dayIndicators.push({
        name: sym.name,
        symbol: sym.symbol,
        category: sym.category,
        volumeRatio: volRatio,
        spreadProxy: spread,
        realizedVol5d: realVol,
        volumeTrend: 'stable',
        liquidityGrade: gradeLiquidity(volRatio, spread, realVol),
        sparklineVolume: [],
        sparklineSpread: [],
      });
    }

    const scores = buildCompositeScore(dayIndicators);
    return {
      date,
      composite: scores.composite,
      equity: scores.equity,
      bond: scores.bond,
    };
  });
}

// ── Generate alerts ──

function generateAlerts(indicators: IndicatorResult[], composite: number, level: LiquidityLevel): string[] {
  const alerts: string[] = [];

  if (level === 'crisis') {
    alerts.push('CRITICAL: Composite liquidity at crisis levels');
  } else if (level === 'stressed') {
    alerts.push('WARNING: Market-wide liquidity stress detected');
  }

  // Check for individual F-grade indicators
  const failingIndicators = indicators.filter(i => i.liquidityGrade === 'F');
  if (failingIndicators.length > 0) {
    alerts.push(`Severe illiquidity in: ${failingIndicators.map(i => i.symbol).join(', ')}`);
  }

  // Volume collapse
  const lowVol = indicators.filter(i => i.volumeRatio < 0.4 && i.category === 'equity');
  if (lowVol.length > 0) {
    alerts.push(`Equity volume collapse: ${lowVol.map(i => i.symbol).join(', ')} below 40% avg`);
  }

  // High spread proxies in bonds
  const wideBondSpreads = indicators.filter(i => i.category === 'bond' && i.spreadProxy > 0.02);
  if (wideBondSpreads.length > 0) {
    alerts.push(`Bond spread widening: ${wideBondSpreads.map(i => i.symbol).join(', ')}`);
  }

  // VIX spike
  const vix = indicators.find(i => i.symbol === '^VIX');
  if (vix && vix.realizedVol5d > 80) {
    alerts.push('VIX volatility-of-volatility elevated');
  }

  // HYG/LQD volume divergence (credit stress)
  const hyg = indicators.find(i => i.symbol === 'HYG');
  const lqd = indicators.find(i => i.symbol === 'LQD');
  if (hyg && lqd && hyg.volumeRatio > 0 && lqd.volumeRatio > 0) {
    const creditRatio = hyg.volumeRatio / lqd.volumeRatio;
    if (creditRatio > 2.0) {
      alerts.push('Credit stress signal: HYG volume significantly elevated vs LQD');
    }
  }

  return alerts;
}

// ── Route handler ──

router.get('/', async (_req, res) => {
  try {
    const result = await cached('liquidity', async () => {
      // Fetch quotes and 30-day histories in parallel
      const [quotes, ...histories] = await Promise.all([
        getQuotes(ALL_SYMBOLS),
        ...ALL_SYMBOLS.map(symbol => getHistory(symbol, { range: '1mo', interval: '1d' })),
      ]);

      const quoteMap = new Map(quotes.map((q: { symbol: string }) => [q.symbol, q]));
      const historyMap = new Map<string, HistoryBar[]>();
      ALL_SYMBOLS.forEach((sym, i) => {
        historyMap.set(sym, histories[i] as HistoryBar[]);
      });

      // Build indicators for each symbol
      const indicators: IndicatorResult[] = LIQUIDITY_SYMBOLS.map(def => {
        const hist = historyMap.get(def.symbol) ?? [];
        const volumeRatios = calcVolumeRatios(hist);
        const spreadProxies = calcSpreadProxy(hist);

        const volumeRatio = Math.round(calcCurrentVolumeRatio(hist) * 100) / 100;
        const spreadProxy = Math.round(calcCurrentSpreadProxy(hist) * 10000) / 10000;
        const realizedVol5d = Math.round(calcRealizedVol5d(hist) * 100) / 100;
        const volumeTrend = calcVolumeTrend(hist);
        const liquidityGrade = gradeLiquidity(volumeRatio, spreadProxy, realizedVol5d);

        // Sparklines: last 20 values
        const sparklineVolume = volumeRatios.slice(-20).map(v => Math.round(v * 100) / 100);
        while (sparklineVolume.length < 20) sparklineVolume.unshift(1);

        const sparklineSpread = spreadProxies.slice(-20).map(v => Math.round(v * 10000) / 10000);
        while (sparklineSpread.length < 20) sparklineSpread.unshift(0);

        return {
          name: def.name,
          symbol: def.symbol,
          category: def.category,
          volumeRatio,
          spreadProxy,
          realizedVol5d,
          volumeTrend,
          liquidityGrade,
          sparklineVolume,
          sparklineSpread,
        };
      });

      // Build composite scores
      const scores = buildCompositeScore(indicators);
      const level = scoreToLevel(scores.composite);

      // Build 20-day history
      const history = buildDailyHistory(historyMap, LIQUIDITY_SYMBOLS);

      // Generate alerts
      const alerts = generateAlerts(indicators, scores.composite, level);

      return {
        timestamp: new Date().toISOString(),
        compositeScore: scores.composite,
        level,
        indicators,
        crossMarket: {
          equityLiquidity: scores.equity,
          bondLiquidity: scores.bond,
          fxLiquidity: scores.fx,
          moneyMarket: scores.moneyMarket,
        },
        history,
        alerts,
      };
    });

    res.json(result);
  } catch (err) {
    console.error('[Liquidity] Error fetching liquidity data:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Failed to fetch liquidity data' });
  }
});

export default router;
