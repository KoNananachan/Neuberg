import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useEquityPairsTrading() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['equity-pairs-trading'],
    queryFn: () => api.get<any>('/equity-pairs-trading'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
