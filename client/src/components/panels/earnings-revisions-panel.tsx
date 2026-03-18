import { useState, useMemo } from 'react';
import { GlassCard } from '../common/glass-card';
import {
  useEarningsRevisions,
  type RevisionEntry,
  type SectorRevision,
} from '../../api/hooks/use-earnings-revisions';
import { TrendingUp, RefreshCw } from 'lucide-react';
import { useT } from '../../i18n';

// ── i18n helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try { return (t as ReturnType<typeof useT> & ((k: string) => string))(key) || fallback; } catch { return fallback; }
};

// ── Types ──

type ViewTab = 'TABLE' | 'SECTORS' | 'MOMENTUM';
type SectorFilter = 'ALL' | 'TECHNOLOGY' | 'HEALTHCARE' | 'FINANCIALS' | 'CONSUMER' | 'ENERGY' | 'INDUSTRIALS' | 'COMM SERVICES';
type SortKey = 'symbol' | 'currentQRevision1m' | 'fyRevision1m' | 'revisionMomentum' | 'peRatio' | 'currentQRevisionRatio';
type SortDir = 'asc' | 'desc';

const SECTOR_FILTERS: SectorFilter[] = ['ALL', 'TECHNOLOGY', 'HEALTHCARE', 'FINANCIALS', 'CONSUMER', 'ENERGY', 'INDUSTRIALS', 'COMM SERVICES'];

const SECTOR_COLORS: Record<string, string> = {
  'Technology': '#8b5cf6',
  'Healthcare': '#06b6d4',
  'Financials': '#f59e0b',
  'Consumer': '#10b981',
  'Energy': '#ef4444',
  'Industrials': '#6366f1',
  'Comm Services': '#ec4899',
};

// ── Formatting helpers ──

function fmtPct(n: number | null | undefined, decimals = 2): string {
  if (n == null) return '-';
  return `${n >= 0 ? '+' : ''}${n.toFixed(decimals)}%`;
}

function fmtNum(n: number | null | undefined, decimals = 2): string {
  if (n == null) return '-';
  return n.toFixed(decimals);
}

function revColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral/50';
  return n >= 0 ? 'text-green-400' : 'text-red-400';
}

function ratioColor(r: number): string {
  if (r >= 0.7) return 'bg-green-500';
  if (r >= 0.3) return 'bg-yellow-500';
  return 'bg-red-500';
}

function momentumColor(m: number): string {
  if (m >= 40) return 'text-green-400';
  if (m >= 10) return 'text-green-400/70';
  if (m >= -10) return 'text-neutral/60';
  if (m >= -40) return 'text-red-400/70';
  return 'text-red-400';
}

function signalBadge(signal: string | null): { text: string; cls: string } | null {
  if (!signal) return null;
  const map: Record<string, { text: string; cls: string }> = {
    'STRONG_UPGRADE': { text: 'STR UPG', cls: 'text-green-400 bg-green-500/15 border-green-500/30' },
    'UPGRADE': { text: 'UPGRADE', cls: 'text-green-400/80 bg-green-500/10 border-green-500/20' },
    'STABLE': { text: 'STABLE', cls: 'text-neutral/50 bg-white/5 border-border/30' },
    'DOWNGRADE': { text: 'DWNGRADE', cls: 'text-red-400/80 bg-red-500/10 border-red-500/20' },
    'STRONG_DOWNGRADE': { text: 'STR DWN', cls: 'text-red-400 bg-red-500/15 border-red-500/30' },
  };
  return map[signal] || null;
}

// ── Sparkline SVG ──

function Sparkline({ data, width = 60, height = 16 }: { data: number[]; width?: number; height?: number }) {
  if (data.length < 2) return <div style={{ width, height }} />;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);

  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return `${x},${y}`;
  }).join(' ');

  const lastVal = data[data.length - 1];
  const lineColor = lastVal >= 0 ? 'rgba(139,92,246,0.8)' : 'rgba(248,113,113,0.7)';
  const fillColor = lastVal >= 0 ? 'rgba(139,92,246,0.1)' : 'rgba(248,113,113,0.05)';

  // Area fill path
  const firstX = 0;
  const lastX = (data.length - 1) * stepX;
  const areaPath = `M${firstX},${height} L${points.split(' ').map(p => `L${p}`).join(' ').replace('LL', 'L')} L${lastX},${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path d={areaPath.replace('L L', ' L')} fill={fillColor} />
      <polyline points={points} fill="none" stroke={lineColor} strokeWidth="1" />
    </svg>
  );
}

// ── Ratio Bar ──

function RatioBar({ ratio, width = 40 }: { ratio: number; width?: number }) {
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  return (
    <div className="flex items-center gap-1">
      <div className="bg-white/[0.06]" style={{ width, height: 6 }}>
        <div
          className={ratioColor(ratio)}
          style={{ width: `${pct}%`, height: '100%', opacity: 0.7 }}
        />
      </div>
      <span className="text-[8px] text-neutral/40 font-mono">{(ratio * 100).toFixed(0)}</span>
    </div>
  );
}

// ── Momentum Bar ──

function MomentumBar({ value, width = 50 }: { value: number; width?: number }) {
  const center = width / 2;
  const magnitude = Math.min(Math.abs(value), 100);
  const barWidth = (magnitude / 100) * center;
  const isPositive = value >= 0;

  return (
    <div className="flex items-center gap-1">
      <svg width={width} height={8} viewBox={`0 0 ${width} 8`}>
        <rect x={0} y={0} width={width} height={8} fill="rgba(255,255,255,0.03)" />
        <line x1={center} y1={0} x2={center} y2={8} stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
        {isPositive ? (
          <rect x={center} y={1} width={barWidth} height={6} fill="rgba(74,222,128,0.6)" />
        ) : (
          <rect x={center - barWidth} y={1} width={barWidth} height={6} fill="rgba(248,113,113,0.6)" />
        )}
      </svg>
      <span className={`text-[8px] font-mono ${momentumColor(value)}`}>{value > 0 ? '+' : ''}{value}</span>
    </div>
  );
}

// ── TABLE View ──

function TableView({
  entries,
  sortKey,
  sortDir,
  onSort,
}: {
  entries: RevisionEntry[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const sortArrow = (key: SortKey) => {
    if (sortKey !== key) return '';
    return sortDir === 'asc' ? ' \u25B2' : ' \u25BC';
  };

  return (
    <div className="border border-border/20 overflow-auto">
      <table className="w-full text-[9px] font-mono whitespace-nowrap">
        <thead>
          <tr className="bg-white/[0.03] border-b border-border/20">
            <th className="text-left px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium cursor-pointer hover:text-violet-400" onClick={() => onSort('symbol')}>Sym{sortArrow('symbol')}</th>
            <th className="text-left px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Name</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">CQ EPS</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium cursor-pointer hover:text-violet-400" onClick={() => onSort('currentQRevision1m')}>CQ 1M{sortArrow('currentQRevision1m')}</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">CQ 3M</th>
            <th className="text-center px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Up/Dn</th>
            <th className="text-center px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium cursor-pointer hover:text-violet-400" onClick={() => onSort('currentQRevisionRatio')}>Ratio{sortArrow('currentQRevisionRatio')}</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">FY EPS</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium cursor-pointer hover:text-violet-400" onClick={() => onSort('fyRevision1m')}>FY 1M{sortArrow('fyRevision1m')}</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">FY 3M</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Rev $B</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Rev Rev</th>
            <th className="text-center px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium cursor-pointer hover:text-violet-400" onClick={() => onSort('revisionMomentum')}>Mmt{sortArrow('revisionMomentum')}</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium cursor-pointer hover:text-violet-400" onClick={() => onSort('peRatio')}>P/E{sortArrow('peRatio')}</th>
            <th className="text-center px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Signal</th>
            <th className="text-center px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">12M</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => {
            const badge = signalBadge(e.signal);
            return (
              <tr key={e.symbol} className="border-b border-border/10 hover:bg-violet-400/[0.02]">
                <td className="px-1.5 py-1 text-violet-400 font-bold">{e.symbol}</td>
                <td className="px-1.5 py-1 text-neutral/60 max-w-[80px] truncate">{e.name}</td>
                <td className="text-right px-1.5 py-1 text-neutral/70">{fmtNum(e.currentQEps)}</td>
                <td className={`text-right px-1.5 py-1 font-bold ${revColor(e.currentQRevision1m)}`}>{fmtPct(e.currentQRevision1m)}</td>
                <td className={`text-right px-1.5 py-1 ${revColor(e.currentQRevision3m)}`}>{fmtPct(e.currentQRevision3m)}</td>
                <td className="text-center px-1.5 py-1 text-neutral/50">{e.currentQUpRevisions}/{e.currentQDownRevisions}</td>
                <td className="px-1.5 py-1"><RatioBar ratio={e.currentQRevisionRatio} /></td>
                <td className="text-right px-1.5 py-1 text-neutral/70">{fmtNum(e.fyEps)}</td>
                <td className={`text-right px-1.5 py-1 font-bold ${revColor(e.fyRevision1m)}`}>{fmtPct(e.fyRevision1m)}</td>
                <td className={`text-right px-1.5 py-1 ${revColor(e.fyRevision3m)}`}>{fmtPct(e.fyRevision3m)}</td>
                <td className="text-right px-1.5 py-1 text-neutral/60">{e.fyRevenue.toFixed(1)}</td>
                <td className={`text-right px-1.5 py-1 ${revColor(e.fyRevenueRevision1m)}`}>{fmtPct(e.fyRevenueRevision1m)}</td>
                <td className="px-1.5 py-1"><MomentumBar value={e.revisionMomentum} /></td>
                <td className="text-right px-1.5 py-1 text-neutral/50">{e.peRatio.toFixed(1)}</td>
                <td className="text-center px-1.5 py-1">
                  {badge && (
                    <span className={`px-1 py-0.5 text-[7px] font-mono uppercase tracking-wider border ${badge.cls}`}>
                      {badge.text}
                    </span>
                  )}
                </td>
                <td className="px-1.5 py-1"><Sparkline data={e.revisionHistory} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── SECTORS View ──

function SectorsView({ sectorRevisions, entries }: { sectorRevisions: SectorRevision[]; entries: RevisionEntry[] }) {
  // Bar chart dimensions
  const chartW = 400;
  const chartH = 160;
  const pad = { top: 16, bottom: 36, left: 8, right: 8 };
  const innerW = chartW - pad.left - pad.right;
  const innerH = chartH - pad.top - pad.bottom;

  const maxAbs = Math.max(
    ...sectorRevisions.map(s => Math.abs(s.avgRevision1m)),
    ...sectorRevisions.map(s => Math.abs(s.avgRevision3m)),
    0.5
  );

  const barGroupW = innerW / sectorRevisions.length;
  const barW = barGroupW * 0.3;
  const zeroY = pad.top + innerH / 2;

  return (
    <div className="flex flex-col gap-3">
      {/* Sector Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px bg-border/10">
        {sectorRevisions.map((s) => {
          const sectorStocks = entries.filter(e => e.sector === s.sector);
          const color = SECTOR_COLORS[s.sector] || '#8b5cf6';
          return (
            <div key={s.sector} className="bg-black px-2.5 py-2">
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-2 h-2" style={{ backgroundColor: color, opacity: 0.7 }} />
                <span className="text-[9px] font-mono font-bold text-neutral/70 uppercase tracking-wider">{s.sector}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 mb-1.5">
                <div>
                  <div className="text-[7px] font-mono text-neutral/30 uppercase">1M Rev</div>
                  <div className={`text-[10px] font-mono font-bold ${revColor(s.avgRevision1m)}`}>{fmtPct(s.avgRevision1m)}</div>
                </div>
                <div>
                  <div className="text-[7px] font-mono text-neutral/30 uppercase">3M Rev</div>
                  <div className={`text-[10px] font-mono font-bold ${revColor(s.avgRevision3m)}`}>{fmtPct(s.avgRevision3m)}</div>
                </div>
                <div>
                  <div className="text-[7px] font-mono text-neutral/30 uppercase">Up/Down</div>
                  <div className="text-[10px] font-mono text-neutral/60">{s.upgrades}/{s.downgrades}</div>
                </div>
                <div>
                  <div className="text-[7px] font-mono text-neutral/30 uppercase">Momentum</div>
                  <div className={`text-[10px] font-mono font-bold ${momentumColor(s.momentum)}`}>{s.momentum > 0 ? '+' : ''}{s.momentum}</div>
                </div>
              </div>
              <RatioBar ratio={s.ratio} width={80} />
              {/* Sector stock list */}
              <div className="mt-1.5 flex flex-wrap gap-x-1.5">
                {sectorStocks.map(st => (
                  <span key={st.symbol} className={`text-[7px] font-mono ${revColor(st.fyRevision1m)}`}>
                    {st.symbol}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sector Bar Chart */}
      <div className="bg-black border border-border/20 p-2">
        <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider mb-1">
          SECTOR REVISION COMPARISON (1M vs 3M)
        </div>
        <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full" preserveAspectRatio="xMidYMid meet">
          {/* Zero line */}
          <line x1={pad.left} x2={chartW - pad.right} y1={zeroY} y2={zeroY} stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />

          {/* Grid lines */}
          {[-maxAbs, -maxAbs / 2, maxAbs / 2, maxAbs].map((v, i) => {
            const y = zeroY - (v / maxAbs) * (innerH / 2);
            return (
              <g key={`grid-${i}`}>
                <line x1={pad.left} x2={chartW - pad.right} y1={y} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                <text x={pad.left - 2} y={y + 3} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize="6" fontFamily="monospace">
                  {v.toFixed(1)}%
                </text>
              </g>
            );
          })}

          {sectorRevisions.map((s, i) => {
            const groupX = pad.left + i * barGroupW + barGroupW * 0.15;
            const color = SECTOR_COLORS[s.sector] || '#8b5cf6';

            // 1M bar
            const barH1m = Math.abs(s.avgRevision1m) / maxAbs * (innerH / 2);
            const y1m = s.avgRevision1m >= 0 ? zeroY - barH1m : zeroY;

            // 3M bar
            const barH3m = Math.abs(s.avgRevision3m) / maxAbs * (innerH / 2);
            const y3m = s.avgRevision3m >= 0 ? zeroY - barH3m : zeroY;

            return (
              <g key={s.sector}>
                <rect x={groupX} y={y1m} width={barW} height={Math.max(barH1m, 1)} fill={color} opacity={0.7} />
                <rect x={groupX + barW + 2} y={y3m} width={barW} height={Math.max(barH3m, 1)} fill={color} opacity={0.35} />
                {/* Label */}
                <text
                  x={groupX + barW}
                  y={chartH - 6}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.3)"
                  fontSize="6"
                  fontFamily="monospace"
                  transform={`rotate(-25, ${groupX + barW}, ${chartH - 6})`}
                >
                  {s.sector.length > 8 ? s.sector.slice(0, 8) : s.sector}
                </text>
              </g>
            );
          })}

          {/* Legend */}
          <rect x={chartW - 80} y={4} width={8} height={5} fill="rgba(139,92,246,0.7)" />
          <text x={chartW - 70} y={9} fill="rgba(255,255,255,0.35)" fontSize="6" fontFamily="monospace">1M</text>
          <rect x={chartW - 50} y={4} width={8} height={5} fill="rgba(139,92,246,0.35)" />
          <text x={chartW - 40} y={9} fill="rgba(255,255,255,0.35)" fontSize="6" fontFamily="monospace">3M</text>
        </svg>
      </div>
    </div>
  );
}

// ── MOMENTUM View (Scatter) ──

function MomentumView({ entries }: { entries: RevisionEntry[] }) {
  const chartW = 460;
  const chartH = 300;
  const pad = { top: 20, bottom: 28, left: 40, right: 20 };
  const innerW = chartW - pad.left - pad.right;
  const innerH = chartH - pad.top - pad.bottom;

  const momMin = Math.min(...entries.map(e => e.revisionMomentum), -50);
  const momMax = Math.max(...entries.map(e => e.revisionMomentum), 50);
  const peMin = Math.min(...entries.map(e => e.peRatio), 5);
  const peMax = Math.max(...entries.map(e => e.peRatio), 50);

  const xScale = (m: number) => pad.left + ((m - momMin) / (momMax - momMin || 1)) * innerW;
  const yScale = (pe: number) => pad.top + innerH - ((pe - peMin) / (peMax - peMin || 1)) * innerH;

  const centerX = xScale(0);
  const medianPE = (peMax + peMin) / 2;
  const centerY = yScale(medianPE);

  // Bubble size by FY revenue (proxy for market cap)
  const maxRev = Math.max(...entries.map(e => e.fyRevenue));
  const bubbleSize = (rev: number) => Math.max(4, Math.min(16, (rev / maxRev) * 16));

  // Major names to label
  const majorNames = new Set(['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'JPM', 'LLY', 'XOM']);

  return (
    <div className="bg-black border border-border/20 p-2">
      <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider mb-1">
        REVISION MOMENTUM vs P/E RATIO (BUBBLE SIZE = REVENUE)
      </div>
      <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* Quadrant backgrounds */}
        {/* Top-left: expensive + downgrading (worst) */}
        <rect x={pad.left} y={pad.top} width={centerX - pad.left} height={centerY - pad.top} fill="rgba(248,113,113,0.03)" />
        {/* Top-right: expensive + upgrading */}
        <rect x={centerX} y={pad.top} width={chartW - pad.right - centerX} height={centerY - pad.top} fill="rgba(250,204,21,0.02)" />
        {/* Bottom-left: cheap + downgrading */}
        <rect x={pad.left} y={centerY} width={centerX - pad.left} height={pad.top + innerH - centerY} fill="rgba(250,204,21,0.02)" />
        {/* Bottom-right: cheap + upgrading (best) */}
        <rect x={centerX} y={centerY} width={chartW - pad.right - centerX} height={pad.top + innerH - centerY} fill="rgba(74,222,128,0.03)" />

        {/* Quadrant labels */}
        <text x={pad.left + 4} y={pad.top + 10} fill="rgba(248,113,113,0.3)" fontSize="7" fontFamily="monospace">EXPENSIVE + DOWNGRADE</text>
        <text x={chartW - pad.right - 4} y={pad.top + 10} textAnchor="end" fill="rgba(250,204,21,0.3)" fontSize="7" fontFamily="monospace">EXPENSIVE + UPGRADE</text>
        <text x={pad.left + 4} y={pad.top + innerH - 4} fill="rgba(250,204,21,0.3)" fontSize="7" fontFamily="monospace">CHEAP + DOWNGRADE</text>
        <text x={chartW - pad.right - 4} y={pad.top + innerH - 4} textAnchor="end" fill="rgba(74,222,128,0.3)" fontSize="7" fontFamily="monospace">CHEAP + UPGRADE</text>

        {/* Zero momentum line */}
        <line x1={centerX} y1={pad.top} x2={centerX} y2={pad.top + innerH} stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" strokeDasharray="3,2" />

        {/* Median PE line */}
        <line x1={pad.left} y1={centerY} x2={chartW - pad.right} y2={centerY} stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" strokeDasharray="3,2" />

        {/* Y-axis labels */}
        {[peMin, medianPE, peMax].map((v, i) => (
          <text key={`yl-${i}`} x={pad.left - 3} y={yScale(v) + 3} textAnchor="end" fill="rgba(255,255,255,0.25)" fontSize="6" fontFamily="monospace">
            {v.toFixed(0)}x
          </text>
        ))}

        {/* X-axis labels */}
        {[momMin, 0, momMax].map((v, i) => (
          <text key={`xl-${i}`} x={xScale(v)} y={chartH - 6} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="6" fontFamily="monospace">
            {v > 0 ? '+' : ''}{v.toFixed(0)}
          </text>
        ))}

        {/* Axis titles */}
        <text x={chartW / 2} y={chartH - 0} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="6.5" fontFamily="monospace">REVISION MOMENTUM</text>
        <text x={8} y={chartH / 2} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="6.5" fontFamily="monospace" transform={`rotate(-90, 8, ${chartH / 2})`}>P/E RATIO</text>

        {/* Data points */}
        {entries.map((e) => {
          const cx = xScale(e.revisionMomentum);
          const cy = yScale(e.peRatio);
          const r = bubbleSize(e.fyRevenue);
          const color = SECTOR_COLORS[e.sector] || '#8b5cf6';
          const isLabeled = majorNames.has(e.symbol);

          return (
            <g key={e.symbol}>
              <circle cx={cx} cy={cy} r={r} fill={color} opacity={0.5} stroke={color} strokeWidth="0.5" strokeOpacity={0.8} />
              {isLabeled && (
                <text
                  x={cx}
                  y={cy - r - 2}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.6)"
                  fontSize="7"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {e.symbol}
                </text>
              )}
            </g>
          );
        })}

        {/* Legend: sectors */}
        {Object.entries(SECTOR_COLORS).map(([sector, color], i) => (
          <g key={sector}>
            <circle cx={pad.left + 6} cy={pad.top + innerH + 16 + i * 0} r={0} fill="none" />
          </g>
        ))}
      </svg>

      {/* Sector legend below chart */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 px-1">
        {Object.entries(SECTOR_COLORS).map(([sector, color]) => (
          <div key={sector} className="flex items-center gap-1">
            <div className="w-2 h-2" style={{ backgroundColor: color, opacity: 0.6 }} />
            <span className="text-[7px] font-mono text-neutral/40 uppercase">{sector}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Panel ──

export function EarningsRevisionsPanel() {
  const t = useT();
  const { data, isLoading, refetch, dataUpdatedAt } = useEarningsRevisions();

  const [view, setView] = useState<ViewTab>('TABLE');
  const [sectorFilter, setSectorFilter] = useState<SectorFilter>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('revisionMomentum');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const filteredEntries = useMemo(() => {
    if (!data) return [];
    let list = [...data.entries];

    // Sector filter
    if (sectorFilter !== 'ALL') {
      const filterLower = sectorFilter.toLowerCase();
      list = list.filter(e => e.sector.toLowerCase() === filterLower);
    }

    // Sort
    list.sort((a, b) => {
      const aVal = a[sortKey] as number | string;
      const bVal = b[sortKey] as number | string;
      const cmp = typeof aVal === 'string'
        ? (aVal as string).localeCompare(bVal as string)
        : (aVal as number) - (bVal as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [data, sectorFilter, sortKey, sortDir]);

  return (
    <GlassCard className="flex flex-col h-full text-[10px]">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/20">
        <div className="flex items-center gap-1.5">
          <TrendingUp size={12} className="text-violet-400" />
          <span className="text-[10px] font-mono font-bold tracking-widest text-neutral/80 uppercase">
            {tr(t, 'panelEarningsRevisions', 'EARNINGS REVISIONS')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <>
              <span className={`px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-wider border ${
                data.marketRevision >= 0
                  ? 'text-green-400 bg-green-500/10 border-green-500/30'
                  : 'text-red-400 bg-red-500/10 border-red-500/30'
              }`}>
                MKT {fmtPct(data.marketRevision)}
              </span>
              <span className={`px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-wider border ${
                data.breadth >= 50
                  ? 'text-green-400 bg-green-500/10 border-green-500/30'
                  : 'text-red-400 bg-red-500/10 border-red-500/30'
              }`}>
                {data.breadth}% Positive
              </span>
            </>
          )}
          {dataUpdatedAt > 0 && (
            <span className="text-[8px] font-mono text-neutral/30">
              {new Date(dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-0.5 text-neutral/40 hover:text-violet-400 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={10} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Sector Filter + View Tabs ── */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-border/20 gap-2">
        {/* Sector filter */}
        <div className="flex items-center gap-0.5 overflow-x-auto flex-1 min-w-0">
          {SECTOR_FILTERS.map((sf) => (
            <button
              key={sf}
              onClick={() => setSectorFilter(sf)}
              className={`px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-wider whitespace-nowrap transition-colors border ${
                sectorFilter === sf
                  ? 'text-violet-400 bg-violet-500/10 border-violet-500/30'
                  : 'text-neutral/40 bg-transparent border-transparent hover:text-neutral/60 hover:border-border/30'
              }`}
            >
              {sf}
            </button>
          ))}
        </div>

        {/* View tabs */}
        <div className="flex items-center gap-0.5 shrink-0">
          {(['TABLE', 'SECTORS', 'MOMENTUM'] as ViewTab[]).map((vt) => (
            <button
              key={vt}
              onClick={() => setView(vt)}
              className={`px-2 py-0.5 text-[8px] font-mono uppercase tracking-wider transition-colors border ${
                view === vt
                  ? 'text-violet-400 bg-violet-500/10 border-violet-500/30'
                  : 'text-neutral/40 bg-transparent border-transparent hover:text-neutral/60 hover:border-border/30'
              }`}
            >
              {vt}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-auto min-h-0 px-3 py-2">
        {isLoading && !data ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-4 h-4 border-2 border-violet-400/30 border-t-violet-400 animate-spin" />
          </div>
        ) : !data ? (
          <div className="flex items-center justify-center h-full text-neutral/30 text-[10px] font-mono uppercase tracking-widest">
            {tr(t, 'erNoData', 'No data available')}
          </div>
        ) : (
          <>
            {view === 'TABLE' && (
              <TableView entries={filteredEntries} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
            )}
            {view === 'SECTORS' && (
              <SectorsView sectorRevisions={data.sectorRevisions} entries={data.entries} />
            )}
            {view === 'MOMENTUM' && (
              <MomentumView entries={filteredEntries} />
            )}
          </>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between px-3 py-1 border-t border-border/20 text-[8px] font-mono text-neutral/30">
        <span>
          {filteredEntries.length} {tr(t, 'erStocks', 'stocks')}
          {sectorFilter !== 'ALL' && ` in ${sectorFilter}`}
        </span>
        <span>
          {data && `Breadth: ${data.breadth}% | Mkt Rev: ${fmtPct(data.marketRevision)}`}
        </span>
      </div>
    </GlassCard>
  );
}
