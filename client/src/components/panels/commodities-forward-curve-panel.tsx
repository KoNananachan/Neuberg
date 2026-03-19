import { useState, useMemo, useCallback } from 'react';
import { useCommoditiesForwardCurve } from '../../api/hooks/use-commodities-forward-curve';
import { useT } from '../../i18n';
import { RefreshCw, TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';

// Safe translation helper with fallback
function useTr() {
  const t = useT();
  return (key: string, fallback: string) => {
    try {
      return (t as (k: string) => string)(key) || fallback;
    } catch {
      return fallback;
    }
  };
}

// ────────────────────────────────────────────────────
// Formatting helpers
// ────────────────────────────────────────────────────

function fmtPrice(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  if (n >= 1000) return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (n >= 10) return n.toFixed(2);
  return n.toFixed(4);
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtSigned(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

// ────────────────────────────────────────────────────
// Color helpers
// ────────────────────────────────────────────────────

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral/40';
  if (n > 0) return 'text-emerald-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral/40';
}

function structureLabel(s: string | null | undefined): string {
  const v = (s ?? '').toLowerCase();
  if (v.includes('contango')) return 'CONTANGO';
  if (v.includes('backwardation') || v.includes('backw')) return 'BACKWARDATION';
  return 'FLAT';
}

function structureColor(s: string | null | undefined): {
  text: string;
  bg: string;
  border: string;
} {
  const v = (s ?? '').toLowerCase();
  if (v.includes('contango'))
    return {
      text: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
    };
  if (v.includes('backwardation') || v.includes('backw'))
    return {
      text: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
    };
  return {
    text: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
  };
}

// ────────────────────────────────────────────────────
// Commodity definitions
// ────────────────────────────────────────────────────

type CommodityKey = 'WTI' | 'BRENT' | 'GOLD' | 'SILVER' | 'NATGAS' | 'COPPER' | 'CORN' | 'WHEAT';

const COMMODITY_LIST: { key: CommodityKey; label: string }[] = [
  { key: 'WTI', label: 'WTI Crude' },
  { key: 'BRENT', label: 'Brent' },
  { key: 'GOLD', label: 'Gold' },
  { key: 'SILVER', label: 'Silver' },
  { key: 'NATGAS', label: 'Nat Gas' },
  { key: 'COPPER', label: 'Copper' },
  { key: 'CORN', label: 'Corn' },
  { key: 'WHEAT', label: 'Wheat' },
];

// Comparison period options
type ComparisonPeriod = 'none' | '1w' | '1m';

const COMPARISON_OPTIONS: { key: ComparisonPeriod; label: string }[] = [
  { key: 'none', label: 'NONE' },
  { key: '1w', label: '1W AGO' },
  { key: '1m', label: '1M AGO' },
];

// ────────────────────────────────────────────────────
// Seasonal months
// ────────────────────────────────────────────────────

const MONTHS_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// ────────────────────────────────────────────────────
// Main Panel
// ────────────────────────────────────────────────────

export function CommoditiesForwardCurvePanel() {
  const tr = useTr();
  const { data, isLoading, refetch } = useCommoditiesForwardCurve();
  const [selected, setSelected] = useState<CommodityKey>('WTI');
  const [comparison, setComparison] = useState<ComparisonPeriod>('none');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const commodities: Record<string, any> = data?.commodities ?? {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selectedData: any = commodities[selected] ?? null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const curve: any[] = selectedData?.curve ?? selectedData?.forwardCurve ?? [];
  const spotPrice: number | null = selectedData?.spotPrice ?? selectedData?.spot ?? null;
  const frontMonth: number | null = selectedData?.frontMonth ?? selectedData?.front ?? curve[0]?.price ?? null;
  const structure: string = selectedData?.structure ?? selectedData?.shape ?? 'flat';
  const rollYield: number | null = selectedData?.rollYield ?? selectedData?.annualizedRoll ?? null;
  const magnitude: number | null = selectedData?.magnitude ?? selectedData?.contangoDepth ?? selectedData?.backwardationDepth ?? null;

  // Comparison curve data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const comparisonCurve: any[] | null = useMemo(() => {
    if (comparison === 'none' || !selectedData) return null;
    const key = comparison === '1w' ? 'curve1wAgo' : 'curve1mAgo';
    const altKey = comparison === '1w' ? 'previousWeek' : 'previousMonth';
    return selectedData[key] ?? selectedData[altKey] ?? null;
  }, [selectedData, comparison]);

  // Basis computation
  const basis = useMemo(() => {
    if (spotPrice == null || frontMonth == null) return null;
    return spotPrice - frontMonth;
  }, [spotPrice, frontMonth]);

  const basisPct = useMemo(() => {
    if (basis == null || frontMonth == null || frontMonth === 0) return null;
    return (basis / frontMonth) * 100;
  }, [basis, frontMonth]);

  // Seasonal data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seasonal: any = selectedData?.seasonal ?? selectedData?.seasonalPattern ?? null;

  // Basis table entries
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const basisTable: any[] = useMemo(() => {
    if (!data?.basisTable) {
      // Build from commodities data
      return COMMODITY_LIST.map((c) => {
        const d = commodities[c.key];
        if (!d) return null;
        const sp = d.spotPrice ?? d.spot ?? null;
        const fm = d.frontMonth ?? d.front ?? (d.curve ?? d.forwardCurve ?? [])[0]?.price ?? null;
        const b = sp != null && fm != null ? sp - fm : null;
        const bp = b != null && fm != null && fm !== 0 ? (b / fm) * 100 : null;
        return {
          commodity: c.key,
          label: c.label,
          spot: sp,
          frontMonth: fm,
          basis: b,
          basisPct: bp,
          structure: d.structure ?? d.shape ?? 'flat',
        };
      }).filter(Boolean);
    }
    return data.basisTable;
  }, [data, commodities]);

  // Loading state
  if (isLoading && !data) {
    return (
      <div className="h-full flex flex-col bg-black overflow-hidden">
        <Header tr={tr} isLoading={true} onRefresh={() => refetch()} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-[9px] font-mono text-orange-400 uppercase tracking-widest animate-pulse">
            LOADING FORWARD CURVE DATA...
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (!data) {
    return (
      <div className="h-full flex flex-col bg-black overflow-hidden">
        <Header tr={tr} isLoading={false} onRefresh={() => refetch()} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-[9px] font-mono text-red-400/60 uppercase tracking-widest">
            {tr('error', 'FAILED TO LOAD FORWARD CURVE DATA')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      <Header tr={tr} isLoading={isLoading} onRefresh={() => refetch()} />

      {/* Commodity selector tabs */}
      <div className="flex items-center gap-0 px-2 py-1 border-b border-border/20 bg-[#030303] shrink-0 overflow-x-auto no-scrollbar">
        {COMMODITY_LIST.map((c) => {
          const isActive = selected === c.key;
          const d = commodities[c.key];
          const st = d?.structure ?? d?.shape ?? '';
          const sc = structureColor(st);
          return (
            <button
              key={c.key}
              onClick={() => setSelected(c.key)}
              className={`px-2 py-1 text-[8px] font-mono font-bold uppercase tracking-tight transition-colors border-b-2 shrink-0 ${
                isActive
                  ? 'text-orange-400 border-orange-400 bg-orange-400/[0.04]'
                  : 'text-neutral/40 border-transparent hover:text-neutral/60 hover:bg-white/[0.01]'
              }`}
            >
              <div className="flex items-center gap-1">
                <span>{c.label}</span>
                {d && (
                  <span className={`text-[6px] ${sc.text}`}>
                    {structureLabel(st) === 'CONTANGO' ? 'C' : structureLabel(st) === 'BACKWARDATION' ? 'B' : 'F'}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Structure + roll yield summary bar */}
      {selectedData && (
        <div className="flex items-center gap-3 px-3 py-1.5 border-b border-border/20 bg-[#030303] shrink-0 text-[8px] font-mono">
          {/* Contango/Backwardation indicator */}
          {(() => {
            const sc = structureColor(structure);
            return (
              <div className={`flex items-center gap-1 px-1.5 py-0.5 border ${sc.bg} ${sc.border}`}>
                {structure.toLowerCase().includes('contango') ? (
                  <TrendingUp className={`w-2.5 h-2.5 ${sc.text}`} />
                ) : structure.toLowerCase().includes('backw') ? (
                  <TrendingDown className={`w-2.5 h-2.5 ${sc.text}`} />
                ) : (
                  <Minus className={`w-2.5 h-2.5 ${sc.text}`} />
                )}
                <span className={`font-black uppercase ${sc.text}`}>
                  {structureLabel(structure)}
                </span>
                {magnitude != null && (
                  <span className={`${sc.text} opacity-60`}>
                    {fmtPct(magnitude)}
                  </span>
                )}
              </div>
            );
          })()}

          {/* Roll yield */}
          {rollYield != null && (
            <div className="flex items-center gap-1">
              <span className="text-neutral/30 text-[7px]">ROLL YLD</span>
              <span className={`font-bold ${changeColor(rollYield)}`}>
                {fmtPct(rollYield)}
              </span>
            </div>
          )}

          {/* Basis */}
          {basis != null && (
            <div className="flex items-center gap-1">
              <span className="text-neutral/30 text-[7px]">BASIS</span>
              <span className={`font-bold ${changeColor(basis)}`}>
                {fmtSigned(basis)}
              </span>
              {basisPct != null && (
                <span className={`text-[7px] ${changeColor(basisPct)} opacity-60`}>
                  ({fmtPct(basisPct)})
                </span>
              )}
            </div>
          )}

          {/* Spot price */}
          {spotPrice != null && (
            <div className="flex items-center gap-1 ml-auto">
              <span className="text-neutral/30 text-[7px]">SPOT</span>
              <span className="text-orange-300 font-bold">{fmtPrice(spotPrice)}</span>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {/* Forward curve chart */}
        {curve.length > 1 && (
          <div className="border-b border-border/20">
            <div className="px-3 py-1 border-b border-border/20 flex items-center gap-2">
              <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider">
                FORWARD CURVE
              </span>
              <span className="text-[8px] font-mono font-bold text-orange-400">
                {selected}
              </span>

              {/* Comparison period selector */}
              <div className="flex items-center gap-0 ml-auto">
                {COMPARISON_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setComparison(opt.key)}
                    className={`px-1.5 py-0.5 text-[6px] font-mono font-bold uppercase transition-colors border border-border/20 ${
                      comparison === opt.key
                        ? 'text-orange-400 bg-orange-400/[0.08] border-orange-400/30'
                        : 'text-neutral/30 hover:text-neutral/50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="px-3 pt-3 pb-1">
              <ForwardCurveChart
                curve={curve}
                spotPrice={spotPrice}
                structure={structure}
                comparisonCurve={comparisonCurve}
                comparisonLabel={comparison === '1w' ? '1W AGO' : comparison === '1m' ? '1M AGO' : null}
              />
            </div>
          </div>
        )}

        {/* Roll yield display */}
        {selectedData && (
          <div className="border-b border-border/20">
            <div className="px-3 py-1 border-b border-border/20">
              <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider">
                ROLL YIELD ANALYSIS
              </span>
            </div>
            <div className="grid grid-cols-4 gap-0">
              <RollYieldCell
                label="MONTHLY"
                value={selectedData.rollYieldMonthly ?? selectedData.monthlyRoll ?? null}
              />
              <RollYieldCell
                label="ANNUALIZED"
                value={rollYield}
              />
              <RollYieldCell
                label="FRONT SPREAD"
                value={selectedData.frontSpread ?? selectedData.calendarSpread ?? null}
                isAbs
              />
              <RollYieldCell
                label="CARRY COST"
                value={selectedData.carryCost ?? selectedData.storageCost ?? null}
                isAbs
              />
            </div>
          </div>
        )}

        {/* Basis (spot vs front-month) table */}
        {basisTable.length > 0 && (
          <div className="border-b border-border/20">
            <div className="px-3 py-1 border-b border-border/20">
              <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider">
                BASIS (SPOT VS FRONT-MONTH)
              </span>
            </div>
            <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.7fr_0.7fr_0.7fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral/40 uppercase tracking-wider">
              <span>COMMODITY</span>
              <span className="text-right">SPOT</span>
              <span className="text-right">FRONT</span>
              <span className="text-right">BASIS</span>
              <span className="text-right">BASIS %</span>
              <span className="text-center">SHAPE</span>
            </div>

            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {basisTable.map((b: any, i: number) => {
              const sc = structureColor(b.structure);
              const id = b.commodity ?? b.id ?? `b-${i}`;
              return (
                <div
                  key={id}
                  onClick={() => {
                    const match = COMMODITY_LIST.find((c) => c.key === b.commodity);
                    if (match) setSelected(match.key);
                  }}
                  className={`grid grid-cols-[1.2fr_0.8fr_0.8fr_0.7fr_0.7fr_0.7fr] px-3 py-1.5 border-b border-border/10 transition-colors cursor-pointer hover:bg-orange-400/[0.02] ${
                    b.commodity === selected
                      ? 'bg-orange-400/[0.04]'
                      : i % 2 === 0
                        ? 'bg-black'
                        : 'bg-white/[0.01]'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-[9px] font-mono font-bold text-orange-400">
                      {b.commodity}
                    </span>
                    <span className="text-[7px] font-mono text-neutral/30">
                      {b.label ?? b.name ?? ''}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono font-bold text-white/80 text-right self-center">
                    {fmtPrice(b.spot ?? b.spotPrice)}
                  </span>
                  <span className="text-[9px] font-mono text-white/60 text-right self-center">
                    {fmtPrice(b.frontMonth ?? b.front)}
                  </span>
                  <span className={`text-[9px] font-mono font-bold text-right self-center ${changeColor(b.basis)}`}>
                    {fmtSigned(b.basis)}
                  </span>
                  <span className={`text-[9px] font-mono font-bold text-right self-center ${changeColor(b.basisPct ?? b.basisPercent)}`}>
                    {fmtPct(b.basisPct ?? b.basisPercent)}
                  </span>
                  <div className="flex items-center justify-center self-center">
                    <span
                      className={`text-[7px] font-mono font-black px-1.5 py-0.5 uppercase border ${sc.text} ${sc.bg} ${sc.border}`}
                    >
                      {structureLabel(b.structure)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Seasonal pattern indicator */}
        {seasonal && (
          <div className="border-b border-border/20">
            <div className="px-3 py-1 border-b border-border/20 flex items-center gap-2">
              <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider">
                SEASONAL PATTERN
              </span>
              <span className="text-[8px] font-mono font-bold text-orange-400">
                {selected}
              </span>
            </div>
            <div className="px-3 pt-2 pb-1">
              <SeasonalPatternChart seasonal={seasonal} />
            </div>
            <div className="flex items-center gap-3 px-3 py-1.5 text-[8px] font-mono">
              {(seasonal.typicalHigh ?? seasonal.highMonth) && (
                <div className="flex items-center gap-1">
                  <span className="text-neutral/30 text-[7px]">TYP HIGH</span>
                  <span className="text-emerald-400 font-bold">
                    {seasonal.typicalHigh ?? seasonal.highMonth}
                  </span>
                </div>
              )}
              {(seasonal.typicalLow ?? seasonal.lowMonth) && (
                <div className="flex items-center gap-1">
                  <span className="text-neutral/30 text-[7px]">TYP LOW</span>
                  <span className="text-red-400 font-bold">
                    {seasonal.typicalLow ?? seasonal.lowMonth}
                  </span>
                </div>
              )}
              {(seasonal.deviation ?? seasonal.vsSeasonalAvg) != null && (
                <div className="flex items-center gap-1">
                  <span className="text-neutral/30 text-[7px]">VS SEASONAL</span>
                  <span className={`font-bold ${changeColor(seasonal.deviation ?? seasonal.vsSeasonalAvg)}`}>
                    {fmtPct(seasonal.deviation ?? seasonal.vsSeasonalAvg)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tenor detail table */}
        {curve.length > 0 && (
          <div className="border-b border-border/20">
            <div className="px-3 py-1 border-b border-border/20">
              <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider">
                TENOR DETAIL
              </span>
            </div>
            <div className="grid grid-cols-[1.2fr_0.8fr_0.7fr_0.7fr_0.8fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral/40 uppercase tracking-wider">
              <span>TENOR</span>
              <span className="text-right">PRICE</span>
              <span className="text-right">CHG</span>
              <span className="text-right">VS SPOT</span>
              <span className="text-right">VS SPOT %</span>
            </div>

            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {curve.map((pt: any, i: number) => {
              const price = pt.price ?? pt.value ?? 0;
              const vsSpot = spotPrice != null ? price - spotPrice : null;
              const vsSpotPct = spotPrice != null && spotPrice !== 0 ? ((price - spotPrice) / spotPrice) * 100 : null;
              const label = pt.month ?? pt.contract ?? pt.tenor ?? pt.label ?? `M${i + 1}`;

              return (
                <div
                  key={label}
                  className={`grid grid-cols-[1.2fr_0.8fr_0.7fr_0.7fr_0.8fr] px-3 py-1.5 border-b border-border/10 transition-colors hover:bg-orange-400/[0.02] ${
                    i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
                  }`}
                >
                  <span className="text-[9px] font-mono font-bold text-white self-center">
                    {label}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-orange-300 text-right self-center">
                    {fmtPrice(price)}
                  </span>
                  <span className={`text-[9px] font-mono font-bold text-right self-center ${changeColor(pt.change ?? pt.changePct)}`}>
                    {fmtPct(pt.change ?? pt.changePct)}
                  </span>
                  <span className={`text-[9px] font-mono text-right self-center ${changeColor(vsSpot)}`}>
                    {vsSpot != null ? fmtSigned(vsSpot) : '-'}
                  </span>
                  <span className={`text-[9px] font-mono text-right self-center ${changeColor(vsSpotPct)}`}>
                    {vsSpotPct != null ? fmtPct(vsSpotPct) : '-'}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Updated timestamp */}
        {data.updatedAt && (
          <div className="px-3 py-1.5 text-[7px] font-mono text-neutral/25 text-right">
            {new Date(data.updatedAt).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────
// Header
// ────────────────────────────────────────────────────

function Header({
  tr,
  isLoading,
  onRefresh,
}: {
  tr: (key: string, fallback: string) => string;
  isLoading: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-orange-400" />
        <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-orange-400">
          {tr('panelCommoditiesForwardCurve', 'COMMODITIES FORWARD CURVE')}
        </span>
      </div>
      <button
        onClick={onRefresh}
        className="p-1 text-neutral/40 hover:text-orange-400 transition-colors"
      >
        <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
}

// ────────────────────────────────────────────────────
// Roll Yield Cell
// ────────────────────────────────────────────────────

function RollYieldCell({
  label,
  value,
  isAbs,
}: {
  label: string;
  value: number | null | undefined;
  isAbs?: boolean;
}) {
  return (
    <div className="px-3 py-2 border-r border-border/10 last:border-r-0">
      <div className="text-[7px] font-mono text-neutral/30 uppercase tracking-wider mb-0.5">
        {label}
      </div>
      <div className={`text-[11px] font-mono font-black ${isAbs ? (value != null ? 'text-white/70' : 'text-neutral/30') : changeColor(value)}`}>
        {value != null ? (isAbs ? fmtPrice(value) : fmtPct(value)) : '-'}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────
// Forward Curve SVG Chart with comparison overlay
// ────────────────────────────────────────────────────

function ForwardCurveChart({
  curve,
  spotPrice,
  structure,
  comparisonCurve,
  comparisonLabel,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  curve: any[];
  spotPrice?: number | null;
  structure?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  comparisonCurve?: any[] | null;
  comparisonLabel?: string | null;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  const chart = useMemo(() => {
    if (curve.length < 2) return null;

    const W = 400;
    const H = 170;
    const PAD_L = 44;
    const PAD_R = 14;
    const PAD_T = 18;
    const PAD_B = 30;

    const prices = curve.map((c) => c.price ?? c.value ?? 0);
    const compPrices = comparisonCurve?.map((c) => c.price ?? c.value ?? 0) ?? [];
    const allPrices = [
      ...(spotPrice != null ? [spotPrice] : []),
      ...prices,
      ...compPrices,
    ];
    const minP = Math.min(...allPrices);
    const maxP = Math.max(...allPrices);
    const padding = (maxP - minP) * 0.12 || 1;
    const yMin = minP - padding;
    const yMax = maxP + padding;

    const scaleX = (i: number, total: number) =>
      PAD_L + (i / (total - 1)) * (W - PAD_L - PAD_R);
    const scaleY = (price: number) =>
      PAD_T + ((yMax - price) / (yMax - yMin)) * (H - PAD_T - PAD_B);

    // Main curve points
    const points = curve.map((c, i) => ({
      x: scaleX(i, curve.length),
      y: scaleY(c.price ?? c.value ?? 0),
      data: c,
    }));

    // Cardinal spline for main curve
    const tension = 0.3;
    let pathD = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];
      const cp1x = p1.x + ((p2.x - p0.x) * tension) / 3;
      const cp1y = p1.y + ((p2.y - p0.y) * tension) / 3;
      const cp2x = p2.x - ((p3.x - p1.x) * tension) / 3;
      const cp2y = p2.y - ((p3.y - p1.y) * tension) / 3;
      pathD += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }

    // Area fill
    const fillPath = `${pathD} L ${points[points.length - 1].x},${H - PAD_B} L ${points[0].x},${H - PAD_B} Z`;

    // Comparison curve path
    let compPathD: string | null = null;
    if (comparisonCurve && comparisonCurve.length >= 2) {
      const compPoints = comparisonCurve.map((c, i) => ({
        x: scaleX(i, comparisonCurve.length),
        y: scaleY(c.price ?? c.value ?? 0),
      }));
      compPathD = `M ${compPoints[0].x},${compPoints[0].y}`;
      for (let i = 0; i < compPoints.length - 1; i++) {
        const p0 = compPoints[Math.max(0, i - 1)];
        const p1 = compPoints[i];
        const p2 = compPoints[i + 1];
        const p3 = compPoints[Math.min(compPoints.length - 1, i + 2)];
        const cp1x = p1.x + ((p2.x - p0.x) * tension) / 3;
        const cp1y = p1.y + ((p2.y - p0.y) * tension) / 3;
        const cp2x = p2.x - ((p3.x - p1.x) * tension) / 3;
        const cp2y = p2.y - ((p3.y - p1.y) * tension) / 3;
        compPathD += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
      }
    }

    // Y-axis ticks
    const yRange = yMax - yMin;
    const rawStep = yRange / 5;
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const normalized = rawStep / mag;
    let yStep: number;
    if (normalized <= 1.5) yStep = mag;
    else if (normalized <= 3.5) yStep = 2 * mag;
    else if (normalized <= 7.5) yStep = 5 * mag;
    else yStep = 10 * mag;

    const yTicks: number[] = [];
    for (let v = Math.ceil(yMin / yStep) * yStep; v <= yMax; v += yStep) {
      yTicks.push(Math.round(v * 100) / 100);
    }

    const spotY = spotPrice != null ? scaleY(spotPrice) : null;

    return { W, H, PAD_L, PAD_R, PAD_T, PAD_B, points, pathD, fillPath, compPathD, yTicks, scaleY, spotY };
  }, [curve, spotPrice, comparisonCurve]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!chart) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * chart.W;
      let nearest = 0;
      let minDist = Infinity;
      for (let i = 0; i < chart.points.length; i++) {
        const d = Math.abs(chart.points[i].x - mouseX);
        if (d < minDist) {
          minDist = d;
          nearest = i;
        }
      }
      setHovered(nearest);
    },
    [chart],
  );

  if (!chart) return null;

  const { W, H, PAD_L, PAD_R, PAD_T, PAD_B, points, pathD, fillPath, compPathD, yTicks, scaleY, spotY } = chart;

  const isBackward =
    (structure ?? '').toLowerCase().includes('backwardation') ||
    (structure ?? '').toLowerCase().includes('backw');
  const gradientId = isBackward ? 'cfc-fill-green' : 'cfc-fill-orange';

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ maxHeight: 190 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHovered(null)}
    >
      <defs>
        <linearGradient id="cfc-fill-orange" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f97316" stopOpacity={0.2} />
          <stop offset="100%" stopColor="#f97316" stopOpacity={0.02} />
        </linearGradient>
        <linearGradient id="cfc-fill-green" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
          <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
        </linearGradient>
        <linearGradient id="cfc-line-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="50%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
      </defs>

      {/* Y-axis grid lines and labels */}
      {yTicks.map((v) => (
        <g key={v}>
          <line
            x1={PAD_L}
            y1={scaleY(v)}
            x2={W - PAD_R}
            y2={scaleY(v)}
            stroke="rgba(255,255,255,0.04)"
            strokeDasharray="2,3"
          />
          <text
            x={PAD_L - 4}
            y={scaleY(v) + 3}
            textAnchor="end"
            fill="rgba(255,255,255,0.25)"
            fontSize={7}
            fontFamily="monospace"
          >
            {v.toFixed(2)}
          </text>
        </g>
      ))}

      {/* X-axis baseline */}
      <line
        x1={PAD_L}
        y1={H - PAD_B}
        x2={W - PAD_R}
        y2={H - PAD_B}
        stroke="rgba(255,255,255,0.08)"
      />

      {/* Spot price reference line */}
      {spotY != null && spotY >= PAD_T && spotY <= H - PAD_B && (
        <g>
          <line
            x1={PAD_L}
            y1={spotY}
            x2={W - PAD_R}
            y2={spotY}
            stroke="rgba(249,115,22,0.3)"
            strokeDasharray="4,3"
          />
          <text
            x={W - PAD_R + 2}
            y={spotY + 3}
            fill="rgba(249,115,22,0.5)"
            fontSize={6}
            fontFamily="monospace"
          >
            SPOT
          </text>
        </g>
      )}

      {/* Comparison curve (behind main) */}
      {compPathD && (
        <path
          d={compPathD}
          fill="none"
          stroke="rgba(148,163,184,0.35)"
          strokeWidth={1.5}
          strokeDasharray="4,3"
        />
      )}

      {/* Gradient fill */}
      <path d={fillPath} fill={`url(#${gradientId})`} />

      {/* Main curve line */}
      <path
        d={pathD}
        fill="none"
        stroke="url(#cfc-line-grad)"
        strokeWidth={2}
      />

      {/* Data points and X-axis labels */}
      {points.map((p, i) => {
        const label =
          p.data.month ?? p.data.contract ?? p.data.tenor ?? p.data.label ?? `M${i + 1}`;
        const shortLabel =
          typeof label === 'string' && label.length > 5
            ? label.slice(0, 5)
            : label;
        return (
          <g key={i}>
            <text
              x={p.x}
              y={H - PAD_B + 12}
              textAnchor="middle"
              fill="rgba(255,255,255,0.3)"
              fontSize={6.5}
              fontFamily="monospace"
            >
              {shortLabel}
            </text>
            <line
              x1={p.x}
              y1={H - PAD_B}
              x2={p.x}
              y2={H - PAD_B + 3}
              stroke="rgba(255,255,255,0.15)"
            />
            <circle
              cx={p.x}
              cy={p.y}
              r={hovered === i ? 4 : 2.5}
              fill={hovered === i ? '#fb923c' : '#f97316'}
              stroke={hovered === i ? '#fff' : 'none'}
              strokeWidth={1}
            />
            {(i === 0 || i === points.length - 1) && hovered !== i && (
              <text
                x={p.x}
                y={p.y - 7}
                textAnchor="middle"
                fill="rgba(251,146,60,0.6)"
                fontSize={7}
                fontFamily="monospace"
                fontWeight="bold"
              >
                {(p.data.price ?? p.data.value ?? 0).toFixed(2)}
              </text>
            )}
          </g>
        );
      })}

      {/* Hover tooltip */}
      {hovered !== null && points[hovered] && (
        <g>
          <line
            x1={points[hovered].x}
            y1={PAD_T}
            x2={points[hovered].x}
            y2={H - PAD_B}
            stroke="rgba(249,115,22,0.3)"
            strokeDasharray="3,3"
          />
          <rect
            x={Math.min(points[hovered].x - 36, W - PAD_R - 76)}
            y={Math.max(points[hovered].y - 30, PAD_T)}
            width={72}
            height={24}
            fill="rgba(0,0,0,0.9)"
            stroke="rgba(249,115,22,0.5)"
            strokeWidth={0.5}
          />
          <text
            x={Math.min(points[hovered].x, W - PAD_R - 40)}
            y={Math.max(points[hovered].y - 15, PAD_T + 11)}
            textAnchor="middle"
            fill="#fb923c"
            fontSize={8}
            fontFamily="monospace"
            fontWeight="bold"
          >
            {points[hovered].data.month ??
              points[hovered].data.contract ??
              points[hovered].data.tenor ??
              points[hovered].data.label ??
              `M${hovered + 1}`}
          </text>
          <text
            x={Math.min(points[hovered].x, W - PAD_R - 40)}
            y={Math.max(points[hovered].y - 6, PAD_T + 20)}
            textAnchor="middle"
            fill="#fdba74"
            fontSize={9}
            fontFamily="monospace"
            fontWeight="bold"
          >
            {(
              points[hovered].data.price ??
              points[hovered].data.value ??
              0
            ).toFixed(2)}
          </text>
        </g>
      )}

      {/* Comparison legend */}
      {compPathD && comparisonLabel && (
        <g>
          <line
            x1={W - PAD_R - 70}
            y1={PAD_T + 4}
            x2={W - PAD_R - 56}
            y2={PAD_T + 4}
            stroke="rgba(148,163,184,0.5)"
            strokeWidth={1.5}
            strokeDasharray="4,3"
          />
          <text
            x={W - PAD_R - 52}
            y={PAD_T + 7}
            fill="rgba(148,163,184,0.5)"
            fontSize={6}
            fontFamily="monospace"
          >
            {comparisonLabel}
          </text>
          <line
            x1={W - PAD_R - 70}
            y1={PAD_T + 14}
            x2={W - PAD_R - 56}
            y2={PAD_T + 14}
            stroke="#f97316"
            strokeWidth={2}
          />
          <text
            x={W - PAD_R - 52}
            y={PAD_T + 17}
            fill="rgba(249,115,22,0.6)"
            fontSize={6}
            fontFamily="monospace"
          >
            CURRENT
          </text>
        </g>
      )}
    </svg>
  );
}

// ────────────────────────────────────────────────────
// Seasonal Pattern SVG Chart (monthly bar chart)
// ────────────────────────────────────────────────────

function SeasonalPatternChart({
  seasonal,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  seasonal: any;
}) {
  const chart = useMemo(() => {
    // Accept monthly returns array or individual month fields
    const monthlyReturns: number[] =
      seasonal.monthlyReturns ??
      seasonal.returns ??
      MONTHS_SHORT.map(
        (_m, i) => seasonal[`m${i + 1}`] ?? seasonal[MONTHS_SHORT[i].toLowerCase()] ?? 0
      );

    if (monthlyReturns.length < 12) return null;

    const W = 400;
    const H = 80;
    const PAD_L = 30;
    const PAD_R = 10;
    const PAD_T = 8;
    const PAD_B = 18;

    const chartW = W - PAD_L - PAD_R;
    const chartH = H - PAD_T - PAD_B;
    const maxAbs = Math.max(...monthlyReturns.map(Math.abs), 0.01);
    const barW = chartW / 12 - 3;
    const zeroY = PAD_T + chartH / 2;

    // Current month (0-based)
    const currentMonth = new Date().getMonth();

    const bars = monthlyReturns.slice(0, 12).map((val, i) => {
      const x = PAD_L + i * (chartW / 12) + 1.5;
      const barHeight = (Math.abs(val) / maxAbs) * (chartH / 2);
      const y = val >= 0 ? zeroY - barHeight : zeroY;
      return { x, y, w: barW, h: barHeight, value: val, isCurrent: i === currentMonth };
    });

    return { W, H, PAD_L, PAD_R, PAD_B, zeroY, bars };
  }, [seasonal]);

  if (!chart) return null;

  const { W, H, PAD_L, PAD_R, PAD_B, zeroY, bars } = chart;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 90 }}>
      {/* Zero line */}
      <line
        x1={PAD_L}
        y1={zeroY}
        x2={W - PAD_R}
        y2={zeroY}
        stroke="rgba(255,255,255,0.1)"
      />

      {/* Bars */}
      {bars.map((bar, i) => (
        <g key={i}>
          <rect
            x={bar.x}
            y={bar.y}
            width={bar.w}
            height={Math.max(bar.h, 1)}
            fill={
              bar.isCurrent
                ? 'rgba(249,115,22,0.8)'
                : bar.value >= 0
                  ? 'rgba(16,185,129,0.5)'
                  : 'rgba(239,68,68,0.5)'
            }
            stroke={bar.isCurrent ? '#f97316' : 'none'}
            strokeWidth={bar.isCurrent ? 1 : 0}
          />
          {/* Month label */}
          <text
            x={bar.x + bar.w / 2}
            y={H - PAD_B + 12}
            textAnchor="middle"
            fill={bar.isCurrent ? 'rgba(249,115,22,0.8)' : 'rgba(255,255,255,0.25)'}
            fontSize={5.5}
            fontFamily="monospace"
            fontWeight={bar.isCurrent ? 'bold' : 'normal'}
          >
            {MONTHS_SHORT[i]}
          </text>
          {/* Value on top/bottom of significant bars */}
          {Math.abs(bar.value) > 0 && (
            <text
              x={bar.x + bar.w / 2}
              y={bar.value >= 0 ? bar.y - 2 : bar.y + bar.h + 8}
              textAnchor="middle"
              fill={
                bar.isCurrent
                  ? 'rgba(249,115,22,0.7)'
                  : bar.value >= 0
                    ? 'rgba(16,185,129,0.6)'
                    : 'rgba(239,68,68,0.6)'
              }
              fontSize={5.5}
              fontFamily="monospace"
            >
              {bar.value >= 0 ? '+' : ''}{bar.value.toFixed(1)}%
            </text>
          )}
        </g>
      ))}

      {/* Y-axis labels */}
      <text x={PAD_L - 4} y={zeroY - 4} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize={6} fontFamily="monospace">
        +
      </text>
      <text x={PAD_L - 4} y={zeroY + 10} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize={6} fontFamily="monospace">
        -
      </text>
    </svg>
  );
}
