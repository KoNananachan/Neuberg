import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface ProfileBin {
  priceLevel: number;
  totalVol: number;
  buyVol: number;
  sellVol: number;
  imbalance: number;
}

export interface DeltaPoint {
  time: string;
  delta: number;
  price: number;
}

export interface OrderFlowData {
  symbol: string;
  range: string;
  currentPrice: number;
  profile: ProfileBin[];
  poc: number;
  valueArea: { high: number; low: number };
  cumulativeDelta: DeltaPoint[];
  summary: {
    totalBuyVol: number;
    totalSellVol: number;
    netDelta: number;
    vwap: number;
    buyPct: number;
  };
}

export function useOrderFlow(symbol: string, range = '1d', interval = '5m') {
  return useQuery<OrderFlowData>({
    queryKey: ['order-flow', symbol, range, interval],
    queryFn: () =>
      api.get<OrderFlowData>(
        `/order-flow/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`,
      ),
    enabled: !!symbol,
    staleTime: 60_000,
    refetchInterval: 2 * 60_000,
  });
}
