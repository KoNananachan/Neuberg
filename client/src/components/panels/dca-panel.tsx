// Tom Nash DCA + Double-Down module
// Logic: if stock is 20%+ below 52-week high AND fundamentals intact → double the monthly DCA
// This module is read-only from the valuation engine; it does NOT affect priority scores.

import { useMemo } from 'react';
import { GlassCard } from '../common/glass-card';
import { usePortfolioStore } from '../../stores/use-portfolio-store';
import { useQueries } from '@tanstack/react-query';
import { api } from '../../api/client';
import { buildStockCard } from '../../lib/valuation';
import type { StockCard } from '../../types/stock-card';
import { AlertTriangle, TrendingDown, CheckCircle2 } from 'lucide-react';

function fmtPrice(n: number | null | undefined) { return n == null ? '--' : `$${n.toFixed(2)}`; }
function fmtPct(n: number | null | undefined) { return n == null ? '--' : `${(n * 100).toFixed(1)}%`; }
function fmtMoney(n: number) { return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`; }

export function DcaPanel() {
  const { entries, totalPortfolioValue } = usePortfolioStore();
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

  const activeDD = cards.filter((c) => c.double_down_signal);
  const watchDD = cards.filter((c) => c.is_double_down_active && !c.double_down_signal);
  const normal = cards.filter((c) => !c.is_double_down_active);

  const totalNormalDca = cards.reduce((acc, c) => acc + c.dca_amount_monthly, 0);
  const totalThisMonth = cards.reduce((acc, c) => acc + (c.double_down_signal ? c.dca_amount_monthly * 2 : c.dca_amount_monthly), 0);

  return (
    <GlassCard title="TOM NASH — DCA + DOUBLE DOWN" className="h-full">
      <div className="flex-1 overflow-auto p-3 flex flex-col gap-3">

        {/* Monthly summary */}
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Base DCA / Month" value={fmtMoney(totalNormalDca)} />
          <Stat label="This Month (adjusted)" value={fmtMoney(totalThisMonth)} highlight />
          <Stat label="Double-Down Active" value={`${activeDD.length} stocks`} alert={activeDD.length > 0} />
        </div>

        {/* Double-down active */}
        {activeDD.length > 0 && (
          <Section title="DOUBLE DOWN — ACTIVE" icon={<AlertTriangle className="w-3 h-3 text-[#ff9900]" />}>
            {activeDD.map((c) => <DcaRow key={c.ticker} card={c} mode="double" />)}
          </Section>
        )}

        {/* Watch zone */}
        {watchDD.length > 0 && (
          <Section title="WATCH — DROPPED BUT FUNDAMENTALS WEAK" icon={<TrendingDown className="w-3 h-3 text-yellow-400" />}>
            {watchDD.map((c) => <DcaRow key={c.ticker} card={c} mode="watch" />)}
          </Section>
        )}

        {/* Normal DCA */}
        {normal.length > 0 && (
          <Section title="STANDARD DCA" icon={<CheckCircle2 className="w-3 h-3 text-neutral/40" />}>
            {normal.map((c) => <DcaRow key={c.ticker} card={c} mode="normal" />)}
          </Section>
        )}

        {cards.length === 0 && (
          <p className="text-[10px] font-mono text-neutral/30 uppercase tracking-widest text-center mt-8">
            Add stocks and set DCA amounts via Stock Picker
          </p>
        )}

        {/* Explainer */}
        <div className="border border-border/30 p-2 mt-auto">
          <p className="text-[9px] font-mono text-neutral/30 leading-relaxed">
            LOGIC: If a stock drops ≥20% from its 52-week high AND fundamentals remain intact (positive ROE, revenue not collapsing),
            the double-down signal activates — recommended DCA doubles for that month.
            Fundamentals check: ROE &gt; 0 AND revenue growth &gt; −30%.
            This module does NOT execute trades. All action is manual via Trading 212.
          </p>
        </div>
      </div>
    </GlassCard>
  );
}

function Stat({ label, value, highlight, alert }: { label: string; value: string; highlight?: boolean; alert?: boolean }) {
  return (
    <div className="border border-border p-2">
      <p className="text-[8px] font-mono text-neutral/40 uppercase tracking-widest">{label}</p>
      <p className={`text-[13px] font-bold font-mono mt-0.5 ${alert ? 'text-[#ff9900]' : highlight ? 'text-accent' : 'text-white'}`}>{value}</p>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1 mb-1">
        {icon}
        <p className="text-[9px] font-mono text-neutral/50 uppercase tracking-widest">{title}</p>
      </div>
      <div className="border border-border divide-y divide-border/30">{children}</div>
    </div>
  );
}

function DcaRow({ card, mode }: { card: StockCard; mode: 'double' | 'watch' | 'normal' }) {
  const recAmount = mode === 'double' ? card.dca_amount_monthly * 2 : card.dca_amount_monthly;
  return (
    <div className="px-3 py-2 grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 items-center">
      <div>
        <span className="text-[10px] font-bold font-mono text-accent">{card.ticker}</span>
        <p className="text-[8px] font-mono text-neutral/40 mt-0.5 truncate">{card.dca_recommendation_text.slice(0, 70)}…</p>
      </div>
      <div className="text-right">
        <p className="text-[8px] font-mono text-neutral/40">Price</p>
        <p className="text-[10px] font-mono text-white">{fmtPrice(card.price_current)}</p>
      </div>
      <div className="text-right">
        <p className="text-[8px] font-mono text-neutral/40">52W High</p>
        <p className="text-[10px] font-mono text-white">{fmtPrice(card.price_52w_high)}</p>
      </div>
      <div className="text-right">
        <p className="text-[8px] font-mono text-neutral/40">Drop</p>
        <p className={`text-[10px] font-mono font-bold ${card.drop_from_52w_high_pct >= card.double_down_threshold_pct ? 'text-[#ff9900]' : 'text-neutral'}`}>
          {fmtPct(card.drop_from_52w_high_pct)}
        </p>
      </div>
      <div className="text-right border-l border-border pl-3">
        <p className="text-[8px] font-mono text-neutral/40">{mode === 'double' ? 'DOUBLED DCA' : 'DCA'}</p>
        <p className={`text-[11px] font-mono font-bold ${mode === 'double' ? 'text-[#00ff00]' : 'text-white'}`}>
          {recAmount > 0 ? fmtMoney(recAmount) : '--'}
        </p>
        {mode === 'double' && (
          <p className="text-[8px] font-mono text-neutral/40">base: {fmtMoney(card.dca_amount_monthly)}</p>
        )}
      </div>
    </div>
  );
}
