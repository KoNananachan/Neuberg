import { Router } from 'express';
import { getQuotes, getHistory } from '../services/stocks/yahoo-finance.js';

const router = Router();

// In-memory cache (5 min TTL)
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 5 * 60_000;
function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return Promise.resolve(entry.data as T);
  return fn().then(data => { cache.set(key, { data, ts: Date.now() }); return data; });
}

// ETF definitions by category
interface EtfDef {
  symbol: string;
  name: string;
  category: 'equity' | 'fixed_income' | 'commodity' | 'sector';
}

const ETFS: EtfDef[] = [
  // Equity
  { symbol: 'SPY', name: 'S&P 500', category: 'equity' },
  { symbol: 'QQQ', name: 'Nasdaq 100', category: 'equity' },
  { symbol: 'IWM', name: 'Russell 2000', category: 'equity' },
  { symbol: 'EFA', name: 'Developed Intl', category: 'equity' },
  { symbol: 'EEM', name: 'Emerging Mkts', category: 'equity' },
  { symbol: 'VTI', name: 'Total Market', category: 'equity' },
  // Fixed Income
  { symbol: 'TLT', name: 'Long Bonds 20Y+', category: 'fixed_income' },
  { symbol: 'IEF', name: 'Treasury 7-10Y', category: 'fixed_income' },
  { symbol: 'HYG', name: 'High Yield Corp', category: 'fixed_income' },
  { symbol: 'LQD', name: 'Inv. Grade Corp', category: 'fixed_income' },
  { symbol: 'AGG', name: 'US Agg Bond', category: 'fixed_income' },
  { symbol: 'TIP', name: 'TIPS', category: 'fixed_income' },
  // Commodities
  { symbol: 'GLD', name: 'Gold', category: 'commodity' },
  { symbol: 'SLV', name: 'Silver', category: 'commodity' },
  { symbol: 'USO', name: 'Crude Oil', category: 'commodity' },
  { symbol: 'DBA', name: 'Agriculture', category: 'commodity' },
  // Sector
  { symbol: 'XLK', name: 'Technology', category: 'sector' },
  { symbol: 'XLF', name: 'Financials', category: 'sector' },
  { symbol: 'XLE', name: 'Energy', category: 'sector' },
  { symbol: 'XLV', name: 'Healthcare', category: 'sector' },
  { symbol: 'XLI', name: 'Industrials', category: 'sector' },
  { symbol: 'XLRE', name: 'Real Estate', category: 'sector' },
];

const ALL_SYMBOLS = ETFS.map(e => e.symbol);

const CATEGORY_LABELS: Record<string, string> = {
  equity: 'Equity',
  fixed_income: 'Fixed Income',
  commodity: 'Commodities',
  sector: 'Sector',
};

interface HistoryBar {
  date: string | number;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
}

/**
 * Calculate daily flow proxies from history bars.
 * Daily flow = direction(close change) x volume x avg_price / 1e6 (in millions)
 */
function calculateDailyFlows(bars: HistoryBar[]): number[] {
  const valid = bars.filter(b => b.close != null && b.volume != null && b.open != null);
  if (valid.length < 2) return [];

  const flows: number[] = [];
  for (let i = 1; i < valid.length; i++) {
    const prevClose = valid[i - 1].close!;
    const currClose = valid[i].close!;
    const avgPrice = (valid[i].open! + currClose) / 2;
    const direction = currClose >= prevClose ? 1 : -1;
    const flow = direction * valid[i].volume! * avgPrice / 1e6;
    flows.push(Math.round(flow * 100) / 100);
  }
  return flows;
}

function sumLast(arr: number[], n: number): number {
  const slice = arr.slice(-n);
  return Math.round(slice.reduce((s, v) => s + v, 0) * 100) / 100;
}

function determineTrend(flow5d: number): 'inflow' | 'outflow' | 'neutral' {
  if (flow5d > 0) return 'inflow';
  if (flow5d < 0) return 'outflow';
  return 'neutral';
}

// GET /api/fund-flows
router.get('/', async (_req, res) => {
  try {
    const result = await cached('fund-flows', async () => {
      // Fetch quotes and 30-day histories in parallel
      const [quotes, ...histories] = await Promise.all([
        getQuotes(ALL_SYMBOLS),
        ...ALL_SYMBOLS.map(symbol => getHistory(symbol, { range: '1mo', interval: '1d' })),
      ]);

      const quoteMap = new Map(quotes.map(q => [q.symbol, q]));

      // Build per-ETF data
      const etfResults = ETFS.map((etf, i) => {
        const quote = quoteMap.get(etf.symbol);
        const history = histories[i] as HistoryBar[];
        const dailyFlows = calculateDailyFlows(history);

        const flow5d = sumLast(dailyFlows, 5);
        const flow20d = sumLast(dailyFlows, 20);
        const flowHistory = dailyFlows.slice(-20);
        // Pad to 20 if needed
        while (flowHistory.length < 20) flowHistory.unshift(0);

        return {
          symbol: etf.symbol,
          name: etf.name,
          category: etf.category,
          price: quote?.price ?? 0,
          changePct: quote?.changePercent ?? 0,
          aum: quote?.marketCap ?? 0,
          volume: quote?.volume ?? 0,
          flow5d,
          flow20d,
          flowTrend: determineTrend(flow5d),
          flowHistory,
        };
      });

      // Group by category
      const categoryGroups = new Map<string, typeof etfResults>();
      for (const etf of etfResults) {
        const list = categoryGroups.get(etf.category) || [];
        list.push(etf);
        categoryGroups.set(etf.category, list);
      }

      const categories = ['equity', 'fixed_income', 'commodity', 'sector'].map(cat => {
        const etfs = (categoryGroups.get(cat) || [])
          .sort((a, b) => Math.abs(b.flow5d) - Math.abs(a.flow5d));

        const totalFlow5d = Math.round(etfs.reduce((s, e) => s + e.flow5d, 0) * 100) / 100;
        const totalFlow20d = Math.round(etfs.reduce((s, e) => s + e.flow20d, 0) * 100) / 100;

        return {
          name: CATEGORY_LABELS[cat] || cat,
          totalFlow5d,
          totalFlow20d,
          trend: determineTrend(totalFlow5d),
          etfs: etfs.map(e => ({
            symbol: e.symbol,
            name: e.name,
            price: e.price,
            changePct: e.changePct,
            aum: e.aum,
            volume: e.volume,
            flow5d: e.flow5d,
            flow20d: e.flow20d,
            flowTrend: e.flowTrend,
            flowHistory: e.flowHistory,
          })),
        };
      });

      // Summary
      const equityCat = categories.find(c => c.name === 'Equity');
      const bondCat = categories.find(c => c.name === 'Fixed Income');
      const commodityCat = categories.find(c => c.name === 'Commodities');

      const netEquityFlow = equityCat?.totalFlow5d ?? 0;
      const netBondFlow = bondCat?.totalFlow5d ?? 0;
      const netCommodityFlow = commodityCat?.totalFlow5d ?? 0;

      // Risk appetite: equity inflows dominate = risk_on, bond inflows dominate = risk_off
      let riskAppetite: 'risk_on' | 'risk_off' | 'neutral';
      if (netEquityFlow > 0 && netEquityFlow > Math.abs(netBondFlow)) {
        riskAppetite = 'risk_on';
      } else if (netBondFlow > 0 && netBondFlow > Math.abs(netEquityFlow)) {
        riskAppetite = 'risk_off';
      } else {
        riskAppetite = 'neutral';
      }

      // Rotation signal
      let rotationSignal = 'No clear rotation';
      const sectorCat = categories.find(c => c.name === 'Sector');
      if (sectorCat) {
        const topInflow = sectorCat.etfs.find(e => e.flow5d > 0);
        const topOutflow = [...sectorCat.etfs].sort((a, b) => a.flow5d - b.flow5d).find(e => e.flow5d < 0);
        if (topInflow && topOutflow) {
          rotationSignal = `${topOutflow.name} -> ${topInflow.name}`;
        } else if (topInflow) {
          rotationSignal = `Into ${topInflow.name}`;
        } else if (topOutflow) {
          rotationSignal = `Out of ${topOutflow.name}`;
        }
      }

      return {
        timestamp: new Date().toISOString(),
        categories,
        summary: {
          netEquityFlow,
          netBondFlow,
          netCommodityFlow,
          riskAppetite,
          rotationSignal,
        },
      };
    });

    res.json(result);
  } catch (err) {
    console.error('[FundFlows] Error fetching fund flows:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Failed to fetch fund flow data' });
  }
});

export default router;
