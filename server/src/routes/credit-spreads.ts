import { Router } from 'express';
import { getQuotes, getHistory } from '../services/stocks/yahoo-finance.js';

const router = Router();

// ── Types ──

interface InstrumentData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  yield: number | null;
  ytdReturn: number | null;
}

interface SpreadHistory {
  date: string;
  value: number;
}

interface SpreadData {
  current: number;
  change5d: number;
  change1m: number;
  trend: 'tightening' | 'widening' | 'stable';
  history: SpreadHistory[];
}

interface YieldCurveData {
  threeMonth: number;
  tenYear: number;
  thirtyYear: number;
  spread2s10s: number;
  inverted: boolean;
}

interface CreditSpreadsResponse {
  timestamp: string;
  instruments: InstrumentData[];
  spreads: {
    hy: SpreadData;
    ig: SpreadData;
    em: SpreadData;
  };
  riskSentiment: 'Risk On' | 'Risk Off' | 'Neutral';
  yieldCurve: YieldCurveData;
}

// ── Symbols ──

const ETF_SYMBOLS = ['HYG', 'LQD', 'TLT', 'IEF', 'SHY', 'JNK', 'AGG', 'EMB', 'BNDX'];
const YIELD_SYMBOLS = ['^TNX', '^TYX', '^IRX'];
const HISTORY_SYMBOLS = ['HYG', 'LQD', 'TLT', 'IEF', 'EMB'];

const ETF_NAMES: Record<string, string> = {
  HYG: 'iShares High Yield Corporate Bond',
  LQD: 'iShares Investment Grade Corporate Bond',
  TLT: 'iShares 20+ Year Treasury Bond',
  IEF: 'iShares 7-10 Year Treasury Bond',
  SHY: 'iShares 1-3 Year Treasury Bond',
  JNK: 'SPDR High Yield Bond',
  AGG: 'iShares Core US Aggregate Bond',
  EMB: 'iShares JPM USD EM Bond',
  BNDX: 'Vanguard International Bond',
};

// ── Cache ──

let cache: { data: CreditSpreadsResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 5 * 60_000; // 5 minutes

// ── Helpers ──

function computeSpreadSeries(
  numerator: { date: string; close: number | null }[],
  denominator: { date: string; close: number | null }[],
): SpreadHistory[] {
  const denomMap = new Map<string, number>();
  for (const d of denominator) {
    if (d.close != null) denomMap.set(d.date, d.close);
  }

  const history: SpreadHistory[] = [];
  for (const n of numerator) {
    if (n.close == null) continue;
    const dVal = denomMap.get(n.date);
    if (dVal == null || dVal === 0) continue;
    history.push({ date: n.date, value: Math.round((n.close / dVal) * 10000) / 10000 });
  }

  return history;
}

function computeSpreadData(history: SpreadHistory[]): SpreadData {
  const current = history.length > 0 ? history[history.length - 1].value : 0;

  // 5-day change
  const idx5d = Math.max(0, history.length - 6);
  const val5d = history.length > idx5d ? history[idx5d].value : current;
  const change5d = Math.round((current - val5d) * 10000) / 10000;

  // 1-month change (~21 trading days)
  const idx1m = Math.max(0, history.length - 22);
  const val1m = history.length > idx1m ? history[idx1m].value : current;
  const change1m = Math.round((current - val1m) * 10000) / 10000;

  // Trend: compare current to 20-day average
  const recent20 = history.slice(-20);
  const avg20 = recent20.length > 0
    ? recent20.reduce((sum, h) => sum + h.value, 0) / recent20.length
    : current;

  let trend: 'tightening' | 'widening' | 'stable';
  const diff = current - avg20;
  if (Math.abs(diff) < 0.003) {
    trend = 'stable';
  } else if (diff > 0) {
    // Ratio increasing = HY outperforming treasuries = tightening spreads
    trend = 'tightening';
  } else {
    trend = 'widening';
  }

  return { current, change5d, change1m, trend, history };
}

function determineRiskSentiment(
  hySpread: SpreadData,
  igSpread: SpreadData,
  emSpread: SpreadData,
): 'Risk On' | 'Risk Off' | 'Neutral' {
  let score = 0;

  // Tightening spreads = risk on
  if (hySpread.trend === 'tightening') score += 2;
  else if (hySpread.trend === 'widening') score -= 2;

  if (igSpread.trend === 'tightening') score += 1;
  else if (igSpread.trend === 'widening') score -= 1;

  if (emSpread.trend === 'tightening') score += 1;
  else if (emSpread.trend === 'widening') score -= 1;

  // Also factor in 5-day momentum
  if (hySpread.change5d > 0) score += 1;
  else if (hySpread.change5d < 0) score -= 1;

  if (score >= 3) return 'Risk On';
  if (score <= -2) return 'Risk Off';
  return 'Neutral';
}

// ── Route ──

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    // Fetch quotes and history in parallel
    const [etfQuotes, yieldQuotes, ...histories] = await Promise.all([
      getQuotes(ETF_SYMBOLS),
      getQuotes(YIELD_SYMBOLS),
      ...HISTORY_SYMBOLS.map((s) => getHistory(s, { range: '6mo', interval: '1d' })),
    ]);

    // Build instruments array
    const allQuotes = [...etfQuotes, ...yieldQuotes];
    const quoteMap = new Map(allQuotes.map((q: any) => [q.symbol, q]));

    const instruments: InstrumentData[] = ETF_SYMBOLS.map((sym) => {
      const q: any = quoteMap.get(sym);
      if (!q) {
        return {
          symbol: sym,
          name: ETF_NAMES[sym] || sym,
          price: 0,
          change: 0,
          changePct: 0,
          yield: null,
          ytdReturn: null,
        };
      }
      return {
        symbol: q.symbol,
        name: ETF_NAMES[sym] || q.name || sym,
        price: q.price ?? 0,
        change: q.change ?? 0,
        changePct: q.changePercent ?? 0,
        yield: q.dividendYield != null ? Math.round(q.dividendYield * 10000) / 100 : null,
        ytdReturn: null, // not available from basic quote
      };
    });

    // Build history maps
    const historyMap: Record<string, { date: string; close: number | null }[]> = {};
    HISTORY_SYMBOLS.forEach((sym, i) => {
      historyMap[sym] = (histories[i] as any[]).map((h: any) => ({
        date: typeof h.date === 'string' ? h.date : String(h.date),
        close: h.close,
      }));
    });

    // Compute spread histories
    const hyHistory = computeSpreadSeries(
      historyMap['HYG'] || [],
      historyMap['TLT'] || [],
    );
    const igHistory = computeSpreadSeries(
      historyMap['LQD'] || [],
      historyMap['IEF'] || [],
    );
    const emHistory = computeSpreadSeries(
      historyMap['EMB'] || [],
      historyMap['TLT'] || [],
    );

    const hySpread = computeSpreadData(hyHistory);
    const igSpread = computeSpreadData(igHistory);
    const emSpread = computeSpreadData(emHistory);

    // Yield curve
    const tnx = quoteMap.get('^TNX') as any;
    const tyx = quoteMap.get('^TYX') as any;
    const irx = quoteMap.get('^IRX') as any;

    const tenYear = tnx?.price ?? 0;
    const thirtyYear = tyx?.price ?? 0;
    const threeMonth = irx?.price ?? 0;

    // 2s/10s spread: approximate 2Y using midpoint between 3M and 10Y
    // Since we don't have 2Y directly, use 3M as proxy for short end
    const spread2s10s = Math.round((tenYear - threeMonth) * 100) / 100;

    const yieldCurve: YieldCurveData = {
      threeMonth,
      tenYear,
      thirtyYear,
      spread2s10s,
      inverted: spread2s10s < 0,
    };

    const riskSentiment = determineRiskSentiment(hySpread, igSpread, emSpread);

    const result: CreditSpreadsResponse = {
      timestamp: new Date().toISOString(),
      instruments,
      spreads: {
        hy: hySpread,
        ig: igSpread,
        em: emSpread,
      },
      riskSentiment,
      yieldCurve,
    };

    cache = { data: result, expiresAt: now + CACHE_TTL };
    res.json(result);
  } catch (err: any) {
    console.error('[CreditSpreads] Error:', err?.message || err);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to fetch credit spread data' });
  }
});

export default router;
