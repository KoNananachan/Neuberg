import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['ES=F', 'NQ=F', 'YM=F', 'RTY=F', '^GSPC', '^IXIC', '^DJI', '^RUT', '^VIX', 'SPY', 'QQQ'];
const CACHE_TTL = 2 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const futures = [
    { name: 'E-mini S&P 500', sym: 'ES=F', cash: '^GSPC' }, { name: 'E-mini Nasdaq 100', sym: 'NQ=F', cash: '^IXIC' },
    { name: 'E-mini Dow', sym: 'YM=F', cash: '^DJI' }, { name: 'E-mini Russell 2000', sym: 'RTY=F', cash: '^RUT' },
  ].map(f => { const fq = qMap.get(f.sym); const cq = qMap.get(f.cash); const fp = fq?.regularMarketPrice || 0; const cp = cq?.regularMarketPrice || fp; return { contract: f.name, futuresSymbol: f.sym, futuresPrice: r2(fp), futuresChange: r2(fq?.regularMarketChangePercent || 0), cashPrice: r2(cp), cashChange: r2(cq?.regularMarketChangePercent || 0), basis: r2(fp - cp), basisPct: r2(cp > 0 ? ((fp - cp) / cp) * 100 : 0), volume: fq?.regularMarketVolume || 0 }; });
  return { futures, vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20), generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[EquityIndexFutures] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
