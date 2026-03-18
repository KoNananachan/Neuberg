import { useState, useMemo, useCallback } from 'react';
import { GlassCard } from '../common/glass-card';
import { useFinancials, type FinancialStatement } from '../../api/hooks/use-financials';
import { useAppStore } from '../../stores/use-app-store';
import { useT } from '../../i18n';
import { FileSpreadsheet, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

type TabView = 'income' | 'balance' | 'cashflow';
type PeriodView = 'annual' | 'quarterly';

interface RowDef {
  key: keyof FinancialStatement;
  labelKey: string;
  bold?: boolean;
}

const INCOME_ROWS: RowDef[] = [
  { key: 'revenue', labelKey: 'finRevenue' },
  { key: 'costOfRevenue', labelKey: 'Cost of Revenue' },
  { key: 'grossProfit', labelKey: 'finGrossProfit', bold: true },
  { key: 'operatingExpenses', labelKey: 'Operating Expenses' },
  { key: 'operatingIncome', labelKey: 'finOpIncome', bold: true },
  { key: 'ebitda', labelKey: 'EBITDA' },
  { key: 'netIncome', labelKey: 'finNetIncome', bold: true },
];

const BALANCE_ROWS: RowDef[] = [
  { key: 'cash', labelKey: 'Cash & Equivalents' },
  { key: 'totalCurrentAssets', labelKey: 'Total Current Assets' },
  { key: 'totalAssets', labelKey: 'finTotalAssets', bold: true },
  { key: 'totalCurrentLiabilities', labelKey: 'Total Current Liabilities' },
  { key: 'longTermDebt', labelKey: 'Long-Term Debt' },
  { key: 'totalLiabilities', labelKey: 'finTotalLiab' },
  { key: 'stockholderEquity', labelKey: 'finEquity', bold: true },
];

const CASHFLOW_ROWS: RowDef[] = [
  { key: 'operatingCashFlow', labelKey: 'finOpCashFlow', bold: true },
  { key: 'capitalExpenditure', labelKey: 'finCapEx' },
  { key: 'freeCashFlow', labelKey: 'finFreeCashFlow', bold: true },
  { key: 'investingCashFlow', labelKey: 'Investing Cash Flow' },
  { key: 'financingCashFlow', labelKey: 'Financing Cash Flow' },
  { key: 'dividendsPaid', labelKey: 'Dividends Paid' },
];

// i18n keys that exist in translations
const I18N_KEYS = new Set([
  'finRevenue', 'finGrossProfit', 'finOpIncome', 'finNetIncome',
  'finTotalAssets', 'finTotalLiab', 'finEquity',
  'finOpCashFlow', 'finFreeCashFlow', 'finCapEx',
]);

function formatValue(value: number | null): { text: string; negative: boolean } {
  if (value == null) return { text: '-', negative: false };
  const abs = Math.abs(value);
  const negative = value < 0;
  let text: string;
  if (abs >= 1e12) {
    text = `$${(abs / 1e12).toFixed(2)}T`;
  } else if (abs >= 1e9) {
    text = `$${(abs / 1e9).toFixed(2)}B`;
  } else if (abs >= 1e6) {
    text = `$${(abs / 1e6).toFixed(1)}M`;
  } else if (abs >= 1e3) {
    text = `$${(abs / 1e3).toFixed(1)}K`;
  } else {
    text = `$${abs.toFixed(0)}`;
  }
  if (negative) text = `(${text})`;
  return { text, negative };
}

function calcGrowth(current: number | null, previous: number | null): string | null {
  if (current == null || previous == null || previous === 0) return null;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  if (!isFinite(pct)) return null;
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

export function FinancialsPanel() {
  const [tab, setTab] = useState<TabView>('income');
  const [period, setPeriod] = useState<PeriodView>('annual');
  const symbol = useAppStore((s) => s.selectedSymbol);
  const t = useT();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useFinancials();

  const handleRefresh = useCallback(() => {
    if (symbol) {
      queryClient.invalidateQueries({ queryKey: ['financials', symbol] });
    }
  }, [queryClient, symbol]);

  const statements = useMemo(() => {
    if (!data) return [];
    return period === 'annual' ? data.annual : data.quarterly;
  }, [data, period]);

  const rows = useMemo(() => {
    switch (tab) {
      case 'income': return INCOME_ROWS;
      case 'balance': return BALANCE_ROWS;
      case 'cashflow': return CASHFLOW_ROWS;
    }
  }, [tab]);

  const getLabel = useCallback((row: RowDef): string => {
    if (I18N_KEYS.has(row.labelKey)) {
      return t(row.labelKey as any);
    }
    return row.labelKey;
  }, [t]);

  const tabs: { id: TabView; label: string }[] = [
    { id: 'income', label: t('finIncome') },
    { id: 'balance', label: t('finBalance') },
    { id: 'cashflow', label: t('finCashFlow') },
  ];

  const periods: { id: PeriodView; label: string }[] = [
    { id: 'annual', label: t('finAnnual') },
    { id: 'quarterly', label: t('finQuarterly') },
  ];

  return (
    <GlassCard
      className="h-full"
      title={
        <span className="flex items-center gap-1.5">
          <FileSpreadsheet size={13} className="text-accent" />
          <span>{t('panelFinancials')}</span>
          {symbol && (
            <span className="text-white/70 ml-1 text-[10px]">{symbol}</span>
          )}
        </span>
      }
      headerRight={
        <button
          onClick={handleRefresh}
          className="text-neutral/50 hover:text-accent transition-colors p-0.5"
          title="Refresh"
        >
          <RefreshCw size={12} />
        </button>
      }
    >
      {!symbol ? (
        <div className="flex items-center justify-center h-full text-neutral/30 text-[10px] font-mono uppercase tracking-widest">
          {t('finNoSymbol')}
        </div>
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center h-full gap-2">
          <div className="w-5 h-5 border-2 border-accent/30 border-t-accent animate-spin" />
          <span className="text-[10px] font-mono text-neutral/40 uppercase tracking-widest">
            {t('loading')}
          </span>
        </div>
      ) : isError || !data ? (
        <div className="flex items-center justify-center h-full text-neutral/30 text-[10px] font-mono uppercase tracking-widest">
          {t('finNoData')}
        </div>
      ) : (
        <div className="flex flex-col h-full">
          {/* Tab bar + period toggle */}
          <div className="flex items-center justify-between px-2 py-1 border-b border-border bg-black/30 shrink-0">
            <div className="flex gap-0.5">
              {tabs.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider transition-colors ${
                    tab === item.id
                      ? 'bg-accent/20 text-accent border border-accent/40'
                      : 'text-neutral/50 hover:text-neutral/80 border border-transparent'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="flex gap-0.5">
              {periods.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setPeriod(item.id)}
                  className={`px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider transition-colors ${
                    period === item.id
                      ? 'bg-white/10 text-white border border-white/20'
                      : 'text-neutral/40 hover:text-neutral/70 border border-transparent'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Financial table */}
          {statements.length === 0 ? (
            <div className="flex items-center justify-center flex-1 text-neutral/30 text-[10px] font-mono uppercase tracking-widest">
              {t('finNoData')}
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <table className="w-full text-[10px] font-mono border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-black/60">
                    <th className="text-left text-neutral/50 px-2 py-1.5 font-normal uppercase tracking-wider border-b border-border whitespace-nowrap">
                      {/* Row label column */}
                    </th>
                    {statements.map((s) => (
                      <th
                        key={s.date}
                        className="text-right text-neutral/60 px-2 py-1.5 font-normal uppercase tracking-wider border-b border-border whitespace-nowrap"
                      >
                        {formatDate(s.date, period)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr
                      key={row.key}
                      className={`${idx % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]'} hover:bg-white/[0.04] transition-colors`}
                    >
                      <td
                        className={`px-2 py-1.5 text-left whitespace-nowrap border-b border-border/30 ${
                          row.bold ? 'text-neutral/80 font-bold' : 'text-neutral/40'
                        }`}
                      >
                        {getLabel(row)}
                      </td>
                      {statements.map((s, sIdx) => {
                        const val = s[row.key] as number | null;
                        const { text, negative } = formatValue(val);
                        // Calculate YoY growth (compare with next item which is older)
                        const prevStatement = statements[sIdx + 1];
                        const prevVal = prevStatement ? (prevStatement[row.key] as number | null) : null;
                        const growth = calcGrowth(val, prevVal);
                        return (
                          <td
                            key={s.date}
                            className={`px-2 py-1.5 text-right whitespace-nowrap border-b border-border/30 ${
                              row.bold ? 'font-bold' : ''
                            } ${negative ? 'text-red-400' : 'text-white/90'}`}
                          >
                            <span>{text}</span>
                            {growth && (
                              <span
                                className={`ml-1 text-[8px] ${
                                  growth.startsWith('+') ? 'text-emerald-400/70' : 'text-red-400/70'
                                }`}
                              >
                                {growth}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}

function formatDate(dateStr: string, period: PeriodView): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  if (period === 'quarterly') {
    const q = Math.ceil((d.getMonth() + 1) / 3);
    return `Q${q} ${d.getFullYear()}`;
  }
  return `FY ${d.getFullYear()}`;
}
