import { useMemo } from 'react';
import { useMunicipalCreditAnalysis } from '../../api/hooks/use-municipal-credit-analysis';
import { useT } from '../../i18n';
import { RefreshCw, Landmark, ArrowUpRight, ArrowDownRight } from 'lucide-react';

// -- i18n fallback helper --

type TFn = ReturnType<typeof useT>;

const tr = (t: TFn, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// -- Formatting helpers --

function fmtYield(n: number): string {
  return n.toFixed(2);
}

function fmtRatio(n: number): string {
  return n.toFixed(0);
}

function fmtBps(n: number): string {
  return n.toFixed(0);
}

function fmtPct(n: number): string {
  return n.toFixed(1) + '%';
}

function fmtDscr(n: number): string {
  return n.toFixed(2) + 'x';
}

function fmtAmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'T';
  if (Math.abs(n) >= 1_000) return '$' + (n / 1_000).toFixed(1) + 'B';
  return '$' + n.toFixed(0) + 'M';
}

function fmtDebtPerCap(n: number): string {
  return '$' + n.toLocaleString();
}

// -- Color helpers --

function ratingColor(rating: string): string {
  const r = String(rating).toUpperCase();
  if (r.startsWith('AAA')) return 'text-green-400';
  if (r.startsWith('AA')) return 'text-teal-400';
  if (r.startsWith('A')) return 'text-yellow-400';
  if (r.startsWith('BBB')) return 'text-orange-400';
  if (r.startsWith('BB')) return 'text-red-400';
  return 'text-neutral-500';
}

function outlookColor(outlook: string): string {
  const o = String(outlook).toUpperCase();
  if (o === 'POSITIVE') return 'text-green-400';
  if (o === 'STABLE') return 'text-teal-400';
  if (o === 'NEGATIVE') return 'text-red-400';
  if (o === 'DEVELOPING') return 'text-yellow-400';
  return 'text-neutral-500';
}

function dscrColor(n: number): string {
  if (n >= 2.0) return 'text-green-400';
  if (n >= 1.5) return 'text-teal-400';
  if (n >= 1.2) return 'text-yellow-400';
  return 'text-red-400';
}

// -- Interfaces --

interface Issuer {
  name: string;
  state: string;
  rating: string;
  sector: string;
  dscr: number;
  outlook: string;
}

interface MuniTreasuryRatio {
  maturity: string;
  muniYield: number;
  treasuryYield: number;
  ratio: number;
}

interface RatingAction {
  issuer: string;
  direction: string;
  fromRating: string;
  toRating: string;
  agency: string;
  date: string;
}

interface SectorBreakdown {
  sector: string;
  marketShare: number;
  avgYield: number;
  spread: number;
  count: number;
}

interface RevenueGoSplit {
  revenue: number;
  generalObligation: number;
}

interface StateSummary {
  state: string;
  rating: string;
  outlook: string;
  debtPerCapita: number;
  pensionFunding: number;
  totalOutstanding: number;
}

// -- Main Panel --

export function MunicipalCreditAnalysisPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useMunicipalCreditAnalysis();
  const d = data as any;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-teal-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <Landmark className="w-3 h-3 text-teal-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-teal-400">
            {tr(t, 'panelMunicipalCreditAnalysis', 'Municipal Credit Analysis')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-teal-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !d && (
          <div className="text-center py-8 text-teal-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING...
          </div>
        )}

        {d && (
          <>
            {d.issuers && <IssuerCreditTable issuers={d.issuers} />}
            {d.muniTreasuryRatios && <MuniTreasuryRatioChart ratios={d.muniTreasuryRatios} />}
            {d.ratingActions && <RatingActionsSection actions={d.ratingActions} />}
            {d.sectorBreakdown && <SectorBreakdownSection sectors={d.sectorBreakdown} />}
            {d.revenueGoSplit && <RevenueGoSplitSection split={d.revenueGoSplit} />}
            {d.stateSummaries && <StateSummaryCards summaries={d.stateSummaries} />}
          </>
        )}
      </div>
    </div>
  );
}

// -- Issuer Credit Table --

function IssuerCreditTable({ issuers }: { issuers: Issuer[] }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Issuer Credit Overview
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_32px_36px_64px_40px_48px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Issuer</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">ST</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">RTG</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider truncate">Sector</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">DSCR</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">Outlk</span>
      </div>

      {/* Rows */}
      {issuers.map((issuer, i) => (
        <div
          key={`${issuer.name}-${i}`}
          className="grid grid-cols-[1fr_32px_36px_64px_40px_48px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-teal-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-teal-400 truncate">{issuer.name}</span>
          <span className="text-[7px] font-mono text-neutral-400 text-center">{issuer.state}</span>
          <span className={`text-[8px] font-mono font-bold text-center ${ratingColor(issuer.rating)}`}>
            {issuer.rating}
          </span>
          <span className="text-[7px] font-mono text-neutral-400 truncate">{issuer.sector}</span>
          <span className={`text-[8px] font-mono font-bold text-right ${dscrColor(issuer.dscr)}`}>
            {fmtDscr(issuer.dscr)}
          </span>
          <span className={`text-[7px] font-mono font-bold text-right pr-2 uppercase ${outlookColor(issuer.outlook)}`}>
            {issuer.outlook}
          </span>
        </div>
      ))}

      {issuers.length === 0 && (
        <div className="text-center py-3 text-[7px] font-mono text-neutral-600 uppercase">No data</div>
      )}
    </div>
  );
}

// -- Muni/Treasury Ratio SVG Chart --

function MuniTreasuryRatioChart({ ratios }: { ratios: MuniTreasuryRatio[] }) {
  const chart = useMemo(() => {
    if (ratios.length < 2) return null;

    const W = 320;
    const H = 100;
    const PAD_L = 36;
    const PAD_R = 12;
    const PAD_T = 14;
    const PAD_B = 22;

    const muniYields = ratios.map(r => r.muniYield);
    const tsyYields = ratios.map(r => r.treasuryYield);
    const allYields = [...muniYields, ...tsyYields];
    const minY = Math.min(...allYields) - 0.2;
    const maxY = Math.max(...allYields) + 0.2;
    const rangeY = maxY - minY || 1;

    const scaleX = (i: number) => PAD_L + (i / (ratios.length - 1)) * (W - PAD_L - PAD_R);
    const scaleY = (v: number) => PAD_T + ((maxY - v) / rangeY) * (H - PAD_T - PAD_B);

    const muniPts = ratios.map((r, i) => ({ x: scaleX(i), y: scaleY(r.muniYield) }));
    const tsyPts = ratios.map((r, i) => ({ x: scaleX(i), y: scaleY(r.treasuryYield) }));

    const muniPath = muniPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const tsyPath = tsyPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

    // Fill area between the two curves
    const fillPath = muniPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
      + ' ' + [...tsyPts].reverse().map((p) => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
      + ' Z';

    // Y axis ticks
    const yStep = rangeY > 3 ? 1.0 : rangeY > 1.5 ? 0.5 : 0.25;
    const yTicks: number[] = [];
    for (let v = Math.ceil(minY / yStep) * yStep; v <= maxY; v += yStep) {
      yTicks.push(Math.round(v * 1000) / 1000);
    }

    return { W, H, PAD_L, PAD_R, PAD_T, PAD_B, muniPts, tsyPts, muniPath, tsyPath, fillPath, yTicks, scaleX, scaleY };
  }, [ratios]);

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Muni / Treasury Ratio by Maturity
        </span>
      </div>

      {chart && (
        <div className="px-3 py-2">
          <svg viewBox={`0 0 ${chart.W} ${chart.H}`} className="w-full" style={{ maxHeight: 120 }}>
            <defs>
              <linearGradient id="mca-spread-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#2dd4bf" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            {/* Y grid lines */}
            {chart.yTicks.map(v => (
              <g key={v}>
                <line
                  x1={chart.PAD_L} y1={chart.scaleY(v)}
                  x2={chart.W - chart.PAD_R} y2={chart.scaleY(v)}
                  stroke="rgba(255,255,255,0.04)" strokeDasharray="2,3"
                />
                <text
                  x={chart.PAD_L - 3} y={chart.scaleY(v) + 3}
                  textAnchor="end" fill="rgba(255,255,255,0.25)" fontSize={6} fontFamily="monospace"
                >
                  {v.toFixed(2)}
                </text>
              </g>
            ))}

            {/* Spread fill */}
            <path d={chart.fillPath} fill="url(#mca-spread-fill)" />

            {/* Treasury line (dashed) */}
            <path d={chart.tsyPath} fill="none" stroke="#60a5fa" strokeWidth={1.2} strokeDasharray="3,2" />

            {/* Muni line (solid) */}
            <path d={chart.muniPath} fill="none" stroke="#2dd4bf" strokeWidth={1.5} />

            {/* Points and X labels */}
            {ratios.map((r, i) => (
              <g key={i}>
                <circle cx={chart.muniPts[i].x} cy={chart.muniPts[i].y} r={2} fill="#2dd4bf" />
                <circle cx={chart.tsyPts[i].x} cy={chart.tsyPts[i].y} r={2} fill="#60a5fa" />
                <text
                  x={chart.muniPts[i].x} y={chart.H - 4}
                  textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={6} fontFamily="monospace"
                >
                  {r.maturity}
                </text>
              </g>
            ))}
          </svg>

          {/* Legend */}
          <div className="flex items-center gap-4 px-1 mt-1">
            <div className="flex items-center gap-1">
              <div className="w-3 h-[2px] bg-teal-400" />
              <span className="text-[6px] font-mono text-neutral-500 uppercase">AAA Muni</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-[2px] bg-blue-400 opacity-60" />
              <span className="text-[6px] font-mono text-neutral-500 uppercase">Treasury</span>
            </div>
          </div>
        </div>
      )}

      {/* Ratio data table */}
      <div className="grid grid-cols-[72px_52px_52px_48px_1fr] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Maturity</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Muni</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">TSY</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Ratio</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">Bar</span>
      </div>

      {ratios.map(row => {
        const rColor = row.ratio > 100 ? 'text-green-400' : row.ratio > 85 ? 'text-yellow-400' : 'text-neutral-400';
        const bColor = row.ratio > 100 ? 'bg-green-400' : row.ratio > 85 ? 'bg-yellow-400' : 'bg-neutral-500';

        return (
          <div
            key={row.maturity}
            className="grid grid-cols-[72px_52px_52px_48px_1fr] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-teal-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-white">{row.maturity}</span>
            <span className="text-[8px] font-mono font-bold text-teal-400 text-right">{fmtYield(row.muniYield)}%</span>
            <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtYield(row.treasuryYield)}%</span>
            <span className={`text-[8px] font-mono font-bold text-right ${rColor}`}>{fmtRatio(row.ratio)}%</span>
            <div className="flex items-center gap-1 justify-end pr-2">
              <div className="w-16 h-1.5 bg-neutral-800 relative">
                <div
                  className={`absolute top-0 left-0 h-full ${bColor}`}
                  style={{ width: `${Math.min(row.ratio, 120) / 1.2}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// -- Recent Rating Actions --

function RatingActionsSection({ actions }: { actions: RatingAction[] }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 flex items-center gap-2">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Recent Rating Actions
        </span>
        {actions.length > 0 && (
          <span className="text-[7px] font-mono text-neutral-600">({actions.length})</span>
        )}
      </div>

      {actions.map((action, i) => {
        const isUpgrade = String(action.direction).toUpperCase() === 'UPGRADE';
        const isDowngrade = String(action.direction).toUpperCase() === 'DOWNGRADE';
        const ArrowIcon = isUpgrade ? ArrowUpRight : ArrowDownRight;
        const arrowColor = isUpgrade ? 'text-green-400' : isDowngrade ? 'text-red-400' : 'text-neutral-400';
        const badgeBg = isUpgrade
          ? 'bg-green-500/10 border border-green-500/30'
          : isDowngrade
            ? 'bg-red-500/10 border border-red-500/30'
            : 'bg-neutral-500/10 border border-neutral-500/30';
        const badgeText = isUpgrade ? 'text-green-400' : isDowngrade ? 'text-red-400' : 'text-neutral-400';

        return (
          <div
            key={`${action.issuer}-${i}`}
            className="flex items-center gap-2 px-2 py-[4px] border-b border-border/5 hover:bg-teal-400/[0.02] transition-colors"
          >
            <div className={`flex items-center justify-center w-4 h-4 ${badgeBg}`}>
              <ArrowIcon className={`w-2.5 h-2.5 ${arrowColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] font-mono font-bold text-white truncate">{action.issuer}</span>
                <span className={`text-[7px] font-mono font-bold ${ratingColor(action.fromRating)}`}>{action.fromRating}</span>
                <span className="text-[6px] font-mono text-neutral-600">&rarr;</span>
                <span className={`text-[7px] font-mono font-bold ${ratingColor(action.toRating)}`}>{action.toRating}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[6px] font-mono text-neutral-600 uppercase">{action.agency}</span>
                <span className="text-[6px] font-mono text-neutral-700">{action.date}</span>
              </div>
            </div>
            <span className={`text-[6px] font-mono font-black uppercase px-1 py-px ${badgeBg} ${badgeText}`}>
              {action.direction}
            </span>
          </div>
        );
      })}

      {actions.length === 0 && (
        <div className="text-center py-3 text-[7px] font-mono text-neutral-600 uppercase">No recent actions</div>
      )}
    </div>
  );
}

// -- Sector Breakdown Bars --

function SectorBreakdownSection({ sectors }: { sectors: SectorBreakdown[] }) {
  const maxShare = Math.max(...sectors.map(s => s.marketShare), 1);

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Sector Breakdown
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_48px_48px_40px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Sector</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Avg Yld</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Sprd</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">Shr%</span>
      </div>

      {sectors.map(sector => (
        <div key={sector.sector} className="border-b border-border/5">
          <div className="grid grid-cols-[1fr_48px_48px_40px] gap-0 px-2 py-[3px] hover:bg-teal-400/[0.02] transition-colors items-center">
            <span className="text-[8px] font-mono font-bold text-white truncate">{sector.sector}</span>
            <span className="text-[8px] font-mono font-bold text-teal-400 text-right">{fmtYield(sector.avgYield)}%</span>
            <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtBps(sector.spread)}bp</span>
            <span className="text-[8px] font-mono text-neutral-300 text-right pr-2">{fmtPct(sector.marketShare)}</span>
          </div>
          {/* Horizontal bar */}
          <div className="px-2 pb-1">
            <div className="h-1 bg-neutral-900 relative">
              <div
                className="absolute top-0 left-0 h-full bg-teal-400/30"
                style={{ width: `${(sector.marketShare / maxShare) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}

      {/* Stacked bar summary */}
      {sectors.length > 0 && (
        <div className="px-2 py-1.5 flex gap-px h-2">
          {sectors.map((sector, i) => {
            const colors = ['bg-teal-400/40', 'bg-teal-500/30', 'bg-teal-600/30', 'bg-cyan-400/30', 'bg-cyan-500/25', 'bg-emerald-400/25', 'bg-green-400/20'];
            return (
              <div
                key={sector.sector}
                className={`${colors[i % colors.length]} hover:opacity-80 transition-opacity`}
                style={{ width: `${sector.marketShare}%` }}
                title={`${sector.sector}: ${fmtPct(sector.marketShare)}`}
              />
            );
          })}
        </div>
      )}

      {sectors.length === 0 && (
        <div className="text-center py-3 text-[7px] font-mono text-neutral-600 uppercase">No data</div>
      )}
    </div>
  );
}

// -- Revenue vs GO Split Visualization --

function RevenueGoSplitSection({ split }: { split: RevenueGoSplit }) {
  const total = split.revenue + split.generalObligation;
  const revPct = total > 0 ? (split.revenue / total) * 100 : 50;
  const goPct = total > 0 ? (split.generalObligation / total) * 100 : 50;

  const W = 320;
  const H = 48;
  const BAR_Y = 12;
  const BAR_H = 14;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Revenue vs General Obligation
        </span>
      </div>

      <div className="px-3 py-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 56 }}>
          {/* Revenue bar */}
          <rect
            x={0} y={BAR_Y}
            width={(revPct / 100) * W} height={BAR_H}
            fill="#2dd4bf" opacity={0.35}
          />
          {/* GO bar */}
          <rect
            x={(revPct / 100) * W} y={BAR_Y}
            width={(goPct / 100) * W} height={BAR_H}
            fill="#60a5fa" opacity={0.35}
          />

          {/* Divider line */}
          <line
            x1={(revPct / 100) * W} y1={BAR_Y - 2}
            x2={(revPct / 100) * W} y2={BAR_Y + BAR_H + 2}
            stroke="rgba(255,255,255,0.2)" strokeWidth={1}
          />

          {/* Revenue label */}
          <text x={4} y={BAR_Y - 2} fill="#2dd4bf" fontSize={7} fontFamily="monospace" fontWeight="bold">
            REVENUE {revPct.toFixed(1)}%
          </text>
          {revPct > 20 && (
            <text
              x={(revPct / 100) * W / 2} y={BAR_Y + BAR_H / 2 + 3}
              textAnchor="middle" fill="#2dd4bf" fontSize={8} fontFamily="monospace" fontWeight="bold"
            >
              {fmtAmt(split.revenue)}
            </text>
          )}

          {/* GO label */}
          <text x={W - 4} y={BAR_Y - 2} textAnchor="end" fill="#60a5fa" fontSize={7} fontFamily="monospace" fontWeight="bold">
            GO {goPct.toFixed(1)}%
          </text>
          {goPct > 20 && (
            <text
              x={(revPct / 100) * W + (goPct / 100) * W / 2} y={BAR_Y + BAR_H / 2 + 3}
              textAnchor="middle" fill="#60a5fa" fontSize={8} fontFamily="monospace" fontWeight="bold"
            >
              {fmtAmt(split.generalObligation)}
            </text>
          )}

          {/* Bottom legend */}
          <rect x={4} y={H - 8} width={8} height={4} fill="#2dd4bf" opacity={0.35} />
          <text x={15} y={H - 4} fill="rgba(255,255,255,0.3)" fontSize={6} fontFamily="monospace">REVENUE BONDS</text>
          <rect x={W / 2} y={H - 8} width={8} height={4} fill="#60a5fa" opacity={0.35} />
          <text x={W / 2 + 11} y={H - 4} fill="rgba(255,255,255,0.3)" fontSize={6} fontFamily="monospace">GENERAL OBLIGATION</text>
        </svg>
      </div>
    </div>
  );
}

// -- State-Level Credit Summary Cards --

function StateSummaryCards({ summaries }: { summaries: StateSummary[] }) {
  return (
    <div className="border-b border-border/30">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          State Credit Summary
        </span>
      </div>

      <div className="grid grid-cols-2 gap-px bg-border/10 p-px">
        {summaries.map((s, i) => {
          const pensionBarBg = s.pensionFunding >= 80 ? 'bg-green-400' : s.pensionFunding >= 60 ? 'bg-yellow-400' : 'bg-red-400';

          return (
            <div
              key={`${s.state}-${i}`}
              className="bg-black px-2 py-1.5 hover:bg-teal-400/[0.02] transition-colors"
            >
              {/* State header row */}
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[9px] font-mono font-black text-teal-400">{s.state}</span>
                <span className={`text-[8px] font-mono font-bold ${ratingColor(s.rating)}`}>{s.rating}</span>
              </div>

              {/* Outlook */}
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[6px] font-mono text-neutral-600 uppercase">Outlook</span>
                <span className={`text-[7px] font-mono font-bold uppercase ${outlookColor(s.outlook)}`}>
                  {s.outlook}
                </span>
              </div>

              {/* Debt per capita */}
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[6px] font-mono text-neutral-600 uppercase">Debt/Cap</span>
                <span className="text-[7px] font-mono font-bold text-white">{fmtDebtPerCap(s.debtPerCapita)}</span>
              </div>

              {/* Outstanding */}
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[6px] font-mono text-neutral-600 uppercase">Outstanding</span>
                <span className="text-[7px] font-mono text-neutral-300">{fmtAmt(s.totalOutstanding)}</span>
              </div>

              {/* Pension funding bar */}
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[6px] font-mono text-neutral-600 uppercase w-8">Pensn</span>
                <div className="flex-1 h-1 bg-neutral-800 relative">
                  <div
                    className={`absolute top-0 left-0 h-full ${pensionBarBg}`}
                    style={{ width: `${Math.min(s.pensionFunding, 100)}%` }}
                  />
                </div>
                <span className="text-[7px] font-mono text-neutral-400 w-7 text-right">{fmtPct(s.pensionFunding)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {summaries.length === 0 && (
        <div className="text-center py-3 text-[7px] font-mono text-neutral-600 uppercase">No data</div>
      )}
    </div>
  );
}
