import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface LCRBank {
  name: string;
  ticker: string;
  region: string;
  hqla: number;
  totalOutflows: number;
  lcrRatio: number;
  lcrMin: number;
  buffer: number;
  trend: 'improving' | 'stable' | 'deteriorating';
  quarter: string;
}

export interface HQLABreakdown {
  bank: string;
  level1: number;
  level1Pct: number;
  level2a: number;
  level2aPct: number;
  level2b: number;
  level2bPct: number;
  totalHqla: number;
}

export interface NSFREntry {
  bank: string;
  ticker: string;
  availableStableFunding: number;
  requiredStableFunding: number;
  nsfrRatio: number;
  trend: 'improving' | 'stable' | 'deteriorating';
}

export interface CashFlowBucket {
  bucket: string;
  inflows: number;
  outflows: number;
  net: number;
  cumulative: number;
  stressedNet: number;
  stressedCumulative: number;
}

export interface LiquidityCoverageData {
  timestamp: string;
  lcrBanks: LCRBank[];
  hqlaBreakdown: HQLABreakdown[];
  nsfrEntries: NSFREntry[];
  cashFlowLadder: CashFlowBucket[];
  aggregateLcr: number;
  aggregateNsfr: number;
  systemStatus: 'adequate' | 'watch' | 'stressed';
}

export function useLiquidityCoverage() {
  return useQuery({
    queryKey: ['liquidity-coverage'],
    queryFn: () => api.get<LiquidityCoverageData>('/liquidity-coverage'),
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
  });
}
