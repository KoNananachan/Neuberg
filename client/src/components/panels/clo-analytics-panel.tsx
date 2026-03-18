import { useState, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { useCloAnalytics } from '../../api/hooks/use-clo-analytics';
import { useT } from '../../i18n';

type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => { try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; } };

type View = 'DEALS' | 'TRANCHES' | 'CASHFLOW';

interface Tranche {
  name: string; rating: string; pctOfDeal: number; notional: number;
  spread: number; price: number; yield: number; subordination: number; wal: number;
}

interface Deal {
  id: string; manager: string; vintage: number;
  collateralBalance: number; numLoans: number; wal: number;
  tests: { warf: number; diversityScore: number; cccBucket: number; defaultRate: number; recoveryRate: number; ocRatioAAA: number; ocRatioAA: number; icRatio: number };
  reinvestEndDate: string;
  tranches: Tranche[];
  cashflowHistory: { date: string; interest: number; principal: number; defaults: number; recoveries: number }[];
}

export function CloAnalyticsPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useCloAnalytics();
  const [view, setView] = useState<View>('DEALS');
  const [selectedDeal, setSelectedDeal] = useState('ARES-CLO-2024-1');

  const deals = useMemo(() => (data?.deals ?? []) as Deal[], [data]);
  const selected = useMemo(() => deals.find(d => d.id === selectedDeal) ?? deals[0], [deals, selectedDeal]);

  const fmtM = (v: number) => {
    if (v >= 1e9) return '$' + (v / 1e9).toFixed(1) + 'B';
    if (v >= 1e6) return '$' + (v / 1e6).toFixed(0) + 'M';
    return '$' + (v / 1e3).toFixed(0) + 'K';
  };

  const VIEWS: View[] = ['DEALS', 'TRANCHES', 'CASHFLOW'];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-pink-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-pink-400">
            {tr(t, 'panelCloAnalytics', 'CLO Analytics')}
          </span>
          <span className="text-[7px] font-mono text-neutral-500">{deals.length} deals</span>
        </div>
        <div className="flex items-center gap-1.5">
          {VIEWS.map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider transition-colors ${view === v ? 'text-pink-400 bg-pink-400/10' : 'text-neutral-600 hover:text-neutral-400'}`}
            >{v}</button>
          ))}
          <button onClick={() => refetch()} className="p-1 text-neutral-500 hover:text-pink-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {(view === 'TRANCHES' || view === 'CASHFLOW') && (
        <div className="flex items-center gap-1 px-3 py-1 border-b border-border/20 shrink-0 overflow-x-auto no-scrollbar">
          {deals.map(d => (
            <button key={d.id} onClick={() => setSelectedDeal(d.id)}
              className={`px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase whitespace-nowrap transition-colors ${selectedDeal === d.id ? 'text-pink-400 bg-pink-400/10' : 'text-neutral-600 hover:text-neutral-400'}`}
            >{d.id.split('-').slice(0, 2).join('-')}</button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-pink-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}
        {view === 'DEALS' && data && <DealsView deals={deals} overview={data.marketOverview} fmtM={fmtM} onSelect={setSelectedDeal} setView={setView} />}
        {view === 'TRANCHES' && selected && <TranchesView deal={selected} fmtM={fmtM} />}
        {view === 'CASHFLOW' && selected && <CashflowView deal={selected} fmtM={fmtM} />}
      </div>
    </div>
  );
}

function DealsView({ deals, overview, fmtM, onSelect, setView }: {
  deals: Deal[];
  overview: { totalIssuance: number; avgAAASpread: number; avgEquityYield: number; avgWAL: number; avgDefaultRate: number; avgRecovery: number };
  fmtM: (v: number) => string;
  onSelect: (id: string) => void;
  setView: (v: 'TRANCHES') => void;
}) {
  return (
    <div>
      <div className="grid grid-cols-6 gap-2 p-2">
        {[
          { label: 'YTD ISSUANCE', value: '$' + overview.totalIssuance.toFixed(0) + 'B' },
          { label: 'AVG AAA SPREAD', value: overview.avgAAASpread + ' bp' },
          { label: 'AVG EQ YIELD', value: overview.avgEquityYield.toFixed(1) + '%' },
          { label: 'AVG WAL', value: overview.avgWAL.toFixed(1) + 'Y' },
          { label: 'AVG DEFAULT', value: overview.avgDefaultRate.toFixed(2) + '%' },
          { label: 'AVG RECOVERY', value: overview.avgRecovery.toFixed(1) + '%' },
        ].map(s => (
          <div key={s.label} className="bg-[#050505] border border-border/10 px-2 py-1.5">
            <div className="text-[6px] font-mono text-neutral-600 uppercase">{s.label}</div>
            <div className="text-[10px] font-mono font-bold text-pink-400">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="w-[88px] text-[7px] font-mono text-neutral-600 uppercase">DEAL</span>
        <span className="w-[52px] text-[7px] font-mono text-neutral-600 uppercase text-right">SIZE</span>
        <span className="w-[28px] text-[7px] font-mono text-neutral-600 uppercase text-right">WAL</span>
        <span className="w-[32px] text-[7px] font-mono text-neutral-600 uppercase text-right">WARF</span>
        <span className="w-[28px] text-[7px] font-mono text-neutral-600 uppercase text-right">DIV</span>
        <span className="w-[32px] text-[7px] font-mono text-neutral-600 uppercase text-right">CCC%</span>
        <span className="w-[36px] text-[7px] font-mono text-neutral-600 uppercase text-right">OC AAA</span>
        <span className="w-[28px] text-[7px] font-mono text-neutral-600 uppercase text-right pr-1">IC</span>
      </div>
      {deals.map(d => (
        <div key={d.id} onClick={() => { onSelect(d.id); setView('TRANCHES'); }}
          className="flex items-center px-2 py-[3px] border-b border-border/5 hover:bg-pink-400/[0.02] transition-colors cursor-pointer">
          <span className="w-[88px] text-[7px] font-mono font-bold text-white truncate">{d.id}</span>
          <span className="w-[52px] text-[8px] font-mono text-right text-neutral-300">{fmtM(d.collateralBalance)}</span>
          <span className="w-[28px] text-[8px] font-mono text-right text-neutral-300">{d.wal.toFixed(1)}</span>
          <span className="w-[32px] text-[8px] font-mono text-right text-neutral-300">{d.tests.warf}</span>
          <span className="w-[28px] text-[8px] font-mono text-right text-neutral-300">{d.tests.diversityScore}</span>
          <span className={`w-[32px] text-[8px] font-mono text-right ${d.tests.cccBucket > 7 ? 'text-red-400' : 'text-neutral-300'}`}>{d.tests.cccBucket.toFixed(1)}</span>
          <span className={`w-[36px] text-[8px] font-mono text-right ${d.tests.ocRatioAAA < 120 ? 'text-red-400' : 'text-green-400'}`}>{d.tests.ocRatioAAA.toFixed(0)}</span>
          <span className="w-[28px] text-[8px] font-mono text-right text-neutral-300 pr-1">{d.tests.icRatio.toFixed(0)}</span>
        </div>
      ))}
    </div>
  );
}

function TranchesView({ deal, fmtM }: { deal: Deal; fmtM: (v: number) => string }) {
  const maxNotional = Math.max(...deal.tranches.map(t => t.notional), 1);

  return (
    <div className="p-2 space-y-3">
      <div className="bg-[#050505] border border-border/10 px-3 py-2">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-mono font-bold text-white">{deal.id}</span>
          <span className="text-[8px] font-mono text-neutral-500">{deal.manager}</span>
        </div>
        <div className="flex items-center gap-4 mt-1 text-[7px] font-mono text-neutral-500">
          <span>Size: {fmtM(deal.collateralBalance)}</span>
          <span>Loans: {deal.numLoans}</span>
          <span>WAL: {deal.wal.toFixed(1)}Y</span>
          <span>Reinvest End: {deal.reinvestEndDate}</span>
        </div>
      </div>

      <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Capital Structure (Waterfall)</div>
      {deal.tranches.map(tr => (
        <div key={tr.name} className="flex items-center px-2 py-1.5 border-b border-border/5 hover:bg-pink-400/[0.02] transition-colors">
          <div className="w-[44px]">
            <span className="text-[9px] font-mono font-bold text-white">{tr.name}</span>
            <div className="text-[6px] font-mono text-neutral-600">{tr.rating}</div>
          </div>
          <span className="w-[48px] text-[8px] font-mono text-right text-neutral-300">{fmtM(tr.notional)}</span>
          <span className="w-[32px] text-[8px] font-mono text-right text-pink-400 font-bold">{tr.pctOfDeal}%</span>
          <span className="w-[40px] text-[8px] font-mono text-right text-neutral-300">{tr.spread > 0 ? tr.spread + 'bp' : '-'}</span>
          <span className="w-[40px] text-[8px] font-mono text-right text-neutral-300">{tr.price.toFixed(1)}</span>
          <span className="w-[36px] text-[8px] font-mono text-right text-neutral-300">{tr.yield.toFixed(1)}%</span>
          <span className="w-[28px] text-[7px] font-mono text-right text-neutral-500">{tr.subordination > 0 ? tr.subordination + '%' : '-'}</span>
          <div className="flex-1 px-2">
            <div className="h-2.5 bg-neutral-900 relative">
              <div className="absolute left-0 top-0 h-full bg-pink-400/30" style={{ width: `${(tr.notional / maxNotional) * 100}%` }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CashflowView({ deal, fmtM }: { deal: Deal; fmtM: (v: number) => string }) {
  const maxCF = Math.max(...deal.cashflowHistory.map(h => h.interest + h.principal), 1);

  return (
    <div className="p-2 space-y-3">
      <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Quarterly Cash Flow History</div>
      <div className="flex items-center px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="w-[48px] text-[7px] font-mono text-neutral-600 uppercase">PERIOD</span>
        <span className="w-[52px] text-[7px] font-mono text-neutral-600 uppercase text-right">INTEREST</span>
        <span className="w-[52px] text-[7px] font-mono text-neutral-600 uppercase text-right">PRINCIPAL</span>
        <span className="w-[48px] text-[7px] font-mono text-neutral-600 uppercase text-right">DEFAULT</span>
        <span className="w-[48px] text-[7px] font-mono text-neutral-600 uppercase text-right">RECOVERY</span>
        <span className="flex-1 text-[7px] font-mono text-neutral-600 uppercase text-center">FLOW</span>
      </div>
      {deal.cashflowHistory.map((h, i) => (
        <div key={i} className="flex items-center px-2 py-1 border-b border-border/5">
          <span className="w-[48px] text-[7px] font-mono text-neutral-500">{h.date}</span>
          <span className="w-[52px] text-[8px] font-mono text-right text-green-400">{fmtM(h.interest)}</span>
          <span className="w-[52px] text-[8px] font-mono text-right text-blue-400">{fmtM(h.principal)}</span>
          <span className="w-[48px] text-[8px] font-mono text-right text-red-400">{fmtM(h.defaults)}</span>
          <span className="w-[48px] text-[8px] font-mono text-right text-neutral-300">{fmtM(h.recoveries)}</span>
          <div className="flex-1 px-2">
            <div className="h-2 bg-neutral-900 relative flex">
              <div className="h-full bg-green-400/40" style={{ width: `${(h.interest / maxCF) * 100}%` }} />
              <div className="h-full bg-blue-400/40" style={{ width: `${(h.principal / maxCF) * 100}%` }} />
            </div>
          </div>
        </div>
      ))}
      <div className="flex items-center gap-3 px-2">
        <div className="flex items-center gap-1"><div className="w-3 h-1 bg-green-400/40" /><span className="text-[6px] font-mono text-neutral-500">Interest</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-1 bg-blue-400/40" /><span className="text-[6px] font-mono text-neutral-500">Principal</span></div>
      </div>
    </div>
  );
}
