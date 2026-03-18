import { useState } from 'react';
import { useBonds, type YieldPoint, type BondEtf } from '../../api/hooks/use-bonds';
import { useT } from '../../i18n';
import { Landmark, RefreshCw } from 'lucide-react';

type Tab = 'curve' | 'etfs';

export function BondsPanel() {
  const t = useT();
  const [tab, setTab] = useState<Tab>('curve');
  const { data, isLoading, refetch } = useBonds();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Landmark className="w-4 h-4 text-amber-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-amber-400">
            {t('panelBonds')}
          </span>
        </div>
        <button onClick={() => refetch()} className="p-1 text-neutral/40 hover:text-amber-400 transition-colors">
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/30 bg-black/40 shrink-0">
        {(['curve', 'etfs'] as Tab[]).map((t_) => (
          <button
            key={t_}
            onClick={() => setTab(t_)}
            className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest border-b-2 transition-colors ${
              tab === t_
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-neutral/40 hover:text-neutral'
            }`}
          >
            {t(`bonds_${t_}`)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-amber-400 text-[9px] font-mono uppercase animate-pulse">
            {t('loading')}
          </div>
        )}

        {data && tab === 'curve' && <YieldCurveView yields={data.yields} spreads={data.spreads} />}
        {data && tab === 'etfs' && <BondEtfList etfs={data.etfs} />}
      </div>
    </div>
  );
}

function YieldCurveView({ yields, spreads }: { yields: YieldPoint[]; spreads: { name: string; value: number }[] }) {
  const t = useT();

  if (yields.length === 0) {
    return <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">{t('noData')}</div>;
  }

  return (
    <div>
      {/* Yield curve chart */}
      <div className="px-3 py-3 border-b border-border/20">
        <div className="text-[8px] font-black uppercase tracking-widest text-neutral/40 mb-2">
          {t('bondsYieldCurve')}
        </div>
        <YieldCurveChart yields={yields} />
      </div>

      {/* Key rates */}
      <div className="grid grid-cols-2 gap-px bg-border/10">
        {yields.map((y) => (
          <div key={y.symbol} className="px-3 py-2 bg-black">
            <div className="text-[8px] font-mono text-neutral/40 uppercase">{y.maturity} {t('bondsYield')}</div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-[16px] font-mono font-black text-white">{y.yield.toFixed(3)}%</span>
              <span className={`text-[9px] font-mono font-bold ${y.change >= 0 ? 'text-bearish' : 'text-bullish'}`}>
                {y.change >= 0 ? '+' : ''}{(y.change * 100).toFixed(1)}bp
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Spreads */}
      <div className="px-3 py-2 border-t border-border/20">
        <div className="text-[8px] font-black uppercase tracking-widest text-neutral/40 mb-1.5">
          {t('bondsSpreads')}
        </div>
        <div className="flex gap-4">
          {spreads.map((s) => (
            <div key={s.name} className="flex items-center gap-1.5">
              <span className="text-[8px] font-mono text-neutral/50 uppercase">{s.name}</span>
              <span className={`text-[10px] font-mono font-bold ${
                s.value >= 0 ? 'text-bullish' : 'text-bearish'
              }`}>
                {s.value >= 0 ? '+' : ''}{s.value}bp
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function YieldCurveChart({ yields }: { yields: YieldPoint[] }) {
  if (yields.length < 2) return null;

  const W = 280;
  const H = 100;
  const PAD_X = 30;
  const PAD_Y = 15;

  const minY = Math.min(...yields.map((y) => y.yield)) - 0.2;
  const maxY = Math.max(...yields.map((y) => y.yield)) + 0.2;
  const minX = 0;
  const maxX = Math.max(...yields.map((y) => y.years));

  const scaleX = (years: number) => PAD_X + ((years - minX) / (maxX - minX)) * (W - PAD_X * 2);
  const scaleY = (rate: number) => PAD_Y + ((maxY - rate) / (maxY - minY)) * (H - PAD_Y * 2);

  const points = yields.map((y) => ({ x: scaleX(y.years), y: scaleY(y.yield), yield: y }));

  // Smooth curve path
  const pathD = points
    .map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`))
    .join(' ');

  // Y-axis grid lines
  const yTicks = [];
  const step = (maxY - minY) > 1 ? 0.5 : 0.25;
  for (let v = Math.ceil(minY / step) * step; v <= maxY; v += step) {
    yTicks.push(v);
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 120 }}>
      {/* Grid lines */}
      {yTicks.map((v) => (
        <g key={v}>
          <line
            x1={PAD_X} y1={scaleY(v)} x2={W - PAD_X} y2={scaleY(v)}
            stroke="rgba(255,255,255,0.05)" strokeDasharray="2,2"
          />
          <text x={PAD_X - 3} y={scaleY(v) + 3} textAnchor="end" fill="rgba(255,255,255,0.25)" fontSize={7} fontFamily="monospace">
            {v.toFixed(1)}
          </text>
        </g>
      ))}

      {/* Curve line */}
      <path d={pathD} fill="none" stroke="#f59e0b" strokeWidth={2} />

      {/* Data points */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={3} fill="#f59e0b" />
          <text x={p.x} y={H - 2} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize={7} fontFamily="monospace">
            {p.yield.maturity}
          </text>
        </g>
      ))}
    </svg>
  );
}

function BondEtfList({ etfs }: { etfs: BondEtf[] }) {
  const t = useT();

  if (etfs.length === 0) {
    return <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">{t('noData')}</div>;
  }

  return (
    <div>
      <div className="grid grid-cols-[1fr_0.8fr_0.8fr_0.8fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral/40 uppercase tracking-wider">
        <span>{t('symbol')}</span>
        <span className="text-right">{t('price')}</span>
        <span className="text-right">{t('moversChange')}</span>
        <span className="text-right">{t('moversVolume')}</span>
      </div>

      {etfs.map((etf) => (
        <div key={etf.symbol} className="grid grid-cols-[1fr_0.8fr_0.8fr_0.8fr] px-3 py-1.5 border-b border-border/10 hover:bg-white/[0.02] transition-colors">
          <div>
            <div className="text-[10px] font-mono font-bold text-white">{etf.symbol}</div>
            <div className="text-[7px] font-mono text-neutral/30 truncate">{etf.name}</div>
          </div>
          <span className="text-[10px] font-mono text-white text-right self-center">
            ${etf.price.toFixed(2)}
          </span>
          <span className={`text-[10px] font-mono font-bold text-right self-center ${
            etf.changePercent >= 0 ? 'text-bullish' : 'text-bearish'
          }`}>
            {etf.changePercent >= 0 ? '+' : ''}{etf.changePercent.toFixed(2)}%
          </span>
          <span className="text-[9px] font-mono text-neutral/50 text-right self-center">
            {fmtVol(etf.volume)}
          </span>
        </div>
      ))}
    </div>
  );
}

function fmtVol(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toFixed(0);
}
