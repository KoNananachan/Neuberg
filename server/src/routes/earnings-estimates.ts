import { Router } from 'express';
import { getQuote, ensureCrumb } from '../services/stocks/yahoo-finance.js';

const YAHOO_API = 'https://query1.finance.yahoo.com';
const YAHOO_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

interface EarningsEstimatesResponse {
  symbol: string;
  companyName: string;
  currentPrice: number;
  eps: {
    ttm: number | null;
    forward: number | null;
    currentYear: number | null;
    nextYear: number | null;
  };
  pe: {
    trailing: number | null;
    forward: number | null;
  };
  revenue: {
    ttm: number | null;
    growth: number | null;
  };
  earningsHistory: Array<{
    quarter: string;
    date: string;
    epsEstimate: number | null;
    epsActual: number | null;
    surprise: number | null;
    surprisePct: number | null;
  }>;
  estimates: {
    currentQuarter: EstimatePeriod | null;
    nextQuarter: EstimatePeriod | null;
    currentYear: EstimatePeriod | null;
    nextYear: EstimatePeriod | null;
  };
  revisions: {
    currentQuarter: RevisionPeriod | null;
    nextQuarter: RevisionPeriod | null;
    currentYear: RevisionPeriod | null;
    nextYear: RevisionPeriod | null;
  };
  nextEarningsDate: string | null;
  updatedAt: string;
}

interface EstimatePeriod {
  avg: number | null;
  low: number | null;
  high: number | null;
  numAnalysts: number | null;
  growth: number | null;
}

interface RevisionPeriod {
  current: number | null;
  sevenDaysAgo: number | null;
  thirtyDaysAgo: number | null;
  sixtyDaysAgo: number | null;
  ninetyDaysAgo: number | null;
}

// Cache per symbol
const cache = new Map<string, { data: EarningsEstimatesResponse; ts: number }>();
const CACHE_TTL = 15 * 60_000; // 15 minutes

const router = Router();

function formatQuarterLabel(dateStr: string | null, period: string): string {
  if (!dateStr) return period;
  try {
    const d = new Date(dateStr);
    const month = d.getMonth() + 1;
    const year = d.getFullYear() % 100;
    let q: string;
    if (month <= 3) q = 'Q1';
    else if (month <= 6) q = 'Q2';
    else if (month <= 9) q = 'Q3';
    else q = 'Q4';
    return `${q}'${year}`;
  } catch {
    return period;
  }
}

async function fetchEarningsSummary(symbol: string, auth: { crumb: string; cookie: string }): Promise<{
  earningsTrend: any[];
  earningsHistory: any[];
  financialData: any;
  defaultKeyStatistics: any;
} | null> {
  try {
    const modules = 'earningsTrend,earningsHistory,financialData,defaultKeyStatistics';
    const url = `${YAHOO_API}/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}&crumb=${encodeURIComponent(auth.crumb)}`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': YAHOO_UA, 'Cookie': auth.cookie },
    });

    if (resp.status === 401) {
      // Crumb expired, retry once
      const retry = await ensureCrumb();
      if (!retry) return null;
      const retryUrl = `${YAHOO_API}/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}&crumb=${encodeURIComponent(retry.crumb)}`;
      const retryResp = await fetch(retryUrl, {
        headers: { 'User-Agent': YAHOO_UA, 'Cookie': retry.cookie },
      });
      if (!retryResp.ok) return null;
      return parseModules(await retryResp.json());
    }

    if (!resp.ok) return null;
    return parseModules(await resp.json());
  } catch (err) {
    console.error(`[EarningsEstimates] Error fetching summary for ${symbol}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

function parseModules(data: any) {
  const result = data?.quoteSummary?.result?.[0];
  if (!result) return null;
  return {
    earningsTrend: result.earningsTrend?.trend || [],
    earningsHistory: result.earningsHistory?.history || [],
    financialData: result.financialData || {},
    defaultKeyStatistics: result.defaultKeyStatistics || {},
  };
}

function buildResponse(
  symbol: string,
  quote: any,
  summary: Awaited<ReturnType<typeof fetchEarningsSummary>>,
): EarningsEstimatesResponse {
  const et = summary?.earningsTrend ?? [];
  const eh = summary?.earningsHistory ?? [];
  const fd = summary?.financialData ?? {};
  const ks = summary?.defaultKeyStatistics ?? {};

  // Map earningsTrend periods: 0q=currentQtr, +1q=nextQtr, 0y=currentYear, +1y=nextYear
  const trendMap = new Map<string, any>();
  for (const t of et) {
    if (t.period) trendMap.set(t.period, t);
  }

  const currentQtrTrend = trendMap.get('0q');
  const nextQtrTrend = trendMap.get('+1q');
  const currentYearTrend = trendMap.get('0y');
  const nextYearTrend = trendMap.get('+1y');

  // Build estimates
  function buildEstimate(trend: any): EstimatePeriod | null {
    if (!trend) return null;
    return {
      avg: trend.earningsEstimate?.avg?.raw ?? null,
      low: trend.earningsEstimate?.low?.raw ?? null,
      high: trend.earningsEstimate?.high?.raw ?? null,
      numAnalysts: trend.earningsEstimate?.numberOfAnalysts?.raw ?? null,
      growth: trend.growth?.raw ?? null,
    };
  }

  // Build revisions from earningsTrend
  function buildRevision(trend: any): RevisionPeriod | null {
    if (!trend) return null;
    return {
      current: trend.earningsEstimate?.avg?.raw ?? null,
      sevenDaysAgo: trend.earningsEstimate?.yearAgoEps?.raw ?? null, // not ideal but available
      thirtyDaysAgo: trend.epsTrend?.['30daysAgo']?.raw ?? null,
      sixtyDaysAgo: trend.epsTrend?.['60daysAgo']?.raw ?? null,
      ninetyDaysAgo: trend.epsTrend?.['90daysAgo']?.raw ?? null,
    };
  }

  // EPS current year and next year from earningsTrend
  const epsCurrentYear = currentYearTrend?.earningsEstimate?.avg?.raw ?? null;
  const epsNextYear = nextYearTrend?.earningsEstimate?.avg?.raw ?? null;

  // Earnings history — last 8 quarters
  const earningsHistory = eh.slice(0, 8).map((e: any) => {
    const dateStr = e.quarter?.fmt ?? '';
    const epsEst = e.epsEstimate?.raw ?? null;
    const epsAct = e.epsActual?.raw ?? null;
    const diff = e.epsDifference?.raw ?? null;
    const surprisePct = e.surprisePercent?.raw != null ? e.surprisePercent.raw * 100 : null;

    return {
      quarter: formatQuarterLabel(dateStr, ''),
      date: dateStr,
      epsEstimate: epsEst,
      epsActual: epsAct,
      surprise: diff,
      surprisePct,
    };
  });

  // Next earnings date
  const earningsTimestamp = ks.nextFiscalYearEnd?.raw ?? null;
  const nextEarningsDate = quote?.earningsDate
    ? (typeof quote.earningsDate === 'string' ? quote.earningsDate.slice(0, 10) : null)
    : null;

  return {
    symbol: quote?.symbol ?? symbol,
    companyName: quote?.name ?? symbol,
    currentPrice: quote?.price ?? 0,
    eps: {
      ttm: quote?.eps ?? null,
      forward: quote?.epsForward ?? null,
      currentYear: epsCurrentYear,
      nextYear: epsNextYear,
    },
    pe: {
      trailing: quote?.pe ?? null,
      forward: quote?.forwardPE ?? null,
    },
    revenue: {
      ttm: fd.totalRevenue?.raw ?? null,
      growth: fd.revenueGrowth?.raw ?? null,
    },
    earningsHistory,
    estimates: {
      currentQuarter: buildEstimate(currentQtrTrend),
      nextQuarter: buildEstimate(nextQtrTrend),
      currentYear: buildEstimate(currentYearTrend),
      nextYear: buildEstimate(nextYearTrend),
    },
    revisions: {
      currentQuarter: buildRevision(currentQtrTrend),
      nextQuarter: buildRevision(nextQtrTrend),
      currentYear: buildRevision(currentYearTrend),
      nextYear: buildRevision(nextYearTrend),
    },
    nextEarningsDate,
    updatedAt: new Date().toISOString(),
  };
}

// GET /api/earnings-estimates/:symbol
router.get('/:symbol', async (req, res) => {
  try {
    const symbol = (req.params.symbol || '').toUpperCase().trim();
    if (!symbol || symbol.length > 10 || !/^[A-Z0-9.\-^=]+$/.test(symbol)) {
      return res.status(400).json({ error: 'Invalid symbol' });
    }

    // Check cache
    const cached = cache.get(symbol);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return res.json(cached.data);
    }

    // Fetch quote and earnings summary in parallel
    const auth = await ensureCrumb();
    const [quote, summary] = await Promise.all([
      getQuote(symbol),
      auth ? fetchEarningsSummary(symbol, auth) : Promise.resolve(null),
    ]);

    if (!quote && !summary) {
      return res.status(404).json({ error: 'Symbol not found or data unavailable' });
    }

    const data = buildResponse(symbol, quote, summary);

    // Cache the result
    cache.set(symbol, { data, ts: Date.now() });

    // Evict stale cache entries
    if (cache.size > 200) {
      const now = Date.now();
      for (const [k, v] of cache) {
        if (now - v.ts > CACHE_TTL * 2) cache.delete(k);
      }
    }

    res.json(data);
  } catch (err) {
    console.error('[EarningsEstimates] Error:', err instanceof Error ? err.message : err);
    res.status(502).json({ error: 'Failed to fetch earnings estimates' });
  }
});

export default router;
