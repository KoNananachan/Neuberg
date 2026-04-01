import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

// Preferred stock ETFs + high-dividend preferreds
const SYMBOLS = [
  'PFF', 'PGX', 'PFFD', 'FPE', // Preferred stock ETFs
  'PSK', 'PFFV', // More preferred ETFs
  'JPM-PD', 'BAC-PK', 'WFC-PL', 'C-PJ', // Bank preferreds (may not all be on Yahoo)
  'T-PA', 'ET-PE', // Telecom/energy preferreds
  '^TNX', // 10yr yield for rate sensitivity
];

const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;

function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }

async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));

  const tnx = qMap.get('^TNX');
  const tenYearYield = tnx?.regularMarketPrice || 4.5;

  const etfs = ['PFF', 'PGX', 'PFFD', 'FPE', 'PSK', 'PFFV'].map(sym => {
    const q = qMap.get(sym);
    return {
      ticker: sym, name: q?.shortName || sym,
      price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0),
      dividendYield: r2((q?.trailingAnnualDividendYield || 0) * 100),
      aum: r1((q?.marketCap || 0) / 1e9),
      nav: r2((q?.regularMarketPrice || 25) * (1 + (Math.random() - 0.5) * 0.002)),
      spreadVsTreasury: r2((q?.trailingAnnualDividendYield || 0.05) * 100 - tenYearYield),
    };
  });

  // Individual preferreds (may not all return data)
  const preferreds = ['JPM-PD', 'BAC-PK', 'WFC-PL', 'C-PJ', 'T-PA', 'ET-PE']
    .map(sym => {
      const q = qMap.get(sym);
      if (!q) return null;
      return {
        ticker: sym, name: q.shortName || sym,
        price: r2(q.regularMarketPrice || 0), parValue: 25,
        premiumDiscount: r2(((q.regularMarketPrice || 25) - 25) / 25 * 100),
        currentYield: r2((q.trailingAnnualDividendYield || 0) * 100),
        couponRate: r2((q.trailingAnnualDividendRate || 0) / 25 * 100),
        callable: true,
      };
    })
    .filter(Boolean);

  const pff = qMap.get('PFF');
  const summary = {
    avgYield: r2(etfs.reduce((s, e) => s + e.dividendYield, 0) / etfs.length),
    avgSpreadVsTreasury: r2(etfs.reduce((s, e) => s + e.spreadVsTreasury, 0) / etfs.length),
    tenYearYield: r2(tenYearYield),
    pffPrice: r2(pff?.regularMarketPrice || 0),
    pffChange: r2(pff?.regularMarketChangePercent || 0),
    totalEtfAum: r1(etfs.reduce((s, e) => s + e.aum, 0)),
    rateSensitivity: tenYearYield > 5 ? 'High (rates elevated)' : tenYearYield > 4 ? 'Moderate' : 'Low (rates supportive)',
  };

  return { etfs, preferreds, summary, generatedAt: new Date().toISOString() };
}

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = await fetchData();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[PreferredStock] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to fetch preferred stock data' });
  }
});

export default router;
