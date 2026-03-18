import { Router } from 'express';
import { ensureCrumb } from '../services/stocks/yahoo-finance.js';

const YAHOO_API = 'https://query2.finance.yahoo.com';
const YAHOO_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

interface CompanyProfile {
  symbol: string;
  name: string | null;
  // Company Info
  longBusinessSummary: string | null;
  industry: string | null;
  sector: string | null;
  fullTimeEmployees: number | null;
  city: string | null;
  state: string | null;
  country: string | null;
  website: string | null;
  // Key Officers (top 5)
  officers: Array<{
    name: string;
    title: string;
    age: number | null;
    totalPay: number | null;
  }>;
  // Key Financials
  marketCap: number | null;
  totalRevenue: number | null;
  revenueGrowth: number | null;
  grossMargins: number | null;
  operatingMargins: number | null;
  profitMargins: number | null;
  returnOnEquity: number | null;
  returnOnAssets: number | null;
  freeCashflow: number | null;
  earningsGrowth: number | null;
  recommendationKey: string | null;
  targetMeanPrice: number | null;
  numberOfAnalysts: number | null;
}

// Per-symbol cache with 30-minute TTL
const profileCache = new Map<string, { data: CompanyProfile; time: number }>();
const CACHE_TTL = 30 * 60_000; // 30 minutes

function parseCompanyProfile(symbol: string, data: any): CompanyProfile | null {
  const result = data?.quoteSummary?.result?.[0];
  if (!result) return null;

  const ap = result.assetProfile || {};
  const fd = result.financialData || {};

  const officers = (ap.companyOfficers || [])
    .slice(0, 5)
    .map((o: any) => ({
      name: o.name || 'Unknown',
      title: o.title || 'Unknown',
      age: o.age ?? null,
      totalPay: o.totalPay?.raw ?? null,
    }));

  return {
    symbol,
    name: ap.name || null,
    longBusinessSummary: ap.longBusinessSummary || null,
    industry: ap.industry || null,
    sector: ap.sector || null,
    fullTimeEmployees: ap.fullTimeEmployees ?? null,
    city: ap.city || null,
    state: ap.state || null,
    country: ap.country || null,
    website: ap.website || null,
    officers,
    marketCap: fd.marketCap?.raw ?? null,
    totalRevenue: fd.totalRevenue?.raw ?? null,
    revenueGrowth: fd.revenueGrowth?.raw ?? null,
    grossMargins: fd.grossMargins?.raw ?? null,
    operatingMargins: fd.operatingMargins?.raw ?? null,
    profitMargins: fd.profitMargins?.raw ?? null,
    returnOnEquity: fd.returnOnEquity?.raw ?? null,
    returnOnAssets: fd.returnOnAssets?.raw ?? null,
    freeCashflow: fd.freeCashflow?.raw ?? null,
    earningsGrowth: fd.earningsGrowth?.raw ?? null,
    recommendationKey: fd.recommendationKey || null,
    targetMeanPrice: fd.targetMeanPrice?.raw ?? null,
    numberOfAnalysts: fd.numberOfAnalystOpinions?.raw ?? null,
  };
}

const router = Router();

// GET /api/company-profile/:symbol
router.get('/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();

    // Check cache
    const cached = profileCache.get(symbol);
    if (cached && Date.now() - cached.time < CACHE_TTL) {
      return res.json(cached.data);
    }

    const auth = await ensureCrumb();
    if (!auth) {
      return res.status(503).json({ error: 'Company profile temporarily unavailable' });
    }

    const modules = 'assetProfile,financialData';
    const url = `${YAHOO_API}/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}&crumb=${encodeURIComponent(auth.crumb)}`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': YAHOO_UA, 'Cookie': auth.cookie },
    });

    if (!resp.ok) {
      console.error(`[CompanyProfile] Yahoo API returned ${resp.status} for ${symbol}`);
      // Return cached data if available even if expired
      if (cached) return res.json(cached.data);
      return res.status(502).json({ error: 'Failed to fetch company profile' });
    }

    const data = await resp.json();
    const profile = parseCompanyProfile(symbol, data);
    if (!profile) {
      if (cached) return res.json(cached.data);
      return res.status(404).json({ error: 'Company profile not found' });
    }

    // Update cache
    profileCache.set(symbol, { data: profile, time: Date.now() });
    res.json(profile);
  } catch (err: any) {
    console.error('[CompanyProfile] Error:', err?.message || err);
    const cached = profileCache.get(req.params.symbol?.toUpperCase());
    if (cached) return res.json(cached.data);
    res.status(500).json({ error: 'Failed to fetch company profile' });
  }
});

export default router;
