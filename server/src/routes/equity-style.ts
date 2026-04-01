import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['IWD', 'IWF', 'IWN', 'IWO', 'IWM', 'SPY', 'QQQ', 'VTV', 'VUG', 'VOE', 'VOT', '^GSPC', '^VIX'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const styles = [
    { name: 'Large Value', etf: 'IWD' }, { name: 'Large Growth', etf: 'IWF' },
    { name: 'Small Value', etf: 'IWN' }, { name: 'Small Growth', etf: 'IWO' },
    { name: 'Mid Value', etf: 'VOE' }, { name: 'Mid Growth', etf: 'VOT' },
  ].map(s => { const q = qMap.get(s.etf); return { style: s.name, etf: s.etf, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), dividendYield: r2((q?.trailingAnnualDividendYield || 0) * 100) }; });
  const valueChg = (qMap.get('IWD')?.regularMarketChangePercent || 0); const growthChg = (qMap.get('IWF')?.regularMarketChangePercent || 0);
  return { styles: styles.sort((a, b) => b.change - a.change), summary: { valueVsGrowth: r2(valueChg - growthChg), rotation: valueChg > growthChg + 0.5 ? 'Value leading' : growthChg > valueChg + 0.5 ? 'Growth leading' : 'Mixed', topStyle: styles.sort((a, b) => b.change - a.change)[0]?.style || 'N/A', vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[EquityStyle] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
