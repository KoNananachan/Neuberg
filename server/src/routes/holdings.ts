import { Router } from 'express';
import { ensureCrumb, getQuotes } from '../services/stocks/yahoo-finance.js';

const YAHOO_API = 'https://query1.finance.yahoo.com';
const YAHOO_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

interface InstitutionHolder {
  name: string;
  shares: number;
  value: number;
  pctHeld: number;
  change: number;
  date: string;
}

interface FundHolder {
  name: string;
  shares: number;
  value: number;
  pctHeld: number;
  change: number;
  date: string;
}

interface InsiderHolder {
  name: string;
  relation: string;
  shares: number;
  value: number;
  lastTransaction: string;
  lastDate: string;
  lastShares: number;
}

interface HoldingsData {
  symbol: string;
  companyName: string;
  price: number;
  marketCap: number | null;
  ownership: {
    insiderPct: number | null;
    institutionPct: number | null;
    institutionCount: number | null;
    institutionFloat: number | null;
  };
  topInstitutions: InstitutionHolder[];
  topFunds: FundHolder[];
  insiders: InsiderHolder[];
  updatedAt: string;
}

// Per-symbol cache: { data, timestamp }
const holdingsCache = new Map<string, { data: HoldingsData; time: number }>();
const HOLDINGS_TTL = 30 * 60_000; // 30 min

const router = Router();

function parseYahooRaw(obj: unknown): number | null {
  if (obj == null) return null;
  if (typeof obj === 'number') return obj;
  if (typeof obj === 'object' && 'raw' in (obj as Record<string, unknown>)) {
    const raw = (obj as Record<string, unknown>).raw;
    return typeof raw === 'number' ? raw : null;
  }
  return null;
}

function epochToDate(obj: unknown): string {
  const raw = parseYahooRaw(obj);
  if (raw == null) return '';
  return new Date(raw * 1000).toISOString().slice(0, 10);
}

async function fetchHoldings(symbol: string): Promise<HoldingsData> {
  const auth = await ensureCrumb();

  // Fetch quote data and quoteSummary in parallel
  const [quotes, summaryData] = await Promise.all([
    getQuotes([symbol]).catch(() => []),
    fetchQuoteSummary(symbol, auth),
  ]);

  const quote = quotes[0];
  const companyName = quote?.name ?? symbol;
  const price = quote?.price ?? 0;
  const marketCap = quote?.marketCap ?? null;

  // Parse ownership breakdown
  const mhb = summaryData?.majorHoldersBreakdown ?? {};
  const ownership = {
    insiderPct: maybePercent(parseYahooRaw(mhb.insidersPercentHeld)),
    institutionPct: maybePercent(parseYahooRaw(mhb.institutionsPercentHeld)),
    institutionCount: parseYahooRaw(mhb.institutionsCount),
    institutionFloat: maybePercent(parseYahooRaw(mhb.institutionsFloatPercentHeld)),
  };

  // Parse institutional holders
  const rawInstitutions = summaryData?.institutionOwnership?.ownershipList ?? [];
  const topInstitutions: InstitutionHolder[] = rawInstitutions
    .slice(0, 15)
    .map((h: Record<string, unknown>) => ({
      name: String(h.organization ?? 'Unknown'),
      shares: parseYahooRaw(h.position) ?? 0,
      value: parseYahooRaw(h.value) ?? 0,
      pctHeld: maybePercent(parseYahooRaw(h.pctHeld)) ?? 0,
      change: parseYahooRaw(h.pctChange) ?? 0,
      date: epochToDate(h.reportDate),
    }));

  // Parse fund holders
  const rawFunds = summaryData?.fundOwnership?.ownershipList ?? [];
  const topFunds: FundHolder[] = rawFunds
    .slice(0, 15)
    .map((h: Record<string, unknown>) => ({
      name: String(h.organization ?? 'Unknown'),
      shares: parseYahooRaw(h.position) ?? 0,
      value: parseYahooRaw(h.value) ?? 0,
      pctHeld: maybePercent(parseYahooRaw(h.pctHeld)) ?? 0,
      change: parseYahooRaw(h.pctChange) ?? 0,
      date: epochToDate(h.reportDate),
    }));

  // Parse insider holders
  const rawInsiders = summaryData?.insiderHolders?.holders ?? [];
  const insiders: InsiderHolder[] = rawInsiders
    .slice(0, 20)
    .map((h: Record<string, unknown>) => {
      const shares = parseYahooRaw(h.positionDirect) ?? parseYahooRaw(h.positionIndirect) ?? 0;
      const txDate = epochToDate(h.latestTransDate);
      const txText = String(h.transactionDescription ?? '');
      const lastShares = parseYahooRaw(h.latestTransDate) != null
        ? (parseYahooRaw(h.positionDirectDate) ?? 0)
        : 0;

      return {
        name: String(h.name ?? 'Unknown'),
        relation: String(h.relation ?? ''),
        shares,
        value: Math.round(shares * price),
        lastTransaction: txText || '-',
        lastDate: txDate,
        lastShares: lastShares,
      };
    })
    .filter((h: InsiderHolder) => h.name !== 'Unknown');

  return {
    symbol: symbol.toUpperCase(),
    companyName,
    price,
    marketCap,
    ownership,
    topInstitutions,
    topFunds,
    insiders,
    updatedAt: new Date().toISOString(),
  };
}

function maybePercent(val: number | null): number | null {
  if (val == null) return null;
  // Yahoo returns 0.65 for 65% — convert
  return val <= 1 ? +(val * 100).toFixed(2) : +val.toFixed(2);
}

async function fetchQuoteSummary(
  symbol: string,
  auth: { crumb: string; cookie: string } | null,
): Promise<Record<string, any> | null> {
  if (!auth) return null;

  const modules = 'institutionOwnership,fundOwnership,majorHoldersBreakdown,insiderHolders';
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
    const data = (await resp.json()) as any;
    return data?.quoteSummary?.result?.[0] ?? null;
  } catch (err) {
    console.error(`[Holdings] Error fetching quoteSummary for ${symbol}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

// GET /api/holdings/:symbol
router.get('/:symbol', async (req, res) => {
  try {
    const symbol = (req.params.symbol || '').toUpperCase().trim();
    if (!symbol || symbol.length > 10) {
      return res.status(400).json({ error: 'Invalid symbol' });
    }

    // Check cache
    const cached = holdingsCache.get(symbol);
    if (cached && Date.now() - cached.time < HOLDINGS_TTL) {
      return res.json(cached.data);
    }

    const data = await fetchHoldings(symbol);
    holdingsCache.set(symbol, { data, time: Date.now() });

    // Cap cache size
    if (holdingsCache.size > 200) {
      const oldest = holdingsCache.keys().next().value;
      if (oldest) holdingsCache.delete(oldest);
    }

    res.json(data);
  } catch (err) {
    console.error('[Holdings] Error:', err instanceof Error ? err.message : err);

    // Return stale cache if available
    const symbol = (req.params.symbol || '').toUpperCase().trim();
    const stale = holdingsCache.get(symbol);
    if (stale) return res.json(stale.data);

    res.status(503).json({ error: 'Holdings data temporarily unavailable' });
  }
});

export default router;
