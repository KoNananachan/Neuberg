import { useState } from 'react';
import { useCarbonCredit } from '../../api/hooks/use-carbon-credit';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// i18n helper with fallback
type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// -- Constants --

const GREEN = '#4ade80'; // green-400
const GREEN_DIM = 'rgba(74,222,128,0.12)';

type ViewTab = 'COMPLIANCE' | 'VOLUNTARY' | 'FUTURES' | 'REGULATION';

// -- Helpers --

function changeColor(val: number): string {
  if (val > 0) return 'text-emerald-400';
  if (val < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function changeSign(val: number): string {
  return val > 0 ? '+' : '';
}

function phaseBadge(phase: string): { bg: string; color: string } {
  switch (phase?.toLowerCase()) {
    case 'active':
    case 'phase iv':
    case 'operational':
      return { bg: 'rgba(74,222,128,0.15)', color: '#4ade80' };
    case 'transitioning':
    case 'phase iii':
      return { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' };
    case 'pilot':
    case 'launching':
      return { bg: 'rgba(34,211,238,0.15)', color: '#22d3ee' };
    case 'suspended':
    case 'inactive':
      return { bg: 'rgba(248,113,113,0.15)', color: '#f87171' };
    default:
      return { bg: 'rgba(113,113,122,0.15)', color: '#71717a' };
  }
}

function qualityBadge(quality: string): { bg: string; color: string } {
  switch (quality?.toLowerCase()) {
    case 'high':
    case 'gold standard':
      return { bg: 'rgba(74,222,128,0.15)', color: '#4ade80' };
    case 'medium':
    case 'silver':
      return { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' };
    case 'low':
    case 'bronze':
      return { bg: 'rgba(248,113,113,0.15)', color: '#f87171' };
    default:
      return { bg: 'rgba(113,113,122,0.15)', color: '#71717a' };
  }
}

function impactBadge(impact: string): { bg: string; color: string } {
  switch (impact?.toLowerCase()) {
    case 'bullish':
    case 'positive':
      return { bg: 'rgba(74,222,128,0.15)', color: '#4ade80' };
    case 'bearish':
    case 'negative':
      return { bg: 'rgba(248,113,113,0.15)', color: '#f87171' };
    case 'neutral':
    case 'mixed':
      return { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' };
    default:
      return { bg: 'rgba(113,113,122,0.15)', color: '#71717a' };
  }
}

// -- Main Panel --

export function CarbonCreditPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useCarbonCredit();
  const [view, setView] = useState<ViewTab>('COMPLIANCE');

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
            <path d="M8 1 C5 1 3 3 3 6 C3 9 5 11 7 13 C7.5 13.5 8.5 13.5 9 13 C11 11 13 9 13 6 C13 3 11 1 8 1 Z" stroke={GREEN} strokeWidth="0.8" fill="none" opacity="0.5" />
            <path d="M8 4 C6.5 4 5 5.5 5 7 C5 8.5 6 10 8 12 C10 10 11 8.5 11 7 C11 5.5 9.5 4 8 4 Z" fill={GREEN} opacity="0.25" />
            <text x="6.2" y="9.5" fill={GREEN} fontSize="5" fontWeight="bold" fontFamily="monospace">C</text>
            <circle cx="12" cy="3" r="1.5" fill="none" stroke={GREEN} strokeWidth="0.6" opacity="0.4" />
            <text x="10.8" y="4.3" fill={GREEN} fontSize="3" fontFamily="monospace" opacity="0.5">2</text>
          </svg>
          <span className="text-[9px] font-black uppercase tracking-tighter" style={{ color: GREEN }}>
            {tr(t, 'carbonCreditTitle', 'Carbon Credit Market')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {(['COMPLIANCE', 'VOLUNTARY', 'FUTURES', 'REGULATION'] as ViewTab[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="text-[7px] font-bold uppercase px-1.5 py-0.5 transition-colors"
              style={{
                background: view === v ? GREEN_DIM : 'transparent',
                color: view === v ? GREEN : '#737373',
              }}
            >
              {v}
            </button>
          ))}
          <button onClick={() => refetch()} className="p-1 text-neutral-500 hover:text-green-400 transition-colors ml-1">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <div className="w-4 h-4 border-2 border-green-400/30 border-t-green-400 animate-spin" />
            <span className="text-[9px] text-neutral-500 uppercase tracking-widest">
              {tr(t, 'loading', 'Loading...')}
            </span>
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-12 text-neutral-500 text-[9px] uppercase">
            {tr(t, 'carbonCreditNoData', 'No data available')}
          </div>
        )}

        {data && view === 'COMPLIANCE' && <ComplianceView data={data} />}
        {data && view === 'VOLUNTARY' && <VoluntaryView data={data} />}
        {data && view === 'FUTURES' && <FuturesView data={data} />}
        {data && view === 'REGULATION' && <RegulationView data={data} />}
      </div>
    </div>
  );
}

// -- COMPLIANCE View --

function ComplianceView({ data }: { data: any }) {
  const t = useT();
  const markets: any[] = data?.complianceMarkets ?? [];
  const metrics = data?.marketMetrics;

  return (
    <div className="text-[9px]">
      {/* Market Metrics Summary */}
      {metrics && (
        <div className="grid grid-cols-5 gap-0 border-b border-border/20 shrink-0">
          <MetricCell label="Global Mkt Value" value={metrics?.globalValue ?? '---'} color={GREEN} />
          <MetricCell label="Total Volume" value={metrics?.totalVolume ?? '---'} color="#e5e5e5" />
          <MetricCell label="Avg Price" value={metrics?.avgPrice ?? '---'} color={GREEN} />
          <MetricCell label="YTD Change" value={metrics?.ytdChange ?? '---'} color={metrics?.ytdChangeNum >= 0 ? '#4ade80' : '#f87171'} />
          <MetricCell label="Active Markets" value={metrics?.activeMarkets ?? '---'} color={GREEN} />
        </div>
      )}

      {/* Compliance Markets Table */}
      <div className="px-2 py-2">
        <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
          {tr(t, 'carbonCreditCompliance', 'Compliance Markets')}
        </div>

        {/* Header */}
        <div className="grid grid-cols-[1fr_56px_44px_44px_52px_56px_56px] gap-0 px-1 mb-0.5">
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider">Market</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Price</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">1D</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">1M</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Volume</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Mkt Cap</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right pr-1">Phase</span>
        </div>

        {/* Rows */}
        {markets.map((m: any, i: number) => {
          const phase = phaseBadge(m?.phase ?? '');
          return (
            <div
              key={i}
              className="grid grid-cols-[1fr_56px_44px_44px_52px_56px_56px] gap-0 px-1 py-[3px] hover:bg-green-400/[0.02] border-b border-border/10 items-center"
            >
              <div className="truncate">
                <span className="text-[8px] font-bold" style={{ color: GREEN }}>{m?.market ?? '---'}</span>
                {m?.region && (
                  <span className="text-[7px] text-neutral-600 ml-1">{m.region}</span>
                )}
              </div>
              <span className="text-[8px] font-bold text-right tabular-nums text-neutral-300">
                {m?.price ?? '---'}
              </span>
              <span className={`text-[8px] font-bold text-right tabular-nums ${changeColor(m?.change1d ?? 0)}`}>
                {m?.change1d != null ? `${changeSign(m.change1d)}${m.change1d}%` : '---'}
              </span>
              <span className={`text-[8px] font-bold text-right tabular-nums ${changeColor(m?.change1m ?? 0)}`}>
                {m?.change1m != null ? `${changeSign(m.change1m)}${m.change1m}%` : '---'}
              </span>
              <span className="text-[8px] text-right tabular-nums text-neutral-400">
                {m?.volume ?? '---'}
              </span>
              <span className="text-[8px] text-right tabular-nums text-neutral-400">
                {m?.marketCap ?? '---'}
              </span>
              <div className="flex justify-end pr-1">
                <span
                  className="text-[7px] font-black uppercase px-1 py-[1px]"
                  style={{ background: phase.bg, color: phase.color }}
                >
                  {m?.phase ?? '---'}
                </span>
              </div>
            </div>
          );
        })}

        {markets.length === 0 && (
          <div className="text-center py-6 text-neutral-600 text-[8px] uppercase">
            No compliance market data available
          </div>
        )}
      </div>
    </div>
  );
}

// -- VOLUNTARY View --

function VoluntaryView({ data }: { data: any }) {
  const t = useT();
  const standards: any[] = data?.voluntaryStandards ?? [];
  const projectTypes: any[] = data?.projectTypes ?? [];

  return (
    <div className="text-[9px]">
      {/* Voluntary Standards Table */}
      <div className="px-2 py-2 border-b border-border/20">
        <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
          {tr(t, 'carbonCreditVoluntary', 'Voluntary Standards')}
        </div>

        {/* Header */}
        <div className="grid grid-cols-[1fr_52px_52px_56px_48px_48px] gap-0 px-1 mb-0.5">
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider">Standard</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Avg Price</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Volume</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Retirements</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Vintage</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right pr-1">Quality</span>
        </div>

        {/* Rows */}
        {standards.map((s: any, i: number) => {
          const quality = qualityBadge(s?.quality ?? '');
          return (
            <div
              key={i}
              className="grid grid-cols-[1fr_52px_52px_56px_48px_48px] gap-0 px-1 py-[3px] hover:bg-green-400/[0.02] border-b border-border/10 items-center"
            >
              <span className="text-[8px] font-bold truncate" style={{ color: GREEN }}>
                {s?.standard ?? '---'}
              </span>
              <span className="text-[8px] font-bold text-right tabular-nums text-neutral-300">
                {s?.avgPrice ?? '---'}
              </span>
              <span className="text-[8px] text-right tabular-nums text-neutral-400">
                {s?.volume ?? '---'}
              </span>
              <span className="text-[8px] text-right tabular-nums text-neutral-400">
                {s?.retirements ?? '---'}
              </span>
              <span className="text-[8px] text-right tabular-nums text-neutral-500">
                {s?.vintage ?? '---'}
              </span>
              <div className="flex justify-end pr-1">
                <span
                  className="text-[7px] font-black uppercase px-1 py-[1px]"
                  style={{ background: quality.bg, color: quality.color }}
                >
                  {s?.quality ?? '---'}
                </span>
              </div>
            </div>
          );
        })}

        {standards.length === 0 && (
          <div className="text-center py-4 text-neutral-600 text-[8px] uppercase">
            No voluntary standard data available
          </div>
        )}
      </div>

      {/* Project Types Table */}
      <div className="px-2 py-2">
        <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
          {tr(t, 'carbonCreditProjects', 'Project Types')}
        </div>

        {/* Header */}
        <div className="grid grid-cols-[1fr_52px_52px_56px_48px] gap-0 px-1 mb-0.5">
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider">Type</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Avg Price</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Share</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Issuances</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right pr-1">Trend</span>
        </div>

        {/* Rows */}
        {projectTypes.map((p: any, i: number) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_52px_52px_56px_48px] gap-0 px-1 py-[3px] hover:bg-green-400/[0.02] border-b border-border/10 items-center"
          >
            <span className="text-[8px] font-bold text-neutral-300 truncate">{p?.type ?? '---'}</span>
            <span className="text-[8px] font-bold text-right tabular-nums text-neutral-300">
              {p?.avgPrice ?? '---'}
            </span>
            <span className="text-[8px] text-right tabular-nums" style={{ color: GREEN }}>
              {p?.share ?? '---'}
            </span>
            <span className="text-[8px] text-right tabular-nums text-neutral-400">
              {p?.issuances ?? '---'}
            </span>
            <span className={`text-[8px] font-bold text-right tabular-nums pr-1 ${changeColor(p?.trendNum ?? 0)}`}>
              {p?.trend ?? '---'}
            </span>
          </div>
        ))}

        {projectTypes.length === 0 && (
          <div className="text-center py-4 text-neutral-600 text-[8px] uppercase">
            No project type data available
          </div>
        )}
      </div>
    </div>
  );
}

// -- FUTURES View --

function FuturesView({ data }: { data: any }) {
  const t = useT();
  const futures: any[] = data?.carbonFutures ?? [];

  return (
    <div className="text-[9px]">
      <div className="px-2 py-2">
        <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
          {tr(t, 'carbonCreditFutures', 'Carbon Futures')}
        </div>

        {/* Header */}
        <div className="grid grid-cols-[1fr_56px_44px_60px_52px_56px] gap-0 px-1 mb-0.5">
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider">Contract</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Price</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Change</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Open Interest</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Contango</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right pr-1">Expiry</span>
        </div>

        {/* Rows */}
        {futures.map((f: any, i: number) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_56px_44px_60px_52px_56px] gap-0 px-1 py-[3px] hover:bg-green-400/[0.02] border-b border-border/10 items-center"
          >
            <span className="text-[8px] font-bold truncate" style={{ color: GREEN }}>
              {f?.contract ?? '---'}
            </span>
            <span className="text-[8px] font-bold text-right tabular-nums text-neutral-300">
              {f?.price ?? '---'}
            </span>
            <span className={`text-[8px] font-bold text-right tabular-nums ${changeColor(f?.changeNum ?? 0)}`}>
              {f?.change ?? '---'}
            </span>
            <span className="text-[8px] text-right tabular-nums text-neutral-400">
              {f?.openInterest ?? '---'}
            </span>
            <span className={`text-[8px] font-bold text-right tabular-nums ${f?.contangoNum > 0 ? 'text-emerald-400' : f?.contangoNum < 0 ? 'text-red-400' : 'text-neutral-400'}`}>
              {f?.contango ?? '---'}
            </span>
            <span className="text-[8px] text-right tabular-nums text-neutral-500 pr-1">
              {f?.expiry ?? '---'}
            </span>
          </div>
        ))}

        {futures.length === 0 && (
          <div className="text-center py-6 text-neutral-600 text-[8px] uppercase">
            No futures data available
          </div>
        )}
      </div>
    </div>
  );
}

// -- REGULATION View --

function RegulationView({ data }: { data: any }) {
  const t = useT();
  const updates: any[] = data?.regulatoryUpdates ?? [];

  return (
    <div className="text-[9px]">
      <div className="px-2 py-2">
        <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
          {tr(t, 'carbonCreditRegulation', 'Regulatory Updates')}
        </div>

        {updates.map((u: any, i: number) => {
          const impact = impactBadge(u?.impact ?? '');
          return (
            <div
              key={i}
              className="px-2 py-2 border-b border-border/10 hover:bg-green-400/[0.02] transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-black uppercase" style={{ color: GREEN }}>
                    {u?.jurisdiction ?? '---'}
                  </span>
                  {u?.date && (
                    <span className="text-[7px] text-neutral-600">{u.date}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {u?.priceImpact && (
                    <span className={`text-[7px] font-bold tabular-nums ${changeColor(u?.priceImpactNum ?? 0)}`}>
                      {u.priceImpact}
                    </span>
                  )}
                  <span
                    className="text-[7px] font-black uppercase px-1 py-[1px]"
                    style={{ background: impact.bg, color: impact.color }}
                  >
                    {u?.impact ?? '---'}
                  </span>
                </div>
              </div>
              <div className="text-[8px] text-neutral-300 leading-relaxed">
                {u?.update ?? '---'}
              </div>
              {u?.details && (
                <div className="text-[7px] text-neutral-600 mt-0.5 leading-relaxed">
                  {u.details}
                </div>
              )}
            </div>
          );
        })}

        {updates.length === 0 && (
          <div className="text-center py-6 text-neutral-600 text-[8px] uppercase">
            No regulatory updates available
          </div>
        )}
      </div>
    </div>
  );
}

// -- Shared Components --

function MetricCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="px-2 py-1.5 border-r border-border/10 last:border-r-0">
      <div className="text-[6px] text-neutral-600 uppercase tracking-wider">{label}</div>
      <div className="text-[11px] font-black tabular-nums mt-0.5" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
