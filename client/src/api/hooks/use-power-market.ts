import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function usePowerMarket() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['power-market'],
    queryFn: () => api.get<any>('/power-market'),
    staleTime: 60 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
