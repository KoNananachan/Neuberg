import { useState, useCallback } from 'react';
import { useOptionsSkew } from '../../api/hooks/use-options-skew';
import { useT } from '../../i18n';

// ── Translation helper ──

function useTr() {
  const t = useT();
  return useCallback(
    (key: string, fallback: string): string => {
      try {
        return (t as (k: string) => string)(key) || fallback;
      } catch {
        return fallback;
      }
    },
    [t],
  );
}

// ── Format helpers ──

function fmtNum(n: number | undefined | null, decimals = 2): string {
  if (n == null) return '--';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(decimals)}`;
}

function fmtPct(n: number | undefined | null, decimals = 1): string {
  if (n == null) return '--';
  return `${n.toFixed(decimals)}%`;
}

function fmtVol(n: number | undefined | null): string {
  if (n == null) return '--';
  return `${n.toFixed(1)}%`;
}

function fmtRatio(n: number | undefined | null): string {
  if (n == null) return '--';
  return n.toFixed(2);
}

function fmtK(n: number | undefined | null): string {
  if (n == null) return '--';
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(Math.round(n));
}

// ── Color helpers ──

function percentileColor(pct: number | undefined | null): string {
  if (pct == null) return 'text-neutral-500';
  if (pct >= 90) return 'text-red-400';
  if (pct >= 75) return 'text-orange-400';
  if (pct >= 50) return 'text-yellow-400';
  if (pct >= 25) return 'text-emerald-400';
  return 'text-blue-400';
}

function percentileBg(pct: number | undefined | null): string {
  if (pct == null) return '';
  if (pct >= 90) return 'bg-red-500/10';
  if (pct >= 75) return 'bg-orange-500/8';
  if (pct >= 50) return 'bg-yellow-500/5';
  return '';
}

function skewColor(v: number | undefined | null): string {
  if (v == null) return 'text-neutral-500';
  if (v < -8) return 'text-red-400';
  if (v < -5) return 'text-orange-400';
  if (v < -2) return 'text-yellow-400';
  if (v < 0) return 'text-neutral-300';
  if (v < 2) return 'text-emerald-400';
  return 'text-emerald-300';
}

function biasColor(bias: string | undefined | null): string {
  if (!bias) return 'text-neutral-400';
  const b = bias.toUpperCase();
  if (b.includes('PUT') || b.includes('BEARISH')) return 'text-red-400';
  if (b.includes('CALL') || b.includes('BULLISH')) return 'text-emerald-400';
  return 'text-neutral-400';
}

function trendColor(trend: string | undefined | null): string {
  if (!trend) return 'text-neutral-400';
  const t = trend.toUpperCase();
  if (t.includes('STEEP') || t.includes('RISING') || t.includes('UP')) return 'text-red-400';
  if (t.includes('FLAT') || t.includes('FALLING') || t.includes('DOWN')) return 'text-emerald-400';
  return 'text-yellow-400';
}

function changeColor(v: number | undefined | null): string {
  if (v == null) return 'text-neutral-500';
  if (v > 0) return 'text-red-400';
  if (v < 0) return 'text-emerald-400';
  return 'text-neutral-400';
}

function directionColor(dir: string | undefined | null): string {
  if (!dir) return 'text-neutral-400';
  const d = dir.toUpperCase();
  if (d.includes('PUT') || d.includes('DOWN') || d.includes('BEAR')) return 'text-red-400';
  if (d.includes('CALL') || d.includes('UP') || d.includes('BULL')) return 'text-emerald-400';
  return 'text-yellow-400';
}

// ── Underlying selector options ──

const INDEX_UNDERLYINGS = ['SPX', 'NDX', 'RUT', 'DJX', 'VIX'];

// ── Main Panel ──

export function OptionsSkewPanel() {
  const tr = useTr();
  const { data, isLoading, error } = useOptionsSkew();
  const [selectedUnderlying, setSelectedUnderlying] = useState('SPX');

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/20 shrink-0">
        <div className="w-0.5 h-3 bg-rose-400" />
        <span className="text-[9px] font-black font-mono uppercase tracking-wider text-rose-400">
          {tr('optionsSkewTitle', 'OPTIONS SKEW MONITOR')}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-rose-400 text-[9px] font-mono uppercase animate-pulse">
            Loading...
          </div>
        )}

        {error && !data && (
          <div className="text-center py-8 text-red-500 text-[9px] font-mono uppercase">
            Error loading options skew data
          </div>
        )}

        {data && (
          <>
            <SummaryBar data={data} tr={tr} />
            <PutCallAnalysis data={data} tr={tr} />
            <IndexSkewSection
              data={data}
              tr={tr}
              selectedUnderlying={selectedUnderlying}
              onSelectUnderlying={setSelectedUnderlying}
            />
            <SingleStockSkewSection data={data} tr={tr} />
            <SectorSkewSection data={data} tr={tr} />
            <SkewTermStructureSection data={data} tr={tr} />
            <ExtremeSkewSection data={data} tr={tr} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Summary Bar ──

function SummaryBar({ data, tr }: { data: any; tr: (k: string, f: string) => string }) {
  const summary = data?.summary ?? {};

  return (
    <div className="grid grid-cols-5 gap-px border-b border-border/20 bg-border/10">
      <MetricCell
        label={tr('optSkewSpx25d', 'SPX 25D SKEW')}
        value={fmtNum(summary.spx25dSkew)}
        cls={skewColor(summary.spx25dSkew)}
      />
      <MetricCell
        label={tr('optSkewSpxPctl', 'SPX SKEW PCTL')}
        value={summary.spxSkewPercentile != null ? `${summary.spxSkewPercentile}%` : '--'}
        cls={percentileColor(summary.spxSkewPercentile)}
      />
      <MetricCell
        label={tr('optSkewAvgEq', 'AVG EQ SKEW')}
        value={fmtNum(summary.avgEquitySkew)}
        cls={skewColor(summary.avgEquitySkew)}
      />
      <MetricCell
        label={tr('optSkewPcBias', 'P/C BIAS')}
        value={summary.putCallBias ?? '--'}
        cls={biasColor(summary.putCallBias)}
      />
      <MetricCell
        label={tr('optSkewTrend', 'SKEW TREND')}
        value={summary.skewTrend ?? '--'}
        cls={trendColor(summary.skewTrend)}
      />
    </div>
  );
}

function MetricCell({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <div className="bg-black px-2 py-1.5">
      <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">{label}</div>
      <div className={`text-[11px] font-black font-mono leading-none mt-0.5 ${cls}`}>{value}</div>
    </div>
  );
}

// ── Put/Call Analysis ──

function PutCallAnalysis({ data, tr }: { data: any; tr: (k: string, f: string) => string }) {
  const pc = data?.putCallAnalysis ?? {};

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/20">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr('optSkewPcAnalysis', 'PUT/CALL ANALYSIS')}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-px bg-border/10">
        <MiniMetric label="SPX P/C" value={fmtRatio(pc.spxPutCallRatio)} cls={pc.spxPutCallRatio > 1 ? 'text-red-400' : 'text-emerald-400'} />
        <MiniMetric label="EQUITY P/C" value={fmtRatio(pc.equityPutCallRatio)} cls={pc.equityPutCallRatio > 1 ? 'text-red-400' : 'text-emerald-400'} />
        <MiniMetric label="INDEX P/C" value={fmtRatio(pc.indexPutCallRatio)} cls={pc.indexPutCallRatio > 1 ? 'text-red-400' : 'text-emerald-400'} />
        <MiniMetric label="TOTAL P/C VOL" value={fmtK(pc.totalPutCallVolume)} cls="text-white" />
        <MiniMetric label="5D MA" value={fmtRatio(pc.fiveDayMA)} cls="text-neutral-300" />
      </div>
    </div>
  );
}

function MiniMetric({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <div className="bg-black px-2 py-1.5">
      <div className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">{label}</div>
      <div className={`text-[10px] font-bold font-mono leading-none mt-0.5 ${cls}`}>{value}</div>
    </div>
  );
}

// ── Index Skew Section ──

function IndexSkewSection({
  data,
  tr,
  selectedUnderlying,
  onSelectUnderlying,
}: {
  data: any;
  tr: (k: string, f: string) => string;
  selectedUnderlying: string;
  onSelectUnderlying: (v: string) => void;
}) {
  const indexSkew = data?.indexSkew ?? {};
  const underlyingData = indexSkew[selectedUnderlying] ?? indexSkew[Object.keys(indexSkew)[0]] ?? {};
  const tenors = underlyingData.tenors ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="flex items-center justify-between px-3 py-1 border-b border-border/20">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr('optSkewIndexSkew', 'INDEX SKEW')}
        </span>
        <select
          value={selectedUnderlying}
          onChange={(e) => onSelectUnderlying(e.target.value)}
          className="bg-white/[0.04] border border-border/20 px-1.5 py-0.5 text-[8px] font-mono text-rose-400 uppercase outline-none focus:border-rose-400/40 appearance-none cursor-pointer"
        >
          {INDEX_UNDERLYINGS.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[48px_56px_56px_56px_52px_52px_48px] px-3 py-1 border-b border-border/20">
        {['TENOR', 'ATM IV', '25D SKEW', '10D SKEW', 'BFLY', 'RISK REV', 'PCTL'].map((h) => (
          <span
            key={h}
            className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right first:text-left"
          >
            {h}
          </span>
        ))}
      </div>

      {/* Tenor rows */}
      {tenors.length > 0 ? (
        tenors.map((row: any, idx: number) => (
          <div
            key={row?.tenor ?? idx}
            className="grid grid-cols-[48px_56px_56px_56px_52px_52px_48px] px-3 py-1.5 border-b border-border/20 hover:bg-rose-400/[0.02] transition-colors"
          >
            <span className="text-[9px] font-mono font-bold text-rose-400">
              {row?.tenor ?? '--'}
            </span>
            <span className="text-[9px] font-mono tabular-nums text-white text-right">
              {fmtVol(row?.atmIv)}
            </span>
            <span className={`text-[9px] font-mono tabular-nums text-right ${skewColor(row?.skew25d)}`}>
              {fmtNum(row?.skew25d)}
            </span>
            <span className={`text-[9px] font-mono tabular-nums text-right ${skewColor(row?.skew10d)}`}>
              {fmtNum(row?.skew10d)}
            </span>
            <span className="text-[9px] font-mono tabular-nums text-right text-blue-400">
              {fmtNum(row?.butterfly)}
            </span>
            <span className={`text-[9px] font-mono tabular-nums text-right ${row?.riskReversal < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {fmtNum(row?.riskReversal)}
            </span>
            <span className={`text-[9px] font-mono tabular-nums text-right font-bold ${percentileColor(row?.percentile)}`}>
              {row?.percentile != null ? `${row.percentile}` : '--'}
            </span>
          </div>
        ))
      ) : (
        <div className="text-center py-3 text-neutral-600 text-[9px] font-mono uppercase">
          NO INDEX SKEW DATA
        </div>
      )}
    </div>
  );
}

// ── Single Stock Skew Section ──

function SingleStockSkewSection({ data, tr }: { data: any; tr: (k: string, f: string) => string }) {
  const stocks = data?.singleStockSkew ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/20">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr('optSkewSingleStock', 'SINGLE STOCK SKEW')}
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[44px_48px_52px_52px_44px_52px_40px] px-3 py-1 border-b border-border/20">
        {['TICKER', 'ATM IV', '1M 25D', '3M 25D', 'P/C', 'SKEW PCTL', 'IV RK'].map((h) => (
          <span
            key={h}
            className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right first:text-left"
          >
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {stocks.length > 0 ? (
        stocks.slice(0, 15).map((row: any, idx: number) => {
          const pctlCls = percentileColor(row?.skewPercentile);
          const pctlBg = percentileBg(row?.skewPercentile);

          return (
            <div
              key={row?.ticker ?? idx}
              className={`grid grid-cols-[44px_48px_52px_52px_44px_52px_40px] px-3 py-1.5 border-b border-border/20 hover:bg-rose-400/[0.02] transition-colors ${pctlBg}`}
            >
              <span className="text-[9px] font-mono font-bold text-rose-400">
                {row?.ticker ?? '--'}
              </span>
              <span className="text-[9px] font-mono tabular-nums text-white text-right">
                {fmtPct(row?.atmIv)}
              </span>
              <span className={`text-[9px] font-mono tabular-nums text-right ${skewColor(row?.skew1m25d)}`}>
                {fmtNum(row?.skew1m25d)}
              </span>
              <span className={`text-[9px] font-mono tabular-nums text-right ${skewColor(row?.skew3m25d)}`}>
                {fmtNum(row?.skew3m25d)}
              </span>
              <span className={`text-[9px] font-mono tabular-nums text-right ${row?.putCallRatio > 1 ? 'text-red-400' : 'text-emerald-400'}`}>
                {fmtRatio(row?.putCallRatio)}
              </span>
              <span className={`text-[9px] font-mono tabular-nums text-right font-bold ${pctlCls}`}>
                {row?.skewPercentile != null ? `${row.skewPercentile}%` : '--'}
              </span>
              <span className={`text-[9px] font-mono tabular-nums text-right ${percentileColor(row?.ivRank)}`}>
                {row?.ivRank != null ? `${row.ivRank}` : '--'}
              </span>
            </div>
          );
        })
      ) : (
        <div className="text-center py-3 text-neutral-600 text-[9px] font-mono uppercase">
          NO SINGLE STOCK DATA
        </div>
      )}
    </div>
  );
}

// ── Sector Skew Section ──

function SectorSkewSection({ data, tr }: { data: any; tr: (k: string, f: string) => string }) {
  const sectors = data?.sectorSkew ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/20">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr('optSkewSector', 'SECTOR SKEW')}
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[72px_56px_48px_44px_56px] px-3 py-1 border-b border-border/20">
        {['SECTOR', 'AVG 25D', 'AVG IV', 'P/C', 'CHG 1W'].map((h) => (
          <span
            key={h}
            className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right first:text-left"
          >
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {sectors.length > 0 ? (
        sectors.slice(0, 11).map((row: any, idx: number) => (
          <div
            key={row?.sector ?? idx}
            className="grid grid-cols-[72px_56px_48px_44px_56px] px-3 py-1.5 border-b border-border/20 hover:bg-rose-400/[0.02] transition-colors"
          >
            <span className="text-[9px] font-mono font-bold text-rose-400 truncate">
              {row?.sector ?? '--'}
            </span>
            <span className={`text-[9px] font-mono tabular-nums text-right ${skewColor(row?.avg25dSkew)}`}>
              {fmtNum(row?.avg25dSkew)}
            </span>
            <span className="text-[9px] font-mono tabular-nums text-right text-white">
              {fmtVol(row?.avgIv)}
            </span>
            <span className={`text-[9px] font-mono tabular-nums text-right ${row?.putCallRatio > 1 ? 'text-red-400' : 'text-emerald-400'}`}>
              {fmtRatio(row?.putCallRatio)}
            </span>
            <span className={`text-[9px] font-mono tabular-nums text-right ${changeColor(row?.skewChange1w)}`}>
              {fmtNum(row?.skewChange1w)}
            </span>
          </div>
        ))
      ) : (
        <div className="text-center py-3 text-neutral-600 text-[9px] font-mono uppercase">
          NO SECTOR DATA
        </div>
      )}
    </div>
  );
}

// ── Skew Term Structure Section ──

function SkewTermStructureSection({ data, tr }: { data: any; tr: (k: string, f: string) => string }) {
  const termStructure = data?.skewTermStructure ?? [];
  const tenors = ['1W', '2W', '1M', '2M', '3M', '6M', '1Y'];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/20">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr('optSkewTermStruct', 'SPX SKEW TERM STRUCTURE')}
        </span>
      </div>

      {/* Column headers */}
      <div
        className="grid px-3 py-1 border-b border-border/20"
        style={{ gridTemplateColumns: `56px ${tenors.map(() => '1fr').join(' ')}` }}
      >
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          METRIC
        </span>
        {tenors.map((t) => (
          <span
            key={t}
            className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right"
          >
            {t}
          </span>
        ))}
      </div>

      {/* Row: 25D Skew */}
      <TermStructureRow
        label="25D SKEW"
        tenors={tenors}
        data={termStructure}
        field="skew25d"
        colorFn={skewColor}
        formatFn={fmtNum}
      />

      {/* Row: 10D Skew */}
      <TermStructureRow
        label="10D SKEW"
        tenors={tenors}
        data={termStructure}
        field="skew10d"
        colorFn={skewColor}
        formatFn={fmtNum}
      />

      {/* Row: Butterfly */}
      <TermStructureRow
        label="BFLY"
        tenors={tenors}
        data={termStructure}
        field="butterfly"
        colorFn={() => 'text-blue-400'}
        formatFn={fmtNum}
      />

      {/* Row: ATM IV */}
      <TermStructureRow
        label="ATM IV"
        tenors={tenors}
        data={termStructure}
        field="atmIv"
        colorFn={() => 'text-white'}
        formatFn={fmtVol}
      />
    </div>
  );
}

function TermStructureRow({
  label,
  tenors,
  data,
  field,
  colorFn,
  formatFn,
}: {
  label: string;
  tenors: string[];
  data: any[];
  field: string;
  colorFn: (v: number | null | undefined) => string;
  formatFn: (v: number | null | undefined, d?: number) => string;
}) {
  return (
    <div
      className="grid px-3 py-1.5 border-b border-border/20 hover:bg-rose-400/[0.02] transition-colors"
      style={{ gridTemplateColumns: `56px ${tenors.map(() => '1fr').join(' ')}` }}
    >
      <span className="text-[8px] font-mono font-bold text-neutral-400 uppercase">
        {label}
      </span>
      {tenors.map((tenor) => {
        const entry = data.find((d: any) => d?.tenor === tenor);
        const val = entry?.[field];
        return (
          <span
            key={tenor}
            className={`text-[9px] font-mono tabular-nums text-right ${colorFn(val)}`}
          >
            {formatFn(val)}
          </span>
        );
      })}
    </div>
  );
}

// ── Extreme Skew Section ──

function ExtremeSkewSection({ data, tr }: { data: any; tr: (k: string, f: string) => string }) {
  const extremes = data?.extremeSkew ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/20">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr('optSkewExtreme', 'EXTREME SKEW')}
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[40px_48px_44px_44px_1fr] px-3 py-1 border-b border-border/20">
        {['TICKER', 'SKEW', 'PCTL', 'DIR', 'CATALYST'].map((h) => (
          <span
            key={h}
            className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right first:text-left last:text-left"
          >
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {extremes.length > 0 ? (
        extremes.slice(0, 10).map((row: any, idx: number) => {
          const isExtreme = row?.percentile != null && row.percentile >= 90;

          return (
            <div
              key={row?.ticker ?? idx}
              className={`grid grid-cols-[40px_48px_44px_44px_1fr] px-3 py-1.5 border-b border-border/20 hover:bg-rose-400/[0.02] transition-colors ${isExtreme ? 'bg-red-500/[0.04]' : ''}`}
            >
              <span className="text-[9px] font-mono font-bold text-rose-400">
                {row?.ticker ?? '--'}
              </span>
              <span className={`text-[9px] font-mono tabular-nums text-right font-bold ${isExtreme ? 'text-orange-400' : skewColor(row?.skew)}`}>
                {fmtNum(row?.skew)}
              </span>
              <span className={`text-[9px] font-mono tabular-nums text-right font-bold ${percentileColor(row?.percentile)}`}>
                {row?.percentile != null ? `${row.percentile}` : '--'}
              </span>
              <span className={`text-[9px] font-mono tabular-nums text-right uppercase ${directionColor(row?.direction)}`}>
                {row?.direction ?? '--'}
              </span>
              <span className="text-[8px] font-mono text-neutral-500 truncate pl-1">
                {row?.catalyst ?? ''}
              </span>
            </div>
          );
        })
      ) : (
        <div className="text-center py-3 text-neutral-600 text-[9px] font-mono uppercase">
          NO EXTREME SKEW DATA
        </div>
      )}
    </div>
  );
}
