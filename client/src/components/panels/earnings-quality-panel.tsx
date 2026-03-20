import { useState, useMemo } from 'react';
import {
  useEarningsQuality,
  type EarningsQualityStock,
  type PiotroskiFComponents,
  type BeneishMComponents,
  type AltmanZComponents,
} from '../../api/hooks/use-earnings-quality';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw, Shield } from 'lucide-react';

// ── Types ──

type ViewMode = 'SCORES' | 'DETAIL' | 'RANKING';
type RankSortKey =
  | 'ticker' | 'overallGrade' | 'altmanZ' | 'beneishM' | 'piotroskiF'
  | 'accrualRatio' | 'earningsPersistence' | 'cashFlowToIncome' | 'revenueQuality';

// ── Color helpers ──

function gradeColor(grade: string): string {
  switch (grade) {
    case 'A': return 'text-green-400';
    case 'B': return 'text-emerald-400';
    case 'C': return 'text-yellow-400';
    case 'D': return 'text-orange-400';
    case 'F': return 'text-red-400';
    default: return 'text-neutral-400';
  }
}

function gradeBgColor(grade: string): string {
  switch (grade) {
    case 'A': return 'bg-green-400/10 border-green-400/30';
    case 'B': return 'bg-emerald-400/10 border-emerald-400/30';
    case 'C': return 'bg-yellow-400/10 border-yellow-400/30';
    case 'D': return 'bg-orange-400/10 border-orange-400/30';
    case 'F': return 'bg-red-400/10 border-red-400/30';
    default: return 'bg-neutral-400/10 border-neutral-400/30';
  }
}

function zoneColor(zone: string): string {
  switch (zone) {
    case 'Safe': return 'text-green-400';
    case 'Grey': return 'text-yellow-400';
    case 'Distress': return 'text-red-400';
    default: return 'text-neutral-400';
  }
}

function zoneBgColor(zone: string): string {
  switch (zone) {
    case 'Safe': return 'bg-green-400/10';
    case 'Grey': return 'bg-yellow-400/10';
    case 'Distress': return 'bg-red-400/10';
    default: return 'bg-neutral-400/10';
  }
}

function manipColor(manip: string): string {
  switch (manip) {
    case 'Unlikely': return 'text-green-400';
    case 'Possible': return 'text-yellow-400';
    case 'Likely': return 'text-red-400';
    default: return 'text-neutral-400';
  }
}

function manipBgColor(manip: string): string {
  switch (manip) {
    case 'Unlikely': return 'bg-green-400/10';
    case 'Possible': return 'bg-yellow-400/10';
    case 'Likely': return 'bg-red-400/10';
    default: return 'bg-neutral-400/10';
  }
}

function fGradeColor(grade: string): string {
  switch (grade) {
    case 'Strong': return 'text-green-400';
    case 'Moderate': return 'text-yellow-400';
    case 'Weak': return 'text-red-400';
    default: return 'text-neutral-400';
  }
}

function heatmapColor(value: number, min: number, max: number, invert = false): string {
  if (max === min) return 'text-neutral-400';
  let norm = (value - min) / (max - min);
  if (invert) norm = 1 - norm;
  if (norm >= 0.8) return 'text-green-400';
  if (norm >= 0.6) return 'text-emerald-400';
  if (norm >= 0.4) return 'text-yellow-400';
  if (norm >= 0.2) return 'text-orange-400';
  return 'text-red-400';
}

function heatmapBg(value: number, min: number, max: number, invert = false): string {
  if (max === min) return '';
  let norm = (value - min) / (max - min);
  if (invert) norm = 1 - norm;
  if (norm >= 0.8) return 'bg-green-400/[0.06]';
  if (norm >= 0.6) return 'bg-emerald-400/[0.04]';
  if (norm >= 0.4) return 'bg-yellow-400/[0.04]';
  if (norm >= 0.2) return 'bg-orange-400/[0.04]';
  return 'bg-red-400/[0.06]';
}

function fmtMarketCap(n: number): string {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}T`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}B`;
  return `$${n.toFixed(0)}M`;
}

// ── Sorting helper ──

const GRADE_ORDER: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, F: 5 };

function sortStocks(stocks: EarningsQualityStock[], key: RankSortKey, asc: boolean): EarningsQualityStock[] {
  return [...stocks].sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case 'ticker': cmp = a.ticker.localeCompare(b.ticker); break;
      case 'overallGrade': cmp = (GRADE_ORDER[a.overallGrade] ?? 9) - (GRADE_ORDER[b.overallGrade] ?? 9); break;
      case 'altmanZ': cmp = a.altmanZ.score - b.altmanZ.score; break;
      case 'beneishM': cmp = a.beneishM.score - b.beneishM.score; break;
      case 'piotroskiF': cmp = a.piotroskiF.score - b.piotroskiF.score; break;
      case 'accrualRatio': cmp = a.accrualRatio - b.accrualRatio; break;
      case 'earningsPersistence': cmp = a.earningsPersistence - b.earningsPersistence; break;
      case 'cashFlowToIncome': cmp = a.cashFlowToIncome - b.cashFlowToIncome; break;
      case 'revenueQuality': cmp = a.revenueQuality - b.revenueQuality; break;
      default: cmp = 0;
    }
    return asc ? cmp : -cmp;
  });
}

// ── Sortable Table Header ──

function Th({
  label,
  sortKey,
  currentSort,
  currentAsc,
  onSort,
  align = 'left',
}: {
  label: string;
  sortKey: RankSortKey;
  currentSort: RankSortKey;
  currentAsc: boolean;
  onSort: (key: RankSortKey) => void;
  align?: 'left' | 'right' | 'center';
}) {
  const isActive = currentSort === sortKey;
  const alignCls = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  return (
    <th
      className={`px-1.5 py-1 text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 cursor-pointer hover:text-amber-400 select-none whitespace-nowrap ${alignCls}`}
      onClick={() => onSort(sortKey)}
    >
      {label}
      {isActive && (
        <span className="ml-0.5 text-amber-400">{currentAsc ? '\u25B2' : '\u25BC'}</span>
      )}
    </th>
  );
}

// ── Component Bar ──

function ComponentBar({ label, value, max, min = 0 }: { label: string; value: number; max: number; min?: number }) {
  const range = max - min || 1;
  const pct = Math.max(0, Math.min(100, ((value - min) / range) * 100));
  return (
    <div className="flex items-center gap-2">
      <span className="text-[7px] font-mono text-neutral-500 w-20 text-right uppercase shrink-0 truncate">
        {label}
      </span>
      <div className="flex-1 h-2 bg-neutral-900 relative">
        <div
          className="absolute top-0 left-0 h-full bg-amber-400/40"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[8px] font-mono font-bold text-amber-400 w-12 text-right shrink-0">
        {value.toFixed(3)}
      </span>
    </div>
  );
}

// ── Boolean Signal Indicator ──

function BoolSignal({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-[7px] font-mono text-neutral-500 uppercase">{label}</span>
      <span className={`text-[8px] font-mono font-bold ${value ? 'text-green-400' : 'text-red-400'}`}>
        {value ? 'PASS' : 'FAIL'}
      </span>
    </div>
  );
}

// ── SCORES View ──

function ScoresView({
  stocks,
  onSelectStock,
}: {
  stocks: EarningsQualityStock[];
  onSelectStock: (ticker: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-[#080808] z-10">
          <tr className="border-b border-border/20">
            <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
              Ticker
            </th>
            <th className="px-1.5 py-1 text-center text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
              Grade
            </th>
            <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
              Z-Score
            </th>
            <th className="px-1.5 py-1 text-center text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
              Zone
            </th>
            <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
              M-Score
            </th>
            <th className="px-1.5 py-1 text-center text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
              Manip.
            </th>
            <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
              F-Score
            </th>
            <th className="px-1.5 py-1 text-center text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
              F-Grade
            </th>
            <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
              Persist.
            </th>
            <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
              CF/Inc
            </th>
          </tr>
        </thead>
        <tbody>
          {stocks.map((s) => (
            <tr
              key={s.ticker}
              className="border-b border-border/10 hover:bg-amber-400/[0.02] transition-colors cursor-pointer"
              onClick={() => onSelectStock(s.ticker)}
            >
              <td className="px-1.5 py-1 whitespace-nowrap">
                <span className="text-white font-bold">{s.ticker}</span>
                <span className="text-[7px] text-neutral-600 ml-1">{s.sector}</span>
              </td>
              <td className="px-1.5 py-1 text-center">
                <span className={`text-[8px] font-bold px-1.5 py-0.5 border ${gradeColor(s.overallGrade)} ${gradeBgColor(s.overallGrade)}`}>
                  {s.overallGrade}
                </span>
              </td>
              <td className={`px-1.5 py-1 text-right font-bold ${zoneColor(s.altmanZ.zone)}`}>
                {s.altmanZ.score.toFixed(2)}
              </td>
              <td className="px-1.5 py-1 text-center">
                <span className={`text-[7px] font-bold px-1 py-0.5 ${zoneColor(s.altmanZ.zone)} ${zoneBgColor(s.altmanZ.zone)}`}>
                  {s.altmanZ.zone.toUpperCase()}
                </span>
              </td>
              <td className={`px-1.5 py-1 text-right font-bold ${manipColor(s.beneishM.manipulation)}`}>
                {s.beneishM.score.toFixed(2)}
              </td>
              <td className="px-1.5 py-1 text-center">
                <span className={`text-[7px] font-bold px-1 py-0.5 ${manipColor(s.beneishM.manipulation)} ${manipBgColor(s.beneishM.manipulation)}`}>
                  {s.beneishM.manipulation === 'Unlikely' ? 'CLEAN' : s.beneishM.manipulation === 'Possible' ? 'WATCH' : 'FLAG'}
                </span>
              </td>
              <td className={`px-1.5 py-1 text-right font-bold ${fGradeColor(s.piotroskiF.grade)}`}>
                {s.piotroskiF.score}/9
              </td>
              <td className="px-1.5 py-1 text-center">
                <span className={`text-[7px] font-bold ${fGradeColor(s.piotroskiF.grade)}`}>
                  {s.piotroskiF.grade.toUpperCase()}
                </span>
              </td>
              <td className="px-1.5 py-1 text-right text-neutral-400">
                {s.earningsPersistence.toFixed(2)}
              </td>
              <td className="px-1.5 py-1 text-right text-neutral-400">
                {s.cashFlowToIncome.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── DETAIL View ──

function DetailView({
  stocks,
  selectedTicker,
  onSelectTicker,
}: {
  stocks: EarningsQualityStock[];
  selectedTicker: string;
  onSelectTicker: (ticker: string) => void;
}) {
  const t = useT();
  const stock = stocks.find((s) => s.ticker === selectedTicker) ?? stocks[0];
  if (!stock) return null;

  const zComp = stock.altmanZ.components;
  const mComp = stock.beneishM.components;
  const fComp = stock.piotroskiF.components;

  const ALTMAN_LABELS: Record<keyof AltmanZComponents, string> = {
    workingCapital: 'Working Cap / TA',
    retainedEarnings: 'Retained Earn / TA',
    ebit: 'EBIT / TA',
    marketEquity: 'Mkt Equity / TL',
    sales: 'Sales / TA',
  };

  const BENEISH_LABELS: Record<keyof BeneishMComponents, string> = {
    dsri: 'DSRI',
    gmi: 'GMI',
    aqi: 'AQI',
    sgi: 'SGI',
    depi: 'DEPI',
    sgai: 'SGAI',
    tata: 'TATA',
    lvgi: 'LVGI',
  };

  const PIOTROSKI_LABELS: Record<keyof PiotroskiFComponents, string> = {
    roa: 'ROA > 0',
    cfo: 'CFO > 0',
    deltaRoa: 'ROA Improving',
    accrual: 'CFO > ROA',
    deltaLeverage: 'Lower Leverage',
    deltaLiquidity: 'Higher Liquidity',
    equityOffer: 'No Dilution',
    deltaMargin: 'Higher Margin',
    deltaTurnover: 'Higher Turnover',
  };

  return (
    <div className="px-3 py-2">
      {/* Stock selector */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-[7px] font-mono text-neutral-500 uppercase">
          {tr(t, 'eqSelectStock', 'Stock')}:
        </span>
        <select
          value={stock.ticker}
          onChange={(e) => onSelectTicker(e.target.value)}
          className="bg-[#111] border border-border/30 px-2 py-0.5 text-[9px] font-mono text-white outline-none focus:border-amber-400/50"
        >
          {stocks.map((s) => (
            <option key={s.ticker} value={s.ticker}>
              {s.ticker} - {s.name}
            </option>
          ))}
        </select>
        <span className={`text-[8px] font-bold px-1.5 py-0.5 border ${gradeColor(stock.overallGrade)} ${gradeBgColor(stock.overallGrade)}`}>
          {tr(t, 'eqGrade', 'Grade')}: {stock.overallGrade}
        </span>
        <span className="text-[7px] font-mono text-neutral-600">
          {fmtMarketCap(stock.marketCap)}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Altman Z-Score Panel */}
        <div className="border border-border/20 bg-[#060606]">
          <div className="px-2 py-1.5 border-b border-border/20 flex items-center justify-between">
            <span className="text-[8px] font-mono font-bold text-amber-400 uppercase tracking-wider">
              Altman Z-Score
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-mono font-bold ${zoneColor(stock.altmanZ.zone)}`}>
                {stock.altmanZ.score.toFixed(2)}
              </span>
              <span className={`text-[7px] font-bold px-1 py-0.5 ${zoneColor(stock.altmanZ.zone)} ${zoneBgColor(stock.altmanZ.zone)}`}>
                {stock.altmanZ.zone.toUpperCase()}
              </span>
            </div>
          </div>
          <div className="px-2 py-2 space-y-1">
            {(Object.keys(zComp) as (keyof AltmanZComponents)[]).map((key) => (
              <ComponentBar
                key={key}
                label={ALTMAN_LABELS[key]}
                value={zComp[key]}
                max={1.5}
                min={-0.2}
              />
            ))}
          </div>
          <div className="px-2 py-1 border-t border-border/10">
            <div className="flex items-center justify-between text-[7px] font-mono text-neutral-600">
              <span>{'<'}1.81 = Distress</span>
              <span>1.81-2.99 = Grey</span>
              <span>{'>'}2.99 = Safe</span>
            </div>
          </div>
        </div>

        {/* Beneish M-Score Panel */}
        <div className="border border-border/20 bg-[#060606]">
          <div className="px-2 py-1.5 border-b border-border/20 flex items-center justify-between">
            <span className="text-[8px] font-mono font-bold text-amber-400 uppercase tracking-wider">
              Beneish M-Score
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-mono font-bold ${manipColor(stock.beneishM.manipulation)}`}>
                {stock.beneishM.score.toFixed(2)}
              </span>
              <span className={`text-[7px] font-bold px-1 py-0.5 ${manipColor(stock.beneishM.manipulation)} ${manipBgColor(stock.beneishM.manipulation)}`}>
                {stock.beneishM.manipulation.toUpperCase()}
              </span>
            </div>
          </div>
          <div className="px-2 py-2 space-y-1">
            {(Object.keys(mComp) as (keyof BeneishMComponents)[]).map((key) => (
              <ComponentBar
                key={key}
                label={BENEISH_LABELS[key]}
                value={mComp[key]}
                max={key === 'tata' ? 0.15 : 2.0}
                min={key === 'tata' ? -0.1 : 0.5}
              />
            ))}
          </div>
          <div className="px-2 py-1 border-t border-border/10">
            <div className="flex items-center justify-between text-[7px] font-mono text-neutral-600">
              <span>{'<'}-2.22 = Clean</span>
              <span>-2.22 to -1.78 = Grey</span>
              <span>{'>'}-1.78 = Flag</span>
            </div>
          </div>
        </div>

        {/* Piotroski F-Score Panel */}
        <div className="border border-border/20 bg-[#060606]">
          <div className="px-2 py-1.5 border-b border-border/20 flex items-center justify-between">
            <span className="text-[8px] font-mono font-bold text-amber-400 uppercase tracking-wider">
              Piotroski F-Score
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-mono font-bold ${fGradeColor(stock.piotroskiF.grade)}`}>
                {stock.piotroskiF.score}/9
              </span>
              <span className={`text-[7px] font-bold px-1 py-0.5 ${fGradeColor(stock.piotroskiF.grade)}`}>
                {stock.piotroskiF.grade.toUpperCase()}
              </span>
            </div>
          </div>
          <div className="px-2 py-2 space-y-0.5">
            {(Object.keys(fComp) as (keyof PiotroskiFComponents)[]).map((key) => (
              <BoolSignal key={key} label={PIOTROSKI_LABELS[key]} value={fComp[key]} />
            ))}
          </div>
          <div className="px-2 py-1 border-t border-border/10">
            <div className="flex items-center justify-between text-[7px] font-mono text-neutral-600">
              <span>0-3 = Weak</span>
              <span>4-6 = Moderate</span>
              <span>7-9 = Strong</span>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-px bg-border/10">
        {[
          { label: 'ACCRUAL RATIO', value: stock.accrualRatio, fmt: (v: number) => v.toFixed(3), good: Math.abs(stock.accrualRatio) < 0.05 },
          { label: 'EARNINGS PERSISTENCE', value: stock.earningsPersistence, fmt: (v: number) => v.toFixed(3), good: stock.earningsPersistence > 0.7 },
          { label: 'CASH FLOW / INCOME', value: stock.cashFlowToIncome, fmt: (v: number) => v.toFixed(3), good: stock.cashFlowToIncome >= 1.0 },
          { label: 'REVENUE QUALITY', value: stock.revenueQuality, fmt: (v: number) => (v * 100).toFixed(1) + '%', good: stock.revenueQuality >= 0.75 },
        ].map((m) => (
          <div key={m.label} className="bg-black px-2 py-1.5">
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">{m.label}</div>
            <div className={`text-[11px] font-mono font-bold ${m.good ? 'text-green-400' : 'text-orange-400'}`}>
              {m.fmt(m.value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── RANKING View ──

function RankingView({ stocks }: { stocks: EarningsQualityStock[] }) {
  const [sortKey, setSortKey] = useState<RankSortKey>('overallGrade');
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (key: RankSortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'ticker' || key === 'overallGrade');
    }
  };

  const sorted = useMemo(() => sortStocks(stocks, sortKey, sortAsc), [stocks, sortKey, sortAsc]);

  // Compute min/max for heatmap
  const ranges = useMemo(() => {
    const z = stocks.map((s) => s.altmanZ.score);
    const m = stocks.map((s) => s.beneishM.score);
    const f = stocks.map((s) => s.piotroskiF.score);
    const acc = stocks.map((s) => s.accrualRatio);
    const ep = stocks.map((s) => s.earningsPersistence);
    const cfi = stocks.map((s) => s.cashFlowToIncome);
    const rq = stocks.map((s) => s.revenueQuality);
    return {
      z: { min: Math.min(...z), max: Math.max(...z) },
      m: { min: Math.min(...m), max: Math.max(...m) },
      f: { min: Math.min(...f), max: Math.max(...f) },
      acc: { min: Math.min(...acc), max: Math.max(...acc) },
      ep: { min: Math.min(...ep), max: Math.max(...ep) },
      cfi: { min: Math.min(...cfi), max: Math.max(...cfi) },
      rq: { min: Math.min(...rq), max: Math.max(...rq) },
    };
  }, [stocks]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-[#080808] z-10">
          <tr className="border-b border-border/20">
            <th className="px-1.5 py-1 text-center text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap w-6">
              #
            </th>
            <Th label="Ticker" sortKey="ticker" currentSort={sortKey} currentAsc={sortAsc} onSort={handleSort} />
            <Th label="Grade" sortKey="overallGrade" currentSort={sortKey} currentAsc={sortAsc} onSort={handleSort} align="center" />
            <Th label="Z-Score" sortKey="altmanZ" currentSort={sortKey} currentAsc={sortAsc} onSort={handleSort} align="right" />
            <Th label="M-Score" sortKey="beneishM" currentSort={sortKey} currentAsc={sortAsc} onSort={handleSort} align="right" />
            <Th label="F-Score" sortKey="piotroskiF" currentSort={sortKey} currentAsc={sortAsc} onSort={handleSort} align="right" />
            <Th label="Accrual" sortKey="accrualRatio" currentSort={sortKey} currentAsc={sortAsc} onSort={handleSort} align="right" />
            <Th label="Persist." sortKey="earningsPersistence" currentSort={sortKey} currentAsc={sortAsc} onSort={handleSort} align="right" />
            <Th label="CF/Inc" sortKey="cashFlowToIncome" currentSort={sortKey} currentAsc={sortAsc} onSort={handleSort} align="right" />
            <Th label="Rev Q" sortKey="revenueQuality" currentSort={sortKey} currentAsc={sortAsc} onSort={handleSort} align="right" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((s, idx) => (
            <tr key={s.ticker} className="border-b border-border/10 hover:bg-amber-400/[0.02] transition-colors">
              <td className="px-1.5 py-1 text-center text-neutral-600">{idx + 1}</td>
              <td className="px-1.5 py-1 whitespace-nowrap">
                <span className="text-white font-bold">{s.ticker}</span>
              </td>
              <td className="px-1.5 py-1 text-center">
                <span className={`text-[8px] font-bold px-1.5 py-0.5 border ${gradeColor(s.overallGrade)} ${gradeBgColor(s.overallGrade)}`}>
                  {s.overallGrade}
                </span>
              </td>
              <td className={`px-1.5 py-1 text-right font-bold ${heatmapColor(s.altmanZ.score, ranges.z.min, ranges.z.max)} ${heatmapBg(s.altmanZ.score, ranges.z.min, ranges.z.max)}`}>
                {s.altmanZ.score.toFixed(2)}
              </td>
              {/* M-Score: more negative = better, so invert */}
              <td className={`px-1.5 py-1 text-right font-bold ${heatmapColor(s.beneishM.score, ranges.m.min, ranges.m.max, true)} ${heatmapBg(s.beneishM.score, ranges.m.min, ranges.m.max, true)}`}>
                {s.beneishM.score.toFixed(2)}
              </td>
              <td className={`px-1.5 py-1 text-right font-bold ${heatmapColor(s.piotroskiF.score, ranges.f.min, ranges.f.max)} ${heatmapBg(s.piotroskiF.score, ranges.f.min, ranges.f.max)}`}>
                {s.piotroskiF.score}/9
              </td>
              {/* Accrual: closer to 0 = better, use absolute value inverted */}
              <td className={`px-1.5 py-1 text-right font-bold ${heatmapColor(Math.abs(s.accrualRatio), ranges.acc.min, ranges.acc.max, true)} ${heatmapBg(Math.abs(s.accrualRatio), ranges.acc.min, ranges.acc.max, true)}`}>
                {s.accrualRatio.toFixed(3)}
              </td>
              <td className={`px-1.5 py-1 text-right font-bold ${heatmapColor(s.earningsPersistence, ranges.ep.min, ranges.ep.max)} ${heatmapBg(s.earningsPersistence, ranges.ep.min, ranges.ep.max)}`}>
                {s.earningsPersistence.toFixed(2)}
              </td>
              <td className={`px-1.5 py-1 text-right font-bold ${heatmapColor(s.cashFlowToIncome, ranges.cfi.min, ranges.cfi.max)} ${heatmapBg(s.cashFlowToIncome, ranges.cfi.min, ranges.cfi.max)}`}>
                {s.cashFlowToIncome.toFixed(2)}
              </td>
              <td className={`px-1.5 py-1 text-right font-bold ${heatmapColor(s.revenueQuality, ranges.rq.min, ranges.rq.max)} ${heatmapBg(s.revenueQuality, ranges.rq.min, ranges.rq.max)}`}>
                {(s.revenueQuality * 100).toFixed(0)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Panel ──

export function EarningsQualityPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useEarningsQuality();

  const [view, setView] = useState<ViewMode>('SCORES');
  const [selectedTicker, setSelectedTicker] = useState('AAPL');

  const handleSelectStock = (ticker: string) => {
    setSelectedTicker(ticker);
    setView('DETAIL');
  };

  const avgGrade = useMemo(() => {
    if (!data) return null;
    const gradeValues: Record<string, number> = { A: 4, B: 3, C: 2, D: 1, F: 0 };
    const sum = data.stocks.reduce((s, st) => s + (gradeValues[st.overallGrade] ?? 0), 0);
    const avg = sum / data.stocks.length;
    if (avg >= 3.5) return 'A';
    if (avg >= 2.5) return 'B';
    if (avg >= 1.5) return 'C';
    if (avg >= 0.5) return 'D';
    return 'F';
  }, [data]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-amber-400">
            {tr(t, 'earningsQualityTitle', 'Earnings Quality')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <>
              <span className="text-[7px] font-black font-mono uppercase px-1.5 py-0.5 text-amber-400 bg-amber-400/10 border border-amber-400/30">
                {data.stocks.length} {tr(t, 'eqStocks', 'Stocks')}
              </span>
              {avgGrade && (
                <span className={`text-[7px] font-black font-mono uppercase px-1.5 py-0.5 border ${gradeColor(avgGrade)} ${gradeBgColor(avgGrade)}`}>
                  AVG {avgGrade}
                </span>
              )}
            </>
          )}
          <button onClick={() => refetch()} className="p-1 text-neutral-500 hover:text-amber-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* View tabs */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-0.5">
          {(['SCORES', 'DETAIL', 'RANKING'] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`text-[7px] font-mono font-bold uppercase px-1.5 py-0.5 transition-colors ${
                view === v
                  ? 'text-amber-400 bg-amber-400/15'
                  : 'text-neutral-600 hover:text-neutral-400'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        {data && (
          <span className="text-[7px] font-mono text-neutral-700">
            {new Date(data.generatedAt).toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-amber-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'eqNoData', 'No data available')}
          </div>
        )}

        {data && view === 'SCORES' && (
          <ScoresView stocks={data.stocks} onSelectStock={handleSelectStock} />
        )}

        {data && view === 'DETAIL' && (
          <DetailView
            stocks={data.stocks}
            selectedTicker={selectedTicker}
            onSelectTicker={setSelectedTicker}
          />
        )}

        {data && view === 'RANKING' && (
          <RankingView stocks={data.stocks} />
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-1 border-t border-border/10 shrink-0">
        <span className="text-[7px] font-mono text-neutral-700">
          Altman Z / Beneish M / Piotroski F
        </span>
        <span className="text-[7px] font-mono text-neutral-700">
          {tr(t, 'eqDisclaimer', 'Simulated scores for illustration')}
        </span>
      </div>
    </div>
  );
}
