import { useState } from 'react';
import { useEquityLinkedNotes } from '../../api/hooks/use-equity-linked-notes';

const ACCENT = '#e879f9'; // fuchsia-400
const ACCENT_DIM = 'rgba(232,121,249,0.08)';

type Tab = 'notes' | 'underlying' | 'issuance' | 'risk';

// -- Formatting helpers --

function fmtPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtDollarB(n: number): string {
  return `$${n.toFixed(1)}B`;
}

function fmtDollarM(n: number): string {
  return `$${n.toFixed(1)}M`;
}

// -- Color helpers --

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function distToBarrierColor(dist: number): string {
  if (dist > 20) return 'text-green-400';
  if (dist >= 10) return 'text-yellow-400';
  return 'text-red-400';
}

function statusStyle(status: string): { text: string; bg: string } {
  const s = status.toLowerCase();
  if (s === 'performing') return { text: 'text-green-400', bg: 'bg-green-500/15 border-green-500/30' };
  if (s === 'at risk') return { text: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/30' };
  if (s === 'breached') return { text: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30' };
  if (s === 'matured') return { text: 'text-neutral-400', bg: 'bg-neutral-500/15 border-neutral-500/30' };
  if (s === 'called') return { text: 'text-blue-400', bg: 'bg-blue-500/15 border-blue-500/30' };
  return { text: 'text-neutral-400', bg: 'bg-neutral-500/15 border-neutral-500/30' };
}

function barrierRiskStyle(risk: string): { text: string; bg: string } {
  const r = risk.toLowerCase();
  if (r === 'high') return { text: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30' };
  if (r === 'medium') return { text: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/30' };
  if (r === 'low') return { text: 'text-green-400', bg: 'bg-green-500/15 border-green-500/30' };
  return { text: 'text-neutral-400', bg: 'bg-neutral-500/15 border-neutral-500/30' };
}

// -- Main Panel --

export function EquityLinkedNotesPanel() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, isLoading, error } = useEquityLinkedNotes() as { data: any; isLoading: boolean; error: any };
  const [tab, setTab] = useState<Tab>('notes');

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">
          Loading equity-linked notes...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-bearish/60 uppercase tracking-widest">
          Failed to load data
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'notes', label: 'NOTES' },
    { key: 'underlying', label: 'UNDERLYING' },
    { key: 'issuance', label: 'ISSUANCE' },
    { key: 'risk', label: 'RISK' },
  ];

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Summary bar */}
      <div className="grid grid-cols-5 gap-0 border-b border-border/10 px-3 py-2 shrink-0">
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">Outstanding</div>
          <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>
            {fmtDollarB(data.summary?.outstanding ?? 0)}
          </div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">New Issuance YTD</div>
          <div className="text-[11px] font-mono font-black text-white/80">
            {data.summary?.newIssuanceYTD ?? 0}
          </div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">Avg Yield</div>
          <div className="text-[11px] font-mono font-black text-white/60">
            {data.summary?.avgYield?.toFixed(2) ?? '--'}%
          </div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">Avg Barrier</div>
          <div className="text-[11px] font-mono font-black text-white/60">
            {data.summary?.avgBarrier?.toFixed(1) ?? '--'}%
          </div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">At Risk</div>
          <div className="text-[11px] font-mono font-black text-red-400">
            {data.summary?.atRisk ?? 0}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 border-b border-border/20 shrink-0">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-3 py-2 text-[9px] font-mono font-bold uppercase tracking-wider transition-colors"
            style={{
              color: tab === t.key ? ACCENT : 'rgba(255,255,255,0.35)',
              borderBottom: tab === t.key ? `1px solid ${ACCENT}` : '1px solid transparent',
              background: tab === t.key ? ACCENT_DIM : 'transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {tab === 'notes' && <NotesTab notes={data.notes} />}
        {tab === 'underlying' && <UnderlyingTab underlyings={data.underlyings} />}
        {tab === 'issuance' && <IssuanceTab issuance={data.issuance} />}
        {tab === 'risk' && <RiskTab risk={data.risk} />}
      </div>
    </div>
  );
}

// -- Notes Tab --

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function NotesTab({ notes }: { notes: any[] }) {
  if (!notes?.length) {
    return (
      <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">
        No notes available
      </div>
    );
  }

  return (
    <table className="w-full text-[9px] font-mono">
      <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
        <tr>
          <th className="px-2 py-1.5 text-left font-bold">Name</th>
          <th className="px-2 py-1.5 text-left font-bold">Underlying</th>
          <th className="px-2 py-1.5 text-left font-bold">Issuer</th>
          <th className="px-2 py-1.5 text-right font-bold">Coupon %</th>
          <th className="px-2 py-1.5 text-right font-bold">Barrier %</th>
          <th className="px-2 py-1.5 text-right font-bold">Dist to Barrier</th>
          <th className="px-2 py-1.5 text-right font-bold">Ind. Value</th>
          <th className="px-2 py-1.5 text-right font-bold">Status</th>
        </tr>
      </thead>
      <tbody>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {notes.map((n: any, i: number) => {
          const ss = statusStyle(n.status ?? '');
          return (
            <tr key={n.id ?? i} className="border-b border-border/5 hover:bg-white/[0.02]">
              <td className="px-2 py-1.5">
                <span className="font-bold" style={{ color: ACCENT }}>{n.name}</span>
              </td>
              <td className="px-2 py-1.5 text-white/60">{n.underlying}</td>
              <td className="px-2 py-1.5 text-white/50">{n.issuer}</td>
              <td className="px-2 py-1.5 text-right text-white/80 font-bold">
                {n.coupon?.toFixed(2) ?? '--'}%
              </td>
              <td className="px-2 py-1.5 text-right text-white/60">
                {n.barrier?.toFixed(1) ?? '--'}%
              </td>
              <td className={`px-2 py-1.5 text-right font-bold ${distToBarrierColor(n.distToBarrier ?? 0)}`}>
                {n.distToBarrier?.toFixed(1) ?? '--'}%
              </td>
              <td className="px-2 py-1.5 text-right text-white/80 font-bold">
                {n.indicativeValue?.toFixed(1) ?? '--'}%
              </td>
              <td className="px-2 py-1.5 text-right">
                <span className={`text-[7px] font-bold px-1 py-0 border uppercase ${ss.text} ${ss.bg}`}>
                  {n.status}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// -- Underlying Tab --

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function UnderlyingTab({ underlyings }: { underlyings: any[] }) {
  if (!underlyings?.length) {
    return (
      <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">
        No underlying data available
      </div>
    );
  }

  return (
    <table className="w-full text-[9px] font-mono">
      <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
        <tr>
          <th className="px-2 py-1.5 text-left font-bold">Symbol</th>
          <th className="px-2 py-1.5 text-right font-bold">Price</th>
          <th className="px-2 py-1.5 text-right font-bold">1D Chg %</th>
          <th className="px-2 py-1.5 text-right font-bold">1M Chg %</th>
          <th className="px-2 py-1.5 text-right font-bold">Linked Notes</th>
          <th className="px-2 py-1.5 text-right font-bold">Avg Dist to Barrier</th>
          <th className="px-2 py-1.5 text-left font-bold">Worst Case Note</th>
        </tr>
      </thead>
      <tbody>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {underlyings.map((u: any, i: number) => (
          <tr key={u.symbol ?? i} className="border-b border-border/5 hover:bg-white/[0.02]">
            <td className="px-2 py-1.5">
              <span className="font-bold" style={{ color: ACCENT }}>{u.symbol}</span>
            </td>
            <td className="px-2 py-1.5 text-right text-white/80 font-bold">
              ${u.price?.toFixed(2) ?? '--'}
            </td>
            <td className={`px-2 py-1.5 text-right font-bold ${changeColor(u.change1D ?? 0)}`}>
              {fmtPct(u.change1D ?? 0)}
            </td>
            <td className={`px-2 py-1.5 text-right font-bold ${changeColor(u.change1M ?? 0)}`}>
              {fmtPct(u.change1M ?? 0)}
            </td>
            <td className="px-2 py-1.5 text-right text-white/60">
              {u.linkedNotes ?? 0}
            </td>
            <td className={`px-2 py-1.5 text-right font-bold ${distToBarrierColor(u.avgDistToBarrier ?? 0)}`}>
              {u.avgDistToBarrier?.toFixed(1) ?? '--'}%
            </td>
            <td className="px-2 py-1.5 text-white/50">
              {u.worstCaseNote ?? '--'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// -- Issuance Tab --

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function IssuanceTab({ issuance }: { issuance: any[] }) {
  if (!issuance?.length) {
    return (
      <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">
        No issuance data available
      </div>
    );
  }

  const maxNotional = Math.max(...issuance.map((m: any) => m.totalNotional ?? 0), 1);

  return (
    <div className="p-3 space-y-3">
      <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider mb-2">
        6-Month Issuance Summary
      </div>

      <table className="w-full text-[9px] font-mono">
        <thead className="text-neutral/50 uppercase tracking-wider border-b border-border/10">
          <tr>
            <th className="px-2 py-1.5 text-left font-bold">Month</th>
            <th className="px-2 py-1.5 text-right font-bold">Count</th>
            <th className="px-2 py-1.5 text-right font-bold">Total Notional</th>
            <th className="px-2 py-1.5 text-right font-bold">Avg Coupon</th>
            <th className="px-2 py-1.5 text-right font-bold">Avg Barrier</th>
          </tr>
        </thead>
        <tbody>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {issuance.map((m: any, i: number) => (
            <tr key={m.month ?? i} className="border-b border-border/5 hover:bg-white/[0.02]">
              <td className="px-2 py-1.5">
                <span className="font-bold" style={{ color: ACCENT }}>{m.month}</span>
              </td>
              <td className="px-2 py-1.5 text-right text-white/60">{m.count ?? 0}</td>
              <td className="px-2 py-1.5 text-right text-white/80 font-bold">
                {fmtDollarM(m.totalNotional ?? 0)}
              </td>
              <td className="px-2 py-1.5 text-right text-white/60">
                {m.avgCoupon?.toFixed(2) ?? '--'}%
              </td>
              <td className="px-2 py-1.5 text-right text-white/60">
                {m.avgBarrier?.toFixed(1) ?? '--'}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Bar chart for notional */}
      <div className="mt-4">
        <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider mb-2">
          Monthly Notional ($M)
        </div>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {issuance.map((m: any, i: number) => (
          <div key={m.month ?? i} className="flex items-center gap-2 py-0.5">
            <span className="text-[8px] font-mono w-12 text-right" style={{ color: ACCENT }}>
              {m.month}
            </span>
            <div className="flex-1 h-2.5 bg-white/5 overflow-hidden">
              <div
                style={{
                  width: `${((m.totalNotional ?? 0) / maxNotional) * 100}%`,
                  height: '100%',
                  background: ACCENT,
                  opacity: 0.4,
                }}
              />
            </div>
            <span className="text-[8px] font-mono text-white/50 w-14 text-right">
              {fmtDollarM(m.totalNotional ?? 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// -- Risk Tab --

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RiskTab({ risk }: { risk: any[] }) {
  if (!risk?.length) {
    return (
      <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">
        No risk data available
      </div>
    );
  }

  return (
    <table className="w-full text-[9px] font-mono">
      <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
        <tr>
          <th className="px-2 py-1.5 text-left font-bold">Name</th>
          <th className="px-2 py-1.5 text-right font-bold">Delta</th>
          <th className="px-2 py-1.5 text-right font-bold">Gamma</th>
          <th className="px-2 py-1.5 text-right font-bold">Vega</th>
          <th className="px-2 py-1.5 text-right font-bold">Barrier Risk</th>
          <th className="px-2 py-1.5 text-right font-bold">Days to Maturity</th>
        </tr>
      </thead>
      <tbody>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {risk.map((r: any, i: number) => {
          const br = barrierRiskStyle(r.barrierRisk ?? '');
          return (
            <tr key={r.id ?? i} className="border-b border-border/5 hover:bg-white/[0.02]">
              <td className="px-2 py-1.5">
                <span className="font-bold" style={{ color: ACCENT }}>{r.name}</span>
              </td>
              <td className="px-2 py-1.5 text-right text-white/80 font-bold">
                {r.delta?.toFixed(3) ?? '--'}
              </td>
              <td className="px-2 py-1.5 text-right text-white/50">
                {r.gamma?.toFixed(4) ?? '--'}
              </td>
              <td className="px-2 py-1.5 text-right text-white/50">
                {r.vega?.toFixed(3) ?? '--'}
              </td>
              <td className="px-2 py-1.5 text-right">
                <span className={`text-[7px] font-bold px-1 py-0 border uppercase ${br.text} ${br.bg}`}>
                  {r.barrierRisk}
                </span>
              </td>
              <td className="px-2 py-1.5 text-right text-white/60">
                {r.daysToMaturity ?? '--'}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
