import { useState, useMemo } from 'react';
import {
  useCreditRatings,
  type IssuerRating,
  type RatingAction,
} from '../../api/hooks/use-credit-ratings';
import { useT } from '../../i18n';
import { ShieldCheck, RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──

type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// ── Constants ──

type ViewMode = 'RATINGS' | 'ACTIONS' | 'RISK';
type TypeFilter = 'ALL' | 'SOVEREIGN' | 'CORPORATE';
type SortKey =
  | 'name' | 'sp' | 'moodys' | 'fitch' | 'spreadBps' | 'cdsSpread' | 'defaultProbability1Y';

const TYPE_FILTERS: TypeFilter[] = ['ALL', 'SOVEREIGN', 'CORPORATE'];

// S&P scale order for sorting (lower index = better rating)
const SP_ORDER: Record<string, number> = {
  'AAA': 1, 'AA+': 2, 'AA': 3, 'AA-': 4, 'A+': 5, 'A': 6, 'A-': 7,
  'BBB+': 8, 'BBB': 9, 'BBB-': 10, 'BB+': 11, 'BB': 12, 'BB-': 13,
  'B+': 14, 'B': 15, 'B-': 16, 'CCC+': 17, 'CCC': 18, 'CCC-': 19,
};

const MOODYS_ORDER: Record<string, number> = {
  'Aaa': 1, 'Aa1': 2, 'Aa2': 3, 'Aa3': 4, 'A1': 5, 'A2': 6, 'A3': 7,
  'Baa1': 8, 'Baa2': 9, 'Baa3': 10, 'Ba1': 11, 'Ba2': 12, 'Ba3': 13,
  'B1': 14, 'B2': 15, 'B3': 16, 'Caa1': 17, 'Caa2': 18, 'Caa3': 19,
};

// Investment grade boundary: BBB- / Baa3 / BBB- (index 10)
const IG_SP = new Set(['AAA', 'AA+', 'AA', 'AA-', 'A+', 'A', 'A-', 'BBB+', 'BBB', 'BBB-']);

// ── Color helpers ──

function getRatingColor(rating: string): string {
  const order = SP_ORDER[rating] ?? MOODYS_ORDER[rating] ?? 99;
  if (order <= 1) return 'text-emerald-300';
  if (order <= 4) return 'text-emerald-400';
  if (order <= 7) return 'text-green-400';
  if (order <= 10) return 'text-yellow-400';
  if (order <= 13) return 'text-amber-400';
  if (order <= 16) return 'text-orange-400';
  return 'text-red-400';
}

function isInvestmentGrade(sp: string): boolean {
  return IG_SP.has(sp);
}

function getOutlookIcon(outlook: string): { symbol: string; color: string } {
  switch (outlook) {
    case 'Positive': return { symbol: '\u25B2', color: 'text-emerald-400' };
    case 'Negative': return { symbol: '\u25BC', color: 'text-red-400' };
    case 'Watch': return { symbol: '\u25C6', color: 'text-amber-400' };
    default: return { symbol: '\u2500', color: 'text-neutral-600' };
  }
}

function getActionColor(action: string): string {
  switch (action) {
    case 'Upgrade': return 'text-emerald-400';
    case 'Downgrade': return 'text-red-400';
    case 'Affirm': return 'text-blue-400';
    case 'Review': return 'text-amber-400';
    default: return 'text-neutral-400';
  }
}

function getActionBgColor(action: string): string {
  switch (action) {
    case 'Upgrade': return 'bg-emerald-400/10';
    case 'Downgrade': return 'bg-red-400/10';
    case 'Affirm': return 'bg-blue-400/10';
    case 'Review': return 'bg-amber-400/10';
    default: return 'bg-neutral-400/10';
  }
}

function getSpreadColor(bps: number): string {
  if (bps > 200) return 'text-red-400';
  if (bps > 120) return 'text-orange-400';
  if (bps > 60) return 'text-yellow-400';
  return 'text-emerald-400';
}

function getDefaultProbColor(prob: number): string {
  if (prob > 1.5) return 'text-red-400';
  if (prob > 0.5) return 'text-orange-400';
  if (prob > 0.15) return 'text-yellow-400';
  return 'text-emerald-400';
}

// ── Sorting ──

function sortIssuers(issuers: IssuerRating[], sortKey: SortKey, asc: boolean): IssuerRating[] {
  return [...issuers].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'name': cmp = a.name.localeCompare(b.name); break;
      case 'sp': cmp = (SP_ORDER[a.ratings.sp] ?? 99) - (SP_ORDER[b.ratings.sp] ?? 99); break;
      case 'moodys': cmp = (MOODYS_ORDER[a.ratings.moodys] ?? 99) - (MOODYS_ORDER[b.ratings.moodys] ?? 99); break;
      case 'fitch': cmp = (SP_ORDER[a.ratings.fitch] ?? 99) - (SP_ORDER[b.ratings.fitch] ?? 99); break;
      case 'spreadBps': cmp = a.spreadBps - b.spreadBps; break;
      case 'cdsSpread': cmp = a.cdsSpread - b.cdsSpread; break;
      case 'defaultProbability1Y': cmp = a.defaultProbability1Y - b.defaultProbability1Y; break;
      default: cmp = 0;
    }
    return asc ? cmp : -cmp;
  });
}

// ── Table header cell ──

function Th({
  label,
  sortKey,
  currentSort,
  currentAsc,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey;
  currentAsc: boolean;
  onSort: (key: SortKey) => void;
}) {
  const isActive = currentSort === sortKey;
  return (
    <th
      className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 cursor-pointer hover:text-rose-400 select-none whitespace-nowrap"
      onClick={() => onSort(sortKey)}
    >
      {label}
      {isActive && (
        <span className="ml-0.5 text-rose-400">{currentAsc ? '\u25B2' : '\u25BC'}</span>
      )}
    </th>
  );
}

// ── Main Panel ──

export function CreditRatingsPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useCreditRatings();

  const [view, setView] = useState<ViewMode>('RATINGS');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('spreadBps');
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'name');
    }
  };

  const filteredIssuers = useMemo(() => {
    if (!data) return [];
    let issuers = data.issuers;
    if (typeFilter === 'SOVEREIGN') {
      issuers = issuers.filter((i) => i.type === 'sovereign');
    } else if (typeFilter === 'CORPORATE') {
      issuers = issuers.filter((i) => i.type === 'corporate');
    }
    return sortIssuers(issuers, sortKey, sortAsc);
  }, [data, typeFilter, sortKey, sortAsc]);

  const filteredActions = useMemo(() => {
    if (!data) return [];
    if (typeFilter === 'ALL') return data.recentActions;
    const nameSet = new Set(filteredIssuers.map((i) => i.name));
    return data.recentActions.filter((a) => nameSet.has(a.issuer));
  }, [data, typeFilter, filteredIssuers]);

  const stats = useMemo(() => {
    if (!data) return { igPct: 0, avgSpread: 0 };
    const relevant = typeFilter === 'ALL'
      ? data.issuers
      : data.issuers.filter((i) =>
          typeFilter === 'SOVEREIGN' ? i.type === 'sovereign' : i.type === 'corporate',
        );
    const igCount = relevant.filter((i) => isInvestmentGrade(i.ratings.sp)).length;
    const igPct = relevant.length > 0 ? Math.round((igCount / relevant.length) * 100) : 0;
    const avgSpread = relevant.length > 0
      ? Math.round(relevant.reduce((s, i) => s + i.cdsSpread, 0) / relevant.length)
      : 0;
    return { igPct, avgSpread };
  }, [data, typeFilter]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-rose-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-rose-400">
            {tr(t, 'creditRatingsTitle', 'Credit Rating Monitor')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[7px] font-black font-mono uppercase px-1.5 py-0.5 text-emerald-400 bg-emerald-400/10 border border-emerald-400/30">
            IG {stats.igPct}%
          </span>
          <span className="text-[7px] font-black font-mono uppercase px-1.5 py-0.5 text-rose-400 bg-rose-400/10 border border-rose-400/30">
            AVG CDS {stats.avgSpread}
          </span>
          <button onClick={() => refetch()} className="p-1 text-neutral-500 hover:text-rose-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#050505] border-b border-border/20 shrink-0 gap-2 flex-wrap">
        {/* Type filter */}
        <div className="flex items-center gap-0.5">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className={`text-[7px] font-mono font-bold uppercase px-1.5 py-0.5 transition-colors whitespace-nowrap ${
                typeFilter === f
                  ? 'text-rose-400 bg-rose-400/15'
                  : 'text-neutral-600 hover:text-neutral-400'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-0.5">
          {(['RATINGS', 'ACTIONS', 'RISK'] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`text-[7px] font-mono font-bold uppercase px-1.5 py-0.5 transition-colors ${
                view === v
                  ? 'text-rose-400 bg-rose-400/15'
                  : 'text-neutral-600 hover:text-neutral-400'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-rose-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'creditRatingsNoData', 'No data available')}
          </div>
        )}

        {data && view === 'RATINGS' && (
          <RatingsView
            issuers={filteredIssuers}
            sortKey={sortKey}
            sortAsc={sortAsc}
            onSort={handleSort}
          />
        )}

        {data && view === 'ACTIONS' && (
          <ActionsView actions={filteredActions} />
        )}

        {data && view === 'RISK' && (
          <RiskView issuers={filteredIssuers} />
        )}

        {/* Timestamp */}
        {data && (
          <div className="px-3 py-1 border-t border-border/10">
            <span className="text-[7px] font-mono text-neutral-700">
              {tr(t, 'creditRatingsLastUpdate', 'Last update')}: {new Date(data.generatedAt).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── RATINGS View ──

function RatingsView({
  issuers,
  sortKey,
  sortAsc,
  onSort,
}: {
  issuers: IssuerRating[];
  sortKey: SortKey;
  sortAsc: boolean;
  onSort: (key: SortKey) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-[#080808] z-10">
          <tr className="border-b border-border/20">
            <Th label="Issuer" sortKey="name" currentSort={sortKey} currentAsc={sortAsc} onSort={onSort} />
            <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
              Type
            </th>
            <Th label="S&P" sortKey="sp" currentSort={sortKey} currentAsc={sortAsc} onSort={onSort} />
            <Th label="Moody's" sortKey="moodys" currentSort={sortKey} currentAsc={sortAsc} onSort={onSort} />
            <Th label="Fitch" sortKey="fitch" currentSort={sortKey} currentAsc={sortAsc} onSort={onSort} />
            <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
              Outlook
            </th>
            <Th label="Spread" sortKey="spreadBps" currentSort={sortKey} currentAsc={sortAsc} onSort={onSort} />
            <Th label="CDS 5Y" sortKey="cdsSpread" currentSort={sortKey} currentAsc={sortAsc} onSort={onSort} />
            <Th label="Def Prob" sortKey="defaultProbability1Y" currentSort={sortKey} currentAsc={sortAsc} onSort={onSort} />
            <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
              Last Action
            </th>
          </tr>
        </thead>
        <tbody>
          {issuers.map((issuer) => (
            <RatingsRow key={issuer.name} issuer={issuer} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RatingsRow({ issuer }: { issuer: IssuerRating }) {
  const ig = isInvestmentGrade(issuer.ratings.sp);
  const spOutlook = getOutlookIcon(issuer.outlook.sp);
  const moodysOutlook = getOutlookIcon(issuer.outlook.moodys);
  const fitchOutlook = getOutlookIcon(issuer.outlook.fitch);

  return (
    <tr className="border-b border-border/10 hover:bg-rose-400/[0.02] transition-colors">
      {/* Issuer name */}
      <td className="px-1.5 py-1 whitespace-nowrap">
        <span className="text-white font-bold">{issuer.name}</span>
        {issuer.type === 'corporate' && (
          <span className="text-[7px] text-neutral-600 ml-1">{issuer.sector}</span>
        )}
      </td>

      {/* Type badge */}
      <td className="px-1.5 py-1 whitespace-nowrap">
        <span className={`text-[7px] font-bold px-1 py-0.5 ${
          issuer.type === 'sovereign'
            ? 'text-blue-400 bg-blue-400/10'
            : 'text-purple-400 bg-purple-400/10'
        }`}>
          {issuer.type === 'sovereign' ? 'SOV' : 'CORP'}
        </span>
      </td>

      {/* S&P */}
      <td className={`px-1.5 py-1 whitespace-nowrap font-bold ${
        ig ? getRatingColor(issuer.ratings.sp) : 'text-amber-400'
      }`}>
        {issuer.ratings.sp}
      </td>

      {/* Moody's */}
      <td className={`px-1.5 py-1 whitespace-nowrap font-bold ${getRatingColor(issuer.ratings.moodys)}`}>
        {issuer.ratings.moodys}
      </td>

      {/* Fitch */}
      <td className={`px-1.5 py-1 whitespace-nowrap font-bold ${
        ig ? getRatingColor(issuer.ratings.fitch) : 'text-amber-400'
      }`}>
        {issuer.ratings.fitch}
      </td>

      {/* Outlook icons */}
      <td className="px-1.5 py-1 whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <span className={`text-[7px] ${spOutlook.color}`} title={`S&P: ${issuer.outlook.sp}`}>
            {spOutlook.symbol}
          </span>
          <span className={`text-[7px] ${moodysOutlook.color}`} title={`Moody's: ${issuer.outlook.moodys}`}>
            {moodysOutlook.symbol}
          </span>
          <span className={`text-[7px] ${fitchOutlook.color}`} title={`Fitch: ${issuer.outlook.fitch}`}>
            {fitchOutlook.symbol}
          </span>
        </div>
      </td>

      {/* Spread */}
      <td className={`px-1.5 py-1 whitespace-nowrap font-bold ${getSpreadColor(issuer.spreadBps)}`}>
        {issuer.spreadBps.toFixed(1)}
      </td>

      {/* CDS 5Y */}
      <td className={`px-1.5 py-1 whitespace-nowrap font-bold ${getSpreadColor(issuer.cdsSpread)}`}>
        {issuer.cdsSpread.toFixed(1)}
      </td>

      {/* Default Probability */}
      <td className={`px-1.5 py-1 whitespace-nowrap ${getDefaultProbColor(issuer.defaultProbability1Y)}`}>
        {issuer.defaultProbability1Y.toFixed(3)}%
      </td>

      {/* Last Action */}
      <td className="px-1.5 py-1 whitespace-nowrap">
        <span className={`text-[7px] font-bold px-1 py-0.5 ${getActionColor(issuer.lastAction.action)} ${getActionBgColor(issuer.lastAction.action)}`}>
          {issuer.lastAction.action.toUpperCase()}
        </span>
        <span className="text-[7px] text-neutral-600 ml-1">
          {issuer.lastAction.agency}
        </span>
      </td>
    </tr>
  );
}

// ── ACTIONS View ──

function ActionsView({ actions }: { actions: RatingAction[] }) {
  const t = useT();

  return (
    <div className="px-3 py-2 space-y-1">
      <div className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500 mb-2">
        {tr(t, 'creditRatingsRecentActions', 'Recent Rating Actions')}
      </div>
      {actions.map((action, idx) => (
        <div
          key={`${action.issuer}-${action.date}-${idx}`}
          className="p-2 border border-border/20 bg-[#060606] hover:bg-rose-400/[0.02] transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className={`text-[8px] font-bold px-1.5 py-0.5 ${getActionColor(action.action)} ${getActionBgColor(action.action)}`}>
                {action.action.toUpperCase()}
              </span>
              <span className="text-[9px] font-mono font-bold text-white">{action.issuer}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[7px] font-mono text-neutral-500">{action.agency}</span>
              <span className="text-[7px] font-mono text-neutral-600">{action.date}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-1">
            {action.action === 'Upgrade' || action.action === 'Downgrade' ? (
              <span className="text-[8px] font-mono text-neutral-400">
                <span className="text-neutral-500">{action.from}</span>
                <span className="text-neutral-600 mx-1">{'\u2192'}</span>
                <span className={action.action === 'Upgrade' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                  {action.to}
                </span>
              </span>
            ) : (
              <span className="text-[8px] font-mono text-neutral-500">
                {action.from}
              </span>
            )}
          </div>
          <div className="text-[7px] font-mono text-neutral-600 leading-relaxed">
            {action.rationale}
          </div>
        </div>
      ))}
      {actions.length === 0 && (
        <div className="text-center py-4 text-neutral-600 text-[8px] font-mono uppercase">
          {tr(t, 'creditRatingsNoActions', 'No recent actions for this filter')}
        </div>
      )}
    </div>
  );
}

// ── RISK View ──

function RiskView({ issuers }: { issuers: IssuerRating[] }) {
  const t = useT();

  const sorted = useMemo(() => {
    return [...issuers].sort((a, b) => b.defaultProbability1Y - a.defaultProbability1Y);
  }, [issuers]);

  const maxCds = useMemo(() => {
    return Math.max(...sorted.map((i) => i.cdsSpread), 1);
  }, [sorted]);

  const maxDefProb = useMemo(() => {
    return Math.max(...sorted.map((i) => i.defaultProbability1Y), 0.01);
  }, [sorted]);

  return (
    <div className="px-3 py-2">
      <div className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500 mb-2">
        {tr(t, 'creditRatingsDefaultRisk', 'Default Probability & CDS Spread Analysis')}
      </div>

      <div className="space-y-0.5">
        {sorted.map((issuer) => {
          const cdsPct = (issuer.cdsSpread / maxCds) * 100;
          const defProbPct = (issuer.defaultProbability1Y / maxDefProb) * 100;
          const ig = isInvestmentGrade(issuer.ratings.sp);

          return (
            <div key={issuer.name} className="hover:bg-rose-400/[0.02] px-1 py-1 transition-colors">
              {/* Issuer info row */}
              <div className="flex items-center gap-2 mb-0.5">
                <div className="w-28 flex items-center gap-1 shrink-0">
                  <span className="text-[9px] font-mono font-bold text-white truncate">{issuer.name}</span>
                  <span className={`text-[7px] font-mono ${getRatingColor(issuer.ratings.sp)}`}>
                    {issuer.ratings.sp}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className={`text-[7px] font-bold px-1 py-0.5 ${
                    ig ? 'text-emerald-400 bg-emerald-400/10' : 'text-amber-400 bg-amber-400/10'
                  }`}>
                    {ig ? 'IG' : 'HY'}
                  </span>
                </div>
              </div>

              {/* Default probability bar */}
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[7px] font-mono text-neutral-600 w-14 text-right uppercase shrink-0">
                  Def Prob
                </span>
                <div className="flex-1 h-2.5 bg-neutral-900 relative">
                  <div
                    className="absolute top-0 left-0 h-full"
                    style={{
                      width: `${defProbPct}%`,
                      backgroundColor: issuer.defaultProbability1Y > 1 ? '#f87171'
                        : issuer.defaultProbability1Y > 0.3 ? '#fb923c'
                        : '#34d399',
                      opacity: 0.45,
                    }}
                  />
                </div>
                <span className={`text-[8px] font-mono font-bold w-14 text-right shrink-0 ${getDefaultProbColor(issuer.defaultProbability1Y)}`}>
                  {issuer.defaultProbability1Y.toFixed(3)}%
                </span>
              </div>

              {/* CDS spread bar */}
              <div className="flex items-center gap-2">
                <span className="text-[7px] font-mono text-neutral-600 w-14 text-right uppercase shrink-0">
                  CDS 5Y
                </span>
                <div className="flex-1 h-2.5 bg-neutral-900 relative">
                  <div
                    className="absolute top-0 left-0 h-full bg-rose-400/35"
                    style={{ width: `${cdsPct}%` }}
                  />
                </div>
                <span className={`text-[8px] font-mono font-bold w-14 text-right shrink-0 ${getSpreadColor(issuer.cdsSpread)}`}>
                  {issuer.cdsSpread.toFixed(1)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 pt-2 border-t border-border/10 flex items-center gap-3 flex-wrap">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">
          {tr(t, 'creditRatingsLegend', 'Grade')}:
        </span>
        {[
          { label: 'IG (Investment)', color: '#34d399' },
          { label: 'HY (High Yield)', color: '#fbbf24' },
          { label: 'Distressed', color: '#f87171' },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-2 h-2" style={{ backgroundColor: color, opacity: 0.5 }} />
            <span className="text-[7px] font-mono text-neutral-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
