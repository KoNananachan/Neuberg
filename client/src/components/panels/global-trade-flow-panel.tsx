import { useGlobalTradeFlow } from '../../api/hooks/use-global-trade-flow';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// i18n fallback helper
const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// ── Constants ──

const CYAN = '#22d3ee';
const GREEN = '#34d399';
const RED = '#f87171';
const YELLOW = '#fbbf24';
const ORANGE = '#fb923c';

// ── Country flags ──

const FLAG_MAP: Record<string, string> = {
  US: '\u{1F1FA}\u{1F1F8}', CN: '\u{1F1E8}\u{1F1F3}', JP: '\u{1F1EF}\u{1F1F5}', DE: '\u{1F1E9}\u{1F1EA}',
  GB: '\u{1F1EC}\u{1F1E7}', FR: '\u{1F1EB}\u{1F1F7}', IT: '\u{1F1EE}\u{1F1F9}', ES: '\u{1F1EA}\u{1F1F8}',
  KR: '\u{1F1F0}\u{1F1F7}', BR: '\u{1F1E7}\u{1F1F7}', IN: '\u{1F1EE}\u{1F1F3}', MX: '\u{1F1F2}\u{1F1FD}',
  NL: '\u{1F1F3}\u{1F1F1}', CA: '\u{1F1E8}\u{1F1E6}', AU: '\u{1F1E6}\u{1F1FA}', SG: '\u{1F1F8}\u{1F1EC}',
  CH: '\u{1F1E8}\u{1F1ED}', TW: '\u{1F1F9}\u{1F1FC}', SA: '\u{1F1F8}\u{1F1E6}', VN: '\u{1F1FB}\u{1F1F3}',
};

// ── Number formatting ──

function fmtBn(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1000) return (n / 1000).toFixed(1) + 'T';
  return n.toFixed(0) + 'B';
}

function fmtPct(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
}

function fmtTariff(n: number): string {
  return n.toFixed(1) + '%';
}

// ── Color helpers ──

function balanceColor(n: number): string {
  if (n > 0) return GREEN;
  if (n < 0) return RED;
  return 'rgba(255,255,255,0.3)';
}

function growthColor(n: number): string {
  if (n > 3) return GREEN;
  if (n > 0) return '#6ee7b7';
  if (n > -3) return ORANGE;
  return RED;
}

function pressureColor(value: number): string {
  if (value >= 75) return RED;
  if (value >= 50) return ORANGE;
  if (value >= 25) return YELLOW;
  return GREEN;
}

function trendBadgeStyle(trend: string): { text: string; color: string; bg: string } {
  switch (trend) {
    case 'expanding': return { text: 'EXPANDING', color: GREEN, bg: 'rgba(52,211,153,0.12)' };
    case 'stable': return { text: 'STABLE', color: YELLOW, bg: 'rgba(251,191,36,0.1)' };
    case 'contracting': return { text: 'CONTRACTING', color: RED, bg: 'rgba(248,113,113,0.12)' };
    case 'surging': return { text: 'SURGING', color: '#34d399', bg: 'rgba(52,211,153,0.18)' };
    case 'declining': return { text: 'DECLINING', color: ORANGE, bg: 'rgba(251,146,60,0.12)' };
    default: return { text: trend.toUpperCase(), color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.03)' };
  }
}

function statusBadgeStyle(status: string): { text: string; color: string; bg: string } {
  switch (status) {
    case 'active': return { text: 'ACTIVE', color: RED, bg: 'rgba(248,113,113,0.15)' };
    case 'proposed': return { text: 'PROPOSED', color: YELLOW, bg: 'rgba(251,191,36,0.12)' };
    case 'suspended': return { text: 'SUSPENDED', color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.05)' };
    case 'retaliatory': return { text: 'RETALIATORY', color: ORANGE, bg: 'rgba(251,146,60,0.15)' };
    default: return { text: status.toUpperCase(), color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.03)' };
  }
}

// ── Section header ──

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center px-2 py-1 bg-[#050505] border-b border-border/20">
      <span className="text-[7px] font-mono font-black uppercase tracking-wider text-cyan-400/60">
        {label}
      </span>
    </div>
  );
}

// ── Pressure bar ──

function PressureBar({ value, label }: { value: number; label: string }) {
  const color = pressureColor(value);
  return (
    <div className="flex items-center gap-1">
      <span className="w-16 text-[7px] font-mono text-white/30 truncate shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-white/[0.03] relative">
        <div
          className="absolute top-0 left-0 h-full"
          style={{ width: `${Math.min(value, 100)}%`, backgroundColor: color, opacity: 0.6 }}
        />
      </div>
      <span className="w-8 text-[8px] font-mono font-bold text-right shrink-0" style={{ color }}>
        {value.toFixed(0)}
      </span>
    </div>
  );
}

// ── Main Panel ──

export function GlobalTradeFlowPanel() {
  const t = useT();
  const { data, isLoading, error } = useGlobalTradeFlow();
  const d = data as any;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 16 16" className="w-4 h-4">
            <circle cx="5" cy="6" r="2.5" fill="none" stroke={CYAN} strokeWidth="0.8" />
            <circle cx="11" cy="6" r="2.5" fill="none" stroke={CYAN} strokeWidth="0.8" />
            <circle cx="8" cy="12" r="2.5" fill="none" stroke={CYAN} strokeWidth="0.8" />
            <line x1="7" y1="5" x2="9.5" y2="5" stroke={CYAN} strokeWidth="0.5" opacity="0.5" />
            <line x1="6" y1="8" x2="7" y2="10" stroke={CYAN} strokeWidth="0.5" opacity="0.5" />
            <line x1="10" y1="8" x2="9" y2="10" stroke={CYAN} strokeWidth="0.5" opacity="0.5" />
          </svg>
          <span className="text-[9px] font-black uppercase tracking-tighter text-cyan-400">
            {tr(t, 'globalTradeFlowTitle', 'Global Trade Flow')}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {d?.timestamp && (
            <span className="text-[6px] text-white/20">
              {new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button className="p-0.5 text-white/30 hover:text-cyan-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading && !data ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
              <span className="text-[10px] text-white/40 uppercase tracking-widest">
                {tr(t, 'loading', 'Loading...')}
              </span>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-[10px] text-red-400 uppercase tracking-widest">
            FAILED TO LOAD
          </div>
        ) : d ? (
          <>
            {/* ── 1. Country Data ── */}
            <SectionHeader label="Country Trade Data" />
            <div className="overflow-x-auto">
              <table className="w-full text-[9px] font-mono">
                <thead className="sticky top-0 bg-[#080808] z-10">
                  <tr className="border-b border-border/20">
                    <th className="px-1.5 py-1 text-left text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Country</th>
                    <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Exports</th>
                    <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Imports</th>
                    <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Balance</th>
                    <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Exp YoY</th>
                    <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Imp YoY</th>
                    <th className="px-1.5 py-1 text-left text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Top Partner</th>
                  </tr>
                </thead>
                <tbody>
                  {d.countries?.slice(0, 15).map((c: any, i: number) => {
                    const balance = (c.exports ?? 0) - (c.imports ?? 0);
                    return (
                      <tr key={c.code || i} className="border-b border-border/10 hover:bg-cyan-400/[0.02] transition-colors">
                        <td className="px-1.5 py-1 whitespace-nowrap text-white font-bold">
                          {FLAG_MAP[c.code] || ''} {c.code || c.name}
                        </td>
                        <td className="px-1.5 py-1 text-right whitespace-nowrap text-white/60">
                          ${fmtBn(c.exports)}
                        </td>
                        <td className="px-1.5 py-1 text-right whitespace-nowrap text-white/60">
                          ${fmtBn(c.imports)}
                        </td>
                        <td className="px-1.5 py-1 text-right whitespace-nowrap font-bold" style={{ color: balanceColor(balance) }}>
                          {balance >= 0 ? '+' : ''}{fmtBn(balance)}
                        </td>
                        <td className="px-1.5 py-1 text-right whitespace-nowrap" style={{ color: growthColor(c.exportGrowthYoy ?? 0) }}>
                          {fmtPct(c.exportGrowthYoy ?? 0)}
                        </td>
                        <td className="px-1.5 py-1 text-right whitespace-nowrap" style={{ color: growthColor(c.importGrowthYoy ?? 0) }}>
                          {fmtPct(c.importGrowthYoy ?? 0)}
                        </td>
                        <td className="px-1.5 py-1 whitespace-nowrap text-white/40 truncate max-w-[80px]">
                          {c.topPartner || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── 2. Bilateral Flows ── */}
            <SectionHeader label="Bilateral Trade Corridors" />
            <div className="overflow-x-auto">
              <table className="w-full text-[9px] font-mono">
                <thead className="sticky top-0 bg-[#080808] z-10">
                  <tr className="border-b border-border/20">
                    <th className="px-1.5 py-1 text-left text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Corridor</th>
                    <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Volume</th>
                    <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Balance</th>
                    <th className="px-1.5 py-1 text-center text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Trend</th>
                    <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Tariff</th>
                  </tr>
                </thead>
                <tbody>
                  {d.bilateralFlows?.map((flow: any, i: number) => {
                    const badge = trendBadgeStyle(flow.trend || 'stable');
                    return (
                      <tr key={i} className="border-b border-border/10 hover:bg-cyan-400/[0.02] transition-colors">
                        <td className="px-1.5 py-1 whitespace-nowrap">
                          <span className="text-white font-bold">{flow.from}</span>
                          <span className="text-cyan-400/40 mx-1">{'\u2192'}</span>
                          <span className="text-white font-bold">{flow.to}</span>
                        </td>
                        <td className="px-1.5 py-1 text-right whitespace-nowrap text-white/60">
                          ${fmtBn(flow.volume ?? 0)}
                        </td>
                        <td className="px-1.5 py-1 text-right whitespace-nowrap font-bold" style={{ color: balanceColor(flow.balance ?? 0) }}>
                          {(flow.balance ?? 0) >= 0 ? '+' : ''}{fmtBn(flow.balance ?? 0)}
                        </td>
                        <td className="px-1.5 py-1 text-center whitespace-nowrap">
                          <span
                            className="text-[6px] font-black uppercase px-1 py-0.5"
                            style={{ color: badge.color, backgroundColor: badge.bg }}
                          >
                            {badge.text}
                          </span>
                        </td>
                        <td className="px-1.5 py-1 text-right whitespace-nowrap text-white/50">
                          {flow.tariffRate != null ? fmtTariff(flow.tariffRate) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── 3. Supply Chain Pressure ── */}
            <SectionHeader label="Supply Chain Pressure Index" />
            <div className="px-2 py-1.5 space-y-1.5">
              {/* Composite index */}
              {d.supplyChain && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[8px] font-mono text-white/40 uppercase">Composite:</span>
                  <span
                    className="text-[12px] font-black font-mono"
                    style={{ color: pressureColor(d.supplyChain.composite ?? 0) }}
                  >
                    {(d.supplyChain.composite ?? 0).toFixed(1)}
                  </span>
                  {d.supplyChain.trend && (() => {
                    const badge = trendBadgeStyle(d.supplyChain.trend);
                    return (
                      <span
                        className="text-[6px] font-black uppercase px-1 py-0.5"
                        style={{ color: badge.color, backgroundColor: badge.bg }}
                      >
                        {badge.text}
                      </span>
                    );
                  })()}
                </div>
              )}

              {/* Component bars */}
              {d.supplyChain?.components?.map((comp: any, i: number) => (
                <PressureBar key={i} value={comp.value ?? 0} label={comp.name || comp.label || ''} />
              ))}

              {/* Fallback: individual fields if no components array */}
              {d.supplyChain && !d.supplyChain.components && (
                <>
                  {d.supplyChain.shipping != null && (
                    <PressureBar value={d.supplyChain.shipping} label="Shipping" />
                  )}
                  {d.supplyChain.delivery != null && (
                    <PressureBar value={d.supplyChain.delivery} label="Delivery" />
                  )}
                  {d.supplyChain.backlogs != null && (
                    <PressureBar value={d.supplyChain.backlogs} label="Backlogs" />
                  )}
                </>
              )}
            </div>

            {/* ── 4. Tariff Tracker ── */}
            <SectionHeader label="Tariff Tracker" />
            <div className="overflow-x-auto">
              <table className="w-full text-[9px] font-mono">
                <thead className="sticky top-0 bg-[#080808] z-10">
                  <tr className="border-b border-border/20">
                    <th className="px-1.5 py-1 text-left text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Countries</th>
                    <th className="px-1.5 py-1 text-left text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Product</th>
                    <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Rate</th>
                    <th className="px-1.5 py-1 text-left text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Impact</th>
                    <th className="px-1.5 py-1 text-center text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {d.tariffs?.map((tariff: any, i: number) => {
                    const badge = statusBadgeStyle(tariff.status || 'active');
                    return (
                      <tr key={i} className="border-b border-border/10 hover:bg-cyan-400/[0.02] transition-colors">
                        <td className="px-1.5 py-1 whitespace-nowrap">
                          <span className="text-white font-bold">{tariff.imposer || tariff.from}</span>
                          <span className="text-cyan-400/40 mx-1">{'\u2192'}</span>
                          <span className="text-white/60">{tariff.target || tariff.to}</span>
                        </td>
                        <td className="px-1.5 py-1 whitespace-nowrap text-white/50 truncate max-w-[100px]">
                          {tariff.product || '-'}
                        </td>
                        <td className="px-1.5 py-1 text-right whitespace-nowrap font-bold text-cyan-400">
                          {tariff.rate != null ? fmtTariff(tariff.rate) : '-'}
                        </td>
                        <td className="px-1.5 py-1 whitespace-nowrap text-white/40 truncate max-w-[120px]">
                          {tariff.impact || '-'}
                        </td>
                        <td className="px-1.5 py-1 text-center whitespace-nowrap">
                          <span
                            className="text-[6px] font-black uppercase px-1 py-0.5"
                            style={{ color: badge.color, backgroundColor: badge.bg }}
                          >
                            {badge.text}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── 5. Commodity Trade ── */}
            <SectionHeader label="Commodity Trade" />
            <div className="overflow-x-auto">
              <table className="w-full text-[9px] font-mono">
                <thead className="sticky top-0 bg-[#080808] z-10">
                  <tr className="border-b border-border/20">
                    <th className="px-1.5 py-1 text-left text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Commodity</th>
                    <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Volume</th>
                    <th className="px-1.5 py-1 text-left text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Top Exporters</th>
                    <th className="px-1.5 py-1 text-left text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Top Importers</th>
                    <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Price Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {d.commodities?.map((commodity: any, i: number) => (
                    <tr key={i} className="border-b border-border/10 hover:bg-cyan-400/[0.02] transition-colors">
                      <td className="px-1.5 py-1 whitespace-nowrap text-white font-bold">
                        {commodity.name}
                      </td>
                      <td className="px-1.5 py-1 text-right whitespace-nowrap text-white/60">
                        {commodity.volume != null ? fmtBn(commodity.volume) : '-'}
                      </td>
                      <td className="px-1.5 py-1 whitespace-nowrap text-white/40 truncate max-w-[100px]">
                        {Array.isArray(commodity.exporters) ? commodity.exporters.join(', ') : (commodity.exporters || '-')}
                      </td>
                      <td className="px-1.5 py-1 whitespace-nowrap text-white/40 truncate max-w-[100px]">
                        {Array.isArray(commodity.importers) ? commodity.importers.join(', ') : (commodity.importers || '-')}
                      </td>
                      <td className="px-1.5 py-1 text-right whitespace-nowrap font-bold" style={{ color: (commodity.priceImpact ?? 0) >= 0 ? GREEN : RED }}>
                        {commodity.priceImpact != null ? fmtPct(commodity.priceImpact) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-[10px] text-white/40 uppercase">
            No data available
          </div>
        )}
      </div>
    </div>
  );
}
