import { useState, useMemo } from 'react';
import { useEquityTotalReturnIndex } from '../../api/hooks/use-equity-total-return-index';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──

type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// ── Types ──

type Tab = 'INDICES' | 'COMPARISON' | 'DIVIDENDS' | 'SECTOR TR';
type SortKey =
  | 'name' | 'priceReturn' | 'totalReturn' | 'excessReturn'
  | 'divYield' | 'ytdPR' | 'ytdTR' | '1yPR' | '1yTR';
type SortDir = 'asc' | 'desc';

// ── Formatting helpers ──

function fmtPct(n: unknown): string {
  if (typeof n !== 'number' || isNaN(n)) return '--';
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

function fmtNum(n: unknown, dec = 2): string {
  if (typeof n !== 'number' || isNaN(n)) return '--';
  return n.toFixed(dec);
}

function fmtIdx(n: unknown): string {
  if (typeof n !== 'number' || isNaN(n)) return '--';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Color helpers ──

function returnColor(n: unknown): string {
  if (typeof n !== 'number') return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function excessColor(n: unknown): string {
  if (typeof n !== 'number') return 'text-neutral-500';
  if (n > 1) return 'text-emerald-300';
  if (n > 0) return 'text-green-400';
  return 'text-yellow-400';
}

function yieldColor(n: unknown): string {
  if (typeof n !== 'number') return 'text-neutral-500';
  if (n >= 4) return 'text-emerald-300';
  if (n >= 2) return 'text-green-400';
  if (n >= 1) return 'text-yellow-400';
  return 'text-neutral-500';
}

// ── SVG Icon ──

function TrIndexIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 11L5.5 6L8 8.5L12 3" stroke="#4ade80" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 3H12V5" stroke="#4ade80" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="2" y1="11" x2="12" y2="11" stroke="#4ade80" strokeWidth="0.6" opacity="0.3" />
    </svg>
  );
}

// ── Sparkline ──

function Sparkline({ data, width = 56, height = 14, color = '#4ade80' }: { data: number[]; width?: number; height?: number; color?: string }) {
  if (!Array.isArray(data) || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 0.01;
  const pad = 1;

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2);
    const y = pad + ((max - v) / range) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={1}
      />
    </svg>
  );
}

// ── Sorting ──

function sortRows<T>(rows: T[], key: string, dir: SortDir, accessor: (row: T, key: string) => unknown): T[] {
  const sorted = [...rows];
  sorted.sort((a, b) => {
    const av = accessor(a, key);
    const bv = accessor(b, key);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    let cmp = 0;
    if (typeof av === 'string' && typeof bv === 'string') {
      cmp = av.localeCompare(bv);
    } else if (typeof av === 'number' && typeof bv === 'number') {
      cmp = av - bv;
    }
    return dir === 'asc' ? cmp : -cmp;
  });
  return sorted;
}

// ── Sort Header ──

function SortHeader({
  label,
  sortKey: key,
  currentKey,
  dir,
  onSort,
  className = '',
}: {
  label: string;
  sortKey: string;
  currentKey: string;
  dir: SortDir;
  onSort: (k: string) => void;
  className?: string;
}) {
  const active = currentKey === key;
  return (
    <th
      className={`text-[7px] font-mono font-bold uppercase tracking-wider text-left py-1 px-1.5 cursor-pointer select-none whitespace-nowrap ${
        active ? 'text-green-400' : 'text-neutral-600'
      } ${className}`}
      onClick={() => onSort(key)}
    >
      {label}
      {active ? <span className="ml-0.5">{dir === 'asc' ? '\u25B2' : '\u25BC'}</span> : null}
    </th>
  );
}

// ── Main Panel ──

export function EquityTotalReturnIndexPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useEquityTotalReturnIndex();

  const [tab, setTab] = useState<Tab>('INDICES');
  const [sortKey, setSortKey] = useState<string>('excessReturn');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'INDICES', label: 'INDICES' },
    { key: 'COMPARISON', label: 'COMPARISON' },
    { key: 'DIVIDENDS', label: 'DIVIDENDS' },
    { key: 'SECTOR TR', label: 'SECTOR TR' },
  ];

  return (
    <div className="h-full flex flex-col bg-black font-mono overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-green-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <TrIndexIcon />
          <span className="text-[9px] font-black uppercase tracking-wider text-green-400">
            {tr(t, 'etriTitle', 'Equity Total Return Index')}
          </span>
        </div>

        <div className="flex items-center gap-0">
          {tabs.map((tb) => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className="px-2.5 py-1.5 text-[8px] font-bold uppercase tracking-wider transition-colors"
              style={{
                color: tab === tb.key ? '#4ade80' : 'rgba(255,255,255,0.3)',
                borderBottom: tab === tb.key ? '1px solid #4ade80' : '1px solid transparent',
                background: tab === tb.key ? 'rgba(74,222,128,0.12)' : 'transparent',
              }}
            >
              {tb.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-green-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data ? (
          <div className="text-center py-8 text-green-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        ) : null}

        {!data && !isLoading ? (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'etriNoData', 'No data available')}
          </div>
        ) : null}

        {data && tab === 'INDICES' ? (
          <IndicesTab
            data={data}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            t={t}
          />
        ) : null}

        {data && tab === 'COMPARISON' ? (
          <ComparisonTab data={data} t={t} />
        ) : null}

        {data && tab === 'DIVIDENDS' ? (
          <DividendsTab data={data} t={t} />
        ) : null}

        {data && tab === 'SECTOR TR' ? (
          <SectorTRTab data={data} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} t={t} />
        ) : null}
      </div>
    </div>
  );
}

// ── INDICES Tab ──

function IndicesTab({
  data,
  sortKey,
  sortDir,
  onSort,
  t,
}: {
  data: any;
  sortKey: string;
  sortDir: SortDir;
  onSort: (k: string) => void;
  t: TFn;
}) {
  const indices = data?.indices ?? [];

  const accessor = (row: any, key: string): unknown => {
    switch (key) {
      case 'name': return row.name;
      case 'priceReturn': return row.priceReturn;
      case 'totalReturn': return row.totalReturn;
      case 'excessReturn': return row.excessReturn;
      case 'divYield': return row.divYield;
      case 'ytdPR': return row.ytdPriceReturn;
      case 'ytdTR': return row.ytdTotalReturn;
      case '1yPR': return row.oneYearPriceReturn;
      case '1yTR': return row.oneYearTotalReturn;
      default: return null;
    }
  };

  const sorted = useMemo(
    () => sortRows(indices, sortKey, sortDir, accessor),
    [indices, sortKey, sortDir],
  );

  return (
    <div>
      {/* Summary badges */}
      {indices.length > 0 ? (
        <div className="px-3 py-1 border-b border-border/10 flex items-center gap-3">
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'etriAvgExcess', 'Avg Excess Return')}
          </span>
          <span className={`text-[8px] font-mono font-bold ${excessColor(
            indices.reduce((s: number, r: any) => s + (typeof r.excessReturn === 'number' ? r.excessReturn : 0), 0) / (indices.length || 1)
          )}`}>
            {fmtPct(
              indices.reduce((s: number, r: any) => s + (typeof r.excessReturn === 'number' ? r.excessReturn : 0), 0) / (indices.length || 1)
            )}
          </span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider ml-2">
            {tr(t, 'etriCount', 'Indices')}
          </span>
          <span className="text-[8px] font-mono font-bold text-green-400">
            {String(indices.length)}
          </span>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-border/20">
              <SortHeader label={tr(t, 'etriName', 'Index')} sortKey="name" currentKey={sortKey} dir={sortDir} onSort={onSort} />
              <th className="text-[7px] font-mono font-bold uppercase tracking-wider text-left py-1 px-1.5 text-neutral-600 whitespace-nowrap">
                {tr(t, 'etriLevel', 'Level')}
              </th>
              <SortHeader label={tr(t, 'etriPriceRet', 'Price Ret')} sortKey="priceReturn" currentKey={sortKey} dir={sortDir} onSort={onSort} />
              <SortHeader label={tr(t, 'etriTotalRet', 'Total Ret')} sortKey="totalReturn" currentKey={sortKey} dir={sortDir} onSort={onSort} />
              <SortHeader label={tr(t, 'etriExcess', 'Excess')} sortKey="excessReturn" currentKey={sortKey} dir={sortDir} onSort={onSort} />
              <SortHeader label={tr(t, 'etriDivYield', 'Div Yield')} sortKey="divYield" currentKey={sortKey} dir={sortDir} onSort={onSort} />
              <SortHeader label={tr(t, 'etriYtdPR', 'YTD PR')} sortKey="ytdPR" currentKey={sortKey} dir={sortDir} onSort={onSort} />
              <SortHeader label={tr(t, 'etriYtdTR', 'YTD TR')} sortKey="ytdTR" currentKey={sortKey} dir={sortDir} onSort={onSort} />
              <th className="text-[7px] font-mono font-bold uppercase tracking-wider text-left py-1 px-1.5 text-neutral-600 whitespace-nowrap">
                {tr(t, 'etriTrend', 'Trend')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row: any) => {
              const excess = typeof row.excessReturn === 'number' ? row.excessReturn : null;
              return (
                <tr key={String(row.name ?? row.ticker ?? Math.random())} className="border-b border-border/10 hover:bg-green-400/[0.02]">
                  <td className="text-[9px] font-mono font-bold text-green-400 py-1 px-1.5 whitespace-nowrap">
                    {String(row.name ?? '--')}
                  </td>
                  <td className="text-[9px] font-mono text-white py-1 px-1.5 whitespace-nowrap">
                    {fmtIdx(row.level)}
                  </td>
                  <td className={`text-[9px] font-mono font-bold py-1 px-1.5 ${returnColor(row.priceReturn)}`}>
                    {fmtPct(row.priceReturn)}
                  </td>
                  <td className={`text-[9px] font-mono font-bold py-1 px-1.5 ${returnColor(row.totalReturn)}`}>
                    {fmtPct(row.totalReturn)}
                  </td>
                  {/* Excess return highlighted — the dividend contribution */}
                  <td className="py-1 px-1.5">
                    <div className="flex items-center gap-1">
                      <span className={`text-[9px] font-mono font-bold ${excessColor(excess)}`}>
                        {fmtPct(excess)}
                      </span>
                      {typeof excess === 'number' ? (
                        <div className="w-10 h-1.5 bg-neutral-800 overflow-hidden">
                          <div
                            className="h-full"
                            style={{
                              width: `${Math.min(100, Math.abs(excess) * 15)}%`,
                              backgroundColor: excess > 1 ? '#6ee7b7' : excess > 0 ? '#4ade80' : '#facc15',
                            }}
                          />
                        </div>
                      ) : null}
                    </div>
                  </td>
                  <td className={`text-[9px] font-mono py-1 px-1.5 ${yieldColor(row.divYield)}`}>
                    {fmtNum(row.divYield)}%
                  </td>
                  <td className={`text-[9px] font-mono py-1 px-1.5 ${returnColor(row.ytdPriceReturn)}`}>
                    {fmtPct(row.ytdPriceReturn)}
                  </td>
                  <td className={`text-[9px] font-mono py-1 px-1.5 ${returnColor(row.ytdTotalReturn)}`}>
                    {fmtPct(row.ytdTotalReturn)}
                  </td>
                  <td className="py-1 px-1.5">
                    {Array.isArray(row.history) ? (
                      <Sparkline data={row.history} />
                    ) : (
                      <span className="text-[7px] text-neutral-700">--</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {indices.length === 0 ? (
        <div className="px-3 py-2 text-[7px] font-mono text-neutral-600 uppercase">NO DATA</div>
      ) : null}
    </div>
  );
}

// ── COMPARISON Tab ──
// Price return vs total return side by side — highlight excess from dividends

function ComparisonTab({ data, t }: { data: any; t: TFn }) {
  const comparison = data?.comparison ?? [];

  // Chart dimensions
  const W = 500;
  const H = 200;
  const PAD_L = 40;
  const PAD_R = 15;
  const PAD_T = 20;
  const PAD_B = 45;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  // Compute scale from data
  const allVals = comparison.flatMap((c: any) => [c.priceReturn ?? 0, c.totalReturn ?? 0]);
  const minVal = allVals.length > 0 ? Math.min(0, Math.min(...allVals)) - 1 : -5;
  const maxVal = allVals.length > 0 ? Math.max(...allVals) + 2 : 20;
  const rangeV = maxVal - minVal || 1;

  const barCount = comparison.length;
  const groupW = barCount > 0 ? chartW / barCount : 40;
  const barW = Math.min(16, groupW * 0.35);
  const gap = (groupW - barW * 2) / 3;

  const scaleY = (v: number) => PAD_T + ((maxVal - v) / rangeV) * chartH;
  const zeroY = scaleY(0);

  // Grid
  const gridStep = rangeV / 5;
  const gridValues: number[] = [];
  for (let i = 0; i <= 5; i++) {
    gridValues.push(minVal + i * gridStep);
  }

  return (
    <div>
      <div className="px-3 py-1 border-b border-border/10 flex items-center justify-between">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'etriCompTitle', 'Price Return vs Total Return')}
        </span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2" style={{ backgroundColor: 'rgba(74,222,128,0.4)' }} />
            <span className="text-[7px] font-mono text-neutral-500">PRICE RET</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2" style={{ backgroundColor: '#4ade80' }} />
            <span className="text-[7px] font-mono text-neutral-500">TOTAL RET</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2" style={{ backgroundColor: '#fbbf24' }} />
            <span className="text-[7px] font-mono text-neutral-500">EXCESS (DIV)</span>
          </div>
        </div>
      </div>

      {comparison.length > 0 ? (
        <div className="px-3 py-3">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 200 }}>
            {/* Grid lines */}
            {gridValues.map((v, i) => (
              <g key={i}>
                <line
                  x1={PAD_L}
                  y1={scaleY(v)}
                  x2={W - PAD_R}
                  y2={scaleY(v)}
                  stroke="rgba(255,255,255,0.05)"
                  strokeDasharray="2,3"
                />
                <text
                  x={PAD_L - 4}
                  y={scaleY(v) + 3}
                  textAnchor="end"
                  fill="rgba(255,255,255,0.2)"
                  fontSize={6}
                  fontFamily="monospace"
                >
                  {v.toFixed(1)}%
                </text>
              </g>
            ))}

            {/* Zero line */}
            <line
              x1={PAD_L}
              y1={zeroY}
              x2={W - PAD_R}
              y2={zeroY}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={0.8}
            />

            {/* Bar groups */}
            {comparison.map((c: any, i: number) => {
              const groupX = PAD_L + i * groupW;
              const prVal = typeof c.priceReturn === 'number' ? c.priceReturn : 0;
              const trVal = typeof c.totalReturn === 'number' ? c.totalReturn : 0;
              const excess = trVal - prVal;

              // Price return bar
              const prX = groupX + gap;
              const prY1 = prVal >= 0 ? scaleY(prVal) : zeroY;
              const prH = Math.abs(scaleY(prVal) - zeroY);

              // Total return bar
              const trX = prX + barW + gap;
              const trY1 = trVal >= 0 ? scaleY(trVal) : zeroY;
              const trH = Math.abs(scaleY(trVal) - zeroY);

              // Excess overlay on total return bar
              const exY1 = trVal >= 0 ? scaleY(trVal) : scaleY(prVal);
              const exH = Math.abs(excess) * (chartH / rangeV);

              return (
                <g key={String(c.name ?? i)}>
                  {/* Price return bar */}
                  <rect
                    x={prX}
                    y={prY1}
                    width={barW}
                    height={Math.max(1, prH)}
                    fill="rgba(74,222,128,0.4)"
                  />

                  {/* Total return bar */}
                  <rect
                    x={trX}
                    y={trY1}
                    width={barW}
                    height={Math.max(1, trH)}
                    fill="#4ade80"
                    opacity={0.85}
                  />

                  {/* Excess (dividend contribution) overlay */}
                  {excess > 0 ? (
                    <rect
                      x={trX}
                      y={exY1}
                      width={barW}
                      height={Math.max(1, exH)}
                      fill="#fbbf24"
                      opacity={0.6}
                    />
                  ) : null}

                  {/* Value labels */}
                  <text
                    x={prX + barW / 2}
                    y={prY1 - 3}
                    textAnchor="middle"
                    fill="rgba(74,222,128,0.7)"
                    fontSize={5.5}
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {prVal.toFixed(1)}
                  </text>
                  <text
                    x={trX + barW / 2}
                    y={trY1 - 3}
                    textAnchor="middle"
                    fill="#4ade80"
                    fontSize={5.5}
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {trVal.toFixed(1)}
                  </text>

                  {/* Index label */}
                  <text
                    x={groupX + groupW / 2}
                    y={H - PAD_B + 12}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.35)"
                    fontSize={6}
                    fontFamily="monospace"
                  >
                    {String(c.name ?? '').length > 8 ? String(c.name ?? '').slice(0, 7) + '..' : String(c.name ?? '')}
                  </text>

                  {/* Excess label below name */}
                  <text
                    x={groupX + groupW / 2}
                    y={H - PAD_B + 22}
                    textAnchor="middle"
                    fill="#fbbf24"
                    fontSize={5}
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    +{excess.toFixed(1)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      ) : (
        <div className="px-3 py-2 text-[7px] font-mono text-neutral-600 uppercase">NO DATA</div>
      )}

      {/* Comparison table */}
      {comparison.length > 0 ? (
        <div className="border-t border-border/10">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/20">
                <th className="text-[7px] font-mono font-bold uppercase tracking-wider text-left py-1 px-3 text-neutral-600">
                  {tr(t, 'etriIndex', 'Index')}
                </th>
                <th className="text-[7px] font-mono font-bold uppercase tracking-wider text-right py-1 px-3 text-neutral-600">
                  {tr(t, 'etriPR', 'Price Ret')}
                </th>
                <th className="text-[7px] font-mono font-bold uppercase tracking-wider text-right py-1 px-3 text-neutral-600">
                  {tr(t, 'etriTR', 'Total Ret')}
                </th>
                <th className="text-[7px] font-mono font-bold uppercase tracking-wider text-right py-1 px-3 text-green-400/60">
                  {tr(t, 'etriExcessRet', 'Excess (Div)')}
                </th>
                <th className="text-[7px] font-mono font-bold uppercase tracking-wider text-left py-1 px-3 text-neutral-600">
                  {tr(t, 'etriBar', '')}
                </th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((c: any) => {
                const pr = typeof c.priceReturn === 'number' ? c.priceReturn : 0;
                const tr2 = typeof c.totalReturn === 'number' ? c.totalReturn : 0;
                const excess = tr2 - pr;
                const barWidth = Math.min(100, Math.abs(excess) * 12);
                return (
                  <tr key={String(c.name ?? Math.random())} className="border-b border-border/10 hover:bg-green-400/[0.02]">
                    <td className="text-[9px] font-mono font-bold text-green-400 py-1.5 px-3">
                      {String(c.name ?? '--')}
                    </td>
                    <td className={`text-[9px] font-mono font-bold text-right py-1.5 px-3 ${returnColor(c.priceReturn)}`}>
                      {fmtPct(c.priceReturn)}
                    </td>
                    <td className={`text-[9px] font-mono font-bold text-right py-1.5 px-3 ${returnColor(c.totalReturn)}`}>
                      {fmtPct(c.totalReturn)}
                    </td>
                    <td className={`text-[9px] font-mono font-bold text-right py-1.5 px-3 ${excessColor(excess)}`}>
                      {fmtPct(excess)}
                    </td>
                    <td className="py-1.5 px-3">
                      <div className="w-20 h-1.5 bg-neutral-800 overflow-hidden">
                        <div
                          className="h-full"
                          style={{
                            width: `${barWidth}%`,
                            backgroundColor: '#fbbf24',
                            opacity: 0.7,
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

// ── DIVIDENDS Tab ──
// Dividend contribution to total return

function DividendsTab({ data, t }: { data: any; t: TFn }) {
  const dividendContribution = data?.dividendContribution ?? [];
  const topPayers = data?.topDividendPayers ?? [];

  return (
    <>
      {/* Dividend contribution breakdown */}
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-green-400">
            {tr(t, 'etriDivContrib', 'Dividend Contribution to Total Return')}
          </span>
        </div>

        {dividendContribution.length > 0 ? (
          <>
            {/* Visual waterfall */}
            <div className="px-3 py-2">
              {dividendContribution.map((d: any) => {
                const prVal = typeof d.priceReturn === 'number' ? d.priceReturn : 0;
                const divVal = typeof d.dividendReturn === 'number' ? d.dividendReturn : 0;
                const totalVal = prVal + divVal;
                const maxBar = Math.max(Math.abs(totalVal), 30);

                return (
                  <div key={String(d.period ?? d.name ?? Math.random())} className="mb-2">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[8px] font-mono font-bold text-green-400">
                        {String(d.period ?? d.name ?? '--')}
                      </span>
                      <span className="text-[7px] font-mono text-neutral-500">
                        TOTAL: <span className={`font-bold ${returnColor(totalVal)}`}>{fmtPct(totalVal)}</span>
                      </span>
                    </div>
                    {/* Stacked bar */}
                    <div className="flex items-center gap-0 h-3 bg-neutral-900 overflow-hidden">
                      {/* Price return segment */}
                      <div
                        className="h-full relative"
                        style={{
                          width: `${Math.abs(prVal) / maxBar * 100}%`,
                          backgroundColor: prVal >= 0 ? 'rgba(74,222,128,0.35)' : 'rgba(248,113,113,0.35)',
                          minWidth: '2px',
                        }}
                      >
                        <span className="absolute inset-0 flex items-center justify-center text-[6px] font-mono text-white/60">
                          {prVal.toFixed(1)}
                        </span>
                      </div>
                      {/* Dividend return segment */}
                      <div
                        className="h-full relative"
                        style={{
                          width: `${Math.abs(divVal) / maxBar * 100}%`,
                          backgroundColor: '#fbbf24',
                          opacity: 0.6,
                          minWidth: '2px',
                        }}
                      >
                        <span className="absolute inset-0 flex items-center justify-center text-[6px] font-mono text-black/70 font-bold">
                          +{divVal.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[6px] font-mono text-neutral-600">
                        PRICE: {fmtPct(prVal)}
                      </span>
                      <span className="text-[6px] font-mono text-yellow-400/70">
                        DIV: {fmtPct(divVal)}
                      </span>
                      <span className="text-[6px] font-mono text-neutral-600">
                        DIV SHARE: {typeof d.dividendShare === 'number' ? `${d.dividendShare.toFixed(1)}%` : '--'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="px-3 py-1 border-t border-border/10 flex items-center gap-4">
              <div className="flex items-center gap-1">
                <div className="w-3 h-1.5" style={{ backgroundColor: 'rgba(74,222,128,0.35)' }} />
                <span className="text-[6px] font-mono text-neutral-600 uppercase">PRICE RETURN</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-1.5" style={{ backgroundColor: 'rgba(251,191,36,0.6)' }} />
                <span className="text-[6px] font-mono text-neutral-600 uppercase">DIVIDEND RETURN</span>
              </div>
            </div>
          </>
        ) : (
          <div className="px-3 py-2 text-[7px] font-mono text-neutral-600 uppercase">NO DATA</div>
        )}
      </div>

      {/* Top dividend payers */}
      {topPayers.length > 0 ? (
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider text-green-400">
              {tr(t, 'etriTopPayers', 'Top Dividend Payers')}
            </span>
          </div>

          <div className="grid grid-cols-[64px_48px_48px_48px_52px_1fr] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {tr(t, 'etriTicker', 'Ticker')}
            </span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
              {tr(t, 'etriWeight', 'Weight')}
            </span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
              {tr(t, 'etriYield2', 'Yield')}
            </span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
              {tr(t, 'etriDivGrowth', 'Growth')}
            </span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
              {tr(t, 'etriContrib', 'Contrib')}
            </span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-1">
              {tr(t, 'etriPayoutRatio', 'Payout')}
            </span>
          </div>

          {topPayers.map((p: any) => (
            <div
              key={String(p.ticker ?? p.name ?? Math.random())}
              className="grid grid-cols-[64px_48px_48px_48px_52px_1fr] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-green-400/[0.02] transition-colors items-center"
            >
              <span className="text-[8px] font-mono font-bold text-green-400">
                {String(p.ticker ?? p.name ?? '--')}
              </span>
              <span className="text-[8px] font-mono text-white/80 font-bold text-right">
                {typeof p.weight === 'number' ? `${p.weight.toFixed(1)}%` : '--'}
              </span>
              <span className={`text-[8px] font-mono font-bold text-right ${yieldColor(p.yield)}`}>
                {typeof p.yield === 'number' ? `${p.yield.toFixed(2)}%` : '--'}
              </span>
              <span className={`text-[8px] font-mono font-bold text-right ${returnColor(p.divGrowth)}`}>
                {fmtPct(p.divGrowth)}
              </span>
              <span className="text-[8px] font-mono text-yellow-400 font-bold text-right">
                {typeof p.contribution === 'number' ? `${p.contribution.toFixed(2)}%` : '--'}
              </span>
              <span className="text-[8px] font-mono text-neutral-400 text-right pr-1">
                {typeof p.payoutRatio === 'number' ? `${p.payoutRatio.toFixed(0)}%` : '--'}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}

// ── SECTOR TR Tab ──
// Sector-level total return breakdown

function SectorTRTab({
  data,
  sortKey,
  sortDir,
  onSort,
  t,
}: {
  data: any;
  sortKey: string;
  sortDir: SortDir;
  onSort: (k: string) => void;
  t: TFn;
}) {
  const sectors = data?.sectorTR ?? [];

  const accessor = (row: any, key: string): unknown => {
    switch (key) {
      case 'name': return row.sector ?? row.name;
      case 'priceReturn': return row.priceReturn;
      case 'totalReturn': return row.totalReturn;
      case 'excessReturn': return row.excessReturn;
      case 'divYield': return row.divYield;
      default: return null;
    }
  };

  const sorted = useMemo(
    () => sortRows(sectors, sortKey, sortDir, accessor),
    [sectors, sortKey, sortDir],
  );

  // Find best and worst sectors for quick summary
  const best = useMemo(() => {
    if (sectors.length === 0) return null;
    return sectors.reduce((a: any, b: any) =>
      (typeof a.totalReturn === 'number' ? a.totalReturn : -Infinity) >
      (typeof b.totalReturn === 'number' ? b.totalReturn : -Infinity) ? a : b
    );
  }, [sectors]);

  const worst = useMemo(() => {
    if (sectors.length === 0) return null;
    return sectors.reduce((a: any, b: any) =>
      (typeof a.totalReturn === 'number' ? a.totalReturn : Infinity) <
      (typeof b.totalReturn === 'number' ? b.totalReturn : Infinity) ? a : b
    );
  }, [sectors]);

  return (
    <div>
      {/* Quick summary */}
      {best && worst ? (
        <div className="grid grid-cols-2 gap-px border-b border-border/20">
          <div className="px-3 py-1.5 bg-[#030303] hover:bg-green-400/[0.02] transition-colors">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {tr(t, 'etriBestSector', 'Best Sector TR')}
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-[9px] font-mono font-bold text-green-400">
                {String(best.sector ?? best.name ?? '--')}
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-300">
                {fmtPct(best.totalReturn)}
              </span>
            </div>
          </div>
          <div className="px-3 py-1.5 bg-[#030303] hover:bg-green-400/[0.02] transition-colors">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {tr(t, 'etriWorstSector', 'Worst Sector TR')}
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-[9px] font-mono font-bold text-green-400">
                {String(worst.sector ?? worst.name ?? '--')}
              </span>
              <span className="text-[10px] font-mono font-bold text-red-400">
                {fmtPct(worst.totalReturn)}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Sector table with side-by-side price vs total return */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-border/20">
              <SortHeader label={tr(t, 'etriSector', 'Sector')} sortKey="name" currentKey={sortKey} dir={sortDir} onSort={onSort} />
              <SortHeader label={tr(t, 'etriSectorPR', 'Price Ret')} sortKey="priceReturn" currentKey={sortKey} dir={sortDir} onSort={onSort} />
              <SortHeader label={tr(t, 'etriSectorTR', 'Total Ret')} sortKey="totalReturn" currentKey={sortKey} dir={sortDir} onSort={onSort} />
              <SortHeader label={tr(t, 'etriSectorExcess', 'Excess')} sortKey="excessReturn" currentKey={sortKey} dir={sortDir} onSort={onSort} />
              <SortHeader label={tr(t, 'etriSectorYield', 'Div Yield')} sortKey="divYield" currentKey={sortKey} dir={sortDir} onSort={onSort} />
              <th className="text-[7px] font-mono font-bold uppercase tracking-wider text-left py-1 px-1.5 text-neutral-600 whitespace-nowrap">
                {tr(t, 'etriSectorBar', 'PR vs TR')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s: any) => {
              const pr = typeof s.priceReturn === 'number' ? s.priceReturn : 0;
              const tr2 = typeof s.totalReturn === 'number' ? s.totalReturn : 0;
              const excess = typeof s.excessReturn === 'number' ? s.excessReturn : tr2 - pr;
              const maxAbs = Math.max(Math.abs(pr), Math.abs(tr2), 1);

              return (
                <tr key={String(s.sector ?? s.name ?? Math.random())} className="border-b border-border/10 hover:bg-green-400/[0.02]">
                  <td className="text-[9px] font-mono font-bold text-green-400 py-1 px-1.5 whitespace-nowrap">
                    {String(s.sector ?? s.name ?? '--')}
                  </td>
                  <td className={`text-[9px] font-mono font-bold py-1 px-1.5 ${returnColor(s.priceReturn)}`}>
                    {fmtPct(s.priceReturn)}
                  </td>
                  <td className={`text-[9px] font-mono font-bold py-1 px-1.5 ${returnColor(s.totalReturn)}`}>
                    {fmtPct(s.totalReturn)}
                  </td>
                  <td className={`text-[9px] font-mono font-bold py-1 px-1.5 ${excessColor(excess)}`}>
                    {fmtPct(excess)}
                  </td>
                  <td className={`text-[9px] font-mono py-1 px-1.5 ${yieldColor(s.divYield)}`}>
                    {typeof s.divYield === 'number' ? `${s.divYield.toFixed(2)}%` : '--'}
                  </td>
                  {/* Side-by-side mini bars */}
                  <td className="py-1 px-1.5">
                    <div className="flex flex-col gap-px">
                      <div className="flex items-center gap-1">
                        <span className="text-[5px] font-mono text-neutral-600 w-4">PR</span>
                        <div className="w-20 h-1 bg-neutral-800 overflow-hidden">
                          <div
                            className="h-full"
                            style={{
                              width: `${(Math.abs(pr) / maxAbs) * 100}%`,
                              backgroundColor: pr >= 0 ? 'rgba(74,222,128,0.4)' : 'rgba(248,113,113,0.4)',
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[5px] font-mono text-neutral-600 w-4">TR</span>
                        <div className="w-20 h-1 bg-neutral-800 overflow-hidden">
                          <div
                            className="h-full"
                            style={{
                              width: `${(Math.abs(tr2) / maxAbs) * 100}%`,
                              backgroundColor: tr2 >= 0 ? '#4ade80' : '#f87171',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {sectors.length === 0 ? (
        <div className="px-3 py-2 text-[7px] font-mono text-neutral-600 uppercase">NO DATA</div>
      ) : null}
    </div>
  );
}
