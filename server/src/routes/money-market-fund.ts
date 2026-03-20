import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// ── Types ──

interface Fund {
  name: string;
  ticker: string;
  nav: number;
  aum: number;
  sevenDayYield: number;
  thirtyDayYield: number;
  expenseRatio: number;
  wam: number;
  wal: number;
  weeklyLiquid: number;
  dailyLiquid: number;
  fundType: 'government' | 'prime' | 'tax-exempt';
}

interface FlowDataWeek {
  weekEnding: string;
  government: { netFlow: number; totalAUM: number };
  prime: { netFlow: number; totalAUM: number };
  taxExempt: { netFlow: number; totalAUM: number };
}

interface HoldingCategory {
  category: string;
  allocation: number;
  wam: number;
}

interface YieldHistoryWeek {
  weekEnding: string;
  government: number;
  prime: number;
  taxExempt: number;
}

interface Summary {
  totalIndustryAUM: number;
  governmentAUM: number;
  primeAUM: number;
  taxExemptAUM: number;
  avgSevenDayYield: number;
}

interface MoneyMarketFundData {
  funds: Fund[];
  flowData: FlowDataWeek[];
  holdings: HoldingCategory[];
  yieldHistory: YieldHistoryWeek[];
  summary: Summary;
  timestamp: string;
}

// ── Cache (5-minute TTL) ──

let cacheData: MoneyMarketFundData | null = null;
let cacheTime = 0;


// ── Helpers ──

const r2 = (v: number): number => Math.round(v * 100) / 100;
const r4 = (v: number): number => Math.round(v * 10000) / 10000;

// ── Data generation ──

function generateMoneyMarketFundData(): MoneyMarketFundData {
  const today = new Date().toISOString().slice(0, 10);
  const seed = hashSeed('money-market-fund' + today);
  const rand = mulberry32(seed);

  // Jitter a base value by up to +/- range
  const jitter = (base: number, range: number): number =>
    base + (rand() - 0.5) * 2 * range;

  // ── Fund definitions ──
  // Each entry: [name, ticker, baseAUM ($B), fundType, baseExpenseRatio]
  const fundDefs: [string, string, number, Fund['fundType'], number][] = [
    ['Vanguard Federal Money Market Fund', 'VMFXX', 552, 'government', 0.11],
    ['Fidelity Government Money Market Fund', 'SPAXX', 485, 'government', 0.42],
    ['JPMorgan Prime Money Market Fund', 'JPMXX', 218, 'prime', 0.18],
    ['Schwab Value Advantage Money Fund', 'SWVXX', 195, 'prime', 0.34],
    ['Goldman Sachs FS Government Fund', 'FGTXX', 320, 'government', 0.19],
    ['BlackRock Liquidity T-Fund', 'TFDXX', 275, 'government', 0.20],
    ['State Street Institutional Liquid Reserves', 'SSLIX', 165, 'prime', 0.17],
    ['Federated Hermes Government Obligations', 'GOIXX', 245, 'government', 0.25],
    ['Morgan Stanley Institutional Liquidity Fund', 'MVRXX', 185, 'government', 0.21],
    ['Dreyfus Government Cash Management', 'DGCXX', 210, 'government', 0.23],
    ['Northern Trust Treasury Money Market', 'BTIXX', 68, 'government', 0.16],
    ['Invesco Government & Agency Portfolio', 'AGAXX', 92, 'government', 0.22],
  ];

  // ── Generate individual funds ──
  const funds: Fund[] = fundDefs.map(([name, ticker, baseAUM, fundType, baseExpense]) => {
    const isGov = fundType === 'government';
    const isPrime = fundType === 'prime';

    // NAV: government funds always $1.0000, prime can be $1.0000-$1.0002
    const nav = isGov ? 1.0000 : r4(1.0000 + rand() * 0.0002);

    // AUM in $B with some daily variation
    const aum = r2(jitter(baseAUM, baseAUM * 0.03));

    // 7-day yield: government 4.85-5.15%, prime 5.05-5.30%, tax-exempt 3.10-3.60%
    let sevenDayYield: number;
    if (isPrime) {
      sevenDayYield = r4(jitter(5.18, 0.12));
    } else if (isGov) {
      sevenDayYield = r4(jitter(5.00, 0.15));
    } else {
      sevenDayYield = r4(jitter(3.35, 0.25));
    }

    // 30-day yield: typically close to 7-day yield, slightly different
    const thirtyDayYield = r4(sevenDayYield + jitter(0, 0.05));

    const expenseRatio = r2(baseExpense);

    // WAM: 20-50 days
    const wam = Math.round(jitter(35, 15));

    // WAL: 50-100 days
    const wal = Math.round(jitter(75, 25));

    // Weekly liquid assets: government typically 90-100%, prime 45-70%
    const weeklyLiquid = isPrime
      ? r2(jitter(55, 10))
      : r2(jitter(95, 4));

    // Daily liquid assets: government typically 60-80%, prime 30-50%
    const dailyLiquid = isPrime
      ? r2(jitter(40, 8))
      : r2(jitter(70, 10));

    return {
      name,
      ticker,
      nav,
      aum,
      sevenDayYield,
      thirtyDayYield,
      expenseRatio,
      wam: Math.max(10, Math.min(55, wam)),
      wal: Math.max(40, Math.min(120, wal)),
      weeklyLiquid: Math.max(30, Math.min(100, weeklyLiquid)),
      dailyLiquid: Math.max(20, Math.min(100, dailyLiquid)),
      fundType,
    };
  });

  // ── Flow data: 8 weeks of weekly flows by category ──
  const flowData: FlowDataWeek[] = [];
  const baseDate = new Date();
  let govAUM = 4500;
  let primeAUM = 1400;
  let taxExemptAUM = 100;

  for (let w = 7; w >= 0; w--) {
    const weekEnd = new Date(baseDate);
    weekEnd.setDate(weekEnd.getDate() - w * 7);
    const weekEnding = weekEnd.toISOString().slice(0, 10);

    const govFlow = r2(jitter(8, 25));
    const primeFlow = r2(jitter(3, 12));
    const taxExemptFlow = r2(jitter(0.2, 2));

    govAUM = r2(govAUM + govFlow);
    primeAUM = r2(primeAUM + primeFlow);
    taxExemptAUM = r2(taxExemptAUM + taxExemptFlow);

    flowData.push({
      weekEnding,
      government: { netFlow: govFlow, totalAUM: govAUM },
      prime: { netFlow: primeFlow, totalAUM: primeAUM },
      taxExempt: { netFlow: taxExemptFlow, totalAUM: taxExemptAUM },
    });
  }

  // ── Holdings: aggregate portfolio composition ──
  const treasuryPct = r2(jitter(38, 3));
  const agencyPct = r2(jitter(22, 3));
  const repoPct = r2(jitter(25, 3));
  const cpPct = r2(jitter(8, 2));
  const cdPct = r2(jitter(5, 1.5));
  const otherPct = r2(Math.max(0, 100 - treasuryPct - agencyPct - repoPct - cpPct - cdPct));

  const holdings: HoldingCategory[] = [
    { category: 'Treasury', allocation: treasuryPct, wam: Math.round(jitter(28, 8)) },
    { category: 'Agency', allocation: agencyPct, wam: Math.round(jitter(35, 10)) },
    { category: 'Repo', allocation: repoPct, wam: Math.round(jitter(3, 2)) },
    { category: 'Commercial Paper', allocation: cpPct, wam: Math.round(jitter(42, 12)) },
    { category: 'Certificates of Deposit', allocation: cdPct, wam: Math.round(jitter(55, 15)) },
    { category: 'Other', allocation: otherPct, wam: Math.round(jitter(30, 10)) },
  ];

  // Ensure WAM values are positive
  holdings.forEach(h => { h.wam = Math.max(1, h.wam); });

  // ── Yield history: 12-week history of avg 7-day yields by fund type ──
  const yieldHistory: YieldHistoryWeek[] = [];
  for (let w = 11; w >= 0; w--) {
    const weekEnd = new Date(baseDate);
    weekEnd.setDate(weekEnd.getDate() - w * 7);
    const weekEnding = weekEnd.toISOString().slice(0, 10);

    yieldHistory.push({
      weekEnding,
      government: r4(jitter(5.00, 0.12)),
      prime: r4(jitter(5.18, 0.10)),
      taxExempt: r4(jitter(3.35, 0.20)),
    });
  }

  // ── Summary ──
  const lastFlow = flowData[flowData.length - 1];
  const totalIndustryAUM = r2(lastFlow.government.totalAUM + lastFlow.prime.totalAUM + lastFlow.taxExempt.totalAUM);

  // Compute average 7-day yield across all funds
  const avgSevenDayYield = r4(
    funds.reduce((sum, f) => sum + f.sevenDayYield, 0) / funds.length
  );

  const summary: Summary = {
    totalIndustryAUM,
    governmentAUM: lastFlow.government.totalAUM,
    primeAUM: lastFlow.prime.totalAUM,
    taxExemptAUM: lastFlow.taxExempt.totalAUM,
    avgSevenDayYield,
  };

  return {
    funds,
    flowData,
    holdings,
    yieldHistory,
    summary,
    timestamp: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cacheData && now < cacheTime + CACHE_TTL) {
      return res.json(cacheData);
    }

    const data = generateMoneyMarketFundData();
    cacheData = data;
    cacheTime = now;
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[MoneyMarketFund] Error:', message);
    if (cacheData) {
      return res.json(cacheData);
    }
    res.status(500).json({ error: 'Failed to generate money market fund data' });
  }
});

export default router;
