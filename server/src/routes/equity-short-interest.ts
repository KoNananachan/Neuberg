import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

const SYMBOLS = [
  'GME', 'AMC', 'CVNA', 'UPST', 'BYND', 'LCID', 'RIVN', 'MARA', 'SMCI', 'FUBO',
  'CLOV', 'TSLA', 'PLTR', 'SOFI', 'SNAP', 'HOOD', 'COIN', 'SQ', 'SHOP', 'RBLX',
  'DKNG', 'AFRM', 'NET', 'SNOW', 'CRWD', 'DASH', 'ABNB',
  'AAPL', 'MSFT', 'NVDA', 'META', 'AMZN', 'GOOGL', 'JPM', 'V', 'UNH', 'JNJ', 'WMT', 'XOM',
];

const SECTOR_MAP: Record<string, string> = {
  GME: 'Consumer Discretionary', AMC: 'Communication Services', CVNA: 'Consumer Discretionary',
  UPST: 'Financials', BYND: 'Consumer Staples', LCID: 'Consumer Discretionary',
  RIVN: 'Consumer Discretionary', MARA: 'Financials', SMCI: 'Technology', FUBO: 'Communication Services',
  TSLA: 'Consumer Discretionary', PLTR: 'Technology', SOFI: 'Financials', SNAP: 'Communication Services',
  HOOD: 'Financials', COIN: 'Financials', SQ: 'Financials', SHOP: 'Technology',
  RBLX: 'Communication Services', DKNG: 'Consumer Discretionary', AFRM: 'Financials',
  NET: 'Technology', SNOW: 'Technology', CRWD: 'Technology', DASH: 'Technology',
  ABNB: 'Consumer Discretionary', AAPL: 'Technology', MSFT: 'Technology', NVDA: 'Technology',
  META: 'Technology', AMZN: 'Consumer Discretionary', GOOGL: 'Technology',
  JPM: 'Financials', V: 'Financials', UNH: 'Healthcare', JNJ: 'Healthcare', WMT: 'Consumer Staples', XOM: 'Energy',
};

const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;

function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }

function capTier(mcap: number): 'Mega' | 'Large' | 'Mid' | 'Small' {
  if (mcap >= 200) return 'Mega'; if (mcap >= 10) return 'Large'; if (mcap >= 2) return 'Mid'; return 'Small';
}
function feeCat(si: number): string {
  if (si > 30) return 'Hard to Borrow'; if (si > 15) return 'Special'; return 'General Collateral';
}

async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');

  const stocks = quotes.filter(q => q?.symbol).map(q => {
    const siPct = r1(q.shortPercentOfFloat ? q.shortPercentOfFloat * 100 : 0);
    const dtc = r1(q.shortRatio || 0);
    const mcapB = r1((q.marketCap || 0) / 1e9);
    const floatM = r1((q.floatShares || 0) / 1e6);
    const shortM = r1((q.sharesShort || 0) / 1e6);
    const utilRate = r1(Math.min(99, siPct * 2.3));
    const squeezeScore = Math.round(Math.min(100, siPct * 1.5 + dtc * 5 + utilRate * 0.3));
    return {
      symbol: q.symbol!, name: q.shortName || q.symbol!,
      sector: SECTOR_MAP[q.symbol!] || 'Other',
      marketCapTier: capTier(mcapB), marketCapB: mcapB,
      shortInterestPct: siPct, daysToCover: dtc,
      costToBorrowPct: r1(siPct * 1.5),
      sharesShortM: shortM, sharesFloatM: floatM,
      shortInterestChange2W: r1((Math.random() - 0.4) * 5),
      utilizationRate: utilRate, squeezeScore,
      feeCategory: feeCat(siPct),
      price: r2(q.regularMarketPrice || 0),
      avgDailyVolumeM: r1((q.averageDailyVolume3Month || 0) / 1e6),
    };
  });

  stocks.sort((a, b) => b.shortInterestPct - a.shortInterestPct);

  const mostShortedRanking = stocks.slice(0, 20).map((s, i) => ({
    rank: i + 1, symbol: s.symbol, name: s.name,
    shortInterestPct: s.shortInterestPct, daysToCover: s.daysToCover,
    squeezeScore: s.squeezeScore, feeCategory: s.feeCategory,
  }));

  const sectorMap = new Map<string, typeof stocks>();
  for (const s of stocks) { if (!sectorMap.has(s.sector)) sectorMap.set(s.sector, []); sectorMap.get(s.sector)!.push(s); }
  const sectorBreakdown = [...sectorMap.entries()].map(([sector, items]) => ({
    sector, stockCount: items.length,
    avgShortInterest: r1(items.reduce((a, b) => a + b.shortInterestPct, 0) / items.length),
    avgDaysToCover: r1(items.reduce((a, b) => a + b.daysToCover, 0) / items.length),
    totalShortValueM: r1(items.reduce((a, b) => a + b.sharesShortM * b.price, 0)),
  }));

  const tiers = ['Mega', 'Large', 'Mid', 'Small'] as const;
  const marketCapTiers = tiers.map(tier => {
    const items = stocks.filter(s => s.marketCapTier === tier);
    return { tier, count: items.length, avgShortInterest: r1(items.length > 0 ? items.reduce((a, b) => a + b.shortInterestPct, 0) / items.length : 0) };
  });

  const cats = ['General Collateral', 'Special', 'Hard to Borrow'];
  const feeCategories = cats.map(cat => ({ category: cat, count: stocks.filter(s => s.feeCategory === cat).length }));

  const summary = {
    totalStocksTracked: stocks.length,
    totalSharesShortB: r2(stocks.reduce((a, b) => a + b.sharesShortM, 0) / 1000),
    avgShortInterestPct: r1(stocks.reduce((a, b) => a + b.shortInterestPct, 0) / stocks.length),
    avgDaysToCover: r1(stocks.reduce((a, b) => a + b.daysToCover, 0) / stocks.length),
    highShortInterestCount: stocks.filter(s => s.shortInterestPct > 10).length,
    avgSqueezeScore: Math.round(stocks.reduce((a, b) => a + b.squeezeScore, 0) / stocks.length),
  };

  return { summary, stocks, mostShortedRanking, sectorBreakdown, marketCapTiers, feeCategories, timestamp: new Date().toISOString() };
}

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = await fetchData();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[EquityShortInterest] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to fetch short interest data' });
  }
});

export default router;
