import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^IRX', '^FVX', '^TNX', '^TYX', 'TLT', 'IEF', 'SHY', 'AGG'];
const CACHE_TTL = 15 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r3(n: number): number { return Math.round(n * 1000) / 1000; }
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const irx = qMap.get('^IRX')?.regularMarketPrice || 5;
  const fvx = qMap.get('^FVX')?.regularMarketPrice || 4.2;
  const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5;
  const tyx = qMap.get('^TYX')?.regularMarketPrice || 4.8;
  // Upcoming auction schedule (typical Treasury schedule)
  const now = new Date();
  const auctions = [
    { security: '4-Week Bill', maturity: '4W', frequency: 'Weekly' },
    { security: '8-Week Bill', maturity: '8W', frequency: 'Weekly' },
    { security: '13-Week Bill', maturity: '13W', frequency: 'Weekly' },
    { security: '26-Week Bill', maturity: '26W', frequency: 'Weekly' },
    { security: '2-Year Note', maturity: '2Y', frequency: 'Monthly' },
    { security: '5-Year Note', maturity: '5Y', frequency: 'Monthly' },
    { security: '7-Year Note', maturity: '7Y', frequency: 'Monthly' },
    { security: '10-Year Note', maturity: '10Y', frequency: 'Quarterly' },
    { security: '20-Year Bond', maturity: '20Y', frequency: 'Quarterly' },
    { security: '30-Year Bond', maturity: '30Y', frequency: 'Quarterly' },
  ].map((a, i) => {
    const auctionDate = new Date(now); auctionDate.setDate(auctionDate.getDate() + (i % 7) + 1);
    const yieldEst = a.maturity.includes('W') ? r3(irx) : a.maturity === '5Y' ? r3(fvx) : a.maturity === '10Y' ? r3(tnx) : a.maturity === '30Y' ? r3(tyx) : r3((fvx + tnx) / 2);
    return { ...a, auctionDate: auctionDate.toISOString().slice(0, 10), estimatedYield: yieldEst, estimatedSize: a.maturity.includes('W') ? '$80B' : a.maturity === '2Y' ? '$69B' : a.maturity === '10Y' ? '$42B' : '$22B' };
  });
  const yieldContext = [
    { maturity: '3M', yield: r3(irx), change: r3(qMap.get('^IRX')?.regularMarketChange || 0) },
    { maturity: '5Y', yield: r3(fvx), change: r3(qMap.get('^FVX')?.regularMarketChange || 0) },
    { maturity: '10Y', yield: r3(tnx), change: r3(qMap.get('^TNX')?.regularMarketChange || 0) },
    { maturity: '30Y', yield: r3(tyx), change: r3(qMap.get('^TYX')?.regularMarketChange || 0) },
  ];
  return { auctions, yieldContext, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[BondAuctionCalendar] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
