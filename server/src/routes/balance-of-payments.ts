import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['DXY=X', 'EURUSD=X', 'USDJPY=X', 'USDCNY=X', 'GBPUSD=X', 'FXI', 'EWJ', 'EWG', 'EWU', 'BDRY', 'CL=F'];
const CACHE_TTL = 15 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const dxy = qMap.get('DXY=X');
  const currencies = [
    { pair: 'EUR/USD', rate: r2(qMap.get('EURUSD=X')?.regularMarketPrice || 0), change: r2(qMap.get('EURUSD=X')?.regularMarketChangePercent || 0), country: 'Eurozone' },
    { pair: 'USD/JPY', rate: r2(qMap.get('USDJPY=X')?.regularMarketPrice || 0), change: r2(qMap.get('USDJPY=X')?.regularMarketChangePercent || 0), country: 'Japan' },
    { pair: 'USD/CNY', rate: r2(qMap.get('USDCNY=X')?.regularMarketPrice || 0), change: r2(qMap.get('USDCNY=X')?.regularMarketChangePercent || 0), country: 'China' },
    { pair: 'GBP/USD', rate: r2(qMap.get('GBPUSD=X')?.regularMarketPrice || 0), change: r2(qMap.get('GBPUSD=X')?.regularMarketChangePercent || 0), country: 'UK' },
  ];
  const tradingPartners = [
    { country: 'China', etf: 'FXI' }, { country: 'Japan', etf: 'EWJ' }, { country: 'Germany', etf: 'EWG' }, { country: 'UK', etf: 'EWU' },
  ].map(tp => ({ country: tp.country, etfChange: r2(qMap.get(tp.etf)?.regularMarketChangePercent || 0), tradeFlow: (qMap.get(tp.etf)?.regularMarketChangePercent || 0) > 0 ? 'Expanding' : 'Contracting' }));
  const summary = { dollarIndex: r2(dxy?.regularMarketPrice || 104), dollarChange: r2(dxy?.regularMarketChangePercent || 0), shippingActivity: r2(qMap.get('BDRY')?.regularMarketChangePercent || 0), oilPrice: r2(qMap.get('CL=F')?.regularMarketPrice || 75) };
  return { currencies, tradingPartners, summary, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[BalanceOfPayments] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
