import { useState } from 'react';
import { useBankEarnings } from '../../api/hooks/use-bank-earnings';
import { RefreshCw } from 'lucide-react';

// ── Types ──

type Tab = 'overview' | 'capital' | 'trading' | 'credit' | 'trends';

interface BankOverview {
  name: string;
  ticker: string;
  revenue: number;
  epsActual: number;
  epsEstimate: number;
  beat: boolean;
  nim: number;
  roe: number;
  stockReaction: number;
}

interface BankCapitalEntry {
  name: string;
  ticker: string;
  cet1: number;
  tceRatio: number;
  efficiencyRatio: number;
  totalAssets: number;
  capitalAdequacy: number;
}

interface BankTradingEntry {
  name: string;
  ticker: string;
  ficcRevenue: number;
  equitiesRevenue: number;
  advisoryRevenue: number;
  underwritingRevenue: number;
  marketShare: number;
}

interface BankCreditEntry {
  name: string;
  ticker: string;
  provisions: number;
  nplRatio: number;
  loanGrowth: number;
  depositGrowth: number;
}

interface QuarterlyValue {
  quarter: string;
  value: number;
}

interface BankTrendEntry {
  name: string;
  ticker: string;
  nimTrend: QuarterlyValue[];
  provisionTrend: QuarterlyValue[];
  tradingRevenueTrend: QuarterlyValue[];
}

interface BankEarningsData {
  overview: BankOverview[];
  capital: BankCapitalEntry[];
  trading: BankTradingEntry[];
  credit: BankCreditEntry[];
  trends: BankTrendEntry[];
  timestamp: string;
}

// ── Fallback mock data ──

const FALLBACK_DATA: BankEarningsData = {
  timestamp: new Date().toISOString(),
  overview: [
    { name: 'JPMorgan Chase', ticker: 'JPM', revenue: 42.4, epsActual: 4.81, epsEstimate: 4.62, beat: true, nim: 2.72, roe: 17.2, stockReaction: 2.4 },
    { name: 'Bank of America', ticker: 'BAC', revenue: 25.5, epsActual: 0.90, epsEstimate: 0.84, beat: true, nim: 2.19, roe: 11.8, stockReaction: 1.1 },
    { name: 'Citigroup', ticker: 'C', revenue: 20.1, epsActual: 1.52, epsEstimate: 1.44, beat: true, nim: 2.48, roe: 7.1, stockReaction: 0.8 },
    { name: 'Wells Fargo', ticker: 'WFC', revenue: 20.9, epsActual: 1.38, epsEstimate: 1.24, beat: true, nim: 2.81, roe: 13.1, stockReaction: 3.2 },
    { name: 'Goldman Sachs', ticker: 'GS', revenue: 15.1, epsActual: 11.58, epsEstimate: 10.22, beat: true, nim: 0.0, roe: 14.6, stockReaction: 4.1 },
    { name: 'Morgan Stanley', ticker: 'MS', revenue: 15.4, epsActual: 2.22, epsEstimate: 2.05, beat: true, nim: 0.0, roe: 16.8, stockReaction: 1.9 },
    { name: 'US Bancorp', ticker: 'USB', revenue: 7.1, epsActual: 1.07, epsEstimate: 1.12, beat: false, nim: 2.68, roe: 12.4, stockReaction: -2.3 },
    { name: 'PNC Financial', ticker: 'PNC', revenue: 5.6, epsActual: 3.74, epsEstimate: 3.58, beat: true, nim: 2.72, roe: 13.5, stockReaction: 1.5 },
    { name: 'Truist Financial', ticker: 'TFC', revenue: 4.8, epsActual: 0.81, epsEstimate: 0.88, beat: false, nim: 3.01, roe: 8.2, stockReaction: -3.1 },
    { name: 'Charles Schwab', ticker: 'SCHW', revenue: 5.2, epsActual: 0.93, epsEstimate: 0.90, beat: true, nim: 2.23, roe: 18.4, stockReaction: 0.6 },
  ],
  capital: [
    { name: 'JPMorgan Chase', ticker: 'JPM', cet1: 15.2, tceRatio: 7.1, efficiencyRatio: 55.2, totalAssets: 3930, capitalAdequacy: 17.8 },
    { name: 'Bank of America', ticker: 'BAC', cet1: 11.8, tceRatio: 5.9, efficiencyRatio: 62.1, totalAssets: 3180, capitalAdequacy: 15.4 },
    { name: 'Citigroup', ticker: 'C', cet1: 13.4, tceRatio: 6.2, efficiencyRatio: 67.8, totalAssets: 2410, capitalAdequacy: 16.9 },
    { name: 'Wells Fargo', ticker: 'WFC', cet1: 11.2, tceRatio: 5.5, efficiencyRatio: 60.3, totalAssets: 1930, capitalAdequacy: 14.8 },
    { name: 'Goldman Sachs', ticker: 'GS', cet1: 14.8, tceRatio: 7.8, efficiencyRatio: 62.8, totalAssets: 1640, capitalAdequacy: 18.2 },
    { name: 'Morgan Stanley', ticker: 'MS', cet1: 15.5, tceRatio: 7.4, efficiencyRatio: 72.1, totalAssets: 1200, capitalAdequacy: 18.5 },
    { name: 'US Bancorp', ticker: 'USB', cet1: 10.2, tceRatio: 5.1, efficiencyRatio: 59.8, totalAssets: 668, capitalAdequacy: 13.6 },
    { name: 'PNC Financial', ticker: 'PNC', cet1: 10.5, tceRatio: 6.8, efficiencyRatio: 57.4, totalAssets: 557, capitalAdequacy: 14.1 },
    { name: 'Truist Financial', ticker: 'TFC', cet1: 10.1, tceRatio: 5.3, efficiencyRatio: 65.2, totalAssets: 535, capitalAdequacy: 13.2 },
    { name: 'Charles Schwab', ticker: 'SCHW', cet1: 27.1, tceRatio: 8.9, efficiencyRatio: 58.6, totalAssets: 466, capitalAdequacy: 29.4 },
  ],
  trading: [
    { name: 'JPMorgan Chase', ticker: 'JPM', ficcRevenue: 5.8, equitiesRevenue: 3.2, advisoryRevenue: 1.6, underwritingRevenue: 2.1, marketShare: 14.8 },
    { name: 'Goldman Sachs', ticker: 'GS', ficcRevenue: 4.3, equitiesRevenue: 3.5, advisoryRevenue: 1.8, underwritingRevenue: 1.4, marketShare: 12.2 },
    { name: 'Morgan Stanley', ticker: 'MS', ficcRevenue: 2.5, equitiesRevenue: 3.1, advisoryRevenue: 1.5, underwritingRevenue: 1.2, marketShare: 10.6 },
    { name: 'Bank of America', ticker: 'BAC', ficcRevenue: 3.4, equitiesRevenue: 1.9, advisoryRevenue: 0.8, underwritingRevenue: 1.3, marketShare: 8.4 },
    { name: 'Citigroup', ticker: 'C', ficcRevenue: 3.8, equitiesRevenue: 1.3, advisoryRevenue: 0.6, underwritingRevenue: 0.9, marketShare: 7.1 },
    { name: 'Wells Fargo', ticker: 'WFC', ficcRevenue: 1.2, equitiesRevenue: 0.6, advisoryRevenue: 0.4, underwritingRevenue: 0.5, marketShare: 3.2 },
    { name: 'PNC Financial', ticker: 'PNC', ficcRevenue: 0.3, equitiesRevenue: 0.1, advisoryRevenue: 0.2, underwritingRevenue: 0.2, marketShare: 0.8 },
    { name: 'US Bancorp', ticker: 'USB', ficcRevenue: 0.2, equitiesRevenue: 0.1, advisoryRevenue: 0.1, underwritingRevenue: 0.1, marketShare: 0.5 },
  ],
  credit: [
    { name: 'JPMorgan Chase', ticker: 'JPM', provisions: 2.76, nplRatio: 0.62, loanGrowth: 5.2, depositGrowth: 3.1 },
    { name: 'Bank of America', ticker: 'BAC', provisions: 1.49, nplRatio: 0.48, loanGrowth: 2.1, depositGrowth: 1.8 },
    { name: 'Citigroup', ticker: 'C', provisions: 2.42, nplRatio: 0.81, loanGrowth: 1.3, depositGrowth: -0.5 },
    { name: 'Wells Fargo', ticker: 'WFC', provisions: 1.28, nplRatio: 0.55, loanGrowth: 0.8, depositGrowth: 2.4 },
    { name: 'Goldman Sachs', ticker: 'GS', provisions: 0.45, nplRatio: 0.32, loanGrowth: 8.4, depositGrowth: 12.6 },
    { name: 'Morgan Stanley', ticker: 'MS', provisions: 0.16, nplRatio: 0.18, loanGrowth: 6.1, depositGrowth: 4.2 },
    { name: 'US Bancorp', ticker: 'USB', provisions: 0.62, nplRatio: 0.58, loanGrowth: -1.2, depositGrowth: -0.8 },
    { name: 'PNC Financial', ticker: 'PNC', provisions: 0.24, nplRatio: 0.42, loanGrowth: 3.5, depositGrowth: 2.1 },
    { name: 'Truist Financial', ticker: 'TFC', provisions: 0.58, nplRatio: 0.72, loanGrowth: -2.1, depositGrowth: -1.4 },
    { name: 'Charles Schwab', ticker: 'SCHW', provisions: 0.02, nplRatio: 0.05, loanGrowth: 4.8, depositGrowth: 8.1 },
  ],
  trends: [
    { name: 'JPMorgan Chase', ticker: 'JPM', nimTrend: [{ quarter: 'Q1', value: 2.63 }, { quarter: 'Q2', value: 2.68 }, { quarter: 'Q3', value: 2.70 }, { quarter: 'Q4', value: 2.72 }], provisionTrend: [{ quarter: 'Q1', value: 2.31 }, { quarter: 'Q2', value: 2.48 }, { quarter: 'Q3', value: 2.62 }, { quarter: 'Q4', value: 2.76 }], tradingRevenueTrend: [{ quarter: 'Q1', value: 8.4 }, { quarter: 'Q2', value: 8.1 }, { quarter: 'Q3', value: 8.8 }, { quarter: 'Q4', value: 9.0 }] },
    { name: 'Bank of America', ticker: 'BAC', nimTrend: [{ quarter: 'Q1', value: 2.33 }, { quarter: 'Q2', value: 2.25 }, { quarter: 'Q3', value: 2.20 }, { quarter: 'Q4', value: 2.19 }], provisionTrend: [{ quarter: 'Q1', value: 1.12 }, { quarter: 'Q2', value: 1.28 }, { quarter: 'Q3', value: 1.38 }, { quarter: 'Q4', value: 1.49 }], tradingRevenueTrend: [{ quarter: 'Q1', value: 5.0 }, { quarter: 'Q2', value: 4.8 }, { quarter: 'Q3', value: 5.2 }, { quarter: 'Q4', value: 5.3 }] },
    { name: 'Citigroup', ticker: 'C', nimTrend: [{ quarter: 'Q1', value: 2.52 }, { quarter: 'Q2', value: 2.50 }, { quarter: 'Q3', value: 2.49 }, { quarter: 'Q4', value: 2.48 }], provisionTrend: [{ quarter: 'Q1', value: 1.82 }, { quarter: 'Q2', value: 2.01 }, { quarter: 'Q3', value: 2.22 }, { quarter: 'Q4', value: 2.42 }], tradingRevenueTrend: [{ quarter: 'Q1', value: 4.8 }, { quarter: 'Q2', value: 4.5 }, { quarter: 'Q3', value: 5.0 }, { quarter: 'Q4', value: 5.1 }] },
    { name: 'Wells Fargo', ticker: 'WFC', nimTrend: [{ quarter: 'Q1', value: 2.92 }, { quarter: 'Q2', value: 2.88 }, { quarter: 'Q3', value: 2.84 }, { quarter: 'Q4', value: 2.81 }], provisionTrend: [{ quarter: 'Q1', value: 0.94 }, { quarter: 'Q2', value: 1.08 }, { quarter: 'Q3', value: 1.18 }, { quarter: 'Q4', value: 1.28 }], tradingRevenueTrend: [{ quarter: 'Q1', value: 1.6 }, { quarter: 'Q2', value: 1.5 }, { quarter: 'Q3', value: 1.7 }, { quarter: 'Q4', value: 1.8 }] },
    { name: 'Goldman Sachs', ticker: 'GS', nimTrend: [{ quarter: 'Q1', value: 0.0 }, { quarter: 'Q2', value: 0.0 }, { quarter: 'Q3', value: 0.0 }, { quarter: 'Q4', value: 0.0 }], provisionTrend: [{ quarter: 'Q1', value: 0.52 }, { quarter: 'Q2', value: 0.48 }, { quarter: 'Q3', value: 0.46 }, { quarter: 'Q4', value: 0.45 }], tradingRevenueTrend: [{ quarter: 'Q1', value: 7.2 }, { quarter: 'Q2', value: 7.0 }, { quarter: 'Q3', value: 7.6 }, { quarter: 'Q4', value: 7.8 }] },
    { name: 'Morgan Stanley', ticker: 'MS', nimTrend: [{ quarter: 'Q1', value: 0.0 }, { quarter: 'Q2', value: 0.0 }, { quarter: 'Q3', value: 0.0 }, { quarter: 'Q4', value: 0.0 }], provisionTrend: [{ quarter: 'Q1', value: 0.22 }, { quarter: 'Q2', value: 0.19 }, { quarter: 'Q3', value: 0.17 }, { quarter: 'Q4', value: 0.16 }], tradingRevenueTrend: [{ quarter: 'Q1', value: 5.2 }, { quarter: 'Q2', value: 5.0 }, { quarter: 'Q3', value: 5.4 }, { quarter: 'Q4', value: 5.6 }] },
  ],
};

// ── Color helpers ──

function beatMissColor(beat: boolean): string {
  return beat ? 'text-green-400' : 'text-red-400';
}

function beatMissBg(beat: boolean): string {
  return beat
    ? 'bg-green-500/10 border-green-500/30 text-green-400'
    : 'bg-red-500/10 border-red-500/30 text-red-400';
}

function reactionColor(val: number): string {
  if (val > 0) return 'text-green-400';
  if (val < 0) return 'text-red-400';
  return 'text-neutral-400';
}

function cet1Color(cet1: number): string {
  if (cet1 >= 13) return 'text-green-400';
  if (cet1 >= 11) return 'text-amber-400';
  return 'text-red-400';
}

function efficiencyColor(ratio: number): string {
  if (ratio <= 55) return 'text-green-400';
  if (ratio <= 65) return 'text-amber-400';
  return 'text-red-400';
}

function nplColor(npl: number): string {
  if (npl <= 0.3) return 'text-green-400';
  if (npl <= 0.6) return 'text-amber-400';
  return 'text-red-400';
}

function growthColor(val: number): string {
  if (val > 3) return 'text-green-400';
  if (val > 0) return 'text-green-400/70';
  if (val === 0) return 'text-neutral-400';
  return 'text-red-400';
}

function provisionTrendColor(trend: QuarterlyValue[]): string {
  if (trend.length < 2) return 'text-neutral-400';
  const last = trend[trend.length - 1].value;
  const prev = trend[trend.length - 2].value;
  if (last > prev * 1.1) return 'text-red-400';
  if (last > prev) return 'text-amber-400';
  return 'text-green-400';
}

function nimTrendColor(trend: QuarterlyValue[]): string {
  if (trend.length < 2) return 'text-neutral-400';
  const last = trend[trend.length - 1].value;
  const first = trend[0].value;
  if (last === 0 && first === 0) return 'text-neutral-600';
  if (last > first) return 'text-green-400';
  if (last < first) return 'text-red-400';
  return 'text-neutral-400';
}

function tradingTrendColor(trend: QuarterlyValue[]): string {
  if (trend.length < 2) return 'text-neutral-400';
  const last = trend[trend.length - 1].value;
  const first = trend[0].value;
  if (last > first) return 'text-green-400';
  if (last < first) return 'text-red-400';
  return 'text-neutral-400';
}

// ── Formatting helpers ──

function fmtB(n: number): string {
  return '$' + n.toFixed(1) + 'B';
}

function fmtBInt(n: number): string {
  return '$' + n.toLocaleString() + 'B';
}

function fmtPct(n: number, decimals = 2): string {
  return n.toFixed(decimals) + '%';
}

function fmtEps(n: number): string {
  return '$' + n.toFixed(2);
}

function fmtReaction(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return sign + n.toFixed(1) + '%';
}

function fmtTrendDirection(trend: QuarterlyValue[]): string {
  if (trend.length < 2) return '-';
  const last = trend[trend.length - 1].value;
  const first = trend[0].value;
  if (last === 0 && first === 0) return 'N/A';
  const change = ((last - first) / (first || 1)) * 100;
  const sign = change >= 0 ? '+' : '';
  return sign + change.toFixed(1) + '%';
}

// ── Tab Labels ──

const TAB_LABELS: Record<Tab, string> = {
  overview: 'Overview',
  capital: 'Capital',
  trading: 'Trading',
  credit: 'Credit',
  trends: 'Trends',
};

// ── Section: Overview Tab ──

function OverviewTab({ banks }: { banks: BankOverview[] }) {
  return (
    <div>
      <div className="grid grid-cols-[1fr_52px_52px_52px_40px_45px_42px_48px] gap-px px-2 py-0.5 border-b border-border/10 text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
        <span>Bank</span>
        <span className="text-right">Revenue</span>
        <span className="text-right">EPS Act</span>
        <span className="text-right">EPS Est</span>
        <span className="text-center">B/M</span>
        <span className="text-right">NIM</span>
        <span className="text-right">ROE</span>
        <span className="text-right">React</span>
      </div>

      {banks.map((bank) => (
        <div
          key={bank.ticker}
          className="grid grid-cols-[1fr_52px_52px_52px_40px_45px_42px_48px] gap-px px-2 py-0.5 border-b border-border/[0.06] hover:bg-blue-400/[0.02] transition-colors"
        >
          <div className="flex items-center gap-1 overflow-hidden">
            <span className="text-[8px] font-mono font-bold text-white truncate">{bank.name}</span>
            <span className="text-[7px] font-mono text-neutral-600 shrink-0">{bank.ticker}</span>
          </div>
          <span className="text-[8px] font-mono text-white text-right">{fmtB(bank.revenue)}</span>
          <span className={`text-[8px] font-mono font-bold text-right ${beatMissColor(bank.beat)}`}>
            {fmtEps(bank.epsActual)}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right">{fmtEps(bank.epsEstimate)}</span>
          <div className="flex justify-center">
            <span className={`text-[7px] font-mono font-black uppercase px-1 py-px border ${beatMissBg(bank.beat)}`}>
              {bank.beat ? 'BEAT' : 'MISS'}
            </span>
          </div>
          <span className="text-[8px] font-mono text-white text-right">
            {bank.nim > 0 ? fmtPct(bank.nim) : '-'}
          </span>
          <span className="text-[8px] font-mono text-white text-right">{fmtPct(bank.roe, 1)}</span>
          <span className={`text-[8px] font-mono font-bold text-right ${reactionColor(bank.stockReaction)}`}>
            {fmtReaction(bank.stockReaction)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Section: Capital Tab ──

function CapitalTab({ banks }: { banks: BankCapitalEntry[] }) {
  return (
    <div>
      <div className="grid grid-cols-[1fr_50px_48px_55px_60px_55px] gap-px px-2 py-0.5 border-b border-border/10 text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
        <span>Bank</span>
        <span className="text-right">CET1</span>
        <span className="text-right">TCE</span>
        <span className="text-right">Eff Ratio</span>
        <span className="text-right">Tot Assets</span>
        <span className="text-right">Cap Adeq</span>
      </div>

      {banks.map((bank) => (
        <div
          key={bank.ticker}
          className="grid grid-cols-[1fr_50px_48px_55px_60px_55px] gap-px px-2 py-0.5 border-b border-border/[0.06] hover:bg-blue-400/[0.02] transition-colors"
        >
          <div className="flex items-center gap-1 overflow-hidden">
            <span className="text-[8px] font-mono font-bold text-white truncate">{bank.name}</span>
            <span className="text-[7px] font-mono text-neutral-600 shrink-0">{bank.ticker}</span>
          </div>
          <span className={`text-[8px] font-mono font-bold text-right ${cet1Color(bank.cet1)}`}>
            {fmtPct(bank.cet1, 1)}
          </span>
          <span className="text-[8px] font-mono text-white text-right">{fmtPct(bank.tceRatio, 1)}</span>
          <span className={`text-[8px] font-mono font-bold text-right ${efficiencyColor(bank.efficiencyRatio)}`}>
            {fmtPct(bank.efficiencyRatio, 1)}
          </span>
          <span className="text-[8px] font-mono text-white text-right">{fmtBInt(bank.totalAssets)}</span>
          <span className={`text-[8px] font-mono font-bold text-right ${cet1Color(bank.capitalAdequacy)}`}>
            {fmtPct(bank.capitalAdequacy, 1)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Section: Trading Tab ──

function TradingTab({ banks }: { banks: BankTradingEntry[] }) {
  return (
    <div>
      <div className="grid grid-cols-[1fr_48px_48px_50px_52px_50px] gap-px px-2 py-0.5 border-b border-border/10 text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
        <span>Bank</span>
        <span className="text-right">FICC</span>
        <span className="text-right">Equities</span>
        <span className="text-right">Advisory</span>
        <span className="text-right">Undwrt</span>
        <span className="text-right">Mkt Shr</span>
      </div>

      {banks.map((bank) => (
        <div
          key={bank.ticker}
          className="grid grid-cols-[1fr_48px_48px_50px_52px_50px] gap-px px-2 py-0.5 border-b border-border/[0.06] hover:bg-blue-400/[0.02] transition-colors"
        >
          <div className="flex items-center gap-1 overflow-hidden">
            <span className="text-[8px] font-mono font-bold text-white truncate">{bank.name}</span>
            <span className="text-[7px] font-mono text-neutral-600 shrink-0">{bank.ticker}</span>
          </div>
          <span className="text-[8px] font-mono text-blue-400 font-bold text-right">{fmtB(bank.ficcRevenue)}</span>
          <span className="text-[8px] font-mono text-blue-400/80 font-bold text-right">{fmtB(bank.equitiesRevenue)}</span>
          <span className="text-[8px] font-mono text-white text-right">{fmtB(bank.advisoryRevenue)}</span>
          <span className="text-[8px] font-mono text-white text-right">{fmtB(bank.underwritingRevenue)}</span>
          <span className="text-[8px] font-mono text-amber-400 font-bold text-right">{fmtPct(bank.marketShare, 1)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Section: Credit Tab ──

function CreditTab({ banks }: { banks: BankCreditEntry[] }) {
  return (
    <div>
      <div className="grid grid-cols-[1fr_55px_50px_55px_55px] gap-px px-2 py-0.5 border-b border-border/10 text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
        <span>Bank</span>
        <span className="text-right">Provisn</span>
        <span className="text-right">NPL</span>
        <span className="text-right">Loan Gr</span>
        <span className="text-right">Dep Gr</span>
      </div>

      {banks.map((bank) => (
        <div
          key={bank.ticker}
          className="grid grid-cols-[1fr_55px_50px_55px_55px] gap-px px-2 py-0.5 border-b border-border/[0.06] hover:bg-blue-400/[0.02] transition-colors"
        >
          <div className="flex items-center gap-1 overflow-hidden">
            <span className="text-[8px] font-mono font-bold text-white truncate">{bank.name}</span>
            <span className="text-[7px] font-mono text-neutral-600 shrink-0">{bank.ticker}</span>
          </div>
          <span className="text-[8px] font-mono text-amber-400 text-right">{fmtB(bank.provisions)}</span>
          <span className={`text-[8px] font-mono font-bold text-right ${nplColor(bank.nplRatio)}`}>
            {fmtPct(bank.nplRatio)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${growthColor(bank.loanGrowth)}`}>
            {(bank.loanGrowth >= 0 ? '+' : '') + fmtPct(bank.loanGrowth, 1)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${growthColor(bank.depositGrowth)}`}>
            {(bank.depositGrowth >= 0 ? '+' : '') + fmtPct(bank.depositGrowth, 1)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Sparkline helper (inline SVG) ──

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return <span className="text-[7px] text-neutral-600">-</span>;

  const w = 48;
  const h = 14;
  const pad = 1;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - 2 * pad);
    const y = pad + (1 - (v - min) / range) * (h - 2 * pad);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Section: Trends Tab ──

function TrendsTab({ banks }: { banks: BankTrendEntry[] }) {
  return (
    <div>
      {/* NIM Trend */}
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            NIM Trend (Last 4Q)
          </span>
        </div>
        <div className="grid grid-cols-[1fr_55px_80px_50px] gap-px px-2 py-0.5 border-b border-border/10 text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          <span>Bank</span>
          <span className="text-right">Current</span>
          <span className="text-center">Trend</span>
          <span className="text-right">Chg</span>
        </div>
        {banks.filter(b => b.nimTrend.some(t => t.value > 0)).map((bank) => (
          <div
            key={bank.ticker}
            className="grid grid-cols-[1fr_55px_80px_50px] gap-px px-2 py-0.5 border-b border-border/[0.06] hover:bg-blue-400/[0.02] transition-colors items-center"
          >
            <div className="flex items-center gap-1 overflow-hidden">
              <span className="text-[8px] font-mono font-bold text-white truncate">{bank.name}</span>
              <span className="text-[7px] font-mono text-neutral-600 shrink-0">{bank.ticker}</span>
            </div>
            <span className="text-[8px] font-mono text-white text-right">
              {fmtPct(bank.nimTrend[bank.nimTrend.length - 1].value)}
            </span>
            <div className="flex justify-center">
              <Sparkline
                values={bank.nimTrend.map(t => t.value)}
                color={nimTrendColor(bank.nimTrend) === 'text-green-400' ? '#4ade80' : nimTrendColor(bank.nimTrend) === 'text-red-400' ? '#f87171' : '#525252'}
              />
            </div>
            <span className={`text-[8px] font-mono font-bold text-right ${nimTrendColor(bank.nimTrend)}`}>
              {fmtTrendDirection(bank.nimTrend)}
            </span>
          </div>
        ))}
      </div>

      {/* Provision Trend */}
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            Provision Trend (Last 4Q)
          </span>
        </div>
        <div className="grid grid-cols-[1fr_55px_80px_50px] gap-px px-2 py-0.5 border-b border-border/10 text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          <span>Bank</span>
          <span className="text-right">Current</span>
          <span className="text-center">Trend</span>
          <span className="text-right">Chg</span>
        </div>
        {banks.map((bank) => (
          <div
            key={bank.ticker}
            className="grid grid-cols-[1fr_55px_80px_50px] gap-px px-2 py-0.5 border-b border-border/[0.06] hover:bg-blue-400/[0.02] transition-colors items-center"
          >
            <div className="flex items-center gap-1 overflow-hidden">
              <span className="text-[8px] font-mono font-bold text-white truncate">{bank.name}</span>
              <span className="text-[7px] font-mono text-neutral-600 shrink-0">{bank.ticker}</span>
            </div>
            <span className="text-[8px] font-mono text-amber-400 text-right">
              {fmtB(bank.provisionTrend[bank.provisionTrend.length - 1].value)}
            </span>
            <div className="flex justify-center">
              <Sparkline
                values={bank.provisionTrend.map(t => t.value)}
                color={provisionTrendColor(bank.provisionTrend) === 'text-green-400' ? '#4ade80' : provisionTrendColor(bank.provisionTrend) === 'text-red-400' ? '#f87171' : '#fbbf24'}
              />
            </div>
            <span className={`text-[8px] font-mono font-bold text-right ${provisionTrendColor(bank.provisionTrend)}`}>
              {fmtTrendDirection(bank.provisionTrend)}
            </span>
          </div>
        ))}
      </div>

      {/* Trading Revenue Trend */}
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            Trading Revenue Trend (Last 4Q)
          </span>
        </div>
        <div className="grid grid-cols-[1fr_55px_80px_50px] gap-px px-2 py-0.5 border-b border-border/10 text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          <span>Bank</span>
          <span className="text-right">Current</span>
          <span className="text-center">Trend</span>
          <span className="text-right">Chg</span>
        </div>
        {banks.map((bank) => (
          <div
            key={bank.ticker}
            className="grid grid-cols-[1fr_55px_80px_50px] gap-px px-2 py-0.5 border-b border-border/[0.06] hover:bg-blue-400/[0.02] transition-colors items-center"
          >
            <div className="flex items-center gap-1 overflow-hidden">
              <span className="text-[8px] font-mono font-bold text-white truncate">{bank.name}</span>
              <span className="text-[7px] font-mono text-neutral-600 shrink-0">{bank.ticker}</span>
            </div>
            <span className="text-[8px] font-mono text-blue-400 font-bold text-right">
              {fmtB(bank.tradingRevenueTrend[bank.tradingRevenueTrend.length - 1].value)}
            </span>
            <div className="flex justify-center">
              <Sparkline
                values={bank.tradingRevenueTrend.map(t => t.value)}
                color={tradingTrendColor(bank.tradingRevenueTrend) === 'text-green-400' ? '#4ade80' : tradingTrendColor(bank.tradingRevenueTrend) === 'text-red-400' ? '#f87171' : '#525252'}
              />
            </div>
            <span className={`text-[8px] font-mono font-bold text-right ${tradingTrendColor(bank.tradingRevenueTrend)}`}>
              {fmtTrendDirection(bank.tradingRevenueTrend)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Panel ──

export function BankEarningsPanel() {
  const { data: rawData, isLoading, refetch } = useBankEarnings();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const data: BankEarningsData = (rawData as BankEarningsData) || FALLBACK_DATA;

  const beatCount = data.overview.filter(b => b.beat).length;
  const totalCount = data.overview.length;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-blue-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-blue-400">
            Bank Earnings Monitor
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider border ${
            beatCount / totalCount >= 0.7
              ? 'text-green-400 bg-green-500/10 border-green-500/30'
              : beatCount / totalCount >= 0.5
                ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                : 'text-red-400 bg-red-500/10 border-red-500/30'
          }`}>
            {beatCount}/{totalCount} Beat
          </span>
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-blue-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tab selector */}
      <div className="flex border-b border-border/20 shrink-0">
        <div className="flex gap-px px-2 py-1 flex-1">
          {(['overview', 'capital', 'trading', 'credit', 'trends'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider transition-colors ${
                activeTab === tab
                  ? 'text-blue-400 border-b border-blue-400'
                  : 'text-neutral-600 hover:text-neutral-400'
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
        <div className="px-2 py-1 text-[7px] font-mono text-neutral-600">
          {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !rawData && (
          <div className="text-center py-8 text-blue-400 text-[9px] font-mono uppercase animate-pulse">
            Loading...
          </div>
        )}

        {!rawData && !isLoading && !data && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            No data available
          </div>
        )}

        {data && (
          <>
            {activeTab === 'overview' && <OverviewTab banks={data.overview} />}
            {activeTab === 'capital' && <CapitalTab banks={data.capital} />}
            {activeTab === 'trading' && <TradingTab banks={data.trading} />}
            {activeTab === 'credit' && <CreditTab banks={data.credit} />}
            {activeTab === 'trends' && <TrendsTab banks={data.trends} />}
          </>
        )}
      </div>
    </div>
  );
}
