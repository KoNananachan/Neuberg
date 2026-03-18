import { Router } from 'express';
import { ensureCrumb } from '../services/stocks/yahoo-finance.js';

const YAHOO_API = 'https://query2.finance.yahoo.com';
const YAHOO_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

interface FinancialStatement {
  date: string;
  period: 'annual' | 'quarterly';
  // Income Statement
  revenue: number | null;
  costOfRevenue: number | null;
  grossProfit: number | null;
  operatingExpenses: number | null;
  operatingIncome: number | null;
  netIncome: number | null;
  ebitda: number | null;
  // Balance Sheet
  totalAssets: number | null;
  totalLiabilities: number | null;
  stockholderEquity: number | null;
  cash: number | null;
  totalCurrentAssets: number | null;
  totalCurrentLiabilities: number | null;
  longTermDebt: number | null;
  // Cash Flow
  operatingCashFlow: number | null;
  capitalExpenditure: number | null;
  freeCashFlow: number | null;
  financingCashFlow: number | null;
  investingCashFlow: number | null;
  dividendsPaid: number | null;
}

interface FinancialsResponse {
  symbol: string;
  annual: FinancialStatement[];
  quarterly: FinancialStatement[];
}

// Per-symbol cache with 30-minute TTL
const cache = new Map<string, { data: FinancialsResponse; ts: number }>();
const CACHE_TTL = 30 * 60_000;

const router = Router();

function raw(obj: any): number | null {
  return obj?.raw ?? null;
}

function parseIncomeStatements(
  statements: any[],
  period: 'annual' | 'quarterly',
): Partial<FinancialStatement>[] {
  return statements.map((s: any) => ({
    date: s.endDate?.fmt ?? '',
    period,
    revenue: raw(s.totalRevenue),
    costOfRevenue: raw(s.costOfRevenue),
    grossProfit: raw(s.grossProfit),
    operatingExpenses: raw(s.totalOperatingExpenses),
    operatingIncome: raw(s.operatingIncome),
    netIncome: raw(s.netIncome),
    ebitda: raw(s.ebitda),
  }));
}

function parseBalanceSheets(
  statements: any[],
  period: 'annual' | 'quarterly',
): Partial<FinancialStatement>[] {
  return statements.map((s: any) => ({
    date: s.endDate?.fmt ?? '',
    period,
    totalAssets: raw(s.totalAssets),
    totalLiabilities: raw(s.totalLiab),
    stockholderEquity: raw(s.totalStockholderEquity),
    cash: raw(s.cash) ?? raw(s.cashAndShortTermInvestments),
    totalCurrentAssets: raw(s.totalCurrentAssets),
    totalCurrentLiabilities: raw(s.totalCurrentLiabilities),
    longTermDebt: raw(s.longTermDebt),
  }));
}

function parseCashFlows(
  statements: any[],
  period: 'annual' | 'quarterly',
): Partial<FinancialStatement>[] {
  return statements.map((s: any) => {
    const opCF = raw(s.totalCashFromOperatingActivities);
    const capex = raw(s.capitalExpenditures);
    // freeCashFlow = operating + capex (capex is negative)
    const fcf = opCF != null && capex != null ? opCF + capex : null;
    return {
      date: s.endDate?.fmt ?? '',
      period,
      operatingCashFlow: opCF,
      capitalExpenditure: capex,
      freeCashFlow: fcf,
      financingCashFlow: raw(s.totalCashFromFinancingActivities),
      investingCashFlow: raw(s.totalCashFromInvestingActivities),
      dividendsPaid: raw(s.dividendsPaid),
    };
  });
}

function mergeStatements(
  income: Partial<FinancialStatement>[],
  balance: Partial<FinancialStatement>[],
  cashFlow: Partial<FinancialStatement>[],
  period: 'annual' | 'quarterly',
): FinancialStatement[] {
  // Index balance sheet and cash flow by date for merging
  const balanceMap = new Map<string, Partial<FinancialStatement>>();
  for (const b of balance) {
    if (b.date) balanceMap.set(b.date, b);
  }
  const cashMap = new Map<string, Partial<FinancialStatement>>();
  for (const c of cashFlow) {
    if (c.date) cashMap.set(c.date, c);
  }

  // Collect all unique dates
  const allDates = new Set<string>();
  for (const s of income) if (s.date) allDates.add(s.date);
  for (const s of balance) if (s.date) allDates.add(s.date);
  for (const s of cashFlow) if (s.date) allDates.add(s.date);

  // Index income by date
  const incomeMap = new Map<string, Partial<FinancialStatement>>();
  for (const i of income) {
    if (i.date) incomeMap.set(i.date, i);
  }

  const empty: FinancialStatement = {
    date: '',
    period,
    revenue: null,
    costOfRevenue: null,
    grossProfit: null,
    operatingExpenses: null,
    operatingIncome: null,
    netIncome: null,
    ebitda: null,
    totalAssets: null,
    totalLiabilities: null,
    stockholderEquity: null,
    cash: null,
    totalCurrentAssets: null,
    totalCurrentLiabilities: null,
    longTermDebt: null,
    operatingCashFlow: null,
    capitalExpenditure: null,
    freeCashFlow: null,
    financingCashFlow: null,
    investingCashFlow: null,
    dividendsPaid: null,
  };

  const results: FinancialStatement[] = [];
  for (const date of allDates) {
    const inc = incomeMap.get(date) ?? {};
    const bal = balanceMap.get(date) ?? {};
    const cf = cashMap.get(date) ?? {};
    results.push({ ...empty, ...inc, ...bal, ...cf, date, period });
  }

  // Sort by date descending (most recent first)
  results.sort((a, b) => b.date.localeCompare(a.date));
  return results;
}

// GET /api/financials/:symbol
router.get('/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();

    // Check cache
    const cached = cache.get(symbol);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return res.json(cached.data);
    }

    const auth = await ensureCrumb();
    if (!auth) {
      return res.status(503).json({ error: 'Financial data temporarily unavailable' });
    }

    const modules = [
      'incomeStatementHistory',
      'incomeStatementHistoryQuarterly',
      'balanceSheetHistory',
      'balanceSheetHistoryQuarterly',
      'cashflowStatementHistory',
      'cashflowStatementHistoryQuarterly',
    ].join(',');

    const url = `${YAHOO_API}/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}&crumb=${encodeURIComponent(auth.crumb)}`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': YAHOO_UA, 'Cookie': auth.cookie },
    });

    if (!resp.ok) {
      console.error(`[Financials] Yahoo API returned ${resp.status} for ${symbol}`);
      return res.status(502).json({ error: 'Failed to fetch financial data' });
    }

    const data = (await resp.json()) as any;
    const result = data?.quoteSummary?.result?.[0];
    if (!result) {
      return res.status(404).json({ error: 'No financial data found' });
    }

    // Parse annual statements
    const annualIncome = parseIncomeStatements(
      result.incomeStatementHistory?.incomeStatementHistory ?? [],
      'annual',
    );
    const annualBalance = parseBalanceSheets(
      result.balanceSheetHistory?.balanceSheetStatements ?? [],
      'annual',
    );
    const annualCashFlow = parseCashFlows(
      result.cashflowStatementHistory?.cashflowStatements ?? [],
      'annual',
    );

    // Parse quarterly statements
    const quarterlyIncome = parseIncomeStatements(
      result.incomeStatementHistoryQuarterly?.incomeStatementHistory ?? [],
      'quarterly',
    );
    const quarterlyBalance = parseBalanceSheets(
      result.balanceSheetHistoryQuarterly?.balanceSheetStatements ?? [],
      'quarterly',
    );
    const quarterlyCashFlow = parseCashFlows(
      result.cashflowStatementHistoryQuarterly?.cashflowStatements ?? [],
      'quarterly',
    );

    const response: FinancialsResponse = {
      symbol,
      annual: mergeStatements(annualIncome, annualBalance, annualCashFlow, 'annual'),
      quarterly: mergeStatements(quarterlyIncome, quarterlyBalance, quarterlyCashFlow, 'quarterly'),
    };

    // Cache the result
    cache.set(symbol, { data: response, ts: Date.now() });

    res.json(response);
  } catch (err: any) {
    console.error('[Financials] Error fetching financial data:', err?.message || err);
    res.status(500).json({ error: 'Failed to fetch financial data' });
  }
});

export default router;
