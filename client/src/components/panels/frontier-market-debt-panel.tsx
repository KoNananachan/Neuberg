import { useState } from 'react';
import { useFrontierMarketDebt } from '../../api/hooks/use-frontier-market-debt';
import { RefreshCw } from 'lucide-react';

// ── Formatting helpers ──

function fmtYield(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(2) + '%';
}

function fmtBps(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(0) + ' bps';
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(1) + '%';
}

function fmtPctSigned(n: number | null | undefined): string {
  if (n == null) return '--';
  const sign = (n ?? 0) >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

function fmtDollar(n: number | null | undefined): string {
  if (n == null) return '--';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(0) + 'M';
  return '$' + n.toFixed(0);
}

function fmtCds(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(0);
}

function fmtReserves(n: number | null | undefined): string {
  if (n == null) return '--';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'T';
  return '$' + n.toFixed(0) + 'B';
}

// ── Color helpers ──

function yieldColor(val: number): string {
  if (val > 12) return 'text-red-400';
  if (val > 8) return 'text-orange-400';
  if (val > 5) return 'text-amber-400';
  return 'text-green-400';
}

function spreadColor(val: number): string {
  if (val > 800) return 'text-red-400';
  if (val > 500) return 'text-orange-400';
  if (val > 300) return 'text-amber-400';
  return 'text-green-400';
}

function spreadChangeColor(val: number): string {
  if (val > 0) return 'text-red-400';
  if (val < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function cdsColor(spread: number): string {
  if (spread > 600) return 'text-red-400';
  if (spread > 300) return 'text-orange-400';
  if (spread > 150) return 'text-amber-400';
  return 'text-green-400';
}

function debtGdpColor(val: number): string {
  if (val > 100) return 'text-red-400';
  if (val > 70) return 'text-orange-400';
  if (val > 50) return 'text-amber-400';
  return 'text-green-400';
}

function currentAccountColor(val: number): string {
  if (val > 0) return 'text-green-400';
  if (val > -5) return 'text-amber-400';
  return 'text-red-400';
}

function recoveryColor(val: number): string {
  if (val >= 60) return 'text-green-400';
  if (val >= 40) return 'text-amber-400';
  return 'text-red-400';
}

function distressStatusColor(status: string): { text: string; bg: string } {
  const s = (status ?? '').toUpperCase();
  if (s.includes('DEFAULT') || s.includes('ARREARS')) return { text: 'text-red-400', bg: 'bg-red-500/15 border border-red-500/30' };
  if (s.includes('RESTRUCTUR')) return { text: 'text-orange-400', bg: 'bg-orange-400/15 border border-orange-400/30' };
  if (s.includes('IMF') || s.includes('PROGRAM')) return { text: 'text-yellow-400', bg: 'bg-yellow-400/15 border border-yellow-400/30' };
  if (s.includes('WATCH') || s.includes('RISK')) return { text: 'text-amber-400', bg: 'bg-amber-400/15 border border-amber-400/30' };
  return { text: 'text-neutral-400', bg: 'bg-neutral-400/10 border border-neutral-400/30' };
}

function flowChangeColor(val: number): string {
  if (val > 0) return 'text-green-400';
  if (val < 0) return 'text-red-400';
  return 'text-neutral-500';
}

// ── Constants ──

const ACCENT = '#f59e0b'; // amber-500
const ACCENT_DIM = 'rgba(245,158,11,0.08)';

type Tab = 'sovereigns' | 'issuance' | 'distressed' | 'flows';

// ── Table header cell ──

function ThCell({ label, align }: { label: string; align: 'left' | 'right' }) {
  return (
    <th
      className={`px-1.5 py-1 text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {label}
    </th>
  );
}

// ── Sovereigns Tab ──

function SovereignsTable({ sovereigns }: { sovereigns: any[] }) {
  const items = Array.isArray(sovereigns) ? sovereigns : [];
  if (items.length === 0) {
    return (
      <div className="text-center py-6 text-neutral-600 text-[9px] font-mono uppercase">
        No sovereign data available
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-[#080808] z-10">
          <tr className="border-b border-border/20">
            <ThCell label="Country" align="left" />
            <ThCell label="Region" align="left" />
            <ThCell label="Rating" align="left" />
            <ThCell label="10Y Yield" align="right" />
            <ThCell label="Spread" align="right" />
            <ThCell label="CDS 5Y" align="right" />
            <ThCell label="Debt/GDP" align="right" />
            <ThCell label="FX Reserves" align="right" />
            <ThCell label="Curr Acct" align="right" />
            <ThCell label="IMF" align="left" />
          </tr>
        </thead>
        <tbody>
          {items.map((c: any, idx: number) => {
            const isDistressed = (c.spread ?? 0) > 800 || (c.cds5y ?? 0) > 600;
            return (
              <tr
                key={c.country ?? c.isoCode ?? idx}
                className={`border-b border-border/10 hover:bg-amber-500/[0.03] transition-colors ${
                  isDistressed ? 'bg-red-500/[0.06]' : ''
                }`}
              >
                <td className="px-1.5 py-1 whitespace-nowrap text-left">
                  <span className="text-amber-400 font-bold">{c.isoCode ?? ''}</span>
                  <span className="text-neutral-600 ml-1">{c.country ?? ''}</span>
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-neutral-400">{c.region ?? '--'}</td>
                <td className="px-1.5 py-1 whitespace-nowrap">
                  <span className={`text-[7px] font-bold px-1 py-0.5 ${
                    (c.rating ?? '').startsWith('B') && !(c.rating ?? '').startsWith('BB')
                      ? 'text-red-400 bg-red-400/10'
                      : (c.rating ?? '').startsWith('CCC') || (c.rating ?? '').startsWith('CC') || c.rating === 'C' || c.rating === 'D'
                      ? 'text-red-500 bg-red-500/10'
                      : (c.rating ?? '').startsWith('BB')
                      ? 'text-orange-400 bg-orange-400/10'
                      : 'text-neutral-300 bg-neutral-400/10'
                  }`}>
                    {c.rating ?? '--'}
                  </span>
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${yieldColor(c.yield10y ?? 0)}`}>
                  {fmtYield(c.yield10y)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${spreadColor(c.spread ?? 0)}`}>
                  {fmtBps(c.spread)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right ${cdsColor(c.cds5y ?? 0)}`}>
                  {fmtCds(c.cds5y)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right ${debtGdpColor(c.debtToGdp ?? 0)}`}>
                  {fmtPct(c.debtToGdp)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
                  {fmtReserves(c.fxReserves)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right ${currentAccountColor(c.currentAccount ?? 0)}`}>
                  {fmtPctSigned(c.currentAccount)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap">
                  {c.imfProgram ? (
                    <span className="text-[7px] font-bold px-1 py-0.5 text-yellow-400 bg-yellow-400/10 border border-yellow-400/30">
                      {c.imfProgram}
                    </span>
                  ) : (
                    <span className="text-neutral-600">--</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Issuance Tab ──

function IssuanceTable({ issuance }: { issuance: any[] }) {
  const items = Array.isArray(issuance) ? issuance : [];
  if (items.length === 0) {
    return (
      <div className="text-center py-6 text-neutral-600 text-[9px] font-mono uppercase">
        No issuance data available
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-[#080808] z-10">
          <tr className="border-b border-border/20">
            <ThCell label="Issuer" align="left" />
            <ThCell label="Country" align="left" />
            <ThCell label="Currency" align="left" />
            <ThCell label="Size" align="right" />
            <ThCell label="Coupon" align="right" />
            <ThCell label="Maturity" align="left" />
            <ThCell label="Yield" align="right" />
            <ThCell label="Spread" align="right" />
            <ThCell label="Rating" align="left" />
            <ThCell label="Date" align="left" />
          </tr>
        </thead>
        <tbody>
          {items.map((issue: any, idx: number) => (
            <tr
              key={issue.issuer ?? idx}
              className="border-b border-border/10 hover:bg-amber-500/[0.03] transition-colors"
            >
              <td className="px-1.5 py-1 whitespace-nowrap text-white font-bold">{issue.issuer ?? '--'}</td>
              <td className="px-1.5 py-1 whitespace-nowrap">
                <span className="text-amber-400 font-bold">{issue.country ?? '--'}</span>
              </td>
              <td className="px-1.5 py-1 whitespace-nowrap text-neutral-400">{issue.currency ?? '--'}</td>
              <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">{fmtDollar(issue.size)}</td>
              <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">{fmtPct(issue.coupon)}</td>
              <td className="px-1.5 py-1 whitespace-nowrap text-neutral-400">{issue.maturity ?? '--'}</td>
              <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${yieldColor(issue.yield ?? 0)}`}>
                {fmtYield(issue.yield)}
              </td>
              <td className={`px-1.5 py-1 whitespace-nowrap text-right ${spreadColor(issue.spread ?? 0)}`}>
                {fmtBps(issue.spread)}
              </td>
              <td className="px-1.5 py-1 whitespace-nowrap">
                <span className="text-[7px] font-bold px-1 py-0.5 text-neutral-300 bg-neutral-400/10">
                  {issue.rating ?? '--'}
                </span>
              </td>
              <td className="px-1.5 py-1 whitespace-nowrap text-neutral-500">{issue.date ?? '--'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Distressed Tab ──

function DistressedTable({ distressed }: { distressed: any[] }) {
  const items = Array.isArray(distressed) ? distressed : [];
  if (items.length === 0) {
    return (
      <div className="text-center py-6 text-neutral-600 text-[9px] font-mono uppercase">
        No distressed data available
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-[#080808] z-10">
          <tr className="border-b border-border/20">
            <ThCell label="Country" align="left" />
            <ThCell label="Status" align="left" />
            <ThCell label="Debt Outstanding" align="right" />
            <ThCell label="Bond Price" align="right" />
            <ThCell label="Yield" align="right" />
            <ThCell label="CDS 5Y" align="right" />
            <ThCell label="Recovery Est" align="right" />
            <ThCell label="Next Event" align="left" />
          </tr>
        </thead>
        <tbody>
          {items.map((d: any, idx: number) => {
            const status = distressStatusColor(d.status ?? '');
            return (
              <tr
                key={d.country ?? d.isoCode ?? idx}
                className="border-b border-border/10 bg-red-500/[0.04] hover:bg-red-500/[0.08] transition-colors"
              >
                <td className="px-1.5 py-1 whitespace-nowrap text-left">
                  <span className="text-red-400 font-bold">{d.isoCode ?? ''}</span>
                  <span className="text-neutral-500 ml-1">{d.country ?? ''}</span>
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap">
                  <span className={`text-[7px] font-bold px-1 py-0.5 uppercase ${status.text} ${status.bg}`}>
                    {d.status ?? '--'}
                  </span>
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
                  {fmtDollar(d.debtOutstanding)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${
                  (d.bondPrice ?? 100) < 50 ? 'text-red-400' : (d.bondPrice ?? 100) < 70 ? 'text-orange-400' : 'text-neutral-300'
                }`}>
                  {d.bondPrice != null ? d.bondPrice.toFixed(2) : '--'}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${yieldColor(d.yield ?? 0)}`}>
                  {fmtYield(d.yield)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right ${cdsColor(d.cds5y ?? 0)}`}>
                  {fmtCds(d.cds5y)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${recoveryColor(d.recoveryEstimate ?? 0)}`}>
                  {fmtPct(d.recoveryEstimate)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-neutral-400 max-w-[140px] truncate">
                  {d.nextEvent ?? '--'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Flows Tab ──

function FlowsSection({ flows }: { flows: any }) {
  const regions = Array.isArray(flows?.regions) ? flows.regions : [];
  const fundFlows = Array.isArray(flows?.fundFlows) ? flows.fundFlows : [];

  return (
    <div>
      {/* Regional Aggregates */}
      {regions.length > 0 && (
        <div className="border-b border-border/20">
          <div className="flex items-center gap-1.5 px-2 py-1 border-b border-amber-500/30">
            <div className="w-1 h-1 shrink-0 bg-amber-400" />
            <span className="text-[7px] font-black font-mono uppercase tracking-widest text-amber-400">
              Regional Aggregates
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[9px] font-mono">
              <thead className="sticky top-0 bg-[#080808] z-10">
                <tr className="border-b border-border/20">
                  <ThCell label="Region" align="left" />
                  <ThCell label="Total Debt" align="right" />
                  <ThCell label="Avg Yield" align="right" />
                  <ThCell label="Avg Spread" align="right" />
                  <ThCell label="Spread Chg 1W" align="right" />
                  <ThCell label="Avg CDS" align="right" />
                  <ThCell label="Inflows MTD" align="right" />
                </tr>
              </thead>
              <tbody>
                {regions.map((r: any, idx: number) => (
                  <tr
                    key={r.region ?? idx}
                    className="border-b border-border/10 hover:bg-amber-500/[0.03] transition-colors"
                  >
                    <td className="px-1.5 py-1 whitespace-nowrap text-amber-400 font-bold">{r.region ?? '--'}</td>
                    <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">{fmtDollar(r.totalDebt)}</td>
                    <td className={`px-1.5 py-1 whitespace-nowrap text-right ${yieldColor(r.avgYield ?? 0)}`}>
                      {fmtYield(r.avgYield)}
                    </td>
                    <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${spreadColor(r.avgSpread ?? 0)}`}>
                      {fmtBps(r.avgSpread)}
                    </td>
                    <td className={`px-1.5 py-1 whitespace-nowrap text-right ${spreadChangeColor(r.spreadChange1w ?? 0)}`}>
                      {r.spreadChange1w != null ? (r.spreadChange1w > 0 ? '+' : '') + r.spreadChange1w.toFixed(0) + ' bps' : '--'}
                    </td>
                    <td className={`px-1.5 py-1 whitespace-nowrap text-right ${cdsColor(r.avgCds ?? 0)}`}>
                      {fmtCds(r.avgCds)}
                    </td>
                    <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${flowChangeColor(r.inflowsMtd ?? 0)}`}>
                      {fmtDollar(r.inflowsMtd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Fund Flows */}
      {fundFlows.length > 0 && (
        <div className="border-b border-border/20">
          <div className="flex items-center gap-1.5 px-2 py-1 border-b border-amber-500/30">
            <div className="w-1 h-1 shrink-0 bg-amber-400" />
            <span className="text-[7px] font-black font-mono uppercase tracking-widest text-amber-400">
              Fund Flows
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[9px] font-mono">
              <thead className="sticky top-0 bg-[#080808] z-10">
                <tr className="border-b border-border/20">
                  <ThCell label="Fund / Category" align="left" />
                  <ThCell label="AUM" align="right" />
                  <ThCell label="1W Flow" align="right" />
                  <ThCell label="1M Flow" align="right" />
                  <ThCell label="YTD Flow" align="right" />
                  <ThCell label="YTD Return" align="right" />
                </tr>
              </thead>
              <tbody>
                {fundFlows.map((f: any, idx: number) => (
                  <tr
                    key={f.name ?? idx}
                    className="border-b border-border/10 hover:bg-amber-500/[0.03] transition-colors"
                  >
                    <td className="px-1.5 py-1 whitespace-nowrap text-white font-bold">{f.name ?? '--'}</td>
                    <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">{fmtDollar(f.aum)}</td>
                    <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${flowChangeColor(f.flow1w ?? 0)}`}>
                      {fmtDollar(f.flow1w)}
                    </td>
                    <td className={`px-1.5 py-1 whitespace-nowrap text-right ${flowChangeColor(f.flow1m ?? 0)}`}>
                      {fmtDollar(f.flow1m)}
                    </td>
                    <td className={`px-1.5 py-1 whitespace-nowrap text-right ${flowChangeColor(f.flowYtd ?? 0)}`}>
                      {fmtDollar(f.flowYtd)}
                    </td>
                    <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${
                      (f.returnYtd ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {fmtPctSigned(f.returnYtd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {regions.length === 0 && fundFlows.length === 0 && (
        <div className="text-center py-6 text-neutral-600 text-[9px] font-mono uppercase">
          No flow data available
        </div>
      )}
    </div>
  );
}

// ── Main Panel ──

export function FrontierMarketDebtPanel() {
  const { data, isLoading, refetch } = useFrontierMarketDebt();
  const [tab, setTab] = useState<Tab>('sovereigns');

  const d = data as any;

  if (isLoading && !d) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-amber-400 uppercase tracking-widest animate-pulse">
          Loading frontier debt data...
        </div>
      </div>
    );
  }

  if (!data && !isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-red-400/60 uppercase tracking-widest">
          Failed to load frontier debt data
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'sovereigns', label: 'SOVEREIGNS' },
    { key: 'issuance', label: 'ISSUANCE' },
    { key: 'distressed', label: 'DISTRESSED' },
    { key: 'flows', label: 'FLOWS' },
  ];

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-amber-500/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-amber-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-amber-400">
            Frontier Market Debt
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-amber-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tab navigation */}
      <div className="flex items-center gap-0 border-b border-border/20 shrink-0">
        {tabs.map(t => (
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

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {tab === 'sovereigns' && (
          <SovereignsTable sovereigns={d?.sovereigns ?? d?.countries ?? []} />
        )}

        {tab === 'issuance' && (
          <IssuanceTable issuance={d?.issuance ?? d?.newIssues ?? []} />
        )}

        {tab === 'distressed' && (
          <DistressedTable distressed={d?.distressed ?? d?.restructuring ?? []} />
        )}

        {tab === 'flows' && (
          <FlowsSection flows={d?.flows ?? d} />
        )}
      </div>
    </div>
  );
}
