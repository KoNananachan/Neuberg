import { useState } from 'react';
import { useOptionSkewSurface } from '../../api/hooks/use-option-skew-surface';
import { useT, tr, TFn } from '../../i18n';

// ── Translation helper ──

// ── Format helpers ──

function fmtVol(n: number | undefined | null): string {
  if (n == null) return '--';
  return `${n.toFixed(1)}%`;
}

function fmtNum(n: number | undefined | null, decimals = 2): string {
  if (n == null) return '--';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(decimals)}`;
}

function fmtPct(n: number | undefined | null): string {
  if (n == null) return '--';
  return `${n.toFixed(0)}%`;
}

// ── Color helpers ──

function volHeatColor(vol: number | undefined | null, minVol: number, maxVol: number): string {
  if (vol == null) return 'text-neutral-600';
  if (maxVol <= minVol) return 'text-neutral-400';
  const p = Math.min(1, Math.max(0, (vol - minVol) / (maxVol - minVol)));
  if (p < 0.2) return 'text-blue-500';
  if (p < 0.35) return 'text-blue-400';
  if (p < 0.5) return 'text-emerald-400';
  if (p < 0.65) return 'text-yellow-400';
  if (p < 0.8) return 'text-orange-400';
  return 'text-red-400';
}

function volBgColor(vol: number | undefined | null, minVol: number, maxVol: number): string {
  if (vol == null) return '';
  if (maxVol <= minVol) return '';
  const p = Math.min(1, Math.max(0, (vol - minVol) / (maxVol - minVol)));
  if (p < 0.2) return 'bg-blue-500/10';
  if (p < 0.35) return 'bg-blue-400/8';
  if (p < 0.5) return 'bg-emerald-400/5';
  if (p < 0.65) return 'bg-yellow-400/5';
  if (p < 0.8) return 'bg-orange-400/8';
  return 'bg-red-500/10';
}

function skewSteepColor(v: number | undefined | null): string {
  if (v == null) return 'text-neutral-500';
  const abs = Math.abs(v);
  if (abs > 8) return 'text-amber-400';
  if (abs > 5) return 'text-yellow-400';
  if (abs > 2) return 'text-neutral-300';
  return 'text-emerald-400';
}

function changeColor(v: number | undefined | null): string {
  if (v == null) return 'text-neutral-500';
  if (v > 2) return 'text-red-400';
  if (v > 0) return 'text-orange-400';
  if (v < -2) return 'text-emerald-400';
  if (v < 0) return 'text-blue-400';
  return 'text-neutral-400';
}

function rrColor(v: number | undefined | null): string {
  if (v == null) return 'text-neutral-500';
  if (v < -3) return 'text-red-400';
  if (v < 0) return 'text-orange-400';
  if (v > 3) return 'text-emerald-400';
  if (v > 0) return 'text-blue-400';
  return 'text-neutral-400';
}

function percentileColor(pct: number | undefined | null): string {
  if (pct == null) return 'text-neutral-500';
  if (pct >= 90) return 'text-red-400';
  if (pct >= 75) return 'text-orange-400';
  if (pct >= 50) return 'text-yellow-400';
  if (pct >= 25) return 'text-emerald-400';
  return 'text-blue-400';
}

function richnessBadge(label: string | undefined | null): string {
  if (!label) return 'text-neutral-500';
  const l = label.toUpperCase();
  if (l.includes('RICH') || l.includes('EXPENSIVE')) return 'text-red-400';
  if (l.includes('CHEAP') || l.includes('LOW')) return 'text-emerald-400';
  if (l.includes('FAIR') || l.includes('NEUTRAL')) return 'text-yellow-400';
  return 'text-neutral-400';
}

// ── Constants ──

const UNDERLYINGS = ['SPX', 'NDX', 'RUT', 'AAPL', 'TSLA', 'NVDA', 'AMZN', 'MSFT'];
const EXPIRIES = ['1W', '2W', '1M', '2M', '3M', '6M', '1Y'];

type ViewTab = 'surface' | 'skew' | 'term' | 'reversals' | 'summary';

// ── Main Panel ──

export function OptionSkewSurfacePanel() {
  const t = useT();
  const { data, isLoading } = useOptionSkewSurface();
  const [activeTab, setActiveTab] = useState<ViewTab>('surface');
  const [selectedUnderlying, setSelectedUnderlying] = useState('SPX');
  const [selectedExpiry, setSelectedExpiry] = useState('1M');

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-3 bg-emerald-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-emerald-400">
            {tr(t, 'optSkewSurfaceTitle', 'OPTION SKEW SURFACE')}
          </span>
        </div>
        <select
          value={selectedUnderlying}
          onChange={(e) => setSelectedUnderlying(e.target.value)}
          className="bg-white/[0.04] border border-border/20 px-1.5 py-0.5 text-[9px] font-mono text-emerald-400 uppercase outline-none focus:border-emerald-500/40 appearance-none cursor-pointer"
        >
          {UNDERLYINGS.map((u) => (
            <option key={u} value={u} className="bg-black text-white">
              {u}
            </option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/20 shrink-0">
        {(
          [
            ['surface', 'Surface'],
            ['skew', 'Skew'],
            ['term', 'Term Structure'],
            ['reversals', 'Risk Reversals'],
            ['summary', 'Summary'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as ViewTab)}
            className={`flex-1 py-1.5 text-[8px] font-mono font-bold uppercase tracking-wider transition-colors ${
              activeTab === key
                ? 'text-emerald-400 border-b border-emerald-400 bg-emerald-500/5'
                : 'text-neutral-500 hover:text-neutral-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-emerald-400 text-[9px] font-mono uppercase animate-pulse">
            Loading...
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            No option skew surface data available
          </div>
        )}

        {data && (
          <>
            {activeTab === 'surface' && (
              <SurfaceTab data={data} t={t} selectedUnderlying={selectedUnderlying} />
            )}
            {activeTab === 'skew' && (
              <SkewTab
                data={data}
                t={t}
                selectedUnderlying={selectedUnderlying}
                selectedExpiry={selectedExpiry}
                onSelectExpiry={setSelectedExpiry}
              />
            )}
            {activeTab === 'term' && (
              <TermStructureTab data={data} t={t} selectedUnderlying={selectedUnderlying} />
            )}
            {activeTab === 'reversals' && (
              <RiskReversalsTab data={data} t={t} />
            )}
            {activeTab === 'summary' && (
              <SummaryTab data={data} t={t} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Tab 1: Surface ──

function SurfaceTab({
  data,
  t,
  selectedUnderlying,
}: {
  data: any;
  t: TFn;
  selectedUnderlying: string;
}) {
  const surface = data?.surfaces?.[selectedUnderlying] ?? data?.surfaces?.[Object.keys(data?.surfaces ?? {})[0]] ?? {};
  const grid = surface?.grid ?? [];
  const strikes: string[] = surface?.strikes ?? [];
  const expiries: string[] = surface?.expiries ?? EXPIRIES;

  // Collect all vol values for heat-map range
  const allVols: number[] = [];
  for (const row of grid) {
    for (const cell of row?.vols ?? []) {
      if (cell != null) allVols.push(cell);
    }
  }
  const minVol = allVols.length > 0 ? Math.min(...allVols) : 0;
  const maxVol = allVols.length > 0 ? Math.max(...allVols) : 50;

  return (
    <div className="px-3 py-3">
      <div className="text-[8px] font-black uppercase tracking-wider text-neutral-500 mb-2">
        {tr(t, 'optSkewSurfaceGrid', 'VOL SURFACE GRID')} - {selectedUnderlying}
      </div>

      {grid.length === 0 ? (
        <div className="text-center py-6 text-neutral-600 text-[9px] font-mono uppercase">
          No surface data for {selectedUnderlying}
        </div>
      ) : (
        <>
          {/* Heatmap table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-[7px] font-mono font-bold text-neutral-500 uppercase tracking-wider text-left py-1 px-1.5 border-b border-border/20">
                    {tr(t, 'optSkewStrike', 'STRIKE')}
                  </th>
                  {expiries.map((exp) => (
                    <th
                      key={exp}
                      className="text-[7px] font-mono font-bold text-neutral-500 uppercase tracking-wider text-center py-1 px-1 border-b border-border/20"
                    >
                      {exp}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grid.map((row: any, ri: number) => {
                  const strike = strikes[ri] ?? row?.strike ?? `K${ri}`;
                  const isAtm = row?.isAtm === true || strike === 'ATM';
                  const vols: (number | null)[] = row?.vols ?? [];

                  return (
                    <tr
                      key={ri}
                      className={`hover:bg-emerald-400/[0.02] transition-colors ${isAtm ? 'bg-emerald-500/[0.04]' : ''}`}
                    >
                      <td
                        className={`text-[9px] font-mono py-1 px-1.5 border-b border-border/10 ${
                          isAtm ? 'font-black text-emerald-400' : 'text-neutral-400'
                        }`}
                      >
                        {strike}
                      </td>
                      {vols.map((vol, ci) => {
                        const colorCls = volHeatColor(vol, minVol, maxVol);
                        const bgCls = volBgColor(vol, minVol, maxVol);
                        return (
                          <td
                            key={ci}
                            className={`text-[9px] font-mono font-bold text-center py-1 px-1 border-b border-border/10 ${colorCls} ${bgCls}`}
                            title={vol != null ? `IV: ${vol.toFixed(2)}%` : ''}
                          >
                            {vol != null ? vol.toFixed(1) : '--'}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Color legend */}
          <div className="flex items-center gap-2 mt-2 justify-center text-[7px] font-mono">
            <span className="text-blue-500">LOW</span>
            <div className="flex gap-px">
              <div className="w-4 h-2 bg-blue-500/40" />
              <div className="w-4 h-2 bg-blue-400/40" />
              <div className="w-4 h-2 bg-emerald-400/40" />
              <div className="w-4 h-2 bg-yellow-400/40" />
              <div className="w-4 h-2 bg-orange-400/40" />
              <div className="w-4 h-2 bg-red-500/40" />
            </div>
            <span className="text-red-400">HIGH</span>
          </div>

          {/* Surface summary metrics */}
          {surface?.summary && (
            <div className="grid grid-cols-4 gap-2 mt-3">
              <MetricBox
                label="ATM VOL"
                value={fmtVol(surface.summary.atmVol)}
                cls="text-emerald-400"
              />
              <MetricBox
                label="25D SKEW"
                value={fmtNum(surface.summary.skew25d)}
                cls={skewSteepColor(surface.summary.skew25d)}
              />
              <MetricBox
                label="VOL RANGE"
                value={`${fmtVol(minVol)} - ${fmtVol(maxVol)}`}
                cls="text-neutral-300"
              />
              <MetricBox
                label="SPOT"
                value={surface.summary.spot != null ? `$${surface.summary.spot.toFixed(2)}` : '--'}
                cls="text-white"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Tab 2: Skew ──

function SkewTab({
  data,
  t,
  selectedUnderlying,
  selectedExpiry,
  onSelectExpiry,
}: {
  data: any;
  t: TFn;
  selectedUnderlying: string;
  selectedExpiry: string;
  onSelectExpiry: (v: string) => void;
}) {
  const skewData = data?.skewByExpiry?.[selectedUnderlying]?.[selectedExpiry]
    ?? data?.skewByExpiry?.[Object.keys(data?.skewByExpiry ?? {})[0]]?.[selectedExpiry]
    ?? {};
  const points: any[] = skewData?.points ?? [];
  const steepness = skewData?.putSkewSteepness;

  // Find vol range for text-based visualization
  const vols = points.map((p: any) => p?.vol).filter((v: any) => v != null) as number[];
  const minVol = vols.length > 0 ? Math.min(...vols) : 0;
  const maxVol = vols.length > 0 ? Math.max(...vols) : 50;
  const volRange = maxVol - minVol || 1;

  return (
    <div className="px-3 py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
          {tr(t, 'optSkewByStrike', 'SKEW BY STRIKE')} - {selectedUnderlying}
        </div>
        <select
          value={selectedExpiry}
          onChange={(e) => onSelectExpiry(e.target.value)}
          className="bg-white/[0.04] border border-border/20 px-1.5 py-0.5 text-[8px] font-mono text-emerald-400 uppercase outline-none focus:border-emerald-500/40 appearance-none cursor-pointer"
        >
          {EXPIRIES.map((exp) => (
            <option key={exp} value={exp} className="bg-black text-white">
              {exp}
            </option>
          ))}
        </select>
      </div>

      {/* Put skew steepness badge */}
      {steepness != null && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
            PUT SKEW STEEPNESS:
          </span>
          <span className={`text-[9px] font-mono font-black ${
            steepness > 5 ? 'text-amber-400' : steepness > 2 ? 'text-yellow-400' : 'text-emerald-400'
          }`}>
            {fmtNum(steepness)}
            {steepness > 5 && (
              <span className="ml-1 text-[7px] text-amber-400/80 font-normal">STEEP</span>
            )}
          </span>
        </div>
      )}

      {points.length === 0 ? (
        <div className="text-center py-6 text-neutral-600 text-[9px] font-mono uppercase">
          No skew data for {selectedExpiry}
        </div>
      ) : (
        <>
          {/* Strike-by-strike with text curve visualization */}
          <div className="space-y-0">
            {/* Column headers */}
            <div className="grid grid-cols-[52px_44px_44px_1fr] px-0 py-1 border-b border-border/20">
              {['STRIKE', 'IV', 'DELTA', 'VOL CURVE'].map((h) => (
                <span
                  key={h}
                  className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500"
                >
                  {h}
                </span>
              ))}
            </div>

            {points.map((pt: any, idx: number) => {
              const vol = pt?.vol;
              const barWidth = vol != null ? Math.max(3, ((vol - minVol) / volRange) * 100) : 0;
              const isAtm = pt?.isAtm === true || Math.abs(pt?.delta ?? 0.5) > 0.45;
              const colorCls = volHeatColor(vol, minVol, maxVol);

              return (
                <div
                  key={pt?.strike ?? idx}
                  className={`grid grid-cols-[52px_44px_44px_1fr] py-1 border-b border-border/10 hover:bg-emerald-400/[0.02] transition-colors ${
                    isAtm ? 'bg-emerald-500/[0.04]' : ''
                  }`}
                >
                  <span
                    className={`text-[9px] font-mono ${
                      isAtm ? 'font-black text-emerald-400' : 'text-neutral-400'
                    }`}
                  >
                    {pt?.strike ?? '--'}
                  </span>
                  <span className={`text-[9px] font-mono font-bold tabular-nums ${colorCls}`}>
                    {fmtVol(vol)}
                  </span>
                  <span className="text-[9px] font-mono tabular-nums text-neutral-400">
                    {pt?.delta != null ? pt.delta.toFixed(2) : '--'}
                  </span>
                  <div className="flex items-center gap-1">
                    <div
                      className="h-[6px] transition-all"
                      style={{
                        width: `${barWidth}%`,
                        backgroundColor:
                          vol != null
                            ? vol > (minVol + maxVol) / 2
                              ? 'rgba(248,113,113,0.5)'
                              : 'rgba(96,165,250,0.5)'
                            : 'transparent',
                      }}
                    />
                    <span className={`text-[7px] font-mono ${colorCls}`}>
                      {vol != null ? vol.toFixed(1) : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Skew metrics */}
          {skewData?.metrics && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              <MetricBox
                label="25D PUT VOL"
                value={fmtVol(skewData.metrics.put25dVol)}
                cls="text-red-400"
              />
              <MetricBox
                label="ATM VOL"
                value={fmtVol(skewData.metrics.atmVol)}
                cls="text-emerald-400"
              />
              <MetricBox
                label="25D CALL VOL"
                value={fmtVol(skewData.metrics.call25dVol)}
                cls="text-blue-400"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Tab 3: Term Structure ──

function TermStructureTab({
  data,
  t,
  selectedUnderlying,
}: {
  data: any;
  t: TFn;
  selectedUnderlying: string;
}) {
  const termData = data?.termStructure?.[selectedUnderlying]
    ?? data?.termStructure?.[Object.keys(data?.termStructure ?? {})[0]]
    ?? [];
  const entries: any[] = Array.isArray(termData) ? termData : termData?.entries ?? [];

  // Find vol range for bar chart
  const vols = entries.map((e: any) => e?.atmVol).filter((v: any) => v != null) as number[];
  const maxVol = vols.length > 0 ? Math.max(...vols) : 50;

  return (
    <div className="px-3 py-3">
      <div className="text-[8px] font-black uppercase tracking-wider text-neutral-500 mb-2">
        {tr(t, 'optSkewTermStructure', 'ATM VOL TERM STRUCTURE')} - {selectedUnderlying}
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-6 text-neutral-600 text-[9px] font-mono uppercase">
          No term structure data for {selectedUnderlying}
        </div>
      ) : (
        <>
          {/* Text bar chart */}
          <div className="space-y-0">
            {/* Column headers */}
            <div className="grid grid-cols-[44px_48px_48px_1fr] px-0 py-1 border-b border-border/20">
              {['EXPIRY', 'ATM IV', 'CHG', 'VOL BAR'].map((h) => (
                <span
                  key={h}
                  className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500"
                >
                  {h}
                </span>
              ))}
            </div>

            {entries.map((entry: any, idx: number) => {
              const vol = entry?.atmVol;
              const barWidth = vol != null && maxVol > 0 ? (vol / maxVol) * 100 : 0;

              return (
                <div
                  key={entry?.expiry ?? idx}
                  className="grid grid-cols-[44px_48px_48px_1fr] py-1.5 border-b border-border/10 hover:bg-emerald-400/[0.02] transition-colors"
                >
                  <span className="text-[9px] font-mono font-bold text-emerald-400">
                    {entry?.expiry ?? '--'}
                  </span>
                  <span className="text-[9px] font-mono font-bold tabular-nums text-white">
                    {fmtVol(vol)}
                  </span>
                  <span className={`text-[9px] font-mono tabular-nums ${changeColor(entry?.change)}`}>
                    {fmtNum(entry?.change)}
                  </span>
                  <div className="flex items-center gap-1">
                    <div
                      className="h-[8px] bg-emerald-400/40 border-r border-emerald-400 transition-all"
                      style={{ width: `${Math.max(barWidth, 2)}%` }}
                    />
                    <span className="text-[7px] font-mono text-neutral-500">
                      {vol != null ? vol.toFixed(1) : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Term structure shape */}
          {data?.termStructureShape?.[selectedUnderlying] && (
            <div className="mt-3 px-2 py-1.5 bg-white/[0.02] border border-border/20">
              <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
                CURVE SHAPE
              </div>
              <div className="text-[11px] font-mono font-black text-emerald-400 mt-0.5">
                {data.termStructureShape[selectedUnderlying]}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Tab 4: Risk Reversals ──

function RiskReversalsTab({ data, t }: { data: any; t: TFn }) {
  const reversals = data?.riskReversals ?? [];

  return (
    <div className="px-3 py-3">
      <div className="text-[8px] font-black uppercase tracking-wider text-neutral-500 mb-2">
        {tr(t, 'optSkewRiskReversals', '25-DELTA & 10-DELTA RISK REVERSALS')}
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[44px_40px_52px_52px_52px_52px] px-0 py-1 border-b border-border/20">
        {['TICKER', 'EXPIRY', '25D RR', '10D RR', '25D CHG', '10D CHG'].map((h) => (
          <span
            key={h}
            className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right first:text-left"
          >
            {h}
          </span>
        ))}
      </div>

      {reversals.length > 0 ? (
        reversals.map((row: any, idx: number) => (
          <div
            key={`${row?.ticker}-${row?.expiry}-${idx}`}
            className="grid grid-cols-[44px_40px_52px_52px_52px_52px] py-1.5 border-b border-border/10 hover:bg-emerald-400/[0.02] transition-colors"
          >
            <span className="text-[9px] font-mono font-bold text-emerald-400">
              {row?.ticker ?? '--'}
            </span>
            <span className="text-[9px] font-mono text-neutral-400 text-right">
              {row?.expiry ?? '--'}
            </span>
            <span className={`text-[9px] font-mono font-bold tabular-nums text-right ${rrColor(row?.rr25d)}`}>
              {fmtNum(row?.rr25d)}
            </span>
            <span className={`text-[9px] font-mono font-bold tabular-nums text-right ${rrColor(row?.rr10d)}`}>
              {fmtNum(row?.rr10d)}
            </span>
            <span className={`text-[9px] font-mono tabular-nums text-right ${changeColor(row?.rr25dChange)}`}>
              {fmtNum(row?.rr25dChange)}
            </span>
            <span className={`text-[9px] font-mono tabular-nums text-right ${changeColor(row?.rr10dChange)}`}>
              {fmtNum(row?.rr10dChange)}
            </span>
          </div>
        ))
      ) : (
        <div className="text-center py-6 text-neutral-600 text-[9px] font-mono uppercase">
          No risk reversal data
        </div>
      )}

      {/* Reversal interpretation */}
      <div className="mt-3 px-1">
        <div className="text-[7px] font-mono text-neutral-600 leading-relaxed">
          Negative RR = Put vol {'>'} Call vol (downside protection bid). Large negative = bearish skew.
        </div>
      </div>
    </div>
  );
}

// ── Tab 5: Summary ──

function SummaryTab({ data, t }: { data: any; t: TFn }) {
  const summary = data?.crossUnderlyingSummary ?? [];
  const biggestChanges = data?.biggestDailyChanges ?? [];

  return (
    <div className="px-3 py-3">
      {/* Cross-underlying comparison */}
      <div className="text-[8px] font-black uppercase tracking-wider text-neutral-500 mb-2">
        {tr(t, 'optSkewCrossComparison', 'CROSS-UNDERLYING SKEW COMPARISON')}
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[44px_48px_48px_44px_52px_48px] px-0 py-1 border-b border-border/20">
        {['TICKER', 'ATM IV', '25D SKEW', 'PCTL', 'RICHNESS', 'IV RANK'].map((h) => (
          <span
            key={h}
            className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right first:text-left"
          >
            {h}
          </span>
        ))}
      </div>

      {summary.length > 0 ? (
        summary.map((row: any, idx: number) => (
          <div
            key={row?.ticker ?? idx}
            className="grid grid-cols-[44px_48px_48px_44px_52px_48px] py-1.5 border-b border-border/10 hover:bg-emerald-400/[0.02] transition-colors"
          >
            <span className="text-[9px] font-mono font-bold text-emerald-400">
              {row?.ticker ?? '--'}
            </span>
            <span className="text-[9px] font-mono font-bold tabular-nums text-white text-right">
              {fmtVol(row?.atmVol)}
            </span>
            <span className={`text-[9px] font-mono font-bold tabular-nums text-right ${skewSteepColor(row?.skew25d)}`}>
              {fmtNum(row?.skew25d)}
            </span>
            <span className={`text-[9px] font-mono font-bold tabular-nums text-right ${percentileColor(row?.percentile)}`}>
              {fmtPct(row?.percentile)}
            </span>
            <span className={`text-[9px] font-mono font-bold text-right ${richnessBadge(row?.richness)}`}>
              {row?.richness ?? '--'}
            </span>
            <span className={`text-[9px] font-mono tabular-nums text-right ${percentileColor(row?.ivRank)}`}>
              {row?.ivRank != null ? `${row.ivRank}` : '--'}
            </span>
          </div>
        ))
      ) : (
        <div className="text-center py-4 text-neutral-600 text-[9px] font-mono uppercase">
          No summary data
        </div>
      )}

      {/* Biggest daily changes */}
      <div className="mt-4">
        <div className="text-[8px] font-black uppercase tracking-wider text-neutral-500 mb-2">
          {tr(t, 'optSkewBiggestChanges', 'BIGGEST DAILY SKEW CHANGES')}
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[44px_44px_56px_56px_1fr] px-0 py-1 border-b border-border/20">
          {['TICKER', 'EXPIRY', 'SKEW CHG', 'VOL CHG', 'DRIVER'].map((h) => (
            <span
              key={h}
              className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right first:text-left last:text-left"
            >
              {h}
            </span>
          ))}
        </div>

        {biggestChanges.length > 0 ? (
          biggestChanges.slice(0, 10).map((row: any, idx: number) => (
            <div
              key={`${row?.ticker}-${idx}`}
              className="grid grid-cols-[44px_44px_56px_56px_1fr] py-1.5 border-b border-border/10 hover:bg-emerald-400/[0.02] transition-colors"
            >
              <span className="text-[9px] font-mono font-bold text-emerald-400">
                {row?.ticker ?? '--'}
              </span>
              <span className="text-[9px] font-mono text-neutral-400 text-right">
                {row?.expiry ?? '--'}
              </span>
              <span className={`text-[9px] font-mono font-bold tabular-nums text-right ${changeColor(row?.skewChange)}`}>
                {fmtNum(row?.skewChange)}
              </span>
              <span className={`text-[9px] font-mono tabular-nums text-right ${changeColor(row?.volChange)}`}>
                {fmtNum(row?.volChange)}
              </span>
              <span className="text-[8px] font-mono text-neutral-500 truncate pl-1">
                {row?.driver ?? ''}
              </span>
            </div>
          ))
        ) : (
          <div className="text-center py-4 text-neutral-600 text-[9px] font-mono uppercase">
            No change data
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared metric box ──

function MetricBox({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <div className="px-2 py-1.5 bg-white/[0.02] border border-border/20">
      <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">{label}</div>
      <div className={`text-[11px] font-mono font-black mt-0.5 ${cls}`}>{value}</div>
    </div>
  );
}
