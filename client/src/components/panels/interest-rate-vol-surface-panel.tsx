import { useState, useMemo } from 'react';
import { useInterestRateVolSurface } from '../../api/hooks/use-interest-rate-vol-surface';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw, Activity, TrendingUp, BarChart3, Layers } from 'lucide-react';

// -- i18n fallback helper --

// -- Constants --

const ACCENT = '#22d3ee'; // cyan-400
const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY'] as const;
type Currency = (typeof CURRENCIES)[number];
type Tab = 'surface' | 'smile' | 'changes' | 'capfloor' | 'atm';

// -- Formatting helpers --

function fmtNum(v: unknown, decimals = 2): string {
  if (v == null || typeof v !== 'number' || isNaN(v)) return '-';
  return v.toFixed(decimals);
}

function fmtChange(v: unknown, decimals = 2): string {
  if (v == null || typeof v !== 'number' || isNaN(v)) return '-';
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(decimals)}`;
}

function changeColor(v: number): string {
  if (v > 0) return '#f87171'; // red-400
  if (v < 0) return '#4ade80'; // green-400
  return 'rgba(255,255,255,0.4)';
}

// -- Vol heat-map color (blue=low -> cyan -> yellow -> orange -> red=high) --

function volHeatColor(vol: number, minVol: number, maxVol: number): string {
  if (maxVol <= minVol) return 'rgba(34,211,238,0.15)';
  const p = Math.min(1, Math.max(0, (vol - minVol) / (maxVol - minVol)));
  if (p < 0.25) {
    const f = p / 0.25;
    const r = Math.round(59 + (34 - 59) * f);
    const g = Math.round(130 + (211 - 130) * f);
    const b = Math.round(246 + (238 - 246) * f);
    return `rgba(${r},${g},${b},0.35)`;
  }
  if (p < 0.5) {
    const f = (p - 0.25) / 0.25;
    const r = Math.round(34 + (250 - 34) * f);
    const g = Math.round(211 + (204 - 211) * f);
    const b = Math.round(238 + (21 - 238) * f);
    return `rgba(${r},${g},${b},0.35)`;
  }
  if (p < 0.75) {
    const f = (p - 0.5) / 0.25;
    const r = Math.round(250 + (249 - 250) * f);
    const g = Math.round(204 + (115 - 204) * f);
    const b = Math.round(21 + (22 - 21) * f);
    return `rgba(${r},${g},${b},0.4)`;
  }
  const f = (p - 0.75) / 0.25;
  const r = Math.round(249 + (239 - 249) * f);
  const g = Math.round(115 + (68 - 115) * f);
  const b = Math.round(22 + (68 - 22) * f);
  return `rgba(${r},${g},${b},0.45)`;
}

// -- Main Panel --

export function InterestRateVolSurfacePanel() {
  const t = useT();
  const { data, isLoading, refetch } = useInterestRateVolSurface();
  const [tab, setTab] = useState<Tab>('surface');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [selectedExpiry, setSelectedExpiry] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-cyan-400/60 uppercase tracking-widest animate-pulse">
          {tr(t, 'irvsLoading', 'LOADING IR VOL SURFACE...')}
        </div>
      </div>
    );
  }

  if (!d) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-black gap-2">
        <div className="text-[9px] font-mono text-red-400/60 uppercase tracking-widest">
          FAILED TO LOAD DATA
        </div>
        <button
          onClick={() => refetch()}
          className="px-2 py-1 text-[8px] font-mono font-bold uppercase tracking-wider text-cyan-400 border border-cyan-400/30 hover:bg-cyan-400/10 transition-colors"
        >
          RETRY
        </button>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: typeof Activity }[] = [
    { key: 'surface', label: 'SURFACE', icon: Layers },
    { key: 'smile', label: 'VOL SMILE', icon: TrendingUp },
    { key: 'changes', label: 'CHANGES', icon: BarChart3 },
    { key: 'capfloor', label: 'CAP/FLOOR', icon: Activity },
    { key: 'atm', label: 'ATM STRIKES', icon: Activity },
  ];

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-3 h-3 text-cyan-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-cyan-400">
            {tr(t, 'irVolSurface', 'IR VOL SURFACE')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-cyan-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Currency selector */}
      <div className="flex items-center gap-0 px-3 py-1 border-b border-border/20 bg-[#050505] shrink-0">
        {CURRENCIES.map((ccy) => (
          <button
            key={ccy}
            onClick={() => setCurrency(ccy)}
            className={`px-3 py-0.5 text-[8px] font-black font-mono uppercase tracking-wider border-b-2 transition-colors ${
              currency === ccy
                ? 'border-cyan-400 text-cyan-400 bg-cyan-400/5'
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {ccy}
          </button>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 px-3 py-1 border-b border-border/20 bg-[#050505] shrink-0">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`flex items-center gap-1 px-2.5 py-0.5 text-[7px] font-black uppercase tracking-wider border transition-colors ${
              tab === tb.key
                ? 'border-cyan-400/40 text-cyan-400 bg-cyan-400/10'
                : 'border-border/20 text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <tb.icon className="w-2.5 h-2.5" />
            {tb.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {tab === 'surface' && (
          <SurfaceTab data={d} currency={currency} onSelectExpiry={setSelectedExpiry} />
        )}
        {tab === 'smile' && (
          <SmileTab
            data={d}
            currency={currency}
            selectedExpiry={selectedExpiry}
            onSelectExpiry={setSelectedExpiry}
          />
        )}
        {tab === 'changes' && <ChangesTab data={d} currency={currency} />}
        {tab === 'capfloor' && <CapFloorTab data={d} currency={currency} />}
        {tab === 'atm' && <AtmStrikesTab data={d} currency={currency} />}
      </div>
    </div>
  );
}

// -- Surface Tab (Heatmap: Expiry x Tenor) --

function SurfaceTab({
  data,
  currency,
  onSelectExpiry,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  currency: Currency;
  onSelectExpiry: (e: string) => void;
}) {
  const { tenors, expiries, grid, minVol, maxVol } = useMemo(() => {
    const ccyData = data?.currencies?.[currency] ?? data?.surface ?? data;
    const surface = ccyData?.surface ?? ccyData?.volSurface ?? ccyData;
    if (!surface)
      return {
        tenors: [] as string[],
        expiries: [] as string[],
        grid: [] as Record<string, number>[],
        minVol: 0,
        maxVol: 100,
      };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: any[] = Array.isArray(surface) ? surface : surface.rows ?? [];
    const tnrs: string[] =
      surface.tenors ??
      (rows.length > 0
        ? Object.keys(rows[0]).filter(
            (k: string) => k !== 'expiry' && k !== 'label',
          )
        : []);
    const exps: string[] = rows.map((r: Record<string, unknown>) =>
      String(r.expiry || r.label || ''),
    );

    let mn = Infinity;
    let mx = -Infinity;
    for (const row of rows) {
      for (const tn of tnrs) {
        const v = row[tn];
        if (typeof v === 'number' && !isNaN(v)) {
          if (v < mn) mn = v;
          if (v > mx) mx = v;
        }
      }
    }

    return {
      tenors: tnrs,
      expiries: exps,
      grid: rows,
      minVol: mn === Infinity ? 0 : mn,
      maxVol: mx === -Infinity ? 100 : mx,
    };
  }, [data, currency]);

  if (grid.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        NO SURFACE DATA FOR {currency}
      </div>
    );
  }

  return (
    <div className="p-2">
      <div className="text-[8px] font-mono text-neutral-400 uppercase mb-2 tracking-wider">
        SWAPTION IMPLIED VOL SURFACE (BP) &mdash; {currency}
      </div>

      <table className="w-full text-[8px] font-mono">
        <thead className="text-neutral-500 uppercase tracking-wider">
          <tr>
            <th className="px-1.5 py-1 text-left text-[7px] font-black border-b border-border/10">
              EXP \ TNR
            </th>
            {tenors.map((tn: string) => (
              <th
                key={tn}
                className="px-1.5 py-1 text-right text-[7px] font-black border-b border-border/10"
              >
                {tn}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.map((row: Record<string, unknown>, idx: number) => (
            <tr
              key={String(expiries[idx] || idx)}
              className="border-b border-border/5 hover:bg-cyan-400/[0.03] transition-colors cursor-pointer"
              onClick={() => onSelectExpiry(expiries[idx])}
            >
              <td className="px-1.5 py-1.5 font-bold text-cyan-400 text-[8px]">
                {String(expiries[idx] || '')}
              </td>
              {tenors.map((tn: string) => {
                const val = row[tn];
                const isNum = typeof val === 'number' && !isNaN(val);
                const bg = isNum
                  ? volHeatColor(val as number, minVol, maxVol)
                  : 'transparent';
                return (
                  <td
                    key={tn}
                    className="px-1.5 py-1.5 text-right font-bold text-white/90"
                    style={{ backgroundColor: bg }}
                  >
                    {isNum ? fmtNum(val, 1) : '-'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Heat-map legend */}
      <div className="flex items-center gap-2 mt-2 px-1">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">
          LOW VOL
        </span>
        <div className="flex h-2 flex-1 max-w-[120px]">
          <div
            className="flex-1"
            style={{ background: 'rgba(59,130,246,0.35)' }}
          />
          <div
            className="flex-1"
            style={{ background: 'rgba(34,211,238,0.35)' }}
          />
          <div
            className="flex-1"
            style={{ background: 'rgba(250,204,21,0.35)' }}
          />
          <div
            className="flex-1"
            style={{ background: 'rgba(249,115,22,0.4)' }}
          />
          <div
            className="flex-1"
            style={{ background: 'rgba(239,68,68,0.45)' }}
          />
        </div>
        <span className="text-[7px] font-mono text-neutral-600 uppercase">
          HIGH VOL
        </span>
      </div>

      <div className="text-[7px] font-mono text-neutral-600 uppercase mt-1.5 px-1">
        CLICK A ROW TO VIEW VOL SMILE FOR THAT EXPIRY
      </div>
    </div>
  );
}

// -- Vol Smile Tab (SVG Line Chart) --

function SmileTab({
  data,
  currency,
  selectedExpiry,
  onSelectExpiry,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  currency: Currency;
  selectedExpiry: string | null;
  onSelectExpiry: (e: string) => void;
}) {
  const { expiries, smileData } = useMemo(() => {
    const ccyData = data?.currencies?.[currency] ?? data?.smile ?? data;
    const smiles = ccyData?.smiles ?? ccyData?.volSmile ?? ccyData?.smile ?? {};

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let smileMap: Record<string, any[]> = {};
    if (Array.isArray(smiles)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const s of smiles as any[]) {
        const exp = String(s.expiry || s.label || '');
        if (!smileMap[exp]) smileMap[exp] = [];
        smileMap[exp].push(s);
      }
    } else {
      smileMap = smiles;
    }

    const exps = Object.keys(smileMap);
    return { expiries: exps, smileData: smileMap };
  }, [data, currency]);

  const activeExpiry =
    selectedExpiry && expiries.includes(selectedExpiry)
      ? selectedExpiry
      : expiries[0] ?? null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const points: any[] = useMemo(() => {
    if (!activeExpiry || !smileData[activeExpiry]) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any = smileData[activeExpiry];
    if (Array.isArray(raw)) return raw;
    return raw.points ?? [];
  }, [activeExpiry, smileData]);

  if (expiries.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        NO VOL SMILE DATA FOR {currency}
      </div>
    );
  }

  // SVG chart dimensions
  const W = 360;
  const H = 160;
  const PAD = { top: 15, right: 15, bottom: 25, left: 40 };
  const cw = W - PAD.left - PAD.right;
  const ch = H - PAD.top - PAD.bottom;

  const strikes = points.map(
    (p: Record<string, unknown>) =>
      Number(p.strike ?? p.delta ?? p.moneyness ?? 0),
  );
  const vols = points.map(
    (p: Record<string, unknown>) =>
      Number(p.vol ?? p.value ?? p.impliedVol ?? 0),
  );
  const minStrike = strikes.length > 0 ? Math.min(...strikes) : 0;
  const maxStrike = strikes.length > 0 ? Math.max(...strikes) : 100;
  const minVol = vols.length > 0 ? Math.min(...vols) * 0.95 : 0;
  const maxVol = vols.length > 0 ? Math.max(...vols) * 1.05 : 100;
  const strikeRange = maxStrike - minStrike || 1;
  const volRange = maxVol - minVol || 1;

  const toX = (s: number) => PAD.left + ((s - minStrike) / strikeRange) * cw;
  const toY = (v: number) => PAD.top + ch - ((v - minVol) / volRange) * ch;

  const pathD =
    points.length > 1
      ? points
          .map((p: Record<string, unknown>, i: number) => {
            const x = toX(
              Number(p.strike ?? p.delta ?? p.moneyness ?? 0),
            );
            const y = toY(
              Number(p.vol ?? p.value ?? p.impliedVol ?? 0),
            );
            return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .join(' ')
      : '';

  const yTicks = 5;
  const ySteps = Array.from(
    { length: yTicks },
    (_, i) => minVol + (volRange / (yTicks - 1)) * i,
  );

  return (
    <div className="p-3">
      <div className="text-[8px] font-mono text-neutral-400 uppercase mb-2 tracking-wider">
        VOL SMILE &mdash; {currency} &mdash; {activeExpiry || 'SELECT EXPIRY'}
      </div>

      {/* Expiry selector */}
      <div className="flex flex-wrap gap-1 mb-3">
        {expiries.map((exp) => (
          <button
            key={exp}
            onClick={() => onSelectExpiry(exp)}
            className={`px-2 py-0.5 text-[7px] font-black uppercase tracking-wider border transition-colors ${
              activeExpiry === exp
                ? 'border-cyan-400/40 text-cyan-400 bg-cyan-400/10'
                : 'border-border/20 text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {exp}
          </button>
        ))}
      </div>

      {/* SVG smile chart */}
      {points.length > 1 ? (
        <div className="border border-border/20 bg-[#030303] mb-3">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            style={{ maxHeight: 200 }}
          >
            {/* Grid lines */}
            {ySteps.map((yv, i) => {
              const y = toY(yv);
              return (
                <g key={i}>
                  <line
                    x1={PAD.left}
                    y1={y}
                    x2={W - PAD.right}
                    y2={y}
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth={0.5}
                  />
                  <text
                    x={PAD.left - 4}
                    y={y + 3}
                    textAnchor="end"
                    fill="rgba(255,255,255,0.3)"
                    fontSize={7}
                    fontFamily="monospace"
                  >
                    {yv.toFixed(0)}
                  </text>
                </g>
              );
            })}

            {/* X-axis labels */}
            {points.length <= 12
              ? points.map((p: Record<string, unknown>, i: number) => {
                  const x = toX(
                    Number(p.strike ?? p.delta ?? p.moneyness ?? 0),
                  );
                  return (
                    <text
                      key={i}
                      x={x}
                      y={H - 5}
                      textAnchor="middle"
                      fill="rgba(255,255,255,0.3)"
                      fontSize={6}
                      fontFamily="monospace"
                    >
                      {fmtNum(p.strike ?? p.delta ?? p.moneyness, 0)}
                    </text>
                  );
                })
              : [0, Math.floor(points.length / 2), points.length - 1].map(
                  (idx) => {
                    const p = points[idx];
                    const x = toX(
                      Number(p.strike ?? p.delta ?? p.moneyness ?? 0),
                    );
                    return (
                      <text
                        key={idx}
                        x={x}
                        y={H - 5}
                        textAnchor="middle"
                        fill="rgba(255,255,255,0.3)"
                        fontSize={6}
                        fontFamily="monospace"
                      >
                        {fmtNum(p.strike ?? p.delta ?? p.moneyness, 0)}
                      </text>
                    );
                  },
                )}

            {/* Area fill */}
            {pathD && (
              <path
                d={`${pathD} L${toX(strikes[strikes.length - 1]).toFixed(1)},${(PAD.top + ch).toFixed(1)} L${toX(strikes[0]).toFixed(1)},${(PAD.top + ch).toFixed(1)} Z`}
                fill="rgba(34,211,238,0.08)"
              />
            )}

            {/* Line */}
            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke={ACCENT}
                strokeWidth={1.5}
                strokeLinejoin="round"
              />
            )}

            {/* Data points */}
            {points.map((p: Record<string, unknown>, i: number) => {
              const x = toX(
                Number(p.strike ?? p.delta ?? p.moneyness ?? 0),
              );
              const y = toY(
                Number(p.vol ?? p.value ?? p.impliedVol ?? 0),
              );
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={2.5}
                  fill="#000"
                  stroke={ACCENT}
                  strokeWidth={1}
                />
              );
            })}

            {/* Axis labels */}
            <text
              x={W / 2}
              y={H - 1}
              textAnchor="middle"
              fill="rgba(255,255,255,0.2)"
              fontSize={6}
              fontFamily="monospace"
            >
              STRIKE / DELTA
            </text>
            <text
              x={5}
              y={H / 2}
              textAnchor="middle"
              fill="rgba(255,255,255,0.2)"
              fontSize={6}
              fontFamily="monospace"
              transform={`rotate(-90, 5, ${H / 2})`}
            >
              VOL (BP)
            </text>
          </svg>
        </div>
      ) : (
        <div className="text-center py-6 text-neutral-600 text-[8px] font-mono uppercase border border-border/20 bg-[#030303] mb-3">
          INSUFFICIENT DATA POINTS FOR CHART
        </div>
      )}

      {/* Smile data table */}
      {points.length > 0 && (
        <table className="w-full text-[8px] font-mono">
          <thead className="text-neutral-500 uppercase tracking-wider border-b border-border/10">
            <tr>
              <th className="px-2 py-1 text-left text-[7px] font-black">
                STRIKE
              </th>
              <th className="px-2 py-1 text-right text-[7px] font-black">
                VOL (BP)
              </th>
              <th className="px-2 py-1 text-right text-[7px] font-black">
                1D CHG
              </th>
              <th className="px-2 py-1 text-right text-[7px] font-black">
                DELTA
              </th>
            </tr>
          </thead>
          <tbody>
            {points.map((p: Record<string, unknown>, i: number) => {
              const vol = Number(p.vol ?? p.value ?? p.impliedVol ?? 0);
              const chg = p.change1d as number | undefined;
              return (
                <tr
                  key={i}
                  className="border-b border-border/5 hover:bg-cyan-400/[0.02] transition-colors"
                >
                  <td className="px-2 py-1.5 font-bold text-cyan-400">
                    {fmtNum(p.strike ?? p.moneyness, 2)}
                  </td>
                  <td className="px-2 py-1.5 text-right font-bold text-white/80">
                    {fmtNum(vol, 1)}
                  </td>
                  <td
                    className="px-2 py-1.5 text-right font-bold"
                    style={{
                      color:
                        chg != null
                          ? changeColor(chg)
                          : 'rgba(255,255,255,0.3)',
                    }}
                  >
                    {chg != null ? fmtChange(chg, 1) : '-'}
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/50">
                    {fmtNum(p.delta, 2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

// -- Changes Tab (1d, 1w, 1m with color-coded deltas) --

function ChangesTab({
  data,
  currency,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  currency: Currency;
}) {
  const [period, setPeriod] = useState<'1d' | '1w' | '1m'>('1d');

  const { tenors, rows } = useMemo(() => {
    const ccyData = data?.currencies?.[currency] ?? data?.changes ?? data;
    const changes = ccyData?.changes ?? ccyData;
    if (!changes) return { tenors: [] as string[], rows: [] as Record<string, unknown>[] };

    const periodData = changes[period] ?? changes;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r: any[] = Array.isArray(periodData) ? periodData : periodData?.rows ?? [];
    const t: string[] =
      periodData?.tenors ??
      changes?.tenors ??
      (r.length > 0
        ? Object.keys(r[0]).filter(
            (k: string) =>
              k !== 'expiry' && k !== 'label' && k !== 'period',
          )
        : []);
    return { tenors: t, rows: r };
  }, [data, currency, period]);

  const periods: { key: '1d' | '1w' | '1m'; label: string }[] = [
    { key: '1d', label: '1 DAY' },
    { key: '1w', label: '1 WEEK' },
    { key: '1m', label: '1 MONTH' },
  ];

  return (
    <div className="p-2">
      <div className="text-[8px] font-mono text-neutral-400 uppercase mb-2 tracking-wider">
        VOL CHANGES (BP) &mdash; {currency}
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-1 mb-2">
        {periods.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-2.5 py-0.5 text-[7px] font-black uppercase tracking-wider border transition-colors ${
              period === p.key
                ? 'border-cyan-400/40 text-cyan-400 bg-cyan-400/10'
                : 'border-border/20 text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
          NO CHANGE DATA FOR {currency}
        </div>
      ) : (
        <table className="w-full text-[8px] font-mono">
          <thead className="text-neutral-500 uppercase tracking-wider">
            <tr>
              <th className="px-1.5 py-1 text-left text-[7px] font-black border-b border-border/10">
                EXP \ TNR
              </th>
              {tenors.map((tn: string) => (
                <th
                  key={tn}
                  className="px-1.5 py-1 text-right text-[7px] font-black border-b border-border/10"
                >
                  {tn}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row: Record<string, unknown>, idx: number) => {
              const label = String(
                row.expiry || row.label || row.period || idx,
              );
              return (
                <tr
                  key={label}
                  className="border-b border-border/5 hover:bg-cyan-400/[0.02] transition-colors"
                >
                  <td className="px-1.5 py-1.5 font-bold text-cyan-400 text-[8px]">
                    {label}
                  </td>
                  {tenors.map((tn: string) => {
                    const val = row[tn];
                    const isNum =
                      typeof val === 'number' && !isNaN(val);
                    return (
                      <td
                        key={tn}
                        className="px-1.5 py-1.5 text-right font-bold"
                        style={{
                          color: isNum
                            ? changeColor(val as number)
                            : 'rgba(255,255,255,0.3)',
                        }}
                      >
                        {isNum ? fmtChange(val, 1) : '-'}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Biggest movers section */}
      {(data?.changes?.biggestMovers ||
        data?.currencies?.[currency]?.changes?.biggestMovers) && (
        <BiggestMovers
          movers={
            data?.currencies?.[currency]?.changes?.biggestMovers ??
            data?.changes?.biggestMovers
          }
        />
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BiggestMovers({ movers }: { movers: any[] }) {
  if (!movers?.length) return null;
  return (
    <div className="mt-4">
      <div className="text-[8px] font-mono text-neutral-400 uppercase mb-2 tracking-wider">
        BIGGEST MOVERS
      </div>
      <div className="grid grid-cols-2 gap-2">
        {movers.map((m: Record<string, unknown>, i: number) => (
          <div
            key={i}
            className="px-2 py-1.5 bg-white/[0.02] border border-border/10 hover:bg-cyan-400/[0.02] transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-mono font-bold text-cyan-400">
                {String(m.expiry || '')} x {String(m.tenor || '')}
              </span>
              <span
                className="text-[9px] font-mono font-black"
                style={{ color: changeColor(Number(m.change ?? 0)) }}
              >
                {fmtChange(m.change, 1)}bp
              </span>
            </div>
            {m.vol != null && (
              <div className="text-[7px] font-mono text-neutral-500 mt-0.5">
                LEVEL: {fmtNum(m.vol, 1)}bp
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// -- Cap/Floor Implied Vol Summary --

function CapFloorTab({
  data,
  currency,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  currency: Currency;
}) {
  const capFloor = useMemo(() => {
    const ccyData = data?.currencies?.[currency] ?? data;
    return ccyData?.capFloor ?? ccyData?.capFloorVols ?? null;
  }, [data, currency]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const caps: any[] = capFloor?.caps ?? capFloor?.capVols ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const floors: any[] = capFloor?.floors ?? capFloor?.floorVols ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const summary: any = capFloor?.summary ?? null;

  if (caps.length === 0 && floors.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        NO CAP/FLOOR DATA FOR {currency}
      </div>
    );
  }

  const maxVol = Math.max(
    ...caps.map((c: Record<string, unknown>) =>
      Number(c.vol ?? c.impliedVol ?? 0),
    ),
    ...floors.map((f: Record<string, unknown>) =>
      Number(f.vol ?? f.impliedVol ?? 0),
    ),
    1,
  );

  return (
    <div className="p-3">
      <div className="text-[8px] font-mono text-neutral-400 uppercase mb-2 tracking-wider">
        CAP / FLOOR IMPLIED VOL &mdash; {currency}
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: 'ATM CAP VOL', value: summary.atmCapVol, unit: 'bp' },
            {
              label: 'ATM FLOOR VOL',
              value: summary.atmFloorVol,
              unit: 'bp',
            },
            {
              label: 'CAP-FLOOR SPREAD',
              value: summary.spread,
              unit: 'bp',
            },
          ].map((item) => (
            <div
              key={item.label}
              className="px-2 py-1.5 bg-white/[0.02] border border-border/10"
            >
              <div className="text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider">
                {item.label}
              </div>
              <div className="text-[10px] font-mono font-bold text-cyan-400">
                {item.value != null
                  ? `${fmtNum(item.value, 1)}${item.unit}`
                  : '-'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Caps */}
      {caps.length > 0 && (
        <>
          <div className="text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider mb-1 mt-2">
            CAPS
          </div>
          <VolBarList items={caps} maxVol={maxVol} barColor="rgba(34,211,238,0.4)" barColorEnd="rgba(34,211,238,0.15)" />
        </>
      )}

      {/* Floors */}
      {floors.length > 0 && (
        <>
          <div className="text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider mb-1 mt-3">
            FLOORS
          </div>
          <VolBarList items={floors} maxVol={maxVol} barColor="rgba(250,204,21,0.4)" barColorEnd="rgba(250,204,21,0.15)" />
        </>
      )}
    </div>
  );
}

function VolBarList({
  items,
  maxVol,
  barColor,
  barColorEnd,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[];
  maxVol: number;
  barColor: string;
  barColorEnd: string;
}) {
  return (
    <div className="space-y-0.5">
      {items.map((item: Record<string, unknown>, i: number) => {
        const vol = Number(item.vol ?? item.impliedVol ?? 0);
        const pct = (vol / maxVol) * 100;
        const chg1d = item.change1d as number | undefined;
        const chg1w = item.change1w as number | undefined;
        const chg1m = item.change1m as number | undefined;
        return (
          <div
            key={i}
            className="flex items-center gap-2 px-1 py-0.5 hover:bg-cyan-400/[0.02] transition-colors"
          >
            <span className="text-[8px] font-mono font-bold w-10 text-right text-cyan-400">
              {String(item.tenor ?? item.maturity ?? item.label ?? '')}
            </span>
            <div className="flex-1 h-3 bg-white/[0.03] overflow-hidden">
              <div
                style={{
                  width: `${Math.min(Math.max(pct, 2), 100)}%`,
                  height: '100%',
                  background: `linear-gradient(to right, ${barColor}, ${barColorEnd})`,
                }}
              />
            </div>
            <span className="text-[8px] font-mono text-white/70 font-bold w-12 text-right">
              {fmtNum(vol, 1)}bp
            </span>
            <span
              className="text-[7px] font-mono w-10 text-right font-bold"
              style={{
                color:
                  chg1d != null
                    ? changeColor(chg1d)
                    : 'rgba(255,255,255,0.2)',
              }}
            >
              {chg1d != null ? fmtChange(chg1d, 1) : '-'}
            </span>
            <span
              className="text-[7px] font-mono w-10 text-right font-bold"
              style={{
                color:
                  chg1w != null
                    ? changeColor(chg1w)
                    : 'rgba(255,255,255,0.2)',
              }}
            >
              {chg1w != null ? fmtChange(chg1w, 1) : '-'}
            </span>
            <span
              className="text-[7px] font-mono w-10 text-right font-bold"
              style={{
                color:
                  chg1m != null
                    ? changeColor(chg1m)
                    : 'rgba(255,255,255,0.2)',
              }}
            >
              {chg1m != null ? fmtChange(chg1m, 1) : '-'}
            </span>
          </div>
        );
      })}
      <div className="flex items-center gap-2 px-1 text-[6px] font-mono text-neutral-600 uppercase">
        <span className="w-10" />
        <span className="flex-1" />
        <span className="w-12 text-right">VOL</span>
        <span className="w-10 text-right">1D</span>
        <span className="w-10 text-right">1W</span>
        <span className="w-10 text-right">1M</span>
      </div>
    </div>
  );
}

// -- ATM Strike Levels --

function AtmStrikesTab({
  data,
  currency,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  currency: Currency;
}) {
  const atmData = useMemo(() => {
    const ccyData = data?.currencies?.[currency] ?? data;
    return ccyData?.atmStrikes ?? ccyData?.atm ?? null;
  }, [data, currency]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = useMemo(() => {
    if (!atmData) return [];
    return Array.isArray(atmData)
      ? atmData
      : atmData.rows ?? atmData.points ?? [];
  }, [atmData]);

  if (rows.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        NO ATM STRIKE DATA FOR {currency}
      </div>
    );
  }

  // SVG chart for ATM term structure
  const W = 360;
  const H = 130;
  const PAD = { top: 12, right: 15, bottom: 22, left: 40 };
  const cw = W - PAD.left - PAD.right;
  const ch = H - PAD.top - PAD.bottom;

  const strikeVals = rows.map(
    (r: Record<string, unknown>) =>
      Number(r.strike ?? r.atmStrike ?? r.rate ?? 0),
  );
  const minS =
    strikeVals.length > 0 ? Math.min(...strikeVals) * 0.98 : 0;
  const maxS =
    strikeVals.length > 0 ? Math.max(...strikeVals) * 1.02 : 5;
  const range = maxS - minS || 1;

  const toX = (i: number) =>
    PAD.left + (i / Math.max(rows.length - 1, 1)) * cw;
  const toY = (v: number) => PAD.top + ch - ((v - minS) / range) * ch;

  const pathD =
    rows.length > 1
      ? rows
          .map((r: Record<string, unknown>, i: number) => {
            const x = toX(i);
            const y = toY(
              Number(r.strike ?? r.atmStrike ?? r.rate ?? 0),
            );
            return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .join(' ')
      : '';

  const yTicks = 4;
  const ySteps = Array.from(
    { length: yTicks },
    (_, i) => minS + (range / (yTicks - 1)) * i,
  );

  return (
    <div className="p-3">
      <div className="text-[8px] font-mono text-neutral-400 uppercase mb-2 tracking-wider">
        ATM STRIKE LEVELS &mdash; {currency}
      </div>

      {/* SVG term structure chart */}
      {rows.length > 1 && (
        <div className="border border-border/20 bg-[#030303] mb-3">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            style={{ maxHeight: 160 }}
          >
            {/* Grid */}
            {ySteps.map((yv, i) => {
              const y = toY(yv);
              return (
                <g key={i}>
                  <line
                    x1={PAD.left}
                    y1={y}
                    x2={W - PAD.right}
                    y2={y}
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth={0.5}
                  />
                  <text
                    x={PAD.left - 4}
                    y={y + 3}
                    textAnchor="end"
                    fill="rgba(255,255,255,0.3)"
                    fontSize={7}
                    fontFamily="monospace"
                  >
                    {yv.toFixed(2)}%
                  </text>
                </g>
              );
            })}

            {/* X labels */}
            {rows.map((r: Record<string, unknown>, i: number) => {
              if (
                rows.length > 10 &&
                i % 2 !== 0 &&
                i !== rows.length - 1
              )
                return null;
              return (
                <text
                  key={i}
                  x={toX(i)}
                  y={H - 5}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.3)"
                  fontSize={6}
                  fontFamily="monospace"
                >
                  {String(r.expiry ?? r.tenor ?? r.label ?? '')}
                </text>
              );
            })}

            {/* Area */}
            {pathD && (
              <path
                d={`${pathD} L${toX(rows.length - 1).toFixed(1)},${(PAD.top + ch).toFixed(1)} L${toX(0).toFixed(1)},${(PAD.top + ch).toFixed(1)} Z`}
                fill="rgba(34,211,238,0.06)"
              />
            )}

            {/* Line */}
            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke={ACCENT}
                strokeWidth={1.5}
                strokeLinejoin="round"
              />
            )}

            {/* Points */}
            {rows.map((r: Record<string, unknown>, i: number) => (
              <circle
                key={i}
                cx={toX(i)}
                cy={toY(
                  Number(r.strike ?? r.atmStrike ?? r.rate ?? 0),
                )}
                r={2}
                fill="#000"
                stroke={ACCENT}
                strokeWidth={1}
              />
            ))}
          </svg>
        </div>
      )}

      {/* Data table */}
      <table className="w-full text-[8px] font-mono">
        <thead className="text-neutral-500 uppercase tracking-wider border-b border-border/10">
          <tr>
            <th className="px-2 py-1 text-left text-[7px] font-black">
              EXPIRY
            </th>
            <th className="px-2 py-1 text-right text-[7px] font-black">
              ATM STRIKE (%)
            </th>
            <th className="px-2 py-1 text-right text-[7px] font-black">
              ATM VOL (BP)
            </th>
            <th className="px-2 py-1 text-right text-[7px] font-black">
              FWD RATE (%)
            </th>
            <th className="px-2 py-1 text-right text-[7px] font-black">
              1D CHG
            </th>
            <th className="px-2 py-1 text-right text-[7px] font-black">
              1W CHG
            </th>
            <th className="px-2 py-1 text-right text-[7px] font-black">
              1M CHG
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r: Record<string, unknown>, i: number) => {
            const chg1d = r.change1d as number | undefined;
            const chg1w = r.change1w as number | undefined;
            const chg1m = r.change1m as number | undefined;
            return (
              <tr
                key={i}
                className="border-b border-border/5 hover:bg-cyan-400/[0.02] transition-colors"
              >
                <td className="px-2 py-1.5 font-bold text-cyan-400">
                  {String(r.expiry ?? r.tenor ?? r.label ?? '')}
                </td>
                <td className="px-2 py-1.5 text-right font-bold text-white/80">
                  {fmtNum(r.strike ?? r.atmStrike ?? r.rate, 3)}
                </td>
                <td className="px-2 py-1.5 text-right text-white/60">
                  {fmtNum(r.atmVol ?? r.vol, 1)}
                </td>
                <td className="px-2 py-1.5 text-right text-white/60">
                  {fmtNum(r.forwardRate ?? r.fwdRate, 3)}
                </td>
                <td
                  className="px-2 py-1.5 text-right font-bold"
                  style={{
                    color:
                      chg1d != null
                        ? changeColor(chg1d)
                        : 'rgba(255,255,255,0.3)',
                  }}
                >
                  {chg1d != null ? fmtChange(chg1d, 1) : '-'}
                </td>
                <td
                  className="px-2 py-1.5 text-right font-bold"
                  style={{
                    color:
                      chg1w != null
                        ? changeColor(chg1w)
                        : 'rgba(255,255,255,0.3)',
                  }}
                >
                  {chg1w != null ? fmtChange(chg1w, 1) : '-'}
                </td>
                <td
                  className="px-2 py-1.5 text-right font-bold"
                  style={{
                    color:
                      chg1m != null
                        ? changeColor(chg1m)
                        : 'rgba(255,255,255,0.3)',
                  }}
                >
                  {chg1m != null ? fmtChange(chg1m, 1) : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
