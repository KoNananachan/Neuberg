import { useState } from 'react';
import { useCommodityWarehouse } from '../../api/hooks/use-commodity-warehouse';
import { useT, tr, TFn } from '../../i18n';

// -- i18n fallback helper --

// -- Constants --

const ACCENT = '#fb923c'; // orange-400
const ACCENT_DIM = 'rgba(251,146,60,0.08)';

type Tab = 'lme' | 'comex' | 'energy' | 'agriculture' | 'trends';

// -- Formatting helpers --

function fmtNumber(n: unknown): string {
  if (n == null || typeof n !== 'number' || isNaN(n)) return '-';
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (Math.abs(n) >= 1e3) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return n.toFixed(2);
}

function fmtPct(n: unknown): string {
  if (n == null || typeof n !== 'number' || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtPrice(n: unknown): string {
  if (n == null || typeof n !== 'number' || isNaN(n)) return '-';
  if (n >= 1000) return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (n >= 10) return n.toFixed(2);
  return n.toFixed(4);
}

// -- Color helpers --

function changeColor(n: unknown): string {
  if (n == null || typeof n !== 'number') return 'text-zinc-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-zinc-500';
}

function buildDrawLabel(n: unknown): { label: string; color: string } {
  if (n == null || typeof n !== 'number') return { label: '-', color: 'text-zinc-500' };
  if (n > 0) return { label: 'BUILD', color: 'text-green-400' };
  if (n < 0) return { label: 'DRAW', color: 'text-red-400' };
  return { label: 'FLAT', color: 'text-zinc-500' };
}

// -- Shimmer skeleton for loading state --

function ShimmerRows({ cols, rows }: { cols: number; rows: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, ri) => (
        <tr key={ri} className="border-b border-border/5">
          {Array.from({ length: cols }).map((_, ci) => (
            <td key={ci} className="px-2 py-1.5">
              <div className="h-2.5 bg-white/[0.04] animate-pulse" style={{ width: `${50 + Math.random() * 40}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function LoadingSkeleton() {
  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Tab bar skeleton */}
      <div className="flex items-center gap-0 border-b border-border/20 shrink-0 px-1">
        {['LME', 'COMEX', 'ENERGY', 'AGRICULTURE', 'TRENDS'].map((label) => (
          <div key={label} className="px-3 py-2">
            <div className="h-2 w-12 bg-white/[0.06] animate-pulse" />
          </div>
        ))}
      </div>
      {/* Summary skeleton */}
      <div className="grid grid-cols-5 border-b border-border/20 shrink-0">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="px-2 py-1.5 border-r border-border/10 last:border-r-0">
            <div className="h-1.5 w-14 bg-white/[0.04] animate-pulse mb-1" />
            <div className="h-2.5 w-10 bg-white/[0.06] animate-pulse" />
          </div>
        ))}
      </div>
      {/* Table skeleton */}
      <div className="flex-1 overflow-hidden">
        <table className="w-full text-[9px] font-mono">
          <tbody>
            <ShimmerRows cols={8} rows={12} />
          </tbody>
        </table>
      </div>
    </div>
  );
}

// -- Main Panel --

export function CommodityWarehousePanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = useCommodityWarehouse();
  const [tab, setTab] = useState<Tab>('lme');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'lme', label: 'LME' },
    { key: 'comex', label: 'COMEX' },
    { key: 'energy', label: 'ENERGY' },
    { key: 'agriculture', label: 'AGRICULTURE' },
    { key: 'trends', label: 'TRENDS' },
  ];

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-black gap-2">
        <div className="text-[9px] font-mono text-red-400/60 uppercase tracking-widest">
          {tr(t, 'warehouseFailed', 'FAILED TO LOAD WAREHOUSE DATA')}
        </div>
        <button
          onClick={() => refetch()}
          className="px-3 py-1 text-[8px] font-mono font-bold uppercase tracking-wider text-orange-400 border border-orange-400/30 hover:bg-orange-400/10 transition-colors"
        >
          {tr(t, 'retry', 'RETRY')}
        </button>
      </div>
    );
  }

  const lmeRows: any[] = data.lme ?? [];
  const comexRows: any[] = data.comex ?? [];
  const energyRows: any[] = data.energy ?? [];
  const agricultureRows: any[] = data.agriculture ?? [];
  const trendsRows: any[] = data.trends ?? [];

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center gap-0 border-b border-border/20 shrink-0">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className="px-3 py-2 text-[9px] font-mono font-bold uppercase tracking-wider transition-colors"
            style={{
              color: tab === tb.key ? ACCENT : 'rgba(255,255,255,0.35)',
              borderBottom: tab === tb.key ? `1px solid ${ACCENT}` : '1px solid transparent',
              background: tab === tb.key ? ACCENT_DIM : 'transparent',
            }}
          >
            {tb.label}
          </button>
        ))}
        <div className="flex-1" />
        <div className="px-3 text-[8px] font-mono text-neutral-600">
          {data.timestamp
            ? new Date(String(data.timestamp)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : ''}
        </div>
      </div>

      {/* Summary bar */}
      <SummaryBar data={data} t={t} />

      {/* Tab content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {tab === 'lme' ? <LMETable rows={lmeRows} t={t} /> : null}
        {tab === 'comex' ? <COMEXTable rows={comexRows} t={t} /> : null}
        {tab === 'energy' ? <EnergyTable rows={energyRows} t={t} /> : null}
        {tab === 'agriculture' ? <AgricultureTable rows={agricultureRows} t={t} /> : null}
        {tab === 'trends' ? <TrendsTable rows={trendsRows} t={t} /> : null}
      </div>
    </div>
  );
}

// -- Summary Bar --

function SummaryBar({ data, t }: { data: any; t: TFn }) {
  const summary = data.summary;

  if (!summary) return null;

  return (
    <div className="grid grid-cols-5 border-b border-border/20 bg-black/40 shrink-0">
      <SummaryCell
        label={tr(t, 'warehouseTotalStocks', 'TOTAL STOCKS')}
        value={fmtNumber(summary.totalStocks)}
      />
      <SummaryCell
        label={tr(t, 'warehouseNetChange', 'NET CHANGE')}
        value={fmtNumber(summary.netChange)}
        valueColor={changeColor(summary.netChange)}
      />
      <SummaryCell
        label={tr(t, 'warehouseBiggestBuild', 'BIGGEST BUILD')}
        value={summary.biggestBuild ? String(summary.biggestBuild.name) : '-'}
        sub={summary.biggestBuild ? fmtPct(summary.biggestBuild.changePct) : undefined}
        subColor="text-green-400"
      />
      <SummaryCell
        label={tr(t, 'warehouseBiggestDraw', 'BIGGEST DRAW')}
        value={summary.biggestDraw ? String(summary.biggestDraw.name) : '-'}
        sub={summary.biggestDraw ? fmtPct(summary.biggestDraw.changePct) : undefined}
        subColor="text-red-400"
      />
      <SummaryCell
        label={tr(t, 'warehouseAvgDaysSupply', 'AVG DAYS SUPPLY')}
        value={typeof summary.avgDaysSupply === 'number' ? summary.avgDaysSupply.toFixed(1) : '-'}
      />
    </div>
  );
}

function SummaryCell({
  label,
  value,
  valueColor,
  sub,
  subColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
  sub?: string;
  subColor?: string;
}) {
  return (
    <div className="px-2 py-1.5 border-r border-border/10 last:border-r-0">
      <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">{label}</div>
      <div className={`text-[10px] font-mono font-black ${valueColor ? valueColor : 'text-white/80'}`}>
        {value}
      </div>
      {sub ? (
        <div className={`text-[7px] font-mono font-bold ${subColor ? subColor : 'text-white/40'}`}>{sub}</div>
      ) : null}
    </div>
  );
}

// -- LME Table --

function LMETable({ rows, t }: { rows: any[]; t: TFn }) {
  return (
    <div>
      <div className="px-3 py-1.5 border-b border-border/20">
        <span className="text-[8px] font-mono font-black text-orange-400 uppercase tracking-wider">
          {tr(t, 'warehouseLME', 'LME Warehouse Stocks')}
        </span>
      </div>
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
          <tr>
            <th className="px-2 py-1.5 text-left font-bold">Metal</th>
            <th className="px-2 py-1.5 text-right font-bold">Stocks (t)</th>
            <th className="px-2 py-1.5 text-right font-bold">1D Chg</th>
            <th className="px-2 py-1.5 text-right font-bold">1W Chg %</th>
            <th className="px-2 py-1.5 text-right font-bold">1M Chg %</th>
            <th className="px-2 py-1.5 text-right font-bold">Cancelled %</th>
            <th className="px-2 py-1.5 text-right font-bold">Live Warrants</th>
            <th className="px-2 py-1.5 text-right font-bold">Spot Price</th>
            <th className="px-2 py-1.5 text-right font-bold">Cash-3M</th>
            <th className="px-2 py-1.5 text-center font-bold">Signal</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r: any, i: number) => {
            const bd = buildDrawLabel(r.change1d);
            return (
              <tr key={r.metal ?? i} className="border-b border-border/5 hover:bg-orange-400/[0.02] transition-colors">
                <td className="px-2 py-1.5 font-bold text-orange-400">{String(r.metal ?? '-')}</td>
                <td className="px-2 py-1.5 text-right text-white/80 font-bold">{fmtNumber(r.stocks)}</td>
                <td className={`px-2 py-1.5 text-right font-bold ${changeColor(r.change1d)}`}>
                  {typeof r.change1d === 'number' ? (r.change1d >= 0 ? '+' : '') + fmtNumber(r.change1d) : '-'}
                </td>
                <td className={`px-2 py-1.5 text-right font-bold ${changeColor(r.change1wPct)}`}>
                  {fmtPct(r.change1wPct)}
                </td>
                <td className={`px-2 py-1.5 text-right font-bold ${changeColor(r.change1mPct)}`}>
                  {fmtPct(r.change1mPct)}
                </td>
                <td className="px-2 py-1.5 text-right text-white/60">
                  {typeof r.cancelledPct === 'number' ? r.cancelledPct.toFixed(1) + '%' : '-'}
                </td>
                <td className="px-2 py-1.5 text-right text-white/60">{fmtNumber(r.liveWarrants)}</td>
                <td className="px-2 py-1.5 text-right text-white/80">{fmtPrice(r.spotPrice)}</td>
                <td className={`px-2 py-1.5 text-right font-bold ${changeColor(r.cash3m)}`}>
                  {fmtPrice(r.cash3m)}
                </td>
                <td className="px-2 py-1.5 text-center">
                  <span
                    className={`text-[7px] font-mono font-black px-1.5 py-0.5 uppercase ${
                      bd.color === 'text-green-400'
                        ? 'bg-green-500/10 text-green-400'
                        : bd.color === 'text-red-400'
                          ? 'bg-red-500/10 text-red-400'
                          : 'bg-zinc-500/10 text-zinc-500'
                    }`}
                  >
                    {bd.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// -- COMEX Table --

function COMEXTable({ rows, t }: { rows: any[]; t: TFn }) {
  return (
    <div>
      <div className="px-3 py-1.5 border-b border-border/20">
        <span className="text-[8px] font-mono font-black text-orange-400 uppercase tracking-wider">
          {tr(t, 'warehouseCOMEX', 'COMEX Warehouse Stocks')}
        </span>
      </div>
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
          <tr>
            <th className="px-2 py-1.5 text-left font-bold">Metal</th>
            <th className="px-2 py-1.5 text-right font-bold">Registered</th>
            <th className="px-2 py-1.5 text-right font-bold">Eligible</th>
            <th className="px-2 py-1.5 text-right font-bold">Total</th>
            <th className="px-2 py-1.5 text-right font-bold">1D Chg</th>
            <th className="px-2 py-1.5 text-right font-bold">1W Chg %</th>
            <th className="px-2 py-1.5 text-right font-bold">Open Interest</th>
            <th className="px-2 py-1.5 text-right font-bold">Cover Ratio</th>
            <th className="px-2 py-1.5 text-right font-bold">Spot Price</th>
            <th className="px-2 py-1.5 text-center font-bold">Signal</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r: any, i: number) => {
            const bd = buildDrawLabel(r.change1d);
            return (
              <tr key={r.metal ?? i} className="border-b border-border/5 hover:bg-orange-400/[0.02] transition-colors">
                <td className="px-2 py-1.5 font-bold text-orange-400">{String(r.metal ?? '-')}</td>
                <td className="px-2 py-1.5 text-right text-white/80 font-bold">{fmtNumber(r.registered)}</td>
                <td className="px-2 py-1.5 text-right text-white/60">{fmtNumber(r.eligible)}</td>
                <td className="px-2 py-1.5 text-right text-white/80 font-bold">{fmtNumber(r.total)}</td>
                <td className={`px-2 py-1.5 text-right font-bold ${changeColor(r.change1d)}`}>
                  {typeof r.change1d === 'number' ? (r.change1d >= 0 ? '+' : '') + fmtNumber(r.change1d) : '-'}
                </td>
                <td className={`px-2 py-1.5 text-right font-bold ${changeColor(r.change1wPct)}`}>
                  {fmtPct(r.change1wPct)}
                </td>
                <td className="px-2 py-1.5 text-right text-white/60">{fmtNumber(r.openInterest)}</td>
                <td className="px-2 py-1.5 text-right text-white/60">
                  {typeof r.coverRatio === 'number' ? r.coverRatio.toFixed(2) + 'x' : '-'}
                </td>
                <td className="px-2 py-1.5 text-right text-white/80">{fmtPrice(r.spotPrice)}</td>
                <td className="px-2 py-1.5 text-center">
                  <span
                    className={`text-[7px] font-mono font-black px-1.5 py-0.5 uppercase ${
                      bd.color === 'text-green-400'
                        ? 'bg-green-500/10 text-green-400'
                        : bd.color === 'text-red-400'
                          ? 'bg-red-500/10 text-red-400'
                          : 'bg-zinc-500/10 text-zinc-500'
                    }`}
                  >
                    {bd.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// -- Energy Table --

function EnergyTable({ rows, t }: { rows: any[]; t: TFn }) {
  return (
    <div>
      <div className="px-3 py-1.5 border-b border-border/20">
        <span className="text-[8px] font-mono font-black text-orange-400 uppercase tracking-wider">
          {tr(t, 'warehouseEnergy', 'Energy Inventory')}
        </span>
      </div>
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
          <tr>
            <th className="px-2 py-1.5 text-left font-bold">Commodity</th>
            <th className="px-2 py-1.5 text-left font-bold">Region</th>
            <th className="px-2 py-1.5 text-right font-bold">Stocks</th>
            <th className="px-2 py-1.5 text-right font-bold">1W Chg</th>
            <th className="px-2 py-1.5 text-right font-bold">vs 5Y Avg</th>
            <th className="px-2 py-1.5 text-right font-bold">Days Supply</th>
            <th className="px-2 py-1.5 text-right font-bold">Utilization</th>
            <th className="px-2 py-1.5 text-right font-bold">Spot Price</th>
            <th className="px-2 py-1.5 text-center font-bold">Signal</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r: any, i: number) => {
            const bd = buildDrawLabel(r.change1w);
            return (
              <tr key={`${String(r.commodity ?? '')}-${String(r.region ?? '')}-${i}`} className="border-b border-border/5 hover:bg-orange-400/[0.02] transition-colors">
                <td className="px-2 py-1.5 font-bold text-orange-400">{String(r.commodity ?? '-')}</td>
                <td className="px-2 py-1.5 text-white/40">{String(r.region ?? '-')}</td>
                <td className="px-2 py-1.5 text-right text-white/80 font-bold">{fmtNumber(r.stocks)}</td>
                <td className={`px-2 py-1.5 text-right font-bold ${changeColor(r.change1w)}`}>
                  {typeof r.change1w === 'number' ? (r.change1w >= 0 ? '+' : '') + fmtNumber(r.change1w) : '-'}
                </td>
                <td className="px-2 py-1.5 text-right">
                  {typeof r.vs5yAvgPct === 'number' ? (
                    <span
                      className={`text-[7px] font-bold px-1.5 py-0.5 ${
                        r.vs5yAvgPct < 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      {fmtPct(r.vs5yAvgPct)} {r.vs5yAvgPct < 0 ? 'TIGHT' : 'AMPLE'}
                    </span>
                  ) : (
                    <span className="text-zinc-500">-</span>
                  )}
                </td>
                <td className="px-2 py-1.5 text-right text-white/60">
                  {typeof r.daysSupply === 'number' ? r.daysSupply.toFixed(1) : '-'}
                </td>
                <td className="px-2 py-1.5 text-right">
                  {typeof r.utilizationPct === 'number' ? (
                    <UtilizationBar pct={r.utilizationPct} />
                  ) : (
                    <span className="text-zinc-500">-</span>
                  )}
                </td>
                <td className="px-2 py-1.5 text-right text-white/80">{fmtPrice(r.spotPrice)}</td>
                <td className="px-2 py-1.5 text-center">
                  <span
                    className={`text-[7px] font-mono font-black px-1.5 py-0.5 uppercase ${
                      bd.color === 'text-green-400'
                        ? 'bg-green-500/10 text-green-400'
                        : bd.color === 'text-red-400'
                          ? 'bg-red-500/10 text-red-400'
                          : 'bg-zinc-500/10 text-zinc-500'
                    }`}
                  >
                    {bd.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// -- Agriculture Table --

function AgricultureTable({ rows, t }: { rows: any[]; t: TFn }) {
  return (
    <div>
      <div className="px-3 py-1.5 border-b border-border/20">
        <span className="text-[8px] font-mono font-black text-orange-400 uppercase tracking-wider">
          {tr(t, 'warehouseAgriculture', 'Agriculture Warehouse Stocks')}
        </span>
      </div>
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
          <tr>
            <th className="px-2 py-1.5 text-left font-bold">Commodity</th>
            <th className="px-2 py-1.5 text-left font-bold">Exchange</th>
            <th className="px-2 py-1.5 text-right font-bold">Certified</th>
            <th className="px-2 py-1.5 text-right font-bold">1D Chg</th>
            <th className="px-2 py-1.5 text-right font-bold">1W Chg %</th>
            <th className="px-2 py-1.5 text-right font-bold">1M Chg %</th>
            <th className="px-2 py-1.5 text-right font-bold">Stocks/Use %</th>
            <th className="px-2 py-1.5 text-right font-bold">Spot Price</th>
            <th className="px-2 py-1.5 text-center font-bold">Signal</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r: any, i: number) => {
            const bd = buildDrawLabel(r.change1d);
            return (
              <tr key={`${String(r.commodity ?? '')}-${i}`} className="border-b border-border/5 hover:bg-orange-400/[0.02] transition-colors">
                <td className="px-2 py-1.5 font-bold text-orange-400">{String(r.commodity ?? '-')}</td>
                <td className="px-2 py-1.5 text-white/40">{String(r.exchange ?? '-')}</td>
                <td className="px-2 py-1.5 text-right text-white/80 font-bold">{fmtNumber(r.certified)}</td>
                <td className={`px-2 py-1.5 text-right font-bold ${changeColor(r.change1d)}`}>
                  {typeof r.change1d === 'number' ? (r.change1d >= 0 ? '+' : '') + fmtNumber(r.change1d) : '-'}
                </td>
                <td className={`px-2 py-1.5 text-right font-bold ${changeColor(r.change1wPct)}`}>
                  {fmtPct(r.change1wPct)}
                </td>
                <td className={`px-2 py-1.5 text-right font-bold ${changeColor(r.change1mPct)}`}>
                  {fmtPct(r.change1mPct)}
                </td>
                <td className="px-2 py-1.5 text-right text-white/60">
                  {typeof r.stocksUsePct === 'number' ? r.stocksUsePct.toFixed(1) + '%' : '-'}
                </td>
                <td className="px-2 py-1.5 text-right text-white/80">{fmtPrice(r.spotPrice)}</td>
                <td className="px-2 py-1.5 text-center">
                  <span
                    className={`text-[7px] font-mono font-black px-1.5 py-0.5 uppercase ${
                      bd.color === 'text-green-400'
                        ? 'bg-green-500/10 text-green-400'
                        : bd.color === 'text-red-400'
                          ? 'bg-red-500/10 text-red-400'
                          : 'bg-zinc-500/10 text-zinc-500'
                    }`}
                  >
                    {bd.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// -- Trends Table --

function TrendsTable({ rows, t }: { rows: any[]; t: TFn }) {
  return (
    <div>
      <div className="px-3 py-1.5 border-b border-border/20">
        <span className="text-[8px] font-mono font-black text-orange-400 uppercase tracking-wider">
          {tr(t, 'warehouseTrends', 'Inventory Trends & Alerts')}
        </span>
      </div>
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
          <tr>
            <th className="px-2 py-1.5 text-left font-bold">Commodity</th>
            <th className="px-2 py-1.5 text-left font-bold">Exchange</th>
            <th className="px-2 py-1.5 text-center font-bold">Trend</th>
            <th className="px-2 py-1.5 text-right font-bold">30D Chg %</th>
            <th className="px-2 py-1.5 text-right font-bold">90D Chg %</th>
            <th className="px-2 py-1.5 text-right font-bold">YTD Chg %</th>
            <th className="px-2 py-1.5 text-right font-bold">vs 5Y Avg</th>
            <th className="px-2 py-1.5 text-right font-bold">Z-Score</th>
            <th className="px-2 py-1.5 text-center font-bold">Alert</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r: any, i: number) => (
            <tr key={`${String(r.commodity ?? '')}-${i}`} className="border-b border-border/5 hover:bg-orange-400/[0.02] transition-colors">
              <td className="px-2 py-1.5 font-bold text-orange-400">{String(r.commodity ?? '-')}</td>
              <td className="px-2 py-1.5 text-white/40">{String(r.exchange ?? '-')}</td>
              <td className="px-2 py-1.5 text-center">
                {r.trend ? (
                  <span
                    className={`text-[7px] font-mono font-black px-1.5 py-0.5 uppercase ${
                      String(r.trend).toLowerCase() === 'building'
                        ? 'bg-green-500/10 text-green-400'
                        : String(r.trend).toLowerCase() === 'drawing'
                          ? 'bg-red-500/10 text-red-400'
                          : 'bg-zinc-500/10 text-zinc-500'
                    }`}
                  >
                    {String(r.trend)}
                  </span>
                ) : (
                  <span className="text-zinc-500">-</span>
                )}
              </td>
              <td className={`px-2 py-1.5 text-right font-bold ${changeColor(r.change30dPct)}`}>
                {fmtPct(r.change30dPct)}
              </td>
              <td className={`px-2 py-1.5 text-right font-bold ${changeColor(r.change90dPct)}`}>
                {fmtPct(r.change90dPct)}
              </td>
              <td className={`px-2 py-1.5 text-right font-bold ${changeColor(r.changeYtdPct)}`}>
                {fmtPct(r.changeYtdPct)}
              </td>
              <td className="px-2 py-1.5 text-right">
                {typeof r.vs5yAvgPct === 'number' ? (
                  <span
                    className={`text-[7px] font-bold px-1.5 py-0.5 ${
                      r.vs5yAvgPct < 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                    }`}
                  >
                    {fmtPct(r.vs5yAvgPct)}
                  </span>
                ) : (
                  <span className="text-zinc-500">-</span>
                )}
              </td>
              <td className="px-2 py-1.5 text-right">
                {typeof r.zScore === 'number' ? (
                  <span
                    className={`font-bold ${
                      Math.abs(r.zScore) >= 2
                        ? 'text-red-400'
                        : Math.abs(r.zScore) >= 1
                          ? 'text-yellow-400'
                          : 'text-zinc-400'
                    }`}
                  >
                    {r.zScore >= 0 ? '+' : ''}{r.zScore.toFixed(2)}
                  </span>
                ) : (
                  <span className="text-zinc-500">-</span>
                )}
              </td>
              <td className="px-2 py-1.5 text-center">
                {r.alert ? (
                  <span
                    className={`text-[7px] font-mono font-black px-1.5 py-0.5 uppercase ${
                      String(r.alert).toLowerCase().includes('critical')
                        ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                        : String(r.alert).toLowerCase().includes('warning')
                          ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
                          : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                    }`}
                  >
                    {String(r.alert)}
                  </span>
                ) : (
                  <span className="text-zinc-600">--</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// -- Utilization Bar (inline in table cell) --

function UtilizationBar({ pct }: { pct: number }) {
  const color =
    pct >= 90 ? '#ef4444' :
    pct >= 75 ? '#eab308' :
    '#22c55e';

  const textColor =
    pct >= 90 ? 'text-red-400' :
    pct >= 75 ? 'text-yellow-400' :
    'text-green-400';

  return (
    <div className="flex items-center gap-1.5 justify-end">
      <div className="w-12 h-1.5 bg-white/5 relative">
        <div
          className="absolute top-0 left-0 h-full"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color, opacity: 0.7 }}
        />
      </div>
      <span className={`text-[8px] font-mono font-bold ${textColor}`}>
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}
