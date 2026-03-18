import { Router } from 'express';
import { getQuote, getHistory, ensureCrumb } from '../services/stocks/yahoo-finance.js';

const YAHOO_API = 'https://query1.finance.yahoo.com';
const YAHOO_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

// ── Types ──

interface EarningsHistoryEntry {
  date: string;
  quarter: string;
  epsActual: number | null;
  epsEstimate: number | null;
  surprisePct: number | null;
  beat: boolean;
  dayReturn: number | null;
  fiveDayReturn: number | null;
  tenDayReturn: number | null;
  twentyDayReturn: number | null;
}

interface EarningsStats {
  beatRate: number | null;
  avgSurprise: number | null;
  beatStreak: number;
  avgBeatDayReturn: number | null;
  avgMissDayReturn: number | null;
  avgDrift20d: number | null;
  nextEarningsDate: string | null;
  epsTrend: 'up' | 'down' | 'flat' | null;
}

interface DriftPoint {
  day: number;
  beatAvg: number | null;
  missAvg: number | null;
}

interface EarningsSurpriseResponse {
  symbol: string;
  name: string;
  history: EarningsHistoryEntry[];
  stats: EarningsStats;
  driftCurve: DriftPoint[];
}

// ── Cache ──

const cache = new Map<string, { data: EarningsSurpriseResponse; ts: number }>();
const CACHE_TTL = 30 * 60_000; // 30 minutes
const MAX_CACHE_SIZE = 150;

const router = Router();

// ── Helpers ──

function formatQuarter(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    let q: string;
    if (m <= 3) q = 'Q1';
    else if (m <= 6) q = 'Q2';
    else if (m <= 9) q = 'Q3';
    else q = 'Q4';
    return `${q} ${y}`;
  } catch {
    return dateStr;
  }
}

async function fetchEarningsModules(
  symbol: string,
  auth: { crumb: string; cookie: string },
): Promise<{
  earningsHistory: Array<{
    quarter: { fmt?: string } | null;
    epsActual: { raw?: number } | null;
    epsEstimate: { raw?: number } | null;
    surprisePercent: { raw?: number } | null;
  }>;
  earningsTrend: Array<{
    period?: string;
    earningsEstimate?: { avg?: { raw?: number } };
    growth?: { raw?: number };
  }>;
  financialData: Record<string, unknown>;
} | null> {
  try {
    const modules = 'earningsHistory,earningsTrend,financialData';
    const url = `${YAHOO_API}/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}&crumb=${encodeURIComponent(auth.crumb)}`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': YAHOO_UA, Cookie: auth.cookie },
    });

    if (resp.status === 401) {
      const retry = await ensureCrumb();
      if (!retry) return null;
      const retryUrl = `${YAHOO_API}/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}&crumb=${encodeURIComponent(retry.crumb)}`;
      const retryResp = await fetch(retryUrl, {
        headers: { 'User-Agent': YAHOO_UA, Cookie: retry.cookie },
      });
      if (!retryResp.ok) return null;
      return parseModules(await retryResp.json()) as any;
    }

    if (!resp.ok) return null;
    return parseModules(await resp.json()) as any;
  } catch (err) {
    console.error(`[EarningsSurprise] Error fetching modules for ${symbol}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

function parseModules(data: unknown): {
  earningsHistory: Array<Record<string, unknown>>;
  earningsTrend: Array<Record<string, unknown>>;
  financialData: Record<string, unknown>;
} | null {
  const root = data as Record<string, unknown> | undefined;
  const result = (root?.quoteSummary as Record<string, unknown>)?.result as Array<Record<string, unknown>> | undefined;
  const r = result?.[0];
  if (!r) return null;
  return {
    earningsHistory: ((r.earningsHistory as Record<string, unknown>)?.history as Array<Record<string, unknown>>) || [],
    earningsTrend: ((r.earningsTrend as Record<string, unknown>)?.trend as Array<Record<string, unknown>>) || [],
    financialData: (r.financialData as Record<string, unknown>) || {},
  };
}

function getRaw(obj: unknown): number | null {
  if (obj == null) return null;
  const val = (obj as Record<string, unknown>)?.raw;
  return typeof val === 'number' ? val : null;
}

/**
 * Calculate returns at specific day offsets from an earnings date using historical price data.
 * Prices is assumed to be daily, sorted chronologically.
 */
function calculateDriftReturns(
  prices: Array<{ date: string; close: number | null }>,
  earningsDate: string,
): {
  dayReturn: number | null;
  fiveDayReturn: number | null;
  tenDayReturn: number | null;
  twentyDayReturn: number | null;
  driftPath: Array<{ day: number; return: number }>;
} {
  // Find the index of earnings date or the nearest trading day after
  let baseIdx = -1;
  for (let i = 0; i < prices.length; i++) {
    if (prices[i].date >= earningsDate) {
      baseIdx = i;
      break;
    }
  }

  if (baseIdx < 0 || baseIdx === 0) {
    return { dayReturn: null, fiveDayReturn: null, tenDayReturn: null, twentyDayReturn: null, driftPath: [] };
  }

  // The base price is the close on the day before or day of earnings
  // Use the prior close as the pre-earnings reference
  const preIdx = baseIdx - 1;
  const basePrice = prices[preIdx]?.close;
  if (basePrice == null || basePrice === 0) {
    return { dayReturn: null, fiveDayReturn: null, tenDayReturn: null, twentyDayReturn: null, driftPath: [] };
  }

  const getReturn = (offset: number): number | null => {
    const idx = baseIdx + offset - 1; // offset from baseIdx
    if (idx < 0 || idx >= prices.length) return null;
    const p = prices[idx]?.close;
    if (p == null) return null;
    return ((p - basePrice) / basePrice) * 100;
  };

  // Build drift path: day -5 to +20
  const driftPath: Array<{ day: number; return: number }> = [];
  for (let d = -5; d <= 20; d++) {
    const idx = preIdx + d;
    if (idx >= 0 && idx < prices.length && prices[idx]?.close != null) {
      const ret = ((prices[idx].close! - basePrice) / basePrice) * 100;
      driftPath.push({ day: d, return: ret });
    }
  }

  return {
    dayReturn: getReturn(1),
    fiveDayReturn: getReturn(5),
    tenDayReturn: getReturn(10),
    twentyDayReturn: getReturn(20),
    driftPath,
  };
}

function computeStats(history: EarningsHistoryEntry[]): EarningsStats {
  const withData = history.filter(h => h.epsActual != null && h.epsEstimate != null);
  if (withData.length === 0) {
    return {
      beatRate: null,
      avgSurprise: null,
      beatStreak: 0,
      avgBeatDayReturn: null,
      avgMissDayReturn: null,
      avgDrift20d: null,
      nextEarningsDate: null,
      epsTrend: null,
    };
  }

  const beats = withData.filter(h => h.beat);
  const misses = withData.filter(h => !h.beat);

  // Beat rate
  const beatRate = (beats.length / withData.length) * 100;

  // Average surprise %
  const withSurprise = withData.filter(h => h.surprisePct != null);
  const avgSurprise = withSurprise.length > 0
    ? withSurprise.reduce((s, h) => s + (h.surprisePct ?? 0), 0) / withSurprise.length
    : null;

  // Beat streak (consecutive beats from most recent)
  let beatStreak = 0;
  // History is sorted newest first
  for (const h of withData) {
    if (h.beat) beatStreak++;
    else break;
  }

  // Average day-1 move after beat/miss
  const beatDays = beats.filter(h => h.dayReturn != null);
  const avgBeatDayReturn = beatDays.length > 0
    ? beatDays.reduce((s, h) => s + (h.dayReturn ?? 0), 0) / beatDays.length
    : null;

  const missDays = misses.filter(h => h.dayReturn != null);
  const avgMissDayReturn = missDays.length > 0
    ? missDays.reduce((s, h) => s + (h.dayReturn ?? 0), 0) / missDays.length
    : null;

  // Average 20-day drift
  const with20d = withData.filter(h => h.twentyDayReturn != null);
  const avgDrift20d = with20d.length > 0
    ? with20d.reduce((s, h) => s + (h.twentyDayReturn ?? 0), 0) / with20d.length
    : null;

  // EPS trend (comparing recent vs older)
  let epsTrend: 'up' | 'down' | 'flat' | null = null;
  if (withData.length >= 4) {
    const recentAvg = withData.slice(0, 2).reduce((s, h) => s + (h.epsActual ?? 0), 0) / 2;
    const olderAvg = withData.slice(-2).reduce((s, h) => s + (h.epsActual ?? 0), 0) / 2;
    const diff = recentAvg - olderAvg;
    if (diff > 0.01) epsTrend = 'up';
    else if (diff < -0.01) epsTrend = 'down';
    else epsTrend = 'flat';
  }

  return {
    beatRate,
    avgSurprise,
    beatStreak,
    avgBeatDayReturn,
    avgMissDayReturn,
    avgDrift20d,
    nextEarningsDate: null, // set separately
    epsTrend,
  };
}

/**
 * Aggregate drift curves for beats and misses.
 * Returns average return at each day offset from -5 to +20.
 */
function buildDriftCurve(
  history: EarningsHistoryEntry[],
  allDriftPaths: Map<string, Array<{ day: number; return: number }>>,
): DriftPoint[] {
  const beatPaths: Array<Array<{ day: number; return: number }>> = [];
  const missPaths: Array<Array<{ day: number; return: number }>> = [];

  for (const h of history) {
    const path = allDriftPaths.get(h.date);
    if (!path || path.length === 0) continue;
    if (h.beat) beatPaths.push(path);
    else missPaths.push(path);
  }

  const days: number[] = [];
  for (let d = -5; d <= 20; d++) days.push(d);

  return days.map(day => {
    // Average beats at this day
    const beatVals = beatPaths
      .map(p => p.find(pt => pt.day === day)?.return)
      .filter((v): v is number => v != null);
    const beatAvg = beatVals.length > 0
      ? beatVals.reduce((a, b) => a + b, 0) / beatVals.length
      : null;

    // Average misses at this day
    const missVals = missPaths
      .map(p => p.find(pt => pt.day === day)?.return)
      .filter((v): v is number => v != null);
    const missAvg = missVals.length > 0
      ? missVals.reduce((a, b) => a + b, 0) / missVals.length
      : null;

    return { day, beatAvg, missAvg };
  });
}

// ── Route ──

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

    // Fetch quote + earnings modules in parallel
    const auth = await ensureCrumb();
    const [quote, modules] = await Promise.all([
      getQuote(symbol),
      auth ? fetchEarningsModules(symbol, auth) : Promise.resolve(null),
    ]);

    if (!quote && !modules) {
      return res.status(404).json({ error: 'Symbol not found or data unavailable' });
    }

    const rawHistory = modules?.earningsHistory ?? [];
    const earningsDates: string[] = [];

    // Extract earnings dates for price lookups
    for (const e of rawHistory) {
      const dateFmt = (e.quarter as Record<string, unknown>)?.fmt as string | undefined;
      if (dateFmt) earningsDates.push(dateFmt);
    }

    // Fetch historical prices for drift calculation
    // We need ~2 years of daily data to cover all earnings dates
    const prices = await getHistory(symbol, { range: '5y', interval: '1d' });
    const typedPrices = prices as Array<{ date: string; close: number | null }>;

    // Calculate drift for each earnings date
    const driftPaths = new Map<string, Array<{ day: number; return: number }>>();
    const historyEntries: EarningsHistoryEntry[] = [];

    for (const e of rawHistory) {
      const dateFmt = ((e.quarter as Record<string, unknown>)?.fmt as string) ?? '';
      if (!dateFmt) continue;

      const epsActual = getRaw(e.epsActual);
      const epsEstimate = getRaw(e.epsEstimate);
      const surprisePctRaw = getRaw(e.surprisePercent);
      const surprisePct = surprisePctRaw != null ? surprisePctRaw * 100 : null;

      const beat = epsActual != null && epsEstimate != null && epsActual >= epsEstimate;

      // Calculate drift
      const drift = calculateDriftReturns(typedPrices, dateFmt);
      driftPaths.set(dateFmt, drift.driftPath);

      historyEntries.push({
        date: dateFmt,
        quarter: formatQuarter(dateFmt),
        epsActual,
        epsEstimate,
        surprisePct,
        beat,
        dayReturn: drift.dayReturn != null ? Math.round(drift.dayReturn * 100) / 100 : null,
        fiveDayReturn: drift.fiveDayReturn != null ? Math.round(drift.fiveDayReturn * 100) / 100 : null,
        tenDayReturn: drift.tenDayReturn != null ? Math.round(drift.tenDayReturn * 100) / 100 : null,
        twentyDayReturn: drift.twentyDayReturn != null ? Math.round(drift.twentyDayReturn * 100) / 100 : null,
      });
    }

    // Sort newest first
    historyEntries.sort((a, b) => b.date.localeCompare(a.date));

    // Compute stats
    const stats = computeStats(historyEntries);

    // Next earnings date from quote
    const earningsDate = (quote as any)?.earningsDate;
    stats.nextEarningsDate = typeof earningsDate === 'string'
      ? earningsDate.slice(0, 10)
      : null;

    // EPS trend from earningsTrend module
    const trendData = modules?.earningsTrend ?? [];
    const currentYearTrend = trendData.find(t => (t as Record<string, unknown>).period === '0y');
    if (currentYearTrend) {
      const growth = getRaw((currentYearTrend as Record<string, unknown>).growth);
      if (growth != null) {
        if (growth > 0.02) stats.epsTrend = 'up';
        else if (growth < -0.02) stats.epsTrend = 'down';
        else stats.epsTrend = 'flat';
      }
    }

    // Build drift curve
    const driftCurve = buildDriftCurve(historyEntries, driftPaths);

    const data: EarningsSurpriseResponse = {
      symbol: quote?.symbol ?? symbol,
      name: quote?.name ?? symbol,
      history: historyEntries,
      stats,
      driftCurve,
    };

    // Cache result
    cache.set(symbol, { data, ts: Date.now() });

    // Evict stale entries
    if (cache.size > MAX_CACHE_SIZE) {
      const now = Date.now();
      for (const [k, v] of cache) {
        if (now - v.ts > CACHE_TTL * 2) cache.delete(k);
      }
    }

    res.json(data);
  } catch (err) {
    console.error('[EarningsSurprise] Error:', err instanceof Error ? err.message : err);
    res.status(502).json({ error: 'Failed to fetch earnings surprise data' });
  }
});

export default router;
