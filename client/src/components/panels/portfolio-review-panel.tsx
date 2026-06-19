import { useMemo, useState } from 'react';
import { GlassCard } from '../common/glass-card';
import { usePortfolioStore } from '../../stores/use-portfolio-store';
import { useQueries } from '@tanstack/react-query';
import { api } from '../../api/client';
import { buildStockCard } from '../../lib/valuation';
import type { StockCard, ValuationStatus } from '../../types/stock-card';
import { Upload, DollarSign } from 'lucide-react';

const STATUS_TEXT: Record<ValuationStatus, string> = {
  STRONG_BUY: 'text-[#00ff00]',
  BUY: 'text-[#66ff66]',
  WATCH: 'text-yellow-400',
  EXPENSIVE: 'text-[#ff0000]',
};

function fmtPct(n: number | null | undefined) { return n == null ? '--' : `${(n * 100).toFixed(1)}%`; }
function fmtPrice(n: number | null | undefined) { return n == null ? '--' : `$${n.toFixed(2)}`; }
function fmtMoney(n: number | null | undefined) {
  if (n == null) return '--';
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

export function PortfolioReviewPanel() {
  const { entries, totalPortfolioValue, setTotalPortfolioValue } = usePortfolioStore();
  const [editingTotal, setEditingTotal] = useState(false);
  const [totalInput, setTotalInput] = useState(totalPortfolioValue.toString());

  const tickers = Object.keys(entries);

  const quoteQueries = useQueries({
    queries: tickers.map((t) => ({
      queryKey: ['stock-detail', t],
      queryFn: () => api.get<any>(`/stocks/${t}`).then((r: any) => r),
      staleTime: 60_000,
    })),
  });

  const cards = useMemo<StockCard[]>(() => {
    return tickers.flatMap((t, i) => {
      const result = quoteQueries[i]?.data;
      if (!result?.quote) return [];
      return [buildStockCard(entries[t], result.quote, result.profile, totalPortfolioValue)];
    });
  }, [tickers, quoteQueries, entries, totalPortfolioValue]);

  // Sector allocation
  const sectorMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of cards) {
      const s = c.sector || 'Unknown';
      m[s] = (m[s] ?? 0) + c.portfolio_weight_current;
    }
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [cards]);

  const sorted = useMemo(
    () => [...cards].sort((a, b) => b.priority_score - a.priority_score),
    [cards],
  );

  function handleTotalSave() {
    const v = parseFloat(totalInput);
    if (!isNaN(v) && v >= 0) setTotalPortfolioValue(v);
    setEditingTotal(false);
  }

  function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = text.split('\n').slice(1).flatMap((line) => {
        const parts = line.split(',');
        const ticker = parts[0]?.trim().replace(/"/g, '');
        const shares = parseFloat(parts[1]?.trim() ?? '');
        const value = parseFloat(parts[2]?.trim() ?? '');
        if (!ticker || isNaN(shares)) return [];
        return [{ ticker, shares, value: isNaN(value) ? 0 : value }];
      });
      usePortfolioStore.getState().importCsv(rows);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <GlassCard
      title="PORTFOLIO REVIEW"
      headerRight={
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-0.5 text-[10px] text-neutral/50 hover:text-accent cursor-pointer transition-colors">
            <Upload className="w-3 h-3" />
            <span>CSV</span>
            <input type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
          </label>
          <button
            className="flex items-center gap-0.5 text-[10px] text-neutral/50 hover:text-accent"
            onClick={() => { setTotalInput(totalPortfolioValue.toString()); setEditingTotal(true); }}
          >
            <DollarSign className="w-3 h-3" />
            {editingTotal ? null : fmtMoney(totalPortfolioValue)}
          </button>
          {editingTotal && (
            <input
              autoFocus
              type="number"
              className="bg-hover border border-accent text-accent text-[10px] font-mono px-1 w-24"
              value={totalInput}
              onChange={(e) => setTotalInput(e.target.value)}
              onBlur={handleTotalSave}
              onKeyDown={(e) => e.key === 'Enter' && handleTotalSave()}
            />
          )}
        </div>
      }
      className="h-full"
    >
      <div className="flex-1 overflow-auto flex flex-col gap-0">

        {/* Main table */}
        <div className="overflow-auto">
          <table className="w-full text-[10px] font-mono border-collapse">
            <thead className="sticky top-0 bg-black z-10">
              <tr className="border-b border-border">
                {['TICKER', 'PRICE', 'VALUE', 'CUR WT%', 'TGT MAX%', 'ROOM', 'STATUS', 'DISCOUNT', 'PRIORITY'].map((h) => (
                  <th key={h} className="text-left px-2 py-1 text-neutral/40 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => (
                <tr key={c.ticker} className="border-b border-border/20 hover:bg-hover">
                  <td className="px-2 py-1 text-accent font-bold">{c.ticker}</td>
                  <td className="px-2 py-1 text-white">{fmtPrice(c.price_current)}</td>
                  <td className="px-2 py-1 text-neutral">{fmtMoney(c.current_value)}</td>
                  <td className="px-2 py-1">
                    <WeightBar actual={c.portfolio_weight_current} target={c.portfolio_weight_target_max} />
                  </td>
                  <td className="px-2 py-1 text-neutral/60">{fmtPct(c.portfolio_weight_target_max)}</td>
                  <td className={`px-2 py-1 font-bold ${c.room_to_add > 0 ? 'text-[#00ff00]' : 'text-neutral/40'}`}>
                    {fmtPct(c.room_to_add)}
                  </td>
                  <td className={`px-2 py-1 font-bold ${STATUS_TEXT[c.valuation_status]}`}>
                    {c.valuation_status.replace('_', ' ')}
                  </td>
                  <td className={`px-2 py-1 font-bold ${c.discount_pct >= 0 ? 'text-[#00ff00]' : 'text-[#ff0000]'}`}>
                    {fmtPct(c.discount_pct)}
                  </td>
                  <td className="px-2 py-1 text-white font-bold">{c.priority_score.toFixed(2)}</td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-2 py-4 text-center text-neutral/30 uppercase tracking-widest">
                    No positions — add stocks via Stock Picker
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Sector allocation */}
        {sectorMap.length > 0 && (
          <div className="border-t border-border p-3">
            <p className="text-[9px] text-neutral/40 uppercase tracking-widest mb-2 font-mono">SECTOR ALLOCATION</p>
            <div className="flex flex-col gap-1">
              {sectorMap.map(([sector, weight]) => (
                <div key={sector} className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-neutral/60 w-32 truncate">{sector}</span>
                  <div className="flex-1 h-2 bg-hover border border-border relative">
                    <div className="absolute inset-y-0 left-0 bg-accent/50" style={{ width: `${Math.min(100, weight * 100)}%` }} />
                  </div>
                  <span className="text-[9px] font-mono text-neutral w-12 text-right">{fmtPct(weight)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Priority chart */}
        {sorted.length > 0 && (
          <div className="border-t border-border p-3">
            <p className="text-[9px] text-neutral/40 uppercase tracking-widest mb-2 font-mono">PRIORITY RANKING</p>
            <div className="flex flex-col gap-1">
              {sorted.slice(0, 10).map((c) => (
                <div key={c.ticker} className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-accent w-12">{c.ticker}</span>
                  <div className="flex-1 h-2 bg-hover border border-border relative">
                    <div
                      className="absolute inset-y-0 left-0"
                      style={{
                        width: `${Math.min(100, Math.max(0, c.priority_score * 100))}%`,
                        backgroundColor: c.priority_score > 0.7 ? '#00ff00' : c.priority_score > 0.4 ? '#ff9900' : '#ff4444',
                      }}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-neutral w-10 text-right">{c.priority_score.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
}

function WeightBar({ actual, target }: { actual: number; target: number }) {
  const pct = Math.min(100, (actual / (target || 0.05)) * 100);
  const over = actual > target;
  return (
    <div className="flex items-center gap-1">
      <div className="w-16 h-2 bg-hover border border-border relative">
        <div
          className={`absolute inset-y-0 left-0 ${over ? 'bg-[#ff4444]' : 'bg-accent/60'}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <span className={`text-[9px] font-mono ${over ? 'text-[#ff4444]' : 'text-neutral'}`}>{(actual * 100).toFixed(1)}%</span>
    </div>
  );
}
