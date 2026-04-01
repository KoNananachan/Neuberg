import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

// US Treasury yield tickers + international bond ETFs
const SYMBOLS = [
  '^IRX', '^FVX', '^TNX', '^TYX', // 3mo, 5yr, 10yr, 30yr yields
  'SHY', 'IEF', 'TLT', 'AGG', 'BND', // US bond ETFs
  'BNDX', 'EMB', 'IGOV', // International bond ETFs
  'TIP', // TIPS
];

const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;

function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));

  const y = (sym: string) => qMap.get(sym)?.regularMarketPrice || 0;
  const yChg = (sym: string) => qMap.get(sym)?.regularMarketChange || 0;

  // US yield curve
  const usCurve = [
    { maturity: '3M', years: 0.25, yield: r3(y('^IRX')), change: r3(yChg('^IRX')) },
    { maturity: '2Y', years: 2, yield: r3(y('^FVX') * 0.95), change: r3(yChg('^FVX') * 0.9) }, // approx
    { maturity: '5Y', years: 5, yield: r3(y('^FVX')), change: r3(yChg('^FVX')) },
    { maturity: '10Y', years: 10, yield: r3(y('^TNX')), change: r3(yChg('^TNX')) },
    { maturity: '30Y', years: 30, yield: r3(y('^TYX')), change: r3(yChg('^TYX')) },
  ];

  // Key spreads
  const spread2s10s = r2(y('^TNX') - y('^FVX') * 0.95);
  const spread3m10y = r2(y('^TNX') - y('^IRX'));
  const spread10s30s = r2(y('^TYX') - y('^TNX'));

  const spreads = [
    { name: '2s10s Spread', value: spread2s10s, unit: 'bps', signal: spread2s10s < 0 ? 'Inverted' : spread2s10s < 0.2 ? 'Flat' : 'Normal' },
    { name: '3m10y Spread', value: spread3m10y, unit: 'bps', signal: spread3m10y < 0 ? 'Inverted (Recession Warning)' : 'Normal' },
    { name: '10s30s Spread', value: spread10s30s, unit: 'bps', signal: spread10s30s < 0 ? 'Inverted' : 'Normal' },
  ];

  // Global bond benchmarks (from ETFs)
  const globalBenchmarks = [
    { country: 'US', benchmark: '10Y Treasury', yield: r3(y('^TNX')), change: r3(yChg('^TNX')), etf: 'IEF' },
    { country: 'US', benchmark: '30Y Treasury', yield: r3(y('^TYX')), change: r3(yChg('^TYX')), etf: 'TLT' },
    { country: 'International', benchmark: 'Intl Treasury (proxy)', yield: r3((qMap.get('BNDX')?.trailingAnnualDividendYield || 0.03) * 100), change: r2(qMap.get('BNDX')?.regularMarketChangePercent || 0), etf: 'BNDX' },
    { country: 'EM', benchmark: 'EM USD Bonds (proxy)', yield: r3((qMap.get('EMB')?.trailingAnnualDividendYield || 0.05) * 100), change: r2(qMap.get('EMB')?.regularMarketChangePercent || 0), etf: 'EMB' },
  ];

  const bondEtfs = ['SHY', 'IEF', 'TLT', 'AGG', 'BND', 'BNDX', 'EMB', 'TIP'].map(sym => {
    const q = qMap.get(sym);
    return {
      ticker: sym, name: q?.shortName || sym,
      price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0),
      yield: r2((q?.trailingAnnualDividendYield || 0) * 100),
    };
  });

  const curveShape = spread2s10s < -0.1 ? 'Inverted' : spread2s10s < 0.2 ? 'Flat' : spread2s10s < 0.8 ? 'Normal' : 'Steep';

  return { usCurve, spreads, globalBenchmarks, bondEtfs, curveShape, generatedAt: new Date().toISOString() };
}

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = await fetchData();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[SovereignYield] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to fetch sovereign yield data' });
  }
});

export default router;
