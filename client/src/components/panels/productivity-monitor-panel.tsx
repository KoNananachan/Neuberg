import { useState } from 'react';
import { useProductivityMonitor } from '../../api/hooks/use-productivity-monitor';

// ── Types ──

type CountryCode = 'US' | 'EU' | 'UK' | 'JP' | 'CN' | 'CA' | 'AU' | 'KR';

const COUNTRIES: CountryCode[] = ['US', 'EU', 'UK', 'JP', 'CN', 'CA', 'AU', 'KR'];

// ── Color helpers ──

const GREEN = '#4ade80';   // green-400
const RED = '#f87171';
const YELLOW = '#fbbf24';
const DIM = 'rgba(255,255,255,0.3)';

function growthColor(v: number): string {
  if (v > 1) return GREEN;
  if (v > 0) return 'rgba(74,222,128,0.6)';
  if (v > -1) return YELLOW;
  return RED;
}

function changeColor(v: number): string {
  return v > 0 ? GREEN : v < 0 ? RED : DIM;
}

function fmtPct(v: number): string {
  return (v >= 0 ? '+' : '') + v.toFixed(2) + '%';
}

function fmtIdx(v: number): string {
  return v.toFixed(1);
}

function fmtDensity(v: number): string {
  return v.toLocaleString();
}

// ── Badge component ──

function Badge({ text, color, bg }: { text: string; color: string; bg: string }) {
  return (
    <span
      className="text-[6px] font-black font-mono uppercase px-1 py-0.5 shrink-0"
      style={{ color, backgroundColor: bg }}
    >
      {text}
    </span>
  );
}

// ── Horizontal stacked bar ──

function StackedBar({
  segments,
  maxTotal,
}: {
  segments: { value: number; color: string; label: string }[];
  maxTotal: number;
}) {
  const total = segments.reduce((s, seg) => s + Math.abs(seg.value), 0);
  const scale = maxTotal > 0 ? 100 / maxTotal : 0;

  return (
    <div className="flex items-center gap-1 py-0.5">
      <div className="flex-1 h-2.5 bg-white/[0.02] relative overflow-hidden flex">
        {segments.map((seg, i) => {
          const w = Math.abs(seg.value) * scale;
          return (
            <div
              key={i}
              className="h-full relative group"
              style={{
                width: `${w}%`,
                backgroundColor: seg.color,
                opacity: 0.6,
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                {w > 12 && (
                  <span className="text-[5px] font-mono font-bold text-black/70 truncate px-0.5">
                    {seg.label}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <span className="text-[6px] font-mono text-white/30 w-10 text-right shrink-0">
        {total.toFixed(1)}%
      </span>
    </div>
  );
}

// ── Main Panel ──

export function ProductivityMonitorPanel() {
  const { data, isLoading } = useProductivityMonitor();
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>('US');

  const countryData = data?.countries?.[selectedCountry];
  const globalRanking = data?.globalRanking;
  const topCountry = globalRanking?.[0];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 16 16" className="w-4 h-4">
            <rect x="2" y="10" width="2.5" height="4" fill={GREEN} fillOpacity="0.8" />
            <rect x="5.5" y="7" width="2.5" height="7" fill={GREEN} fillOpacity="0.6" />
            <rect x="9" y="4" width="2.5" height="10" fill={GREEN} fillOpacity="0.7" />
            <rect x="12.5" y="2" width="2.5" height="12" fill={GREEN} fillOpacity="0.9" />
            <line x1="1" y1="14.5" x2="15" y2="14.5" stroke={GREEN} strokeWidth="0.5" strokeOpacity="0.3" />
          </svg>
          <span className="text-[9px] font-black uppercase tracking-tighter text-green-400">
            PRODUCTIVITY MONITOR
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {topCountry && (
            <span className="text-[6px] font-mono text-white/25">
              #1 {topCountry.country} {fmtIdx(topCountry.productivity)}
            </span>
          )}
          {data?.timestamp && (
            <span className="text-[6px] text-white/20">
              {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {/* ── Country Tabs ── */}
      <div className="flex border-b border-border/20 bg-black/40 shrink-0">
        {COUNTRIES.map((code) => (
          <button
            key={code}
            onClick={() => setSelectedCountry(code)}
            className={`flex-1 py-1 text-[7px] font-black uppercase tracking-widest border-b-2 transition-colors ${
              selectedCountry === code
                ? 'border-green-400 text-green-400'
                : 'border-transparent text-white/30 hover:text-white/60 hover:bg-green-400/[0.02]'
            }`}
          >
            {code}
          </button>
        ))}
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading && !data ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-green-400/30 border-t-green-400 animate-spin" />
              <span className="text-[10px] text-white/40 uppercase tracking-widest">Loading...</span>
            </div>
          </div>
        ) : !data || !countryData ? (
          <div className="flex items-center justify-center h-full text-[10px] text-white/40 uppercase">
            No data available
          </div>
        ) : (
          <>
            {/* ── Key Metrics ── */}
            <div className="border-b border-border/20">
              <div className="px-2 py-1">
                <span className="text-[6px] text-white/25 uppercase tracking-wider">
                  KEY METRICS &mdash; {selectedCountry}
                </span>
              </div>

              {/* Labor Productivity */}
              <div className="px-2 py-1 border-b border-white/[0.03] hover:bg-green-400/[0.02] transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[7px] font-bold text-white/60 uppercase">Labor Productivity</span>
                  <span className="text-[8px] font-black text-green-400">
                    {fmtIdx(countryData?.laborProductivity?.index ?? 0)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[6px] text-white/25">YoY</span>
                  <span
                    className="text-[7px] font-bold"
                    style={{ color: growthColor(countryData?.laborProductivity?.yoy ?? 0) }}
                  >
                    {fmtPct(countryData?.laborProductivity?.yoy ?? 0)}
                  </span>
                  <span className="text-[6px] text-white/25">QoQ</span>
                  <span
                    className="text-[7px] font-bold"
                    style={{ color: growthColor(countryData?.laborProductivity?.qoq ?? 0) }}
                  >
                    {fmtPct(countryData?.laborProductivity?.qoq ?? 0)}
                  </span>
                </div>
              </div>

              {/* TFP */}
              <div className="px-2 py-1 border-b border-white/[0.03] hover:bg-green-400/[0.02] transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[7px] font-bold text-white/60 uppercase">Total Factor Productivity</span>
                  <span className="text-[8px] font-black text-green-400">
                    {fmtIdx(countryData?.tfp?.index ?? 0)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[6px] text-white/25">Growth</span>
                  <span
                    className="text-[7px] font-bold"
                    style={{ color: growthColor(countryData?.tfp?.growth ?? 0) }}
                  >
                    {fmtPct(countryData?.tfp?.growth ?? 0)}
                  </span>
                </div>
              </div>

              {/* Unit Labor Costs */}
              <div className="px-2 py-1 hover:bg-green-400/[0.02] transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[7px] font-bold text-white/60 uppercase">Unit Labor Costs</span>
                  <span className="text-[8px] font-black text-green-400">
                    {fmtIdx(countryData?.unitLaborCosts?.index ?? 0)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[6px] text-white/25">Trend</span>
                  <Badge
                    text={countryData?.unitLaborCosts?.trend ?? 'FLAT'}
                    color={
                      countryData?.unitLaborCosts?.trend === 'rising'
                        ? RED
                        : countryData?.unitLaborCosts?.trend === 'falling'
                          ? GREEN
                          : YELLOW
                    }
                    bg={
                      countryData?.unitLaborCosts?.trend === 'rising'
                        ? 'rgba(248,113,113,0.1)'
                        : countryData?.unitLaborCosts?.trend === 'falling'
                          ? 'rgba(74,222,128,0.1)'
                          : 'rgba(251,191,36,0.08)'
                    }
                  />
                  <span className="text-[6px] text-white/25">YoY</span>
                  <span
                    className="text-[7px] font-bold"
                    style={{ color: changeColor(-(countryData?.unitLaborCosts?.yoy ?? 0)) }}
                  >
                    {fmtPct(countryData?.unitLaborCosts?.yoy ?? 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Sector Breakdown Table ── */}
            <div className="border-b border-border/20">
              <div className="px-2 py-1">
                <span className="text-[6px] text-white/25 uppercase tracking-wider">Sector Breakdown</span>
              </div>
              {/* Table header */}
              <div className="flex items-center px-2 py-0.5 border-b border-white/[0.06] text-[5px] font-mono text-white/20 uppercase gap-1">
                <span className="flex-1">Sector</span>
                <span className="w-16 text-right">Productivity</span>
                <span className="w-14 text-right">Growth</span>
                <span className="w-16 text-right">Employment</span>
              </div>
              {/* Table rows */}
              {countryData?.sectors?.map((sector: any) => (
                <div
                  key={sector.name}
                  className="flex items-center px-2 py-0.5 border-b border-white/[0.02] hover:bg-green-400/[0.02] transition-colors gap-1"
                >
                  <span className="flex-1 text-[7px] font-bold text-white/60 truncate">{sector.name}</span>
                  <span className="w-16 text-right text-[7px] text-white/50">{fmtIdx(sector.productivity)}</span>
                  <span
                    className="w-14 text-right text-[7px] font-bold"
                    style={{ color: growthColor(sector.growth) }}
                  >
                    {fmtPct(sector.growth)}
                  </span>
                  <span className="w-16 text-right text-[7px] text-white/40">{sector.employment}</span>
                </div>
              ))}
              {(!countryData?.sectors || countryData.sectors.length === 0) && (
                <div className="px-2 py-2 text-[7px] text-white/20 text-center uppercase">No sector data</div>
              )}
            </div>

            {/* ── Decomposition: Output Growth vs Hours Worked vs Productivity Contribution ── */}
            <div className="border-b border-border/20">
              <div className="px-2 py-1">
                <span className="text-[6px] text-white/25 uppercase tracking-wider">Growth Decomposition</span>
              </div>
              {countryData?.decomposition ? (
                <div className="px-2 pb-1.5">
                  {/* Legend */}
                  <div className="flex items-center gap-3 mb-1">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2" style={{ backgroundColor: GREEN, opacity: 0.6 }} />
                      <span className="text-[5px] text-white/30 uppercase">Output</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2" style={{ backgroundColor: '#60a5fa', opacity: 0.6 }} />
                      <span className="text-[5px] text-white/30 uppercase">Hours Worked</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2" style={{ backgroundColor: YELLOW, opacity: 0.6 }} />
                      <span className="text-[5px] text-white/30 uppercase">Productivity</span>
                    </div>
                  </div>

                  {countryData.decomposition.map((period: any) => {
                    const maxTotal = Math.max(
                      Math.abs(period.outputGrowth) + Math.abs(period.hoursWorked) + Math.abs(period.productivityContribution),
                      0.1,
                    );
                    return (
                      <div key={period.period} className="mb-1">
                        <span className="text-[6px] font-mono text-white/30 uppercase">{period.period}</span>
                        <StackedBar
                          segments={[
                            { value: period.outputGrowth, color: GREEN, label: `${period.outputGrowth.toFixed(1)}%` },
                            { value: period.hoursWorked, color: '#60a5fa', label: `${period.hoursWorked.toFixed(1)}%` },
                            { value: period.productivityContribution, color: YELLOW, label: `${period.productivityContribution.toFixed(1)}%` },
                          ]}
                          maxTotal={maxTotal}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-2 py-2 text-[7px] text-white/20 text-center uppercase">No decomposition data</div>
              )}
            </div>

            {/* ── Automation Indicators ── */}
            <div className="border-b border-border/20">
              <div className="px-2 py-1">
                <span className="text-[6px] text-white/25 uppercase tracking-wider">Automation Indicators</span>
              </div>
              {countryData?.automation ? (
                <div className="px-2 pb-1.5">
                  <div className="grid grid-cols-3 gap-2">
                    {/* Robot Density */}
                    <div className="border border-white/[0.04] p-1.5 hover:bg-green-400/[0.02] transition-colors">
                      <span className="text-[5px] text-white/25 uppercase tracking-wider block">Robot Density</span>
                      <span className="text-[10px] font-black text-green-400 block mt-0.5">
                        {fmtDensity(countryData.automation.robotDensity)}
                      </span>
                      <span className="text-[5px] text-white/20 block">per 10k workers</span>
                    </div>
                    {/* AI Adoption */}
                    <div className="border border-white/[0.04] p-1.5 hover:bg-green-400/[0.02] transition-colors">
                      <span className="text-[5px] text-white/25 uppercase tracking-wider block">AI Adoption</span>
                      <span className="text-[10px] font-black text-green-400 block mt-0.5">
                        {countryData.automation.aiAdoption?.toFixed(1) ?? '--'}%
                      </span>
                      <span className="text-[5px] text-white/20 block">enterprise usage</span>
                    </div>
                    {/* Investment */}
                    <div className="border border-white/[0.04] p-1.5 hover:bg-green-400/[0.02] transition-colors">
                      <span className="text-[5px] text-white/25 uppercase tracking-wider block">Investment</span>
                      <span className="text-[10px] font-black text-green-400 block mt-0.5">
                        {countryData.automation.investmentPct?.toFixed(1) ?? '--'}%
                      </span>
                      <span className="text-[5px] text-white/20 block">of GDP</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="px-2 py-2 text-[7px] text-white/20 text-center uppercase">No automation data</div>
              )}
            </div>

            {/* ── Global Ranking Table ── */}
            <div className="border-b border-border/20">
              <div className="px-2 py-1">
                <span className="text-[6px] text-white/25 uppercase tracking-wider">Global Ranking</span>
              </div>
              {/* Table header */}
              <div className="flex items-center px-2 py-0.5 border-b border-white/[0.06] text-[5px] font-mono text-white/20 uppercase gap-1">
                <span className="w-8">Rank</span>
                <span className="flex-1">Country</span>
                <span className="w-16 text-right">Productivity</span>
                <span className="w-14 text-right">Change</span>
              </div>
              {globalRanking?.map((entry: any) => {
                const isSelected = entry.country === selectedCountry;
                return (
                  <div
                    key={entry.country}
                    className={`flex items-center px-2 py-0.5 border-b border-white/[0.02] transition-colors gap-1 ${
                      isSelected ? 'bg-green-400/[0.06]' : 'hover:bg-green-400/[0.02]'
                    }`}
                  >
                    <span className={`w-8 text-[7px] font-bold ${isSelected ? 'text-green-400' : 'text-white/40'}`}>
                      #{entry.rank}
                    </span>
                    <span className={`flex-1 text-[7px] font-bold truncate ${isSelected ? 'text-green-400' : 'text-white/60'}`}>
                      {entry.country}
                    </span>
                    <span className={`w-16 text-right text-[7px] font-bold ${isSelected ? 'text-green-400' : 'text-white/50'}`}>
                      {fmtIdx(entry.productivity)}
                    </span>
                    <span
                      className="w-14 text-right text-[7px] font-bold"
                      style={{ color: changeColor(entry.change) }}
                    >
                      {fmtPct(entry.change)}
                    </span>
                  </div>
                );
              })}
              {(!globalRanking || globalRanking.length === 0) && (
                <div className="px-2 py-2 text-[7px] text-white/20 text-center uppercase">No ranking data</div>
              )}
            </div>

            {/* ── Implications ── */}
            <div className="px-2 py-1.5 border-b border-border/20">
              <div className="mb-1">
                <span className="text-[6px] text-white/25 uppercase tracking-wider">Implications</span>
              </div>
              {countryData?.implications ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  {/* Wage growth capacity */}
                  <Badge
                    text={`WAGE CAP: ${countryData.implications.wageGrowthCapacity ?? 'N/A'}`}
                    color={
                      countryData.implications.wageGrowthCapacity === 'strong'
                        ? GREEN
                        : countryData.implications.wageGrowthCapacity === 'moderate'
                          ? YELLOW
                          : RED
                    }
                    bg={
                      countryData.implications.wageGrowthCapacity === 'strong'
                        ? 'rgba(74,222,128,0.1)'
                        : countryData.implications.wageGrowthCapacity === 'moderate'
                          ? 'rgba(251,191,36,0.08)'
                          : 'rgba(248,113,113,0.1)'
                    }
                  />
                  {/* Inflation pressure */}
                  <Badge
                    text={`INFL PRESSURE: ${countryData.implications.inflationPressure ?? 'N/A'}`}
                    color={
                      countryData.implications.inflationPressure === 'low'
                        ? GREEN
                        : countryData.implications.inflationPressure === 'moderate'
                          ? YELLOW
                          : RED
                    }
                    bg={
                      countryData.implications.inflationPressure === 'low'
                        ? 'rgba(74,222,128,0.1)'
                        : countryData.implications.inflationPressure === 'moderate'
                          ? 'rgba(251,191,36,0.08)'
                          : 'rgba(248,113,113,0.1)'
                    }
                  />
                  {/* Competitiveness */}
                  {countryData.implications.competitiveness?.map((badge: any) => (
                    <Badge
                      key={badge}
                      text={badge}
                      color="rgba(96,165,250,0.9)"
                      bg="rgba(96,165,250,0.1)"
                    />
                  ))}
                </div>
              ) : (
                <span className="text-[7px] text-white/20 uppercase">No implications data</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
