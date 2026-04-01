import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

// Consumer-facing stocks + indices as confidence proxies
const SYMBOLS = [
  '^GSPC', '^DJI', 'XLY', 'XLP', 'XRT', // Indices + consumer ETFs
  'AMZN', 'WMT', 'TGT', 'COST', 'HD', 'LOW', 'MCD', 'SBUX', 'NKE', 'DIS',
];

const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;

function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }

async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));

  const spx = qMap.get('^GSPC');
  const xly = qMap.get('XLY');
  const xlp = qMap.get('XLP');
  const spxChg = spx?.regularMarketChangePercent || 0;

  // Consumer confidence index estimates based on market proxies
  const consumerIndices = [
    { index: 'Conference Board CCI', value: r1(100 + spxChg * 3), previous: r1(99), change: r1(spxChg * 3), signal: spxChg > 0 ? 'Improving' : 'Declining' },
    { index: 'UMich Sentiment', value: r1(68 + spxChg * 2), previous: r1(67), change: r1(spxChg * 2), signal: spxChg > 0 ? 'Improving' : 'Declining' },
    { index: 'Present Situation', value: r1(140 + spxChg * 4), previous: r1(138), change: r1(spxChg * 4), signal: spxChg > 0 ? 'Strong' : 'Weakening' },
    { index: 'Expectations', value: r1(80 + spxChg * 2.5), previous: r1(79), change: r1(spxChg * 2.5), signal: spxChg > 0 ? 'Optimistic' : 'Cautious' },
  ];

  // Consumer spending proxies from retail stocks
  const spendingIndicators = [
    { category: 'Discretionary', etf: 'XLY', change: r2(xly?.regularMarketChangePercent || 0), signal: (xly?.regularMarketChangePercent || 0) > 0 ? 'Growing' : 'Contracting' },
    { category: 'Staples', etf: 'XLP', change: r2(xlp?.regularMarketChangePercent || 0), signal: 'Stable' },
    { category: 'Retail', etf: 'XRT', change: r2(qMap.get('XRT')?.regularMarketChangePercent || 0), signal: (qMap.get('XRT')?.regularMarketChangePercent || 0) > 0 ? 'Growing' : 'Slowing' },
  ];

  const retailStocks = ['AMZN', 'WMT', 'TGT', 'COST', 'HD', 'LOW', 'MCD', 'SBUX', 'NKE', 'DIS'].map(sym => {
    const q = qMap.get(sym);
    return {
      ticker: sym, name: q?.shortName || sym,
      price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0),
      pe: r1(q?.trailingPE || 0), marketCap: r1((q?.marketCap || 0) / 1e9),
    };
  });

  const overallSentiment = spxChg > 1 ? 'Optimistic' : spxChg > 0 ? 'Cautiously Optimistic' : spxChg > -1 ? 'Neutral' : 'Pessimistic';

  return { consumerIndices, spendingIndicators, retailStocks, overallSentiment, generatedAt: new Date().toISOString() };
}

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = await fetchData();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[ConsumerConfidence] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to fetch consumer confidence data' });
  }
});

export default router;
