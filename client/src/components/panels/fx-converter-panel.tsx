import { useState, useMemo, useCallback } from 'react';
import { useFXRates, type FXRate } from '../../api/hooks/use-fx-rates';
import { useT } from '../../i18n';
import { ArrowLeftRight, RefreshCw, ArrowUpDown } from 'lucide-react';

const MATRIX_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD'];

/** Smart formatting: more decimals for small rates, fewer for large */
function formatRate(value: number): string {
  if (value === 0) return '---';
  if (value >= 1000) return value.toFixed(2);
  if (value >= 100) return value.toFixed(2);
  if (value >= 1) return value.toFixed(4);
  return value.toFixed(6);
}

function formatMatrixRate(value: number): string {
  if (value === 0) return '---';
  if (value >= 1000) return value.toFixed(1);
  if (value >= 100) return value.toFixed(2);
  if (value >= 1) return value.toFixed(4);
  return value.toFixed(4);
}

/** Convert between two currencies using USD as bridge */
function convert(
  amount: number,
  fromCode: string,
  toCode: string,
  rateMap: Map<string, number>,
): number {
  if (fromCode === toCode) return amount;
  const fromRate = rateMap.get(fromCode) ?? 0;
  const toRate = rateMap.get(toCode) ?? 0;
  if (fromRate === 0 || toRate === 0) return 0;
  // Convert from -> USD -> to
  // fromRate = how many units of 'from' per 1 USD
  // toRate = how many units of 'to' per 1 USD
  // amount in 'from' -> USD = amount / fromRate -> 'to' = (amount / fromRate) * toRate
  return (amount / fromRate) * toRate;
}

function CurrencySelect({
  value,
  onChange,
  rates,
}: {
  value: string;
  onChange: (code: string) => void;
  rates: FXRate[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-[#0a0a0a] border border-border/40 text-neutral text-xs font-mono px-2 py-1.5 rounded focus:outline-none focus:border-cyan-400/60 cursor-pointer min-w-[160px]"
    >
      {rates.map((r) => (
        <option key={r.code} value={r.code}>
          {r.flag} {r.code} - {r.name}
        </option>
      ))}
    </select>
  );
}

export function FXConverterPanel() {
  const t = useT();
  const { data: rates, isLoading, refetch } = useFXRates();
  const [fromCode, setFromCode] = useState('USD');
  const [toCode, setToCode] = useState('EUR');
  const [amount, setAmount] = useState('1');

  // Build rate map: code -> rateToUSD
  const rateMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!rates) return map;
    for (const r of rates) {
      map.set(r.code, r.rateToUSD);
    }
    return map;
  }, [rates]);

  const parsedAmount = useMemo(() => {
    const n = parseFloat(amount);
    return isNaN(n) ? 0 : n;
  }, [amount]);

  const convertedAmount = useMemo(
    () => convert(parsedAmount, fromCode, toCode, rateMap),
    [parsedAmount, fromCode, toCode, rateMap],
  );

  // Exchange rate: 1 FROM = X TO
  const exchangeRate = useMemo(
    () => convert(1, fromCode, toCode, rateMap),
    [fromCode, toCode, rateMap],
  );

  // Inverse rate: 1 TO = X FROM
  const inverseRate = useMemo(
    () => convert(1, toCode, fromCode, rateMap),
    [fromCode, toCode, rateMap],
  );

  const handleSwap = useCallback(() => {
    setFromCode(toCode);
    setToCode(fromCode);
  }, [fromCode, toCode]);

  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow empty, digits, one decimal point
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setAmount(val);
    }
  }, []);

  // Cross-rates matrix
  const matrixData = useMemo(() => {
    if (!rates || rateMap.size === 0) return null;
    const grid: number[][] = [];
    for (const from of MATRIX_CURRENCIES) {
      const row: number[] = [];
      for (const to of MATRIX_CURRENCIES) {
        if (from === to) {
          row.push(1);
        } else {
          row.push(convert(1, from, to, rateMap));
        }
      }
      grid.push(row);
    }
    return grid;
  }, [rates, rateMap]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4 text-cyan-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-cyan-400">
            {t('panelFXConverter')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral/40 hover:text-cyan-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-4">
        {/* Converter section */}
        {!rates || rates.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-neutral/30 text-[10px] font-mono uppercase tracking-widest">
            {isLoading ? t('loading') : t('fxNoData')}
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {/* FROM row */}
              <div className="space-y-1">
                <label className="text-[9px] font-mono uppercase tracking-wider text-neutral/50">
                  {t('fxFrom')}
                </label>
                <div className="flex items-center gap-2">
                  <CurrencySelect value={fromCode} onChange={setFromCode} rates={rates} />
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="0"
                    className="flex-1 bg-[#0a0a0a] border border-border/40 text-neutral text-lg font-mono px-3 py-1.5 rounded text-right focus:outline-none focus:border-cyan-400/60 min-w-0"
                  />
                </div>
              </div>

              {/* Swap button */}
              <div className="flex justify-center">
                <button
                  onClick={handleSwap}
                  className="p-1.5 rounded border border-border/30 text-neutral/50 hover:text-cyan-400 hover:border-cyan-400/40 transition-colors"
                  title="Swap currencies"
                >
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </div>

              {/* TO row */}
              <div className="space-y-1">
                <label className="text-[9px] font-mono uppercase tracking-wider text-neutral/50">
                  {t('fxTo')}
                </label>
                <div className="flex items-center gap-2">
                  <CurrencySelect value={toCode} onChange={setToCode} rates={rates} />
                  <div className="flex-1 bg-[#0a0a0a] border border-border/20 text-cyan-400 text-lg font-mono px-3 py-1.5 rounded text-right min-w-0 truncate">
                    {parsedAmount > 0 ? formatRate(convertedAmount) : '0'}
                  </div>
                </div>
              </div>

              {/* Rate display */}
              {exchangeRate > 0 && (
                <div className="pt-1 space-y-0.5 border-t border-border/20">
                  <div className="text-[10px] font-mono text-neutral/60">
                    <span className="text-neutral/40">{t('fxRate')}:</span>{' '}
                    1 {fromCode} = {formatRate(exchangeRate)} {toCode}
                  </div>
                  <div className="text-[10px] font-mono text-neutral/40">
                    <span className="text-neutral/30">{t('fxInverse')}:</span>{' '}
                    1 {toCode} = {formatRate(inverseRate)} {fromCode}
                  </div>
                </div>
              )}
            </div>

            {/* Cross Rates Matrix */}
            {matrixData && (
              <div className="space-y-1.5">
                <div className="text-[9px] font-mono uppercase tracking-wider text-neutral/50 font-bold">
                  {t('fxCrossRates')}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[9px] font-mono">
                    <thead>
                      <tr>
                        <th className="text-left text-neutral/30 p-1 border-b border-border/20 w-10" />
                        {MATRIX_CURRENCIES.map((code) => (
                          <th
                            key={code}
                            className="text-right text-neutral/50 p-1 border-b border-border/20 font-bold"
                          >
                            {code}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {MATRIX_CURRENCIES.map((fromCur, i) => (
                        <tr key={fromCur} className="hover:bg-white/[0.02]">
                          <td className="text-left text-neutral/50 p-1 border-b border-border/10 font-bold">
                            {fromCur}
                          </td>
                          {MATRIX_CURRENCIES.map((toCur, j) => {
                            const val = matrixData[i][j];
                            const isDiag = i === j;
                            return (
                              <td
                                key={toCur}
                                className={`text-right p-1 border-b border-border/10 tabular-nums ${
                                  isDiag
                                    ? 'text-neutral/20'
                                    : 'text-neutral/70'
                                }`}
                              >
                                {isDiag ? '1.0000' : formatMatrixRate(val)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
