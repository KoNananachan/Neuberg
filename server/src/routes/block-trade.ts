import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'JPM', 'BAC', 'XOM', 'SPY', 'QQQ', 'IWM', 'HYG', 'TLT'];
const CACHE_TTL = 2 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  // Large volume trades inferred from volume vs average
  const trades = quotes.filter(q => q?.symbol).map(q => {
    const vol = q.regularMarketVolume || 0;
    const avgVol = q.averageDailyVolume3Month || vol;
    const volRatio = avgVol > 0 ? vol / avgVol : 1;
    const price = q.regularMarketPrice || 0;
    const blockSize = Math.round(vol * 0.05); // estimate 5% of volume as block
    return { ticker: q.symbol!, name: q.shortName || q.symbol!, price: r2(price), change: r2(q.regularMarketChangePercent || 0), volume: vol, avgVolume: avgVol, volumeRatio: r2(volRatio), estimatedBlockSize: blockSize, estimatedBlockValue: Math.round(blockSize * price), direction: (q.regularMarketChangePercent || 0) > 0 ? 'Buy' : 'Sell', unusualVolume: volRatio > 1.5 };
  }).sort((a, b) => b.estimatedBlockValue - a.estimatedBlockValue);
  const unusualActivity = trades.filter(t => t.unusualVolume);
  return { trades, unusualActivity, summary: { totalEstimatedBlockValue: Math.round(trades.reduce((s, t) => s + t.estimatedBlockValue, 0)), unusualCount: unusualActivity.length, avgVolumeRatio: r2(trades.reduce((s, t) => s + t.volumeRatio, 0) / trades.length) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[BlockTrade] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
