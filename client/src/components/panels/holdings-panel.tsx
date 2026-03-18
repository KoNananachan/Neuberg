import { useState, useMemo } from 'react';
import { GlassCard } from '../common/glass-card';
import { useHoldings, type InstitutionHolder, type FundHolder, type InsiderHolder } from '../../api/hooks/use-holdings';
import { useT, type TranslationKey } from '../../i18n';
import { Building2, RefreshCw, Search } from 'lucide-react';

// ── Helpers ──

function fmtCompact(n: number | null | undefined): string {
  if (n == null) return '--';
  const abs = Math.abs(n);
  if (abs >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (abs >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toLocaleString();
}

function fmtDollar(n: number | null | undefined): string {
  if (n == null) return '--';
  return '$' + fmtCompact(n);
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(2) + '%';
}

function fmtDate(d: string): string {
  if (!d) return '--';
  const dt = new Date(d);
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
}

// Safe i18n helper: try translation key, fallback to literal
function safeT(t: (key: TranslationKey) => string, key: string, fallback: string): string {
  try {
    const result = t(key as TranslationKey);
    return result === key ? fallback : result;
  } catch {
    return fallback;
  }
}

// ── SVG Donut Chart ──

function DonutChart({ insider, institution }: { insider: number; institution: number }) {
  const other = Math.max(0, 100 - insider - institution);
  const r = 40;
  const cx = 55;
  const cy = 55;
  const circumference = 2 * Math.PI * r;

  const segments = [
    { pct: institution, color: '#818cf8' }, // indigo-400
    { pct: insider, color: '#34d399' },     // emerald-400
    { pct: other, color: '#3f3f46' },       // zinc-700
  ];

  let offset = 0;
  const paths = segments.map((seg, i) => {
    const dashLen = (seg.pct / 100) * circumference;
    const dashOffset = -offset;
    offset += dashLen;
    return (
      <circle
        key={i}
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={seg.color}
        strokeWidth={14}
        strokeDasharray={`${dashLen} ${circumference - dashLen}`}
        strokeDashoffset={dashOffset}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
    );
  });

  return (
    <svg viewBox="0 0 110 110" className="w-full h-full">
      {paths}
      <text x={cx} y={cy - 4} textAnchor="middle" className="fill-neutral/80 text-[9px] font-mono font-bold">
        {fmtPct(institution)}
      </text>
      <text x={cx} y={cy + 8} textAnchor="middle" className="fill-neutral/40 text-[6px] font-mono uppercase">
        INST
      </text>
    </svg>
  );
}

// ── Horizontal Bar Chart (top 10 by % held) ──

function TopHoldersBarChart({ holders }: { holders: InstitutionHolder[] }) {
  const top10 = holders.slice(0, 10);
  if (top10.length === 0) return null;
  const maxPct = Math.max(...top10.map(h => h.pctHeld), 0.1);

  return (
    <div className="space-y-1 mt-2">
      <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">Top 10 by % Held</div>
      <svg viewBox={`0 0 300 ${top10.length * 18 + 2}`} className="w-full">
        {top10.map((h, i) => {
          const barWidth = Math.max(1, (h.pctHeld / maxPct) * 180);
          const y = i * 18 + 1;
          return (
            <g key={i}>
              <text x={0} y={y + 11} className="fill-neutral/60 text-[7px] font-mono">
                {h.name.length > 18 ? h.name.slice(0, 18) + '...' : h.name}
              </text>
              <rect x={115} y={y + 2} width={barWidth} height={10} rx={1} fill="#818cf8" opacity={0.6} />
              <text x={115 + barWidth + 4} y={y + 11} className="fill-neutral/50 text-[7px] font-mono">
                {h.pctHeld.toFixed(2)}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Sortable table types ──

type SortField = 'shares' | 'value' | 'pctHeld';
type SortDir = 'asc' | 'desc';

function sortHolders<T extends { shares: number; value: number; pctHeld: number }>(
  items: T[],
  field: SortField,
  dir: SortDir,
): T[] {
  return [...items].sort((a, b) => {
    const av = a[field];
    const bv = b[field];
    return dir === 'desc' ? bv - av : av - bv;
  });
}

// ── Tab components ──

function InstitutionsTab({ holders }: { holders: InstitutionHolder[] }) {
  const [sortField, setSortField] = useState<SortField>('shares');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const sorted = useMemo(() => sortHolders(holders, sortField, sortDir), [holders, sortField, sortDir]);

  const toggleSort = (f: SortField) => {
    if (sortField === f) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortField(f); setSortDir('desc'); }
  };

  const sortIcon = (f: SortField) => sortField === f ? (sortDir === 'desc' ? ' \u25BC' : ' \u25B2') : '';

  return (
    <div className="flex-1 overflow-auto min-h-0">
      {/* Table header */}
      <div className="sticky top-0 bg-black/80 backdrop-blur-sm z-10 grid grid-cols-[24px_1fr_65px_65px_50px_55px_55px] text-[7px] font-mono text-neutral/40 uppercase tracking-wider px-2 py-1 border-b border-white/[0.04]">
        <span>#</span>
        <span>Name</span>
        <button onClick={() => toggleSort('shares')} className="text-right hover:text-indigo-400 transition-colors">Shares{sortIcon('shares')}</button>
        <button onClick={() => toggleSort('value')} className="text-right hover:text-indigo-400 transition-colors">Value{sortIcon('value')}</button>
        <button onClick={() => toggleSort('pctHeld')} className="text-right hover:text-indigo-400 transition-colors">%{sortIcon('pctHeld')}</button>
        <span className="text-right">Change</span>
        <span className="text-right">Date</span>
      </div>

      {sorted.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-[10px] font-mono text-neutral/40 uppercase tracking-widest">
          No institutional data
        </div>
      ) : (
        sorted.map((h, i) => (
          <div
            key={i}
            className="grid grid-cols-[24px_1fr_65px_65px_50px_55px_55px] text-[9px] font-mono px-2 py-1 border-b border-white/[0.02] hover:bg-indigo-500/[0.04] transition-colors items-center"
          >
            <span className="text-neutral/30">{i + 1}</span>
            <span className="text-neutral/80 truncate pr-1">{h.name}</span>
            <span className="text-right text-neutral/70">{fmtCompact(h.shares)}</span>
            <span className="text-right text-neutral/70">{fmtDollar(h.value)}</span>
            <span className="text-right text-indigo-400 font-bold">{fmtPct(h.pctHeld)}</span>
            <span className={`text-right font-bold ${h.change > 0 ? 'text-emerald-400' : h.change < 0 ? 'text-red-400' : 'text-neutral/40'}`}>
              {h.change > 0 ? '+' : ''}{h.change !== 0 ? h.change.toFixed(1) + '%' : '--'}
            </span>
            <span className="text-right text-neutral/40">{fmtDate(h.date)}</span>
          </div>
        ))
      )}

      {/* Bar chart */}
      <TopHoldersBarChart holders={sorted} />
    </div>
  );
}

function FundsTab({ holders }: { holders: FundHolder[] }) {
  const [sortField, setSortField] = useState<SortField>('shares');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const sorted = useMemo(() => sortHolders(holders, sortField, sortDir), [holders, sortField, sortDir]);

  const toggleSort = (f: SortField) => {
    if (sortField === f) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortField(f); setSortDir('desc'); }
  };

  const sortIcon = (f: SortField) => sortField === f ? (sortDir === 'desc' ? ' \u25BC' : ' \u25B2') : '';

  return (
    <div className="flex-1 overflow-auto min-h-0">
      <div className="sticky top-0 bg-black/80 backdrop-blur-sm z-10 grid grid-cols-[24px_1fr_65px_65px_50px_55px_55px] text-[7px] font-mono text-neutral/40 uppercase tracking-wider px-2 py-1 border-b border-white/[0.04]">
        <span>#</span>
        <span>Fund</span>
        <button onClick={() => toggleSort('shares')} className="text-right hover:text-indigo-400 transition-colors">Shares{sortIcon('shares')}</button>
        <button onClick={() => toggleSort('value')} className="text-right hover:text-indigo-400 transition-colors">Value{sortIcon('value')}</button>
        <button onClick={() => toggleSort('pctHeld')} className="text-right hover:text-indigo-400 transition-colors">%{sortIcon('pctHeld')}</button>
        <span className="text-right">Change</span>
        <span className="text-right">Date</span>
      </div>

      {sorted.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-[10px] font-mono text-neutral/40 uppercase tracking-widest">
          No fund data
        </div>
      ) : (
        sorted.map((h, i) => (
          <div
            key={i}
            className="grid grid-cols-[24px_1fr_65px_65px_50px_55px_55px] text-[9px] font-mono px-2 py-1 border-b border-white/[0.02] hover:bg-indigo-500/[0.04] transition-colors items-center"
          >
            <span className="text-neutral/30">{i + 1}</span>
            <span className="text-neutral/80 truncate pr-1">{h.name}</span>
            <span className="text-right text-neutral/70">{fmtCompact(h.shares)}</span>
            <span className="text-right text-neutral/70">{fmtDollar(h.value)}</span>
            <span className="text-right text-indigo-400 font-bold">{fmtPct(h.pctHeld)}</span>
            <span className={`text-right font-bold ${h.change > 0 ? 'text-emerald-400' : h.change < 0 ? 'text-red-400' : 'text-neutral/40'}`}>
              {h.change > 0 ? '+' : ''}{h.change !== 0 ? h.change.toFixed(1) + '%' : '--'}
            </span>
            <span className="text-right text-neutral/40">{fmtDate(h.date)}</span>
          </div>
        ))
      )}
    </div>
  );
}

function InsidersTab({ insiders, t }: { insiders: InsiderHolder[]; t: (key: TranslationKey) => string }) {
  if (insiders.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-[10px] font-mono text-neutral/40 uppercase tracking-widest">
        No insider data
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto min-h-0">
      <div className="sticky top-0 bg-black/80 backdrop-blur-sm z-10 grid grid-cols-[1fr_70px_60px_60px_65px_55px_50px] text-[7px] font-mono text-neutral/40 uppercase tracking-wider px-2 py-1 border-b border-white/[0.04]">
        <span>{safeT(t, 'insider', 'Name')}</span>
        <span>Relation</span>
        <span className="text-right">{safeT(t, 'shares', 'Shares')}</span>
        <span className="text-right">{safeT(t, 'value', 'Value')}</span>
        <span>Last Tx</span>
        <span>{safeT(t, 'date', 'Date')}</span>
        <span className="text-right">Traded</span>
      </div>

      {insiders.map((ins, i) => {
        const isBuy = ins.lastTransaction.toLowerCase().includes('purchase') || ins.lastTransaction.toLowerCase().includes('buy');
        const isSale = ins.lastTransaction.toLowerCase().includes('sale') || ins.lastTransaction.toLowerCase().includes('sell') || ins.lastTransaction.toLowerCase().includes('disposition');
        const txColor = isBuy ? 'text-emerald-400' : isSale ? 'text-red-400' : 'text-neutral/50';

        return (
          <div
            key={i}
            className="grid grid-cols-[1fr_70px_60px_60px_65px_55px_50px] text-[9px] font-mono px-2 py-1 border-b border-white/[0.02] hover:bg-indigo-500/[0.04] transition-colors items-center"
          >
            <span className="text-neutral/80 truncate pr-1">{ins.name}</span>
            <span className="text-neutral/50 truncate">{ins.relation || '--'}</span>
            <span className="text-right text-neutral/70">{fmtCompact(ins.shares)}</span>
            <span className="text-right text-neutral/70">{fmtDollar(ins.value)}</span>
            <span className={`font-bold truncate ${txColor}`}>
              {ins.lastTransaction || '--'}
            </span>
            <span className="text-neutral/40">{fmtDate(ins.lastDate)}</span>
            <span className={`text-right font-bold ${ins.lastShares > 0 ? 'text-emerald-400' : ins.lastShares < 0 ? 'text-red-400' : 'text-neutral/40'}`}>
              {ins.lastShares !== 0 ? fmtCompact(ins.lastShares) : '--'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Metric Card ──

function MetricCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.04] px-2 py-1.5 rounded">
      <div className="text-[7px] text-neutral/40 uppercase tracking-wider font-mono mb-0.5">{label}</div>
      <div className={`text-[11px] font-mono font-bold ${accent ? 'text-indigo-400' : 'text-neutral/90'}`}>{value}</div>
    </div>
  );
}

// ── Main Panel ──

type TabId = 'institutions' | 'funds' | 'insiders';

export function HoldingsPanel() {
  const t = useT();
  const [symbol, setSymbol] = useState('AAPL');
  const [inputValue, setInputValue] = useState('AAPL');
  const [activeTab, setActiveTab] = useState<TabId>('institutions');

  const { data, isLoading, refetch, dataUpdatedAt } = useHoldings(symbol);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = inputValue.trim().toUpperCase();
    if (val && val !== symbol) setSymbol(val);
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: 'institutions', label: safeT(t, 'hdInstitutions', 'Institutions') },
    { id: 'funds', label: safeT(t, 'hdFunds', 'Funds') },
    { id: 'insiders', label: safeT(t, 'hdInsiders', 'Insiders') },
  ];

  return (
    <GlassCard className="flex flex-col h-full text-[10px]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.04]">
        <div className="flex items-center gap-1.5">
          <Building2 size={12} className="text-indigo-400" />
          <span className="text-[10px] font-mono font-bold tracking-widest text-neutral/80 uppercase">
            {safeT(t, 'panelHoldings', 'INSTITUTIONAL HOLDINGS')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {dataUpdatedAt > 0 && (
            <span className="text-[8px] font-mono text-neutral/30">
              {new Date(dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-0.5 text-neutral/40 hover:text-indigo-400 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={10} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Symbol input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 px-3 py-1.5 border-b border-white/[0.04] bg-black/20">
        <Search size={10} className="text-neutral/30" />
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value.toUpperCase())}
          placeholder="SYMBOL"
          className="flex-1 bg-transparent border-none outline-none text-[10px] font-mono text-white placeholder:text-neutral/30 uppercase"
          maxLength={10}
        />
        <button
          type="submit"
          className="px-2 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors"
        >
          Go
        </button>
      </form>

      {/* Company info line */}
      {data && (
        <div className="flex items-center gap-3 px-3 py-1 border-b border-white/[0.04] bg-black/10">
          <span className="text-[11px] font-mono font-bold text-indigo-400">{data.symbol}</span>
          <span className="text-[9px] font-mono text-neutral/60 truncate">{data.companyName}</span>
          <span className="text-[10px] font-mono font-bold text-white ml-auto">${data.price.toFixed(2)}</span>
          {data.marketCap != null && (
            <span className="text-[8px] font-mono text-neutral/40">MCap: {fmtDollar(data.marketCap)}</span>
          )}
        </div>
      )}

      {/* Loading / Error */}
      {isLoading && !data && (
        <div className="flex flex-col items-center justify-center flex-1 gap-2">
          <div className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 animate-spin" />
          <span className="text-[10px] font-mono text-neutral/40 uppercase tracking-widest">{safeT(t, 'loading', 'Loading...')}</span>
        </div>
      )}

      {!isLoading && !data && (
        <div className="flex items-center justify-center flex-1 text-neutral/30 text-[10px] font-mono uppercase tracking-widest">
          {safeT(t, 'hdNoData', 'Enter a symbol to view holdings')}
        </div>
      )}

      {data && (
        <>
          {/* Ownership summary */}
          <div className="px-3 py-2 border-b border-white/[0.04]">
            <div className="flex gap-2">
              {/* Metric cards */}
              <div className="flex-1 grid grid-cols-2 gap-1.5">
                <MetricCard label="Insider %" value={fmtPct(data.ownership.insiderPct)} />
                <MetricCard label="Institution %" value={fmtPct(data.ownership.institutionPct)} accent />
                <MetricCard label="# Institutions" value={data.ownership.institutionCount?.toLocaleString() ?? '--'} />
                <MetricCard label="Float Held" value={fmtPct(data.ownership.institutionFloat)} accent />
              </div>
              {/* Donut chart */}
              <div className="w-[80px] h-[80px] shrink-0">
                <DonutChart
                  insider={data.ownership.insiderPct ?? 0}
                  institution={data.ownership.institutionPct ?? 0}
                />
              </div>
            </div>
            {/* Legend */}
            <div className="flex items-center gap-3 mt-1.5">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-indigo-400 rounded-sm" />
                <span className="text-[7px] font-mono text-neutral/50">Institutional</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-emerald-400 rounded-sm" />
                <span className="text-[7px] font-mono text-neutral/50">Insider</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-zinc-700 rounded-sm" />
                <span className="text-[7px] font-mono text-neutral/50">Other</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-0.5 px-3 py-1 border-b border-white/[0.04] bg-black/10">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-2.5 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                    : 'text-neutral/50 hover:text-white border border-transparent'
                }`}
              >
                {tab.label}
                {tab.id === 'institutions' && data.topInstitutions.length > 0 && (
                  <span className="ml-1 text-[7px] text-neutral/30">{data.topInstitutions.length}</span>
                )}
                {tab.id === 'funds' && data.topFunds.length > 0 && (
                  <span className="ml-1 text-[7px] text-neutral/30">{data.topFunds.length}</span>
                )}
                {tab.id === 'insiders' && data.insiders.length > 0 && (
                  <span className="ml-1 text-[7px] text-neutral/30">{data.insiders.length}</span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-auto min-h-0">
            {activeTab === 'institutions' && <InstitutionsTab holders={data.topInstitutions} />}
            {activeTab === 'funds' && <FundsTab holders={data.topFunds} />}
            {activeTab === 'insiders' && <InsidersTab insiders={data.insiders} t={t} />}
          </div>
        </>
      )}
    </GlassCard>
  );
}
