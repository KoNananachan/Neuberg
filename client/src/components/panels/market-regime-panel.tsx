import { useMarketRegime, type MarketRegimeData, type AssetRegime } from '../../api/hooks/use-market-regime';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// i18n keys don't exist yet — cast t to accept arbitrary strings
const t_ = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  return (t as (k: string) => string)(key) || fallback;
};

// ── Color Helpers ──

type TrendState = AssetRegime['trend'];
type Regime = MarketRegimeData['regime'];

function getTrendColor(trend: TrendState): { bg: string; text: string; fill: string } {
  switch (trend) {
    case 'Bull': return { bg: 'bg-emerald-500/15', text: 'text-emerald-400', fill: '#34d399' };
    case 'Bear': return { bg: 'bg-red-500/15', text: 'text-red-400', fill: '#f87171' };
    case 'Correction': return { bg: 'bg-amber-500/15', text: 'text-amber-400', fill: '#fbbf24' };
    case 'Recovery': return { bg: 'bg-blue-500/15', text: 'text-blue-400', fill: '#60a5fa' };
  }
}

function getRegimeColor(regime: Regime): { text: string; fill: string; glow: string; bg: string } {
  switch (regime) {
    case 'RISK ON': return { text: 'text-emerald-400', fill: '#34d399', glow: 'rgba(52,211,153,0.2)', bg: 'rgba(52,211,153,0.06)' };
    case 'RISK OFF': return { text: 'text-red-400', fill: '#f87171', glow: 'rgba(248,113,113,0.2)', bg: 'rgba(248,113,113,0.06)' };
    case 'TRANSITION': return { text: 'text-amber-400', fill: '#fbbf24', glow: 'rgba(251,191,36,0.2)', bg: 'rgba(251,191,36,0.06)' };
    case 'MIXED': return { text: 'text-orange-400', fill: '#fb923c', glow: 'rgba(251,146,60,0.2)', bg: 'rgba(251,146,60,0.06)' };
  }
}

function getRsiColor(rsi: number): string {
  if (rsi >= 70) return 'text-red-400';
  if (rsi >= 60) return 'text-orange-300';
  if (rsi <= 30) return 'text-emerald-400';
  if (rsi <= 40) return 'text-blue-300';
  return 'text-neutral-400';
}

function getVolColor(vol: number): string {
  if (vol >= 30) return 'text-red-400';
  if (vol >= 20) return 'text-amber-400';
  return 'text-neutral-400';
}

function getReturnColor(ret: number): string {
  if (ret > 0) return 'text-emerald-400';
  if (ret < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function formatReturn(ret: number): string {
  const sign = ret > 0 ? '+' : '';
  return `${sign}${ret.toFixed(1)}`;
}

function formatPrice(price: number): string {
  if (price >= 10000) return price.toFixed(0);
  if (price >= 100) return price.toFixed(1);
  return price.toFixed(2);
}

// ── Main Panel ──

export function MarketRegimePanel() {
  const t = useT();
  const { data, isLoading, refetch } = useMarketRegime();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-400" viewBox="0 0 16 16" fill="none">
            <path d="M2 14L5 8L8 10L11 4L14 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="2" cy="14" r="1.2" fill="currentColor" />
            <circle cx="14" cy="2" r="1.2" fill="currentColor" />
          </svg>
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-amber-400">
            {t_(t, 'mrTitle', 'Market Regime')}
          </span>
        </div>
        <button onClick={() => refetch()} className="p-1 text-neutral/40 hover:text-amber-400 transition-colors">
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-amber-400 text-[9px] font-mono uppercase animate-pulse">
            {t_(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">
            {t_(t, 'mrNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            <RegimeHeader data={data} />
            <TrendBreadth data={data} />
            <AssetMatrix data={data} />
            <SignalSummary data={data} />
          </>
        )}
      </div>
    </div>
  );
}

// ── 1. Regime Header with Gauge ──

function RegimeHeader({ data }: { data: MarketRegimeData }) {
  const t = useT();
  const color = getRegimeColor(data.regime);
  const bullCount = data.assets.filter((a) => a.trend === 'Bull').length;

  // SVG arc gauge: 180-degree semicircle
  const CX = 100;
  const CY = 80;
  const R = 65;
  const STROKE_W = 8;
  const startAngle = Math.PI;
  const totalAngle = Math.PI;

  // Needle angle based on score (0=left, 100=right)
  const needleAngle = startAngle - (data.regimeScore / 100) * totalAngle;
  const needleX = CX + (R - 4) * Math.cos(needleAngle);
  const needleY = CY - (R - 4) * Math.sin(needleAngle);

  // Zone arcs
  const zones = [
    { from: 0, to: 20, color: '#ef4444' },
    { from: 20, to: 35, color: '#f97316' },
    { from: 35, to: 50, color: '#fbbf24' },
    { from: 50, to: 65, color: '#a3e635' },
    { from: 65, to: 80, color: '#22c55e' },
    { from: 80, to: 100, color: '#10b981' },
  ];

  function arcPath(fromPct: number, toPct: number): string {
    const a1 = startAngle - (fromPct / 100) * totalAngle;
    const a2 = startAngle - (toPct / 100) * totalAngle;
    const x1 = CX + R * Math.cos(a1);
    const y1 = CY - R * Math.sin(a1);
    const x2 = CX + R * Math.cos(a2);
    const y2 = CY - R * Math.sin(a2);
    const largeArc = (toPct - fromPct) > 50 ? 1 : 0;
    return `M ${x1},${y1} A ${R},${R} 0 ${largeArc} 0 ${x2},${y2}`;
  }

  return (
    <div className="px-3 pt-3 pb-2 border-b border-border/20" style={{ background: color.bg }}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex flex-col">
          <span className={`text-[15px] font-black font-mono uppercase tracking-tight ${color.text}`}>
            {data.regime}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 uppercase tracking-wider">
            {bullCount} {t_(t, 'mrOfAssets', 'of')} {data.assets.length} {t_(t, 'mrInBull', 'assets in bull trend')}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className={`text-[20px] font-black font-mono ${color.text}`}>{data.regimeScore}</span>
          <span className="text-[7px] font-mono text-neutral-500 uppercase">
            {t_(t, 'mrScore', 'Regime Score')}
          </span>
        </div>
      </div>

      <svg viewBox="0 0 200 95" className="w-full" style={{ maxWidth: 280, maxHeight: 120, margin: '0 auto', display: 'block' }}>
        {/* Background track */}
        <path d={arcPath(0, 100)} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={STROKE_W} strokeLinecap="round" />

        {/* Zone arcs */}
        {zones.map((z) => (
          <path key={z.from} d={arcPath(z.from, z.to)} fill="none" stroke={z.color} strokeWidth={STROKE_W} strokeLinecap="butt" opacity={0.45} />
        ))}

        {/* Needle */}
        <line x1={CX} y1={CY} x2={needleX} y2={needleY} stroke={color.fill} strokeWidth={2} strokeLinecap="round" />
        <circle cx={CX} cy={CY} r={3.5} fill={color.fill} />
        <circle cx={CX} cy={CY} r={1.5} fill="#000" />

        {/* Labels */}
        <text x={CX - R - 4} y={CY + 10} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize={7} fontFamily="monospace">0</text>
        <text x={CX} y={CY + 10} textAnchor="middle" fill="rgba(255,255,255,0.15)" fontSize={6} fontFamily="monospace">50</text>
        <text x={CX + R + 4} y={CY + 10} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize={7} fontFamily="monospace">100</text>

        {/* Bottom labels */}
        <text x={CX - R + 10} y={CY + 20} textAnchor="middle" fill="#f87171" fontSize={5.5} fontFamily="monospace" opacity={0.6}>FEAR</text>
        <text x={CX + R - 10} y={CY + 20} textAnchor="middle" fill="#34d399" fontSize={5.5} fontFamily="monospace" opacity={0.6}>GREED</text>
      </svg>
    </div>
  );
}

// ── 2. Trend Breadth Bar ──

function TrendBreadth({ data }: { data: MarketRegimeData }) {
  const counts = { Bull: 0, Recovery: 0, Correction: 0, Bear: 0 };
  for (const asset of data.assets) {
    counts[asset.trend]++;
  }
  const total = data.assets.length || 1;

  const segments: { trend: TrendState; count: number; color: string; label: string }[] = [
    { trend: 'Bull', count: counts.Bull, color: '#34d399', label: 'BULL' },
    { trend: 'Recovery', count: counts.Recovery, color: '#60a5fa', label: 'RECV' },
    { trend: 'Correction', count: counts.Correction, color: '#fbbf24', label: 'CORR' },
    { trend: 'Bear', count: counts.Bear, color: '#f87171', label: 'BEAR' },
  ];

  const W = 300;
  const BAR_H = 16;
  const PAD = 10;
  const barWidth = W - PAD * 2;
  let x = PAD;

  return (
    <div className="px-3 py-2 border-b border-border/20">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">
        Trend Breadth
      </div>
      <svg viewBox={`0 0 ${W} ${BAR_H + 18}`} className="w-full" style={{ maxHeight: 40 }}>
        {segments.map((seg) => {
          const w = (seg.count / total) * barWidth;
          if (w < 1) { return null; }
          const segX = x;
          x += w;
          return (
            <g key={seg.trend}>
              <rect x={segX} y={0} width={w} height={BAR_H} rx={segX === PAD ? 3 : 0} fill={seg.color} opacity={0.7} />
              {w > 25 && (
                <text x={segX + w / 2} y={BAR_H / 2 + 1} textAnchor="middle" dominantBaseline="middle" fill="#000" fontSize={7} fontFamily="monospace" fontWeight="900">
                  {seg.count}
                </text>
              )}
            </g>
          );
        })}
        {/* Legend below */}
        {segments.map((seg, i) => {
          const lx = PAD + i * (barWidth / 4);
          return (
            <g key={`label-${seg.trend}`}>
              <rect x={lx} y={BAR_H + 4} width={6} height={6} rx={1} fill={seg.color} opacity={0.6} />
              <text x={lx + 9} y={BAR_H + 10.5} fill="rgba(255,255,255,0.4)" fontSize={6} fontFamily="monospace">
                {seg.label} ({seg.count})
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── 3. Asset Trend Matrix ──

function AssetMatrix({ data }: { data: MarketRegimeData }) {
  const t = useT();

  return (
    <div className="px-2 py-2 border-b border-border/20">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
        {t_(t, 'mrAssetTrends', 'Asset Trend Matrix')}
      </div>

      {/* Header row */}
      <div className="grid grid-cols-[1fr_55px_52px_38px_28px_28px_30px_30px_30px] gap-0 px-1 mb-0.5">
        <span className="text-[6px] font-mono text-neutral-600 uppercase">Asset</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Price</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-center">Trend</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Str%</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">RSI</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Vol</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">1W</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">1M</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">3M</span>
      </div>

      {/* Asset rows */}
      {data.assets.map((asset) => {
        const tc = getTrendColor(asset.trend);
        return (
          <div
            key={asset.symbol}
            className="grid grid-cols-[1fr_55px_52px_38px_28px_28px_30px_30px_30px] gap-0 px-1 py-[3px] hover:bg-white/[0.02] border-b border-border/10 items-center"
          >
            {/* Name */}
            <div className="flex flex-col min-w-0">
              <span className="text-[8px] font-mono font-bold text-neutral-200 truncate">{asset.name}</span>
              <span className="text-[6px] font-mono text-neutral-600 truncate">{asset.symbol}</span>
            </div>

            {/* Price */}
            <span className="text-[8px] font-mono font-bold text-neutral-300 text-right tabular-nums">
              {formatPrice(asset.price)}
            </span>

            {/* Trend badge */}
            <div className="flex justify-center">
              <span className={`text-[6.5px] font-mono font-black uppercase px-1.5 py-[1px] rounded ${tc.bg} ${tc.text}`}>
                {asset.trend === 'Correction' ? 'CORR' : asset.trend === 'Recovery' ? 'RECV' : asset.trend.toUpperCase()}
              </span>
            </div>

            {/* Trend Strength */}
            <span className={`text-[7.5px] font-mono font-bold text-right tabular-nums ${asset.trendStrength > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {asset.trendStrength > 0 ? '+' : ''}{asset.trendStrength.toFixed(1)}
            </span>

            {/* RSI */}
            <span className={`text-[7.5px] font-mono font-bold text-right tabular-nums ${getRsiColor(asset.rsi)}`}>
              {Math.round(asset.rsi)}
            </span>

            {/* Volatility */}
            <span className={`text-[7.5px] font-mono text-right tabular-nums ${getVolColor(asset.volatility)}`}>
              {Math.round(asset.volatility)}
            </span>

            {/* 1W */}
            <span className={`text-[7px] font-mono font-bold text-right tabular-nums ${getReturnColor(asset.returns['1w'])}`}>
              {formatReturn(asset.returns['1w'])}
            </span>

            {/* 1M */}
            <span className={`text-[7px] font-mono font-bold text-right tabular-nums ${getReturnColor(asset.returns['1m'])}`}>
              {formatReturn(asset.returns['1m'])}
            </span>

            {/* 3M */}
            <span className={`text-[7px] font-mono font-bold text-right tabular-nums ${getReturnColor(asset.returns['3m'])}`}>
              {formatReturn(asset.returns['3m'])}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── 4. Signal Summary ──

function SignalSummary({ data }: { data: MarketRegimeData }) {
  const t = useT();
  const signals: { text: string; type: 'bullish' | 'bearish' | 'warning' }[] = [];

  for (const asset of data.assets) {
    // Golden cross detection (SMA50 > SMA200 and price > SMA50)
    if (asset.trend === 'Bull' && asset.sma50 > asset.sma200) {
      // Check if the cross is "recent" — SMA50 within 2% of SMA200
      const crossProximity = Math.abs((asset.sma50 - asset.sma200) / asset.sma200) * 100;
      if (crossProximity < 2) {
        signals.push({ text: `Golden Cross active on ${asset.name}`, type: 'bullish' });
      }
    }

    // Death cross detection
    if (asset.trend === 'Bear' && asset.sma50 < asset.sma200) {
      const crossProximity = Math.abs((asset.sma50 - asset.sma200) / asset.sma200) * 100;
      if (crossProximity < 2) {
        signals.push({ text: `Death Cross active on ${asset.name}`, type: 'bearish' });
      }
    }

    // RSI overbought
    if (asset.rsi >= 70) {
      signals.push({ text: `RSI overbought on ${asset.name} (${asset.rsi.toFixed(0)})`, type: 'warning' });
    }

    // RSI oversold
    if (asset.rsi <= 30) {
      signals.push({ text: `RSI oversold on ${asset.name} (${asset.rsi.toFixed(0)})`, type: 'bullish' });
    }

    // High volatility warning
    if (asset.volatility >= 30) {
      signals.push({ text: `High volatility on ${asset.name} (${asset.volatility.toFixed(0)}%)`, type: 'warning' });
    }

    // Strong trend (>15% above/below SMA200)
    if (asset.trendStrength > 15) {
      signals.push({ text: `${asset.name} extended above SMA200 (+${asset.trendStrength.toFixed(1)}%)`, type: 'warning' });
    }
    if (asset.trendStrength < -15) {
      signals.push({ text: `${asset.name} deeply below SMA200 (${asset.trendStrength.toFixed(1)}%)`, type: 'bearish' });
    }

    // Strong momentum: 3M return > 20%
    if (asset.returns['3m'] > 20) {
      signals.push({ text: `${asset.name} surging +${asset.returns['3m'].toFixed(1)}% in 3 months`, type: 'bullish' });
    }
    if (asset.returns['3m'] < -15) {
      signals.push({ text: `${asset.name} down ${asset.returns['3m'].toFixed(1)}% in 3 months`, type: 'bearish' });
    }
  }

  // Broad signals
  const bullCount = data.assets.filter((a) => a.trend === 'Bull').length;
  const bearCount = data.assets.filter((a) => a.trend === 'Bear').length;
  if (bullCount >= 8) {
    signals.push({ text: 'Broad bull trend across asset classes', type: 'bullish' });
  }
  if (bearCount >= 6) {
    signals.push({ text: 'Broad bearish conditions across markets', type: 'bearish' });
  }

  // Limit to most relevant signals
  const limitedSignals = signals.slice(0, 8);

  if (limitedSignals.length === 0) return null;

  return (
    <div className="px-3 py-2">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">
        {t_(t, 'mrSignals', 'Signals')}
      </div>
      <div className="flex flex-col gap-1">
        {limitedSignals.map((signal, i) => {
          const dotColor = signal.type === 'bullish'
            ? 'bg-emerald-400'
            : signal.type === 'bearish'
              ? 'bg-red-400'
              : 'bg-amber-400';

          return (
            <div key={i} className="flex items-start gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full mt-[3px] shrink-0 ${dotColor}`} />
              <span className="text-[7.5px] font-mono text-neutral-400 leading-tight">
                {signal.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
