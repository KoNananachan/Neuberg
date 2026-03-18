import { useState } from 'react';
import {
  useDebtMaturity,
  type DebtMaturityResponse,
} from '../../api/hooks/use-debt-maturity';
import { useT } from '../../i18n';
import { Building2, RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Types ──

type View = 'WALL' | 'TABLE' | 'RATINGS';

// ── Colors ──

const SLATE = '#64748b';
const RATING_COLORS = {
  aaa_aa: '#60a5fa', // blue
  a: '#4ade80',      // green
  bbb: '#facc15',    // yellow
  hy: '#f87171',     // red
};

const RISK_STYLES: Record<string, { color: string; bg: string }> = {
  LOW: { color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
  MODERATE: { color: '#facc15', bg: 'rgba(250,204,21,0.1)' },
  HIGH: { color: '#fb923c', bg: 'rgba(251,146,60,0.1)' },
  CRITICAL: { color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
};

const ENTITY_LABELS: Record<string, string> = {
  US_IG: 'US IG',
  US_HY: 'US HY',
  EU_IG: 'EU IG',
  EM_CORP: 'EM Corp',
  US_TREASURY: 'UST',
};

// ── Formatting ──

function fmtB(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'T';
  return n.toFixed(0) + 'B';
}

function fmtBDec(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(2) + 'T';
  if (n >= 100) return n.toFixed(0) + 'B';
  return n.toFixed(1) + 'B';
}

function fmtPct(n: number): string {
  return n.toFixed(2) + '%';
}

function fmtYrs(n: number): string {
  return n.toFixed(1) + 'Y';
}

// ── Main Panel ──

export function DebtMaturityPanel() {
  const t = useT();
  const [entity, setEntity] = useState('US_IG');
  const [view, setView] = useState<View>('WALL');
  const { data, isLoading, refetch } = useDebtMaturity(entity);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-white/[0.08] shrink-0">
        <div className="flex items-center gap-2">
          <Building2 className="w-3.5 h-3.5" style={{ color: SLATE }} />
          <span className="text-[9px] font-black uppercase tracking-tighter" style={{ color: SLATE }}>
            {tr(t, 'dmTitle', 'Debt Maturity Profile')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Entity selector */}
          <select
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
            className="bg-transparent text-[8px] font-mono font-bold uppercase text-white/60 border border-white/[0.08] px-1.5 py-0.5 outline-none cursor-pointer hover:border-white/20 appearance-none"
            style={{ WebkitAppearance: 'none' }}
          >
            {(data?.entities ?? ['US_IG', 'US_HY', 'EU_IG', 'EM_CORP', 'US_TREASURY']).map((e) => (
              <option key={e} value={e} className="bg-black text-white">
                {ENTITY_LABELS[e] ?? e}
              </option>
            ))}
          </select>
          <button
            onClick={() => refetch()}
            className="p-1 text-white/30 hover:text-slate-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* View tabs */}
      <div className="flex gap-px px-2 py-1 border-b border-white/[0.06] shrink-0">
        {(['WALL', 'TABLE', 'RATINGS'] as View[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-2 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider transition-colors ${
              view === v
                ? 'text-slate-400 border-b border-slate-400'
                : 'text-neutral-600 hover:text-neutral-400'
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" />
              <span className="text-[10px] text-white/40 uppercase tracking-widest">
                {tr(t, 'loading', 'Loading...')}
              </span>
            </div>
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'dmNoData', 'No data available')}
          </div>
        )}

        {data && view === 'WALL' && <WallView data={data} t={t} />}
        {data && view === 'TABLE' && <TableView data={data} t={t} />}
        {data && view === 'RATINGS' && <RatingsView data={data} t={t} />}
      </div>
    </div>
  );
}

// ── WALL VIEW ──

function WallView({ data, t }: { data: DebtMaturityResponse; t: ReturnType<typeof useT> }) {
  const { buckets, profile } = data;
  const maxAmount = Math.max(...buckets.map((b) => b.amount), 1);

  const W = 420;
  const H = 200;
  const PAD_L = 38;
  const PAD_R = 8;
  const PAD_T = 12;
  const PAD_B = 24;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;
  const barW = chartW / buckets.length;

  const scaleY = (v: number) => PAD_T + chartH * (1 - v / maxAmount);

  // Y-axis labels
  const ySteps = 4;
  const yLabels = Array.from({ length: ySteps + 1 }, (_, i) => {
    const val = (maxAmount / ySteps) * i;
    return { value: val, y: scaleY(val) };
  });

  return (
    <div>
      {/* Chart */}
      <div className="px-2 py-1.5">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 240 }}>
          {/* Grid lines */}
          {yLabels.map((l, i) => (
            <g key={i}>
              <line
                x1={PAD_L}
                y1={l.y}
                x2={W - PAD_R}
                y2={l.y}
                stroke="rgba(255,255,255,0.04)"
                strokeDasharray="2,3"
              />
              <text
                x={PAD_L - 3}
                y={l.y + 3}
                textAnchor="end"
                fill="rgba(255,255,255,0.25)"
                fontSize={6}
                fontFamily="monospace"
              >
                ${fmtB(l.value)}
              </text>
            </g>
          ))}

          {/* Stacked bars */}
          {buckets.map((b, i) => {
            const x = PAD_L + i * barW + barW * 0.1;
            const w = barW * 0.8;
            const rb = b.ratingBreakdown;
            const total = b.amount;
            if (total <= 0) return null;

            // Stack from bottom: AAA/AA, A, BBB, HY
            const segments = [
              { key: 'aaa_aa', value: rb.aaa_aa, color: RATING_COLORS.aaa_aa },
              { key: 'a', value: rb.a, color: RATING_COLORS.a },
              { key: 'bbb', value: rb.bbb, color: RATING_COLORS.bbb },
              { key: 'hy', value: rb.highYield, color: RATING_COLORS.hy },
            ];

            let accumulated = 0;
            const isWallYear = b.year === profile.wallYear;

            return (
              <g key={b.year}>
                {segments.map((seg) => {
                  if (seg.value <= 0) return null;
                  const segStart = accumulated;
                  accumulated += seg.value;
                  const y1 = scaleY(accumulated);
                  const y0 = scaleY(segStart);
                  const h = y0 - y1;
                  return (
                    <rect
                      key={seg.key}
                      x={x}
                      y={y1}
                      width={w}
                      height={Math.max(h, 0.5)}
                      fill={seg.color}
                      opacity={isWallYear ? 0.9 : 0.65}
                    />
                  );
                })}
                {/* Wall year marker */}
                {isWallYear && (
                  <>
                    <line
                      x1={x + w / 2}
                      y1={scaleY(total) - 6}
                      x2={x + w / 2}
                      y2={scaleY(total) - 2}
                      stroke={SLATE}
                      strokeWidth={1}
                    />
                    <polygon
                      points={`${x + w / 2 - 3},${scaleY(total) - 6} ${x + w / 2 + 3},${scaleY(total) - 6} ${x + w / 2},${scaleY(total) - 2}`}
                      fill={SLATE}
                    />
                    <text
                      x={x + w / 2}
                      y={scaleY(total) - 9}
                      textAnchor="middle"
                      fill={SLATE}
                      fontSize={6}
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      WALL
                    </text>
                  </>
                )}
                {/* Amount label on top */}
                <text
                  x={x + w / 2}
                  y={scaleY(total) - (isWallYear ? 16 : 3)}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.4)"
                  fontSize={5.5}
                  fontFamily="monospace"
                >
                  ${fmtB(total)}
                </text>
              </g>
            );
          })}

          {/* X-axis year labels */}
          {buckets.map((b, i) => (
            <text
              key={b.year}
              x={PAD_L + i * barW + barW / 2}
              y={H - PAD_B + 12}
              textAnchor="middle"
              fill={b.year === profile.wallYear ? SLATE : 'rgba(255,255,255,0.3)'}
              fontSize={b.year === profile.wallYear ? 7 : 6}
              fontFamily="monospace"
              fontWeight={b.year === profile.wallYear ? 'bold' : 'normal'}
            >
              {b.year}
            </text>
          ))}

          {/* Legend */}
          {[
            { label: 'AAA/AA', color: RATING_COLORS.aaa_aa },
            { label: 'A', color: RATING_COLORS.a },
            { label: 'BBB', color: RATING_COLORS.bbb },
            { label: 'HY', color: RATING_COLORS.hy },
          ].map((item, i) => (
            <g key={item.label} transform={`translate(${PAD_L + i * 60}, ${H - 4})`}>
              <rect x={0} y={-4} width={6} height={4} fill={item.color} opacity={0.7} />
              <text x={8} y={0} fill="rgba(255,255,255,0.3)" fontSize={5} fontFamily="monospace">
                {item.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-0 border-t border-white/[0.06]">
        <StatBox
          label={tr(t, 'dmTotalOutstanding', 'Total Outstanding')}
          value={`$${profile.totalOutstanding.toFixed(1)}T`}
        />
        <StatBox
          label={tr(t, 'dmAvgMaturity', 'Avg Maturity')}
          value={fmtYrs(profile.avgMaturity)}
        />
        <StatBox
          label={tr(t, 'dmNearTerm', 'Near-Term (2Y)')}
          value={`$${fmtBDec(profile.nearTermMaturities)}`}
        />
        <StatBox
          label={tr(t, 'dmRefinCost', 'Refin. Cost')}
          value={`+${data.refinancingCost}bps`}
          valueColor={data.refinancingCost > 180 ? '#f87171' : data.refinancingCost > 140 ? '#facc15' : '#4ade80'}
        />
      </div>

      {/* Additional metrics */}
      <div className="grid grid-cols-4 gap-0 border-t border-white/[0.04]">
        <StatBox label={tr(t, 'dmAvgCoupon', 'Avg Coupon')} value={fmtPct(profile.avgCoupon)} />
        <StatBox label={tr(t, 'dmAvgYield', 'Avg Yield')} value={fmtPct(profile.avgYield)} />
        <StatBox
          label={tr(t, 'dmWallYear', 'Wall Year')}
          value={String(profile.wallYear)}
          valueColor={SLATE}
        />
        <StatBox
          label={tr(t, 'dmWallAmount', 'Wall Amount')}
          value={`$${fmtBDec(profile.wallAmount)}`}
          valueColor={SLATE}
        />
      </div>

      {/* Timestamp */}
      <div className="px-3 py-1 border-t border-white/[0.04]">
        <span className="text-[7px] font-mono text-white/15">
          {tr(t, 'dmUpdated', 'Updated')}: {new Date(data.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

// ── TABLE VIEW ──

function TableView({ data, t }: { data: DebtMaturityResponse; t: ReturnType<typeof useT> }) {
  return (
    <div>
      {/* Table header */}
      <div className="grid grid-cols-[40px_56px_40px_48px_48px_40px_36px_40px_36px_60px] gap-0 px-2 py-0.5 border-b border-white/[0.08] bg-[#030303]">
        <span className="text-[7px] font-mono text-white/25 uppercase">
          {tr(t, 'dmYear', 'Year')}
        </span>
        <span className="text-[7px] font-mono text-white/25 uppercase text-right">
          {tr(t, 'dmAmount', 'Amt ($B)')}
        </span>
        <span className="text-[7px] font-mono text-white/25 uppercase text-right">
          {tr(t, 'dmIssues', 'Issues')}
        </span>
        <span className="text-[7px] font-mono text-white/25 uppercase text-right">
          {tr(t, 'dmCoupon', 'Coupon')}
        </span>
        <span className="text-[7px] font-mono text-white/25 uppercase text-right">
          {tr(t, 'dmYield', 'Yield')}
        </span>
        <span className="text-[7px] font-mono text-white/25 uppercase text-right">AAA/AA</span>
        <span className="text-[7px] font-mono text-white/25 uppercase text-right">A</span>
        <span className="text-[7px] font-mono text-white/25 uppercase text-right">BBB</span>
        <span className="text-[7px] font-mono text-white/25 uppercase text-right">HY</span>
        <span className="text-[7px] font-mono text-white/25 uppercase text-center">
          {tr(t, 'dmRisk', 'Refin.')}
        </span>
      </div>

      {/* Table rows */}
      {data.buckets.map((b) => {
        const isWall = b.year === data.profile.wallYear;
        const riskStyle = RISK_STYLES[b.refinancingRisk] ?? RISK_STYLES.LOW;
        return (
          <div
            key={b.year}
            className={`grid grid-cols-[40px_56px_40px_48px_48px_40px_36px_40px_36px_60px] gap-0 px-2 py-[3px] border-b border-white/[0.03] hover:bg-slate-400/[0.02] transition-colors items-center ${
              isWall ? 'bg-slate-400/[0.04]' : ''
            }`}
          >
            <span className={`text-[8px] font-mono font-bold ${isWall ? 'text-slate-400' : 'text-white/80'}`}>
              {b.year}{isWall ? '*' : ''}
            </span>
            <span className="text-[8px] font-mono text-white/60 text-right font-bold">
              {fmtBDec(b.amount)}
            </span>
            <span className="text-[8px] font-mono text-white/40 text-right">{b.count}</span>
            <span className="text-[8px] font-mono text-white/50 text-right">{fmtPct(b.avgCoupon)}</span>
            <span className="text-[8px] font-mono text-white/50 text-right">{fmtPct(b.avgYield)}</span>
            <span className="text-[7px] font-mono text-right" style={{ color: RATING_COLORS.aaa_aa + 'cc' }}>
              {b.ratingBreakdown.aaa_aa.toFixed(0)}
            </span>
            <span className="text-[7px] font-mono text-right" style={{ color: RATING_COLORS.a + 'cc' }}>
              {b.ratingBreakdown.a.toFixed(0)}
            </span>
            <span className="text-[7px] font-mono text-right" style={{ color: RATING_COLORS.bbb + 'cc' }}>
              {b.ratingBreakdown.bbb.toFixed(0)}
            </span>
            <span className="text-[7px] font-mono text-right" style={{ color: RATING_COLORS.hy + 'cc' }}>
              {b.ratingBreakdown.highYield.toFixed(0)}
            </span>
            <div className="flex justify-center">
              <span
                className="text-[6px] font-black font-mono uppercase px-1.5 py-0.5"
                style={{ color: riskStyle.color, backgroundColor: riskStyle.bg }}
              >
                {b.refinancingRisk}
              </span>
            </div>
          </div>
        );
      })}

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-white/[0.06] flex items-center gap-3">
        <span className="text-[7px] font-mono text-white/25">* = {tr(t, 'dmWallYearLabel', 'Maturity Wall Year')}</span>
        <span className="text-[7px] font-mono text-white/15">
          {tr(t, 'dmUpdated', 'Updated')}: {new Date(data.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

// ── RATINGS VIEW ──

function RatingsView({ data, t }: { data: DebtMaturityResponse; t: ReturnType<typeof useT> }) {
  const { buckets, profile } = data;

  const W = 420;
  const H = 160;
  const PAD_L = 32;
  const PAD_R = 8;
  const PAD_T = 8;
  const PAD_B = 20;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;
  const barW = chartW / buckets.length;

  return (
    <div>
      {/* 100% stacked bar chart */}
      <div className="px-2 py-1.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[7px] text-white/30 uppercase tracking-wider">
            {tr(t, 'dmRatingComposition', 'Rating Composition by Maturity Year')}
          </span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 200 }}>
          {/* Horizontal grid lines at 25%, 50%, 75% */}
          {[0.25, 0.5, 0.75].map((pct) => {
            const y = PAD_T + chartH * (1 - pct);
            return (
              <g key={pct}>
                <line
                  x1={PAD_L}
                  y1={y}
                  x2={W - PAD_R}
                  y2={y}
                  stroke="rgba(255,255,255,0.04)"
                  strokeDasharray="2,3"
                />
                <text
                  x={PAD_L - 3}
                  y={y + 3}
                  textAnchor="end"
                  fill="rgba(255,255,255,0.2)"
                  fontSize={5.5}
                  fontFamily="monospace"
                >
                  {(pct * 100).toFixed(0)}%
                </text>
              </g>
            );
          })}

          {/* Y-axis 0% and 100% */}
          <text x={PAD_L - 3} y={PAD_T + chartH + 3} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize={5.5} fontFamily="monospace">0%</text>
          <text x={PAD_L - 3} y={PAD_T + 3} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize={5.5} fontFamily="monospace">100%</text>

          {/* 100% stacked bars */}
          {buckets.map((b, i) => {
            const x = PAD_L + i * barW + barW * 0.1;
            const w = barW * 0.8;
            const total = b.ratingBreakdown.aaa_aa + b.ratingBreakdown.a + b.ratingBreakdown.bbb + b.ratingBreakdown.highYield;
            if (total <= 0) return null;

            const segments = [
              { key: 'aaa_aa', value: b.ratingBreakdown.aaa_aa / total, color: RATING_COLORS.aaa_aa },
              { key: 'a', value: b.ratingBreakdown.a / total, color: RATING_COLORS.a },
              { key: 'bbb', value: b.ratingBreakdown.bbb / total, color: RATING_COLORS.bbb },
              { key: 'hy', value: b.ratingBreakdown.highYield / total, color: RATING_COLORS.hy },
            ];

            let accumulated = 0;
            const isWall = b.year === profile.wallYear;

            return (
              <g key={b.year}>
                {segments.map((seg) => {
                  if (seg.value <= 0) return null;
                  const segStart = accumulated;
                  accumulated += seg.value;
                  const y1 = PAD_T + chartH * (1 - accumulated);
                  const y0 = PAD_T + chartH * (1 - segStart);
                  const h = y0 - y1;
                  return (
                    <rect
                      key={seg.key}
                      x={x}
                      y={y1}
                      width={w}
                      height={Math.max(h, 0.5)}
                      fill={seg.color}
                      opacity={isWall ? 0.85 : 0.6}
                    />
                  );
                })}
              </g>
            );
          })}

          {/* X-axis year labels */}
          {buckets.map((b, i) => (
            <text
              key={b.year}
              x={PAD_L + i * barW + barW / 2}
              y={H - 4}
              textAnchor="middle"
              fill={b.year === profile.wallYear ? SLATE : 'rgba(255,255,255,0.3)'}
              fontSize={6}
              fontFamily="monospace"
              fontWeight={b.year === profile.wallYear ? 'bold' : 'normal'}
            >
              {b.year}
            </text>
          ))}

          {/* Legend */}
          {[
            { label: 'AAA/AA', color: RATING_COLORS.aaa_aa },
            { label: 'A', color: RATING_COLORS.a },
            { label: 'BBB', color: RATING_COLORS.bbb },
            { label: 'HY', color: RATING_COLORS.hy },
          ].map((item, i) => (
            <g key={item.label} transform={`translate(${PAD_L + i * 60}, ${PAD_T - 2})`}>
              <rect x={0} y={-4} width={6} height={4} fill={item.color} opacity={0.7} />
              <text x={8} y={0} fill="rgba(255,255,255,0.3)" fontSize={5} fontFamily="monospace">
                {item.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Rating breakdown table */}
      <div className="border-t border-white/[0.06]">
        <div className="grid grid-cols-[40px_56px_56px_56px_56px_56px] gap-0 px-2 py-0.5 border-b border-white/[0.06] bg-[#030303]">
          <span className="text-[7px] font-mono text-white/25 uppercase">
            {tr(t, 'dmYear', 'Year')}
          </span>
          <span className="text-[7px] font-mono text-white/25 uppercase text-right">
            {tr(t, 'dmAmount', 'Amt ($B)')}
          </span>
          <span className="text-[7px] font-mono text-white/25 uppercase text-right" style={{ color: RATING_COLORS.aaa_aa + '80' }}>
            AAA/AA %
          </span>
          <span className="text-[7px] font-mono text-white/25 uppercase text-right" style={{ color: RATING_COLORS.a + '80' }}>
            A %
          </span>
          <span className="text-[7px] font-mono text-white/25 uppercase text-right" style={{ color: RATING_COLORS.bbb + '80' }}>
            BBB %
          </span>
          <span className="text-[7px] font-mono text-white/25 uppercase text-right" style={{ color: RATING_COLORS.hy + '80' }}>
            HY %
          </span>
        </div>

        {buckets.map((b) => {
          const total = b.ratingBreakdown.aaa_aa + b.ratingBreakdown.a + b.ratingBreakdown.bbb + b.ratingBreakdown.highYield;
          const pctAaaAa = total > 0 ? (b.ratingBreakdown.aaa_aa / total) * 100 : 0;
          const pctA = total > 0 ? (b.ratingBreakdown.a / total) * 100 : 0;
          const pctBbb = total > 0 ? (b.ratingBreakdown.bbb / total) * 100 : 0;
          const pctHy = total > 0 ? (b.ratingBreakdown.highYield / total) * 100 : 0;
          const isWall = b.year === profile.wallYear;

          return (
            <div
              key={b.year}
              className={`grid grid-cols-[40px_56px_56px_56px_56px_56px] gap-0 px-2 py-[3px] border-b border-white/[0.03] hover:bg-slate-400/[0.02] transition-colors items-center ${
                isWall ? 'bg-slate-400/[0.04]' : ''
              }`}
            >
              <span className={`text-[8px] font-mono font-bold ${isWall ? 'text-slate-400' : 'text-white/80'}`}>
                {b.year}
              </span>
              <span className="text-[8px] font-mono text-white/60 text-right font-bold">
                {fmtBDec(b.amount)}
              </span>
              <span className="text-[8px] font-mono text-right" style={{ color: RATING_COLORS.aaa_aa + 'cc' }}>
                {pctAaaAa.toFixed(1)}%
              </span>
              <span className="text-[8px] font-mono text-right" style={{ color: RATING_COLORS.a + 'cc' }}>
                {pctA.toFixed(1)}%
              </span>
              <span className="text-[8px] font-mono text-right" style={{ color: RATING_COLORS.bbb + 'cc' }}>
                {pctBbb.toFixed(1)}%
              </span>
              <span className="text-[8px] font-mono text-right" style={{ color: RATING_COLORS.hy + 'cc' }}>
                {pctHy.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Timestamp */}
      <div className="px-3 py-1 border-t border-white/[0.04]">
        <span className="text-[7px] font-mono text-white/15">
          {tr(t, 'dmUpdated', 'Updated')}: {new Date(data.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

// ── Shared components ──

function StatBox({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="px-2 py-1.5 border-r border-white/[0.04] last:border-r-0">
      <div className="text-[6px] font-mono text-white/25 uppercase tracking-wider mb-0.5">
        {label}
      </div>
      <div
        className="text-[9px] font-mono font-bold"
        style={{ color: valueColor ?? 'rgba(255,255,255,0.7)' }}
      >
        {value}
      </div>
    </div>
  );
}
