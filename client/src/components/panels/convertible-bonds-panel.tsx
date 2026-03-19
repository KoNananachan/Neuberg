import { useState } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { useConvertibleBonds } from '../../api/hooks/use-convertible-bonds';

// ── Fallback data ──

const FALLBACK_DATA = {
  overview: {
    outstanding: 892.4,
    newIssuanceYtd: 48.7,
    avgPremium: 32.8,
    avgDelta: 0.42,
    avgCoupon: 1.85,
    avgYtm: 3.12,
  },
  activeConvertibles: [
    { issuer: 'MicroStrategy', ticker: 'MSTR', coupon: 0.625, maturity: '2028-09-15', convPrice: 232.0, stockPrice: 178.5, premium: 29.9, delta: 0.58, bondPrice: 108.2, callProtection: true },
    { issuer: 'Palo Alto Networks', ticker: 'PANW', coupon: 0.375, maturity: '2025-06-01', convPrice: 210.0, stockPrice: 295.4, premium: -28.8, delta: 0.95, bondPrice: 142.1, callProtection: false },
    { issuer: 'Lumentum Holdings', ticker: 'LITE', coupon: 0.5, maturity: '2028-12-15', convPrice: 72.0, stockPrice: 48.3, premium: 49.1, delta: 0.22, bondPrice: 88.4, callProtection: true },
    { issuer: 'Airbnb', ticker: 'ABNB', coupon: 0.0, maturity: '2026-03-15', convPrice: 187.0, stockPrice: 152.8, premium: 22.4, delta: 0.65, bondPrice: 96.7, callProtection: false },
    { issuer: 'Zillow Group', ticker: 'Z', coupon: 1.375, maturity: '2026-09-01', convPrice: 75.0, stockPrice: 58.2, premium: 28.9, delta: 0.48, bondPrice: 101.3, callProtection: true },
    { issuer: 'Akamai Technologies', ticker: 'AKAM', coupon: 0.125, maturity: '2027-05-01', convPrice: 115.0, stockPrice: 92.5, premium: 24.3, delta: 0.54, bondPrice: 97.8, callProtection: true },
    { issuer: 'Snap Inc', ticker: 'SNAP', coupon: 0.75, maturity: '2028-08-01', convPrice: 14.5, stockPrice: 11.2, premium: 29.5, delta: 0.39, bondPrice: 92.1, callProtection: true },
    { issuer: 'Etsy', ticker: 'ETSY', coupon: 0.25, maturity: '2028-06-15', convPrice: 167.0, stockPrice: 72.4, premium: 130.7, delta: 0.08, bondPrice: 78.9, callProtection: false },
    { issuer: 'ON Semiconductor', ticker: 'ON', coupon: 0.0, maturity: '2027-05-01', convPrice: 50.0, stockPrice: 65.8, premium: -24.0, delta: 0.92, bondPrice: 134.5, callProtection: false },
    { issuer: 'Ford Motor', ticker: 'F', coupon: 0.0, maturity: '2026-03-15', convPrice: 15.76, stockPrice: 10.8, premium: 45.9, delta: 0.18, bondPrice: 82.6, callProtection: true },
    { issuer: 'Booking Holdings', ticker: 'BKNG', coupon: 0.75, maturity: '2025-05-01', convPrice: 1850.0, stockPrice: 3920.5, premium: -52.8, delta: 0.99, bondPrice: 213.4, callProtection: false },
    { issuer: 'Liberty Media', ticker: 'FWONA', coupon: 2.25, maturity: '2027-12-01', convPrice: 68.0, stockPrice: 72.1, premium: -5.7, delta: 0.82, bondPrice: 110.8, callProtection: false },
  ],
  selectedBondDetail: {
    issuer: 'MicroStrategy',
    parity: 76.94,
    bondFloor: 72.5,
    greeks: {
      delta: 0.58,
      gamma: 0.012,
      vega: 0.34,
      theta: -0.018,
      rho: -0.22,
    },
    creditSpread: 285,
  },
  newIssuancePipeline: [
    { issuer: 'Cloudflare', size: 1250, coupon: 0.5, premium: 35.0, maturity: '2029-06-01', bookrunner: 'Goldman Sachs' },
    { issuer: 'Datadog', size: 800, coupon: 0.0, premium: 40.0, maturity: '2029-09-15', bookrunner: 'J.P. Morgan' },
    { issuer: 'CrowdStrike', size: 1500, coupon: 0.25, premium: 32.5, maturity: '2029-03-01', bookrunner: 'Morgan Stanley' },
    { issuer: 'Twilio', size: 600, coupon: 0.375, premium: 27.5, maturity: '2029-12-01', bookrunner: 'Barclays' },
    { issuer: 'Unity Software', size: 500, coupon: 1.0, premium: 30.0, maturity: '2028-06-15', bookrunner: 'BofA Securities' },
  ],
  sectorBreakdown: [
    { sector: 'Technology', count: 42, outstanding: 285.6, avgPremium: 28.4, avgDelta: 0.52, avgCoupon: 0.45 },
    { sector: 'Healthcare', count: 28, outstanding: 142.8, avgPremium: 35.2, avgDelta: 0.38, avgCoupon: 1.25 },
    { sector: 'Financials', count: 18, outstanding: 128.4, avgPremium: 22.1, avgDelta: 0.61, avgCoupon: 2.15 },
    { sector: 'Consumer Disc.', count: 22, outstanding: 118.2, avgPremium: 31.5, avgDelta: 0.44, avgCoupon: 1.05 },
    { sector: 'Industrials', count: 15, outstanding: 85.4, avgPremium: 38.9, avgDelta: 0.32, avgCoupon: 1.75 },
    { sector: 'Communication', count: 12, outstanding: 68.5, avgPremium: 27.8, avgDelta: 0.55, avgCoupon: 0.65 },
    { sector: 'Energy', count: 8, outstanding: 42.1, avgPremium: 41.2, avgDelta: 0.28, avgCoupon: 2.50 },
    { sector: 'Utilities', count: 5, outstanding: 21.4, avgPremium: 45.6, avgDelta: 0.19, avgCoupon: 3.10 },
  ],
  conversionActivity: [
    { issuer: 'Palo Alto Networks', shares: 2_450_000, value: 723.5, date: '2026-03-18' },
    { issuer: 'ON Semiconductor', shares: 1_800_000, value: 118.4, date: '2026-03-17' },
    { issuer: 'Booking Holdings', shares: 185_000, value: 725.3, date: '2026-03-16' },
    { issuer: 'Liberty Media', shares: 920_000, value: 66.3, date: '2026-03-15' },
    { issuer: 'Airbnb', shares: 1_250_000, value: 191.0, date: '2026-03-14' },
    { issuer: 'Akamai Technologies', shares: 680_000, value: 62.9, date: '2026-03-13' },
  ],
};

// ── Formatting helpers ──

function fmtShares(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return n.toFixed(0);
}

function fmtDollar(n: number): string {
  return '$' + n.toFixed(1) + 'M';
}

function fmtSize(n: number): string {
  return '$' + n.toFixed(0) + 'M';
}

function premiumColor(pct: number): string {
  if (pct < 20) return 'text-emerald-400';
  if (pct > 40) return 'text-red-400';
  return 'text-neutral-300';
}

// ── Main Panel ──

export function ConvertibleBondsPanel() {
  const { data: liveData } = useConvertibleBonds();
  const data = liveData || FALLBACK_DATA;
  const [selectedIdx, setSelectedIdx] = useState(0);

  const selectedBond = data.activeConvertibles[selectedIdx] || data.activeConvertibles[0];
  const detail = data.selectedBondDetail;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-purple-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-purple-400">
            Convertible Bonds
          </span>
        </div>
        <div className="flex items-center gap-3 text-[9px] font-mono">
          <span className="text-neutral-500">OUT</span>
          <span className="font-bold tabular-nums text-neutral-300">${data.overview.outstanding}B</span>
          <span className="text-neutral-500">PREM</span>
          <span className="font-bold tabular-nums text-neutral-300">{data.overview.avgPremium}%</span>
          <span className="text-neutral-500">&Delta;</span>
          <span className="font-bold tabular-nums text-neutral-300">{data.overview.avgDelta.toFixed(2)}</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {/* ── Overview Stats ── */}
        <div className="px-3 py-2 border-b border-purple-400/30 bg-[#080510]">
          <div className="flex items-center gap-1 mb-1.5">
            <div className="w-1 h-1 bg-purple-400" />
            <span className="text-[7px] font-black font-mono uppercase tracking-widest text-purple-400">
              Overview
            </span>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {[
              { label: 'Outstanding', value: '$' + data.overview.outstanding + 'B' },
              { label: 'New Issuance YTD', value: '$' + data.overview.newIssuanceYtd + 'B' },
              { label: 'Avg Premium', value: data.overview.avgPremium + '%' },
              { label: 'Avg Delta', value: data.overview.avgDelta.toFixed(2) },
              { label: 'Avg Coupon', value: data.overview.avgCoupon + '%' },
              { label: 'Avg YTM', value: data.overview.avgYtm + '%' },
            ].map((item: any) => (
              <div key={item.label} className="text-center">
                <div className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500">{item.label}</div>
                <div className="text-[11px] font-mono font-bold tabular-nums text-white">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Active Convertibles Table ── */}
        <div className="border-b border-purple-400/30">
          <div className="px-3 py-1.5">
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 bg-purple-400" />
              <span className="text-[7px] font-black font-mono uppercase tracking-widest text-purple-400">
                Active Convertibles
              </span>
            </div>
          </div>
          {/* Table header */}
          <div className="grid grid-cols-[1fr_40px_58px_52px_52px_52px_38px_50px_44px] px-3 py-1 border-b border-border/20 text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500">
            <span>Issuer</span>
            <span className="text-right">Cpn</span>
            <span className="text-right">Maturity</span>
            <span className="text-right">Conv Px</span>
            <span className="text-right">Stock Px</span>
            <span className="text-right">Prem %</span>
            <span className="text-right">&Delta;</span>
            <span className="text-right">Bond Px</span>
            <span className="text-center">Call</span>
          </div>
          {data.activeConvertibles.map((bond: any, i: any) => (
            <div
              key={`${bond.ticker}-${i}`}
              onClick={() => setSelectedIdx(i)}
              className={`grid grid-cols-[1fr_40px_58px_52px_52px_52px_38px_50px_44px] px-3 py-1 border-b border-border/20 hover:bg-purple-400/[0.02] transition-colors items-center text-[9px] font-mono cursor-pointer ${
                selectedIdx === i ? 'bg-purple-400/[0.05]' : ''
              }`}
            >
              <span className="truncate">
                <span className="font-bold text-purple-400">{bond.ticker}</span>
                <span className="text-neutral-500 ml-1">{bond.issuer}</span>
              </span>
              <span className="text-right tabular-nums text-neutral-300">{bond.coupon.toFixed(2)}%</span>
              <span className="text-right tabular-nums text-neutral-300">
                {new Date(bond.maturity).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}
              </span>
              <span className="text-right tabular-nums text-neutral-300">{bond.convPrice.toFixed(1)}</span>
              <span className="text-right tabular-nums text-neutral-300">{bond.stockPrice.toFixed(1)}</span>
              <span className={`text-right tabular-nums font-bold ${premiumColor(bond.premium)}`}>
                {bond.premium >= 0 ? '+' : ''}{bond.premium.toFixed(1)}%
              </span>
              <span className="text-right tabular-nums text-neutral-300">{bond.delta.toFixed(2)}</span>
              <span className="text-right tabular-nums text-neutral-300">{bond.bondPrice.toFixed(1)}</span>
              <span className="text-center">
                {bond.callProtection ? (
                  <span className="px-1 py-[1px] text-[7px] font-bold bg-emerald-500/15 text-emerald-400">YES</span>
                ) : (
                  <span className="px-1 py-[1px] text-[7px] font-bold bg-red-500/15 text-red-400/60">NO</span>
                )}
              </span>
            </div>
          ))}
        </div>

        {/* ── Selected Bond Detail ── */}
        <div className="border-b border-purple-400/30 px-3 py-2 bg-[#080510]">
          <div className="flex items-center gap-1 mb-1.5">
            <div className="w-1 h-1 bg-purple-400" />
            <span className="text-[7px] font-black font-mono uppercase tracking-widest text-purple-400">
              Bond Detail
            </span>
            <span className="text-[7px] font-mono text-neutral-500 ml-1">
              {selectedBond ? selectedBond.ticker : detail.issuer}
            </span>
          </div>
          <div className="grid grid-cols-8 gap-2">
            {[
              { label: 'Parity', value: detail.parity.toFixed(2) },
              { label: 'Bond Floor', value: detail.bondFloor.toFixed(2) },
              { label: 'Delta', value: detail.greeks.delta.toFixed(3) },
              { label: 'Gamma', value: detail.greeks.gamma.toFixed(4) },
              { label: 'Vega', value: detail.greeks.vega.toFixed(3) },
              { label: 'Theta', value: detail.greeks.theta.toFixed(4) },
              { label: 'Rho', value: detail.greeks.rho.toFixed(3) },
              { label: 'Cr Spread', value: detail.creditSpread + 'bp' },
            ].map((item: any) => (
              <div key={item.label} className="text-center">
                <div className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500">{item.label}</div>
                <div className="text-[10px] font-mono font-bold tabular-nums text-white">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── New Issuance Pipeline ── */}
        <div className="border-b border-purple-400/30">
          <div className="px-3 py-1.5">
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 bg-purple-400" />
              <span className="text-[7px] font-black font-mono uppercase tracking-widest text-purple-400">
                New Issuance Pipeline
              </span>
            </div>
          </div>
          <div className="grid grid-cols-[1fr_52px_42px_48px_58px_1fr] px-3 py-1 border-b border-border/20 text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500">
            <span>Issuer</span>
            <span className="text-right">Size</span>
            <span className="text-right">Cpn</span>
            <span className="text-right">Prem</span>
            <span className="text-right">Maturity</span>
            <span className="text-right">Bookrunner</span>
          </div>
          {data.newIssuancePipeline.map((deal: any, i: any) => (
            <div
              key={`${deal.issuer}-${i}`}
              className="grid grid-cols-[1fr_52px_42px_48px_58px_1fr] px-3 py-1 border-b border-border/20 hover:bg-purple-400/[0.02] transition-colors items-center text-[9px] font-mono"
            >
              <span className="font-bold text-purple-400 truncate">{deal.issuer}</span>
              <span className="text-right tabular-nums text-neutral-300">{fmtSize(deal.size)}</span>
              <span className="text-right tabular-nums text-neutral-300">{deal.coupon.toFixed(2)}%</span>
              <span className="text-right tabular-nums text-neutral-300">{deal.premium.toFixed(1)}%</span>
              <span className="text-right tabular-nums text-neutral-300">
                {new Date(deal.maturity).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}
              </span>
              <span className="text-right tabular-nums text-neutral-500 truncate">{deal.bookrunner}</span>
            </div>
          ))}
        </div>

        {/* ── Sector Breakdown ── */}
        <div className="border-b border-purple-400/30">
          <div className="px-3 py-1.5">
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 bg-purple-400" />
              <span className="text-[7px] font-black font-mono uppercase tracking-widest text-purple-400">
                Sector Breakdown
              </span>
            </div>
          </div>
          <div className="grid grid-cols-[1fr_36px_56px_48px_38px_42px] px-3 py-1 border-b border-border/20 text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500">
            <span>Sector</span>
            <span className="text-right">Cnt</span>
            <span className="text-right">Outstd</span>
            <span className="text-right">Prem</span>
            <span className="text-right">&Delta;</span>
            <span className="text-right">Cpn</span>
          </div>
          {data.sectorBreakdown.map((sector: any, i: any) => (
            <div
              key={`${sector.sector}-${i}`}
              className="grid grid-cols-[1fr_36px_56px_48px_38px_42px] px-3 py-1 border-b border-border/20 hover:bg-purple-400/[0.02] transition-colors items-center text-[9px] font-mono"
            >
              <span className="font-bold text-neutral-300 truncate">{sector.sector}</span>
              <span className="text-right tabular-nums text-neutral-400">{sector.count}</span>
              <span className="text-right tabular-nums text-neutral-300">${sector.outstanding.toFixed(1)}B</span>
              <span className={`text-right tabular-nums font-bold ${premiumColor(sector.avgPremium)}`}>
                {sector.avgPremium.toFixed(1)}%
              </span>
              <span className="text-right tabular-nums text-neutral-300">{sector.avgDelta.toFixed(2)}</span>
              <span className="text-right tabular-nums text-neutral-300">{sector.avgCoupon.toFixed(2)}%</span>
            </div>
          ))}
        </div>

        {/* ── Conversion Activity ── */}
        <div className="border-b border-purple-400/30">
          <div className="px-3 py-1.5">
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 bg-purple-400" />
              <span className="text-[7px] font-black font-mono uppercase tracking-widest text-purple-400">
                Conversion Activity
              </span>
            </div>
          </div>
          <div className="grid grid-cols-[1fr_64px_60px_58px] px-3 py-1 border-b border-border/20 text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500">
            <span>Issuer</span>
            <span className="text-right">Shares</span>
            <span className="text-right">Value</span>
            <span className="text-right">Date</span>
          </div>
          {data.conversionActivity.map((conv: any, i: any) => (
            <div
              key={`${conv.issuer}-${i}`}
              className="grid grid-cols-[1fr_64px_60px_58px] px-3 py-1 border-b border-border/20 hover:bg-purple-400/[0.02] transition-colors items-center text-[9px] font-mono"
            >
              <span className="font-bold text-purple-400 truncate">{conv.issuer}</span>
              <span className="text-right tabular-nums text-neutral-300">{fmtShares(conv.shares)}</span>
              <span className="text-right tabular-nums text-neutral-300">{fmtDollar(conv.value)}</span>
              <span className="text-right tabular-nums text-neutral-500">
                {new Date(conv.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
