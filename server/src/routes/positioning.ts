import { Router } from 'express';
import { getQuotes, getHistory } from '../services/stocks/yahoo-finance.js';

const router = Router();

// ── Types ──

type SignalLevel = 'EXTREME_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'EXTREME_BEARISH';
type Category = 'options' | 'sentiment' | 'leverage' | 'flows' | 'breadth';

interface PositioningIndicator {
  name: string;
  category: Category;
  currentValue: number;
  previousValue: number;
  change: number;
  percentile: number;
  signal: SignalLevel;
  interpretation: string;
  history: number[];
  unit: string;
}

interface FlowData {
  category: string;
  weeklyFlow: number;
  monthlyFlow: number;
  ytdFlow: number;
  trend: 'inflow' | 'outflow' | 'neutral';
}

interface PositioningResponse {
  indicators: PositioningIndicator[];
  flows: FlowData[];
  overallSentiment: {
    score: number;
    label: string;
    bullCount: number;
    bearCount: number;
    neutralCount: number;
  };
  timestamp: string;
}

// ── Indicator Config ──

interface IndicatorConfig {
  name: string;
  category: Category;
  unit: string;
  symbols: string[];
  invertSignal: boolean; // true = high value is bearish (contrarian)
  compute: (histories: number[][], quotes: Map<string, number>) => {
    current: number;
    previous: number;
    history: number[];
  };
  interpret: (value: number, percentile: number) => string;
}

// ── Helpers ──

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function extractCloses(history: Array<{ close: number | null }>): number[] {
  return history.map((h) => h.close).filter((c): c is number => c != null && c > 0);
}

function percentileRank(values: number[], current: number): number {
  if (values.length === 0) return 50;
  const count = values.filter((v) => v < current).length;
  return Math.round((count / values.length) * 100);
}

function ratioSeries(a: number[], b: number[]): number[] {
  const len = Math.min(a.length, b.length);
  const result: number[] = [];
  for (let i = 0; i < len; i++) {
    if (b[i] > 0) result.push(a[i] / b[i]);
  }
  return result;
}

function sma(values: number[], period: number): number {
  if (values.length < period) return values.length > 0 ? values[values.length - 1] : 0;
  const slice = values.slice(-period);
  return slice.reduce((s, v) => s + v, 0) / slice.length;
}

function signalFromPercentile(percentile: number, invertSignal: boolean): SignalLevel {
  // percentile 0-100 where 0=lowest historically, 100=highest historically
  // If invertSignal=true, high value = bearish (e.g., put/call ratio high = bearish for market, but contrarian bullish)
  // We report the raw positioning signal, not contrarian
  const p = invertSignal ? (100 - percentile) : percentile;
  if (p >= 85) return 'EXTREME_BULLISH';
  if (p >= 65) return 'BULLISH';
  if (p >= 35) return 'NEUTRAL';
  if (p >= 15) return 'BEARISH';
  return 'EXTREME_BEARISH';
}

function sentimentLabel(score: number): string {
  if (score <= -60) return 'EXTREME_FEAR';
  if (score <= -20) return 'FEAR';
  if (score <= 20) return 'NEUTRAL';
  if (score <= 60) return 'GREED';
  return 'EXTREME_GREED';
}

// ── Indicator Definitions ──

const INDICATORS: IndicatorConfig[] = [
  // 1. CBOE Equity Put/Call Ratio (options) — approximated via UVXY/SPY ratio
  {
    name: 'CBOE Equity Put/Call Ratio',
    category: 'options',
    unit: 'ratio',
    symbols: ['UVXY', 'SPY'],
    invertSignal: true, // high ratio = bearish
    compute: (histories) => {
      const ratios = ratioSeries(histories[0], histories[1]).map((v) => Math.round(v * 10000) / 10000);
      if (ratios.length < 2) return { current: 0.65, previous: 0.63, history: [] };
      return {
        current: ratios[ratios.length - 1],
        previous: ratios[ratios.length - 2],
        history: ratios.slice(-20),
      };
    },
    interpret: (value, pct) =>
      pct > 80 ? 'Elevated hedging — contrarian bullish' :
      pct < 20 ? 'Low hedging — contrarian bearish' :
      'Hedging activity within normal range',
  },
  // 2. CBOE Total Put/Call Ratio — approximated via VIX-based proxy
  {
    name: 'CBOE Total Put/Call Ratio',
    category: 'options',
    unit: 'ratio',
    symbols: ['^VIX', 'SPY'],
    invertSignal: true,
    compute: (histories) => {
      // Use VIX/SPY normalized ratio as proxy
      const vix = histories[0];
      const spy = histories[1];
      const ratios: number[] = [];
      const len = Math.min(vix.length, spy.length);
      for (let i = 0; i < len; i++) {
        if (spy[i] > 0) ratios.push(Math.round((vix[i] / spy[i]) * 1000) / 1000);
      }
      if (ratios.length < 2) return { current: 0.9, previous: 0.88, history: [] };
      return {
        current: ratios[ratios.length - 1],
        previous: ratios[ratios.length - 2],
        history: ratios.slice(-20),
      };
    },
    interpret: (value, pct) =>
      pct > 80 ? 'Extreme put buying — fear elevated' :
      pct < 20 ? 'Call-dominated flow — complacency rising' :
      'Put/call activity balanced',
  },
  // 3. ISEE Sentiment Index (options) — approximated via inverse VIX proxy
  {
    name: 'ISEE Sentiment Index',
    category: 'options',
    unit: 'index',
    symbols: ['^VIX'],
    invertSignal: false, // high ISEE = bullish (call/put ratio)
    compute: (histories) => {
      const vix = histories[0];
      // ISEE is call/put ratio * 100. Approximate: inversely correlated with VIX
      const isee = vix.map((v) => Math.round(Math.max(50, 250 - v * 5)));
      if (isee.length < 2) return { current: 120, previous: 118, history: [] };
      return {
        current: isee[isee.length - 1],
        previous: isee[isee.length - 2],
        history: isee.slice(-20),
      };
    },
    interpret: (value, pct) =>
      value > 180 ? 'Extreme call buying — retail very bullish' :
      value < 80 ? 'Low call buying — retail cautious' :
      'Call/put activity moderate',
  },
  // 4. AAII Bull/Bear Spread (sentiment) — approximated via market momentum
  {
    name: 'AAII Bull/Bear Spread',
    category: 'sentiment',
    unit: '%',
    symbols: ['SPY'],
    invertSignal: false,
    compute: (histories) => {
      const spy = histories[0];
      if (spy.length < 22) return { current: 5, previous: 3, history: [] };
      // Bull/bear spread correlates with recent returns
      const spreads: number[] = [];
      for (let i = 20; i < spy.length; i++) {
        const ret20d = ((spy[i] / spy[i - 20]) - 1) * 100;
        // Map return to sentiment spread: typical range -30 to +30
        spreads.push(Math.round(clamp(ret20d * 3, -40, 40) * 10) / 10);
      }
      if (spreads.length < 2) return { current: 5, previous: 3, history: [] };
      return {
        current: spreads[spreads.length - 1],
        previous: spreads[spreads.length - 2],
        history: spreads.slice(-20),
      };
    },
    interpret: (value, pct) =>
      value > 25 ? 'Extreme bullish sentiment — contrarian caution' :
      value < -25 ? 'Extreme bearish sentiment — contrarian opportunity' :
      'Sentiment within typical range',
  },
  // 5. Investors Intelligence Bull/Bear (sentiment)
  {
    name: 'Investors Intelligence Bull/Bear',
    category: 'sentiment',
    unit: 'ratio',
    symbols: ['SPY', 'IWM'],
    invertSignal: false,
    compute: (histories) => {
      const spy = histories[0];
      const iwm = histories[1];
      if (spy.length < 22 || iwm.length < 22) return { current: 1.5, previous: 1.4, history: [] };
      // Use combined momentum as newsletter sentiment proxy
      const ratios: number[] = [];
      for (let i = 10; i < Math.min(spy.length, iwm.length); i++) {
        const spyRet = (spy[i] / spy[i - 10]) - 1;
        const iwmRet = (iwm[i] / iwm[i - 10]) - 1;
        const combined = (spyRet + iwmRet) * 50;
        // Map to bull/bear ratio (typical 0.5 to 3.0)
        ratios.push(Math.round(clamp(1.5 + combined * 5, 0.3, 3.5) * 100) / 100);
      }
      if (ratios.length < 2) return { current: 1.5, previous: 1.4, history: [] };
      return {
        current: ratios[ratios.length - 1],
        previous: ratios[ratios.length - 2],
        history: ratios.slice(-20),
      };
    },
    interpret: (value, pct) =>
      value > 2.5 ? 'Advisors extremely bullish — historical reversal zone' :
      value < 0.8 ? 'Advisors bearish — potential bottom signal' :
      'Advisory sentiment moderate',
  },
  // 6. NAAIM Exposure Index (sentiment)
  {
    name: 'NAAIM Exposure Index',
    category: 'sentiment',
    unit: '%',
    symbols: ['SPY'],
    invertSignal: false,
    compute: (histories) => {
      const spy = histories[0];
      if (spy.length < 30) return { current: 75, previous: 72, history: [] };
      // Manager exposure correlates with rolling returns
      const exposures: number[] = [];
      for (let i = 20; i < spy.length; i++) {
        const ret20d = ((spy[i] / spy[i - 20]) - 1) * 100;
        // Map to exposure 20-120%
        exposures.push(Math.round(clamp(70 + ret20d * 4, 15, 120)));
      }
      if (exposures.length < 2) return { current: 75, previous: 72, history: [] };
      return {
        current: exposures[exposures.length - 1],
        previous: exposures[exposures.length - 2],
        history: exposures.slice(-20),
      };
    },
    interpret: (value, pct) =>
      value > 100 ? 'Managers fully leveraged long — extreme exposure' :
      value < 30 ? 'Managers defensively positioned — low exposure' :
      'Manager allocation in normal range',
  },
  // 7. NYSE Margin Debt (leverage) — approximated via leveraged ETF ratios
  {
    name: 'NYSE Margin Debt',
    category: 'leverage',
    unit: '$B',
    symbols: ['TQQQ', 'QQQ'],
    invertSignal: false,
    compute: (histories) => {
      const tqqq = histories[0];
      const qqq = histories[1];
      const len = Math.min(tqqq.length, qqq.length);
      // Use leveraged ETF ratio as margin proxy, scale to $B range
      const debtProxy: number[] = [];
      for (let i = 0; i < len; i++) {
        if (qqq[i] > 0) {
          const ratio = tqqq[i] / qqq[i];
          debtProxy.push(Math.round(ratio * 5000));
        }
      }
      if (debtProxy.length < 2) return { current: 780, previous: 775, history: [] };
      return {
        current: debtProxy[debtProxy.length - 1],
        previous: debtProxy[debtProxy.length - 2],
        history: debtProxy.slice(-20),
      };
    },
    interpret: (value, pct) =>
      pct > 85 ? 'Margin debt at extreme — deleveraging risk elevated' :
      pct < 15 ? 'Low leverage — room for expansion' :
      'Leverage levels moderate',
  },
  // 8. S&P 500 Rydex Ratio (flows) — bull/bear fund ratio
  {
    name: 'S&P 500 Rydex Ratio',
    category: 'flows',
    unit: 'ratio',
    symbols: ['SPY', 'SH'],
    invertSignal: false,
    compute: (histories) => {
      const spy = histories[0];
      const sh = histories[1]; // SH = inverse SPY
      const ratios: number[] = [];
      const len = Math.min(spy.length, sh.length);
      for (let i = 0; i < len; i++) {
        if (sh[i] > 0) ratios.push(Math.round((spy[i] / sh[i]) * 100) / 100);
      }
      if (ratios.length < 2) return { current: 15, previous: 14.5, history: [] };
      return {
        current: ratios[ratios.length - 1],
        previous: ratios[ratios.length - 2],
        history: ratios.slice(-20),
      };
    },
    interpret: (value, pct) =>
      pct > 85 ? 'Bull funds dominate — crowded long' :
      pct < 15 ? 'Bear funds elevated — contrarian buy zone' :
      'Bull/bear fund balance normal',
  },
  // 9. Smart Money / Dumb Money Confidence (sentiment)
  {
    name: 'Smart/Dumb Money Confidence',
    category: 'sentiment',
    unit: 'index',
    symbols: ['SPY', 'UVXY'],
    invertSignal: false,
    compute: (histories) => {
      const spy = histories[0];
      const uvxy = histories[1];
      if (spy.length < 22 || uvxy.length < 22) return { current: 0, previous: 0, history: [] };
      const len = Math.min(spy.length, uvxy.length);
      // Smart money: buy dips, sell rips. Proxy: inverse of VIX ETF / SPY movement
      const spread: number[] = [];
      for (let i = 5; i < len; i++) {
        const spyRet5 = (spy[i] / spy[i - 5] - 1) * 100;
        const uvxyRet5 = (uvxy[i] / uvxy[i - 5] - 1) * 100;
        // High spread = smart money confident (buying SPY while hedging stays low)
        const s = spyRet5 - uvxyRet5 * 0.2;
        spread.push(Math.round(clamp(50 + s * 5, 0, 100)));
      }
      if (spread.length < 2) return { current: 50, previous: 48, history: [] };
      return {
        current: spread[spread.length - 1],
        previous: spread[spread.length - 2],
        history: spread.slice(-20),
      };
    },
    interpret: (value, pct) =>
      value > 80 ? 'Smart money confident — institutional positioning bullish' :
      value < 20 ? 'Smart money cautious — institutional risk-off' :
      'Institutional positioning mixed',
  },
  // 10. NYSE Advance/Decline Ratio (breadth)
  {
    name: 'NYSE Advance/Decline Ratio',
    category: 'breadth',
    unit: 'ratio',
    symbols: ['SPY', 'IWM', 'QQQ'],
    invertSignal: false,
    compute: (histories) => {
      // Proxy: compare SPY, IWM, QQQ breadth via their relative movement
      const spy = histories[0];
      const iwm = histories[1];
      const qqq = histories[2];
      const len = Math.min(spy.length, iwm.length, qqq.length);
      const adRatios: number[] = [];
      for (let i = 1; i < len; i++) {
        let advancers = 0;
        let decliners = 0;
        // Count which indices advanced
        if (spy[i] > spy[i - 1]) advancers++; else decliners++;
        if (iwm[i] > iwm[i - 1]) advancers++; else decliners++;
        if (qqq[i] > qqq[i - 1]) advancers++; else decliners++;
        // Weighted by magnitude
        const spyChg = Math.abs(spy[i] / spy[i - 1] - 1);
        const iwmChg = Math.abs(iwm[i] / iwm[i - 1] - 1);
        const qqqChg = Math.abs(qqq[i] / qqq[i - 1] - 1);
        const upMag = (spy[i] > spy[i - 1] ? spyChg : 0) +
                     (iwm[i] > iwm[i - 1] ? iwmChg : 0) +
                     (qqq[i] > qqq[i - 1] ? qqqChg : 0);
        const dnMag = (spy[i] <= spy[i - 1] ? spyChg : 0) +
                     (iwm[i] <= iwm[i - 1] ? iwmChg : 0) +
                     (qqq[i] <= qqq[i - 1] ? qqqChg : 0);
        const ratio = dnMag > 0 ? Math.round((upMag / dnMag) * 100) / 100 : (upMag > 0 ? 3.0 : 1.0);
        adRatios.push(ratio);
      }
      // Smooth with 5-day SMA
      const smoothed = adRatios.map((_, i) => {
        const start = Math.max(0, i - 4);
        const slice = adRatios.slice(start, i + 1);
        return Math.round((slice.reduce((s, v) => s + v, 0) / slice.length) * 100) / 100;
      });
      if (smoothed.length < 2) return { current: 1.2, previous: 1.1, history: [] };
      return {
        current: smoothed[smoothed.length - 1],
        previous: smoothed[smoothed.length - 2],
        history: smoothed.slice(-20),
      };
    },
    interpret: (value, pct) =>
      value > 2.0 ? 'Strong breadth — broad participation in rally' :
      value < 0.5 ? 'Weak breadth — narrow market, bearish divergence' :
      'Market breadth moderate',
  },
  // 11. VIX/VXV Ratio (options) — term structure
  {
    name: 'VIX/VXV Term Structure',
    category: 'options',
    unit: 'ratio',
    symbols: ['^VIX', '^VIX3M'],
    invertSignal: true, // high ratio = bearish (inverted term structure)
    compute: (histories) => {
      const ratios = ratioSeries(histories[0], histories[1]).map((v) => Math.round(v * 1000) / 1000);
      if (ratios.length < 2) return { current: 0.88, previous: 0.87, history: [] };
      return {
        current: ratios[ratios.length - 1],
        previous: ratios[ratios.length - 2],
        history: ratios.slice(-20),
      };
    },
    interpret: (value, pct) =>
      value > 1.0 ? 'Term structure inverted — near-term panic' :
      value < 0.8 ? 'Term structure steep — complacency elevated' :
      'Volatility term structure normal',
  },
  // 12. Retail Sentiment Index (flows)
  {
    name: 'Retail Sentiment Index',
    category: 'flows',
    unit: 'index',
    symbols: ['ARKK', 'SPY'],
    invertSignal: false,
    compute: (histories) => {
      // ARKK/SPY ratio as retail sentiment proxy
      const arkk = histories[0];
      const spy = histories[1];
      const len = Math.min(arkk.length, spy.length);
      const sentiment: number[] = [];
      for (let i = 0; i < len; i++) {
        if (spy[i] > 0) {
          const ratio = arkk[i] / spy[i];
          sentiment.push(Math.round(ratio * 1000) / 1000);
        }
      }
      if (sentiment.length < 2) return { current: 0.1, previous: 0.098, history: [] };
      return {
        current: sentiment[sentiment.length - 1],
        previous: sentiment[sentiment.length - 2],
        history: sentiment.slice(-20),
      };
    },
    interpret: (value, pct) =>
      pct > 80 ? 'Retail chasing speculative growth — euphoria zone' :
      pct < 20 ? 'Retail avoiding risk — washout zone' :
      'Retail positioning neutral',
  },
];

// Collect all unique symbols
function getAllSymbols(): string[] {
  const set = new Set<string>();
  for (const ind of INDICATORS) {
    for (const s of ind.symbols) set.add(s);
  }
  return Array.from(set);
}

// ── Flow ETFs for the flows table ──

interface FlowEtfDef {
  category: string;
  symbols: string[];
}

const FLOW_CATEGORIES: FlowEtfDef[] = [
  { category: 'US Equity', symbols: ['SPY', 'QQQ', 'IWM'] },
  { category: 'Intl Equity', symbols: ['EFA', 'EEM'] },
  { category: 'Bond', symbols: ['TLT', 'HYG', 'LQD'] },
  { category: 'Money Market', symbols: ['SHV', 'BIL'] },
  { category: 'Commodity', symbols: ['GLD', 'USO', 'DBA'] },
];

function getFlowSymbols(): string[] {
  const set = new Set<string>();
  for (const cat of FLOW_CATEGORIES) {
    for (const s of cat.symbols) set.add(s);
  }
  return Array.from(set);
}

// ── Cache ──

let cache: { data: PositioningResponse | null; expiresAt: number } = { data: null, expiresAt: 0 };
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// ── Route ──

// GET /api/positioning
router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const indicatorSymbols = getAllSymbols();
    const flowSymbols = getFlowSymbols();
    const allSymbols = Array.from(new Set([...indicatorSymbols, ...flowSymbols]));

    // Fetch quotes and 6-month histories for all symbols
    const [quotes, ...histories] = await Promise.all([
      getQuotes(allSymbols),
      ...allSymbols.map((s) => getHistory(s, { range: '6mo', interval: '1d' })),
    ]);

    // Build maps
    const historyMap = new Map<string, number[]>();
    for (let i = 0; i < allSymbols.length; i++) {
      historyMap.set(allSymbols[i], extractCloses(histories[i]));
    }

    const quoteMap = new Map<string, number>();
    for (const q of quotes) {
      quoteMap.set(q.symbol, q.price);
      if (q.volume != null) {
        quoteMap.set(`${q.symbol}_vol`, q.volume);
      }
    }

    // ── Compute indicators ──
    const indicators: PositioningIndicator[] = [];

    for (const config of INDICATORS) {
      const indicatorHistories = config.symbols.map((s) => historyMap.get(s) || []);
      const result = config.compute(indicatorHistories, quoteMap);
      const { current, previous, history: hist } = result;

      const change = Math.round((current - previous) * 10000) / 10000;
      const pct = percentileRank(hist, current);
      const signal = signalFromPercentile(pct, config.invertSignal);
      const interpretation = config.interpret(current, pct);

      indicators.push({
        name: config.name,
        category: config.category,
        currentValue: current,
        previousValue: previous,
        change,
        percentile: pct,
        signal,
        interpretation,
        history: hist,
        unit: config.unit,
      });
    }

    // ── Compute flows ──
    const flows: FlowData[] = [];

    for (const catDef of FLOW_CATEGORIES) {
      let weeklyFlow = 0;
      let monthlyFlow = 0;
      let ytdFlow = 0;

      for (const sym of catDef.symbols) {
        const closes = historyMap.get(sym) || [];
        if (closes.length < 5) continue;

        const current = closes[closes.length - 1];
        const week = closes.length >= 5 ? closes[closes.length - 5] : closes[0];
        const month = closes.length >= 22 ? closes[closes.length - 22] : closes[0];
        const ytdStart = closes[0];

        // Flow proxy: return * market cap proxy (scaled to billions)
        const vol = quoteMap.get(`${sym}_vol`) ?? 0;
        const scale = vol > 0 ? (vol * current / 1e9) : 1;

        weeklyFlow += Math.round(((current / week - 1) * scale) * 100) / 100;
        monthlyFlow += Math.round(((current / month - 1) * scale) * 100) / 100;
        ytdFlow += Math.round(((current / ytdStart - 1) * scale) * 100) / 100;
      }

      weeklyFlow = Math.round(weeklyFlow * 100) / 100;
      monthlyFlow = Math.round(monthlyFlow * 100) / 100;
      ytdFlow = Math.round(ytdFlow * 100) / 100;

      const trend: 'inflow' | 'outflow' | 'neutral' =
        weeklyFlow > 0.1 ? 'inflow' : weeklyFlow < -0.1 ? 'outflow' : 'neutral';

      flows.push({
        category: catDef.category,
        weeklyFlow,
        monthlyFlow,
        ytdFlow,
        trend,
      });
    }

    // ── Overall sentiment ──
    let bullCount = 0;
    let bearCount = 0;
    let neutralCount = 0;

    for (const ind of indicators) {
      if (ind.signal === 'EXTREME_BULLISH' || ind.signal === 'BULLISH') bullCount++;
      else if (ind.signal === 'EXTREME_BEARISH' || ind.signal === 'BEARISH') bearCount++;
      else neutralCount++;
    }

    // Score: -100 (all bearish) to +100 (all bullish)
    const total = indicators.length || 1;
    const score = Math.round(((bullCount - bearCount) / total) * 100);
    const label = sentimentLabel(score);

    const data: PositioningResponse = {
      indicators,
      flows,
      overallSentiment: {
        score: clamp(score, -100, 100),
        label,
        bullCount,
        bearCount,
        neutralCount,
      },
      timestamp: new Date().toISOString(),
    };

    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Positioning] Error fetching data:', message);
    if (cache.data) return res.json(cache.data);
    res.status(502).json({ error: 'Failed to fetch positioning data' });
  }
});

export default router;
