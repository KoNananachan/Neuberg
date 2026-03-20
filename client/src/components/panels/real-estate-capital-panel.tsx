import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useRealEstateCapital } from '../../api/hooks/use-real-estate-capital';
import { useT, tr, TFn } from '../../i18n';

const ACCENT = '#f472b6';
const ACCENT_DIM = 'rgba(244,114,182,0.08)';

type Tab = 'spreads' | 'capRates' | 'pipeline' | 'delinquency';

const TAB_LABELS: Record<Tab, string> = {
  spreads: 'SPREADS',
  capRates: 'CAP RATES',
  pipeline: 'PIPELINE',
  delinquency: 'DELINQUENCY',
};

// ── Formatting helpers ──

function fmtBp(n: number): string {
  return n.toFixed(0);
}

function fmtPct(n: number): string {
  return n.toFixed(2) + '%';
}

function fmtChgBp(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return sign + n.toFixed(0);
}

function fmtChgPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return sign + n.toFixed(2);
}

function fmtDollarB(n: number): string {
  return '$' + n.toFixed(1) + 'B';
}

function fmtDollarM(n: number): string {
  return '$' + n.toFixed(0) + 'M';
}

// ── Color helpers ──

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function outlookStyle(outlook: string): { text: string; bg: string } {
  if (outlook === 'Improving') return { text: 'text-green-400', bg: 'bg-green-500/10 border border-green-500/30' };
  if (outlook === 'Weakening') return { text: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/30' };
  return { text: 'text-neutral-400', bg: 'bg-neutral-500/10 border border-neutral-500/30' };
}

function statusStyle(status: string): { text: string; bg: string } {
  const s = status.toLowerCase();
  if (s === 'closed' || s === 'funded') return { text: 'text-green-400', bg: 'bg-green-500/10 border border-green-500/30' };
  if (s === 'pricing' || s === 'marketed') return { text: 'text-yellow-400', bg: 'bg-yellow-500/10 border border-yellow-500/30' };
  if (s === 'withdrawn' || s === 'delayed') return { text: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/30' };
  return { text: 'text-blue-400', bg: 'bg-blue-500/10 border border-blue-500/30' };
}

// ── Tranche brightness ──

function trancheAccent(tranche: string): string {
  const t = tranche.toUpperCase();
  if (t.startsWith('AAA')) return 'text-pink-300';
  if (t.startsWith('AA')) return 'text-pink-400';
  if (t.startsWith('A')) return 'text-pink-400/80';
  if (t.startsWith('BBB')) return 'text-pink-400/60';
  if (t.startsWith('BB')) return 'text-pink-400/40';
  if (t.startsWith('B')) return 'text-pink-400/30';
  return 'text-pink-400/50';
}

// ── Main Panel ──

export function RealEstateCapitalPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useRealEstateCapital();
  const [tab, setTab] = useState<Tab>('spreads');

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5" style={{ backgroundColor: ACCENT }} />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter" style={{ color: ACCENT }}>
            {tr(t, 'panelRealEstateCapital', 'RE Capital Markets')}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {(Object.keys(TAB_LABELS) as Tab[]).map(v => (
            <button key={v} onClick={() => setTab(v)}
              className={`px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider transition-colors ${tab === v ? 'text-pink-400 bg-pink-400/10' : 'text-neutral-600 hover:text-neutral-400'}`}
            >{TAB_LABELS[v]}</button>
          ))}
          <button onClick={() => refetch()} className="p-1 text-neutral-500 hover:text-pink-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-pink-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'reNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            <SummaryBar data={data} />
            {tab === 'spreads' && <SpreadsTab spreads={data.spreads} />}
            {tab === 'capRates' && <CapRatesTab capRates={data.capRates} />}
            {tab === 'pipeline' && <PipelineTab pipeline={data.pipeline} />}
            {tab === 'delinquency' && <DelinquencyTab delinquency={data.delinquency} />}
          </>
        )}
      </div>
    </div>
  );
}

// ── Summary Bar ──

function SummaryBar({ data }: { data: any }) {
  const summary = data.summary;
  const metrics = [
    { label: 'CMBS ISSUANCE YTD', value: fmtDollarB(summary.cmbsIssuanceYtd) },
    { label: 'AVG CAP RATE', value: fmtPct(summary.avgCapRate) },
    { label: 'AVG CMBS SPREAD', value: fmtBp(summary.avgCmbsSpread) + ' bp' },
    { label: 'DELINQUENCY RATE', value: fmtPct(summary.delinquencyRate) },
    { label: 'PIPELINE', value: fmtDollarB(summary.pipeline) },
  ];

  return (
    <div className="grid grid-cols-5 gap-px border-b border-border/20" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
      {metrics.map(m => (
        <div key={m.label} className="bg-black px-2 py-1.5">
          <div className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">{m.label}</div>
          <div className="text-[10px] font-mono font-bold text-pink-400">{m.value}</div>
        </div>
      ))}
    </div>
  );
}

// ── Spreads Tab ──

function SpreadsTab({ spreads }: { spreads: any[] }) {
  const maxPercentile = 100;

  return (
    <div>
      <div className="flex items-center px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="w-[56px] text-[7px] font-mono text-neutral-600 uppercase">Tranche</span>
        <span className="w-[48px] text-[7px] font-mono text-neutral-600 uppercase text-right">Spread</span>
        <span className="w-[40px] text-[7px] font-mono text-neutral-600 uppercase text-right">1W Chg</span>
        <span className="w-[40px] text-[7px] font-mono text-neutral-600 uppercase text-right">1M Chg</span>
        <span className="flex-1 text-[7px] font-mono text-neutral-600 uppercase text-center">Percentile</span>
        <span className="w-[40px] text-[7px] font-mono text-neutral-600 uppercase text-right pr-1">Yield</span>
      </div>
      {spreads.map((s: any) => (
        <div key={s.tranche} className="flex items-center px-2 py-[3px] border-b border-border/5 hover:bg-white/[0.02] transition-colors">
          <span className={`w-[56px] text-[8px] font-mono font-bold ${trancheAccent(s.tranche)}`}>{s.tranche}</span>
          <span className="w-[48px] text-[8px] font-mono text-right text-white font-bold">{fmtBp(s.spread)} bp</span>
          <span className={`w-[40px] text-[8px] font-mono text-right ${changeColor(s.weekChange)}`}>{fmtChgBp(s.weekChange)}</span>
          <span className={`w-[40px] text-[8px] font-mono text-right ${changeColor(s.monthChange)}`}>{fmtChgBp(s.monthChange)}</span>
          <div className="flex-1 flex items-center gap-1 px-2">
            <div className="flex-1 h-2 bg-neutral-900 relative">
              <div
                className="absolute left-0 top-0 h-full"
                style={{ width: `${(s.percentile / maxPercentile) * 100}%`, backgroundColor: ACCENT_DIM, borderRight: `1px solid ${ACCENT}` }}
              />
            </div>
            <span className="text-[7px] font-mono text-neutral-500 w-[20px] text-right">{s.percentile}</span>
          </div>
          <span className="w-[40px] text-[8px] font-mono text-right text-neutral-300 pr-1">{fmtPct(s.yield)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Cap Rates Tab ──

function CapRatesTab({ capRates }: { capRates: any[] }) {
  return (
    <div>
      <div className="flex items-center px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="w-[72px] text-[7px] font-mono text-neutral-600 uppercase">Property Type</span>
        <span className="w-[44px] text-[7px] font-mono text-neutral-600 uppercase text-right">Cap Rate</span>
        <span className="w-[44px] text-[7px] font-mono text-neutral-600 uppercase text-right">1Q Chg</span>
        <span className="w-[44px] text-[7px] font-mono text-neutral-600 uppercase text-right">1Y Chg</span>
        <span className="w-[52px] text-[7px] font-mono text-neutral-600 uppercase text-right">Txn Vol</span>
        <span className="w-[56px] text-[7px] font-mono text-neutral-600 uppercase text-right pr-1">Outlook</span>
      </div>
      {capRates.map((c: any) => {
        const os = outlookStyle(c.outlook);
        return (
          <div key={c.propertyType} className="flex items-center px-2 py-[3px] border-b border-border/5 hover:bg-white/[0.02] transition-colors">
            <span className="w-[72px] text-[8px] font-mono font-bold text-pink-400 truncate">{c.propertyType}</span>
            <span className="w-[44px] text-[8px] font-mono text-right text-white font-bold">{fmtPct(c.capRate)}</span>
            <span className={`w-[44px] text-[8px] font-mono text-right ${changeColor(c.quarterChange)}`}>{fmtChgBp(c.quarterChange)} bp</span>
            <span className={`w-[44px] text-[8px] font-mono text-right ${changeColor(c.yearChange)}`}>{fmtChgBp(c.yearChange)} bp</span>
            <span className="w-[52px] text-[8px] font-mono text-right text-neutral-300">{fmtDollarB(c.transactionVol)}</span>
            <span className={`w-[56px] text-right pr-1`}>
              <span className={`px-1 py-px text-[7px] font-mono font-bold uppercase ${os.text} ${os.bg}`}>{c.outlook}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Pipeline Tab ──

function PipelineTab({ pipeline }: { pipeline: any[] }) {
  return (
    <div>
      <div className="flex items-center px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="w-[64px] text-[7px] font-mono text-neutral-600 uppercase">Borrower</span>
        <span className="w-[56px] text-[7px] font-mono text-neutral-600 uppercase">Prop Type</span>
        <span className="w-[52px] text-[7px] font-mono text-neutral-600 uppercase">Location</span>
        <span className="w-[44px] text-[7px] font-mono text-neutral-600 uppercase text-right">Size</span>
        <span className="w-[40px] text-[7px] font-mono text-neutral-600 uppercase text-right">Spread</span>
        <span className="w-[32px] text-[7px] font-mono text-neutral-600 uppercase text-right">LTV</span>
        <span className="w-[32px] text-[7px] font-mono text-neutral-600 uppercase text-right">DSCR</span>
        <span className="w-[56px] text-[7px] font-mono text-neutral-600 uppercase text-right pr-1">Status</span>
      </div>
      {pipeline.map((p: any, i: number) => {
        const ss = statusStyle(p.status);
        return (
          <div key={i} className="flex items-center px-2 py-[3px] border-b border-border/5 hover:bg-white/[0.02] transition-colors">
            <span className="w-[64px] text-[8px] font-mono font-bold text-pink-400 truncate">{p.borrower}</span>
            <span className="w-[56px] text-[8px] font-mono text-neutral-300 truncate">{p.propertyType}</span>
            <span className="w-[52px] text-[8px] font-mono text-neutral-500 truncate">{p.location}</span>
            <span className="w-[44px] text-[8px] font-mono text-right text-white font-bold">{fmtDollarM(p.dealSize)}</span>
            <span className="w-[40px] text-[8px] font-mono text-right text-neutral-300">{fmtBp(p.spread)} bp</span>
            <span className="w-[32px] text-[8px] font-mono text-right text-neutral-300">{p.ltv.toFixed(0)}%</span>
            <span className="w-[32px] text-[8px] font-mono text-right text-neutral-300">{p.dscr.toFixed(2)}x</span>
            <span className="w-[56px] text-right pr-1">
              <span className={`px-1 py-px text-[7px] font-mono font-bold uppercase ${ss.text} ${ss.bg}`}>{p.status}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Delinquency Tab ──

function DelinquencyTab({ delinquency }: { delinquency: any[] }) {
  const maxRate = Math.max(...delinquency.map((d: any) => d.rate), 1);

  return (
    <div>
      <div className="flex items-center px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="w-[72px] text-[7px] font-mono text-neutral-600 uppercase">Property Type</span>
        <span className="w-[40px] text-[7px] font-mono text-neutral-600 uppercase text-right">Rate</span>
        <span className="flex-1 text-[7px] font-mono text-neutral-600 uppercase text-center">Bar</span>
        <span className="w-[40px] text-[7px] font-mono text-neutral-600 uppercase text-right">1M Chg</span>
        <span className="w-[40px] text-[7px] font-mono text-neutral-600 uppercase text-right">1Y Chg</span>
        <span className="w-[48px] text-[7px] font-mono text-neutral-600 uppercase text-right pr-1">Spcl Svc</span>
      </div>
      {delinquency.map((d: any) => (
        <div key={d.propertyType} className="flex items-center px-2 py-[3px] border-b border-border/5 hover:bg-white/[0.02] transition-colors">
          <span className="w-[72px] text-[8px] font-mono font-bold text-pink-400 truncate">{d.propertyType}</span>
          <span className="w-[40px] text-[8px] font-mono text-right text-white font-bold">{fmtPct(d.rate)}</span>
          <div className="flex-1 px-2">
            <div className="h-2 bg-neutral-900 relative">
              <div
                className="absolute left-0 top-0 h-full bg-pink-400/30"
                style={{ width: `${(d.rate / maxRate) * 100}%` }}
              />
            </div>
          </div>
          <span className={`w-[40px] text-[8px] font-mono text-right ${changeColor(d.monthChange)}`}>{fmtChgPct(d.monthChange)}</span>
          <span className={`w-[40px] text-[8px] font-mono text-right ${changeColor(d.yearChange)}`}>{fmtChgPct(d.yearChange)}</span>
          <span className="w-[48px] text-[8px] font-mono text-right text-neutral-300 pr-1">{fmtPct(d.specialServicing)}</span>
        </div>
      ))}
    </div>
  );
}
