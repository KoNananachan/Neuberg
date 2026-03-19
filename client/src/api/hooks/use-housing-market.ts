import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useHousingMarket() {
  return useQuery({
    queryKey: ['housing-market'],
    queryFn: () => api.get<any>('/housing-market'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
