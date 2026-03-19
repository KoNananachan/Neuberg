import { useGlobalTradeFlow } from '../../api/hooks/use-global-trade-flow';
import { useT } from '../../i18n';

// i18n helper with fallback
const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// ── Constants ──

const CYAN = '#22d3ee'; // cyan-400
const GREEN = '#34d399';
const RED = '#f87171';
const YELLOW = '#fbbf24';

// ── Number formatting ──

function fmtVol(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'T';
  if (abs >= 1_000) return (n / 1_000).toFixed(1) + 'B';
  return n.toFixed(1) + 'M';
}

function fmtUsd(n: number): string {
  return '$' + fmtVol(n);
}

function fmtPct(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}

function pctColor(n: number): string {
  if (n > 0) return GREEN;
  if (n < 0) return RED;
  return 'rgba(255,255,255,0.4)';
}

function balanceColor(n: number): string {
  if (n > 0) return GREEN;
  if (n < 0) return RED;
  return 'rgba(255,255,255,0.4)';
}

// ── Trend badge ──

function trendBadge(trend: string): { text: string; color: string; bg: string } {
  switch (trend) {
    case 'rising': return { text: 'RISING', color: RED, bg: 'rgba(248,113,113,0.12)' };
    case 'falling': return { text: 'FALLING', color: GREEN, bg: 'rgba(52,211,153,0.12)' };
    case 'stable': return { text: 'STABLE', color: YELLOW, bg: 'rgba(251,191,36,0.1)' };
    default: return { text: trend?.toUpperCase?.() || '--', color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.03)' };
  }
}

// ── Status badge ──

function statusBadge(status: string): { text: string; color: string; bg: string } {
  switch (status) {
    case 'active': return { text: 'ACTIVE', color: RED, bg: 'rgba(248,113,113,0.15)' };
    case 'resolved': return { text: 'RESOLVED', color: GREEN, bg: 'rgba(52,211,153,0.12)' };
    case 'monitoring': return { text: 'MONITORING', color: YELLOW, bg: 'rgba(251,191,36,0.1)' };
    default: return { text: status?.toUpperCase?.() || '--', color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.03)' };
  }
}

// ── Section header ──

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-2 py-1 border-b border-cyan-400/10">
      <span className="text-[7px] font-mono font-black uppercase tracking-wider" style={{ color: CYAN }}>
        {label}
      </span>
    </div>
  );
}

// ── Main Panel ──

export function GlobalTradeFlowPanel() {
  const t = useT();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, isLoading } = useGlobalTradeFlow() as { data: any; isLoading: boolean };

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 16 16" className="w-4 h-4">
            <circle cx="4" cy="8" r="2.5" fill="none" stroke={CYAN} strokeWidth="0.8" />
            <circle cx="12" cy="8" r="2.5" fill="none" stroke={CYAN} strokeWidth="0.8" />
            <path d="M6.5 7L9.5 7" stroke={CYAN} strokeWidth="0.6" />
            <path d="M6.5 9L9.5 9" stroke={CYAN} strokeWidth="0.6" />
            <path d="M8 4L8 12" stroke={CYAN} strokeWidth="0.3" opacity="0.4" />
          </svg>
          <span className="text-[9px] font-black uppercase tracking-tighter" style={{ color: CYAN }}>
            {tr(t, 'panelGlobalTradeFlow', 'GLOBAL TRADE FLOW')}
          </span>
        </div>
        {data?.timestamp && (
          <span className="text-[6px] text-white/20">
            {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
        {isLoading && !data ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-[10px] text-white/40 uppercase tracking-widest">
              LOADING TRADE FLOW DATA...
            </span>
          </div>
        ) : data ? (
          <>
            {/* ── Global Summary Bar ── */}
            {data.summary && (
              <div className="grid grid-cols-4 border-b border-border/20">
                {[
                  { label: 'WORLD TRADE VOL', value: fmtUsd(data.summary.worldTradeVolume) },
                  { label: 'YOY GROWTH', value: fmtPct(data.summary.yoyGrowth), color: pctColor(data.summary.yoyGrowth) },
                  { label: 'TRADE/GDP', value: data.summary.tradeToGdp?.toFixed(1) + '%' },
                  { label: 'CONTAINER THRU', value: fmtVol(data.summary.containerThroughput) },
                ].map((item) => (
                  <div key={item.label} className="px-2 py-1.5 border-r border-border/20 last:border-r-0">
                    <div className="text-[6px] text-white/25 uppercase tracking-wider">{item.label}</div>
                    <div className="text-[10px] font-bold mt-0.5" style={{ color: item.color || CYAN }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Top Exporters ── */}
            {data.topExporters?.length > 0 && (
              <div>
                <SectionHeader label="TOP EXPORTERS" />
                <div className="overflow-x-auto">
                  {/* Table header */}
                  <div className="flex items-center px-2 py-0.5 border-b border-white/[0.06] text-[6px] text-white/20 uppercase tracking-wider min-w-[600px]">
                    <span className="w-16 shrink-0">COUNTRY</span>
                    <span className="w-14 text-right shrink-0">EXPORTS</span>
                    <span className="w-14 text-right shrink-0">IMPORTS</span>
                    <span className="w-14 text-right shrink-0">BALANCE</span>
                    <span className="w-12 text-right shrink-0">EXP YOY</span>
                    <span className="w-12 text-right shrink-0">IMP YOY</span>
                    <span className="flex-1 text-right">TOP PARTNERS</span>
                  </div>
                  {/* Table rows */}
                  {data.topExporters.map((row: any, i: number) => (
                    <div
                      key={row.country || i}
                      className="flex items-center px-2 py-0.5 border-b border-white/[0.03] hover:bg-cyan-400/[0.02] transition-colors min-w-[600px]"
                    >
                      <span className="w-16 text-white/60 font-bold truncate shrink-0">{row.country}</span>
                      <span className="w-14 text-right text-white/50 shrink-0">{fmtUsd(row.exports)}</span>
                      <span className="w-14 text-right text-white/50 shrink-0">{fmtUsd(row.imports)}</span>
                      <span className="w-14 text-right font-bold shrink-0" style={{ color: balanceColor(row.tradeBalance) }}>
                        {(row.tradeBalance >= 0 ? '+' : '') + fmtUsd(row.tradeBalance)}
                      </span>
                      <span className="w-12 text-right shrink-0" style={{ color: pctColor(row.exportYoy) }}>
                        {fmtPct(row.exportYoy)}
                      </span>
                      <span className="w-12 text-right shrink-0" style={{ color: pctColor(row.importYoy) }}>
                        {fmtPct(row.importYoy)}
                      </span>
                      <span className="flex-1 text-right text-white/30 truncate">
                        {Array.isArray(row.topPartners) ? row.topPartners.join(', ') : row.topPartners || '--'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Trade Lanes ── */}
            {data.tradeLanes?.length > 0 && (
              <div>
                <SectionHeader label="TRADE LANES" />
                <div className="overflow-x-auto">
                  <div className="flex items-center px-2 py-0.5 border-b border-white/[0.06] text-[6px] text-white/20 uppercase tracking-wider min-w-[500px]">
                    <span className="w-28 shrink-0">BILATERAL FLOW</span>
                    <span className="w-14 text-right shrink-0">VOLUME</span>
                    <span className="w-12 text-right shrink-0">YOY</span>
                    <span className="flex-1 text-right">KEY GOODS</span>
                  </div>
                  {data.tradeLanes.map((lane: any, i: number) => (
                    <div
                      key={lane.bilateralFlow || i}
                      className="flex items-center px-2 py-0.5 border-b border-white/[0.03] hover:bg-cyan-400/[0.02] transition-colors min-w-[500px]"
                    >
                      <span className="w-28 text-white/60 font-bold truncate shrink-0">{lane.bilateralFlow}</span>
                      <span className="w-14 text-right text-white/50 shrink-0">{fmtUsd(lane.volume)}</span>
                      <span className="w-12 text-right font-bold shrink-0" style={{ color: pctColor(lane.yoyChange) }}>
                        {fmtPct(lane.yoyChange)}
                      </span>
                      <span className="flex-1 text-right text-white/30 truncate">
                        {Array.isArray(lane.keyGoods) ? lane.keyGoods.join(', ') : lane.keyGoods || '--'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Commodity Trade ── */}
            {data.commodityTrade?.length > 0 && (
              <div>
                <SectionHeader label="COMMODITY TRADE" />
                <div className="overflow-x-auto">
                  <div className="flex items-center px-2 py-0.5 border-b border-white/[0.06] text-[6px] text-white/20 uppercase tracking-wider min-w-[560px]">
                    <span className="w-20 shrink-0">COMMODITY</span>
                    <span className="w-14 text-right shrink-0">GLOBAL VOL</span>
                    <span className="w-16 shrink-0 text-right">TOP EXPORTER</span>
                    <span className="w-16 shrink-0 text-right">TOP IMPORTER</span>
                    <span className="w-12 text-right shrink-0">PRICE IDX</span>
                    <span className="w-12 text-right shrink-0">VOL CHG</span>
                  </div>
                  {data.commodityTrade.map((c: any, i: number) => (
                    <div
                      key={c.commodity || i}
                      className="flex items-center px-2 py-0.5 border-b border-white/[0.03] hover:bg-cyan-400/[0.02] transition-colors min-w-[560px]"
                    >
                      <span className="w-20 text-white/60 font-bold truncate shrink-0">{c.commodity}</span>
                      <span className="w-14 text-right text-white/50 shrink-0">{fmtUsd(c.globalVolume)}</span>
                      <span className="w-16 text-right text-white/40 truncate shrink-0">{c.topExporter}</span>
                      <span className="w-16 text-right text-white/40 truncate shrink-0">{c.topImporter}</span>
                      <span className="w-12 text-right text-white/50 shrink-0">{c.priceIndex?.toFixed(1)}</span>
                      <span className="w-12 text-right font-bold shrink-0" style={{ color: pctColor(c.volumeChange) }}>
                        {fmtPct(c.volumeChange)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Tariff Data ── */}
            {data.tariffData?.length > 0 && (
              <div>
                <SectionHeader label="TARIFF DATA" />
                <div className="overflow-x-auto">
                  <div className="flex items-center px-2 py-0.5 border-b border-white/[0.06] text-[6px] text-white/20 uppercase tracking-wider min-w-[420px]">
                    <span className="w-16 shrink-0">COUNTRY</span>
                    <span className="w-14 text-right shrink-0">MFN RATE</span>
                    <span className="w-14 text-right shrink-0">APPLIED</span>
                    <span className="flex-1 text-right">TREND</span>
                  </div>
                  {data.tariffData.map((td: any, i: number) => {
                    const badge = trendBadge(td.trend);
                    return (
                      <div
                        key={td.country || i}
                        className="flex items-center px-2 py-0.5 border-b border-white/[0.03] hover:bg-cyan-400/[0.02] transition-colors min-w-[420px]"
                      >
                        <span className="w-16 text-white/60 font-bold truncate shrink-0">{td.country}</span>
                        <span className="w-14 text-right text-white/50 shrink-0">{td.mfnRate?.toFixed(1)}%</span>
                        <span className="w-14 text-right text-white/50 shrink-0">{td.appliedRate?.toFixed(1)}%</span>
                        <span className="flex-1 flex justify-end">
                          <span
                            className="text-[6px] font-black font-mono uppercase px-1.5 py-0.5"
                            style={{ color: badge.color, backgroundColor: badge.bg }}
                          >
                            {badge.text}
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Trade Disruptions ── */}
            {data.tradeDisruptions?.length > 0 && (
              <div>
                <SectionHeader label="TRADE DISRUPTIONS" />
                {data.tradeDisruptions.map((d: any, i: number) => {
                  const badge = statusBadge(d.status);
                  return (
                    <div
                      key={d.description || i}
                      className="px-2 py-1 border-b border-white/[0.03] hover:bg-cyan-400/[0.02] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[8px] text-white/60 font-bold leading-snug flex-1">
                          {d.description}
                        </span>
                        <span
                          className="text-[6px] font-black font-mono uppercase px-1.5 py-0.5 shrink-0"
                          style={{ color: badge.color, backgroundColor: badge.bg }}
                        >
                          {badge.text}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[7px] text-white/25">
                          ROUTES: <span className="text-white/40">{Array.isArray(d.affectedRoutes) ? d.affectedRoutes.join(', ') : d.affectedRoutes || '--'}</span>
                        </span>
                        <span className="text-[7px] text-white/25">
                          IMPACT: <span className="text-white/40">{d.impactEstimate || '--'}</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-[10px] text-white/40 uppercase">
            NO DATA AVAILABLE
          </div>
        )}
      </div>
    </div>
  );
}
