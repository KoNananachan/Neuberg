import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface Trade {
  id: string;
  symbol: string;
  side: string;
  quantity: number;
  avgPrice: number;
  vwap: number;
  twap: number;
  arrivalPrice: number;
  closePrice: number;
  slippageBps: number;
  vwapSlippageBps: number;
  implementationShortfall: number;
  marketImpact: number;
  participationRate: number;
  executionTime: string;
  duration: number;
  fills: number;
  algo: string;
  venue: string;
  status: string;
  qualityScore: number;
}

export interface ExecutionSummary {
  totalTrades: number;
  avgSlippageBps: number;
  avgVwapSlippageBps: number;
  avgQualityScore: number;
  totalVolume: number;
  bestExecution: { symbol: string; slippageBps: number };
  worstExecution: { symbol: string; slippageBps: number };
  algoBreakdown: { algo: string; count: number; avgSlippage: number }[];
  venueBreakdown: { venue: string; count: number; avgSlippage: number }[];
  slippageDistribution: number[];
}

export interface TradeBlotterResponse {
  trades: Trade[];
  summary: ExecutionSummary;
  timestamp: string;
}

export function useTradeBlotter() {
  return useQuery<TradeBlotterResponse>({
    queryKey: ['trade-blotter'],
    queryFn: () => api.get<TradeBlotterResponse>('/trade-blotter'),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}
