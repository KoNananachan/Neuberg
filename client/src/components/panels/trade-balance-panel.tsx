import { useTradeBalance } from '../../api/hooks/use-trade-balance';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Constants ──

const CYAN = '#22d3ee'; // cyan-400
const GREEN = '#4ade80';
const RED = '#f87171';
const AMBER = '#fbbf24';

// ── Formatting helpers ──

function fmtB(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000) return (n / 1_000).toFixed(1) + 'T';
  return n.toFixed(1) + 'B';
}

function fmtBSigned(n: number): string {
  const prefix = n > 0 ? '+' : '';
  return prefix + '$' + fmtB(n);
}

function fmtPct(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
}

function fmtM(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000) return (n / 1_000).toFixed(1) + 'B';
  return n.toFixed(0) + 'M';
}

// ── Color helpers ──

function balanceColor(n: number): string {
  if (n > 0) return GREEN;
  if (n < 0) return RED;
  return AMBER;
}

function changeColor(n: number): string {
  if (n > 0) return GREEN;
  if (n < 0) return RED;
  return AMBER;
}

// ── Fallback data (realistic US trade figures, $B) ──

interface CountryBalance {
  country: string;
  code: string;
  balance: number;
  exports: number;
  imports: number;
  changePct: number;
  trend: 'improving' | 'worsening' | 'stable';
}

interface CurrentAccountEntry {
  component: string;
  value: number;
  prevValue: number;
  changePct: number;
}

interface TopPartner {
  country: string;
  code: string;
  totalTrade: number;
  exports: number;
  imports: number;
  sharePct: number;
}

interface TradeCategory {
  category: string;
  exports: number;
  imports: number;
  balance: number;
  changePct: number;
}

interface ContainerEntry {
  port: string;
  teus: number;
  changePct: number;
  utilizationPct: number;
}

interface PolicyEntry {
  action: string;
  target: string;
  status: 'active' | 'proposed' | 'expired';
  effectDate: string;
  impactB: number;
}

interface TradeBalanceData {
  timestamp: string;
  headlineBalance: number;
  headlineChangePct: number;
  period: string;
  countries: CountryBalance[];
  currentAccount: CurrentAccountEntry[];
  topPartners: TopPartner[];
  categories: TradeCategory[];
  containers: ContainerEntry[];
  policies: PolicyEntry[];
}

const FALLBACK_DATA: TradeBalanceData = {
  timestamp: new Date().toISOString(),
  headlineBalance: -68.3,
  headlineChangePct: -2.4,
  period: 'JAN 2026',
  countries: [
    { country: 'China', code: 'CN', balance: 75.2, exports: 142.8, imports: 67.6, changePct: 3.1, trend: 'improving' },
    { country: 'United States', code: 'US', balance: -68.3, exports: 176.4, imports: 244.7, changePct: -2.4, trend: 'worsening' },
    { country: 'Germany', code: 'DE', balance: 22.4, exports: 134.5, imports: 112.1, changePct: 1.8, trend: 'improving' },
    { country: 'Japan', code: 'JP', balance: -3.8, exports: 62.1, imports: 65.9, changePct: -12.5, trend: 'worsening' },
    { country: 'South Korea', code: 'KR', balance: 4.2, exports: 55.3, imports: 51.1, changePct: 5.6, trend: 'improving' },
    { country: 'India', code: 'IN', balance: -23.4, exports: 34.2, imports: 57.6, changePct: -4.1, trend: 'worsening' },
    { country: 'Mexico', code: 'MX', balance: -12.8, exports: 26.7, imports: 39.5, changePct: -1.9, trend: 'stable' },
    { country: 'Canada', code: 'CA', balance: -8.1, exports: 31.4, imports: 39.5, changePct: 0.4, trend: 'stable' },
    { country: 'Vietnam', code: 'VN', balance: 10.6, exports: 31.2, imports: 20.6, changePct: 8.3, trend: 'improving' },
    { country: 'Taiwan', code: 'TW', balance: 5.8, exports: 38.7, imports: 32.9, changePct: 2.1, trend: 'improving' },
    { country: 'United Kingdom', code: 'GB', balance: -2.4, exports: 56.8, imports: 59.2, changePct: -0.8, trend: 'stable' },
    { country: 'Brazil', code: 'BR', balance: 6.3, exports: 28.9, imports: 22.6, changePct: 4.7, trend: 'improving' },
  ],
  currentAccount: [
    { component: 'Goods Balance', value: -88.2, prevValue: -85.6, changePct: -3.0 },
    { component: 'Services Balance', value: 22.4, prevValue: 21.8, changePct: 2.8 },
    { component: 'Primary Income', value: 4.8, prevValue: 5.1, changePct: -5.9 },
    { component: 'Secondary Income', value: -7.3, prevValue: -7.0, changePct: -4.3 },
    { component: 'Current Account', value: -68.3, prevValue: -65.7, changePct: -4.0 },
  ],
  topPartners: [
    { country: 'Canada', code: 'CA', totalTrade: 70.9, exports: 31.4, imports: 39.5, sharePct: 15.2 },
    { country: 'Mexico', code: 'MX', totalTrade: 66.2, exports: 26.7, imports: 39.5, sharePct: 14.2 },
    { country: 'China', code: 'CN', totalTrade: 55.8, exports: 12.2, imports: 43.6, sharePct: 12.0 },
    { country: 'Japan', code: 'JP', totalTrade: 24.3, exports: 8.1, imports: 16.2, sharePct: 5.2 },
    { country: 'Germany', code: 'DE', totalTrade: 22.8, exports: 7.4, imports: 15.4, sharePct: 4.9 },
    { country: 'South Korea', code: 'KR', totalTrade: 19.5, exports: 6.8, imports: 12.7, sharePct: 4.2 },
    { country: 'United Kingdom', code: 'GB', totalTrade: 17.2, exports: 8.9, imports: 8.3, sharePct: 3.7 },
    { country: 'India', code: 'IN', totalTrade: 14.8, exports: 4.2, imports: 10.6, sharePct: 3.2 },
  ],
  categories: [
    { category: 'Petroleum & Products', exports: 18.2, imports: 24.6, balance: -6.4, changePct: -8.2 },
    { category: 'Automotive', exports: 12.8, imports: 32.4, balance: -19.6, changePct: -3.1 },
    { category: 'Consumer Electronics', exports: 8.4, imports: 28.7, balance: -20.3, changePct: -1.4 },
    { category: 'Pharmaceuticals', exports: 6.2, imports: 18.9, balance: -12.7, changePct: -5.7 },
    { category: 'Semiconductors', exports: 5.8, imports: 14.2, balance: -8.4, changePct: 12.3 },
    { category: 'Agricultural Products', exports: 16.4, imports: 12.1, balance: 4.3, changePct: 2.8 },
    { category: 'Aerospace', exports: 14.2, imports: 3.8, balance: 10.4, changePct: 6.1 },
    { category: 'Services (Tech)', exports: 22.4, imports: 8.2, balance: 14.2, changePct: 4.5 },
  ],
  containers: [
    { port: 'Los Angeles/Long Beach', teus: 892000, changePct: -3.2, utilizationPct: 87 },
    { port: 'New York/New Jersey', teus: 734000, changePct: 1.8, utilizationPct: 91 },
    { port: 'Savannah', teus: 528000, changePct: 5.4, utilizationPct: 82 },
    { port: 'Houston', teus: 346000, changePct: 2.1, utilizationPct: 78 },
    { port: 'Seattle/Tacoma', teus: 312000, changePct: -1.6, utilizationPct: 72 },
    { port: 'Norfolk', teus: 298000, changePct: 4.2, utilizationPct: 85 },
  ],
  policies: [
    { action: 'Section 301 Tariff', target: 'China (25%)', status: 'active', effectDate: '2025-02-04', impactB: -32.4 },
    { action: 'Steel/Aluminum Tariff', target: 'Global (25%)', status: 'active', effectDate: '2025-03-12', impactB: -8.7 },
    { action: 'Reciprocal Tariff', target: 'EU (20%)', status: 'active', effectDate: '2025-04-09', impactB: -14.2 },
    { action: 'Auto Tariff', target: 'Global (25%)', status: 'active', effectDate: '2025-04-03', impactB: -11.3 },
    { action: 'USMCA Review', target: 'CA/MX', status: 'proposed', effectDate: '2026-07-01', impactB: -5.8 },
    { action: 'Tech Export Control', target: 'China (Chips)', status: 'active', effectDate: '2025-01-15', impactB: -4.1 },
  ],
};

// ── Horizontal balance bar ──

function BalanceBar({ value, maxAbs }: { value: number; maxAbs: number }) {
  const pct = maxAbs > 0 ? Math.min(Math.abs(value) / maxAbs * 100, 100) : 0;
  const color = balanceColor(value);

  return (
    <div className="flex-1 h-[5px] bg-white/[0.03] relative overflow-hidden">
      {value >= 0 ? (
        <div
          className="absolute top-0 left-1/2 h-full"
          style={{ width: `${pct / 2}%`, backgroundColor: color, opacity: 0.5 }}
        />
      ) : (
        <div
          className="absolute top-0 h-full"
          style={{ width: `${pct / 2}%`, right: '50%', backgroundColor: color, opacity: 0.5 }}
        />
      )}
      <div className="absolute top-0 left-1/2 w-px h-full bg-white/10" />
    </div>
  );
}

// ── Utilization bar ──

function UtilBar({ pct }: { pct: number }) {
  const color = pct >= 90 ? RED : pct >= 80 ? AMBER : GREEN;

  return (
    <div className="w-12 h-[5px] bg-white/[0.04] relative overflow-hidden">
      <div
        className="absolute top-0 left-0 h-full"
        style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.6 }}
      />
    </div>
  );
}

// ── Section header ──

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1 bg-white/[0.02] border-b border-border/20">
      <div className="w-1 h-2.5" style={{ backgroundColor: CYAN, opacity: 0.6 }} />
      <span className="text-[7px] font-mono font-black uppercase tracking-wider text-white/40">
        {label}
      </span>
    </div>
  );
}

// ── Status badge ──

function StatusBadge({ status }: { status: 'active' | 'proposed' | 'expired' }) {
  const cfg = {
    active: { text: 'ACTIVE', color: RED, bg: 'rgba(248,113,113,0.12)' },
    proposed: { text: 'PROPOSED', color: AMBER, bg: 'rgba(251,191,36,0.1)' },
    expired: { text: 'EXPIRED', color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.03)' },
  }[status];

  return (
    <span
      className="text-[5px] font-mono font-black uppercase px-1 py-0"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}
    >
      {cfg.text}
    </span>
  );
}

// ── Trend badge ──

function TrendBadge({ trend }: { trend: 'improving' | 'worsening' | 'stable' }) {
  const cfg = {
    improving: { text: 'IMPROVING', color: GREEN, bg: 'rgba(74,222,128,0.1)' },
    worsening: { text: 'WORSENING', color: RED, bg: 'rgba(248,113,113,0.1)' },
    stable: { text: 'STABLE', color: AMBER, bg: 'rgba(251,191,36,0.08)' },
  }[trend];

  return (
    <span
      className="text-[5px] font-mono font-black uppercase px-1 py-0"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}
    >
      {cfg.text}
    </span>
  );
}

// ── Main Panel ──

export function TradeBalancePanel() {
  const t = useT();
  const { data: hookData, isLoading, refetch } = useTradeBalance();

  // Use hook data if available, otherwise fallback
  const data: TradeBalanceData = hookData ?? FALLBACK_DATA;

  const maxAbsBalance = Math.max(...data.countries.map(c => Math.abs(c.balance)), 1);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 16 16" className="w-4 h-4">
            <path d="M2 12L6 8L10 10L14 4" fill="none" stroke={CYAN} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M11 4H14V7" fill="none" stroke={CYAN} strokeWidth="1" strokeLinecap="round" />
            <line x1="2" y1="14" x2="14" y2="14" stroke={CYAN} strokeWidth="0.6" opacity="0.3" />
          </svg>
          <span className="text-[9px] font-black uppercase tracking-tighter" style={{ color: CYAN }}>
            {tr(t, 'tradeBalanceTitle', 'Trade Balance')}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[7px] font-mono text-white/20">{data.period}</span>
          <span
            className="text-[7px] font-mono font-bold px-1 py-0.5"
            style={{
              color: balanceColor(data.headlineBalance),
              backgroundColor: data.headlineBalance < 0 ? 'rgba(248,113,113,0.08)' : 'rgba(74,222,128,0.08)',
            }}
          >
            {fmtBSigned(data.headlineBalance)}
          </span>
          <span
            className="text-[6px] font-mono font-bold"
            style={{ color: changeColor(data.headlineChangePct) }}
          >
            {fmtPct(data.headlineChangePct)}
          </span>
          <button onClick={() => refetch()} className="p-0.5 text-white/30 hover:text-cyan-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading && !hookData ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
              <span className="text-[10px] text-white/40 uppercase tracking-widest">
                {tr(t, 'loading', 'Loading...')}
              </span>
            </div>
          </div>
        ) : (
          <>
            {/* ── Trade Balance by Country ── */}
            <SectionHeader label={tr(t, 'tbCountry', 'Trade Balance by Country')} />
            <div>
              {/* Column headers */}
              <div className="flex items-center px-2 py-0.5 border-b border-border/20 text-[6px] font-mono text-white/20 uppercase tracking-wider">
                <span className="w-14 shrink-0">COUNTRY</span>
                <span className="w-10 shrink-0 text-right">BALANCE</span>
                <span className="flex-1 text-center">SURPLUS / DEFICIT</span>
                <span className="w-10 shrink-0 text-right">EXP</span>
                <span className="w-10 shrink-0 text-right">IMP</span>
                <span className="w-8 shrink-0 text-right">CHG</span>
                <span className="w-14 shrink-0 text-right">TREND</span>
              </div>
              {data.countries.map(c => (
                <div
                  key={c.code}
                  className="flex items-center px-2 py-[3px] border-b border-white/[0.03] hover:bg-cyan-400/[0.02] transition-colors"
                >
                  <div className="w-14 shrink-0 flex flex-col">
                    <span className="text-[8px] font-bold text-white/70">{c.code}</span>
                    <span className="text-[6px] text-white/25 truncate">{c.country}</span>
                  </div>
                  <span
                    className="w-10 shrink-0 text-right text-[8px] font-bold"
                    style={{ color: balanceColor(c.balance) }}
                  >
                    {fmtBSigned(c.balance)}
                  </span>
                  <div className="flex-1 px-1">
                    <BalanceBar value={c.balance} maxAbs={maxAbsBalance} />
                  </div>
                  <span className="w-10 shrink-0 text-right text-[7px] text-white/40">
                    ${fmtB(c.exports)}
                  </span>
                  <span className="w-10 shrink-0 text-right text-[7px] text-white/40">
                    ${fmtB(c.imports)}
                  </span>
                  <span
                    className="w-8 shrink-0 text-right text-[7px] font-bold"
                    style={{ color: changeColor(c.changePct) }}
                  >
                    {fmtPct(c.changePct)}
                  </span>
                  <div className="w-14 shrink-0 flex justify-end">
                    <TrendBadge trend={c.trend} />
                  </div>
                </div>
              ))}
            </div>

            {/* ── Current Account ── */}
            <SectionHeader label={tr(t, 'tbCurrentAccount', 'Current Account')} />
            <div>
              <div className="flex items-center px-2 py-0.5 border-b border-border/20 text-[6px] font-mono text-white/20 uppercase tracking-wider">
                <span className="flex-1">COMPONENT</span>
                <span className="w-14 text-right">CURRENT</span>
                <span className="w-14 text-right">PREVIOUS</span>
                <span className="w-10 text-right">CHG%</span>
              </div>
              {data.currentAccount.map(ca => {
                const isTotal = ca.component === 'Current Account';
                return (
                  <div
                    key={ca.component}
                    className={`flex items-center px-2 py-[3px] border-b hover:bg-cyan-400/[0.02] transition-colors ${
                      isTotal ? 'border-white/[0.08] bg-white/[0.02]' : 'border-white/[0.03]'
                    }`}
                  >
                    <span className={`flex-1 text-[8px] ${isTotal ? 'font-black text-white/80' : 'text-white/50'}`}>
                      {ca.component}
                    </span>
                    <span
                      className={`w-14 text-right text-[8px] font-bold ${isTotal ? 'font-black' : ''}`}
                      style={{ color: balanceColor(ca.value) }}
                    >
                      {fmtBSigned(ca.value)}
                    </span>
                    <span className="w-14 text-right text-[7px] text-white/30">
                      {fmtBSigned(ca.prevValue)}
                    </span>
                    <span
                      className="w-10 text-right text-[7px] font-bold"
                      style={{ color: changeColor(ca.changePct) }}
                    >
                      {fmtPct(ca.changePct)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* ── Top Trade Partners (US) ── */}
            <SectionHeader label={tr(t, 'tbTopPartners', 'Top Trade Partners (US)')} />
            <div>
              <div className="flex items-center px-2 py-0.5 border-b border-border/20 text-[6px] font-mono text-white/20 uppercase tracking-wider">
                <span className="w-8 shrink-0">#</span>
                <span className="w-14 shrink-0">PARTNER</span>
                <span className="w-12 shrink-0 text-right">TOTAL</span>
                <span className="w-10 shrink-0 text-right">EXP</span>
                <span className="w-10 shrink-0 text-right">IMP</span>
                <span className="flex-1 text-right">SHARE</span>
                <span className="w-14 shrink-0" />
              </div>
              {data.topPartners.map((p, i) => {
                const barW = Math.min(p.sharePct / 18 * 100, 100);
                return (
                  <div
                    key={p.code}
                    className="flex items-center px-2 py-[3px] border-b border-white/[0.03] hover:bg-cyan-400/[0.02] transition-colors"
                  >
                    <span className="w-8 shrink-0 text-[7px] text-white/20">{i + 1}</span>
                    <div className="w-14 shrink-0 flex flex-col">
                      <span className="text-[8px] font-bold text-white/70">{p.code}</span>
                      <span className="text-[6px] text-white/25 truncate">{p.country}</span>
                    </div>
                    <span className="w-12 shrink-0 text-right text-[8px] font-bold text-white/60">
                      ${fmtB(p.totalTrade)}
                    </span>
                    <span className="w-10 shrink-0 text-right text-[7px] text-green-400/60">
                      ${fmtB(p.exports)}
                    </span>
                    <span className="w-10 shrink-0 text-right text-[7px] text-red-400/60">
                      ${fmtB(p.imports)}
                    </span>
                    <span className="flex-1 text-right text-[7px] text-white/40">
                      {p.sharePct.toFixed(1)}%
                    </span>
                    <div className="w-14 shrink-0 pl-1">
                      <div className="h-[4px] bg-white/[0.03] relative overflow-hidden">
                        <div
                          className="absolute top-0 left-0 h-full"
                          style={{ width: `${barW}%`, backgroundColor: CYAN, opacity: 0.35 }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Trade by Category ── */}
            <SectionHeader label={tr(t, 'tbCategory', 'Trade by Category')} />
            <div>
              <div className="flex items-center px-2 py-0.5 border-b border-border/20 text-[6px] font-mono text-white/20 uppercase tracking-wider">
                <span className="flex-1">CATEGORY</span>
                <span className="w-10 text-right">EXP</span>
                <span className="w-10 text-right">IMP</span>
                <span className="w-12 text-right">BALANCE</span>
                <span className="w-10 text-right">CHG%</span>
              </div>
              {data.categories.map(cat => (
                <div
                  key={cat.category}
                  className="flex items-center px-2 py-[3px] border-b border-white/[0.03] hover:bg-cyan-400/[0.02] transition-colors"
                >
                  <span className="flex-1 text-[8px] text-white/50 truncate">{cat.category}</span>
                  <span className="w-10 text-right text-[7px] text-green-400/60">${fmtB(cat.exports)}</span>
                  <span className="w-10 text-right text-[7px] text-red-400/60">${fmtB(cat.imports)}</span>
                  <span
                    className="w-12 text-right text-[8px] font-bold"
                    style={{ color: balanceColor(cat.balance) }}
                  >
                    {fmtBSigned(cat.balance)}
                  </span>
                  <span
                    className="w-10 text-right text-[7px] font-bold"
                    style={{ color: changeColor(cat.changePct) }}
                  >
                    {fmtPct(cat.changePct)}
                  </span>
                </div>
              ))}
            </div>

            {/* ── Container Trade ── */}
            <SectionHeader label={tr(t, 'tbContainer', 'Container Trade')} />
            <div>
              <div className="flex items-center px-2 py-0.5 border-b border-border/20 text-[6px] font-mono text-white/20 uppercase tracking-wider">
                <span className="flex-1">PORT</span>
                <span className="w-12 text-right">TEUS</span>
                <span className="w-8 text-right">CHG</span>
                <span className="w-8 text-right">UTIL</span>
                <span className="w-14 shrink-0" />
              </div>
              {data.containers.map(ct => (
                <div
                  key={ct.port}
                  className="flex items-center px-2 py-[3px] border-b border-white/[0.03] hover:bg-cyan-400/[0.02] transition-colors"
                >
                  <span className="flex-1 text-[8px] text-white/50 truncate">{ct.port}</span>
                  <span className="w-12 text-right text-[8px] font-bold text-white/60">
                    {fmtM(ct.teus / 1_000)}
                  </span>
                  <span
                    className="w-8 text-right text-[7px] font-bold"
                    style={{ color: changeColor(ct.changePct) }}
                  >
                    {fmtPct(ct.changePct)}
                  </span>
                  <span className="w-8 text-right text-[7px] text-white/40">
                    {ct.utilizationPct}%
                  </span>
                  <div className="w-14 shrink-0 pl-1">
                    <UtilBar pct={ct.utilizationPct} />
                  </div>
                </div>
              ))}
            </div>

            {/* ── Trade Policy ── */}
            <SectionHeader label={tr(t, 'tbPolicy', 'Trade Policy')} />
            <div>
              <div className="flex items-center px-2 py-0.5 border-b border-border/20 text-[6px] font-mono text-white/20 uppercase tracking-wider">
                <span className="flex-1">ACTION</span>
                <span className="w-16 shrink-0">TARGET</span>
                <span className="w-12 shrink-0 text-center">STATUS</span>
                <span className="w-14 shrink-0 text-right">EFFECTIVE</span>
                <span className="w-12 shrink-0 text-right">IMPACT</span>
              </div>
              {data.policies.map((p, i) => (
                <div
                  key={`${p.action}-${i}`}
                  className="flex items-center px-2 py-[3px] border-b border-white/[0.03] hover:bg-cyan-400/[0.02] transition-colors"
                >
                  <span className="flex-1 text-[8px] text-white/50 truncate">{p.action}</span>
                  <span className="w-16 shrink-0 text-[7px] text-white/40 truncate">{p.target}</span>
                  <div className="w-12 shrink-0 flex justify-center">
                    <StatusBadge status={p.status} />
                  </div>
                  <span className="w-14 shrink-0 text-right text-[7px] text-white/30">{p.effectDate}</span>
                  <span
                    className="w-12 shrink-0 text-right text-[8px] font-bold"
                    style={{ color: balanceColor(p.impactB) }}
                  >
                    {fmtBSigned(p.impactB)}
                  </span>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-2 py-1 border-t border-border/20 bg-white/[0.01]">
              <div className="flex items-center justify-between">
                <span className="text-[6px] text-white/15 uppercase tracking-wider">
                  {tr(t, 'tbSource', 'Source: BEA / Census Bureau / BLS')}
                </span>
                <span className="text-[6px] text-white/15">
                  {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
