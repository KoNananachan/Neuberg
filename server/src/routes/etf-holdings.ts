import { Router } from 'express';
import { ensureCrumb, getQuotes } from '../services/stocks/yahoo-finance.js';

const YAHOO_API = 'https://query1.finance.yahoo.com';
const YAHOO_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

// ── Interfaces ──

interface ETFHolding {
  symbol: string;
  name: string;
  weight: number;
  shares: number;
}

interface SectorWeight {
  sector: string;
  weight: number;
}

interface ETFStats {
  totalHoldings: number;
  top10Weight: number;
  turnover: number | null;
  beta: number | null;
  yield: number | null;
}

interface ETFHoldingsData {
  symbol: string;
  name: string;
  price: number;
  aum: number | null;
  expenseRatio: number | null;
  holdings: ETFHolding[];
  sectorWeights: SectorWeight[];
  stats: ETFStats;
  updatedAt: string;
}

// ── Cache: 1 hour per symbol ──

const cache = new Map<string, { data: ETFHoldingsData; time: number }>();
const CACHE_TTL = 12 * 60 * 60_000; // 1 hour

// ── Helpers ──

function parseYahooRaw(obj: unknown): number | null {
  if (obj == null) return null;
  if (typeof obj === 'number') return obj;
  if (typeof obj === 'object' && 'raw' in (obj as Record<string, unknown>)) {
    const raw = (obj as Record<string, unknown>).raw;
    return typeof raw === 'number' ? raw : null;
  }
  return null;
}

// Sector key mapping: Yahoo returns keys like "realestate", "technology", etc.
const SECTOR_LABELS: Record<string, string> = {
  realestate: 'Real Estate',
  consumer_cyclical: 'Consumer Cyclical',
  basic_materials: 'Basic Materials',
  consumer_defensive: 'Consumer Defensive',
  technology: 'Technology',
  communication_services: 'Communication Services',
  financial_services: 'Financial Services',
  utilities: 'Utilities',
  industrials: 'Industrials',
  energy: 'Energy',
  healthcare: 'Healthcare',
};

function normalizeSectorKey(key: string): string {
  // Yahoo returns object keys like "realestate", "consumer_cyclical", etc.
  return SECTOR_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ── Fetch ETF holdings from Yahoo quoteSummary ──

async function fetchETFHoldings(symbol: string): Promise<ETFHoldingsData> {
  const auth = await ensureCrumb();

  // Fetch quote data and quoteSummary in parallel
  const [quotes, summaryData] = await Promise.all([
    getQuotes([symbol]).catch(() => []),
    fetchQuoteSummary(symbol, auth),
  ]);

  const quote = quotes[0];
  const name = quote?.name ?? symbol;
  const price = quote?.price ?? 0;

  if (!summaryData) {
    throw new Error(`No ETF data available for ${symbol}`);
  }

  // Check if this is actually an ETF with holdings data
  const topHoldings = summaryData.topHoldings;
  if (!topHoldings) {
    throw new Error(`${symbol} does not appear to be an ETF or has no holdings data`);
  }

  // Parse AUM from defaultKeyStatistics or summaryDetail
  // Use Record<string, any> for Yahoo's deeply nested response shape
  type YObj = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const keyStats = (summaryData.defaultKeyStatistics ?? {}) as YObj;
  const summaryDetail = (summaryData.summaryDetail ?? {}) as YObj;
  const fundProfile = (summaryData.fundProfile ?? {}) as YObj;

  const aum = parseYahooRaw(keyStats.totalAssets) ?? parseYahooRaw(summaryDetail.totalAssets) ?? null;

  // Expense ratio (net or gross)
  const fees = (fundProfile.feesExpensesInvestment ?? {}) as YObj;
  const expenseRatio = parseYahooRaw(fees.annualReportExpenseRatio)
    ?? parseYahooRaw(keyStats.annualReportExpenseRatio)
    ?? parseYahooRaw(fees.netExpenseRatio)
    ?? null;

  // Parse holdings
  const topHoldingsObj = topHoldings as YObj;
  const rawHoldings: Record<string, unknown>[] = topHoldingsObj.holdings ?? [];
  const holdings: ETFHolding[] = rawHoldings.map((h) => ({
    symbol: String(h.symbol ?? ''),
    name: String(h.holdingName ?? h.symbol ?? ''),
    weight: (parseYahooRaw(h.holdingPercent) ?? 0) * 100, // Convert from decimal
    shares: 0, // Yahoo doesn't provide share counts in topHoldings
  })).filter(h => h.symbol && h.weight > 0);

  // Parse sector weights
  const rawSectorWeights: Record<string, unknown>[] = topHoldingsObj.sectorWeightings ?? [];
  const sectorWeights: SectorWeight[] = [];
  for (const sectorObj of rawSectorWeights) {
    // Each entry is like { "realestate": { "raw": 0.02 } }
    for (const [key, val] of Object.entries(sectorObj)) {
      const weight = parseYahooRaw(val);
      if (weight != null && weight > 0) {
        sectorWeights.push({
          sector: normalizeSectorKey(key),
          weight: weight * 100, // Convert from decimal
        });
      }
    }
  }
  sectorWeights.sort((a, b) => b.weight - a.weight);

  // Calculate stats
  const top10Weight = holdings.slice(0, 10).reduce((sum, h) => sum + h.weight, 0);
  const totalHoldings = parseYahooRaw(keyStats.fundInceptionDate) != null
    ? holdings.length // If we only have top holdings, this is a minimum
    : holdings.length;

  // Turnover from fund profile
  const turnover = parseYahooRaw(fees.annualHoldingsTurnover)
    ?? parseYahooRaw(keyStats.annualHoldingsTurnover)
    ?? null;

  // Beta and yield
  const beta = parseYahooRaw(keyStats.beta3Year) ?? parseYahooRaw(summaryDetail.beta) ?? null;
  const yieldVal = parseYahooRaw(summaryDetail.yield) ?? parseYahooRaw(keyStats.yield) ?? null;

  return {
    symbol: symbol.toUpperCase(),
    name,
    price,
    aum,
    expenseRatio: expenseRatio != null ? expenseRatio * 100 : null, // Convert to percentage
    holdings,
    sectorWeights,
    stats: {
      totalHoldings: totalHoldings > 0 ? totalHoldings : holdings.length,
      top10Weight: +top10Weight.toFixed(2),
      turnover: turnover != null ? +(turnover * 100).toFixed(2) : null,
      beta: beta != null ? +beta.toFixed(2) : null,
      yield: yieldVal != null ? +(yieldVal * 100).toFixed(2) : null,
    },
    updatedAt: new Date().toISOString(),
  };
}

async function fetchQuoteSummary(
  symbol: string,
  auth: { crumb: string; cookie: string } | null,
): Promise<Record<string, unknown> | null> {
  if (!auth) return null;

  const modules = 'topHoldings,fundProfile,defaultKeyStatistics,summaryDetail';
  const url = `${YAHOO_API}/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}&crumb=${encodeURIComponent(auth.crumb)}`;

  try {
    let resp = await fetch(url, {
      headers: { 'User-Agent': YAHOO_UA, 'Cookie': auth.cookie },
    });

    // Retry once on 401 (crumb expired)
    if (resp.status === 401) {
      const retry = await ensureCrumb();
      if (!retry) return null;
      const retryUrl = `${YAHOO_API}/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}&crumb=${encodeURIComponent(retry.crumb)}`;
      resp = await fetch(retryUrl, {
        headers: { 'User-Agent': YAHOO_UA, 'Cookie': retry.cookie },
      });
    }

    if (!resp.ok) return null;
    const data = (await resp.json()) as Record<string, unknown>;
    const result = (data as Record<string, unknown>)?.quoteSummary as Record<string, unknown> | undefined;
    const results = result?.result as Record<string, unknown>[] | undefined;
    return results?.[0] ?? null;
  } catch (err) {
    console.error(`[ETF-Holdings] Error fetching quoteSummary for ${symbol}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

// ── Router ──

const router = Router();

// GET /api/etf-holdings/:symbol
router.get('/:symbol', async (req, res) => {
  try {
    const symbol = (req.params.symbol || '').toUpperCase().trim();
    if (!symbol || symbol.length > 10) {
      return res.status(400).json({ error: 'Invalid symbol' });
    }

    // Check cache
    const cached = cache.get(symbol);
    if (cached && Date.now() - cached.time < CACHE_TTL) {
      return res.json(cached.data);
    }

    const data = await fetchETFHoldings(symbol);
    cache.set(symbol, { data, time: Date.now() });

    // Cap cache size
    if (cache.size > 200) {
      const oldest = cache.keys().next().value;
      if (oldest) cache.delete(oldest);
    }

    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[ETF-Holdings] Error:', message);

    // Return stale cache if available
    const symbol = (req.params.symbol || '').toUpperCase().trim();
    const stale = cache.get(symbol);
    if (stale) return res.json(stale.data);

    // Check if it's a "not an ETF" error vs a server error
    if (message.includes('does not appear') || message.includes('No ETF data')) {
      return res.status(404).json({ error: message });
    }

    res.status(503).json({ error: 'ETF holdings data temporarily unavailable' });
  }
});

export default router;
