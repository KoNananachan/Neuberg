import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^VIX', '^GSPC', 'DXY=X', 'GLD', 'TLT', 'XLE', 'XLV', 'XLF', 'ICLN', 'ITA', 'FXI', 'EEM'];
const CACHE_TTL = 15 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  const policySensitive = [
    { sector: 'Energy', proxy: 'XLE', policyExposure: 'High' }, { sector: 'Healthcare', proxy: 'XLV', policyExposure: 'High' },
    { sector: 'Financials', proxy: 'XLF', policyExposure: 'Medium' }, { sector: 'Clean Energy', proxy: 'ICLN', policyExposure: 'Very High' },
    { sector: 'Defense', proxy: 'ITA', policyExposure: 'High' },
  ].map(s => { const q = qMap.get(s.proxy); return { sector: s.sector, proxy: s.proxy, change: r2(q?.regularMarketChangePercent || 0), policyExposure: s.policyExposure }; });
  const riskIndicators = { vix: r2(vix), spxChange: r2(qMap.get('^GSPC')?.regularMarketChangePercent || 0), dollarChange: r2(qMap.get('DXY=X')?.regularMarketChangePercent || 0), goldChange: r2(qMap.get('GLD')?.regularMarketChangePercent || 0), bondChange: r2(qMap.get('TLT')?.regularMarketChangePercent || 0) };
  return { policySensitive, riskIndicators, uncertaintyLevel: vix > 25 ? 'Elevated' : 'Normal', generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[ElectionRisk] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
