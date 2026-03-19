import { useState } from 'react';
import { useFamilyOffice } from '../../api/hooks/use-family-office';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// i18n helper with fallback
type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// ── Constants ──

const INDIGO = '#818cf8';
const INDIGO_DIM = 'rgba(129,140,248,0.12)';
const GREEN = '#34d399';
const RED = '#f87171';
const YELLOW = '#fbbf24';

// ── Number formatting ──

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

function fmtPctSigned(n: number | null | undefined): string {
  if (n == null) return '--';
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'rgba(255,255,255,0.3)';
  if (n > 0) return GREEN;
  if (n < 0) return RED;
  return 'rgba(255,255,255,0.3)';
}

// ── Badges ──

function concentrationBadge(level: string | null | undefined): { text: string; color: string; bg: string } {
  switch (level) {
    case 'high': return { text: 'HIGH', color: RED, bg: 'rgba(248,113,113,0.12)' };
    case 'medium': return { text: 'MED', color: YELLOW, bg: 'rgba(251,191,36,0.1)' };
    case 'low': return { text: 'LOW', color: GREEN, bg: 'rgba(52,211,153,0.1)' };
    default: return { text: '--', color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.03)' };
  }
}

function convictionBadge(level: string | null | undefined): { text: string; color: string; bg: string } {
  switch (level) {
    case 'very_high': return { text: 'VERY HIGH', color: INDIGO, bg: INDIGO_DIM };
    case 'high': return { text: 'HIGH', color: GREEN, bg: 'rgba(52,211,153,0.12)' };
    case 'medium': return { text: 'MEDIUM', color: YELLOW, bg: 'rgba(251,191,36,0.1)' };
    case 'low': return { text: 'LOW', color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.04)' };
    default: return { text: '--', color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.03)' };
  }
}

// ── View Tabs ──

type ViewTab = 'OFFICES' | 'POSITIONS' | 'SECTORS' | 'THEMES';

// ── OFFICES Tab ──

function OfficesView({ data }: { data: any }) {
  const offices = data?.offices ?? [];
  const allocations = data?.aggregateAllocations ?? [];

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
      {/* Top 10 Family Offices Table */}
      <div className="border-b border-border/20">
        <div className="px-2 py-1">
          <span className="text-[7px] font-mono text-white/25 uppercase tracking-wider">
            Top Family Offices by AUM
          </span>
        </div>

        {/* Table header */}
        <div className="sticky top-0 bg-black/90 backdrop-blur-sm z-10 grid grid-cols-[20px_1fr_60px_55px_35px_40px_35px_45px] text-[6px] font-mono text-white/25 uppercase tracking-wider px-2 py-0.5 border-b border-border/20">
          <span>#</span>
          <span>Name</span>
          <span className="text-right">Est. AUM</span>
          <span className="text-right">Top Hold</span>
          <span className="text-right">Wt%</span>
          <span className="text-center">Conc.</span>
          <span className="text-center">Chg</span>
          <span className="text-right">1Y Ret</span>
        </div>

        {offices.length === 0 ? (
          <div className="flex items-center justify-center py-6 text-[9px] font-mono text-white/30 uppercase tracking-widest">
            No office data
          </div>
        ) : (
          offices.slice(0, 10).map((office: any, i: number) => {
            const conc = concentrationBadge(office?.concentration);
            const chgVal = office?.recentChange;
            return (
              <div
                key={office?.name ?? i}
                className="grid grid-cols-[20px_1fr_60px_55px_35px_40px_35px_45px] text-[9px] font-mono px-2 py-1 border-b border-border/20 hover:bg-indigo-400/[0.02] transition-colors items-center"
              >
                <span className="text-white/20">{i + 1}</span>
                <span className="text-white/70 truncate pr-1">{office?.name ?? '--'}</span>
                <span className="text-right text-white/60">{fmtDollar(office?.estimatedAum)}</span>
                <span className="text-right text-indigo-400 font-bold truncate">{office?.topHolding ?? '--'}</span>
                <span className="text-right text-white/50">{fmtPct(office?.topHoldingWeight)}</span>
                <span className="text-center">
                  <span
                    className="text-[6px] font-black uppercase px-1 py-0"
                    style={{ color: conc.color, backgroundColor: conc.bg }}
                  >
                    {conc.text}
                  </span>
                </span>
                <span className="text-center">
                  {chgVal != null ? (
                    <span
                      className="text-[6px] font-black uppercase px-1 py-0"
                      style={{
                        color: chgVal > 0 ? GREEN : chgVal < 0 ? RED : 'rgba(255,255,255,0.3)',
                        backgroundColor: chgVal > 0 ? 'rgba(52,211,153,0.1)' : chgVal < 0 ? 'rgba(248,113,113,0.1)' : 'rgba(255,255,255,0.03)',
                      }}
                    >
                      {chgVal > 0 ? 'NEW' : chgVal < 0 ? 'RED' : 'FLAT'}
                    </span>
                  ) : (
                    <span className="text-white/20">--</span>
                  )}
                </span>
                <span
                  className="text-right font-bold"
                  style={{ color: changeColor(office?.oneYearReturn) }}
                >
                  {fmtPctSigned(office?.oneYearReturn)}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Aggregate Allocation Breakdown */}
      {allocations.length > 0 && (
        <div className="px-2 py-1.5">
          <div className="text-[7px] font-mono text-white/25 uppercase tracking-wider mb-1">
            Aggregate Allocation Breakdown
          </div>
          <div className="grid grid-cols-3 gap-1">
            {allocations.map((alloc: any, i: number) => {
              const pct = alloc?.weight ?? 0;
              return (
                <div
                  key={alloc?.name ?? i}
                  className="flex items-center justify-between px-1.5 py-1 border border-white/[0.04] bg-white/[0.01]"
                >
                  <span className="text-[7px] font-mono text-white/40 truncate">{alloc?.name ?? '--'}</span>
                  <span className="text-[8px] font-mono font-bold text-indigo-400 ml-1">{fmtPct(pct)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── POSITIONS Tab ──

function PositionsView({ data }: { data: any }) {
  const positions = data?.topPositions ?? [];

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
      <div className="px-2 py-1">
        <span className="text-[7px] font-mono text-white/25 uppercase tracking-wider">
          Top Aggregate Positions
        </span>
      </div>

      {/* Table header */}
      <div className="sticky top-0 bg-black/90 backdrop-blur-sm z-10 grid grid-cols-[40px_1fr_65px_65px_50px_40px] text-[6px] font-mono text-white/25 uppercase tracking-wider px-2 py-0.5 border-b border-border/20">
        <span>Ticker</span>
        <span>Company</span>
        <span className="text-right">Agg Own</span>
        <span className="text-right">Mkt Val</span>
        <span className="text-right">QoQ Chg</span>
        <span className="text-right">Filers</span>
      </div>

      {positions.length === 0 ? (
        <div className="flex items-center justify-center py-6 text-[9px] font-mono text-white/30 uppercase tracking-widest">
          No position data
        </div>
      ) : (
        positions.map((pos: any, i: number) => {
          const qoq = pos?.qoqChange;
          return (
            <div
              key={pos?.ticker ?? i}
              className="grid grid-cols-[40px_1fr_65px_65px_50px_40px] text-[9px] font-mono px-2 py-1 border-b border-border/20 hover:bg-indigo-400/[0.02] transition-colors items-center"
            >
              <span className="text-indigo-400 font-bold">{pos?.ticker ?? '--'}</span>
              <span className="text-white/60 truncate pr-1">{pos?.company ?? '--'}</span>
              <span className="text-right text-white/70">{fmtDollar(pos?.aggregateOwnership)}</span>
              <span className="text-right text-white/60">{fmtDollar(pos?.marketValue)}</span>
              <span
                className="text-right font-bold"
                style={{ color: changeColor(qoq) }}
              >
                {fmtPctSigned(qoq)}
              </span>
              <span className="text-right text-white/50">{pos?.filerCount ?? '--'}</span>
            </div>
          );
        })
      )}
    </div>
  );
}

// ── SECTORS Tab ──

function SectorsView({ data }: { data: any }) {
  const sectors = data?.sectors ?? [];
  const maxWeight = Math.max(...sectors.map((s: any) => s?.weight ?? 0), 1);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
      <div className="px-2 py-1">
        <span className="text-[7px] font-mono text-white/25 uppercase tracking-wider">
          Sector Exposure
        </span>
      </div>

      {/* Table header */}
      <div className="sticky top-0 bg-black/90 backdrop-blur-sm z-10 grid grid-cols-[1fr_50px_50px_80px] text-[6px] font-mono text-white/25 uppercase tracking-wider px-2 py-0.5 border-b border-border/20">
        <span>Sector</span>
        <span className="text-right">Weight</span>
        <span className="text-right">QoQ Chg</span>
        <span className="text-right">Exposure</span>
      </div>

      {sectors.length === 0 ? (
        <div className="flex items-center justify-center py-6 text-[9px] font-mono text-white/30 uppercase tracking-widest">
          No sector data
        </div>
      ) : (
        sectors.map((sector: any, i: number) => {
          const weight = sector?.weight ?? 0;
          const qoq = sector?.qoqChange;
          const barPct = maxWeight > 0 ? Math.min((weight / maxWeight) * 100, 100) : 0;

          return (
            <div
              key={sector?.name ?? i}
              className="grid grid-cols-[1fr_50px_50px_80px] text-[9px] font-mono px-2 py-1 border-b border-border/20 hover:bg-indigo-400/[0.02] transition-colors items-center"
            >
              <span className="text-white/70">{sector?.name ?? '--'}</span>
              <span className="text-right text-indigo-400 font-bold">{fmtPct(weight)}</span>
              <span
                className="text-right font-bold"
                style={{ color: changeColor(qoq) }}
              >
                {fmtPctSigned(qoq)}
              </span>
              <div className="flex items-center justify-end gap-1">
                <div className="w-16 h-1.5 bg-white/[0.03] overflow-hidden">
                  <div
                    className="h-full"
                    style={{
                      width: `${barPct}%`,
                      backgroundColor: INDIGO,
                      opacity: 0.6,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ── THEMES Tab ──

function ThemesView({ data }: { data: any }) {
  const themes = data?.themes ?? [];
  const filings = data?.recentFilings ?? [];

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
      {/* Theme Cards */}
      <div className="px-2 py-1">
        <span className="text-[7px] font-mono text-white/25 uppercase tracking-wider">
          Investment Themes
        </span>
      </div>

      {themes.length === 0 ? (
        <div className="flex items-center justify-center py-6 text-[9px] font-mono text-white/30 uppercase tracking-widest">
          No theme data
        </div>
      ) : (
        <div className="px-2 space-y-1 pb-2">
          {themes.map((theme: any, i: number) => {
            const conv = convictionBadge(theme?.conviction);
            return (
              <div
                key={theme?.name ?? i}
                className="border border-white/[0.06] bg-white/[0.01] px-2 py-1.5"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-mono font-bold text-white/80">{theme?.name ?? '--'}</span>
                  <span
                    className="text-[6px] font-black uppercase px-1.5 py-0.5"
                    style={{ color: conv.color, backgroundColor: conv.bg }}
                  >
                    {conv.text}
                  </span>
                </div>
                <div className="flex items-center gap-3 mb-1">
                  <div>
                    <span className="text-[6px] font-mono text-white/25 uppercase tracking-wider">Positions</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      {(theme?.examplePositions ?? []).slice(0, 5).map((pos: string, j: number) => (
                        <span
                          key={j}
                          className="text-[7px] font-mono font-bold text-indigo-400 px-1 py-0 bg-indigo-400/[0.08] border border-indigo-400/20"
                        >
                          {pos}
                        </span>
                      ))}
                      {(!theme?.examplePositions || theme.examplePositions.length === 0) && (
                        <span className="text-[7px] font-mono text-white/20">--</span>
                      )}
                    </div>
                  </div>
                  <div className="ml-auto text-right">
                    <span className="text-[6px] font-mono text-white/25 uppercase tracking-wider">Capital Deployed</span>
                    <div className="text-[9px] font-mono font-bold text-white/70 mt-0.5">
                      {fmtDollar(theme?.capitalDeployed)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent Filing Activity Feed */}
      {filings.length > 0 && (
        <div className="border-t border-border/20">
          <div className="px-2 py-1">
            <span className="text-[7px] font-mono text-white/25 uppercase tracking-wider">
              Recent Filing Activity
            </span>
          </div>
          {filings.map((filing: any, i: number) => {
            const action = filing?.action;
            const actionColor = action === 'buy' || action === 'new' ? GREEN
              : action === 'sell' || action === 'exit' ? RED
              : YELLOW;
            const actionLabel = (action ?? 'unknown').toUpperCase();

            return (
              <div
                key={i}
                className="flex items-center gap-1.5 px-2 py-0.5 border-b border-border/20 hover:bg-indigo-400/[0.02] transition-colors"
              >
                <span
                  className="text-[6px] font-black font-mono uppercase px-1 py-0 shrink-0"
                  style={{ color: actionColor, backgroundColor: `${actionColor}15` }}
                >
                  {actionLabel}
                </span>
                <span className="text-[8px] font-mono font-bold text-indigo-400 shrink-0">
                  {filing?.ticker ?? '--'}
                </span>
                <span className="text-[7px] font-mono text-white/40 truncate flex-1">
                  {filing?.officeName ?? '--'}
                </span>
                <span className="text-[7px] font-mono text-white/50 shrink-0">
                  {fmtDollar(filing?.value)}
                </span>
                <span className="text-[6px] font-mono text-white/20 shrink-0">
                  {filing?.date ?? '--'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Panel ──

export function FamilyOfficePanel() {
  const t = useT();
  const { data, isLoading, refetch } = useFamilyOffice();
  const [activeView, setActiveView] = useState<ViewTab>('OFFICES');

  const tabs: ViewTab[] = ['OFFICES', 'POSITIONS', 'SECTORS', 'THEMES'];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-white/[0.08] shrink-0">
        <div className="flex items-center gap-2">
          {/* Wealth/portfolio motif icon */}
          <svg viewBox="0 0 16 16" className="w-4 h-4">
            <rect x="2" y="10" width="3" height="4" rx="0.5" fill={INDIGO} opacity="0.7" />
            <rect x="6.5" y="6" width="3" height="8" rx="0.5" fill={INDIGO} opacity="0.85" />
            <rect x="11" y="3" width="3" height="11" rx="0.5" fill={INDIGO} />
            <path d="M3.5 9L8 4L13 2" fill="none" stroke={INDIGO} strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
            <circle cx="3.5" cy="9" r="0.8" fill={INDIGO} opacity="0.5" />
            <circle cx="8" cy="4" r="0.8" fill={INDIGO} opacity="0.7" />
            <circle cx="13" cy="2" r="0.8" fill={INDIGO} />
          </svg>
          <span className="text-[9px] font-black uppercase tracking-tighter" style={{ color: INDIGO }}>
            {tr(t, 'foTitle', 'Family Office Tracker')}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {data?.timestamp && (
            <span className="text-[6px] text-white/20">
              {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-0.5 text-white/30 hover:text-indigo-400 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex items-center gap-0 px-2 py-1 border-b border-white/[0.08] bg-[#050505] shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveView(tab)}
            className={`px-2.5 py-0.5 text-[7px] font-black uppercase tracking-wider transition-all ${
              activeView === tab
                ? 'text-indigo-400 border-b border-indigo-400'
                : 'text-white/30 hover:text-white/60 border-b border-transparent'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Body */}
      {isLoading && !data ? (
        <div className="flex items-center justify-center flex-1">
          <div className="flex flex-col items-center gap-2">
            <div className="w-5 h-5 border-2 border-indigo-400/30 border-t-indigo-400 animate-spin" />
            <span className="text-[10px] text-white/40 uppercase tracking-widest">
              {tr(t, 'loading', 'Loading...')}
            </span>
          </div>
        </div>
      ) : data ? (
        <>
          {activeView === 'OFFICES' && <OfficesView data={data} />}
          {activeView === 'POSITIONS' && <PositionsView data={data} />}
          {activeView === 'SECTORS' && <SectorsView data={data} />}
          {activeView === 'THEMES' && <ThemesView data={data} />}
        </>
      ) : (
        <div className="flex items-center justify-center flex-1 text-[10px] text-white/40 uppercase tracking-widest">
          {tr(t, 'foNoData', 'No data available')}
        </div>
      )}
    </div>
  );
}
