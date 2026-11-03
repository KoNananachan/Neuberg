import { useState, useEffect } from 'react';
import { usePortfolioStore } from '../../../stores/use-portfolio-store';
import { DEFAULT_CARD_INPUT } from '../../../types/stock-card';
import type { StockCardInput } from '../../../types/stock-card';
import { X } from 'lucide-react';

interface Props {
  ticker: string | null; // null = new entry
  onClose: () => void;
}

export function EditEntryModal({ ticker, onClose }: Props) {
  const { entries, upsertEntry } = usePortfolioStore();
  const existing = ticker ? entries[ticker.toUpperCase()] : null;

  const [form, setForm] = useState<Omit<StockCardInput, 'ticker'>>({
    ...DEFAULT_CARD_INPUT,
    ...existing,
  });
  const [tickerInput, setTickerInput] = useState(ticker ?? '');

  useEffect(() => {
    if (ticker) {
      const e = entries[ticker.toUpperCase()];
      if (e) setForm({ ...DEFAULT_CARD_INPUT, ...e });
    }
  }, [ticker]);

  function handleSave() {
    const t = tickerInput.trim().toUpperCase();
    if (!t) return;
    upsertEntry(t, form);
    onClose();
  }

  function field<K extends keyof typeof form>(
    label: string,
    key: K,
    type: 'text' | 'number' | 'textarea' = 'number',
    step?: string,
  ) {
    const value = form[key];
    return (
      <div className="flex flex-col gap-0.5">
        <label className="text-[9px] text-neutral/50 uppercase tracking-widest">{label}</label>
        {type === 'textarea' ? (
          <textarea
            rows={2}
            className="bg-hover border border-border text-neutral text-[10px] font-mono px-1.5 py-1 resize-none"
            value={String(value ?? '')}
            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          />
        ) : (
          <input
            type={type}
            step={step ?? '0.01'}
            className="bg-hover border border-border text-neutral text-[10px] font-mono px-1.5 py-1 w-full"
            value={String(value ?? '')}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                [key]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value,
              }))
            }
          />
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-panel border border-border w-[520px] max-h-[90vh] overflow-auto flex flex-col">
        <div className="px-3 py-2 border-b border-border flex items-center justify-between">
          <span className="text-[11px] font-bold text-accent tracking-widest font-mono">
            {ticker ? `EDIT — ${ticker}` : 'ADD STOCK'}
          </span>
          <button onClick={onClose} className="text-neutral/40 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-3 grid grid-cols-2 gap-3">
          {/* Ticker (editable only for new entries) */}
          <div className="flex flex-col gap-0.5 col-span-2">
            <label className="text-[9px] text-neutral/50 uppercase tracking-widest">TICKER</label>
            <input
              type="text"
              disabled={!!ticker}
              className="bg-hover border border-border text-accent text-[11px] font-mono px-1.5 py-1 uppercase disabled:opacity-50"
              value={tickerInput}
              onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
              placeholder="e.g. AAPL"
            />
          </div>

          {/* Valuation */}
          {field('Fair Value Estimate ($)', 'fair_value_estimate', 'number', '0.01')}
          {field('Valuation Method', 'valuation_method', 'text')}
          {field('MOS Low (e.g. 0.20 = Buy zone)', 'margin_of_safety_low', 'number', '0.01')}
          {field('MOS High (e.g. 0.30 = Strong Buy)', 'margin_of_safety_high', 'number', '0.01')}

          {/* Portfolio */}
          {field('Current Shares', 'current_shares', 'number', '1')}
          {field('Target Max Weight (e.g. 0.05 = 5%)', 'portfolio_weight_target_max', 'number', '0.01')}

          {/* Qualitative */}
          <div className="col-span-2">{field('Thesis Summary', 'thesis_summary', 'textarea')}</div>
          <div className="col-span-2">{field('Key Risks', 'key_risks', 'textarea')}</div>
          {field('Time Horizon', 'time_horizon', 'text')}

          {/* Conviction */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[9px] text-neutral/50 uppercase tracking-widest">CONVICTION (1–5)</label>
            <select
              className="bg-hover border border-border text-neutral text-[10px] font-mono px-1.5 py-1"
              value={form.conviction_score}
              onChange={(e) => setForm((f) => ({ ...f, conviction_score: parseInt(e.target.value) as 1 | 2 | 3 | 4 | 5 }))}
            >
              {[1, 2, 3, 4, 5].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* DCA */}
          {field('DCA Amount / Month ($)', 'dca_amount_monthly', 'number', '1')}
          {field('Double-Down Threshold (e.g. 0.20)', 'double_down_threshold_pct', 'number', '0.01')}
        </div>

        <div className="px-3 py-2 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="text-[10px] font-mono text-neutral/50 hover:text-white px-3 py-1 border border-border">
            CANCEL
          </button>
          <button
            onClick={handleSave}
            className="text-[10px] font-mono bg-accent text-black px-4 py-1 font-bold hover:opacity-90"
          >
            SAVE
          </button>
        </div>
      </div>
    </div>
  );
}
