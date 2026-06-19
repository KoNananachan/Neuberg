import { useState } from 'react';
import { GlassCard } from '../common/glass-card';
import { usePortfolioStore } from '../../stores/use-portfolio-store';
import { Edit3, Check, X, Clock } from 'lucide-react';

export function ResearchNotesPanel() {
  const { entries, upsertEntry, activeResearchTicker, setActiveResearchTicker } = usePortfolioStore();
  const tickers = Object.keys(entries);

  const active = activeResearchTicker?.toUpperCase() ?? tickers[0] ?? null;
  const entry = active ? entries[active] : null;

  const [editingThesis, setEditingThesis] = useState(false);
  const [editingRisks, setEditingRisks] = useState(false);
  const [thesisDraft, setThesisDraft] = useState('');
  const [risksDraft, setRisksDraft] = useState('');

  function startEdit(field: 'thesis' | 'risks') {
    if (!entry) return;
    if (field === 'thesis') { setThesisDraft(entry.thesis_summary); setEditingThesis(true); }
    else { setRisksDraft(entry.key_risks); setEditingRisks(true); }
  }

  function saveField(field: 'thesis' | 'risks') {
    if (!active) return;
    if (field === 'thesis') {
      upsertEntry(active, { thesis_summary: thesisDraft, notes_updated: new Date().toISOString() });
      setEditingThesis(false);
    } else {
      upsertEntry(active, { key_risks: risksDraft, notes_updated: new Date().toISOString() });
      setEditingRisks(false);
    }
  }

  return (
    <GlassCard title="RESEARCH & NOTES" className="h-full">
      <div className="flex h-full overflow-hidden">

        {/* Ticker list */}
        <div className="w-28 border-r border-border overflow-auto shrink-0">
          {tickers.length === 0 && (
            <p className="text-[9px] text-neutral/30 font-mono p-2 uppercase tracking-widest">No tickers</p>
          )}
          {tickers.map((t) => {
            const e = entries[t];
            return (
              <button
                key={t}
                onClick={() => setActiveResearchTicker(t)}
                className={`w-full text-left px-2 py-1.5 border-b border-border/30 flex flex-col gap-0.5 transition-colors ${
                  t === active ? 'bg-accent/10 text-accent' : 'text-neutral/70 hover:bg-hover'
                }`}
              >
                <span className="text-[10px] font-mono font-bold">{t}</span>
                {e?.notes_updated && (
                  <span className="text-[8px] text-neutral/30 font-mono flex items-center gap-0.5">
                    <Clock className="w-2 h-2" />
                    {new Date(e.notes_updated).toLocaleDateString()}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Notes content */}
        <div className="flex-1 overflow-auto p-3 flex flex-col gap-3">
          {!active || !entry ? (
            <p className="text-[10px] font-mono text-neutral/30 uppercase tracking-widest">
              Select a ticker from the list or add stocks via Stock Picker.
            </p>
          ) : (
            <>
              <div>
                <p className="text-[11px] font-bold text-accent font-mono">{active}</p>
                <p className="text-[9px] text-neutral/40 font-mono">{entry.time_horizon} · Conviction {entry.conviction_score}/5</p>
              </div>

              <NoteSection
                title="INVESTMENT THESIS"
                value={editingThesis ? thesisDraft : entry.thesis_summary}
                editing={editingThesis}
                onChange={setThesisDraft}
                onEdit={() => startEdit('thesis')}
                onSave={() => saveField('thesis')}
                onCancel={() => setEditingThesis(false)}
                placeholder="Write your investment thesis here..."
                color="text-white"
              />

              <NoteSection
                title="KEY RISKS"
                value={editingRisks ? risksDraft : entry.key_risks}
                editing={editingRisks}
                onChange={setRisksDraft}
                onEdit={() => startEdit('risks')}
                onSave={() => saveField('risks')}
                onCancel={() => setEditingRisks(false)}
                placeholder="List key risks and bear case scenarios..."
                color="text-[#ff6666]"
              />

              <div className="border border-border p-2">
                <p className="text-[9px] text-neutral/40 uppercase tracking-widest mb-1 font-mono">PARAMETERS</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                  <Kv label="Method" value={entry.valuation_method} />
                  <Kv label="Fair Value" value={`$${entry.fair_value_estimate.toFixed(2)}`} />
                  <Kv label="MOS Low" value={`${(entry.margin_of_safety_low * 100).toFixed(0)}%`} />
                  <Kv label="MOS High" value={`${(entry.margin_of_safety_high * 100).toFixed(0)}%`} />
                  <Kv label="Shares" value={entry.current_shares.toString()} />
                  <Kv label="Target Max" value={`${(entry.portfolio_weight_target_max * 100).toFixed(1)}%`} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

function NoteSection({
  title, value, editing, onChange, onEdit, onSave, onCancel, placeholder, color,
}: {
  title: string;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  placeholder: string;
  color: string;
}) {
  return (
    <div className="border border-border">
      <div className="flex items-center justify-between px-2 py-1 border-b border-border/50 bg-hover">
        <span className="text-[9px] font-mono text-neutral/50 uppercase tracking-widest">{title}</span>
        {editing ? (
          <div className="flex gap-1">
            <button onClick={onSave} className="text-[#00ff00] hover:opacity-70"><Check className="w-3 h-3" /></button>
            <button onClick={onCancel} className="text-[#ff4444] hover:opacity-70"><X className="w-3 h-3" /></button>
          </div>
        ) : (
          <button onClick={onEdit} className="text-neutral/30 hover:text-accent"><Edit3 className="w-3 h-3" /></button>
        )}
      </div>
      {editing ? (
        <textarea
          autoFocus
          rows={6}
          className="w-full bg-black text-white text-[10px] font-mono p-2 resize-none border-none outline-none"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <p className={`text-[10px] font-mono ${color} p-2 whitespace-pre-wrap leading-relaxed min-h-[60px]`}>
          {value || <span className="text-neutral/20 italic">{placeholder}</span>}
        </p>
      )}
    </div>
  );
}

function Kv({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1">
      <span className="text-[9px] font-mono text-neutral/40">{label}:</span>
      <span className="text-[9px] font-mono text-neutral">{value}</span>
    </div>
  );
}
