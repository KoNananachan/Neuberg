import { useMemo } from 'react';
import { GlassCard } from '../common/glass-card';
import { usePortfolioStore } from '../../stores/use-portfolio-store';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { buildStockCard } from '../../lib/valuation';
import type { StockCard, ValuationStatus } from '../../types/stock-card';
import { useAppStore } from '../../stores/use-app-store';

const STATUS_BG: Record<ValuationStatus, string> = {
  STRONG_BUY: 'bg-[#00ff00]/10 border-[#00ff00]/40',
  BUY: 'bg-[#66ff66]/10 border-[#66ff66]/40',
  WATCH: 'bg-yellow-400/10 border-yellow-400/40',
  EXPENSIVE: 'bg-[#ff0000]/10 border-[#ff0000]/40',
};
const STATUS_TEXT: Record<ValuationStatus, string> = {
  STRONG_BUY: 'text-[#00ff00]',
  BUY: 'text-[#66ff66]',
  WATCH: 'text-yellow-400',
  EXPENSIVE: 'text-[#ff0000]',
};
const STATUS_LABELS: Record<ValuationStatus, string> = {
  STRONG_BUY: 'STRONG BUY',
  BUY: 'BUY',
  WATCH: 'WATCH',
  EXPENSIVE: 'EXPENSIVE',
};

function fmtPrice(n: number | null | undefined) { return n == null ? '--' : `$${n.toFixed(2)}`; }
function fmtPct(n: number | null | undefined) { return n == null ? '--' : `${(n * 100).toFixed(1)}%`; }
function fmtNum(n: number | null | undefined, d = 1) { return n == null ? '--' : n.toFixed(d); }

export function ValuationCardPanel() {
  const selectedSymbol = useAppStore((s) => s.selectedSymbol);
  const { entries, totalPortfolioValue } = usePortfolioStore();

  const ticker = selectedSymbol?.toUpperCase() ?? null;
  const entry = ticker ? entries[ticker] : null;

  const { data, isLoading } = useQuery({
    queryKey: ['stock-detail', ticker],
    queryFn: () => api.get<any>(`/stocks/${ticker}`).then((r: any) => r),
    enabled: !!ticker,
    staleTime: 60_000,
  });

  const card = useMemo<StockCard | null>(() => {
    if (!entry || !data?.quote) return null;
    return buildStockCard(entry, data.quote, data.profile, totalPortfolioValue);
  }, [entry, data, totalPortfolioValue]);

  if (!ticker) return <GlassCard title="VALUATION CARD" className="h-full"><Placeholder text="Select a ticker to view valuation." /></GlassCard>;
  if (isLoading) return <GlassCard title="VALUATION CARD" className="h-full"><Placeholder text="Loading…" /></GlassCard>;
  if (!card) return <GlassCard title="VALUATION CARD" className="h-full"><Placeholder text={`${ticker} not in portfolio. Add it via Stock Picker.`} /></GlassCard>;

  const st = card.valuation_status;

  return (
    <GlassCard title={`VALUATION — ${card.ticker}`} className="h-full">
      <div className="flex-1 overflow-auto p-3 flex flex-col gap-3">

        {/* Status badge */}
        <div className={`border px-3 py-2 ${STATUS_BG[st]}`}>
          <p className={`text-[14px] font-bold font-mono ${STATUS_TEXT[st]}`}>{STATUS_LABELS[st]}</p>
          <p className="text-[10px] text-neutral/50 font-mono">{card.name}</p>
        </div>

        {/* Price vs buy zone bar */}
        <PriceBar card={card} />

        {/* Core valuation metrics */}
        <Section title="VALUATION">
          <Row label="Current Price" value={fmtPrice(card.price_current)} />
          <Row label="Fair Value" value={fmtPrice(card.fair_value_estimate)} highlight />
          <Row label="Method" value={card.valuation_method} />
          <Row label="Discount" value={fmtPct(card.discount_pct)} color={card.discount_pct >= 0 ? 'text-[#00ff00]' : 'text-[#ff0000]'} />
          <Row label="Buy Zone Low" value={fmtPrice(card.buy_zone_low)} />
          <Row label="Buy Zone High" value={fmtPrice(card.buy_zone_high)} />
        </Section>

        {/* Fundamentals */}
        <Section title="FUNDAMENTALS">
          <Row label="P/E (TTM)" value={fmtNum(card.pe_ttm)} />
          <Row label="P/E (Forward)" value={fmtNum(card.pe_forward)} />
          <Row label="P/B" value={fmtNum(card.pb)} />
          <Row label="Dividend Yield" value={fmtPct(card.dividend_yield)} />
          <Row label="ROE" value={fmtPct(card.roe)} />
          <Row label="Rev Growth" value={fmtPct(card.revenue_growth_5y)} />
        </Section>

        {/* 52-week range */}
        <Section title="52-WEEK RANGE">
          <Row label="52W High" value={fmtPrice(card.price_52w_high)} />
          <Row label="52W Low" value={fmtPrice(card.price_52w_low)} />
          <Row label="Drop from High" value={fmtPct(card.drop_from_52w_high_pct)} color="text-yellow-400" />
        </Section>

        {/* Portfolio */}
        <Section title="PORTFOLIO">
          <Row label="Shares Held" value={card.current_shares.toString()} />
          <Row label="Current Value" value={fmtPrice(card.current_value)} />
          <Row label="Portfolio Weight" value={fmtPct(card.portfolio_weight_current)} />
          <Row label="Target Max Weight" value={fmtPct(card.portfolio_weight_target_max)} />
          <Row label="Room to Add" value={fmtPct(card.room_to_add)} highlight />
        </Section>

        {/* Priority score */}
        <Section title="SCORES">
          <Row label="Valuation Score" value={fmtNum(card.valuation_score, 3)} />
          <Row label="Room Score" value={fmtNum(card.room_score, 3)} />
          <Row label="Conviction" value={`${card.conviction_score}/5`} />
          <Row label="Risk Penalty" value={fmtNum(card.risk_penalty, 3)} />
          <Row label="Priority Score" value={fmtNum(card.priority_score, 3)} highlight />
        </Section>

        {/* Thesis */}
        {card.thesis_summary && (
          <Section title="THESIS">
            <p className="text-[10px] font-mono text-neutral/70 whitespace-pre-wrap leading-relaxed">{card.thesis_summary}</p>
          </Section>
        )}

        {card.key_risks && (
          <Section title="KEY RISKS">
            <p className="text-[10px] font-mono text-[#ff6666] whitespace-pre-wrap leading-relaxed">{card.key_risks}</p>
          </Section>
        )}
      </div>
    </GlassCard>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[9px] text-neutral/40 uppercase tracking-widest mb-1 font-mono">{title}</p>
      <div className="border border-border divide-y divide-border/30">{children}</div>
    </div>
  );
}

function Row({ label, value, highlight, color }: { label: string; value: string; highlight?: boolean; color?: string }) {
  return (
    <div className="flex justify-between px-2 py-0.5">
      <span className="text-[10px] font-mono text-neutral/50">{label}</span>
      <span className={`text-[10px] font-mono font-bold ${color ?? (highlight ? 'text-accent' : 'text-white')}`}>{value}</span>
    </div>
  );
}

function PriceBar({ card }: { card: StockCard }) {
  const min = Math.min(card.buy_zone_high, card.price_current, card.fair_value_estimate) * 0.85;
  const max = Math.max(card.price_52w_high, card.fair_value_estimate, card.price_current) * 1.05;
  const range = max - min;

  function pct(v: number) { return `${Math.min(100, Math.max(0, ((v - min) / range) * 100)).toFixed(1)}%`; }

  return (
    <div>
      <p className="text-[9px] text-neutral/40 uppercase tracking-widest mb-1 font-mono">PRICE VS BUY ZONE</p>
      <div className="relative h-6 bg-hover border border-border">
        {/* Strong buy zone */}
        <div
          className="absolute top-0 bottom-0 bg-[#00ff00]/20"
          style={{ left: pct(card.buy_zone_high), width: pct(card.buy_zone_low) }}
        />
        {/* Buy zone */}
        <div
          className="absolute top-0 bottom-0 bg-[#66ff66]/10"
          style={{ left: pct(card.buy_zone_low), width: pct(card.fair_value_estimate) }}
        />
        {/* Current price line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white"
          style={{ left: pct(card.price_current) }}
          title={`Price: $${card.price_current.toFixed(2)}`}
        />
        {/* Fair value line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-accent opacity-70"
          style={{ left: pct(card.fair_value_estimate) }}
          title={`FV: $${card.fair_value_estimate.toFixed(2)}`}
        />
      </div>
      <div className="flex justify-between mt-0.5 text-[8px] font-mono text-neutral/40">
        <span>SB Zone</span>
        <span>Buy Zone</span>
        <span className="text-accent">FV</span>
      </div>
    </div>
  );
}

function Placeholder({ text }: { text: string }) {
  return (
    <div className="flex-1 flex items-center justify-center text-[10px] font-mono text-neutral/30 uppercase tracking-widest">
      {text}
    </div>
  );
}
