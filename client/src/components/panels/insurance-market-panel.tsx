import { useInsuranceMarket } from '../../api/hooks/use-insurance-market';
import { useT } from '../../i18n';

const ACCENT = '#fb7185'; // rose-400
const ACCENT_DIM = 'rgba(251,113,133,0.08)';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Fallback Mock Data ──

const FALLBACK_DATA = {
  marketMetrics: {
    globalPremiumVolume: 7.12,
    protectionGap: 1.82,
    averageSolvency: 218,
  },
  insurerStocks: [
    { ticker: 'AIG', price: 78.42, change: 1.24, marketCap: 56.8, pe: 11.2, combinedRatio: 97.3, roe: 12.4 },
    { ticker: 'ALL', price: 185.60, change: -0.38, marketCap: 48.2, pe: 10.8, combinedRatio: 93.1, roe: 18.6 },
    { ticker: 'CB', price: 274.15, change: 0.87, marketCap: 112.4, pe: 12.5, combinedRatio: 88.5, roe: 16.2 },
    { ticker: 'HIG', price: 108.92, change: -1.15, marketCap: 32.6, pe: 9.4, combinedRatio: 94.8, roe: 14.8 },
    { ticker: 'MET', price: 82.30, change: 0.56, marketCap: 58.1, pe: 10.1, combinedRatio: 96.2, roe: 11.9 },
    { ticker: 'PGR', price: 242.88, change: 2.14, marketCap: 142.3, pe: 18.2, combinedRatio: 89.4, roe: 32.5 },
    { ticker: 'TRV', price: 236.44, change: -0.72, marketCap: 54.7, pe: 13.6, combinedRatio: 95.1, roe: 13.2 },
    { ticker: 'MKL', price: 1685.20, change: 1.58, marketCap: 22.8, pe: 15.4, combinedRatio: 92.6, roe: 15.1 },
    { ticker: 'RE', price: 312.75, change: 0.42, marketCap: 18.6, pe: 8.9, combinedRatio: 91.2, roe: 19.8 },
    { ticker: 'RNR', price: 228.60, change: -0.28, marketCap: 12.4, pe: 7.8, combinedRatio: 86.4, roe: 22.1 },
  ],
  premiumData: [
    { line: 'Property', grossWritten: 285.4, netWritten: 198.6, rateChange: 8.2, lossRatio: 62.5, expenseRatio: 29.8, combinedRatio: 92.3 },
    { line: 'Casualty', grossWritten: 312.8, netWritten: 248.1, rateChange: 5.4, lossRatio: 68.2, expenseRatio: 30.1, combinedRatio: 98.3 },
    { line: 'Auto', grossWritten: 298.6, netWritten: 272.4, rateChange: 12.6, lossRatio: 71.4, expenseRatio: 26.5, combinedRatio: 97.9 },
    { line: 'Workers Comp', grossWritten: 56.2, netWritten: 42.8, rateChange: -2.1, lossRatio: 58.4, expenseRatio: 28.2, combinedRatio: 86.6 },
    { line: 'Marine', grossWritten: 38.4, netWritten: 24.6, rateChange: 3.8, lossRatio: 55.2, expenseRatio: 32.6, combinedRatio: 87.8 },
    { line: 'Cyber', grossWritten: 14.8, netWritten: 8.2, rateChange: 18.4, lossRatio: 42.6, expenseRatio: 38.4, combinedRatio: 81.0 },
    { line: 'D&O', grossWritten: 22.6, netWritten: 16.4, rateChange: -6.8, lossRatio: 48.5, expenseRatio: 34.2, combinedRatio: 82.7 },
    { line: 'Professional', grossWritten: 45.2, netWritten: 32.8, rateChange: 2.4, lossRatio: 64.8, expenseRatio: 31.5, combinedRatio: 96.3 },
  ],
  catBonds: [
    { name: 'Everglades Re 2026-1', peril: 'Hurricane', triggerType: 'Indemnity', couponSpread: 825, expectedLoss: 2.14, amount: 350, maturity: '2029-01', status: 'Active' },
    { name: 'Sierra Re 2025-2', peril: 'Earthquake', triggerType: 'PCS Index', couponSpread: 675, expectedLoss: 1.82, amount: 500, maturity: '2028-06', status: 'Active' },
    { name: 'Golden State Re III', peril: 'Wildfire', triggerType: 'Parametric', couponSpread: 1150, expectedLoss: 3.45, amount: 200, maturity: '2027-12', status: 'Active' },
    { name: 'Windmill Re 2026-A', peril: 'Windstorm', triggerType: 'Modeled Loss', couponSpread: 540, expectedLoss: 1.28, amount: 425, maturity: '2029-06', status: 'Active' },
    { name: 'Pacific Re 2025-1', peril: 'Typhoon', triggerType: 'Parametric', couponSpread: 780, expectedLoss: 2.56, amount: 300, maturity: '2028-03', status: 'Active' },
    { name: 'Rhine Re IV', peril: 'Flood', triggerType: 'Indemnity', couponSpread: 480, expectedLoss: 0.98, amount: 275, maturity: '2028-09', status: 'Active' },
    { name: 'Atlas Re 2026-B', peril: 'Multi-Peril', triggerType: 'Industry Index', couponSpread: 920, expectedLoss: 2.88, amount: 600, maturity: '2030-01', status: 'Pending' },
  ],
  reinsurancePricing: {
    rolIndex: 8.42,
    rolChange: 2.8,
    regions: [
      { region: 'US - Property Cat', rateChange: 12.5 },
      { region: 'Europe - Windstorm', rateChange: 8.2 },
      { region: 'Japan - Typhoon', rateChange: 6.4 },
      { region: 'Global - Marine', rateChange: 3.1 },
      { region: 'US - Casualty', rateChange: -1.8 },
      { region: 'UK - Motor', rateChange: 5.6 },
      { region: 'Australia - Flood', rateChange: 15.2 },
      { region: 'Caribbean - Hurricane', rateChange: 18.4 },
    ],
  },
  recentLossEvents: [
    { event: 'Hurricane Milton', type: 'Hurricane', totalLoss: 48.5, insuredLoss: 32.4, date: '2025-10-08', region: 'US Southeast' },
    { event: 'Tohoku Earthquake', type: 'Earthquake', totalLoss: 22.8, insuredLoss: 8.6, date: '2025-08-14', region: 'Japan' },
    { event: 'Rhine Valley Flooding', type: 'Flood', totalLoss: 14.2, insuredLoss: 9.8, date: '2025-07-22', region: 'Europe' },
    { event: 'California Wildfire Complex', type: 'Wildfire', totalLoss: 18.6, insuredLoss: 14.2, date: '2025-09-15', region: 'US West' },
    { event: 'Cyclone Nivar', type: 'Typhoon', totalLoss: 8.4, insuredLoss: 2.1, date: '2025-11-02', region: 'Indian Ocean' },
    { event: 'Texas Hailstorm', type: 'Severe Weather', totalLoss: 6.8, insuredLoss: 5.2, date: '2025-06-18', region: 'US Central' },
  ],
  generatedAt: new Date().toISOString(),
};

// ── Color helpers ──

function perilColor(peril: string): string {
  if (peril.includes('Hurricane')) return '#ef4444';
  if (peril.includes('Earthquake')) return '#f97316';
  if (peril.includes('Wildfire')) return '#fbbf24';
  if (peril.includes('Windstorm')) return '#60a5fa';
  if (peril.includes('Typhoon')) return '#a78bfa';
  if (peril.includes('Flood')) return '#2dd4bf';
  if (peril.includes('Multi')) return '#e879f9';
  return '#94a3b8';
}

function combinedRatioColor(ratio: number): string {
  if (ratio < 95) return 'text-green-400';
  if (ratio <= 100) return 'text-yellow-400';
  return 'text-red-400';
}

function statusBadgeClass(status: string): string {
  if (status === 'Active') return 'text-green-400 bg-green-500/10 border border-green-500/30';
  if (status === 'Pending') return 'text-amber-400 bg-amber-500/10 border border-amber-500/30';
  return 'text-neutral-500 bg-neutral-500/10 border border-neutral-500/30';
}

function lossTypeColor(type: string): string {
  if (type.includes('Hurricane')) return '#ef4444';
  if (type.includes('Earthquake')) return '#f97316';
  if (type.includes('Wildfire')) return '#fbbf24';
  if (type.includes('Flood')) return '#2dd4bf';
  if (type.includes('Typhoon')) return '#a78bfa';
  if (type.includes('Severe')) return '#60a5fa';
  return '#94a3b8';
}

// ── Main Panel ──

export function InsuranceMarketPanel() {
  const t = useT();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawData, isLoading, error } = useInsuranceMarket();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (rawData as any) || FALLBACK_DATA;

  if (isLoading && !rawData) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">
          Loading insurance data...
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-bearish/60 uppercase tracking-widest">
          Failed to load insurance data
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-rose-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter" style={{ color: ACCENT }}>
            {tr(t, 'panelInsuranceMarket', 'Insurance Market')}
          </span>
        </div>
        {data?.generatedAt && (
          <span className="text-[7px] font-mono text-neutral-600">
            {new Date(data.generatedAt).toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {data && (
          <>
            <MarketMetricsSection data={data.marketMetrics} t={t} />
            <InsurerStocksSection stocks={data.insurerStocks} t={t} />
            <PremiumDataSection premiums={data.premiumData} t={t} />
            <CatBondsSection bonds={data.catBonds} t={t} />
            <ReinsurancePricingSection pricing={data.reinsurancePricing} t={t} />
            <RecentLossEventsSection events={data.recentLossEvents} t={t} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Market Metrics Banner ──

function MarketMetricsSection({
  data,
  t,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  t: ReturnType<typeof useT>;
}) {
  if (!data) return null;

  const metrics = [
    { label: tr(t, 'imGlobalPremium', 'Global Premium Volume'), value: `$${data.globalPremiumVolume}T`, color: 'text-white' },
    { label: tr(t, 'imProtectionGap', 'Protection Gap'), value: `$${data.protectionGap}T`, color: 'text-red-400' },
    { label: tr(t, 'imAvgSolvency', 'Avg Solvency Ratio'), value: `${data.averageSolvency}%`, color: 'text-green-400' },
  ];

  return (
    <div className="border-b border-border/20">
      <div className="grid grid-cols-3 gap-px bg-border/10">
        {metrics.map((m) => (
          <div key={m.label} className="px-2 py-1.5 bg-black hover:bg-rose-400/[0.02]">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {m.label}
            </div>
            <div className={`text-[10px] font-mono font-bold ${m.color}`}>
              {m.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Insurer Stocks Table ──

function InsurerStocksSection({
  stocks,
  t,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stocks: any[];
  t: ReturnType<typeof useT>;
}) {
  if (!stocks?.length) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'imInsurerStocks', 'Insurer Stocks')}
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[52px_56px_56px_52px_44px_56px_44px] px-2 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Ticker</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Price</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Chg%</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">MCap</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">P/E</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Comb.R</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">ROE</span>
      </div>

      {/* Rows */}
      {stocks.map((s: {
        ticker: string; price: number; change: number; marketCap: number;
        pe: number; combinedRatio: number; roe: number;
      }) => (
        <div
          key={s.ticker}
          className="grid grid-cols-[52px_56px_56px_52px_44px_56px_44px] px-2 py-1 border-b border-border/5 hover:bg-rose-400/[0.02]"
        >
          <span className="text-[8px] font-mono font-bold" style={{ color: ACCENT }}>{s.ticker}</span>
          <span className="text-[8px] font-mono font-bold text-white text-right">{s.price.toFixed(2)}</span>
          <span className={`text-[8px] font-mono font-bold text-right ${s.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {s.change >= 0 ? '+' : ''}{s.change.toFixed(2)}%
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">${s.marketCap}B</span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">{s.pe}x</span>
          <span className={`text-[8px] font-mono font-bold text-right ${combinedRatioColor(s.combinedRatio)}`}>
            {s.combinedRatio}%
          </span>
          <span className="text-[8px] font-mono text-white/70 text-right">{s.roe}%</span>
        </div>
      ))}
    </div>
  );
}

// ── Premium Data by Line ──

function PremiumDataSection({
  premiums,
  t,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  premiums: any[];
  t: ReturnType<typeof useT>;
}) {
  if (!premiums?.length) return null;

  const maxGross = Math.max(...premiums.map((p: { grossWritten: number }) => p.grossWritten));

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'imPremiumData', 'Premium Data by Line')}
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_56px_56px_52px_48px_48px_52px] px-2 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Line</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">GWP</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">NWP</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Rate</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Loss</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Exp</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Comb</span>
      </div>

      {/* Rows */}
      {premiums.map((p: {
        line: string; grossWritten: number; netWritten: number;
        rateChange: number; lossRatio: number; expenseRatio: number; combinedRatio: number;
      }) => (
        <div key={p.line}>
          <div className="grid grid-cols-[1fr_56px_56px_52px_48px_48px_52px] px-2 py-1 border-b border-border/5 hover:bg-rose-400/[0.02]">
            <span className="text-[8px] font-mono font-bold text-white truncate">{p.line}</span>
            <span className="text-[8px] font-mono text-neutral-400 text-right">${p.grossWritten}B</span>
            <span className="text-[8px] font-mono text-neutral-400 text-right">${p.netWritten}B</span>
            <span className={`text-[8px] font-mono font-bold text-right ${p.rateChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {p.rateChange >= 0 ? '\u2191' : '\u2193'}{Math.abs(p.rateChange)}%
            </span>
            <span className="text-[8px] font-mono text-neutral-400 text-right">{p.lossRatio}%</span>
            <span className="text-[8px] font-mono text-neutral-500 text-right">{p.expenseRatio}%</span>
            <span className={`text-[8px] font-mono font-bold text-right ${combinedRatioColor(p.combinedRatio)}`}>
              {p.combinedRatio}%
            </span>
          </div>
          {/* Mini bar */}
          <div className="px-2 pb-1">
            <div className="h-[2px] bg-border/10 w-full">
              <div
                className="h-full"
                style={{
                  width: `${(p.grossWritten / maxGross) * 100}%`,
                  background: ACCENT,
                  opacity: 0.35,
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Catastrophe Bonds Section ──

function CatBondsSection({
  bonds,
  t,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bonds: any[];
  t: ReturnType<typeof useT>;
}) {
  if (!bonds?.length) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'imCatBonds', 'Catastrophe Bonds')}
        </span>
      </div>

      {bonds.map((b: {
        name: string; peril: string; triggerType: string;
        couponSpread: number; expectedLoss: number; amount: number;
        maturity: string; status: string;
      }, i: number) => (
        <div key={i} className="px-2 py-1.5 border-b border-border/5 hover:bg-rose-400/[0.02]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[8px] font-mono font-bold" style={{ color: ACCENT }}>{b.name}</span>
            <div className="flex items-center gap-1.5">
              <span
                className="text-[7px] font-bold font-mono px-1 py-0"
                style={{ color: perilColor(b.peril), background: `${perilColor(b.peril)}15` }}
              >
                {b.peril.toUpperCase()}
              </span>
              <span className={`text-[7px] font-bold font-mono px-1 py-0.5 ${statusBadgeClass(b.status)}`}>
                {b.status.toUpperCase()}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-2 text-[8px] font-mono">
            <div>
              <div className="text-neutral-600 text-[7px] uppercase">Trigger</div>
              <div className="text-white/60">{b.triggerType}</div>
            </div>
            <div>
              <div className="text-neutral-600 text-[7px] uppercase">Spread</div>
              <div style={{ color: ACCENT }}>{b.couponSpread}bp</div>
            </div>
            <div>
              <div className="text-neutral-600 text-[7px] uppercase">Exp. Loss</div>
              <div className="text-red-400">{b.expectedLoss}%</div>
            </div>
            <div>
              <div className="text-neutral-600 text-[7px] uppercase">Amount</div>
              <div className="text-white/80 font-bold">${b.amount}M</div>
            </div>
            <div>
              <div className="text-neutral-600 text-[7px] uppercase">Maturity</div>
              <div className="text-neutral-400">{b.maturity}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Reinsurance Pricing Section ──

function ReinsurancePricingSection({
  pricing,
  t,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pricing: any;
  t: ReturnType<typeof useT>;
}) {
  if (!pricing) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 flex items-center justify-between">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'imReinsurancePricing', 'Reinsurance Pricing')}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-[7px] font-mono text-neutral-600 uppercase">ROL Index</span>
          <span className="text-[9px] font-mono font-bold" style={{ color: ACCENT }}>{pricing.rolIndex}%</span>
          <span className={`text-[8px] font-mono font-bold ${pricing.rolChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {pricing.rolChange >= 0 ? '\u2191' : '\u2193'}{Math.abs(pricing.rolChange)}%
          </span>
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_64px] px-2 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Region</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Rate Chg</span>
      </div>

      {/* Rows */}
      {pricing.regions?.map((r: { region: string; rateChange: number }) => (
        <div
          key={r.region}
          className="grid grid-cols-[1fr_64px] px-2 py-1 border-b border-border/5 hover:bg-rose-400/[0.02]"
        >
          <span className="text-[8px] font-mono text-white/80 truncate">{r.region}</span>
          <span className={`text-[8px] font-mono font-bold text-right ${r.rateChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {r.rateChange >= 0 ? '\u2191' : '\u2193'}{Math.abs(r.rateChange)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Recent Loss Events Section ──

function RecentLossEventsSection({
  events,
  t,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  events: any[];
  t: ReturnType<typeof useT>;
}) {
  if (!events?.length) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'imRecentLossEvents', 'Recent Loss Events')}
        </span>
      </div>

      {events.map((e: {
        event: string; type: string; totalLoss: number;
        insuredLoss: number; date: string; region: string;
      }, i: number) => (
        <div key={i} className="px-2 py-1.5 border-b border-border/5 hover:bg-rose-400/[0.02]">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-mono font-bold text-white">{e.event}</span>
              <span
                className="text-[7px] font-bold font-mono px-1 py-0"
                style={{ color: lossTypeColor(e.type), background: `${lossTypeColor(e.type)}15` }}
              >
                {e.type.toUpperCase()}
              </span>
            </div>
            <span className="text-[7px] font-mono text-neutral-600">{e.date}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[8px] font-mono">
            <div>
              <span className="text-neutral-600 text-[7px] uppercase">Total Loss </span>
              <span className="text-red-400 font-bold">${e.totalLoss}B</span>
            </div>
            <div>
              <span className="text-neutral-600 text-[7px] uppercase">Insured </span>
              <span style={{ color: ACCENT }} className="font-bold">${e.insuredLoss}B</span>
            </div>
            <div>
              <span className="text-neutral-600 text-[7px] uppercase">Region </span>
              <span className="text-white/60">{e.region}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
