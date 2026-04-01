import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['EURUSD=X', 'USDJPY=X', 'GBPUSD=X', 'AUDUSD=X', 'NZDUSD=X', 'USDMXN=X', 'USDBRL=X', 'USDZAR=X', 'USDTRY=X', 'DXY=X', '^IRX', '^VIX'];
const CACHE_TTL = 5 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const usRate = qMap.get('^IRX')?.regularMarketPrice || 5; const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  const trades = [{ pair: 'USD/JPY', sym: 'USDJPY=X', rate: 0.5 }, { pair: 'USD/MXN', sym: 'USDMXN=X', rate: 10.5 }, { pair: 'USD/BRL', sym: 'USDBRL=X', rate: 11 }, { pair: 'USD/ZAR', sym: 'USDZAR=X', rate: 7.5 }, { pair: 'USD/TRY', sym: 'USDTRY=X', rate: 45 }, { pair: 'AUD/USD', sym: 'AUDUSD=X', rate: 4 }, { pair: 'NZD/USD', sym: 'NZDUSD=X', rate: 4.5 }].map(t => { const q = qMap.get(t.sym); const carry = r2(Math.abs(t.rate - usRate)); return { pair: t.pair, spot: r2(q?.regularMarketPrice || 1), change: r2(q?.regularMarketChangePercent || 0), carry, sharpe: r2(carry / (vix / 10)), signal: carry > 5 && vix < 22 ? 'Attractive' : 'Monitor' }; }).sort((a, b) => b.carry - a.carry);
  return { trades, summary: { usRate: r2(usRate), vix: r2(vix), dollarIndex: r2(qMap.get('DXY=X')?.regularMarketPrice || 104), environment: vix < 20 ? 'Favorable' : 'Cautious' }, generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[FXCarryTradeMonitor]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
