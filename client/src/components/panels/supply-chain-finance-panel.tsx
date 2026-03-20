import { useState } from 'react';
import { useSupplyChainFinance } from '../../api/hooks/use-supply-chain-finance';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// i18n helper with fallback
// -- Constants --

const SKY = '#38bdf8';
const SKY_DIM = 'rgba(56,189,248,0.12)';

type ViewTab = 'OVERVIEW' | 'PROGRAMS' | 'INSTRUMENTS' | 'TECH';

// -- Color helpers --

function changeColor(val: number): string {
  if (val > 0) return 'text-emerald-400';
  if (val < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function changeSign(val: number): string {
  return val > 0 ? '+' : '';
}

function riskBadge(level: string): { text: string; bg: string; color: string } {
  switch (level) {
    case 'low':
      return { text: 'LOW', bg: 'rgba(52,211,153,0.15)', color: '#34d399' };
    case 'moderate':
      return { text: 'MODERATE', bg: 'rgba(56,189,248,0.15)', color: '#38bdf8' };
    case 'elevated':
      return { text: 'ELEVATED', bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' };
    case 'high':
      return { text: 'HIGH', bg: 'rgba(251,146,60,0.15)', color: '#fb923c' };
    case 'critical':
      return { text: 'CRITICAL', bg: 'rgba(248,113,113,0.15)', color: '#f87171' };
    default:
      return { text: level.toUpperCase(), bg: 'rgba(113,113,122,0.15)', color: '#71717a' };
  }
}

function ratingBadge(rating: string): { color: string } {
  if (rating.startsWith('AAA') || rating.startsWith('AA')) return { color: '#34d399' };
  if (rating.startsWith('A')) return { color: '#38bdf8' };
  if (rating.startsWith('BBB')) return { color: '#fbbf24' };
  if (rating.startsWith('BB')) return { color: '#fb923c' };
  return { color: '#f87171' };
}

function impactBadge(impact: string): { text: string; bg: string; color: string } {
  switch (impact) {
    case 'high':
      return { text: 'HIGH', bg: 'rgba(52,211,153,0.15)', color: '#34d399' };
    case 'medium':
      return { text: 'MEDIUM', bg: 'rgba(56,189,248,0.15)', color: '#38bdf8' };
    case 'low':
      return { text: 'LOW', bg: 'rgba(113,113,122,0.15)', color: '#71717a' };
    case 'transformative':
      return { text: 'TRANSFORMATIVE', bg: 'rgba(168,85,247,0.15)', color: '#a855f7' };
    default:
      return { text: impact.toUpperCase(), bg: 'rgba(113,113,122,0.15)', color: '#71717a' };
  }
}

// -- Main Panel --

export function SupplyChainFinancePanel() {
  const t = useT();
  const { data, isLoading, refetch } = useSupplyChainFinance();
  const [view, setView] = useState<ViewTab>('OVERVIEW');

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
            <circle cx="4" cy="8" r="2.5" stroke={SKY} strokeWidth="1" fill="none" />
            <circle cx="12" cy="8" r="2.5" stroke={SKY} strokeWidth="1" fill="none" />
            <line x1="6.5" y1="8" x2="9.5" y2="8" stroke={SKY} strokeWidth="1" />
            <circle cx="8" cy="3" r="1.8" stroke={SKY} strokeWidth="0.8" fill="none" opacity="0.5" />
            <line x1="6" y1="6.5" x2="7" y2="4.5" stroke={SKY} strokeWidth="0.6" opacity="0.4" />
            <line x1="10" y1="6.5" x2="9" y2="4.5" stroke={SKY} strokeWidth="0.6" opacity="0.4" />
            <circle cx="8" cy="13" r="1.8" stroke={SKY} strokeWidth="0.8" fill="none" opacity="0.5" />
            <line x1="6" y1="9.5" x2="7" y2="11.5" stroke={SKY} strokeWidth="0.6" opacity="0.4" />
            <line x1="10" y1="9.5" x2="9" y2="11.5" stroke={SKY} strokeWidth="0.6" opacity="0.4" />
          </svg>
          <span className="text-[9px] font-black uppercase tracking-tighter" style={{ color: SKY }}>
            {tr(t, 'scfTitle', 'Supply Chain Finance')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {(['OVERVIEW', 'PROGRAMS', 'INSTRUMENTS', 'TECH'] as ViewTab[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="text-[7px] font-bold uppercase px-1.5 py-0.5 transition-colors"
              style={{
                background: view === v ? SKY_DIM : 'transparent',
                color: view === v ? SKY : '#737373',
              }}
            >
              {v}
            </button>
          ))}
          <button onClick={() => refetch()} className="p-1 text-neutral-500 hover:text-sky-400 transition-colors ml-1">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <div className="w-4 h-4 border-2 border-sky-400/30 border-t-sky-400 animate-spin" />
            <span className="text-[9px] text-neutral-500 uppercase tracking-widest">
              {tr(t, 'loading', 'Loading...')}
            </span>
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-12 text-neutral-500 text-[9px] uppercase">
            {tr(t, 'scfNoData', 'No data available')}
          </div>
        )}

        {data && view === 'OVERVIEW' && <OverviewView data={data} />}
        {data && view === 'PROGRAMS' && <ProgramsView data={data} />}
        {data && view === 'INSTRUMENTS' && <InstrumentsView data={data} />}
        {data && view === 'TECH' && <TechView data={data} />}
      </div>
    </div>
  );
}

// -- OVERVIEW View --

function OverviewView({ data }: { data: any }) {
  const t = useT();
  const overview = data?.overview;
  const risks: any[] = data?.riskIndicators ?? [];
  const regions: any[] = data?.regionalBreakdown ?? [];

  const metrics = [
    { label: tr(t, 'scfTotalSize', 'Total Market Size'), value: overview?.totalSize ?? '--', unit: '' },
    { label: tr(t, 'scfGrowth', 'Annual Growth'), value: overview?.growth != null ? `${changeSign(overview.growth)}${overview.growth.toFixed(1)}%` : '--', color: overview?.growth != null ? (overview.growth >= 0 ? '#34d399' : '#f87171') : undefined },
    { label: tr(t, 'scfAvgDiscount', 'Avg Discount Rate'), value: overview?.avgDiscountRate != null ? `${overview.avgDiscountRate.toFixed(2)}%` : '--' },
    { label: tr(t, 'scfPaymentTerms', 'Avg Payment Terms'), value: overview?.avgPaymentTerms ?? '--', unit: 'days' },
    { label: tr(t, 'scfAdoption', 'Adoption Rate'), value: overview?.adoptionRate != null ? `${overview.adoptionRate.toFixed(1)}%` : '--' },
    { label: tr(t, 'scfDigital', 'Digital Penetration'), value: overview?.digitalPenetration != null ? `${overview.digitalPenetration.toFixed(1)}%` : '--' },
  ];

  return (
    <div className="text-[9px]">
      {/* Market Overview Metrics */}
      <div className="border-b border-border/20">
        <div className="px-2 py-1">
          <span className="text-[7px] font-black uppercase tracking-widest text-neutral-500">
            {tr(t, 'scfMarketOverview', 'Market Overview')}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-px bg-border/10">
          {metrics.map((m) => (
            <div key={m.label} className="bg-black px-2 py-1.5">
              <div className="text-[7px] text-neutral-600 uppercase tracking-wider truncate">{m.label}</div>
              <div className="text-[10px] font-bold mt-0.5" style={{ color: m.color ?? SKY }}>
                {m.value}{m.unit ? ` ${m.unit}` : ''}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Indicators */}
      {risks.length > 0 && (
        <div className="border-b border-border/20">
          <div className="px-2 py-1">
            <span className="text-[7px] font-black uppercase tracking-widest text-neutral-500">
              {tr(t, 'scfRiskIndicators', 'Risk Indicators')}
            </span>
          </div>
          <div className="px-2 pb-1.5 space-y-1">
            {risks.map((risk: any, i: number) => {
              const badge = riskBadge(risk.level ?? 'moderate');
              return (
                <div key={i} className="flex items-center justify-between py-0.5 px-1 hover:bg-sky-400/[0.02] transition-colors">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] text-white/60">{risk.name ?? '--'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {risk.value != null && (
                      <span className="text-[8px] font-bold text-white/80">{risk.value}</span>
                    )}
                    <span
                      className="text-[6px] font-black uppercase px-1 py-px"
                      style={{ color: badge.color, backgroundColor: badge.bg }}
                    >
                      {badge.text}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Regional Breakdown Table */}
      {regions.length > 0 && (
        <div className="border-b border-border/20">
          <div className="px-2 py-1">
            <span className="text-[7px] font-black uppercase tracking-widest text-neutral-500">
              {tr(t, 'scfRegionalBreakdown', 'Regional Breakdown')}
            </span>
          </div>
          {/* Header */}
          <div className="grid grid-cols-[1fr_56px_48px_48px_48px_48px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
            <span className="text-[6px] text-neutral-600 uppercase tracking-wider">Region</span>
            <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Volume</span>
            <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Share</span>
            <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Growth</span>
            <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Avg Rate</span>
            <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Digital</span>
          </div>
          {/* Rows */}
          {regions.map((region: any, i: number) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_56px_48px_48px_48px_48px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-sky-400/[0.02] transition-colors items-center"
            >
              <span className="text-[8px] font-bold text-white/70 truncate">{region.name ?? '--'}</span>
              <span className="text-[8px] text-white/50 text-right">{region.volume ?? '--'}</span>
              <span className="text-[8px] text-white/50 text-right">
                {region.share != null ? `${region.share.toFixed(1)}%` : '--'}
              </span>
              <span className={`text-[8px] font-bold text-right ${changeColor(region.growth ?? 0)}`}>
                {region.growth != null ? `${changeSign(region.growth)}${region.growth.toFixed(1)}%` : '--'}
              </span>
              <span className="text-[8px] text-white/50 text-right">
                {region.avgRate != null ? `${region.avgRate.toFixed(2)}%` : '--'}
              </span>
              <span className="text-[8px] text-white/50 text-right">
                {region.digitalAdoption != null ? `${region.digitalAdoption.toFixed(0)}%` : '--'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Timestamp */}
      {data?.timestamp && (
        <div className="px-2 py-1.5">
          <span className="text-[7px] text-neutral-700">
            {tr(t, 'scfLastUpdate', 'Last update')}: {new Date(data.timestamp).toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  );
}

// -- PROGRAMS View --

function ProgramsView({ data }: { data: any }) {
  const t = useT();
  const programs: any[] = data?.programs ?? [];

  return (
    <div className="text-[9px]">
      <div className="px-2 py-1">
        <span className="text-[7px] font-black uppercase tracking-widest text-neutral-500">
          {tr(t, 'scfPrograms', 'SCF Programs')}
        </span>
        <span className="text-[7px] text-neutral-600 ml-2">({programs.length})</span>
      </div>

      {programs.length === 0 ? (
        <div className="text-center py-8 text-neutral-500 text-[9px] uppercase">
          {tr(t, 'scfNoPrograms', 'No programs available')}
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="grid grid-cols-[1fr_56px_40px_44px_40px_40px_36px_56px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
            <span className="text-[6px] text-neutral-600 uppercase tracking-wider">Buyer</span>
            <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Size</span>
            <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Suppl.</span>
            <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Disc.</span>
            <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Tenor</span>
            <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Util.</span>
            <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-center">Rtg</span>
            <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Platform</span>
          </div>
          {/* Rows */}
          {programs.map((prog: any, i: number) => {
            const rtg = ratingBadge(prog.rating ?? 'NR');
            return (
              <div
                key={i}
                className="grid grid-cols-[1fr_56px_40px_44px_40px_40px_36px_56px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-sky-400/[0.02] transition-colors items-center"
              >
                <span className="text-[8px] font-bold text-white/70 truncate">{prog.buyer ?? '--'}</span>
                <span className="text-[8px] text-white/50 text-right">{prog.size ?? '--'}</span>
                <span className="text-[8px] text-white/50 text-right">{prog.suppliersEnrolled ?? '--'}</span>
                <span className="text-[8px] text-sky-400/80 text-right">
                  {prog.discountRate != null ? `${prog.discountRate.toFixed(2)}%` : '--'}
                </span>
                <span className="text-[8px] text-white/50 text-right">
                  {prog.tenor != null ? `${prog.tenor}d` : '--'}
                </span>
                <span className={`text-[8px] font-bold text-right ${
                  (prog.utilization ?? 0) >= 80 ? 'text-emerald-400' :
                  (prog.utilization ?? 0) >= 50 ? 'text-sky-400' : 'text-neutral-500'
                }`}>
                  {prog.utilization != null ? `${prog.utilization.toFixed(0)}%` : '--'}
                </span>
                <span className="text-[7px] font-bold text-center" style={{ color: rtg.color }}>
                  {prog.rating ?? 'NR'}
                </span>
                <span className="text-[7px] text-white/40 text-right truncate">{prog.platform ?? '--'}</span>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// -- INSTRUMENTS View --

function InstrumentsView({ data }: { data: any }) {
  const t = useT();
  const instruments: any[] = data?.instruments ?? [];

  return (
    <div className="text-[9px]">
      <div className="px-2 py-1">
        <span className="text-[7px] font-black uppercase tracking-widest text-neutral-500">
          {tr(t, 'scfInstruments', 'Instrument Types')}
        </span>
        <span className="text-[7px] text-neutral-600 ml-2">({instruments.length})</span>
      </div>

      {instruments.length === 0 ? (
        <div className="text-center py-8 text-neutral-500 text-[9px] uppercase">
          {tr(t, 'scfNoInstruments', 'No instruments available')}
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="grid grid-cols-[1fr_64px_48px_48px_48px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
            <span className="text-[6px] text-neutral-600 uppercase tracking-wider">Type</span>
            <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Volume</span>
            <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Avg Rate</span>
            <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Growth</span>
            <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Tenor</span>
          </div>
          {/* Rows */}
          {instruments.map((inst: any, i: number) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_64px_48px_48px_48px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-sky-400/[0.02] transition-colors items-center"
            >
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-1" style={{ backgroundColor: SKY, opacity: 0.6 }} />
                <span className="text-[8px] font-bold text-white/70 truncate">{inst.type ?? '--'}</span>
              </div>
              <span className="text-[8px] text-white/50 text-right">{inst.volume ?? '--'}</span>
              <span className="text-[8px] text-sky-400/80 text-right">
                {inst.avgRate != null ? `${inst.avgRate.toFixed(2)}%` : '--'}
              </span>
              <span className={`text-[8px] font-bold text-right ${changeColor(inst.growth ?? 0)}`}>
                {inst.growth != null ? `${changeSign(inst.growth)}${inst.growth.toFixed(1)}%` : '--'}
              </span>
              <span className="text-[8px] text-white/50 text-right">
                {inst.tenor ?? '--'}
              </span>
            </div>
          ))}

          {/* Volume Comparison Bar */}
          {instruments.length > 1 && (
            <div className="px-2 py-2 border-t border-border/10">
              <div className="text-[6px] text-neutral-600 uppercase tracking-wider mb-1.5">
                {tr(t, 'scfVolumeComparison', 'Volume Comparison')}
              </div>
              {instruments.map((inst: any, i: number) => {
                const maxVol = Math.max(...instruments.map((x: any) => x.volumeNum ?? 0), 1);
                const pct = ((inst.volumeNum ?? 0) / maxVol) * 100;
                return (
                  <div key={i} className="flex items-center gap-1.5 py-0.5">
                    <span className="text-[7px] text-white/40 w-24 truncate">{inst.type ?? '--'}</span>
                    <div className="flex-1 h-[4px] bg-white/[0.03] relative overflow-hidden">
                      <div
                        className="absolute left-0 top-0 h-full"
                        style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: SKY, opacity: 0.4 }}
                      />
                    </div>
                    <span className="text-[7px] text-white/40 w-14 text-right">{inst.volume ?? '--'}</span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// -- TECH View --

function TechView({ data }: { data: any }) {
  const t = useT();
  const trends: any[] = data?.techTrends ?? [];

  return (
    <div className="text-[9px]">
      <div className="px-2 py-1">
        <span className="text-[7px] font-black uppercase tracking-widest text-neutral-500">
          {tr(t, 'scfTechTrends', 'Technology Trends')}
        </span>
        <span className="text-[7px] text-neutral-600 ml-2">({trends.length})</span>
      </div>

      {trends.length === 0 ? (
        <div className="text-center py-8 text-neutral-500 text-[9px] uppercase">
          {tr(t, 'scfNoTrends', 'No trends available')}
        </div>
      ) : (
        <div className="px-2 pb-2 space-y-1">
          {trends.map((trend: any, i: number) => {
            const badge = impactBadge(trend.impact ?? 'medium');
            return (
              <div
                key={i}
                className="border border-border/10 bg-[#050505] hover:bg-sky-400/[0.02] transition-colors"
              >
                <div className="px-2 py-1.5">
                  {/* Top row: name + impact badge */}
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[8px] font-bold text-white/80">{trend.name ?? '--'}</span>
                    <span
                      className="text-[5px] font-black uppercase px-1 py-px"
                      style={{ color: badge.color, backgroundColor: badge.bg }}
                    >
                      {badge.text} IMPACT
                    </span>
                  </div>

                  {/* Adoption bar */}
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[7px] text-neutral-600 w-14 shrink-0">Adoption</span>
                    <div className="flex-1 h-[4px] bg-white/[0.03] relative overflow-hidden">
                      <div
                        className="absolute left-0 top-0 h-full"
                        style={{
                          width: `${Math.min(trend.adoption ?? 0, 100)}%`,
                          backgroundColor: SKY,
                          opacity: 0.5,
                        }}
                      />
                    </div>
                    <span className="text-[8px] font-bold w-8 text-right" style={{ color: SKY }}>
                      {trend.adoption != null ? `${trend.adoption}%` : '--'}
                    </span>
                  </div>

                  {/* Key players */}
                  {trend.keyPlayers && trend.keyPlayers.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-[6px] text-neutral-600 uppercase tracking-wider">Players:</span>
                      {trend.keyPlayers.map((player: string, j: number) => (
                        <span
                          key={j}
                          className="text-[6px] text-white/40 px-1 py-px bg-white/[0.03] border border-border/10"
                        >
                          {player}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Description */}
                  {trend.description && (
                    <p className="text-[7px] text-neutral-500 leading-relaxed mt-1">
                      {trend.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
