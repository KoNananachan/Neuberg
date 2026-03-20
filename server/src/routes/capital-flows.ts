import { Router } from 'express';
import { getQuotes, getHistory } from '../services/stocks/yahoo-finance.js';

const router = Router();

// In-memory cache (5 min TTL)
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 12 * 60 * 60_000;
function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return Promise.resolve(entry.data as T);
  return fn().then(data => { cache.set(key, { data, ts: Date.now() }); return data; });
}

// ── Regional ETF definitions ──

interface EtfDef {
  symbol: string;
  name: string;
  region: string;
}

const REGION_ETFS: EtfDef[] = [
  // US
  { symbol: 'SPY', name: 'S&P 500', region: 'US' },
  { symbol: 'QQQ', name: 'Nasdaq 100', region: 'US' },
  { symbol: 'IWM', name: 'Russell 2000', region: 'US' },
  { symbol: 'VTI', name: 'Total Market', region: 'US' },
  // Europe
  { symbol: 'EZU', name: 'Eurozone', region: 'Europe' },
  { symbol: 'VGK', name: 'FTSE Europe', region: 'Europe' },
  { symbol: 'HEDJ', name: 'Europe Hedged', region: 'Europe' },
  // Japan
  { symbol: 'EWJ', name: 'Japan', region: 'Japan' },
  { symbol: 'DXJ', name: 'Japan Hedged', region: 'Japan' },
  // China
  { symbol: 'FXI', name: 'China Large-Cap', region: 'China' },
  { symbol: 'MCHI', name: 'China', region: 'China' },
  { symbol: 'KWEB', name: 'China Internet', region: 'China' },
  // EM (ex-China)
  { symbol: 'EEM', name: 'Emerging Markets', region: 'EM ex-China' },
  { symbol: 'VWO', name: 'FTSE EM', region: 'EM ex-China' },
  { symbol: 'IEMG', name: 'Core EM', region: 'EM ex-China' },
  // EM Asia
  { symbol: 'EEMA', name: 'EM Asia', region: 'EM Asia' },
  // EM Latin
  { symbol: 'ILF', name: 'Latin America 40', region: 'EM Latin' },
  // Frontier
  { symbol: 'FM', name: 'Frontier Markets', region: 'Frontier' },
  // Safe Haven
  { symbol: 'TLT', name: 'Long Bonds 20Y+', region: 'Safe Haven' },
  { symbol: 'GLD', name: 'Gold', region: 'Safe Haven' },
];

// CHF=X handled separately (no volume data for FX)
const FX_SYMBOL = 'CHF=X';

const ALL_ETF_SYMBOLS = REGION_ETFS.map(e => e.symbol);
const ALL_SYMBOLS = [...ALL_ETF_SYMBOLS, FX_SYMBOL];

const REGION_ORDER = ['US', 'Europe', 'Japan', 'China', 'EM ex-China', 'EM Asia', 'EM Latin', 'Frontier', 'Safe Haven'];

const DM_REGIONS = new Set(['US', 'Europe', 'Japan']);
const EM_REGIONS = new Set(['China', 'EM ex-China', 'EM Asia', 'EM Latin', 'Frontier']);
const SAFE_HAVEN_REGION = 'Safe Haven';
const RISK_REGIONS = new Set(['US', 'Europe', 'Japan', 'China', 'EM ex-China', 'EM Asia', 'EM Latin', 'Frontier']);

// ── History bar type ──

interface HistoryBar {
  date: string | number;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
}

// ── Flow calculation ──

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

type FlowTrend = 'strong_inflow' | 'inflow' | 'neutral' | 'outflow' | 'strong_outflow';

function determineTrend(flow5d: number, flow20d: number): FlowTrend {
  // Strong = both 5d and 20d agree and 5d magnitude is large
  if (flow5d > 0 && flow20d > 0) {
    return Math.abs(flow5d) > Math.abs(flow20d) * 0.4 ? 'strong_inflow' : 'inflow';
  }
  if (flow5d < 0 && flow20d < 0) {
    return Math.abs(flow5d) > Math.abs(flow20d) * 0.4 ? 'strong_outflow' : 'outflow';
  }
  if (flow5d > 0) return 'inflow';
  if (flow5d < 0) return 'outflow';
  return 'neutral';
}

// ── Flow map inference ──

interface FlowMapEntry {
  from: string;
  to: string;
  magnitude: number;
  description: string;
}

function computeFlowMap(
  regionFlows: Map<string, number>,
): FlowMapEntry[] {
  const entries: FlowMapEntry[] = [];
  const sorted = [...regionFlows.entries()].sort((a, b) => b[1] - a[1]);
  const maxAbs = Math.max(...sorted.map(([, v]) => Math.abs(v)), 1);

  // Find top inflows and top outflows
  const inflows = sorted.filter(([, v]) => v > 0);
  const outflows = sorted.filter(([, v]) => v < 0).reverse(); // most negative first

  // Create flow arrows from outflows to inflows
  for (const [fromRegion, fromFlow] of outflows) {
    for (const [toRegion, toFlow] of inflows) {
      const magnitude = Math.round(Math.min(Math.abs(fromFlow), Math.abs(toFlow)) / maxAbs * 10);
      if (magnitude < 1) continue;
      entries.push({
        from: fromRegion,
        to: toRegion,
        magnitude: Math.min(magnitude, 10),
        description: `Capital rotating from ${fromRegion} to ${toRegion}`,
      });
    }
  }

  // Sort by magnitude, keep top entries
  return entries.sort((a, b) => b.magnitude - a.magnitude).slice(0, 8);
}

// ── Route handler ──

router.get('/', async (_req, res) => {
  try {
    const result = await cached('capital-flows', async () => {
      // Fetch quotes and 30-day histories in parallel
      const [quotes, ...histories] = await Promise.all([
        getQuotes(ALL_SYMBOLS),
        ...ALL_ETF_SYMBOLS.map(symbol => getHistory(symbol, { range: '1mo', interval: '1d' })),
        getHistory(FX_SYMBOL, { range: '1mo', interval: '1d' }),
      ]);

      const quoteMap = new Map(quotes.map((q: { symbol: string }) => [q.symbol, q]));

      // Process ETF data
      const etfResults = REGION_ETFS.map((etf, i) => {
        const quote = quoteMap.get(etf.symbol) as Record<string, unknown> | undefined;
        const history = histories[i] as HistoryBar[];
        const dailyFlows = calculateDailyFlows(history);

        const flow5d = sumLast(dailyFlows, 5);
        const flow20d = sumLast(dailyFlows, 20);
        const flowHistory = dailyFlows.slice(-20);
        while (flowHistory.length < 20) flowHistory.unshift(0);

        return {
          symbol: etf.symbol,
          name: etf.name,
          region: etf.region,
          price: (quote?.price as number) ?? 0,
          changePct: (quote?.changePercent as number) ?? 0,
          flow5d,
          flow20d,
          flowHistory,
        };
      });

      // CHF data for carry trade signal
      const chfHistory = histories[histories.length - 1] as HistoryBar[];
      const chfValid = chfHistory.filter(b => b.close != null);
      let chfChangePct = 0;
      if (chfValid.length >= 6) {
        const recent = chfValid[chfValid.length - 1].close!;
        const fiveDaysAgo = chfValid[chfValid.length - 6].close!;
        chfChangePct = fiveDaysAgo !== 0 ? ((recent - fiveDaysAgo) / fiveDaysAgo) * 100 : 0;
      }

      // Group by region
      const regionGroups = new Map<string, typeof etfResults>();
      for (const etf of etfResults) {
        const list = regionGroups.get(etf.region) || [];
        list.push(etf);
        regionGroups.set(etf.region, list);
      }

      const regions = REGION_ORDER.map(regionName => {
        const etfs = (regionGroups.get(regionName) || [])
          .sort((a, b) => Math.abs(b.flow5d) - Math.abs(a.flow5d));

        const flow5d = Math.round(etfs.reduce((s, e) => s + e.flow5d, 0) * 100) / 100;
        const flow20d = Math.round(etfs.reduce((s, e) => s + e.flow20d, 0) * 100) / 100;
        const avgChangePct = etfs.length > 0
          ? Math.round(etfs.reduce((s, e) => s + e.changePct, 0) / etfs.length * 100) / 100
          : 0;

        return {
          name: regionName,
          flow5d,
          flow20d,
          trend: determineTrend(flow5d, flow20d),
          changePct: avgChangePct,
          etfs: etfs.map(e => ({
            symbol: e.symbol,
            name: e.name,
            price: e.price,
            changePct: e.changePct,
            flow5d: e.flow5d,
            flowHistory: e.flowHistory,
          })),
        };
      });

      // Compute region flow map for arrows
      const regionFlowMap = new Map<string, number>();
      for (const r of regions) {
        regionFlowMap.set(r.name, r.flow5d);
      }
      const flowMap = computeFlowMap(regionFlowMap);

      // ── Summary calculations ──

      // DM vs EM
      let dmFlow = 0;
      let emFlow = 0;
      for (const r of regions) {
        if (DM_REGIONS.has(r.name)) dmFlow += r.flow5d;
        if (EM_REGIONS.has(r.name)) emFlow += r.flow5d;
      }

      let dmVsEm: 'dm_favored' | 'em_favored' | 'balanced';
      const dmEmDiff = Math.abs(dmFlow - emFlow);
      const dmEmTotal = Math.abs(dmFlow) + Math.abs(emFlow);
      if (dmEmTotal > 0 && dmEmDiff / dmEmTotal > 0.2) {
        dmVsEm = dmFlow > emFlow ? 'dm_favored' : 'em_favored';
      } else {
        dmVsEm = 'balanced';
      }

      // Risk rotation
      const safeHavenRegion = regions.find(r => r.name === SAFE_HAVEN_REGION);
      const riskFlow = regions
        .filter(r => RISK_REGIONS.has(r.name))
        .reduce((s, r) => s + r.flow5d, 0);
      const safeFlow = safeHavenRegion?.flow5d ?? 0;

      let riskRotation: 'risk_on' | 'risk_off' | 'neutral';
      if (riskFlow > 0 && riskFlow > Math.abs(safeFlow)) {
        riskRotation = 'risk_on';
      } else if (safeFlow > 0 && safeFlow > Math.abs(riskFlow)) {
        riskRotation = 'risk_off';
      } else {
        riskRotation = 'neutral';
      }

      // Top inflow / outflow regions
      const sortedByFlow = [...regions].sort((a, b) => b.flow5d - a.flow5d);
      const topInflow = sortedByFlow[0]?.name ?? 'N/A';
      const topOutflow = sortedByFlow[sortedByFlow.length - 1]?.name ?? 'N/A';

      // Carry trade signal
      // Active carry trade: EM inflows + Japan outflows + JPY weakening (or CHF weakening)
      // Unwinding: EM outflows + Japan inflows + JPY/CHF strengthening
      const japanRegion = regions.find(r => r.name === 'Japan');
      const japanFlow = japanRegion?.flow5d ?? 0;
      const chfStrengthening = chfChangePct > 0.3; // CHF appreciating = risk-off signal

      let carryTradeSignal: 'active' | 'unwinding' | 'neutral';
      if (emFlow > 0 && japanFlow < 0 && !chfStrengthening) {
        carryTradeSignal = 'active';
      } else if (emFlow < 0 && (japanFlow > 0 || chfStrengthening)) {
        carryTradeSignal = 'unwinding';
      } else {
        carryTradeSignal = 'neutral';
      }

      // Narrative
      const narrativeParts: string[] = [];
      if (riskRotation === 'risk_on') {
        narrativeParts.push('Risk appetite is elevated with capital flowing into equities');
      } else if (riskRotation === 'risk_off') {
        narrativeParts.push('Defensive positioning as capital rotates into safe havens');
      } else {
        narrativeParts.push('Mixed signals with no clear risk preference');
      }

      if (dmVsEm === 'dm_favored') {
        narrativeParts.push('Developed markets are favored over emerging markets');
      } else if (dmVsEm === 'em_favored') {
        narrativeParts.push('Emerging markets are attracting capital over developed markets');
      }

      if (topInflow !== topOutflow) {
        narrativeParts.push(`Strongest inflows: ${topInflow}. Largest outflows: ${topOutflow}`);
      }

      if (carryTradeSignal === 'active') {
        narrativeParts.push('Carry trade appears active with EM inflows and weak safe-haven demand');
      } else if (carryTradeSignal === 'unwinding') {
        narrativeParts.push('Carry trade unwinding signals detected');
      }

      const narrative = narrativeParts.join('. ') + '.';

      return {
        timestamp: new Date().toISOString(),
        regions,
        flowMap,
        summary: {
          dmVsEm,
          riskRotation,
          topInflow,
          topOutflow,
          carryTradeSignal,
          narrative,
        },
      };
    });

    res.json(result);
  } catch (err) {
    console.error('[CapitalFlows] Error fetching capital flows:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Failed to fetch capital flow data' });
  }
});

export default router;
