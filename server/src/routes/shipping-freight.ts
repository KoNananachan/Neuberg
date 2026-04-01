import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();
const SYMBOLS = ['BDRY', 'SBLK', 'GOGL', 'GNK', 'ZIM', 'DAC', 'FRO', 'STNG', 'TNK', 'INSW', 'CL=F', 'NG=F'];

const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }

async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));

  const bdry = qMap.get('BDRY');
  const bdiProxy = Math.round((bdry?.regularMarketPrice || 10) * 150);

  const segments = [
    { name: 'Dry Bulk', stocks: ['SBLK', 'GOGL', 'GNK'], indexProxy: bdiProxy },
    { name: 'Container', stocks: ['ZIM', 'DAC'], indexProxy: Math.round(bdiProxy * 0.8) },
    { name: 'Tanker', stocks: ['FRO', 'STNG', 'TNK', 'INSW'], indexProxy: Math.round(bdiProxy * 0.6) },
  ].map(seg => {
    const segStocks = seg.stocks.map(sym => {
      const q = qMap.get(sym);
      return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), dividendYield: r2((q?.trailingAnnualDividendYield || 0) * 100) };
    });
    return { segment: seg.name, indexProxy: seg.indexProxy, stocks: segStocks, avgChange: r2(segStocks.reduce((s, st) => s + st.change, 0) / segStocks.length) };
  });

  const fuelCosts = { oil: r2(qMap.get('CL=F')?.regularMarketPrice || 0), natGas: r2(qMap.get('NG=F')?.regularMarketPrice || 0) };
  const summary = { bdiProxy, bdryChange: r2(bdry?.regularMarketChangePercent || 0), fuelCosts };

  return { segments, summary, generatedAt: new Date().toISOString() };
}

router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[ShippingFreight] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
