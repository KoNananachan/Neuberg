import { useBankCapital } from '../../api/hooks/use-bank-capital';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// ── Fallback mock data ──

interface GSIBBank {
  name: string;
  ticker: string;
  country: string;
  cet1: number;
  cet1Min: number;
  tier1: number;
  tier1Min: number;
  totalCapital: number;
  totalCapitalMin: number;
  leverage: number;
  leverageMin: number;
  bucket: number;
}

interface StressTestResult {
  name: string;
  ticker: string;
  cet1Pre: number;
  cet1Post: number;
  cet1Min: number;
  losses: number;
  result: 'pass' | 'fail' | 'conditional';
}

interface TLACEntry {
  name: string;
  ticker: string;
  tlacRatio: number;
  tlacMin: number;
  mrelRatio: number;
  mrelMin: number;
  subordination: number;
}

interface LiquidityEntry {
  name: string;
  ticker: string;
  lcr: number;
  lcrMin: number;
  nsfr: number;
  nsfrMin: number;
  hqla: number;
}

interface AT1Bond {
  issuer: string;
  coupon: number;
  yield: number;
  spread: number;
  callDate: string;
  price: number;
  rating: string;
  triggerLevel: number;
}

interface BankCapitalData {
  gsibs: GSIBBank[];
  stressTests: StressTestResult[];
  tlac: TLACEntry[];
  liquidity: LiquidityEntry[];
  at1Bonds: AT1Bond[];
  timestamp: string;
  systemicRisk: 'low' | 'moderate' | 'elevated' | 'high';
  avgCET1: number;
  avgLCR: number;
}

const FALLBACK_DATA: BankCapitalData = {
  timestamp: new Date().toISOString(),
  systemicRisk: 'low',
  avgCET1: 13.4,
  avgLCR: 132.5,
  gsibs: [
    { name: 'JPMorgan Chase', ticker: 'JPM', country: 'US', cet1: 15.2, cet1Min: 11.4, tier1: 16.8, tier1Min: 13.0, totalCapital: 19.1, totalCapitalMin: 15.0, leverage: 6.8, leverageMin: 5.0, bucket: 4 },
    { name: 'Bank of America', ticker: 'BAC', country: 'US', cet1: 11.8, cet1Min: 10.0, tier1: 13.5, tier1Min: 11.5, totalCapital: 15.8, totalCapitalMin: 13.5, leverage: 6.1, leverageMin: 5.0, bucket: 2 },
    { name: 'Citigroup', ticker: 'C', country: 'US', cet1: 13.4, cet1Min: 10.5, tier1: 15.0, tier1Min: 12.0, totalCapital: 17.2, totalCapitalMin: 14.0, leverage: 6.4, leverageMin: 5.0, bucket: 3 },
    { name: 'Goldman Sachs', ticker: 'GS', country: 'US', cet1: 14.8, cet1Min: 10.0, tier1: 16.2, tier1Min: 11.5, totalCapital: 18.5, totalCapitalMin: 13.5, leverage: 6.9, leverageMin: 5.0, bucket: 2 },
    { name: 'Morgan Stanley', ticker: 'MS', country: 'US', cet1: 15.5, cet1Min: 10.0, tier1: 17.0, tier1Min: 11.5, totalCapital: 19.3, totalCapitalMin: 13.5, leverage: 6.7, leverageMin: 5.0, bucket: 2 },
    { name: 'Wells Fargo', ticker: 'WFC', country: 'US', cet1: 11.2, cet1Min: 9.5, tier1: 12.8, tier1Min: 11.0, totalCapital: 15.1, totalCapitalMin: 13.0, leverage: 5.8, leverageMin: 5.0, bucket: 2 },
    { name: 'HSBC', ticker: 'HSBA', country: 'UK', cet1: 14.7, cet1Min: 10.6, tier1: 16.5, tier1Min: 12.2, totalCapital: 19.8, totalCapitalMin: 14.2, leverage: 5.6, leverageMin: 3.5, bucket: 3 },
    { name: 'Barclays', ticker: 'BARC', country: 'UK', cet1: 13.8, cet1Min: 10.2, tier1: 15.9, tier1Min: 11.8, totalCapital: 18.4, totalCapitalMin: 13.8, leverage: 5.1, leverageMin: 3.5, bucket: 2 },
    { name: 'Deutsche Bank', ticker: 'DBK', country: 'DE', cet1: 13.6, cet1Min: 10.4, tier1: 15.3, tier1Min: 12.0, totalCapital: 17.8, totalCapitalMin: 14.0, leverage: 4.6, leverageMin: 3.5, bucket: 2 },
    { name: 'BNP Paribas', ticker: 'BNP', country: 'FR', cet1: 12.9, cet1Min: 10.1, tier1: 14.6, tier1Min: 11.6, totalCapital: 17.1, totalCapitalMin: 13.6, leverage: 4.8, leverageMin: 3.5, bucket: 2 },
    { name: 'UBS Group', ticker: 'UBSG', country: 'CH', cet1: 14.3, cet1Min: 10.0, tier1: 16.1, tier1Min: 11.5, totalCapital: 19.0, totalCapitalMin: 13.5, leverage: 5.2, leverageMin: 3.5, bucket: 1 },
    { name: 'Mitsubishi UFJ', ticker: 'MUFG', country: 'JP', cet1: 12.2, cet1Min: 9.5, tier1: 14.0, tier1Min: 11.0, totalCapital: 16.4, totalCapitalMin: 13.0, leverage: 5.0, leverageMin: 3.5, bucket: 2 },
    { name: 'Industrial & Commercial Bank', ticker: 'ICBC', country: 'CN', cet1: 13.7, cet1Min: 9.0, tier1: 15.2, tier1Min: 10.5, totalCapital: 18.0, totalCapitalMin: 12.5, leverage: 7.1, leverageMin: 4.0, bucket: 1 },
    { name: 'China Construction Bank', ticker: 'CCB', country: 'CN', cet1: 13.9, cet1Min: 9.0, tier1: 15.4, tier1Min: 10.5, totalCapital: 17.8, totalCapitalMin: 12.5, leverage: 7.4, leverageMin: 4.0, bucket: 1 },
    { name: 'Societe Generale', ticker: 'GLE', country: 'FR', cet1: 13.1, cet1Min: 9.8, tier1: 14.7, tier1Min: 11.3, totalCapital: 17.3, totalCapitalMin: 13.3, leverage: 4.5, leverageMin: 3.5, bucket: 1 },
  ],
  stressTests: [
    { name: 'JPMorgan Chase', ticker: 'JPM', cet1Pre: 15.2, cet1Post: 11.8, cet1Min: 4.5, losses: 54.2, result: 'pass' },
    { name: 'Bank of America', ticker: 'BAC', cet1Pre: 11.8, cet1Post: 7.9, cet1Min: 4.5, losses: 62.1, result: 'pass' },
    { name: 'Citigroup', ticker: 'C', cet1Pre: 13.4, cet1Post: 9.1, cet1Min: 4.5, losses: 48.7, result: 'pass' },
    { name: 'Goldman Sachs', ticker: 'GS', cet1Pre: 14.8, cet1Post: 10.5, cet1Min: 4.5, losses: 38.3, result: 'pass' },
    { name: 'Wells Fargo', ticker: 'WFC', cet1Pre: 11.2, cet1Post: 6.2, cet1Min: 4.5, losses: 58.9, result: 'conditional' },
    { name: 'Deutsche Bank', ticker: 'DBK', cet1Pre: 13.6, cet1Post: 8.4, cet1Min: 4.5, losses: 31.6, result: 'pass' },
    { name: 'HSBC', ticker: 'HSBA', cet1Pre: 14.7, cet1Post: 10.2, cet1Min: 4.5, losses: 42.5, result: 'pass' },
    { name: 'Barclays', ticker: 'BARC', cet1Pre: 13.8, cet1Post: 8.8, cet1Min: 4.5, losses: 28.4, result: 'pass' },
  ],
  tlac: [
    { name: 'JPMorgan Chase', ticker: 'JPM', tlacRatio: 27.8, tlacMin: 22.0, mrelRatio: 29.5, mrelMin: 24.0, subordination: 21.3 },
    { name: 'Bank of America', ticker: 'BAC', tlacRatio: 24.2, tlacMin: 20.5, mrelRatio: 26.1, mrelMin: 22.5, subordination: 18.6 },
    { name: 'Citigroup', ticker: 'C', tlacRatio: 26.1, tlacMin: 21.5, mrelRatio: 28.0, mrelMin: 23.5, subordination: 19.8 },
    { name: 'Goldman Sachs', ticker: 'GS', tlacRatio: 28.5, tlacMin: 20.5, mrelRatio: 30.2, mrelMin: 22.5, subordination: 22.1 },
    { name: 'HSBC', ticker: 'HSBA', tlacRatio: 26.8, tlacMin: 21.0, mrelRatio: 28.9, mrelMin: 23.0, subordination: 20.5 },
    { name: 'Deutsche Bank', ticker: 'DBK', tlacRatio: 23.4, tlacMin: 20.0, mrelRatio: 25.8, mrelMin: 22.0, subordination: 17.2 },
    { name: 'BNP Paribas', ticker: 'BNP', tlacRatio: 25.6, tlacMin: 20.5, mrelRatio: 27.4, mrelMin: 22.5, subordination: 19.1 },
    { name: 'UBS Group', ticker: 'UBSG', tlacRatio: 32.1, tlacMin: 19.5, mrelRatio: 34.0, mrelMin: 21.5, subordination: 25.8 },
  ],
  liquidity: [
    { name: 'JPMorgan Chase', ticker: 'JPM', lcr: 158, lcrMin: 100, nsfr: 132, nsfrMin: 100, hqla: 892 },
    { name: 'Bank of America', ticker: 'BAC', lcr: 142, lcrMin: 100, nsfr: 118, nsfrMin: 100, hqla: 745 },
    { name: 'Citigroup', ticker: 'C', lcr: 136, lcrMin: 100, nsfr: 122, nsfrMin: 100, hqla: 604 },
    { name: 'Goldman Sachs', ticker: 'GS', lcr: 145, lcrMin: 100, nsfr: 128, nsfrMin: 100, hqla: 412 },
    { name: 'Morgan Stanley', ticker: 'MS', lcr: 139, lcrMin: 100, nsfr: 115, nsfrMin: 100, hqla: 328 },
    { name: 'Wells Fargo', ticker: 'WFC', lcr: 118, lcrMin: 100, nsfr: 112, nsfrMin: 100, hqla: 567 },
    { name: 'HSBC', ticker: 'HSBA', lcr: 152, lcrMin: 100, nsfr: 138, nsfrMin: 100, hqla: 685 },
    { name: 'Barclays', ticker: 'BARC', lcr: 148, lcrMin: 100, nsfr: 130, nsfrMin: 100, hqla: 412 },
    { name: 'Deutsche Bank', ticker: 'DBK', lcr: 131, lcrMin: 100, nsfr: 119, nsfrMin: 100, hqla: 298 },
    { name: 'BNP Paribas', ticker: 'BNP', lcr: 134, lcrMin: 100, nsfr: 116, nsfrMin: 100, hqla: 385 },
    { name: 'UBS Group', ticker: 'UBSG', lcr: 161, lcrMin: 100, nsfr: 142, nsfrMin: 100, hqla: 356 },
    { name: 'Mitsubishi UFJ', ticker: 'MUFG', lcr: 127, lcrMin: 100, nsfr: 110, nsfrMin: 100, hqla: 445 },
    { name: 'ICBC', ticker: 'ICBC', lcr: 112, lcrMin: 100, nsfr: 106, nsfrMin: 100, hqla: 812 },
    { name: 'CCB', ticker: 'CCB', lcr: 115, lcrMin: 100, nsfr: 108, nsfrMin: 100, hqla: 758 },
    { name: 'Societe Generale', ticker: 'GLE', lcr: 128, lcrMin: 100, nsfr: 113, nsfrMin: 100, hqla: 265 },
  ],
  at1Bonds: [
    { issuer: 'JPMorgan', coupon: 6.125, yield: 6.45, spread: 312, callDate: '2028-04', price: 98.75, rating: 'BBB+', triggerLevel: 5.125 },
    { issuer: 'Bank of America', coupon: 6.500, yield: 6.82, spread: 348, callDate: '2027-09', price: 97.50, rating: 'BBB', triggerLevel: 5.125 },
    { issuer: 'Citigroup', coupon: 7.125, yield: 7.38, spread: 405, callDate: '2028-06', price: 96.80, rating: 'BBB', triggerLevel: 5.125 },
    { issuer: 'HSBC', coupon: 6.875, yield: 7.15, spread: 382, callDate: '2027-12', price: 97.20, rating: 'BBB', triggerLevel: 7.000 },
    { issuer: 'Deutsche Bank', coupon: 8.625, yield: 9.12, spread: 578, callDate: '2027-04', price: 93.40, rating: 'BB+', triggerLevel: 5.125 },
    { issuer: 'Barclays', coupon: 7.750, yield: 8.24, spread: 490, callDate: '2028-03', price: 95.60, rating: 'BB+', triggerLevel: 7.000 },
    { issuer: 'UBS', coupon: 7.000, yield: 7.28, spread: 394, callDate: '2028-08', price: 97.10, rating: 'BBB', triggerLevel: 7.000 },
    { issuer: 'BNP Paribas', coupon: 7.375, yield: 7.85, spread: 451, callDate: '2027-11', price: 96.10, rating: 'BBB-', triggerLevel: 5.125 },
    { issuer: 'Credit Agricole', coupon: 7.875, yield: 8.42, spread: 508, callDate: '2028-01', price: 95.20, rating: 'BBB-', triggerLevel: 5.125 },
    { issuer: 'Goldman Sachs', coupon: 6.250, yield: 6.58, spread: 325, callDate: '2029-02', price: 98.40, rating: 'BBB+', triggerLevel: 5.125 },
    { issuer: 'Societe Generale', coupon: 8.250, yield: 8.92, spread: 558, callDate: '2027-06', price: 94.10, rating: 'BB+', triggerLevel: 5.125 },
    { issuer: 'Santander', coupon: 9.625, yield: 10.45, spread: 712, callDate: '2027-03', price: 91.80, rating: 'BB', triggerLevel: 5.125 },
    { issuer: 'UniCredit', coupon: 10.250, yield: 11.38, spread: 804, callDate: '2027-07', price: 89.50, rating: 'BB', triggerLevel: 5.875 },
    { issuer: 'Standard Chartered', coupon: 7.500, yield: 7.95, spread: 462, callDate: '2028-05', price: 96.30, rating: 'BBB-', triggerLevel: 7.000 },
  ],
};

// ── Color helpers ──

function ratioColor(value: number, min: number): string {
  const buffer = value - min;
  if (buffer >= 3.0) return 'text-green-400';
  if (buffer >= 1.5) return 'text-green-400/80';
  if (buffer >= 0.5) return 'text-amber-400';
  if (buffer >= 0) return 'text-amber-400';
  return 'text-red-400';
}

function ratioBgColor(value: number, min: number): string {
  const buffer = value - min;
  if (buffer >= 3.0) return '';
  if (buffer >= 1.5) return '';
  if (buffer >= 0.5) return 'bg-amber-400/[0.03]';
  if (buffer >= 0) return 'bg-amber-400/[0.05]';
  return 'bg-red-400/[0.05]';
}

function stressColor(result: string): string {
  if (result === 'pass') return 'text-green-400';
  if (result === 'conditional') return 'text-amber-400';
  return 'text-red-400';
}

function stressBg(result: string): string {
  if (result === 'pass') return 'bg-green-500/10 border-green-500/30';
  if (result === 'conditional') return 'bg-amber-500/10 border-amber-500/30';
  return 'bg-red-500/10 border-red-500/30';
}

function spreadColor(spread: number): string {
  if (spread <= 350) return 'text-green-400';
  if (spread <= 500) return 'text-amber-400';
  return 'text-red-400';
}

function systemicRiskStyle(risk: string): { text: string; color: string; bg: string } {
  switch (risk) {
    case 'low': return { text: 'LOW RISK', color: 'text-green-400', bg: 'bg-green-500/10 border border-green-500/30' };
    case 'moderate': return { text: 'MODERATE', color: 'text-amber-400', bg: 'bg-amber-500/10 border border-amber-500/30' };
    case 'elevated': return { text: 'ELEVATED', color: 'text-orange-400', bg: 'bg-orange-500/10 border border-orange-500/30' };
    case 'high': return { text: 'HIGH RISK', color: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/30' };
    default: return { text: 'UNKNOWN', color: 'text-neutral-400', bg: 'bg-neutral-500/10 border border-neutral-500/30' };
  }
}

// ── Formatting ──

function fmtPct(n: number): string {
  return n.toFixed(1) + '%';
}

function fmtBps(n: number): string {
  return n.toFixed(0) + 'bp';
}

function fmtBn(n: number): string {
  return '$' + n.toFixed(0) + 'B';
}

// ── Section: G-SIB Capital Ratios ──

function GSIBSection({ banks, t }: { banks: GSIBBank[]; t: ReturnType<typeof useT> }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'bcGSIBCapital', 'G-SIB Capital Ratios')}
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_40px_32px_60px_60px_60px_50px] gap-px px-2 py-0.5 border-b border-border/10 text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
        <span>Bank</span>
        <span className="text-center">Ctry</span>
        <span className="text-center">Bkt</span>
        <span className="text-right">CET1</span>
        <span className="text-right">Tier 1</span>
        <span className="text-right">Total</span>
        <span className="text-right">Lev</span>
      </div>

      {banks.map((bank) => (
        <div
          key={bank.ticker}
          className={`grid grid-cols-[1fr_40px_32px_60px_60px_60px_50px] gap-px px-2 py-0.5 border-b border-border/[0.06] hover:bg-blue-400/[0.02] transition-colors ${ratioBgColor(bank.cet1, bank.cet1Min)}`}
        >
          <div className="flex items-center gap-1 overflow-hidden">
            <span className="text-[8px] font-mono font-bold text-white truncate">{bank.name}</span>
            <span className="text-[7px] font-mono text-neutral-600 shrink-0">{bank.ticker}</span>
          </div>
          <span className="text-[7px] font-mono text-neutral-500 text-center">{bank.country}</span>
          <span className="text-[7px] font-mono text-blue-400 text-center font-bold">{bank.bucket}</span>
          <div className="text-right">
            <span className={`text-[8px] font-mono font-bold ${ratioColor(bank.cet1, bank.cet1Min)}`}>
              {fmtPct(bank.cet1)}
            </span>
            <span className="text-[6px] font-mono text-neutral-700 ml-0.5">/{fmtPct(bank.cet1Min)}</span>
          </div>
          <div className="text-right">
            <span className={`text-[8px] font-mono font-bold ${ratioColor(bank.tier1, bank.tier1Min)}`}>
              {fmtPct(bank.tier1)}
            </span>
          </div>
          <div className="text-right">
            <span className={`text-[8px] font-mono font-bold ${ratioColor(bank.totalCapital, bank.totalCapitalMin)}`}>
              {fmtPct(bank.totalCapital)}
            </span>
          </div>
          <div className="text-right">
            <span className={`text-[8px] font-mono font-bold ${ratioColor(bank.leverage, bank.leverageMin)}`}>
              {fmtPct(bank.leverage)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Section: Stress Test Results ──

function StressTestSection({ tests, t }: { tests: StressTestResult[]; t: ReturnType<typeof useT> }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'bcStressTests', 'Stress Test Results')}
        </span>
        <span className="text-[7px] font-mono text-neutral-700 ml-2">DFAST / EBA Adverse Scenario</span>
      </div>

      <div className="grid grid-cols-[1fr_55px_55px_55px_55px_55px] gap-px px-2 py-0.5 border-b border-border/10 text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
        <span>Bank</span>
        <span className="text-right">Pre-Stress</span>
        <span className="text-right">Post-Stress</span>
        <span className="text-right">Min Req</span>
        <span className="text-right">Losses</span>
        <span className="text-center">Result</span>
      </div>

      {tests.map((test) => (
        <div
          key={test.ticker}
          className="grid grid-cols-[1fr_55px_55px_55px_55px_55px] gap-px px-2 py-0.5 border-b border-border/[0.06] hover:bg-blue-400/[0.02] transition-colors"
        >
          <div className="flex items-center gap-1 overflow-hidden">
            <span className="text-[8px] font-mono font-bold text-white truncate">{test.name}</span>
          </div>
          <span className="text-[8px] font-mono text-white text-right">{fmtPct(test.cet1Pre)}</span>
          <span className={`text-[8px] font-mono font-bold text-right ${ratioColor(test.cet1Post, test.cet1Min)}`}>
            {fmtPct(test.cet1Post)}
          </span>
          <span className="text-[8px] font-mono text-neutral-600 text-right">{fmtPct(test.cet1Min)}</span>
          <span className="text-[8px] font-mono text-red-400/70 text-right">${test.losses}B</span>
          <div className="flex justify-center">
            <span className={`text-[7px] font-mono font-black uppercase px-1 py-px border ${stressBg(test.result)} ${stressColor(test.result)}`}>
              {test.result === 'conditional' ? 'COND' : test.result.toUpperCase()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Section: TLAC / MREL ──

function TLACSection({ entries, t }: { entries: TLACEntry[]; t: ReturnType<typeof useT> }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'bcTLACMREL', 'TLAC / MREL')}
        </span>
        <span className="text-[7px] font-mono text-neutral-700 ml-2">Total Loss-Absorbing Capacity</span>
      </div>

      <div className="grid grid-cols-[1fr_60px_60px_60px] gap-px px-2 py-0.5 border-b border-border/10 text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
        <span>Bank</span>
        <span className="text-right">TLAC</span>
        <span className="text-right">MREL</span>
        <span className="text-right">Subord</span>
      </div>

      {entries.map((entry) => (
        <div
          key={entry.ticker}
          className="grid grid-cols-[1fr_60px_60px_60px] gap-px px-2 py-0.5 border-b border-border/[0.06] hover:bg-blue-400/[0.02] transition-colors"
        >
          <div className="flex items-center gap-1 overflow-hidden">
            <span className="text-[8px] font-mono font-bold text-white truncate">{entry.name}</span>
          </div>
          <div className="text-right">
            <span className={`text-[8px] font-mono font-bold ${ratioColor(entry.tlacRatio, entry.tlacMin)}`}>
              {fmtPct(entry.tlacRatio)}
            </span>
            <span className="text-[6px] font-mono text-neutral-700 ml-0.5">/{fmtPct(entry.tlacMin)}</span>
          </div>
          <div className="text-right">
            <span className={`text-[8px] font-mono font-bold ${ratioColor(entry.mrelRatio, entry.mrelMin)}`}>
              {fmtPct(entry.mrelRatio)}
            </span>
            <span className="text-[6px] font-mono text-neutral-700 ml-0.5">/{fmtPct(entry.mrelMin)}</span>
          </div>
          <span className="text-[8px] font-mono text-white text-right">{fmtPct(entry.subordination)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Section: Liquidity Ratios ──

function LiquiditySection({ entries, t }: { entries: LiquidityEntry[]; t: ReturnType<typeof useT> }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'bcLiquidity', 'Liquidity Ratios')}
        </span>
        <span className="text-[7px] font-mono text-neutral-700 ml-2">LCR / NSFR / HQLA</span>
      </div>

      <div className="grid grid-cols-[1fr_65px_65px_55px] gap-px px-2 py-0.5 border-b border-border/10 text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
        <span>Bank</span>
        <span className="text-right">LCR</span>
        <span className="text-right">NSFR</span>
        <span className="text-right">HQLA</span>
      </div>

      {entries.map((entry) => {
        const lcrBuffer = entry.lcr - entry.lcrMin;
        const nsfrBuffer = entry.nsfr - entry.nsfrMin;
        const lcrColor = lcrBuffer >= 30 ? 'text-green-400' : lcrBuffer >= 15 ? 'text-green-400/80' : lcrBuffer >= 5 ? 'text-amber-400' : 'text-red-400';
        const nsfrColor = nsfrBuffer >= 25 ? 'text-green-400' : nsfrBuffer >= 10 ? 'text-green-400/80' : nsfrBuffer >= 3 ? 'text-amber-400' : 'text-red-400';

        return (
          <div
            key={entry.ticker}
            className="grid grid-cols-[1fr_65px_65px_55px] gap-px px-2 py-0.5 border-b border-border/[0.06] hover:bg-blue-400/[0.02] transition-colors"
          >
            <div className="flex items-center gap-1 overflow-hidden">
              <span className="text-[8px] font-mono font-bold text-white truncate">{entry.name}</span>
              <span className="text-[7px] font-mono text-neutral-600 shrink-0">{entry.ticker}</span>
            </div>
            <div className="text-right">
              <span className={`text-[8px] font-mono font-bold ${lcrColor}`}>{entry.lcr}%</span>
              <span className="text-[6px] font-mono text-neutral-700 ml-0.5">/{entry.lcrMin}%</span>
            </div>
            <div className="text-right">
              <span className={`text-[8px] font-mono font-bold ${nsfrColor}`}>{entry.nsfr}%</span>
              <span className="text-[6px] font-mono text-neutral-700 ml-0.5">/{entry.nsfrMin}%</span>
            </div>
            <span className="text-[8px] font-mono text-white text-right">{fmtBn(entry.hqla)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Section: AT1/CoCo Bonds ──

function AT1Section({ bonds, t }: { bonds: AT1Bond[]; t: ReturnType<typeof useT> }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'bcAT1Bonds', 'AT1 / CoCo Bonds')}
        </span>
        <span className="text-[7px] font-mono text-neutral-700 ml-2">Additional Tier 1 Capital Instruments</span>
      </div>

      <div className="grid grid-cols-[1fr_42px_42px_42px_42px_42px_36px_36px] gap-px px-2 py-0.5 border-b border-border/10 text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
        <span>Issuer</span>
        <span className="text-right">Cpn</span>
        <span className="text-right">Yld</span>
        <span className="text-right">Sprd</span>
        <span className="text-right">Price</span>
        <span className="text-center">Call</span>
        <span className="text-center">Rtg</span>
        <span className="text-right">Trig</span>
      </div>

      {bonds.map((bond, idx) => (
        <div
          key={`${bond.issuer}-${idx}`}
          className="grid grid-cols-[1fr_42px_42px_42px_42px_42px_36px_36px] gap-px px-2 py-0.5 border-b border-border/[0.06] hover:bg-blue-400/[0.02] transition-colors"
        >
          <span className="text-[8px] font-mono font-bold text-white truncate">{bond.issuer}</span>
          <span className="text-[8px] font-mono text-white text-right">{bond.coupon.toFixed(2)}%</span>
          <span className="text-[8px] font-mono text-amber-400 font-bold text-right">{bond.yield.toFixed(2)}%</span>
          <span className={`text-[8px] font-mono font-bold text-right ${spreadColor(bond.spread)}`}>{fmtBps(bond.spread)}</span>
          <span className="text-[8px] font-mono text-white text-right">{bond.price.toFixed(2)}</span>
          <span className="text-[7px] font-mono text-neutral-500 text-center">{bond.callDate}</span>
          <span className="text-[7px] font-mono text-blue-400/70 text-center font-bold">{bond.rating}</span>
          <span className="text-[7px] font-mono text-red-400/60 text-right">{bond.triggerLevel.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
}

// ── Section: Summary ──

function SummarySection({ data, t }: { data: BankCapitalData; t: ReturnType<typeof useT> }) {
  const riskStyle = systemicRiskStyle(data.systemicRisk);
  const passCount = data.stressTests.filter((st) => st.result === 'pass').length;
  const totalTests = data.stressTests.length;
  const avgLCR = data.liquidity.length > 0
    ? data.liquidity.reduce((sum, l) => sum + l.lcr, 0) / data.liquidity.length
    : 0;
  const avgNSFR = data.liquidity.length > 0
    ? data.liquidity.reduce((sum, l) => sum + l.nsfr, 0) / data.liquidity.length
    : 0;
  const avgSpread = data.at1Bonds.length > 0
    ? data.at1Bonds.reduce((sum, b) => sum + b.spread, 0) / data.at1Bonds.length
    : 0;
  const weakestBank = [...data.gsibs].sort((a, b) => (a.cet1 - a.cet1Min) - (b.cet1 - b.cet1Min))[0];
  const strongestBank = [...data.gsibs].sort((a, b) => (b.cet1 - b.cet1Min) - (a.cet1 - a.cet1Min))[0];

  const metrics = [
    {
      label: tr(t, 'bcSystemicRisk', 'Systemic Risk'),
      value: riskStyle.text,
      color: riskStyle.color,
      detail: `Avg CET1: ${fmtPct(data.avgCET1)}`,
    },
    {
      label: tr(t, 'bcStressPass', 'Stress Test Pass Rate'),
      value: `${passCount}/${totalTests}`,
      color: passCount === totalTests ? 'text-green-400' : 'text-amber-400',
      detail: `${((passCount / totalTests) * 100).toFixed(0)}% passed`,
    },
    {
      label: tr(t, 'bcAvgLiquidity', 'Avg Liquidity'),
      value: `LCR ${avgLCR.toFixed(0)}%`,
      color: avgLCR >= 130 ? 'text-green-400' : avgLCR >= 110 ? 'text-amber-400' : 'text-red-400',
      detail: `NSFR ${avgNSFR.toFixed(0)}%`,
    },
    {
      label: tr(t, 'bcAT1Spread', 'Avg AT1 Spread'),
      value: fmtBps(avgSpread),
      color: spreadColor(avgSpread),
      detail: `${data.at1Bonds.length} instruments`,
    },
  ];

  return (
    <div className="px-3 py-2">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'bcSummary', 'Summary')}
        </span>
        <span className={`text-[7px] font-mono font-bold px-1 py-px ${riskStyle.bg} ${riskStyle.color} uppercase`}>
          {riskStyle.text}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {metrics.map((m) => (
          <div key={m.label}>
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">{m.label}</div>
            <div className={`text-[9px] font-mono font-bold ${m.color}`}>{m.value}</div>
            <div className="text-[7px] font-mono text-neutral-600">{m.detail}</div>
          </div>
        ))}
      </div>

      {/* Strongest / Weakest */}
      <div className="flex gap-4 mt-2 pt-1.5 border-t border-border/10">
        {strongestBank && (
          <div>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {tr(t, 'bcStrongest', 'Strongest')}
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[8px] font-mono font-bold text-green-400">{strongestBank.ticker}</span>
              <span className="text-[7px] font-mono text-neutral-500">
                CET1 {fmtPct(strongestBank.cet1)} (+{(strongestBank.cet1 - strongestBank.cet1Min).toFixed(1)}pp buffer)
              </span>
            </div>
          </div>
        )}
        {weakestBank && (
          <div>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {tr(t, 'bcWeakest', 'Weakest')}
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[8px] font-mono font-bold text-amber-400">{weakestBank.ticker}</span>
              <span className="text-[7px] font-mono text-neutral-500">
                CET1 {fmtPct(weakestBank.cet1)} (+{(weakestBank.cet1 - weakestBank.cet1Min).toFixed(1)}pp buffer)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Timestamp */}
      <div className="mt-2 pt-1 border-t border-border/10">
        <span className="text-[7px] font-mono text-neutral-700">
          {tr(t, 'bcLastUpdate', 'Last update')}: {new Date(data.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

// ── Main Panel ──

export function BankCapitalPanel() {
  const t = useT();
  const { data: rawData, isLoading, refetch } = useBankCapital();

  const data: BankCapitalData = (rawData as BankCapitalData) || FALLBACK_DATA;

  const riskStyle = systemicRiskStyle(data.systemicRisk);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-blue-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-blue-400">
            {tr(t, 'bcTitle', 'Bank Capital Monitor')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider ${riskStyle.color} ${riskStyle.bg}`}>
            {riskStyle.text}
          </span>
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-blue-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !rawData && (
          <div className="text-center py-8 text-amber-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!rawData && !isLoading && !data && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'bcNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            <GSIBSection banks={data.gsibs} t={t} />
            <StressTestSection tests={data.stressTests} t={t} />
            <TLACSection entries={data.tlac} t={t} />
            <LiquiditySection entries={data.liquidity} t={t} />
            <AT1Section bonds={data.at1Bonds} t={t} />
            <SummarySection data={data} t={t} />
          </>
        )}
      </div>
    </div>
  );
}
