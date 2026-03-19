import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function usePowerMarket() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['power-market'],
    queryFn: () => api.get<any>('/power-market'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
