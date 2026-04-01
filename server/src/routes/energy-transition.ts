import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

// Clean energy stocks + traditional energy for comparison
const SYMBOLS = [
  'ICLN', 'TAN', 'FAN', 'QCLN', // Clean energy ETFs
  'ENPH', 'SEDG', 'FSLR', 'RUN', 'NOVA', // Solar
  'NEE', 'AES', 'BEP', // Renewable utilities
  'PLUG', 'BE', 'BLDP', // Hydrogen/Fuel cells
  'RIVN', 'LCID', 'NIO', 'TSLA', // EVs
  'ALB', 'SQM', 'LAC', // Lithium
  'XLE', 'CL=F', // Traditional energy benchmark
];

const SEGMENT_MAP: Record<string, string> = {
  ENPH: 'Solar', SEDG: 'Solar', FSLR: 'Solar', RUN: 'Solar', NOVA: 'Solar',
  NEE: 'Renewable Utility', AES: 'Renewable Utility', BEP: 'Renewable Utility',
  PLUG: 'Hydrogen', BE: 'Hydrogen', BLDP: 'Hydrogen',
  RIVN: 'EV', LCID: 'EV', NIO: 'EV', TSLA: 'EV',
  ALB: 'Lithium/Battery', SQM: 'Lithium/Battery', LAC: 'Lithium/Battery',
};

const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;

function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }

async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));

  const stocks = SYMBOLS.filter(s => !['ICLN', 'TAN', 'FAN', 'QCLN', 'XLE', 'CL=F'].includes(s)).map(sym => {
    const q = qMap.get(sym);
    return {
      ticker: sym, name: q?.shortName || sym,
      segment: SEGMENT_MAP[sym] || 'Other',
      price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0),
      marketCap: r1((q?.marketCap || 0) / 1e9),
      pe: r1(q?.trailingPE || 0),
      vs52wHigh: q?.fiftyTwoWeekHigh && q?.regularMarketPrice ? r1(((q.regularMarketPrice - q.fiftyTwoWeekHigh) / q.fiftyTwoWeekHigh) * 100) : 0,
    };
  });

  const segmentMap = new Map<string, typeof stocks>();
  for (const s of stocks) { if (!segmentMap.has(s.segment)) segmentMap.set(s.segment, []); segmentMap.get(s.segment)!.push(s); }
  const segments = [...segmentMap.entries()].map(([segment, items]) => ({
    segment, count: items.length,
    avgChange: r2(items.reduce((s, i) => s + i.change, 0) / items.length),
    totalMarketCap: r1(items.reduce((s, i) => s + i.marketCap, 0)),
  }));

  const icln = qMap.get('ICLN');
  const xle = qMap.get('XLE');
  const summary = {
    iclnPrice: r2(icln?.regularMarketPrice || 0), iclnChange: r2(icln?.regularMarketChangePercent || 0),
    xlePrice: r2(xle?.regularMarketPrice || 0), xleChange: r2(xle?.regularMarketChangePercent || 0),
    cleanVsFossil: r2((icln?.regularMarketChangePercent || 0) - (xle?.regularMarketChangePercent || 0)),
    oilPrice: r2(qMap.get('CL=F')?.regularMarketPrice || 0),
    totalCleanMarketCap: r1(stocks.reduce((s, st) => s + st.marketCap, 0)),
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
    console.error('[EnergyTransition] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to fetch energy transition data' });
  }
});

export default router;
