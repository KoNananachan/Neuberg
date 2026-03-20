import { Loader2 } from 'lucide-react';
import { useFiAttribution } from '../../api/hooks/use-fi-attribution';
import { useT, tr, TFn } from '../../i18n';

const ACCENT = '#818cf8'; // indigo-400

// ── Formatting helpers ──

function fmtPct(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '-';
  return `${n.toFixed(decimals)}%`;
}

function fmtNum(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(decimals);
}

function fmtBps(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

// ── Color helpers ──

function valColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function valStyle(n: number | null | undefined): string {
  if (n == null) return '#71717a';
  if (n > 0) return '#22c55e';
  if (n < 0) return '#ef4444';
  return '#71717a';
}

// ── Main Panel ──

export function FiAttributionPanel() {
  const t = useT();
  const { data, isLoading, error } = useFiAttribution();

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-red-400 uppercase tracking-widest">
          {tr(t, 'error.loadFailed', 'Failed to load fixed income attribution data')}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Market Summary Bar */}
        {data.marketSummary && <MarketSummaryBar summary={data.marketSummary} />}

        {/* Return Decomposition Table */}
        {data.returnDecomposition && data.returnDecomposition.length > 0 && (
          <ReturnDecompositionTable rows={data.returnDecomposition} />
        )}

        {/* Sector Attribution Table */}
        {data.sectorAttribution && data.sectorAttribution.length > 0 && (
          <SectorAttributionTable rows={data.sectorAttribution} />
        )}

        {/* Duration Attribution Table */}
        {data.durationAttribution && data.durationAttribution.length > 0 && (
          <DurationAttributionTable rows={data.durationAttribution} />
        )}

        {/* Currency Attribution Table */}
        {data.currencyAttribution && data.currencyAttribution.length > 0 && (
          <CurrencyAttributionTable rows={data.currencyAttribution} />
        )}
      </div>
    </div>
  );
}

// ── Summary Item ──

function SummaryItem({
  label,
  value,
  color,
  valueColor,
}: {
  label: string;
  value: string;
  color?: string;
  valueColor?: string;
}) {
  return (
    <div className="flex-1 min-w-0 px-2 border-r border-border/10 last:border-r-0">
      <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider truncate">
        {label}
      </div>
      <div
        className={`text-[10px] font-mono font-bold truncate ${valueColor ?? ''}`}
        style={!valueColor && color ? { color } : !valueColor ? { color: 'white' } : undefined}
      >
        {value}
      </div>
    </div>
  );
}

// ── Market Summary Bar ──

function MarketSummaryBar({ summary }: { summary: any }) {
  return (
    <div className="flex items-center gap-0 border-b border-border/20 px-3 py-2 shrink-0">
      <SummaryItem
        label="Total Return"
        value={fmtPct(summary.totalReturn)}
        valueColor={valColor(summary.totalReturn)}
      />
      <SummaryItem
        label="Benchmark Return"
        value={fmtPct(summary.benchmarkReturn)}
        color={ACCENT}
      />
      <SummaryItem
        label="Excess Return"
        value={fmtPct(summary.excessReturn)}
        valueColor={valColor(summary.excessReturn)}
      />
      <SummaryItem
        label="Tracking Error"
        value={fmtPct(summary.trackingError)}
      />
      <SummaryItem
        label="Info Ratio"
        value={fmtNum(summary.informationRatio)}
        valueColor={valColor(summary.informationRatio)}
      />
      <SummaryItem
        label="Top Contributor"
        value={summary.largestContributor ?? '-'}
        valueColor="text-green-400"
      />
      <SummaryItem
        label="Top Detractor"
        value={summary.largestDetractor ?? '-'}
        valueColor="text-red-400"
      />
    </div>
  );
}

// ── Return Decomposition Table ──

function ReturnDecompositionTable({ rows }: { rows: any[] }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Return Decomposition
        </span>
      </div>
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/10">
          <tr>
            <th className="px-2 py-1 text-left font-bold">Source</th>
            <th className="px-2 py-1 text-right font-bold">MTD %</th>
            <th className="px-2 py-1 text-right font-bold">QTD %</th>
            <th className="px-2 py-1 text-right font-bold">YTD %</th>
            <th className="px-2 py-1 text-right font-bold">Contrib %</th>
            <th className="px-2 py-1 text-right font-bold">Bmk %</th>
            <th className="px-2 py-1 text-right font-bold">Active %</th>
            <th className="px-2 py-1 text-right font-bold">IR</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r: any, i: number) => (
            <tr key={i} className="border-b border-border/5 hover:bg-indigo-400/[0.02]">
              <td className="px-2 py-1 text-left font-bold text-white">{r.source}</td>
              <td className="px-2 py-1 text-right font-bold" style={{ color: valStyle(r.returnMTD) }}>
                {fmtPct(r.returnMTD)}
              </td>
              <td className="px-2 py-1 text-right font-bold" style={{ color: valStyle(r.returnQTD) }}>
                {fmtPct(r.returnQTD)}
              </td>
              <td className="px-2 py-1 text-right font-bold" style={{ color: valStyle(r.returnYTD) }}>
                {fmtPct(r.returnYTD)}
              </td>
              <td className="px-2 py-1 text-right text-white/70">{fmtPct(r.contribution)}</td>
              <td className="px-2 py-1 text-right text-white/60">{fmtPct(r.benchmark)}</td>
              <td className="px-2 py-1 text-right font-bold" style={{ color: valStyle(r.active) }}>
                {fmtPct(r.active)}
              </td>
              <td className="px-2 py-1 text-right text-white/60">{fmtNum(r.informationRatio)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Sector Attribution Table ──

function SectorAttributionTable({ rows }: { rows: any[] }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Sector Attribution
        </span>
      </div>
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/10">
          <tr>
            <th className="px-2 py-1 text-left font-bold">Sector</th>
            <th className="px-2 py-1 text-right font-bold">Wt %</th>
            <th className="px-2 py-1 text-right font-bold">Bmk Wt %</th>
            <th className="px-2 py-1 text-right font-bold">OW %</th>
            <th className="px-2 py-1 text-right font-bold">Tot Ret %</th>
            <th className="px-2 py-1 text-right font-bold">Bmk Ret %</th>
            <th className="px-2 py-1 text-right font-bold">Excess %</th>
            <th className="px-2 py-1 text-right font-bold">Select %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r: any, i: number) => (
            <tr key={i} className="border-b border-border/5 hover:bg-indigo-400/[0.02]">
              <td className="px-2 py-1 text-left font-bold text-white">{r.sector}</td>
              <td className="px-2 py-1 text-right text-white/70">{fmtPct(r.weight)}</td>
              <td className="px-2 py-1 text-right text-white/60">{fmtPct(r.benchmarkWeight)}</td>
              <td className="px-2 py-1 text-right font-bold" style={{ color: valStyle(r.overweight) }}>
                {fmtPct(r.overweight)}
              </td>
              <td className="px-2 py-1 text-right text-white/70">{fmtPct(r.totalReturn)}</td>
              <td className="px-2 py-1 text-right text-white/60">{fmtPct(r.benchmarkReturn)}</td>
              <td className="px-2 py-1 text-right font-bold" style={{ color: valStyle(r.excessReturn) }}>
                {fmtPct(r.excessReturn)}
              </td>
              <td className="px-2 py-1 text-right text-white/70">{fmtPct(r.selectionEffect)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Duration Attribution Table ──

function DurationAttributionTable({ rows }: { rows: any[] }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Duration Attribution
        </span>
      </div>
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/10">
          <tr>
            <th className="px-2 py-1 text-left font-bold">Bucket</th>
            <th className="px-2 py-1 text-right font-bold">Port Dur</th>
            <th className="px-2 py-1 text-right font-bold">Bmk Dur</th>
            <th className="px-2 py-1 text-right font-bold">Active Dur</th>
            <th className="px-2 py-1 text-right font-bold">Yld Chg (bp)</th>
            <th className="px-2 py-1 text-right font-bold">Px Ret %</th>
            <th className="px-2 py-1 text-right font-bold">Contrib %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r: any, i: number) => (
            <tr key={i} className="border-b border-border/5 hover:bg-indigo-400/[0.02]">
              <td className="px-2 py-1 text-left font-bold text-white">{r.bucket}</td>
              <td className="px-2 py-1 text-right text-white/70">{fmtNum(r.portfolioDuration)}</td>
              <td className="px-2 py-1 text-right text-white/60">{fmtNum(r.benchmarkDuration)}</td>
              <td className="px-2 py-1 text-right font-bold" style={{ color: valStyle(r.activeDuration) }}>
                {fmtNum(r.activeDuration)}
              </td>
              <td className="px-2 py-1 text-right text-white/70">{fmtBps(r.yieldChange)}</td>
              <td className="px-2 py-1 text-right font-bold" style={{ color: valStyle(r.priceReturn) }}>
                {fmtPct(r.priceReturn)}
              </td>
              <td className="px-2 py-1 text-right text-white/70">{fmtPct(r.contribution)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Currency Attribution Table ──

function CurrencyAttributionTable({ rows }: { rows: any[] }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Currency Attribution
        </span>
      </div>
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/10">
          <tr>
            <th className="px-2 py-1 text-left font-bold">Currency</th>
            <th className="px-2 py-1 text-right font-bold">Port Wt %</th>
            <th className="px-2 py-1 text-right font-bold">Hedge %</th>
            <th className="px-2 py-1 text-right font-bold">Spot Ret %</th>
            <th className="px-2 py-1 text-right font-bold">Hedge Cost %</th>
            <th className="px-2 py-1 text-right font-bold">Net FX %</th>
            <th className="px-2 py-1 text-right font-bold">Contrib %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r: any, i: number) => (
            <tr key={i} className="border-b border-border/5 hover:bg-indigo-400/[0.02]">
              <td className="px-2 py-1 text-left font-bold text-white">{r.currency}</td>
              <td className="px-2 py-1 text-right text-white/70">{fmtPct(r.portfolioWeight)}</td>
              <td className="px-2 py-1 text-right text-white/60">{fmtPct(r.hedgeRatio)}</td>
              <td className="px-2 py-1 text-right font-bold" style={{ color: valStyle(r.spotReturn) }}>
                {fmtPct(r.spotReturn)}
              </td>
              <td className="px-2 py-1 text-right text-white/60">{fmtPct(r.hedgeCost)}</td>
              <td className="px-2 py-1 text-right font-bold" style={{ color: valStyle(r.netFXReturn) }}>
                {fmtPct(r.netFXReturn)}
              </td>
              <td className="px-2 py-1 text-right text-white/70">{fmtPct(r.contribution)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
