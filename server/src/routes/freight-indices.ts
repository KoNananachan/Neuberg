import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['BDRY', 'SBLK', 'GOGL', 'GNK', 'EGLE', 'ZIM', 'FRO', 'STNG', 'CL=F', 'NG=F'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const bdry = qMap.get('BDRY'); const bdi = Math.round((bdry?.regularMarketPrice || 10) * 150);
  const indices = [{ id: 'BDI', name: 'Baltic Dry Index', value: bdi }, { id: 'BCI', name: 'Baltic Capesize', value: Math.round(bdi * 1.4) }, { id: 'BPI', name: 'Baltic Panamax', value: Math.round(bdi * 0.9) }, { id: 'BSI', name: 'Baltic Supramax', value: Math.round(bdi * 0.7) }].map(idx => ({ ...idx, change: Math.round((bdry?.regularMarketChangePercent || 0) * idx.value / 100) }));
  const stocks = ['SBLK', 'GOGL', 'GNK', 'EGLE', 'ZIM', 'FRO', 'STNG'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), dividendYield: r2((q?.trailingAnnualDividendYield || 0) * 100) }; });
  return { indices, stocks, fuelCosts: { oil: r2(qMap.get('CL=F')?.regularMarketPrice || 0), natGas: r2(qMap.get('NG=F')?.regularMarketPrice || 0) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[FreightIndices] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
