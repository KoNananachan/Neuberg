import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useHousingMarket() {
  return useQuery({
    queryKey: ['housing-market'],
    queryFn: () => api.get<any>('/housing-market'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
