import { useState, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { useValuationMultiples } from '../../api/hooks/use-valuation-multiples';
import { useT, tr, TFn } from '../../i18n';

type View = 'COMPS' | 'SECTORS' | 'HISTORY';
type SortKey = 'ticker' | 'peTrailing' | 'peForward' | 'evEbitda' | 'pSales' | 'pBook' | 'pegRatio' | 'pe5YPctile' | 'vsSector';

export function ValuationMultiplesPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useValuationMultiples();
  const [view, setView] = useState<View>('COMPS');
  const [sectorFilter, setSectorFilter] = useState('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('ticker');
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedTicker, setSelectedTicker] = useState('AAPL');

  const sectors = useMemo(() => {
    if (!data?.stocks) return ['ALL'];
    return ['ALL', ...new Set(data.stocks.map((s: Record<string, string>) => s.sector))];
  }, [data]);

  const filtered = useMemo(() => {
    if (!data?.stocks) return [];
    let items = data.stocks;
    if (sectorFilter !== 'ALL') items = items.filter((s: Record<string, string>) => s.sector === sectorFilter);
    return [...items].sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
      let va: number, vb: number;
      if (sortKey === 'ticker') { return sortAsc ? (a.ticker as string).localeCompare(b.ticker as string) : (b.ticker as string).localeCompare(a.ticker as string); }
      if (sortKey === 'vsSector') { va = (a.premium as Record<string, number>).vsSector; vb = (b.premium as Record<string, number>).vsSector; }
      else if (sortKey === 'pe5YPctile') { va = (a.percentiles as Record<string, number>).pe5YPctile; vb = (b.percentiles as Record<string, number>).pe5YPctile; }
      else { va = (a.multiples as Record<string, number>)[sortKey]; vb = (b.multiples as Record<string, number>)[sortKey]; }
      return sortAsc ? va - vb : vb - va;
    });
  }, [data, sectorFilter, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const pctileColor = (v: number) => v < 20 ? 'text-green-400' : v > 80 ? 'text-red-400' : 'text-white';
  const premColor = (v: number) => v > 10 ? 'text-red-400' : v < -10 ? 'text-green-400' : 'text-neutral-400';

  const VIEWS: View[] = ['COMPS', 'SECTORS', 'HISTORY'];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-teal-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-teal-400">
            {tr(t, 'panelValuationMultiples', 'Valuation Multiples')}
          </span>
          {data?.stocks && (
            <span className="text-[7px] font-mono text-neutral-500">{filtered.length} stocks</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {VIEWS.map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider transition-colors ${view === v ? 'text-teal-400 bg-teal-400/10' : 'text-neutral-600 hover:text-neutral-400'}`}
            >{v}</button>
          ))}
          <button onClick={() => refetch()} className="p-1 text-neutral-500 hover:text-teal-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Sector filter */}
      {view !== 'HISTORY' && (
        <div className="flex items-center gap-1 px-3 py-1 border-b border-border/20 shrink-0 overflow-x-auto no-scrollbar">
          {sectors.map(s => (
            <button key={s as string} onClick={() => setSectorFilter(s as string)}
              className={`px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase whitespace-nowrap transition-colors ${sectorFilter === s ? 'text-teal-400 bg-teal-400/10' : 'text-neutral-600 hover:text-neutral-400'}`}
            >{s as string}</button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-teal-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {view === 'COMPS' && data && <CompsView stocks={filtered} onSort={handleSort} sortKey={sortKey} sortAsc={sortAsc} pctileColor={pctileColor} premColor={premColor} onSelect={setSelectedTicker} />}
        {view === 'SECTORS' && data && <SectorsView sectors={data.sectors} />}
        {view === 'HISTORY' && data && <HistoryView stocks={data.stocks} selected={selectedTicker} onSelect={setSelectedTicker} />}
      </div>
    </div>
  );
}

// ── Comps View ──
function CompsView({ stocks, onSort, sortKey, sortAsc, pctileColor, premColor, onSelect }: {
  stocks: Record<string, unknown>[];
  onSort: (k: SortKey) => void;
  sortKey: SortKey;
  sortAsc: boolean;
  pctileColor: (v: number) => string;
  premColor: (v: number) => string;
  onSelect: (t: string) => void;
}) {
  const cols: { key: SortKey; label: string; w: string }[] = [
    { key: 'ticker', label: 'TICKER', w: 'w-[52px]' },
    { key: 'peTrailing', label: 'P/E', w: 'w-[40px]' },
    { key: 'peForward', label: 'FWD P/E', w: 'w-[44px]' },
    { key: 'evEbitda', label: 'EV/EBITDA', w: 'w-[52px]' },
    { key: 'pSales', label: 'P/S', w: 'w-[36px]' },
    { key: 'pBook', label: 'P/B', w: 'w-[36px]' },
    { key: 'pegRatio', label: 'PEG', w: 'w-[36px]' },
    { key: 'pe5YPctile', label: '5Y %ILE', w: 'w-[44px]' },
    { key: 'vsSector', label: 'VS SECT', w: 'w-[48px]' },
  ];

  return (
    <div>
      <div className="flex items-center px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        {cols.map(c => (
          <button key={c.key} onClick={() => onSort(c.key)}
            className={`${c.w} text-[7px] font-mono uppercase text-right pr-1.5 ${sortKey === c.key ? 'text-teal-400' : 'text-neutral-600'} hover:text-teal-300`}
          >{c.label}{sortKey === c.key ? (sortAsc ? ' ↑' : ' ↓') : ''}</button>
        ))}
      </div>
      {stocks.map((s: Record<string, unknown>) => {
        const m = s.multiples as Record<string, number>;
        const p = s.percentiles as Record<string, number>;
        const pr = s.premium as Record<string, number>;
        return (
          <div key={s.ticker as string} onClick={() => onSelect(s.ticker as string)}
            className="flex items-center px-2 py-[3px] border-b border-border/5 hover:bg-teal-400/[0.02] transition-colors cursor-pointer">
            <span className="w-[52px] text-[8px] font-mono font-bold text-white pr-1.5">{s.ticker as string}</span>
            <span className="w-[40px] text-[8px] font-mono text-right pr-1.5 text-neutral-300">{m.peTrailing.toFixed(1)}</span>
            <span className="w-[44px] text-[8px] font-mono text-right pr-1.5 text-neutral-300">{m.peForward.toFixed(1)}</span>
            <span className="w-[52px] text-[8px] font-mono text-right pr-1.5 text-neutral-300">{m.evEbitda.toFixed(1)}</span>
            <span className="w-[36px] text-[8px] font-mono text-right pr-1.5 text-neutral-300">{m.pSales.toFixed(1)}</span>
            <span className="w-[36px] text-[8px] font-mono text-right pr-1.5 text-neutral-300">{m.pBook.toFixed(1)}</span>
            <span className="w-[36px] text-[8px] font-mono text-right pr-1.5 text-neutral-300">{m.pegRatio.toFixed(2)}</span>
            <span className={`w-[44px] text-[8px] font-mono text-right pr-1.5 font-bold ${pctileColor(p.pe5YPctile)}`}>{p.pe5YPctile}</span>
            <span className={`w-[48px] text-[8px] font-mono text-right pr-1.5 font-bold ${premColor(pr.vsSector)}`}>{pr.vsSector > 0 ? '+' : ''}{pr.vsSector.toFixed(1)}%</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Sectors View ──
function SectorsView({ sectors }: { sectors: Record<string, unknown>[] }) {
  const maxPE = Math.max(...sectors.map((s: Record<string, unknown>) => s.avgPE as number), 1);
  return (
    <div className="p-2">
      <div className="flex items-center px-2 py-0.5 border-b border-border/10 bg-[#030303] mb-1">
        <span className="w-[100px] text-[7px] font-mono text-neutral-600 uppercase">Sector</span>
        <span className="w-[48px] text-[7px] font-mono text-neutral-600 uppercase text-right">AVG P/E</span>
        <span className="w-[56px] text-[7px] font-mono text-neutral-600 uppercase text-right">EV/EBITDA</span>
        <span className="w-[40px] text-[7px] font-mono text-neutral-600 uppercase text-right">P/S</span>
        <span className="w-[48px] text-[7px] font-mono text-neutral-600 uppercase text-right">MED P/E</span>
        <span className="flex-1 text-[7px] font-mono text-neutral-600 uppercase text-right pr-1">#</span>
      </div>
      {sectors.map((s: Record<string, unknown>) => (
        <div key={s.sector as string} className="flex items-center px-2 py-1.5 border-b border-border/5 hover:bg-teal-400/[0.02] transition-colors">
          <span className="w-[100px] text-[8px] font-mono font-bold text-white truncate">{s.sector as string}</span>
          <span className="w-[48px] text-[8px] font-mono text-right text-neutral-300">{(s.avgPE as number).toFixed(1)}</span>
          <span className="w-[56px] text-[8px] font-mono text-right text-neutral-300">{(s.avgEVEBITDA as number).toFixed(1)}</span>
          <span className="w-[40px] text-[8px] font-mono text-right text-neutral-300">{(s.avgPS as number).toFixed(1)}</span>
          <span className="w-[48px] text-[8px] font-mono text-right text-neutral-300">{(s.medianPE as number).toFixed(1)}</span>
          <div className="flex-1 flex items-center justify-end gap-1 pr-1">
            <div className="w-16 h-1.5 bg-neutral-900 relative">
              <div className="absolute left-0 top-0 h-full bg-teal-400/40" style={{ width: `${((s.avgPE as number) / maxPE) * 100}%` }} />
            </div>
            <span className="text-[7px] font-mono text-neutral-500">{s.stockCount as number}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── History View ──
function HistoryView({ stocks, selected, onSelect }: { stocks: Record<string, unknown>[]; selected: string; onSelect: (t: string) => void }) {
  const stock = stocks.find((s: Record<string, unknown>) => s.ticker === selected);
  const history = stock ? (stock.history as { date: string; pe: number; evEbitda: number }[]) : [];
  const sectorAvg = stock ? (stock.sectorAvg as Record<string, number>) : null;
  const maxPE = Math.max(...history.map(h => h.pe), sectorAvg?.peAvg ?? 0, 1);

  return (
    <div className="p-2">
      <div className="flex items-center gap-2 mb-2">
        <select value={selected} onChange={e => onSelect(e.target.value)}
          className="bg-black border border-border/30 text-[8px] font-mono text-white px-1.5 py-0.5 outline-none">
          {stocks.map((s: Record<string, unknown>) => <option key={s.ticker as string} value={s.ticker as string}>{s.ticker as string} - {s.name as string}</option>)}
        </select>
        {stock && <span className="text-[7px] font-mono text-neutral-500">{(stock as Record<string, unknown>).sector as string}</span>}
      </div>

      {history.length > 0 && (
        <>
          <div className="text-[7px] font-mono text-neutral-600 uppercase mb-1 tracking-wider">Quarterly P/E Trend</div>
          {history.map((h, i) => (
            <div key={i} className="flex items-center gap-2 py-1 border-b border-border/5">
              <span className="w-[60px] text-[7px] font-mono text-neutral-500">{h.date.slice(0, 7)}</span>
              <div className="flex-1 h-2 bg-neutral-900 relative">
                <div className="absolute left-0 top-0 h-full bg-teal-400/50" style={{ width: `${(h.pe / maxPE) * 100}%` }} />
                {sectorAvg && (
                  <div className="absolute top-0 h-full w-px bg-yellow-400/60" style={{ left: `${(sectorAvg.peAvg / maxPE) * 100}%` }} />
                )}
              </div>
              <span className="w-[32px] text-[8px] font-mono text-right text-white font-bold">{h.pe.toFixed(1)}</span>
              <span className="w-[40px] text-[7px] font-mono text-right text-neutral-500">EV {h.evEbitda.toFixed(1)}</span>
            </div>
          ))}
          {sectorAvg && (
            <div className="flex items-center gap-1 mt-1">
              <div className="w-2 h-px bg-yellow-400/60" />
              <span className="text-[7px] font-mono text-neutral-500">Sector avg: {sectorAvg.peAvg.toFixed(1)}x</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
