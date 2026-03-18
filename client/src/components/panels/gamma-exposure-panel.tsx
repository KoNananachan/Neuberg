import { useState, useMemo, useCallback } from 'react';
import {
  useGammaExposure,
  type GammaExposureResponse,
  type GexStrike,
  type GexSummary,
} from '../../api/hooks/use-gamma-exposure';
import { useT } from '../../i18n';
import { RefreshCw, Zap } from 'lucide-react';

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

// ── Colors ──

const EMERALD = '#10b981';
const POS_COLOR = '#10b981'; // emerald-400 for positive gamma
const NEG_COLOR = '#ef4444'; // red-500 for negative gamma

function regimeBadge(regime: string): { label: string; cls: string } {
  switch (regime) {
    case 'POSITIVE':
      return { label: 'POSITIVE', cls: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' };
    case 'NEGATIVE':
      return { label: 'NEGATIVE', cls: 'bg-red-500/10 border-red-500/30 text-red-400' };
    default:
      return { label: 'NEUTRAL', cls: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' };
  }
}

function levelTypeColor(type: string): string {
  switch (type) {
    case 'GAMMA_FLIP': return 'text-yellow-400';
    case 'PUT_WALL': return 'text-red-400';
    case 'CALL_WALL': return 'text-emerald-400';
    case 'MAX_GAMMA': return 'text-blue-400';
    case 'EXPECTED_LOW': return 'text-orange-400';
    case 'EXPECTED_HIGH': return 'text-cyan-400';
    default: return 'text-neutral-400';
  }
}

function levelTypeLabel(type: string): string {
  switch (type) {
    case 'GAMMA_FLIP': return 'GAMMA FLIP';
    case 'PUT_WALL': return 'PUT WALL';
    case 'CALL_WALL': return 'CALL WALL';
    case 'MAX_GAMMA': return 'MAX GAMMA';
    case 'EXPECTED_LOW': return 'EXP LOW';
    case 'EXPECTED_HIGH': return 'EXP HIGH';
    default: return type;
  }
}

// ── Number formatting ──

function fmtGamma(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1000) return (n / 1000).toFixed(1) + 'B';
  if (abs >= 1) return n.toFixed(1) + 'M';
  return (n * 1000).toFixed(0) + 'K';
}

function fmtOI(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function fmtPrice(n: number): string {
  return n.toFixed(2);
}

// ── Main Panel ──

export function GammaExposurePanel() {
  const tr = useTr();
  const [symbol, setSymbol] = useState('SPY');
  const [activeView, setActiveView] = useState<'profile' | 'levels' | 'table'>('profile');
  const { data: response, isLoading, refetch } = useGammaExposure(symbol);

  const availableSymbols = response?.availableSymbols ?? [];
  const summary = response?.summary ?? null;
  const strikes = response?.strikes ?? [];

  const badge = summary ? regimeBadge(summary.gammaRegime) : null;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-emerald-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-emerald-400">
            {tr('gexTitle', 'GAMMA EXPOSURE (GEX)')}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Symbol selector */}
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="bg-white/[0.04] border border-border/20 px-1.5 py-0.5 text-[9px] font-mono text-white uppercase outline-none focus:border-emerald-500/40 appearance-none cursor-pointer"
          >
            {(availableSymbols.length > 0 ? availableSymbols : SUPPORTED_FALLBACK).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Gamma regime badge */}
          {badge && (
            <span className={`px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider border ${badge.cls}`}>
              {badge.label}
            </span>
          )}

          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-emerald-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* View tabs */}
      <div className="flex border-b border-border/20 shrink-0">
        {(
          [
            ['profile', tr('gexProfile', 'PROFILE')],
            ['levels', tr('gexLevels', 'LEVELS')],
            ['table', tr('gexTable', 'TABLE')],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveView(key as 'profile' | 'levels' | 'table')}
            className={`flex-1 py-1.5 text-[8px] font-mono font-bold uppercase tracking-wider transition-colors ${
              activeView === key
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
        {isLoading && !summary && (
          <div className="text-center py-8 text-emerald-400 text-[9px] font-mono uppercase animate-pulse">
            {tr('loading', 'Loading...')}
          </div>
        )}

        {!summary && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr('gexNoData', 'No data available')}
          </div>
        )}

        {summary && strikes.length > 0 && (
          <>
            {activeView === 'profile' && <ProfileView strikes={strikes} summary={summary} tr={tr} />}
            {activeView === 'levels' && <LevelsView summary={summary} tr={tr} />}
            {activeView === 'table' && <TableView strikes={strikes} summary={summary} tr={tr} />}
          </>
        )}
      </div>
    </div>
  );
}

const SUPPORTED_FALLBACK = ['SPY', 'QQQ', 'IWM', 'AAPL', 'TSLA', 'NVDA', 'AMZN', 'MSFT'];

// ── PROFILE View ──

function ProfileView({
  strikes,
  summary,
  tr,
}: {
  strikes: GexStrike[];
  summary: GexSummary;
  tr: (key: string, fallback: string) => string;
}) {
  const chartData = useMemo(() => {
    if (strikes.length === 0) return null;

    const W = 380;
    const H = 220;
    const PAD_L = 44;
    const PAD_R = 12;
    const PAD_T = 14;
    const PAD_B = 28;

    const chartW = W - PAD_L - PAD_R;
    const chartH = H - PAD_T - PAD_B;

    // Find min/max gamma for Y-axis
    const allGamma = strikes.map((s) => s.netGamma);
    const maxG = Math.max(...allGamma, 1);
    const minG = Math.min(...allGamma, -1);
    const absMax = Math.max(Math.abs(maxG), Math.abs(minG));
    // Symmetric Y-axis
    const yMax = absMax * 1.15;
    const yMin = -yMax;

    const barW = Math.max(chartW / strikes.length - 1, 2);

    const scaleX = (i: number) => PAD_L + (i / strikes.length) * chartW + barW / 2;
    const scaleY = (v: number) => PAD_T + ((yMax - v) / (yMax - yMin)) * chartH;
    const zeroY = scaleY(0);

    // Find spot position
    const spotIdx = strikes.findIndex((s) => s.strike >= summary.spot);
    const spotX = spotIdx >= 0 ? scaleX(spotIdx) : PAD_L + chartW / 2;

    // Gamma flip position
    const flipIdx = strikes.findIndex((s) => s.strike >= summary.gammaFlip);
    const flipX = flipIdx >= 0 ? scaleX(flipIdx) : null;

    // Put wall and call wall positions
    const putWallIdx = strikes.findIndex((s) => s.strike >= summary.putWall);
    const putWallX = putWallIdx >= 0 ? scaleX(putWallIdx) : null;
    const callWallIdx = strikes.findIndex((s) => s.strike >= summary.callWall);
    const callWallX = callWallIdx >= 0 ? scaleX(callWallIdx) : null;

    // Y-axis ticks
    const yStep = absMax > 1000 ? 500 : absMax > 500 ? 200 : absMax > 200 ? 100 : absMax > 50 ? 25 : 10;
    const yTicks: number[] = [];
    for (let v = -Math.floor(yMax / yStep) * yStep; v <= yMax; v += yStep) {
      yTicks.push(v);
    }

    // X-axis labels (show every Nth strike)
    const labelStep = Math.max(1, Math.floor(strikes.length / 10));

    return { W, H, PAD_L, PAD_R, PAD_T, PAD_B, chartW, chartH, barW, yMax, yMin, scaleX, scaleY, zeroY, spotX, flipX, putWallX, callWallX, yTicks, labelStep };
  }, [strikes, summary]);

  if (!chartData) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        {tr('gexNoProfile', 'Insufficient data for gamma profile')}
      </div>
    );
  }

  const { W, H, PAD_L, PAD_R, PAD_T, PAD_B, barW, scaleX, scaleY, zeroY, spotX, flipX, putWallX, callWallX, yTicks, labelStep } = chartData;

  return (
    <div className="px-3 py-3">
      {/* Chart header */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-[8px] font-black uppercase tracking-widest text-neutral-500">
          {tr('gexProfileChart', 'Net Gamma by Strike')} - {summary.symbol}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-3 h-2" style={{ backgroundColor: POS_COLOR, opacity: 0.7 }} />
            <span className="text-[6px] font-mono text-neutral-600">Positive</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-2" style={{ backgroundColor: NEG_COLOR, opacity: 0.7 }} />
            <span className="text-[6px] font-mono text-neutral-600">Negative</span>
          </div>
        </div>
      </div>

      {/* SVG bar chart */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 260 }}>
        {/* Grid lines */}
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={PAD_L} y1={scaleY(v)} x2={W - PAD_R} y2={scaleY(v)}
              stroke={v === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.04)'}
              strokeDasharray={v === 0 ? undefined : '2,2'}
              strokeWidth={v === 0 ? 1 : 0.5}
            />
            <text
              x={PAD_L - 4} y={scaleY(v) + 3}
              textAnchor="end" fill="rgba(255,255,255,0.25)" fontSize={6} fontFamily="monospace"
            >
              {v >= 1000 || v <= -1000 ? `${(v / 1000).toFixed(0)}B` : `${v.toFixed(0)}M`}
            </text>
          </g>
        ))}

        {/* Bars */}
        {strikes.map((s, i) => {
          const x = scaleX(i) - barW / 2;
          const isPositive = s.netGamma >= 0;
          const y = isPositive ? scaleY(s.netGamma) : zeroY;
          const h = Math.abs(scaleY(s.netGamma) - zeroY);
          return (
            <rect
              key={s.strike}
              x={x}
              y={y}
              width={barW}
              height={Math.max(h, 0.5)}
              fill={isPositive ? POS_COLOR : NEG_COLOR}
              opacity={0.7}
            >
              <title>{`Strike ${s.strike}: Net ${s.netGamma > 0 ? '+' : ''}${s.netGamma.toFixed(1)}M | Call ${s.callGamma.toFixed(1)}M | Put ${s.putGamma.toFixed(1)}M`}</title>
            </rect>
          );
        })}

        {/* Spot price vertical dashed line */}
        <line
          x1={spotX} y1={PAD_T} x2={spotX} y2={H - PAD_B}
          stroke="rgba(255,255,255,0.5)" strokeDasharray="4,3" strokeWidth={1}
        />
        <text
          x={spotX} y={PAD_T - 4}
          textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize={6} fontFamily="monospace" fontWeight="bold"
        >
          SPOT {fmtPrice(summary.spot)}
        </text>

        {/* Gamma flip line */}
        {flipX !== null && (
          <>
            <line
              x1={flipX} y1={PAD_T + 10} x2={flipX} y2={H - PAD_B}
              stroke="rgba(250,204,21,0.5)" strokeDasharray="3,2" strokeWidth={1}
            />
            <text
              x={flipX} y={PAD_T + 8}
              textAnchor="middle" fill="rgba(250,204,21,0.8)" fontSize={5.5} fontFamily="monospace"
            >
              FLIP
            </text>
          </>
        )}

        {/* Put wall annotation */}
        {putWallX !== null && (
          <text
            x={putWallX} y={H - PAD_B + 10}
            textAnchor="middle" fill="rgba(239,68,68,0.6)" fontSize={5} fontFamily="monospace"
          >
            PUT WALL
          </text>
        )}

        {/* Call wall annotation */}
        {callWallX !== null && (
          <text
            x={callWallX} y={H - PAD_B + 10}
            textAnchor="middle" fill="rgba(16,185,129,0.6)" fontSize={5} fontFamily="monospace"
          >
            CALL WALL
          </text>
        )}

        {/* X-axis strike labels */}
        {strikes.map((s, i) => {
          if (i % labelStep !== 0) return null;
          return (
            <text
              key={s.strike}
              x={scaleX(i)} y={H - 6}
              textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize={6} fontFamily="monospace"
            >
              {s.strike}
            </text>
          );
        })}
      </svg>

      {/* Summary stats below chart */}
      <div className="grid grid-cols-5 gap-px mt-3 bg-border/10">
        <MetricCell
          label={tr('gexNetGamma', 'Net Gamma')}
          value={fmtGamma(summary.totalNetGamma)}
          cls={summary.totalNetGamma >= 0 ? 'text-emerald-400' : 'text-red-400'}
        />
        <MetricCell
          label={tr('gexFlipLevel', 'Flip Level')}
          value={fmtPrice(summary.gammaFlip)}
          cls="text-yellow-400"
        />
        <MetricCell
          label={tr('gexPutWall', 'Put Wall')}
          value={fmtPrice(summary.putWall)}
          cls="text-red-400"
        />
        <MetricCell
          label={tr('gexCallWall', 'Call Wall')}
          value={fmtPrice(summary.callWall)}
          cls="text-emerald-400"
        />
        <MetricCell
          label={tr('gexRegime', 'Regime')}
          value={summary.gammaRegime}
          cls={summary.gammaRegime === 'POSITIVE' ? 'text-emerald-400' : summary.gammaRegime === 'NEGATIVE' ? 'text-red-400' : 'text-yellow-400'}
        />
      </div>
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

// ── LEVELS View ──

function LevelsView({
  summary,
  tr,
}: {
  summary: GexSummary;
  tr: (key: string, fallback: string) => string;
}) {
  // Sparkline from gamma history
  const sparkline = useMemo(() => {
    const hist = summary.gammaHistory;
    if (hist.length < 3) return null;

    const W = 140;
    const H = 32;
    const min = Math.min(...hist);
    const max = Math.max(...hist);
    const range = max - min || 1;

    const pts = hist.map((v, i) => {
      const x = (i / (hist.length - 1)) * W;
      const y = ((max - v) / range) * H;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    // Zero line position
    const zeroY = max > 0 && min < 0 ? ((max - 0) / range) * H : null;

    return { W, H, pts, zeroY, lastVal: hist[hist.length - 1] };
  }, [summary.gammaHistory]);

  return (
    <div className="px-3 py-3 space-y-3">
      {/* Key levels */}
      <div>
        <div className="text-[8px] font-black uppercase tracking-widest text-neutral-500 mb-2">
          {tr('gexKeyLevels', 'Key Levels')}
        </div>

        <div className="space-y-0.5">
          {summary.keyLevels.map((level) => {
            const distPct = ((level.price - summary.spot) / summary.spot * 100);
            return (
              <div
                key={level.type}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-emerald-400/[0.02] transition-colors"
              >
                {/* Type badge */}
                <span className={`w-[60px] text-[7px] font-black font-mono uppercase tracking-wider ${levelTypeColor(level.type)}`}>
                  {levelTypeLabel(level.type)}
                </span>

                {/* Price */}
                <span className="text-[10px] font-mono font-bold text-white w-[56px] text-right">
                  {fmtPrice(level.price)}
                </span>

                {/* Distance from spot */}
                <span className={`text-[8px] font-mono w-[44px] text-right ${distPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {distPct >= 0 ? '+' : ''}{distPct.toFixed(2)}%
                </span>

                {/* Description */}
                <span className="text-[7px] font-mono text-neutral-600 flex-1 truncate">
                  {level.description}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expected move visualization */}
      <div className="border-t border-border/20 pt-3">
        <div className="text-[8px] font-black uppercase tracking-widest text-neutral-500 mb-2">
          {tr('gexExpectedMove', 'Expected Move Range')}
        </div>

        <div className="flex items-center gap-2 px-2">
          {/* Down arrow */}
          <div className="flex items-center gap-1">
            <span className="text-red-400 text-[10px]">{'\u2193'}</span>
            <span className="text-[9px] font-mono font-bold text-red-400">
              -{summary.expectedMoveDown.toFixed(2)}%
            </span>
          </div>

          {/* Range bar */}
          <div className="flex-1 relative h-3 bg-white/[0.03]">
            {/* Down range */}
            <div
              className="absolute top-0 h-full bg-red-500/20"
              style={{ left: 0, width: `${(summary.expectedMoveDown / (summary.expectedMoveDown + summary.expectedMoveUp)) * 100}%` }}
            />
            {/* Up range */}
            <div
              className="absolute top-0 h-full bg-emerald-500/20"
              style={{ right: 0, width: `${(summary.expectedMoveUp / (summary.expectedMoveDown + summary.expectedMoveUp)) * 100}%` }}
            />
            {/* Center marker (spot) */}
            <div
              className="absolute top-0 h-full w-px bg-white/40"
              style={{ left: `${(summary.expectedMoveDown / (summary.expectedMoveDown + summary.expectedMoveUp)) * 100}%` }}
            />
          </div>

          {/* Up arrow */}
          <div className="flex items-center gap-1">
            <span className="text-emerald-400 text-[10px]">{'\u2191'}</span>
            <span className="text-[9px] font-mono font-bold text-emerald-400">
              +{summary.expectedMoveUp.toFixed(2)}%
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between px-2 mt-1">
          <span className="text-[7px] font-mono text-neutral-700">
            {fmtPrice(summary.spot * (1 - summary.expectedMoveDown / 100))}
          </span>
          <span className="text-[7px] font-mono text-neutral-500">
            SPOT {fmtPrice(summary.spot)}
          </span>
          <span className="text-[7px] font-mono text-neutral-700">
            {fmtPrice(summary.spot * (1 + summary.expectedMoveUp / 100))}
          </span>
        </div>
      </div>

      {/* Gamma stats */}
      <div className="border-t border-border/20 pt-3">
        <div className="grid grid-cols-3 gap-px bg-border/10">
          <MetricCell
            label={tr('gexZeroDte', '0DTE Gamma')}
            value={fmtGamma(summary.zeroDteGamma)}
            cls="text-orange-400"
          />
          <MetricCell
            label={tr('gexMaxStrike', 'Max Gamma @')}
            value={fmtPrice(summary.maxGammaStrike)}
            cls="text-blue-400"
          />
          <MetricCell
            label={tr('gexTotalNet', 'Total Net')}
            value={`${summary.totalNetGamma >= 0 ? '+' : ''}${fmtGamma(summary.totalNetGamma)}`}
            cls={summary.totalNetGamma >= 0 ? 'text-emerald-400' : 'text-red-400'}
          />
        </div>
      </div>

      {/* Gamma history sparkline */}
      {sparkline && (
        <div className="border-t border-border/20 pt-3">
          <div className="flex items-center justify-between mb-1">
            <div className="text-[8px] font-black uppercase tracking-widest text-neutral-500">
              {tr('gexGammaHistory', 'Net Gamma History')}
            </div>
            <span className={`text-[9px] font-mono font-bold ${sparkline.lastVal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {sparkline.lastVal >= 0 ? '+' : ''}{fmtGamma(sparkline.lastVal)}
            </span>
          </div>

          <svg viewBox={`0 0 ${sparkline.W} ${sparkline.H}`} className="w-full" style={{ maxHeight: 40 }}>
            {/* Zero line */}
            {sparkline.zeroY !== null && (
              <line
                x1={0} y1={sparkline.zeroY} x2={sparkline.W} y2={sparkline.zeroY}
                stroke="rgba(255,255,255,0.1)" strokeWidth={0.5} strokeDasharray="2,2"
              />
            )}
            {/* Sparkline */}
            <path d={sparkline.pts} fill="none" stroke={EMERALD} strokeWidth={1.2} />
            {/* Last point */}
            <circle
              cx={sparkline.W}
              cy={(() => {
                const hist = summary.gammaHistory;
                const min = Math.min(...hist);
                const max = Math.max(...hist);
                const range = max - min || 1;
                return ((max - hist[hist.length - 1]) / range) * sparkline.H;
              })()}
              r={2}
              fill={EMERALD}
            />
          </svg>
        </div>
      )}
    </div>
  );
}

// ── TABLE View ──

function TableView({
  strikes,
  summary,
  tr,
}: {
  strikes: GexStrike[];
  summary: GexSummary;
  tr: (key: string, fallback: string) => string;
}) {
  return (
    <div className="overflow-x-auto">
      {/* Column headers */}
      <div className="grid grid-cols-[60px_60px_60px_60px_56px_56px_56px] px-2 py-1 border-b border-border/20 text-[7px] font-black text-neutral-600 uppercase tracking-wider whitespace-nowrap bg-[#030303]">
        <span>{tr('gexStrike', 'Strike')}</span>
        <span className="text-right">{tr('gexCallGamma', 'Call Gam')}</span>
        <span className="text-right">{tr('gexPutGamma', 'Put Gam')}</span>
        <span className="text-right">{tr('gexNetGammaCol', 'Net Gam')}</span>
        <span className="text-right">{tr('gexCallOI', 'Call OI')}</span>
        <span className="text-right">{tr('gexPutOI', 'Put OI')}</span>
        <span className="text-right">{tr('gexTotalOI', 'Total OI')}</span>
      </div>

      {/* Rows */}
      {strikes.map((s) => {
        const isNearSpot = Math.abs(s.strike - summary.spot) <= summary.spot * 0.005;
        return (
          <StrikeRow
            key={s.strike}
            strike={s}
            isNearSpot={isNearSpot}
            isPutWall={s.strike === summary.putWall}
            isCallWall={s.strike === summary.callWall}
          />
        );
      })}

      {/* Footer */}
      <div className="px-2 py-1.5 border-t border-border/10">
        <span className="text-[7px] font-mono text-neutral-700">
          {summary.symbol} Spot: {fmtPrice(summary.spot)} | Net Gamma: {summary.totalNetGamma >= 0 ? '+' : ''}{fmtGamma(summary.totalNetGamma)} | Regime: {summary.gammaRegime}
        </span>
      </div>
    </div>
  );
}

function StrikeRow({
  strike,
  isNearSpot,
  isPutWall,
  isCallWall,
}: {
  strike: GexStrike;
  isNearSpot: boolean;
  isPutWall: boolean;
  isCallWall: boolean;
}) {
  const bgCls = isNearSpot
    ? 'bg-emerald-400/[0.04]'
    : isPutWall
      ? 'bg-red-400/[0.03]'
      : isCallWall
        ? 'bg-emerald-400/[0.03]'
        : '';

  return (
    <div className={`grid grid-cols-[60px_60px_60px_60px_56px_56px_56px] px-2 py-1.5 border-b border-border/10 hover:bg-emerald-400/[0.02] transition-colors text-[9px] font-mono whitespace-nowrap ${bgCls}`}>
      {/* Strike */}
      <span className={`font-bold ${isNearSpot ? 'text-white' : isPutWall ? 'text-red-400' : isCallWall ? 'text-emerald-400' : 'text-neutral-400'}`}>
        {strike.strike}
        {isNearSpot && <span className="text-[6px] text-neutral-600 ml-0.5">ATM</span>}
        {isPutWall && <span className="text-[6px] text-red-600 ml-0.5">PW</span>}
        {isCallWall && <span className="text-[6px] text-emerald-600 ml-0.5">CW</span>}
      </span>

      {/* Call Gamma */}
      <span className="text-right text-emerald-400">
        {strike.callGamma > 0 ? '+' : ''}{strike.callGamma.toFixed(1)}
      </span>

      {/* Put Gamma */}
      <span className="text-right text-red-400">
        {strike.putGamma.toFixed(1)}
      </span>

      {/* Net Gamma */}
      <span className={`text-right font-bold ${strike.netGamma >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        {strike.netGamma >= 0 ? '+' : ''}{strike.netGamma.toFixed(1)}
      </span>

      {/* Call OI */}
      <span className="text-right text-neutral-500">
        {fmtOI(strike.callOI)}
      </span>

      {/* Put OI */}
      <span className="text-right text-neutral-500">
        {fmtOI(strike.putOI)}
      </span>

      {/* Total OI */}
      <span className="text-right text-neutral-400">
        {fmtOI(strike.totalOI)}
      </span>
    </div>
  );
}
