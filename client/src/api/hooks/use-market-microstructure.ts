import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// ── Types ──

export interface MarketDepth {
  bidDepth: number[];
  askDepth: number[];
  bidPrices: number[];
  askPrices: number[];
}

export interface TradeSizeDistribution {
  small: number;
  medium: number;
  large: number;
  block: number;
}

export interface MicrostructureEntry {
  symbol: string;
  name: string;
  price: number;
  bidAskSpread: number;
  spreadBps: number;
  avgDailyVolume: number;
  relativeVolume: number;
  avgTradeSize: number;
  blockTradesPct: number;
  darkPoolPct: number;
  marketDepth: MarketDepth;
  tradeSizeDistribution: TradeSizeDistribution;
  liquidityScore: number;
  spreadPercentile: number;
  microSignal: string | null;
  spreadHistory: number[];
}

export interface MicrostructureResponse {
  entries: MicrostructureEntry[];
  marketSummary: {
    avgSpreadBps: number;
    totalVolume: number;
    avgLiquidityScore: number;
    wideSpreadsCount: number;
  };
  timestamp: string;
}

export function useMarketMicrostructure() {
  return useQuery<MicrostructureResponse>({
    queryKey: ['market-microstructure'],
    queryFn: () => api.get<MicrostructureResponse>('/market-microstructure'),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}
