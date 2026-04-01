import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

const COMMODITIES = [
  { sym: 'CL=F', name: 'Crude Oil (WTI)', sector: 'Energy', unit: '$/bbl' },
  { sym: 'BZ=F', name: 'Brent Crude', sector: 'Energy', unit: '$/bbl' },
  { sym: 'NG=F', name: 'Natural Gas', sector: 'Energy', unit: '$/mmbtu' },
  { sym: 'GC=F', name: 'Gold', sector: 'Precious Metals', unit: '$/oz' },
  { sym: 'SI=F', name: 'Silver', sector: 'Precious Metals', unit: '$/oz' },
  { sym: 'HG=F', name: 'Copper', sector: 'Industrial Metals', unit: '$/lb' },
  { sym: 'ZC=F', name: 'Corn', sector: 'Agriculture', unit: '$/bu' },
  { sym: 'ZS=F', name: 'Soybeans', sector: 'Agriculture', unit: '$/bu' },
  { sym: 'ZW=F', name: 'Wheat', sector: 'Agriculture', unit: '$/bu' },
  { sym: 'KC=F', name: 'Coffee', sector: 'Softs', unit: '$/lb' },
  { sym: 'CC=F', name: 'Cocoa', sector: 'Softs', unit: '$/ton' },
  { sym: 'CT=F', name: 'Cotton', sector: 'Softs', unit: '$/lb' },
];

const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }

async function fetchData() {
  const quotes = await getRawQuotes(COMMODITIES.map(c => c.sym));
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));

  const commodities = COMMODITIES.map(c => {
    const q = qMap.get(c.sym);
    const price = q?.regularMarketPrice || 0;
    const h52 = q?.fiftyTwoWeekHigh || price * 1.2;
    const l52 = q?.fiftyTwoWeekLow || price * 0.8;
    return {
      commodity: c.name, symbol: c.sym, sector: c.sector, unit: c.unit,
      price: r2(price), change: r2(q?.regularMarketChange || 0), changePct: r2(q?.regularMarketChangePercent || 0),
      high52w: r2(h52), low52w: r2(l52),
      percentile52w: r1(h52 !== l52 ? ((price - l52) / (h52 - l52)) * 100 : 50),
      volume: q?.regularMarketVolume || 0,
      supplyDemandBalance: (q?.regularMarketChangePercent || 0) > 1 ? 'Tight' : (q?.regularMarketChangePercent || 0) < -1 ? 'Surplus' : 'Balanced',
      inventoryTrend: (q?.regularMarketChangePercent || 0) > 0 ? 'Drawing' : 'Building',
    };
  });

  const sectorMap = new Map<string, typeof commodities>();
  for (const c of commodities) { if (!sectorMap.has(c.sector)) sectorMap.set(c.sector, []); sectorMap.get(c.sector)!.push(c); }
  const sectors = [...sectorMap.entries()].map(([sector, items]) => ({
    sector, count: items.length, avgChangePct: r2(items.reduce((s, i) => s + i.changePct, 0) / items.length),
    bestPerformer: items.sort((a, b) => b.changePct - a.changePct)[0]?.commodity || 'N/A',
  }));

  return { commodities, sectors, generatedAt: new Date().toISOString() };
}

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = await fetchData(); cache = { data, ts: now }; res.json(data);
  } catch (err) {
    console.error('[CommodityFundamental] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});
export default router;
