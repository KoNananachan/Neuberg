import { Router } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// ── Types ──

type AssetClass = 'equities' | 'fixed_income' | 'fx' | 'derivatives';
type SettlementStatus = 'pending' | 'matched' | 'unmatched' | 'partial';
type FailReason = 'insufficient_securities' | 'cash_shortfall' | 'counterparty_issue' | 'regulatory_hold' | 'system_error';
type EscalationLevel = 'L1' | 'L2' | 'L3';
type ConnectionStatus = 'operational' | 'degraded' | 'down';

interface AssetClassSummary {
  assetClass: AssetClass;
  pending: number;
  settledToday: number;
  failed: number;
  onHold: number;
  notionalPending: number;
  notionalSettled: number;
  notionalFailed: number;
  notionalOnHold: number;
}

interface PendingSettlement {
  tradeId: string;
  assetClass: AssetClass;
  counterparty: string;
  tradeDate: string;
  settlementDate: string;
  settlementCycle: 'T+1' | 'T+2';
  notional: number;
  currency: string;
  status: SettlementStatus;
  agingDays: number;
}

interface FailedTrade {
  tradeId: string;
  assetClass: AssetClass;
  counterparty: string;
  reason: FailReason;
  notional: number;
  currency: string;
  agingDays: number;
  penaltyCostEstimate: number;
  escalationLevel: EscalationLevel;
}

interface EfficiencyMetrics {
  settlementRateByCount: number;
  settlementRateByValue: number;
  avgSettlementTimeHours: number;
  failRatePercent: number;
  nettingEfficiencyPercent: number;
  stpRatePercent: number;
}

interface ClearingHouseStatus {
  name: string;
  connectionStatus: ConnectionStatus;
  pendingVolume: number;
  avgProcessingTimeMs: number;
  incidentAlerts: string[];
}

interface SettlementCalendarDay {
  date: string;
  dayOfWeek: string;
  expectedSettlementVolume: number;
  expectedNotional: number;
  holidays: { market: string; holiday: string }[];
}

interface TradeSettlementResponse {
  timestamp: string;
  summary: AssetClassSummary[];
  pendingSettlements: PendingSettlement[];
  failedTrades: FailedTrade[];
  efficiencyMetrics: EfficiencyMetrics;
  clearingHouseStatus: ClearingHouseStatus[];
  settlementCalendar: SettlementCalendarDay[];
}

// ── Constants ──

const ASSET_CLASSES: AssetClass[] = ['equities', 'fixed_income', 'fx', 'derivatives'];

const COUNTERPARTIES = [
  'Goldman Sachs', 'Morgan Stanley', 'JP Morgan', 'Barclays Capital',
  'Citigroup', 'Deutsche Bank', 'UBS', 'Credit Suisse',
  'BNP Paribas', 'HSBC', 'Nomura', 'Bank of America',
  'Wells Fargo', 'RBC Capital', 'Societe Generale', 'Jefferies',
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD'];

const FAIL_REASONS: FailReason[] = [
  'insufficient_securities', 'cash_shortfall', 'counterparty_issue',
  'regulatory_hold', 'system_error',
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ── Helpers ──

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function jitter(base: number, pct: number, rng: () => number): number {
  return base * (1 + (rng() - 0.5) * 2 * pct);
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addBusinessDays(from: Date, days: number): Date {
  const result = new Date(from);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return result;
}

function getNextBusinessDays(from: Date, count: number): Date[] {
  const dates: Date[] = [];
  const cursor = new Date(from);
  while (dates.length < count) {
    cursor.setDate(cursor.getDate() + 1);
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) {
      dates.push(new Date(cursor));
    }
  }
  return dates;
}

function generateTradeId(prefix: string, index: number, rng: () => number): string {
  const seq = String(index + 1).padStart(3, '0');
  const suffix = String(Math.floor(rng() * 90000) + 10000);
  return `${prefix}-${seq}-${suffix}`;
}

// ── Generation logic ──

function generateSummary(rng: () => number): AssetClassSummary[] {
  const baseCounts: Record<AssetClass, { pending: number; settled: number; failed: number; hold: number; notionalBase: number }> = {
    equities: { pending: 320, settled: 1450, failed: 18, hold: 12, notionalBase: 45_000_000 },
    fixed_income: { pending: 185, settled: 820, failed: 9, hold: 7, notionalBase: 125_000_000 },
    fx: { pending: 540, settled: 2800, failed: 14, hold: 5, notionalBase: 85_000_000 },
    derivatives: { pending: 95, settled: 410, failed: 6, hold: 8, notionalBase: 220_000_000 },
  };

  return ASSET_CLASSES.map((ac) => {
    const base = baseCounts[ac];
    const pending = Math.round(jitter(base.pending, 0.15, rng));
    const settledToday = Math.round(jitter(base.settled, 0.1, rng));
    const failed = Math.round(jitter(base.failed, 0.25, rng));
    const onHold = Math.round(jitter(base.hold, 0.3, rng));

    const notionalPending = Math.round(jitter(base.notionalBase * 0.22, 0.2, rng));
    const notionalSettled = Math.round(jitter(base.notionalBase, 0.12, rng));
    const notionalFailed = Math.round(jitter(base.notionalBase * 0.013, 0.3, rng));
    const notionalOnHold = Math.round(jitter(base.notionalBase * 0.008, 0.35, rng));

    return {
      assetClass: ac,
      pending,
      settledToday,
      failed,
      onHold,
      notionalPending,
      notionalSettled,
      notionalFailed,
      notionalOnHold,
    };
  });
}

function generatePendingSettlements(rng: () => number): PendingSettlement[] {
  const today = new Date();
  const trades: PendingSettlement[] = [];

  for (let i = 0; i < 20; i++) {
    const assetClass = pick(ASSET_CLASSES, rng);
    const counterparty = pick(COUNTERPARTIES, rng);
    const currency = pick(CURRENCIES, rng);
    const status = pick<SettlementStatus>(['pending', 'matched', 'unmatched', 'partial'], rng);

    // Settlement cycle: FX and equities mostly T+1, fixed income and derivatives T+2
    const isShortCycle = assetClass === 'equities' || assetClass === 'fx';
    const settlementCycle: 'T+1' | 'T+2' = isShortCycle
      ? (rng() > 0.2 ? 'T+1' : 'T+2')
      : (rng() > 0.7 ? 'T+1' : 'T+2');

    const cycleDays = settlementCycle === 'T+1' ? 1 : 2;

    // Aging: 0-5 days, with most trades at 0-1
    const agingDays = Math.floor(rng() * rng() * 6);
    const tradeDate = new Date(today);
    tradeDate.setDate(tradeDate.getDate() - agingDays - cycleDays);
    const settlementDate = addBusinessDays(tradeDate, cycleDays);

    // Notional varies by asset class
    const notionalBases: Record<AssetClass, number> = {
      equities: 2_500_000,
      fixed_income: 10_000_000,
      fx: 5_000_000,
      derivatives: 15_000_000,
    };
    const notional = Math.round(jitter(notionalBases[assetClass], 0.6, rng));

    trades.push({
      tradeId: generateTradeId('STL', i, rng),
      assetClass,
      counterparty,
      tradeDate: formatDate(tradeDate),
      settlementDate: formatDate(settlementDate),
      settlementCycle,
      notional,
      currency,
      status,
      agingDays,
    });
  }

  // Sort by aging days descending
  trades.sort((a, b) => b.agingDays - a.agingDays);

  return trades;
}

function generateFailedTrades(rng: () => number): FailedTrade[] {
  const trades: FailedTrade[] = [];

  for (let i = 0; i < 8; i++) {
    const assetClass = pick(ASSET_CLASSES, rng);
    const counterparty = pick(COUNTERPARTIES, rng);
    const reason = pick(FAIL_REASONS, rng);
    const currency = pick(CURRENCIES, rng);

    // Failed trades tend to have higher aging
    const agingDays = 1 + Math.floor(rng() * rng() * 10);

    const notionalBases: Record<AssetClass, number> = {
      equities: 3_500_000,
      fixed_income: 15_000_000,
      fx: 8_000_000,
      derivatives: 20_000_000,
    };
    const notional = Math.round(jitter(notionalBases[assetClass], 0.5, rng));

    // Penalty cost: CSDR penalties are ~1bp/day for equities, 0.5bp for bonds
    const penaltyBps = assetClass === 'equities' ? 1.0 : 0.5;
    const penaltyCostEstimate = round2(notional * (penaltyBps / 10000) * agingDays);

    // Escalation based on aging and notional
    let escalationLevel: EscalationLevel = 'L1';
    if (agingDays >= 5 || notional > 15_000_000) escalationLevel = 'L3';
    else if (agingDays >= 3 || notional > 8_000_000) escalationLevel = 'L2';

    trades.push({
      tradeId: generateTradeId('FAIL', i, rng),
      assetClass,
      counterparty,
      reason,
      notional,
      currency,
      agingDays,
      penaltyCostEstimate,
      escalationLevel,
    });
  }

  // Sort by escalation level descending then aging
  const escalationOrder: Record<EscalationLevel, number> = { L3: 3, L2: 2, L1: 1 };
  trades.sort((a, b) => escalationOrder[b.escalationLevel] - escalationOrder[a.escalationLevel] || b.agingDays - a.agingDays);

  return trades;
}

function generateEfficiencyMetrics(rng: () => number): EfficiencyMetrics {
  return {
    settlementRateByCount: round2(95.0 + rng() * 3.5),
    settlementRateByValue: round2(96.0 + rng() * 2.8),
    avgSettlementTimeHours: round2(4.5 + rng() * 3.0),
    failRatePercent: round2(0.8 + rng() * 1.5),
    nettingEfficiencyPercent: round2(78.0 + rng() * 12.0),
    stpRatePercent: round2(88.0 + rng() * 8.0),
  };
}

function generateClearingHouseStatus(rng: () => number): ClearingHouseStatus[] {
  const houses = [
    { name: 'DTCC', basePending: 12500, baseMs: 180 },
    { name: 'Euroclear', basePending: 8200, baseMs: 240 },
    { name: 'Clearstream', basePending: 6100, baseMs: 220 },
    { name: 'LCH', basePending: 4800, baseMs: 150 },
    { name: 'CME', basePending: 9300, baseMs: 130 },
  ];

  return houses.map((h) => {
    // Connection status: mostly operational
    const statusRoll = rng();
    let connectionStatus: ConnectionStatus = 'operational';
    if (statusRoll > 0.95) connectionStatus = 'down';
    else if (statusRoll > 0.85) connectionStatus = 'degraded';

    const pendingVolume = Math.round(jitter(h.basePending, 0.2, rng));
    const avgProcessingTimeMs = Math.round(jitter(h.baseMs, 0.25, rng));

    // Incident alerts
    const incidentAlerts: string[] = [];
    if (connectionStatus === 'degraded') {
      const degradedAlerts = [
        'Elevated latency on settlement confirmations',
        'Intermittent connectivity to matching engine',
        'Partial system maintenance in progress',
      ];
      incidentAlerts.push(pick(degradedAlerts, rng));
    } else if (connectionStatus === 'down') {
      const downAlerts = [
        'System outage: settlement processing suspended',
        'Critical infrastructure failure: manual processing required',
      ];
      incidentAlerts.push(pick(downAlerts, rng));
    } else if (rng() > 0.7) {
      // Occasional informational alert even when operational
      const infoAlerts = [
        'Scheduled maintenance window tonight 22:00-02:00 UTC',
        'New CSDR penalty regime effective next month',
        'System upgrade completed successfully',
        'Peak volume advisory: end-of-quarter settlement surge expected',
      ];
      incidentAlerts.push(pick(infoAlerts, rng));
    }

    return {
      name: h.name,
      connectionStatus,
      pendingVolume,
      avgProcessingTimeMs,
      incidentAlerts,
    };
  });
}

function generateSettlementCalendar(rng: () => number): SettlementCalendarDay[] {
  const today = new Date();
  const nextDays = getNextBusinessDays(today, 5);

  // Holiday definitions by month-day for major markets
  const holidays: Record<string, { market: string; holiday: string }[]> = {
    '01-01': [{ market: 'US', holiday: "New Year's Day" }, { market: 'EU', holiday: "New Year's Day" }, { market: 'UK', holiday: "New Year's Day" }, { market: 'JP', holiday: "New Year's Day" }],
    '01-02': [{ market: 'JP', holiday: 'Bank Holiday' }],
    '01-03': [{ market: 'JP', holiday: 'Bank Holiday' }],
    '01-15': [{ market: 'US', holiday: 'Martin Luther King Jr. Day' }],
    '02-11': [{ market: 'JP', holiday: 'National Foundation Day' }],
    '02-17': [{ market: 'US', holiday: "Presidents' Day" }],
    '03-20': [{ market: 'JP', holiday: 'Vernal Equinox Day' }],
    '03-21': [{ market: 'JP', holiday: 'Vernal Equinox Day' }],
    '04-18': [{ market: 'EU', holiday: 'Good Friday' }, { market: 'UK', holiday: 'Good Friday' }],
    '04-21': [{ market: 'EU', holiday: 'Easter Monday' }, { market: 'UK', holiday: 'Easter Monday' }],
    '04-29': [{ market: 'JP', holiday: 'Showa Day' }],
    '05-03': [{ market: 'JP', holiday: 'Constitution Memorial Day' }],
    '05-05': [{ market: 'UK', holiday: 'Early May Bank Holiday' }, { market: 'JP', holiday: "Children's Day" }],
    '05-26': [{ market: 'US', holiday: 'Memorial Day' }, { market: 'UK', holiday: 'Spring Bank Holiday' }],
    '07-04': [{ market: 'US', holiday: 'Independence Day' }],
    '07-14': [{ market: 'EU', holiday: 'Bastille Day' }],
    '07-21': [{ market: 'JP', holiday: 'Marine Day' }],
    '08-11': [{ market: 'JP', holiday: 'Mountain Day' }],
    '08-25': [{ market: 'UK', holiday: 'Summer Bank Holiday' }],
    '09-01': [{ market: 'US', holiday: 'Labor Day' }],
    '09-15': [{ market: 'JP', holiday: 'Respect for the Aged Day' }],
    '09-23': [{ market: 'JP', holiday: 'Autumnal Equinox Day' }],
    '10-13': [{ market: 'US', holiday: 'Columbus Day' }, { market: 'JP', holiday: 'Sports Day' }],
    '11-03': [{ market: 'JP', holiday: 'Culture Day' }],
    '11-11': [{ market: 'US', holiday: 'Veterans Day' }],
    '11-23': [{ market: 'JP', holiday: 'Labor Thanksgiving Day' }],
    '11-27': [{ market: 'US', holiday: 'Thanksgiving Day' }],
    '12-25': [{ market: 'US', holiday: 'Christmas Day' }, { market: 'EU', holiday: 'Christmas Day' }, { market: 'UK', holiday: 'Christmas Day' }],
    '12-26': [{ market: 'EU', holiday: 'St. Stephen\'s Day' }, { market: 'UK', holiday: 'Boxing Day' }],
    '12-31': [{ market: 'JP', holiday: 'Bank Holiday' }],
  };

  return nextDays.map((d) => {
    const dateStr = formatDate(d);
    const dow = d.getDay();
    const dayOfWeek = DAY_NAMES[dow];
    const mmdd = dateStr.slice(5);

    const dayHolidays = holidays[mmdd] || [];

    // Expected volume: Friday/Monday higher, mid-week lower
    const dowFactor = (dow === 1 || dow === 5) ? 1.15 : (dow === 3 ? 0.92 : 1.0);
    const baseVolume = 5200;
    const expectedSettlementVolume = Math.round(jitter(baseVolume * dowFactor, 0.12, rng));
    const expectedNotional = Math.round(jitter(42_000_000_000 * dowFactor, 0.15, rng));

    return {
      date: dateStr,
      dayOfWeek,
      expectedSettlementVolume,
      expectedNotional,
      holidays: dayHolidays,
    };
  });
}

function buildTradeSettlementData(): TradeSettlementResponse {
  const rng = seededRandom('trade-settlement');

  const summary = generateSummary(rng);
  const pendingSettlements = generatePendingSettlements(rng);
  const failedTrades = generateFailedTrades(rng);
  const efficiencyMetrics = generateEfficiencyMetrics(rng);
  const clearingHouseStatus = generateClearingHouseStatus(rng);
  const settlementCalendar = generateSettlementCalendar(rng);

  return {
    timestamp: new Date().toISOString(),
    summary,
    pendingSettlements,
    failedTrades,
    efficiencyMetrics,
    clearingHouseStatus,
    settlementCalendar,
  };
}

// ── Cache ──

let cachedData: { data: TradeSettlementResponse; ts: number } | null = null;
let staleData: TradeSettlementResponse | null = null;


// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();

    // Return cached data if still fresh
    if (cachedData && now - cachedData.ts < CACHE_TTL) {
      res.json(cachedData.data);
      return;
    }

    // Generate fresh data
    const data = buildTradeSettlementData();

    // Update cache
    staleData = cachedData?.data ?? staleData;
    cachedData = { data, ts: now };

    res.json(data);
  } catch (err) {
    console.error('[TradeSettlement] Error:', err instanceof Error ? err.message : err);

    // Stale fallback
    if (staleData) {
      res.json(staleData);
      return;
    }
    if (cachedData) {
      res.json(cachedData.data);
      return;
    }

    res.status(500).json({ error: 'Failed to generate trade settlement data' });
  }
});

export default router;
