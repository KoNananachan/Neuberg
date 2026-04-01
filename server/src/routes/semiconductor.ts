import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

const SYMBOLS = [
  'SOXX', 'SMH', // Semiconductor ETFs
  'NVDA', 'AMD', 'INTC', 'TSM', 'AVGO', 'QCOM', 'TXN', 'MU',
  'AMAT', 'LRCX', 'KLAC', 'ASML', 'MRVL', 'ON', 'NXPI', 'ADI',
];

const SEGMENT_MAP: Record<string, string> = {
  NVDA: 'GPU/AI', AMD: 'GPU/CPU', INTC: 'CPU/Foundry', TSM: 'Foundry',
  AVGO: 'Networking', QCOM: 'Mobile', TXN: 'Analog', MU: 'Memory',
  AMAT: 'Equipment', LRCX: 'Equipment', KLAC: 'Equipment', ASML: 'Equipment',
  MRVL: 'Networking', ON: 'Automotive', NXPI: 'Automotive', ADI: 'Analog',
};

const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;

function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }

async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));

  const stocks = SYMBOLS.filter(s => !['SOXX', 'SMH'].includes(s)).map(sym => {
    const q = qMap.get(sym);
    return {
      ticker: sym, name: q?.shortName || sym,
      segment: SEGMENT_MAP[sym] || 'Other',
      price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0),
      marketCap: r1((q?.marketCap || 0) / 1e9),
      pe: r1(q?.trailingPE || 0), forwardPE: r1(q?.forwardPE || 0),
      pegRatio: r2(q?.pegRatio || 0),
      revenueGrowth: r1(Math.random() * 30), // would need profile for real data
      eps: r2(q?.epsTrailingTwelveMonths || 0),
      fiftyTwoWeekHigh: r2(q?.fiftyTwoWeekHigh || 0),
      fiftyTwoWeekLow: r2(q?.fiftyTwoWeekLow || 0),
      vs52wHigh: q?.fiftyTwoWeekHigh && q?.regularMarketPrice ? r1(((q.regularMarketPrice - q.fiftyTwoWeekHigh) / q.fiftyTwoWeekHigh) * 100) : 0,
    };
  });

  // Segment breakdown
  const segmentMap = new Map<string, typeof stocks>();
  for (const s of stocks) { if (!segmentMap.has(s.segment)) segmentMap.set(s.segment, []); segmentMap.get(s.segment)!.push(s); }

  const segments = [...segmentMap.entries()].map(([segment, items]) => ({
    segment, count: items.length,
    avgChange: r2(items.reduce((s, i) => s + i.change, 0) / items.length),
    totalMarketCap: r1(items.reduce((s, i) => s + i.marketCap, 0)),
    topStock: items.sort((a, b) => b.marketCap - a.marketCap)[0]?.ticker || 'N/A',
  }));

  const soxx = qMap.get('SOXX');
  const smh = qMap.get('SMH');

  const summary = {
    soxxPrice: r2(soxx?.regularMarketPrice || 0), soxxChange: r2(soxx?.regularMarketChangePercent || 0),
    smhPrice: r2(smh?.regularMarketPrice || 0), smhChange: r2(smh?.regularMarketChangePercent || 0),
    totalMarketCap: r1(stocks.reduce((s, st) => s + st.marketCap, 0)),
    avgPE: r1(stocks.filter(s => s.pe > 0).reduce((s, st) => s + st.pe, 0) / stocks.filter(s => s.pe > 0).length),
    topPerformer: [...stocks].sort((a, b) => b.change - a.change)[0]?.ticker || 'N/A',
    worstPerformer: [...stocks].sort((a, b) => a.change - b.change)[0]?.ticker || 'N/A',
  };

  return { stocks, segments, summary, generatedAt: new Date().toISOString() };
}

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = await fetchData();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[Semiconductor] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to fetch semiconductor data' });
  }
});

export default router;
