import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['MTUM', 'VLUE', 'QUAL', 'USMV', 'SIZE', 'VTV', 'VUG', 'IWD', 'IWF', 'IWM', 'SPY', '^VIX'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const spyChg = qMap.get('SPY')?.regularMarketChangePercent || 0;
  const factors = [{ name: 'Momentum', etf: 'MTUM' }, { name: 'Value', etf: 'VLUE' }, { name: 'Quality', etf: 'QUAL' }, { name: 'Low Vol', etf: 'USMV' }, { name: 'Size', etf: 'SIZE' }, { name: 'Value (V)', etf: 'VTV' }, { name: 'Growth (V)', etf: 'VUG' }].map(f => { const q = qMap.get(f.etf); const chg = q?.regularMarketChangePercent || 0; return { factor: f.name, etf: f.etf, change: r2(chg), vsSpx: r2(chg - spyChg), momentum: chg > spyChg + 0.3 ? 'Outperforming' : chg < spyChg - 0.3 ? 'Underperforming' : 'Inline' }; }).sort((a, b) => b.change - a.change);
  const valueChg = qMap.get('IWD')?.regularMarketChangePercent || 0; const growthChg = qMap.get('IWF')?.regularMarketChangePercent || 0;
  return { factors, rotation: { valueVsGrowth: r2(valueChg - growthChg), signal: valueChg > growthChg + 0.5 ? 'Rotating to Value' : growthChg > valueChg + 0.5 ? 'Rotating to Growth' : 'Neutral', topFactor: factors[0]?.factor || 'N/A', vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[FactorRotation] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
