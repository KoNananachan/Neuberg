import { useState } from 'react';
import { useEquityScreenResults } from '../../api/hooks/use-equity-screen-results';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

const ACCENT = '#34d399'; // emerald-400
const ACCENT_DIM = 'rgba(52,211,153,0.08)';

type Tab = 'rankings' | 'factors' | 'sectors' | 'performance' | 'signals';

// ── Helpers ──

function fmtPct(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtNum(n: number, decimals: number = 2): string {
  return n.toFixed(decimals);
}

function fmtMcap(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(0)}M`;
  return n.toLocaleString();
}

function returnColor(val: number): string {
  if (val > 0) return '#22c55e';
  if (val < 0) return '#ef4444';
  return '#71717a';
}

function signalBadge(signal: string): { bg: string; text: string } {
  switch (signal) {
    case 'STRONG BUY':
      return { bg: 'rgba(34,197,94,0.2)', text: '#22c55e' };
    case 'BUY':
      return { bg: 'rgba(132,204,22,0.2)', text: '#84cc16' };
    case 'HOLD':
      return { bg: 'rgba(161,161,170,0.15)', text: '#a1a1aa' };
    case 'SELL':
      return { bg: 'rgba(239,68,68,0.2)', text: '#ef4444' };
    default:
      return { bg: 'rgba(161,161,170,0.1)', text: '#71717a' };
  }
}

function weightColor(val: number): string {
  if (val > 0) return '#22c55e';
  if (val < 0) return '#ef4444';
  return '#71717a';
}

// ── Main Panel ──

export function EquityScreenResultsPanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = useEquityScreenResults();
  const [activeTab, setActiveTab] = useState<Tab>('rankings');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'rankings', label: 'RANKINGS' },
    { key: 'factors', label: 'FACTORS' },
    { key: 'sectors', label: 'SECTORS' },
    { key: 'performance', label: 'PERFORMANCE' },
    { key: 'signals', label: 'SIGNALS' },
  ];

  if (isLoading && !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div
          className="text-[9px] font-mono uppercase tracking-widest animate-pulse"
          style={{ color: ACCENT }}
        >
          LOADING SCREEN DATA...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-black gap-2">
        <div className="text-[9px] font-mono text-red-400/60 uppercase tracking-widest">
          FAILED TO LOAD
        </div>
        <button
          onClick={() => refetch()}
          className="text-[8px] font-mono uppercase px-2 py-1 border border-border/20 text-emerald-400/60 hover:text-emerald-400 hover:border-emerald-400/30 transition-colors"
        >
          RETRY
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black text-[9px] font-mono overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="10" width="3" height="5" fill={ACCENT} opacity="0.4" />
            <rect x="5" y="7" width="3" height="8" fill={ACCENT} opacity="0.6" />
            <rect x="9" y="3" width="3" height="12" fill={ACCENT} opacity="0.8" />
            <rect x="13" y="1" width="2" height="14" fill={ACCENT} />
          </svg>
          <span
            className="text-[9px] font-black font-mono uppercase tracking-tighter"
            style={{ color: ACCENT }}
          >
            Equity Screen Results
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-emerald-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Screen Criteria Header */}
      {data.criteria && (
        <div className="flex items-center gap-4 px-3 py-1 border-b border-border/20 bg-[#030303] shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[7px] font-black uppercase tracking-wider text-neutral-600">UNIVERSE</span>
            <span className="text-[8px] font-bold text-emerald-400/80">
              {data.criteria.universeSize?.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[7px] font-black uppercase tracking-wider text-neutral-600">PASSED</span>
            <span className="text-[8px] font-bold text-emerald-400">
              {data.criteria.passedCount?.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-1 overflow-hidden">
            <span className="text-[7px] font-black uppercase tracking-wider text-neutral-600">CRITERIA</span>
            <span className="text-[8px] text-neutral-500 truncate">
              {data.criteria.list?.join(' | ')}
            </span>
          </div>
        </div>
      )}

      {/* Tab Bar */}
      <div className="flex items-center gap-0 border-b border-border/20 shrink-0">
        {tabs.map((tab: any) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-3 py-2 text-[9px] font-mono font-bold uppercase tracking-wider transition-colors"
            style={{
              color: activeTab === tab.key ? ACCENT : 'rgba(255,255,255,0.35)',
              borderBottom: activeTab === tab.key ? `1px solid ${ACCENT}` : '1px solid transparent',
              background: activeTab === tab.key ? ACCENT_DIM : 'transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {activeTab === 'rankings' && <RankingsTab data={data} />}
        {activeTab === 'factors' && <FactorsTab data={data} />}
        {activeTab === 'sectors' && <SectorsTab data={data} />}
        {activeTab === 'performance' && <PerformanceTab data={data} />}
        {activeTab === 'signals' && <SignalsTab data={data} />}
      </div>
    </div>
  );
}

// ── 1. Rankings Tab ──

function RankingsTab({ data }: { data: any }) {
  const [sortCol, setSortCol] = useState<string>('rank');
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(col === 'rank' || col === 'ticker'); }
  };

  const sorted = [...(data.rankings ?? [])].sort((a: any, b: any) => {
    const va = a[sortCol] ?? 0;
    const vb = b[sortCol] ?? 0;
    if (typeof va === 'string') return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    return sortAsc ? va - vb : vb - va;
  });

  const SortHeader = ({ col, label, right }: { col: string; label: string; right?: boolean }) => (
    <th
      className={`px-2 py-1.5 font-bold cursor-pointer hover:text-white/80 transition-colors whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}
      onClick={() => handleSort(col)}
    >
      {label}{sortCol === col ? (sortAsc ? ' \u25B2' : ' \u25BC') : ''}
    </th>
  );

  return (
    <div>
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-black/95 text-[7px] font-black uppercase tracking-wider text-neutral-600 border-b border-border/20">
          <tr>
            <SortHeader col="rank" label="#" />
            <SortHeader col="ticker" label="Ticker" />
            <SortHeader col="name" label="Name" />
            <SortHeader col="sector" label="Sector" />
            <SortHeader col="compositeScore" label="Score" right />
            <SortHeader col="momentum" label="Mom" right />
            <SortHeader col="value" label="Val" right />
            <SortHeader col="quality" label="Qlty" right />
            <SortHeader col="growth" label="Grw" right />
            <SortHeader col="price" label="Price" right />
            <SortHeader col="marketCap" label="MCap" right />
            <SortHeader col="pe" label="P/E" right />
            <SortHeader col="ytdReturn" label="YTD" right />
            <th className="px-2 py-1.5 text-center font-bold">Signal</th>
          </tr>
        </thead>
        <tbody>
          {sorted.slice(0, 20).map((stock: any) => {
            const badge = signalBadge(stock.signal);
            return (
              <tr
                key={stock.ticker}
                className="border-b border-border/20 hover:bg-emerald-400/[0.02] transition-colors"
              >
                <td className="px-2 py-1.5 text-neutral-500 tabular-nums">{stock.rank}</td>
                <td className="px-2 py-1.5">
                  <span className="font-bold" style={{ color: ACCENT }}>{stock.ticker}</span>
                </td>
                <td className="px-2 py-1.5 text-neutral-400 truncate max-w-[100px]">{stock.name}</td>
                <td className="px-2 py-1.5 text-neutral-500">{stock.sector}</td>
                <td className="px-2 py-1.5 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <div className="w-12 h-[4px] bg-neutral-800 overflow-hidden">
                      <div
                        className="h-full"
                        style={{
                          width: `${Math.min(100, Math.max(0, stock.compositeScore))}%`,
                          background: `linear-gradient(90deg, ${ACCENT}80, ${ACCENT})`,
                        }}
                      />
                    </div>
                    <span className="text-white/70 tabular-nums w-6 text-right">{fmtNum(stock.compositeScore, 0)}</span>
                  </div>
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums text-neutral-400">{fmtNum(stock.momentum, 1)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-neutral-400">{fmtNum(stock.value, 1)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-neutral-400">{fmtNum(stock.quality, 1)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-neutral-400">{fmtNum(stock.growth, 1)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-white/60">${fmtNum(stock.price)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-neutral-400">{fmtMcap(stock.marketCap)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-neutral-400">
                  {stock.pe != null ? fmtNum(stock.pe, 1) : '-'}
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums">
                  <span style={{ color: returnColor(stock.ytdReturn) }}>{fmtPct(stock.ytdReturn)}</span>
                </td>
                <td className="px-2 py-1.5 text-center">
                  <span
                    className="text-[7px] font-black uppercase px-1.5 py-[1px]"
                    style={{ background: badge.bg, color: badge.text }}
                  >
                    {stock.signal}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── 2. Factors Tab ──

function FactorsTab({ data }: { data: any }) {
  const factors = data.factors ?? [];

  return (
    <div>
      <div className="px-3 pt-2 pb-1">
        <span className="text-[7px] font-black uppercase tracking-wider text-neutral-600">
          Factor Score Distribution
        </span>
      </div>
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-black/95 text-[7px] font-black uppercase tracking-wider text-neutral-600 border-b border-border/20">
          <tr>
            <th className="px-2 py-1.5 text-left font-bold">Factor</th>
            <th className="px-2 py-1.5 text-right font-bold">Mean</th>
            <th className="px-2 py-1.5 text-right font-bold">Median</th>
            <th className="px-2 py-1.5 text-right font-bold">Std Dev</th>
            <th className="px-2 py-1.5 text-right font-bold">Top 10%</th>
            <th className="px-2 py-1.5 text-right font-bold">Bot 10%</th>
            <th className="px-2 py-1.5 text-center font-bold">Distribution</th>
          </tr>
        </thead>
        <tbody>
          {factors.map((factor: any) => (
            <tr
              key={factor.name}
              className="border-b border-border/20 hover:bg-emerald-400/[0.02] transition-colors"
            >
              <td className="px-2 py-1.5">
                <span className="font-bold" style={{ color: ACCENT }}>{factor.name}</span>
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums text-white/70">{fmtNum(factor.mean)}</td>
              <td className="px-2 py-1.5 text-right tabular-nums text-white/70">{fmtNum(factor.median)}</td>
              <td className="px-2 py-1.5 text-right tabular-nums text-neutral-400">{fmtNum(factor.stdDev)}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">
                <span style={{ color: '#22c55e' }}>{fmtNum(factor.topDecile)}</span>
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums">
                <span style={{ color: '#ef4444' }}>{fmtNum(factor.bottomDecile)}</span>
              </td>
              <td className="px-2 py-2">
                <MiniDistribution
                  bins={factor.distribution ?? []}
                  mean={factor.mean}
                  min={factor.bottomDecile}
                  max={factor.topDecile}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MiniDistribution({ bins, mean, min, max }: { bins: number[]; mean: number; min: number; max: number }) {
  if (!bins.length) return <span className="text-neutral-600">-</span>;
  const maxVal = Math.max(...bins, 1);

  return (
    <div className="flex items-end gap-[1px] h-[16px] justify-center">
      {bins.map((val: any, i: any) => {
        const height = Math.max(1, (val / maxVal) * 16);
        const ratio = bins.length > 1 ? i / (bins.length - 1) : 0.5;
        const isCenter = Math.abs(ratio - 0.5) < 0.1;
        return (
          <div
            key={i}
            className="w-[3px]"
            style={{
              height: `${height}px`,
              background: isCenter ? ACCENT : `${ACCENT}60`,
              opacity: 0.5 + (val / maxVal) * 0.5,
            }}
          />
        );
      })}
    </div>
  );
}

// ── 3. Sectors Tab ──

function SectorsTab({ data }: { data: any }) {
  const sectors = data.sectors ?? [];

  return (
    <div>
      <div className="px-3 pt-2 pb-1">
        <span className="text-[7px] font-black uppercase tracking-wider text-neutral-600">
          Sector Allocation
        </span>
      </div>
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-black/95 text-[7px] font-black uppercase tracking-wider text-neutral-600 border-b border-border/20">
          <tr>
            <th className="px-2 py-1.5 text-left font-bold">Sector</th>
            <th className="px-2 py-1.5 text-right font-bold">Avg Score</th>
            <th className="px-2 py-1.5 text-right font-bold">Count</th>
            <th className="px-2 py-1.5 text-left font-bold">Top Pick</th>
            <th className="px-2 py-1.5 text-right font-bold">Weight</th>
            <th className="px-2 py-1.5 text-right font-bold">Benchmark</th>
            <th className="px-2 py-1.5 text-center font-bold">Over/Under</th>
          </tr>
        </thead>
        <tbody>
          {sectors.map((sector: any) => {
            const diff = (sector.weight ?? 0) - (sector.benchmark ?? 0);
            return (
              <tr
                key={sector.name}
                className="border-b border-border/20 hover:bg-emerald-400/[0.02] transition-colors"
              >
                <td className="px-2 py-1.5">
                  <span className="font-bold" style={{ color: ACCENT }}>{sector.name}</span>
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums text-white/70">{fmtNum(sector.avgScore, 1)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-neutral-400">{sector.stockCount}</td>
                <td className="px-2 py-1.5">
                  <span className="font-bold text-emerald-400/80">{sector.topPick}</span>
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums text-white/60">{fmtPct(sector.weight)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-neutral-500">{fmtPct(sector.benchmark)}</td>
                <td className="px-2 py-1.5">
                  <div className="flex items-center justify-center gap-1">
                    <div className="w-16 h-[4px] bg-neutral-800 relative overflow-hidden">
                      <div
                        className="absolute top-0 h-full"
                        style={{
                          left: diff >= 0 ? '50%' : `${50 + (diff / 10) * 50}%`,
                          width: `${Math.min(50, Math.abs(diff / 10) * 50)}%`,
                          background: weightColor(diff),
                        }}
                      />
                      <div className="absolute top-0 left-1/2 w-[1px] h-full bg-neutral-600" />
                    </div>
                    <span
                      className="text-[7px] font-bold tabular-nums w-10 text-right"
                      style={{ color: weightColor(diff) }}
                    >
                      {diff > 0 ? '+' : ''}{fmtNum(diff, 1)}%
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── 4. Performance Tab ──

function PerformanceTab({ data }: { data: any }) {
  const performance = data.performance ?? [];

  return (
    <div>
      <div className="px-3 pt-2 pb-1">
        <span className="text-[7px] font-black uppercase tracking-wider text-neutral-600">
          Backtested Signal Performance
        </span>
      </div>
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-black/95 text-[7px] font-black uppercase tracking-wider text-neutral-600 border-b border-border/20">
          <tr>
            <th className="px-2 py-1.5 text-left font-bold">Period</th>
            <th className="px-2 py-1.5 text-right font-bold">Long Ret</th>
            <th className="px-2 py-1.5 text-right font-bold">Short Ret</th>
            <th className="px-2 py-1.5 text-right font-bold">Spread</th>
            <th className="px-2 py-1.5 text-center font-bold">Hit Rate</th>
            <th className="px-2 py-1.5 text-right font-bold">Info Ratio</th>
          </tr>
        </thead>
        <tbody>
          {performance.map((row: any) => {
            const spread = (row.longReturn ?? 0) - (row.shortReturn ?? 0);
            return (
              <tr
                key={row.period}
                className="border-b border-border/20 hover:bg-emerald-400/[0.02] transition-colors"
              >
                <td className="px-2 py-1.5">
                  <span className="font-bold" style={{ color: ACCENT }}>{row.period}</span>
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums">
                  <span style={{ color: returnColor(row.longReturn) }}>{fmtPct(row.longReturn)}</span>
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums">
                  <span style={{ color: returnColor(row.shortReturn) }}>{fmtPct(row.shortReturn)}</span>
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums">
                  <span className="font-bold" style={{ color: returnColor(spread) }}>{fmtPct(spread)}</span>
                </td>
                <td className="px-2 py-2">
                  <div className="flex items-center justify-center gap-1.5">
                    <div className="w-16 h-[4px] bg-neutral-800 overflow-hidden">
                      <div
                        className="h-full"
                        style={{
                          width: `${Math.min(100, Math.max(0, (row.hitRate ?? 0) * 100))}%`,
                          background: (row.hitRate ?? 0) >= 0.5 ? ACCENT : '#ef4444',
                        }}
                      />
                    </div>
                    <span className="text-white/60 tabular-nums w-8 text-right">
                      {((row.hitRate ?? 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums">
                  <span
                    className="font-bold"
                    style={{ color: (row.infoRatio ?? 0) >= 1 ? '#22c55e' : (row.infoRatio ?? 0) < 0 ? '#ef4444' : '#71717a' }}
                  >
                    {fmtNum(row.infoRatio)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── 5. Signals Tab ──

function SignalsTab({ data }: { data: any }) {
  const signals = data.signals ?? [];

  return (
    <div>
      <div className="px-3 pt-2 pb-1">
        <span className="text-[7px] font-black uppercase tracking-wider text-neutral-600">
          Recent Signal Changes
        </span>
      </div>
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-black/95 text-[7px] font-black uppercase tracking-wider text-neutral-600 border-b border-border/20">
          <tr>
            <th className="px-2 py-1.5 text-left font-bold">Ticker</th>
            <th className="px-2 py-1.5 text-left font-bold">Name</th>
            <th className="px-2 py-1.5 text-center font-bold">Signal Change</th>
            <th className="px-2 py-1.5 text-right font-bold">Score Chg</th>
            <th className="px-2 py-1.5 text-left font-bold">Date</th>
            <th className="px-2 py-1.5 text-left font-bold">Driver</th>
          </tr>
        </thead>
        <tbody>
          {signals.map((sig: any, idx: any) => {
            const prevBadge = signalBadge(sig.previousSignal);
            const newBadge = signalBadge(sig.newSignal);
            return (
              <tr
                key={`${sig.ticker}-${idx}`}
                className="border-b border-border/20 hover:bg-emerald-400/[0.02] transition-colors"
              >
                <td className="px-2 py-1.5">
                  <span className="font-bold" style={{ color: ACCENT }}>{sig.ticker}</span>
                </td>
                <td className="px-2 py-1.5 text-neutral-400 truncate max-w-[100px]">{sig.name}</td>
                <td className="px-2 py-1.5">
                  <div className="flex items-center justify-center gap-1">
                    <span
                      className="text-[7px] font-black uppercase px-1 py-[1px]"
                      style={{ background: prevBadge.bg, color: prevBadge.text }}
                    >
                      {sig.previousSignal}
                    </span>
                    <span className="text-neutral-500">{'\u2192'}</span>
                    <span
                      className="text-[7px] font-black uppercase px-1 py-[1px]"
                      style={{ background: newBadge.bg, color: newBadge.text }}
                    >
                      {sig.newSignal}
                    </span>
                  </div>
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums">
                  <span className="font-bold" style={{ color: returnColor(sig.scoreChange) }}>
                    {sig.scoreChange > 0 ? '+' : ''}{fmtNum(sig.scoreChange, 1)}
                  </span>
                </td>
                <td className="px-2 py-1.5 text-neutral-500">{sig.date}</td>
                <td className="px-2 py-1.5">
                  <span className="text-emerald-400/60 font-bold">{sig.driverFactor}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
