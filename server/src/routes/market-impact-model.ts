import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['SPY', 'QQQ', 'IWM', 'AAPL', 'MSFT', 'NVDA', 'AMZN', 'TSLA', 'JPM', 'XOM', '^VIX'];
const CACHE_TTL = 2 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r4(n: number): number { return Math.round(n * 10000) / 10000; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  const models = SYMBOLS.filter(s => s !== '^VIX').map(sym => { const q = qMap.get(sym); const p = q?.regularMarketPrice || 100; const vol = q?.regularMarketVolume || 1e6; const avgVol = q?.averageDailyVolume3Month || vol; const spread = r4(Math.max(0.01, p * 0.0003 * (vix / 15))); return { ticker: sym, price: r2(p), spread, impactBps1M: r4(spread * 50 / p * 10000), impactBps10M: r4(spread * 500 / p * 10000), volumeRatio: r2(avgVol > 0 ? vol / avgVol : 1), liquidityScore: Math.round(Math.min(100, avgVol / 1e5)) }; });
  return { models, vix: r2(vix), avgImpact: r4(models.reduce((s, m) => s + m.impactBps1M, 0) / models.length), generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[MarketImpactModel]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
