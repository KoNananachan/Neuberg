import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['LQD', 'HYG', 'ANGL', 'FALN', 'JNK', '^TNX', '^VIX', 'XLF'];
const CACHE_TTL = 15 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const anglChg = qMap.get('ANGL')?.regularMarketChangePercent || 0; const falnChg = qMap.get('FALN')?.regularMarketChangePercent || 0;
  const indicators = [
    { name: 'Fallen Angels (IG→HY)', proxy: 'ANGL', change: r2(anglChg), trend: anglChg > 0 ? 'Increasing activity' : 'Stable' },
    { name: 'Rising Stars (HY→IG)', proxy: 'FALN', change: r2(falnChg), trend: falnChg > 0 ? 'Upgrade momentum' : 'Slow' },
    { name: 'IG Stability', proxy: 'LQD', change: r2(qMap.get('LQD')?.regularMarketChangePercent || 0), trend: (qMap.get('LQD')?.regularMarketChangePercent || 0) > 0 ? 'Healthy' : 'Pressure' },
    { name: 'HY Conditions', proxy: 'HYG', change: r2(qMap.get('HYG')?.regularMarketChangePercent || 0), trend: (qMap.get('HYG')?.regularMarketChangePercent || 0) > 0 ? 'Constructive' : 'Deteriorating' },
  ];
  const migrationBias = anglChg > falnChg ? 'Downgrade bias' : falnChg > anglChg ? 'Upgrade bias' : 'Neutral';
  return { indicators, migrationBias, vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20), tenYear: r2(qMap.get('^TNX')?.regularMarketPrice || 4.5), generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[CreditRatingMigration] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
