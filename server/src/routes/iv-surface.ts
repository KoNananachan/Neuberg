import { Router } from 'express';
import { ensureCrumb, getQuote } from '../services/stocks/yahoo-finance.js';

const router = Router();

const YAHOO_API = 'https://query1.finance.yahoo.com';
const YAHOO_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

// ── Types ──

interface YahooOptionContract {
  strike?: number;
  lastPrice?: number;
  volume?: number;
  openInterest?: number;
  impliedVolatility?: number;
  inTheMoney?: boolean;
}

interface SkewPoint {
  strike: number;
  moneyness: number;
  callIV: number | null;
  putIV: number | null;
}

interface ExpirationData {
  date: string;
  daysToExpiry: number;
  atmIV: number | null;
  skew: SkewPoint[];
}

interface TermStructurePoint {
  daysToExpiry: number;
  atmIV: number;
}

interface IVSurfaceResponse {
  symbol: string;
  spotPrice: number;
  atmIV: number | null;
  ivPercentile: number;
  historicalVol: number | null;
  expirations: ExpirationData[];
  termStructure: TermStructurePoint[];
}

// ── Cache ──

const surfaceCache = new Map<string, { data: IVSurfaceResponse; expiresAt: number }>();
const CACHE_TTL = 300_000; // 5 minutes

// ── Helpers ──

async function fetchOptionsChainForDate(
  symbol: string,
  expirationTimestamp: number,
): Promise<{ calls: YahooOptionContract[]; puts: YahooOptionContract[] } | null> {
  try {
    const auth = await ensureCrumb();
    const dateParam = `&date=${expirationTimestamp}`;
    const url = auth
      ? `${YAHOO_API}/v7/finance/options/${encodeURIComponent(symbol)}?crumb=${encodeURIComponent(auth.crumb)}${dateParam}`
      : `${YAHOO_API}/v7/finance/options/${encodeURIComponent(symbol)}?${dateParam.slice(1)}`;
    const headers: Record<string, string> = { 'User-Agent': YAHOO_UA };
    if (auth) headers['Cookie'] = auth.cookie;

    const resp = await fetch(url, { headers });
    if (!resp.ok) return null;

    const data = (await resp.json()) as Record<string, unknown>;
    const result = (data?.optionChain as Record<string, unknown>)?.result as Array<Record<string, unknown>> | undefined;
    const first = result?.[0];
    if (!first || !first.options) return null;

    const options = first.options as Array<Record<string, unknown>>;
    const chain = options[0];
    if (!chain) return null;

    return {
      calls: (chain.calls as YahooOptionContract[]) ?? [],
      puts: (chain.puts as YahooOptionContract[]) ?? [],
    };
  } catch (err) {
    console.error(`[IVSurface] Error fetching chain for ${symbol}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

async function fetchExpirationDates(symbol: string): Promise<{ expirationDates: number[]; quote: Record<string, unknown> | null }> {
  try {
    const auth = await ensureCrumb();
    const url = auth
      ? `${YAHOO_API}/v7/finance/options/${encodeURIComponent(symbol)}?crumb=${encodeURIComponent(auth.crumb)}`
      : `${YAHOO_API}/v7/finance/options/${encodeURIComponent(symbol)}`;
    const headers: Record<string, string> = { 'User-Agent': YAHOO_UA };
    if (auth) headers['Cookie'] = auth.cookie;

    const resp = await fetch(url, { headers });
    if (!resp.ok) return { expirationDates: [], quote: null };

    const data = (await resp.json()) as Record<string, unknown>;
    const result = (data?.optionChain as Record<string, unknown>)?.result as Array<Record<string, unknown>> | undefined;
    const first = result?.[0];
    if (!first) return { expirationDates: [], quote: null };

    return {
      expirationDates: (first.expirationDates as number[]) ?? [],
      quote: (first.quote as Record<string, unknown>) ?? null,
    };
  } catch (err) {
    console.error(`[IVSurface] Error fetching expiration dates for ${symbol}:`, err instanceof Error ? err.message : err);
    return { expirationDates: [], quote: null };
  }
}

function findATMIV(
  calls: YahooOptionContract[],
  puts: YahooOptionContract[],
  spotPrice: number,
): number | null {
  // Find the strike closest to spot
  let bestStrike = 0;
  let bestDist = Infinity;

  for (const c of calls) {
    const strike = c.strike ?? 0;
    const dist = Math.abs(strike - spotPrice);
    if (dist < bestDist) {
      bestDist = dist;
      bestStrike = strike;
    }
  }

  if (bestStrike === 0) return null;

  const callAtm = calls.find((c) => c.strike === bestStrike);
  const putAtm = puts.find((p) => p.strike === bestStrike);

  const callIV = callAtm?.impliedVolatility;
  const putIV = putAtm?.impliedVolatility;

  if (callIV && callIV > 0 && putIV && putIV > 0) {
    return (callIV + putIV) / 2;
  }
  if (callIV && callIV > 0) return callIV;
  if (putIV && putIV > 0) return putIV;
  return null;
}

function buildSkew(
  calls: YahooOptionContract[],
  puts: YahooOptionContract[],
  spotPrice: number,
): SkewPoint[] {
  if (spotPrice <= 0) return [];

  // Build a map of strike -> IVs
  const strikeMap = new Map<number, { callIV: number | null; putIV: number | null }>();

  for (const c of calls) {
    const strike = c.strike ?? 0;
    if (strike <= 0) continue;
    const iv = c.impliedVolatility ?? null;
    if (!strikeMap.has(strike)) {
      strikeMap.set(strike, { callIV: null, putIV: null });
    }
    strikeMap.get(strike)!.callIV = iv && iv > 0 ? iv : null;
  }

  for (const p of puts) {
    const strike = p.strike ?? 0;
    if (strike <= 0) continue;
    const iv = p.impliedVolatility ?? null;
    if (!strikeMap.has(strike)) {
      strikeMap.set(strike, { callIV: null, putIV: null });
    }
    strikeMap.get(strike)!.putIV = iv && iv > 0 ? iv : null;
  }

  // Filter to moneyness range [0.8, 1.2]
  const skew: SkewPoint[] = [];
  const sortedStrikes = [...strikeMap.keys()].sort((a, b) => a - b);

  for (const strike of sortedStrikes) {
    const moneyness = strike / spotPrice;
    if (moneyness < 0.8 || moneyness > 1.2) continue;

    const entry = strikeMap.get(strike)!;
    if (entry.callIV === null && entry.putIV === null) continue;

    skew.push({
      strike: Math.round(strike * 100) / 100,
      moneyness: Math.round(moneyness * 1000) / 1000,
      callIV: entry.callIV ? Math.round(entry.callIV * 10000) / 10000 : null,
      putIV: entry.putIV ? Math.round(entry.putIV * 10000) / 10000 : null,
    });
  }

  return skew;
}

// GET /api/iv-surface/:symbol
router.get('/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const now = Date.now();

    // Check cache
    const cached = surfaceCache.get(symbol);
    if (cached && now < cached.expiresAt) {
      return res.json(cached.data);
    }

    // Fetch spot price and expiration dates in parallel
    const [quoteData, expData] = await Promise.all([
      getQuote(symbol),
      fetchExpirationDates(symbol),
    ]);

    const spotPrice = quoteData?.price ?? 0;
    if (spotPrice <= 0) {
      return res.status(404).json({ error: 'Unable to fetch quote data for symbol' });
    }

    const { expirationDates, quote: optQuote } = expData;
    if (expirationDates.length === 0) {
      return res.status(404).json({ error: 'No options data available for symbol' });
    }

    // Take up to 6 nearest expirations
    const selectedDates = expirationDates.slice(0, 6);

    // Fetch option chains for each expiration in parallel
    const chainResults = await Promise.all(
      selectedDates.map((ts) => fetchOptionsChainForDate(symbol, ts)),
    );

    const expirations: ExpirationData[] = [];
    const termStructure: TermStructurePoint[] = [];

    for (let i = 0; i < selectedDates.length; i++) {
      const chain = chainResults[i];
      if (!chain) continue;

      const expTs = selectedDates[i];
      const expDate = new Date(expTs * 1000);
      const dateStr = expDate.toISOString().slice(0, 10);
      const daysToExpiry = Math.max(1, Math.round((expTs * 1000 - now) / 86400000));

      const atmIV = findATMIV(chain.calls, chain.puts, spotPrice);
      const skew = buildSkew(chain.calls, chain.puts, spotPrice);

      expirations.push({
        date: dateStr,
        daysToExpiry,
        atmIV: atmIV ? Math.round(atmIV * 10000) / 10000 : null,
        skew,
      });

      if (atmIV && atmIV > 0) {
        termStructure.push({
          daysToExpiry,
          atmIV: Math.round(atmIV * 10000) / 10000,
        });
      }
    }

    // Compute overall ATM IV from nearest expiration
    const nearestAtmIV = expirations.length > 0 ? expirations[0].atmIV : null;

    // IV percentile estimate: compare current ATM IV to a rough range
    // Yahoo doesn't give us 52-week IV range directly, so estimate from the quote
    const historicalVol = optQuote && typeof (optQuote as Record<string, unknown>).regularMarketVolume === 'number'
      ? null
      : null;

    // Use implied vol spread as a rough percentile (0-100 scale)
    let ivPercentile = 50;
    if (nearestAtmIV !== null && termStructure.length >= 2) {
      // If short-term IV > long-term IV, percentile is elevated (backwardation)
      const shortIV = termStructure[0].atmIV;
      const longIV = termStructure[termStructure.length - 1].atmIV;
      if (longIV > 0) {
        const ratio = shortIV / longIV;
        // ratio > 1 = backwardation (high fear), ratio < 1 = contango (normal)
        ivPercentile = Math.min(99, Math.max(1, Math.round(ratio * 50)));
      }
    }

    const response: IVSurfaceResponse = {
      symbol,
      spotPrice: Math.round(spotPrice * 100) / 100,
      atmIV: nearestAtmIV,
      ivPercentile,
      historicalVol,
      expirations,
      termStructure,
    };

    surfaceCache.set(symbol, { data: response, expiresAt: now + CACHE_TTL });

    // Evict old cache entries
    if (surfaceCache.size > 100) {
      for (const [key, val] of surfaceCache) {
        if (now > val.expiresAt) surfaceCache.delete(key);
      }
    }

    res.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[IVSurface] Error:', message);
    const symbol = req.params.symbol.toUpperCase();
    const cached = surfaceCache.get(symbol);
    if (cached) return res.json(cached.data);
    res.status(500).json({ error: 'Failed to fetch IV surface data' });
  }
});

export default router;
