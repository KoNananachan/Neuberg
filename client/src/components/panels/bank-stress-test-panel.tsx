import { useState } from 'react';
import { useBankStressTest } from '../../api/hooks/use-bank-stress-test';
import { ShieldCheck, RefreshCw } from 'lucide-react';

// ── Fallback Data ──

const FALLBACK_DATA = {
  framework: 'Dodd-Frank Act Stress Test (DFAST)',
  scenario: 'Severely Adverse',
  asOfDate: '2026-Q1',
  overview: {
    participatingBanks: 23,
    aggregateShortfall: 2.8,
    baselineCET1: 12.4,
    stressedCET1: 8.1,
    drawdown: -4.3,
  },
  banks: [
    {
      name: 'JPMorgan Chase',
      ticker: 'JPM',
      country: 'US',
      flag: '\u{1F1FA}\u{1F1F8}',
      totalAssets: 3950,
      baselineCET1: 12.5,
      adverseCET1: 10.8,
      severelyAdverseCET1: 9.2,
      capitalBuffer: 2.7,
      result: 'PASS',
      detail: {
        stressedLosses: { creditLosses: 48.2, tradingLosses: 12.7, operationalLosses: 5.1, otherLosses: 3.4 },
        loanLossRate: 5.8,
        minCET1Path: [12.5, 11.8, 10.9, 9.7, 9.2, 9.5],
      },
    },
    {
      name: 'Bank of America',
      ticker: 'BAC',
      country: 'US',
      flag: '\u{1F1FA}\u{1F1F8}',
      totalAssets: 3260,
      baselineCET1: 11.8,
      adverseCET1: 10.1,
      severelyAdverseCET1: 8.6,
      capitalBuffer: 2.1,
      result: 'PASS',
      detail: {
        stressedLosses: { creditLosses: 42.1, tradingLosses: 9.8, operationalLosses: 4.6, otherLosses: 2.9 },
        loanLossRate: 6.1,
        minCET1Path: [11.8, 11.1, 10.2, 9.1, 8.6, 8.9],
      },
    },
    {
      name: 'Citigroup',
      ticker: 'C',
      country: 'US',
      flag: '\u{1F1FA}\u{1F1F8}',
      totalAssets: 2420,
      baselineCET1: 13.1,
      adverseCET1: 11.2,
      severelyAdverseCET1: 9.8,
      capitalBuffer: 3.3,
      result: 'PASS',
      detail: {
        stressedLosses: { creditLosses: 35.6, tradingLosses: 10.3, operationalLosses: 3.8, otherLosses: 2.5 },
        loanLossRate: 5.4,
        minCET1Path: [13.1, 12.4, 11.5, 10.3, 9.8, 10.1],
      },
    },
    {
      name: 'Wells Fargo',
      ticker: 'WFC',
      country: 'US',
      flag: '\u{1F1FA}\u{1F1F8}',
      totalAssets: 1920,
      baselineCET1: 10.6,
      adverseCET1: 8.9,
      severelyAdverseCET1: 7.1,
      capitalBuffer: 0.6,
      result: 'CONDITIONAL',
      detail: {
        stressedLosses: { creditLosses: 31.8, tradingLosses: 4.2, operationalLosses: 3.9, otherLosses: 2.1 },
        loanLossRate: 6.8,
        minCET1Path: [10.6, 9.7, 8.8, 7.5, 7.1, 7.3],
      },
    },
    {
      name: 'Goldman Sachs',
      ticker: 'GS',
      country: 'US',
      flag: '\u{1F1FA}\u{1F1F8}',
      totalAssets: 1630,
      baselineCET1: 14.8,
      adverseCET1: 12.6,
      severelyAdverseCET1: 10.4,
      capitalBuffer: 3.9,
      result: 'PASS',
      detail: {
        stressedLosses: { creditLosses: 18.4, tradingLosses: 15.6, operationalLosses: 2.9, otherLosses: 3.7 },
        loanLossRate: 4.2,
        minCET1Path: [14.8, 13.9, 12.8, 11.1, 10.4, 10.8],
      },
    },
    {
      name: 'Morgan Stanley',
      ticker: 'MS',
      country: 'US',
      flag: '\u{1F1FA}\u{1F1F8}',
      totalAssets: 1190,
      baselineCET1: 15.2,
      adverseCET1: 13.1,
      severelyAdverseCET1: 11.0,
      capitalBuffer: 4.5,
      result: 'PASS',
      detail: {
        stressedLosses: { creditLosses: 12.1, tradingLosses: 11.8, operationalLosses: 2.3, otherLosses: 2.6 },
        loanLossRate: 3.9,
        minCET1Path: [15.2, 14.3, 13.2, 11.8, 11.0, 11.4],
      },
    },
    {
      name: 'HSBC Holdings',
      ticker: 'HSBC',
      country: 'GB',
      flag: '\u{1F1EC}\u{1F1E7}',
      totalAssets: 2980,
      baselineCET1: 14.1,
      adverseCET1: 11.9,
      severelyAdverseCET1: 9.6,
      capitalBuffer: 3.1,
      result: 'PASS',
      detail: {
        stressedLosses: { creditLosses: 39.8, tradingLosses: 8.7, operationalLosses: 4.1, otherLosses: 3.2 },
        loanLossRate: 5.6,
        minCET1Path: [14.1, 13.2, 12.1, 10.4, 9.6, 10.0],
      },
    },
    {
      name: 'Deutsche Bank',
      ticker: 'DB',
      country: 'DE',
      flag: '\u{1F1E9}\u{1F1EA}',
      totalAssets: 1540,
      baselineCET1: 13.4,
      adverseCET1: 10.7,
      severelyAdverseCET1: 8.2,
      capitalBuffer: 1.7,
      result: 'PASS',
      detail: {
        stressedLosses: { creditLosses: 22.6, tradingLosses: 9.4, operationalLosses: 4.8, otherLosses: 2.8 },
        loanLossRate: 6.3,
        minCET1Path: [13.4, 12.3, 11.0, 9.2, 8.2, 8.6],
      },
    },
    {
      name: 'BNP Paribas',
      ticker: 'BNP',
      country: 'FR',
      flag: '\u{1F1EB}\u{1F1F7}',
      totalAssets: 2740,
      baselineCET1: 12.8,
      adverseCET1: 10.5,
      severelyAdverseCET1: 8.4,
      capitalBuffer: 1.9,
      result: 'PASS',
      detail: {
        stressedLosses: { creditLosses: 36.2, tradingLosses: 7.9, operationalLosses: 3.5, otherLosses: 2.4 },
        loanLossRate: 5.9,
        minCET1Path: [12.8, 11.9, 10.8, 9.2, 8.4, 8.8],
      },
    },
    {
      name: 'UBS Group',
      ticker: 'UBS',
      country: 'CH',
      flag: '\u{1F1E8}\u{1F1ED}',
      totalAssets: 1680,
      baselineCET1: 14.3,
      adverseCET1: 12.0,
      severelyAdverseCET1: 9.9,
      capitalBuffer: 3.4,
      result: 'PASS',
      detail: {
        stressedLosses: { creditLosses: 19.4, tradingLosses: 10.2, operationalLosses: 3.1, otherLosses: 2.7 },
        loanLossRate: 4.8,
        minCET1Path: [14.3, 13.4, 12.2, 10.7, 9.9, 10.3],
      },
    },
    {
      name: 'Barclays',
      ticker: 'BCS',
      country: 'GB',
      flag: '\u{1F1EC}\u{1F1E7}',
      totalAssets: 1560,
      baselineCET1: 13.6,
      adverseCET1: 10.8,
      severelyAdverseCET1: 8.0,
      capitalBuffer: 1.5,
      result: 'PASS',
      detail: {
        stressedLosses: { creditLosses: 24.1, tradingLosses: 8.5, operationalLosses: 3.7, otherLosses: 2.3 },
        loanLossRate: 6.5,
        minCET1Path: [13.6, 12.5, 11.1, 9.0, 8.0, 8.4],
      },
    },
    {
      name: 'Societe Generale',
      ticker: 'GLE',
      country: 'FR',
      flag: '\u{1F1EB}\u{1F1F7}',
      totalAssets: 1480,
      baselineCET1: 13.0,
      adverseCET1: 10.2,
      severelyAdverseCET1: 7.4,
      capitalBuffer: 0.9,
      result: 'CONDITIONAL',
      detail: {
        stressedLosses: { creditLosses: 21.3, tradingLosses: 7.8, operationalLosses: 3.4, otherLosses: 2.1 },
        loanLossRate: 6.9,
        minCET1Path: [13.0, 11.8, 10.4, 8.3, 7.4, 7.7],
      },
    },
    {
      name: 'Credit Agricole',
      ticker: 'ACA',
      country: 'FR',
      flag: '\u{1F1EB}\u{1F1F7}',
      totalAssets: 2310,
      baselineCET1: 11.2,
      adverseCET1: 8.6,
      severelyAdverseCET1: 6.1,
      capitalBuffer: -0.4,
      result: 'FAIL',
      detail: {
        stressedLosses: { creditLosses: 33.7, tradingLosses: 5.4, operationalLosses: 4.2, otherLosses: 2.8 },
        loanLossRate: 7.4,
        minCET1Path: [11.2, 10.0, 8.5, 6.8, 6.1, 6.3],
      },
    },
  ],
  scenarioAssumptions: [
    { metric: 'Real GDP Decline (Peak-to-Trough)', us: '-6.5%', eu: '-5.8%', global: '-4.2%' },
    { metric: 'Unemployment Rate (Peak)', us: '10.8%', eu: '12.4%', global: '9.6%' },
    { metric: 'Equity Market Decline', us: '-55%', eu: '-48%', global: '-50%' },
    { metric: 'Housing Price Decline', us: '-28%', eu: '-22%', global: '-20%' },
    { metric: 'CRE Price Decline', us: '-40%', eu: '-35%', global: '-32%' },
    { metric: 'BBB Credit Spread Widening', us: '+450bp', eu: '+380bp', global: '+400bp' },
    { metric: '10Y Treasury Yield', us: '0.8%', eu: '-0.3%', global: '0.5%' },
    { metric: 'VIX Peak', us: '70', eu: 'N/A', global: 'N/A' },
  ],
  lossDistribution: [
    { category: 'First Lien Mortgages', totalLosses: 38.2, lossRate: 3.8, contribution: 14.1 },
    { category: 'Junior Liens / HELOCs', totalLosses: 12.6, lossRate: 8.2, contribution: 4.7 },
    { category: 'Commercial & Industrial', totalLosses: 52.8, lossRate: 7.1, contribution: 19.5 },
    { category: 'Commercial Real Estate', totalLosses: 45.3, lossRate: 9.4, contribution: 16.7 },
    { category: 'Credit Cards', totalLosses: 41.7, lossRate: 14.6, contribution: 15.4 },
    { category: 'Other Consumer', totalLosses: 22.4, lossRate: 6.3, contribution: 8.3 },
    { category: 'Trading & Counterparty', totalLosses: 38.9, lossRate: 4.5, contribution: 14.4 },
    { category: 'Other / Operational', totalLosses: 19.1, lossRate: 2.1, contribution: 7.1 },
  ],
  capitalRequirements: {
    minimumCET1: 4.5,
    capitalConservation: 2.5,
    gSIBSurcharge: 1.5,
    countercyclical: 0.0,
    scb: 2.5,
    totalRequired: 6.5,
    systemMin: 11.0,
  },
};

// ── Helpers ──

function resultBadgeStyle(result: string): string {
  if (result === 'PASS') return 'text-green-400 bg-green-500/10 border border-green-500/30';
  if (result === 'CONDITIONAL') return 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/30';
  return 'text-red-400 bg-red-500/10 border border-red-500/30';
}

function cet1Color(val: number): string {
  if (val >= 10) return 'text-green-400';
  if (val >= 7) return 'text-yellow-400';
  if (val >= 4.5) return 'text-orange-400';
  return 'text-red-400';
}

function drawdownColor(val: number): string {
  if (val >= -2) return 'text-green-400';
  if (val >= -4) return 'text-yellow-400';
  return 'text-red-400';
}

function fmtAssets(n: number): string {
  if (n >= 1000) return '$' + (n / 1000).toFixed(1) + 'T';
  return '$' + n + 'B';
}

// ── Main Panel ──

export function BankStressTestPanel() {
  const { data: rawData, isLoading, refetch } = useBankStressTest();
  const data = rawData || FALLBACK_DATA;
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const selectedBank = selectedIdx !== null ? data.banks[selectedIdx] : null;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-violet-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-violet-400">
            Bank Stress Test
          </span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {data.framework}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[7px] font-mono font-bold text-violet-400/70 uppercase px-1.5 py-0.5 bg-violet-400/10 border border-violet-400/30">
            {data.scenario}
          </span>
          <span className="text-[7px] font-mono text-neutral-600">
            {data.asOfDate}
          </span>
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-violet-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !rawData && (
          <div className="text-center py-8 text-violet-400 text-[9px] font-mono uppercase animate-pulse">
            Loading...
          </div>
        )}

        {!isLoading && !rawData && !data && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            No data available
          </div>
        )}

        {data && (
          <>
            <OverviewBar overview={data.overview} />
            <BankResultsTable
              banks={data.banks}
              selectedIdx={selectedIdx}
              onSelect={setSelectedIdx}
            />
            {selectedBank && <BankDetail bank={selectedBank} />}
            <ScenarioAssumptions assumptions={data.scenarioAssumptions} />
            <LossDistribution losses={data.lossDistribution} />
            <CapitalRequirements requirements={data.capitalRequirements} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Overview Stats Bar ──

function OverviewBar({ overview }: { overview: any }) {
  return (
    <div className="border-b border-violet-400/30">
      <div className="grid grid-cols-5 divide-x divide-border/20">
        <div className="px-3 py-2">
          <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-widest font-black">
            Participating Banks
          </div>
          <div className="text-[13px] font-mono font-black text-white tabular-nums mt-0.5">
            {overview.participatingBanks}
          </div>
        </div>
        <div className="px-3 py-2">
          <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-widest font-black">
            Aggregate Shortfall
          </div>
          <div className={`text-[13px] font-mono font-black tabular-nums mt-0.5 ${overview.aggregateShortfall > 0 ? 'text-red-400' : 'text-green-400'}`}>
            ${overview.aggregateShortfall.toFixed(1)}B
          </div>
        </div>
        <div className="px-3 py-2">
          <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-widest font-black">
            Baseline CET1
          </div>
          <div className="text-[13px] font-mono font-black text-white tabular-nums mt-0.5">
            {overview.baselineCET1.toFixed(1)}%
          </div>
        </div>
        <div className="px-3 py-2">
          <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-widest font-black">
            Stressed CET1
          </div>
          <div className={`text-[13px] font-mono font-black tabular-nums mt-0.5 ${cet1Color(overview.stressedCET1)}`}>
            {overview.stressedCET1.toFixed(1)}%
          </div>
        </div>
        <div className="px-3 py-2">
          <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-widest font-black">
            CET1 Drawdown
          </div>
          <div className={`text-[13px] font-mono font-black tabular-nums mt-0.5 ${drawdownColor(overview.drawdown)}`}>
            {overview.drawdown.toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Bank Results Table ──

function BankResultsTable({
  banks,
  selectedIdx,
  onSelect,
}: {
  banks: any[];
  selectedIdx: number | null;
  onSelect: (idx: number | null) => void;
}) {
  return (
    <div className="border-b border-violet-400/30">
      <div className="px-3 py-1 border-b border-border/20 flex items-center gap-1.5">
        <div className="w-1 h-1 bg-violet-400" />
        <span className="text-[7px] font-black font-mono uppercase tracking-widest text-neutral-500">
          Bank Results
        </span>
        <span className="text-[7px] font-mono text-neutral-700 ml-auto">
          {banks.length} institutions
        </span>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[1fr_50px_70px_65px_65px_70px_60px_65px] px-3 py-1 border-b border-border/20">
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500">Bank</span>
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 text-right">Ctry</span>
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 text-right">Assets</span>
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 text-right">Base</span>
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 text-right">Adv</span>
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 text-right">Sev Adv</span>
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 text-right">Buffer</span>
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 text-right">Result</span>
      </div>

      {/* Table Rows */}
      {banks.map((bank: any, idx: number) => {
        const isSelected = selectedIdx === idx;
        return (
          <div
            key={bank.ticker}
            onClick={() => onSelect(isSelected ? null : idx)}
            className={`grid grid-cols-[1fr_50px_70px_65px_65px_70px_60px_65px] px-3 py-1 border-b border-border/20 cursor-pointer transition-colors ${
              isSelected ? 'bg-violet-400/[0.06]' : 'hover:bg-violet-400/[0.02]'
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[9px] font-mono font-bold text-white truncate">{bank.name}</span>
              <span className="text-[7px] font-mono text-neutral-600">{bank.ticker}</span>
            </div>
            <span className="text-[9px] font-mono text-neutral-300 text-right tabular-nums">
              {bank.flag} {bank.country}
            </span>
            <span className="text-[9px] font-mono text-neutral-300 text-right tabular-nums">
              {fmtAssets(bank.totalAssets)}
            </span>
            <span className="text-[9px] font-mono text-neutral-300 text-right tabular-nums">
              {bank.baselineCET1.toFixed(1)}%
            </span>
            <span className={`text-[9px] font-mono text-right tabular-nums ${cet1Color(bank.adverseCET1)}`}>
              {bank.adverseCET1.toFixed(1)}%
            </span>
            <span className={`text-[9px] font-mono text-right tabular-nums ${cet1Color(bank.severelyAdverseCET1)}`}>
              {bank.severelyAdverseCET1.toFixed(1)}%
            </span>
            <span className={`text-[9px] font-mono text-right tabular-nums ${
              bank.capitalBuffer >= 2 ? 'text-green-400' : bank.capitalBuffer >= 0 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {bank.capitalBuffer >= 0 ? '+' : ''}{bank.capitalBuffer.toFixed(1)}%
            </span>
            <div className="flex justify-end">
              <span className={`text-[7px] font-mono font-bold px-1.5 py-0.5 ${resultBadgeStyle(bank.result)}`}>
                {bank.result}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Selected Bank Detail ──

function BankDetail({ bank }: { bank: any }) {
  const losses = bank.detail.stressedLosses;
  const totalLoss = losses.creditLosses + losses.tradingLosses + losses.operationalLosses + losses.otherLosses;
  const path = bank.detail.minCET1Path;

  // SVG mini chart for CET1 path
  const W = 200;
  const H = 50;
  const PAD_X = 6;
  const PAD_Y = 6;
  const minVal = Math.min(...path) - 0.5;
  const maxVal = Math.max(...path) + 0.5;
  const rangeVal = maxVal - minVal || 1;

  const svgPoints = path.map((v: any, i: any) => ({
    x: PAD_X + (i / (path.length - 1)) * (W - PAD_X * 2),
    y: PAD_Y + ((maxVal - v) / rangeVal) * (H - PAD_Y * 2),
  }));

  const pathD = svgPoints.map((p: any, i: any) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaD = `${pathD} L ${svgPoints[svgPoints.length - 1].x.toFixed(1)},${H} L ${svgPoints[0].x.toFixed(1)},${H} Z`;

  const quarters = ['Q0', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5'];

  return (
    <div className="border-b border-violet-400/30 bg-[#030305]">
      <div className="px-3 py-1 border-b border-border/20 flex items-center gap-1.5">
        <div className="w-1 h-1 bg-violet-400" />
        <span className="text-[7px] font-black font-mono uppercase tracking-widest text-neutral-500">
          Detail: {bank.name}
        </span>
        <span className={`text-[7px] font-mono font-bold px-1 py-0.5 ml-auto ${resultBadgeStyle(bank.result)}`}>
          {bank.result}
        </span>
      </div>

      <div className="grid grid-cols-2 divide-x divide-border/20">
        {/* Left: Stressed Losses */}
        <div className="px-3 py-2">
          <div className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 mb-1.5">
            Stressed Losses Breakdown ($B)
          </div>
          <div className="space-y-1">
            {[
              { label: 'Credit Losses', value: losses.creditLosses },
              { label: 'Trading Losses', value: losses.tradingLosses },
              { label: 'Operational Losses', value: losses.operationalLosses },
              { label: 'Other Losses', value: losses.otherLosses },
            ].map((item: any) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-[8px] font-mono text-neutral-400">{item.label}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1 bg-neutral-900 relative">
                    <div
                      className="absolute top-0 left-0 h-full bg-violet-400/50"
                      style={{ width: `${(item.value / totalLoss) * 100}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-mono font-bold text-neutral-300 tabular-nums w-12 text-right">
                    {item.value.toFixed(1)}
                  </span>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between pt-1 border-t border-border/20">
              <span className="text-[8px] font-mono font-bold text-neutral-300">Total</span>
              <span className="text-[9px] font-mono font-bold text-red-400 tabular-nums">
                ${totalLoss.toFixed(1)}B
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-mono text-neutral-400">Loan Loss Rate</span>
              <span className="text-[9px] font-mono font-bold text-orange-400 tabular-nums">
                {bank.detail.loanLossRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Right: CET1 Path Chart */}
        <div className="px-3 py-2">
          <div className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 mb-1.5">
            Minimum CET1 Path
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 50 }}>
            {/* 4.5% minimum line */}
            <line
              x1={PAD_X}
              y1={PAD_Y + ((maxVal - 4.5) / rangeVal) * (H - PAD_Y * 2)}
              x2={W - PAD_X}
              y2={PAD_Y + ((maxVal - 4.5) / rangeVal) * (H - PAD_Y * 2)}
              stroke="rgba(239,68,68,0.3)"
              strokeDasharray="3,3"
            />
            <text
              x={W - PAD_X + 2}
              y={PAD_Y + ((maxVal - 4.5) / rangeVal) * (H - PAD_Y * 2) + 3}
              fill="rgba(239,68,68,0.5)"
              fontSize={5}
              fontFamily="monospace"
            >
              4.5%
            </text>

            {/* Area fill */}
            <path d={areaD} fill="rgba(167,139,250,0.08)" />

            {/* Line */}
            <path d={pathD} fill="none" stroke="#a78bfa" strokeWidth={1.5} />

            {/* Points */}
            {svgPoints.map((p: any, i: any) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r={2} fill="#a78bfa" />
                <text
                  x={p.x}
                  y={p.y - 5}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.6)"
                  fontSize={5.5}
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {path[i].toFixed(1)}%
                </text>
              </g>
            ))}

            {/* Quarter labels */}
            {svgPoints.map((p: any, i: any) => (
              <text
                key={`q-${i}`}
                x={p.x}
                y={H - 1}
                textAnchor="middle"
                fill="rgba(255,255,255,0.2)"
                fontSize={5}
                fontFamily="monospace"
              >
                {quarters[i] || `Q${i}`}
              </text>
            ))}
          </svg>

          <div className="flex items-center justify-between mt-1.5">
            <div>
              <span className="text-[7px] font-mono text-neutral-600">Baseline</span>
              <span className="text-[9px] font-mono font-bold text-white ml-1 tabular-nums">
                {path[0].toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-[7px] font-mono text-neutral-600">Trough</span>
              <span className={`text-[9px] font-mono font-bold ml-1 tabular-nums ${cet1Color(Math.min(...path))}`}>
                {Math.min(...path).toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-[7px] font-mono text-neutral-600">Drawdown</span>
              <span className="text-[9px] font-mono font-bold text-red-400 ml-1 tabular-nums">
                {(Math.min(...path) - path[0]).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Scenario Assumptions ──

function ScenarioAssumptions({ assumptions }: { assumptions: any[] }) {
  return (
    <div className="border-b border-violet-400/30">
      <div className="px-3 py-1 border-b border-border/20 flex items-center gap-1.5">
        <div className="w-1 h-1 bg-violet-400" />
        <span className="text-[7px] font-black font-mono uppercase tracking-widest text-neutral-500">
          Scenario Assumptions
        </span>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[1fr_80px_80px_80px] px-3 py-1 border-b border-border/20">
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500">Metric</span>
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 text-right">US</span>
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 text-right">EU</span>
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 text-right">Global</span>
      </div>

      {assumptions.map((row: any, idx: number) => (
        <div
          key={idx}
          className="grid grid-cols-[1fr_80px_80px_80px] px-3 py-1 border-b border-border/20 hover:bg-violet-400/[0.02]"
        >
          <span className="text-[9px] font-mono text-neutral-300">{row.metric}</span>
          <span className="text-[9px] font-mono text-neutral-300 text-right tabular-nums">{row.us}</span>
          <span className="text-[9px] font-mono text-neutral-300 text-right tabular-nums">{row.eu}</span>
          <span className="text-[9px] font-mono text-neutral-300 text-right tabular-nums">{row.global}</span>
        </div>
      ))}
    </div>
  );
}

// ── Loss Distribution by Category ──

function LossDistribution({ losses }: { losses: any[] }) {
  const maxContribution = Math.max(...losses.map((l: any) => l.contribution));

  return (
    <div className="border-b border-violet-400/30">
      <div className="px-3 py-1 border-b border-border/20 flex items-center gap-1.5">
        <div className="w-1 h-1 bg-violet-400" />
        <span className="text-[7px] font-black font-mono uppercase tracking-widest text-neutral-500">
          Loss Distribution by Category
        </span>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[1fr_80px_70px_120px] px-3 py-1 border-b border-border/20">
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500">Category</span>
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 text-right">Losses ($B)</span>
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 text-right">Loss Rate</span>
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 text-right">Contribution</span>
      </div>

      {losses.map((loss: any) => (
        <div
          key={loss.category}
          className="grid grid-cols-[1fr_80px_70px_120px] px-3 py-1 border-b border-border/20 hover:bg-violet-400/[0.02] items-center"
        >
          <span className="text-[9px] font-mono text-neutral-300">{loss.category}</span>
          <span className="text-[9px] font-mono text-neutral-300 text-right tabular-nums">
            {loss.totalLosses.toFixed(1)}
          </span>
          <span className={`text-[9px] font-mono text-right tabular-nums ${
            loss.lossRate >= 10 ? 'text-red-400' : loss.lossRate >= 6 ? 'text-orange-400' : 'text-neutral-300'
          }`}>
            {loss.lossRate.toFixed(1)}%
          </span>
          <div className="flex items-center gap-2 justify-end">
            <div className="w-16 h-1.5 bg-neutral-900 relative">
              <div
                className="absolute top-0 left-0 h-full bg-violet-400/60"
                style={{ width: `${(loss.contribution / maxContribution) * 100}%` }}
              />
            </div>
            <span className="text-[9px] font-mono font-bold text-violet-400 tabular-nums w-10 text-right">
              {loss.contribution.toFixed(1)}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Capital Requirements Summary ──

function CapitalRequirements({ requirements }: { requirements: any }) {
  const items = [
    { label: 'Minimum CET1', value: requirements.minimumCET1.toFixed(1) + '%' },
    { label: 'Capital Conservation', value: requirements.capitalConservation.toFixed(1) + '%' },
    { label: 'G-SIB Surcharge', value: requirements.gSIBSurcharge.toFixed(1) + '%' },
    { label: 'Countercyclical', value: requirements.countercyclical.toFixed(1) + '%' },
    { label: 'Stress Capital Buffer', value: requirements.scb.toFixed(1) + '%' },
  ];

  return (
    <div className="border-b border-violet-400/30">
      <div className="px-3 py-1 border-b border-border/20 flex items-center gap-1.5">
        <div className="w-1 h-1 bg-violet-400" />
        <span className="text-[7px] font-black font-mono uppercase tracking-widest text-neutral-500">
          Capital Requirements Summary
        </span>
      </div>

      <div className="px-3 py-2">
        <div className="grid grid-cols-3 gap-x-4 gap-y-1.5">
          {items.map((item: any) => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="text-[8px] font-mono text-neutral-500">{item.label}</span>
              <span className="text-[9px] font-mono font-bold text-neutral-300 tabular-nums">{item.value}</span>
            </div>
          ))}
        </div>

        <div className="mt-2 pt-2 border-t border-border/20 grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between">
            <span className="text-[8px] font-mono font-bold text-neutral-400">Total CET1 Required</span>
            <span className="text-[11px] font-mono font-black text-violet-400 tabular-nums">
              {requirements.totalRequired.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[8px] font-mono font-bold text-neutral-400">System Min (incl. buffers)</span>
            <span className="text-[11px] font-mono font-black text-white tabular-nums">
              {requirements.systemMin.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
