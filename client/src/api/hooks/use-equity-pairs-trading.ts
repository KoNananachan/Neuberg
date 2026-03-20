import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useEquityPairsTrading() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['equity-pairs-trading'],
    queryFn: () => api.get<any>('/equity-pairs-trading'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
