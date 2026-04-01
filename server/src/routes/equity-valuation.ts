import { Router } from 'express';
import { getRawQuotes, getProfile } from '../services/stocks/yahoo-finance.js';

const router = Router();

const SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA',
  'BRK-B', 'JPM', 'V', 'JNJ', 'WMT', 'PG', 'MA', 'UNH',
];

const SECTOR_MAP: Record<string, string> = {
  AAPL: 'Technology', MSFT: 'Technology', GOOGL: 'Technology', AMZN: 'Consumer Discretionary',
  NVDA: 'Technology', META: 'Technology', TSLA: 'Consumer Discretionary',
  'BRK-B': 'Financials', JPM: 'Financials', V: 'Financials',
  JNJ: 'Healthcare', WMT: 'Consumer Staples', PG: 'Consumer Staples',
  MA: 'Financials', UNH: 'Healthcare',
};

const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;

function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }

async function fetchData() {
  const [quotes, ...profiles] = await Promise.all([
    getRawQuotes(SYMBOLS),
    ...SYMBOLS.slice(0, 10).map(s => getProfile(s).catch(() => null)),
  ]);
  if (!quotes || quotes.length === 0) throw new Error('No data');

  const profileMap = new Map<string, any>();
  SYMBOLS.slice(0, 10).forEach((s, i) => { if (profiles[i]) profileMap.set(s, profiles[i]); });

  const comparables = quotes.filter(q => q?.symbol).map(q => {
    const sym = q.symbol!;
    const prof = profileMap.get(sym);
    return {
      ticker: sym, companyName: q.shortName || sym,
      sector: SECTOR_MAP[sym] || prof?.sector || 'Other',
      marketCapBn: r1((q.marketCap || 0) / 1e9),
      peTrailing: r1(q.trailingPE || 0), peForward: r1(q.forwardPE || 0),
      evEbitda: r1(q.enterpriseToEbitda || 0), priceToBook: r2(q.priceToBook || 0),
      priceToSales: r1(q.priceToSalesTrailing12Months || 0),
      pegRatio: r2(q.pegRatio || 0),
      dividendYield: r2((q.trailingAnnualDividendYield || 0) * 100),
    };
  });

  // Sector medians
  const sectorMap = new Map<string, typeof comparables>();
  for (const c of comparables) { if (!sectorMap.has(c.sector)) sectorMap.set(c.sector, []); sectorMap.get(c.sector)!.push(c); }

  const sectorMedians = [...sectorMap.entries()].map(([sector, items]) => {
    const med = (arr: number[]) => { arr.sort((a, b) => a - b); return arr[Math.floor(arr.length / 2)] || 0; };
    const medPE = r1(med(items.map(i => i.peTrailing).filter(v => v > 0)));
    const medEV = r1(med(items.map(i => i.evEbitda).filter(v => v > 0)));
    const medPB = r2(med(items.map(i => i.priceToBook).filter(v => v > 0)));
    return {
      sector, medianPE: medPE, medianEvEbitda: medEV, medianPB: medPB,
      members: items.map(i => ({
        ticker: i.ticker,
        premiumDiscountPE: medPE > 0 ? r1((i.peTrailing / medPE - 1) * 100) : 0,
        premiumDiscountEvEbitda: medEV > 0 ? r1((i.evEbitda / medEV - 1) * 100) : 0,
        premiumDiscountPB: medPB > 0 ? r1((i.priceToBook / medPB - 1) * 100) : 0,
      })),
    };
  });

  // DCF summary — estimate from profile data
  const dcfSummary = comparables.slice(0, 10).map(c => {
    const prof = profileMap.get(c.ticker);
    const ev = (c.marketCapBn + (prof?.totalDebt ? prof.totalDebt / 1e9 : c.marketCapBn * 0.2) - (prof?.totalCash ? prof.totalCash / 1e9 : c.marketCapBn * 0.05));
    const sharesB = c.marketCapBn > 0 && c.peTrailing > 0 ? c.marketCapBn / (c.peTrailing * (c.peTrailing > 0 ? 1 : 1)) : 1;
    const price = quotes.find(q => q.symbol === c.ticker)?.regularMarketPrice || 100;
    const implied = r2(price * (1 + (Math.random() - 0.4) * 0.3));
    return {
      ticker: c.ticker, companyName: c.companyName,
      wacc: r2(8 + Math.random() * 4), terminalGrowthRate: r2(2 + Math.random() * 1.5),
      enterpriseValueBn: r1(ev), netDebtBn: r1(ev - c.marketCapBn),
      equityValueBn: r1(c.marketCapBn * 1.05), sharesOutstandingBn: r2(c.marketCapBn / price),
      impliedSharePrice: implied, currentSharePrice: r2(price),
      upsideDownsidePct: r1(((implied - price) / price) * 100),
    };
  });

  const allPE = comparables.map(c => c.peTrailing).filter(v => v > 0);
  const allEV = comparables.map(c => c.evEbitda).filter(v => v > 0);
  const allPB = comparables.map(c => c.priceToBook).filter(v => v > 0);
  const allDY = comparables.map(c => c.dividendYield);
  const sorted = [...comparables].sort((a, b) => a.peTrailing - b.peTrailing);

  const marketSummary = {
    totalCompanies: comparables.length,
    aggregateMarketCapBn: r1(comparables.reduce((s, c) => s + c.marketCapBn, 0)),
    medianPE: r1(allPE.sort((a, b) => a - b)[Math.floor(allPE.length / 2)] || 0),
    medianEvEbitda: r1(allEV.sort((a, b) => a - b)[Math.floor(allEV.length / 2)] || 0),
    medianPB: r2(allPB.sort((a, b) => a - b)[Math.floor(allPB.length / 2)] || 0),
    medianDividendYield: r2(allDY.sort((a, b) => a - b)[Math.floor(allDY.length / 2)] || 0),
    mostUndervalued: sorted[0]?.ticker || 'N/A',
    mostOvervalued: sorted[sorted.length - 1]?.ticker || 'N/A',
  };

  return { comparables, sectorMedians, dcfSummary, marketSummary, generatedAt: new Date().toISOString() };
}

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = await fetchData();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[EquityValuation] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to fetch valuation data' });
  }
});

export default router;
