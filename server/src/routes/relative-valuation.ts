import { Router } from 'express';
import { ensureCrumb, getQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

const YAHOO_API = 'https://query2.finance.yahoo.com';
const YAHOO_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

// ── Sector → representative peer tickers ──

const SECTOR_PEERS: Record<string, string[]> = {
  'Technology': ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META', 'AVGO', 'ADBE', 'CRM'],
  'Healthcare': ['UNH', 'JNJ', 'LLY', 'PFE', 'ABBV', 'MRK', 'TMO', 'ABT'],
  'Financial Services': ['JPM', 'BAC', 'GS', 'MS', 'V', 'MA', 'BLK', 'SCHW'],
  'Consumer Cyclical': ['AMZN', 'TSLA', 'HD', 'NKE', 'MCD', 'SBUX', 'LOW', 'TJX'],
  'Industrials': ['CAT', 'HON', 'UPS', 'RTX', 'GE', 'BA', 'MMM', 'DE'],
  'Communication Services': ['GOOGL', 'META', 'DIS', 'NFLX', 'CMCSA', 'T', 'VZ', 'TMUS'],
  'Consumer Defensive': ['PG', 'KO', 'PEP', 'WMT', 'COST', 'PM', 'CL', 'MDLZ'],
  'Energy': ['XOM', 'CVX', 'COP', 'SLB', 'EOG', 'MPC', 'PSX', 'OXY'],
  'Basic Materials': ['LIN', 'APD', 'ECL', 'SHW', 'FCX', 'NEM', 'NUE', 'DOW'],
  'Real Estate': ['PLD', 'AMT', 'EQIX', 'SPG', 'PSA', 'O', 'WELL', 'DLR'],
  'Utilities': ['NEE', 'DUK', 'SO', 'D', 'AEP', 'SRE', 'EXC', 'XEL'],
};

// ── Types ──

interface ValuationMetrics {
  pe: number | null;
  forwardPE: number | null;
  pb: number | null;
  ps: number | null;
  peg: number | null;
  evEbitda: number | null;
  debtEquity: number | null;
  roe: number | null;
  dividendYield: number | null;
  marketCap: number | null;
}

interface PeerEntry {
  symbol: string;
  name: string;
  metrics: ValuationMetrics;
}

interface RelativeValuationResponse {
  target: {
    symbol: string;
    name: string;
    sector: string;
    metrics: ValuationMetrics;
  };
  peers: PeerEntry[];
  sectorMedians: ValuationMetrics;
}

// ── Cache ──

const cache = new Map<string, { data: RelativeValuationResponse; ts: number }>();
const TTL = 15 * 60_000; // 15 minutes

// ── Helpers ──

function median(values: number[]): number | null {
  const valid = values.filter((v) => v != null && isFinite(v));
  if (valid.length === 0) return null;
  valid.sort((a, b) => a - b);
  const mid = Math.floor(valid.length / 2);
  return valid.length % 2 !== 0 ? valid[mid] : (valid[mid - 1] + valid[mid]) / 2;
}

function extractMetricsFromQuoteSummary(result: Record<string, unknown>): ValuationMetrics {
  const sd = (result.summaryDetail || {}) as Record<string, { raw?: number }>;
  const ks = (result.defaultKeyStatistics || {}) as Record<string, { raw?: number }>;
  const fd = (result.financialData || {}) as Record<string, { raw?: number }>;

  return {
    pe: sd.trailingPE?.raw ?? null,
    forwardPE: sd.forwardPE?.raw ?? null,
    pb: sd.priceToBook?.raw ?? null,
    ps: sd.priceToSalesTrailing12Months?.raw ?? null,
    peg: ks.pegRatio?.raw ?? null,
    evEbitda: ks.enterpriseToEbitda?.raw ?? null,
    debtEquity: fd.debtToEquity?.raw ?? null,
    roe: fd.returnOnEquity?.raw ?? null,
    dividendYield: sd.dividendYield?.raw ?? null,
    marketCap: sd.marketCap?.raw ?? null,
  };
}

function extractMetricsFromQuote(q: Record<string, unknown>): ValuationMetrics {
  return {
    pe: (q.trailingPE as number) ?? null,
    forwardPE: (q.forwardPE as number) ?? null,
    pb: (q.priceToBook as number) ?? null,
    ps: (q.priceToSalesTrailing12Months as number) ?? null,
    peg: (q.pegRatio as number) ?? null,
    evEbitda: (q.enterpriseToEbitda as number) ?? null,
    debtEquity: (q.debtToEquity as number) ?? null,
    roe: (q.returnOnEquity as number) ?? null,
    dividendYield: (q.trailingAnnualDividendYield as number) ?? null,
    marketCap: (q.marketCap as number) ?? null,
  };
}

function computeSectorMedians(entries: PeerEntry[]): ValuationMetrics {
  const keys: (keyof ValuationMetrics)[] = [
    'pe', 'forwardPE', 'pb', 'ps', 'peg', 'evEbitda',
    'debtEquity', 'roe', 'dividendYield', 'marketCap',
  ];
  const result: Record<string, number | null> = {};
  for (const key of keys) {
    const vals = entries
      .map((e) => e.metrics[key])
      .filter((v): v is number => v != null && isFinite(v));
    result[key] = median(vals);
  }
  return result as unknown as ValuationMetrics;
}

// ── Route ──

router.get('/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();

    // Check cache
    const cached = cache.get(symbol);
    if (cached && Date.now() - cached.ts < TTL) {
      return res.json(cached.data);
    }

    // Step 1: Fetch quoteSummary for the target symbol
    const auth = await ensureCrumb();
    if (!auth) {
      return res.status(503).json({ error: 'Relative valuation temporarily unavailable' });
    }

    const modules = 'summaryDetail,defaultKeyStatistics,financialData,assetProfile';
    const summaryUrl = `${YAHOO_API}/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}&crumb=${encodeURIComponent(auth.crumb)}`;
    const summaryResp = await fetch(summaryUrl, {
      headers: { 'User-Agent': YAHOO_UA, Cookie: auth.cookie },
    });

    if (!summaryResp.ok) {
      console.error(`[RelativeValuation] quoteSummary returned ${summaryResp.status} for ${symbol}`);
      if (cached) return res.json(cached.data);
      return res.status(502).json({ error: 'Failed to fetch valuation data' });
    }

    const summaryData = (await summaryResp.json()) as {
      quoteSummary?: { result?: Array<Record<string, unknown>> };
    };
    const summaryResult = summaryData?.quoteSummary?.result?.[0];
    if (!summaryResult) {
      if (cached) return res.json(cached.data);
      return res.status(404).json({ error: 'Symbol not found' });
    }

    const assetProfile = (summaryResult.assetProfile || {}) as Record<string, unknown>;
    const sector = (assetProfile.sector as string) || 'Technology';
    const companyName = (assetProfile.longName as string) || (assetProfile.shortName as string) || symbol;
    const targetMetrics = extractMetricsFromQuoteSummary(summaryResult);

    // Step 2: Identify peers from sector map
    const sectorPeers = SECTOR_PEERS[sector] || SECTOR_PEERS['Technology'];
    // Make sure the target is included, deduplicate
    const allSymbols = Array.from(new Set([symbol, ...sectorPeers]));

    // Step 3: Fetch quotes for all symbols (batch)
    const quotes = await getQuotes(allSymbols);
    const quoteMap = new Map<string, Record<string, unknown>>();
    for (const q of quotes) {
      quoteMap.set((q as Record<string, unknown>).symbol as string, q as Record<string, unknown>);
    }

    // Step 4: Build peer list
    const peers: PeerEntry[] = [];
    for (const sym of allSymbols) {
      if (sym === symbol) continue;
      const q = quoteMap.get(sym);
      if (!q) continue;
      peers.push({
        symbol: sym,
        name: (q.name as string) || sym,
        metrics: extractMetricsFromQuote(q),
      });
    }

    // Step 5: Compute sector medians (include target in the median computation)
    const targetEntry: PeerEntry = { symbol, name: companyName, metrics: targetMetrics };
    const allEntries = [targetEntry, ...peers];
    const sectorMedians = computeSectorMedians(allEntries);

    const response: RelativeValuationResponse = {
      target: {
        symbol,
        name: companyName,
        sector,
        metrics: targetMetrics,
      },
      peers,
      sectorMedians,
    };

    cache.set(symbol, { data: response, ts: Date.now() });
    res.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[RelativeValuation] Error:', message);
    const cached = cache.get(req.params.symbol?.toUpperCase());
    if (cached) return res.json(cached.data);
    res.status(500).json({ error: 'Failed to fetch relative valuation data' });
  }
});

export default router;
