import { useState } from 'react';
import { useGlobalLiquidityMonitor } from '../../api/hooks/use-global-liquidity-monitor';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// i18n helper with fallback
const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// ── Constants ──

const CYAN = '#22d3ee';
const GREEN = '#34d399';
const RED = '#f87171';
const YELLOW = '#fbbf24';

// ── Formatting helpers ──

function fmtTrillion(n: number): string {
  return '$' + n.toFixed(2) + 'T';
}

function fmtPct(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
}

function fmtPctUnsigned(n: number): string {
  return n.toFixed(1) + '%';
}

function fmtScore(n: number): string {
  return n.toFixed(0);
}

function fmtBn(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000) return (n / 1_000).toFixed(1) + 'T';
  if (abs >= 1) return n.toFixed(1) + 'B';
  return (n * 1_000).toFixed(0) + 'M';
}

function fmtBnSigned(n: number): string {
  const prefix = n > 0 ? '+' : n < 0 ? '-' : '';
  return prefix + '$' + fmtBn(Math.abs(n));
}

// ── Color helpers ──

function changeColor(n: number): string {
  if (n > 0) return GREEN;
  if (n < 0) return RED;
  return 'rgba(255,255,255,0.3)';
}

function trendBadge(trend: string): { text: string; color: string; bg: string } {
  const t = (trend ?? '').toUpperCase();
  if (t === 'EXPANDING' || t.includes('EXPAND')) return { text: 'EXPANDING', color: GREEN, bg: 'rgba(52,211,153,0.12)' };
  if (t === 'CONTRACTING' || t.includes('CONTRACT')) return { text: 'CONTRACTING', color: RED, bg: 'rgba(248,113,113,0.12)' };
  return { text: 'STABLE', color: YELLOW, bg: 'rgba(251,191,36,0.1)' };
}

function directionArrow(dir: string): { arrow: string; color: string } {
  const d = (dir ?? '').toLowerCase();
  if (d === 'up' || d === 'increasing' || d === 'inflow') return { arrow: '\u2191', color: GREEN };
  if (d === 'down' || d === 'decreasing' || d === 'outflow') return { arrow: '\u2193', color: RED };
  return { arrow: '\u2192', color: 'rgba(255,255,255,0.3)' };
}

function signalBadge(signal: string): { text: string; color: string; bg: string } {
  const s = (signal ?? '').toUpperCase();
  if (s === 'TIGHT' || s.includes('TIGHT')) return { text: 'TIGHT', color: RED, bg: 'rgba(248,113,113,0.12)' };
  if (s === 'EASY' || s.includes('EASY')) return { text: 'EASY', color: GREEN, bg: 'rgba(52,211,153,0.12)' };
  return { text: 'NEUTRAL', color: YELLOW, bg: 'rgba(251,191,36,0.1)' };
}

function impulseColor(n: number): string {
  if (n > 1) return GREEN;
  if (n > 0) return CYAN;
  if (n > -1) return YELLOW;
  return RED;
}

// ── Tabs ──

type TabKey = 'balance' | 'm2' | 'credit' | 'funding' | 'flows';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'balance', label: 'BALANCE SHEETS' },
  { key: 'm2', label: 'M2 TRACKER' },
  { key: 'credit', label: 'CREDIT IMPULSE' },
  { key: 'funding', label: 'FUNDING' },
  { key: 'flows', label: 'FLOWS' },
];

// ── Balance Sheets Tab ──

function BalanceSheetsTab({ balanceSheets }: { balanceSheets: any[] }) {
  return (
    <div className="px-1">
      {/* Header */}
      <div className="flex items-center py-0.5 px-1 border-b border-border/20 text-[5px] font-mono text-white/20 uppercase gap-1">
        <span className="w-[72px] shrink-0">CENTRAL BANK</span>
        <span className="w-[52px] text-right shrink-0">TOTAL ASSETS</span>
        <span className="w-[48px] text-right shrink-0">MOM CHG</span>
        <span className="w-[40px] text-right shrink-0">YOY%</span>
        <span className="w-[44px] text-right shrink-0">ASSETS/GDP</span>
        <span className="flex-1 text-right shrink-0">TREND</span>
      </div>

      {(balanceSheets ?? []).map((row: any, i: number) => {
        const badge = trendBadge(row.trend);
        return (
          <div
            key={row.name ?? i}
            className="flex items-center py-[3px] px-1 border-b border-border/5 hover:bg-cyan-400/[0.02] transition-colors text-[7px] font-mono gap-1"
          >
            <span className="w-[72px] font-bold text-cyan-400 truncate shrink-0">{row.name}</span>
            <span className="w-[52px] text-right text-white/60 font-bold shrink-0">{fmtTrillion(row.totalAssets ?? 0)}</span>
            <span className="w-[48px] text-right font-bold shrink-0" style={{ color: changeColor(row.monthlyChange ?? 0) }}>
              {fmtPct(row.monthlyChange ?? 0)}
            </span>
            <span className="w-[40px] text-right font-bold shrink-0" style={{ color: changeColor(row.yoyPct ?? 0) }}>
              {fmtPct(row.yoyPct ?? 0)}
            </span>
            <span className="w-[44px] text-right text-white/40 shrink-0">{fmtPctUnsigned(row.assetsToGdp ?? 0)}</span>
            <span className="flex-1 flex justify-end shrink-0">
              <span
                className="text-[5px] font-black font-mono uppercase px-1 py-0"
                style={{ color: badge.color, backgroundColor: badge.bg }}
              >
                {badge.text}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── M2 Tracker Tab ──

function M2TrackerTab({ m2Data }: { m2Data: any }) {
  const globalAggregate = m2Data?.globalAggregate;
  const economies: any[] = m2Data?.economies ?? [];

  return (
    <div>
      {/* Global aggregate header */}
      {globalAggregate && (
        <div className="flex items-center gap-3 px-3 py-1.5 border-b border-border/20">
          <div>
            <div className="text-[5px] font-mono text-white/20 uppercase tracking-wider">Global M2</div>
            <div className="text-[11px] font-mono font-black text-cyan-400">{fmtTrillion(globalAggregate.level ?? 0)}</div>
          </div>
          <div className="w-px h-5 bg-border/20" />
          <div>
            <div className="text-[5px] font-mono text-white/20 uppercase tracking-wider">Growth</div>
            <div className="text-[11px] font-mono font-black" style={{ color: changeColor(globalAggregate.growthRate ?? 0) }}>
              {fmtPct(globalAggregate.growthRate ?? 0)}
            </div>
          </div>
          <div className="w-px h-5 bg-border/20" />
          <div>
            <div className="text-[5px] font-mono text-white/20 uppercase tracking-wider">Direction</div>
            <div className="text-[11px] font-mono font-black" style={{ color: directionArrow(globalAggregate.direction ?? '').color }}>
              {directionArrow(globalAggregate.direction ?? '').arrow} {(globalAggregate.direction ?? '').toUpperCase()}
            </div>
          </div>
        </div>
      )}

      {/* Per-economy breakdown */}
      <div className="px-1">
        <div className="flex items-center py-0.5 px-1 border-b border-border/20 text-[5px] font-mono text-white/20 uppercase gap-1">
          <span className="w-[72px] shrink-0">ECONOMY</span>
          <span className="w-[56px] text-right shrink-0">LEVEL</span>
          <span className="w-[48px] text-right shrink-0">GROWTH</span>
          <span className="w-[20px] text-center shrink-0">DIR</span>
        </div>

        {economies.map((econ: any, i: number) => {
          const dir = directionArrow(econ.direction ?? '');
          return (
            <div
              key={econ.name ?? i}
              className="flex items-center py-[3px] px-1 border-b border-border/5 hover:bg-cyan-400/[0.02] transition-colors text-[7px] font-mono gap-1"
            >
              <span className="w-[72px] font-bold text-white/60 truncate shrink-0">{econ.name}</span>
              <span className="w-[56px] text-right text-white/50 shrink-0">{fmtTrillion(econ.level ?? 0)}</span>
              <span className="w-[48px] text-right font-bold shrink-0" style={{ color: changeColor(econ.growthRate ?? 0) }}>
                {fmtPct(econ.growthRate ?? 0)}
              </span>
              <span className="w-[20px] text-center font-bold shrink-0" style={{ color: dir.color }}>
                {dir.arrow}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Credit Impulse Tab ──

function CreditImpulseTab({ creditImpulse }: { creditImpulse: any[] }) {
  return (
    <div className="px-2 py-1">
      <div className="grid grid-cols-2 gap-1">
        {(creditImpulse ?? []).map((item: any, i: number) => {
          const dir = directionArrow(item.direction ?? '');
          const impulse = item.creditImpulse ?? 0;
          const color = impulseColor(impulse);

          return (
            <div
              key={item.country ?? i}
              className="border border-border/20 px-2 py-1.5 hover:bg-cyan-400/[0.02] transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[7px] font-mono font-bold text-white/60">{item.country}</span>
                <span
                  className="text-[5px] font-black font-mono uppercase px-1 py-0"
                  style={{ color: dir.color, backgroundColor: dir.color === GREEN ? 'rgba(52,211,153,0.1)' : dir.color === RED ? 'rgba(248,113,113,0.1)' : 'rgba(255,255,255,0.03)' }}
                >
                  {(item.direction ?? 'STABLE').toUpperCase()}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-[11px] font-mono font-black" style={{ color }}>
                  {fmtPct(impulse)}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[5px] font-mono text-white/20">PREV Q:</span>
                <span className="text-[6px] font-mono text-white/35">{fmtPct(item.previousQuarter ?? 0)}</span>
                <span className="text-[5px] font-mono text-white/20">CUR Q:</span>
                <span className="text-[6px] font-mono font-bold" style={{ color }}>{fmtPct(item.currentQuarter ?? impulse)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Funding Tab ──

function FundingTab({ funding }: { funding: any }) {
  const compositeScore: number = funding?.compositeScore ?? 0;
  const components: any[] = funding?.components ?? [];

  // Color for composite score
  const scoreColor = compositeScore >= 70 ? RED : compositeScore >= 40 ? YELLOW : GREEN;

  return (
    <div>
      {/* Composite score gauge */}
      <div className="px-3 py-2 border-b border-border/20">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[6px] font-mono text-white/25 uppercase tracking-wider">Composite Funding Stress Score</span>
          <span className="text-[11px] font-mono font-black" style={{ color: scoreColor }}>
            {fmtScore(compositeScore)} / 100
          </span>
        </div>
        {/* Score bar */}
        <div className="w-full h-2 bg-white/[0.04] relative overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full"
            style={{ width: `${Math.min(compositeScore, 100)}%`, backgroundColor: scoreColor, opacity: 0.6 }}
          />
          {/* Threshold markers */}
          <div className="absolute top-0 h-full w-px bg-white/20" style={{ left: '40%' }} />
          <div className="absolute top-0 h-full w-px bg-white/20" style={{ left: '70%' }} />
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-[5px] font-mono text-white/15">0 EASY</span>
          <span className="text-[5px] font-mono text-white/15">40</span>
          <span className="text-[5px] font-mono text-white/15">70</span>
          <span className="text-[5px] font-mono text-white/15">100 TIGHT</span>
        </div>
      </div>

      {/* Components table */}
      <div className="px-1">
        <div className="flex items-center py-0.5 px-1 border-b border-border/20 text-[5px] font-mono text-white/20 uppercase gap-1">
          <span className="w-[80px] shrink-0">COMPONENT</span>
          <span className="w-[44px] text-right shrink-0">VALUE</span>
          <span className="flex-1 text-center shrink-0">SIGNAL</span>
          <span className="w-[36px] text-right shrink-0">WEIGHT</span>
        </div>

        {components.map((comp: any, i: number) => {
          const badge = signalBadge(comp.signal ?? '');
          return (
            <div
              key={comp.name ?? i}
              className="flex items-center py-[3px] px-1 border-b border-border/5 hover:bg-cyan-400/[0.02] transition-colors text-[7px] font-mono gap-1"
            >
              <span className="w-[80px] font-bold text-white/60 truncate shrink-0">{comp.name}</span>
              <span className="w-[44px] text-right text-white/50 shrink-0">{comp.value}</span>
              <span className="flex-1 flex justify-center shrink-0">
                <span
                  className="text-[5px] font-black font-mono uppercase px-1 py-0"
                  style={{ color: badge.color, backgroundColor: badge.bg }}
                >
                  {badge.text}
                </span>
              </span>
              <span className="w-[36px] text-right text-white/35 shrink-0">{fmtPctUnsigned(comp.weight ?? 0)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Flows Tab ──

function FlowsTab({ flows }: { flows: any[] }) {
  return (
    <div className="px-1">
      {/* Header */}
      <div className="flex items-center py-0.5 px-1 border-b border-border/20 text-[5px] font-mono text-white/20 uppercase gap-1">
        <span className="w-[72px] shrink-0">CORRIDOR</span>
        <span className="w-[44px] shrink-0">TYPE</span>
        <span className="w-[52px] text-right shrink-0">AMOUNT</span>
        <span className="w-[20px] text-center shrink-0">DIR</span>
        <span className="flex-1 text-right shrink-0">TREND</span>
      </div>

      {(flows ?? []).map((flow: any, i: number) => {
        const dir = directionArrow(flow.direction ?? '');
        const trendDir = directionArrow(flow.trend ?? '');

        return (
          <div
            key={flow.corridor ?? i}
            className="flex items-center py-[3px] px-1 border-b border-border/5 hover:bg-cyan-400/[0.02] transition-colors text-[7px] font-mono gap-1"
          >
            <span className="w-[72px] font-bold text-white/60 truncate shrink-0">{flow.corridor}</span>
            <span className="w-[44px] text-white/35 truncate shrink-0 text-[6px]">{flow.type}</span>
            <span className="w-[52px] text-right font-bold shrink-0" style={{ color: changeColor(flow.amount ?? 0) }}>
              {fmtBnSigned(flow.amount ?? 0)}
            </span>
            <span className="w-[20px] text-center font-bold shrink-0" style={{ color: dir.color }}>
              {dir.arrow}
            </span>
            <span className="flex-1 flex justify-end shrink-0">
              <span className="font-bold" style={{ color: trendDir.color }}>
                {trendDir.arrow} {(flow.trend ?? 'stable').toUpperCase()}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Panel ──

export function GlobalLiquidityMonitorPanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = useGlobalLiquidityMonitor();
  const [activeTab, setActiveTab] = useState<TabKey>('balance');

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-cyan-400" />
          <span className="text-[9px] font-black uppercase tracking-tighter text-cyan-400">
            {tr(t, 'glmTitle', 'Global Liquidity Monitor')}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {data?.timestamp && (
            <span className="text-[6px] text-white/20">
              {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button onClick={() => refetch()} className="p-0.5 text-white/30 hover:text-cyan-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-border/20 shrink-0">
        {TABS.map((tab: any) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-1 text-[7px] font-mono font-bold uppercase tracking-wider transition-colors border-b ${
              activeTab === tab.key
                ? 'text-cyan-400 border-cyan-400 bg-cyan-400/[0.04]'
                : 'text-white/25 border-transparent hover:text-white/40 hover:bg-white/[0.02]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading && !data ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
              <span className="text-[10px] text-white/40 uppercase tracking-widest">
                LOADING LIQUIDITY DATA...
              </span>
            </div>
          </div>
        ) : error && !data ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] text-red-400 font-mono uppercase tracking-widest">
                FAILED TO LOAD
              </span>
              <button
                onClick={() => refetch()}
                className="text-[8px] font-mono text-cyan-400 uppercase tracking-wider px-2 py-0.5 border border-cyan-400/30 hover:bg-cyan-400/[0.06] transition-colors"
              >
                RETRY
              </button>
            </div>
          </div>
        ) : data ? (
          <>
            {activeTab === 'balance' && (
              <div className="border-b border-border/20">
                <div className="px-2 pt-1 pb-0.5">
                  <span className="text-[6px] text-white/25 uppercase tracking-wider">
                    Central Bank Balance Sheets
                  </span>
                </div>
                <BalanceSheetsTab balanceSheets={data.balanceSheets ?? []} />
              </div>
            )}

            {activeTab === 'm2' && (
              <div className="border-b border-border/20">
                <div className="px-2 pt-1 pb-0.5">
                  <span className="text-[6px] text-white/25 uppercase tracking-wider">
                    Global M2 Money Supply
                  </span>
                </div>
                <M2TrackerTab m2Data={data.m2Tracker ?? {}} />
              </div>
            )}

            {activeTab === 'credit' && (
              <div className="border-b border-border/20">
                <div className="px-2 pt-1 pb-0.5">
                  <span className="text-[6px] text-white/25 uppercase tracking-wider">
                    Credit Impulse by Country
                  </span>
                </div>
                <CreditImpulseTab creditImpulse={data.creditImpulse ?? []} />
              </div>
            )}

            {activeTab === 'funding' && (
              <div className="border-b border-border/20">
                <div className="px-2 pt-1 pb-0.5">
                  <span className="text-[6px] text-white/25 uppercase tracking-wider">
                    Funding Conditions Index
                  </span>
                </div>
                <FundingTab funding={data.funding ?? {}} />
              </div>
            )}

            {activeTab === 'flows' && (
              <div className="border-b border-border/20">
                <div className="px-2 pt-1 pb-0.5">
                  <span className="text-[6px] text-white/25 uppercase tracking-wider">
                    Cross-Border Capital Flows
                  </span>
                </div>
                <FlowsTab flows={data.flows ?? []} />
              </div>
            )}

            {/* Timestamp footer */}
            <div className="px-2 py-1 border-t border-border/20">
              <span className="text-[6px] font-mono text-white/15">
                Last update: {data.timestamp ? new Date(data.timestamp).toLocaleString() : '-'}
              </span>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
