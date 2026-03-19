import { useState, useMemo } from 'react';
import { useCommodityFundamentals } from '../../api/hooks/use-commodity-fundamentals';

const ACCENT = '#fb923c'; // orange-400
const ACCENT_DIM = 'rgba(251,146,60,0.08)';

type GroupFilter = 'ALL' | 'ENERGY' | 'METALS' | 'AGRICULTURE' | 'OTHER';

interface CommodityRow {
  commodity: string;
  group: string;
  price: number;
  changePct: number;
  supply: number;
  demand: number;
  balance: number;
  inventory: number;
  inventoryVs5yAvg: number;
  daysSupply: number;
  contango: number;
  producers?: { country: string; output: number; share: number }[];
  consumers?: { country: string; consumption: number; share: number }[];
  seasonality?: { current: number; typicalLow: number; typicalHigh: number; month: string };
}

interface SupplyRisk {
  commodity: string;
  description: string;
  impact: 'LOW' | 'MED' | 'HIGH';
}

// -- Formatting helpers --

function fmtNumber(n: number): string {
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (Math.abs(n) >= 1e3) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return n.toFixed(2);
}

function fmtPct(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}

function fmtPrice(n: number): string {
  if (n >= 1000) return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (n >= 10) return n.toFixed(2);
  return n.toFixed(4);
}

// -- Main Panel --

export function CommodityFundamentalsPanel() {
  const { data, isLoading } = useCommodityFundamentals();
  const [groupFilter, setGroupFilter] = useState<GroupFilter>('ALL');
  const [selectedCommodity, setSelectedCommodity] = useState<string | null>(null);

  const commodities: CommodityRow[] = useMemo(() => {
    return data?.commodities ?? data?.rows ?? [];
  }, [data]);

  const supplyRisks: SupplyRisk[] = useMemo(() => {
    return data?.supplyRisks ?? data?.risks ?? [];
  }, [data]);

  const filtered = useMemo(() => {
    if (groupFilter === 'ALL') return commodities;
    return commodities.filter(
      (c) => (c.group ?? '').toUpperCase() === groupFilter
    );
  }, [commodities, groupFilter]);

  const selectedRow = useMemo(() => {
    if (!selectedCommodity) return null;
    return commodities.find((c) => c.commodity === selectedCommodity) ?? null;
  }, [commodities, selectedCommodity]);

  const sectorSummary = useMemo(() => {
    const surplus = commodities.filter((c) => c.balance > 0).length;
    const deficit = commodities.filter((c) => c.balance < 0).length;
    return { surplus, deficit, total: commodities.length };
  }, [commodities]);

  const groups: GroupFilter[] = ['ALL', 'ENERGY', 'METALS', 'AGRICULTURE', 'OTHER'];

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-2">
          <div className="w-4 h-4 border border-orange-400/40 border-t-orange-400 animate-spin" />
          <div className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest animate-pulse">
            LOADING COMMODITY FUNDAMENTALS...
          </div>
        </div>
      </div>
    );
  }

  // No data
  if (!data || commodities.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">
          NO COMMODITY FUNDAMENTALS DATA AVAILABLE
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/20 shrink-0">
        <span
          className="text-[9px] font-mono font-black uppercase tracking-wider"
          style={{ color: ACCENT }}
        >
          COMMODITY FUNDAMENTALS
        </span>
        <div className="flex items-center gap-3 text-[8px] font-mono text-neutral-500">
          <span className="text-green-400">{sectorSummary.surplus} SURPLUS</span>
          <span className="text-red-400">{sectorSummary.deficit} DEFICIT</span>
          <span>{sectorSummary.total} TOTAL</span>
        </div>
      </div>

      {/* Group filter tabs */}
      <div className="flex items-center gap-0 border-b border-border/20 shrink-0">
        {groups.map((g) => (
          <button
            key={g}
            onClick={() => {
              setGroupFilter(g);
              setSelectedCommodity(null);
            }}
            className="px-3 py-1.5 text-[8px] font-mono font-bold uppercase tracking-wider transition-colors"
            style={{
              color: groupFilter === g ? ACCENT : 'rgba(255,255,255,0.3)',
              borderBottom: groupFilter === g ? `1px solid ${ACCENT}` : '1px solid transparent',
              background: groupFilter === g ? ACCENT_DIM : 'transparent',
            }}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Main table */}
      <div className="flex-1 overflow-auto no-scrollbar">
        <table className="w-full text-[9px] font-mono">
          <thead className="sticky top-0 bg-black/95 text-[7px] font-black text-neutral-500 uppercase tracking-wider border-b border-border/10">
            <tr>
              <th className="px-2 py-1.5 text-left">COMMODITY</th>
              <th className="px-2 py-1.5 text-right">PRICE</th>
              <th className="px-2 py-1.5 text-right">CHG%</th>
              <th className="px-2 py-1.5 text-right">SUPPLY</th>
              <th className="px-2 py-1.5 text-right">DEMAND</th>
              <th className="px-2 py-1.5 text-right">BALANCE</th>
              <th className="px-2 py-1.5 text-right">INVENTORY</th>
              <th className="px-2 py-1.5 text-right">DAYS SUPPLY</th>
              <th className="px-2 py-1.5 text-right">CONTANGO</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-2 py-6 text-center text-neutral-500 uppercase tracking-wider">
                  NO DATA FOR THIS GROUP
                </td>
              </tr>
            )}
            {filtered.map((row) => {
              const isSurplus = row.balance >= 0;
              const isSelected = selectedCommodity === row.commodity;
              const invVsAvg = row.inventoryVs5yAvg ?? 0;
              return (
                <tr
                  key={row.commodity}
                  onClick={() =>
                    setSelectedCommodity(isSelected ? null : row.commodity)
                  }
                  className={`border-b border-border/5 hover:bg-orange-400/[0.02] transition-colors cursor-pointer ${
                    isSelected ? 'bg-orange-400/[0.04]' : ''
                  }`}
                >
                  <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>
                    {row.commodity}
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/80 font-bold">
                    {fmtPrice(row.price)}
                  </td>
                  <td
                    className={`px-2 py-1.5 text-right font-bold ${
                      row.changePct >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {fmtPct(row.changePct)}
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/60">
                    {fmtNumber(row.supply)}
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/60">
                    {fmtNumber(row.demand)}
                  </td>
                  <td
                    className={`px-2 py-1.5 text-right font-bold ${
                      isSurplus ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {isSurplus ? '+' : ''}
                    {fmtNumber(row.balance)}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="text-white/60">{fmtNumber(row.inventory)}</span>
                      <InventoryIndicator pctVsAvg={invVsAvg} />
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/60">
                    {row.daysSupply?.toFixed(1) ?? '--'}
                  </td>
                  <td
                    className={`px-2 py-1.5 text-right font-bold ${
                      row.contango > 0
                        ? 'text-amber-400'
                        : row.contango < 0
                          ? 'text-cyan-400'
                          : 'text-white/40'
                    }`}
                  >
                    {row.contango > 0
                      ? fmtPct(row.contango)
                      : row.contango < 0
                        ? fmtPct(row.contango)
                        : 'FLAT'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Selected commodity detail */}
      {selectedRow && (
        <div className="border-t border-border/20 shrink-0 max-h-[40%] overflow-auto no-scrollbar">
          <div className="px-3 py-1.5 border-b border-border/10">
            <span
              className="text-[8px] font-mono font-black uppercase tracking-wider"
              style={{ color: ACCENT }}
            >
              {selectedRow.commodity} DETAIL
            </span>
          </div>

          <div className="flex divide-x divide-border/10">
            {/* Top producers */}
            <div className="flex-1 min-w-0">
              <div className="px-2 py-1 text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider border-b border-border/10">
                TOP PRODUCERS
              </div>
              {selectedRow.producers?.length ? (
                <table className="w-full text-[9px] font-mono">
                  <thead className="text-[7px] font-black text-neutral-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-2 py-1 text-left">COUNTRY</th>
                      <th className="px-2 py-1 text-right">OUTPUT</th>
                      <th className="px-2 py-1 text-right">SHARE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRow.producers.map((p) => (
                      <tr
                        key={p.country}
                        className="border-b border-border/5 hover:bg-orange-400/[0.02]"
                      >
                        <td className="px-2 py-1 text-white/70">{p.country}</td>
                        <td className="px-2 py-1 text-right text-white/60">
                          {fmtNumber(p.output)}
                        </td>
                        <td className="px-2 py-1 text-right text-white/40">
                          {p.share.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="px-2 py-3 text-[8px] text-neutral-600 uppercase tracking-wider text-center">
                  NO PRODUCER DATA
                </div>
              )}
            </div>

            {/* Top consumers */}
            <div className="flex-1 min-w-0">
              <div className="px-2 py-1 text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider border-b border-border/10">
                TOP CONSUMERS
              </div>
              {selectedRow.consumers?.length ? (
                <table className="w-full text-[9px] font-mono">
                  <thead className="text-[7px] font-black text-neutral-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-2 py-1 text-left">COUNTRY</th>
                      <th className="px-2 py-1 text-right">CONSUMPTION</th>
                      <th className="px-2 py-1 text-right">SHARE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRow.consumers.map((c) => (
                      <tr
                        key={c.country}
                        className="border-b border-border/5 hover:bg-orange-400/[0.02]"
                      >
                        <td className="px-2 py-1 text-white/70">{c.country}</td>
                        <td className="px-2 py-1 text-right text-white/60">
                          {fmtNumber(c.consumption)}
                        </td>
                        <td className="px-2 py-1 text-right text-white/40">
                          {c.share.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="px-2 py-3 text-[8px] text-neutral-600 uppercase tracking-wider text-center">
                  NO CONSUMER DATA
                </div>
              )}
            </div>

            {/* Seasonality */}
            <div className="flex-1 min-w-0">
              <div className="px-2 py-1 text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider border-b border-border/10">
                SEASONALITY
              </div>
              {selectedRow.seasonality ? (
                <SeasonalityIndicator seasonality={selectedRow.seasonality} />
              ) : (
                <div className="px-2 py-3 text-[8px] text-neutral-600 uppercase tracking-wider text-center">
                  NO SEASONALITY DATA
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Supply risks */}
      {supplyRisks.length > 0 && (
        <div className="border-t border-border/20 shrink-0">
          <div className="px-3 py-1 text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider border-b border-border/10">
            SUPPLY RISKS
          </div>
          <div className="flex flex-wrap gap-1.5 px-3 py-1.5 max-h-20 overflow-auto no-scrollbar">
            {supplyRisks.map((risk, i) => (
              <RiskBadge key={`${risk.commodity}-${i}`} risk={risk} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// -- Inventory vs 5yr avg indicator --

function InventoryIndicator({ pctVsAvg }: { pctVsAvg: number }) {
  const isBelow = pctVsAvg < 0;
  const absVal = Math.abs(pctVsAvg);
  const barWidth = Math.min(absVal, 50);

  return (
    <div className="flex items-center gap-1">
      <div className="w-8 h-1.5 bg-white/[0.04] relative flex items-center">
        {/* Center line for 5yr avg */}
        <div className="absolute left-1/2 w-px h-full bg-white/20" />
        {isBelow ? (
          <div
            className="absolute right-1/2 h-full bg-green-500/60"
            style={{ width: `${(barWidth / 50) * 50}%` }}
          />
        ) : (
          <div
            className="absolute left-1/2 h-full bg-red-500/60"
            style={{ width: `${(barWidth / 50) * 50}%` }}
          />
        )}
      </div>
      <span
        className={`text-[6px] font-bold ${
          isBelow ? 'text-green-400/70' : pctVsAvg > 0 ? 'text-red-400/70' : 'text-white/30'
        }`}
      >
        {pctVsAvg >= 0 ? '+' : ''}
        {pctVsAvg.toFixed(0)}%
      </span>
    </div>
  );
}

// -- Seasonality indicator --

function SeasonalityIndicator({
  seasonality,
}: {
  seasonality: { current: number; typicalLow: number; typicalHigh: number; month: string };
}) {
  const { current, typicalLow, typicalHigh, month } = seasonality;
  const range = typicalHigh - typicalLow;
  const pctInRange = range > 0 ? ((current - typicalLow) / range) * 100 : 50;
  const clamped = Math.max(0, Math.min(100, pctInRange));

  let positionLabel = 'MID-RANGE';
  let positionColor = 'text-amber-400';
  if (pctInRange > 100) {
    positionLabel = 'ABOVE TYPICAL';
    positionColor = 'text-red-400';
  } else if (pctInRange < 0) {
    positionLabel = 'BELOW TYPICAL';
    positionColor = 'text-green-400';
  } else if (pctInRange > 75) {
    positionLabel = 'UPPER RANGE';
    positionColor = 'text-red-400/70';
  } else if (pctInRange < 25) {
    positionLabel = 'LOWER RANGE';
    positionColor = 'text-green-400/70';
  }

  return (
    <div className="px-2 py-2 flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[7px] font-mono text-neutral-500 uppercase">{month}</span>
        <span className={`text-[7px] font-mono font-bold uppercase ${positionColor}`}>
          {positionLabel}
        </span>
      </div>
      {/* Range bar */}
      <div className="w-full h-2 bg-white/[0.04] relative">
        {/* Typical range background */}
        <div className="absolute inset-0 bg-white/[0.06]" />
        {/* Current position marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5"
          style={{
            left: `${clamped}%`,
            backgroundColor: ACCENT,
          }}
        />
      </div>
      <div className="flex items-center justify-between text-[7px] font-mono text-neutral-500">
        <span>LOW {fmtNumber(typicalLow)}</span>
        <span
          className="font-bold"
          style={{ color: ACCENT }}
        >
          {fmtNumber(current)}
        </span>
        <span>HIGH {fmtNumber(typicalHigh)}</span>
      </div>
    </div>
  );
}

// -- Risk badge --

function RiskBadge({ risk }: { risk: SupplyRisk }) {
  const impactStyles: Record<string, { bg: string; border: string; text: string }> = {
    LOW: {
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
      text: 'text-green-400',
    },
    MED: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
    },
    HIGH: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      text: 'text-red-400',
    },
  };

  const style = impactStyles[risk.impact] ?? impactStyles.LOW;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 border ${style.bg} ${style.border}`}
    >
      <span className="text-[8px] font-mono font-bold" style={{ color: ACCENT }}>
        {risk.commodity}
      </span>
      <span className="text-[7px] font-mono text-white/50">{risk.description}</span>
      <span
        className={`text-[6px] font-mono font-black uppercase tracking-wider px-1 py-0.5 border ${style.border} ${style.bg} ${style.text}`}
      >
        {risk.impact}
      </span>
    </div>
  );
}
