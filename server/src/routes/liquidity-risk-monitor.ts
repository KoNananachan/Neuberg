import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^VIX', '^IRX', '^TNX', 'HYG', 'LQD', 'TLT', 'SPY', 'IWM', 'DXY=X', 'KRE'];
const CACHE_TTL = 5 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function clamp(n: number, min: number, max: number): number { return Math.max(min, Math.min(max, n)); }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  const risks = [{ name: 'Volatility Risk', score: clamp(Math.round((vix - 12) * 3), 0, 100), signal: vix > 25 ? 'High' : 'Normal' }, { name: 'Credit Risk', score: clamp(Math.round(50 - (qMap.get('HYG')?.regularMarketChangePercent || 0) * 15), 0, 100), signal: (qMap.get('HYG')?.regularMarketChangePercent || 0) < -0.5 ? 'Elevated' : 'Normal' }, { name: 'Funding Risk', score: clamp(Math.round(30 + ((qMap.get('^IRX')?.regularMarketPrice || 5) - (qMap.get('^TNX')?.regularMarketPrice || 4.5)) * 20), 0, 100), signal: ((qMap.get('^IRX')?.regularMarketPrice || 5) - (qMap.get('^TNX')?.regularMarketPrice || 4.5)) > 0 ? 'Inverted curve' : 'Normal' }, { name: 'Market Risk', score: clamp(Math.round(50 - (qMap.get('SPY')?.regularMarketChangePercent || 0) * 10), 0, 100), signal: (qMap.get('SPY')?.regularMarketChangePercent || 0) < -1 ? 'Selloff' : 'Normal' }];
  const compositeRisk = Math.round(risks.reduce((s, r) => s + r.score, 0) / risks.length);
  return { risks, compositeRisk, riskLevel: compositeRisk > 60 ? 'Elevated' : compositeRisk > 40 ? 'Moderate' : 'Low', generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[LiquidityRiskMonitor]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
