import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['SPY', 'QQQ', 'IWM', 'EFA', 'EEM', 'AGG', 'TLT', 'HYG', 'GLD', 'DBC', 'MTUM', 'VLUE', 'USMV', '^VIX', '^GSPC'];
const CACHE_TTL = 5 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const spxChg = qMap.get('^GSPC')?.regularMarketChangePercent || 0;
  const strategies = [{ name: 'Long/Short Equity', components: ['SPY', 'IWM', 'MTUM'], weight: [0.5, -0.2, 0.3] }, { name: 'Global Macro', components: ['SPY', 'TLT', 'GLD', 'DBC'], weight: [0.3, 0.3, 0.2, 0.2] }, { name: 'Risk Parity', components: ['SPY', 'AGG', 'GLD', 'DBC'], weight: [0.25, 0.25, 0.25, 0.25] }, { name: 'EM Macro', components: ['EEM', 'EMB', 'DBC'], weight: [0.4, 0.3, 0.3] }].map(s => { const ret = s.components.reduce((sum, sym, i) => sum + (qMap.get(sym)?.regularMarketChangePercent || 0) * (s.weight[i] || 0), 0); return { strategy: s.name, return: r2(ret), alpha: r2(ret - spxChg * 0.5), sharpeProxy: r2(ret / ((qMap.get('^VIX')?.regularMarketPrice || 20) / 100)) }; });
  return { strategies, summary: { bestStrategy: [...strategies].sort((a, b) => b.return - a.return)[0]?.strategy || 'N/A', avgAlpha: r2(strategies.reduce((s, st) => s + st.alpha, 0) / strategies.length), vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20) }, generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[HedgeFundReplication]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
