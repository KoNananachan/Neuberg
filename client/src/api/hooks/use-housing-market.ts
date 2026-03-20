import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useHousingMarket() {
  return useQuery({
    queryKey: ['housing-market'],
    queryFn: () => api.get<any>('/housing-market'),
    staleTime: 60 * 60 * 1000,
  });
}
