import { useState } from 'react';
import { useFxReserves } from '../../api/hooks/use-fx-reserves';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Types ──

type Tab = 'RESERVES' | 'COMPOSITION' | 'GOLD' | 'TRENDS';

interface ReserveEntry {
  rank: number;
  country: string;
  code: string;
  totalB: number;
  changeB: number;
  changePct: number;
  monthsOfImports: number;
  gdpPct: number;
}

interface CompositionEntry {
  currency: string;
  code: string;
  shareGlobal: number;
  prevShare: number;
  changeYoY: number;
  valueT: number;
}

interface GoldEntry {
  rank: number;
  country: string;
  code: string;
  tonnesHeld: number;
  valueB: number;
  reservesPct: number;
  changeYtd: number;
}

interface TrendEntry {
  country: string;
  code: string;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  ytdChange: number;
  direction: 'up' | 'down' | 'flat';
}

interface GlobalTotal {
  totalReservesT: number;
  changeYoYPct: number;
  avgMonthsImports: number;
  countriesTracked: number;
}

// ── Formatting helpers ──

function fmtB(n: number): string {
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(2) + 'T';
  return n.toFixed(1) + 'B';
}

function fmtT(n: number): string {
  return n.toFixed(2) + 'T';
}

function fmtPct(n: number): string {
  return n.toFixed(1) + '%';
}

function fmtChg(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtChgPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtTonnes(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toFixed(0);
}

// ── Color helpers ──

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function trendArrow(n: number): string {
  if (n > 0) return '\u25B2';
  if (n < 0) return '\u25BC';
  return '\u25C6';
}

function directionColor(d: string): string {
  if (d === 'up') return 'text-green-400';
  if (d === 'down') return 'text-red-400';
  return 'text-neutral-500';
}

// ── Country flag from 2-letter ISO code ──

function countryFlag(code: string): string {
  if (!code || code.length !== 2) return '';
  const upper = code.toUpperCase();
  const cp1 = 0x1F1E6 + (upper.charCodeAt(0) - 65);
  const cp2 = 0x1F1E6 + (upper.charCodeAt(1) - 65);
  return String.fromCodePoint(cp1, cp2);
}

// ── Shimmer skeleton for loading state ──

function Shimmer({ w, h }: { w: string; h?: string }) {
  return (
    <div
      className="animate-pulse bg-teal-400/[0.06]"
      style={{ width: w, height: h || '8px' }}
    />
  );
}

function SkeletonRows({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-2 px-2 py-[5px] border-b border-border/20"
        >
          {Array.from({ length: cols }).map((_, j) => (
            <Shimmer key={j} w={j === 0 ? '48px' : j === 1 ? '64px' : '40px'} />
          ))}
        </div>
      ))}
    </>
  );
}

// ── Reserves Tab ──

function ReservesTab({ reserves, globalTotal }: { reserves: ReserveEntry[]; globalTotal: GlobalTotal }) {
  const maxVal = Math.max(...reserves.map((r) => r.totalB), 1);

  return (
    <div>
      {/* Global summary row */}
      <div className="border-b border-border/20 bg-[#030303]">
        <div className="flex items-center gap-0 divide-x divide-teal-400/10">
          <div className="flex-1 px-3 py-1.5 text-center">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              Global Reserves
            </div>
            <div className="text-[11px] font-mono font-black text-teal-400">
              ${fmtT(globalTotal.totalReservesT)}
            </div>
          </div>
          <div className="flex-1 px-3 py-1.5 text-center">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              YoY Change
            </div>
            <div className={`text-[11px] font-mono font-black ${changeColor(globalTotal.changeYoYPct)}`}>
              {fmtChgPct(globalTotal.changeYoYPct)}
            </div>
          </div>
          <div className="flex-1 px-3 py-1.5 text-center">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              Avg Months Cover
            </div>
            <div className="text-[11px] font-mono font-black text-white">
              {globalTotal.avgMonthsImports.toFixed(1)}
            </div>
          </div>
          <div className="flex-1 px-3 py-1.5 text-center">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              Countries
            </div>
            <div className="text-[11px] font-mono font-black text-neutral-300">
              {globalTotal.countriesTracked}
            </div>
          </div>
        </div>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[20px_18px_1fr_72px_52px_44px_44px_40px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">#</span>
        <span className="text-[7px] font-mono text-neutral-600" />
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Country</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Total ($B)</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Chg</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Chg%</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Months</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">%GDP</span>
      </div>

      {/* Rows */}
      {reserves.map((r) => {
        const barPct = maxVal > 0 ? Math.min((r.totalB / maxVal) * 100, 100) : 0;
        return (
          <div
            key={`${r.code}-${r.rank}`}
            className="grid grid-cols-[20px_18px_1fr_72px_52px_44px_44px_40px] gap-0 px-2 py-[3px] border-b border-border/20 hover:bg-teal-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono text-neutral-600">{r.rank}</span>
            <span className="text-[10px] leading-none">{countryFlag(r.code)}</span>
            <div className="flex flex-col gap-0 overflow-hidden">
              <span className="text-[8px] font-mono font-bold text-teal-400 truncate">{r.country}</span>
              {/* Reserve bar */}
              <div className="w-full h-[2px] bg-neutral-900 mt-0.5">
                <div
                  className="h-full bg-teal-400/40"
                  style={{ width: `${barPct}%` }}
                />
              </div>
            </div>
            <span className="text-[8px] font-mono font-bold text-white text-right">{fmtB(r.totalB)}</span>
            <span className={`text-[8px] font-mono font-bold text-right ${changeColor(r.changeB)}`}>
              {fmtChg(r.changeB)}
            </span>
            <span className={`text-[8px] font-mono text-right ${changeColor(r.changePct)}`}>
              {fmtChgPct(r.changePct)}
            </span>
            <span className="text-[8px] font-mono text-neutral-400 text-right">
              {r.monthsOfImports.toFixed(1)}
            </span>
            <span className="text-[8px] font-mono text-neutral-400 text-right pr-2">
              {fmtPct(r.gdpPct)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Composition Tab ──

function CompositionTab({ composition }: { composition: CompositionEntry[] }) {
  const maxShare = Math.max(...composition.map((c) => c.shareGlobal), 1);

  return (
    <div>
      {/* Section header */}
      <div className="px-3 py-1 border-b border-border/20 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Global Reserve Currency Allocation
        </span>
      </div>

      {/* Horizontal composition bar */}
      <div className="px-3 py-2 border-b border-border/20">
        <div className="flex h-3 overflow-hidden">
          {composition.map((c) => {
            const colors: Record<string, string> = {
              USD: '#2dd4bf', EUR: '#60a5fa', JPY: '#f472b6', GBP: '#a78bfa',
              CNY: '#fb923c', AUD: '#34d399', CAD: '#fbbf24', CHF: '#f87171',
            };
            const bg = colors[c.code] || '#6b7280';
            return (
              <div
                key={c.code}
                className="h-full relative group"
                style={{ width: `${c.shareGlobal}%`, backgroundColor: bg, opacity: 0.6 }}
                title={`${c.code}: ${fmtPct(c.shareGlobal)}`}
              />
            );
          })}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
          {composition.map((c) => {
            const colors: Record<string, string> = {
              USD: '#2dd4bf', EUR: '#60a5fa', JPY: '#f472b6', GBP: '#a78bfa',
              CNY: '#fb923c', AUD: '#34d399', CAD: '#fbbf24', CHF: '#f87171',
            };
            const bg = colors[c.code] || '#6b7280';
            return (
              <div key={c.code} className="flex items-center gap-1">
                <div className="w-1.5 h-1.5" style={{ backgroundColor: bg, opacity: 0.6 }} />
                <span className="text-[7px] font-mono text-neutral-400">{c.code}</span>
                <span className="text-[7px] font-mono font-bold text-white">{fmtPct(c.shareGlobal)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_52px_52px_52px_56px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Currency</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Share %</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Prev %</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">YoY Chg</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Value</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center pr-2">Bar</span>
      </div>

      {/* Rows */}
      {composition.map((c) => {
        const barPct = maxShare > 0 ? Math.min((c.shareGlobal / maxShare) * 100, 100) : 0;
        return (
          <div
            key={c.code}
            className="grid grid-cols-[1fr_56px_52px_52px_52px_56px] gap-0 px-2 py-[3px] border-b border-border/20 hover:bg-teal-400/[0.02] transition-colors items-center"
          >
            <div className="flex flex-col">
              <span className="text-[8px] font-mono font-bold text-teal-400">{c.code}</span>
              <span className="text-[7px] font-mono text-neutral-600 truncate">{c.currency}</span>
            </div>
            <span className="text-[8px] font-mono font-bold text-white text-right">{fmtPct(c.shareGlobal)}</span>
            <span className="text-[8px] font-mono text-neutral-500 text-right">{fmtPct(c.prevShare)}</span>
            <span className={`text-[8px] font-mono font-bold text-right ${changeColor(c.changeYoY)}`}>
              {trendArrow(c.changeYoY)} {fmtChgPct(c.changeYoY)}
            </span>
            <span className="text-[8px] font-mono text-neutral-400 text-right">${fmtT(c.valueT)}</span>
            <div className="px-1">
              <div className="w-full h-1.5 bg-neutral-900 relative">
                <div
                  className="absolute top-0 left-0 h-full bg-teal-400/50"
                  style={{ width: `${barPct}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Gold Tab ──

function GoldTab({ goldReserves }: { goldReserves: GoldEntry[] }) {
  const maxTonnes = Math.max(...goldReserves.map((g) => g.tonnesHeld), 1);
  const totalTonnes = goldReserves.reduce((s, g) => s + g.tonnesHeld, 0);
  const totalValueB = goldReserves.reduce((s, g) => s + g.valueB, 0);

  return (
    <div>
      {/* Gold summary */}
      <div className="border-b border-border/20 bg-[#030303]">
        <div className="flex items-center gap-0 divide-x divide-teal-400/10">
          <div className="flex-1 px-3 py-1.5 text-center">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              Total Gold Held
            </div>
            <div className="text-[11px] font-mono font-black text-amber-400">
              {fmtTonnes(totalTonnes)} t
            </div>
          </div>
          <div className="flex-1 px-3 py-1.5 text-center">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              Total Value
            </div>
            <div className="text-[11px] font-mono font-black text-amber-400">
              ${fmtB(totalValueB)}
            </div>
          </div>
          <div className="flex-1 px-3 py-1.5 text-center">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              Countries
            </div>
            <div className="text-[11px] font-mono font-black text-neutral-300">
              {goldReserves.length}
            </div>
          </div>
        </div>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[20px_18px_1fr_56px_56px_44px_48px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">#</span>
        <span className="text-[7px] font-mono text-neutral-600" />
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Country</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Tonnes</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Value ($B)</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">% Rsv</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">YTD Chg</span>
      </div>

      {/* Rows */}
      {goldReserves.map((g) => {
        const barPct = maxTonnes > 0 ? Math.min((g.tonnesHeld / maxTonnes) * 100, 100) : 0;
        return (
          <div
            key={`${g.code}-${g.rank}`}
            className="grid grid-cols-[20px_18px_1fr_56px_56px_44px_48px] gap-0 px-2 py-[3px] border-b border-border/20 hover:bg-teal-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono text-neutral-600">{g.rank}</span>
            <span className="text-[10px] leading-none">{countryFlag(g.code)}</span>
            <div className="flex flex-col gap-0 overflow-hidden">
              <span className="text-[8px] font-mono font-bold text-amber-400 truncate">{g.country}</span>
              <div className="w-full h-[2px] bg-neutral-900 mt-0.5">
                <div
                  className="h-full bg-amber-400/40"
                  style={{ width: `${barPct}%` }}
                />
              </div>
            </div>
            <span className="text-[8px] font-mono font-bold text-white text-right">{fmtTonnes(g.tonnesHeld)}</span>
            <span className="text-[8px] font-mono text-neutral-300 text-right">{fmtB(g.valueB)}</span>
            <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtPct(g.reservesPct)}</span>
            <span className={`text-[8px] font-mono font-bold text-right pr-2 ${changeColor(g.changeYtd)}`}>
              {trendArrow(g.changeYtd)} {fmtChg(g.changeYtd)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Trends Tab ──

function TrendsTab({ trends }: { trends: TrendEntry[] }) {
  return (
    <div>
      {/* Section header */}
      <div className="px-3 py-1 border-b border-border/20 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Quarterly Reserve Trends ($B)
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[18px_1fr_52px_52px_52px_52px_52px_28px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600" />
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Country</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Q1</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Q2</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Q3</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Q4</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">YTD Chg</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center pr-1">Dir</span>
      </div>

      {/* Rows */}
      {trends.map((tr) => (
        <div
          key={tr.code}
          className="grid grid-cols-[18px_1fr_52px_52px_52px_52px_52px_28px] gap-0 px-2 py-[3px] border-b border-border/20 hover:bg-teal-400/[0.02] transition-colors items-center"
        >
          <span className="text-[10px] leading-none">{countryFlag(tr.code)}</span>
          <span className="text-[8px] font-mono font-bold text-teal-400 truncate">{tr.country}</span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtB(tr.q1)}</span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtB(tr.q2)}</span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtB(tr.q3)}</span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtB(tr.q4)}</span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(tr.ytdChange)}`}>
            {fmtChg(tr.ytdChange)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-center pr-1 ${directionColor(tr.direction)}`}>
            {tr.direction === 'up' ? '\u25B2' : tr.direction === 'down' ? '\u25BC' : '\u25C6'}
          </span>
        </div>
      ))}

      {/* Mini bar chart visualization of YTD changes */}
      {trends.length > 0 && (
        <>
          <div className="px-3 py-1 border-b border-border/20 bg-[#030303] mt-0">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
              YTD Reserve Change ($B)
            </span>
          </div>
          <div className="px-3 py-2 border-b border-border/20">
            <TrendBarChart trends={trends} />
          </div>
        </>
      )}
    </div>
  );
}

// ── Trend bar chart (SVG) ──

function TrendBarChart({ trends }: { trends: TrendEntry[] }) {
  const sorted = [...trends].sort((a, b) => b.ytdChange - a.ytdChange);
  const maxAbs = Math.max(...sorted.map((t) => Math.abs(t.ytdChange)), 1);
  const barH = 10;
  const gap = 2;
  const totalH = sorted.length * (barH + gap);
  const midX = 180;
  const barMaxW = 140;

  return (
    <svg viewBox={`0 0 360 ${totalH}`} className="w-full" style={{ maxHeight: Math.min(totalH, 200) }}>
      {/* Zero line */}
      <line x1={midX} y1={0} x2={midX} y2={totalH} stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} />
      {sorted.map((t, i) => {
        const y = i * (barH + gap);
        const w = (Math.abs(t.ytdChange) / maxAbs) * barMaxW;
        const x = t.ytdChange >= 0 ? midX : midX - w;
        const color = t.ytdChange >= 0 ? 'rgba(45,212,191,0.5)' : 'rgba(248,113,113,0.5)';

        return (
          <g key={t.code}>
            {/* Country label */}
            <text
              x={t.ytdChange >= 0 ? midX - 4 : midX + 4}
              y={y + barH * 0.75}
              textAnchor={t.ytdChange >= 0 ? 'end' : 'start'}
              fill="rgba(255,255,255,0.4)"
              fontSize={6}
              fontFamily="monospace"
            >
              {t.code}
            </text>
            {/* Bar */}
            <rect x={x} y={y} width={Math.max(w, 1)} height={barH} fill={color} />
            {/* Value label */}
            <text
              x={t.ytdChange >= 0 ? midX + w + 3 : midX - w - 3}
              y={y + barH * 0.75}
              textAnchor={t.ytdChange >= 0 ? 'start' : 'end'}
              fill={t.ytdChange >= 0 ? 'rgba(45,212,191,0.7)' : 'rgba(248,113,113,0.7)'}
              fontSize={5.5}
              fontFamily="monospace"
              fontWeight="bold"
            >
              {fmtChg(t.ytdChange)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Main Panel ──

export function FxReservesPanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = useFxReserves();
  const [activeTab, setActiveTab] = useState<Tab>('RESERVES');

  const reserves = data?.reserves as ReserveEntry[] | undefined;
  const globalTotal = data?.globalTotal as GlobalTotal | undefined;
  const currencyComposition = data?.currencyComposition as CompositionEntry[] | undefined;
  const goldReserves = data?.goldReserves as GoldEntry[] | undefined;
  const trends = data?.trends as TrendEntry[] | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-teal-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-teal-400">
            {tr(t, 'fxrTitle', 'FX Reserves Tracker')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {globalTotal && (
            <span className="text-[7px] font-mono text-neutral-600">
              ${fmtT(globalTotal.totalReservesT)} {tr(t, 'fxrGlobal', 'GLOBAL')}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-teal-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-border/20 shrink-0">
        <div className="flex gap-px px-2 py-1 flex-1">
          {(['RESERVES', 'COMPOSITION', 'GOLD', 'TRENDS'] as Tab[]).map((v) => (
            <button
              key={v}
              onClick={() => setActiveTab(v)}
              className={`px-2 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider transition-colors ${
                activeTab === v
                  ? 'text-teal-400 border-b border-teal-400'
                  : 'text-neutral-600 hover:text-neutral-400'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {/* Loading state */}
        {isLoading && !data && (
          <div>
            <div className="border-b border-border/20 bg-[#030303]">
              <div className="flex items-center gap-0 divide-x divide-teal-400/10">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex-1 px-3 py-1.5 text-center">
                    <Shimmer w="48px" h="6px" />
                    <div className="mt-1">
                      <Shimmer w="56px" h="10px" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <SkeletonRows rows={10} cols={6} />
          </div>
        )}

        {/* Error state */}
        {error && !data && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="text-[9px] font-mono text-red-400/80 uppercase tracking-wider">
              {tr(t, 'fxrError', 'Failed to load FX reserves data')}
            </div>
            <button
              onClick={() => refetch()}
              className="px-3 py-1 text-[8px] font-mono font-bold uppercase tracking-wider text-teal-400 border border-teal-400/30 hover:bg-teal-400/[0.05] transition-colors"
            >
              {tr(t, 'fxrRetry', 'Retry')}
            </button>
          </div>
        )}

        {/* No data state */}
        {!data && !isLoading && !error && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'fxrNoData', 'No data available')}
          </div>
        )}

        {/* Data views */}
        {data && activeTab === 'RESERVES' && reserves && globalTotal && (
          <ReservesTab reserves={reserves} globalTotal={globalTotal} />
        )}
        {data && activeTab === 'COMPOSITION' && currencyComposition && (
          <CompositionTab composition={currencyComposition} />
        )}
        {data && activeTab === 'GOLD' && goldReserves && (
          <GoldTab goldReserves={goldReserves} />
        )}
        {data && activeTab === 'TRENDS' && trends && (
          <TrendsTab trends={trends} />
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-0.5 border-t border-border/20 bg-[#050505] shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[7px] font-mono text-neutral-700 uppercase tracking-wider">
            Source: IMF COFER / World Gold Council / National Central Banks
          </span>
          <span className="text-[7px] font-mono text-neutral-700">
            {tr(t, 'fxrQuarterly', 'Quarterly Data')}
          </span>
        </div>
      </div>
    </div>
  );
}
