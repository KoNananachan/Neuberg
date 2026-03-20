import { useState } from 'react';
import { useCommodityFundamental } from '../../api/hooks/use-commodity-fundamental';
import { useT, tr, TFn } from '../../i18n';

const ACCENT = '#a3e635'; // lime-400
const ACCENT_DIM = 'rgba(163,230,53,0.08)';

type Tab = 'sd' | 'inventory' | 'opec' | 'production' | 'valuation';

// ── Formatting helpers ──

function fmtNumber(n: number): string {
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (Math.abs(n) >= 1e3) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return n.toFixed(2);
}

function fmtPct(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}

function fmtPrice(n: number): string {
  if (n >= 1000) return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (n >= 10) return n.toFixed(2);
  return n.toFixed(4);
}

// ── Main Panel ──

export function CommodityFundamentalPanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = useCommodityFundamental();
  const [tab, setTab] = useState<Tab>('sd');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'sd', label: 'S/D BALANCE' },
    { key: 'inventory', label: 'INVENTORY' },
    { key: 'opec', label: 'OPEC' },
    { key: 'production', label: 'PRODUCTION' },
    { key: 'valuation', label: 'VALUATION' },
  ];

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-2">
          <div className="w-4 h-4 border border-lime-400/40 border-t-lime-400 animate-spin" />
          <div className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest animate-pulse">
            {tr(t, 'loadingCommodityData', 'LOADING COMMODITY DATA...')}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-black gap-2">
        <div className="text-[9px] font-mono text-red-400/60 uppercase tracking-widest">
          FAILED TO LOAD
        </div>
        <button
          onClick={() => refetch()}
          className="px-3 py-1 text-[8px] font-mono font-bold uppercase tracking-wider text-lime-400 border border-lime-400/30 hover:bg-lime-400/10 transition-colors"
        >
          RETRY
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center gap-0 border-b border-border/20 shrink-0">
        {tabs.map((tb: any) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className="px-3 py-2 text-[9px] font-mono font-bold uppercase tracking-wider transition-colors"
            style={{
              color: tab === tb.key ? ACCENT : 'rgba(255,255,255,0.35)',
              borderBottom: tab === tb.key ? `1px solid ${ACCENT}` : '1px solid transparent',
              background: tab === tb.key ? ACCENT_DIM : 'transparent',
            }}
          >
            {tb.label}
          </button>
        ))}
        <div className="flex-1" />
        <div className="px-3 text-[8px] font-mono text-neutral-600">
          {data.timestamp
            ? new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : ''}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {tab === 'sd' && <SDBalanceTable rows={data.supplyDemand || []} />}
        {tab === 'inventory' && <InventoryTable rows={data.inventory || []} />}
        {tab === 'opec' && <OpecSection data={data.opec || {}} />}
        {tab === 'production' && <ProductionTable rows={data.production || []} />}
        {tab === 'valuation' && <ValuationTable rows={data.valuation || []} />}
      </div>
    </div>
  );
}

// ── S/D Balance Table ──

function SDBalanceTable({ rows }: { rows: any[] }) {
  return (
    <table className="w-full text-[9px] font-mono">
      <thead className="sticky top-0 bg-black/95 text-[7px] font-black text-neutral-500 uppercase tracking-wider border-b border-border/10">
        <tr>
          <th className="px-2 py-1.5 text-left">COMMODITY</th>
          <th className="px-2 py-1.5 text-right">SUPPLY</th>
          <th className="px-2 py-1.5 text-right">DEMAND</th>
          <th className="px-2 py-1.5 text-right">BALANCE</th>
          <th className="px-2 py-1.5 text-right">SUPPLY YOY</th>
          <th className="px-2 py-1.5 text-right">DEMAND YOY</th>
          <th className="px-2 py-1.5 text-right">BALANCE YOY</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r: any) => {
          const isSurplus = r.balance >= 0;
          return (
            <tr key={r.commodity} className="border-b border-border/5 hover:bg-lime-400/[0.02] transition-colors">
              <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{r.commodity}</td>
              <td className="px-2 py-1.5 text-right text-white/80">{fmtNumber(r.supply)}</td>
              <td className="px-2 py-1.5 text-right text-white/80">{fmtNumber(r.demand)}</td>
              <td className={`px-2 py-1.5 text-right font-bold ${isSurplus ? 'text-green-400' : 'text-red-400'}`}>
                {isSurplus ? '+' : ''}{fmtNumber(r.balance)}
              </td>
              <td className={`px-2 py-1.5 text-right ${r.supplyYoY >= 0 ? 'text-green-400/70' : 'text-red-400/70'}`}>
                {r.supplyYoY >= 0 ? '\u25B2' : '\u25BC'} {fmtPct(r.supplyYoY)}
              </td>
              <td className={`px-2 py-1.5 text-right ${r.demandYoY >= 0 ? 'text-green-400/70' : 'text-red-400/70'}`}>
                {r.demandYoY >= 0 ? '\u25B2' : '\u25BC'} {fmtPct(r.demandYoY)}
              </td>
              <td className={`px-2 py-1.5 text-right ${r.balanceYoY >= 0 ? 'text-green-400/70' : 'text-red-400/70'}`}>
                {r.balanceYoY >= 0 ? '\u25B2' : '\u25BC'} {fmtPct(r.balanceYoY)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ── Inventory Table ──

function InventoryTable({ rows }: { rows: any[] }) {
  return (
    <table className="w-full text-[9px] font-mono">
      <thead className="sticky top-0 bg-black/95 text-[7px] font-black text-neutral-500 uppercase tracking-wider border-b border-border/10">
        <tr>
          <th className="px-2 py-1.5 text-left">COMMODITY</th>
          <th className="px-2 py-1.5 text-right">CURRENT</th>
          <th className="px-2 py-1.5 text-right">5Y AVG</th>
          <th className="px-2 py-1.5 text-center">% OF AVG</th>
          <th className="px-2 py-1.5 text-right">WK CHG</th>
          <th className="px-2 py-1.5 text-right">DAYS SUPPLY</th>
          <th className="px-2 py-1.5 text-center">TREND</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r: any) => {
          const pctOfAvg = r.fiveYearAvg > 0 ? (r.current / r.fiveYearAvg) * 100 : 100;
          const isBelowAvg = pctOfAvg < 100;
          const barWidth = Math.min(pctOfAvg, 150);
          return (
            <tr key={r.commodity} className="border-b border-border/5 hover:bg-lime-400/[0.02] transition-colors">
              <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{r.commodity}</td>
              <td className="px-2 py-1.5 text-right text-white/80 font-bold">{fmtNumber(r.current)}</td>
              <td className="px-2 py-1.5 text-right text-white/40">{fmtNumber(r.fiveYearAvg)}</td>
              <td className="px-2 py-1.5">
                <div className="flex items-center gap-1.5 justify-center">
                  <div className="w-16 h-2 bg-white/[0.04] relative">
                    <div
                      className={`h-full ${isBelowAvg ? 'bg-green-500' : 'bg-red-500'} transition-all`}
                      style={{ width: `${Math.min((barWidth / 150) * 100, 100)}%` }}
                    />
                  </div>
                  <span className={`text-[7px] font-bold ${isBelowAvg ? 'text-green-400' : 'text-red-400'}`}>
                    {pctOfAvg.toFixed(0)}%
                  </span>
                </div>
              </td>
              <td className={`px-2 py-1.5 text-right font-bold ${r.weeklyChange >= 0 ? 'text-green-400/70' : 'text-red-400/70'}`}>
                {r.weeklyChange >= 0 ? '+' : ''}{fmtNumber(r.weeklyChange)}
              </td>
              <td className="px-2 py-1.5 text-right text-white/60">{r.daysOfSupply?.toFixed(1) ?? '--'}</td>
              <td className="px-2 py-1.5 text-center">
                <TrendBadge trend={r.trend} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ── Trend Badge ──

function TrendBadge({ trend }: { trend: string }) {
  let bgClass = 'bg-neutral-500/15 border-neutral-500/30';
  let textClass = 'text-neutral-400';
  const label = (trend || 'FLAT').toUpperCase();

  if (label === 'DRAWING' || label === 'BULLISH' || label === 'TIGHTENING') {
    bgClass = 'bg-green-500/15 border-green-500/30';
    textClass = 'text-green-400';
  } else if (label === 'BUILDING' || label === 'BEARISH' || label === 'LOOSENING') {
    bgClass = 'bg-red-500/15 border-red-500/30';
    textClass = 'text-red-400';
  }

  return (
    <span className={`px-1.5 py-0.5 text-[6px] font-mono font-black uppercase tracking-wider border ${bgClass} ${textClass}`}>
      {label}
    </span>
  );
}

// ── OPEC Section ──

function OpecSection({ data }: { data: any }) {
  const summary = data.summary || {};
  const countries = data.countries || [];

  return (
    <div className="flex flex-col">
      {/* OPEC Summary */}
      <div className="grid grid-cols-3 border-b border-border/20 bg-black/40 shrink-0">
        <SummaryCell label="TOTAL PRODUCTION" value={summary.totalProduction ? fmtNumber(summary.totalProduction) + ' MB/D' : '--'} />
        <SummaryCell label="QUOTA" value={summary.quota ? fmtNumber(summary.quota) + ' MB/D' : '--'} />
        <div className="px-2 py-1.5 border-r border-border/10 last:border-r-0">
          <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider font-black">COMPLIANCE</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="flex-1 h-2 bg-white/[0.04] relative">
              <div
                className="h-full bg-lime-400 transition-all"
                style={{ width: `${Math.min(summary.compliancePct || 0, 100)}%` }}
              />
            </div>
            <span className="text-[9px] font-mono font-bold text-white/80">
              {summary.compliancePct?.toFixed(1) ?? '--'}%
            </span>
          </div>
        </div>
      </div>

      {/* Country breakdown */}
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-black/95 text-[7px] font-black text-neutral-500 uppercase tracking-wider border-b border-border/10">
          <tr>
            <th className="px-2 py-1.5 text-left">COUNTRY</th>
            <th className="px-2 py-1.5 text-right">PRODUCTION</th>
            <th className="px-2 py-1.5 text-right">QUOTA</th>
            <th className="px-2 py-1.5 text-right">DIFF</th>
            <th className="px-2 py-1.5 text-center">COMPLIANCE</th>
            <th className="px-2 py-1.5 text-right">MOM CHG</th>
          </tr>
        </thead>
        <tbody>
          {countries.map((c: any) => {
            const diff = (c.production || 0) - (c.quota || 0);
            const compliance = c.compliancePct ?? 0;
            return (
              <tr key={c.country} className="border-b border-border/5 hover:bg-lime-400/[0.02] transition-colors">
                <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{c.country}</td>
                <td className="px-2 py-1.5 text-right text-white/80">{fmtNumber(c.production)}</td>
                <td className="px-2 py-1.5 text-right text-white/40">{fmtNumber(c.quota)}</td>
                <td className={`px-2 py-1.5 text-right font-bold ${diff <= 0 ? 'text-green-400/70' : 'text-red-400/70'}`}>
                  {diff >= 0 ? '+' : ''}{fmtNumber(diff)}
                </td>
                <td className="px-2 py-1.5">
                  <div className="flex items-center gap-1 justify-center">
                    <div className="w-12 h-1.5 bg-white/[0.04] relative">
                      <div
                        className={`h-full transition-all ${compliance >= 95 ? 'bg-green-500' : compliance >= 80 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(compliance, 100)}%` }}
                      />
                    </div>
                    <span className="text-[7px] font-mono text-white/50">{compliance.toFixed(0)}%</span>
                  </div>
                </td>
                <td className={`px-2 py-1.5 text-right ${(c.momChange || 0) >= 0 ? 'text-green-400/70' : 'text-red-400/70'}`}>
                  {(c.momChange || 0) >= 0 ? '+' : ''}{fmtNumber(c.momChange || 0)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Summary Cell ──

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2 py-1.5 border-r border-border/10 last:border-r-0">
      <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider font-black">{label}</div>
      <div className="text-[9px] font-mono font-bold text-white/80">{value}</div>
    </div>
  );
}

// ── Production Table ──

function ProductionTable({ rows }: { rows: any[] }) {
  return (
    <table className="w-full text-[9px] font-mono">
      <thead className="sticky top-0 bg-black/95 text-[7px] font-black text-neutral-500 uppercase tracking-wider border-b border-border/10">
        <tr>
          <th className="px-2 py-1.5 text-left">COUNTRY</th>
          <th className="px-2 py-1.5 text-right">OIL (MB/D)</th>
          <th className="px-2 py-1.5 text-right">GAS (BCF/D)</th>
          <th className="px-2 py-1.5 text-right">OIL YOY</th>
          <th className="px-2 py-1.5 text-right">GAS YOY</th>
          <th className="px-2 py-1.5 text-center">CAPACITY UTIL</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r: any) => {
          const capUtil = r.capacityUtilization ?? 0;
          return (
            <tr key={r.country} className="border-b border-border/5 hover:bg-lime-400/[0.02] transition-colors">
              <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{r.country}</td>
              <td className="px-2 py-1.5 text-right text-white/80 font-bold">{fmtNumber(r.oilProduction)}</td>
              <td className="px-2 py-1.5 text-right text-white/80">{fmtNumber(r.gasProduction)}</td>
              <td className={`px-2 py-1.5 text-right font-bold ${(r.oilYoY || 0) >= 0 ? 'text-green-400/70' : 'text-red-400/70'}`}>
                {(r.oilYoY || 0) >= 0 ? '\u25B2' : '\u25BC'} {fmtPct(r.oilYoY || 0)}
              </td>
              <td className={`px-2 py-1.5 text-right font-bold ${(r.gasYoY || 0) >= 0 ? 'text-green-400/70' : 'text-red-400/70'}`}>
                {(r.gasYoY || 0) >= 0 ? '\u25B2' : '\u25BC'} {fmtPct(r.gasYoY || 0)}
              </td>
              <td className="px-2 py-1.5">
                <div className="flex items-center gap-1 justify-center">
                  <div className="w-16 h-2 bg-white/[0.04] relative">
                    <div
                      className={`h-full transition-all ${capUtil >= 90 ? 'bg-red-500' : capUtil >= 75 ? 'bg-amber-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(capUtil, 100)}%` }}
                    />
                  </div>
                  <span className="text-[7px] font-mono text-white/50">{capUtil.toFixed(0)}%</span>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ── Valuation Table ──

function ValuationTable({ rows }: { rows: any[] }) {
  return (
    <table className="w-full text-[9px] font-mono">
      <thead className="sticky top-0 bg-black/95 text-[7px] font-black text-neutral-500 uppercase tracking-wider border-b border-border/10">
        <tr>
          <th className="px-2 py-1.5 text-left">COMMODITY</th>
          <th className="px-2 py-1.5 text-right">PRICE</th>
          <th className="px-2 py-1.5 text-right">FAIR VALUE</th>
          <th className="px-2 py-1.5 text-right">PREM/DISC</th>
          <th className="px-2 py-1.5 text-center">INVENTORY</th>
          <th className="px-2 py-1.5 text-center">MOMENTUM</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r: any) => {
          const premDisc = r.fairValue > 0 ? ((r.currentPrice - r.fairValue) / r.fairValue) * 100 : 0;
          const isPremium = premDisc >= 0;
          return (
            <tr key={r.commodity} className="border-b border-border/5 hover:bg-lime-400/[0.02] transition-colors">
              <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{r.commodity}</td>
              <td className="px-2 py-1.5 text-right text-white/80 font-bold">{fmtPrice(r.currentPrice)}</td>
              <td className="px-2 py-1.5 text-right text-white/40">{fmtPrice(r.fairValue)}</td>
              <td className={`px-2 py-1.5 text-right font-bold ${isPremium ? 'text-red-400' : 'text-green-400'}`}>
                {isPremium ? '+' : ''}{premDisc.toFixed(2)}%
              </td>
              <td className="px-2 py-1.5 text-center">
                <SignalBadge signal={r.inventorySignal} />
              </td>
              <td className="px-2 py-1.5 text-center">
                <SignalBadge signal={r.momentumSignal} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ── Signal Badge ──

function SignalBadge({ signal }: { signal: string }) {
  const s = (signal || '').toUpperCase();
  let bgClass = 'bg-neutral-500/15 border-neutral-500/30';
  let textClass = 'text-neutral-400';

  if (s === 'BULLISH' || s === 'BUY' || s === 'LONG' || s === 'POSITIVE') {
    bgClass = 'bg-green-500/15 border-green-500/30';
    textClass = 'text-green-400';
  } else if (s === 'BEARISH' || s === 'SELL' || s === 'SHORT' || s === 'NEGATIVE') {
    bgClass = 'bg-red-500/15 border-red-500/30';
    textClass = 'text-red-400';
  } else if (s === 'NEUTRAL' || s === 'MIXED') {
    bgClass = 'bg-amber-500/15 border-amber-500/30';
    textClass = 'text-amber-400';
  }

  return (
    <span className={`px-1.5 py-0.5 text-[6px] font-mono font-black uppercase tracking-wider border ${bgClass} ${textClass}`}>
      {s || 'N/A'}
    </span>
  );
}
