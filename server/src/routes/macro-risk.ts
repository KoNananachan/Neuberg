import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^GSPC', '^VIX', '^TNX', '^IRX', 'DXY=X', 'GC=F', 'CL=F', 'HYG', 'TLT', 'EEM', 'COPX', 'IYT'];
const CACHE_TTL = 5 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function clamp(n: number, min: number, max: number): number { return Math.max(min, Math.min(max, n)); }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const vix = qMap.get('^VIX')?.regularMarketPrice || 20; const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5; const irx = qMap.get('^IRX')?.regularMarketPrice || 5;
  const risks = [{ name: 'Recession', score: clamp(Math.round(50 - (tnx - irx) * 30 + (vix - 15) * 2), 0, 100) }, { name: 'Inflation', score: clamp(Math.round(50 + (qMap.get('CL=F')?.regularMarketChangePercent || 0) * 5 + (qMap.get('GC=F')?.regularMarketChangePercent || 0) * 3), 0, 100) }, { name: 'Credit Crisis', score: clamp(Math.round(30 + vix * 1.5 - (qMap.get('HYG')?.regularMarketChangePercent || 0) * 10), 0, 100) }, { name: 'EM Contagion', score: clamp(Math.round(30 + (qMap.get('DXY=X')?.regularMarketChangePercent || 0) * 10 - (qMap.get('EEM')?.regularMarketChangePercent || 0) * 8), 0, 100) }, { name: 'Growth Slowdown', score: clamp(Math.round(50 - (qMap.get('COPX')?.regularMarketChangePercent || 0) * 8 - (qMap.get('IYT')?.regularMarketChangePercent || 0) * 6), 0, 100) }];
  const compositeRisk = Math.round(risks.reduce((s, r) => s + r.score, 0) / risks.length);
  return { risks, compositeRisk, regime: compositeRisk > 60 ? 'Risk-Off' : compositeRisk < 35 ? 'Risk-On' : 'Neutral', generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[MacroRisk]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
