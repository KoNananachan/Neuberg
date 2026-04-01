import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['EURUSD=X', 'USDJPY=X', 'GBPUSD=X', 'AUDUSD=X', 'USDCAD=X', 'NZDUSD=X', 'USDMXN=X', 'USDBRL=X', 'DXY=X', '^IRX', '^VIX'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r4(n: number): number { return Math.round(n * 10000) / 10000; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const usRate = qMap.get('^IRX')?.regularMarketPrice || 5;
  const trades = [{ pair: 'USD/JPY', sym: 'USDJPY=X', foreignRate: 0.5 }, { pair: 'USD/MXN', sym: 'USDMXN=X', foreignRate: 10.5 }, { pair: 'USD/BRL', sym: 'USDBRL=X', foreignRate: 11.0 }, { pair: 'AUD/USD', sym: 'AUDUSD=X', foreignRate: 4.0 }, { pair: 'NZD/USD', sym: 'NZDUSD=X', foreignRate: 4.5 }, { pair: 'EUR/USD', sym: 'EURUSD=X', foreignRate: 3.5 }].map(t => { const q = qMap.get(t.sym); const carry = r2(t.foreignRate > usRate ? t.foreignRate - usRate : usRate - t.foreignRate); return { pair: t.pair, rate: r4(q?.regularMarketPrice || 1), change: r2(q?.regularMarketChangePercent || 0), carry, direction: t.foreignRate > usRate ? `Long ${t.pair.split('/')[0]}` : `Short ${t.pair.split('/')[0]}`, totalReturn: r2(carry / 365 + (q?.regularMarketChangePercent || 0)) }; }).sort((a, b) => b.carry - a.carry);
  return { trades, summary: { usRate: r2(usRate), dollarIndex: r2(qMap.get('DXY=X')?.regularMarketPrice || 104), vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20), bestCarry: trades[0]?.pair || 'N/A' }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[FXCarry] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
