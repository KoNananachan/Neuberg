import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^VIX', '^IRX', '^TNX', 'SPY', 'QQQ', 'IWM', 'HYG', 'TLT', 'GLD', 'DXY=X', 'BTC-USD'];
const CACHE_TTL = 5 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  const scenarios = [{ name: 'VIX Spike (+50%)', impactEquity: r2(-vix * 0.03), impactCredit: r2(-1.5), impactGold: r2(2) }, { name: 'Rate Shock (+100bps)', impactEquity: r2(-5), impactCredit: r2(-3), impactGold: r2(-1) }, { name: 'Dollar Crash (-10%)', impactEquity: r2(2), impactCredit: r2(-0.5), impactGold: r2(8) }, { name: 'Credit Crisis', impactEquity: r2(-15), impactCredit: r2(-10), impactGold: r2(5) }];
  const assets = ['SPY', 'QQQ', 'IWM', 'HYG', 'TLT', 'GLD', 'BTC-USD'].map(sym => { const q = qMap.get(sym); return { asset: q?.shortName || sym, proxy: sym, change: r2(q?.regularMarketChangePercent || 0), stress: Math.abs(q?.regularMarketChangePercent || 0) > 2 ? 'Active stress' : 'Normal' }; });
  return { scenarios, assets, currentVix: r2(vix), stressLevel: vix > 30 ? 'Crisis' : vix > 22 ? 'Elevated' : 'Normal', generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[LiquidityStressTest]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
