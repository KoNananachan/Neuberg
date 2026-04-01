import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

const SYMBOLS = [
  'URA', 'NLR', // Uranium/Nuclear ETFs
  'CCJ', 'UEC', 'DNN', 'NXE', 'LEU', 'UUUU', // Uranium miners
  'CEG', 'VST', 'TLN', // Nuclear utilities
  'BWX', 'GEV', // Nuclear tech/services
  'UX=F', // Uranium futures (may not be on Yahoo)
];

const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;

function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }

async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));

  const segMap: Record<string, string> = {
    CCJ: 'Uranium Mining', UEC: 'Uranium Mining', DNN: 'Uranium Mining',
    NXE: 'Uranium Mining', LEU: 'Uranium Enrichment', UUUU: 'Uranium Mining',
    CEG: 'Nuclear Utility', VST: 'Nuclear Utility', TLN: 'Nuclear Utility',
    BWX: 'Nuclear Tech', GEV: 'Nuclear Tech',
  };

  const stocks = SYMBOLS.filter(s => !['URA', 'NLR', 'UX=F'].includes(s)).map(sym => {
    const q = qMap.get(sym);
    return {
      ticker: sym, name: q?.shortName || sym, segment: segMap[sym] || 'Other',
      price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0),
      marketCap: r1((q?.marketCap || 0) / 1e9), pe: r1(q?.trailingPE || 0),
      vs52wHigh: q?.fiftyTwoWeekHigh && q?.regularMarketPrice ? r1(((q.regularMarketPrice - q.fiftyTwoWeekHigh) / q.fiftyTwoWeekHigh) * 100) : 0,
    };
  });

  const ura = qMap.get('URA');
  const summary = {
    uraPrice: r2(ura?.regularMarketPrice || 0), uraChange: r2(ura?.regularMarketChangePercent || 0),
    uraniumSpotEst: r2((ura?.regularMarketPrice || 25) * 3.5), // rough estimate from ETF
    totalMarketCap: r1(stocks.reduce((s, st) => s + st.marketCap, 0)),
    avgChange: r2(stocks.reduce((s, st) => s + st.change, 0) / stocks.length),
  };

  return { stocks, summary, generatedAt: new Date().toISOString() };
}

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = await fetchData();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[NuclearEnergy] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to fetch nuclear energy data' });
  }
});

export default router;
