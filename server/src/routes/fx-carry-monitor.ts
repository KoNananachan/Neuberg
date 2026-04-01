import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['EURUSD=X', 'USDJPY=X', 'GBPUSD=X', 'AUDUSD=X', 'USDCAD=X', 'NZDUSD=X', 'USDMXN=X', 'USDZAR=X', 'USDTRY=X', 'DXY=X', '^IRX', '^VIX'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r4(n: number): number { return Math.round(n * 10000) / 10000; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const usRate = qMap.get('^IRX')?.regularMarketPrice || 5; const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  const pairs = [{ pair: 'EUR/USD', sym: 'EURUSD=X', rate: 3.5 }, { pair: 'USD/JPY', sym: 'USDJPY=X', rate: 0.5 }, { pair: 'GBP/USD', sym: 'GBPUSD=X', rate: 4.5 }, { pair: 'AUD/USD', sym: 'AUDUSD=X', rate: 4.0 }, { pair: 'USD/MXN', sym: 'USDMXN=X', rate: 10.5 }, { pair: 'USD/ZAR', sym: 'USDZAR=X', rate: 7.5 }, { pair: 'USD/TRY', sym: 'USDTRY=X', rate: 45 }].map(p => { const q = qMap.get(p.sym); const carry = r2(Math.abs(p.rate - usRate)); return { pair: p.pair, spot: r4(q?.regularMarketPrice || 1), change: r2(q?.regularMarketChangePercent || 0), carry, riskAdjustedCarry: r2(carry / (vix / 15)), attractiveness: carry > 5 ? 'High' : carry > 2 ? 'Medium' : 'Low' }; }).sort((a, b) => b.carry - a.carry);
  return { pairs, summary: { usRate: r2(usRate), vix: r2(vix), dollarIndex: r2(qMap.get('DXY=X')?.regularMarketPrice || 104), carryEnvironment: vix < 18 ? 'Favorable' : vix > 25 ? 'Risky' : 'Moderate' }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[FXCarryMonitor] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
