import { useBreadth, type BreadthData, type BreadthMover } from '../../api/hooks/use-breadth';
import { useT } from '../../i18n';
import { BarChart3, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';

function fmt(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

function fmtVol(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col items-center px-2 py-1">
      <span className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider">{label}</span>
      <span className={`text-sm font-black font-mono ${color || 'text-neutral/80'}`}>{value}</span>
    </div>
  );
}

function ADBar({ advancers, decliners, unchanged, label, formatNum }: {
  advancers: number; decliners: number; unchanged: number; label: string; formatNum?: (n: number) => string;
}) {
  const total = advancers + decliners + unchanged;
  if (total === 0) return null;
  const advPct = (advancers / total) * 100;
  const unchPct = (unchanged / total) * 100;
  const decPct = (decliners / total) * 100;
  const f = formatNum || String;

  return (
    <div className="px-3 py-1">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[8px] font-mono text-neutral/40 uppercase">{label}</span>
        <div className="flex items-center gap-2 text-[8px] font-mono">
          <span className="text-emerald-400">{f(advancers)}</span>
          {unchanged > 0 && <span className="text-neutral/30">{f(unchanged)}</span>}
          <span className="text-red-400">{f(decliners)}</span>
        </div>
      </div>
      <div className="flex h-3 rounded-sm overflow-hidden">
        <div
          className="bg-emerald-500/80 transition-all"
          style={{ width: `${advPct}%` }}
          title={`${advancers} (${advPct.toFixed(1)}%)`}
        />
        <div
          className="bg-neutral/20 transition-all"
          style={{ width: `${unchPct}%` }}
          title={`${unchanged} (${unchPct.toFixed(1)}%)`}
        />
        <div
          className="bg-red-500/80 transition-all"
          style={{ width: `${decPct}%` }}
          title={`${decliners} (${decPct.toFixed(1)}%)`}
        />
      </div>
    </div>
  );
}

function DistributionBar({ label, count, maxCount, color }: {
  label: string; count: number; maxCount: number; color: string;
}) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
  return (
    <div className="flex items-center gap-1.5 h-4">
      <span className="text-[8px] font-mono text-neutral/50 w-10 text-right shrink-0">{label}</span>
      <div className="flex-1 h-2.5 bg-white/[0.03] rounded-sm overflow-hidden">
        <div
          className="h-full rounded-sm transition-all"
          style={{ width: `${Math.max(pct, 1)}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[9px] font-mono text-neutral/60 w-5 text-right shrink-0">{count}</span>
    </div>
  );
}

function SMABar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="px-3 py-0.5">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[8px] font-mono text-neutral/40 uppercase">{label}</span>
        <span className="text-[9px] font-mono font-bold" style={{ color }}>{fmt(value)}%</span>
      </div>
      <div className="h-2 bg-white/[0.03] rounded-sm overflow-hidden">
        <div
          className="h-full rounded-sm transition-all"
          style={{ width: `${Math.min(value, 100)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function MoverRow({ mover }: { mover: BreadthMover }) {
  const isPositive = mover.changePercent >= 0;
  return (
    <div className="flex items-center justify-between px-1 py-0.5">
      <span className="text-[9px] font-mono font-bold text-neutral/70">{mover.symbol}</span>
      <div className="flex items-center gap-2">
        <span className="text-[8px] font-mono text-neutral/40">${fmt(mover.price)}</span>
        <span className={`text-[9px] font-mono font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
          {isPositive ? '+' : ''}{fmt(mover.changePercent)}%
        </span>
      </div>
    </div>
  );
}

function BreadthContent({ data }: { data: BreadthData }) {
  const t = useT();

  const distMax = Math.max(data.upMore5, data.up2to5, data.up0to2, data.down0to2, data.down2to5, data.downMore5, 1);

  const adColor = data.adRatio > 1 ? 'text-emerald-400' : data.adRatio < 1 ? 'text-red-400' : 'text-neutral/60';
  const avgColor = data.avgChange > 0 ? 'text-emerald-400' : data.avgChange < 0 ? 'text-red-400' : 'text-neutral/60';

  return (
    <div className="flex flex-col gap-1.5">
      {/* Key stats row */}
      <div className="flex items-center justify-around px-2 py-1 border-b border-border/20">
        <StatBox label={t('breadthAD')} value={fmt(data.adRatio)} color={adColor} />
        <StatBox
          label={t('breadthNewHighs')}
          value={String(data.newHighs)}
          color="text-emerald-400"
        />
        <StatBox
          label={t('breadthNewLows')}
          value={String(data.newLows)}
          color="text-red-400"
        />
        <StatBox
          label="AVG CHG"
          value={`${data.avgChange > 0 ? '+' : ''}${fmt(data.avgChange)}%`}
          color={avgColor}
        />
      </div>

      {/* A/D Bar */}
      <ADBar
        advancers={data.advancers}
        decliners={data.decliners}
        unchanged={data.unchanged}
        label={`${t('breadthAdvancers')} / ${t('breadthDecliners')}`}
      />

      {/* Volume Bar */}
      <ADBar
        advancers={Math.round(data.advanceVolume)}
        decliners={Math.round(data.declineVolume)}
        unchanged={0}
        label={t('breadthVolume')}
        formatNum={fmtVol}
      />

      {/* SMA Breadth */}
      <SMABar label={t('breadthAboveSMA50')} value={data.aboveSMA50} color="#34d399" />
      <SMABar label={t('breadthAboveSMA200')} value={data.aboveSMA200} color="#60a5fa" />

      {/* Change Distribution */}
      <div className="px-3 py-1">
        <span className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider">{t('breadthDistribution')}</span>
        <div className="flex flex-col gap-0.5 mt-1">
          <DistributionBar label=">+5%" count={data.upMore5} maxCount={distMax} color="rgba(16,185,129,0.9)" />
          <DistributionBar label="+2-5%" count={data.up2to5} maxCount={distMax} color="rgba(16,185,129,0.6)" />
          <DistributionBar label="+0-2%" count={data.up0to2} maxCount={distMax} color="rgba(16,185,129,0.35)" />
          <DistributionBar label="0-2%" count={data.down0to2} maxCount={distMax} color="rgba(239,68,68,0.35)" />
          <DistributionBar label="2-5%" count={data.down2to5} maxCount={distMax} color="rgba(239,68,68,0.6)" />
          <DistributionBar label=">5%" count={data.downMore5} maxCount={distMax} color="rgba(239,68,68,0.9)" />
        </div>
      </div>

      {/* Top Movers */}
      <div className="flex gap-2 px-3 pb-2">
        {/* Gainers */}
        <div className="flex-1">
          <div className="flex items-center gap-1 mb-0.5">
            <TrendingUp className="w-2.5 h-2.5 text-emerald-400" />
            <span className="text-[8px] font-mono text-emerald-400/70 uppercase">{t('breadthTopGainers')}</span>
          </div>
          <div className="flex flex-col">
            {data.topGainers.map((m) => (
              <MoverRow key={m.symbol} mover={m} />
            ))}
          </div>
        </div>

        {/* Losers */}
        <div className="flex-1">
          <div className="flex items-center gap-1 mb-0.5">
            <TrendingDown className="w-2.5 h-2.5 text-red-400" />
            <span className="text-[8px] font-mono text-red-400/70 uppercase">{t('breadthTopLosers')}</span>
          </div>
          <div className="flex flex-col">
            {data.topLosers.map((m) => (
              <MoverRow key={m.symbol} mover={m} />
            ))}
          </div>
        </div>
      </div>

      {/* Footer stats */}
      <div className="flex items-center justify-center gap-3 px-3 py-1 border-t border-border/20">
        <span className="text-[8px] font-mono text-neutral/30">
          {data.totalStocks} stocks | Median: {data.medianChange > 0 ? '+' : ''}{fmt(data.medianChange)}% | Vol Ratio: {fmt(data.volumeRatio)}
        </span>
      </div>
    </div>
  );
}

export function BreadthPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useBreadth();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-cyan-400">
            {t('panelBreadth')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral/40 hover:text-cyan-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading && !data ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
              <span className="text-[10px] font-mono text-neutral/40 uppercase tracking-widest">
                {t('loading')}
              </span>
            </div>
          </div>
        ) : data ? (
          <BreadthContent data={data} />
        ) : (
          <div className="flex items-center justify-center h-full text-[10px] font-mono text-neutral/40 uppercase">
            {t('breadthNoData')}
          </div>
        )}
      </div>
    </div>
  );
}
