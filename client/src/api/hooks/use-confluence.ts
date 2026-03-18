import { useQuery } from '@tanstack/react-query';

export type SignalDirection = 'bullish' | 'bearish' | 'neutral';

export interface ConfluenceSignal {
  value: number | boolean;
  label: string;
  direction: SignalDirection;
}

export interface ConfluenceResult {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  confluenceScore: number;
  direction: 'bullish' | 'bearish' | 'neutral';
  bullishSignals: number;
  bearishSignals: number;
  signals: {
    smaCross: ConfluenceSignal;
    emaCross: ConfluenceSignal;
    rsi: ConfluenceSignal;
    macd: ConfluenceSignal;
    bollingerBands: ConfluenceSignal;
    volume: ConfluenceSignal;
    priceSma200: ConfluenceSignal;
    stochastic: ConfluenceSignal;
  };
}

export interface ConfluenceResponse {
  results: ConfluenceResult[];
  timestamp: string;
}

async function fetchConfluence(symbols?: string[]): Promise<ConfluenceResponse> {
  const query = symbols?.length ? `?symbols=${symbols.join(',')}` : '';
  const res = await fetch(`/api/confluence${query}`);
  if (!res.ok) throw new Error('Failed to fetch confluence data');
  return res.json();
}

export function useConfluence(symbols?: string[]) {
  const query = symbols?.join(',') || '';
  return useQuery({
    queryKey: ['confluence', query],
    queryFn: () => fetchConfluence(symbols),
    staleTime: 3 * 60_000,
    refetchInterval: 5 * 60_000,
  });
}
