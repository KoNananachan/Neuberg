import { useState, useMemo } from 'react';
import {
  useInstitutionalOwnership,
  type StockOwnership,
  type FlowEntry,
} from '../../api/hooks/use-institutional-ownership';
import { RefreshCw } from 'lucide-react';
import { useT } from '../../i18n';

type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// ── Views ──

type ViewTab = 'HOLDERS' | 'FLOWS' | 'OVERVIEW';

// ── Formatting ──

function fmtNumber(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e12) return (n / 1e12).toFixed(1) + 'T';
  if (abs >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (abs >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(0);
}

function fmtShares(n: number): string {
  const abs = Math.abs(n);
  const prefix = n > 0 ? '+' : '';
  if (abs >= 1e6) return prefix + (n / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return prefix + (n / 1e3).toFixed(1) + 'K';
  return prefix + n.toFixed(0);
}

function fmtValue(n: number): string {
  const abs = Math.abs(n);
  const prefix = n > 0 ? '+$' : n < 0 ? '-$' : '$';
  const val = abs;
  if (val >= 1e12) return prefix + (val / 1e12).toFixed(1) + 'T';
  if (val >= 1e9) return prefix + (val / 1e9).toFixed(2) + 'B';
  if (val >= 1e6) return prefix + (val / 1e6).toFixed(1) + 'M';
  if (val >= 1e3) return prefix + (val / 1e3).toFixed(0) + 'K';
  return prefix + val.toFixed(0);
}

function fmtPct(n: number): string {
  return n.toFixed(2) + '%';
}

function changeColor(n: number): string {
  if (n > 0) return 'text-emerald-400';
  if (n < 0) return 'text-red-400';
  return 'text-white/40';
}

// ── Holdings View ──

function HoldersView({ stock }: { stock: StockOwnership }) {
  return (
    <div className="flex-1 overflow-auto">
      {/* Stock summary bar */}
      <div className="flex items-center gap-3 px-3 py-1.5 border-b border-fuchsia-500/10 bg-fuchsia-500/[0.02] text-[8px] font-mono">
        <span className="text-white/40">Inst:</span>
        <span className="text-fuchsia-400 font-bold">{fmtPct(stock.institutionalOwnership)}</span>
        <span className="text-white/40">Insider:</span>
        <span className="text-white/60">{fmtPct(stock.insiderOwnership)}</span>
        <span className="text-white/40">Institutions:</span>
        <span className="text-white/60">{stock.totalInstitutions.toLocaleString()}</span>
        <span className="text-white/40">Top10:</span>
        <span className="text-fuchsia-400/80">{fmtPct(stock.concentration.top10pct)}</span>
      </div>

      {/* Activity summary */}
      <div className="flex items-center gap-3 px-3 py-1 border-b border-white/[0.04] text-[7px] font-mono">
        <span className="text-emerald-400/80">New: {stock.newPositions}</span>
        <span className="text-red-400/80">Closed: {stock.closedPositions}</span>
        <span className="text-emerald-400/60">Increased: {stock.increasedPositions}</span>
        <span className="text-red-400/60">Decreased: {stock.decreasedPositions}</span>
      </div>

      {/* Table header */}
      <div className="flex items-center px-3 py-1 border-b border-white/[0.06] text-[7px] font-mono text-white/30 uppercase tracking-wider">
        <span className="flex-1 min-w-0">Institution</span>
        <span className="w-[70px] text-right shrink-0">Shares</span>
        <span className="w-[70px] text-right shrink-0">Value</span>
        <span className="w-[50px] text-right shrink-0">% Float</span>
        <span className="w-[70px] text-right shrink-0">Chg Shares</span>
        <span className="w-[50px] text-right shrink-0">Chg %</span>
        <span className="w-[50px] text-right shrink-0">Quarter</span>
      </div>

      {/* Rows */}
      {stock.topHolders.map((holder, i) => (
        <div
          key={holder.institution + '-' + i}
          className="flex items-center px-3 py-1 border-b border-white/[0.03] text-[8px] font-mono hover:bg-fuchsia-400/[0.02] transition-colors"
        >
          <span className="flex-1 min-w-0 text-white/80 truncate pr-2">
            <span className="text-fuchsia-400/60 mr-1">{i + 1}.</span>
            {holder.institution}
          </span>
          <span className="w-[70px] text-right text-white/60 tabular-nums shrink-0">
            {fmtNumber(holder.shares)}
          </span>
          <span className="w-[70px] text-right text-white/60 tabular-nums shrink-0">
            ${fmtNumber(holder.value)}
          </span>
          <span className="w-[50px] text-right text-fuchsia-400 font-bold tabular-nums shrink-0">
            {fmtPct(holder.pctOfFloat)}
          </span>
          <span className={`w-[70px] text-right tabular-nums shrink-0 ${changeColor(holder.changeShares)}`}>
            {fmtShares(holder.changeShares)}
          </span>
          <span className={`w-[50px] text-right tabular-nums shrink-0 ${changeColor(holder.changePercent)}`}>
            {holder.changePercent > 0 ? '+' : ''}{holder.changePercent.toFixed(1)}%
          </span>
          <span className="w-[50px] text-right text-white/30 shrink-0">
            {holder.quarter}
          </span>
        </div>
      ))}

      {/* Concentration footer */}
      <div className="flex items-center gap-4 px-3 py-1.5 border-t border-white/[0.06] text-[7px] font-mono text-white/30 bg-black/50">
        <span>Top 10: <span className="text-fuchsia-400/70">{fmtPct(stock.concentration.top10pct)}</span></span>
        <span>Top 25: <span className="text-fuchsia-400/70">{fmtPct(stock.concentration.top25pct)}</span></span>
        <span>HHI: <span className="text-white/50">{stock.concentration.herfindahl.toFixed(1)}</span></span>
      </div>
    </div>
  );
}

// ── Flows View ──

function FlowsView({ mostBought, mostSold }: { mostBought: FlowEntry[]; mostSold: FlowEntry[] }) {
  const maxBuyVal = mostBought.length > 0 ? Math.max(...mostBought.map(e => Math.abs(e.changeValue))) : 1;
  const maxSellVal = mostSold.length > 0 ? Math.max(...mostSold.map(e => Math.abs(e.changeValue))) : 1;

  return (
    <div className="flex-1 overflow-auto">
      <div className="flex gap-0 h-full">
        {/* Most Bought */}
        <div className="flex-1 border-r border-white/[0.06]">
          <div className="px-3 py-1.5 border-b border-white/[0.06] bg-emerald-500/[0.03]">
            <span className="text-[8px] font-mono font-black uppercase tracking-wider text-emerald-400">
              Most Bought
            </span>
          </div>
          <div className="flex items-center px-3 py-0.5 border-b border-white/[0.04] text-[6px] font-mono text-white/25 uppercase">
            <span className="flex-1">Institution</span>
            <span className="w-10 text-right">Ticker</span>
            <span className="w-16 text-right">Value</span>
          </div>
          {mostBought.map((entry, i) => {
            const barPct = Math.abs(entry.changeValue) / maxBuyVal * 100;
            return (
              <div
                key={entry.institution + '-' + entry.ticker + '-' + i}
                className="relative flex items-center px-3 py-1 border-b border-white/[0.02] hover:bg-fuchsia-400/[0.02] transition-colors"
              >
                <div
                  className="absolute left-0 top-0 bottom-0 bg-emerald-500/[0.06]"
                  style={{ width: `${barPct}%` }}
                />
                <span className="relative flex-1 text-[8px] font-mono text-white/70 truncate pr-2">
                  {entry.institution}
                </span>
                <span className="relative w-10 text-right text-[8px] font-mono text-fuchsia-400 font-bold">
                  {entry.ticker}
                </span>
                <span className="relative w-16 text-right text-[8px] font-mono text-emerald-400 tabular-nums font-bold">
                  {fmtValue(entry.changeValue)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Most Sold */}
        <div className="flex-1">
          <div className="px-3 py-1.5 border-b border-white/[0.06] bg-red-500/[0.03]">
            <span className="text-[8px] font-mono font-black uppercase tracking-wider text-red-400">
              Most Sold
            </span>
          </div>
          <div className="flex items-center px-3 py-0.5 border-b border-white/[0.04] text-[6px] font-mono text-white/25 uppercase">
            <span className="flex-1">Institution</span>
            <span className="w-10 text-right">Ticker</span>
            <span className="w-16 text-right">Value</span>
          </div>
          {mostSold.map((entry, i) => {
            const barPct = Math.abs(entry.changeValue) / maxSellVal * 100;
            return (
              <div
                key={entry.institution + '-' + entry.ticker + '-' + i}
                className="relative flex items-center px-3 py-1 border-b border-white/[0.02] hover:bg-fuchsia-400/[0.02] transition-colors"
              >
                <div
                  className="absolute right-0 top-0 bottom-0 bg-red-500/[0.06]"
                  style={{ width: `${barPct}%` }}
                />
                <span className="relative flex-1 text-[8px] font-mono text-white/70 truncate pr-2">
                  {entry.institution}
                </span>
                <span className="relative w-10 text-right text-[8px] font-mono text-fuchsia-400 font-bold">
                  {entry.ticker}
                </span>
                <span className="relative w-16 text-right text-[8px] font-mono text-red-400 tabular-nums font-bold">
                  {fmtValue(entry.changeValue)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Overview View ──

function OverviewView({
  stocks,
  onSelectStock,
}: {
  stocks: StockOwnership[];
  onSelectStock: (ticker: string) => void;
}) {
  return (
    <div className="flex-1 overflow-auto">
      {/* Table header */}
      <div className="flex items-center px-3 py-1 border-b border-white/[0.06] text-[7px] font-mono text-white/30 uppercase tracking-wider sticky top-0 bg-black/95 z-10">
        <span className="w-12 shrink-0">Ticker</span>
        <span className="flex-1 min-w-0">Name</span>
        <span className="w-14 text-right shrink-0">Inst %</span>
        <span className="w-14 text-right shrink-0">Insider %</span>
        <span className="w-14 text-right shrink-0">Inst #</span>
        <span className="w-16 text-right shrink-0">Top 10 %</span>
        <span className="w-14 text-right shrink-0">HHI</span>
        <span className="w-[72px] text-right shrink-0">Net Activity</span>
      </div>

      {stocks.map((stock, i) => {
        const netActivity = stock.increasedPositions + stock.newPositions
          - stock.decreasedPositions - stock.closedPositions;
        const instPctColor = stock.institutionalOwnership >= 75
          ? 'text-fuchsia-400'
          : stock.institutionalOwnership >= 65
            ? 'text-fuchsia-400/70'
            : 'text-white/60';

        return (
          <div
            key={stock.ticker + '-' + i}
            onClick={() => onSelectStock(stock.ticker)}
            className="flex items-center px-3 py-1 border-b border-white/[0.03] hover:bg-fuchsia-400/[0.02] transition-colors cursor-pointer text-[8px] font-mono"
          >
            <span className="w-12 font-black text-fuchsia-400 shrink-0">{stock.ticker}</span>
            <span className="flex-1 min-w-0 text-white/50 truncate pr-2">{stock.name}</span>
            <span className={`w-14 text-right font-bold tabular-nums shrink-0 ${instPctColor}`}>
              {fmtPct(stock.institutionalOwnership)}
            </span>
            <span className="w-14 text-right text-white/50 tabular-nums shrink-0">
              {fmtPct(stock.insiderOwnership)}
            </span>
            <span className="w-14 text-right text-white/50 tabular-nums shrink-0">
              {stock.totalInstitutions.toLocaleString()}
            </span>
            <span className="w-16 text-right text-fuchsia-400/60 tabular-nums shrink-0">
              {fmtPct(stock.concentration.top10pct)}
            </span>
            <span className="w-14 text-right text-white/40 tabular-nums shrink-0">
              {stock.concentration.herfindahl.toFixed(1)}
            </span>
            <span className="w-[72px] text-right shrink-0">
              <span
                className={`inline-block px-1.5 py-0.5 text-[7px] font-bold ${
                  netActivity > 0
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : netActivity < 0
                      ? 'text-red-400 bg-red-500/10'
                      : 'text-white/40 bg-white/[0.03]'
                }`}
              >
                {netActivity > 0 ? '+' : ''}{netActivity}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Panel ──

export function InstitutionalOwnershipPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useInstitutionalOwnership();
  const [view, setView] = useState<ViewTab>('HOLDERS');
  const [selectedTicker, setSelectedTicker] = useState<string>('AAPL');

  const selectedStock = useMemo(() => {
    if (!data) return null;
    return data.stocks.find(s => s.ticker === selectedTicker) || data.stocks[0] || null;
  }, [data, selectedTicker]);

  const viewTabs: { key: ViewTab; label: string }[] = [
    { key: 'HOLDERS', label: tr(t, 'ioHolders', 'HOLDERS') },
    { key: 'FLOWS', label: tr(t, 'ioFlows', 'FLOWS') },
    { key: 'OVERVIEW', label: tr(t, 'ioOverview', 'OVERVIEW') },
  ];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-fuchsia-500/15 shrink-0">
        <div className="flex items-center gap-2">
          {/* 13F icon */}
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5">
            <rect x="2" y="1" width="12" height="14" rx="1" fill="none" stroke="#e879f9" strokeWidth="1.2" />
            <line x1="5" y1="5" x2="11" y2="5" stroke="#e879f9" strokeWidth="0.8" opacity="0.6" />
            <line x1="5" y1="7.5" x2="11" y2="7.5" stroke="#e879f9" strokeWidth="0.8" opacity="0.4" />
            <line x1="5" y1="10" x2="9" y2="10" stroke="#e879f9" strokeWidth="0.8" opacity="0.3" />
          </svg>
          <span className="text-[9px] font-black uppercase tracking-tighter text-fuchsia-400">
            {tr(t, 'ioTitle', '13F Institutional')}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* View tabs */}
          {viewTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setView(tab.key)}
              className={`px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider transition-colors ${
                view === tab.key
                  ? 'text-fuchsia-400 bg-fuchsia-500/15'
                  : 'text-white/30 hover:text-white/50 hover:bg-white/[0.03]'
              }`}
            >
              {tab.label}
            </button>
          ))}

          {data && (
            <span className="text-[7px] text-white/20 ml-1">
              {new Date(data.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button onClick={() => refetch()} className="p-0.5 text-white/30 hover:text-fuchsia-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stock selector (for HOLDERS view) */}
      {view === 'HOLDERS' && data && (
        <div className="flex items-center gap-2 px-3 py-1 border-b border-white/[0.06] bg-white/[0.01] shrink-0">
          <span className="text-[7px] text-white/30 uppercase">Stock:</span>
          <select
            value={selectedTicker}
            onChange={(e) => setSelectedTicker(e.target.value)}
            className="bg-black border border-fuchsia-500/20 text-fuchsia-400 text-[9px] font-mono font-bold px-1.5 py-0.5 focus:outline-none focus:border-fuchsia-500/40 appearance-none cursor-pointer"
          >
            {data.stocks.map(s => (
              <option key={s.ticker} value={s.ticker}>
                {s.ticker} - {s.name}
              </option>
            ))}
          </select>
          {selectedStock && (
            <div className="flex items-center gap-2 ml-auto text-[8px]">
              <span className="text-white/40">Institutional:</span>
              <span className="text-fuchsia-400 font-bold">{fmtPct(selectedStock.institutionalOwnership)}</span>
              <span className="text-white/20">|</span>
              <span className="text-white/40">Insider:</span>
              <span className="text-white/60">{fmtPct(selectedStock.insiderOwnership)}</span>
            </div>
          )}
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {isLoading && !data ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-fuchsia-400/30 border-t-fuchsia-400 rounded-full animate-spin" />
              <span className="text-[10px] text-white/40 uppercase tracking-widest">
                {tr(t, 'loading', 'Loading...')}
              </span>
            </div>
          </div>
        ) : data ? (
          <>
            {view === 'HOLDERS' && selectedStock && (
              <HoldersView stock={selectedStock} />
            )}
            {view === 'FLOWS' && (
              <FlowsView mostBought={data.mostBought} mostSold={data.mostSold} />
            )}
            {view === 'OVERVIEW' && (
              <OverviewView
                stocks={data.stocks}
                onSelectStock={(ticker) => {
                  setSelectedTicker(ticker);
                  setView('HOLDERS');
                }}
              />
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-[10px] text-white/40 uppercase">
            {tr(t, 'ioNoData', 'No data available')}
          </div>
        )}
      </div>

      {/* Status bar */}
      {data && (
        <div className="flex items-center gap-3 px-3 py-0.5 border-t border-white/[0.04] text-[7px] font-mono text-white/25 bg-black/95 shrink-0">
          <span>{data.stocks.length} stocks</span>
          <span>|</span>
          <span>
            Avg Inst: {fmtPct(
              data.stocks.reduce((s, st) => s + st.institutionalOwnership, 0) / data.stocks.length
            )}
          </span>
          <span>|</span>
          <span>
            Buys: <span className="text-emerald-400/60">{data.mostBought.length}</span>
            {' / '}
            Sells: <span className="text-red-400/60">{data.mostSold.length}</span>
          </span>
          <span className="ml-auto text-white/15">13F Data</span>
        </div>
      )}
    </div>
  );
}
