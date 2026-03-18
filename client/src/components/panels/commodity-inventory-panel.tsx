import { useState } from 'react';
import { useCommodityInventory } from '../../api/hooks/use-commodity-inventory';

const ACCENT = '#f97316'; // orange-500
const ACCENT_DIM = 'rgba(249,115,22,0.08)';

type Tab = 'metals' | 'energy' | 'agriculture' | 'flows';

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

export function CommodityInventoryPanel() {
  const { data, isLoading, error } = useCommodityInventory();
  const [tab, setTab] = useState<Tab>('metals');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'metals', label: 'METALS' },
    { key: 'energy', label: 'ENERGY' },
    { key: 'agriculture', label: 'AGRICULTURE' },
    { key: 'flows', label: 'FLOWS' },
  ];

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">
          Loading commodity inventory...
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

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Tab bar */}
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
        <div className="flex-1" />
        <div className="px-3 text-[8px] font-mono text-neutral/25">
          {data.timestamp
            ? new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : ''}
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-5 border-b border-border/20 bg-black/40 shrink-0">
        <SummaryCell label="METALS VALUE" value={`$${fmtNumber(data.summary.metalsValueB)}B`} />
        <SummaryCell label="ENERGY STOCKS" value={fmtNumber(data.summary.energyStocks)} />
        <SummaryCell label="AVG DAYS SUPPLY" value={data.summary.avgDaysSupply.toFixed(1)} />
        <SummaryCell
          label="BIGGEST DRAW"
          value={data.summary.biggestDraw.name}
          sub={fmtPct(data.summary.biggestDraw.changePct)}
          subColor="text-bearish"
        />
        <SummaryCell
          label="BIGGEST BUILD"
          value={data.summary.biggestBuild.name}
          sub={fmtPct(data.summary.biggestBuild.changePct)}
          subColor="text-bullish"
        />
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {tab === 'metals' && <MetalsTable rows={data.metals} />}
        {tab === 'energy' && <EnergyTable rows={data.energy} />}
        {tab === 'agriculture' && <AgricultureTable rows={data.agriculture} />}
        {tab === 'flows' && <FlowsTable rows={data.flows} />}
      </div>
    </div>
  );
}

// ── Summary Cell ──

function SummaryCell({
  label,
  value,
  sub,
  subColor,
}: {
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
}) {
  return (
    <div className="px-2 py-1.5 border-r border-border/10 last:border-r-0">
      <div className="text-[7px] font-mono text-neutral/30 uppercase tracking-wider">{label}</div>
      <div className="text-[9px] font-mono font-bold text-white/80">{value}</div>
      {sub && (
        <div className={`text-[7px] font-mono font-bold ${subColor || 'text-white/40'}`}>{sub}</div>
      )}
    </div>
  );
}

// ── Metals Table ──

function MetalsTable({ rows }: { rows: any[] }) {
  return (
    <table className="w-full text-[9px] font-mono">
      <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
        <tr>
          <th className="px-2 py-1.5 text-left">Commodity</th>
          <th className="px-2 py-1.5 text-left">Exchange</th>
          <th className="px-2 py-1.5 text-right">Stocks (t)</th>
          <th className="px-2 py-1.5 text-right">1D Chg</th>
          <th className="px-2 py-1.5 text-right">1W Chg %</th>
          <th className="px-2 py-1.5 text-right">1M Chg %</th>
          <th className="px-2 py-1.5 text-right">Days Supply</th>
          <th className="px-2 py-1.5 text-right">Cancelled %</th>
          <th className="px-2 py-1.5 text-right">Spot Price</th>
          <th className="px-2 py-1.5 text-right">Contango %</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r: any) => (
          <tr key={r.commodity} className="border-b border-border/5 hover:bg-white/[0.02] transition-colors">
            <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{r.commodity}</td>
            <td className="px-2 py-1.5 text-white/40">{r.exchange}</td>
            <td className="px-2 py-1.5 text-right text-white/80 font-bold">{fmtNumber(r.stocks)}</td>
            <td className={`px-2 py-1.5 text-right font-bold ${r.change1d >= 0 ? 'text-bullish' : 'text-bearish'}`}>
              {r.change1d >= 0 ? '+' : ''}{fmtNumber(r.change1d)}
            </td>
            <td className={`px-2 py-1.5 text-right font-bold ${r.change1wPct >= 0 ? 'text-bullish' : 'text-bearish'}`}>
              {fmtPct(r.change1wPct)}
            </td>
            <td className={`px-2 py-1.5 text-right font-bold ${r.change1mPct >= 0 ? 'text-bullish' : 'text-bearish'}`}>
              {fmtPct(r.change1mPct)}
            </td>
            <td className="px-2 py-1.5 text-right text-white/60">{r.daysSupply.toFixed(1)}</td>
            <td className="px-2 py-1.5 text-right text-white/60">{r.cancelledPct.toFixed(1)}%</td>
            <td className="px-2 py-1.5 text-right text-white/80">{fmtPrice(r.spotPrice)}</td>
            <td className={`px-2 py-1.5 text-right ${r.contangoPct >= 0 ? 'text-bearish/70' : 'text-bullish/70'}`}>
              {fmtPct(r.contangoPct)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Energy Table ──

function EnergyTable({ rows }: { rows: any[] }) {
  return (
    <table className="w-full text-[9px] font-mono">
      <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
        <tr>
          <th className="px-2 py-1.5 text-left">Commodity</th>
          <th className="px-2 py-1.5 text-right">Stocks</th>
          <th className="px-2 py-1.5 text-right">1W Chg</th>
          <th className="px-2 py-1.5 text-right">vs 5Y Avg %</th>
          <th className="px-2 py-1.5 text-right">Days Supply</th>
          <th className="px-2 py-1.5 text-right">Spot Price</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r: any) => (
          <tr key={r.commodity} className="border-b border-border/5 hover:bg-white/[0.02] transition-colors">
            <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{r.commodity}</td>
            <td className="px-2 py-1.5 text-right text-white/80 font-bold">{fmtNumber(r.stocks)}</td>
            <td className={`px-2 py-1.5 text-right font-bold ${r.change1w >= 0 ? 'text-bullish' : 'text-bearish'}`}>
              {r.change1w >= 0 ? '+' : ''}{fmtNumber(r.change1w)}
            </td>
            <td className="px-2 py-1.5 text-right">
              <span
                className={`text-[7px] font-bold px-1.5 py-0.5 ${
                  r.vs5yAvgPct < 0 ? 'bg-bullish/15 text-bullish' : 'bg-bearish/15 text-bearish'
                }`}
              >
                {fmtPct(r.vs5yAvgPct)} {r.vs5yAvgPct < 0 ? 'BULLISH' : 'BEARISH'}
              </span>
            </td>
            <td className="px-2 py-1.5 text-right text-white/60">{r.daysSupply.toFixed(1)}</td>
            <td className="px-2 py-1.5 text-right text-white/80">{fmtPrice(r.spotPrice)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Agriculture Table ──

function AgricultureTable({ rows }: { rows: any[] }) {
  return (
    <table className="w-full text-[9px] font-mono">
      <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
        <tr>
          <th className="px-2 py-1.5 text-left">Commodity</th>
          <th className="px-2 py-1.5 text-right">Stocks</th>
          <th className="px-2 py-1.5 text-right">1M Chg %</th>
          <th className="px-2 py-1.5 text-right">Stocks/Use %</th>
          <th className="px-2 py-1.5 text-left">Season</th>
          <th className="px-2 py-1.5 text-right">Export Pace %</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r: any) => (
          <tr key={r.commodity} className="border-b border-border/5 hover:bg-white/[0.02] transition-colors">
            <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{r.commodity}</td>
            <td className="px-2 py-1.5 text-right text-white/80 font-bold">{fmtNumber(r.stocks)}</td>
            <td className={`px-2 py-1.5 text-right font-bold ${r.change1mPct >= 0 ? 'text-bullish' : 'text-bearish'}`}>
              {fmtPct(r.change1mPct)}
            </td>
            <td className="px-2 py-1.5 text-right text-white/60">{r.stocksUsePct.toFixed(1)}%</td>
            <td className="px-2 py-1.5 text-white/40">{r.season}</td>
            <td className="px-2 py-1.5 text-right text-white/60">{r.exportPacePct.toFixed(1)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Flows Table ──

function FlowsTable({ rows }: { rows: any[] }) {
  return (
    <table className="w-full text-[9px] font-mono">
      <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
        <tr>
          <th className="px-2 py-1.5 text-left">Location</th>
          <th className="px-2 py-1.5 text-left">Commodity</th>
          <th className="px-2 py-1.5 text-left">Direction</th>
          <th className="px-2 py-1.5 text-right">Quantity</th>
          <th className="px-2 py-1.5 text-right">1W Chg</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r: any, i: number) => (
          <tr key={`${r.location}-${r.commodity}-${i}`} className="border-b border-border/5 hover:bg-white/[0.02] transition-colors">
            <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{r.location}</td>
            <td className="px-2 py-1.5 text-white/60">{r.commodity}</td>
            <td className="px-2 py-1.5">
              <span
                className={`text-[7px] font-bold px-1.5 py-0.5 ${
                  r.direction === 'Inflow'
                    ? 'bg-bullish/15 text-bullish'
                    : 'bg-bearish/15 text-bearish'
                }`}
              >
                {r.direction === 'Inflow' ? 'INFLOW' : 'OUTFLOW'}
              </span>
            </td>
            <td className="px-2 py-1.5 text-right text-white/80 font-bold">{fmtNumber(r.quantity)}</td>
            <td className={`px-2 py-1.5 text-right font-bold ${r.change1w >= 0 ? 'text-bullish' : 'text-bearish'}`}>
              {r.change1w >= 0 ? '+' : ''}{fmtNumber(r.change1w)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
