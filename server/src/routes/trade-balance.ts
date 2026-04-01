import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

// Trade-sensitive assets: shipping, commodities, FX, exporters
const SYMBOLS = [
  'DXY=X', 'EURUSD=X', 'USDJPY=X', 'USDCNY=X', // FX
  'BDRY', // Dry bulk shipping
  'FXI', 'EWJ', 'EWG', 'EWZ', // Country ETFs (China, Japan, Germany, Brazil)
  'CL=F', 'ZC=F', 'ZS=F', // Export commodities
  'BA', 'CAT', 'DE', // US exporters
];

const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }

async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));

  const dxy = qMap.get('DXY=X');
  const dollarIndex = r2(dxy?.regularMarketPrice || 104);
  const dollarChange = r2(dxy?.regularMarketChangePercent || 0);

  const currencyPairs = ['EURUSD=X', 'USDJPY=X', 'USDCNY=X'].map(sym => {
    const q = qMap.get(sym);
    const names: Record<string, string> = { 'EURUSD=X': 'EUR/USD', 'USDJPY=X': 'USD/JPY', 'USDCNY=X': 'USD/CNY' };
    return { pair: names[sym] || sym, rate: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0) };
  });

  const tradingPartners = [
    { country: 'China', etf: 'FXI', fx: 'USDCNY=X' },
    { country: 'Japan', etf: 'EWJ', fx: 'USDJPY=X' },
    { country: 'Germany', etf: 'EWG', fx: 'EURUSD=X' },
    { country: 'Brazil', etf: 'EWZ', fx: null },
  ].map(tp => {
    const etfQ = qMap.get(tp.etf);
    return {
      country: tp.country, etf: tp.etf,
      etfChange: r2(etfQ?.regularMarketChangePercent || 0),
      etfPrice: r2(etfQ?.regularMarketPrice || 0),
      tradeIndicator: (etfQ?.regularMarketChangePercent || 0) > 0 ? 'Expanding' : 'Contracting',
    };
  });

  const exporters = ['BA', 'CAT', 'DE'].map(sym => {
    const q = qMap.get(sym);
    return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0) };
  });

  const shippingProxy = qMap.get('BDRY');
  const summary = {
    dollarIndex, dollarChange,
    tradeActivity: (shippingProxy?.regularMarketChangePercent || 0) > 0 ? 'Expanding' : 'Slowing',
    shippingIndex: r2(shippingProxy?.regularMarketPrice || 10),
    dollarStrength: dollarChange > 0.3 ? 'Strengthening (Headwind for exports)' : dollarChange < -0.3 ? 'Weakening (Tailwind for exports)' : 'Stable',
  };

  return { currencyPairs, tradingPartners, exporters, summary, generatedAt: new Date().toISOString() };
}

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = await fetchData(); cache = { data, ts: now }; res.json(data);
  } catch (err) {
    console.error('[TradeBalance] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});
export default router;
