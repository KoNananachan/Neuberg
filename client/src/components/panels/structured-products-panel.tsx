import { useState } from 'react';
import { useStructuredProducts } from '../../api/hooks/use-structured-products';

const ACCENT = '#f0abfc'; // fuchsia-300
const ACCENT_DIM = 'rgba(240,171,252,0.08)';

type Tab = 'products' | 'payoff' | 'issuance' | 'underlying';

// ── Formatting helpers ──

function fmtPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtDollarB(n: number): string {
  return `$${n.toFixed(1)}B`;
}

// ── Color helpers ──

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function statusStyle(status: string): { text: string; bg: string } {
  const s = status.toLowerCase();
  if (s === 'live') return { text: 'text-green-400', bg: 'bg-green-500/15 border-green-500/30' };
  if (s === 'called') return { text: 'text-blue-400', bg: 'bg-blue-500/15 border-blue-500/30' };
  if (s === 'at risk') return { text: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30' };
  if (s === 'matured') return { text: 'text-neutral-400', bg: 'bg-neutral-500/15 border-neutral-500/30' };
  return { text: 'text-neutral-400', bg: 'bg-neutral-500/15 border-neutral-500/30' };
}

// ── Main Panel ──

export function StructuredProductsPanel() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, isLoading, error } = useStructuredProducts() as { data: any; isLoading: boolean; error: any };
  const [tab, setTab] = useState<Tab>('products');

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">
          Loading structured products...
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
    { key: 'products', label: 'PRODUCTS' },
    { key: 'payoff', label: 'PAYOFF' },
    { key: 'issuance', label: 'ISSUANCE' },
    { key: 'underlying', label: 'UNDERLYING' },
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
          <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">Avg Coupon</div>
          <div className="text-[11px] font-mono font-black text-white/60">
            {data.summary?.avgCoupon?.toFixed(2) ?? '--'}%
          </div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">Most Popular</div>
          <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>
            {data.summary?.mostPopular ?? '--'}
          </div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">Avg Barrier</div>
          <div className="text-[11px] font-mono font-black text-white/60">
            {data.summary?.avgBarrier?.toFixed(1) ?? '--'}%
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
        {tab === 'products' && <ProductsTab products={data.products} />}
        {tab === 'payoff' && <PayoffTab products={data.products} />}
        {tab === 'issuance' && <IssuanceTab issuance={data.issuance} />}
        {tab === 'underlying' && <UnderlyingTab underlyings={data.underlyings} />}
      </div>
    </div>
  );
}

// ── Products Tab ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ProductsTab({ products }: { products: any[] }) {
  if (!products?.length) {
    return (
      <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">
        No products available
      </div>
    );
  }

  return (
    <table className="w-full text-[9px] font-mono">
      <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
        <tr>
          <th className="px-2 py-1.5 text-left font-bold">Name</th>
          <th className="px-2 py-1.5 text-left font-bold">Type</th>
          <th className="px-2 py-1.5 text-left font-bold">Underlying</th>
          <th className="px-2 py-1.5 text-left font-bold">Issuer</th>
          <th className="px-2 py-1.5 text-right font-bold">Coupon</th>
          <th className="px-2 py-1.5 text-right font-bold">Barrier</th>
          <th className="px-2 py-1.5 text-right font-bold">Value</th>
          <th className="px-2 py-1.5 text-right font-bold">Status</th>
        </tr>
      </thead>
      <tbody>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {products.map((p: any, i: number) => {
          const ss = statusStyle(p.status ?? '');
          return (
            <tr key={p.id ?? i} className="border-b border-border/5 hover:bg-white/[0.02]">
              <td className="px-2 py-1.5">
                <span className="font-bold" style={{ color: ACCENT }}>{p.name}</span>
              </td>
              <td className="px-2 py-1.5">
                <span className="text-[7px] font-bold px-1 py-0 bg-white/[0.05] border border-border/20 text-white/60 uppercase">
                  {p.type}
                </span>
              </td>
              <td className="px-2 py-1.5 text-white/60">{p.underlying}</td>
              <td className="px-2 py-1.5 text-white/50">{p.issuer}</td>
              <td className="px-2 py-1.5 text-right text-white/80 font-bold">
                {p.coupon?.toFixed(2) ?? '--'}%
              </td>
              <td className="px-2 py-1.5 text-right text-white/60">
                {p.barrier?.toFixed(1) ?? '--'}%
              </td>
              <td className="px-2 py-1.5 text-right text-white/80 font-bold">
                {p.value?.toFixed(1) ?? '--'}%
              </td>
              <td className="px-2 py-1.5 text-right">
                <span className={`text-[7px] font-bold px-1 py-0 border uppercase ${ss.text} ${ss.bg}`}>
                  {p.status}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ── Payoff Tab ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PayoffTab({ products }: { products: any[] }) {
  if (!products?.length) {
    return (
      <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">
        No payoff data available
      </div>
    );
  }

  return (
    <table className="w-full text-[9px] font-mono">
      <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
        <tr>
          <th className="px-2 py-1.5 text-left font-bold">Name</th>
          <th className="px-2 py-1.5 text-right font-bold">Up +20%</th>
          <th className="px-2 py-1.5 text-right font-bold">Flat</th>
          <th className="px-2 py-1.5 text-right font-bold">Down -20%</th>
          <th className="px-2 py-1.5 text-right font-bold">Barrier Breach</th>
          <th className="px-2 py-1.5 text-right font-bold">Max Loss</th>
          <th className="px-2 py-1.5 text-right font-bold">Max Gain</th>
        </tr>
      </thead>
      <tbody>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {products.map((p: any, i: number) => {
          const payoff = p.payoff ?? {};
          return (
            <tr key={p.id ?? i} className="border-b border-border/5 hover:bg-white/[0.02]">
              <td className="px-2 py-1.5">
                <span className="font-bold" style={{ color: ACCENT }}>{p.name}</span>
              </td>
              <td className={`px-2 py-1.5 text-right font-bold ${changeColor(payoff.upReturn ?? 0)}`}>
                {fmtPct(payoff.upReturn ?? 0)}
              </td>
              <td className={`px-2 py-1.5 text-right font-bold ${changeColor(payoff.flatReturn ?? 0)}`}>
                {fmtPct(payoff.flatReturn ?? 0)}
              </td>
              <td className={`px-2 py-1.5 text-right font-bold ${changeColor(payoff.downReturn ?? 0)}`}>
                {fmtPct(payoff.downReturn ?? 0)}
              </td>
              <td className="px-2 py-1.5 text-right font-bold text-red-400">
                {fmtPct(payoff.barrierBreachReturn ?? 0)}
              </td>
              <td className="px-2 py-1.5 text-right font-bold text-red-400">
                {fmtPct(payoff.maxLoss ?? 0)}
              </td>
              <td className="px-2 py-1.5 text-right font-bold text-green-400">
                {fmtPct(payoff.maxGain ?? 0)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ── Issuance Tab ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function IssuanceTab({ issuance }: { issuance: any[] }) {
  if (!issuance?.length) {
    return (
      <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">
        No issuance data available
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3">
      <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider mb-2">
        Issuance Summary by Product Type
      </div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {issuance.map((item: any, i: number) => (
        <div key={item.type ?? i} className="border border-border/10 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono font-black" style={{ color: ACCENT }}>
              {item.type}
            </span>
            <span className="text-[8px] font-mono text-neutral/40">
              {item.count} products
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-[8px] font-mono">
            <div>
              <div className="text-neutral/40 uppercase tracking-wider">Total Notional</div>
              <div className="text-white/80 font-bold">{fmtDollarB(item.totalNotional ?? 0)}</div>
            </div>
            <div>
              <div className="text-neutral/40 uppercase tracking-wider">Avg Coupon</div>
              <div className="font-bold" style={{ color: ACCENT }}>
                {item.avgCoupon?.toFixed(2) ?? '--'}%
              </div>
            </div>
            <div>
              <div className="text-neutral/40 uppercase tracking-wider">Avg Barrier</div>
              <div className="text-white/60 font-bold">{item.avgBarrier?.toFixed(1) ?? '--'}%</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Underlying Tab ──

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
          <th className="px-2 py-1.5 text-left font-bold">Underlying</th>
          <th className="px-2 py-1.5 text-right font-bold">Spot Price</th>
          <th className="px-2 py-1.5 text-right font-bold">1M Chg</th>
          <th className="px-2 py-1.5 text-right font-bold">Dist to Barrier</th>
          <th className="px-2 py-1.5 text-right font-bold">Products Linked</th>
        </tr>
      </thead>
      <tbody>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {underlyings.map((u: any, i: number) => (
          <tr key={u.name ?? i} className="border-b border-border/5 hover:bg-white/[0.02]">
            <td className="px-2 py-1.5">
              <span className="font-bold" style={{ color: ACCENT }}>{u.name}</span>
            </td>
            <td className="px-2 py-1.5 text-right text-white/80 font-bold">
              ${u.spotPrice?.toFixed(2) ?? '--'}
            </td>
            <td className={`px-2 py-1.5 text-right font-bold ${changeColor(u.change1M ?? 0)}`}>
              {fmtPct(u.change1M ?? 0)}
            </td>
            <td className={`px-2 py-1.5 text-right font-bold ${(u.distToBarrier ?? 100) < 10 ? 'text-red-400' : (u.distToBarrier ?? 100) < 20 ? 'text-yellow-400' : 'text-white/60'}`}>
              {u.distToBarrier?.toFixed(1) ?? '--'}%
            </td>
            <td className="px-2 py-1.5 text-right text-white/60">
              {u.productsLinked ?? 0}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
